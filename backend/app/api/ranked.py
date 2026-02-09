"""
Ranked API endpoints - ранковая информация (SOLO focus)
Гибрид: LCU (optional) + Apex SOLO by PUUID + (если доступно) League entries by summonerId + match-history fallback.
"""
from __future__ import annotations

import os
import httpx
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List

from app.services.riot_api import RiotAPIService, RiotAPIError
from app.api.lcu import get_lcu_connection_info
from app.database import get_db
from app import crud

router = APIRouter()
riot_api = RiotAPIService()
ENABLE_LCU = os.getenv("ENABLE_LCU", "false").lower() in ("1", "true", "yes")

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

APEX_TIERS = ["CHALLENGER", "GRANDMASTER", "MASTER"]


async def get_ranked_from_lcu() -> Optional[Dict[str, Any]]:
    lcu_info = get_lcu_connection_info()
    if not lcu_info:
        return None

    url = f"{lcu_info['base_url']}/lol-ranked/v1/current-ranked-stats"
    try:
        async with httpx.AsyncClient(verify=False) as client:
            r = await client.get(url, headers={"Authorization": lcu_info["auth_header"]}, timeout=5.0)
        if r.status_code != 200:
            return None

        data = r.json()
        queues = data.get("queues", [])
        result = {"ranked_solo": None, "ranked_flex": None, "source": "LCU"}

        for q in queues:
            qt = q.get("queueType")
            tier = q.get("tier") or ""
            if not tier:
                continue

            wins = q.get("wins", 0)
            losses = q.get("losses", 0)
            total = wins + losses
            winrate = round((wins / total) * 100, 1) if total > 0 else 0

            info = {
                "tier": tier,
                "rank": q.get("division", "I"),
                "lp": q.get("leaguePoints", 0),
                "wins": wins,
                "losses": losses,
                "total_games": total,
                "winrate": winrate,
                "veteran": False,
                "hot_streak": False,
                "series": None,
            }

            if qt == "RANKED_SOLO_5x5":
                result["ranked_solo"] = info
            elif qt == "RANKED_FLEX_SR":
                result["ranked_flex"] = info

        return result
    except Exception:
        return None


async def find_apex_solo_by_puuid(puuid: str, platform: str) -> Optional[Dict[str, Any]]:
    """SOLO Apex rank by PUUID via league lists."""
    if not puuid:
        return None

    queue = "RANKED_SOLO_5x5"
    sources = [
        ("CHALLENGER", riot_api.get_challenger_league),
        ("GRANDMASTER", riot_api.get_grandmaster_league),
        ("MASTER", riot_api.get_master_league),
    ]

    for tier, getter in sources:
        try:
            league = await getter(platform=platform, queue=queue)
            for e in league.get("entries", []):
                if e.get("puuid") == puuid:
                    return {
                        "tier": tier,
                        "rank": "I",
                        "lp": e.get("leaguePoints", 0),
                        "wins": e.get("wins", 0),
                        "losses": e.get("losses", 0),
                        "veteran": e.get("veteran", False),
                        "hot_streak": e.get("hotStreak", False),
                        "series": e.get("miniSeries"),
                    }
        except Exception:
            continue

    return None


async def find_league_entries_by_summoner_id(summoner_id: str, platform: str) -> Optional[List[Dict[str, Any]]]:
    """Standard path: league-v4 entries by encryptedSummonerId (if summoner_id exists)."""
    platform_base = riot_api._platform_base(platform)
    url = f"{platform_base}/lol/league/v4/entries/by-summoner/{summoner_id}"
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(url, headers=riot_api.headers, timeout=10.0)
        if r.status_code == 200:
            return r.json()
        return None
    except Exception:
        return None


async def calculate_from_match_history(
    puuid: str,
    summoner_level: int,
    game_name: str,
    tag_line: str,
    region: str,
    platform: str,
) -> Dict[str, Any]:
    """Fallback: ranked W/L from match history; tier/division/LP unavailable."""
    regional_routing = PLATFORM_TO_REGION.get(platform, region)
    regional_base = f"https://{regional_routing}.api.riotgames.com"
    url = f"{regional_base}/lol/match/v5/matches/by-puuid/{puuid}/ids"

    async with httpx.AsyncClient() as client:
        r = await client.get(
            url,
            headers=riot_api.headers,
            params={"type": "ranked", "count": 100},
            timeout=15.0,
        )

    if r.status_code != 200:
        return {
            "player": {"game_name": game_name, "tag_line": tag_line, "puuid": puuid, "level": summoner_level},
            "ranked_solo": None,
            "ranked_flex": None,
            "note": "Unable to fetch match history",
        }

    match_ids = r.json()
    if not match_ids:
        return {
            "player": {"game_name": game_name, "tag_line": tag_line, "puuid": puuid, "level": summoner_level},
            "ranked_solo": None,
            "ranked_flex": None,
            "note": "No ranked games found",
        }

    solo_w, solo_l = 0, 0
    flex_w, flex_l = 0, 0

    async with httpx.AsyncClient() as client:
        for mid in match_ids[:50]:
            try:
                mr = await client.get(
                    f"{regional_base}/lol/match/v5/matches/{mid}",
                    headers=riot_api.headers,
                    timeout=10.0,
                )
                if mr.status_code != 200:
                    continue
                m = mr.json()
                qid = m.get("info", {}).get("queueId")
                for p in m.get("info", {}).get("participants", []):
                    if p.get("puuid") != puuid:
                        continue
                    win = bool(p.get("win"))
                    if qid == 420:
                        solo_w += 1 if win else 0
                        solo_l += 0 if win else 1
                    elif qid == 440:
                        flex_w += 1 if win else 0
                        flex_l += 0 if win else 1
                    break
            except Exception:
                continue

    out = {
        "player": {"game_name": game_name, "tag_line": tag_line, "puuid": puuid, "level": summoner_level},
        "ranked_solo": None,
        "ranked_flex": None,
        "note": "Ranked stats from match history (tier/division/LP unavailable)",
    }

    if solo_w + solo_l > 0:
        total = solo_w + solo_l
        out["ranked_solo"] = {
            "tier": "UNRANKED",
            "rank": None,
            "lp": None,
            "wins": solo_w,
            "losses": solo_l,
            "total_games": total,
            "winrate": round((solo_w / total) * 100, 1),
            "veteran": False,
            "hot_streak": False,
            "series": None,
        }

    if flex_w + flex_l > 0:
        total = flex_w + flex_l
        out["ranked_flex"] = {
            "tier": "UNRANKED",
            "rank": None,
            "lp": None,
            "wins": flex_w,
            "losses": flex_l,
            "total_games": total,
            "winrate": round((flex_w / total) * 100, 1),
            "veteran": False,
            "hot_streak": False,
            "series": None,
        }

    return out


@router.post("/by-name", response_model=Dict[str, Any])
async def get_ranked_by_name(
    game_name: str,
    tag_line: str,
    region: str = "europe",
    platform: str = "ru",
    use_lcu: bool = False,
    db: Session = Depends(get_db),
):
    try:
        # 1) RiotID -> PUUID
        account = await riot_api.get_account_by_riot_id(game_name=game_name, tag_line=tag_line, region=region)
        puuid = account["puuid"]

        # 2) LCU first (optional)
        lcu = await get_ranked_from_lcu() if (use_lcu and ENABLE_LCU) else None
        if lcu and lcu.get("ranked_solo"):
            return {
                "player": {"game_name": game_name, "tag_line": tag_line, "puuid": puuid, "level": None},
                "ranked_solo": lcu["ranked_solo"],
                "ranked_flex": lcu.get("ranked_flex"),
                "data_source": "LCU",
            }

        # 3) Apex SOLO by PUUID (works even without summonerId)
        apex = await find_apex_solo_by_puuid(puuid=puuid, platform=platform)
        if apex:
            total = apex["wins"] + apex["losses"]
            winrate = round((apex["wins"] / total) * 100, 1) if total > 0 else 0
            return {
                "player": {"game_name": game_name, "tag_line": tag_line, "puuid": puuid, "level": None},
                "ranked_solo": {
                    "tier": apex["tier"],
                    "rank": apex["rank"],
                    "lp": apex["lp"],
                    "wins": apex["wins"],
                    "losses": apex["losses"],
                    "total_games": total,
                    "winrate": winrate,
                    "veteran": apex["veteran"],
                    "hot_streak": apex["hot_streak"],
                    "series": apex["series"],
                },
                "ranked_flex": None,
                "data_source": "Riot API (Apex by PUUID)",
            }

        # 4) Summoner profile (may not include "id" in your current key policy)
        summoner = await riot_api.get_summoner_by_puuid(puuid=puuid, platform=platform)
        summoner_level = summoner.get("summonerLevel", 0)
        summoner_id = summoner.get("id")

        # DB write (optional; ignore if DB down)
        try:
            player = crud.get_or_create_player(
                db=db,
                puuid=puuid,
                game_name=game_name,
                tag_line=tag_line,
                region=region,
                platform=platform,
                summoner_level=summoner_level,
                profile_icon_id=summoner.get("profileIconId"),
            )
        except OperationalError:
            player = None

        # 5) League entries if summonerId exists
        if summoner_id:
            entries = await find_league_entries_by_summoner_id(summoner_id=summoner_id, platform=platform)
            if entries:
                result = {
                    "player": {"game_name": game_name, "tag_line": tag_line, "puuid": puuid, "level": summoner_level},
                    "ranked_solo": None,
                    "ranked_flex": None,
                    "data_source": "Riot API (League Entries)",
                }

                for q in entries:
                    qt = q.get("queueType")
                    wins = q.get("wins", 0)
                    losses = q.get("losses", 0)
                    total = wins + losses
                    winrate = round((wins / total) * 100, 1) if total > 0 else 0
                    info = {
                        "tier": q.get("tier"),
                        "rank": q.get("rank"),
                        "lp": q.get("leaguePoints", 0),
                        "wins": wins,
                        "losses": losses,
                        "total_games": total,
                        "winrate": winrate,
                        "veteran": q.get("veteran", False),
                        "hot_streak": q.get("hotStreak", False),
                        "series": q.get("miniSeries"),
                    }

                    # write to DB best-effort
                    if player:
                        try:
                            crud.create_or_update_ranked_stats(
                                db=db,
                                player_id=player.id,
                                queue_type=qt,
                                tier=info["tier"],
                                rank=info["rank"],
                                lp=info["lp"],
                                wins=info["wins"],
                                losses=info["losses"],
                                veteran=info["veteran"],
                                hot_streak=info["hot_streak"],
                                data_source="riot_api",
                            )
                        except OperationalError:
                            pass

                    if qt == "RANKED_SOLO_5x5":
                        result["ranked_solo"] = info
                    elif qt == "RANKED_FLEX_SR":
                        result["ranked_flex"] = info

                return result

        # 6) Match-history fallback
        fb = await calculate_from_match_history(
            puuid=puuid,
            summoner_level=summoner_level,
            game_name=game_name,
            tag_line=tag_line,
            region=region,
            platform=platform,
        )
        fb["data_source"] = "Match History (Fallback)"
        return fb

    except RiotAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/debug/summoner")
async def debug_summoner(
    game_name: str,
    tag_line: str,
    region: str = "europe",
    platform: str = "euw1",
):
    try:
        account = await riot_api.get_account_by_riot_id(game_name=game_name, tag_line=tag_line, region=region)
        puuid = account["puuid"]
        summoner = await riot_api.get_summoner_by_puuid(puuid=puuid, platform=platform)
        return {"puuid": puuid, "summoner_data": summoner, "has_id": "id" in summoner, "summoner_id": summoner.get("id", "NOT FOUND")}
    except Exception as e:
        return {"error": str(e)}


@router.get("/health")
async def ranked_health():
    return {"status": "ok", "endpoint": "/api/ranked/by-name"}
