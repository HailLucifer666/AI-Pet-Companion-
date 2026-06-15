"""Real-world weather for the Grove's sky.

Resolves the user's city from this machine's public IP (keyless HTTPS lookup),
then fetches current conditions from Open-Meteo (keyless). Both are cached and
best-effort: any failure returns ``{"available": False}`` and the frontend falls
back to a clear sky on the real-clock day/night cycle. The pure WMO-code â†’
category mapping is unit-tested; the network fetch never raises into the request
path. We never log the IP address.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field

import httpx

log = logging.getLogger(__name__)

# Our coarse visual categories the renderer knows how to paint.
Category = str  # clear | cloudy | overcast | fog | rain | snow | storm

LOC_TTL = 3600.0  # location changes rarely â†’ cache an hour
WX_TTL = 900.0  # weather â†’ 15 minutes
FAIL_TTL = 120.0  # don't hammer the APIs while they're down
TIMEOUT = 8.0


def wmo_category(code: int) -> Category:
    """Map a WMO weather-interpretation code to a visual category.

    https://open-meteo.com/en/docs â€” codes: 0 clear; 1â€“3 cloud cover; 45/48 fog;
    51â€“67 drizzle/rain; 71â€“77 & 85/86 snow; 80â€“82 rain showers; 95â€“99 thunderstorm.
    """
    if code in (0, 1):
        return "clear"  # clear / mainly clear
    if code == 2:
        return "cloudy"  # partly cloudy
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
    return "cloudy"  # unknown â†’ safe, unobtrusive default


@dataclass
class _Cache:
    value: dict | None = None
    at: float = field(default=0.0)


_loc_cache = _Cache()
_wx_cache = _Cache()


async def _resolve_location(client: httpx.AsyncClient) -> dict | None:
    """City + coordinates for this machine's egress IP (keyless, HTTPS)."""
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
    except Exception as exc:  # network / shape / parse â€” all non-fatal
        log.debug("weather: location lookup failed: %s", exc)
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
        async with httpx.AsyncClient(timeout=TIMEOUT, headers={"User-Agent": "ai_pet_companion/3.0"}) as client:
            loc = _loc_cache.value if (_loc_cache.value and now - _loc_cache.at < LOC_TTL) else None
            if loc is None:
                loc = await _resolve_location(client)
                if loc is not None:
                    _loc_cache.value, _loc_cache.at = loc, now
            if loc is not None:
                weather = await _fetch_open_meteo(client, loc["lat"], loc["lon"])
                if weather is not None:
                    result = {"available": True, "city": loc.get("city"), **weather}
    except Exception as exc:
        log.debug("weather: fetch failed: %s", exc)

    _wx_cache.value, _wx_cache.at = result, now
    return result
