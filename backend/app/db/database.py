from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in .env")

# Programmatically rewrite direct Supabase URL to IPv4 pooler URL on Render
if "db.mgwnhqkjbfcwljhmpobg.supabase.co" in DATABASE_URL:
    import re
    match = re.search(r"postgres(?:ql)?://postgres:(.*?)@db\.mgwnhqkjbfcwljhmpobg\.supabase\.co(?::5432)?/(.*)", DATABASE_URL)
    if match:
        password = match.group(1)
        db_name = match.group(2)
        # Convert to pooler URL (Mumbai region)
        DATABASE_URL = f"postgresql://postgres.mgwnhqkjbfcwljhmpobg:{password}@aws-0-ap-south-1.pooler.supabase.com:6543/{db_name}?sslmode=require"

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()