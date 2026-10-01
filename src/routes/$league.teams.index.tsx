import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Palette } from "lucide-react";
import type { CSSProperties } from "react";

import { Empty, FavButton, Logo, PageError, SectionTitle } from "@/components/nba/ui";
import { useFavorites } from "@/hooks/use-favorites";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { getTeams } from "@/lib/sports.functions";
import { teamColor } from "@/lib/team-colors";
import { cn } from "@/lib/utils";

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
    const title = `Alle ${name}-teams — Statline`;
    const description = `Volg elk ${name}-team, bekijk de selectie en recente wedstrijden.`;
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
  errorComponent: ({ error }) => <PageError what="Teams" error={error} />,
  notFoundComponent: () => <Empty>Geen teams gevonden.</Empty>,
});

function Teams() {
  const league = Route.useParams().league as LeagueId;
  const { data: teams } = useSuspenseQuery(teamsQuery(league));
  const { isTeamFav, toggleTeam, themeTeam, chooseTheme } = useFavorites(league);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <SectionTitle
        as="h1"
        eyebrow={`${LEAGUES[league].name} · ${teams.length} teams`}
        title="Teams"
        right={
          themeTeam ? (
            <button
              type="button"
              onClick={() => chooseTheme(null)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-secondary px-4 text-sm font-medium"
            >
              <Palette className="size-4" /> Kleuren van {themeTeam.name} resetten
            </button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Volg een team met de ster, of gebruik zijn kleuren als accent.
            </p>
          )
        }
      />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => {
          const inUse = themeTeam?.id === t.id;
          return (
            <li
              key={t.id}
              style={{ "--tc": teamColor(t.color, t.altColor) } as CSSProperties}
              className="surface surface-link team-wash relative flex min-w-0 items-center gap-3 overflow-hidden py-2 pl-5 pr-2"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-1.5"
                style={{ backgroundColor: teamColor(t.color, t.altColor) }}
              />
              <Logo src={t.logo} alt={t.abbrev} size={40} />
              <div className="min-w-0 flex-1">
                <Link
                  to="/$league/teams/$teamId"
                  params={{ league, teamId: t.id }}
                  className="block truncate font-semibold after:absolute after:inset-0 after:content-['']"
                >
                  {t.name}
                </Link>
                <p className="text-xs text-subtle-foreground">{t.abbrev}</p>
              </div>
              <button
                type="button"
                aria-pressed={inUse}
                aria-label={
                  inUse ? `Kleuren van ${t.short} in gebruik` : `Gebruik kleuren van ${t.short}`
                }
                title={inUse ? "Kleuren in gebruik" : "Gebruik deze kleuren"}
                onClick={() =>
                  chooseTheme({
                    id: t.id,
                    name: t.short,
                    color: t.color ?? "1d428a",
                    altColor: t.altColor ?? t.color ?? "f58426",
                  })
                }
                className={cn(
                  "relative z-10 inline-flex size-11 items-center justify-center rounded-full transition-colors hover:bg-secondary",
                  inUse && "bg-secondary",
                )}
              >
                <span className="flex -space-x-1">
                  <span
                    className="size-3.5 rounded-full ring-2 ring-card"
                    style={{ backgroundColor: `#${t.color ?? "1d428a"}` }}
                  />
                  <span
                    className="size-3.5 rounded-full ring-2 ring-card"
                    style={{ backgroundColor: `#${t.altColor ?? "cccccc"}` }}
                  />
                </span>
              </button>
              <FavButton
                active={isTeamFav(t.id)}
                onClick={() => toggleTeam({ id: t.id, name: t.name, logo: t.logo, color: t.color })}
                label={`${t.name} volgen`}
                className="z-10"
              />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
