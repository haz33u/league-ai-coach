"""
Ranked API endpoints - ранковая информация
Гибридный подход: LCU API + Riot API + Match History
"""
import httpx
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional, List
from app.services.riot_api import RiotAPIService, RiotAPIError
from app.api.lcu import get_lcu_connection_info

riot_api = RiotAPIService()
router = APIRouter()


# Маппинг платформ на регионы
PLATFORM_TO_REGION = {
    "ru": "europe",
    "euw1": "europe",
    "eun1": "europe",
    "tr1": "europe",
    "na1": "americas",
    "br1": "americas",
    "la1": "americas",
    "la2": "americas",
    "kr": "asia",
    "jp1": "asia",
}

TIERS = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "EMERALD", "DIAMOND"]
DIVISIONS = ["I", "II", "III", "IV"]
APEX_TIERS = ["MASTER", "GRANDMASTER", "CHALLENGER"]


async def get_ranked_from_lcu() -> Optional[Dict[str, Any]]:
    """
    Попытка получить ranked данные из LCU API (если League Client запущен)
    """
    lcu_info = get_lcu_connection_info()
    
    if not lcu_info:
        return None
    
    url = f"{lcu_info['base_url']}/lol-ranked/v1/current-ranked-stats"
    
    try:
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.get(
                url,
                headers={"Authorization": lcu_info["auth_header"]},
                timeout=5.0
            )
            
            if response.status_code == 200:
                data = response.json()
                queues = data.get("queues", [])
                
                result = {
                    "ranked_solo": None,
                    "ranked_flex": None,
                    "source": "LCU"
                }
                
                for queue in queues:
                    queue_type = queue.get("queueType")
                    tier = queue.get("tier", "")
                    
                    if not tier or tier == "":
                        continue
                    
                    wins = queue.get("wins", 0)
                    losses = queue.get("losses", 0)
                    total_games = wins + losses
                    winrate = round((wins / total_games) * 100, 1) if total_games > 0 else 0
                    
                    queue_info = {
                        "tier": tier,
                        "rank": queue.get("division", "I"),
                        "lp": queue.get("leaguePoints", 0),
                        "wins": wins,
                        "losses": losses,
                        "total_games": total_games,
                        "winrate": winrate,
                        "veteran": False,
                        "hot_streak": False,
                        "series": None
                    }
                    
                    if queue_type == "RANKED_SOLO_5x5":
                        result["ranked_solo"] = queue_info
                    elif queue_type == "RANKED_FLEX_SR":
                        result["ranked_flex"] = queue_info
                
                return result
    
    except Exception:
        return None
    
    return None


async def find_player_in_apex_tiers(
    puuid: str, 
    platform: str, 
    api_key: str
) -> Optional[Dict[str, Any]]:
    """
    Поиск игрока в Apex tiers (Master/Grandmaster/Challenger)
    """
    platform_base = f"https://{platform}.api.riotgames.com"
    
    async with httpx.AsyncClient() as client:
        for tier in APEX_TIERS:
            try:
                if tier == "CHALLENGER":
                    endpoint = "/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5"
                elif tier == "GRANDMASTER":
                    endpoint = "/lol/league/v4/grandmasterleagues/by-queue/RANKED_SOLO_5x5"
                elif tier == "MASTER":
                    endpoint = "/lol/league/v4/masterleagues/by-queue/RANKED_SOLO_5x5"
                
                url = f"{platform_base}{endpoint}"
                
                response = await client.get(
                    url,
                    headers={"X-Riot-Token": api_key},
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    continue
                
                league_data = response.json()
                entries = league_data.get("entries", [])
                
                for entry in entries:
                    if entry.get("summonerId") == puuid or entry.get("puuid") == puuid:
                        return {
                            "tier": tier,
                            "rank": "I",
                            "lp": entry.get("leaguePoints", 0),
                            "wins": entry.get("wins", 0),
                            "losses": entry.get("losses", 0),
                            "veteran": entry.get("veteran", False),
                            "hot_streak": entry.get("hotStreak", False),
                            "series": entry.get("miniSeries")
                        }
            
            except Exception:
                continue
    
    return None


async def find_player_in_divisions(
    summoner_id: str,
    platform: str,
    api_key: str
) -> Optional[List[Dict[str, Any]]]:
    """
    Поиск игрока в обычных тирах через summoner ID
    """
    platform_base = f"https://{platform}.api.riotgames.com"
    endpoint = f"/lol/league/v4/entries/by-summoner/{summoner_id}"
    url = f"{platform_base}{endpoint}"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers={"X-Riot-Token": api_key},
                timeout=10.0
            )
            
            if response.status_code == 200:
                return response.json()
    
    except Exception:
        pass
    
    return None


async def calculate_from_match_history(
    puuid: str,
    summoner_level: int,
    game_name: str,
    tag_line: str,
    region: str,
    platform: str,
    api_key: str
) -> Dict[str, Any]:
    """
    Fallback: вычисляем статистику из match history
    """
    regional_routing = PLATFORM_TO_REGION.get(platform, region)
    regional_base = f"https://{regional_routing}.api.riotgames.com"
    
    match_endpoint = f"/lol/match/v5/matches/by-puuid/{puuid}/ids"
    match_url = f"{regional_base}{match_endpoint}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            match_url,
            headers={"X-Riot-Token": api_key},
            params={"type": "ranked", "count": 100},
            timeout=15.0
        )
        
        if response.status_code != 200:
            return {
                "player": {
                    "game_name": game_name,
                    "tag_line": tag_line,
                    "puuid": puuid,
                    "level": summoner_level
                },
                "ranked_solo": None,
                "ranked_flex": None,
                "note": "Unable to fetch ranked data"
            }
        
        match_ids = response.json()
        
        if not match_ids:
            return {
                "player": {
                    "game_name": game_name,
                    "tag_line": tag_line,
                    "puuid": puuid,
                    "level": summoner_level
                },
                "ranked_solo": None,
                "ranked_flex": None,
                "note": "No ranked games found"
            }
        
        solo_wins = 0
        solo_losses = 0
        flex_wins = 0
        flex_losses = 0
        
        for match_id in match_ids[:50]:
            try:
                match_detail_url = f"{regional_base}/lol/match/v5/matches/{match_id}"
                match_response = await client.get(
                    match_detail_url,
                    headers={"X-Riot-Token": api_key},
                    timeout=10.0
                )
                
                if match_response.status_code != 200:
                    continue
                
                match_data = match_response.json()
                queue_id = match_data["info"].get("queueId")
                
                for participant in match_data["info"]["participants"]:
                    if participant["puuid"] == puuid:
                        win = participant["win"]
                        
                        if queue_id == 420:
                            if win:
                                solo_wins += 1
                            else:
                                solo_losses += 1
                        elif queue_id == 440:
                            if win:
                                flex_wins += 1
                            else:
                                flex_losses += 1
                        break
            
            except Exception:
                continue
        
        result = {
            "player": {
                "game_name": game_name,
                "tag_line": tag_line,
                "puuid": puuid,
                "level": summoner_level
            },
            "ranked_solo": None,
            "ranked_flex": None,
            "note": "Ranked data calculated from match history (tier/rank/LP unavailable)"
        }
        
        if solo_wins + solo_losses > 0:
            total_solo = solo_wins + solo_losses
            winrate = round((solo_wins / total_solo) * 100, 1)
            
            result["ranked_solo"] = {
                "tier": "UNKNOWN",
                "rank": "UNKNOWN",
                "lp": None,
                "wins": solo_wins,
                "losses": solo_losses,
                "total_games": total_solo,
                "winrate": winrate,
                "veteran": False,
                "hot_streak": False,
                "series": None
            }
        
        if flex_wins + flex_losses > 0:
            total_flex = flex_wins + flex_losses
            winrate = round((flex_wins / total_flex) * 100, 1)
            
            result["ranked_flex"] = {
                "tier": "UNKNOWN",
                "rank": "UNKNOWN",
                "lp": None,
                "wins": flex_wins,
                "losses": flex_losses,
                "total_games": total_flex,
                "winrate": winrate,
                "veteran": False,
                "hot_streak": False,
                "series": None
            }
        
        return result


@router.post("/by-name", response_model=Dict[str, Any])
async def get_ranked_by_name(
    game_name: str, 
    tag_line: str, 
    region: str = "europe", 
    platform: str = "ru"
):
    """
    Получить ранковую информацию по имени игрока
    
    Приоритет методов:
    1. LCU API (если League Client запущен) - точный tier/rank/LP
    2. Riot API Apex Tiers (Master+)
    3. Riot API League Entries (Bronze-Diamond)
    4. Match History Fallback
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
        
        summoner_level = summoner_data.get("summonerLevel", 0)
        summoner_id = summoner_data.get("id")
        
        # 3. МЕТОД 1: Попытка получить из LCU (приоритет!)
        lcu_data = await get_ranked_from_lcu()
        
        if lcu_data and lcu_data.get("ranked_solo"):
            return {
                "player": {
                    "game_name": game_name,
                    "tag_line": tag_line,
                    "puuid": puuid,
                    "level": summoner_level
                },
                "ranked_solo": lcu_data["ranked_solo"],
                "ranked_flex": lcu_data.get("ranked_flex"),
                "data_source": "LCU (Live Client)"
            }
        
        # 4. МЕТОД 2: Apex Tiers
        apex_rank = await find_player_in_apex_tiers(
            puuid=puuid,
            platform=platform,
            api_key=riot_api.api_key
        )
        
        if apex_rank:
            total_games = apex_rank["wins"] + apex_rank["losses"]
            winrate = round((apex_rank["wins"] / total_games) * 100, 1) if total_games > 0 else 0
            
            return {
                "player": {
                    "game_name": game_name,
                    "tag_line": tag_line,
                    "puuid": puuid,
                    "level": summoner_level
                },
                "ranked_solo": {
                    "tier": apex_rank["tier"],
                    "rank": apex_rank["rank"],
                    "lp": apex_rank["lp"],
                    "wins": apex_rank["wins"],
                    "losses": apex_rank["losses"],
                    "total_games": total_games,
                    "winrate": winrate,
                    "veteran": apex_rank["veteran"],
                    "hot_streak": apex_rank["hot_streak"],
                    "series": apex_rank["series"]
                },
                "ranked_flex": None,
                "data_source": "Riot API (Apex Leaderboard)"
            }
        
        # 5. МЕТОД 3: League Entries (summoner ID)
        if summoner_id:
            league_entries = await find_player_in_divisions(
                summoner_id=summoner_id,
                platform=platform,
                api_key=riot_api.api_key
            )
            
            if league_entries:
                result = {
                    "player": {
                        "game_name": game_name,
                        "tag_line": tag_line,
                        "puuid": puuid,
                        "level": summoner_level
                    },
                    "ranked_solo": None,
                    "ranked_flex": None,
                    "data_source": "Riot API (League Entries)"
                }
                
                for queue in league_entries:
                    queue_type = queue.get("queueType")
                    
                    wins = queue.get("wins", 0)
                    losses = queue.get("losses", 0)
                    total_games = wins + losses
                    winrate = round((wins / total_games) * 100, 1) if total_games > 0 else 0
                    
                    queue_info = {
                        "tier": queue.get("tier"),
                        "rank": queue.get("rank"),
                        "lp": queue.get("leaguePoints", 0),
                        "wins": wins,
                        "losses": losses,
                        "total_games": total_games,
                        "winrate": winrate,
                        "veteran": queue.get("veteran", False),
                        "hot_streak": queue.get("hotStreak", False),
                        "series": queue.get("miniSeries")
                    }
                    
                    if queue_type == "RANKED_SOLO_5x5":
                        result["ranked_solo"] = queue_info
                    elif queue_type == "RANKED_FLEX_SR":
                        result["ranked_flex"] = queue_info
                
                return result
        
        # 6. МЕТОД 4: Fallback - Match History
        fallback_result = await calculate_from_match_history(
            puuid=puuid,
            summoner_level=summoner_level,
            game_name=game_name,
            tag_line=tag_line,
            region=region,
            platform=platform,
            api_key=riot_api.api_key
        )
        
        fallback_result["data_source"] = "Match History (Fallback)"
        return fallback_result
    
    except RiotAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/debug/summoner")
async def debug_summoner(
    game_name: str,
    tag_line: str,
    region: str = "europe",
    platform: str = "euw1"
):
    """
    Debug endpoint
    """
    try:
        account_data = await riot_api.get_account_by_riot_id(
            game_name=game_name,
            tag_line=tag_line,
            region=region
        )
        puuid = account_data["puuid"]
        
        summoner_data = await riot_api.get_summoner_by_puuid(
            puuid=puuid,
            platform=platform
        )
        
        return {
            "puuid": puuid,
            "summoner_data": summoner_data,
            "has_id": "id" in summoner_data,
            "summoner_id": summoner_data.get("id", "NOT FOUND")
        }
    
    except Exception as e:
        return {"error": str(e)}


@router.get("/health")
async def ranked_health():
    return {"status": "ok", "endpoint": "/api/ranked/by-name"}
