import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { Dashboard } from "@/components/dashboard";
import { setActiveLeague } from "@/hooks/use-active-league";
import { LEAGUES, type LeagueId } from "@/lib/leagues";

export const Route = createFileRoute("/$league/favorites")({
  head: ({ params }) => {
    const name = LEAGUES[params.league as LeagueId]?.name ?? "League";
    const title = `My ${name} dashboard — Statline`;
    const description = `A personal ${name} dashboard: latest stats, photos, form and upcoming games for the teams and players you follow.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const league = Route.useParams().league as LeagueId;

  useEffect(() => {
    setActiveLeague(league);
  }, [league]);

  return <Dashboard league={league} />;
}
