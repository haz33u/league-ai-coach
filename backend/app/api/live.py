"""
Live Game API - информация о текущем матче
"""
import httpx
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from app.services.riot_api import RiotAPIService, RiotAPIError

riot_api = RiotAPIService()
router = APIRouter()


@router.post("/game", response_model=Dict[str, Any])
async def get_live_game(
    game_name: str,
    tag_line: str,
    region: str = "europe",
    platform: str = "ru"
):
    """
    Получить информацию о текущем матче игрока
    
    Args:
        game_name: Имя игрока
        tag_line: Тег игрока
        region: Регион для Account API
        platform: Платформа для Spectator API
    
    Returns:
        {
            "game_found": true/false,
            "game_mode": "CLASSIC",
            "game_type": "MATCHED_GAME",
            "game_duration": 1234,
            "participants": [
                {
                    "summoner_name": "...",
                    "champion_id": 157,
                    "team_id": 100,
                    "spell1": 4,
                    "spell2": 12
                }
            ],
            "teams": {
                "blue": [...],
                "red": [...]
            }
        }
    """
    try:
        # 1. Получаем PUUID
        account_data = await riot_api.get_account_by_riot_id(
            game_name=game_name,
            tag_line=tag_line,
            region=region
        )
        puuid = account_data["puuid"]
        
        # 2. Получаем summoner данные
        summoner_data = await riot_api.get_summoner_by_puuid(
            puuid=puuid,
            platform=platform
        )
        
        # Для spectator API нужен encrypted summoner ID (может отсутствовать на RU)
        summoner_id = summoner_data.get("id")
        
        if not summoner_id:
            # Попробуем через PUUID (Spectator-v5)
            platform_base = f"https://{platform}.api.riotgames.com"
            endpoint = f"/lol/spectator/v5/active-games/by-summoner/{puuid}"
            url = f"{platform_base}{endpoint}"
        else:
            # Старый метод через summoner ID (Spectator-v4)
            platform_base = f"https://{platform}.api.riotgames.com"
            endpoint = f"/lol/spectator/v4/active-games/by-summoner/{summoner_id}"
            url = f"{platform_base}{endpoint}"
        
        # 3. Запрос к Spectator API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers={"X-Riot-Token": riot_api.api_key},
                timeout=10.0
            )
            
            if response.status_code == 404:
                return {
                    "game_found": False,
                    "message": f"{game_name}#{tag_line} is not in game right now"
                }
            
            if response.status_code != 200:
                raise RiotAPIError(response.status_code, response.text)
            
            game_data = response.json()
            
            # 4. Парсим данные игры
            participants_raw = game_data.get("participants", [])
            
            participants_info = []
            blue_team = []
            red_team = []
            
            for p in participants_raw:
                player_info = {
                    "summoner_name": p.get("riotId", p.get("summonerName", "Unknown")),
                    "puuid": p.get("puuid"),
                    "champion_id": p.get("championId"),
                    "team_id": p.get("teamId"),
                    "spell1": p.get("spell1Id"),
                    "spell2": p.get("spell2Id"),
                    "perks": {
                        "primary_style": p.get("perks", {}).get("perkStyle"),
                        "sub_style": p.get("perks", {}).get("perkSubStyle")
                    }
                }
                
                participants_info.append(player_info)
                
                if p.get("teamId") == 100:
                    blue_team.append(player_info)
                else:
                    red_team.append(player_info)
            
            return {
                "game_found": True,
                "game_mode": game_data.get("gameMode"),
                "game_type": game_data.get("gameType"),
                "game_queue_id": game_data.get("gameQueueConfigId"),
                "map_id": game_data.get("mapId"),
                "game_start_time": game_data.get("gameStartTime"),
                "game_length": game_data.get("gameLength"),
                "participants": participants_info,
                "teams": {
                    "blue": blue_team,
                    "red": red_team
                },
                "banned_champions": game_data.get("bannedChampions", [])
            }
    
    except RiotAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Live game error: {str(e)}")


@router.get("/health")
async def live_health():
    return {"status": "ok", "endpoint": "/api/live/game"}
