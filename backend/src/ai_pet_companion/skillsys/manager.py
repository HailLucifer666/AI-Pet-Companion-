"""Skill lifecycle: approve drafts, disable/enable, edit with version snapshots."""

import logging
import shutil
from pathlib import Path

import aiosqlite

from ..core.synapse import synapse
from .loader import DRAFTS_DIR, SKILLS_DIR, parse_skill_md

log = logging.getLogger(__name__)


async def _snapshot(db: aiosqlite.Connection, skill_id: int, reason: str) -> None:
    cur = await db.execute("SELECT path, version FROM skills WHERE id = ?", (skill_id,))
    row = await cur.fetchone()
    if row is None:
        return
    md = Path(row["path"]) / "SKILL.md"
    if md.is_file():
        await db.execute(
            "INSERT INTO skill_versions (skill_id, version, snapshot_md, change_reason)"
            " VALUES (?, ?, ?, ?)",
            (skill_id, row["version"], md.read_text(encoding="utf-8"), reason),
        )


async def approve_draft(db: aiosqlite.Connection, skill_id: int) -> bool:
    """Move a draft dir into skills/ and activate it."""
    cur = await db.execute(
        "SELECT name, path, status FROM skills WHERE id = ?", (skill_id,)
    )
    row = await cur.fetchone()
    if row is None or row["status"] != "draft":
        return False
    src = Path(row["path"])
    dest = SKILLS_DIR / row["name"]
    if src.resolve() != dest.resolve():
        if dest.exists():
            log.warning("approve: destination %s already exists", dest)
            return False
        shutil.move(str(src), str(dest))
    await db.execute(
        "UPDATE skills SET status = 'active', path = ?, updated_at = datetime('now')"
        " WHERE id = ?",
        (str(dest), skill_id),
    )
    await _snapshot(db, skill_id, "approved draft")
    await db.commit()
    synapse.publish("skill.approved", name=row["name"])  # the world raises a monument
    return True


async def set_status(db: aiosqlite.Connection, skill_id: int, status: str) -> bool:
    if status not in ("active", "disabled"):
        return False
    cur = await db.execute(
        "UPDATE skills SET status = ?, updated_at = datetime('now')"
        " WHERE id = ? AND status != 'draft'",
        (status, skill_id),
    )
    await db.commit()
    return cur.rowcount > 0


async def update_content(db: aiosqlite.Connection, skill_id: int, content_md: str) -> bool:
    """User edits SKILL.md from the UI; bump version, keep snapshot of the old one."""
    cur = await db.execute("SELECT path FROM skills WHERE id = ?", (skill_id,))
    row = await cur.fetchone()
    if row is None:
        return False
    md_path = Path(row["path"]) / "SKILL.md"
    new_doc = parse_skill_md(content_md, md_path)
    if new_doc is None:
        return False  # invalid frontmatter â€” refuse rather than break the skill
    await _snapshot(db, skill_id, "pre-edit snapshot")
    md_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.write_text(content_md, encoding="utf-8")
    await db.execute(
        "UPDATE skills SET version = version + 1, description = ?, risk = ?,"
        " updated_at = datetime('now') WHERE id = ?",
        (new_doc.description, new_doc.risk, skill_id),
    )
    await db.commit()
    return True


async def delete_skill(db: aiosqlite.Connection, skill_id: int) -> bool:
    cur = await db.execute("SELECT name, path, status FROM skills WHERE id = ?", (skill_id,))
    row = await cur.fetchone()
    if row is None:
        return False
    path = Path(row["path"])
    # Path guard: only delete dirs inside skills/ or skills/_drafts/.
    root = SKILLS_DIR.resolve()
    target = path.resolve()
    if root != target and root in target.parents and target.is_dir():
        shutil.rmtree(target, ignore_errors=True)
    await db.execute("DELETE FROM skills WHERE id = ?", (skill_id,))
    await db.commit()
    return True


def write_draft(name: str, content_md: str) -> Path:
    """Reflector output lands here; never overwrites an existing draft."""
    DRAFTS_DIR.mkdir(parents=True, exist_ok=True)
    dest = DRAFTS_DIR / name
    if dest.exists():
        raise FileExistsError(name)
    dest.mkdir()
    (dest / "SKILL.md").write_text(content_md, encoding="utf-8")
    return dest
