import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.user import User, Role
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "admin@example.com").first()
        if existing:
            print("Admin user already exists, skipping seed.")
            return

        admin = User(
            email="admin@example.com",
            hashed_password=pwd_context.hash("admin123"),
            name="Admin",
            role=Role.admin,
        )
        db.add(admin)
        db.commit()
        print("Seeded admin user: admin@example.com / admin123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
