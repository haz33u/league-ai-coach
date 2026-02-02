"""
CRUD operations for database
"""
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.models import Player, RankedStats, MatchHistory


# ============================================================================
# PLAYER CRUD
# ============================================================================

def get_player_by_puuid(db: Session, puuid: str) -> Optional[Player]:
    """Получить игрока по PUUID"""
    return db.query(Player).filter(Player.puuid == puuid).first()


def get_player_by_riot_id(db: Session, game_name: str, tag_line: str) -> Optional[Player]:
    """Получить игрока по Riot ID (game_name#tag_line)"""
    return db.query(Player).filter(
        Player.game_name == game_name,
        Player.tag_line == tag_line
    ).first()


def create_player(db: Session, puuid: str, game_name: str, tag_line: str, 
                  region: str = None, platform: str = None,
                  summoner_level: int = None, profile_icon_id: int = None) -> Player:
    """Создать нового игрока"""
    player = Player(
        puuid=puuid,
        game_name=game_name,
        tag_line=tag_line,
        region=region,
        platform=platform,
        summoner_level=summoner_level,
        profile_icon_id=profile_icon_id
    )
    db.add(player)
    db.commit()
    db.refresh(player)
    return player


def update_player(db: Session, player: Player, **kwargs) -> Player:
    """Обновить данные игрока"""
    for key, value in kwargs.items():
        if hasattr(player, key) and value is not None:
            setattr(player, key, value)
    
    player.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(player)
    return player


def get_or_create_player(db: Session, puuid: str, game_name: str, tag_line: str, **kwargs) -> Player:
    """Получить или создать игрока"""
    player = get_player_by_puuid(db, puuid)
    if player:
        return update_player(db, player, game_name=game_name, tag_line=tag_line, **kwargs)
    else:
        return create_player(db, puuid, game_name, tag_line, **kwargs)


# ============================================================================
# RANKED STATS CRUD
# ============================================================================

def get_ranked_stats(db: Session, player_id: int, queue_type: str = "RANKED_SOLO_5x5") -> Optional[RankedStats]:
    """Получить ранковую статистику игрока"""
    return db.query(RankedStats).filter(
        RankedStats.player_id == player_id,
        RankedStats.queue_type == queue_type
    ).first()


def create_or_update_ranked_stats(db: Session, player_id: int, queue_type: str,
                                   tier: str = None, rank: str = None, lp: int = None,
                                   wins: int = 0, losses: int = 0,
                                   veteran: bool = False, hot_streak: bool = False,
                                   data_source: str = "riot_api") -> RankedStats:
    """Создать или обновить ранковую статистику"""
    stats = get_ranked_stats(db, player_id, queue_type)
    
    total_games = wins + losses
    winrate = (wins / total_games * 100) if total_games > 0 else 0.0
    
    if stats:
        stats.tier = tier
        stats.rank = rank
        stats.lp = lp
        stats.wins = wins
        stats.losses = losses
        stats.winrate = winrate
        stats.veteran = veteran
        stats.hot_streak = hot_streak
        stats.data_source = data_source
        stats.updated_at = datetime.utcnow()
    else:
        stats = RankedStats(
            player_id=player_id,
            queue_type=queue_type,
            tier=tier,
            rank=rank,
            lp=lp,
            wins=wins,
            losses=losses,
            winrate=winrate,
            veteran=veteran,
            hot_streak=hot_streak,
            data_source=data_source
        )
        db.add(stats)
    
    db.commit()
    db.refresh(stats)
    return stats


def get_all_ranked_stats(db: Session, player_id: int) -> List[RankedStats]:
    """Получить всю ранковую статистику игрока"""
    return db.query(RankedStats).filter(RankedStats.player_id == player_id).all()


# ============================================================================
# MATCH HISTORY CRUD
# ============================================================================

def get_match_by_match_id(db: Session, match_id: str) -> Optional[MatchHistory]:
    """Получить матч по match_id"""
    return db.query(MatchHistory).filter(MatchHistory.match_id == match_id).first()


def create_or_update_match_history(
    db: Session,
    player_id: int,
    match_id: str,
    game_mode: str,
    game_duration: int,
    game_creation: Optional[datetime],
    champion_name: str,
    kills: int,
    deaths: int,
    assists: int,
    win: bool,
    total_damage: int,
    gold_earned: int,
    cs: int,
    vision_score: int,
    raw_data: dict,
) -> MatchHistory:
    """Создать или обновить матч в истории"""
    existing = get_match_by_match_id(db, match_id)
    if existing:
        existing.game_mode = game_mode
        existing.game_duration = game_duration
        existing.game_creation = game_creation
        existing.champion_name = champion_name
        existing.kills = kills
        existing.deaths = deaths
        existing.assists = assists
        existing.win = win
        existing.total_damage = total_damage
        existing.gold_earned = gold_earned
        existing.cs = cs
        existing.vision_score = vision_score
        existing.raw_data = raw_data
        db.commit()
        db.refresh(existing)
        return existing

    match = MatchHistory(
        player_id=player_id,
        match_id=match_id,
        game_mode=game_mode,
        game_duration=game_duration,
        game_creation=game_creation,
        champion_name=champion_name,
        kills=kills,
        deaths=deaths,
        assists=assists,
        win=win,
        total_damage=total_damage,
        gold_earned=gold_earned,
        cs=cs,
        vision_score=vision_score,
        raw_data=raw_data,
    )
    db.add(match)
    db.commit()
    db.refresh(match)
    return match