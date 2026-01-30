"""
Stats API endpoints - аналитика игрока
"""
import httpx
from fastapi import APIRouter, HTTPException
from collections import Counter
from typing import Dict, Any, List
from app.services.riot_api import RiotAPIService, RiotAPIError
from app.models_old.summoner import SummonerRequest


riot_api = RiotAPIService()
router = APIRouter()


@router.post("/analyze", response_model=Dict[str, Any])
async def analyze_player_stats(request: SummonerRequest, match_count: int = 20):
    """
    Анализ статистики игрока по последним матчам
    
    Args:
        request: SummonerRequest (game_name, tag_line, region, platform)
        match_count: Количество матчей для анализа (default: 20, max: 100)
    
    Returns:
        {
            "summary": {
                "total_games": 20,
                "wins": 12,
                "losses": 8,
                "winrate": 60.0
            },
            "performance": {
                "avg_kills": 8.5,
                "avg_deaths": 5.2,
                "avg_assists": 10.3,
                "avg_kda": 3.61,
                "avg_cs": 185.4,
                "avg_vision_score": 35.2
            },
            "champions": {
                "Vayne": {"games": 5, "wins": 3, "losses": 2},
                "Aphelios": {"games": 4, "wins": 2, "losses": 2}
            },
            "recent_matches": [...]
        }
    """
    try:
        # 1. Получаем account info
        account_data = await riot_api.get_account_by_riot_id(
            game_name=request.game_name,
            tag_line=request.tag_line,
            region=request.region
        )
        puuid = account_data["puuid"]
        
        # 2. Получаем историю матчей
        match_ids = await riot_api.get_match_history(
            puuid=puuid,
            region=request.region,
            count=min(match_count, 100)
        )
        
        if not match_ids:
            raise HTTPException(status_code=404, detail="No matches found")
        
        # 3. Собираем статистику по каждому матчу
        stats_data = {
            "wins": 0,
            "losses": 0,
            "kills": [],
            "deaths": [],
            "assists": [],
            "cs": [],
            "vision_scores": [],
            "champions": Counter(),
            "champion_wins": Counter(),
            "recent_matches": []
        }
        
        # 4. Проходим по каждому матчу
        regional_base = riot_api.base_url.replace("europe", request.region)
        
        async with httpx.AsyncClient() as client:
            for match_id in match_ids[:match_count]:
                try:
                    # Получаем данные матча
                    endpoint = f"/lol/match/v5/matches/{match_id}"
                    url = f"{regional_base}{endpoint}"
                    
                    response = await client.get(
                        url,
                        headers={"X-Riot-Token": riot_api.api_key},
                        timeout=15.0
                    )
                    
                    if response.status_code != 200:
                        continue
                    
                    match_data = response.json()
                    
                    # Находим данные игрока в матче
                    player_data = None
                    for participant in match_data["info"]["participants"]:
                        if participant["puuid"] == puuid:
                            player_data = participant
                            break
                    
                    if not player_data:
                        continue
                    
                    # Собираем статистику
                    win = player_data["win"]
                    champion = player_data["championName"]
                    
                    stats_data["wins" if win else "losses"] += 1
                    stats_data["kills"].append(player_data["kills"])
                    stats_data["deaths"].append(player_data["deaths"])
                    stats_data["assists"].append(player_data["assists"])
                    stats_data["cs"].append(player_data["totalMinionsKilled"])
                    stats_data["vision_scores"].append(player_data.get("visionScore", 0))
                    stats_data["champions"][champion] += 1
                    
                    if win:
                        stats_data["champion_wins"][champion] += 1
                    
                    # Краткая информация о матче
                    stats_data["recent_matches"].append({
                        "match_id": match_id,
                        "champion": champion,
                        "kda": f"{player_data['kills']}/{player_data['deaths']}/{player_data['assists']}",
                        "cs": player_data["totalMinionsKilled"],
                        "win": win,
                        "game_duration": match_data["info"]["gameDuration"]
                    })
                
                except Exception as e:
                    # Пропускаем проблемные матчи
                    continue
        
        # 5. Вычисляем средние значения
        total_games = stats_data["wins"] + stats_data["losses"]
        
        if total_games == 0:
            raise HTTPException(status_code=404, detail="No valid match data found")
        
        avg_kills = sum(stats_data["kills"]) / len(stats_data["kills"]) if stats_data["kills"] else 0
        avg_deaths = sum(stats_data["deaths"]) / len(stats_data["deaths"]) if stats_data["deaths"] else 0
        avg_assists = sum(stats_data["assists"]) / len(stats_data["assists"]) if stats_data["assists"] else 0
        avg_cs = sum(stats_data["cs"]) / len(stats_data["cs"]) if stats_data["cs"] else 0
        avg_vision = sum(stats_data["vision_scores"]) / len(stats_data["vision_scores"]) if stats_data["vision_scores"] else 0
        
        # KDA = (Kills + Assists) / Deaths
        avg_kda = (avg_kills + avg_assists) / avg_deaths if avg_deaths > 0 else avg_kills + avg_assists
        
        # 6. Топ чемпионы
        top_champions = {}
        for champion, games in stats_data["champions"].most_common(5):
            wins = stats_data["champion_wins"][champion]
            losses = games - wins
            top_champions[champion] = {
                "games": games,
                "wins": wins,
                "losses": losses,
                "winrate": round((wins / games) * 100, 1) if games > 0 else 0
            }
        
        # 7. Формируем ответ
        return {
            "player": {
                "game_name": request.game_name,
                "tag_line": request.tag_line,
                "puuid": puuid
            },
            "summary": {
                "total_games": total_games,
                "wins": stats_data["wins"],
                "losses": stats_data["losses"],
                "winrate": round((stats_data["wins"] / total_games) * 100, 1)
            },
            "performance": {
                "avg_kills": round(avg_kills, 1),
                "avg_deaths": round(avg_deaths, 1),
                "avg_assists": round(avg_assists, 1),
                "avg_kda": round(avg_kda, 2),
                "avg_cs": round(avg_cs, 1),
                "avg_vision_score": round(avg_vision, 1)
            },
            "top_champions": top_champions,
            "recent_matches": stats_data["recent_matches"][:10]
        }
    
    except RiotAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


@router.get("/health")
async def stats_health():
    return {"status": "ok", "endpoint": "/api/stats/analyze"}
