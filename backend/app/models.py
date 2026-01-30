"""
SQLAlchemy ORM models
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Player(Base):
    __tablename__ = "players"
    
    id = Column(Integer, primary_key=True, index=True)
    puuid = Column(String, unique=True, index=True, nullable=False)
    game_name = Column(String, nullable=False)
    tag_line = Column(String, nullable=False)
    summoner_level = Column(Integer)
    profile_icon_id = Column(Integer)
    region = Column(String)
    platform = Column(String)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    ranked_stats = relationship("RankedStats", back_populates="player", cascade="all, delete-orphan")
    match_history = relationship("MatchHistory", back_populates="player", cascade="all, delete-orphan")


class RankedStats(Base):
    __tablename__ = "ranked_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    
    queue_type = Column(String)
    tier = Column(String)
    rank = Column(String)
    lp = Column(Integer)
    wins = Column(Integer, default=0)
    losses = Column(Integer, default=0)
    winrate = Column(Float)
    veteran = Column(Boolean, default=False)
    hot_streak = Column(Boolean, default=False)
    data_source = Column(String)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    player = relationship("Player", back_populates="ranked_stats")


class MatchHistory(Base):
    __tablename__ = "match_history"
    
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    
    match_id = Column(String, unique=True, index=True)
    game_mode = Column(String)
    game_duration = Column(Integer)
    game_creation = Column(DateTime(timezone=True))
    
    champion_name = Column(String)
    kills = Column(Integer)
    deaths = Column(Integer)
    assists = Column(Integer)
    win = Column(Boolean)
    
    total_damage = Column(Integer)
    gold_earned = Column(Integer)
    cs = Column(Integer)
    vision_score = Column(Integer)
    
    raw_data = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    player = relationship("Player", back_populates="match_history")
