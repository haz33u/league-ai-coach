"""
Match API endpoints
"""
import httpx  # ← ДОБАВИЛ!
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.services.riot_api import RiotAPIService, RiotAPIError

riot_api = RiotAPIService()
router = APIRouter()


@router.get("/{match_id}", response_model=Dict[str, Any])
async def get_match_details(match_id: str, region: str = "europe"):
    """
    Получить детальную информацию о матче
    
    Example:
        GET /api/match/RU_550013590?region=europe
    """
    try:
        # Match-v5 endpoint
        regional_base = riot_api.base_url.replace("europe", region)
        endpoint = f"/lol/match/v5/matches/{match_id}"
        url = f"{regional_base}{endpoint}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url, 
                headers={"X-Riot-Token": riot_api.api_key}, 
                timeout=15.0
            )
            
            if response.status_code == 200:
                match_data = response.json()
                return match_data
            elif response.status_code == 404:
                raise RiotAPIError(404, f"Match {match_id} not found")
            else:
                raise RiotAPIError(response.status_code, response.text)
    
    except RiotAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Match error: {str(e)}")


@router.get("/health")
async def match_health():
    return {"status": "ok", "endpoint": "/api/match/{match_id}"}
