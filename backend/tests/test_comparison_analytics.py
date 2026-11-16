from tests.conftest import make_pdf

JOB = {
    "title": "Backend Developer", "company": "NeuralHire", "description": "Build backend services using Python and FastAPI. Minimum 2 years experience.",
    "required_skills": ["Python", "FastAPI"], "preferred_skills": ["Docker"],
    "min_experience_years": 2, "education_requirements": ["B.Tech"],
    "employment_type": "full_time", "status": "open"
}

def add_candidate(client, filename):
    response = client.post("/api/candidates/upload", files={"file": (filename, make_pdf(), "application/pdf")})
    assert response.status_code == 201, response.text
    return response.json()["id"]

def test_comparison_requires_two_to_four_candidates(client):
    r = client.post("/api/comparison", json={"job_id": 1, "candidate_ids": [1]})
    assert r.status_code == 422

def test_comparison_returns_same_job_context_and_ranked_candidates(client):
    j = client.post("/api/jobs", json=JOB)
    assert j.status_code == 201
    c1, c2 = add_candidate(client, "one.pdf"), add_candidate(client, "two.pdf")
    r = client.post("/api/comparison", json={"job_id": j.json()["id"], "candidate_ids": [c1, c2]})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["job"]["title"] == "Backend Developer"
    assert len(data["candidates"]) == 2
    assert data["candidates"][0]["match"]["score"] >= data["candidates"][1]["match"]["score"]
    assert "missing_skills" in data["candidates"][0]["match"]

def test_comparison_rejects_duplicate_candidate_ids(client):
    j = client.post("/api/jobs", json=JOB)
    c = add_candidate(client, "one.pdf")
    r = client.post("/api/comparison", json={"job_id": j.json()["id"], "candidate_ids": [c, c]})
    assert r.status_code == 422

def test_analytics_is_database_backed_and_empty_safe(client):
    r = client.get("/api/analytics/overview")
    assert r.status_code == 200
    data = r.json()
    assert data["source"] == "live_database"
    assert data["totals"] == {"candidates": 0, "jobs": 0, "open_jobs": 0, "saved_matches": 0}
    assert len(data["match_score_distribution"]) == 4

def test_analytics_counts_created_job_and_candidates(client):
    j = client.post("/api/jobs", json=JOB)
    assert j.status_code == 201
    add_candidate(client, "one.pdf")
    data = client.get("/api/analytics/overview").json()
    assert data["totals"]["jobs"] == 1
    assert data["totals"]["open_jobs"] == 1
    assert data["totals"]["candidates"] == 1
