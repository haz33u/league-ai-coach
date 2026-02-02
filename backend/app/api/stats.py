"""
Stats API endpoints - аналитика игрока
"""
import asyncio
import httpx
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.services.riot_api import RiotAPIService, RiotAPIError
from app.services.analytics import summarize_matches
from app.services.ddragon import ddragon
from app.models_old.summoner import SummonerRequest
from app.schemas.analysis import StatsResponse


riot_api = RiotAPIService()
router = APIRouter()


@router.post("/analyze", response_model=StatsResponse)
async def analyze_player_stats(request: SummonerRequest, match_count: int = 20):
    """
    Анализ статистики игрока по последним матчам
    """
    try:
        account_data = await riot_api.get_account_by_riot_id(
            game_name=request.game_name,
            tag_line=request.tag_line,
            region=request.region,
        )
        puuid = account_data["puuid"]

        match_ids = await riot_api.get_match_history(
            puuid=puuid,
            region=request.region,
            count=min(match_count, 100),
        )

        if not match_ids:
            raise HTTPException(status_code=404, detail="No matches found")

        async with httpx.AsyncClient() as client:
            tasks = [
                riot_api.get_match_details(
                    match_id=match_id,
                    region=request.region,
                    platform=request.platform,
                    client=client,
                )
                for match_id in match_ids[:match_count]
            ]
            match_results = await asyncio.gather(*tasks, return_exceptions=True)

        match_details = [m for m in match_results if isinstance(m, dict)]
        analysis = summarize_matches(match_details, puuid)
        analysis["recent_matches"] = await ddragon.enrich_recent_matches(analysis["recent_matches"])

        return {
            "player": {
                "game_name": request.game_name,
                "tag_line": request.tag_line,
                "puuid": puuid,
            },
            "summary": analysis["summary"],
            "performance": analysis["performance"],
            "top_champions": analysis["champions"],
            "recent_matches": analysis["recent_matches"],
        }

    except RiotAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


@router.get("/health")
async def stats_health():
    return {"status": "ok", "endpoint": "/api/stats/analyze"}
