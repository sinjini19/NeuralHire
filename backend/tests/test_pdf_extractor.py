import pytest

from app import config
from app.services.pdf_extractor import PDFExtractionError, extract_text
from tests.conftest import make_encrypted_pdf, make_pdf, make_scanned_pdf


def test_extracts_text_and_page_count():
    result = extract_text(make_pdf(pages=2))
    assert "AARAV SHARMA" in result.text
    assert result.page_count == 2


def test_empty_bytes():
    with pytest.raises(PDFExtractionError) as e:
        extract_text(b"")
    assert e.value.status_code == 400


def test_not_a_pdf():
    with pytest.raises(PDFExtractionError) as e:
        extract_text(b"hello, I am a text file pretending to be a pdf")
    assert e.value.status_code == 415


def test_corrupt_pdf_with_valid_header():
    corrupt = make_pdf()[:200]  # truncated, but still starts with %PDF-
    with pytest.raises(PDFExtractionError) as e:
        extract_text(corrupt)
    assert e.value.status_code == 422


def test_scanned_pdf_gives_helpful_message():
    with pytest.raises(PDFExtractionError) as e:
        extract_text(make_scanned_pdf())
    assert "scanned" in e.value.message.lower()
    assert "ocr" in e.value.message.lower()


def test_password_protected_pdf():
    with pytest.raises(PDFExtractionError) as e:
        extract_text(make_encrypted_pdf())
    assert "password" in e.value.message.lower()


def test_too_many_pages(monkeypatch):
    monkeypatch.setattr(config, "MAX_PDF_PAGES", 2)
    with pytest.raises(PDFExtractionError) as e:
        extract_text(make_pdf(pages=3))
    assert "3 pages" in e.value.message
