"""Change seeded admin email to the value in SEED_ADMIN_EMAIL environment variable.

This script will:
- read `SEED_ADMIN_EMAIL` from environment (default: admin@demo.com)
- find a user with email 'admin@demo.local' and update it to the target email
- skip the update if the target email already exists to avoid unique constraint errors
"""
import os
from app.db import SessionLocal
from app.models import User


def read_env_value(key: str, env_path: str = ".env") -> str | None:
    # Prefer actual environment, fall back to parsing .env file if present
    val = os.getenv(key)
    if val:
        return val
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                k, v = line.split("=", 1)
                if k.strip() == key:
                    return v.strip().strip('"').strip("'")
    except FileNotFoundError:
        return None
    return None


def change_email():
    target = read_env_value("SEED_ADMIN_EMAIL") or os.getenv("SEED_ADMIN_EMAIL") or "admin@demo.com"
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == target).first()
        if existing:
            print(f"Target email {target} already exists in DB (id={existing.id}). Skipping update.")
            return

        user = db.query(User).filter(User.email == 'admin@demo.local').first()
        if user:
            user.email = target
            db.commit()
            print(f'Updated admin email to {target}')
        else:
            print('No admin@demo.local user found')
    finally:
        db.close()


if __name__ == '__main__':
    change_email()
