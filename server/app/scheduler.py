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


def run_all_scheduled_tasks_now():
    """
    Manually trigger all scheduled tasks immediately.
    Useful for testing or on-demand updates.
    """
    from app.event_status_updater import update_event_statuses

    logger.info("Manually triggering all scheduled tasks")
    result = update_event_statuses()
    return result