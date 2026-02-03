"""
Riot API Service
"""
import httpx
from typing import Dict, Any, Optional, Iterable
from app.config import settings
from app.services.cache import TTLCache


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
        self.cache = TTLCache(default_ttl_seconds=180, max_size=2048)

    REGIONAL_ROUTING = {"europe", "americas", "asia", "sea"}
    PLATFORM_TO_REGION = {
        "ru": "europe",
        "euw1": "europe",
        "eun1": "europe",
        "tr1": "europe",
        "na1": "americas",
        "br1": "americas",
        "la1": "americas",
        "la2": "americas",
        "kr": "asia",
        "jp1": "asia",
    }

    def _normalize_region(self, region: str, platform: Optional[str] = None) -> str:
        if region in self.REGIONAL_ROUTING:
            return region
        if platform and platform in self.PLATFORM_TO_REGION:
            return self.PLATFORM_TO_REGION[platform]
        if region in self.PLATFORM_TO_REGION:
            return self.PLATFORM_TO_REGION[region]
        return "europe"

    def _regional_base(self, region: str, platform: Optional[str] = None) -> str:
        normalized = self._normalize_region(region, platform)
        return self.base_url.replace("europe", normalized)

    def _platform_base(self, platform: str) -> str:
        return f"https://{platform}.api.riotgames.com"
    
    async def get_account_by_riot_id(
        self, 
        game_name: str, 
        tag_line: str,
        region: str = "europe"
    ) -> Dict[str, Any]:
        """Получить account по Riot ID"""
        regional_base = self._regional_base(region)
        endpoint = f"/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
        url = f"{regional_base}{endpoint}"
        
        cache_key = f"account:{region}:{game_name}:{tag_line}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                self.cache.set(cache_key, data, ttl_seconds=600)
                return data
            elif response.status_code == 404:
                raise RiotAPIError(404, f"Account {game_name}#{tag_line} not found")
            else:
                raise RiotAPIError(response.status_code, response.text)

    async def get_account_by_puuid(
        self,
        puuid: str,
        region: str = "europe",
        platform: Optional[str] = None,
        client: Optional[httpx.AsyncClient] = None,
    ) -> Dict[str, Any]:
        """Получить account по PUUID"""
        regional_base = self._regional_base(region, platform)
        endpoint = f"/riot/account/v1/accounts/by-puuid/{puuid}"
        url = f"{regional_base}{endpoint}"

        cache_key = f"account:puuid:{region}:{puuid}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        if client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
        else:
            async with httpx.AsyncClient() as session:
                response = await session.get(url, headers=self.headers, timeout=10.0)

        if response.status_code == 200:
            data = response.json()
            self.cache.set(cache_key, data, ttl_seconds=600)
            return data
        elif response.status_code == 404:
            raise RiotAPIError(404, "Account not found")
        else:
            raise RiotAPIError(response.status_code, response.text)
    
    async def get_summoner_by_puuid(
        self, 
        puuid: str,
        platform: str = "euw1"
    ) -> Dict[str, Any]:
        """Получить summoner по PUUID"""
        platform_base = self._platform_base(platform)
        endpoint = f"/lol/summoner/v4/summoners/by-puuid/{puuid}"
        url = f"{platform_base}{endpoint}"
        
        cache_key = f"summoner:{platform}:{puuid}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                self.cache.set(cache_key, data, ttl_seconds=300)
                return data
            elif response.status_code == 404:
                raise RiotAPIError(404, "Summoner not found")
            else:
                raise RiotAPIError(response.status_code, response.text)

    async def get_summoner_by_id(
        self,
        summoner_id: str,
        platform: str = "euw1",
        client: Optional[httpx.AsyncClient] = None,
    ) -> Dict[str, Any]:
        """Получить summoner по summonerId"""
        platform_base = self._platform_base(platform)
        endpoint = f"/lol/summoner/v4/summoners/{summoner_id}"
        url = f"{platform_base}{endpoint}"

        cache_key = f"summoner:id:{platform}:{summoner_id}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        if client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
        else:
            async with httpx.AsyncClient() as session:
                response = await session.get(url, headers=self.headers, timeout=10.0)

        if response.status_code == 200:
            data = response.json()
            self.cache.set(cache_key, data, ttl_seconds=300)
            return data
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
        regional_base = self._regional_base(region)
        endpoint = f"/lol/match/v5/matches/by-puuid/{puuid}/ids?start=0&count={count}"
        url = f"{regional_base}{endpoint}"
        
        cache_key = f"matches:{region}:{puuid}:{count}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                self.cache.set(cache_key, data, ttl_seconds=120)
                return data
            else:
                raise RiotAPIError(response.status_code, response.text)

    async def get_match_details(
        self,
        match_id: str,
        region: str = "europe",
        platform: Optional[str] = None,
        client: Optional[httpx.AsyncClient] = None
    ) -> Dict[str, Any]:
        """Получить детали матча"""
        regional_base = self._regional_base(region, platform)
        endpoint = f"/lol/match/v5/matches/{match_id}"
        url = f"{regional_base}{endpoint}"

        cache_key = f"match:{region}:{match_id}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        if client:
            response = await client.get(url, headers=self.headers, timeout=15.0)
        else:
            async with httpx.AsyncClient() as session:
                response = await session.get(url, headers=self.headers, timeout=15.0)

        if response.status_code == 200:
            data = response.json()
            self.cache.set(cache_key, data, ttl_seconds=300)
            return data
        elif response.status_code == 404:
            raise RiotAPIError(404, f"Match {match_id} not found")
        else:
            raise RiotAPIError(response.status_code, response.text)

    async def get_match_timeline(
        self,
        match_id: str,
        region: str = "europe",
        platform: Optional[str] = None,
        client: Optional[httpx.AsyncClient] = None
    ) -> Dict[str, Any]:
        """Get match timeline."""
        regional_base = self._regional_base(region, platform)
        endpoint = f"/lol/match/v5/matches/{match_id}/timeline"
        url = f"{regional_base}{endpoint}"

        cache_key = f"timeline:{region}:{match_id}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        if client:
            response = await client.get(url, headers=self.headers, timeout=15.0)
        else:
            async with httpx.AsyncClient() as session:
                response = await session.get(url, headers=self.headers, timeout=15.0)

        if response.status_code == 200:
            data = response.json()
            self.cache.set(cache_key, data, ttl_seconds=300)
            return data
        elif response.status_code == 404:
            raise RiotAPIError(404, f"Timeline {match_id} not found")
        else:
            raise RiotAPIError(response.status_code, response.text)

    async def get_league_entries(
        self,
        summoner_id: str,
        platform: str = "euw1"
    ) -> list:
        """Получить ранговые записи игрока"""
        platform_base = self._platform_base(platform)
        endpoint = f"/lol/league/v4/entries/by-summoner/{summoner_id}"
        url = f"{platform_base}{endpoint}"

        cache_key = f"league:{platform}:{summoner_id}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                self.cache.set(cache_key, data, ttl_seconds=300)
                return data
            elif response.status_code == 404:
                return []
            else:
                raise RiotAPIError(response.status_code, response.text)

    async def get_challenger_league(
        self,
        platform: str = "euw1",
        queue: str = "RANKED_SOLO_5x5"
    ) -> Dict[str, Any]:
        """Получить список Challenger лиги по очереди"""
        platform_base = self._platform_base(platform)
        endpoint = f"/lol/league/v4/challengerleagues/by-queue/{queue}"
        url = f"{platform_base}{endpoint}"

        cache_key = f"challenger:{platform}:{queue}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                self.cache.set(cache_key, data, ttl_seconds=60)
                return data
            raise RiotAPIError(response.status_code, response.text)

    async def get_grandmaster_league(
        self,
        platform: str = "euw1",
        queue: str = "RANKED_SOLO_5x5"
    ) -> Dict[str, Any]:
        """Получить список Grandmaster лиги по очереди"""
        platform_base = self._platform_base(platform)
        endpoint = f"/lol/league/v4/grandmasterleagues/by-queue/{queue}"
        url = f"{platform_base}{endpoint}"

        cache_key = f"grandmaster:{platform}:{queue}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                self.cache.set(cache_key, data, ttl_seconds=60)
                return data
            raise RiotAPIError(response.status_code, response.text)

    async def get_master_league(
        self,
        platform: str = "euw1",
        queue: str = "RANKED_SOLO_5x5"
    ) -> Dict[str, Any]:
        """Получить список Master лиги по очереди"""
        platform_base = self._platform_base(platform)
        endpoint = f"/lol/league/v4/masterleagues/by-queue/{queue}"
        url = f"{platform_base}{endpoint}"

        cache_key = f"master:{platform}:{queue}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                self.cache.set(cache_key, data, ttl_seconds=60)
                return data
            raise RiotAPIError(response.status_code, response.text)

    async def get_champion_mastery(
        self,
        summoner_id: str,
        platform: str = "euw1"
    ) -> list:
        """Получить мастерство чемпионов"""
        platform_base = self._platform_base(platform)
        endpoint = f"/lol/champion-mastery/v4/champion-masteries/by-summoner/{summoner_id}"
        url = f"{platform_base}{endpoint}"

        cache_key = f"mastery:{platform}:{summoner_id}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                self.cache.set(cache_key, data, ttl_seconds=600)
                return data
            elif response.status_code == 404:
                return []
            else:
                raise RiotAPIError(response.status_code, response.text)
