"""OS media-transport keys â€” pause/resume/next/previous for the system media session.

The Spotify desktop app (and most players) obey these global keys, so this gives
playback control with no API, no Premium and no login. Windows for now; other
platforms raise a clear message. Module-level so tests can monkeypatch it.
"""

import sys

# Windows virtual-key codes for media transport keys.
_VK = {"playpause": 0xB3, "next": 0xB0, "previous": 0xB1, "stop": 0xB2}


def send_media_key(action: str) -> None:
    """Fire a global media key. action: playpause | next | previous | stop."""
    vk = _VK.get(action)
    if vk is None:
        raise ValueError(f"unknown media action {action!r}")
    if sys.platform != "win32":
        raise RuntimeError("media-key control is only wired for Windows right now")
    import ctypes

    keyup = 0x0002
    user32 = ctypes.windll.user32  # type: ignore[attr-defined]
    user32.keybd_event(vk, 0, 0, 0)  # key down
    user32.keybd_event(vk, 0, keyup, 0)  # key up
