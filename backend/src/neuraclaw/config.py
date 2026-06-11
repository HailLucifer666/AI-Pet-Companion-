"""Configuration: .env for secrets, config.yaml for everything else."""

import os
from functools import lru_cache
from pathlib import Path

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, Field

REPO_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = REPO_ROOT / "data"
WORKSPACE_DIR = DATA_DIR / "workspace"
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


class TrustConfig(BaseModel):
    # Highest risk tier dispatched without approval:
    # 0=READ, 1=WRITE (workspace-scoped), 2=EXECUTE, 3=NETWORK_SENSITIVE.
    max_auto_risk: int = Field(default=1, ge=0, le=3)


class AgentConfig(BaseModel):
    max_steps: int = Field(default=20, ge=1, le=100)
    history_messages: int = Field(default=40, ge=4, le=500)
    extract_memories: bool = True


class Config(BaseModel):
    providers: dict[str, ProviderConfig] = Field(default_factory=dict)
    roles: dict[str, list[str]] = Field(default_factory=dict)
    no_tools_models: list[str] = Field(default_factory=list)
    server: ServerConfig = Field(default_factory=ServerConfig)
    trust: TrustConfig = Field(default_factory=TrustConfig)
    agent: AgentConfig = Field(default_factory=AgentConfig)


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
