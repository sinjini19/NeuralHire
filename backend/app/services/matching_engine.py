"""Deterministic, explainable candidate/job matching. No opaque ML prediction."""
import re
from datetime import datetime, timezone
from typing import Any

DEFAULT_WEIGHTS = {"skills": 50.0, "experience": 25.0, "education": 15.0, "preferred": 10.0}
ALIASES = {
    "js": "javascript", "ts": "typescript", "py": "python", "react.js": "react",
    "node.js": "node", "nodejs": "node", "fast api": "fastapi", "scikit learn": "scikit-learn",
    "ml": "machine learning", "postgres": "postgresql", "mongo": "mongodb",
}

def norm(value: str) -> str:
    value = re.sub(r"\s+", " ", str(value or "").strip().lower())
    return ALIASES.get(value, value)

def candidate_years(exp: Any) -> float | None:
    if not isinstance(exp, dict): return None
    value = exp.get("total_years")
    try: return max(0.0, float(value)) if value is not None else None
    except (TypeError, ValueError): return None

def score_candidate(candidate: Any, job: Any, weights: dict[str, float] | None = None) -> dict:
    w = dict(DEFAULT_WEIGHTS)
    if weights:
        for k in w:
            if k in weights: w[k] = float(weights[k])
    if any(v < 0 for v in w.values()) or sum(w.values()) <= 0:
        raise ValueError("Weights must be non-negative and have a positive total.")
    total_w = sum(w.values())
    w = {k: v * 100 / total_w for k, v in w.items()}

    skills = {norm(s) for s in (candidate.skills or []) if isinstance(s, str)}
    required = list(job.required_skills or [])
    preferred = list(job.preferred_skills or [])
    req_matches = [s for s in required if norm(s) in skills]
    req_missing = [s for s in required if norm(s) not in skills]
    pref_matches = [s for s in preferred if norm(s) in skills]
    skill_score = (100.0 if not required else 100 * len(req_matches) / len(required))
    preferred_score = (100.0 if not preferred else 100 * len(pref_matches) / len(preferred))

    years = candidate_years(candidate.experience)
    min_years = float(job.min_experience_years or 0)
    if years is None:
        exp_score, exp_note = 50.0, "Experience duration is not available; treated as unknown, not a rejection."
    elif min_years <= 0:
        exp_score, exp_note = 100.0, "No minimum experience requirement."
    else:
        exp_score = min(100.0, years / min_years * 100)
        exp_note = f"Candidate has {years:g} years; role asks for {min_years:g}."

    edu_reqs = [str(x) for x in (job.education_requirements or [])]
    edu_items = candidate.education or []
    edu_text = " ".join(str(x.get("degree", "")) + " " + str(x.get("institution", "")) for x in edu_items if isinstance(x, dict)).lower()
    if not edu_reqs:
        edu_score, edu_note = 100.0, "No education requirement specified."
    elif not edu_text.strip():
        edu_score, edu_note = 50.0, "Education information is unavailable; treated as unknown."
    else:
        edu_hits = [r for r in edu_reqs if norm(r) in norm(edu_text)]
        edu_score = 100 * len(edu_hits) / len(edu_reqs)
        edu_note = f"Matched {len(edu_hits)} of {len(edu_reqs)} education requirements."

    # Required skills carry the primary skills weight; preferred skills remain a separate signal.
    score = (skill_score * w["skills"] + exp_score * w["experience"] + edu_score * w["education"] + preferred_score * w["preferred"]) / 100
    details = {
        "skills": {"score": round(skill_score, 1), "weight": round(w["skills"], 1), "matched_required": req_matches, "missing_required": req_missing, "matched_preferred": pref_matches, "all_candidate_skills": sorted(skills)},
        "experience": {"score": round(exp_score, 1), "weight": round(w["experience"], 1), "candidate_years": years, "required_years": min_years, "explanation": exp_note},
        "education": {"score": round(edu_score, 1), "weight": round(w["education"], 1), "requirements": edu_reqs, "explanation": edu_note},
        "preferred": {"score": round(preferred_score, 1), "weight": round(w["preferred"], 1), "matched": pref_matches, "total": len(preferred)},
        "notes": ["This is a decision-support score, not an automated hiring decision.", "Unknown experience or education is treated neutrally and should be reviewed by a recruiter."],
    }
    return {"candidate_id": candidate.id, "candidate_name": candidate.name, "job_id": job.id, "score": round(score, 1), "matched_skills": req_matches + pref_matches, "missing_skills": req_missing, "details": details}
