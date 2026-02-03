import argparse
import json
from collections import defaultdict
from typing import Dict, Any

from dotenv import load_dotenv

from backend.app.database import SessionLocal
from backend.app import models


ROLES = {"TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"}
ROLE_TO_LANE = {
    "TOP": "top",
    "JUNGLE": "jungle",
    "MIDDLE": "mid",
    "BOTTOM": "bot",
    "UTILITY": "support",
}


def load_settings() -> None:
    load_dotenv("backend/.env")


def add_matchup(stats: Dict[str, Any], lane: str, my_champ: str, enemy_champ: str, win: bool) -> None:
    entry = stats[lane][my_champ][enemy_champ]
    entry["games"] += 1
    if win:
        entry["wins"] += 1


def note_for(winrate: float) -> str:
    if winrate >= 53:
        return "Favorable matchup; press small leads early."
    if winrate <= 47:
        return "Difficult matchup; play for safe waves and jungle help."
    return "Even matchup; trade on cooldown windows."


def details_for(winrate: float, games: int) -> list[str]:
    details = []
    if games < 25:
        details.append("Low sample size; treat as directional only.")
    if winrate >= 55:
        details.append("Look for proactive trades when key cooldowns are up.")
    elif winrate <= 45:
        details.append("Avoid extended trades; play around jungle timers.")
    else:
        details.append("Play for tempo; slow push into safe resets.")
    return details


def confidence_for(games: int) -> str:
    if games >= 200:
        return "high"
    if games >= 80:
        return "medium"
    return "low"


def generate(output_path: str) -> None:
    db = SessionLocal()
    stats = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"games": 0, "wins": 0})))
    try:
        matches = db.query(models.MatchHistory).all()
        for match in matches:
            info = (match.raw_data or {}).get("info", {})
            participants = info.get("participants", [])
            teams: Dict[int, Dict[str, Dict[str, Any]]] = {100: {}, 200: {}}

            for participant in participants:
                role = participant.get("teamPosition")
                if role not in ROLES:
                    continue
                team_id = participant.get("teamId")
                teams.setdefault(team_id, {})[role] = participant

            for role in ROLES:
                if role not in teams.get(100, {}) or role not in teams.get(200, {}):
                    continue
                p1 = teams[100][role]
                p2 = teams[200][role]
                champ1 = p1.get("championName")
                champ2 = p2.get("championName")
                if not champ1 or not champ2:
                    continue
                lane = ROLE_TO_LANE[role]
                add_matchup(stats, lane, champ1, champ2, bool(p1.get("win")))
                add_matchup(stats, lane, champ2, champ1, bool(p2.get("win")))
    finally:
        db.close()

    output: Dict[str, Any] = {}
    for lane, champs in stats.items():
        output[lane] = {}
        for champ, enemies in champs.items():
            output[lane][champ] = {}
            for enemy, data in enemies.items():
                if data["games"] < 10:
                    continue
                winrate = round((data["wins"] / data["games"]) * 100, 1)
                output[lane][champ][enemy] = {
                    "winrate": winrate,
                    "games": data["games"],
                    "note": note_for(winrate),
                    "details": details_for(winrate, data["games"]),
                    "confidence": confidence_for(data["games"]),
                }

    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(output, handle, ensure_ascii=False, indent=2)

    print(f"Matchups written to {output_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate lane matchup tables from DB")
    parser.add_argument(
        "--output",
        default="league-ai-coach-lcu/renderer/matchups.json",
        help="Output JSON file",
    )
    return parser.parse_args()


if __name__ == "__main__":
    load_settings()
    args = parse_args()
    generate(args.output)
