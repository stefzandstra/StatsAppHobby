import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Empty, FavButton, Logo, SectionTitle, StatTable } from "@/components/nba/ui";
import { useFavorites } from "@/hooks/use-favorites";
import type { LeagueId } from "@/lib/leagues";
import { getPlayerStats } from "@/lib/sports.functions";

export const playerQuery = (league: LeagueId, playerId: string) =>
  queryOptions({
    queryKey: ["player", league, playerId],
    queryFn: () => getPlayerStats({ data: { league, playerId } }),
    staleTime: 10 * 60_000,
  });

export const Route = createFileRoute("/$league/player/$playerId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(playerQuery(params.league as LeagueId, params.playerId)),
  head: ({ loaderData }) => {
    const name = loaderData?.player.name ?? "Player";
    const title = loaderData ? `${name} stats & career numbers — Statline` : "Player unavailable";
    const description = loaderData
      ? `${name} season highlights and career stats, season by season.`
      : "This player page could not be loaded.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  component: PlayerPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="mx-auto max-w-6xl p-8 text-sm text-muted-foreground">
      Couldn't load this player: {error instanceof Error ? error.message : String(error)}
    </div>
  ),
  notFoundComponent: () => <Empty>Player not found.</Empty>,
});

function PlayerPage() {
  const { league: rawLeague, playerId } = Route.useParams();
  const league = rawLeague as LeagueId;
  const { player, highlights, highlightTitle, seasonLabel, categories } = useSuspenseQuery(
    playerQuery(league, playerId),
  ).data;
  const { isPlayerFav, togglePlayer } = useFavorites(league);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="surface mb-8 flex flex-wrap items-center gap-4 p-6">
        <Logo src={player.headshot} alt={player.name} size={80} className="rounded-full bg-muted" />
        <div className="min-w-0">
          <h1 className="text-3xl font-bold uppercase">{player.name}</h1>
          <p className="text-sm text-muted-foreground">
            {player.teamId ? (
              <Link
                to="/$league/teams/$teamId"
                params={{ league, teamId: player.teamId }}
                className="hover:underline"
              >
                {player.teamName}
              </Link>
            ) : (
              (player.teamName ?? "Free agent")
            )}
            {player.position ? ` · ${player.position}` : ""}
            {player.jersey ? ` · #${player.jersey}` : ""}
          </p>
        </div>
        <FavButton
          active={isPlayerFav(player.id)}
          onClick={() =>
            togglePlayer({ id: player.id, name: player.name, headshot: player.headshot })
          }
          label={`Favorite ${player.name}`}
          className="ml-auto"
        />
      </div>

      {highlights.length ? (
        <>
          <SectionTitle eyebrow={seasonLabel ?? "Season"} title={highlightTitle} />
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {highlights.map((h) => (
              <div key={h.label} className="surface p-4 text-center">
                <p className="eyebrow">{h.label}</p>
                <p className="stat-num mt-1 text-3xl font-bold text-team">{h.value}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {categories.length ? (
        categories.map((c) => (
          <section key={c.name} className="mb-8">
            <SectionTitle eyebrow="Career" title={c.name} />
            <div className="surface p-4">
              <StatTable
                firstColHeader="Season"
                labels={c.labels}
                rows={c.rows.map((h, i) => ({ key: `${h.season}-${i}`, label: h.season, stats: h.stats }))}
              />
            </div>
          </section>
        ))
      ) : (
        <Empty>No season stats available for this player.</Empty>
      )}
    </main>
  );
}
