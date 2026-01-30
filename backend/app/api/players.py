"""
Players API endpoints - работа с данными игроков из БД
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from sqlalchemy import desc, func

from app.database import get_db
from app import crud
from app.models import Player, RankedStats


router = APIRouter(prefix="/players", tags=["players"])


@router.get("/", response_model=List[Dict[str, Any]])
async def get_all_players(db: Session = Depends(get_db)):
    """Получить список всех игроков из БД"""
    players = db.query(Player).all()
    
    result = []
    for player in players:
        ranked_stats = db.query(RankedStats).filter(RankedStats.player_id == player.id).first()
        
        player_data = {
            "id": player.id,
            "puuid": player.puuid,
            "game_name": player.game_name,
            "tag_line": player.tag_line,
            "summoner_level": player.summoner_level,
            "region": player.region,
            "platform": player.platform,
            "updated_at": player.updated_at.isoformat() if player.updated_at else None


        }
        
        if ranked_stats:
            player_data["current_rank"] = {
                "tier": ranked_stats.tier,
                "rank": ranked_stats.rank,
                "lp": ranked_stats.lp,
                "winrate": ranked_stats.winrate
            }
        else:
            player_data["current_rank"] = None
        
        result.append(player_data)
    
    return result


@router.get("/{puuid}", response_model=Dict[str, Any])
async def get_player(puuid: str, db: Session = Depends(get_db)):
    """Получить информацию об игроке по PUUID"""
    player = db.query(Player).filter(Player.puuid == puuid).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # Все ranked статистики игрока
    ranked_stats = db.query(RankedStats).filter(RankedStats.player_id == player.id).all()
    
    result = {
        "id": player.id,
        "puuid": player.puuid,
        "game_name": player.game_name,
        "tag_line": player.tag_line,
        "summoner_level": player.summoner_level,
        "profile_icon_id": player.profile_icon_id,
        "region": player.region,
        "platform": player.platform,
        "created_at": player.created_at.isoformat(),
        "updated_at": player.updated_at.isoformat(),
        "ranked_stats": []
    }
    
    for stat in ranked_stats:
        result["ranked_stats"].append({
            "queue_type": stat.queue_type,
            "tier": stat.tier,
            "rank": stat.rank,
            "lp": stat.lp,
            "wins": stat.wins,
            "losses": stat.losses,
            "total_games": stat.wins + stat.losses,
            "winrate": stat.winrate,
            "data_source": stat.data_source,
            "updated_at": stat.updated_at.isoformat() if stat.updated_at else None

        })
    
    return result


@router.get("/{puuid}/ranked", response_model=List[Dict[str, Any]])
async def get_player_ranked(puuid: str, db: Session = Depends(get_db)):
    """Получить ranked статистику игрока"""
    player = db.query(Player).filter(Player.puuid == puuid).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    ranked_stats = db.query(RankedStats).filter(RankedStats.player_id == player.id).all()
    
    result = []
    for stat in ranked_stats:
        result.append({
            "queue_type": stat.queue_type,
            "tier": stat.tier,
            "rank": stat.rank,
            "lp": stat.lp,
            "wins": stat.wins,
            "losses": stat.losses,
            "winrate": stat.winrate,
            "data_source": stat.data_source,
            "updated_at": player.updated_at.isoformat() if player.updated_at else None


        })
    
    return result


@router.get("/leaderboard/", response_model=List[Dict[str, Any]])
async def get_leaderboard(limit: int = 10, db: Session = Depends(get_db)):
    """Топ игроков по LP в SoloQ"""
    # Получаем игроков с их лучшим ranked (SoloQ)
    leaderboard = db.query(
        Player,
        RankedStats.lp.label('lp'),
        RankedStats.tier.label('tier'),
        RankedStats.rank.label('rank'),
        RankedStats.winrate.label('winrate')
    ).outerjoin(
        RankedStats, 
        (Player.id == RankedStats.player_id) & (RankedStats.queue_type == "RANKED_SOLO_5x5")
    ).order_by(
        desc(RankedStats.lp),  # Сначала по LP
        RankedStats.tier,      # Потом по тиру
        RankedStats.rank       # Потом по дивизиону
    ).limit(limit).all()
    
    result = []
    for player, lp, tier, rank, winrate in leaderboard:
        result.append({
            "puuid": player.puuid,
            "game_name": player.game_name,
            "tag_line": player.tag_line,
            "summoner_level": player.summoner_level,
            "rank": {
                "tier": tier,
                "rank": rank,
                "lp": lp or 0,
                "winrate": winrate or 0
            }
        })
    
    return result
