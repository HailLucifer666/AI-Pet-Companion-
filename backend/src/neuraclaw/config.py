"""Configuration: .env for secrets, config.yaml for everything else."""

import os
from functools import lru_cache
from pathlib import Path

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, Field

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "data"
MIGRATIONS_DIR = REPO_ROOT / "migrations"
SOUL_PATH = REPO_ROOT / "SOUL.md"
DB_PATH = DATA_DIR / "neuraclaw.db"
FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"


class ProviderConfig(BaseModel):
    base_url: str
    api_key_env: str = ""

    @property
    def api_key(self) -> str:
        if not self.api_key_env:
            return "ollama"  # OpenAI-compatible servers require a non-empty key
        return os.environ.get(self.api_key_env, "")


class ServerConfig(BaseModel):
    host: str = "127.0.0.1"
    port: int = 8090


class Config(BaseModel):
    providers: dict[str, ProviderConfig] = Field(default_factory=dict)
    roles: dict[str, list[str]] = Field(default_factory=dict)
    no_tools_models: list[str] = Field(default_factory=list)
    server: ServerConfig = Field(default_factory=ServerConfig)


def _config_path() -> Path:
    explicit = os.environ.get("NEURACLAW_CONFIG")
    if explicit:
        return Path(explicit)
    candidate = REPO_ROOT / "config.yaml"
    if candidate.exists():
        return candidate
    return REPO_ROOT / "config.example.yaml"


@lru_cache(maxsize=1)
def load_config() -> Config:
    load_dotenv(REPO_ROOT / ".env")
    path = _config_path()
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return Config.model_validate(raw)
