"""Turn raw resume text into a structured candidate profile.

This is a *rule-based* parser (regex + keyword lists). It is fast, free, works offline
and is easy to test, but it is heuristic: unusual layouts will be partly missed.
In the AI module, Gemini can refine/verify these fields.
"""
import re
from datetime import date

from app.services.skills_vocab import SKILL_PATTERNS

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"\+?\d[\d\s().-]{8,17}\d")
YEAR_RE = re.compile(r"\b(?:19[89]\d|20\d{2})\b")

# ---- section headings -----------------------------------------------------
_HEADINGS = {
    "skills": {"skills", "technical skills", "key skills", "core competencies", "tech stack", "technologies", "skills and tools"},
    "experience": {"experience", "work experience", "professional experience", "employment history", "work history",
                   "internships", "internship experience", "internship", "professional background"},
    "education": {"education", "academic background", "academics", "education and qualifications", "academic qualifications"},
    "other": {"projects", "personal projects", "academic projects", "certifications", "certificates", "achievements",
              "awards", "summary", "professional summary", "objective", "career objective", "profile", "languages",
              "interests", "publications", "references", "about me", "extracurricular activities", "volunteering"},
}
_HEADING_LOOKUP = {name: key for key, names in _HEADINGS.items() for name in names}
_NOT_NAMES = {"resume", "curriculum vitae", "cv", "biodata"}


def _heading_key(line: str) -> str | None:
    norm = re.sub(r"[^a-z& ]", "", line.lower()).replace("&", "and").strip()
    norm = re.sub(r"\s+", " ", norm)
    if 0 < len(norm) <= 40:
        return _HEADING_LOOKUP.get(norm)
    return None


def split_sections(lines: list[str]) -> dict[str, list[str]]:
    """Group lines under the heading they follow. Lines before any heading go to 'header'."""
    sections: dict[str, list[str]] = {"header": []}
    current = "header"
    for line in lines:
        key = _heading_key(line.strip())
        if key:
            current = key if key not in sections or key == "other" else key
            sections.setdefault(current, [])
            continue
        sections.setdefault(current, []).append(line)
    return sections


# ---- contact ---------------------------------------------------------------
def extract_email(text: str) -> str | None:
    m = EMAIL_RE.search(text)
    return m.group(0).lower().rstrip(".") if m else None


def extract_phone(text: str) -> str | None:
    for m in PHONE_RE.finditer(text):
        digits = re.sub(r"\D", "", m.group(0))
        if 10 <= len(digits) <= 13:
            return re.sub(r"\s+", " ", m.group(0)).strip()
    return None


def guess_name(lines: list[str]) -> str | None:
    for raw in lines[:10]:
        line = raw.strip()
        if not line or "@" in line or "http" in line.lower() or PHONE_RE.search(line):
            continue
        if line.lower() in _NOT_NAMES or _heading_key(line):
            continue
        words = line.split()
        if 2 <= len(words) <= 4 and len(line) <= 40 and all(re.fullmatch(r"[A-Za-z][A-Za-z.'\-]*", w) for w in words):
            return line.title() if line.isupper() else line
    return None


# ---- skills ----------------------------------------------------------------
def extract_skills(text: str) -> list[str]:
    found = [canonical for canonical, patterns in SKILL_PATTERNS if any(p.search(text) for p in patterns)]
    return sorted(found, key=str.lower)


# ---- education -------------------------------------------------------------
_DEGREE_LONG = re.compile(
    r"\b(?:bachelors?|masters?|doctorate|diploma|associate degree|higher secondary|senior secondary|secondary school)\b", re.I
)
# abbreviations are case-sensitive so "be" / "ms" in normal sentences don't match
_DEGREE_ABBR = re.compile(
    r"(?<![A-Za-z])(?:B\.?\s?Tech|B\.?E\.?|B\.?Sc\.?|BCA|B\.?Com|B\.A\.|M\.?Tech|M\.E\.|M\.?Sc\.?|MCA|MBA|M\.S\.|Ph\.?D|BBA|HSC|SSC)(?![A-Za-z])"
)
_INSTITUTION = re.compile(r"\b(?:university|institute|college|school|academy|polytechnic|iit|nit|iiit)\b", re.I)


def _is_degree_line(line: str) -> bool:
    return bool(_DEGREE_LONG.search(line) or _DEGREE_ABBR.search(line))


def _clean(text: str) -> str:
    text = re.sub(r"\b(?:19|20)\d{2}\s*[-–—to]*\s*(?:(?:19|20)\d{2}|present|current)?\b", "", text, flags=re.I)
    return re.sub(r"\s{2,}", " ", text).strip(" ,;:|-–—•·()")[:120]


def extract_education(lines: list[str]) -> list[dict]:
    items: list[dict] = []
    seen: set[str] = set()
    for i, raw in enumerate(lines):
        line = raw.strip()
        if not line or not _is_degree_line(line):
            continue
        nxt = lines[i + 1].strip() if i + 1 < len(lines) and not _is_degree_line(lines[i + 1]) else ""
        block = f"{line} {nxt}"
        years = [int(y) for y in YEAR_RE.findall(block)]
        institution = None
        for candidate in (line, nxt):
            if candidate and _INSTITUTION.search(candidate):
                institution = _clean(candidate)
                break
        degree = _clean(line)
        if institution and institution == degree:
            institution = None
        key = degree.lower()
        if degree and key not in seen:
            seen.add(key)
            items.append({"degree": degree, "institution": institution or None, "year": years[-1] if years else None})
    return items[:6]


# ---- experience ------------------------------------------------------------
_MONTHS = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}
_DATE = r"(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?,?\s+(?:19|20)\d{2}|\d{1,2}/(?:19|20)\d{2}|(?:19|20)\d{2})"
_RANGE_RE = re.compile(rf"(?P<s>{_DATE})\s*(?:-|–|—|to)\s*(?P<e>{_DATE}|present|current|now|ongoing|till date)", re.I)


def _parse_point(token: str, is_end: bool, today: date) -> tuple[int, int] | None:
    t = token.strip().lower().rstrip(",.")
    if t in {"present", "current", "now", "ongoing", "till date"}:
        return today.year, today.month
    m = re.match(r"([a-z]+)\.?,?\s+((?:19|20)\d{2})$", t)
    if m and m.group(1)[:3] in _MONTHS:
        return int(m.group(2)), _MONTHS[m.group(1)[:3]]
    m = re.match(r"(\d{1,2})/((?:19|20)\d{2})$", t)
    if m and 1 <= int(m.group(1)) <= 12:
        return int(m.group(2)), int(m.group(1))
    m = re.match(r"((?:19|20)\d{2})$", t)
    if m:
        return int(m.group(1)), 12 if is_end else 1
    return None


def extract_experience(lines: list[str], today: date | None = None) -> dict:
    """Find date ranges inside the experience section and total them (overlaps counted once)."""
    today = today or date.today()
    entries: list[dict] = []
    spans: list[tuple[int, int]] = []  # as month indexes (year*12 + month)
    for i, raw in enumerate(lines):
        m = _RANGE_RE.search(raw)
        if not m:
            continue
        start = _parse_point(m.group("s"), False, today)
        end = _parse_point(m.group("e"), True, today)
        if not start or not end:
            continue
        s_idx, e_idx = start[0] * 12 + start[1], min(end[0] * 12 + end[1], today.year * 12 + today.month)
        if e_idx < s_idx:
            continue
        spans.append((s_idx, e_idx))
        title = re.sub(r"\s{2,}", " ", (raw[: m.start()] + " " + raw[m.end():])).strip(" ,;:|-–—•·()")
        if not title and i > 0:
            title = lines[i - 1].strip(" ,;:|-–—•·()")
        entries.append({"title": (title or "Role (title not detected)")[:120], "period": m.group(0).strip()})

    months = 0
    last_end: int | None = None
    for s, e in sorted(spans):  # merge overlapping ranges so parallel jobs aren't double counted
        if last_end is not None:
            s = max(s, last_end)
        if e > s:
            months += e - s
        last_end = e if last_end is None else max(last_end, e)
    return {"total_years": round(months / 12, 1), "entries": entries[:10]}


# ---- main entry -------------------------------------------------------------
def parse_profile(text: str, fallback_name: str = "Unknown candidate", today: date | None = None) -> dict:
    lines = text.splitlines()
    sections = split_sections(lines)
    has_headings = any(k in sections for k in ("experience", "education", "skills"))

    edu_lines = sections.get("education") or ([] if has_headings else lines)
    exp_lines = sections.get("experience", [])

    return {
        "name": guess_name(sections["header"] or lines) or fallback_name,
        "email": extract_email(text),
        "phone": extract_phone(text),
        "skills": extract_skills(text),
        "education": extract_education(edu_lines),
        "experience": extract_experience(exp_lines, today),
    }
