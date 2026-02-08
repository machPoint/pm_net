"""
Notes API router - manage engineering notes
"""

from fastapi import APIRouter, HTTPException, Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime
import uuid

from app.database import get_db, NoteDB
from app.models import Note, NoteCreate

router = APIRouter(tags=["notes"])


@router.get("/notes", response_model=List[Note])
async def get_notes(db: AsyncSession = Depends(get_db)):
    """Get all notes"""
    try:
        result = await db.execute(select(NoteDB).order_by(NoteDB.updated_at.desc()))
        note_records = result.scalars().all()
        
        notes = []
        for record in note_records:
            # Convert citations back to proper format
            citations = []
            for citation_dict in (record.citations or []):
                citations.append({
                    "id": citation_dict["id"],
                    "type": citation_dict["type"],
                    "source": citation_dict["source"],
                    "title": citation_dict["title"],
                    "status": citation_dict.get("status"),
                    "url": citation_dict.get("url")
                })
            
            note = Note(
                id=record.id,
                title=record.title,
                body=record.body,
                citations=citations,
                tags=record.tags or [],
                created_at=record.created_at,
                updated_at=record.updated_at,
                author=record.author
            )
            notes.append(note)
        
        return notes
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/notes", response_model=Note)
async def create_note(note_data: NoteCreate, db: AsyncSession = Depends(get_db)):
    """Create a new note"""
    try:
        # Convert citations to dict format for JSON storage
        citations_dict = [
            {
                "id": citation.id,
                "type": citation.type.value,
                "source": citation.source,
                "title": citation.title,
                "status": citation.status,
                "url": citation.url
            }
            for citation in note_data.citations
        ]
        
        note_record = NoteDB(
            id=str(uuid.uuid4()),
            title=note_data.title,
            body=note_data.body,
            citations=citations_dict,
            tags=note_data.tags,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            author="demo_user"  # From auth context
        )
        
        db.add(note_record)
        await db.commit()
        await db.refresh(note_record)
        
        # Convert back to response model
        note = Note(
            id=note_record.id,
            title=note_record.title,
            body=note_record.body,
            citations=note_data.citations,
            tags=note_record.tags or [],
            created_at=note_record.created_at,
            updated_at=note_record.updated_at,
            author=note_record.author
        )
        
        return note
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create note: {str(e)}")


@router.get("/notes/{note_id}", response_model=Note)
async def get_note(
    note_id: str = Path(..., description="Note ID"),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific note by ID"""
    try:
        result = await db.execute(select(NoteDB).where(NoteDB.id == note_id))
        note_record = result.scalar_one_or_none()
        
        if not note_record:
            raise HTTPException(status_code=404, detail="Note not found")
        
        # Convert citations back to proper format
        citations = []
        for citation_dict in (note_record.citations or []):
            citations.append({
                "id": citation_dict["id"],
                "type": citation_dict["type"],
                "source": citation_dict["source"],
                "title": citation_dict["title"],
                "status": citation_dict.get("status"),
                "url": citation_dict.get("url")
            })
        
        note = Note(
            id=note_record.id,
            title=note_record.title,
            body=note_record.body,
            citations=citations,
            tags=note_record.tags or [],
            created_at=note_record.created_at,
            updated_at=note_record.updated_at,
            author=note_record.author
        )
        
        return note
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
