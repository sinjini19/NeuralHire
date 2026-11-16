"""Run and inspect explainable candidate-to-job matching."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, delete
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Candidate, Job, MatchingResult
from app.services.matching_engine import DEFAULT_WEIGHTS, score_candidate

router = APIRouter(prefix="/api/matching", tags=["matching"])

class RunRequest(BaseModel):
    weights: dict[str, float] | None = None

@router.post("/jobs/{job_id}/run")
def run_matching(job_id: int, payload: RunRequest | None = None, db: Session = Depends(get_db)):
    job = db.get(Job, job_id)
    if not job: raise HTTPException(404, "Job not found.")
    weights = payload.weights if payload else None
    if weights and (set(weights) - set(DEFAULT_WEIGHTS)):
        raise HTTPException(422, "Allowed weight keys: skills, experience, education, preferred.")
    if weights:
        if any(float(v) < 0 for v in weights.values()) or sum(float(v) for v in weights.values()) <= 0:
            raise HTTPException(422, "Weights must be non-negative and have a positive total.")
    try:
        candidates = db.scalars(select(Candidate).order_by(Candidate.id)).all()
        now = datetime.now(timezone.utc)
        results = []
        for candidate in candidates:
            item = score_candidate(candidate, job, weights)
            row = db.scalar(select(MatchingResult).where(MatchingResult.job_id == job_id, MatchingResult.candidate_id == candidate.id))
            if row is None:
                row = MatchingResult(job_id=job_id, candidate_id=candidate.id)
                db.add(row)
            row.score = item["score"]
            row.result_json = item
            row.created_at = now
            results.append(item)
        db.commit()
    except ValueError as exc:
        db.rollback(); raise HTTPException(422, str(exc)) from exc
    results.sort(key=lambda x: (-x["score"], x["candidate_name"].lower()))
    return {"job_id": job_id, "job_title": job.title, "total_candidates": len(results), "results": results, "generated_at": now.isoformat()}

@router.get("/jobs/{job_id}/results")
def matching_results(job_id: int, min_score: float = Query(0, ge=0, le=100), q: str | None = Query(None, max_length=100), limit: int = Query(100, ge=1, le=200), offset: int = Query(0, ge=0), db: Session = Depends(get_db)):
    if not db.get(Job, job_id): raise HTTPException(404, "Job not found.")
    rows = db.scalars(select(MatchingResult).where(MatchingResult.job_id == job_id).order_by(MatchingResult.score.desc(), MatchingResult.id)).all()
    results = [r.result_json for r in rows if r.score >= min_score and (not q or q.lower() in str(r.result_json.get("candidate_name", "")).lower())]
    return {"job_id": job_id, "total": len(results), "items": results[offset:offset+limit], "limit": limit, "offset": offset}

@router.get("/jobs/{job_id}/candidates/{candidate_id}")
def candidate_match(job_id: int, candidate_id: int, db: Session = Depends(get_db)):
    row = db.scalar(select(MatchingResult).where(MatchingResult.job_id == job_id, MatchingResult.candidate_id == candidate_id))
    if not row: raise HTTPException(404, "Matching result not found. Run matching for this job first.")
    return row.result_json

@router.get("/candidates/{candidate_id}/jobs")
def candidate_jobs(candidate_id: int, db: Session = Depends(get_db)):
    if not db.get(Candidate, candidate_id): raise HTTPException(404, "Candidate not found.")
    rows = db.scalars(select(MatchingResult).where(MatchingResult.candidate_id == candidate_id).order_by(MatchingResult.score.desc())).all()
    return {"candidate_id": candidate_id, "items": [r.result_json for r in rows]}

@router.get("/jobs/{job_id}/leaderboard")
def leaderboard(job_id: int, limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    if not db.get(Job, job_id): raise HTTPException(404, "Job not found.")
    rows = db.scalars(select(MatchingResult).where(MatchingResult.job_id == job_id).order_by(MatchingResult.score.desc()).limit(limit)).all()
    return {"job_id": job_id, "items": [r.result_json for r in rows]}
