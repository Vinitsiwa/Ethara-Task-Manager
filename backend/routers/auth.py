from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import User, UserRole
from backend.schemas.schemas import ProfileUpdate, Token, UserLogin, UserOut, UserSignup
from backend.utils.deps import CurrentUser
from backend.utils.security import create_access_token, hash_password, verify_password

router = APIRouter()


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: UserSignup, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == str(payload.email).lower()).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=payload.name,
        email=str(payload.email).lower(),
        password=hash_password(payload.password),
        role=payload.role.value,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut(
        id=user.id, name=user.name, email=user.email,
        role=UserRole(user.role), created_at=user.created_at,
    )


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == str(payload.email).lower()).first()
    if user is None or not verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return Token(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return UserOut(
        id=user.id, name=user.name, email=user.email,
        role=UserRole(user.role), created_at=user.created_at,
    )


@router.patch("/me", response_model=UserOut)
def update_me(payload: ProfileUpdate, user: CurrentUser, db: Session = Depends(get_db)):
    if payload.name is not None:
        user.name = payload.name.strip()

    if payload.email is not None:
        new_email = str(payload.email).lower()
        if new_email != user.email:
            if db.query(User).filter(User.email == new_email).first():
                raise HTTPException(status_code=400, detail="Email already in use")
            user.email = new_email

    if payload.new_password is not None:
        if not payload.current_password:
            raise HTTPException(status_code=400, detail="current_password is required to change password")
        if not verify_password(payload.current_password, user.password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        user.password = hash_password(payload.new_password)

    db.commit()
    db.refresh(user)
    return UserOut(
        id=user.id, name=user.name, email=user.email,
        role=UserRole(user.role), created_at=user.created_at,
    )
