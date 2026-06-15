"""Core agent package.

Submodules (agent, context, synapse) are imported explicitly by their callers,
NOT eagerly here. Importing ``core.synapse`` from memory/skillsys must not drag
in ``core.agent`` (which imports ``tools``), or it forms a startup import cycle:

    tools -> builtin.knowledge -> memory.store -> core.synapse
          -> core/__init__ -> core.agent -> tools  (partially initialized)

Keeping this module side-effect-free breaks that cycle. ``from ai_pet_companion.core
import agent`` still works (Python imports the submodule on demand).
"""
