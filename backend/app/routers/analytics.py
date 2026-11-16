"""Database-backed recruiter dashboard analytics."""
from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Candidate, Job, MatchingResult

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    candidate_count = db.scalar(select(func.count(Candidate.id))) or 0
    job_count = db.scalar(select(func.count(Job.id))) or 0
    open_jobs = db.scalar(select(func.count(Job.id)).where(Job.status == "open")) or 0
    match_count = db.scalar(select(func.count(MatchingResult.id))) or 0
    jobs_by_status = {status: db.scalar(select(func.count(Job.id)).where(Job.status == status)) or 0 for status in ("draft", "open", "closed")}
    matches = db.scalars(select(MatchingResult)).all()
    buckets = {"0–39": 0, "40–59": 0, "60–79": 0, "80–100": 0}
    skill_counts = Counter()
    top_matches = []
    for row in matches:
        score = float(row.score or 0)
        key = "0–39" if score < 40 else "40–59" if score < 60 else "60–79" if score < 80 else "80–100"
        buckets[key] += 1
        result = row.result_json or {}
        for skill in result.get("matched_skills", []):
            skill_counts[str(skill)] += 1
        top_matches.append({"candidate_id": row.candidate_id, "candidate_name": result.get("candidate_name", f"Candidate {row.candidate_id}"), "job_id": row.job_id, "score": round(score, 1)})
    top_matches.sort(key=lambda x: x["score"], reverse=True)
    return {
        "source": "live_database", "totals": {"candidates": candidate_count, "jobs": job_count, "open_jobs": open_jobs, "saved_matches": match_count},
        "jobs_by_status": jobs_by_status,
        "match_score_distribution": [{"range": k, "count": v} for k, v in buckets.items()],
        "top_matches": top_matches[:5],
        "most_matched_skills": [{"skill": k, "count": v} for k, v in skill_counts.most_common(8)],
    }
