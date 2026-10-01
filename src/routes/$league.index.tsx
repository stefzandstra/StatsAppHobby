import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { GameCardItem } from "@/components/nba/game-card";
import { Empty, PageError, SectionTitle } from "@/components/nba/ui";
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
    const title = `${name} wedstrijden & uitslagen — Statline`;
    const description = `Gespeelde ${name}-wedstrijden met eindstanden en volledige box scores.`;
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
  errorComponent: ({ error }) => <PageError what="Wedstrijden" error={error} />,
});

function Games() {
  const league = Route.useParams().league as LeagueId;
  const { date = "" } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data } = useSuspenseQuery(scoreboardQuery(league, date));
  const unit = data.mode === "week" ? "week" : "dag";
  const live = data.games.filter((g) => g.state === "in").length;

  const go = (d?: string | null) => {
    navigate({ search: d ? { date: d } : {} });
  };

  const stepClass =
    "inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-border disabled:opacity-35";

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <SectionTitle
        as="h1"
        eyebrow={`${LEAGUES[league].name} · ${data.subtitle}`}
        title={data.title}
      />

      <div className="mb-6 flex items-center gap-2">
        <button
          type="button"
          disabled={!data.prev}
          onClick={() => go(data.prev)}
          aria-label={`Vorige ${unit}`}
          className={stepClass}
        >
          <ChevronLeft className="size-5" />
        </button>
        {data.mode === "day" ? (
          <input
            type="date"
            aria-label="Kies datum"
            value={`${data.slate.slice(0, 4)}-${data.slate.slice(4, 6)}-${data.slate.slice(6, 8)}`}
            onChange={(e) => go(e.target.value.replaceAll("-", ""))}
            className="min-h-11 min-w-0 flex-1 rounded-full bg-secondary px-4 text-sm font-medium sm:flex-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => go()}
            className="min-h-11 flex-1 rounded-full bg-secondary px-4 text-sm font-medium sm:flex-none"
          >
            Huidige week
          </button>
        )}
        <button
          type="button"
          disabled={!data.next}
          onClick={() => go(data.next)}
          aria-label={`Volgende ${unit}`}
          className={stepClass}
        >
          <ChevronRight className="size-5" />
        </button>
        <p className="ml-auto hidden text-sm text-muted-foreground sm:block">
          <span className="stat-num">{data.games.length}</span>{" "}
          {data.games.length === 1 ? "wedstrijd" : "wedstrijden"}
          {live ? <span className="text-live"> · {live} live</span> : null}
        </p>
      </div>

      {data.games.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.games.map((g) => (
            <GameCardItem key={g.id} game={g} league={league} />
          ))}
        </div>
      ) : (
        <Empty>
          Geen {LEAGUES[league].name}-wedstrijden deze {unit}.{" "}
          <button
            type="button"
            onClick={() => go()}
            className="font-semibold text-foreground underline underline-offset-4"
          >
            Naar de laatste wedstrijden
          </button>
        </Empty>
      )}
    </main>
  );
}
