import argparse
import json
from collections import defaultdict

import pandas as pd
from dotenv import load_dotenv
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

from backend.app.database import SessionLocal
from backend.app import models


FEATURES = [
    "kills_per_min",
    "deaths_per_min",
    "assists_per_min",
    "cs_per_min",
    "vision_per_min",
    "damage_per_min",
    "gold_per_min",
]


def load_settings() -> None:
    load_dotenv("backend/.env")


def build_dataset():
    db = SessionLocal()
    rows = []
    try:
        matches = db.query(models.MatchHistory).all()
        for match in matches:
            info = (match.raw_data or {}).get("info", {})
            participants = info.get("participants", [])
            for participant in participants:
                time_played = participant.get("timePlayed") or info.get("gameDuration")
                if not time_played:
                    continue
                minutes = max(time_played / 60, 1)
                row = {
                    "champion": participant.get("championName"),
                    "role": participant.get("teamPosition"),
                    "win": int(bool(participant.get("win"))),
                    "kills_per_min": participant.get("kills", 0) / minutes,
                    "deaths_per_min": participant.get("deaths", 0) / minutes,
                    "assists_per_min": participant.get("assists", 0) / minutes,
                    "cs_per_min": (participant.get("totalMinionsKilled", 0) + participant.get("neutralMinionsKilled", 0)) / minutes,
                    "vision_per_min": participant.get("visionScore", 0) / minutes,
                    "damage_per_min": participant.get("totalDamageDealtToChampions", 0) / minutes,
                    "gold_per_min": participant.get("goldEarned", 0) / minutes,
                }
                if row["champion"]:
                    rows.append(row)
    finally:
        db.close()

    return pd.DataFrame(rows)


def train_importance(df: pd.DataFrame):
    X = df[FEATURES].fillna(0)
    y = df["win"].astype(int)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = LogisticRegression(max_iter=500)
    model.fit(X_scaled, y)

    importance = dict(zip(FEATURES, model.coef_[0]))
    return importance, scaler


def generate_guides(df: pd.DataFrame, importance) -> dict:
    guides = {}
    global_means = df[FEATURES].mean()
    pos_features = [f for f, v in importance.items() if v > 0]
    neg_features = [f for f, v in importance.items() if v < 0]

    grouped = df.groupby("champion")
    for champion, group in grouped:
        if len(group) < 20:
            continue
        champ_means = group[FEATURES].mean()
        role_counts = group["role"].value_counts()
        main_role = role_counts.index[0] if not role_counts.empty else None

        def summarize_for_group(frame: pd.DataFrame) -> dict:
            strengths = []
            focus = []
            lane_tips = []
            frame_means = frame[FEATURES].mean()

            for feat in pos_features:
                if frame_means[feat] >= global_means[feat] * 1.05:
                    strengths.append(feat.replace("_per_min", "").replace("_", " "))
                elif frame_means[feat] <= global_means[feat] * 0.9:
                    focus.append(f"Improve {feat.replace('_per_min', '').replace('_', ' ')}")

            for feat in neg_features:
                if frame_means[feat] >= global_means[feat] * 1.05:
                    focus.append(f"Reduce {feat.replace('_per_min', '').replace('_', ' ')}")

            role = frame["role"].mode().iloc[0] if not frame["role"].mode().empty else None
            if role:
                role_group = df[df["role"] == role]
                if not role_group.empty:
                    role_means = role_group[FEATURES].mean()
                    if frame_means["cs_per_min"] < role_means["cs_per_min"] * 0.9:
                        lane_tips.append("Focus on clean wave management and last-hitting.")
                    if frame_means["deaths_per_min"] > role_means["deaths_per_min"] * 1.1:
                        lane_tips.append("Play around enemy cooldowns and avoid extended trades.")
                    if frame_means["vision_per_min"] < role_means["vision_per_min"] * 0.9:
                        lane_tips.append("Increase vision control to avoid early ganks.")

            return {
                "strengths": strengths[:3],
                "focus": focus[:3],
                "lane_tips": lane_tips[:3],
            }

        overall = summarize_for_group(group)
        roles = {}
        for role, role_group in group.groupby("role"):
            if role not in ("TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"):
                continue
            if len(role_group) < 10:
                continue
            roles[role] = summarize_for_group(role_group)

        guides[champion] = {
            "main_role": main_role,
            "overall": overall,
            "roles": roles,
        }

    return guides


def run(output_path: str) -> None:
    df = build_dataset()
    if df.empty:
        raise RuntimeError("No match data available in DB")
    importance, _ = train_importance(df)
    guides = generate_guides(df, importance)

    with open(output_path, "w", encoding="utf-8") as handle:
        json.dump(guides, handle, ensure_ascii=False, indent=2)

    print(f"Guides written to {output_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate champion guides from match history")
    parser.add_argument(
        "--output",
        default="league-ai-coach-lcu/renderer/champion_guides.json",
        help="Output JSON file",
    )
    return parser.parse_args()


if __name__ == "__main__":
    load_settings()
    args = parse_args()
    run(args.output)
