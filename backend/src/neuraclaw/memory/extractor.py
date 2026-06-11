"""Post-turn memory extraction: cheap-model pass over the latest exchange."""

import json
import logging

import aiosqlite
from pydantic import BaseModel, Field, ValidationError

from ..providers import ProviderError, Router
from . import store

log = logging.getLogger(__name__)

MIN_CONFIDENCE = 0.6

EXTRACTION_PROMPT = """\
You extract durable personal facts from a conversation exchange.

Return a JSON array (possibly empty). Each item:
{"type": "identity|preference|project|event|fact", "content": "...", "confidence": 0.0-1.0}

Rules:
- Only durable facts worth remembering across sessions (who the user is, what they
  prefer, projects they work on, dated events, hard facts they stated).
- NOT conversational ephemera, pleasantries, or things true only right now.
- content: one self-contained sentence, third person ("User prefers ...").
- Return ONLY the JSON array, no prose.

Exchange:
{exchange}
"""


class Candidate(BaseModel):
    type: str
    content: str = Field(min_length=4, max_length=500)
    confidence: float = Field(ge=0.0, le=1.0)


async def extract_from_exchange(
    db: aiosqlite.Connection,
    router: Router,
    *,
    session_id: str,
    user_text: str,
    assistant_text: str,
    role: str = "cheap",
) -> int:
    """Extract and store memories from one exchange. Returns count stored."""
    exchange = f"User: {user_text}\nAssistant: {assistant_text}"
    prompt = EXTRACTION_PROMPT.replace("{exchange}", exchange[:6000])
    try:
        resp = await router.chat(role, [{"role": "user", "content": prompt}])
    except ProviderError as e:
        log.warning("memory extraction skipped, provider failed: %s", e)
        return 0

    candidates = _parse_candidates(resp.text)
    stored = 0
    for c in candidates:
        if c.confidence < MIN_CONFIDENCE or c.type not in store.MEMORY_TYPES:
            continue
        if not _plausible(c.content):
            continue
        memory_id = await store.add_memory(
            db,
            type=c.type,
            content=c.content,
            confidence=c.confidence,
            source_session_id=session_id,
        )
        if memory_id is not None:
            stored += 1
    if stored:
        log.info("extracted %d memories from session %s", stored, session_id)
    return stored


def _plausible(content: str) -> bool:
    """Reject small-model garbage: must be a third-person sentence, not a fragment."""
    words = content.split()
    return len(words) >= 4 and words[0].lower() in ("user", "the", "user's")


def _parse_candidates(text: str) -> list[Candidate]:
    """Tolerant parse: find the first JSON array in the model output."""
    start, end = text.find("["), text.rfind("]")
    if start == -1 or end <= start:
        return []
    try:
        raw = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return []
    if not isinstance(raw, list):
        return []
    out = []
    for item in raw:
        try:
            out.append(Candidate.model_validate(item))
        except ValidationError:
            continue
    return out
