/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";

import { isLeague, LEAGUES, type LeagueId } from "./leagues";

async function get(url: string): Promise<any> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Upstream request failed (${res.status})`);
  return res.json();
}
function league(v: unknown): LeagueId {
  if (!isLeague(v)) throw new Error("Unknown league");
  return v;
}
const headshot = (l: LeagueId, id: string) =>
  `https://a.espncdn.com/i/headshots/${l}/players/full/${id}.png`;

// ---------- Standings ----------
export type StandingRow = {
  teamId: string;
  name: string;
  abbrev: string;
  logo: string | null;
  seed: number;
  stats: Record<string, string>;
};
export type StandingGroup = { name: string; rows: StandingRow[] };

const COLS: Record<LeagueId, Array<[string, string]>> = {
  nba: [["wins", "W"], ["losses", "L"], ["winPercent", "PCT"], ["gamesBehind", "GB"], ["Home", "Home"], ["Road", "Road"], ["differential", "DIFF"], ["streak", "STRK"]],
  nfl: [["wins", "W"], ["losses", "L"], ["ties", "T"], ["winPercent", "PCT"], ["pointsFor", "PF"], ["pointsAgainst", "PA"], ["differential", "DIFF"], ["streak", "STRK"]],
};

function parseGroups(node: any, out: StandingGroup[]) {
  if (node?.standings?.entries) {
    const rows: StandingRow[] = node.standings.entries.map((e: any) => {
      const stats: Record<string, string> = {};
      for (const s of e.stats ?? []) stats[s.name ?? s.type] = s.displayValue ?? "";
      const seed = Number((e.stats ?? []).find((s: any) => s.name === "playoffSeed")?.value ?? 99);
      return {
        teamId: String(e.team?.id ?? ""),
        name: e.team?.displayName ?? "",
        abbrev: e.team?.abbreviation ?? "",
        logo: e.team?.logos?.[0]?.href ?? null,
        seed,
        stats,
      };
    });
    rows.sort((a, b) => {
      const d = parseFloat(b.stats['winPercent'] || "0") - parseFloat(a.stats['winPercent'] || "0");
      return d || a.seed - b.seed;
    });
    out.push({ name: node.name, rows });
  }
  for (const c of node?.children ?? []) parseGroups(c, out);
}

export const getStandings = createServerFn({ method: "GET" })
  .inputValidator((d: { league: string; view: string }) => ({
    league: league(d.league),
    view: d.view === "division" ? "division" : "conference",
  }))
  .handler(async ({ data }) => {
    const base = `https://site.api.espn.com/apis/v2/sports/${LEAGUES[data.league].sport}/${data.league}/standings`;
    const level = data.view === "division" ? "?level=3" : "";
    let d = await get(base + level);
    let groups: StandingGroup[] = [];
    parseGroups(d, groups);
    // Fresh season with no games yet? Show last season instead.
    const empty = groups.every((g) => g.rows.every((r) => r.stats['wins'] === "0" && r.stats['losses'] === "0"));
    if (empty && d?.seasons?.length !== 0) {
      const year = Number(groups.length ? d?.children?.[0]?.standings?.season : 0) || 0;
      if (year) {
        const prev = await get(`${base}${level ? level + "&" : "?"}season=${year - 1}`).catch(() => null);
        const g2: StandingGroup[] = [];
        if (prev) parseGroups(prev, g2);
        if (g2.length) { groups = g2; d = prev; }
      }
    }
    const season = d?.children?.[0]?.standings?.seasonDisplayName ?? d?.children?.[0]?.children?.[0]?.standings?.seasonDisplayName ?? null;
    return { groups, columns: COLS[data.league], season: season as string | null };
  });

// ---------- League leaders ----------
export type LeaderCategory = {
  name: string;
  abbrev: string;
  leaders: Array<{ id: string; name: string; headshot: string | null; value: string; position: string; team: string }>;
};

export const getLeaders = createServerFn({ method: "GET" })
  .inputValidator((d: { league: string }) => ({ league: league(d.league) }))
  .handler(async ({ data }) => {
    const d = await get(`https://site.web.api.espn.com/apis/site/v3/sports/${LEAGUES[data.league].sport}/${data.league}/leaders`);
    const cats: LeaderCategory[] = ((d?.leaders?.categories ?? []) as any[]).map((c) => ({
      name: c.displayName ?? c.name ?? "",
      abbrev: c.abbreviation ?? "",
      leaders: ((c.leaders ?? []) as any[]).slice(0, 10).map((l) => ({
        id: String(l.athlete?.id ?? ""),
        name: l.athlete?.displayName ?? "",
        headshot: l.athlete?.headshot?.href ?? null,
        value: l.displayValue ?? "",
        position: l.athlete?.position?.abbreviation ?? "",
        team: l.team?.abbreviation ?? l.athlete?.team?.abbreviation ?? "",
      })),
    })).filter((c) => c.leaders.length);
    return {
      categories: cats,
      season: (d?.requestedSeason?.displayName ?? null) as string | null,
      seasonType: (d?.requestedSeason?.type?.name ?? null) as string | null,
    };
  });

// ---------- Player search ----------
export const searchPlayers = createServerFn({ method: "GET" })
  .inputValidator((d: { league: string; q: string }) => ({ league: league(d.league), q: String(d.q).slice(0, 60) }))
  .handler(async ({ data }) => {
    if (data.q.trim().length < 2) return [];
    const d = await get(
      `https://site.web.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(data.q)}&limit=20&type=player`,
    );
    return ((d?.items ?? []) as any[])
      .filter((i) => i.league === data.league)
      .slice(0, 8)
      .map((i) => ({ id: String(i.id), name: i.displayName ?? "", headshot: headshot(data.league, String(i.id)) }));
  });
