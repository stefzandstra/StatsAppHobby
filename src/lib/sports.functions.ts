/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";

import { isLeague, LEAGUES, type LeagueId } from "./leagues";

const site = (l: LeagueId) =>
  `https://site.api.espn.com/apis/site/v2/sports/${LEAGUES[l].sport}/${l}`;
const web = (l: LeagueId) =>
  `https://site.web.api.espn.com/apis/common/v3/sports/${LEAGUES[l].sport}/${l}`;

async function get(url: string): Promise<any> {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Upstream request failed (${res.status})`);
  return res.json();
}

function league(v: unknown): LeagueId {
  if (!isLeague(v)) throw new Error("Unknown league");
  return v;
}

export type TeamSide = {
  id: string;
  name: string;
  short: string;
  abbrev: string;
  logo: string | null;
  color: string | null;
  altColor: string | null;
  score: string | null;
  record: string | null;
  winner: boolean;
  homeAway: string;
  linescores: string[];
};

export type GameCard = {
  id: string;
  date: string;
  status: string;
  state: string;
  venue: string | null;
  seasonLabel: string | null;
  home: TeamSide;
  away: TeamSide;
};

function side(c: any): TeamSide {
  const t = c?.team ?? {};
  return {
    id: String(t.id ?? ""),
    name: t.displayName ?? "",
    short: t.shortDisplayName ?? t.name ?? "",
    abbrev: t.abbreviation ?? "",
    logo: t.logo ?? t.logos?.[0]?.href ?? null,
    color: t.color ?? null,
    altColor: t.alternateColor ?? null,
    score: c?.score != null ? String(c.score?.displayValue ?? c.score) : null,
    record:
      c?.records?.find((r: any) => r.type === "total")?.summary ??
      c?.record?.[0]?.displayValue ??
      null,
    winner: Boolean(c?.winner),
    homeAway: c?.homeAway ?? "",
    linescores: (c?.linescores ?? []).map((l: any) => String(l.displayValue ?? l.value ?? "")),
  };
}

function toCard(ev: any): GameCard {
  const comp = ev?.competitions?.[0] ?? {};
  const comps = comp.competitors ?? [];
  const home = comps.find((c: any) => c.homeAway === "home") ?? comps[0] ?? {};
  const away = comps.find((c: any) => c.homeAway === "away") ?? comps[1] ?? {};
  const st = comp.status ?? ev?.status ?? {};
  return {
    id: String(ev?.id ?? ""),
    date: comp.date ?? ev?.date ?? "",
    status: st?.type?.shortDetail ?? st?.type?.description ?? "",
    state: st?.type?.state ?? "pre",
    venue: comp.venue?.fullName ?? null,
    seasonLabel: ev?.season?.slug ?? null,
    home: side(home),
    away: side(away),
  };
}

function ymd(d: Date) {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

function shiftDays(ymdStr: string, days: number) {
  const d = new Date(
    Date.UTC(
      Number(ymdStr.slice(0, 4)),
      Number(ymdStr.slice(4, 6)) - 1,
      Number(ymdStr.slice(6, 8)),
    ),
  );
  d.setUTCDate(d.getUTCDate() + days);
  return ymd(d);
}

function prettyDate(s: string) {
  if (s.length !== 8) return s;
  const d = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T12:00:00Z`);
  return d.toLocaleDateString("nl-NL", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

const isPlayed = (ev: any) => {
  const s = ev?.competitions?.[0]?.status?.type?.state ?? ev?.status?.type?.state;
  return s === "post" || s === "in";
};

/** Most recent day with a completed/in-progress game (range queries are rejected upstream). */
async function findLatestPlayedDate(l: LeagueId): Promise<string> {
  const today = ymd(new Date());
  for (let batch = 0; batch < 20; batch++) {
    const days = Array.from({ length: 10 }, (_, i) => shiftDays(today, -(batch * 10 + i)));
    const results = await Promise.all(
      days.map((day) =>
        get(`${site(l)}/scoreboard?dates=${day}`)
          .then((p) => ((p?.events ?? []) as any[]).some(isPlayed))
          .catch(() => false),
      ),
    );
    const hit = results.findIndex(Boolean);
    if (hit >= 0) return days[hit]!;
  }
  return today;
}

export type Scoreboard = {
  mode: "day" | "week";
  slate: string;
  title: string;
  subtitle: string;
  prev: string | null;
  next: string | null;
  games: GameCard[];
};

async function dayScoreboard(l: LeagueId, slate: string): Promise<Scoreboard> {
  const date = /^\d{8}$/.test(slate) ? slate : await findLatestPlayedDate(l);
  const payload = await get(`${site(l)}/scoreboard?dates=${date}`);
  const games: GameCard[] = (payload?.events ?? []).map(toCard);
  games.sort((a, b) => a.date.localeCompare(b.date));
  return {
    mode: "day",
    slate: date,
    title: prettyDate(date),
    subtitle: "Speeldag",
    prev: shiftDays(date, -1),
    next: shiftDays(date, 1),
    games,
  };
}

/** NFL-style weekly slates. Slate key = "YEAR-SEASONTYPE-WEEK". */
async function weekScoreboard(l: LeagueId, slate: string): Promise<Scoreboard> {
  const m = /^(\d{4})-(\d)-(\d{1,2})$/.exec(slate);
  const url = m
    ? `${site(l)}/scoreboard?dates=${m[1]}&seasontype=${m[2]}&week=${m[3]}`
    : `${site(l)}/scoreboard`;
  let payload = await get(url);
  let year = Number(payload?.season?.year ?? m?.[1] ?? new Date().getUTCFullYear());
  let type = Number(payload?.season?.type ?? m?.[2] ?? 2);
  let week = Number(payload?.week?.number ?? m?.[3] ?? 1);

  // Offseason default: fall back to the previous season's final postseason week.
  if (!m && (type === 4 || !(payload?.events ?? []).length)) {
    year = type === 4 ? year : year - 1;
    type = 3;
    week = 5;
    payload = await get(`${site(l)}/scoreboard?dates=${year}&seasontype=3&week=5`);
  }

  const cal = (payload?.leagues?.[0]?.calendar ?? []) as any[];
  const flat: Array<{ type: number; week: number; label: string; group: string }> = [];
  cal.forEach((g: any, gi: number) => {
    const t = Number(g.value ?? gi + 1);
    if (t < 1 || t > 3) return;
    (g.entries ?? []).forEach((e: any) =>
      flat.push({ type: t, week: Number(e.value), label: e.label, group: g.label }),
    );
  });
  const idx = flat.findIndex((f) => f.type === type && f.week === week);
  const key = (f?: { type: number; week: number }) => (f ? `${year}-${f.type}-${f.week}` : null);
  const cur = flat[idx];

  const games: GameCard[] = (payload?.events ?? []).map(toCard);
  games.sort((a, b) => a.date.localeCompare(b.date));
  return {
    mode: "week",
    slate: `${year}-${type}-${week}`,
    title: cur?.label ?? `Week ${week}`,
    subtitle: `${year} ${cur?.group ?? "Season"}`,
    prev: idx > 0 ? key(flat[idx - 1]) : null,
    next: idx >= 0 && idx < flat.length - 1 ? key(flat[idx + 1]) : null,
    games,
  };
}

export const getScoreboard = createServerFn({ method: "GET" })
  .inputValidator((data: { league: string; slate?: string }) => ({
    league: league(data.league),
    slate: data.slate ?? "",
  }))
  .handler(async ({ data }) =>
    data.league === "nfl"
      ? weekScoreboard(data.league, data.slate)
      : dayScoreboard(data.league, data.slate),
  );

export type TeamListItem = {
  id: string;
  name: string;
  short: string;
  abbrev: string;
  color: string | null;
  altColor: string | null;
  logo: string | null;
};

export const getTeams = createServerFn({ method: "GET" })
  .inputValidator((data: { league: string }) => ({ league: league(data.league) }))
  .handler(async ({ data }) => {
    const d = await get(`${site(data.league)}/teams`);
    const teams: TeamListItem[] = (d?.sports?.[0]?.leagues?.[0]?.teams ?? []).map((w: any) => {
      const t = w.team ?? {};
      return {
        id: String(t.id),
        name: t.displayName ?? "",
        short: t.shortDisplayName ?? t.name ?? "",
        abbrev: t.abbreviation ?? "",
        color: t.color ?? null,
        altColor: t.alternateColor ?? null,
        logo: t.logos?.[0]?.href ?? null,
      };
    });
    teams.sort((a, b) => a.name.localeCompare(b.name));
    return teams;
  });

export type TeamStatBlock = {
  teamId: string;
  name: string;
  logo: string | null;
  stats: Array<{ label: string; value: string }>;
};

export type BoxPlayer = {
  id: string;
  name: string;
  short: string;
  jersey: string;
  position: string;
  headshot: string | null;
  starter: boolean;
  didNotPlay: boolean;
  reason: string | null;
  stats: string[];
};

export type StatCategory = {
  name: string;
  labels: string[];
  rows: BoxPlayer[];
  totals: string[];
};

export type PlayerGroup = {
  teamId: string;
  name: string;
  logo: string | null;
  categories: StatCategory[];
};

export type RosterPlayer = {
  id: string;
  name: string;
  jersey: string;
  position: string;
  height: string;
  weight: string;
  age: number | null;
  headshot: string | null;
};

const CATEGORY_NAMES: Record<string, string> = {
  kickReturns: "Kick returns",
  puntReturns: "Punt returns",
  defensive: "Defense",
};
const catName = (s: any) =>
  CATEGORY_NAMES[s?.name] ??
  (s?.name ? String(s.name).charAt(0).toUpperCase() + String(s.name).slice(1) : "Players");

export const getBoxScore = createServerFn({ method: "GET" })
  .inputValidator((data: { league: string; gameId: string }) => ({
    league: league(data.league),
    gameId: String(data.gameId),
  }))
  .handler(async ({ data }) => {
    const d = await get(`${site(data.league)}/summary?event=${encodeURIComponent(data.gameId)}`);
    const header = d?.header ?? {};
    const comp = header?.competitions?.[0] ?? {};
    const game = toCard({
      id: header.id ?? data.gameId,
      competitions: [comp],
      season: header.season,
      status: comp.status,
    });

    const teamStats: TeamStatBlock[] = (d?.boxscore?.teams ?? []).map((t: any) => ({
      teamId: String(t.team?.id ?? ""),
      name: t.team?.displayName ?? "",
      logo: t.team?.logo ?? null,
      stats: (t.statistics ?? []).map((s: any) => ({
        label: s.label ?? s.name ?? "",
        value: s.displayValue ?? "",
      })),
    }));

    const playerGroups: PlayerGroup[] = (d?.boxscore?.players ?? []).map((p: any) => ({
      teamId: String(p.team?.id ?? ""),
      name: p.team?.displayName ?? "",
      logo: p.team?.logo ?? null,
      categories: ((p.statistics ?? []) as any[])
        .map((st: any) => ({
          name: (p.statistics?.length ?? 0) > 1 ? catName(st) : "Players",
          labels: (st.labels ?? []) as string[],
          rows: (st.athletes ?? []).map((a: any) => ({
            id: String(a.athlete?.id ?? ""),
            name: a.athlete?.displayName ?? "",
            short: a.athlete?.shortName ?? "",
            jersey: a.athlete?.jersey ?? "",
            position: a.athlete?.position?.abbreviation ?? "",
            headshot: a.athlete?.headshot?.href ?? null,
            starter: Boolean(a.starter),
            didNotPlay: Boolean(a.didNotPlay),
            reason: a.reason ?? null,
            stats: (a.stats ?? []) as string[],
          })),
          totals: (st.totals ?? []) as string[],
        }))
        .filter((c: StatCategory) => c.rows.length),
    }));

    const leaders = ((d?.leaders ?? []) as any[]).map((t: any) => ({
      teamId: String(t.team?.id ?? ""),
      name: t.team?.displayName ?? "",
      logo: t.team?.logo ?? null,
      items: ((t.leaders ?? []) as any[])
        .map((c: any) => {
          const l = c.leaders?.[0];
          if (!l?.athlete) return null;
          return {
            category: c.displayName ?? c.name ?? "",
            value: l.displayValue ?? "",
            id: String(l.athlete.id ?? ""),
            name: l.athlete.displayName ?? "",
            headshot: l.athlete.headshot?.href ?? null,
          };
        })
        .filter(Boolean) as { category: string; value: string; id: string; name: string; headshot: string | null }[],
    }));

    return { game, teamStats, playerGroups, leaders, attendance: (comp.attendance ?? null) as number | null };
  });

export const getTeamDetail = createServerFn({ method: "GET" })
  .inputValidator((data: { league: string; teamId: string }) => ({
    league: league(data.league),
    teamId: String(data.teamId),
  }))
  .handler(async ({ data }) => {
    const base = `${site(data.league)}/teams/${encodeURIComponent(data.teamId)}`;
    const [roster, schedule] = await Promise.all([
      get(`${base}/roster`),
      get(`${base}/schedule`).catch(() => null),
    ]);
    const t = roster?.team ?? {};
    // NFL rosters are grouped by unit ({ position, items }); NBA rosters are flat.
    const athletes = ((roster?.athletes ?? []) as any[]).flatMap((a: any) =>
      Array.isArray(a?.items) ? a.items : [a],
    );
    const games = ((schedule?.events ?? []) as any[]).map(toCard);
    const played = games.filter((g) => g.state !== "pre");
    return {
      team: {
        id: String(t.id ?? data.teamId),
        name: t.displayName ?? "",
        short: t.shortDisplayName ?? t.name ?? "",
        abbrev: t.abbreviation ?? "",
        logo: t.logos?.[0]?.href ?? t.logo ?? null,
        color: t.color ?? null,
        altColor: t.alternateColor ?? null,
        record: t.recordSummary ?? null,
        standing: t.standingSummary ?? null,
      },
      seasonLabel: roster?.season?.displayName ?? null,
      players: athletes.map((a: any) => ({
        id: String(a.id),
        name: a.displayName ?? a.fullName ?? "",
        jersey: a.jersey ?? "",
        position: a.position?.abbreviation ?? "",
        height: a.displayHeight ?? "",
        weight: a.displayWeight ?? "",
        age: a.age ?? null,
        headshot: a.headshot?.href ?? null,
      })) as RosterPlayer[],
      games: (played.length ? played : games).slice(-12).reverse(),
      upcoming: games.filter((g) => g.state === "pre").slice(0, 3),
    };
  });

export type PlayerCategory = {
  name: string;
  labels: string[];
  rows: Array<{ season: string; stats: string[] }>;
};

const HIGHLIGHTS: Record<LeagueId, string[]> = {
  nba: ["PTS", "REB", "AST", "MIN", "FG%", "3P%"],
  nfl: [],
};

export const getPlayerStats = createServerFn({ method: "GET" })
  .inputValidator((data: { league: string; playerId: string }) => ({
    league: league(data.league),
    playerId: String(data.playerId),
  }))
  .handler(async ({ data }) => {
    const id = encodeURIComponent(data.playerId);
    const [statsRes, bio] = await Promise.all([
      get(`${web(data.league)}/athletes/${id}/stats`).catch(() => null),
      get(`${web(data.league)}/athletes/${id}`).catch(() => null),
    ]);
    const athlete = bio?.athlete ?? {};
    const rawCats = ((statsRes?.categories ?? []) as any[]).filter(
      (c) => (c.statistics ?? []).length,
    );
    const categories: PlayerCategory[] = rawCats.map((c: any) => ({
      name: c.displayName ?? catName(c),
      labels: (c.labels ?? []) as string[],
      rows: ((c.statistics ?? []) as any[])
        .slice()
        .sort((a, b) => (b.season?.year ?? 0) - (a.season?.year ?? 0))
        .map((r) => ({ season: r.season?.displayName ?? "", stats: (r.stats ?? []) as string[] })),
    }));

    // Headline numbers: the league's key stats, or the first few of the main category.
    const primary =
      categories.find((c) => /average/i.test(c.name)) ?? categories[0] ?? null;
    const latest = primary?.rows[0];
    const wanted = HIGHLIGHTS[data.league].length
      ? HIGHLIGHTS[data.league]
      : (primary?.labels ?? []).filter((l) => l !== "GP").slice(0, 6);
    const highlights = primary && latest
      ? wanted
          .map((label) => {
            const i = primary.labels.indexOf(label);
            return { label, value: i >= 0 ? (latest.stats[i] ?? "–") : "–" };
          })
      : [];

    return {
      player: {
        id: String(data.playerId),
        name: athlete.displayName ?? "",
        headshot: athlete.headshot?.href ?? null,
        position: athlete.position?.abbreviation ?? "",
        jersey: athlete.jersey ?? "",
        teamId: athlete.team?.id ? String(athlete.team.id) : null,
        teamName: athlete.team?.displayName ?? null,
        teamLogo: athlete.team?.logos?.[0]?.href ?? null,
        teamColor: (athlete.team?.color as string | undefined) ?? null,
        teamAltColor: (athlete.team?.alternateColor as string | undefined) ?? null,
      },
      seasonLabel: latest?.season ?? null,
      highlightTitle: primary?.name ?? "Season",
      highlights,
      categories,
    };
  });
