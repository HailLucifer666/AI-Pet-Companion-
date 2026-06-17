import type { Place } from "../../../world3d/placeRegistry";
import { REALMS, type RealmId } from "../../../world3d/realmData";

export function toolCategoryToPlace(toolName: string, realmId: RealmId): Place {
  if (!toolName) return "workbench"; // default
  
  // The tool router gives tools distinct locations based on the active realm.
  const r = REALMS[realmId];
  if (!r) return "workbench";

  if (r.id === "I") {
    // In realm I, all work is done at the workbench
    return "workbench";
  }

  // In realm II and III, tasks and archives become available
  if (toolName.includes("task") || toolName.includes("wish")) {
    return r.places.includes("tasks") ? "tasks" : "workbench";
  }
  if (toolName.includes("doc") || toolName.includes("archive")) {
    return r.places.includes("archives") ? "archives" : "workbench";
  }
  if (toolName.includes("time") || toolName.includes("calendar")) {
    return r.places.includes("calendar") ? "calendar" : "workbench";
  }

  return "workbench";
}
