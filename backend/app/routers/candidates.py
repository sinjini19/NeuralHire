"""Candidate endpoints: upload a resume, list candidates, get one candidate."""
import re
from pathlib import PurePosixPath, PureWindowsPath

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app import config
from app.database import get_db
from app.models import Candidate
from app.schemas import CandidateDetail, CandidateList
from app.services.pdf_extractor import PDFExtractionError, extract_text
from app.services.profile_parser import parse_profile

router = APIRouter(prefix="/api/candidates", tags=["candidates"])

ALLOWED_MIME_TYPES = {"application/pdf", "application/x-pdf"}
CHUNK = 64 * 1024


def _safe_filename(raw: str | None) -> str:
    """Strip any directory part (../../evil.pdf) and odd characters; cap the length."""
    name = PureWindowsPath(PurePosixPath(raw or "").name).name
    name = re.sub(r"[^\w.\- ()]", "_", name).strip()
    return name[:200]


def _read_limited(upload: UploadFile) -> bytes:
    """Read the upload in chunks and stop as soon as it exceeds the limit,
    so a huge file can never fill up server memory."""
    buf = bytearray()
    while chunk := upload.file.read(CHUNK):
        buf.extend(chunk)
        if len(buf) > config.MAX_UPLOAD_BYTES:
            raise HTTPException(413, f"File is too large. The maximum size is {config.MAX_UPLOAD_MB:g} MB.")
    return bytes(buf)


@router.post("/upload", response_model=CandidateDetail, status_code=201)
def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Validate a PDF resume, extract its text, build a profile and save the candidate."""
    filename = _safe_filename(file.filename)
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(415, "Only .pdf files are accepted.")
    if (file.content_type or "").lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(415, "Invalid file type. Only PDF resumes are accepted.")

    data = _read_limited(file)

    try:
        extracted = extract_text(data)
    except PDFExtractionError as exc:
        raise HTTPException(exc.status_code, exc.message) from exc

    fallback = re.sub(r"[_\-]+", " ", filename.rsplit(".", 1)[0]).strip().title() or "Unknown candidate"
    profile = parse_profile(extracted.text, fallback_name=fallback)

    candidate = Candidate(resume_filename=filename, resume_text=extracted.text, **profile)
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


@router.get("", response_model=CandidateList)
def list_candidates(
    q: str | None = Query(None, max_length=100, description="Search name or email"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(Candidate)
    if q and q.strip():
        term = q.strip()
        stmt = stmt.where(or_(Candidate.name.icontains(term, autoescape=True), Candidate.email.icontains(term, autoescape=True)))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Candidate.uploaded_at.desc(), Candidate.id.desc()).limit(limit).offset(offset)).all()
    return CandidateList(items=rows, total=total, limit=limit, offset=offset)


@router.get("/{candidate_id}", response_model=CandidateDetail)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.get(Candidate, candidate_id)
    if candidate is None:
        raise HTTPException(404, "Candidate not found.")
    return candidate
