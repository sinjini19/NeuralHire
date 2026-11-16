from app.services.job_analyzer import analyze_job_description as analyze

FULL_JD = """About Us
We offer free Docker swag. 15 years of experience in the market. Our team knows Kubernetes.

Requirements
- 3-5 years of experience building backend services with Python and FastAPI
- Strong SQL and PostgreSQL skills
- Bachelor's degree in Computer Science or equivalent. B.Tech/MCA also accepted.

Nice to have
- React or TypeScript
- AWS Certified Solutions Architect is a plus

Benefits
- Remote work, 10 years of company history
This is a full-time position.
"""


def test_required_vs_preferred_from_headings():
    r = analyze(FULL_JD)
    assert {"Python", "FastAPI", "SQL", "PostgreSQL"} <= set(r["required_skills"])
    assert {"React", "TypeScript", "AWS"} <= set(r["preferred_skills"])
    assert not set(r["required_skills"]) & set(r["preferred_skills"])


def test_company_and_benefit_sections_are_ignored():
    r = analyze(FULL_JD)
    assert "Docker" not in r["required_skills"] + r["preferred_skills"]
    assert "Kubernetes" not in r["required_skills"] + r["preferred_skills"]
    assert r["min_experience_years"] == 3.0  # not 15 or 10


def test_every_skill_has_evidence_with_a_reason():
    r = analyze(FULL_JD)
    assert {e["skill"] for e in r["evidence"]} == set(r["required_skills"] + r["preferred_skills"])
    assert all(e["reason"] and e["line"] for e in r["evidence"])


def test_education_and_certifications():
    r = analyze(FULL_JD)
    assert len(r["education_requirements"]) == 1
    assert "Bachelor" in r["education_requirements"][0]
    assert any("AWS Certified" in c for c in r["certifications"])


def test_employment_type_detected():
    assert analyze(FULL_JD)["employment_type"] == "full_time"
    assert analyze("We are hiring a summer intern to help our data team with analysis.")["employment_type"] == "internship"
    assert analyze("This is a 6-month contract role for a backend developer here.")["employment_type"] == "contract"
    assert analyze("A role for someone who enjoys building things and shipping.")["employment_type"] is None


def test_inline_preferred_cue_without_headings():
    r = analyze("We need a developer who knows Python and Docker. Knowing Redis is a plus for this role.")
    assert {"Python", "Docker"} <= set(r["required_skills"])
    assert r["preferred_skills"] == ["Redis"]
    assert any("No section headings" in n for n in r["notes"])


def test_required_wins_when_skill_appears_both_ways():
    r = analyze("Requirements\n- Python\n\nNice to have\n- Python and Go\n")
    assert "Python" in r["required_skills"] and "Python" not in r["preferred_skills"]
    assert "Go" in r["preferred_skills"]


def test_experience_patterns():
    assert analyze("Requirements\n- At least 4 years of experience in backend work")["min_experience_years"] == 4.0
    assert analyze("Requirements\n- 2+ years experience with React")["min_experience_years"] == 2.0
    assert analyze("Requirements\n- 0-2 years of experience")["min_experience_years"] == 0.0
    assert analyze("Requirements\n- Minimum of 6 yrs experience")["min_experience_years"] == 6.0


def test_experience_takes_highest_and_explains():
    r = analyze("Requirements\n- 5+ years of software experience\n- 2+ years of experience with React")
    assert r["min_experience_years"] == 5.0
    assert any("highest" in n for n in r["notes"])


def test_entry_level_and_missing_experience():
    assert analyze("Requirements\n- Freshers welcome, Python knowledge needed")["min_experience_years"] == 0.0
    r = analyze("Requirements\n- Python and Django knowledge")
    assert r["min_experience_years"] is None
    assert any("No explicit" in n for n in r["notes"])


def test_non_requirement_year_mentions_are_ignored():
    r = analyze("Requirements\n- Python skills\nWe were founded 12 years ago and have experience in many markets.")
    assert r["min_experience_years"] is None


def test_word_be_is_not_a_degree():
    r = analyze("Requirements\n- You will be responsible for APIs and must be able to learn quickly.")
    assert r["education_requirements"] == []


def test_degree_abbreviations_detected():
    r = analyze("Requirements\n- B.Tech or MCA in a computer related field")
    assert r["education_requirements"] == ["B.Tech or MCA in a computer related field"]


def test_empty_result_has_helpful_notes():
    r = analyze("We are a company that likes people who are friendly and curious about things.")
    assert r["required_skills"] == [] and r["preferred_skills"] == []
    assert any("No known skills" in n for n in r["notes"])
