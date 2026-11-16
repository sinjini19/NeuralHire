"""Run manually with:  python -m app.init_db"""
from app import config
from app.database import init_db

if __name__ == "__main__":
    init_db()
    print(f"Database ready: {config.DATABASE_URL}")
