"""
Data Dragon helpers for resolving IDs to names and icons.
"""
from typing import Any, Dict, List, Optional
import httpx

from app.services.cache import TTLCache


DDRAGON_BASE = "https://ddragon.leagueoflegends.com"
DEFAULT_LOCALE = "en_US"


class DDragonService:
    def __init__(self) -> None:
        self.cache = TTLCache(default_ttl_seconds=3600, max_size=128)

    async def get_latest_version(self) -> str:
        cached = self.cache.get("ddragon:version")
        if cached:
            return cached

        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{DDRAGON_BASE}/api/versions.json", timeout=10.0)
            resp.raise_for_status()
            versions = resp.json()
            version = versions[0]
            self.cache.set("ddragon:version", version, ttl_seconds=21600)
            return version

    async def _get_json(self, path: str, cache_key: str, ttl: int = 21600) -> Any:
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        async with httpx.AsyncClient() as client:
            resp = await client.get(path, timeout=10.0)
            resp.raise_for_status()
            data = resp.json()
            self.cache.set(cache_key, data, ttl_seconds=ttl)
            return data

    async def get_items(self, version: str) -> Dict[int, Dict[str, str]]:
        url = f"{DDRAGON_BASE}/cdn/{version}/data/{DEFAULT_LOCALE}/item.json"
        data = await self._get_json(url, f"ddragon:items:{version}")
        items = {}
        for item_id, item in data.get("data", {}).items():
            items[int(item_id)] = {
                "id": int(item_id),
                "name": item.get("name"),
                "icon": f"{DDRAGON_BASE}/cdn/{version}/img/item/{item.get('image', {}).get('full')}",
            }
        return items

    async def get_spells(self, version: str) -> Dict[int, Dict[str, str]]:
        url = f"{DDRAGON_BASE}/cdn/{version}/data/{DEFAULT_LOCALE}/summoner.json"
        data = await self._get_json(url, f"ddragon:spells:{version}")
        spells = {}
        for spell in data.get("data", {}).values():
            spell_id = int(spell.get("key"))
            spells[spell_id] = {
                "id": spell_id,
                "name": spell.get("name"),
                "icon": f"{DDRAGON_BASE}/cdn/{version}/img/spell/{spell.get('image', {}).get('full')}",
            }
        return spells

    async def get_champions(self, version: str) -> Dict[str, Dict[str, str]]:
        url = f"{DDRAGON_BASE}/cdn/{version}/data/{DEFAULT_LOCALE}/champion.json"
        data = await self._get_json(url, f"ddragon:champions:{version}")
        champs = {}
        for champ in data.get("data", {}).values():
            champ_key = champ.get("id")
            champs[champ_key] = {
                "id": champ_key,
                "name": champ.get("name"),
                "icon": f"{DDRAGON_BASE}/cdn/{version}/img/champion/{champ.get('image', {}).get('full')}",
            }
        return champs

    async def get_runes(self, version: str) -> Dict[str, Dict[int, Dict[str, str]]]:
        url = f"{DDRAGON_BASE}/cdn/{version}/data/{DEFAULT_LOCALE}/runesReforged.json"
        data = await self._get_json(url, f"ddragon:runes:{version}")
        perk_map: Dict[int, Dict[str, str]] = {}
        style_map: Dict[int, Dict[str, str]] = {}

        for style in data:
            style_id = style.get("id")
            style_map[style_id] = {
                "id": style_id,
                "name": style.get("name"),
                "icon": f"{DDRAGON_BASE}/cdn/img/{style.get('icon')}",
            }
            for slot in style.get("slots", []):
                for rune in slot.get("runes", []):
                    perk_id = rune.get("id")
                    perk_map[perk_id] = {
                        "id": perk_id,
                        "name": rune.get("name"),
                        "icon": f"{DDRAGON_BASE}/cdn/img/{rune.get('icon')}",
                    }

        return {"perks": perk_map, "styles": style_map}

    async def enrich_recent_matches(self, matches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not matches:
            return matches

        version = await self.get_latest_version()
        items = await self.get_items(version)
        spells = await self.get_spells(version)
        champions = await self.get_champions(version)
        runes = await self.get_runes(version)

        for match in matches:
            match["champion_detail"] = champions.get(match.get("champion"), None)

            match["items_detail"] = [
                items.get(item_id)
                for item_id in match.get("items", [])
                if item_id and item_id in items
            ]
            match["spells_detail"] = [
                spells.get(spell_id)
                for spell_id in match.get("spells", [])
                if spell_id and spell_id in spells
            ]

            runes_payload = match.get("runes") or {}
            perk_ids = runes_payload.get("perk_ids") or []
            match["runes_detail"] = {
                "primary_style": runes.get("styles", {}).get(runes_payload.get("primary_style_id")),
                "sub_style": runes.get("styles", {}).get(runes_payload.get("sub_style_id")),
                "keystone": runes.get("perks", {}).get(runes_payload.get("keystone_id")),
                "perks": [
                    runes.get("perks", {}).get(perk_id)
                    for perk_id in perk_ids
                    if perk_id in runes.get("perks", {})
                ],
            }

        return matches


ddragon = DDragonService()
