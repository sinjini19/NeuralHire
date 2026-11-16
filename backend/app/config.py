"""Central configuration. All secrets/settings come from environment variables."""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()  # reads backend/.env if it exists

# backend/ folder, resolved from this file so it works no matter where you run uvicorn from
BASE_DIR = Path(__file__).resolve().parent.parent

APP_NAME = "NeuralHire API"
APP_VERSION = "0.4.0"

# Comma-separated list, e.g. "http://localhost:5173,http://127.0.0.1:5173"
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if o.strip()
]

# Used in later modules. Never hardcode this or send it to the frontend.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# --- Database -------------------------------------------------------------
DATA_DIR = BASE_DIR / "data"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{(DATA_DIR / 'neuralhire.db').as_posix()}")

# --- Resume upload limits -------------------------------------------------
MAX_UPLOAD_MB = float(os.getenv("MAX_UPLOAD_MB", "5"))
MAX_UPLOAD_BYTES = int(MAX_UPLOAD_MB * 1024 * 1024)
MAX_PDF_PAGES = int(os.getenv("MAX_PDF_PAGES", "30"))
# Fewer characters than this = treat the PDF as scanned / image-only
MIN_EXTRACTED_CHARS = int(os.getenv("MIN_EXTRACTED_CHARS", "50"))
# Safety cap on how much text we store per resume
MAX_STORED_CHARS = 100_000
