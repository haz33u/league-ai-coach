from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional, List

import httpx
from fastapi import APIRouter, Query, HTTPException

from app.services.riot_api import RiotAPIService, RiotAPIError

router = APIRouter()
riot_api = RiotAPIService()

PLATFORM_TO_REGION = RiotAPIService.PLATFORM_TO_REGION


@router.get("/recent")
async def recent_matches(
    game_name: str = Query(..., description="RiotID gameName"),
    tag_line: str = Query(..., description="RiotID tagLine"),
    platform: str = Query("euw1", description="Platform shard: euw1/ru/na1/..."),
    count: int = Query(20, ge=1, le=50),
    ranked_only: bool = Query(True, description="Filter to ranked queues (420/440)"),
) -> Dict[str, Any]:
    try:
        region = PLATFORM_TO_REGION.get(platform.lower(), "europe")

        account = await riot_api.get_account_by_riot_id(
            game_name=game_name, tag_line=tag_line, region=region
        )
        puuid = account["puuid"]

        match_ids = await riot_api.get_match_history(puuid=puuid, region=region, count=count)

        sem = asyncio.Semaphore(4)
        async with httpx.AsyncClient() as client:

            async def _one(mid: str) -> Optional[Dict[str, Any]]:
                async with sem:
                    try:
                        m = await riot_api.get_match_details(
                            match_id=mid, region=region, platform=platform, client=client
                        )
                        info = m.get("info", {})
                        parts: List[Dict[str, Any]] = info.get("participants", [])
                        me = next((p for p in parts if p.get("puuid") == puuid), None)
                        if not me:
                            return None

                        queue_id = info.get("queueId")
                        if ranked_only and queue_id not in (420, 440):
                            return None

                        return {
                            "match_id": mid,
                            "queue_id": queue_id,
                            "game_creation": info.get("gameCreation"),
                            "game_duration": info.get("gameDuration"),
                            "champion_name": me.get("championName"),
                            "team_position": me.get("teamPosition"),
                            "win": me.get("win"),
                            "kills": me.get("kills"),
                            "deaths": me.get("deaths"),
                            "assists": me.get("assists"),
                            "total_minions_killed": me.get("totalMinionsKilled"),
                            "vision_score": me.get("visionScore"),
                        }
                    except Exception:
                        return None

            cards = await asyncio.gather(*[_one(mid) for mid in match_ids])

        cards = [c for c in cards if c is not None][:count]

        return {
            "player": {
                "game_name": game_name,
                "tag_line": tag_line,
                "puuid": puuid,
                "platform": platform,
                "region": region,
            },
            "matches": cards,
        }

    except RiotAPIError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def matches_health():
    return {"status": "ok", "endpoint": "/api/matches/recent"}
