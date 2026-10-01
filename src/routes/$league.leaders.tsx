import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState, type CSSProperties } from "react";

import { FavButton, SectionTitle, Skeleton } from "@/components/nba/ui";
import { useFavorites } from "@/hooks/use-favorites";
import { getLeaders } from "@/lib/extras.functions";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { useTeamColors } from "@/hooks/use-team-colors";
import { cn } from "@/lib/utils";

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
    const title = `${n}-statistiekleiders — Statline`;
    const description = `De beste ${n}-spelers in elke statistiekcategorie dit seizoen.`;
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
  const colorOf = useTeamColors([league]);
  const { togglePlayer, isPlayerFav } = useFavorites(league);
  const [active, setActive] = useState<string | null>(null);

  const cats = data?.categories ?? [];
  const current = cats.find((c) => c.name === active) ?? null;
  const fav = (l: Leader) => ({
    fav: isPlayerFav(l.id),
    onFav: () => togglePlayer({ id: l.id, name: l.name, headshot: l.headshot }),
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <SectionTitle
        as="h1"
        eyebrow={data ? [data.season, data.seasonType].filter(Boolean).join(" · ") : "Leiders"}
        title={`${LEAGUES[league].name}-leiders`}
      />
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : current ? (
        <div className="surface animate-in fade-in mx-auto max-w-2xl p-4 sm:p-6">
          <button
            type="button"
            onClick={() => setActive(null)}
            className="-ml-1 mb-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Alle categorieën
          </button>
          <h2 className="mb-2 text-3xl font-bold uppercase">{current.name}</h2>
          <ol className="divide-y divide-border/60">
            {current.leaders.map((l, i) => (
              <LeaderRow
                key={l.id}
                rank={i + 1}
                l={l}
                league={league}
                color={colorOf(league, l.team)}
                {...fav(l)}
                big
              />
            ))}
          </ol>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => {
            const top = c.leaders[0]!;
            return (
              <section
                key={c.name}
                style={{ "--tc": colorOf(league, top.team) } as CSSProperties}
                className="surface team-wash animate-in fade-in relative flex flex-col overflow-hidden p-4"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ backgroundColor: colorOf(league, top.team) }}
                />
                <h2 className="eyebrow font-sans">{c.name}</h2>
                <div className="relative -mx-2 mt-2 flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-secondary/50">
                  {top.headshot ? (
                    <img
                      src={top.headshot}
                      alt=""
                      loading="lazy"
                      className="size-16 shrink-0 rounded-full object-cover ring-2"
                      style={{
                        backgroundColor: `color-mix(in oklab, ${colorOf(league, top.team) ?? "transparent"} 25%, transparent)`,
                        ["--tw-ring-color" as string]: colorOf(league, top.team),
                      }}
                    />
                  ) : (
                    <span className="size-16 shrink-0 rounded-full bg-secondary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/$league/player/$playerId"
                      params={{ league, playerId: top.id }}
                      className="block truncate font-semibold after:absolute after:inset-0 after:content-['']"
                    >
                      {top.name}
                    </Link>
                    <p className="text-xs text-subtle-foreground">
                      {[top.team, top.position].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="stat-num font-display text-4xl font-bold leading-none text-brand">
                    {top.value}
                  </span>
                </div>
                <ol className="mt-3 flex-1 divide-y divide-border/60 border-t border-border/60">
                  {c.leaders.slice(1, 5).map((l, i) => (
                    <LeaderRow
                      key={l.id}
                      rank={i + 2}
                      l={l}
                      league={league}
                      color={colorOf(league, l.team)}
                      {...fav(l)}
                    />
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={() => setActive(c.name)}
                  className="mt-2 inline-flex min-h-11 items-center justify-center gap-1 rounded-full bg-secondary text-sm font-medium transition-colors hover:bg-border"
                >
                  Top 10 bekijken <ArrowRight className="size-4" />
                </button>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

type Leader = {
  id: string;
  name: string;
  headshot: string | null;
  value: string;
  position: string;
  team: string;
};

function LeaderRow({
  rank,
  l,
  league,
  fav,
  onFav,
  big,
  color,
}: {
  rank: number;
  l: Leader;
  league: LeagueId;
  fav: boolean;
  onFav: () => void;
  big?: boolean;
  color?: string | undefined;
}) {
  return (
    <li className={cn("flex items-center gap-3 text-sm", big ? "py-2" : "py-1")}>
      <span className="stat-num w-5 text-right text-xs text-subtle-foreground">{rank}</span>
      <span
        aria-hidden="true"
        className="h-5 w-1 shrink-0 rounded-full bg-border"
        style={{ backgroundColor: color }}
      />
      {big && l.headshot ? (
        <img
          src={l.headshot}
          alt=""
          loading="lazy"
          className="size-10 rounded-full bg-secondary object-cover"
        />
      ) : null}
      <Link
        to="/$league/player/$playerId"
        params={{ league, playerId: l.id }}
        className="min-w-0 flex-1 truncate py-1.5 hover:underline"
      >
        {l.name} <span className="text-xs text-subtle-foreground">{l.team}</span>
      </Link>
      <span className={cn("stat-num font-semibold", rank === 1 && "text-brand")}>{l.value}</span>
      <FavButton active={fav} onClick={onFav} label={`${l.name} als favoriet`} />
    </li>
  );
}
