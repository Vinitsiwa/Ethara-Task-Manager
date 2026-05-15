import enum
from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from backend.database.database import Base


class UserRole(str, enum.Enum):
    Admin = "Admin"
    Member = "Member"


class TaskStatus(str, enum.Enum):
    Pending = "Pending"
    Active = "Active"
    Done = "Done"


class TaskPriority(str, enum.Enum):
    Low = "Low"
    Medium = "Medium"
    High = "High"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False, default=UserRole.Member.value)
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    workspace_memberships = relationship("WorkspaceMember", back_populates="user")
    owned_workspaces = relationship("Workspace", back_populates="owner")
    assigned_work_items = relationship(
        "WorkItem", back_populates="assignee", foreign_keys="WorkItem.assignee_id"
    )


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="owned_workspaces")
    collaborators = relationship(
        "WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan"
    )
    work_items = relationship("WorkItem", back_populates="workspace", cascade="all, delete-orphan")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    workspace = relationship("Workspace", back_populates="collaborators")
    user = relationship("User", back_populates="workspace_memberships")

    __table_args__ = (UniqueConstraint("workspace_id", "user_id", name="uq_workspace_user"),)


class WorkItem(Base):
    __tablename__ = "work_items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default=TaskStatus.Pending.value)
    priority = Column(String(16), nullable=False, default=TaskPriority.Medium.value)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    deadline = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    assignee = relationship("User", back_populates="assigned_work_items", foreign_keys=[assignee_id])
    workspace = relationship("Workspace", back_populates="work_items")
