from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import User, UserRole
from backend.schemas.schemas import UserResponse
from backend.utils.deps import AdminUser

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users(_admin: AdminUser, db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.name.asc()).all()
    return [
        UserResponse(id=u.id, name=u.name, email=u.email, role=UserRole(u.role), joined_at=u.joined_at)
        for u in users
    ]
