/** useWeather — the Grove's live weather, polled from the backend (which resolves
 *  the city by IP and reads Open-Meteo). REST, not Synapse: weather changes slowly,
 *  so we refetch every 15 min. Unavailable → `{available:false}` and the sky falls
 *  back to clear + day/night. */

import { useQuery } from "@tanstack/react-query";
import { api, queryKeys, type Weather } from "../lib/api";

const FIFTEEN_MIN = 15 * 60 * 1000;

export function useWeather(): Weather {
  const { data } = useQuery({
    queryKey: queryKeys.weather,
    queryFn: api.weather,
    refetchInterval: FIFTEEN_MIN,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
  return data ?? { available: false };
}
