"""Web tools: fetch a URL as readable text, search via DuckDuckGo."""

import asyncio
import re

import httpx
from pydantic import BaseModel, Field

from ..registry import Registry, Risk, ToolContext, tool, truncate

FETCH_TIMEOUT = 20
MAX_RESULTS = 8

_TAG_STRIP = re.compile(r"<(script|style|noscript)[^>]*>.*?</\1>", re.DOTALL | re.IGNORECASE)
_TAGS = re.compile(r"<[^>]+>")
_WS = re.compile(r"\n{3,}")


def html_to_text(html: str) -> str:
    text = _TAG_STRIP.sub(" ", html)
    text = re.sub(r"<(br|/p|/div|/h[1-6]|/li|/tr)[^>]*>", "\n", text, flags=re.IGNORECASE)
    text = _TAGS.sub(" ", text)
    text = re.sub(r"[ \t]+", " ", text)
    return _WS.sub("\n\n", text).strip()


class WebFetchParams(BaseModel):
    url: str = Field(description="HTTP(S) URL to fetch")


class WebSearchParams(BaseModel):
    query: str = Field(min_length=2)


def register(registry: Registry) -> None:
    @tool(
        registry,
        name="web_fetch",
        description="Fetch a URL and return its readable text content.",
        risk=Risk.READ,
    )
    async def web_fetch(params: WebFetchParams, ctx: ToolContext) -> str:
        if not params.url.startswith(("http://", "https://")):
            return "Only http(s) URLs are supported."
        async with httpx.AsyncClient(
            follow_redirects=True, timeout=FETCH_TIMEOUT,
            headers={"User-Agent": "NeuraClaw/3.0"},
        ) as client:
            resp = await client.get(params.url)
        content_type = resp.headers.get("content-type", "")
        body = resp.text
        if "html" in content_type:
            body = html_to_text(body)
        return truncate(f"[{resp.status_code}] {params.url}\n\n{body}")

    @tool(
        registry,
        name="web_search",
        description="Search the web (DuckDuckGo). Returns titles, URLs and snippets.",
        risk=Risk.READ,
    )
    async def web_search(params: WebSearchParams, ctx: ToolContext) -> str:
        def run() -> list[dict]:
            from ddgs import DDGS  # lazy: optional heavy import

            with DDGS() as ddgs:
                return list(ddgs.text(params.query, max_results=MAX_RESULTS))

        try:
            results = await asyncio.to_thread(run)
        except Exception as e:
            return f"Search failed: {e}"
        if not results:
            return "No results."
        lines = [
            f"- {r.get('title', '')}\n  {r.get('href', '')}\n  {r.get('body', '')[:200]}"
            for r in results
        ]
        return "\n".join(lines)
