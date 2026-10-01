import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Palette } from "lucide-react";

import { Empty, FavButton, Logo, SectionTitle } from "@/components/nba/ui";
import { useFavorites } from "@/hooks/use-favorites";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { getTeams } from "@/lib/sports.functions";

const teamsQuery = (league: LeagueId) =>
  queryOptions({
    queryKey: ["teams", league],
    queryFn: () => getTeams({ data: { league } }),
    staleTime: 24 * 60 * 60_000,
  });

export const Route = createFileRoute("/$league/teams/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(teamsQuery(params.league as LeagueId)),
  head: ({ params }) => {
    const name = LEAGUES[params.league as LeagueId]?.name ?? "League";
    const title = `All ${name} teams — Statline`;
    const description = `Follow any ${name} team, browse its roster and recent games, and use its colors across the app.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: Teams,
  errorComponent: ({ error }) => (
    <div role="alert" className="mx-auto max-w-6xl p-8 text-sm text-muted-foreground">
      Couldn't load teams: {error instanceof Error ? error.message : String(error)}
    </div>
  ),
  notFoundComponent: () => <Empty>No teams found.</Empty>,
});

function Teams() {
  const league = Route.useParams().league as LeagueId;
  const { data: teams } = useSuspenseQuery(teamsQuery(league));
  const { isTeamFav, toggleTeam, themeTeam, chooseTheme } = useFavorites(league);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <SectionTitle
        eyebrow={LEAGUES[league].name}
        title="Teams"
        right={
          themeTeam ? (
            <button
              type="button"
              onClick={() => chooseTheme(null)}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm"
            >
              <Palette className="size-4" /> Reset colors ({themeTeam.name})
            </button>
          ) : (
            <span className="text-sm text-muted-foreground">
              Tap a color swatch to use a team's home colors
            </span>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => (
          <div key={t.id} className="surface flex items-center gap-3 p-4">
            <Logo src={t.logo} alt={t.abbrev} size={44} />
            <div className="min-w-0 flex-1">
              <Link
                to="/$league/teams/$teamId"
                params={{ league, teamId: t.id }}
                className="block truncate font-semibold hover:underline"
              >
                {t.name}
              </Link>
              <button
                type="button"
                onClick={() =>
                  chooseTheme({
                    id: t.id,
                    name: t.short,
                    color: t.color ?? "1d428a",
                    altColor: t.altColor ?? t.color ?? "f58426",
                  })
                }
                className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <span
                  className="inline-block size-3 rounded-full border border-border"
                  style={{ backgroundColor: `#${t.color ?? "1d428a"}` }}
                />
                <span
                  className="inline-block size-3 rounded-full border border-border"
                  style={{ backgroundColor: `#${t.altColor ?? "cccccc"}` }}
                />
                {themeTeam?.id === t.id ? "Colors in use" : "Use these colors"}
              </button>
            </div>
            <FavButton
              active={isTeamFav(t.id)}
              onClick={() => toggleTeam({ id: t.id, name: t.name, logo: t.logo, color: t.color })}
              label={`Favorite ${t.name}`}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
