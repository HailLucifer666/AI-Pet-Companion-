/** useScreenCapture â€” grab ONE frame of a screen/window the user picks, as a
 *  JPEG data-URL, so the companion can "look at" it. Browser-only (getDisplayMedia),
 *  feature-detected. The capture sheet is the OS's own picker (explicit consent),
 *  the call must run inside a user gesture, and the share track is stopped the
 *  instant the frame is grabbed — nothing keeps recording. Privacy beyond this
 *  (does the frame leave the device?) depends on the vision model: see GET /api/vision.
 *
 *  Cannot be exercised headlessly (needs a real picker + gesture) — verify live. */

import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

const MAX_W = 1600; // downscale wide screens — smaller payload, plenty for vision
const JPEG_QUALITY = 0.85;

const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
const supported =
  isTauri || (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === "function"
  );

export interface ScreenCapture {
  supported: boolean;
  capturing: boolean;
  /** Returns a JPEG data-URL of one captured frame, or null if cancelled/failed. */
  captureFrame: () => Promise<string | null>;
}

export function useScreenCapture(): ScreenCapture {
  const [capturing, setCapturing] = useState(false);

  const captureFrame = useCallback(async (): Promise<string | null> => {
    if (!supported) return null;
    setCapturing(true);

    if (isTauri) {
      try {
        const base64Str = await invoke<string>("capture_screen");
        setCapturing(false);
        return base64Str;
      } catch (e) {
        console.error("Tauri screen capture failed", e);
        setCapturing(false);
        return null;
      }
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      // Let one frame paint before we read it.
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;
      const scale = vw > MAX_W ? MAX_W / vw : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(vw * scale);
      canvas.height = Math.round(vh * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      video.pause();
      return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    } catch {
      return null; // user cancelled the picker, or capture isn't permitted
    } finally {
      stream?.getTracks().forEach((t) => t.stop()); // stop sharing immediately
      setCapturing(false);
    }
  }, []);

  return { supported, capturing, captureFrame };
}
