/** greeting.ts — the companion's daily greeting, composed ONLY from real data: the
 *  real local hour (time-of-day salutation) and the real Den digest (how many
 *  memories it holds, how many skills it's learned, XP earned today). The pet
 *  speaks this line in its 3-D bubble when you enter the Den. No invented facts —
 *  zero counts simply drop out of the sentence. Pure + unit-tested. */

export interface GreetingDigest {
  petName: string;
  userName: string;
  memoryCount: number;
  skillCount: number;
  xpToday: number;
}

/** A warm, time-of-day salutation from the real local hour (0–23). */
export function salutationFor(hour: number): string {
  if (hour < 5) return "You're up late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Winding down for the night";
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Compose the greeting line from the real digest. Empty/zero counts are omitted
 *  rather than faked; a brand-new companion still gets a warm welcome. */
export function buildGreeting(d: GreetingDigest, hour: number): string {
  const who = d.userName ? `, ${d.userName}` : "";
  const parts: string[] = [`${salutationFor(hour)}${who}.`];

  const held: string[] = [];
  if (d.memoryCount > 0) held.push(`${d.memoryCount} ${d.memoryCount === 1 ? "memory" : "memories"}`);
  if (d.skillCount > 0) held.push(`${d.skillCount} ${d.skillCount === 1 ? "skill" : "skills"}`);
  if (held.length) parts.push(`I'm holding ${joinList(held)}.`);

  if (d.xpToday > 0) parts.push(`We've earned ${d.xpToday} XP today.`);
  if (parts.length === 1) parts.push("Glad you're here."); // fresh companion, nothing grown yet

  return parts.join(" ");
}
