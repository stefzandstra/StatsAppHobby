/** Generic Daily Brief model — shared by every sport and every frontend card. */

export type Sport = "NBA" | "NFL";
export type SportFilter = Sport | "ALL";

export type HighlightType =
  | "performance"
  | "hot"
  | "cold"
  | "wtf"
  | "game"
  | "trend_up"
  | "trend_down"
  | "news";

export interface SportsHighlight {
  id: string;
  sport: Sport;
  type: HighlightType;
  title: string;
  subject: string;
  subtitle?: string;
  primaryStat?: string;
  secondaryStats?: string[];
  /** One sentence for the first scan layer. */
  explanation: string;
  /** "Waarom is dit bijzonder?" layer. */
  detail?: string;
  /** Short line for the Morning Brief. */
  briefLine: string;
  importanceScore: number;
  surpriseScore?: number;
  playerId?: string;
  gameId?: string;
  teamIds?: string[];
  image?: string;
  date: string;
}

export type StatLine = Record<string, number>;

export interface TeamScore {
  id: string;
  abbr: string;
  name: string;
  score: number;
}

export interface GameInput {
  sport: Sport;
  date: string;
  gameId: string;
  home: TeamScore;
  away: TeamScore;
  stage: "playoffs" | "regular" | "preseason";
  overtimePeriods?: number;
  /** Largest deficit the winner came back from. */
  comebackPoints?: number;
  /** Seconds left when the deciding score happened. */
  decidedWithSecondsLeft?: number;
  upset?: boolean;
  rivalry?: boolean;
  label?: string;
  summary?: string;
  notes?: string;
}

export interface PlayerGameInput {
  sport: Sport;
  date: string;
  gameId: string;
  playerId: string;
  name: string;
  teamId: string;
  team: string;
  position: string;
  image?: string;
  minutes?: number;
  stats: StatLine;
  seasonAvg: StatLine;
  last5Avg?: StatLine;
  seasonLow?: StatLine;
  opponentTotals?: StatLine;
  /** 0–1: how well-known/important the player is. Never a hard gate for Performance. */
  starRating: number;
  streak?: string;
  notes?: string;
}

export interface TeamTrendInput {
  sport: Sport;
  date: string;
  teamId: string;
  subject: string;
  unit: string;
  recent: number;
  season: number;
  games: number;
  explanation: string;
  notes?: string;
}

export interface NewsInput {
  sport: Sport;
  date: string;
  id: string;
  subject: string;
  subtitle?: string;
  primaryStat?: string;
  secondaryStats?: string[];
  explanation: string;
  notes?: string;
  /** 0–100 editorial impact. */
  impact: number;
  teamIds?: string[];
  playerId?: string;
}

export interface BriefInput {
  date: string;
  games: GameInput[];
  players: PlayerGameInput[];
  teamTrends?: TeamTrendInput[];
  news?: NewsInput[];
  /** Which slate each sport's data comes from (e.g. "week 3"). */
  slates?: { sport: Sport; label: string; date: string }[];
}

/** Prepared for later personalisation; only lightly used for now. */
export interface BriefPreferences {
  leagues?: Sport[];
  teamIds?: string[];
  playerIds?: string[];
}

export interface DailyBriefResult {
  date: string;
  sport: SportFilter;
  readTime: number;
  gamesPlayed: number;
  summary: string[];
  /** Ultra-short, dynamically composed recap shown above the cards. */
  morning: MorningBrief;
  highlights: SportsHighlight[];
}

export interface MorningBrief {
  headline: string;
  lines: { type: HighlightType; sport: Sport; text: string }[];
  outro: string;
  seconds: number;
}
