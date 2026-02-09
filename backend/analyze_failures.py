"""
Check failed tasks and their error messages
"""
import asyncio
from app.db.session import AsyncSessionLocal
from app.models.task import Task
from sqlalchemy import select
from collections import Counter

async def analyze_failed_tasks():
    print("=" * 70)
    print("Failed Tasks Analysis")
    print("=" * 70)
    
    async with AsyncSessionLocal() as db:
        # Get all failed tasks
        stmt = select(Task).where(Task.status == "failed").order_by(Task.updated_at.desc()).limit(50)
        result = await db.execute(stmt)
        tasks = result.scalars().all()
        
        print(f"\nFound {len(tasks)} failed tasks (showing last 50)\n")
        
        # Collect error reasons
        error_counter = Counter()
        error_examples = {}
        
        for task in tasks:
            error_msg = task.error or "No error message"
            
            # Categorize errors
            if "session" in error_msg.lower() or "login" in error_msg.lower():
                category = "Session/Login Issue"
            elif "challenge" in error_msg.lower():
                category = "Challenge Required"
            elif "checkpoint" in error_msg.lower():
                category = "Checkpoint"
            elif "spam" in error_msg.lower():
                category = "Spam Detection"
            elif "consent" in error_msg.lower():
                category = "Consent Required"
            else:
                category = "Other"
            
            error_counter[category] += 1
            
            if category not in error_examples:
                error_examples[category] = {
                    'task_id': task.id,
                    'account_id': task.account_id,
                    'task_type': task.task_type,
                    'error': error_msg[:200]  # First 200 chars
                }
        
        # Print summary
        print("\n📊 Error Categories:")
        print("-" * 70)
        for category, count in error_counter.most_common():
            percentage = (count / len(tasks)) * 100
            print(f"{category:30} {count:3} tasks ({percentage:5.1f}%)")
        
        # Print examples
        print("\n\n📝 Example Errors:")
        print("-" * 70)
        for category, example in error_examples.items():
            print(f"\n{category}:")
            print(f"  Task ID: {example['task_id']}")
            print(f"  Account: {example['account_id']}")
            print(f"  Type: {example['task_type']}")
            print(f"  Error: {example['error']}")
        
        print("\n" + "=" * 70)

asyncio.run(analyze_failed_tasks())
