import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Logo, SectionTitle, Segmented, segmentClass, Skeleton } from "@/components/nba/ui";
import { getStandings } from "@/lib/extras.functions";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { useTeamColors } from "@/hooks/use-team-colors";
import { cn } from "@/lib/utils";

const standingsQuery = (league: LeagueId, view: string) =>
  queryOptions({
    queryKey: ["standings", league, view],
    queryFn: () => getStandings({ data: { league, view } }),
    staleTime: 5 * 60_000,
  });

export const Route = createFileRoute("/$league/standings")({
  validateSearch: (s: Record<string, unknown>) => ({
    view: s["view"] === "division" ? "division" : "conference",
  }),
  loaderDeps: ({ search }) => ({ view: search.view }),
  loader: ({ context, params, deps }) => {
    context.queryClient.prefetchQuery(standingsQuery(params.league as LeagueId, deps.view));
  },
  head: ({ params }) => {
    const n = LEAGUES[params.league as LeagueId]?.name ?? "League";
    const title = `${n}-stand — Statline`;
    const description = `Conference- en divisiestand van de ${n}: winst, verlies, puntensaldo en reeksen.`;
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
  component: Standings,
});

const VIEW_LABEL = { conference: "Conference", division: "Divisie" } as const;

function Standings() {
  const { league: raw } = Route.useParams();
  const league = raw as LeagueId;
  const { view } = Route.useSearch();
  const { data, isLoading } = useQuery(standingsQuery(league, view));
  const colorOf = useTeamColors([league]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <SectionTitle
        as="h1"
        eyebrow={data?.season ? `Seizoen ${data.season}` : "Stand"}
        title={`${LEAGUES[league].name}-stand`}
        right={
          <Segmented className="w-full sm:w-auto">
            {(["conference", "division"] as const).map((v) => (
              <Link
                key={v}
                to="/$league/standings"
                params={{ league }}
                search={{ view: v }}
                aria-current={view === v ? "page" : undefined}
                className={segmentClass(view === v)}
              >
                {VIEW_LABEL[v]}
              </Link>
            ))}
          </Segmented>
        }
      />
      {isLoading || !data ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "grid items-start gap-4",
            view === "division" ? "md:grid-cols-2" : "lg:grid-cols-2",
          )}
        >
          {data.groups.map((g) => (
            <section key={g.name} className="surface animate-in fade-in overflow-hidden pt-3">
              <h2 className="eyebrow px-4 pb-2 font-sans text-foreground">{g.name}</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th className="eyebrow sticky left-0 z-10 border-b border-border bg-card py-2 pl-4 pr-2 text-left">
                        Team
                      </th>
                      {data.columns.map(([, l]) => (
                        <th
                          key={l}
                          className="eyebrow border-b border-border px-2.5 py-2 text-right whitespace-nowrap last:pr-4"
                        >
                          {l}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r, i) => (
                      <tr key={r.teamId} className="group hover:bg-secondary/40">
                        <td className="sticky left-0 z-10 border-b border-border/60 bg-card py-2 pl-4 pr-2 group-last:border-0">
                          <Link
                            to="/$league/teams/$teamId"
                            params={{ league, teamId: r.teamId }}
                            className="flex min-h-8 items-center gap-2.5 font-medium hover:underline"
                          >
                            <span className="stat-num w-5 text-right text-xs text-subtle-foreground">
                              {i + 1}
                            </span>
                            <span
                              aria-hidden="true"
                              className="h-6 w-1 shrink-0 rounded-full bg-border"
                              style={{ backgroundColor: colorOf(league, r.teamId) }}
                            />
                            <Logo src={r.logo} alt={r.abbrev} size={22} />
                            <span className="hidden whitespace-nowrap sm:inline">{r.name}</span>
                            <span className="sm:hidden">{r.abbrev}</span>
                          </Link>
                        </td>
                        {data.columns.map(([k, l]) => {
                          const v = r.stats[k] ?? "–";
                          const tone =
                            k === "differential" && v.startsWith("+")
                              ? "text-win"
                              : k === "differential" && v.startsWith("-")
                                ? "text-loss"
                                : "";
                          return (
                            <td
                              key={l}
                              className={cn(
                                "stat-num border-b border-border/60 px-2.5 py-2 text-right whitespace-nowrap group-last:border-0 last:pr-4",
                                tone,
                              )}
                            >
                              {v}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
