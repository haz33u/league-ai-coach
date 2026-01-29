"""
Summoner API endpoints
"""
from fastapi import APIRouter, HTTPException
from app.models.summoner import (
    SummonerRequest, 
    SummonerResponse, 
    AccountInfo, 
    SummonerInfo
)
from app.services.riot_api import RiotAPIService, RiotAPIError


# Создаём экземпляр сервиса
riot_api = RiotAPIService()

router = APIRouter()


@router.post("/search", response_model=SummonerResponse)
async def search_summoner(request: SummonerRequest):
    """
    Поиск summoner по Riot ID (game name + tag)
    
    Example:
        POST /api/summoner/search
        {
            "game_name": "hazeu ay lol",
            "tag_line": "LOVE",
            "region": "europe",
            "platform": "ru"
        }
    """
    try:
        # 1. Получаем account info (PUUID)
        account_data = await riot_api.get_account_by_riot_id(
            game_name=request.game_name,
            tag_line=request.tag_line,
            region=request.region
        )
        
        account = AccountInfo(**account_data)
        
        # 2. Получаем summoner info
        summoner_data = await riot_api.get_summoner_by_puuid(
            puuid=account.puuid,
            platform=request.platform
        )
        
        summoner = SummonerInfo(**summoner_data)
        
        # 3. Получаем историю матчей
        try:
            match_ids = await riot_api.get_match_history(
                puuid=account.puuid,
                region=request.region,
                count=20
            )
        except RiotAPIError:
            match_ids = None
        
        return SummonerResponse(
            account=account,
            summoner=summoner,
            match_history=match_ids
        )
    
    except RiotAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/health")
async def summoner_health():
    """Проверка работы Riot API"""
    return {
        "status": "ok",
        "riot_api_configured": bool(riot_api.api_key),
        "base_url": riot_api.base_url
    }
