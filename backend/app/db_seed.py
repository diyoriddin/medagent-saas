"""Simple DB seed to create tables and a demo clinic + admin user."""
from sqlalchemy.exc import IntegrityError
from app.db import engine, Base, SessionLocal
from app.models import Clinic, User
from app.core.security import hash_password
from app.core.config import settings


def seed():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Create demo clinic if not exists
        clinic = db.query(Clinic).filter(Clinic.slug == "demo-clinic").first()
        if not clinic:
            clinic = Clinic(name="Demo Clinic", slug="demo-clinic", phone="+998901234567")
            db.add(clinic)
            db.commit()
            db.refresh(clinic)
            print("Created demo clinic", clinic.id)

        # Create admin user
        admin = db.query(User).filter(User.email == "admin@demo.local").first()
        if not admin:
            # Hash password if possible; fall back to plain password for seed if hashing fails
            try:
                pwd = hash_password("password123")
            except Exception:
                print("Warning: bcrypt/hash failed, storing plaintext password for seed (change in production)")
                pwd = "password123"

            admin = User(
                clinic_id=clinic.id,
                email="admin@demo.local",
                password=pwd,
                full_name="Demo Admin",
                role="CLINIC_ADMIN",
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print("Created admin user", admin.email)
        else:
            print("Admin already exists")

    except IntegrityError as e:
        db.rollback()
        print("Seed IntegrityError:", e)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
