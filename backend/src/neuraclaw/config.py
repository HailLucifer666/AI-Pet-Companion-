"""Configuration: .env for secrets, config.yaml for everything else."""

import os
import re
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


class PetConfig(BaseModel):
    # Charm never blocks work: flip true to unlock every stage-gated capability now.
    ignore_ladder: bool = False


class Config(BaseModel):
    providers: dict[str, ProviderConfig] = Field(default_factory=dict)
    roles: dict[str, list[str]] = Field(default_factory=dict)
    no_tools_models: list[str] = Field(default_factory=list)
    server: ServerConfig = Field(default_factory=ServerConfig)
    trust: TrustConfig = Field(default_factory=TrustConfig)
    agent: AgentConfig = Field(default_factory=AgentConfig)
    pet: PetConfig = Field(default_factory=PetConfig)


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


ENV_KEY_RE = re.compile(r"^[A-Z][A-Z0-9_]*$")


def write_env_keys(env_path: Path, keys: dict[str, str]) -> list[str]:
    """Merge secret keys into the .env file and live ``os.environ`` — no restart.

    Security: values are never logged or returned. Key names are validated to
    block .env injection, and a value may not span lines (no smuggling extra
    assignments). Existing lines and comments are preserved. Returns the list of
    env-var *names* written (names are not secret; values never leave here).
    """
    for name, raw in keys.items():
        if not ENV_KEY_RE.match(name):
            raise ValueError(f"invalid env var name: {name!r}")
        if "\n" in raw or "\r" in raw:
            raise ValueError("env value must not span multiple lines")
        if not raw.strip():
            raise ValueError("env value must not be empty")

    lines = env_path.read_text(encoding="utf-8").splitlines() if env_path.exists() else []
    written: list[str] = []
    for name, raw in keys.items():
        value = raw.strip()
        assignment = f"{name}={value}"
        for i, line in enumerate(lines):
            if not line.lstrip().startswith("#") and line.split("=", 1)[0].strip() == name:
                lines[i] = assignment
                break
        else:
            lines.append(assignment)
        os.environ[name] = value  # live for this process (brain re-detect, providers)
        written.append(name)

    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    try:
        os.chmod(env_path, 0o600)  # best-effort; benign no-op on Windows
    except OSError:
        pass
    return written
