"""Job endpoints: create, list (search + filter), get, update, delete, and analyze a description."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Job
from app.schemas import (
    EmploymentType,
    JobAnalysis,
    JobAnalyzeRequest,
    JobCreate,
    JobList,
    JobOut,
    JobStatus,
    JobStatusCounts,
    JobUpdate,
)
from app.services.job_analyzer import analyze_job_description

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


def _get_or_404(db: Session, job_id: int) -> Job:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(404, "Job not found.")
    return job


@router.post("", response_model=JobOut, status_code=201)
def create_job(payload: JobCreate, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)  # one timestamp, so a new job has updated_at == created_at
    job = Job(**payload.model_dump(), created_at=now, updated_at=now)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


@router.get("", response_model=JobList)
def list_jobs(
    q: str | None = Query(None, max_length=100, description="Search in title OR company"),
    title: str | None = Query(None, max_length=100, description="Filter: title contains"),
    company: str | None = Query(None, max_length=100, description="Filter: company contains"),
    status: JobStatus | None = Query(None, description="draft | open | closed"),
    employment_type: EmploymentType | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    # Filters that apply to everything, including the per-status counts shown in the UI tabs
    base_filters = []
    if q and q.strip():
        term = q.strip()
        base_filters.append(or_(Job.title.icontains(term, autoescape=True), Job.company.icontains(term, autoescape=True)))
    if title and title.strip():
        base_filters.append(Job.title.icontains(title.strip(), autoescape=True))
    if company and company.strip():
        base_filters.append(Job.company.icontains(company.strip(), autoescape=True))
    if employment_type:
        base_filters.append(Job.employment_type == employment_type)

    counts_rows = db.execute(select(Job.status, func.count()).where(*base_filters).group_by(Job.status)).all()
    by_status = {s: n for s, n in counts_rows}
    counts = JobStatusCounts(
        all=sum(by_status.values()),
        draft=by_status.get("draft", 0),
        open=by_status.get("open", 0),
        closed=by_status.get("closed", 0),
    )

    filters = list(base_filters)
    if status:
        filters.append(Job.status == status)

    total = db.scalar(select(func.count()).select_from(Job).where(*filters)) or 0
    rows = db.scalars(
        select(Job).where(*filters).order_by(Job.created_at.desc(), Job.id.desc()).limit(limit).offset(offset)
    ).all()
    return JobList(items=rows, total=total, limit=limit, offset=offset, counts=counts)


@router.post("/analyze", response_model=JobAnalysis)
def analyze_description(payload: JobAnalyzeRequest):
    """Suggest skills / experience / education from a description. Saves nothing."""
    return analyze_job_description(payload.description)


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, job_id)


@router.put("/{job_id}", response_model=JobOut)
def update_job(job_id: int, payload: JobUpdate, db: Session = Depends(get_db)):
    job = _get_or_404(db, job_id)
    for field, value in payload.model_dump().items():
        setattr(job, field, value)
    job.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = _get_or_404(db, job_id)
    db.delete(job)
    db.commit()
    return Response(status_code=204)
