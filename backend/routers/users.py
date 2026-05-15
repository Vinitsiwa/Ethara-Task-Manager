from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import User, UserRole
from backend.schemas.schemas import RoleUpdate, UserOut
from backend.utils.deps import AdminUser, CurrentUser

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(_admin: AdminUser, db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.name.asc()).all()
    return [UserOut(id=u.id, name=u.name, email=u.email, role=UserRole(u.role), created_at=u.created_at) for u in users]


@router.patch("/{user_id}/role", response_model=UserOut)
def update_role(user_id: int, payload: RoleUpdate, current_user: CurrentUser, db: Session = Depends(get_db)):
    if UserRole(current_user.role) != UserRole.Admin:
        raise HTTPException(status_code=403, detail="Admin role required")
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot change your own role")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    # Guard: don't demote last admin
    if UserRole(target.role) == UserRole.Admin and payload.role == UserRole.Member:
        admin_count = db.query(User).filter(User.role == UserRole.Admin.value).count()
        if admin_count <= 1:
            raise HTTPException(status_code=400, detail="At least one admin is required")
    target.role = payload.role.value
    db.commit()
    db.refresh(target)
    return UserOut(id=target.id, name=target.name, email=target.email, role=UserRole(target.role), created_at=target.created_at)
