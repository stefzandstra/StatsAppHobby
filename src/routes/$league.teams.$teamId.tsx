import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { GameCardItem } from "@/components/nba/game-card";
import { Empty, FavButton, Logo, SectionTitle } from "@/components/nba/ui";
import { useFavorites } from "@/hooks/use-favorites";
import type { LeagueId } from "@/lib/leagues";
import { getTeamDetail } from "@/lib/sports.functions";

const teamQuery = (league: LeagueId, teamId: string) =>
  queryOptions({
    queryKey: ["team", league, teamId],
    queryFn: () => getTeamDetail({ data: { league, teamId } }),
    staleTime: 10 * 60_000,
  });

export const Route = createFileRoute("/$league/teams/$teamId")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(teamQuery(params.league as LeagueId, params.teamId)),
  head: ({ loaderData }) => {
    const name = loaderData?.team.name ?? "Team";
    const title = loaderData ? `${name} roster & recent games — Statline` : "Team unavailable";
    const description = loaderData
      ? `${name} roster, recent results and quick links to full box scores.`
      : "This team page could not be loaded.";
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
  component: TeamPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="mx-auto max-w-6xl p-8 text-sm text-muted-foreground">
      Couldn't load this team: {error instanceof Error ? error.message : String(error)}
    </div>
  ),
  notFoundComponent: () => <Empty>Team not found.</Empty>,
});

function TeamPage() {
  const { league: rawLeague, teamId } = Route.useParams();
  const league = rawLeague as LeagueId;
  const { team, players, games, seasonLabel } = useSuspenseQuery(teamQuery(league, teamId)).data;
  const { isTeamFav, toggleTeam, isPlayerFav, togglePlayer, chooseTheme, themeTeam } =
    useFavorites(league);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div
        className="surface mb-8 overflow-hidden"
        style={{ borderTop: `6px solid #${team.color ?? "1d428a"}` }}
      >
        <div className="flex flex-wrap items-center gap-4 p-6">
          <Logo src={team.logo} alt={team.abbrev} size={64} />
          <div className="min-w-0">
            <p className="eyebrow">{seasonLabel ?? "Season"}</p>
            <h1 className="text-3xl font-bold uppercase">{team.name}</h1>
            <p className="text-sm text-muted-foreground">
              {team.record ?? "–"}
              {team.standing ? ` · ${team.standing}` : ""}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                chooseTheme({
                  id: team.id,
                  name: team.short,
                  color: team.color ?? "1d428a",
                  altColor: team.altColor ?? team.color ?? "f58426",
                })
              }
              className="rounded-full border border-border px-3 py-1.5 text-sm font-medium"
            >
              {themeTeam?.id === team.id ? "Colors in use" : "Use team colors"}
            </button>
            <FavButton
              active={isTeamFav(team.id)}
              onClick={() =>
                toggleTeam({ id: team.id, name: team.name, logo: team.logo, color: team.color })
              }
              label={`Favorite ${team.name}`}
            />
          </div>
        </div>
      </div>

      <section className="mb-10">
        <SectionTitle eyebrow="Results" title="Recent games" />
        {games.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((g) => (
              <GameCardItem key={g.id} game={g} league={league} />
            ))}
          </div>
        ) : (
          <Empty>No games listed for this team yet.</Empty>
        )}
      </section>

      <section>
        <SectionTitle eyebrow="Squad" title="Roster" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((p) => (
            <div key={p.id} className="surface flex items-center gap-3 p-3">
              <Logo src={p.headshot} alt={p.name} size={44} className="rounded-full bg-muted" />
              <div className="min-w-0 flex-1">
                <Link
                  to="/$league/player/$playerId"
                  params={{ league, playerId: p.id }}
                  className="block truncate font-semibold hover:underline"
                >
                  {p.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  #{p.jersey || "–"} · {p.position || "–"} · {p.height || "–"}
                  {p.age ? ` · ${p.age} yrs` : ""}
                </p>
              </div>
              <FavButton
                active={isPlayerFav(p.id)}
                onClick={() => togglePlayer({ id: p.id, name: p.name, headshot: p.headshot })}
                label={`Favorite ${p.name}`}
              />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
