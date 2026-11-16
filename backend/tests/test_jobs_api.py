import pytest

VALID = {
    "title": "Senior Backend Engineer",
    "company": "Acme Corp",
    "department": "Engineering",
    "location": "Bhubaneswar, India",
    "description": "Build and maintain REST APIs using Python and FastAPI for our hiring platform.",
    "required_skills": ["Python", "FastAPI"],
    "preferred_skills": ["Docker"],
    "min_experience_years": 3,
    "education_requirements": ["B.Tech in Computer Science"],
    "employment_type": "full_time",
    "status": "open",
}


def make(client, **overrides):
    r = client.post("/api/jobs", json={**VALID, **overrides})
    assert r.status_code == 201, r.text
    return r.json()


# ---- create / read ---------------------------------------------------------
def test_create_job(client):
    job = make(client)
    assert job["id"] >= 1
    assert job["title"] == "Senior Backend Engineer"
    assert job["required_skills"] == ["Python", "FastAPI"]
    assert job["created_at"].endswith(("Z", "+00:00"))
    assert job["updated_at"] == job["created_at"]


def test_create_applies_defaults(client):
    r = client.post("/api/jobs", json={"title": "Dev", "company": "X", "description": "A description that is long enough."})
    body = r.json()
    assert r.status_code == 201
    assert body["status"] == "open" and body["employment_type"] == "full_time"
    assert body["required_skills"] == [] and body["min_experience_years"] == 0


def test_create_cleans_input(client):
    job = make(client, title="  Padded  ", department="   ", required_skills=["Python", " python ", "", "React"])
    assert job["title"] == "Padded"
    assert job["department"] is None
    assert job["required_skills"] == ["Python", "React"]


def test_get_job_and_404(client):
    job = make(client)
    assert client.get(f"/api/jobs/{job['id']}").json()["company"] == "Acme Corp"
    r = client.get("/api/jobs/9999")
    assert r.status_code == 404 and r.json()["detail"] == "Job not found."


# ---- validation ------------------------------------------------------------
@pytest.mark.parametrize(
    "overrides",
    [
        {"title": ""},
        {"title": "   "},
        {"title": "x" * 201},
        {"company": ""},
        {"description": "too short"},
        {"description": "x" * 20001},
        {"min_experience_years": -1},
        {"min_experience_years": 51},
        {"min_experience_years": "lots"},
        {"status": "archived"},
        {"employment_type": "weekend"},
        {"required_skills": ["x" * 61]},
        {"required_skills": [f"Skill{i}" for i in range(51)]},
        {"required_skills": ["Python"], "preferred_skills": ["python"]},
        {"required_skills": "Python"},
    ],
)
def test_create_rejects_invalid_input(client, overrides):
    r = client.post("/api/jobs", json={**VALID, **overrides})
    assert r.status_code == 422
    assert client.get("/api/jobs").json()["total"] == 0  # nothing was saved


def test_create_rejects_missing_fields(client):
    assert client.post("/api/jobs", json={}).status_code == 422


# ---- update ----------------------------------------------------------------
def test_update_replaces_fields_and_bumps_updated_at(client):
    job = make(client)
    r = client.put(f"/api/jobs/{job['id']}", json={**VALID, "title": "Staff Engineer", "status": "closed", "required_skills": ["Go"]})
    body = r.json()
    assert r.status_code == 200
    assert body["title"] == "Staff Engineer" and body["status"] == "closed" and body["required_skills"] == ["Go"]
    assert body["created_at"] == job["created_at"]
    assert body["updated_at"] > job["updated_at"]


def test_update_persists(client):
    job = make(client)
    client.put(f"/api/jobs/{job['id']}", json={**VALID, "company": "NewCo"})
    assert client.get(f"/api/jobs/{job['id']}").json()["company"] == "NewCo"


def test_update_validates_and_404s(client):
    job = make(client)
    assert client.put(f"/api/jobs/{job['id']}", json={**VALID, "title": ""}).status_code == 422
    assert client.get(f"/api/jobs/{job['id']}").json()["title"] == VALID["title"]  # unchanged
    assert client.put("/api/jobs/9999", json=VALID).status_code == 404


# ---- delete ----------------------------------------------------------------
def test_delete_job(client):
    job = make(client)
    r = client.delete(f"/api/jobs/{job['id']}")
    assert r.status_code == 204 and r.content == b""
    assert client.get(f"/api/jobs/{job['id']}").status_code == 404
    assert client.delete(f"/api/jobs/{job['id']}").status_code == 404


# ---- list / search / filter -----------------------------------------------
@pytest.fixture()
def seeded(client):
    make(client, title="Python Developer", company="Acme Corp", status="open")
    make(client, title="React Developer", company="Globex", status="open", employment_type="contract")
    make(client, title="Data Scientist", company="Acme Labs", status="draft")
    make(client, title="Product Manager", company="Initech", status="closed")
    return client


def test_list_empty(client):
    body = client.get("/api/jobs").json()
    assert body["items"] == [] and body["total"] == 0
    assert body["counts"] == {"all": 0, "draft": 0, "open": 0, "closed": 0}


def test_list_newest_first(seeded):
    titles = [j["title"] for j in seeded.get("/api/jobs").json()["items"]]
    assert titles == ["Product Manager", "Data Scientist", "React Developer", "Python Developer"]


def test_search_q_matches_title_or_company(seeded):
    assert seeded.get("/api/jobs", params={"q": "developer"}).json()["total"] == 2
    assert seeded.get("/api/jobs", params={"q": "ACME"}).json()["total"] == 2  # case-insensitive, company
    assert seeded.get("/api/jobs", params={"q": "nothing-here"}).json()["total"] == 0


def test_filter_by_title_company_status(seeded):
    assert seeded.get("/api/jobs", params={"title": "data"}).json()["total"] == 1
    assert seeded.get("/api/jobs", params={"company": "acme"}).json()["total"] == 2
    assert seeded.get("/api/jobs", params={"status": "open"}).json()["total"] == 2
    both = seeded.get("/api/jobs", params={"company": "acme", "status": "draft"}).json()
    assert [j["title"] for j in both["items"]] == ["Data Scientist"]
    assert seeded.get("/api/jobs", params={"employment_type": "contract"}).json()["total"] == 1


def test_counts_ignore_status_filter_but_respect_search(seeded):
    body = seeded.get("/api/jobs", params={"status": "open", "q": "acme"}).json()
    assert body["total"] == 1  # Acme Corp, open
    assert body["counts"] == {"all": 2, "draft": 1, "open": 1, "closed": 0}
    all_counts = seeded.get("/api/jobs").json()["counts"]
    assert all_counts == {"all": 4, "draft": 1, "open": 2, "closed": 1}


def test_search_wildcards_are_escaped(seeded):
    assert seeded.get("/api/jobs", params={"q": "%"}).json()["total"] == 0
    assert seeded.get("/api/jobs", params={"q": "_"}).json()["total"] == 0


def test_pagination(seeded):
    page = seeded.get("/api/jobs", params={"limit": 2, "offset": 2}).json()
    assert page["total"] == 4 and len(page["items"]) == 2 and page["offset"] == 2


@pytest.mark.parametrize("params", [{"limit": 0}, {"limit": 101}, {"offset": -1}, {"status": "bogus"}, {"employment_type": "bogus"}])
def test_list_rejects_bad_params(client, params):
    assert client.get("/api/jobs", params=params).status_code == 422


# ---- analyze endpoint ------------------------------------------------------
def test_analyze_endpoint_returns_suggestions_and_saves_nothing(client):
    desc = "Requirements\n- 3+ years of experience with Python and FastAPI\nNice to have\n- Docker\nFull-time role."
    r = client.post("/api/jobs/analyze", json={"description": desc})
    body = r.json()
    assert r.status_code == 200
    assert body["required_skills"] == ["FastAPI", "Python"] and body["preferred_skills"] == ["Docker"]
    assert body["min_experience_years"] == 3 and body["employment_type"] == "full_time"
    assert body["evidence"][0]["reason"]
    assert client.get("/api/jobs").json()["total"] == 0


def test_analyze_validates_input(client):
    assert client.post("/api/jobs/analyze", json={"description": "short"}).status_code == 422
    assert client.post("/api/jobs/analyze", json={}).status_code == 422


# ---- other features still work alongside jobs ------------------------------
def test_candidates_and_jobs_coexist(client):
    from tests.conftest import make_pdf

    make(client)
    up = client.post("/api/candidates/upload", files={"file": ("cv.pdf", make_pdf(), "application/pdf")})
    assert up.status_code == 201
    assert client.get("/api/candidates").json()["total"] == 1
    assert client.get("/api/jobs").json()["total"] == 1
