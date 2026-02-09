"""
Match API endpoints
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.services.riot_api import RiotAPIService, RiotAPIError

riot_api = RiotAPIService()
router = APIRouter()


@router.get("/health")
async def match_health():
    return {"status": "ok", "endpoint": "/api/match/{match_id}"}

@router.get("/{match_id}", response_model=Dict[str, Any])
async def get_match_details(match_id: str, region: str = "europe", platform: str = "euw1"):
    """
    Получить детальную информацию о матче
    
    Example:
        GET /api/match/RU_550013590?region=europe
    """
    try:
        match_data = await riot_api.get_match_details(
            match_id=match_id,
            region=region,
            platform=platform,
        )
        return match_data
    
    except RiotAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Match error: {str(e)}")


