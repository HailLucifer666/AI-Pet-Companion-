/** ModelSelector â€” choose which model answers. "Auto (role routing)" (default)
 *  keeps the resilient role-failover behavior; picking a concrete model pins it
 *  for the turn with no failover. Options are REAL â€” discovered live from each
 *  reachable provider via /api/models/available â€” never a hardcoded list.
 *
 *  Backed by the shared useModelStore, so a choice made here, in Chat, or in
 *  Settings applies everywhere (including the Den's PetChat). */

import { useQuery } from "@tanstack/react-query";
import { api, queryKeys } from "../lib/api";
import { useModelStore, buildModelOptions } from "../state/useModelStore";
import { Select } from "./ui";

export function ModelSelector({ className }: { className?: string }) {
  const selected = useModelStore((s) => s.selectedModel);
  const setSelected = useModelStore((s) => s.setSelectedModel);
  const { data } = useQuery({
    queryKey: queryKeys.modelsAvailable,
    queryFn: api.modelsAvailable,
    staleTime: 5 * 60_000, // discovery rarely changes within a session
  });

  return (
    <Select
      ariaLabel="Model"
      value={selected}
      onValueChange={setSelected}
      options={buildModelOptions(data, selected)}
      className={className}
    />
  );
}
