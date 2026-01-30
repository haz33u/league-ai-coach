"""
Pydantic models для summoner данных
"""
from pydantic import BaseModel, Field
from typing import Optional


class SummonerRequest(BaseModel):
    """Request model для получения summoner"""
    game_name: str = Field(..., description="Summoner name")
    tag_line: str = Field(..., description="Tag line")
    region: str = Field(default="europe", description="Region: americas, asia, europe, sea")
    platform: str = Field(default="euw1", description="Platform: euw1, na1, kr, ru, etc.")


class AccountInfo(BaseModel):
    """Riot Account информация"""
    puuid: str
    gameName: str
    tagLine: str
    
    class Config:
        populate_by_name = True


class SummonerInfo(BaseModel):
    """League of Legends Summoner информация"""
    id: Optional[str] = None  # Может отсутствовать на некоторых серверах
    accountId: Optional[str] = None  # Может отсутствовать на некоторых серверах
    puuid: str
    profileIconId: int
    revisionDate: int
    summonerLevel: int
    
    class Config:
        populate_by_name = True


class SummonerResponse(BaseModel):
    """Полный ответ с данными summoner"""
    account: AccountInfo
    summoner: SummonerInfo
    match_history: Optional[list[str]] = None
