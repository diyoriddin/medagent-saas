"""Ensure admin user has a bcrypt-hashed password and save plaintext to .env.

Behavior:
- Reads `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from environment or `.env`.
- If plaintext password is available, it will be hashed and stored in DB.
- If no plaintext available and DB password is unhashed, that plaintext will be used and hashed.
- If DB password already hashed and no plaintext is available, a new random password is generated, written to `.env`, and hashed into DB.
"""
import os
import secrets
from typing import Optional

from app.db import SessionLocal
from app.models import User
from app.core import security


def read_env_value(key: str, env_path: str = ".env") -> Optional[str]:
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


def write_env_value(key: str, value: str, env_path: str = ".env"):
    # Read existing lines
    lines = []
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except FileNotFoundError:
        lines = []

    key_found = False
    new_lines = []
    for line in lines:
        if line.strip().startswith(f"{key}="):
            new_lines.append(f"{key}={value}\n")
            key_found = True
        else:
            new_lines.append(line)

    if not key_found:
        if new_lines and not new_lines[-1].endswith("\n"):
            new_lines[-1] = new_lines[-1] + "\n"
        new_lines.append(f"{key}={value}\n")

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)


def is_hashed(pw: str) -> bool:
    return pw.startswith("$2") or pw.startswith("$argon") or pw.startswith("$pbkdf2")


def main():
    env_path = ".env"
    target_email = read_env_value("SEED_ADMIN_EMAIL", env_path) or os.getenv("SEED_ADMIN_EMAIL") or "admin@demo.com"
    env_pw = read_env_value("SEED_ADMIN_PASSWORD", env_path) or os.getenv("SEED_ADMIN_PASSWORD")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == target_email).first()
        if not user:
            print(f"No user found for {target_email}")
            return

        db_pw = user.password or ""

        # Determine plaintext to use
        if env_pw:
            plaintext = env_pw
            print("Using plaintext from .env")
        elif db_pw and not is_hashed(db_pw):
            plaintext = db_pw
            print("Using plaintext from DB (was unhashed)")
        else:
            # Generate new secure password
            plaintext = secrets.token_urlsafe(12)
            print("No plaintext available; generated a new password")

        # Hash and update DB
        hashed = security.hash_password(plaintext)
        user.password = hashed
        db.commit()

        # Write plaintext to .env for recall
        write_env_value("SEED_ADMIN_PASSWORD", plaintext, env_path)

        print("Admin password hashed and stored to .env as SEED_ADMIN_PASSWORD")
        print(f"SEED_ADMIN_EMAIL={target_email}")
        print(f"SEED_ADMIN_PASSWORD={plaintext}")
    finally:
        db.close()


if __name__ == '__main__':
    main()
