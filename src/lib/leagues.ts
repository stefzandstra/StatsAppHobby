export const LEAGUES = {
  nba: {
    id: "nba",
    name: "NBA",
    full: "National Basketball Association",
    sport: "basketball",
    blurb: "Box scores, player lines and season averages for all 30 teams.",
    periodPrefix: "Q",
    periods: 4,
  },
  nfl: {
    id: "nfl",
    name: "NFL",
    full: "National Football League",
    sport: "football",
    blurb: "Weekly results, passing, rushing and receiving box scores for all 32 teams.",
    periodPrefix: "Q",
    periods: 4,
  },
} as const;

export type LeagueId = keyof typeof LEAGUES;
export const LEAGUE_IDS = Object.keys(LEAGUES) as LeagueId[];

export function isLeague(v: unknown): v is LeagueId {
  return typeof v === "string" && v in LEAGUES;
}
