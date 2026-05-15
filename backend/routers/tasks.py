from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import Project, ProjectMember, Task, TaskStatus, User, UserRole
from backend.schemas.schemas import TaskCreate, TaskOut, TaskUpdate
from backend.utils.deps import AdminUser, CurrentUser

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _out(t: Task) -> TaskOut:
    return TaskOut(
        id=t.id, title=t.title, description=t.description,
        status=TaskStatus(t.status), assigned_to=t.assigned_to,
        project_id=t.project_id, due_date=t.due_date, created_at=t.created_at,
    )


def _get_task(db: Session, task_id: int) -> Task:
    t = db.query(Task).filter(Task.id == task_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Task not found")
    return t


def _is_member(db: Session, user_id: int, project_id: int) -> bool:
    return db.query(ProjectMember).filter(
        ProjectMember.user_id == user_id, ProjectMember.project_id == project_id
    ).first() is not None


def _check_task_visibility(db: Session, user: User, task: Task) -> None:
    if UserRole(user.role) == UserRole.Admin:
        return
    if task.assigned_to != user.id:
        raise HTTPException(status_code=403, detail="Task not assigned to you")
    if not _is_member(db, user.id, task.project_id):
        raise HTTPException(status_code=403, detail="Not a member of this project")


@router.get("", response_model=list[TaskOut])
def list_tasks(user: CurrentUser, db: Session = Depends(get_db)):
    if UserRole(user.role) == UserRole.Admin:
        tasks = db.query(Task).order_by(Task.created_at.desc()).all()
    else:
        tasks = db.query(Task).filter(Task.assigned_to == user.id).order_by(Task.created_at.desc()).all()
    return [_out(t) for t in tasks]


@router.post("", response_model=TaskOut, status_code=201)
def create_task(user: AdminUser, payload: TaskCreate, db: Session = Depends(get_db)):
    if not db.query(Project).filter(Project.id == payload.project_id).first():
        raise HTTPException(status_code=404, detail="Project not found")
    if payload.assigned_to is not None:
        if not db.query(User).filter(User.id == payload.assigned_to).first():
            raise HTTPException(status_code=404, detail="Assignee not found")
        if not _is_member(db, payload.assigned_to, payload.project_id):
            raise HTTPException(status_code=400, detail="Assignee must be a project member")
    task = Task(
        title=payload.title.strip(), description=payload.description,
        status=payload.status.value, assigned_to=payload.assigned_to,
        project_id=payload.project_id, due_date=payload.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _out(task)


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    task = _get_task(db, task_id)
    if UserRole(user.role) != UserRole.Admin:
        _check_task_visibility(db, user, task)
    return _out(task)


@router.put("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, user: CurrentUser, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = _get_task(db, task_id)
    if UserRole(user.role) == UserRole.Admin:
        if payload.title is not None:
            task.title = payload.title.strip()
        if payload.description is not None:
            task.description = payload.description
        if payload.status is not None:
            task.status = payload.status.value
        if payload.project_id is not None:
            if not db.query(Project).filter(Project.id == payload.project_id).first():
                raise HTTPException(status_code=404, detail="Project not found")
            task.project_id = payload.project_id
        if payload.assigned_to is not None:
            if not db.query(User).filter(User.id == payload.assigned_to).first():
                raise HTTPException(status_code=404, detail="Assignee not found")
            if not _is_member(db, payload.assigned_to, task.project_id):
                raise HTTPException(status_code=400, detail="Assignee must be a project member")
            task.assigned_to = payload.assigned_to
        if payload.due_date is not None:
            task.due_date = payload.due_date
    else:
        _check_task_visibility(db, user, task)
        if any(v is not None for v in [payload.title, payload.description, payload.assigned_to, payload.project_id, payload.due_date]):
            raise HTTPException(status_code=403, detail="Members may only update task status")
        if payload.status is None:
            raise HTTPException(status_code=400, detail="Status is required")
        task.status = payload.status.value
    db.commit()
    db.refresh(task)
    return _out(task)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, user: AdminUser, db: Session = Depends(get_db)):
    task = _get_task(db, task_id)
    db.delete(task)
    db.commit()
