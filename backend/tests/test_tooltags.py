"""Text-tag tool fallback parser."""

from neuraclaw.core.tooltags import parse_tool_tags, strip_tags


def test_parse_single_with_args():
    assert parse_tool_tags('ok [[play_music {"query": "calm down"}]]') == [
        ("play_music", '{"query": "calm down"}')
    ]


def test_parse_no_args_defaults_to_empty_object():
    assert parse_tool_tags("[[list_dir]]") == [("list_dir", "{}")]


def test_parse_multiple_tags():
    assert parse_tool_tags('[[a {"x":1}]] then [[b]]') == [("a", '{"x":1}'), ("b", "{}")]


def test_parse_returns_empty_for_plain_text():
    assert parse_tool_tags("just a normal reply") == []
    assert parse_tool_tags("") == []


def test_strip_tags_removes_them():
    assert strip_tags('Playing now [[play_music {"query":"x"}]]') == "Playing now"
    assert strip_tags("[[list_dir]]") == ""
    assert strip_tags("no tags here") == "no tags here"
