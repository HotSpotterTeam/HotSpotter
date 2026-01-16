from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, desc, text, cast, Date, distinct
from app.db import get_session
from app.models import User, Spot, Event, Report, ReportFlag, Http_Log, User_Action_Log
from app.api.auth_utils import get_current_user
from datetime import datetime, timedelta

router = APIRouter()

def verify_admin(current_user: User):
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Admin privileges required")

@router.get("/activity", status_code=status.HTTP_200_OK)
async def get_activity_metrics(
    days: int = 30,
    current_user: User = Depends(get_current_user)
):
    """
    Returns top viewed spots/events.
    Logic: Counts how many times 'GET /api/reports?spot_id=X' was called.
    This request is triggered specifically when opening the Spot/Event Detail modal,
    avoiding false positives from map/list fetches.
    """
    verify_admin(current_user)
    since_date = datetime.utcnow() - timedelta(days=days)
    
    with get_session() as session:
        # --- 1. Top Active Spots (by Detail Views) ---
        top_spots_query = session.query(
            func.substring(Http_Log.dest_url, 'spot_id=([0-9]+)').label('spot_id_str'),
            func.count(Http_Log.id).label('views')
        ).filter(
            Http_Log.start_time >= since_date,
            Http_Log.action == 'GET',
            Http_Log.dest_url.like('%api/reports%'),
            Http_Log.dest_url.like('%spot_id=%')
        ).group_by(
            text('spot_id_str')
        ).order_by(desc('views')).limit(10).all()

        spot_stats = []
        for s_id_str, views in top_spots_query:
            if s_id_str and s_id_str.isdigit():
                spot = session.query(Spot).get(int(s_id_str))
                if spot:
                    spot_stats.append({"name": spot.name, "views": views})

        # --- 2. Top Active Events (by Detail Views) ---
        top_events_query = session.query(
            func.substring(Http_Log.dest_url, 'event_id=([0-9]+)').label('event_id_str'),
            func.count(Http_Log.id).label('views')
        ).filter(
            Http_Log.start_time >= since_date,
            Http_Log.action == 'GET',
            Http_Log.dest_url.like('%api/reports%'),
            Http_Log.dest_url.like('%event_id=%')
        ).group_by(
            text('event_id_str')
        ).order_by(desc('views')).limit(10).all()

        event_stats = []
        for e_id_str, views in top_events_query:
            if e_id_str and e_id_str.isdigit():
                event = session.query(Event).get(int(e_id_str))
                if event:
                    event_stats.append({"name": event.name, "views": views})

        return {
            "top_spots_views": spot_stats,
            "top_events_views": event_stats
        }

@router.get("/engagement", status_code=status.HTTP_200_OK)
async def get_engagement_metrics(
    days: int = 30,
    current_user: User = Depends(get_current_user)
):
    verify_admin(current_user)
    since_date = datetime.utcnow() - timedelta(days=days)

    with get_session() as session:
        # 1. Logins
        login_daily = session.query(
            cast(Http_Log.start_time, Date).label('day'),
            func.count(Http_Log.id)
        ).filter(
            Http_Log.start_time >= since_date,
            Http_Log.action == 'POST',
            (Http_Log.dest_url.like('%/auth/google%') | Http_Log.dest_url.like('%/auth/dev-login%'))
        ).group_by('day').all()

        # 2. Created Items
        creation_daily = session.query(
            cast(User_Action_Log.timestamp, Date).label('day'),
            User_Action_Log.action,
            func.count(User_Action_Log.id)
        ).filter(
            User_Action_Log.timestamp >= since_date,
            User_Action_Log.action.in_(['create_spot', 'create_event'])
        ).group_by('day', User_Action_Log.action).all()

        # 3. Reports Submitted
        reports_daily = session.query(
            cast(Report.date, Date).label('day'),
            func.count(Report.id)
        ).filter(
            Report.date >= since_date
        ).group_by('day').all()

        # Merge Data
        history = {}
        # Fill all dates with 0
        for i in range(days):
            d = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
            history[d] = {"date": d, "logins": 0, "spots": 0, "events": 0, "reports": 0}

        for day, count in login_daily:
            d_str = day.strftime('%Y-%m-%d')
            if d_str in history: history[d_str]["logins"] = count

        for day, action, count in creation_daily:
            d_str = day.strftime('%Y-%m-%d')
            if d_str in history:
                key = "spots" if action == "create_spot" else "events"
                history[d_str][key] = count
        
        for day, count in reports_daily:
            d_str = day.strftime('%Y-%m-%d')
            if d_str in history: history[d_str]["reports"] = count

        return {"daily_stats": sorted(list(history.values()), key=lambda x: x['date'])}

@router.get("/reports", status_code=status.HTTP_200_OK)
async def get_report_metrics(current_user: User = Depends(get_current_user)):
    """Heatmaps for reporting activity."""
    verify_admin(current_user)
    
    with get_session() as session:
        # Hourly (0-23)
        hourly = session.query(
            func.extract('hour', Report.time).label('hour'),
            func.count(Report.id)
        ).group_by('hour').all()

        # Weekly (0=Sunday)
        daily = session.query(
            func.extract('dow', Report.date).label('dow'),
            func.count(Report.id)
        ).group_by('dow').all()

        # Fill missing hours/days with 0
        hours_map = {int(h): c for h, c in hourly}
        hours_data = [{"hour": h, "count": hours_map.get(h, 0)} for h in range(24)]

        days_map = {int(d): c for d, c in daily}
        day_names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        weekly_data = [{"day": day_names[d], "count": days_map.get(d, 0)} for d in range(7)]

        return {
            "hourly_heatmap": hours_data,
            "weekly_heatmap": weekly_data
        }

@router.get("/flags", status_code=status.HTTP_200_OK)
async def get_flag_metrics(current_user: User = Depends(get_current_user)):
    """
    1. Most Flagged Spots/Events (Aggregation of flags on reports linked to them)
    2. Users whose reports get flagged the most.
    """
    verify_admin(current_user)
    
    with get_session() as session:
        # --- 1. Most Flagged Spots ---
        flagged_spots = session.query(
            Spot.name,
            func.count(ReportFlag.id).label('flag_count')
        ).join(Report, Report.spot_id == Spot.id)\
         .join(ReportFlag, ReportFlag.report_id == Report.id)\
         .group_by(Spot.id)\
         .order_by(desc('flag_count')).limit(5).all()

        # --- 2. Most Flagged Events ---
        flagged_events = session.query(
            Event.name,
            func.count(ReportFlag.id).label('flag_count')
        ).join(Report, Report.event_id == Event.id)\
         .join(ReportFlag, ReportFlag.report_id == Report.id)\
         .group_by(Event.id)\
         .order_by(desc('flag_count')).limit(5).all()

        # --- 3. Users with Most Flagged Content ---
        # Count distinct flags received on reports authored by a user
        problematic_users = session.query(
            User.name,
            User.email,
            func.count(ReportFlag.id).label('flags_received')
        ).select_from(User)\
         .join(Report, Report.user_id == User.id)\
         .join(ReportFlag, ReportFlag.report_id == Report.id)\
         .group_by(User.id)\
         .order_by(desc('flags_received')).limit(10).all()

        return {
            "most_flagged_spots": [{"name": n, "count": c} for n, c in flagged_spots],
            "most_flagged_events": [{"name": n, "count": c} for n, c in flagged_events],
            "problematic_users": [{"name": n or e, "count": c} for n, e, c in problematic_users]
        }