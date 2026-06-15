"""Skill loading: SKILL.md files (agentskills.io-style) synced into the DB.

A skill is a directory containing SKILL.md with YAML frontmatter:

    ---
    name: web-summarize
    description: Summarize a web page into key points
    risk: READ
    ---
    (markdown instructions the agent loads on demand)

Active skills live in skills/<name>/, agent-proposed drafts in skills/_drafts/<name>/.
Only name+description enter the system prompt; `use_skill` loads the full body.
"""

import logging
import re
from dataclasses import dataclass
from pathlib import Path

import aiosqlite
import yaml

from ..config import REPO_ROOT

log = logging.getLogger(__name__)

SKILLS_DIR = REPO_ROOT / "skills"
DRAFTS_DIR = SKILLS_DIR / "_drafts"

_FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n?", re.DOTALL)
_NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,60}$")


@dataclass
class SkillDoc:
    name: str
    description: str
    risk: str
    body: str
    path: Path


def parse_skill_md(text: str, path: Path) -> SkillDoc | None:
    m = _FRONTMATTER_RE.match(text)
    if not m:
        return None
    try:
        meta = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        return None
    name = str(meta.get("name", "")).strip()
    if not _NAME_RE.match(name):
        return None
    return SkillDoc(
        name=name,
        description=str(meta.get("description", "")).strip()[:300],
        risk=str(meta.get("risk", "READ")).upper(),
        body=text[m.end():].strip(),
        path=path,
    )


def read_skill_dir(skill_dir: Path) -> SkillDoc | None:
    md = skill_dir / "SKILL.md"
    if not md.is_file():
        return None
    return parse_skill_md(md.read_text(encoding="utf-8"), md)


def scan_disk() -> tuple[list[SkillDoc], list[SkillDoc]]:
    """Returns (active_candidates, drafts) found on disk."""
    active, drafts = [], []
    if SKILLS_DIR.is_dir():
        for d in sorted(SKILLS_DIR.iterdir()):
            if d.is_dir() and d.name != "_drafts":
                doc = read_skill_dir(d)
                if doc:
                    active.append(doc)
    if DRAFTS_DIR.is_dir():
        for d in sorted(DRAFTS_DIR.iterdir()):
            if d.is_dir():
                doc = read_skill_dir(d)
                if doc:
                    drafts.append(doc)
    return active, drafts


async def sync_db(db: aiosqlite.Connection) -> None:
    """Reconcile disk -> DB. Disk is the source of truth for content;
    DB carries status (drafts stay drafts until approved) and provenance."""
    active, drafts = scan_disk()
    seen: set[str] = set()
    for doc, default_status in [(d, "active") for d in active] + [
        (d, "draft") for d in drafts
    ]:
        seen.add(doc.name)
        cur = await db.execute("SELECT id, status FROM skills WHERE name = ?", (doc.name,))
        row = await cur.fetchone()
        if row is None:
            await db.execute(
                "INSERT INTO skills (name, path, description, risk, status, created_by)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                (
                    doc.name,
                    str(doc.path.parent),
                    doc.description,
                    doc.risk,
                    default_status,
                    "agent" if default_status == "draft" else "user",
                ),
            )
        else:
            # Disabled stays disabled; otherwise refresh metadata/path.
            await db.execute(
                "UPDATE skills SET path = ?, description = ?, risk = ?,"
                " updated_at = datetime('now') WHERE name = ?",
                (str(doc.path.parent), doc.description, doc.risk, doc.name),
            )
    # Rows whose directory vanished are removed (their versions cascade).
    cur = await db.execute("SELECT name FROM skills")
    for row in await cur.fetchall():
        if row["name"] not in seen:
            await db.execute("DELETE FROM skills WHERE name = ?", (row["name"],))
    await db.commit()


async def active_index(db: aiosqlite.Connection) -> list[dict]:
    """name+description list for the system prompt (progressive disclosure)."""
    cur = await db.execute(
        "SELECT name, description FROM skills WHERE status = 'active' ORDER BY name"
    )
    return [dict(r) for r in await cur.fetchall()]


async def list_active(db: aiosqlite.Connection) -> list[dict]:
    """Full rows for every approved (active) skill â€” drives the world's earned
    monuments (and any skill UI). Drafts/disabled are excluded by design."""
    cur = await db.execute(
        "SELECT id, name, description, risk, status, created_at FROM skills"
        " WHERE status = 'active' ORDER BY created_at"
    )
    return [dict(r) for r in await cur.fetchall()]


async def load_body(db: aiosqlite.Connection, name: str) -> str | None:
    cur = await db.execute(
        "SELECT path FROM skills WHERE name = ? AND status = 'active'", (name,)
    )
    row = await cur.fetchone()
    if row is None:
        return None
    doc = read_skill_dir(Path(row["path"]))
    if doc is None:
        return None
    await db.execute(
        "UPDATE skills SET use_count = use_count + 1 WHERE name = ?", (name,)
    )
    await db.commit()
    return doc.body
