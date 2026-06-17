import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "react-router";
import { useSightStore } from "../state/useSightStore";

export function useGlobalShortcut() {
  const navigate = useNavigate();
  const setCapturedImage = useSightStore((s) => s.setCapturedImage);

  useEffect(() => {
    // Check if we are running in Tauri
    if (!(window as any).__TAURI_INTERNALS__) return;

    console.log("Setting up global shortcut listener...");
    
    const unlistenPromise = listen("shortcut-pressed", async () => {
      console.log("Global shortcut triggered!");
      try {
        const imageBase64 = await invoke<string>("capture_screen");
        setCapturedImage(imageBase64);
        navigate("/chat");
      } catch (err) {
        console.error("Failed to capture screen:", err);
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [navigate, setCapturedImage]);
}
