"""
AI API router - OpenAI microcalls for summaries, subtasks, etc.
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any
from datetime import datetime
import openai
import json
import random

from app.config import get_settings
from app.models import (
    AIRequest, AISummaryResponse, AISubtasksResponse, 
    AIBulletsResponse, DailyReport, AIFeedbackRequest, 
    AIFeedbackResponse, UserIdentity, PersonalityPreferences
)
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_db, TaskDB
from sqlalchemy import text

router = APIRouter(tags=["ai"])


async def get_openai_client():
    """Get OpenAI client"""
    settings = get_settings()
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=501, detail="OpenAI API key not configured")
    
    return openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


@router.post("/ai/summarize", response_model=AISummaryResponse)
async def summarize_text(request: AIRequest):
    """Generate AI summary of text"""
    settings = get_settings()
    
    if not settings.FEATURE_AI_MICROCALLS:
        raise HTTPException(status_code=503, detail="AI microcalls feature is disabled")
    
    try:
        client = await get_openai_client()
        
        prompt = f"""
        Please summarize the following text and extract key points:
        
        Text: {request.text}
        
        Provide a concise summary and list the main key points.
        Response format should be JSON with 'summary' and 'key_points' fields.
        """
        
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that creates concise summaries and extracts key points from engineering documents."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            timeout=settings.AI_TIMEOUT
        )
        
        result = json.loads(response.choices[0].message.content)
        
        return AISummaryResponse(
            summary=result.get("summary", "Summary generation failed"),
            key_points=result.get("key_points", [])
        )
        
    except openai.OpenAIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {str(e)}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Invalid response format from AI")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(e)}")


@router.post("/ai/subtasks", response_model=AISubtasksResponse)
async def generate_subtasks(request: AIRequest):
    """Generate AI subtasks for a given task description"""
    settings = get_settings()
    
    if not settings.FEATURE_AI_MICROCALLS:
        raise HTTPException(status_code=503, detail="AI microcalls feature is disabled")
    
    try:
        client = await get_openai_client()
        
        prompt = f"""
        Break down the following task into specific, actionable subtasks:
        
        Task: {request.text}
        
        Context: {request.context if request.context else 'Engineering task breakdown'}
        
        Generate 3-7 specific subtasks that would help complete this main task.
        Response format should be JSON with 'title' and 'subtasks' fields.
        """
        
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are a project management assistant that breaks down engineering tasks into actionable subtasks."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            timeout=settings.AI_TIMEOUT
        )
        
        result = json.loads(response.choices[0].message.content)
        
        return AISubtasksResponse(
            title=result.get("title", request.text[:50] + "..."),
            subtasks=result.get("subtasks", [])
        )
        
    except openai.OpenAIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {str(e)}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Invalid response format from AI")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(e)}")


@router.post("/ai/bullets", response_model=AIBulletsResponse)
async def generate_bullets(request: AIRequest):
    """Generate AI bullet points from text"""
    settings = get_settings()
    
    if not settings.FEATURE_AI_MICROCALLS:
        raise HTTPException(status_code=503, detail="AI microcalls feature is disabled")
    
    try:
        client = await get_openai_client()
        
        prompt = f"""
        Convert the following text into clear, concise bullet points:
        
        Text: {request.text}
        
        Create 3-8 bullet points that capture the essential information.
        Response format should be JSON with 'bullets' field containing an array of strings.
        """
        
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are a technical writer that creates clear, concise bullet points from engineering content."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            timeout=settings.AI_TIMEOUT
        )
        
        result = json.loads(response.choices[0].message.content)
        
        return AIBulletsResponse(
            bullets=result.get("bullets", [])
        )
        
    except openai.OpenAIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {str(e)}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Invalid response format from AI")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(e)}")


@router.post("/ai/daily_report", response_model=DailyReport)
async def generate_daily_report(db: AsyncSession = Depends(get_db)):
    """Generate AI daily summary report"""
    settings = get_settings()
    
    if not settings.FEATURE_AI_MICROCALLS:
        raise HTTPException(status_code=503, detail="AI microcalls feature is disabled")
    
    try:
        # Get current tasks
        result = await db.execute(select(TaskDB))
        tasks = result.scalars().all()
        
        # Count active tasks
        active_tasks = [task for task in tasks if task.status in ["open", "in_progress"]]
        completed_tasks = [task for task in tasks if task.status == "completed"]
        
        # Mock pulse data (in real implementation, would fetch from pulse endpoint)
        pulse_count = 15  # Mock number
        
        # Create context for AI
        context = f"""
        Current engineering status:
        - Total tasks: {len(tasks)}
        - Active tasks: {len(active_tasks)}
        - Completed tasks: {len(completed_tasks)}
        - Recent activity items: {pulse_count}
        
        Recent task titles:
        {chr(10).join([f"- {task.title} ({task.status})" for task in active_tasks[:5]])}
        
        Generate a concise daily summary report for engineering management.
        """
        
        client = await get_openai_client()
        
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "You are an engineering manager assistant that creates daily status reports. Keep reports concise but informative."},
                {"role": "user", "content": context}
            ],
            timeout=settings.AI_TIMEOUT
        )
        
        report_text = response.choices[0].message.content
        
        # Mock coverage and risk calculation
        coverage_percent = round(85.0 + random.uniform(-10, 10), 1)
        risk_level = "low" if coverage_percent > 80 else "medium" if coverage_percent > 60 else "high"
        
        return DailyReport(
            report=report_text,
            date=datetime.now(),
            pulse_count=pulse_count,
            task_count=len(active_tasks),
            coverage_percent=coverage_percent,
            risk_level=risk_level
        )
        
    except openai.OpenAIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Daily report generation error: {str(e)}")


# Real user identity data from your profile system
REAL_USER_IDENTITY = UserIdentity(
    id="user-1",
    full_name="Logan",        # From your profile page
    first_name="Logan",      # From your profile page
    last_name="",            # Not shown in profile, could be extracted
    city="Denver, CO",       # From your profile page
    timezone="America/Denver",  # Denver timezone
    created_at=datetime.now(),
    updated_at=datetime.now()
)

# Real personality preferences based on your Big Five profile data
REAL_PERSONALITY_PREFS = PersonalityPreferences(
    communication_style="concrete",  # From cognitive_style.thinking_mode
    encouragement_level="moderate",  # Based on moderate emotional regulation
    feedback_style="direct",         # Based on low openness + concrete thinking
    interests=["engineering", "technology", "concrete problem solving"],  # Based on PhD Engineer profile
    goals=["technical excellence", "practical solutions", "engineering mastery"],
    work_style="methodical and detail-oriented"  # Based on low openness + concrete thinking + engineering background
)


def get_user_identity() -> UserIdentity:
    """Get user identity data - using real profile data"""
    return REAL_USER_IDENTITY


def get_personality_preferences() -> PersonalityPreferences:
    """Get user personality preferences - using real profile data"""
    return REAL_PERSONALITY_PREFS


def has_identity_profile() -> bool:
    """Check if user has identity profile configured"""
    try:
        identity = get_user_identity()
        return bool(identity.full_name and identity.city)
    except:
        return False


def has_biographical_data() -> bool:
    """Check if biographical data is available"""
    try:
        identity = get_user_identity()
        return bool(identity.full_name and identity.first_name and identity.city)
    except:
        return False


def has_personality_data() -> bool:
    """Check if personality data is available"""
    try:
        prefs = get_personality_preferences()
        return bool(prefs.communication_style and prefs.interests)
    except:
        return False


def substitute_persona_placeholders(prompt: str, identity: UserIdentity) -> str:
    """Replace placeholders in persona prompts with actual user data"""
    replacements = {
        "[User's Full Name]": identity.full_name,
        "[City]": identity.city,
        "[First Name]": identity.first_name,
        "[Last Name]": identity.last_name,
        "[Timezone]": identity.timezone
    }
    
    result = prompt
    for placeholder, value in replacements.items():
        result = result.replace(placeholder, value)
    
    return result


@router.post("/ai/feedback", response_model=AIFeedbackResponse)
async def get_ai_feedback(request: AIFeedbackRequest):
    """Generate AI feedback with persona support"""
    settings = get_settings()
    
    if not settings.FEATURE_AI_MICROCALLS:
        raise HTTPException(status_code=503, detail="AI microcalls feature is disabled")
    
    try:
        client = await get_openai_client()
        
        # Get user identity and personality data
        identity = get_user_identity()
        personality = get_personality_preferences()
        
        # Use persona if provided, otherwise create default supportive persona
        if request.persona:
            persona_prompt = substitute_persona_placeholders(request.persona.prompt, identity)
            model = request.persona.model or settings.OPENAI_MODEL
        else:
            # Default supportive persona
            persona_prompt = f"You are a supportive and encouraging assistant. Address the user warmly as {identity.full_name} and provide thoughtful, empathetic feedback. Be personal and caring in your response."
            model = settings.OPENAI_MODEL
        
        # Create system message with persona
        system_message = f"""
        {persona_prompt}
        
        User Context:
        - Name: {identity.full_name}
        - City: {identity.city}
        - Communication style preference: {personality.communication_style}
        - Encouragement level: {personality.encouragement_level}
        - Feedback style: {personality.feedback_style}
        - Interests: {', '.join(personality.interests)}
        - Goals: {', '.join(personality.goals)}
        - Work style: {personality.work_style}
        
        Provide personalized, empathetic feedback that takes into account the user's preferences and context.
        """
        
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": request.content}
            ],
            timeout=settings.AI_TIMEOUT
        )
        
        feedback_text = response.choices[0].message.content
        
        return AIFeedbackResponse(
            feedback=feedback_text,
            model_used=model,
            timestamp=datetime.now()
        )
        
    except openai.OpenAIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI feedback generation error: {str(e)}")


@router.get("/ai/identity-check")
async def check_identity_profile():
    """Check the status of user identity profile for debugging"""
    return {
        "hasIdentityProfile": has_identity_profile(),
        "hasBiographical": has_biographical_data(), 
        "hasPersonality": has_personality_data(),
        "selectedModel": get_settings().OPENAI_MODEL,
        "userIdentity": get_user_identity().dict() if has_identity_profile() else None,
        "personalityPrefs": get_personality_preferences().dict() if has_personality_data() else None
    }


# Chat Models
class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str
    timestamp: datetime

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage]
    context_type: Optional[str] = None  # "requirement" | "database" | "general"
    context_id: Optional[str] = None  # ID of specific requirement or context
    include_requirements: Optional[bool] = False
    requirement_filters: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    message: str
    timestamp: datetime
    context_used: Optional[Dict[str, Any]] = None
    suggestions: Optional[List[str]] = None

class ContextSearchRequest(BaseModel):
    query: str
    context_type: str
    filters: Optional[Dict[str, Any]] = None
    limit: Optional[int] = 10

class ContextSearchResponse(BaseModel):
    results: List[Dict[str, Any]]
    total_count: int
    context_type: str


@router.post("/ai/chat", response_model=ChatResponse)
async def chat_with_context(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """AI chat with requirements context support"""
    settings = get_settings()
    
    if not settings.FEATURE_AI_MICROCALLS:
        raise HTTPException(status_code=503, detail="AI chat feature is disabled")
    
    try:
        client = await get_openai_client()
        identity = get_user_identity()
        
        # Build context based on request
        context_info = {}
        system_context = f"You are an AI assistant helping {identity.full_name} with CORE-SE requirements traceability system."
        
        if request.context_type == "requirement" and request.context_id:
            # Get specific requirement context
            req_query = text("SELECT * FROM requirements WHERE id = :req_id")
            result = await db.execute(req_query, {"req_id": request.context_id})
            requirement = result.fetchone()
            
            if requirement:
                context_info["selected_requirement"] = dict(requirement._mapping)
                system_context += f" The user is currently viewing requirement {requirement.id}: {requirement.title}."
        
        elif request.include_requirements:
            # Get general requirements context with filters
            filters = request.requirement_filters or {}
            where_clauses = []
            params = {}
            
            if filters.get("status"):
                where_clauses.append("status = :status")
                params["status"] = filters["status"]
            if filters.get("category"):
                where_clauses.append("category = :category")
                params["category"] = filters["category"]
            if filters.get("criticality"):
                where_clauses.append("criticality = :criticality")
                params["criticality"] = filters["criticality"]
            
            where_clause = " AND ".join(where_clauses) if where_clauses else "1=1"
            reqs_query = text(f"SELECT id, title, status, category, criticality, description FROM requirements WHERE {where_clause} LIMIT 20")
            
            result = await db.execute(reqs_query, params)
            requirements = [dict(row._mapping) for row in result.fetchall()]
            
            context_info["requirements_summary"] = {
                "count": len(requirements),
                "items": requirements[:10],  # Limit to avoid token overflow
                "filters_applied": filters
            }
            
            system_context += f" The user has access to {len(requirements)} requirements in the database."
        
        if request.context_type == "database":
            # Get database schema context
            try:
                # Get table names
                tables_query = text("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
                result = await db.execute(tables_query)
                tables = [row[0] for row in result.fetchall()]
                
                context_info["database_schema"] = {
                    "tables": tables,
                    "description": "SQLite database with requirements traceability data"
                }
                
                system_context += f" The database contains tables: {', '.join(tables)}."
            except Exception as e:
                print(f"Error getting database context: {e}")
        
        # Build conversation history
        messages = [
            {"role": "system", "content": system_context}
        ]
        
        # Add conversation history (limit to last 10 messages to avoid token overflow)
        recent_history = request.history[-10:] if len(request.history) > 10 else request.history
        for msg in recent_history:
            messages.append({
                "role": msg.role,
                "content": msg.content
            })
        
        # Add current user message
        messages.append({
            "role": "user", 
            "content": request.message
        })
        
        # Get AI response
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            timeout=settings.AI_TIMEOUT,
            temperature=0.7
        )
        
        ai_message = response.choices[0].message.content
        
        # Generate suggestions based on context
        suggestions = []
        if request.context_type == "requirement":
            suggestions = [
                "Analyze impact of this requirement",
                "Show related requirements",
                "Generate test cases for this requirement",
                "Check compliance status"
            ]
        elif request.include_requirements:
            suggestions = [
                "Filter requirements by status",
                "Show critical requirements (DAL-A/B)",
                "Search for specific requirement",
                "Generate requirements report"
            ]
        
        return ChatResponse(
            message=ai_message,
            timestamp=datetime.now(),
            context_used=context_info,
            suggestions=suggestions
        )
        
    except openai.OpenAIError as e:
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.post("/ai/search-context", response_model=ContextSearchResponse)
async def search_context(
    request: ContextSearchRequest,
    db: AsyncSession = Depends(get_db)
):
    """Search for context items (requirements, etc.) to add to chat"""
    try:
        results = []
        total_count = 0
        
        if request.context_type == "requirement":
            # Search requirements
            filters = request.filters or {}
            where_clauses = ["(title LIKE :query OR description LIKE :query OR id LIKE :query)"]
            params = {"query": f"%{request.query}%"}
            
            if filters.get("status"):
                where_clauses.append("status = :status")
                params["status"] = filters["status"]
            if filters.get("category"):
                where_clauses.append("category = :category")
                params["category"] = filters["category"]
            if filters.get("criticality"):
                where_clauses.append("criticality = :criticality")
                params["criticality"] = filters["criticality"]
            
            where_clause = " AND ".join(where_clauses)
            limit = min(request.limit or 10, 50)  # Max 50 results
            
            search_query = text(f"""
                SELECT id, title, status, category, criticality, description, created_at
                FROM requirements 
                WHERE {where_clause}
                ORDER BY 
                    CASE WHEN title LIKE :exact_query THEN 1 ELSE 2 END,
                    created_at DESC
                LIMIT :limit
            """)
            
            params["exact_query"] = f"%{request.query}%"
            params["limit"] = limit
            
            result = await db.execute(search_query, params)
            rows = result.fetchall()
            
            results = [
                {
                    "id": row.id,
                    "title": row.title,
                    "status": row.status,
                    "category": row.category,
                    "criticality": row.criticality,
                    "description": row.description[:200] + "..." if len(row.description or "") > 200 else row.description,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                    "type": "requirement"
                }
                for row in rows
            ]
            
            # Get total count
            count_query = text(f"SELECT COUNT(*) FROM requirements WHERE {where_clause}")
            count_result = await db.execute(count_query, {k: v for k, v in params.items() if k != "limit"})
            total_count = count_result.scalar()
        
        return ContextSearchResponse(
            results=results,
            total_count=total_count,
            context_type=request.context_type
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Context search error: {str(e)}")
