from datetime import date

from app.services.profile_parser import extract_experience, extract_phone, extract_skills, parse_profile
from tests.conftest import RESUME_TEXT

TODAY = date(2026, 11, 16)


def test_full_profile():
    p = parse_profile(RESUME_TEXT, today=TODAY)
    assert p["name"] == "Aarav Sharma"
    assert p["email"] == "aarav.sharma@example.com"
    assert p["phone"] == "+91 98765 43210"
    assert {"Python", "React", "Node.js", "AWS", "Docker", "FastAPI", "SQL"} <= set(p["skills"])
    assert p["education"][0]["degree"] == "B.Tech in Computer Science"
    assert p["education"][0]["institution"] == "KIIT University, Bhubaneswar"
    assert p["education"][0]["year"] == 2022
    assert p["experience"]["total_years"] == 4.8
    assert p["experience"]["entries"][0]["period"] == "Jan 2022 - Present"


def test_name_falls_back_to_filename():
    p = parse_profile("email only: a@b.com\nSKILLS\nPython", fallback_name="Jane Doe")
    assert p["name"] == "Jane Doe"


def test_skill_matching_avoids_false_positives():
    skills = extract_skills("JavaScript developer. We love to go to market. Visit github.com/me")
    assert "JavaScript" in skills
    assert "Java" not in skills  # inside JavaScript
    assert "Go" not in skills  # lowercase English word
    assert "GitHub" not in skills  # just a domain name


def test_skill_aliases_map_to_canonical_names():
    assert {"React", "Node.js", "scikit-learn"} <= set(extract_skills("ReactJS, NodeJS and sklearn"))


def test_overlapping_jobs_not_double_counted():
    exp = extract_experience(["A  Jan 2020 - Dec 2020", "B  Jun 2020 - Mar 2021"], TODAY)
    assert exp["total_years"] == 1.2  # 14 months, not 21


def test_phone_ignores_year_ranges():
    assert extract_phone("2018 - 2022 and 2019-2023") is None


def test_no_sections_still_returns_valid_shape():
    p = parse_profile("just some random words with no structure at all here", today=TODAY)
    assert p["skills"] == [] and p["education"] == []
    assert p["experience"] == {"total_years": 0.0, "entries": []}
