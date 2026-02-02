"""
Simple in-memory TTL cache.
Use for short-lived Riot API caching to reduce rate limits.
"""
import time
from typing import Any, Dict, Optional


class TTLCache:
    def __init__(self, default_ttl_seconds: int = 300, max_size: int = 1024):
        self.default_ttl_seconds = default_ttl_seconds
        self.max_size = max_size
        self._store: Dict[str, Dict[str, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if not entry:
            return None
        if entry["expires_at"] < time.time():
            self._store.pop(key, None)
            return None
        return entry["value"]

    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        if len(self._store) >= self.max_size:
            # Simple eviction: drop oldest by expiry
            oldest_key = min(self._store.items(), key=lambda item: item[1]["expires_at"])[0]
            self._store.pop(oldest_key, None)

        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl_seconds
        self._store[key] = {
            "value": value,
            "expires_at": time.time() + ttl,
        }
