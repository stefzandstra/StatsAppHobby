import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { FavButton, SectionTitle } from "@/components/nba/ui";
import { useFavorites } from "@/hooks/use-favorites";
import { getLeaders } from "@/lib/extras.functions";
import { LEAGUES, type LeagueId } from "@/lib/leagues";

const leadersQuery = (league: LeagueId) =>
  queryOptions({
    queryKey: ["leaders", league],
    queryFn: () => getLeaders({ data: { league } }),
    staleTime: 5 * 60_000,
  });

export const Route = createFileRoute("/$league/leaders")({
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(leadersQuery(params.league as LeagueId));
  },
  head: ({ params }) => {
    const n = LEAGUES[params.league as LeagueId]?.name ?? "League";
    const title = `${n} stat leaders — Statline`;
    const description = `Top ${n} players in every stat category this season.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: Leaders,
});

function Leaders() {
  const { league: raw } = Route.useParams();
  const league = raw as LeagueId;
  const { data, isLoading } = useQuery(leadersQuery(league));
  const { togglePlayer, isPlayerFav } = useFavorites(league);
  const [active, setActive] = useState<string | null>(null);

  const cats = data?.categories ?? [];
  const current = cats.find((c) => c.name === active) ?? null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <SectionTitle
        eyebrow={data ? [data.season, data.seasonType].filter(Boolean).join(" · ") : "Leaders"}
        title={`${LEAGUES[league].name} stat leaders`}
      />
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="surface h-72 animate-pulse" />
          ))}
        </div>
      ) : current ? (
        <div className="surface animate-in fade-in p-4">
          <button onClick={() => setActive(null)} className="mb-3 text-sm font-medium text-team hover:underline">
            ← All categories
          </button>
          <h3 className="mb-4 font-display text-2xl font-bold uppercase">{current.name}</h3>
          <ol className="divide-y divide-border">
            {current.leaders.map((l, i) => (
              <LeaderRow key={l.id} rank={i + 1} l={l} league={league} fav={isPlayerFav(l.id)} onFav={() => togglePlayer({ id: l.id, name: l.name, headshot: l.headshot })} big />
            ))}
          </ol>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => {
            const top = c.leaders[0]!;
            return (
              <div key={c.name} className="surface animate-in fade-in group flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                <p className="eyebrow">{c.name}</p>
                <div className="mt-3 flex items-center gap-3">
                  {top.headshot ? (
                    <img src={top.headshot} alt={top.name} loading="lazy" className="size-16 rounded-full bg-muted object-cover" />
                  ) : null}
                  <div className="min-w-0">
                    <Link to="/$league/player/$playerId" params={{ league, playerId: top.id }} className="block truncate font-semibold hover:underline">
                      {top.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{[top.team, top.position].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span className="stat-num ml-auto text-3xl font-bold text-team">{top.value}</span>
                </div>
                <ol className="mt-3 flex-1 divide-y divide-border/60">
                  {c.leaders.slice(1, 5).map((l, i) => (
                    <LeaderRow key={l.id} rank={i + 2} l={l} league={league} fav={isPlayerFav(l.id)} onFav={() => togglePlayer({ id: l.id, name: l.name, headshot: l.headshot })} />
                  ))}
                </ol>
                <button onClick={() => setActive(c.name)} className="mt-3 self-start text-sm font-medium text-team hover:underline">
                  Top 10 →
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function LeaderRow({
  rank, l, league, fav, onFav, big,
}: {
  rank: number;
  l: { id: string; name: string; headshot: string | null; value: string; position: string; team: string };
  league: LeagueId;
  fav: boolean;
  onFav: () => void;
  big?: boolean;
}) {
  return (
    <li className="flex items-center gap-2 py-1.5 text-sm">
      <span className="stat-num w-5 text-muted-foreground">{rank}</span>
      {big && l.headshot ? <img src={l.headshot} alt={l.name} loading="lazy" className="size-9 rounded-full bg-muted object-cover" /> : null}
      <Link to="/$league/player/$playerId" params={{ league, playerId: l.id }} className="min-w-0 flex-1 truncate hover:underline">
        {l.name} <span className="text-xs text-muted-foreground">{l.team}</span>
      </Link>
      <span className="stat-num font-medium">{l.value}</span>
      <FavButton active={fav} onClick={onFav} label={`Favorite ${l.name}`} />
    </li>
  );
}
