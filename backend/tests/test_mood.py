import pytest
from neuraclaw.pet.mood import derive_mood

def test_derive_mood():
    assert derive_mood(energy=100, hour=12, mins_since_work=10, xp_today=5, idle_days=0) == "radiant"
    assert derive_mood(energy=50, hour=12, mins_since_work=10, xp_today=5, idle_days=0) == "curious"
    assert derive_mood(energy=20, hour=12, mins_since_work=10, xp_today=5, idle_days=0) == "drowsy"
    assert derive_mood(energy=100, hour=23, mins_since_work=10, xp_today=5, idle_days=0) == "drowsy"
    assert derive_mood(energy=100, hour=12, mins_since_work=10, xp_today=0, idle_days=0) == "content"
    assert derive_mood(energy=100, hour=12, mins_since_work=1000, xp_today=0, idle_days=1) == "drowsy"
