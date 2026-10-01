import { createServerFn } from "@tanstack/react-start";

import type { BriefInput } from "./highlights/types";

/** Real ESPN data, normalised for the HighlightEngine. Returns null if upstream fails. */
export const getDailyBriefInput = createServerFn({ method: "GET" }).handler(
  async (): Promise<BriefInput | null> => {
    try {
      const { loadLiveBriefInput } = await import("./daily-brief.server");
      const input = await loadLiveBriefInput();
      return input.games.length ? input : null;
    } catch (e) {
      console.error("daily brief input failed", e);
      return null;
    }
  },
);
