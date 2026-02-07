from celery import Celery
from celery.schedules import crontab
from app.core.config import settings
import asyncio
from sqlalchemy import select
from datetime import datetime, timezone
from app.db.session import AsyncSessionLocal
from app.models import Task, Account, User, Fingerprint, TaskBatch # Import all to ensure registry
from app.services.task_executor import execute_task

celery_app = Celery(
    "worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.task_routes = {
    "app.worker.test_celery": "main-queue"
}

celery_app.conf.beat_schedule = {
    "check-scheduled-tasks": {
        "task": "app.worker.check_scheduled_tasks",
        "schedule": 10.0,  # Run every 10 seconds
    },
}

@celery_app.task(acks_late=True)
def test_celery(word: str) -> str:
    return f"test task return {word}"

@celery_app.task
def check_scheduled_tasks():
    """
    Periodic task to check for pending tasks and execute them.
    """
    async def run_check():
        async with AsyncSessionLocal() as session:
            # Find pending tasks that are due
            now = datetime.now(timezone.utc)
            stmt = select(Task).where(
                Task.status == "pending",
                Task.scheduled_at <= now
            )
            result = await session.execute(stmt)
            tasks = result.scalars().all()
            
            if not tasks:
                return

            print(f"Found {len(tasks)} tasks to execute. Starting parallel execution (limit {settings.WORKER_CONCURRENCY})...")
            
            # Use Semaphore to limit concurrency
            semaphore = asyncio.Semaphore(settings.WORKER_CONCURRENCY)
            
            async def wrapped_execute(task_id: int):
                async with semaphore:
                    try:
                        await execute_task(task_id)
                    except Exception as e:
                        print(f"Unhandled error in parallel task {task_id}: {e}")

            # Execute all tasks in parallel, respecting the semaphore limit
            await asyncio.gather(*(wrapped_execute(task.id) for task in tasks))

    # Run async code synchronously
    loop = asyncio.get_event_loop()
    if loop.is_running():
        # Should not happen in standard celery worker, but just in case
        asyncio.ensure_future(run_check())
    else:
        loop.run_until_complete(run_check())
