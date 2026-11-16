"""Gemini endpoints. All outputs are advisory and never alter deterministic matching scores."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Candidate, Job, MatchingResult, AIReport
from app.config import GEMINI_MODEL
from app.services.ai_service import fingerprint, candidate_summary, job_analysis, interview_questions

router = APIRouter(prefix='/api/ai', tags=['AI intelligence'])

class GenerateRequest(BaseModel):
    force_refresh: bool = False


def _get_candidate(db: Session, cid: int):
    obj = db.get(Candidate, cid)
    if not obj: raise HTTPException(404, 'Candidate not found.')
    return obj

def _get_job(db: Session, jid: int):
    obj = db.get(Job, jid)
    if not obj: raise HTTPException(404, 'Job not found.')
    return obj

def _report(db, candidate, job, kind, source, generator, force=False):
    fp = fingerprint(source)
    row = db.scalar(select(AIReport).where(AIReport.candidate_id == candidate.id, AIReport.job_id == (job.id if job else None), AIReport.report_type == kind).order_by(AIReport.created_at.desc()))
    if row and row.source_fingerprint == fp and not force:
        return {'id': row.id, 'candidate_id': row.candidate_id, 'job_id': row.job_id, 'report_type': row.report_type, 'content': row.content_json, 'model': row.model_name, 'created_at': row.created_at.isoformat(), 'cached': True}
    try: content, model = generator()
    except RuntimeError as exc: raise HTTPException(503, str(exc)) from exc
    except Exception as exc: raise HTTPException(502, f'AI provider error: {str(exc)[:240]}') from exc
    row = AIReport(candidate_id=candidate.id, job_id=job.id if job else None, report_type=kind, content_json=content, model_name=model, source_fingerprint=fp, created_at=datetime.now(timezone.utc))
    db.add(row); db.commit(); db.refresh(row)
    return {'id': row.id, 'candidate_id': row.candidate_id, 'job_id': row.job_id, 'report_type': row.report_type, 'content': row.content_json, 'model': row.model_name, 'created_at': row.created_at.isoformat(), 'cached': False}

@router.post('/candidates/{candidate_id}/summary')
def make_summary(candidate_id: int, payload: GenerateRequest | None = None, db: Session = Depends(get_db)):
    c = _get_candidate(db, candidate_id)
    source = {'resume': c.resume_text, 'skills': c.skills, 'education': c.education, 'experience': c.experience}
    return _report(db, c, None, 'summary', source, lambda: candidate_summary(c), bool(payload and payload.force_refresh))

@router.post('/candidates/{candidate_id}/jobs/{job_id}/analysis')
def make_analysis(candidate_id: int, job_id: int, payload: GenerateRequest | None = None, db: Session = Depends(get_db)):
    c, j = _get_candidate(db, candidate_id), _get_job(db, job_id)
    match_row = db.scalar(select(MatchingResult).where(MatchingResult.candidate_id == candidate_id, MatchingResult.job_id == job_id))
    match = match_row.result_json if match_row else None
    source = {'resume': c.resume_text, 'job': j.description, 'match': match}
    return _report(db, c, j, 'job_analysis', source, lambda: job_analysis(c, j, match), bool(payload and payload.force_refresh))

@router.post('/candidates/{candidate_id}/jobs/{job_id}/interview-questions')
def make_questions(candidate_id: int, job_id: int, payload: GenerateRequest | None = None, db: Session = Depends(get_db)):
    c, j = _get_candidate(db, candidate_id), _get_job(db, job_id)
    source = {'resume': c.resume_text, 'job': j.description}
    return _report(db, c, j, 'interview_questions', source, lambda: interview_questions(c, j), bool(payload and payload.force_refresh))

@router.get('/candidates/{candidate_id}/reports')
def list_reports(candidate_id: int, db: Session = Depends(get_db)):
    _get_candidate(db, candidate_id)
    rows = db.scalars(select(AIReport).where(AIReport.candidate_id == candidate_id).order_by(AIReport.created_at.desc())).all()
    return {'items': [{'id': r.id, 'job_id': r.job_id, 'report_type': r.report_type, 'content': r.content_json, 'model': r.model_name, 'created_at': r.created_at.isoformat()} for r in rows]}
