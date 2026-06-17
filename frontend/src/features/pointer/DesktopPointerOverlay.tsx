import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { motion, AnimatePresence } from "motion/react";
import { MousePointer2 } from "lucide-react";

export interface PointPayload {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  label: string;
}

export function DesktopPointerOverlay() {
  const [point, setPoint] = useState<PointPayload | null>(null);

  useEffect(() => {
    // This window MUST remain click-through so it never steals focus
    // from the user's underlying real desktop apps.
    const setup = async () => {
      try {
        const win = getCurrentWindow();
        await win.setIgnoreCursorEvents(true);
        await win.show();
      } catch (e) {
        console.warn("Could not set ignore cursor events or show window:", e);
      }
    };
    setup();

    let timeout: ReturnType<typeof setTimeout>;
    
    const unlisten = listen<PointPayload>("draw-pointer", (event) => {
      console.log("Overlay received point:", event.payload);
      setPoint(event.payload);
      
      // Auto-hide the pointer after 5 seconds
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setPoint(null);
      }, 5000);
    });

    return () => {
      unlisten.then((fn) => fn());
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden pointer-events-none">
      <AnimatePresence>
        {point && (
          <motion.div
            key="pointer-cursor"
            initial={{ opacity: 0, scale: 0.5, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute flex items-center justify-center pointer-events-none z-[9999]"
            style={{ 
              left: `${point.x}%`, 
              top: `${point.y}%`,
            }}
          >
            {/* The Pointer Cursor Container (centered on the tip) */}
            <div className="relative -translate-x-[20%] -translate-y-[10%]">
              {/* Radar pulse effect behind cursor */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0.8 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                className="absolute top-2 left-2 w-6 h-6 bg-claw-500 rounded-full z-0"
              />
              
              <motion.div
                animate={{ y: [0, -6, 0], rotate: [-10, 0, -10] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                className="relative z-10 drop-shadow-2xl text-claw-400"
              >
                <MousePointer2 className="w-16 h-16 fill-claw-600/30" strokeWidth={1.5} />
              </motion.div>
              
              {/* Label */}
              {point.label && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-4 px-3.5 py-2 bg-ink-950/95 border border-claw-500/40 text-claw-100 text-[15px] font-medium rounded-card whitespace-nowrap shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-md"
                >
                  {point.label}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
