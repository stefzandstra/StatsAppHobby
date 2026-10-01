import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { GameCardItem } from "@/components/nba/game-card";
import { Empty, FavButton, Logo, PageError, SectionTitle } from "@/components/nba/ui";
import { useFavorites } from "@/hooks/use-favorites";
import type { LeagueId } from "@/lib/leagues";
import { getTeamDetail } from "@/lib/sports.functions";
import { teamColor } from "@/lib/team-colors";

const teamQuery = (league: LeagueId, teamId: string) =>
  queryOptions({
    queryKey: ["team", league, teamId],
    queryFn: () => getTeamDetail({ data: { league, teamId } }),
    staleTime: 10 * 60_000,
  });

export const Route = createFileRoute("/$league/teams/$teamId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(teamQuery(params.league as LeagueId, params.teamId)),
  head: ({ loaderData }) => {
    const name = loaderData?.team.name ?? "Team";
    const title = loaderData
      ? `${name}: selectie & wedstrijden — Statline`
      : "Team niet beschikbaar";
    const description = loaderData
      ? `Selectie, recente uitslagen en box scores van ${name}.`
      : "Deze teampagina kon niet worden geladen.";
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
  errorComponent: ({ error }) => <PageError what="Dit team" error={error} />,
  notFoundComponent: () => <Empty>Team niet gevonden.</Empty>,
});

function TeamPage() {
  const { league: rawLeague, teamId } = Route.useParams();
  const league = rawLeague as LeagueId;
  const { team, players, games, seasonLabel } = useSuspenseQuery(teamQuery(league, teamId)).data;
  const { isTeamFav, toggleTeam, isPlayerFav, togglePlayer, chooseTheme, themeTeam } =
    useFavorites(league);
  const color = teamColor(team.color, team.altColor);
  const accent = teamColor(team.altColor, team.color);
  const inUse = themeTeam?.id === team.id;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <section className="surface relative mb-8 overflow-hidden">
        {/* Full team-color hero, darkened so white text always passes contrast. */}
        <div
          className="relative flex items-center gap-4 p-4 text-white sm:gap-6 sm:p-8"
          style={{
            background: `linear-gradient(0deg, oklch(0 0 0 / 30%), oklch(0 0 0 / 30%)), radial-gradient(120% 140% at 100% 0%, color-mix(in oklab, ${accent} 45%, transparent) 0%, transparent 55%), linear-gradient(135deg, ${color} 0%, color-mix(in oklab, ${color} 55%, black) 100%)`,
          }}
        >
          <span className="grid size-20 shrink-0 place-items-center rounded-full bg-white/90 sm:size-28">
            <Logo src={team.logo} alt={team.abbrev} size={60} className="sm:size-20" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow mb-1 !text-white/75">{seasonLabel ?? "Seizoen"}</p>
            <h1 className="text-3xl font-bold uppercase leading-none sm:text-5xl">{team.name}</h1>
            <p className="stat-num mt-2 text-sm text-white/85">
              {team.record ?? "–"}
              {team.standing ? ` · ${team.standing}` : ""}
            </p>
          </div>
        </div>
        <div className="relative flex items-center gap-2 border-t border-border bg-card/60 px-4 py-2 sm:px-8">
          <FavButton
            active={isTeamFav(team.id)}
            onClick={() =>
              toggleTeam({ id: team.id, name: team.name, logo: team.logo, color: team.color })
            }
            label={`${team.name} volgen`}
          />
          <span className="text-sm text-muted-foreground">
            {isTeamFav(team.id) ? "Je volgt dit team" : "Volgen"}
          </span>
          <button
            type="button"
            aria-pressed={inUse}
            onClick={() =>
              chooseTheme(
                inUse
                  ? null
                  : {
                      id: team.id,
                      name: team.short,
                      color: team.color ?? "1d428a",
                      altColor: team.altColor ?? team.color ?? "f58426",
                    },
              )
            }
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <span className="size-3 rounded-full" style={{ backgroundColor: color }} />
            {inUse ? "Teamkleuren uitzetten" : "Teamkleuren gebruiken"}
          </button>
        </div>
      </section>

      <section className="mb-10">
        <SectionTitle eyebrow="Uitslagen" title="Recente wedstrijden" />
        {games.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((g) => (
              <GameCardItem key={g.id} game={g} league={league} />
            ))}
          </div>
        ) : (
          <Empty>Nog geen wedstrijden voor dit team.</Empty>
        )}
      </section>

      <section>
        <SectionTitle eyebrow={`${players.length} spelers`} title="Selectie" />
        <ul className="surface divide-y divide-border/60 sm:grid sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
          {players.map((p) => (
            <li
              key={p.id}
              className="relative flex min-w-0 items-center gap-3 py-2 pl-4 pr-2 hover:bg-secondary/40"
            >
              <Logo
                src={p.headshot}
                alt={p.name}
                size={40}
                className="rounded-full bg-secondary object-cover"
              />
              <div className="min-w-0 flex-1">
                <Link
                  to="/$league/player/$playerId"
                  params={{ league, playerId: p.id }}
                  className="block truncate font-medium after:absolute after:inset-0 after:content-['']"
                >
                  {p.name}
                </Link>
                <p className="stat-num text-xs text-subtle-foreground">
                  #{p.jersey || "–"} · {p.position || "–"} · {p.height || "–"}
                  {p.age ? ` · ${p.age} jr` : ""}
                </p>
              </div>
              <FavButton
                active={isPlayerFav(p.id)}
                onClick={() => togglePlayer({ id: p.id, name: p.name, headshot: p.headshot })}
                label={`${p.name} als favoriet`}
                className="z-10"
              />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
