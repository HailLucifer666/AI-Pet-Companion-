"""Text-tag tool fallback (clicky-style).

Models that can't emit structured ``tool_calls`` (many local Ollama tags) can
instead write a tag in their reply â€” ``[[tool_name {"arg": "value"}]]`` â€” which the
agent loop parses and dispatches. Used ONLY when no structured tool_calls were
returned, so it never double-fires on capable models.
"""

import re

# [[ name {optional json args} ]] â€” name is a tool identifier; args default to {}.
_TAG = re.compile(r"\[\[\s*([a-zA-Z_][\w]*)\s*(\{.*?\})?\s*\]\]", re.DOTALL)


def parse_tool_tags(text: str) -> list[tuple[str, str]]:
    """Return [(tool_name, args_json), ...] for each tag found (args_json '{}' if omitted)."""
    return [(m.group(1), (m.group(2) or "{}")) for m in _TAG.finditer(text or "")]


def strip_tags(text: str) -> str:
    """Remove tool tags from text (for the user-visible / persisted message)."""
    return _TAG.sub("", text or "").strip()
