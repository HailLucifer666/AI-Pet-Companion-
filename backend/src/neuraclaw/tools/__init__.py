from ..config import Config
from .builtin import actions, files, knowledge, shell, web
from .registry import Registry, Risk, ToolContext, ToolResult

__all__ = ["Registry", "Risk", "ToolContext", "ToolResult", "build_registry"]


def build_registry(config: Config) -> Registry:
    registry = Registry(
        max_auto_risk=Risk(config.trust.max_auto_risk),
        auto_approve=set(config.trust.auto_approve_tools),
    )
    files.register(registry)
    shell.register(registry)
    web.register(registry)
    knowledge.register(registry)
    actions.register(registry)
    return registry
