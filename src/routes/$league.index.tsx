import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { GameCardItem } from "@/components/nba/game-card";
import { Empty, SectionTitle } from "@/components/nba/ui";
import { isLeague, LEAGUES, type LeagueId } from "@/lib/leagues";
import { getScoreboard } from "@/lib/sports.functions";

const scoreboardQuery = (league: LeagueId, slate: string) =>
  queryOptions({
    queryKey: ["scoreboard", league, slate],
    queryFn: () => getScoreboard({ data: { league, slate } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/$league/")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search["date"] === "string" && search["date"] ? { date: search["date"] } : {}),
  }),
  loaderDeps: ({ search }) => ({ date: search.date ?? "" }),
  loader: ({ context, deps, params }) =>
    isLeague(params.league)
      ? context.queryClient.ensureQueryData(scoreboardQuery(params.league, deps.date))
      : null,
  head: ({ params }) => {
    const name = isLeague(params.league) ? LEAGUES[params.league].name : "League";
    const title = `${name} games & scores — Statline`;
    const description = `Browse played ${name} games with final scores and links to full box scores.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: Games,
  errorComponent: ({ error }) => (
    <div role="alert" className="mx-auto max-w-6xl p-8 text-sm text-muted-foreground">
      Couldn't load games right now: {error instanceof Error ? error.message : String(error)}
    </div>
  ),
});

function Games() {
  const league = Route.useParams().league as LeagueId;
  const { date = "" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data } = useSuspenseQuery(scoreboardQuery(league, date));
  const unit = data.mode === "week" ? "week" : "day";

  const go = (d?: string | null) => {
    navigate({ search: d ? { date: d } : {} });
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="surface mb-8 overflow-hidden">
        <div className="bg-team px-6 py-8 text-white">
          <p className="eyebrow !text-white/70">
            {LEAGUES[league].name} · {data.subtitle}
          </p>
          <h1 className="mt-1 text-4xl font-bold uppercase sm:text-5xl">{data.title}</h1>
          <p className="mt-2 text-sm text-white/80">
            {data.games.length} {data.games.length === 1 ? "game" : "games"} on the schedule
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            disabled={!data.prev}
            onClick={() => go(data.prev)}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm font-medium disabled:opacity-40"
          >
            <ChevronLeft className="size-4" /> Previous {unit}
          </button>
          {data.mode === "day" ? (
            <input
              type="date"
              value={`${data.slate.slice(0, 4)}-${data.slate.slice(4, 6)}-${data.slate.slice(6, 8)}`}
              onChange={(e) => go(e.target.value.replaceAll("-", ""))}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-sm"
            />
          ) : (
            <button
              type="button"
              onClick={() => go()}
              className="rounded-full border border-border px-3 py-1.5 text-sm font-medium"
            >
              Current week
            </button>
          )}
          <button
            type="button"
            disabled={!data.next}
            onClick={() => go(data.next)}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm font-medium disabled:opacity-40"
          >
            Next {unit} <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <SectionTitle eyebrow="Scoreboard" title="Games" />
      {data.games.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.games.map((g) => (
            <GameCardItem key={g.id} game={g} league={league} />
          ))}
        </div>
      ) : (
        <Empty>
          No {LEAGUES[league].name} games in this {unit}.{" "}
          <button
            type="button"
            onClick={() => go()}
            className="font-medium text-team hover:underline"
          >
            Jump to the latest games
          </button>
          .
        </Empty>
      )}
    </main>
  );
}
