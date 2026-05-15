from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import TaskPriority, TaskStatus, UserRole, WorkItem
from backend.schemas.schemas import OverviewStats
from backend.utils.deps import CurrentUser

router = APIRouter(prefix="/overview", tags=["overview"])


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _deadline_overdue(deadline: datetime | None, now: datetime, status: str) -> bool:
    if deadline is None or status == TaskStatus.Done.value:
        return False
    if deadline.tzinfo is None:
        due_aware = deadline.replace(tzinfo=timezone.utc)
    else:
        due_aware = deadline.astimezone(timezone.utc)
    return due_aware < now


@router.get("", response_model=OverviewStats)
def overview(user: CurrentUser, db: Session = Depends(get_db)):
    now = _utc_now()
    if UserRole(user.role) == UserRole.Admin:
        items = db.query(WorkItem).all()
    else:
        items = db.query(WorkItem).filter(WorkItem.assignee_id == user.id).all()

    return OverviewStats(
        total_items=len(items),
        pending_count=sum(1 for i in items if i.status == TaskStatus.Pending.value),
        active_count=sum(1 for i in items if i.status == TaskStatus.Active.value),
        done_count=sum(1 for i in items if i.status == TaskStatus.Done.value),
        overdue_count=sum(1 for i in items if _deadline_overdue(i.deadline, now, i.status)),
        high_priority_count=sum(1 for i in items if i.priority == TaskPriority.High.value),
    )
