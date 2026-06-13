"""WMO weather-code → visual category mapping (pure, no network)."""

import pytest

from neuraclaw.weather import wmo_category


@pytest.mark.parametrize(
    "code,expected",
    [
        (0, "clear"),
        (1, "clear"),
        (2, "cloudy"),
        (3, "overcast"),
        (45, "fog"),
        (48, "fog"),
        (51, "rain"),
        (61, "rain"),
        (65, "rain"),
        (80, "rain"),
        (82, "rain"),
        (71, "snow"),
        (75, "snow"),
        (86, "snow"),
        (95, "storm"),
        (96, "storm"),
        (99, "storm"),
        (12345, "cloudy"),  # unknown → safe default
    ],
)
def test_wmo_category(code: int, expected: str) -> None:
    assert wmo_category(code) == expected
