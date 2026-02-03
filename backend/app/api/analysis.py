"""
Analysis API endpoints - расширенная аналитика игрока
"""
import asyncio
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.exc import OperationalError
from typing import Dict, Any, List, Optional

from app.models_old.summoner import SummonerRequest
from app.schemas.analysis import AnalysisResponse
from app.services.riot_api import RiotAPIService, RiotAPIError
from app.services.analytics import summarize_matches, build_player_dna, build_learning_path, build_coaching_recap
from app.services.ddragon import ddragon
from app.services.timeline import summarize_timeline
from app.database import get_db
from sqlalchemy.orm import Session
from app import crud


riot_api = RiotAPIService()
router = APIRouter()


def _select_queue(entries: List[Dict[str, Any]], queue_type: str) -> Dict[str, Any]:
    for entry in entries:
        if entry.get("queueType") == queue_type:
            return entry
    return {}


@router.post("/by-name", response_model=AnalysisResponse)
async def analyze_by_name(
    request: SummonerRequest,
    match_count: int = 20,
    persist: bool = False,
    include_timeline: bool = False,
    timeline_matches: int = 3,
    db: Session = Depends(get_db),
):
    """
    Полный анализ игрока по Riot ID
    """
    try:
        account = await riot_api.get_account_by_riot_id(
            game_name=request.game_name,
            tag_line=request.tag_line,
            region=request.region,
        )
        puuid = account["puuid"]

        summoner = await riot_api.get_summoner_by_puuid(
            puuid=puuid,
            platform=request.platform,
        )

        league_entries = []
        if summoner.get("id"):
            league_entries = await riot_api.get_league_entries(
                summoner_id=summoner.get("id", ""),
                platform=request.platform,
            )

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
        if include_timeline:
            analysis["recent_matches"] = await _attach_timeline(
                analysis["recent_matches"],
                match_ids[:timeline_matches],
                puuid,
                request.region,
                request.platform,
            )
            early_game = _summarize_early_game(analysis["recent_matches"])
            if early_game:
                analysis["early_game"] = early_game

        analysis["dna"] = build_player_dna(analysis)
        analysis["learning_path"] = build_learning_path(analysis)
        analysis["coaching_recap"] = build_coaching_recap(analysis)

        player_id = None
        if persist:
            try:
                player = crud.get_or_create_player(
                    db=db,
                    puuid=puuid,
                    game_name=account.get("gameName", request.game_name),
                    tag_line=account.get("tagLine", request.tag_line),
                    region=request.region,
                    platform=request.platform,
                    summoner_level=summoner.get("summonerLevel"),
                    profile_icon_id=summoner.get("profileIconId"),
                )
                player_id = player.id
                _persist_match_history(db, player_id, match_details, puuid)
            except OperationalError:
                player_id = None

        ranked_solo = _select_queue(league_entries, "RANKED_SOLO_5x5")
        ranked_flex = _select_queue(league_entries, "RANKED_FLEX_SR")
        if not ranked_solo and league_entries:
            ranked_solo = league_entries[0]

        return {
            "player": {
                "game_name": account.get("gameName", request.game_name),
                "tag_line": account.get("tagLine", request.tag_line),
                "puuid": puuid,
                "level": summoner.get("summonerLevel", 0),
                "profile_icon_id": summoner.get("profileIconId"),
            },
            "ranked": {
                "solo": ranked_solo or None,
                "flex": ranked_flex or None,
            },
            **analysis,
        }

    except RiotAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


@router.get("/by-puuid", response_model=AnalysisResponse)
async def analyze_by_puuid(
    puuid: str,
    region: str = "europe",
    platform: str = "euw1",
    match_count: int = 20,
    persist: bool = False,
    include_timeline: bool = False,
    timeline_matches: int = 3,
    db: Session = Depends(get_db),
):
    """
    Полный анализ игрока по PUUID
    """
    try:
        account = await riot_api.get_account_by_puuid(puuid=puuid, region=region, platform=platform)
        summoner = await riot_api.get_summoner_by_puuid(puuid=puuid, platform=platform)

        league_entries = []
        if summoner.get("id"):
            league_entries = await riot_api.get_league_entries(
                summoner_id=summoner.get("id", ""),
                platform=platform,
            )

        match_ids = await riot_api.get_match_history(
            puuid=puuid,
            region=region,
            count=min(match_count, 100),
        )

        if not match_ids:
            raise HTTPException(status_code=404, detail="No matches found")

        async with httpx.AsyncClient() as client:
            tasks = [
                riot_api.get_match_details(
                    match_id=match_id,
                    region=region,
                    platform=platform,
                    client=client,
                )
                for match_id in match_ids[:match_count]
            ]
            match_results = await asyncio.gather(*tasks, return_exceptions=True)

        match_details = [m for m in match_results if isinstance(m, dict)]
        analysis = summarize_matches(match_details, puuid)
        analysis["recent_matches"] = await ddragon.enrich_recent_matches(analysis["recent_matches"])
        if include_timeline:
            analysis["recent_matches"] = await _attach_timeline(
                analysis["recent_matches"],
                match_ids[:timeline_matches],
                puuid,
                region,
                platform,
            )
            early_game = _summarize_early_game(analysis["recent_matches"])
            if early_game:
                analysis["early_game"] = early_game

        analysis["dna"] = build_player_dna(analysis)
        analysis["learning_path"] = build_learning_path(analysis)
        analysis["coaching_recap"] = build_coaching_recap(analysis)

        player_id = None
        if persist:
            try:
                player = crud.get_or_create_player(
                    db=db,
                    puuid=puuid,
                    game_name=account.get("gameName", "Unknown"),
                    tag_line=account.get("tagLine", "Unknown"),
                    region=region,
                    platform=platform,
                    summoner_level=summoner.get("summonerLevel"),
                    profile_icon_id=summoner.get("profileIconId"),
                )
                player_id = player.id
                _persist_match_history(db, player_id, match_details, puuid)
            except OperationalError:
                player_id = None

        ranked_solo = _select_queue(league_entries, "RANKED_SOLO_5x5")
        ranked_flex = _select_queue(league_entries, "RANKED_FLEX_SR")
        if not ranked_solo and league_entries:
            ranked_solo = league_entries[0]

        return {
            "player": {
                "game_name": account.get("gameName", "Unknown"),
                "tag_line": account.get("tagLine", "Unknown"),
                "puuid": puuid,
                "level": summoner.get("summonerLevel", 0),
                "profile_icon_id": summoner.get("profileIconId"),
            },
            "ranked": {
                "solo": ranked_solo or None,
                "flex": ranked_flex or None,
            },
            **analysis,
        }

    except RiotAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


@router.get("/health")
async def analysis_health():
    return {"status": "ok", "endpoint": "/api/analysis"}


async def _attach_timeline(
    recent_matches: List[Dict[str, Any]],
    match_ids: List[str],
    puuid: str,
    region: str,
    platform: str,
) -> List[Dict[str, Any]]:
    if not recent_matches:
        return recent_matches

    match_ids_set = set(match_ids)
    match_map = {m.get("match_id"): m for m in recent_matches if m.get("match_id")}

    async with httpx.AsyncClient() as client:
        tasks = [
            riot_api.get_match_timeline(
                match_id=match_id,
                region=region,
                platform=platform,
                client=client,
            )
            for match_id in match_ids
        ]
        timeline_results = await asyncio.gather(*tasks, return_exceptions=True)

    for match_id, timeline in zip(match_ids, timeline_results):
        if match_id not in match_ids_set:
            continue
        if not isinstance(timeline, dict):
            continue
        if match_id in match_map:
            match_map[match_id]["timeline"] = summarize_timeline(timeline, puuid)

    return recent_matches


def _summarize_early_game(recent_matches: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    early_kills = []
    early_deaths = []
    early_assists = []
    first_obj = 0
    tracked = 0

    for match in recent_matches:
        timeline = match.get("timeline")
        if not timeline:
            continue
        tracked += 1
        early_kills.append(timeline.get("early_kills", 0))
        early_deaths.append(timeline.get("early_deaths", 0))
        early_assists.append(timeline.get("early_assists", 0))
        if timeline.get("first_objective_participation"):
            first_obj += 1

    if tracked == 0:
        return None

    return {
        "tracked_matches": tracked,
        "avg_early_kills": round(sum(early_kills) / tracked, 2),
        "avg_early_deaths": round(sum(early_deaths) / tracked, 2),
        "avg_early_assists": round(sum(early_assists) / tracked, 2),
        "first_objective_participation_rate": round(first_obj / tracked, 3),
    }


def _persist_match_history(
    db: Session,
    player_id: int,
    match_details: List[Dict[str, Any]],
    puuid: str,
) -> None:
    for match in match_details:
        info = match.get("info", {})
        participants = info.get("participants", [])
        participant = next((p for p in participants if p.get("puuid") == puuid), None)
        if not participant:
            continue

        game_creation_ms = info.get("gameCreation")
        game_creation = None
        if isinstance(game_creation_ms, (int, float)) and game_creation_ms > 0:
            game_creation = datetime.fromtimestamp(game_creation_ms / 1000, tz=timezone.utc)

        crud.create_or_update_match_history(
            db=db,
            player_id=player_id,
            match_id=match.get("metadata", {}).get("matchId", "UNKNOWN"),
            game_mode=info.get("gameMode", "UNKNOWN"),
            game_duration=info.get("gameDuration", 0),
            game_creation=game_creation,
            champion_name=participant.get("championName", "Unknown"),
            kills=participant.get("kills", 0),
            deaths=participant.get("deaths", 0),
            assists=participant.get("assists", 0),
            win=bool(participant.get("win", False)),
            total_damage=participant.get("totalDamageDealtToChampions", 0),
            gold_earned=participant.get("goldEarned", 0),
            cs=participant.get("totalMinionsKilled", 0),
            vision_score=participant.get("visionScore", 0),
            raw_data=match,
        )
