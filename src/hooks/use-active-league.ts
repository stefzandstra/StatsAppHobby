import { useEffect, useState } from "react";

import { LEAGUE_IDS, type LeagueId } from "@/lib/leagues";

const KEY = "statline.activeLeague";
const EVENT = "statline-active-league-changed";

export function getActiveLeague(): LeagueId {
  if (typeof window === "undefined") return "nba";
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw && (LEAGUE_IDS as string[]).includes(raw)) return raw as LeagueId;
  } catch {
    /* storage unavailable */
  }
  return "nba";
}

export function setActiveLeague(league: LeagueId) {
  try {
    window.localStorage.setItem(KEY, league);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Returns the remembered league, or null until the client has hydrated. */
export function useActiveLeague(): LeagueId | null {
  const [league, setLeague] = useState<LeagueId | null>(null);

  useEffect(() => {
    const update = () => setLeague(getActiveLeague());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return league;
}
