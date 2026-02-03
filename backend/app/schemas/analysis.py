"""
Pydantic schemas for analysis responses
"""
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class PlayerInfo(BaseModel):
    game_name: str
    tag_line: str
    puuid: str
    level: int = 0
    profile_icon_id: Optional[int] = None


class RankedQueue(BaseModel):
    queueType: Optional[str] = None
    tier: Optional[str] = None
    rank: Optional[str] = None
    leaguePoints: Optional[int] = None
    wins: Optional[int] = None
    losses: Optional[int] = None
    veteran: Optional[bool] = None
    hotStreak: Optional[bool] = None
    miniSeries: Optional[dict] = None


class RankedInfo(BaseModel):
    solo: Optional[RankedQueue] = None
    flex: Optional[RankedQueue] = None


class SummaryStats(BaseModel):
    total_games: int
    wins: int
    losses: int
    winrate: float


class PerformanceStats(BaseModel):
    avg_kills: float
    avg_deaths: float
    avg_assists: float
    avg_kda: float
    avg_cs: float
    avg_vision_score: float
    avg_gold: float
    avg_damage: float
    avg_cs_per_min: Optional[float] = None
    avg_vision_per_min: Optional[float] = None
    avg_gold_per_min: Optional[float] = None
    avg_damage_per_min: Optional[float] = None
    avg_kill_participation: Optional[float] = None
    avg_damage_share: Optional[float] = None
    avg_dragon_takedowns: Optional[float] = None
    avg_baron_takedowns: Optional[float] = None
    avg_herald_takedowns: Optional[float] = None
    avg_turret_takedowns: Optional[float] = None
    avg_inhibitor_takedowns: Optional[float] = None


class RoleBreakdown(BaseModel):
    games: int
    percentage: float


class RolesInfo(BaseModel):
    main_role: str
    breakdown: Dict[str, RoleBreakdown]


class ChampionStats(BaseModel):
    games: int
    wins: int
    losses: int
    winrate: float


class RecentMatch(BaseModel):
    match_id: str
    queue_id: Optional[int] = None
    game_duration: Optional[int] = None
    game_creation: Optional[int] = None
    champion: str
    role: str
    team_position: Optional[str] = None
    kills: int
    deaths: int
    assists: int
    kda: float
    cs: int
    lane_cs: Optional[int] = None
    neutral_cs: Optional[int] = None
    cs_per_min: Optional[float] = None
    vision_score: int
    vision_per_min: Optional[float] = None
    gold: int
    gold_per_min: Optional[float] = None
    damage: int
    damage_per_min: Optional[float] = None
    damage_taken: Optional[int] = None
    win: bool
    kill_participation: Optional[float] = None
    damage_share: Optional[float] = None
    gold_share: Optional[float] = None
    team_kills: Optional[int] = None
    team_damage: Optional[int] = None
    team_gold: Optional[int] = None
    dragon_takedowns: Optional[int] = None
    baron_takedowns: Optional[int] = None
    herald_takedowns: Optional[int] = None
    turret_takedowns: Optional[int] = None
    inhibitor_takedowns: Optional[int] = None
    wards_placed: Optional[int] = None
    wards_killed: Optional[int] = None
    control_wards_placed: Optional[int] = None
    items: List[Optional[int]] = Field(default_factory=list)
    spells: List[Optional[int]] = Field(default_factory=list)
    runes: Optional[dict] = None
    champion_detail: Optional[dict] = None
    items_detail: Optional[List[dict]] = None
    spells_detail: Optional[List[dict]] = None
    runes_detail: Optional[dict] = None
    timeline: Optional[dict] = None


class PlayerDNA(BaseModel):
    primary: str
    tags: List[str]
    scores: dict


class LearningFocus(BaseModel):
    title: str
    reason: str
    action: str


class LearningPath(BaseModel):
    main_role: str
    focuses: List[LearningFocus]


class CoachingInsight(BaseModel):
    title: str
    reason: str
    action: str


class EarlyGameSummary(BaseModel):
    tracked_matches: int
    avg_early_kills: float
    avg_early_deaths: float
    avg_early_assists: float
    first_objective_participation_rate: float


class AnalysisResponse(BaseModel):
    player: PlayerInfo
    ranked: RankedInfo
    summary: SummaryStats
    performance: PerformanceStats
    roles: RolesInfo
    champions: Dict[str, ChampionStats]
    recent_matches: List[RecentMatch]
    dna: Optional[PlayerDNA] = None
    learning_path: Optional[LearningPath] = None
    coaching_recap: Optional[List[CoachingInsight]] = None
    early_game: Optional[EarlyGameSummary] = None


class StatsResponse(BaseModel):
    player: PlayerInfo
    summary: SummaryStats
    performance: PerformanceStats
    top_champions: Dict[str, ChampionStats]
    recent_matches: List[RecentMatch]
