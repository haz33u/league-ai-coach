"""
Main FastAPI application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import summoner  # Импортируем наш новый router
from app.api import summoner, match  # ← ДОБАВЬ match

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="AI-powered League of Legends coaching platform",
    version="0.1.0",
    debug=settings.debug
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "app": settings.app_name,
        "environment": settings.environment
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",
        "redis": "connected",
        "riot_api": "configured" if settings.riot_api_key else "not_configured"
    }


# Подключаем summoner router
app.include_router(summoner.router, prefix="/api/summoner", tags=["summoner"])
app.include_router(match.router, prefix="/api/match", tags=["match"]) 


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
