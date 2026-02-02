from collections import Counter
from typing import Any, Dict, List, Optional


ROLE_LABELS = {
    "TOP": "Top",
    "JUNGLE": "Jungle",
    "MIDDLE": "Mid",
    "BOTTOM": "ADC",
    "UTILITY": "Support",
    "NONE": "Unknown",
    "": "Unknown",
}


def _find_participant(match: Dict[str, Any], puuid: str) -> Optional[Dict[str, Any]]:
    participants = match.get("info", {}).get("participants", [])
    for participant in participants:
        if participant.get("puuid") == puuid:
            return participant
    return None


def _get_match_id(match: Dict[str, Any]) -> str:
    return match.get("metadata", {}).get("matchId", "UNKNOWN")


def summarize_matches(match_details: List[Dict[str, Any]], puuid: str) -> Dict[str, Any]:
    stats = {
        "wins": 0,
        "losses": 0,
        "kills": [],
        "deaths": [],
        "assists": [],
        "cs": [],
        "neutral_cs": [],
        "cs_per_min": [],
        "vision_scores": [],
        "vision_per_min": [],
        "gold": [],
        "gold_per_min": [],
        "damage": [],
        "damage_per_min": [],
        "damage_share": [],
        "kill_participation": [],
        "dragon_takedowns": [],
        "baron_takedowns": [],
        "herald_takedowns": [],
        "turret_takedowns": [],
        "inhibitor_takedowns": [],
        "roles": Counter(),
        "champions": Counter(),
        "champion_wins": Counter(),
        "recent_matches": [],
    }

    for match in match_details:
        participant = _find_participant(match, puuid)
        if not participant:
            continue

        win = bool(participant.get("win", False))
        champion = participant.get("championName", "Unknown")
        role = ROLE_LABELS.get(participant.get("teamPosition", "NONE"), "Unknown")

        stats["wins" if win else "losses"] += 1
        stats["kills"].append(participant.get("kills", 0))
        stats["deaths"].append(participant.get("deaths", 0))
        stats["assists"].append(participant.get("assists", 0))
        lane_cs = participant.get("totalMinionsKilled", 0)
        neutral_cs = participant.get("neutralMinionsKilled", 0)
        total_cs = lane_cs + neutral_cs
        stats["cs"].append(total_cs)
        stats["neutral_cs"].append(neutral_cs)
        stats["vision_scores"].append(participant.get("visionScore", 0))
        stats["gold"].append(participant.get("goldEarned", 0))
        stats["damage"].append(participant.get("totalDamageDealtToChampions", 0))
        stats["roles"][role] += 1
        stats["champions"][champion] += 1

        if win:
            stats["champion_wins"][champion] += 1

        info = match.get("info", {})
        runes = _extract_runes(participant)
        participants = info.get("participants", [])
        team_id = participant.get("teamId")
        team_kills = sum(
            p.get("kills", 0) for p in participants if p.get("teamId") == team_id
        )
        team_damage = sum(
            p.get("totalDamageDealtToChampions", 0)
            for p in participants
            if p.get("teamId") == team_id
        )
        team_gold = sum(
            p.get("goldEarned", 0) for p in participants if p.get("teamId") == team_id
        )
        game_duration = info.get("gameDuration") or 0
        minutes = max(game_duration / 60, 1)
        kill_participation = (
            (participant.get("kills", 0) + participant.get("assists", 0)) / max(team_kills, 1)
        )
        damage_share = participant.get("totalDamageDealtToChampions", 0) / max(team_damage, 1)
        gold_share = participant.get("goldEarned", 0) / max(team_gold, 1)

        stats["cs_per_min"].append(total_cs / minutes)
        stats["vision_per_min"].append(participant.get("visionScore", 0) / minutes)
        stats["gold_per_min"].append(participant.get("goldEarned", 0) / minutes)
        stats["damage_per_min"].append(participant.get("totalDamageDealtToChampions", 0) / minutes)
        stats["damage_share"].append(damage_share)
        stats["kill_participation"].append(kill_participation)

        challenges = participant.get("challenges", {})
        stats["dragon_takedowns"].append(challenges.get("dragonTakedowns", 0))
        stats["baron_takedowns"].append(challenges.get("baronTakedowns", 0))
        stats["herald_takedowns"].append(challenges.get("riftHeraldTakedowns", 0))
        stats["turret_takedowns"].append(challenges.get("turretTakedowns", 0))
        stats["inhibitor_takedowns"].append(challenges.get("inhibitorTakedowns", 0))

        stats["recent_matches"].append(
            {
                "match_id": _get_match_id(match),
                "queue_id": info.get("queueId"),
                "game_duration": info.get("gameDuration"),
                "game_creation": info.get("gameCreation"),
                "champion": champion,
                "role": role,
                "team_position": participant.get("teamPosition"),
                "kills": participant.get("kills", 0),
                "deaths": participant.get("deaths", 0),
                "assists": participant.get("assists", 0),
                "kda": _calculate_kda(
                    participant.get("kills", 0),
                    participant.get("deaths", 0),
                    participant.get("assists", 0),
                ),
                "cs": total_cs,
                "lane_cs": lane_cs,
                "neutral_cs": neutral_cs,
                "cs_per_min": round(total_cs / minutes, 2),
                "vision_score": participant.get("visionScore", 0),
                "vision_per_min": round(participant.get("visionScore", 0) / minutes, 2),
                "gold": participant.get("goldEarned", 0),
                "gold_per_min": round(participant.get("goldEarned", 0) / minutes, 1),
                "damage": participant.get("totalDamageDealtToChampions", 0),
                "damage_taken": participant.get("totalDamageTaken", 0),
                "damage_per_min": round(participant.get("totalDamageDealtToChampions", 0) / minutes, 1),
                "win": win,
                "kill_participation": round(kill_participation, 3),
                "damage_share": round(damage_share, 3),
                "gold_share": round(gold_share, 3),
                "team_kills": team_kills,
                "team_damage": team_damage,
                "team_gold": team_gold,
                "dragon_takedowns": challenges.get("dragonTakedowns", 0),
                "baron_takedowns": challenges.get("baronTakedowns", 0),
                "herald_takedowns": challenges.get("riftHeraldTakedowns", 0),
                "turret_takedowns": challenges.get("turretTakedowns", 0),
                "inhibitor_takedowns": challenges.get("inhibitorTakedowns", 0),
                "wards_placed": participant.get("wardsPlaced", 0),
                "wards_killed": participant.get("wardsKilled", 0),
                "control_wards_placed": participant.get("detectorWardsPlaced", 0),
                "items": [
                    participant.get("item0"),
                    participant.get("item1"),
                    participant.get("item2"),
                    participant.get("item3"),
                    participant.get("item4"),
                    participant.get("item5"),
                    participant.get("item6"),
                ],
                "spells": [participant.get("summoner1Id"), participant.get("summoner2Id")],
                "runes": runes,
            }
        )

    total_games = stats["wins"] + stats["losses"]
    if total_games == 0:
        return {
            "summary": {
                "total_games": 0,
                "wins": 0,
                "losses": 0,
                "winrate": 0.0,
            },
            "performance": {},
            "roles": {},
            "champions": {},
            "recent_matches": [],
        }

    avg_kills = _safe_avg(stats["kills"])
    avg_deaths = _safe_avg(stats["deaths"])
    avg_assists = _safe_avg(stats["assists"])
    avg_cs = _safe_avg(stats["cs"])
    avg_vision = _safe_avg(stats["vision_scores"])
    avg_gold = _safe_avg(stats["gold"])
    avg_damage = _safe_avg(stats["damage"])
    avg_kda = _calculate_kda(avg_kills, avg_deaths, avg_assists)
    avg_cs_per_min = _safe_avg(stats["cs_per_min"])
    avg_vision_per_min = _safe_avg(stats["vision_per_min"])
    avg_gold_per_min = _safe_avg(stats["gold_per_min"])
    avg_damage_per_min = _safe_avg(stats["damage_per_min"])
    avg_kp = _safe_avg(stats["kill_participation"])
    avg_damage_share = _safe_avg(stats["damage_share"])
    avg_dragon = _safe_avg(stats["dragon_takedowns"])
    avg_baron = _safe_avg(stats["baron_takedowns"])
    avg_herald = _safe_avg(stats["herald_takedowns"])
    avg_turrets = _safe_avg(stats["turret_takedowns"])
    avg_inhib = _safe_avg(stats["inhibitor_takedowns"])

    top_champions = {}
    for champion, games in stats["champions"].most_common(5):
        wins = stats["champion_wins"][champion]
        losses = games - wins
        top_champions[champion] = {
            "games": games,
            "wins": wins,
            "losses": losses,
            "winrate": round((wins / games) * 100, 1) if games > 0 else 0,
        }

    role_breakdown = {
        role: {"games": count, "percentage": round(count / total_games * 100, 1)}
        for role, count in stats["roles"].most_common()
    }
    main_role = next(iter(role_breakdown.keys()), "Unknown")

    return {
        "summary": {
            "total_games": total_games,
            "wins": stats["wins"],
            "losses": stats["losses"],
            "winrate": round((stats["wins"] / total_games) * 100, 1),
        },
        "performance": {
            "avg_kills": round(avg_kills, 2),
            "avg_deaths": round(avg_deaths, 2),
            "avg_assists": round(avg_assists, 2),
            "avg_kda": round(avg_kda, 2),
            "avg_cs": round(avg_cs, 1),
            "avg_vision_score": round(avg_vision, 1),
            "avg_gold": round(avg_gold, 1),
            "avg_damage": round(avg_damage, 1),
            "avg_cs_per_min": round(avg_cs_per_min, 2),
            "avg_vision_per_min": round(avg_vision_per_min, 2),
            "avg_gold_per_min": round(avg_gold_per_min, 1),
            "avg_damage_per_min": round(avg_damage_per_min, 1),
            "avg_kill_participation": round(avg_kp, 3),
            "avg_damage_share": round(avg_damage_share, 3),
            "avg_dragon_takedowns": round(avg_dragon, 2),
            "avg_baron_takedowns": round(avg_baron, 2),
            "avg_herald_takedowns": round(avg_herald, 2),
            "avg_turret_takedowns": round(avg_turrets, 2),
            "avg_inhibitor_takedowns": round(avg_inhib, 2),
        },
        "roles": {
            "main_role": main_role,
            "breakdown": role_breakdown,
        },
        "champions": top_champions,
        "recent_matches": stats["recent_matches"][:10],
    }


def _safe_avg(values: List[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _calculate_kda(kills: float, deaths: float, assists: float) -> float:
    if deaths <= 0:
        return kills + assists
    return (kills + assists) / deaths


def build_player_dna(analysis: Dict[str, Any]) -> Dict[str, Any]:
    performance = analysis.get("performance", {})
    roles = analysis.get("roles", {})
    main_role = roles.get("main_role", "Unknown")

    cs_per_min = performance.get("avg_cs_per_min", 0)
    vision_per_min = performance.get("avg_vision_per_min", 0)
    kill_participation = performance.get("avg_kill_participation", 0)
    damage_share = performance.get("avg_damage_share", 0)
    kda = performance.get("avg_kda", 0)

    thresholds = _role_thresholds(main_role)
    econ_score = _score_range(cs_per_min, thresholds["cs_low"], thresholds["cs_high"])
    vision_score = _score_range(vision_per_min, thresholds["vision_low"], thresholds["vision_high"])
    teamplay_score = _score_range(kill_participation, 0.45, 0.7)
    damage_score = _score_range(damage_share, thresholds["dmg_low"], thresholds["dmg_high"])
    survivability_score = _score_range(kda, 2.0, 4.0)

    tags = []
    if vision_score >= 70:
        tags.append("Vision Controller")
    if econ_score >= 70:
        tags.append("Economy Farmer")
    if teamplay_score >= 70:
        tags.append("Teamfight Oriented")
    if damage_score >= 70:
        tags.append("Damage Threat")
    if survivability_score >= 70:
        tags.append("Low Risk")
    if not tags:
        tags.append("Balanced")

    primary = tags[0]
    if teamplay_score >= 70 and damage_score >= 70:
        primary = "Playmaker"
    if vision_score >= 75 and damage_score < 50:
        primary = "Vision Controller"
    if econ_score >= 75 and damage_score < 55:
        primary = "Economy Farmer"

    return {
        "primary": primary,
        "tags": tags[:3],
        "scores": {
            "economy": econ_score,
            "vision": vision_score,
            "teamplay": teamplay_score,
            "damage": damage_score,
            "survivability": survivability_score,
        },
    }


def build_learning_path(analysis: Dict[str, Any]) -> Dict[str, Any]:
    performance = analysis.get("performance", {})
    roles = analysis.get("roles", {})
    main_role = roles.get("main_role", "Unknown")

    cs_per_min = performance.get("avg_cs_per_min", 0)
    vision_per_min = performance.get("avg_vision_per_min", 0)
    kill_participation = performance.get("avg_kill_participation", 0)
    damage_share = performance.get("avg_damage_share", 0)
    avg_deaths = performance.get("avg_deaths", 0)

    thresholds = _role_thresholds(main_role)
    focuses = []

    if cs_per_min < thresholds["cs_low"]:
        focuses.append({
            "title": "CS discipline",
            "reason": f"CS/min is {round(cs_per_min, 2)} for {main_role}.",
            "action": "Focus on pathing and last-hits; track 10-min CS goals.",
        })

    if vision_per_min < thresholds["vision_low"]:
        focuses.append({
            "title": "Vision control",
            "reason": f"Vision/min is {round(vision_per_min, 2)}.",
            "action": "Add control wards and clear river before objectives.",
        })

    if kill_participation < 0.5:
        focuses.append({
            "title": "Teamfight presence",
            "reason": f"Kill participation is {round(kill_participation, 3)}.",
            "action": "Sync timings with lanes and contest first objectives.",
        })

    if damage_share < thresholds["dmg_low"]:
        focuses.append({
            "title": "Damage contribution",
            "reason": f"Damage share is {round(damage_share, 3)}.",
            "action": "Prioritize safe damage windows and item spikes.",
        })

    if avg_deaths > 6:
        focuses.append({
            "title": "Survivability",
            "reason": f"Avg deaths is {round(avg_deaths, 2)}.",
            "action": "Track risky fights and improve retreat timing.",
        })

    if not focuses:
        focuses.append({
            "title": "Consistency",
            "reason": "Core metrics look solid.",
            "action": "Maintain form and refine champion pool.",
        })

    return {
        "main_role": main_role,
        "focuses": focuses[:3],
    }


def _role_thresholds(role: str) -> Dict[str, float]:
    if role == "Support":
        return {"cs_low": 1.5, "cs_high": 3.0, "vision_low": 1.2, "vision_high": 2.5, "dmg_low": 0.12, "dmg_high": 0.2}
    if role == "Jungle":
        return {"cs_low": 4.0, "cs_high": 7.0, "vision_low": 0.7, "vision_high": 1.6, "dmg_low": 0.16, "dmg_high": 0.24}
    if role == "ADC":
        return {"cs_low": 6.0, "cs_high": 9.0, "vision_low": 0.5, "vision_high": 1.2, "dmg_low": 0.22, "dmg_high": 0.32}
    if role == "Mid":
        return {"cs_low": 6.0, "cs_high": 8.5, "vision_low": 0.6, "vision_high": 1.4, "dmg_low": 0.2, "dmg_high": 0.3}
    if role == "Top":
        return {"cs_low": 5.5, "cs_high": 8.0, "vision_low": 0.5, "vision_high": 1.2, "dmg_low": 0.18, "dmg_high": 0.27}
    return {"cs_low": 4.0, "cs_high": 7.0, "vision_low": 0.6, "vision_high": 1.4, "dmg_low": 0.16, "dmg_high": 0.25}


def _score_range(value: float, low: float, high: float) -> int:
    if high <= low:
        return 50
    clamped = max(min(value, high), low)
    return int(round((clamped - low) / (high - low) * 100))


def _extract_runes(participant: Dict[str, Any]) -> Dict[str, Any]:
    perks = participant.get("perks", {})
    styles = perks.get("styles", [])

    primary_style = next((s for s in styles if s.get("description") == "primaryStyle"), None)
    sub_style = next((s for s in styles if s.get("description") == "subStyle"), None)

    primary_style_id = primary_style.get("style") if primary_style else None
    sub_style_id = sub_style.get("style") if sub_style else None

    selections = primary_style.get("selections", []) if primary_style else []
    keystone_id = selections[0].get("perk") if selections else None

    perk_ids = []
    for style in styles:
        for selection in style.get("selections", []):
            perk_id = selection.get("perk")
            if perk_id is not None:
                perk_ids.append(perk_id)

    return {
        "primary_style_id": primary_style_id,
        "sub_style_id": sub_style_id,
        "keystone_id": keystone_id,
        "perk_ids": perk_ids,
    }
