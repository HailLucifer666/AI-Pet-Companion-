"""write_env_keys: .env merge + os.environ, with security guards (no injection)."""

import os
from pathlib import Path

import pytest

from neuraclaw.config import write_env_keys


def test_creates_env_and_merges_preserving_other_lines(tmp_path: Path):
    env = tmp_path / ".env"
    env.write_text("# providers\nEXISTING_KEY=keep\n", encoding="utf-8")
    try:
        written = write_env_keys(env, {"NC_TEST_KEY": "abc123"})
        assert written == ["NC_TEST_KEY"]
        text = env.read_text(encoding="utf-8")
        assert "# providers" in text  # comments preserved
        assert "EXISTING_KEY=keep" in text  # other keys untouched
        assert "NC_TEST_KEY=abc123" in text
        assert os.environ["NC_TEST_KEY"] == "abc123"  # live, no restart
    finally:
        os.environ.pop("NC_TEST_KEY", None)


def test_updates_existing_key_in_place(tmp_path: Path):
    env = tmp_path / ".env"
    env.write_text("NC_TEST_KEY=old\n", encoding="utf-8")
    try:
        write_env_keys(env, {"NC_TEST_KEY": "new"})
        text = env.read_text(encoding="utf-8")
        assert text.count("NC_TEST_KEY=") == 1  # replaced, not appended
        assert "NC_TEST_KEY=new" in text
    finally:
        os.environ.pop("NC_TEST_KEY", None)


def test_rejects_invalid_env_name(tmp_path: Path):
    env = tmp_path / ".env"
    with pytest.raises(ValueError):
        write_env_keys(env, {"bad name": "x"})
    assert not env.exists()  # nothing written on validation failure


def test_rejects_newline_value_blocking_injection(tmp_path: Path):
    env = tmp_path / ".env"
    with pytest.raises(ValueError):
        write_env_keys(env, {"NC_TEST_KEY": "good\nINJECTED=evil"})
    assert os.environ.get("NC_TEST_KEY") is None


def test_rejects_empty_value(tmp_path: Path):
    env = tmp_path / ".env"
    with pytest.raises(ValueError):
        write_env_keys(env, {"NC_TEST_KEY": "   "})
