import asyncio
import io
import logging

try:
    from faster_whisper import WhisperModel
except ImportError:
    WhisperModel = None

log = logging.getLogger(__name__)

# Singleton model instance
_model = None
_model_lock = asyncio.Lock()


async def get_model() -> "WhisperModel":
    global _model
    if WhisperModel is None:
        raise RuntimeError("faster-whisper is not installed.")
        
    if _model is None:
        async with _model_lock:
            if _model is None:
                log.info("Loading faster-whisper model (base.en) ...")
                # compute_type="int8" helps run efficiently on CPU as well
                _model = WhisperModel("base.en", device="cpu", compute_type="int8")
    return _model


async def transcribe_audio(audio_bytes: bytes) -> str:
    """Transcribes raw audio bytes (e.g. webm/ogg from browser) into text."""
    model = await get_model()
    
    # faster-whisper accepts file paths or file-like objects
    audio_file = io.BytesIO(audio_bytes)
    
    # run in thread pool since transcribe is blocking
    def _transcribe():
        segments, info = model.transcribe(audio_file, beam_size=5)
        return " ".join([segment.text for segment in segments]).strip()

    return await asyncio.to_thread(_transcribe)
