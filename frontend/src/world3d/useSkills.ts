/** useSkills — the companion's approved (active) skills, polled from the backend
 *  to drive the village's earned monuments. REST + react-query like useWeather
 *  (skills change rarely → a slow poll), plus a Synapse listener so a freshly
 *  approved skill raises its monument immediately instead of waiting for the poll.
 *  Called OUTSIDE the Canvas (in World3D) and passed down as a prop — react-query
 *  context doesn't cross the r3f renderer boundary. Only-real-data: drafts never
 *  appear (the endpoint filters status='active'). */

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys, type Skill } from "../lib/api";
import { connectSynapse } from "../lib/synapse";

const ONE_MIN = 60 * 1000;
const EMPTY: Skill[] = []; // stable ref — no re-render churn while empty

export function useSkills(): Skill[] {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: queryKeys.skills,
    queryFn: api.skills,
    refetchInterval: ONE_MIN,
    staleTime: 30 * 1000,
    retry: 1,
  });

  // A skill just got approved → refetch now, don't wait out the poll interval.
  useEffect(
    () =>
      connectSynapse((ev) => {
        if (ev.type === "skill.approved") qc.invalidateQueries({ queryKey: queryKeys.skills });
      }),
    [qc],
  );

  return data?.skills ?? EMPTY;
}
