import { motion, useReducedMotion } from "motion/react";
import type { CreatureState, CreatureReaction } from "../../state/creatureStore";

interface CreatureProps {
  stage?: 1 | 2 | 3 | 4;
  state: CreatureState;
  reaction?: CreatureReaction | null;
  size?: number;
}

export function Creature({ stage = 1, state, reaction, size = 40 }: CreatureProps) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return <StaticCreature stage={stage} state={state} size={size} />;
  }

  // Paths for stages
  const bodyPath = stage === 4 
    ? "M-20,-20 C-30,0 -30,20 -10,30 C10,40 30,20 20,-10 C10,-40 -10,-40 -20,-20 Z" 
    : "M-15,-15 C-25,0 -25,15 -5,25 C15,35 25,15 15,-5 C5,-25 -5,-25 -15,-15 Z";

  const auraOpacity = {
    sleeping: 0,
    idle: 0,
    curious: 0.2,
    thinking: 0.4,
    working: 1,
    learning: 0.6,
    celebrating: 0.8,
  }[state] || 0;

  const earsVariant = {
    sleeping: { rotate: -20, y: 5 },
    idle: { rotate: 0, y: 0 },
    thinking: { rotate: 20, y: -2 },
    working: { rotate: 10, y: 0 },
    learning: { rotate: 30, y: -5 },
    celebrating: { rotate: 15, y: -10 },
  };

  const eyesVariant = {
    sleeping: { scaleY: 0.1 },
    idle: { scaleY: 1 },
    thinking: { scaleY: 0.8 },
    working: { scaleY: 1.2 },
    learning: { scaleY: 1 },
    celebrating: { scaleY: 1.5 },
  };

  const tailVariant = {
    sleeping: { rotate: -40 },
    idle: { rotate: 0 },
    thinking: { rotate: 10 },
    working: { rotate: [0, -20, 20, 0], transition: { repeat: Infinity, duration: 0.5 } },
    learning: { rotate: 40 },
    celebrating: { rotate: [0, 45, -45, 0], transition: { repeat: Infinity, duration: 0.8 } },
  };

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="-50 -50 100 100"
      xmlns="http://www.w3.org/2000/svg"
      key={reaction?.seq}
    >
      <g data-layer="aura" opacity={auraOpacity} style={{ transition: "opacity 0.3s" }}>
        <circle cx="0" cy="0" r="45" fill="var(--color-claw-500)" opacity="0.3" filter="blur(2px)" />
      </g>
      
      <motion.g data-layer="tail" animate={tailVariant[state as keyof typeof tailVariant] || "idle"}>
        <path d="M15,20 C25,30 35,20 30,0" stroke="var(--color-claw-500)" strokeWidth="8" fill="none" strokeLinecap="round" />
      </motion.g>

      <g data-layer="body">
        <path d={bodyPath} fill="var(--color-claw-500)" />
      </g>

      <motion.g data-layer="ears" animate={earsVariant[state as keyof typeof earsVariant] || "idle"}>
        <path d="M-10,-15 L-20,-30 L-5,-20 Z" fill="var(--color-claw-500)" />
        <path d="M5,-20 L20,-30 L10,-15 Z" fill="var(--color-claw-500)" />
      </motion.g>

      <motion.g data-layer="eyes" animate={eyesVariant[state as keyof typeof eyesVariant] || "idle"}>
        <circle cx="-8" cy="-5" r="3" fill="#fff" />
        <circle cx="8" cy="-5" r="3" fill="#fff" />
      </motion.g>
    </motion.svg>
  );
}

function StaticCreature({ stage, state, size }: Omit<CreatureProps, "reaction">) {
  const bodyPath = stage === 4 
    ? "M-20,-20 C-30,0 -30,20 -10,30 C10,40 30,20 20,-10 C10,-40 -10,-40 -20,-20 Z" 
    : "M-15,-15 C-25,0 -25,15 -5,25 C15,35 25,15 15,-5 C5,-25 -5,-25 -15,-15 Z";

  const isSleeping = state === "sleeping";
  const eyeColor = isSleeping ? "transparent" : "#fff";
  
  const auraOpacity = {
    sleeping: 0,
    idle: 0,
    curious: 0.2,
    thinking: 0.4,
    working: 1,
    learning: 0.6,
    celebrating: 0.8,
  }[state] || 0;

  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg">
      <g data-layer="aura" opacity={auraOpacity}>
        <circle cx="0" cy="0" r="45" fill="var(--color-claw-500)" opacity="0.3" />
      </g>
      <g data-layer="body">
        <path d={bodyPath} fill="var(--color-claw-500)" />
      </g>
      <g data-layer="eyes">
        <circle cx="-8" cy="-5" r="3" fill={eyeColor} />
        <circle cx="8" cy="-5" r="3" fill={eyeColor} />
      </g>
    </svg>
  );
}
