"""PDF validation + text extraction using PyMuPDF.

Kept separate from the FastAPI router so it can be tested without HTTP.
"""
from dataclasses import dataclass

import pymupdf

from app import config


class PDFExtractionError(Exception):
    """A problem with the PDF itself. Carries an HTTP status + a user-friendly message."""

    def __init__(self, message: str, status_code: int = 422):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass
class ExtractedPDF:
    text: str
    page_count: int


def extract_text(data: bytes) -> ExtractedPDF:
    """Open PDF bytes, extract text from every page, and reject unusable files."""
    if not data:
        raise PDFExtractionError("The uploaded file is empty.", 400)

    # The Content-Type header and file name are supplied by the client and can lie.
    # Real PDFs start with '%PDF-' (some have a little junk before it, so we check the first 1 KB).
    if b"%PDF-" not in data[:1024]:
        raise PDFExtractionError("This file is not a valid PDF (missing PDF header).", 415)

    try:
        doc = pymupdf.open(stream=data, filetype="pdf")
    except pymupdf.EmptyFileError:
        raise PDFExtractionError("The uploaded file is empty.", 400)
    except Exception:
        raise PDFExtractionError("This PDF is corrupted or unreadable. Please re-export it and try again.")

    try:
        if doc.needs_pass or doc.is_encrypted:
            raise PDFExtractionError("This PDF is password-protected. Remove the password and upload it again.")
        if doc.page_count == 0:
            raise PDFExtractionError("This PDF has no pages.")
        if doc.page_count > config.MAX_PDF_PAGES:
            raise PDFExtractionError(
                f"This PDF has {doc.page_count} pages. Resumes longer than {config.MAX_PDF_PAGES} pages are not accepted."
            )

        parts: list[str] = []
        try:
            for page in doc:
                parts.append(page.get_text("text", sort=True))
        except Exception:
            raise PDFExtractionError("Part of this PDF could not be read. It may be corrupted.")

        text = "\n".join(parts).replace("\x00", "")
        # collapse runs of blank lines; keep line structure because the profile parser relies on it
        lines = [ln.rstrip() for ln in text.splitlines()]
        cleaned = "\n".join(lines)
        while "\n\n\n" in cleaned:
            cleaned = cleaned.replace("\n\n\n", "\n\n")
        cleaned = cleaned.strip()

        if len(cleaned) < config.MIN_EXTRACTED_CHARS:
            raise PDFExtractionError(
                "No readable text was found. This looks like a scanned or image-only PDF. "
                "Upload a text-based PDF (exported from Word/Google Docs), or run OCR on it first."
            )

        return ExtractedPDF(text=cleaned[: config.MAX_STORED_CHARS], page_count=doc.page_count)
    finally:
        doc.close()
