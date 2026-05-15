from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import User, UserRole
from backend.schemas.schemas import AuthToken, UserCredentials, UserRegister, UserResponse
from backend.utils.deps import CurrentUser
from backend.utils.security import create_access_token, hash_password, verify_password

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    email = str(payload.email).lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use")
    user = User(
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role.value,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=UserRole(user.role),
        joined_at=user.joined_at,
    )


@router.post("/login", response_model=AuthToken)
def login(payload: UserCredentials, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == str(payload.email).lower()).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return AuthToken(access_token=create_access_token(str(user.id)))


@router.get("/profile", response_model=UserResponse)
def profile(user: CurrentUser):
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=UserRole(user.role),
        joined_at=user.joined_at,
    )
