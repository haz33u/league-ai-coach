"""
Riot API Service
"""
import httpx
from typing import Dict, Any
from app.config import settings


class RiotAPIError(Exception):
    """Custom exception для ошибок Riot API"""
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"Riot API Error {status_code}: {message}")


class RiotAPIService:
    """Сервис для работы с Riot API"""
    
    def __init__(self):
        self.api_key = settings.riot_api_key
        self.base_url = settings.riot_api_base_url
        self.headers = {"X-Riot-Token": self.api_key}
    
    async def get_account_by_riot_id(
        self, 
        game_name: str, 
        tag_line: str,
        region: str = "europe"
    ) -> Dict[str, Any]:
        """Получить account по Riot ID"""
        regional_base = self.base_url.replace("europe", region)
        endpoint = f"/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
        url = f"{regional_base}{endpoint}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                raise RiotAPIError(404, f"Account {game_name}#{tag_line} not found")
            else:
                raise RiotAPIError(response.status_code, response.text)
    
    async def get_summoner_by_puuid(
        self, 
        puuid: str,
        platform: str = "euw1"
    ) -> Dict[str, Any]:
        """Получить summoner по PUUID"""
        platform_base = f"https://{platform}.api.riotgames.com"
        endpoint = f"/lol/summoner/v4/summoners/by-puuid/{puuid}"
        url = f"{platform_base}{endpoint}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                raise RiotAPIError(404, "Summoner not found")
            else:
                raise RiotAPIError(response.status_code, response.text)
    
    async def get_match_history(
        self,
        puuid: str,
        region: str = "europe",
        count: int = 20
    ) -> list:
        """Получить match history"""
        regional_base = self.base_url.replace("europe", region)
        endpoint = f"/lol/match/v5/matches/by-puuid/{puuid}/ids?start=0&count={count}"
        url = f"{regional_base}{endpoint}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            
            if response.status_code == 200:
                return response.json()
            else:
                raise RiotAPIError(response.status_code, response.text)
