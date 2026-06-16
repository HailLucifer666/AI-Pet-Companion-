"""Real-world weather for the Grove's sky.

Resolves the user's city from this machine's public IP (keyless HTTPS lookup),
then fetches current conditions from Open-Meteo (keyless). Both are cached and
best-effort: any failure returns ``{"available": False}`` and the frontend falls
back to a clear sky on the real-clock day/night cycle. The pure WMO-code →
category mapping is unit-tested; the network fetch never raises into the request
path. We never log the IP address.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field

import httpx

log = logging.getLogger(__name__)

import os

# Our coarse visual categories the renderer knows how to paint.
Category = str  # clear | cloudy | overcast | fog | rain | snow | storm

LOC_TTL = 3600.0  # location changes rarely → cache an hour
WX_TTL = 900.0  # weather → 15 minutes
FAIL_TTL = 120.0  # don't hammer the APIs while they're down
TIMEOUT = 5.0


def wmo_category(code: int) -> Category:
    """Map a WMO weather-interpretation code to a visual category."""
    if code in (0, 1):
        return "clear"
    if code == 2:
        return "cloudy"
    if code == 3:
        return "overcast"
    if code in (45, 48):
        return "fog"
    if code in (51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82):
        return "rain"
    if code in (71, 73, 75, 77, 85, 86):
        return "snow"
    if code in (95, 96, 99):
        return "storm"
    return "cloudy"

def wttr_category(desc: str) -> Category:
    desc = desc.lower()
    if "thunder" in desc or "storm" in desc:
        return "storm"
    if "snow" in desc or "ice" in desc or "blizzard" in desc or "pellet" in desc:
        return "snow"
    if "rain" in desc or "drizzle" in desc or "shower" in desc:
        return "rain"
    if "mist" in desc or "fog" in desc or "haze" in desc:
        return "fog"
    if "overcast" in desc:
        return "overcast"
    if "cloudy" in desc:
        return "cloudy"
    if "clear" in desc or "sunny" in desc:
        return "clear"
    return "cloudy"

@dataclass
class _Cache:
    value: dict | None = None
    at: float = field(default=0.0)

_loc_cache = _Cache()
_wx_cache = _Cache()

async def _resolve_location(client: httpx.AsyncClient) -> dict | None:
    try:
        resp = await client.get("https://ipwho.is/")
        data = resp.json()
        if data.get("success") is False:
            return None
        return {
            "lat": float(data["latitude"]),
            "lon": float(data["longitude"]),
            "city": data.get("city"),
        }
    except Exception as exc:
        log.debug("weather: location lookup failed: %s", exc)
        return None

async def _fetch_wttr_in(client: httpx.AsyncClient, lat: float, lon: float) -> dict | None:
    try:
        resp = await client.get(f"https://wttr.in/{lat},{lon}?format=j1")
        resp.raise_for_status()
        data = resp.json()["current_condition"][0]
        desc = data["weatherDesc"][0]["value"]
        
        # Determine day/night from time
        # Very rough fallback since wttr.in doesn't provide explicit is_day in current_condition
        # We can just assume 1 (frontend will adjust lighting based on local clock anyway)
        return {
            "category": wttr_category(desc),
            "cloud_cover": int(data.get("cloudcover", 0)),
            "is_day": True,
            "temp_c": float(data.get("temp_C", 0.0)),
        }
    except Exception as exc:
        log.debug("weather: wttr.in fetch failed: %s", exc)
        return None

async def _fetch_open_meteo(client: httpx.AsyncClient, lat: float, lon: float) -> dict | None:
    try:
        resp = await client.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "weather_code,cloud_cover,is_day,temperature_2m",
            },
        )
        current = resp.json()["current"]
        return {
            "category": wmo_category(int(current["weather_code"])),
            "cloud_cover": int(current.get("cloud_cover", 0)),
            "is_day": bool(current.get("is_day", 1)),
            "temp_c": round(float(current.get("temperature_2m", 0.0)), 1),
        }
    except Exception as exc:
        log.debug("weather: open-meteo fetch failed: %s", exc)
        return None

async def fetch_weather() -> dict:
    """Current weather for the Grove. Cached + best-effort; never raises."""
    now = time.monotonic()
    cached = _wx_cache.value
    ttl = WX_TTL if (cached and cached.get("available")) else FAIL_TTL
    if cached is not None and now - _wx_cache.at < ttl:
        return cached

    result: dict = {"available": False}
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, headers={"User-Agent": "NeuraClaw/3.0"}) as client:
            loc = _loc_cache.value if (_loc_cache.value and now - _loc_cache.at < LOC_TTL) else None
            if loc is None:
                loc = await _resolve_location(client)
                if loc is not None:
                    _loc_cache.value, _loc_cache.at = loc, now
            if loc is not None:
                # Try wttr.in first (more accurate text descriptors)
                weather = await _fetch_wttr_in(client, loc["lat"], loc["lon"])
                
                # Fallback to open-meteo if wttr.in fails or rate limits
                if weather is None:
                    weather = await _fetch_open_meteo(client, loc["lat"], loc["lon"])
                    
                if weather is not None:
                    result = {"available": True, "city": loc.get("city"), **weather}
    except Exception as exc:
        log.debug("weather: fetch failed: %s", exc)

    _wx_cache.value, _wx_cache.at = result, now
    return result
