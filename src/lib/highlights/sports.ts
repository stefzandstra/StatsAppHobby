import type { HighlightType, PlayerGameInput, Sport, StatLine } from "./types";

/** Per-sport knowledge. Adding a sport = adding an adapter. */
export interface SportAdapter {
  gameWord: string;
  impact(stats: StatLine): number;
  line(p: PlayerGameInput, type: HighlightType): { primary: string; secondary: string[] };
  short(p: PlayerGameInput): string;
  trendMetric(p: PlayerGameInput): { key: string; unit: string };
  /** Sport-specific wording; return null to use the generic text. */
  describe?(p: PlayerGameInput, type: HighlightType): { explanation: string; detail: string } | null;
}

const v = (s: StatLine, k: string) => s[k] ?? 0;
export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const nba: SportAdapter = {
  gameWord: "NBA",
  impact: (s) =>
    v(s, "pts") + 1.2 * v(s, "reb") + 1.5 * v(s, "ast") + 3 * v(s, "stl") + 3 * v(s, "blk") - v(s, "tov") -
    0.4 * Math.max(0, v(s, "fga") - v(s, "fgm")),
  line: (p, type) => {
    const s = p.stats;
    if (type === "cold")
      return {
        primary: `${v(s, "pts")} PTS`,
        secondary: [`${v(s, "fgm")}/${v(s, "fga")} FG`, `${v(s, "tpm")}/${v(s, "tpa")} 3PT`],
      };
    return { primary: `${v(s, "pts")} · ${v(s, "reb")} · ${v(s, "ast")}`, secondary: ["PTS", "REB", "AST"] };
  },
  short: (p) => `${v(p.stats, "pts")}/${v(p.stats, "reb")}/${v(p.stats, "ast")}`,
  trendMetric: () => ({ key: "pts", unit: "PPG" }),
  describe: (p, type) => {
    const s = p.stats;
    const avg = p.seasonAvg["pts"] ?? 0;
    const diff = Math.round(v(s, "pts") - avg);
    const fga = v(s, "fga");
    const pct = fga ? Math.round((v(s, "fgm") / fga) * 100) : 0;
    const shooting = fga ? `${v(s, "fgm")}/${fga} FG (${pct}%)` : "";
    const pm = s["pm"] !== undefined ? `, ${v(s, "pm") > 0 ? "+" : ""}${v(s, "pm")} plus-minus` : "";
    const doubles = ["pts", "reb", "ast", "stl", "blk"].filter((k) => v(s, k) >= 10).length;
    const mins = p.minutes ? ` in ${p.minutes} minuten` : "";
    const base = `Seizoensgemiddelde: ${fmt(avg)} PTS, ${fmt(p.seasonAvg["reb"] ?? 0)} REB, ${fmt(p.seasonAvg["ast"] ?? 0)} AST.`;
    if (type === "performance" || type === "hot") {
      const explanation =
        type === "hot" && p.streak ? p.streak
        : doubles >= 3 ? `Triple-double${mins}.`
        : v(s, "pts") >= 40 ? `${v(s, "pts")} punten${shooting ? ` op ${shooting}` : ""}.`
        : fga >= 15 && pct >= 60 ? `Extreem efficiënt: ${shooting}.`
        : diff > 0 ? `${diff} punten boven zijn seizoensgemiddelde.`
        : doubles === 2 ? `Double-double${mins}.`
        : "De meest complete statline van de avond.";
      return { explanation, detail: `${p.name}: ${shooting || `${v(s, "pts")} punten`}${pm}. ${base}` };
    }
    if (type === "cold") {
      return {
        explanation: `${diff < 0 ? `${-diff} punten onder` : "Ver onder"} zijn gemiddelde van ${fmt(avg)}.`,
        detail: `${shooting ? `Hij schoot ${shooting}` : "Ver onder zijn niveau"}${mins}${pm}. ${base}`,
      };
    }
    return null;
  },
};

const nfl: SportAdapter = {
  gameWord: "NFL",
  impact: (s) =>
    v(s, "passYds") / 25 + 4 * v(s, "passTd") - 2 * v(s, "int") + v(s, "rushYds") / 10 + 6 * v(s, "rushTd") +
    v(s, "recYds") / 10 + 6 * v(s, "recTd") + 4 * v(s, "sacks") + 5 * v(s, "defInt") + 3 * v(s, "ff") +
    0.5 * v(s, "tackles"),
  line: (p) => {
    const s = p.stats;
    switch (p.position) {
      case "QB":
        return {
          primary: `${v(s, "passYds")} YDS · ${v(s, "passTd")} TD`,
          secondary: [`${v(s, "int")} INT`, ...(v(s, "rushYds") ? [`+ ${v(s, "rushYds")} RUSH YDS`] : [])],
        };
      case "RB":
        return {
          primary: `${v(s, "rushYds")} YDS · ${v(s, "rushTd")} TD`,
          secondary: [`${fmt(v(s, "rushYds") / Math.max(1, v(s, "carries")))} YPC`, `${v(s, "rec")} REC`],
        };
      case "WR":
      case "TE":
        return {
          primary: `${v(s, "recYds")} YDS · ${v(s, "recTd")} TD`,
          secondary: [`${v(s, "rec")} REC`, `${v(s, "targets")} TGT`],
        };
      default:
        return {
          primary: `${v(s, "sacks")} SACKS · ${v(s, "defInt")} INT`,
          secondary: [`${v(s, "tackles")} TKL`, `${v(s, "ff")} FF`],
        };
    }
  },
  short: (p) => nfl.line(p, "performance").primary,
  trendMetric: (p) =>
    p.position === "QB"
      ? { key: "passYds", unit: "YDS/G" }
      : p.position === "RB"
        ? { key: "rushYds", unit: "YDS/G" }
        : p.position === "WR" || p.position === "TE"
          ? { key: "recYds", unit: "YDS/G" }
          : { key: "tackles", unit: "TKL/G" },
  describe: (p, type) => {
    const s = p.stats, a = p.seasonAvg;
    const { key } = nfl.trendMetric(p);
    const diff = Math.round(v(s, key) - (a[key] ?? 0));
    const avgTxt = `Seizoensgemiddelde: ${fmt(a[key] ?? 0)} ${key === "tackles" ? "tackles" : "yards"} per wedstrijd.`;
    let line = "";
    if (p.position === "QB") {
      const pct = v(s, "att") ? Math.round((v(s, "cmp") / v(s, "att")) * 100) : 0;
      line = `${v(s, "cmp")}/${v(s, "att")} (${pct}%), ${v(s, "passYds")} yards, ${v(s, "passTd")} TD, ${v(s, "int")} INT` +
        (v(s, "sacked") ? `, ${v(s, "sacked")}× gesackt` : "") + (s["rtg"] ? `, rating ${fmt(v(s, "rtg"))}` : "") + ".";
      if (type === "cold")
        return {
          explanation: v(s, "int") >= 2 ? `${v(s, "int")} intercepties gegooid.` : `${-diff} yards onder zijn gemiddelde.`,
          detail: `${line} ${avgTxt}`,
        };
      if (type === "performance" || type === "hot")
        return {
          explanation: v(s, "passTd") >= 4 ? `${v(s, "passTd")} touchdownpasses.` :
            pct >= 75 && v(s, "att") >= 20 ? `Chirurgisch: ${pct}% van zijn passes compleet.` :
            diff > 0 ? `${diff} passing yards boven zijn gemiddelde.` : "De sterkste quarterback van de speeldag.",
          detail: `${line} ${avgTxt}`,
        };
    }
    if (p.position === "RB") {
      const ypc = v(s, "rushYds") / Math.max(1, v(s, "carries"));
      line = `${v(s, "carries")} carries voor ${v(s, "rushYds")} yards (${fmt(Math.round(ypc * 10) / 10)} per carry)` +
        (v(s, "rushLong") ? `, langste run ${v(s, "rushLong")}` : "") + (v(s, "rushTd") ? `, ${v(s, "rushTd")} TD` : "") + ".";
    } else if (p.position === "WR" || p.position === "TE") {
      line = `${v(s, "rec")} vangsten uit ${v(s, "targets")} targets, ${v(s, "recYds")} yards` +
        (v(s, "recLong") ? `, langste ${v(s, "recLong")}` : "") + (v(s, "recTd") ? `, ${v(s, "recTd")} TD` : "") + ".";
    } else {
      line = `${v(s, "tackles")} tackles, ${v(s, "sacks")} sacks, ${v(s, "tfl")} TFL, ${v(s, "qbHits")} QB hits, ${v(s, "pd")} passes verdedigd.`;
    }
    if (type === "cold") return { explanation: `${-diff} onder zijn gemiddelde.`, detail: `${line} ${avgTxt}` };
    if (type === "performance" || type === "hot")
      return {
        explanation: diff > 0 ? `${diff} boven zijn seizoensgemiddelde.` : "Een van de grootste impactspelers van de speeldag.",
        detail: `${line} ${avgTxt}`,
      };
    return null;
  },
};

export const SPORT_ADAPTERS: Record<Sport, SportAdapter> = { NBA: nba, NFL: nfl };
