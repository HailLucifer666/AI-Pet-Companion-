import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Tooltip from "@radix-ui/react-tooltip";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./styles/theme.css";
import { App } from "./App";
import { Toaster } from "./components/ui";

import { audioEngine } from "./lib/audioEngine";

// If running inside Tauri, enable the transparent native shell mode
if ("__TAURI_INTERNALS__" in window || "__TAURI__" in window) {
  document.documentElement.classList.add("tauri-mode");
}

// Initialize audio context on first user interaction to satisfy autoplay policies
const initAudio = () => {
  audioEngine.init();
  window.removeEventListener("click", initAudio);
  window.removeEventListener("keydown", initAudio);
};
window.addEventListener("click", initAudio);
window.addEventListener("keydown", initAudio);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Tooltip.Provider delayDuration={300} skipDelayDuration={150}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Toaster />
      </Tooltip.Provider>
    </QueryClientProvider>
  </StrictMode>,
);
