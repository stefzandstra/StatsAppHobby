import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GitCompareArrows } from "lucide-react";
import type { CSSProperties } from "react";

import { Empty, FavButton, PageError, SectionTitle, StatTable } from "@/components/nba/ui";
import { useFavorites } from "@/hooks/use-favorites";
import type { LeagueId } from "@/lib/leagues";
import { getPlayerStats } from "@/lib/sports.functions";
import { teamColor } from "@/lib/team-colors";

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
    const title = loaderData
      ? `${name}: statistieken & carrière — Statline`
      : "Speler niet beschikbaar";
    const description = loaderData
      ? `Seizoenshoogtepunten en carrièrestatistieken van ${name}, seizoen per seizoen.`
      : "Deze spelerspagina kon niet worden geladen.";
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
  errorComponent: ({ error }) => <PageError what="Deze speler" error={error} />,
  notFoundComponent: () => <Empty>Speler niet gevonden.</Empty>,
});

function PlayerPage() {
  const { league: rawLeague, playerId } = Route.useParams();
  const league = rawLeague as LeagueId;
  const { player, highlights, highlightTitle, seasonLabel, categories } = useSuspenseQuery(
    playerQuery(league, playerId),
  ).data;
  const { isPlayerFav, togglePlayer } = useFavorites(league);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <section
        className="surface dash-player-bg relative mb-8 overflow-hidden"
        style={{ "--tc": teamColor(player.teamColor, player.teamAltColor) } as CSSProperties}
      >
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: teamColor(player.teamColor, player.teamAltColor) }}
        />
        <div className="flex items-end gap-4 px-4 pt-6 sm:gap-6 sm:px-8">
          {player.headshot ? (
            <img
              src={player.headshot}
              alt=""
              className="h-28 w-36 shrink-0 object-cover object-top sm:h-40 sm:w-52"
            />
          ) : (
            <div className="mb-6 grid size-24 shrink-0 place-items-center rounded-full bg-secondary text-2xl font-bold">
              {player.name.slice(0, 2)}
            </div>
          )}
          <div className="min-w-0 flex-1 pb-5">
            <p className="eyebrow mb-1">
              {[player.position, player.jersey && `#${player.jersey}`]
                .filter(Boolean)
                .join(" · ") || "Speler"}
            </p>
            <h1 className="text-3xl font-bold uppercase leading-none sm:text-5xl">{player.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {player.teamId ? (
                <Link
                  to="/$league/teams/$teamId"
                  params={{ league, teamId: player.teamId }}
                  className="underline-offset-4 hover:underline"
                >
                  {player.teamName}
                </Link>
              ) : (
                (player.teamName ?? "Clubloos")
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border bg-card/60 px-4 py-2 sm:px-8">
          <FavButton
            active={isPlayerFav(player.id)}
            onClick={() =>
              togglePlayer({ id: player.id, name: player.name, headshot: player.headshot })
            }
            label={`${player.name} als favoriet`}
          />
          <span className="text-sm text-muted-foreground">
            {isPlayerFav(player.id) ? "Favoriet" : "Volgen"}
          </span>
          <Link
            to="/$league/compare"
            params={{ league }}
            search={{ a: player.id, b: undefined }}
            className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <GitCompareArrows className="size-4" /> Vergelijk
          </Link>
        </div>
      </section>

      {highlights.length ? (
        <section className="mb-8">
          <SectionTitle eyebrow={seasonLabel ?? "Seizoen"} title={highlightTitle} />
          <dl className="surface grid grid-cols-3 divide-border sm:grid-cols-6 sm:divide-x">
            {highlights.map((h) => (
              <div key={h.label} className="px-3 py-4 text-center">
                <dt className="eyebrow">{h.label}</dt>
                <dd className="stat-num mt-1 font-display text-3xl font-bold leading-none sm:text-4xl">
                  {h.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {categories.length ? (
        categories.map((c) => (
          <section key={c.name} className="mb-8">
            <SectionTitle eyebrow="Carrière" title={c.name} />
            <div className="surface px-4 pb-2 pt-1">
              <StatTable
                firstColHeader="Seizoen"
                labels={c.labels}
                rows={c.rows.map((h, i) => ({
                  key: `${h.season}-${i}`,
                  label: <span className="stat-num font-medium">{h.season}</span>,
                  stats: h.stats,
                }))}
              />
            </div>
          </section>
        ))
      ) : (
        <Empty>Geen seizoensstatistieken beschikbaar voor deze speler.</Empty>
      )}
    </main>
  );
}
