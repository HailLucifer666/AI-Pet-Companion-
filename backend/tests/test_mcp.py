"""Tests for the MCP client integration."""

import pytest
from pydantic import BaseModel
from neuraclaw.core.mcp_client import _make_params_model


def test_make_params_model():
    """Verify that the dynamic model correctly reports the provided schema."""
    schema = {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "SQL query to execute"}
        },
        "required": ["query"],
    }
    
    DynamicModel = _make_params_model(schema, "sql_query")
    
    assert issubclass(DynamicModel, BaseModel)
    assert DynamicModel.__name__ == "Sql_QueryParams"
    
    # model_json_schema() should return our exact injected schema
    assert DynamicModel.model_json_schema() == schema
    
    # It should also parse valid arbitrary dicts since extra="allow"
    instance = DynamicModel.model_validate_json('{"query": "SELECT * FROM users", "other": 123}')
    assert instance.model_dump() == {"query": "SELECT * FROM users", "other": 123}
