import { WORLD } from "./palette";

/** DenFallback2D — a static HTML/CSS fallback for users whose systems do not support
 *  WebGL2 (e.g., restricted virtual desktops, ancient hardware). It preserves the
 *  presence of the companion without any Canvas/GL overhead. */
export function DenFallback2D() {
  return (
    <div
      className="flex h-full w-full items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: `#${WORLD.sky.toString(16).padStart(6, '0')}` }}
    >
      {/* Abstract 2D Island Background */}
      <div 
        className="absolute bottom-[-20%] w-[150%] aspect-square rounded-[100%] opacity-80"
        style={{ backgroundColor: `#${WORLD.grass.toString(16).padStart(6, '0')}` }}
      />
      <div 
        className="absolute bottom-[-10%] w-[120%] aspect-[2/1] rounded-[100%] opacity-60"
        style={{ backgroundColor: `#${WORLD.grassHigh.toString(16).padStart(6, '0')}` }}
      />

      {/* The 2D Pet Avatar (Static CSS drawing based on Lumenform colors) */}
      <div className="relative z-10 flex flex-col items-center animate-[float_4s_ease-in-out_infinite]">
        {/* Antenna */}
        <div className="flex gap-4 mb-[-8px] z-0">
          <div className="w-1.5 h-6 bg-[#3c466e] rounded-full rotate-[-15deg] origin-bottom relative">
            <div className="absolute -top-2 -left-1 w-3.5 h-3.5 rounded-full bg-[#e2a04a] animate-pulse" />
          </div>
          <div className="w-1.5 h-6 bg-[#3c466e] rounded-full rotate-[15deg] origin-bottom relative">
            <div className="absolute -top-2 -left-1 w-3.5 h-3.5 rounded-full bg-[#e2a04a] animate-pulse" />
          </div>
        </div>
        
        {/* Head */}
        <div className="w-20 h-16 rounded-full bg-[#2b3354] border-b-4 border-[#1a1e35] flex items-center justify-center relative z-10">
          {/* Eyes / Screen-face */}
          <div className="flex gap-3">
            <div className="w-5 h-2 bg-[#7fe9ff] rounded-full shadow-[0_0_8px_#7fe9ff]" />
            <div className="w-5 h-2 bg-[#7fe9ff] rounded-full shadow-[0_0_8px_#7fe9ff]" />
          </div>
        </div>

        {/* Body */}
        <div className="w-24 h-20 rounded-[40px] bg-[#2b3354] mt-[-10px] border-b-[6px] border-[#1a1e35] flex items-center justify-center relative z-20">
           {/* Center ember core / seam */}
           <div className="w-[80%] h-1 bg-[#e2a04a] rounded-full shadow-[0_0_10px_#e2a04a] opacity-80" />
        </div>
        
        {/* Contact Shadow */}
        <div className="absolute -bottom-12 w-24 h-4 bg-black/30 rounded-full blur-[2px] animate-[shadow_4s_ease-in-out_infinite]" />
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes shadow {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(0.85); opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}
