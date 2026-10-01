/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BriefInput, GameInput, PlayerGameInput, Sport, StatLine } from "./highlights/types";

const SPORT_PATH: Record<Sport, string> = { NBA: "basketball/nba", NFL: "football/nfl" };
const site = (s: Sport) => `https://site.api.espn.com/apis/site/v2/sports/${SPORT_PATH[s]}`;
const web = (s: Sport) => `https://site.web.api.espn.com/apis/common/v3/sports/${SPORT_PATH[s]}`;

async function get(url: string): Promise<any> {
  // Note: browser-like headers (UA/referer) make ESPN return 403; a plain request works.
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  return res.json();
}

/** Run async jobs with a concurrency cap. */
async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]!);
      }
    }),
  );
  return out;
}

const ymd = (d: Date) =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
const isPost = (ev: any) => ev?.competitions?.[0]?.status?.type?.state === "post";
const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const pair = (v: unknown): [number, number] => {
  const [a, b] = String(v ?? "").split(/[-/]/);
  return [num(a), num(b)];
};
const isoDate = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;

// ---------- Slates ----------

async function nbaSlate(): Promise<{ events: any[]; label: string; date: string }> {
  const base = new Date();
  for (let batch = 0; batch < 25; batch++) {
    const days = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() - (batch * 10 + i));
      return ymd(d);
    });
    const res = await Promise.all(
      days.map((day) => get(`${site("NBA")}/scoreboard?dates=${day}`).catch(() => null)),
    );
    const hit = res.findIndex((p) => (p?.events ?? []).some(isPost));
    if (hit >= 0) {
      const day = days[hit]!;
      const label = new Date(`${isoDate(day)}T12:00:00Z`).toLocaleDateString("nl-NL", {
        weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
      });
      return { events: res[hit].events.filter(isPost), label, date: isoDate(day) };
    }
  }
  return { events: [], label: "geen recente wedstrijden", date: isoDate(ymd(base)) };
}

async function nflSlate(): Promise<{ events: any[]; label: string; date: string }> {
  const cur = await get(`${site("NFL")}/scoreboard`);
  let events = ((cur?.events ?? []) as any[]).filter(isPost);
  let week = Number(cur?.week?.number ?? 1);
  const year = Number(cur?.season?.year ?? new Date().getUTCFullYear());
  const type = Number(cur?.season?.type ?? 2);
  if (!events.length && week > 1) {
    week -= 1;
    const prev = await get(`${site("NFL")}/scoreboard?dates=${year}&seasontype=${type}&week=${week}`);
    events = ((prev?.events ?? []) as any[]).filter(isPost);
  }
  const last = events.map((e) => String(e.date)).sort().pop() ?? new Date().toISOString();
  return { events, label: `week ${week}`, date: last.slice(0, 10) };
}

// ---------- Box score parsing ----------

const NBA_BOX: Record<string, (v: string, s: StatLine) => void> = {
  MIN: (v, s) => (s["min"] = num(v)),
  PTS: (v, s) => (s["pts"] = num(v)),
  REB: (v, s) => (s["reb"] = num(v)),
  AST: (v, s) => (s["ast"] = num(v)),
  STL: (v, s) => (s["stl"] = num(v)),
  BLK: (v, s) => (s["blk"] = num(v)),
  TO: (v, s) => (s["tov"] = num(v)),
  FG: (v, s) => ([s["fgm"], s["fga"]] = pair(v)),
  "3PT": (v, s) => ([s["tpm"], s["tpa"]] = pair(v)),
  FT: (v, s) => ([s["ftm"], s["fta"]] = pair(v)),
  "+/-": (v, s) => (s["pm"] = num(v)),
};

const NFL_BOX: Record<string, Record<string, (v: string, s: StatLine) => void>> = {
  passing: {
    "C/ATT": (v, s) => ([s["cmp"], s["att"]] = pair(v)),
    YDS: (v, s) => (s["passYds"] = num(v)), TD: (v, s) => (s["passTd"] = num(v)), INT: (v, s) => (s["int"] = num(v)),
    SACKS: (v, s) => (s["sacked"] = pair(v)[0]), RTG: (v, s) => (s["rtg"] = num(v)), QBR: (v, s) => (s["qbr"] = num(v)),
  },
  rushing: {
    CAR: (v, s) => (s["carries"] = num(v)), YDS: (v, s) => (s["rushYds"] = num(v)),
    TD: (v, s) => (s["rushTd"] = num(v)), LONG: (v, s) => (s["rushLong"] = num(v)),
  },
  receiving: {
    REC: (v, s) => (s["rec"] = num(v)), YDS: (v, s) => (s["recYds"] = num(v)),
    TD: (v, s) => (s["recTd"] = num(v)), TGTS: (v, s) => (s["targets"] = num(v)), LONG: (v, s) => (s["recLong"] = num(v)),
  },
  defensive: {
    TOT: (v, s) => (s["tackles"] = num(v)), SACKS: (v, s) => (s["sacks"] = num(v)),
    TFL: (v, s) => (s["tfl"] = num(v)), PD: (v, s) => (s["pd"] = num(v)), "QB HTS": (v, s) => (s["qbHits"] = num(v)),
  },
  interceptions: { INT: (v, s) => (s["defInt"] = num(v)) },
  fumbles: { FF: (v, s) => (s["ff"] = num(v)) },
};

type RawPlayer = {
  id: string; name: string; position: string; image?: string;
  teamId: string; team: string; stats: StatLine;
};

function parseBox(sport: Sport, summary: any): RawPlayer[] {
  const map = new Map<string, RawPlayer>();
  for (const group of summary?.boxscore?.players ?? []) {
    const teamId = String(group.team?.id ?? "");
    const team = group.team?.abbreviation ?? "";
    for (const cat of group.statistics ?? []) {
      const parsers = sport === "NBA" ? NBA_BOX : NFL_BOX[cat.name];
      if (!parsers) continue;
      const labels: string[] = cat.labels ?? [];
      for (const a of cat.athletes ?? []) {
        if (a.didNotPlay || !a.athlete?.id) continue;
        const id = String(a.athlete.id);
        const p = map.get(id) ?? {
          id, name: a.athlete.displayName ?? "", position: a.athlete.position?.abbreviation ?? "",
          teamId, team, stats: {},
          ...(a.athlete.headshot?.href ? { image: a.athlete.headshot.href } : {}),
        };
        labels.forEach((l, i) => {
          const f = parsers[l];
          if (f && !(sport === "NFL" && l === "YDS" && cat.name !== "passing" && cat.name !== "rushing" && cat.name !== "receiving")) f(String(a.stats?.[i] ?? ""), p.stats);
        });
        map.set(id, p);
      }
    }
  }
  const players = [...map.values()];
  if (sport === "NFL") {
    for (const p of players) {
      if (p.position) continue;
      const st = p.stats;
      p.position = (st["passYds"] ?? 0) > 0 ? "QB"
        : (st["rushYds"] ?? 0) > 0 && (st["rushYds"] ?? 0) >= (st["recYds"] ?? 0) ? "RB"
        : (st["recYds"] ?? 0) > 0 ? "WR"
        : "DEF";
    }
  }
  return players;
}

// ---------- Season averages ----------

async function seasonAvg(sport: Sport, id: string): Promise<StatLine | null> {
  const d = await get(`${web(sport)}/athletes/${encodeURIComponent(id)}/stats`).catch(() => null);
  const cats = (d?.categories ?? []) as any[];
  const latest = (c: any) =>
    ((c?.statistics ?? []) as any[]).slice().sort((a, b) => (b.season?.year ?? 0) - (a.season?.year ?? 0))[0];
  const pick = (c: any, row: any, label: string) => {
    const i = (c?.labels ?? []).indexOf(label);
    return i >= 0 ? num(row?.stats?.[i]) : 0;
  };
  if (sport === "NBA") {
    const c = cats.find((x) => x.name === "averages");
    const r = latest(c);
    if (!r) return null;
    return {
      pts: pick(c, r, "PTS"), reb: pick(c, r, "REB"), ast: pick(c, r, "AST"), stl: pick(c, r, "STL"),
      blk: pick(c, r, "BLK"), tov: pick(c, r, "TO"), min: pick(c, r, "MIN"),
    };
  }
  const out: StatLine = {};
  let year = 0;
  for (const c of cats) year = Math.max(year, latest(c)?.season?.year ?? 0);
  const per = (name: string, entries: [string, string][]) => {
    const c = cats.find((x) => x.name === name);
    const r = latest(c);
    if (!r || r.season?.year !== year) return;
    const gp = Math.max(1, pick(c, r, "GP"));
    for (const [label, key] of entries) out[key] = pick(c, r, label) / gp;
  };
  per("passing", [["YDS", "passYds"], ["TD", "passTd"], ["INT", "int"]]);
  per("rushing", [["CAR", "carries"], ["YDS", "rushYds"], ["TD", "rushTd"]]);
  per("receiving", [["REC", "rec"], ["TGTS", "targets"], ["YDS", "recYds"], ["TD", "recTd"]]);
  per("defensive", [["TOT", "tackles"], ["SACK", "sacks"], ["FF", "ff"], ["INT", "defInt"]]);
  return Object.keys(out).length ? out : null;
}

function starRating(sport: Sport, pos: string, avg: StatLine) {
  const r =
    sport === "NBA"
      ? (avg["pts"] ?? 0) / 27
      : pos === "QB"
        ? (avg["passYds"] ?? 0) / 270
        : pos === "RB"
          ? (avg["rushYds"] ?? 0) / 85
          : pos === "WR" || pos === "TE"
            ? (avg["recYds"] ?? 0) / 80
            : ((avg["sacks"] ?? 0) * 2 + (avg["tackles"] ?? 0) / 4) / 2;
  return Math.max(0, Math.min(1, r));
}

/** Rough per-game impact to choose which players are worth a season lookup. */
const quickImpact = (s: StatLine) =>
  (s["pts"] ?? 0) + (s["reb"] ?? 0) + (s["ast"] ?? 0) + 2 * ((s["stl"] ?? 0) + (s["blk"] ?? 0)) +
  (s["passYds"] ?? 0) / 25 + 4 * (s["passTd"] ?? 0) + (s["rushYds"] ?? 0) / 10 + (s["recYds"] ?? 0) / 10 +
  6 * ((s["rushTd"] ?? 0) + (s["recTd"] ?? 0)) + 4 * (s["sacks"] ?? 0) + 5 * (s["defInt"] ?? 0);

// ---------- NBA context ----------

const clockSecs = (v: unknown) => {
  const t = String(v ?? "0");
  if (t.includes(":")) {
    const [m, sec] = t.split(":");
    return num(m) * 60 + num(sec);
  }
  return num(t);
};

/** Comeback size, late game-winner and its shooter, from play-by-play. */
function nbaGameStory(summary: any, home: { score: number; name: string }, away: { score: number; name: string }) {
  const plays = (summary?.plays ?? []) as any[];
  const homeWon = home.score > away.score;
  let maxDeficit = 0;
  let lastLead: any = null;
  let leading = false;
  for (const pl of plays) {
    const h = num(pl.homeScore), a = num(pl.awayScore);
    const diff = homeWon ? h - a : a - h;
    maxDeficit = Math.max(maxDeficit, -diff);
    const now = diff > 0;
    if (now && !leading && pl.scoringPlay) lastLead = pl;
    leading = now;
  }
  const out: { comebackPoints?: number; decidedWithSecondsLeft?: number; summary?: string } = {};
  if (maxDeficit > 0) out.comebackPoints = maxDeficit;
  if (lastLead && Number(lastLead.period?.number ?? 0) >= 4) {
    const secs = clockSecs(lastLead.clock?.displayValue);
    if (secs <= 30) {
      out.decidedWithSecondsLeft = Math.round(secs);
      const shooter = String(lastLead.text ?? "").split(/ makes | made /)[0];
      out.summary = shooter
        ? `${shooter} besliste het met nog ${String(secs).replace(".", ",")} seconden te gaan.`
        : `Beslist met nog ${String(secs).replace(".", ",")} seconden te gaan.`;
    }
  }
  return out;
}

/** Last-5 averages, season low and 30+ streak from the NBA game log. */
async function nbaGameLog(id: string, gameId: string) {
  const d = await get(`${web("NBA")}/athletes/${encodeURIComponent(id)}/gamelog`).catch(() => null);
  if (!d) return null;
  const labels: string[] = d.labels ?? [];
  const idx = (l: string) => labels.indexOf(l);
  const games: { id: string; date: string; pts: number; reb: number; ast: number }[] = [];
  for (const st of d.seasonTypes ?? []) {
    if (/preseason/i.test(st.displayName ?? "")) continue;
    for (const c of st.categories ?? []) {
      for (const e of c.events ?? []) {
        const meta = d.events?.[e.eventId] ?? {};
        games.push({
          id: String(e.eventId), date: String(meta.gameDate ?? ""),
          pts: num(e.stats?.[idx("PTS")]), reb: num(e.stats?.[idx("REB")]), ast: num(e.stats?.[idx("AST")]),
        });
      }
    }
  }
  if (!games.length) return null;
  games.sort((a, b) => b.date.localeCompare(a.date));
  const last5 = games.slice(0, 5);
  const avg = (k: "pts" | "reb" | "ast") => last5.reduce((t, g) => t + g[k], 0) / last5.length;
  const others = games.filter((g) => g.id !== gameId);
  let streak = 0;
  for (const g of games) {
    if (g.pts >= 30) streak++;
    else break;
  }
  return {
    last5Avg: last5.length >= 5 ? { pts: avg("pts"), reb: avg("reb"), ast: avg("ast") } : undefined,
    seasonLow: others.length >= 10 ? { pts: Math.min(...others.map((g) => g.pts)) } : undefined,
    streak,
  };
}

/** Comeback size and late deciding score from NFL scoring plays. */
function nflGameStory(summary: any, home: { score: number; name: string }, away: { score: number; name: string }) {
  const plays = (summary?.scoringPlays ?? []) as any[];
  const homeWon = home.score > away.score;
  let maxDeficit = 0, leading = false, lastLead: any = null;
  for (const pl of plays) {
    const diff = homeWon ? num(pl.homeScore) - num(pl.awayScore) : num(pl.awayScore) - num(pl.homeScore);
    maxDeficit = Math.max(maxDeficit, -diff);
    if (diff > 0 && !leading) lastLead = pl;
    leading = diff > 0;
  }
  const out: { comebackPoints?: number; decidedWithSecondsLeft?: number; summary?: string; notes?: string } = {};
  if (maxDeficit > 0) out.comebackPoints = maxDeficit;
  const q = Number(lastLead?.period?.number ?? 0);
  if (lastLead && q >= 4) {
    const secs = Math.round(clockSecs(lastLead.clock?.displayValue));
    if (q > 4 || secs <= 120) {
      out.decidedWithSecondsLeft = q > 4 ? 0 : secs;
      const txt = (String(lastLead.text ?? "").split(/\(|,/)[0] ?? "").trim();
      const when = q > 4 ? "in de verlenging" : `met nog ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")} op de klok`;
      out.summary = `${txt || "Beslissende score"} ${when}.`;
    }
  }
  if (plays.length) out.notes = `${plays.length} scores in deze wedstrijd; grootste achterstand van de winnaar: ${maxDeficit} punten.`;
  return out;
}

// ---------- Build ----------

async function sportInput(sport: Sport) {
  const slate = sport === "NBA" ? await nbaSlate() : await nflSlate();
  const summaries = await pool(slate.events, 8, (ev: any) =>
    get(`${site(sport)}/summary?event=${ev.id}`).then((s) => ({ ev, s })).catch(() => null),
  );

  const games: GameInput[] = [];
  const candidates: { raw: RawPlayer; gameId: string; opp: StatLine; date: string }[] = [];

  for (const item of summaries) {
    if (!item) continue;
    const { ev, s } = item;
    const comp = ev.competitions?.[0] ?? {};
    const cs = (comp.competitors ?? []) as any[];
    const side = (c: any) => ({
      id: String(c?.team?.id ?? ""), abbr: c?.team?.abbreviation ?? "",
      name: c?.team?.shortDisplayName ?? c?.team?.name ?? "", score: num(c?.score),
    });
    const home = side(cs.find((c) => c.homeAway === "home"));
    const away = side(cs.find((c) => c.homeAway === "away"));
    const period = Number(comp.status?.period ?? 0);
    const regulation = 4;
    const seasonType = Number(ev.season?.type ?? s?.header?.season?.type ?? 2);
    const date = String(ev.date ?? "").slice(0, 10);
    games.push({
      sport, date, gameId: String(ev.id), home, away,
      stage: seasonType === 3 ? "playoffs" : seasonType === 1 ? "preseason" : "regular",
      ...(period > regulation ? { overtimePeriods: period - regulation } : {}),
      label: ev.shortName ?? `${away.abbr} @ ${home.abbr}`,
      ...(sport === "NBA" ? nbaGameStory(s, home, away) : nflGameStory(s, home, away)),
    });

    const players = parseBox(sport, s);
    const totals = new Map<string, StatLine>();
    for (const p of players) {
      const t = totals.get(p.teamId) ?? {};
      for (const [k, v] of Object.entries(p.stats)) t[k] = (t[k] ?? 0) + v;
      totals.set(p.teamId, t);
    }
    for (const teamId of [home.id, away.id]) {
      const oppId = teamId === home.id ? away.id : home.id;
      const mine = players.filter((p) => p.teamId === teamId);
      const byImpact = [...mine].sort((a, b) => quickImpact(b.stats) - quickImpact(a.stats)).slice(0, sport === "NBA" ? 4 : 3);
      const extra =
        sport === "NBA"
          ? [...mine].sort((a, b) => (b.stats["min"] ?? 0) - (a.stats["min"] ?? 0)).slice(0, 3)
          : mine.filter((p) => p.position === "QB" && (p.stats["passYds"] ?? 0) > 0).slice(0, 1);
      const chosen = new Map([...byImpact, ...extra].map((p) => [p.id, p]));
      for (const raw of chosen.values()) candidates.push({ raw, gameId: String(ev.id), opp: totals.get(oppId) ?? {}, date });
    }
  }

  const players = (
    await pool(candidates, 16, async (c): Promise<PlayerGameInput | null> => {
      const [avg, log] = await Promise.all([
        seasonAvg(sport, c.raw.id),
        sport === "NBA" ? nbaGameLog(c.raw.id, c.gameId) : Promise.resolve(null),
      ]);
      if (!avg) return null;
      return {
        sport, date: c.date, gameId: c.gameId, playerId: c.raw.id, name: c.raw.name,
        teamId: c.raw.teamId, team: c.raw.team, position: c.raw.position,
        ...(c.raw.image ? { image: c.raw.image } : {}),
        ...(c.raw.stats["min"] ? { minutes: c.raw.stats["min"] } : {}),
        stats: c.raw.stats, seasonAvg: avg, opponentTotals: c.opp,
        starRating: starRating(sport, c.raw.position, avg),
        ...(log?.last5Avg ? { last5Avg: log.last5Avg } : {}),
        ...(log?.seasonLow ? { seasonLow: log.seasonLow } : {}),
        ...(log && log.streak >= 3 ? { streak: `Zijn ${log.streak}e wedstrijd op rij met 30+ punten.` } : {}),
      };
    })
  ).filter((p): p is PlayerGameInput => !!p);

  return { games, players, slate: { sport, label: slate.label, date: slate.date } };
}

let cache: { at: number; value: BriefInput } | null = null;
const TTL = 10 * 60 * 1000;

export async function loadLiveBriefInput(): Promise<BriefInput> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;
  const [nba, nfl] = await Promise.all([sportInput("NBA"), sportInput("NFL")]);
  const value: BriefInput = {
    date: new Date().toISOString().slice(0, 10),
    games: [...nba.games, ...nfl.games],
    players: [...nba.players, ...nfl.players],
    slates: [nba.slate, nfl.slate],
  };
  if (value.games.length) cache = { at: Date.now(), value };
  return value;
}
