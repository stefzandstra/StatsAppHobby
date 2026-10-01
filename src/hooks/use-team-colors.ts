import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

import type { LeagueId } from "@/lib/leagues";
import { getTeams } from "@/lib/sports.functions";
import { teamColor } from "@/lib/team-colors";

/** Team colors by id and by abbreviation, from the (24h-cached) team list. */
export function useTeamColors(leagues: LeagueId[]) {
  const results = useQueries({
    queries: leagues.map((league) => ({
      queryKey: ["teams", league],
      queryFn: () => getTeams({ data: { league } }),
      staleTime: 24 * 60 * 60_000,
    })),
  });
  const data = results.map((r) => r.data);

  return useMemo(() => {
    const map = new Map<string, string>();
    data.forEach((teams, i) => {
      for (const t of teams ?? []) {
        const c = teamColor(t.color, t.altColor);
        map.set(`${leagues[i]}:${t.id}`, c);
        map.set(`${leagues[i]}:${t.abbrev}`, c);
      }
    });
    return (league: LeagueId, idOrAbbrev?: string | null) =>
      idOrAbbrev ? map.get(`${league}:${idOrAbbrev}`) : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...data, leagues.join()]);
}
