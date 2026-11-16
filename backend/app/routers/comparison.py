"""Side-by-side comparison of 2-4 candidates for one job."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Candidate, Job, MatchingResult
from app.services.matching_engine import score_candidate

router = APIRouter(prefix="/api/comparison", tags=["comparison"])

class CompareRequest(BaseModel):
    job_id: int
    candidate_ids: list[int] = Field(min_length=2, max_length=4)

@router.post("")
def compare_candidates(payload: CompareRequest, db: Session = Depends(get_db)):
    if len(set(payload.candidate_ids)) != len(payload.candidate_ids):
        raise HTTPException(422, "Select each candidate only once.")
    job = db.get(Job, payload.job_id)
    if not job:
        raise HTTPException(404, "Job not found.")
    candidates = db.scalars(select(Candidate).where(Candidate.id.in_(payload.candidate_ids))).all()
    by_id = {c.id: c for c in candidates}
    missing = [cid for cid in payload.candidate_ids if cid not in by_id]
    if missing:
        raise HTTPException(404, f"Candidate(s) not found: {missing}")
    rows = []
    for cid in payload.candidate_ids:
        c = by_id[cid]
        stored = db.scalar(select(MatchingResult).where(MatchingResult.job_id == job.id, MatchingResult.candidate_id == cid))
        match = stored.result_json if stored else score_candidate(c, job)
        rows.append({
            "candidate_id": c.id, "name": c.name, "email": c.email,
            "skills": c.skills or [], "education": c.education or [],
            "experience": c.experience or {}, "resume_filename": c.resume_filename,
            "match": match,
        })
    rows.sort(key=lambda x: x["match"].get("score", 0), reverse=True)
    return {"job": {"id": job.id, "title": job.title, "company": job.company}, "candidates": rows,
            "note": "Comparison is decision support. Missing profile information is unknown, not a zero score."}
