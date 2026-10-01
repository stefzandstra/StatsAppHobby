import { createFileRoute } from "@tanstack/react-router";

import { DailyBrief } from "@/components/daily-brief";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Daily Sports Brief — Statline" },
      {
        name: "description",
        content:
          "The NBA and NFL stories, performances and results that matter — understood in about 30 seconds.",
      },
      { property: "og:title", content: "Daily Sports Brief — Statline" },
      {
        property: "og:description",
        content: "Your essential NBA and NFL morning brief, ranked by what matters most.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DailyBrief,
});
