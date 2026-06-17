import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export function useGlobalShortcut() {
  useEffect(() => {
    // Check if we are running in Tauri
    if (!(window as any).__TAURI_INTERNALS__) return;

    console.log("Setting up global shortcut listener...");
    
    const unlistenPromise = listen("shortcut-pressed", async () => {
      console.log("Global shortcut triggered!");
      try {
        const imageBase64 = await invoke<string>("capture_screen");
        console.log("Successfully captured screen! Image data starts with:", imageBase64.substring(0, 50));
        // You can use this imageBase64 in an <img> tag src
      } catch (err) {
        console.error("Failed to capture screen:", err);
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);
}
