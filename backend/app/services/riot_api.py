"""
Riot API Service
"""
import httpx
from typing import Dict, Any, Optional
import logging

from app.config import settings
from app.services.cache import TTLCache

logger = logging.getLogger(__name__)


class RiotAPIError(Exception):
    """Custom exception для ошибок Riot API"""

    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(f"Riot API Error {status_code}: {message}")


class RiotAPIService:
    """Сервис для работы с Riot API"""

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
        "oc1": "sea",
        "kr": "asia",
        "jp1": "asia",
    }

    PLATFORM_HOST = {
        "ru": "ru.api.riotgames.com",
        "euw1": "euw1.api.riotgames.com",
        "eun1": "eun1.api.riotgames.com",
        "tr1": "tr1.api.riotgames.com",
        "na1": "na1.api.riotgames.com",
        "br1": "br1.api.riotgames.com",
        "la1": "la1.api.riotgames.com",
        "la2": "la2.api.riotgames.com",
        "oc1": "oc1.api.riotgames.com",
        "kr": "kr.api.riotgames.com",
        "jp1": "jp1.api.riotgames.com",
    }

    def __init__(self):
        self.api_key = settings.riot_api_key
        if not self.api_key:
            raise ValueError("RIOT_API_KEY is not configured")
        self.headers = {"X-Riot-Token": self.api_key}
        self.cache = TTLCache(default_ttl_seconds=180, max_size=2048)

    def _normalize_region(self, region: str, platform: Optional[str] = None) -> str:
        """Normalize region to one of the regional routing values"""
        region = (region or "").lower()
        platform = (platform or "").lower()

        if region in self.REGIONAL_ROUTING:
            return region
        if platform and platform in self.PLATFORM_TO_REGION:
            return self.PLATFORM_TO_REGION[platform]
        if region in self.PLATFORM_TO_REGION:
            return self.PLATFORM_TO_REGION[region]
        return "europe"

    def _regional_base(self, region: str, platform: Optional[str] = None) -> str:
        """Get regional API base URL (for Account-v1, Match-v5 endpoints)"""
        normalized = self._normalize_region(region, platform)
        return f"https://{normalized}.api.riotgames.com"

    def _platform_base(self, platform: str) -> str:
        """Get platform API base URL (for Summoner-v4, League-v4 endpoints)"""
        key = (platform or "euw1").lower()
        host = self.PLATFORM_HOST.get(key, f"{key}.api.riotgames.com")
        return f"https://{host}"

    async def _make_request(
        self,
        url: str,
        cache_key: Optional[str] = None,
        cache_ttl: int = 300,
        client: Optional[httpx.AsyncClient] = None,
        timeout: float = 10.0,
    ) -> Dict[str, Any]:
        """Make HTTP request with caching and error handling"""
        if cache_key:
            cached = self.cache.get(cache_key)
            if cached:
                return cached

        try:
            if client:
                response = await client.get(url, headers=self.headers, timeout=timeout)
            else:
                async with httpx.AsyncClient() as session:
                    response = await session.get(url, headers=self.headers, timeout=timeout)

            if response.status_code == 200:
                data = response.json()
                if cache_key:
                    self.cache.set(cache_key, data, ttl_seconds=cache_ttl)
                return data
            elif response.status_code == 404:
                raise RiotAPIError(404, "Resource not found")
            elif response.status_code == 403:
                raise RiotAPIError(403, "Forbidden - Check API key")
            elif response.status_code == 429:
                raise RiotAPIError(429, "Rate limit exceeded")
            else:
                raise RiotAPIError(response.status_code, response.text)
        except httpx.TimeoutException:
            logger.error(f"Timeout requesting {url}")
            raise RiotAPIError(504, "Request timeout")
        except httpx.RequestError as e:
            logger.error(f"Request error for {url}: {e}")
            raise RiotAPIError(500, f"Request failed: {str(e)}")

    async def get_account_by_riot_id(
        self,
        game_name: str,
        tag_line: str,
        region: str = "europe",
    ) -> Dict[str, Any]:
        """Получить account по Riot ID"""
        regional_base = self._regional_base(region)
        endpoint = f"/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
        url = f"{regional_base}{endpoint}"

        cache_key = f"account:{region}:{game_name}:{tag_line}"
        return await self._make_request(url, cache_key, cache_ttl=600)

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
        return await self._make_request(url, cache_key, cache_ttl=600, client=client)

    async def get_summoner_by_puuid(
        self,
        puuid: str,
        platform: str = "euw1",
    ) -> Dict[str, Any]:
        """Получить summoner по PUUID"""
        platform_base = self._platform_base(platform)
        endpoint = f"/lol/summoner/v4/summoners/by-puuid/{puuid}"
        url = f"{platform_base}{endpoint}"

        cache_key = f"summoner:{platform}:{puuid}"
        return await self._make_request(url, cache_key, cache_ttl=300)

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
        return await self._make_request(url, cache_key, cache_ttl=300, client=client)

    async def get_match_history(
        self,
        puuid: str,
        region: str = "europe",
        count: int = 20,
        start: int = 0,
    ) -> list:
        """Получить match history"""
        regional_base = self._regional_base(region)
        endpoint = f"/lol/match/v5/matches/by-puuid/{puuid}/ids?start={start}&count={count}"
        url = f"{regional_base}{endpoint}"

        cache_key = f"matches:{region}:{puuid}:{start}:{count}"
        return await self._make_request(url, cache_key, cache_ttl=120)

    async def get_match_details(
        self,
        match_id: str,
        region: str = "europe",
        platform: Optional[str] = None,
        client: Optional[httpx.AsyncClient] = None,
    ) -> Dict[str, Any]:
        """Получить детали матча"""
        regional_base = self._regional_base(region, platform)
        endpoint = f"/lol/match/v5/matches/{match_id}"
        url = f"{regional_base}{endpoint}"

        cache_key = f"match:{region}:{match_id}"
        return await self._make_request(url, cache_key, cache_ttl=300, client=client, timeout=15.0)

    async def get_match_timeline(
        self,
        match_id: str,
        region: str = "europe",
        platform: Optional[str] = None,
        client: Optional[httpx.AsyncClient] = None,
    ) -> Dict[str, Any]:
        """Get match timeline."""
        regional_base = self._regional_base(region, platform)
        endpoint = f"/lol/match/v5/matches/{match_id}/timeline"
        url = f"{regional_base}{endpoint}"

        cache_key = f"timeline:{region}:{match_id}"
        return await self._make_request(url, cache_key, cache_ttl=300, client=client, timeout=15.0)

    async def get_league_entries(
        self,
        summoner_id: str,
        platform: str = "euw1",
    ) -> list:
        """Получить ранговые записи игрока"""
        platform_base = self._platform_base(platform)
        endpoint = f"/lol/league/v4/entries/by-summoner/{summoner_id}"
        url = f"{platform_base}{endpoint}"

        cache_key = f"league:{platform}:{summoner_id}"
        try:
            return await self._make_request(url, cache_key, cache_ttl=300)
        except RiotAPIError as e:
            if e.status_code == 404:
                return []
            raise

    async def get_challenger_league(
        self,
        platform: str = "euw1",
        queue: str = "RANKED_SOLO_5x5",
    ) -> Dict[str, Any]:
        """Получить список Challenger лиги по очереди"""
        platform_base = self._platform_base(platform)
        endpoint = f"/lol/league/v4/challengerleagues/by-queue/{queue}"
        url = f"{platform_base}{endpoint}"

        cache_key = f"challenger:{platform}:{queue}"
        return await self._make_request(url, cache_key, cache_ttl=60)

    async def get_grandmaster_league(
        self,
        platform: str = "euw1",
        queue: str = "RANKED_SOLO_5x5",
    ) -> Dict[str, Any]:
        """Получить список Grandmaster лиги по очереди"""
        platform_base = self._platform_base(platform)
        endpoint = f"/lol/league/v4/grandmasterleagues/by-queue/{queue}"
        url = f"{platform_base}{endpoint}"

        cache_key = f"grandmaster:{platform}:{queue}"
        return await self._make_request(url, cache_key, cache_ttl=60)

    async def get_master_league(
        self,
        platform: str = "euw1",
        queue: str = "RANKED_SOLO_5x5",
    ) -> Dict[str, Any]:
        """Получить список Master лиги по очереди"""
        platform_base = self._platform_base(platform)
        endpoint = f"/lol/league/v4/masterleagues/by-queue/{queue}"
        url = f"{platform_base}{endpoint}"

        cache_key = f"master:{platform}:{queue}"
        return await self._make_request(url, cache_key, cache_ttl=60)

    async def get_champion_mastery(
        self,
        summoner_id: str,
        platform: str = "euw1",
    ) -> list:
        """Получить мастерство чемпионов"""
        platform_base = self._platform_base(platform)
        endpoint = f"/lol/champion-mastery/v4/champion-masteries/by-summoner/{summoner_id}"
        url = f"{platform_base}{endpoint}"

        cache_key = f"mastery:{platform}:{summoner_id}"
        try:
            return await self._make_request(url, cache_key, cache_ttl=600)
        except RiotAPIError as e:
            if e.status_code == 404:
                return []
            raise
