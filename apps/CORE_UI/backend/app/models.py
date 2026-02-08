"""
Pydantic models for CORE-SE Demo API
"""

from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User roles in the system"""
    CONSUMER = "consumer"
    INFLUENCER = "influencer"
    ADMIN = "admin"


class ArtifactType(str, Enum):
    """Types of artifacts in the system"""
    REQUIREMENT = "requirement"
    TEST = "test"
    ISSUE = "issue"
    PART = "part"
    ECN = "ecn"
    EMAIL = "email"
    OUTLOOK = "outlook"
    BOM = "bom"


class ArtifactRef(BaseModel):
    """Reference to an artifact from external systems"""
    id: str = Field(..., description="Artifact ID (e.g., JAMA-REQ-123)")
    type: ArtifactType = Field(..., description="Type of artifact")
    source: str = Field(..., description="Source system (jama, jira, windchill, outlook, email)")
    title: str = Field(..., description="Display title")
    status: Optional[str] = Field(None, description="Current status")
    url: Optional[str] = Field(None, description="Link to source")


class PulseItem(BaseModel):
    """Item in the pulse feed"""
    id: str = Field(..., description="Unique pulse item ID")
    artifact_ref: ArtifactRef = Field(..., description="Referenced artifact")
    change_type: str = Field(..., description="Type of change (created, updated, deleted)")
    change_summary: str = Field(..., description="Human-readable change description")
    timestamp: datetime = Field(..., description="When the change occurred")
    author: Optional[str] = Field(None, description="Who made the change")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class ImpactNode(BaseModel):
    """Node in an impact analysis tree"""
    artifact_ref: ArtifactRef = Field(..., description="The artifact")
    impact_level: int = Field(..., description="Degree of separation from root")
    relationship_type: str = Field(..., description="Type of relationship (depends_on, tests, implements)")
    children: List["ImpactNode"] = Field(default_factory=list, description="Child nodes")


class ImpactResult(BaseModel):
    """Result of impact analysis"""
    root_artifact: ArtifactRef = Field(..., description="Root artifact being analyzed")
    depth: int = Field(..., description="Analysis depth")
    total_impacted: int = Field(..., description="Total number of impacted items")
    impact_tree: List[ImpactNode] = Field(..., description="Tree structure of impacts")
    gap_count: int = Field(0, description="Number of traceability gaps found")


class TaskStatus(str, Enum):
    """Task status enumeration"""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Task(BaseModel):
    """Task/work item"""
    id: Optional[str] = Field(None, description="Task ID (auto-generated)")
    title: str = Field(..., description="Task title")
    description: Optional[str] = Field(None, description="Detailed description")
    status: TaskStatus = Field(TaskStatus.OPEN, description="Current status")
    priority: str = Field("medium", description="Priority level")
    assignee: Optional[str] = Field(None, description="Assigned user")
    due_date: Optional[datetime] = Field(None, description="Due date")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    context_artifacts: List[ArtifactRef] = Field(default_factory=list, description="Related artifacts")
    subtasks: List[str] = Field(default_factory=list, description="Generated subtask descriptions")


class TaskCreate(BaseModel):
    """Schema for creating a new task"""
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    assignee: Optional[str] = None
    due_date: Optional[datetime] = None
    context_artifacts: List[ArtifactRef] = Field(default_factory=list)


class TaskUpdate(BaseModel):
    """Schema for updating a task"""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[datetime] = None
    subtasks: Optional[List[str]] = None


class Note(BaseModel):
    """Engineering note"""
    id: Optional[str] = Field(None, description="Note ID (auto-generated)")
    title: str = Field(..., description="Note title")
    body: str = Field(..., description="Note content (markdown)")
    citations: List[ArtifactRef] = Field(default_factory=list, description="Cited artifacts")
    tags: List[str] = Field(default_factory=list, description="Note tags")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    author: Optional[str] = Field(None, description="Note author")


class NoteCreate(BaseModel):
    """Schema for creating a new note"""
    title: str
    body: str
    citations: List[ArtifactRef] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)


class KnowledgeCard(BaseModel):
    """Knowledge base entry"""
    id: str = Field(..., description="Knowledge card ID")
    title: str = Field(..., description="Card title")
    summary: str = Field(..., description="Brief summary")
    content: str = Field(..., description="Full content")
    source: str = Field(..., description="Source system or document")
    tags: List[str] = Field(default_factory=list, description="Knowledge tags")
    relevance_score: float = Field(..., description="Search relevance score")
    artifact_refs: List[ArtifactRef] = Field(default_factory=list, description="Related artifacts")


class WindowLink(BaseModel):
    """Link to external system window"""
    url: str = Field(..., description="URL to open")
    read_only: bool = Field(True, description="Whether the window is read-only")
    title: str = Field(..., description="Window title")
    tool: str = Field(..., description="Source tool (jama, jira, windchill, outlook)")


class AIRequest(BaseModel):
    """Base request for AI operations"""
    text: str = Field(..., description="Input text to process")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")


class AISummaryResponse(BaseModel):
    """Response from AI summarization"""
    summary: str = Field(..., description="Generated summary")
    key_points: List[str] = Field(default_factory=list, description="Key points extracted")


class AISubtasksResponse(BaseModel):
    """Response from AI subtask generation"""
    title: str = Field(..., description="Task title")
    subtasks: List[str] = Field(..., description="Generated subtask list")


class AIBulletsResponse(BaseModel):
    """Response from AI bullet point generation"""
    bullets: List[str] = Field(..., description="Generated bullet points")


class DailyReport(BaseModel):
    """Daily summary report"""
    report: str = Field(..., description="Plain text daily summary")
    date: datetime = Field(..., description="Report date")
    pulse_count: int = Field(..., description="Number of pulse items")
    task_count: int = Field(..., description="Number of active tasks")
    coverage_percent: Optional[float] = Field(None, description="Test coverage percentage")
    risk_level: str = Field("medium", description="Overall risk assessment")


class ConfigResponse(BaseModel):
    """Application configuration response"""
    features: Dict[str, bool] = Field(..., description="Feature flag states")
    themes: List[str] = Field(..., description="Available themes")
    mode: str = Field(..., description="Application mode")


class ErrorResponse(BaseModel):
    """Standard error response"""
    detail: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Specific error code")


class UserIdentity(BaseModel):
    """User identity and biographical data"""
    id: str = Field(..., description="User ID")
    full_name: str = Field(..., description="User's full name")
    first_name: str = Field(..., description="User's first name")
    last_name: str = Field(..., description="User's last name")
    city: str = Field(..., description="User's city")
    timezone: str = Field("UTC", description="User's timezone")
    created_at: datetime = Field(..., description="Profile creation date")
    updated_at: datetime = Field(..., description="Profile last update date")


class PersonalityPreferences(BaseModel):
    """User personality and communication preferences"""
    communication_style: str = Field("friendly", description="Communication style preference")
    encouragement_level: str = Field("medium", description="Level of encouragement desired")
    feedback_style: str = Field("supportive", description="Preferred feedback style")
    interests: List[str] = Field(default_factory=list, description="User interests")
    goals: List[str] = Field(default_factory=list, description="User goals")
    work_style: str = Field("", description="User's work style description")


class Persona(BaseModel):
    """AI persona configuration"""
    id: Optional[str] = Field(None, description="Persona ID")
    name: str = Field(..., description="Persona name")
    prompt: str = Field(..., description="Persona prompt template")
    model: str = Field("gpt-4o", description="AI model to use")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")


class AIFeedbackRequest(BaseModel):
    """Request for AI feedback with persona support"""
    content: str = Field(..., description="Content to provide feedback on")
    persona: Optional[Persona] = Field(None, description="Persona configuration")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")


class AIFeedbackResponse(BaseModel):
    """Response from AI feedback"""
    model_config = {"protected_namespaces": ()}
    
    feedback: str = Field(..., description="Generated feedback")
    model_used: str = Field(..., description="AI model used")
    timestamp: datetime = Field(..., description="Response timestamp")


class User(BaseModel):
    """User model"""
    id: Optional[str] = Field(None, description="User ID (auto-generated)")
    email: EmailStr = Field(..., description="User email address")
    username: str = Field(..., description="Unique username")
    full_name: str = Field(..., description="User's full name")
    role: UserRole = Field(UserRole.CONSUMER, description="User role")
    is_active: bool = Field(True, description="Whether user account is active")
    created_at: Optional[datetime] = Field(None, description="Account creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    
    # Extended profile fields
    first_name: Optional[str] = Field(None, description="User's first name")
    last_name: Optional[str] = Field(None, description="User's last name")
    city: Optional[str] = Field(None, description="User's city")
    timezone: str = Field("UTC", description="User's timezone")
    
    # Personality preferences
    communication_style: str = Field("friendly", description="Communication style preference")
    encouragement_level: str = Field("medium", description="Level of encouragement desired")
    feedback_style: str = Field("supportive", description="Preferred feedback style")
    interests: List[str] = Field(default_factory=list, description="User interests")
    goals: List[str] = Field(default_factory=list, description="User goals")
    work_style: str = Field("", description="User's work style description")


class UserCreate(BaseModel):
    """Schema for creating a new user"""
    email: EmailStr = Field(..., description="User email address")
    username: str = Field(..., description="Unique username")
    password: str = Field(..., min_length=8, description="User password")
    full_name: str = Field(..., description="User's full name")
    role: UserRole = Field(UserRole.CONSUMER, description="User role")
    
    # Optional profile fields
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    city: Optional[str] = None
    timezone: str = "UTC"


class UserLogin(BaseModel):
    """Schema for user login"""
    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="User password")


class UserUpdate(BaseModel):
    """Schema for updating user profile"""
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    city: Optional[str] = None
    timezone: Optional[str] = None
    communication_style: Optional[str] = None
    encouragement_level: Optional[str] = None
    feedback_style: Optional[str] = None
    interests: Optional[List[str]] = None
    goals: Optional[List[str]] = None
    work_style: Optional[str] = None


class UserResponse(BaseModel):
    """Public user response (excludes sensitive data)"""
    id: str
    email: str
    username: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None


class Token(BaseModel):
    """JWT token response"""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field("bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration in seconds")
    user: UserResponse = Field(..., description="User information")


class TokenData(BaseModel):
    """JWT token payload data"""
    username: Optional[str] = None
    user_id: Optional[str] = None
    role: Optional[UserRole] = None
    exp: Optional[int] = None


class PasswordChange(BaseModel):
    """Schema for changing password"""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")


# Update forward references
ImpactNode.model_rebuild()
