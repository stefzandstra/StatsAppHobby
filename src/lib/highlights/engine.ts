import { HIGHLIGHT_RULES, type HighlightRules } from "./rules";
import { fmt, SPORT_ADAPTERS } from "./sports";
import type {
  BriefInput,
  BriefPreferences,
  DailyBriefResult,
  GameInput,
  PlayerGameInput,
  Sport,
  SportFilter,
  SportsHighlight,
} from "./types";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));
const lastName = (name: string) => name.split(" ").slice(-1)[0] ?? name;
const SPORTS: Sport[] = ["NBA", "NFL"];

/** Converts sport data into ranked, standardised highlights. */
export class HighlightEngine {
  constructor(private rules: HighlightRules = HIGHLIGHT_RULES) {}

  build(input: BriefInput, sport: SportFilter = "ALL", prefs: BriefPreferences = {}): DailyBriefResult {
    const inScope = <T extends { sport: Sport }>(items: T[] = []) =>
      items.filter((i) => (sport === "ALL" || i.sport === sport) && (!prefs.leagues || prefs.leagues.includes(i.sport)));

    const games = inScope(input.games);
    const players = inScope(input.players);
    const all: SportsHighlight[] = [];

    for (const s of SPORTS) {
      const sp = players.filter((p) => p.sport === s);
      const sg = games.filter((g) => g.sport === s);
      all.push(...this.performance(sp, sg), ...this.hot(sp), ...this.cold(sp), ...this.wtf(sp, sg));
      all.push(...this.game(sg), ...this.trends(sp));
    }
    all.push(...this.teamTrends(inScope(input.teamTrends)), ...this.news(inScope(input.news)));

    const ranked = this.rank(this.dedupe(all.map((h) => this.personalise(h, prefs))), sport);
    const morning = this.morning(ranked, games, sport);
    const r = this.rules;

    return {
      date: input.date,
      sport,
      readTime: Math.min(r.readTimeSeconds, morning.seconds + ranked.length * r.secondsPerCard),
      gamesPlayed: games.length,
      summary: morning.lines.map((l) => l.text),
      morning,
      highlights: ranked,
    };
  }

  /** Weighted score with recency; then must-have coverage, type and sport caps. */
  private rank(items: SportsHighlight[], sport: SportFilter): SportsHighlight[] {
    const r = this.rules.ranking;
    const newest = Math.max(0, ...items.map((h) => Date.parse(h.date) || 0));
    const score = (h: SportsHighlight) => {
      const days = Math.max(0, (newest - (Date.parse(h.date) || newest)) / 864e5);
      return h.importanceScore * r.importanceWeight + (h.surpriseScore ?? 50) * r.surpriseWeight - days * r.recencyPenaltyPerDay;
    };
    const sorted = [...items].sort((a, b) => score(b) - score(a));
    const max = this.rules.maxHighlights;
    const sportCap = sport === "ALL" ? Math.ceil(max * r.maxSportShare) : max;
    const picked: SportsHighlight[] = [];
    const count = (k: (h: SportsHighlight) => boolean) => picked.filter(k).length;
    const fits = (h: SportsHighlight) =>
      !picked.includes(h) &&
      count((p) => p.type === h.type) < r.maxPerType &&
      count((p) => p.sport === h.sport) < sportCap;
    for (const t of r.mustHave) {
      const h = sorted.find((x) => x.type === t && fits(x));
      if (h && picked.length < max) picked.push(h);
    }
    for (const h of sorted) if (picked.length < max && fits(h)) picked.push(h);
    for (const h of sorted) if (picked.length < max && !picked.includes(h)) picked.push(h);
    return picked.sort((a, b) => score(b) - score(a)).map((h) => ({ ...h, importanceScore: clamp(score(h)) }));
  }

  /** Composes the Morning Brief from the strongest story per category. */
  private morning(ranked: SportsHighlight[], games: GameInput[], sport: SportFilter) {
    const r = this.rules;
    const order = r.morningOrder as readonly string[];
    const seen = new Set<string>();
    const lines = [...ranked]
      .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))
      .filter((h) => {
        const k = h.type.startsWith("trend") ? "trend" : h.type;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, r.summaryLines)
      .map((h) => ({ type: h.type, sport: h.sport, text: sport === "ALL" ? `${h.briefLine} (${h.sport})` : h.briefLine }));
    const per = SPORTS.map((s) => [s, games.filter((g) => g.sport === s).length] as const).filter(([, n]) => n);
    const headline = per.length
      ? per.map(([s, n]) => `${n} ${s}-${n === 1 ? "wedstrijd" : "wedstrijden"}`).join(" · ")
      : "Geen wedstrijden gespeeld";
    const seconds = 4 + lines.length * r.secondsPerLine;
    const label = sport === "ALL" ? "sportnacht" : `${sport}-nacht`;
    return { headline, lines, outro: `Dat was je ${label} in ${seconds} seconden.`, seconds };
  }

  private base(p: PlayerGameInput) {
    return {
      sport: p.sport,
      subject: p.name,
      subtitle: `${p.team} · ${p.position}`,
      playerId: p.playerId,
      gameId: p.gameId,
      teamIds: [p.teamId],
      date: p.date,
      ...(p.image ? { image: p.image } : {}),
    };
  }

  private delta(p: PlayerGameInput) {
    const a = SPORT_ADAPTERS[p.sport];
    const expected = a.impact(p.seasonAvg);
    return (a.impact(p.stats) - expected) / Math.max(expected, 5);
  }

  private isTripleDouble(p: PlayerGameInput) {
    return p.sport === "NBA" && ["pts", "reb", "ast", "stl", "blk"].filter((k) => (p.stats[k] ?? 0) >= 10).length >= 3;
  }

  private performance(players: PlayerGameInput[], games: GameInput[]): SportsHighlight[] {
    if (!players.length) return [];
    const a = SPORT_ADAPTERS[players[0]!.sport];
    const best = [...players].sort((x, y) => a.impact(y.stats) - a.impact(x.stats))[0]!;
    const game = games.find((g) => g.gameId === best.gameId);
    const td = this.isTripleDouble(best);
    const line = a.line(best, "performance");
    const said = a.describe?.(best, "performance");
    const score = 70 + Math.min(18, a.impact(best.stats) / 4) + best.starRating * 6 + (td ? this.rules.rarityBonus.tripleDouble : 0);
    return [
      {
        ...this.base(best),
        id: `perf-${best.playerId}`,
        type: "performance",
        title: "Performance of the night",
        ...(game ? { subtitle: `${game.home.abbr} ${game.home.score} — ${game.away.abbr} ${game.away.score}` } : {}),
        primaryStat: line.primary,
        secondaryStats: line.secondary,
        explanation: said?.explanation ?? (td
          ? `Een triple-double${best.minutes ? ` in slechts ${best.minutes} minuten` : ""}.`
          : "De beste individuele prestatie van de nacht."),
        detail: best.notes ?? said?.detail ?? `${best.name} kwam ${Math.round(this.delta(best) * 100)}% boven zijn normale productie uit.`,
        briefLine: `${lastName(best.name)} domineerde met ${a.short(best)}`,
        importanceScore: clamp(score * this.stage(game)),
        surpriseScore: clamp(50 + this.delta(best) * 50),
      },
    ];
  }

  private hot(players: PlayerGameInput[]): SportsHighlight[] {
    const r = this.rules.hot;
    const hits = players
      .filter((p) => this.delta(p) >= r.minDelta && SPORT_ADAPTERS[p.sport].impact(p.stats) >= r.minImpact[p.sport])
      .sort((x, y) => this.delta(y) - this.delta(x));
    return hits.slice(0, 1).map((p) => {
      const line = SPORT_ADAPTERS[p.sport].line(p, "hot");
      const d = this.delta(p);
      const said = SPORT_ADAPTERS[p.sport].describe?.(p, "hot");
      return {
        ...this.base(p),
        id: `hot-${p.playerId}`,
        type: "hot",
        title: "Hot",
        primaryStat: line.primary,
        secondaryStats: line.secondary,
        explanation: said?.explanation ?? p.streak ?? `${Math.round(d * 100)}% boven zijn normale niveau.`,
        detail: p.notes ?? said?.detail ?? `Ver boven zijn seizoensgemiddelde in vrijwel elke categorie.`,
        briefLine: `${lastName(p.name)} was hot: ${line.primary}`,
        importanceScore: clamp(70 + d * 25 + p.starRating * 10),
        surpriseScore: clamp(50 + d * 50),
      };
    });
  }

  private cold(players: PlayerGameInput[]): SportsHighlight[] {
    const r = this.rules.cold;
    // Relative to the player: only established players with real minutes and a big drop.
    const hits = players
      .filter(
        (p) =>
          p.starRating >= r.minStarRating &&
          (p.minutes ?? 99) >= r.minMinutes[p.sport] &&
          this.delta(p) <= -r.minDrop,
      )
      .sort((x, y) => this.delta(x) * x.starRating - this.delta(y) * y.starRating);
    return hits.slice(0, 1).map((p) => {
      const line = SPORT_ADAPTERS[p.sport].line(p, "cold");
      const pts = p.stats["pts"];
      const low = p.seasonLow?.["pts"];
      const isLow = pts !== undefined && low !== undefined && pts <= low;
      const said = SPORT_ADAPTERS[p.sport].describe?.(p, "cold");
      const below = pts !== undefined ? Math.round((p.seasonAvg["pts"] ?? 0) - pts) : 0;
      return {
        ...this.base(p),
        id: `cold-${p.playerId}`,
        type: "cold",
        title: "Cold",
        primaryStat: line.primary,
        secondaryStats: line.secondary,
        explanation: isLow
          ? `Zijn laagste score van het seizoen${p.minutes ? ` in ${p.minutes} minuten` : ""}.`
          : (said?.explanation ?? "Ver onder zijn normale productie."),
        detail: p.notes ?? said?.detail ?? (below > 0 ? `${p.name} bleef ${below} punten onder zijn seizoensgemiddelde.` : "Ver onder zijn normale niveau."),
        briefLine: `${lastName(p.name)} viel tegen: ${line.secondary[0] ?? line.primary}`,
        importanceScore: clamp(60 + Math.abs(this.delta(p)) * 30 + p.starRating * 15),
        surpriseScore: clamp(50 + Math.abs(this.delta(p)) * 50),
      };
    });
  }

  private wtf(players: PlayerGameInput[], games: GameInput[]): SportsHighlight[] {
    const out: SportsHighlight[] = [];
    for (const p of players) {
      for (const rule of this.rules.wtf[p.sport]) {
        const value = p.stats[rule.stat] ?? 0;
        if (value < rule.min) continue;
        const opp = p.opponentTotals?.[rule.stat];
        out.push({
          ...this.base(p),
          id: `wtf-${p.playerId}-${rule.stat}`,
          type: "wtf",
          title: "WTF stat",
          primaryStat: `${value} ${rule.label}`,
          ...(opp !== undefined ? { secondaryStats: [`tegenstander: ${opp}`] } : {}),
          explanation:
            opp !== undefined && opp < value
              ? `Meer ${rule.label.toLowerCase()} dan het complete andere team bij elkaar.`
              : `Een zeldzame grens van ${rule.min}+ ${rule.label.toLowerCase()}.`,
          ...(p.notes ? { detail: p.notes } : {}),
          briefLine: `${lastName(p.name)} had ${value} ${rule.label.toLowerCase()}`,
          importanceScore: clamp(75 + (value / rule.min - 1) * 40 + p.starRating * 5 + this.rules.rarityBonus.wtf),
          surpriseScore: 95,
        });
      }
    }
    for (const g of games) {
      if ((g.comebackPoints ?? 0) < this.rules.game.comebackMin[g.sport]) continue;
      const [w, l] = g.home.score > g.away.score ? [g.home, g.away] : [g.away, g.home];
      out.push({
        id: `wtf-comeback-${g.gameId}`,
        sport: g.sport,
        type: "wtf",
        title: "WTF stat",
        subject: `${w.name} stond ${g.comebackPoints} achter…`,
        subtitle: `${w.abbr} ${w.score} — ${l.abbr} ${l.score}`,
        primaryStat: `+${w.score - l.score}`,
        explanation: `…en won alsnog met ${w.score - l.score}.`,
        briefLine: `${w.name} kwam terug van −${g.comebackPoints}`,
        importanceScore: clamp(80 + (g.comebackPoints ?? 0) / 2),
        gameId: g.gameId,
        teamIds: [w.id, l.id],
        date: g.date,
      });
    }
    return out;
  }

  private stage(g?: GameInput) {
    return g ? this.rules.stageWeight[g.stage] : 1;
  }

  private gameScore(g: GameInput) {
    const r = this.rules.game;
    const margin = Math.abs(g.home.score - g.away.score);
    let s = 50;
    if (margin <= r.closeMargin[g.sport]) s += 15 - margin;
    if (g.overtimePeriods) s += 10 * g.overtimePeriods;
    if ((g.comebackPoints ?? 0) >= r.comebackMin[g.sport] / 2) s += 8;
    if (g.decidedWithSecondsLeft !== undefined && g.decidedWithSecondsLeft <= r.finalSeconds[g.sport]) s += 15;
    if (g.upset) s += 8;
    if (g.rivalry) s += 6;
    return s * this.rules.stageWeight[g.stage];
  }

  private game(games: GameInput[]): SportsHighlight[] {
    const best = [...games].sort((a, b) => this.gameScore(b) - this.gameScore(a))[0];
    if (!best) return [];
    const [w, l] = best.home.score > best.away.score ? [best.home, best.away] : [best.away, best.home];
    const secs = best.decidedWithSecondsLeft;
    const late = secs !== undefined && secs <= this.rules.game.finalSeconds[best.sport];
    const clock = secs !== undefined ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` : "";
    const tags = [
      late ? (best.sport === "NFL" ? "LATE WINNER" : "GAME-WINNER") : null,
      best.overtimePeriods ? `${best.overtimePeriods > 1 ? best.overtimePeriods : ""}OT` : null,
      best.upset ? "UPSET" : null,
    ].filter((t): t is string => !!t);
    return [
      {
        id: `game-${best.gameId}`,
        sport: best.sport,
        type: "game",
        title: "Game of the night",
        subject: `${w.name} ${w.score} — ${l.name} ${l.score}`,
        ...(best.label ? { subtitle: best.label } : {}),
        primaryStat: late ? clock : `+${w.score - l.score}`,
        secondaryStats: tags,
        explanation:
          best.summary ??
          ((best.comebackPoints ?? 0) >= this.rules.game.comebackMin[best.sport] / 2
            ? `${w.name} kwamen terug van ${best.comebackPoints} punten achterstand.`
            : `${w.name} wonnen met ${w.score - l.score} punten verschil.`),
        ...(best.notes ? { detail: best.notes } : {}),
        briefLine: `${w.name} wonnen ${late ? "met een late winner" : `${w.score}-${l.score}`}`,
        importanceScore: clamp(this.gameScore(best) + 20),
        gameId: best.gameId,
        teamIds: [w.id, l.id],
        date: best.date,
      },
    ];
  }

  private trends(players: PlayerGameInput[]): SportsHighlight[] {
    const out: SportsHighlight[] = [];
    for (const p of players) {
      if (!p.last5Avg) continue;
      const { key, unit } = SPORT_ADAPTERS[p.sport].trendMetric(p);
      const recent = p.last5Avg[key] ?? 0;
      const season = p.seasonAvg[key] ?? 0;
      if (!season) continue;
      const change = (recent - season) / season;
      if (Math.abs(change) < this.rules.trend.minChange) continue;
      const up = change > 0;
      out.push({
        ...this.base(p),
        id: `trend-${p.playerId}`,
        type: up ? "trend_up" : "trend_down",
        title: up ? "Trending up" : "Trending down",
        subtitle: "Laatste 5 wedstrijden",
        primaryStat: `${fmt(recent)} ${unit}`,
        secondaryStats: [`SEIZOEN ${fmt(season)}`, `${up ? "+" : "−"}${Math.abs(Math.round(change * 100))}%`],
        explanation: up ? "Al vijf wedstrijden ruim boven zijn gemiddelde." : "Al vijf wedstrijden onder zijn gemiddelde.",
        detail:
          p.notes ??
          `Laatste 5 wedstrijden: ${fmt(recent)} ${unit}, tegenover ${fmt(season)} over het hele seizoen.`,
        briefLine: `${lastName(p.name)} is ${up ? "al vijf wedstrijden op stoom" : "in een dip"}`,
        importanceScore: clamp(60 + Math.abs(change) * 40 + p.starRating * 10),
      });
    }
    // Max one up and one down per sport: trends support the brief, they don't flood it.
    const pick = (t: string) => out.filter((h) => h.type === t).sort((a, b) => b.importanceScore - a.importanceScore).slice(0, 1);
    return [...pick("trend_up"), ...pick("trend_down")];
  }

  private teamTrends(trends: BriefInput["teamTrends"] = []): SportsHighlight[] {
    return trends.flatMap((t) => {
      const change = (t.recent - t.season) / t.season;
      if (Math.abs(change) < this.rules.trend.minChange) return [];
      const up = change > 0;
      return [
        {
          id: `team-trend-${t.teamId}`,
          sport: t.sport,
          type: up ? "trend_up" : "trend_down",
          title: up ? "Trending up" : "Trending down",
          subject: t.subject,
          subtitle: `Laatste ${t.games} wedstrijden`,
          primaryStat: `${fmt(t.recent)} ${t.unit}`,
          secondaryStats: [`SEIZOEN ${fmt(t.season)}`, `${up ? "+" : "−"}${Math.abs(Math.round(change * 100))}%`],
          explanation: t.explanation,
          ...(t.notes ? { detail: t.notes } : {}),
          briefLine: `${t.subject} ${up ? "in de lift" : "blijft terugvallen"}`,
          importanceScore: clamp(55 + Math.abs(change) * 50),
          teamIds: [t.teamId],
          date: t.date,
        } satisfies SportsHighlight,
      ];
    });
  }

  private news(items: BriefInput["news"] = []): SportsHighlight[] {
    return items.map((n) => ({
      id: `news-${n.id}`,
      sport: n.sport,
      type: "news",
      title: "Need to know",
      subject: n.subject,
      ...(n.subtitle ? { subtitle: n.subtitle } : {}),
      ...(n.primaryStat ? { primaryStat: n.primaryStat } : {}),
      ...(n.secondaryStats ? { secondaryStats: n.secondaryStats } : {}),
      explanation: n.explanation,
      ...(n.notes ? { detail: n.notes } : {}),
      briefLine: n.subject,
      importanceScore: clamp(n.impact),
      ...(n.teamIds ? { teamIds: n.teamIds } : {}),
      ...(n.playerId ? { playerId: n.playerId } : {}),
      date: n.date,
    }));
  }

  /** One card per player/subject: keep the strongest story. */
  private dedupe(items: SportsHighlight[]) {
    const best = new Map<string, SportsHighlight>();
    for (const h of items) {
      const key = h.playerId ? `${h.sport}-${h.playerId}` : h.id;
      const cur = best.get(key);
      if (!cur || h.importanceScore > cur.importanceScore) best.set(key, h);
    }
    return [...best.values()];
  }

  private personalise(h: SportsHighlight, prefs: BriefPreferences): SportsHighlight {
    const fav =
      (h.playerId && prefs.playerIds?.includes(h.playerId)) || h.teamIds?.some((t) => prefs.teamIds?.includes(t));
    return fav ? { ...h, importanceScore: clamp(h.importanceScore + this.rules.favoriteBoost) } : h;
  }
}

export const highlightEngine = new HighlightEngine();

export function buildDailyBrief(input: BriefInput, sport: SportFilter = "ALL", prefs?: BriefPreferences) {
  return highlightEngine.build(input, sport, prefs);
}
