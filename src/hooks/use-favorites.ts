import { useCallback, useEffect, useState } from "react";

import type { LeagueId } from "@/lib/leagues";

export type FavTeam = { id: string; name: string; logo?: string | null; color?: string | null };
export type FavPlayer = { id: string; name: string; headshot?: string | null };

const THEME_KEY = "nba.theme.team";
const EVENT = "sports-favorites-changed";
const teamsKey = (l: LeagueId) => `${l}.favorites.teams`;
const playersKey = (l: LeagueId) => `${l}.favorites.players`;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function applyTeamTheme(color?: string | null, altColor?: string | null) {
  if (typeof document === "undefined") return;
  let style = document.getElementById("team-theme") as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "team-theme";
    document.head.appendChild(style);
  }
  if (color) {
    const c = color.replace("#", "");
    const a = (altColor || color).replace("#", "");
    style.textContent = `:root{--team:#${c};--team-accent:#${a}}`;
  } else {
    style.textContent = "";
  }
}

export type ThemeTeam = {
  id: string;
  name: string;
  color: string;
  altColor: string;
  league?: LeagueId;
} | null;

export function useFavorites(league: LeagueId) {
  const [teams, setTeams] = useState<FavTeam[]>([]);
  const [players, setPlayers] = useState<FavPlayer[]>([]);
  const [themeTeam, setThemeTeam] = useState<ThemeTeam>(null);
  const [ready, setReady] = useState(false);

  const sync = useCallback(() => {
    setTeams(read<FavTeam[]>(teamsKey(league), []));
    setPlayers(read<FavPlayer[]>(playersKey(league), []));
    setThemeTeam(read<ThemeTeam>(THEME_KEY, null));
  }, [league]);

  useEffect(() => {
    sync();
    setReady(true);
    const onChange = () => sync();
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [sync]);

  const toggleTeam = useCallback(
    (team: FavTeam) => {
      const current = read<FavTeam[]>(teamsKey(league), []);
      const next = current.some((t) => t.id === team.id)
        ? current.filter((t) => t.id !== team.id)
        : [...current, team];
      write(teamsKey(league), next);
    },
    [league],
  );

  const togglePlayer = useCallback(
    (player: FavPlayer) => {
      const current = read<FavPlayer[]>(playersKey(league), []);
      const next = current.some((p) => p.id === player.id)
        ? current.filter((p) => p.id !== player.id)
        : [...current, player];
      write(playersKey(league), next);
    },
    [league],
  );

  const chooseTheme = useCallback(
    (value: ThemeTeam) => {
      write(THEME_KEY, value ? { ...value, league } : null);
      applyTeamTheme(value?.color ?? null, value?.altColor ?? null);
    },
    [league],
  );

  return {
    ready,
    teams,
    players,
    themeTeam,
    toggleTeam,
    togglePlayer,
    chooseTheme,
    isTeamFav: (id: string) => teams.some((t) => t.id === id),
    isPlayerFav: (id: string) => players.some((p) => p.id === id),
  };
}

export { THEME_KEY };
