/** DenGreeting â€” when you enter the Den, the companion greets you in its 3-D
 *  speech bubble with a line built from the REAL Den digest (memories held, skills
 *  learned, XP earned today) + the real local hour. Fires once per visit, after a
 *  short settle, then clears â€” but never stomps a chat reply you've started (it
 *  only clears the bubble if it's still showing the greeting). Renders nothing
 *  itself; it drives worldStore.speech â†’ PetBubble. DOM-side (react-query lives
 *  outside the Canvas). */

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, queryKeys, type XpEvent } from "../../lib/api";
import { useWorldStore } from "../../state/worldStore";
import { localHour } from "../../world3d/daylight";
import { parseSqliteUtc } from "../../world3d/compost";
import { buildGreeting } from "../../world3d/greeting";

const SETTLE_MS = 1200; // let the scene fade in before the pet speaks
const HOLD_MS = 7000; // how long the greeting lingers

/** Real XP earned today (sum of today's xp_events amounts). */
function xpEarnedToday(events: XpEvent[]): number {
  const today = new Date().toDateString();
  let sum = 0;
  for (const e of events) {
    const ms = parseSqliteUtc(e.created_at);
    if (ms && new Date(ms).toDateString() === today) sum += e.amount;
  }
  return sum;
}

export function DenGreeting() {
  const { data } = useQuery({
    queryKey: queryKeys.den,
    queryFn: api.den,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const fired = useRef(false);

  useEffect(() => {
    if (!data?.pet || fired.current) return;
    fired.current = true;
    const greeting = buildGreeting(
      {
        petName: data.pet.name,
        userName: data.pet.user_name,
        memoryCount: data.memory_count,
        skillCount: data.skill_count,
        xpToday: xpEarnedToday(data.recent_xp),
      },
      localHour(new Date()),
    );
    const setSpeech = useWorldStore.getState().setSpeech;
    const t1 = setTimeout(() => setSpeech(greeting), SETTLE_MS);
    const t2 = setTimeout(() => {
      if (useWorldStore.getState().speech === greeting) setSpeech(""); // don't cut a chat reply
    }, SETTLE_MS + HOLD_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [data]);

  return null;
}
