from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def start_scheduler():
    """
    Start the background scheduler for periodic tasks.
    """
    if not scheduler.running:
        scheduler.start()
        logger.info("Background scheduler started")


def stop_scheduler():
    """
    Stop the background scheduler.
    """
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Background scheduler stopped")


def schedule_event_status_updates():
    """
    Schedule event status updates to run every 1 minute.
    """
    from app.event_status_updater import update_event_statuses

    # Run every 1 minute
    scheduler.add_job(
        func=update_event_statuses,
        trigger=CronTrigger(minute='*'),
        id='update_event_statuses',
        name='Update event statuses based on time',
        replace_existing=True
    )

    logger.info("Scheduled event status updates to run every 1 minute")


def schedule_trending_cache_refresh():
    """
    Schedule trending cache refresh to run every minute.
    This batch-calculates trending scores to avoid per-request DB queries.
    """
    from app.trending_cache import refresh_all_trending_scores
    from app.db import get_session

    def refresh_job():
        session = get_session()
        try:
            refresh_all_trending_scores(session)
        finally:
            session.close()

    scheduler.add_job(
        func=refresh_job,
        trigger=CronTrigger(minute='*'),
        id='refresh_trending_cache',
        name='Refresh trending scores cache',
        replace_existing=True
    )

    logger.info("Scheduled trending cache refresh to run every 1 minute")


def run_all_scheduled_tasks_now():
    """
    Manually trigger all scheduled tasks immediately.
    Useful for testing or on-demand updates.
    """
    from app.event_status_updater import update_event_statuses
    from app.trending_cache import refresh_all_trending_scores
    from app.db import get_session

    logger.info("Manually triggering all scheduled tasks")
    result = update_event_statuses()

    # Refresh trending cache
    session = get_session()
    try:
        refresh_all_trending_scores(session)
    finally:
        session.close()

    return result