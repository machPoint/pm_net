"""
Tasks API router - manage engineering tasks
"""

from fastapi import APIRouter, HTTPException, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List
from datetime import datetime
import uuid

from app.database import get_db, TaskDB
from app.models import Task, TaskCreate, TaskUpdate

router = APIRouter(tags=["tasks"])


@router.get("/tasks", response_model=List[Task])
async def get_tasks(db: AsyncSession = Depends(get_db)):
    """Get all tasks"""
    try:
        result = await db.execute(select(TaskDB))
        task_records = result.scalars().all()
        
        tasks = []
        for record in task_records:
            task = Task(
                id=record.id,
                title=record.title,
                description=record.description,
                status=record.status,
                priority=record.priority,
                assignee=record.assignee,
                due_date=record.due_date,
                created_at=record.created_at,
                updated_at=record.updated_at,
                context_artifacts=record.context_artifacts or [],
                subtasks=record.subtasks or []
            )
            tasks.append(task)
        
        return tasks
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/tasks", response_model=Task)
async def create_task(task_data: TaskCreate, db: AsyncSession = Depends(get_db)):
    """Create a new task"""
    try:
        # Convert context_artifacts to dict format for JSON storage
        context_artifacts_dict = [
            {
                "id": artifact.id,
                "type": artifact.type.value,
                "source": artifact.source,
                "title": artifact.title,
                "status": artifact.status,
                "url": artifact.url
            }
            for artifact in task_data.context_artifacts
        ]
        
        task_record = TaskDB(
            id=str(uuid.uuid4()),
            title=task_data.title,
            description=task_data.description,
            priority=task_data.priority,
            assignee=task_data.assignee,
            due_date=task_data.due_date,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            context_artifacts=context_artifacts_dict,
            subtasks=[]
        )
        
        db.add(task_record)
        await db.commit()
        await db.refresh(task_record)
        
        # Convert back to response model
        task = Task(
            id=task_record.id,
            title=task_record.title,
            description=task_record.description,
            status=task_record.status,
            priority=task_record.priority,
            assignee=task_record.assignee,
            due_date=task_record.due_date,
            created_at=task_record.created_at,
            updated_at=task_record.updated_at,
            context_artifacts=task_data.context_artifacts,
            subtasks=task_record.subtasks or []
        )
        
        return task
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")


@router.patch("/tasks/{task_id}", response_model=Task)
async def update_task(
    task_id: str = Path(..., description="Task ID"),
    task_update: TaskUpdate = ...,
    db: AsyncSession = Depends(get_db)
):
    """Update an existing task"""
    try:
        # Get existing task
        result = await db.execute(select(TaskDB).where(TaskDB.id == task_id))
        task_record = result.scalar_one_or_none()
        
        if not task_record:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Update fields
        update_data = {}
        if task_update.title is not None:
            update_data["title"] = task_update.title
        if task_update.description is not None:
            update_data["description"] = task_update.description
        if task_update.status is not None:
            update_data["status"] = task_update.status.value
        if task_update.priority is not None:
            update_data["priority"] = task_update.priority
        if task_update.assignee is not None:
            update_data["assignee"] = task_update.assignee
        if task_update.due_date is not None:
            update_data["due_date"] = task_update.due_date
        if task_update.subtasks is not None:
            update_data["subtasks"] = task_update.subtasks
        
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            
            await db.execute(
                update(TaskDB).where(TaskDB.id == task_id).values(**update_data)
            )
            await db.commit()
            
            # Get updated record
            result = await db.execute(select(TaskDB).where(TaskDB.id == task_id))
            updated_record = result.scalar_one()
            
            # Convert context_artifacts back to proper format
            context_artifacts = []
            for artifact_dict in (updated_record.context_artifacts or []):
                context_artifacts.append({
                    "id": artifact_dict["id"],
                    "type": artifact_dict["type"],
                    "source": artifact_dict["source"],
                    "title": artifact_dict["title"],
                    "status": artifact_dict.get("status"),
                    "url": artifact_dict.get("url")
                })
            
            task = Task(
                id=updated_record.id,
                title=updated_record.title,
                description=updated_record.description,
                status=updated_record.status,
                priority=updated_record.priority,
                assignee=updated_record.assignee,
                due_date=updated_record.due_date,
                created_at=updated_record.created_at,
                updated_at=updated_record.updated_at,
                context_artifacts=context_artifacts,
                subtasks=updated_record.subtasks or []
            )
            
            return task
        
        # No updates provided, return existing task
        context_artifacts = []
        for artifact_dict in (task_record.context_artifacts or []):
            context_artifacts.append({
                "id": artifact_dict["id"],
                "type": artifact_dict["type"],
                "source": artifact_dict["source"],
                "title": artifact_dict["title"],
                "status": artifact_dict.get("status"),
                "url": artifact_dict.get("url")
            })
        
        task = Task(
            id=task_record.id,
            title=task_record.title,
            description=task_record.description,
            status=task_record.status,
            priority=task_record.priority,
            assignee=task_record.assignee,
            due_date=task_record.due_date,
            created_at=task_record.created_at,
            updated_at=task_record.updated_at,
            context_artifacts=context_artifacts,
            subtasks=task_record.subtasks or []
        )
        
        return task
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update task: {str(e)}")


@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str = Path(..., description="Task ID"),
    db: AsyncSession = Depends(get_db)
):
    """Delete a task"""
    try:
        result = await db.execute(select(TaskDB).where(TaskDB.id == task_id))
        task_record = result.scalar_one_or_none()
        
        if not task_record:
            raise HTTPException(status_code=404, detail="Task not found")
        
        await db.execute(delete(TaskDB).where(TaskDB.id == task_id))
        await db.commit()
        
        return {"status": "success", "message": "Task deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete task: {str(e)}")


@router.get("/tasks/{task_id}", response_model=Task)
async def get_task(
    task_id: str = Path(..., description="Task ID"),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific task by ID"""
    try:
        result = await db.execute(select(TaskDB).where(TaskDB.id == task_id))
        task_record = result.scalar_one_or_none()
        
        if not task_record:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Convert context_artifacts back to proper format
        context_artifacts = []
        for artifact_dict in (task_record.context_artifacts or []):
            context_artifacts.append({
                "id": artifact_dict["id"],
                "type": artifact_dict["type"],
                "source": artifact_dict["source"],
                "title": artifact_dict["title"],
                "status": artifact_dict.get("status"),
                "url": artifact_dict.get("url")
            })
        
        task = Task(
            id=task_record.id,
            title=task_record.title,
            description=task_record.description,
            status=task_record.status,
            priority=task_record.priority,
            assignee=task_record.assignee,
            due_date=task_record.due_date,
            created_at=task_record.created_at,
            updated_at=task_record.updated_at,
            context_artifacts=context_artifacts,
            subtasks=task_record.subtasks or []
        )
        
        return task
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
