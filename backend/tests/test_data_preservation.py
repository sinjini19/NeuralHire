"""Module 3 adds a `jobs` table. Existing candidate data must survive that."""
from sqlalchemy import create_engine, inspect, select
from sqlalchemy.orm import Session

from app.database import Base
from app.models import Candidate, Job


def test_adding_jobs_table_keeps_existing_candidates(tmp_path):
    engine = create_engine(f"sqlite:///{(tmp_path / 'old.db').as_posix()}")

    # 1) Build the database exactly as Module 2 left it: only the candidates table.
    Base.metadata.create_all(engine, tables=[Candidate.__table__])
    with Session(engine) as db:
        db.add(Candidate(name="Existing Person", email="old@example.com", resume_filename="old.pdf",
                         resume_text="resume text " * 10, skills=["Python"], education=[], experience={}))
        db.commit()
    assert "jobs" not in inspect(engine).get_table_names()

    # 2) Module 3 startup: create_all only adds what is missing.
    Base.metadata.create_all(engine)

    # 3) Old data is intact and the new table exists and works.
    assert {"candidates", "jobs"} <= set(inspect(engine).get_table_names())
    with Session(engine) as db:
        kept = db.scalars(select(Candidate)).all()
        assert [(c.name, c.email, c.skills) for c in kept] == [("Existing Person", "old@example.com", ["Python"])]
        db.add(Job(title="T", company="C", description="d" * 25))
        db.commit()
        assert len(db.scalars(select(Job)).all()) == 1


def test_create_all_is_safe_to_run_repeatedly(tmp_path):
    engine = create_engine(f"sqlite:///{(tmp_path / 'again.db').as_posix()}")
    for _ in range(3):
        Base.metadata.create_all(engine)
    assert {"candidates", "jobs"} <= set(inspect(engine).get_table_names())


def test_database_rejects_invalid_status_even_without_the_api(tmp_path):
    import pytest
    from sqlalchemy.exc import IntegrityError

    engine = create_engine(f"sqlite:///{(tmp_path / 'ck.db').as_posix()}")
    Base.metadata.create_all(engine)
    with Session(engine) as db, pytest.raises(IntegrityError):
        db.add(Job(title="T", company="C", description="d" * 25, status="bogus"))
        db.commit()
