from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from app.auth import require_admin
from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/users", tags=["users"])


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    email_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=list[UserOut])
def list_users(
    db: DBSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    return db.query(User).filter(User.deleted_at == None).order_by(User.created_at).all()
