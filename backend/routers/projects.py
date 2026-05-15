from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.database import get_db
from backend.models.models import Project, ProjectMember, User, UserRole
from backend.schemas.schemas import MemberAdd, ProjectCreate, ProjectMemberDetailOut, ProjectOut, ProjectUpdate
from backend.utils.deps import AdminUser, CurrentUser

router = APIRouter(prefix="/projects", tags=["projects"])


def _out(p: Project) -> ProjectOut:
    return ProjectOut(
        id=p.id, name=p.name, description=p.description,
        created_by=p.created_by, created_at=p.created_at,
    )


def _member_ids(db: Session, user_id: int) -> List[int]:
    return [r[0] for r in db.query(ProjectMember.project_id).filter(ProjectMember.user_id == user_id).all()]


def _get_project(db: Session, project_id: int) -> Project:
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


def _check_access(db: Session, user: User, project: Project) -> None:
    if UserRole(user.role) == UserRole.Admin:
        return
    mem = db.query(ProjectMember).filter(
        ProjectMember.project_id == project.id, ProjectMember.user_id == user.id
    ).first()
    if not mem:
        raise HTTPException(status_code=403, detail="Not a member of this project")


@router.get("", response_model=list[ProjectOut])
def list_projects(user: CurrentUser, db: Session = Depends(get_db)):
    if UserRole(user.role) == UserRole.Admin:
        rows = db.query(Project).order_by(Project.created_at.desc()).all()
    else:
        ids = _member_ids(db, user.id)
        if not ids:
            return []
        rows = db.query(Project).filter(Project.id.in_(ids)).order_by(Project.created_at.desc()).all()
    return [_out(p) for p in rows]


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(user: AdminUser, payload: ProjectCreate, db: Session = Depends(get_db)):
    p = Project(name=payload.name, description=payload.description, created_by=user.id)
    db.add(p)
    db.flush()
    db.add(ProjectMember(project_id=p.id, user_id=user.id))
    db.commit()
    db.refresh(p)
    return _out(p)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    p = _get_project(db, project_id)
    _check_access(db, user, p)
    return _out(p)


@router.put("/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, user: AdminUser, payload: ProjectUpdate, db: Session = Depends(get_db)):
    p = _get_project(db, project_id)
    if payload.name is not None:
        p.name = payload.name.strip()
    if payload.description is not None:
        p.description = payload.description
    db.commit()
    db.refresh(p)
    return _out(p)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, user: AdminUser, db: Session = Depends(get_db)):
    p = _get_project(db, project_id)
    db.delete(p)
    db.commit()


@router.get("/{project_id}/members", response_model=list[ProjectMemberDetailOut])
def list_members(project_id: int, user: CurrentUser, db: Session = Depends(get_db)):
    p = _get_project(db, project_id)
    _check_access(db, user, p)
    rows = (
        db.query(ProjectMember, User)
        .join(User, User.id == ProjectMember.user_id)
        .filter(ProjectMember.project_id == project_id)
        .order_by(User.name.asc())
        .all()
    )
    return [
        ProjectMemberDetailOut(
            membership_id=pm.id, project_id=pm.project_id,
            user_id=u.id, name=u.name, email=u.email, role=UserRole(u.role),
        )
        for pm, u in rows
    ]


@router.post("/{project_id}/members", status_code=201)
def add_member(project_id: int, user: AdminUser, payload: MemberAdd, db: Session = Depends(get_db)):
    _get_project(db, project_id)
    target = db.query(User).filter(User.id == payload.user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    exists = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id, ProjectMember.user_id == payload.user_id
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="User already in project")
    db.add(ProjectMember(project_id=project_id, user_id=payload.user_id))
    db.commit()
    return {"ok": True}


@router.delete("/{project_id}/members/{member_user_id}", status_code=204)
def remove_member(project_id: int, member_user_id: int, user: AdminUser, db: Session = Depends(get_db)):
    _get_project(db, project_id)
    row = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id, ProjectMember.user_id == member_user_id
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Membership not found")
    db.delete(row)
    db.commit()
