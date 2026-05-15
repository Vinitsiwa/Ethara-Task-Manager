from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import User, UserRole, Workspace, WorkspaceMember
from backend.schemas.schemas import (
    CollaboratorInvite,
    CollaboratorResponse,
    WorkspaceCreate,
    WorkspaceResponse,
    WorkspaceUpdate,
)
from backend.utils.deps import AdminUser, CurrentUser

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


def _workspace_response(w: Workspace) -> WorkspaceResponse:
    return WorkspaceResponse(
        id=w.id,
        title=w.title,
        summary=w.summary,
        owner_id=w.owner_id,
        created_at=w.created_at,
        updated_at=w.updated_at,
    )


def _member_workspace_ids(db: Session, user_id: int) -> List[int]:
    rows = db.query(WorkspaceMember.workspace_id).filter(WorkspaceMember.user_id == user_id).all()
    return [r[0] for r in rows]


def _get_workspace_or_404(db: Session, workspace_id: int) -> Workspace:
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if ws is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    return ws


def _ensure_workspace_access(db: Session, user: User, workspace: Workspace) -> None:
    if UserRole(user.role) == UserRole.Admin:
        return
    member = (
        db.query(WorkspaceMember)
        .filter(WorkspaceMember.workspace_id == workspace.id, WorkspaceMember.user_id == user.id)
        .first()
    )
    if member is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a workspace collaborator")


@router.get("", response_model=list[WorkspaceResponse])
def list_workspaces(user: CurrentUser, db: Session = Depends(get_db)):
    if UserRole(user.role) == UserRole.Admin:
        rows = db.query(Workspace).order_by(Workspace.updated_at.desc()).all()
    else:
        ids = _member_workspace_ids(db, user.id)
        if not ids:
            return []
        rows = db.query(Workspace).filter(Workspace.id.in_(ids)).order_by(Workspace.updated_at.desc()).all()
    return [_workspace_response(w) for w in rows]


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(user: AdminUser, payload: WorkspaceCreate, db: Session = Depends(get_db)):
    ws = Workspace(title=payload.title, summary=payload.summary, owner_id=user.id)
    db.add(ws)
    db.flush()
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id))
    db.commit()
    db.refresh(ws)
    return _workspace_response(ws)


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(workspace_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    ws = _get_workspace_or_404(db, workspace_id)
    _ensure_workspace_access(db, user, ws)
    return _workspace_response(ws)


@router.get("/{workspace_id}/collaborators", response_model=list[CollaboratorResponse])
def list_collaborators(workspace_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    ws = _get_workspace_or_404(db, workspace_id)
    _ensure_workspace_access(db, user, ws)
    rows = (
        db.query(WorkspaceMember, User)
        .join(User, User.id == WorkspaceMember.user_id)
        .filter(WorkspaceMember.workspace_id == workspace_id)
        .order_by(User.name.asc())
        .all()
    )
    return [
        CollaboratorResponse(
            membership_id=wm.id,
            workspace_id=wm.workspace_id,
            user_id=u.id,
            name=u.name,
            email=u.email,
            role=UserRole(u.role),
        )
        for wm, u in rows
    ]


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace(
    workspace_id: int,
    user: AdminUser,
    payload: WorkspaceUpdate,
    db: Session = Depends(get_db),
):
    ws = _get_workspace_or_404(db, workspace_id)
    if payload.title is not None:
        ws.title = payload.title.strip()
    if payload.summary is not None:
        ws.summary = payload.summary
    db.commit()
    db.refresh(ws)
    return _workspace_response(ws)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(workspace_id: int, user: AdminUser, db: Session = Depends(get_db)):
    ws = _get_workspace_or_404(db, workspace_id)
    db.delete(ws)
    db.commit()
    return None


@router.post("/{workspace_id}/collaborators", status_code=status.HTTP_201_CREATED)
def invite_collaborator(
    workspace_id: int,
    user: AdminUser,
    payload: CollaboratorInvite,
    db: Session = Depends(get_db),
):
    _get_workspace_or_404(db, workspace_id)
    target = db.query(User).filter(User.id == payload.user_id).first()
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    exists = (
        db.query(WorkspaceMember)
        .filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == payload.user_id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already in workspace")
    db.add(WorkspaceMember(workspace_id=workspace_id, user_id=payload.user_id))
    db.commit()
    return {"ok": True}


@router.delete("/{workspace_id}/collaborators/{collaborator_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_collaborator(
    workspace_id: int,
    collaborator_id: int,
    user: AdminUser,
    db: Session = Depends(get_db),
):
    _get_workspace_or_404(db, workspace_id)
    row = (
        db.query(WorkspaceMember)
        .filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == collaborator_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaborator not found")
    db.delete(row)
    db.commit()
    return None
