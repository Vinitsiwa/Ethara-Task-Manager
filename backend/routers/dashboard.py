from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import Task, TaskStatus, UserRole
from backend.schemas.schemas import DashboardOut
from backend.utils.deps import CurrentUser

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _is_overdue(due: datetime | None, now: datetime, status: str) -> bool:
    if due is None or status == TaskStatus.Completed.value:
        return False
    aware = due.replace(tzinfo=timezone.utc) if due.tzinfo is None else due.astimezone(timezone.utc)
    return aware < now


@router.get("", response_model=DashboardOut)
def dashboard(user: CurrentUser, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    if UserRole(user.role) == UserRole.Admin:
        tasks = db.query(Task).all()
    else:
        tasks = db.query(Task).filter(Task.assigned_to == user.id).all()

    return DashboardOut(
        total_tasks=len(tasks),
        todo_count=sum(1 for t in tasks if t.status == TaskStatus.Todo.value),
        in_progress_count=sum(1 for t in tasks if t.status == TaskStatus.InProgress.value),
        completed_count=sum(1 for t in tasks if t.status == TaskStatus.Completed.value),
        overdue_count=sum(1 for t in tasks if _is_overdue(t.due_date, now, t.status)),
    )
