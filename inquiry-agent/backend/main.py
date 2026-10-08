"""
FastAPI Server Entrypoint for Eximple Voice Agent Backend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routes import inquiries, calls, livekit

app = FastAPI(
    title="Eximple Shubh Voice Agent Backend",
    description="Async backend handling freight inquiry registration, Supabase persistence, LiveKit token issuance, and telecom cost tracking.",
    version="1.0.0",
)

# CORS configuration allowing local development and frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include route modules
app.include_router(inquiries.router)
app.include_router(calls.router)
app.include_router(livekit.router)


@app.get("/health", tags=["Health"])
async def health_check():
    """Service health check."""
    return {
        "status": "healthy",
        "service": "eximple-voice-agent-backend",
        "database": "supabase" if settings.SUPABASE_URL and "supabase.co" in settings.SUPABASE_URL else "in-memory",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True,
    )
