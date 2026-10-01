import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Logo, SectionTitle } from "@/components/nba/ui";
import { getStandings } from "@/lib/extras.functions";
import { LEAGUES, type LeagueId } from "@/lib/leagues";

const standingsQuery = (league: LeagueId, view: string) =>
  queryOptions({
    queryKey: ["standings", league, view],
    queryFn: () => getStandings({ data: { league, view } }),
    staleTime: 5 * 60_000,
  });

export const Route = createFileRoute("/$league/standings")({
  validateSearch: (s: Record<string, unknown>) => ({
    view: s['view'] === "division" ? "division" : "conference",
  }),
  loaderDeps: ({ search }) => ({ view: search.view }),
  loader: ({ context, params, deps }) => {
    context.queryClient.prefetchQuery(standingsQuery(params.league as LeagueId, deps.view));
  },
  head: ({ params }) => {
    const n = LEAGUES[params.league as LeagueId]?.name ?? "League";
    const title = `${n} standings — Statline`;
    const description = `Conference and division standings for the ${n}: wins, losses, point differential and streaks.`;
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

function Standings() {
  const { league: raw } = Route.useParams();
  const league = raw as LeagueId;
  const { view } = Route.useSearch();
  const { data, isLoading } = useQuery(standingsQuery(league, view));

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <SectionTitle
        eyebrow={data?.season ? `${data.season} season` : "Standings"}
        title={`${LEAGUES[league].name} standings`}
        right={
          <div className="flex rounded-lg bg-muted p-1 text-sm">
            {(["conference", "division"] as const).map((v) => (
              <Link
                key={v}
                to="/$league/standings"
                params={{ league }}
                search={{ view: v }}
                className={`rounded-md px-3 py-1 font-medium capitalize transition ${
                  view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {v}
              </Link>
            ))}
          </div>
        }
      />
      {isLoading || !data ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="surface h-96 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className={`grid gap-4 ${view === "division" ? "md:grid-cols-2" : ""}`}>
          {data.groups.map((g) => (
            <div key={g.name} className="surface animate-in fade-in overflow-x-auto p-4">
              <p className="eyebrow mb-2">{g.name}</p>
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="eyebrow py-1 pr-2">#</th>
                    <th className="eyebrow py-1">Team</th>
                    {data.columns.map(([, l]) => (
                      <th key={l} className="eyebrow px-2 py-1 text-right">{l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r, i) => (
                    <tr key={r.teamId} className="border-t border-border hover:bg-muted/50">
                      <td className="stat-num py-1.5 pr-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-1.5">
                        <Link
                          to="/$league/teams/$teamId"
                          params={{ league, teamId: r.teamId }}
                          className="flex items-center gap-2 font-medium hover:underline"
                        >
                          <Logo src={r.logo} alt={r.abbrev} size={22} />
                          <span className="hidden sm:inline">{r.name}</span>
                          <span className="sm:hidden">{r.abbrev}</span>
                        </Link>
                      </td>
                      {data.columns.map(([k, l]) => {
                        const v = r.stats[k] ?? "–";
                        const tone =
                          k === "differential" && v.startsWith("+")
                            ? "text-team"
                            : k === "differential" && v.startsWith("-")
                              ? "text-destructive"
                              : "";
                        return (
                          <td key={l} className={`stat-num px-2 py-1.5 text-right ${tone}`}>{v}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
