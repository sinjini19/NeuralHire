"""Transparent, rule-based job description analysis.

No AI and no hidden scoring: every result comes from a regex or keyword rule that is
written out below, and every skill carries an `evidence` entry explaining WHY it was
classified as required or preferred. In a later module Gemini can double-check this.

Rules in plain English
----------------------
1. Split the description into lines and detect section headings
   ("Requirements", "Nice to have", "Benefits", ...).
2. A skill (from the same vocabulary used for resumes) is PREFERRED when its sentence contains a
   soft cue ("nice to have", "a plus", "bonus", "preferred"...) or sits under a preferred heading.
   Otherwise it is REQUIRED. If it appears both ways, REQUIRED wins.
3. Skills mentioned only under company/benefits headings are ignored ("we offer free Docker swag").
4. Experience: look for "N years" / "N-M years" / "at least N years" on lines that talk about
   experience. The highest minimum found wins. "Fresher"/"entry level" means 0.
5. Education: lines naming a degree (Bachelor's, B.Tech, MCA, PhD ...).
   Certifications: lines containing "certified"/"certification".
6. Employment type: keywords like "full-time", "internship", "contract".
"""
import re

from app.services.skills_vocab import SKILL_PATTERNS

# ---------------------------------------------------------------------------
# Section headings
# ---------------------------------------------------------------------------
_REQUIRED_HEADING = re.compile(
    r"^(requirements?|required( skills| qualifications| experience)?|must[- ]haves?|qualifications?|"
    r"minimum qualifications?|basic qualifications?|key skills|technical skills|skills( (and|&) experience)?|"
    r"what you('?ll| will)? (need|bring)|what we('?re| are) looking for|who you are|"
    r"responsibilities|key responsibilities|what you('?ll| will) do|the role|about the role|"
    r"job description|job responsibilities|duties)$"
)
_PREFERRED_HEADING = re.compile(
    r"^(nice[- ]to[- ]haves?|preferred( skills| qualifications| experience)?|bonus( points)?|good[- ]to[- ]haves?|"
    r"desirable( skills)?|plus(es)?|additional qualifications?|extra credit)$"
)
_IGNORED_HEADING = re.compile(
    r"^(about (us|the company|the team)|who we are|our company|company( overview)?|benefits|perks|"
    r"perks (and|&) benefits|what we offer|why join us|why us|compensation|equal opportunity( employer)?|"
    r"how to apply|our (culture|values|mission))$"
)

# Soft cue inside a single line
_PREFERRED_CUE = re.compile(
    r"\b(nice[- ]to[- ]have|nice to haves|preferred|a plus|is a plus|are a plus|bonus|good[- ]to[- ]have|desirable|"
    r"ideally|an advantage|advantageous|familiarity with|exposure to|would be great)\b",
    re.I,
)

_BULLET = re.compile(r"^[\s\-\*\u2022\u25cf\u25aa\u00b7>\u2013\u2014]+")


def _strip_bullet(line: str) -> str:
    return _BULLET.sub("", line).strip()


def _heading_kind(line: str) -> str | None:
    norm = re.sub(r"[^a-z&' /-]", "", _strip_bullet(line).lower()).strip()
    norm = re.sub(r"\s+", " ", norm).replace("&", "and")
    if not norm or len(norm.split()) > 7:
        return None
    if _PREFERRED_HEADING.match(norm):
        return "preferred"
    if _IGNORED_HEADING.match(norm):
        return "ignored"
    if _REQUIRED_HEADING.match(norm):
        return "required"
    return None


def _short(line: str, n: int = 160) -> str:
    line = " ".join(line.split())
    return line if len(line) <= n else line[: n - 1].rstrip() + "…"


def _iter_lines(lines: list[str]):
    """Yield (section, bullet-stripped line) for every content line.

    Headings are consumed, not yielded. Lines under company/benefit headings are skipped, so
    "10 years in business" or "free Docker swag" can never become a requirement.
    Section is 'neutral' until the first heading appears.
    """
    section = "neutral"
    for raw in lines:
        stripped = raw.strip()
        if not stripped:
            continue
        kind = _heading_kind(stripped)
        if kind:
            section = kind
            continue
        if section == "ignored":
            continue
        yield section, _strip_bullet(stripped)


# ---------------------------------------------------------------------------
# Skills
# ---------------------------------------------------------------------------
_SENTENCE_SPLIT = re.compile(r"(?<=[.;!?])\s+(?=[A-Z0-9])")


def _classify_sentence(section: str, line: str, found: dict[str, dict]) -> None:
    for canonical, patterns in SKILL_PATTERNS:
        if not any(p.search(line) for p in patterns):
            continue
        cue = _PREFERRED_CUE.search(line)
        if cue:
            category, reason = "preferred", f"sentence contains the cue “{cue.group(0)}”"
        elif section == "preferred":
            category, reason = "preferred", "listed under a “nice to have / preferred” heading"
        elif section == "required":
            category, reason = "required", "listed under a requirements / responsibilities heading"
        else:
            category, reason = "required", "mentioned in the description with no “preferred” wording"

        existing = found.get(canonical)
        # REQUIRED always beats PREFERRED, otherwise keep the first sighting
        if existing is None or (existing["category"] == "preferred" and category == "required"):
            found[canonical] = {"skill": canonical, "category": category, "reason": reason, "line": _short(line)}


def _analyze_skills(lines: list[str]) -> tuple[list[str], list[str], list[dict], list[str]]:
    found: dict[str, dict] = {}  # skill -> evidence of the strongest classification
    saw_heading = any(_heading_kind(ln) for ln in lines if ln.strip())

    for section, full_line in _iter_lines(lines):
        # Judge each sentence on its own, so "Needs Python. Redis is a plus." splits correctly.
        for line in _SENTENCE_SPLIT.split(full_line):
            line = line.strip()
            if line:
                _classify_sentence(section, line, found)

    evidence = sorted(found.values(), key=lambda e: (e["category"] != "required", e["skill"].lower()))
    required = [e["skill"] for e in evidence if e["category"] == "required"]
    preferred = [e["skill"] for e in evidence if e["category"] == "preferred"]

    notes: list[str] = []
    if not found:
        notes.append("No known skills were found. Add them manually, or extend the skill list in skills_vocab.py.")
    elif not saw_heading:
        notes.append("No section headings detected, so skills are treated as required unless a line says “nice to have”, “preferred”, etc.")
    return required, preferred, evidence, notes


# ---------------------------------------------------------------------------
# Experience
# ---------------------------------------------------------------------------
_NUM = r"(\d+(?:\.\d+)?)"
_YRS = r"(?:years?|yrs?)"
_RANGE = re.compile(rf"{_NUM}\s*\+?\s*(?:-|–|—|to)\s*{_NUM}\s*\+?\s*{_YRS}", re.I)
_ATLEAST = re.compile(rf"(?:at least|minimum(?: of)?|min\.?|over|more than)\s*{_NUM}\s*\+?\s*{_YRS}", re.I)
_PLAIN = re.compile(rf"{_NUM}\s*\+?\s*{_YRS}", re.I)
_EXPERIENCE_CONTEXT = re.compile(r"\bexperience\b|\bexp\b|\d\s*\+?\s*(?:years?|yrs?)\s+(?:of|in|as|working|building|developing|with)\b", re.I)
_NOT_REQUIREMENT = re.compile(r"\b(ago|founded|established|since|warranty|growth|history|in business)\b", re.I)
_ENTRY_LEVEL = re.compile(r"\b(freshers?|entry[- ]level|no (?:prior |previous )?experience (?:is )?(?:required|needed|necessary)|recent graduates?)\b", re.I)


def _analyze_experience(lines: list[str]) -> tuple[float | None, list[str], list[str]]:
    values: list[float] = []
    evidence: list[str] = []
    entry_line: str | None = None

    for _section, line in _iter_lines(lines):
        if entry_line is None and _ENTRY_LEVEL.search(line):
            entry_line = line
        if not _EXPERIENCE_CONTEXT.search(line) or _NOT_REQUIREMENT.search(line):
            continue

        line_values = [float(m.group(1)) for m in _RANGE.finditer(line)]  # "3-5 years" -> 3
        masked = _RANGE.sub(" ", line)
        line_values += [float(m.group(1)) for m in _ATLEAST.finditer(masked)]
        masked = _ATLEAST.sub(" ", masked)
        line_values += [float(m.group(1)) for m in _PLAIN.finditer(masked)]
        line_values = [v for v in line_values if 0 <= v <= 50]
        if line_values:
            values.extend(line_values)
            evidence.append(_short(line))

    notes: list[str] = []
    if values:
        result = max(values)
        if len(set(values)) > 1:
            notes.append(f"Several experience figures were found ({', '.join(f'{v:g}' for v in sorted(set(values)))}); the highest, {result:g} years, was used.")
        return result, evidence, notes
    if entry_line:
        return 0.0, [_short(entry_line)], ["Entry-level wording found, so minimum experience is 0 years."]
    notes.append("No explicit years-of-experience requirement found.")
    return None, [], notes


# ---------------------------------------------------------------------------
# Education + certifications
# ---------------------------------------------------------------------------
_DEGREE_LONG = re.compile(
    r"\b(?:bachelor(?:'?s|s)?|master(?:'?s|s)\b|master of|masters? degree|ph\.?d|doctorate|diploma|degree|graduate degree)\b", re.I
)
# Abbreviations are case-sensitive so the English word "be" is not read as B.E.
_DEGREE_ABBR = re.compile(
    r"(?<![A-Za-z])(?:B\.?\s?Tech|B\.E\.?|BE|B\.?Sc\.?|BCA|B\.?Com|BBA|M\.?Tech|M\.E\.?|M\.?Sc\.?|MCA|MBA|M\.S\.|Ph\.?D)(?![A-Za-z])"
)
_CERT = re.compile(r"\bcertif(?:ied|ication|ications|icate|icates)\b", re.I)


def _sentences_matching(line: str, *patterns: re.Pattern[str]) -> str:
    """Return just the sentence(s) of `line` that match, so long bullet paragraphs stay readable."""
    parts = re.split(r"(?<=[.;])\s+(?=[A-Z])", line)
    hits = [p for p in parts if any(pat.search(p) for pat in patterns)]
    return _short(" ".join(hits) or line, 200)


def _analyze_qualifications(lines: list[str]) -> tuple[list[str], list[str]]:
    education: list[str] = []
    certs: list[str] = []
    seen: set[str] = set()
    for _section, line in _iter_lines(lines):
        if len(line) < 6:
            continue
        if _DEGREE_LONG.search(line) or _DEGREE_ABBR.search(line):
            item = _sentences_matching(line, _DEGREE_LONG, _DEGREE_ABBR)
            if item.lower() not in seen:
                seen.add(item.lower())
                education.append(item)
        elif _CERT.search(line):
            item = _sentences_matching(line, _CERT)
            if item.lower() not in seen:
                seen.add(item.lower())
                certs.append(item)
    return education[:10], certs[:10]


# ---------------------------------------------------------------------------
# Employment type
# ---------------------------------------------------------------------------
# Order matters: the most specific type is checked first.
_EMPLOYMENT_RULES: list[tuple[str, re.Pattern[str]]] = [
    ("internship", re.compile(r"\binterns?\b|\binternship\b", re.I)),
    ("part_time", re.compile(r"\bpart[- ]time\b", re.I)),
    ("contract", re.compile(r"\bcontract(?:or)?\b|\bfixed[- ]term\b|\bcontract[- ]to[- ]hire\b", re.I)),
    ("freelance", re.compile(r"\bfreelanc(?:e|er|ing)\b", re.I)),
    ("full_time", re.compile(r"\bfull[- ]time\b|\bpermanent\b", re.I)),
]


def _analyze_employment_type(text: str) -> tuple[str | None, list[str]]:
    matches = [name for name, pat in _EMPLOYMENT_RULES if pat.search(text)]
    if not matches:
        return None, []
    notes = []
    if len(matches) > 1:
        notes.append(f"Several employment types were mentioned ({', '.join(matches)}); “{matches[0]}” was suggested. Please check.")
    return matches[0], notes


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
def analyze_job_description(description: str) -> dict:
    lines = description.splitlines()
    required, preferred, evidence, skill_notes = _analyze_skills(lines)
    min_exp, exp_evidence, exp_notes = _analyze_experience(lines)
    education, certs = _analyze_qualifications(lines)
    employment, emp_notes = _analyze_employment_type(description)

    notes = skill_notes + exp_notes + emp_notes
    if not education:
        notes.append("No degree requirement found.")

    return {
        "required_skills": required,
        "preferred_skills": preferred,
        "min_experience_years": min_exp,
        "education_requirements": education,
        "certifications": certs,
        "employment_type": employment,
        "evidence": evidence,
        "experience_evidence": exp_evidence,
        "notes": notes,
    }
