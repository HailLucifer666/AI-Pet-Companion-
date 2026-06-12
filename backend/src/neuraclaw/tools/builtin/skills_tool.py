"""Progressive skill disclosure: the agent loads a skill's full body on demand."""

from pydantic import BaseModel, Field

from ...skillsys import loader
from ..registry import Registry, Risk, ToolContext, tool


class UseSkillParams(BaseModel):
    name: str = Field(description="Skill name from the skills list in your context")


def register(registry: Registry) -> None:
    @tool(
        registry,
        name="use_skill",
        description="Load the full instructions of a named skill before applying it.",
        risk=Risk.READ,
    )
    async def use_skill(params: UseSkillParams, ctx: ToolContext) -> str:
        body = await loader.load_body(ctx.db, params.name)
        if body is None:
            return f"No active skill named {params.name!r}."
        return body
