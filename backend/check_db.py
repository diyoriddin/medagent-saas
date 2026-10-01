#!/usr/bin/env python3
"""Check existing database tables"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.environ.get("DATABASE_URL")
engine = create_engine(DATABASE_URL)
with engine.connect() as conn:
    tables = conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'")).fetchall()
    print("Tables:", [t[0] for t in tables])
    for t in tables:
        name = t[0]
        count = conn.execute(text(f"SELECT COUNT(*) FROM {name}")).fetchone()[0]
        print(f"  {name}: {count} rows")