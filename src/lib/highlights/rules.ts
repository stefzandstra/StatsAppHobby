import type { Sport } from "./types";

export interface WtfRule {
  stat: string;
  min: number;
  label: string;
}

/** All detection thresholds live here — tune without touching the engine. */
export const HIGHLIGHT_RULES = {
  maxHighlights: 8,
  readTimeSeconds: 30,
  summaryLines: 4,
  hot: { minDelta: 0.35, minImpact: { NBA: 30, NFL: 18 } as Record<Sport, number> },
  cold: {
    minStarRating: 0.7,
    minDrop: 0.35,
    minMinutes: { NBA: 24, NFL: 0 } as Record<Sport, number>,
  },
  trend: { minChange: 0.25 },
  game: {
    closeMargin: { NBA: 5, NFL: 7 } as Record<Sport, number>,
    comebackMin: { NBA: 20, NFL: 14 } as Record<Sport, number>,
    /** Deciding score inside this window = late winner (NFL: final two minutes). */
    finalSeconds: { NBA: 30, NFL: 120 } as Record<Sport, number>,
  },
  stageWeight: { playoffs: 1.25, regular: 1, preseason: 0.6 },
  rarityBonus: { tripleDouble: 8, wtf: 10 },
  favoriteBoost: 10,
  /** Final ranking = importance + surprise, minus age; then diversity caps. */
  ranking: {
    importanceWeight: 0.75,
    surpriseWeight: 0.25,
    recencyPenaltyPerDay: 6,
    maxPerType: 2,
    /** Share of For You slots a single sport may take. */
    maxSportShare: 0.75,
    /** Guaranteed first: answers the 30-second questions (result, star, flop, wow). */
    mustHave: ["game", "performance", "cold", "wtf"] as const,
  },
  /** Narrative order of the Morning Brief lines. */
  morningOrder: ["game", "performance", "wtf", "hot", "cold", "news", "trend_up", "trend_down"] as const,
  secondsPerLine: 4,
  secondsPerCard: 3,
  wtf: {
    NBA: [
      { stat: "pts", min: 50, label: "PTS" },
      { stat: "reb", min: 20, label: "REBOUNDS" },
      { stat: "ast", min: 15, label: "ASSISTS" },
      { stat: "blk", min: 7, label: "BLOCKS" },
      { stat: "stl", min: 7, label: "STEALS" },
    ],
    NFL: [
      { stat: "passYds", min: 400, label: "PASS YDS" },
      { stat: "passTd", min: 5, label: "PASS TD" },
      { stat: "rushYds", min: 200, label: "RUSH YDS" },
      { stat: "recYds", min: 200, label: "REC YDS" },
      { stat: "defInt", min: 3, label: "INTERCEPTIONS" },
    ],
  } as Record<Sport, WtfRule[]>,
};

export type HighlightRules = typeof HIGHLIGHT_RULES;
