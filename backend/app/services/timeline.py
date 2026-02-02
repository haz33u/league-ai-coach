"""
Timeline analysis helpers.
"""
from typing import Any, Dict, Optional


def summarize_timeline(timeline: Dict[str, Any], puuid: str) -> Dict[str, Any]:
    metadata = timeline.get("metadata", {})
    participants = metadata.get("participants", [])
    try:
        participant_id = participants.index(puuid) + 1
    except ValueError:
        participant_id = None

    if not participant_id:
        return {}

    frames = timeline.get("info", {}).get("frames", [])
    early_kills = early_deaths = early_assists = 0
    first_objective = None
    first_objective_time = None
    first_objective_type = None

    for frame in frames:
        timestamp = frame.get("timestamp", 0)
        if timestamp > 10 * 60 * 1000:
            break

        for event in frame.get("events", []):
            event_type = event.get("type")
            if event_type == "CHAMPION_KILL":
                killer = event.get("killerId")
                assists = event.get("assistingParticipantIds") or []
                victim = event.get("victimId")

                if killer == participant_id:
                    early_kills += 1
                if participant_id in assists:
                    early_assists += 1
                if victim == participant_id:
                    early_deaths += 1

            if event_type in {"ELITE_MONSTER_KILL", "BUILDING_KILL"}:
                if first_objective_time is None:
                    if participant_id in (event.get("assistingParticipantIds") or []) or event.get("killerId") == participant_id:
                        first_objective_time = timestamp
                        first_objective_type = event.get("monsterType") or event.get("buildingType")
                        first_objective = True

    return {
        "early_kills": early_kills,
        "early_deaths": early_deaths,
        "early_assists": early_assists,
        "first_objective_participation": first_objective or False,
        "first_objective_time": first_objective_time,
        "first_objective_type": first_objective_type,
    }
