import type { BriefInput, GameInput, PlayerGameInput } from "@/lib/highlights/types";

/** Raw mock sport data (phase 2). The HighlightEngine decides what becomes a highlight. */
const DATE = "2026-10-01";
const nbaImg = (id: string) => `https://a.espncdn.com/i/headshots/nba/players/full/${id}.png`;
const nflImg = (id: string) => `https://a.espncdn.com/i/headshots/nfl/players/full/${id}.png`;

const t = (id: string, abbr: string, name: string, score: number) => ({ id, abbr, name, score });

const games: GameInput[] = [
  { sport: "NBA", date: DATE, gameId: "nba-1", stage: "regular", home: t("den", "DEN", "Nuggets", 118), away: t("lal", "LAL", "Lakers", 109) },
  { sport: "NBA", date: DATE, gameId: "nba-2", stage: "regular", home: t("sas", "SAS", "Spurs", 112), away: t("phx", "PHX", "Suns", 101) },
  { sport: "NBA", date: DATE, gameId: "nba-3", stage: "regular", home: t("bos", "BOS", "Celtics", 98), away: t("mia", "MIA", "Heat", 107) },
  { sport: "NBA", date: DATE, gameId: "nba-4", stage: "regular", home: t("nyk", "NYK", "Knicks", 115), away: t("chi", "CHI", "Bulls", 104) },
  { sport: "NBA", date: DATE, gameId: "nba-5", stage: "regular", home: t("min", "MIN", "Timberwolves", 121), away: t("okc", "OKC", "Thunder", 117) },
  { sport: "NBA", date: DATE, gameId: "nba-6", stage: "regular", home: t("mil", "MIL", "Bucks", 110), away: t("atl", "ATL", "Hawks", 99) },
  { sport: "NBA", date: DATE, gameId: "nba-7", stage: "regular", home: t("dal", "DAL", "Mavericks", 104), away: t("hou", "HOU", "Rockets", 108) },
  { sport: "NBA", date: DATE, gameId: "nba-8", stage: "regular", home: t("gsw", "GSW", "Warriors", 119), away: t("sac", "SAC", "Kings", 112) },
  {
    sport: "NFL", date: DATE, gameId: "nfl-1", stage: "regular", rivalry: true, decidedWithSecondsLeft: 13,
    home: t("kc", "KC", "Chiefs", 27), away: t("buf", "BUF", "Bills", 30), label: "AFC heavyweight clash",
    summary: "Buffalo pakte de winst met nog 13 seconden op de klok.",
    notes: "Vier lead changes in het vierde kwart maakten dit de spannendste wedstrijd van de nacht. Josh Allen leidde de beslissende drive over 74 yards.",
  },
  { sport: "NFL", date: DATE, gameId: "nfl-2", stage: "regular", home: t("det", "DET", "Lions", 31), away: t("gb", "GB", "Packers", 17) },
  { sport: "NFL", date: DATE, gameId: "nfl-3", stage: "regular", home: t("phi", "PHI", "Eagles", 13), away: t("dal-nfl", "DAL", "Cowboys", 20) },
  { sport: "NFL", date: DATE, gameId: "nfl-4", stage: "regular", home: t("sf", "SF", "49ers", 24), away: t("sea", "SEA", "Seahawks", 21) },
];

const players: PlayerGameInput[] = [
  {
    sport: "NBA", date: DATE, gameId: "nba-1", playerId: "3112335", name: "Nikola Jokić", teamId: "den", team: "DEN", position: "C",
    image: nbaImg("3112335"), minutes: 31, starRating: 1,
    stats: { pts: 38, reb: 14, ast: 12, stl: 1, blk: 1, tov: 3 },
    seasonAvg: { pts: 26.4, reb: 12.1, ast: 9.0, stl: 1.3, blk: 0.8, tov: 3 },
    notes: "Jokić bepaalde vanaf de eerste minuut het tempo. Dit was zijn zesde triple-double van het seizoen en Denver won zijn minuten met 24 punten.",
  },
  {
    sport: "NBA", date: DATE, gameId: "nba-2", playerId: "5104157", name: "Victor Wembanyama", teamId: "sas", team: "SAS", position: "C",
    image: nbaImg("5104157"), minutes: 33, starRating: 0.9,
    stats: { pts: 22, reb: 11, ast: 3, stl: 1, blk: 9, tov: 2 },
    seasonAvg: { pts: 22.5, reb: 10.6, ast: 3.5, stl: 1.2, blk: 3.6, tov: 3.2 },
    opponentTotals: { blk: 7 },
    notes: "Vijf van zijn negen blocks kwamen in de tweede helft. Tegenstanders schoten slechts 3-uit-14 wanneer Wembanyama de primaire verdediger was.",
  },
  {
    sport: "NBA", date: DATE, gameId: "nba-3", playerId: "4065648", name: "Jayson Tatum", teamId: "bos", team: "BOS", position: "F",
    image: nbaImg("4065648"), minutes: 36, starRating: 0.95,
    stats: { pts: 12, reb: 6, ast: 3, stl: 0, blk: 0, tov: 4, fgm: 4, fga: 18, tpm: 1, tpa: 8 },
    seasonAvg: { pts: 29.1, reb: 8.4, ast: 4.8, stl: 1, blk: 0.6, tov: 2.6 },
    seasonLow: { pts: 14 },
    notes: "Tatum bleef 17 punten onder zijn seizoensgemiddelde. Boston werd met 14 punten overtroffen in zijn minuten op het veld.",
  },
  {
    sport: "NBA", date: DATE, gameId: "nba-1", playerId: "4066457", name: "Austin Reaves", teamId: "lal", team: "LAL", position: "G",
    image: nbaImg("4066457"), minutes: 35, starRating: 0.55,
    stats: { pts: 21, reb: 4, ast: 6, stl: 1, blk: 0, tov: 2 },
    seasonAvg: { pts: 17.2, reb: 4.3, ast: 5.4, stl: 0.9, blk: 0.3, tov: 2.1 },
    last5Avg: { pts: 24.8 },
    notes: "Reaves neemt 4,6 schoten per wedstrijd meer dan zijn seizoensgemiddelde en raakt daarvan 51%. De stijging houdt nu vijf wedstrijden stand.",
  },
  {
    sport: "NBA", date: DATE, gameId: "nba-4", playerId: "3934672", name: "Jalen Brunson", teamId: "nyk", team: "NYK", position: "G",
    minutes: 34, starRating: 0.85,
    stats: { pts: 27, reb: 3, ast: 7, stl: 1, blk: 0, tov: 2 },
    seasonAvg: { pts: 27.8, reb: 3.5, ast: 6.7, stl: 0.9, blk: 0.2, tov: 2.4 },
  },
  {
    sport: "NFL", date: DATE, gameId: "nfl-1", playerId: "3918298", name: "Josh Allen", teamId: "buf", team: "BUF", position: "QB",
    image: nflImg("3918298"), starRating: 1, streak: "Zijn derde wedstrijd op rij met minstens drie touchdowns.",
    stats: { passYds: 327, passTd: 4, int: 0, rushYds: 58, rushTd: 0 },
    seasonAvg: { passYds: 245, passTd: 1.9, int: 0.6, rushYds: 34, rushTd: 0.4 },
    notes: "Allen vond vier verschillende receivers in de endzone en voegde 58 rushing yards toe. Buffalo scoorde op zes van zijn laatste zeven drives.",
  },
  {
    sport: "NFL", date: DATE, gameId: "nfl-2", playerId: "4426385", name: "Amon-Ra St. Brown", teamId: "det", team: "DET", position: "WR",
    starRating: 0.8,
    stats: { rec: 8, recYds: 96, recTd: 1, targets: 10 },
    seasonAvg: { rec: 7.2, recYds: 88, recTd: 0.6, targets: 9.5 },
  },
];

export const MOCK_BRIEF_INPUT: BriefInput = {
  date: DATE,
  games,
  players,
  teamTrends: [
    {
      sport: "NFL", date: DATE, teamId: "phi", subject: "Philadelphia offense", unit: "PPG", recent: 16.3, season: 27.1, games: 3,
      explanation: "Drie weken op rij minder dan 300 total yards.",
      notes: "De offense staat over deze reeks 29e in yards per play en verloor zes turnovers. Het probleem is breder dan één mindere wedstrijd.",
    },
  ],
  news: [
    {
      sport: "NFL", date: DATE, id: "det-record", subject: "Record binnen bereik", subtitle: "Detroit · 6 wins op rij",
      primaryStat: "1 WIN", secondaryStats: ["VAN CLUBRECORD"], impact: 72, teamIds: ["det"],
      explanation: "Detroit kan zondag zijn langste winstreeks evenaren.",
      notes: "De Lions wonnen zes keer op rij en versloegen in die reeks vier teams met een positief record. Zondag wacht een directe divisierivaal.",
    },
  ],
};
