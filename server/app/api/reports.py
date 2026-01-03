from fastapi import APIRouter, status, Path, Query, Depends, HTTPException
from sqlalchemy import desc
from app.db import get_session
from app.models import Report, User, Event, Spot
from app.api.api_models import ReportResponse, CreateReport, UpdateReport, Report as ReportModel
from app.api.auth_utils import get_current_user
from typing import List, Optional
from datetime import datetime
from app.hs_logging import log_user_action, get_request_session_id

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_report(
    report_data: CreateReport,
    current_user: User = Depends(get_current_user),
    request_session_id=Depends(get_request_session_id)
):
    """
    Create a new report.
    - User must be logged in.
    - Must specify EITHER event_id OR spot_id (not both, not neither).
    """
    # Ensure it's for an Event OR a Spot
    if not report_data.event_id and not report_data.spot_id:
        raise HTTPException(status_code=400, detail="Report must be linked to an Event or a Spot.")
    if report_data.event_id and report_data.spot_id:
        raise HTTPException(status_code=400, detail="Cannot report both Event and Spot at the same time.")

    with get_session() as session:
        # Verify the Event/Spot exists
        if report_data.event_id:
            if not session.query(Event).get(report_data.event_id):
                raise HTTPException(status_code=404, detail="Event not found")
        if report_data.spot_id:
            if not session.query(Spot).get(report_data.spot_id):
                raise HTTPException(status_code=404, detail="Spot not found")

        # Create the report
        new_report = Report(
            description=report_data.description,
            picture=report_data.picture,
            event_id=report_data.event_id,
            spot_id=report_data.spot_id,
            user_id=current_user.id,
            date=datetime.now(),
            time=datetime.now().time(),
            status="active",
            is_flagged=False,
            score=report_data.score
        )
        
        session.add(new_report)
        session.commit()
        session.refresh(new_report)
        log_user_action("create_report", current_user, new_data=new_report.to_api_model(), request_session_id=request_session_id)
        return {"status": "success", "data": new_report.to_api_model()}

@router.get("/", status_code=status.HTTP_200_OK)
async def list_reports(event_id: Optional[int] = Query(None),
                       spot_id: Optional[int] = Query(None),
                       is_flagged: bool | None = Query(None)):
    """Get all reports (with filters)"""
    with get_session() as session:
        query = session.query(Report)

        if event_id:
            query = query.filter(Report.event_id == event_id)
        elif spot_id:
            query = query.filter(Report.spot_id == spot_id)
        else:
            # Optional: Allow fetching all if needed, or restrict to filters
            pass

        if is_flagged is not None:
            query = query.filter(Report.is_flagged == is_flagged)
            
        reports = query.order_by(desc(Report.date), desc(Report.time)).all()

        # Convert to Pydantic models
        return {"status": "success", "data": [report.to_api_model() for report in reports]}


@router.get("/{id}", status_code=status.HTTP_200_OK, response_model=ReportResponse)
async def get_report(id: int = Path(...)):
    """get single report by ID"""
    with get_session() as session:
        report = session.query(Report).filter(Report.id == id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        return {"status": "success", "data": report.to_api_model()}


@router.put("/{id}", status_code=status.HTTP_200_OK)
async def update_report(
    report_update: UpdateReport,
    id: int = Path(...),
    current_user: User = Depends(get_current_user),
    request_session_id=Depends(get_request_session_id)
):
    with get_session() as session:
        report = session.query(Report).filter(Report.id == id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        # Only the creator can edit
        if report.user_id != current_user.id:
            raise HTTPException(
                status_code=403, detail="You can only edit your own reports when logged in.")

        # Store old data for logging
        old_data = report.to_api_model()
        
        # Update fields
        update_data = report_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(report, key, value)

        session.commit()
        session.refresh(report)
        log_user_action("update_report", current_user, new_data=report.to_api_model(), request_session_id=request_session_id, old_data=old_data)
        return {"status": "success", "data": {
            "id": report.id,
            "description": report.description,
            "picture": report.picture,
            "status": report.status
        }}


@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_report(
    id: int = Path(...),
    current_user: User = Depends(get_current_user),
    request_session_id=Depends(get_request_session_id)
):
    with get_session() as session:
        report = session.query(Report).filter(Report.id == id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        # Admin only (Checking if 'is_admin' exists on user)
        # Note: Ensure your User model has an 'is_admin' column, or check specific email
        if not getattr(current_user, "is_admin", False):
            raise HTTPException(
                status_code=403, detail="Only admins can delete reports")

        # Store deleted data for logging
        deleted_data = report.to_api_model()
        
        session.delete(report)
        session.commit()
        log_user_action("delete_report", current_user, new_data=deleted_data, request_session_id=request_session_id)
        return {"status": "success", "message": "Report deleted"}


@router.post("/{id}/flag", status_code=status.HTTP_200_OK)
async def flag_report(
    id: int = Path(...),
    current_user: User = Depends(get_current_user),
    request_session_id=Depends(get_request_session_id)
):
    """Mark a report as inappropriate"""
    with get_session() as session:
        report = session.query(Report).filter(Report.id == id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        report.is_flagged = True
        session.commit()

        log_user_action("flag_report", current_user, new_data=report.to_api_model(), request_session_id=request_session_id)
        return {"status": "success", "message": "Report flagged for review"}


@router.delete("/{id}/flag", status_code=status.HTTP_200_OK)
async def unflag_report(
    id: int = Path(...),
    current_user: User = Depends(get_current_user),
    request_session_id=Depends(get_request_session_id)
):
    """Admin removes the flag, approving the report"""
    with get_session() as session:
        report = session.query(Report).filter(Report.id == id).first()
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        if not getattr(current_user, "is_admin", False):
            raise HTTPException(
                status_code=403, detail="Only admins can unflag reports")

        report.is_flagged = False
        session.commit()

        log_user_action("unflag_report", current_user, new_data=report.to_api_model(), request_session_id=request_session_id)
        return {"status": "success", "message": "Flag removed"}
