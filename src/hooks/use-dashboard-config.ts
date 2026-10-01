import { useCallback, useEffect, useState } from "react";

export type WidgetId = "players" | "teams" | "upcoming" | "scores";

export const WIDGETS: Record<WidgetId, { label: string; hint: string }> = {
  players: { label: "Spelers in de spotlight", hint: "Foto's, laatste cijfers en carrièretrend" },
  teams: { label: "Teamvorm", hint: "Record, laatste 5 uitslagen en laatste wedstrijd" },
  upcoming: { label: "Hierna", hint: "Volgende wedstrijden van je teams" },
  scores: { label: "Laatste uitslagen", hint: "De meest recente speelronde" },
};

export type DashboardConfig = {
  order: WidgetId[];
  hidden: WidgetId[];
  compact: boolean;
};

const DEFAULT: DashboardConfig = {
  order: ["players", "teams", "upcoming", "scores"],
  hidden: [],
  compact: false,
};
const KEY = "dashboard.config.v1";

export function useDashboardConfig() {
  const [config, setConfig] = useState<DashboardConfig>(DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<DashboardConfig>;
        const order = (saved.order ?? []).filter((w) => w in WIDGETS);
        DEFAULT.order.forEach((w) => !order.includes(w) && order.push(w));
        setConfig({ ...DEFAULT, ...saved, order });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const update = useCallback((fn: (c: DashboardConfig) => DashboardConfig) => {
    setConfig((c) => {
      const next = fn(c);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return {
    config,
    toggle: (w: WidgetId) =>
      update((c) => ({
        ...c,
        hidden: c.hidden.includes(w) ? c.hidden.filter((x) => x !== w) : [...c.hidden, w],
      })),
    move: (w: WidgetId, dir: -1 | 1) =>
      update((c) => {
        const order = [...c.order];
        const i = order.indexOf(w);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= order.length) return c;
        [order[i], order[j]] = [order[j]!, order[i]!];
        return { ...c, order };
      }),
    setCompact: (compact: boolean) => update((c) => ({ ...c, compact })),
    reset: () => update(() => DEFAULT),
  };
}
