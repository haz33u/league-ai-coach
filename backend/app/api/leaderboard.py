from typing import Any, Dict, List
import asyncio
import httpx

from fastapi import APIRouter, Query

from app.services.riot_api import RiotAPIService

router = APIRouter()
riot_api = RiotAPIService()

REGION_MAP = {
    "euw1": "europe",
    "eun1": "europe",
    "ru": "europe",
    "tr1": "europe",
    "na1": "americas",
    "br1": "americas",
    "la1": "americas",
    "la2": "americas",
    "oc1": "americas",
    "kr": "asia",
    "jp1": "asia",
}


@router.get("/leaderboard")
async def get_leaderboard(
    platform: str = Query("euw1", description="Riot platform shard, e.g. euw1 or ru"),
    queue: str = Query("RANKED_SOLO_5x5", description="Ranked queue type"),
    limit: int = Query(50, ge=1, le=200, description="Number of entries to return"),
    debug: bool = Query(False, description="Include debug info"),
) -> Dict[str, Any]:
    league = await riot_api.get_challenger_league(platform=platform, queue=queue)
    entries = league.get("entries", [])
    entries_sorted = sorted(entries, key=lambda e: e.get("leaguePoints", 0), reverse=True)
    combined_entries = [(entry, "CHALLENGER") for entry in entries_sorted]

    if len(combined_entries) < limit:
        gm_league = await riot_api.get_grandmaster_league(platform=platform, queue=queue)
        gm_entries = sorted(
            gm_league.get("entries", []), key=lambda e: e.get("leaguePoints", 0), reverse=True
        )
        combined_entries.extend([(entry, "GRANDMASTER") for entry in gm_entries])

    if len(combined_entries) < limit:
        master_league = await riot_api.get_master_league(platform=platform, queue=queue)
        master_entries = sorted(
            master_league.get("entries", []), key=lambda e: e.get("leaguePoints", 0), reverse=True
        )
        combined_entries.extend([(entry, "MASTER") for entry in master_entries])

    combined_entries = combined_entries[:limit]

    region = REGION_MAP.get(platform, "europe")

    summoner_errors = 0
    account_errors = 0
    raw_entries = [entry for entry, _ in combined_entries[:min(limit, 3)]] if debug else []

    async with httpx.AsyncClient() as client:
        sem = asyncio.Semaphore(3)

        async def _fetch_summoner_by_puuid(puuid: str):
            if not puuid:
                return None
            async with sem:
                for _ in range(2):
                    try:
                        return await riot_api.get_summoner_by_puuid(
                            puuid=puuid, platform=platform
                        )
                    except Exception as exc:
                        if debug:
                            return {"_error": str(exc)}
                        await asyncio.sleep(0.15)
                return None

        async def _fetch_account(puuid: str):
            if not puuid:
                return None
            async with sem:
                for _ in range(2):
                    try:
                        return await riot_api.get_account_by_puuid(
                            puuid=puuid,
                            region=region,
                            platform=platform,
                            client=client,
                        )
                    except Exception as exc:
                        if debug:
                            return {"_error": str(exc)}
                        await asyncio.sleep(0.15)
                return None

        summoner_tasks = [
            _fetch_summoner_by_puuid(entry.get("puuid", "")) for entry, _ in combined_entries
        ]
        summoner_results = await asyncio.gather(*summoner_tasks, return_exceptions=True)
        account_tasks = []
        account_indexes = []
        accounts: List[Dict[str, Any]] = [{} for _ in summoner_results]
        for idx, summoner in enumerate(summoner_results):
            entry_puuid = combined_entries[idx][0].get("puuid")
            if entry_puuid:
                account_tasks.append(_fetch_account(entry_puuid))
                account_indexes.append(idx)

        account_error_samples = []
        if account_tasks:
            account_results = await asyncio.gather(*account_tasks, return_exceptions=True)
            for idx, account in zip(account_indexes, account_results):
                if isinstance(account, dict):
                    if account.get("_error"):
                        account_errors += 1
                        if debug and len(account_error_samples) < 3:
                            account_error_samples.append(account.get("_error"))
                    else:
                        accounts[idx] = account
                else:
                    account_errors += 1
        summoner_error_samples = []
        for summoner in summoner_results:
            if not isinstance(summoner, dict):
                summoner_errors += 1
            elif summoner.get("_error"):
                summoner_errors += 1
                if debug and len(summoner_error_samples) < 3:
                    summoner_error_samples.append(summoner.get("_error"))

    players: List[Dict[str, Any]] = []
    for (entry, tier), summoner, account in zip(combined_entries, summoner_results, accounts):
        wins = entry.get("wins", 0)
        losses = entry.get("losses", 0)
        total = max(wins + losses, 1)
        profile_icon_id = None
        puuid = entry.get("puuid")
        summoner_name = entry.get("summonerName", "Unknown")
        riot_id = None
        if isinstance(summoner, dict):
            profile_icon_id = summoner.get("profileIconId")
            summoner_name = summoner.get("name", summoner_name)
        if isinstance(account, dict):
            game_name = account.get("gameName")
            tag_line = account.get("tagLine")
            if game_name and tag_line:
                riot_id = f"{game_name}#{tag_line}"

        players.append(
            {
                "summoner_name": summoner_name,
                "riot_id": riot_id,
                "league_points": entry.get("leaguePoints", 0),
                "wins": wins,
                "losses": losses,
                "winrate": round((wins / total) * 100, 1),
                "hot_streak": entry.get("hotStreak", False),
                "veteran": entry.get("veteran", False),
                "rank": entry.get("rank"),
                "tier": tier,
                "profile_icon_id": profile_icon_id,
                "puuid": puuid,
            }
        )

    response = {
        "platform": platform,
        "queue": queue,
        "tier": league.get("tier", "CHALLENGER"),
        "name": league.get("name", "Challenger"),
        "players": players,
    }
    if debug:
        response["debug"] = {
            "summoner_errors": summoner_errors,
            "account_errors": account_errors,
            "summoner_error_samples": summoner_error_samples,
            "account_error_samples": account_error_samples,
            "raw_entries": raw_entries,
        }
    return response