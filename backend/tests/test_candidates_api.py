from app import config
from tests.conftest import make_encrypted_pdf, make_pdf, make_scanned_pdf


def upload(client, data: bytes, filename="resume.pdf", content_type="application/pdf"):
    return client.post("/api/candidates/upload", files={"file": (filename, data, content_type)})


def test_upload_creates_candidate(client):
    r = upload(client, make_pdf(), "Aarav_Sharma_Resume.pdf")
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "Aarav Sharma"
    assert body["email"] == "aarav.sharma@example.com"
    assert "Python" in body["skills"]
    assert body["resume_filename"] == "Aarav_Sharma_Resume.pdf"
    assert "AARAV SHARMA" in body["resume_text"]
    assert body["uploaded_at"].endswith(("Z", "+00:00"))  # timezone-aware UTC


def test_get_candidate_by_id(client):
    created = upload(client, make_pdf()).json()
    r = client.get(f"/api/candidates/{created['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == created["id"]
    assert "resume_text" in r.json()


def test_get_unknown_candidate_is_404(client):
    assert client.get("/api/candidates/999").status_code == 404


def test_list_is_empty_at_first(client):
    assert client.get("/api/candidates").json() == {"items": [], "total": 0, "limit": 50, "offset": 0}


def test_list_newest_first_and_excludes_resume_text(client):
    upload(client, make_pdf(), "first.pdf")
    upload(client, make_pdf(), "second.pdf")
    data = client.get("/api/candidates").json()
    assert data["total"] == 2
    assert [c["resume_filename"] for c in data["items"]] == ["second.pdf", "first.pdf"]
    assert "resume_text" not in data["items"][0]


def test_list_search_and_pagination(client):
    upload(client, make_pdf())
    upload(client, make_pdf("JANE DOE\njane@corp.io\nSKILLS\nPython, Docker, Linux, Git and many other tools here"))
    assert client.get("/api/candidates", params={"q": "jane"}).json()["total"] == 1
    assert client.get("/api/candidates", params={"q": "%"}).json()["total"] == 0  # wildcard is escaped
    page = client.get("/api/candidates", params={"limit": 1, "offset": 1}).json()
    assert page["total"] == 2 and len(page["items"]) == 1


def test_list_rejects_bad_pagination(client):
    assert client.get("/api/candidates", params={"limit": 0}).status_code == 422
    assert client.get("/api/candidates", params={"offset": -1}).status_code == 422


def test_rejects_wrong_extension(client):
    r = upload(client, make_pdf(), "resume.docx")
    assert r.status_code == 415 and "pdf" in r.json()["detail"].lower()


def test_rejects_wrong_mime_type(client):
    assert upload(client, make_pdf(), "resume.pdf", "text/plain").status_code == 415


def test_rejects_fake_pdf(client):
    r = upload(client, b"this is not a pdf, just text", "resume.pdf")
    assert r.status_code == 415


def test_rejects_empty_file(client):
    r = upload(client, b"")
    assert r.status_code == 400 and "empty" in r.json()["detail"].lower()


def test_rejects_oversized_file(client, monkeypatch):
    monkeypatch.setattr(config, "MAX_UPLOAD_BYTES", 1000)
    r = upload(client, make_pdf())
    assert r.status_code == 413


def test_rejects_corrupt_pdf(client):
    assert upload(client, make_pdf()[:200]).status_code == 422


def test_rejects_scanned_pdf_with_clear_message(client):
    r = upload(client, make_scanned_pdf())
    assert r.status_code == 422
    assert "scanned" in r.json()["detail"].lower()


def test_rejects_encrypted_pdf(client):
    r = upload(client, make_encrypted_pdf())
    assert r.status_code == 422 and "password" in r.json()["detail"].lower()


def test_failed_uploads_create_no_records(client):
    upload(client, b"")
    upload(client, make_scanned_pdf())
    assert client.get("/api/candidates").json()["total"] == 0


def test_filename_path_is_stripped(client):
    r = upload(client, make_pdf(), "../../etc/evil name.pdf")
    assert r.status_code == 201
    assert r.json()["resume_filename"] == "evil name.pdf"


def test_missing_file_field(client):
    assert client.post("/api/candidates/upload").status_code == 422
