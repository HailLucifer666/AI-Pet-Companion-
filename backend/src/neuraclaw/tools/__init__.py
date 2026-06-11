from ..config import Config
from .builtin import files, knowledge, shell, web
from .registry import Registry, Risk, ToolContext, ToolResult

__all__ = ["Registry", "Risk", "ToolContext", "ToolResult", "build_registry"]


def build_registry(config: Config) -> Registry:
    registry = Registry(max_auto_risk=Risk(config.trust.max_auto_risk))
    files.register(registry)
    shell.register(registry)
    web.register(registry)
    knowledge.register(registry)
    return registry
