from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import APP_NAME, APP_VERSION, CORS_ORIGINS, GEMINI_API_KEY
from app.database import init_db
from app.routers import candidates, jobs, matching, ai, comparison, analytics


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()  # create tables on startup if they don't exist yet
    yield


app = FastAPI(title=APP_NAME, version=APP_VERSION, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(candidates.router)
app.include_router(jobs.router)
app.include_router(matching.router)
app.include_router(ai.router)
app.include_router(comparison.router)
app.include_router(analytics.router)


@app.get("/")
def root():
    return {"message": "NeuralHire API is running"}


@app.get("/health")
def health():
    # Reports whether the AI key is configured, never the key itself.
    return {"status": "ok", "version": APP_VERSION, "ai_configured": bool(GEMINI_API_KEY)}
