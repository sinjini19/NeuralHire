"""Database tables (SQLAlchemy 2.0 typed style)."""
from datetime import datetime, timezone

from sqlalchemy import JSON, CheckConstraint, Float, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, UTCDateTime


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str | None] = mapped_column(String(254), default=None)
    phone: Mapped[str | None] = mapped_column(String(40), default=None)

    # Stored as JSON so we don't need extra tables yet.
    skills: Mapped[list] = mapped_column(JSON, default=list)        # ["Python", "React"]
    education: Mapped[list] = mapped_column(JSON, default=list)     # [{degree, institution, year}]
    experience: Mapped[dict] = mapped_column(JSON, default=dict)    # {total_years, entries: [...]}

    resume_filename: Mapped[str] = mapped_column(String(255))
    resume_text: Mapped[str] = mapped_column(Text)
    uploaded_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_now)

    __table_args__ = (
        Index("ix_candidates_email", "email"),
        Index("ix_candidates_uploaded_at", "uploaded_at"),
    )


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    company: Mapped[str] = mapped_column(String(200))
    department: Mapped[str | None] = mapped_column(String(100), default=None)
    location: Mapped[str | None] = mapped_column(String(200), default=None)
    description: Mapped[str] = mapped_column(Text)

    required_skills: Mapped[list] = mapped_column(JSON, default=list)       # ["Python", "FastAPI"]
    preferred_skills: Mapped[list] = mapped_column(JSON, default=list)
    min_experience_years: Mapped[float] = mapped_column(Float, default=0.0)
    education_requirements: Mapped[list] = mapped_column(JSON, default=list)  # ["B.Tech in Computer Science"]

    employment_type: Mapped[str] = mapped_column(String(20), default="full_time")
    status: Mapped[str] = mapped_column(String(20), default="open")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_now)

    __table_args__ = (
        # The database itself refuses bad values, even if the API had a bug.
        CheckConstraint("status IN ('draft','open','closed')", name="ck_jobs_status"),
        CheckConstraint(
            "employment_type IN ('full_time','part_time','contract','internship','freelance')",
            name="ck_jobs_employment_type",
        ),
        CheckConstraint("min_experience_years >= 0", name="ck_jobs_min_experience"),
        Index("ix_jobs_status", "status"),
        Index("ix_jobs_title", "title"),
        Index("ix_jobs_company", "company"),
        Index("ix_jobs_created_at", "created_at"),
    )


class MatchingResult(Base):
    """Latest persisted deterministic match result for a candidate/job pair."""
    __tablename__ = "matching_results"
    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[int] = mapped_column(index=True)
    job_id: Mapped[int] = mapped_column(index=True)
    score: Mapped[float] = mapped_column(Float)
    result_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_now)
    __table_args__ = (Index("ix_matching_job_score", "job_id", "score"), Index("ix_matching_candidate_job", "candidate_id", "job_id", unique=True))


class AIReport(Base):
    """Cached Gemini output, tied to source fingerprints for stale-data detection."""
    __tablename__ = "ai_reports"
    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[int] = mapped_column(index=True)
    job_id: Mapped[int | None] = mapped_column(nullable=True, index=True)
    report_type: Mapped[str] = mapped_column(String(40))
    content_json: Mapped[dict] = mapped_column(JSON, default=dict)
    model_name: Mapped[str] = mapped_column(String(100))
    source_fingerprint: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=_now)
