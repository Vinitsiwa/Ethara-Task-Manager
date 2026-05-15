from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import TaskPriority, TaskStatus, User, UserRole, WorkItem, Workspace, WorkspaceMember
from backend.schemas.schemas import WorkItemCreate, WorkItemResponse, WorkItemUpdate
from backend.utils.deps import AdminUser, CurrentUser

router = APIRouter(prefix="/work-items", tags=["work-items"])


def _item_response(item: WorkItem) -> WorkItemResponse:
    return WorkItemResponse(
        id=item.id,
        title=item.title,
        notes=item.notes,
        status=TaskStatus(item.status),
        priority=TaskPriority(item.priority),
        assignee_id=item.assignee_id,
        workspace_id=item.workspace_id,
        deadline=item.deadline,
        created_at=item.created_at,
    )


def _get_item_or_404(db: Session, item_id: int) -> WorkItem:
    item = db.query(WorkItem).filter(WorkItem.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found")
    return item


def _is_collaborator(db: Session, user_id: int, workspace_id: int) -> bool:
    return (
        db.query(WorkspaceMember)
        .filter(WorkspaceMember.user_id == user_id, WorkspaceMember.workspace_id == workspace_id)
        .first()
        is not None
    )


def _ensure_item_visibility(db: Session, user: User, item: WorkItem) -> None:
    if UserRole(user.role) == UserRole.Admin:
        return
    if item.assignee_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Work item not assigned to you")
    if not _is_collaborator(db, user.id, item.workspace_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a workspace collaborator")


@router.get("", response_model=list[WorkItemResponse])
def list_work_items(user: CurrentUser, db: Session = Depends(get_db)):
    if UserRole(user.role) == UserRole.Admin:
        items = db.query(WorkItem).order_by(WorkItem.created_at.desc()).all()
    else:
        items = (
            db.query(WorkItem)
            .filter(WorkItem.assignee_id == user.id)
            .order_by(WorkItem.created_at.desc())
            .all()
        )
    return [_item_response(i) for i in items]


@router.post("", response_model=WorkItemResponse, status_code=status.HTTP_201_CREATED)
def create_work_item(user: AdminUser, payload: WorkItemCreate, db: Session = Depends(get_db)):
    ws = db.query(Workspace).filter(Workspace.id == payload.workspace_id).first()
    if ws is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
    if payload.assignee_id is not None:
        assignee = db.query(User).filter(User.id == payload.assignee_id).first()
        if assignee is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignee not found")
        if not _is_collaborator(db, payload.assignee_id, payload.workspace_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assignee must be a workspace collaborator",
            )
    item = WorkItem(
        title=payload.title.strip(),
        notes=payload.notes,
        status=payload.status.value,
        priority=payload.priority.value,
        assignee_id=payload.assignee_id,
        workspace_id=payload.workspace_id,
        deadline=payload.deadline,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _item_response(item)


@router.get("/{item_id}", response_model=WorkItemResponse)
def get_work_item(item_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    item = _get_item_or_404(db, item_id)
    if UserRole(user.role) != UserRole.Admin:
        _ensure_item_visibility(db, user, item)
    return _item_response(item)


@router.put("/{item_id}", response_model=WorkItemResponse)
def update_work_item(
    item_id: int,
    user: CurrentUser,
    payload: WorkItemUpdate,
    db: Session = Depends(get_db),
):
    item = _get_item_or_404(db, item_id)
    if UserRole(user.role) == UserRole.Admin:
        if payload.title is not None:
            item.title = payload.title.strip()
        if payload.notes is not None:
            item.notes = payload.notes
        if payload.status is not None:
            item.status = payload.status.value
        if payload.priority is not None:
            item.priority = payload.priority.value
        if payload.workspace_id is not None:
            ws = db.query(Workspace).filter(Workspace.id == payload.workspace_id).first()
            if ws is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
            item.workspace_id = payload.workspace_id
        if payload.assignee_id is not None:
            aid = payload.assignee_id
            assignee = db.query(User).filter(User.id == aid).first()
            if assignee is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignee not found")
            if not _is_collaborator(db, aid, item.workspace_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Assignee must be a workspace collaborator",
                )
            item.assignee_id = aid
        if payload.deadline is not None:
            item.deadline = payload.deadline
        db.commit()
        db.refresh(item)
        return _item_response(item)

    _ensure_item_visibility(db, user, item)
    if (
        payload.title is not None
        or payload.notes is not None
        or payload.assignee_id is not None
        or payload.workspace_id is not None
        or payload.deadline is not None
        or payload.priority is not None
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Members may only update work item status",
        )
    if payload.status is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status is required")
    item.status = payload.status.value
    db.commit()
    db.refresh(item)
    return _item_response(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work_item(item_id: int, user: AdminUser, db: Session = Depends(get_db)):
    item = _get_item_or_404(db, item_id)
    db.delete(item)
    db.commit()
    return None
