"""Pydantic models = the shape of JSON that goes in and out of the API."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class EducationItem(BaseModel):
    degree: str
    institution: str | None = None
    year: int | None = None


class ExperienceEntry(BaseModel):
    title: str
    period: str


class Experience(BaseModel):
    total_years: float = 0.0
    entries: list[ExperienceEntry] = Field(default_factory=list)


class CandidateSummary(BaseModel):
    """What the list endpoint returns (no heavy resume text)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str | None
    phone: str | None
    skills: list[str]
    education: list[EducationItem]
    experience: Experience
    resume_filename: str
    uploaded_at: datetime


class CandidateDetail(CandidateSummary):
    resume_text: str


class CandidateList(BaseModel):
    items: list[CandidateSummary]
    total: int
    limit: int
    offset: int


# ===========================================================================
# Jobs
# ===========================================================================
JobStatus = Literal["draft", "open", "closed"]
EmploymentType = Literal["full_time", "part_time", "contract", "internship", "freelance"]

MAX_SKILLS = 50
MAX_SKILL_LEN = 60
MAX_EDUCATION_ITEMS = 10
MAX_EDUCATION_LEN = 200


def _clean_items(values: list[str], *, max_items: int, max_len: int, label: str) -> list[str]:
    """Trim, drop blanks, remove case-insensitive duplicates (keeps first spelling), enforce limits."""
    seen: set[str] = set()
    out: list[str] = []
    for raw in values:
        item = " ".join(raw.split())
        if not item:
            continue
        if len(item) > max_len:
            raise ValueError(f"Each {label} must be at most {max_len} characters.")
        if item.lower() not in seen:
            seen.add(item.lower())
            out.append(item)
    if len(out) > max_items:
        raise ValueError(f"At most {max_items} {label}s are allowed.")
    return out


class JobBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    company: str = Field(min_length=1, max_length=200)
    department: str | None = Field(default=None, max_length=100)
    location: str | None = Field(default=None, max_length=200)
    description: str = Field(min_length=20, max_length=20000)
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    min_experience_years: float = Field(default=0.0, ge=0, le=50)
    education_requirements: list[str] = Field(default_factory=list)
    employment_type: EmploymentType = "full_time"
    status: JobStatus = "open"

    @field_validator("department", "location")
    @classmethod
    def _blank_to_none(cls, v: str | None) -> str | None:
        return v or None  # "" becomes None so the DB never holds empty strings

    @field_validator("required_skills", "preferred_skills")
    @classmethod
    def _clean_skills(cls, v: list[str]) -> list[str]:
        return _clean_items(v, max_items=MAX_SKILLS, max_len=MAX_SKILL_LEN, label="skill")

    @field_validator("education_requirements")
    @classmethod
    def _clean_education(cls, v: list[str]) -> list[str]:
        return _clean_items(v, max_items=MAX_EDUCATION_ITEMS, max_len=MAX_EDUCATION_LEN, label="education requirement")

    @model_validator(mode="after")
    def _no_skill_in_both_lists(self):
        required = {s.lower() for s in self.required_skills}
        clash = [s for s in self.preferred_skills if s.lower() in required]
        if clash:
            raise ValueError(f"Skill(s) listed as both required and preferred: {', '.join(clash)}.")
        return self


class JobCreate(JobBase):
    pass


class JobUpdate(JobBase):
    """PUT replaces the whole job, so it has the same shape as create."""


class JobOut(JobBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class JobStatusCounts(BaseModel):
    all: int = 0
    draft: int = 0
    open: int = 0
    closed: int = 0


class JobList(BaseModel):
    items: list[JobOut]
    total: int  # matches the current filters, including status
    limit: int
    offset: int
    counts: JobStatusCounts  # per-status totals for the current search (ignores the status filter)


# ---- description analysis -------------------------------------------------
class JobAnalyzeRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    description: str = Field(min_length=20, max_length=20000)


class SkillEvidence(BaseModel):
    skill: str
    category: Literal["required", "preferred"]
    reason: str  # human-readable "why was it classified this way"
    line: str  # the line of the description that triggered it


class JobAnalysis(BaseModel):
    required_skills: list[str]
    preferred_skills: list[str]
    min_experience_years: float | None  # None = no explicit requirement found
    education_requirements: list[str]
    certifications: list[str]
    employment_type: EmploymentType | None
    evidence: list[SkillEvidence]
    experience_evidence: list[str]
    notes: list[str]
