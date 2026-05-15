from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from backend.models.models import TaskPriority, TaskStatus, UserRole


class UserRegister(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: UserRole = UserRole.Member

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Name is required")
        return v.strip()


class UserCredentials(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class AuthToken(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    joined_at: datetime

    model_config = {"from_attributes": True}


class WorkspaceCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    summary: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_strip(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Workspace title is required")
        return v.strip()


class WorkspaceUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    summary: Optional[str] = None


class WorkspaceResponse(BaseModel):
    id: int
    title: str
    summary: Optional[str]
    owner_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CollaboratorResponse(BaseModel):
    membership_id: int
    workspace_id: int
    user_id: int
    name: str
    email: str
    role: UserRole


class WorkItemCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    notes: Optional[str] = None
    status: TaskStatus = TaskStatus.Pending
    priority: TaskPriority = TaskPriority.Medium
    assignee_id: Optional[int] = None
    workspace_id: int
    deadline: Optional[datetime] = None

    @field_validator("title")
    @classmethod
    def title_strip(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Title is required")
        return v.strip()


class WorkItemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    notes: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assignee_id: Optional[int] = None
    workspace_id: Optional[int] = None
    deadline: Optional[datetime] = None


class WorkItemResponse(BaseModel):
    id: int
    title: str
    notes: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    assignee_id: Optional[int]
    workspace_id: int
    deadline: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class CollaboratorInvite(BaseModel):
    user_id: int = Field(..., gt=0)


class OverviewStats(BaseModel):
    total_items: int
    pending_count: int
    active_count: int
    done_count: int
    overdue_count: int
    high_priority_count: int
