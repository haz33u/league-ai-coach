import argparse
import asyncio
import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from backend.app.database import SessionLocal
from backend.app import models


REGION_BY_PLATFORM = {
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


def load_settings() -> None:
    load_dotenv("backend/.env")


def get_region(platform: str, override: Optional[str]) -> str:
    if override:
        return override
    return REGION_BY_PLATFORM.get(platform, "europe")


async def api_get(client: httpx.AsyncClient, url: str, api_key: str, retries: int = 3) -> Any:
    for attempt in range(retries):
        response = await client.get(url, headers={"X-Riot-Token": api_key}, timeout=12.0)
        if response.status_code == 200:
            return response.json()
        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", "1"))
            await asyncio.sleep(retry_after)
            continue
        if response.status_code >= 500 and attempt < retries - 1:
            await asyncio.sleep(0.5)
            continue
        raise RuntimeError(f"Riot API error {response.status_code}: {response.text}")
    raise RuntimeError("Riot API request failed after retries")


async def get_account_by_riot_id(
    client: httpx.AsyncClient,
    api_key: str,
    region: str,
    game_name: str,
    tag_line: str,
) -> Dict[str, Any]:
    url = f"https://{region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
    return await api_get(client, url, api_key)


async def get_summoner_by_puuid(
    client: httpx.AsyncClient,
    api_key: str,
    platform: str,
    puuid: str,
) -> Dict[str, Any]:
    url = f"https://{platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}"
    return await api_get(client, url, api_key)


async def get_match_ids(
    client: httpx.AsyncClient,
    api_key: str,
    region: str,
    puuid: str,
    count: int,
    queue: Optional[int],
) -> List[str]:
    params = [f"start=0", f"count={count}"]
    if queue:
        params.append(f"queue={queue}")
    url = f"https://{region}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids?{'&'.join(params)}"
    return await api_get(client, url, api_key)


async def get_match_details(
    client: httpx.AsyncClient,
    api_key: str,
    region: str,
    match_id: str,
) -> Dict[str, Any]:
    url = f"https://{region}.api.riotgames.com/lol/match/v5/matches/{match_id}"
    return await api_get(client, url, api_key)


def upsert_player(db: Session, puuid: str, game_name: str, tag_line: str, platform: str, region: str, summoner: Dict[str, Any]) -> models.Player:
    player = db.query(models.Player).filter(models.Player.puuid == puuid).first()
    if player:
        player.game_name = game_name
        player.tag_line = tag_line
        player.platform = platform
        player.region = region
        player.summoner_level = summoner.get("summonerLevel")
        player.profile_icon_id = summoner.get("profileIconId")
        db.add(player)
        return player

    player = models.Player(
        puuid=puuid,
        game_name=game_name,
        tag_line=tag_line,
        platform=platform,
        region=region,
        summoner_level=summoner.get("summonerLevel"),
        profile_icon_id=summoner.get("profileIconId"),
    )
    db.add(player)
    return player


def upsert_match(
    db: Session,
    player: models.Player,
    match_id: str,
    match_data: Dict[str, Any],
    participant: Dict[str, Any],
) -> None:
    existing = db.query(models.MatchHistory).filter(models.MatchHistory.match_id == match_id).first()
    if existing:
        return

    info = match_data.get("info", {})
    game_creation_ms = info.get("gameCreation")
    game_creation = None
    if game_creation_ms:
        game_creation = datetime.fromtimestamp(game_creation_ms / 1000, tz=timezone.utc)

    match = models.MatchHistory(
        player_id=player.id,
        match_id=match_id,
        game_mode=info.get("gameMode"),
        game_duration=info.get("gameDuration"),
        game_creation=game_creation,
        champion_name=participant.get("championName"),
        kills=participant.get("kills"),
        deaths=participant.get("deaths"),
        assists=participant.get("assists"),
        win=participant.get("win"),
        total_damage=participant.get("totalDamageDealtToChampions"),
        gold_earned=participant.get("goldEarned"),
        cs=(participant.get("totalMinionsKilled", 0) + participant.get("neutralMinionsKilled", 0)),
        vision_score=participant.get("visionScore"),
        raw_data=match_data,
    )
    db.add(match)


async def collect_for_seed(seed: Dict[str, Any], count: int, queue: Optional[int]) -> int:
    platform = seed.get("platform", "euw1")
    region = get_region(platform, seed.get("region"))
    game_name = seed["game_name"]
    tag_line = seed["tag_line"]

    api_key = os.getenv("RIOT_API_KEY")
    if not api_key:
        raise RuntimeError("RIOT_API_KEY is not set")

    collected = 0
    async with httpx.AsyncClient() as client:
        account = await get_account_by_riot_id(client, api_key, region, game_name, tag_line)
        puuid = account["puuid"]
        summoner = await get_summoner_by_puuid(client, api_key, platform, puuid)
        match_ids = await get_match_ids(client, api_key, region, puuid, count, queue)

        db = SessionLocal()
        try:
            player = upsert_player(db, puuid, game_name, tag_line, platform, region, summoner)
            db.flush()

            for match_id in match_ids:
                match_data = await get_match_details(client, api_key, region, match_id)
                participants = match_data.get("info", {}).get("participants", [])
                participant = next((p for p in participants if p.get("puuid") == puuid), None)
                if not participant:
                    continue
                upsert_match(db, player, match_id, match_data, participant)
                collected += 1

            db.commit()
        finally:
            db.close()

    return collected


async def run(seed_file: str, count: int, queue: Optional[int]) -> None:
    with open(seed_file, "r", encoding="utf-8") as handle:
        seeds = json.load(handle)

    total = 0
    for seed in seeds:
        total += await collect_for_seed(seed, count, queue)
    print(f"Collected {total} matches.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Collect match data from Riot API into DB")
    parser.add_argument("--seed-file", default="scripts/seeds.sample.json", help="JSON file with Riot IDs")
    parser.add_argument("--count", type=int, default=50, help="Matches per seed")
    parser.add_argument("--queue", type=int, default=420, help="Queue ID filter (420 = solo/duo)")
    return parser.parse_args()


if __name__ == "__main__":
    load_settings()
    args = parse_args()
    asyncio.run(run(args.seed_file, args.count, args.queue))
