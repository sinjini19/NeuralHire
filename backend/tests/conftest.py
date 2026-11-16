import pymupdf
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

RESUME_TEXT = """AARAV SHARMA
aarav.sharma@example.com | +91 98765 43210

EXPERIENCE
Software Engineer - Acme Corp   Jan 2022 - Present
Built React and Node.js apps on AWS with Docker.

EDUCATION
B.Tech in Computer Science
KIIT University, Bhubaneswar  2018 - 2022

SKILLS
Python, JavaScript, TypeScript, FastAPI, SQL
"""


def make_pdf(text: str = RESUME_TEXT, *, pages: int = 1) -> bytes:
    doc = pymupdf.open()
    for _ in range(pages):
        page = doc.new_page()
        page.insert_textbox(pymupdf.Rect(50, 50, 550, 780), text, fontsize=10)
    data = doc.tobytes()
    doc.close()
    return data


def make_scanned_pdf() -> bytes:
    """A page containing only an image, like a scan: no selectable text."""
    doc = pymupdf.open()
    page = doc.new_page()
    pix = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 200, 200), False)
    pix.set_rect(pix.irect, (200, 200, 200))
    page.insert_image(pymupdf.Rect(50, 50, 400, 400), pixmap=pix)
    data = doc.tobytes()
    doc.close()
    return data


def make_encrypted_pdf() -> bytes:
    doc = pymupdf.open()
    doc.new_page().insert_text((72, 72), RESUME_TEXT[:200])
    data = doc.tobytes(encryption=pymupdf.PDF_ENCRYPT_AES_256, user_pw="secret", owner_pw="owner")
    doc.close()
    return data


@pytest.fixture()
def client():
    """Each test gets a brand-new in-memory database, so tests never affect each other."""
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    engine.dispose()
