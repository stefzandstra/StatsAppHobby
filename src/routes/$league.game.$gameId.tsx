import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Empty, FavButton, Logo, SectionTitle, StatTable } from "@/components/nba/ui";
import { useFavorites } from "@/hooks/use-favorites";
import type { LeagueId } from "@/lib/leagues";
import { getBoxScore } from "@/lib/sports.functions";

const boxQuery = (league: LeagueId, gameId: string) =>
  queryOptions({
    queryKey: ["boxscore", league, gameId],
    queryFn: () => getBoxScore({ data: { league, gameId } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/$league/game/$gameId")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(boxQuery(params.league as LeagueId, params.gameId)),
  head: ({ loaderData }) => {
    const title = loaderData
      ? `${loaderData.game.away.name} at ${loaderData.game.home.name} — box score`
      : "Box score unavailable";
    const description = loaderData
      ? `Full player and team box score for ${loaderData.game.away.name} at ${loaderData.game.home.name}.`
      : "This box score could not be loaded.";
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
  component: BoxScore,
  errorComponent: ({ error }) => (
    <div role="alert" className="mx-auto max-w-6xl p-8 text-sm text-muted-foreground">
      Couldn't load this box score: {error instanceof Error ? error.message : String(error)}
    </div>
  ),
  notFoundComponent: () => <Empty>Game not found.</Empty>,
});

function BoxScore() {
  const { league: rawLeague, gameId } = Route.useParams();
  const league = rawLeague as LeagueId;
  const { game, teamStats, playerGroups, leaders, attendance } = useSuspenseQuery(
    boxQuery(league, gameId),
  ).data;
  const { togglePlayer, isPlayerFav } = useFavorites(league);

  const periods = Math.max(game.home.linescores.length, game.away.linescores.length);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link
        to="/$league"
        params={{ league }}
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All games
      </Link>

      <div className="surface mb-8 p-6">
        <p className="eyebrow">{game.status}</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          {[game.away, game.home].map((s, i) => (
            <div
              key={s.id}
              className={`flex items-center gap-3 ${i === 1 ? "sm:flex-row-reverse sm:text-right" : ""}`}
            >
              <Logo src={s.logo} alt={s.abbrev} size={56} />
              <div>
                <p className="font-display text-2xl font-bold uppercase">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {i === 0 ? "Away" : "Home"}
                  {s.record ? ` · ${s.record}` : ""}
                </p>
              </div>
              <span className="stat-num ml-auto text-4xl font-bold sm:ml-0">{s.score ?? "–"}</span>
            </div>
          ))}
          <div className="order-first text-center sm:order-none">
            <span className="eyebrow">{game.state === "post" ? "Final" : game.state === "in" ? "Live" : "Upcoming"}</span>
          </div>
        </div>
        {game.venue ? (
          <p className="mt-4 text-xs text-muted-foreground">
            {game.venue}
            {attendance ? ` · ${Number(attendance).toLocaleString()} fans` : ""}
          </p>
        ) : null}

        {periods > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-[20rem] text-sm">
              <thead>
                <tr>
                  <th className="eyebrow py-1 pr-4 text-left">Team</th>
                  {Array.from({ length: periods }).map((_, i) => (
                    <th key={i} className="eyebrow px-3 py-1 text-right">
                      {i < 4 ? `Q${i + 1}` : `OT${i - 3}`}
                    </th>
                  ))}
                  <th className="eyebrow px-3 py-1 text-right">T</th>
                </tr>
              </thead>
              <tbody>
                {[game.away, game.home].map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-1.5 pr-4 font-semibold">{s.abbrev}</td>
                    {Array.from({ length: periods }).map((_, i) => (
                      <td key={i} className="stat-num px-3 py-1.5 text-right">
                        {s.linescores[i] ?? "–"}
                      </td>
                    ))}
                    <td className="stat-num px-3 py-1.5 text-right font-semibold">
                      {s.score ?? "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {playerGroups.length === 0 ? (
        <section className="mb-8">
          <SectionTitle
            eyebrow={game.state === "pre" ? "Pre-game" : "Leaders"}
            title={game.state === "pre" ? "Players to watch" : "Game leaders"}
          />
          {game.state === "pre" ? (
            <p className="mb-4 text-sm text-muted-foreground">
              Individual player stats appear here once the game kicks off. Season leaders so far:
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            {leaders.filter((t) => t.items.length).map((t) => (
              <div key={t.teamId} className="surface p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Logo src={t.logo} alt={t.name} size={28} />
                  <h3 className="text-lg font-bold uppercase">{t.name}</h3>
                </div>
                <ul className="space-y-2">
                  {t.items.map((it) => (
                    <li key={it.category} className="flex items-center gap-3 border-b border-border/60 pb-2">
                      {it.headshot ? (
                        <img src={it.headshot} alt={it.name} className="size-10 rounded-full bg-muted object-cover" loading="lazy" />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="eyebrow">{it.category}</p>
                        <Link
                          to="/$league/player/$playerId"
                          params={{ league, playerId: it.id }}
                          className="font-medium hover:underline"
                        >
                          {it.name}
                        </Link>
                      </div>
                      <span className="stat-num text-right text-sm">{it.value}</span>
                      <FavButton
                        active={isPlayerFav(it.id)}
                        onClick={() => togglePlayer({ id: it.id, name: it.name, headshot: it.headshot })}
                        label={`Favorite ${it.name}`}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {playerGroups.map((grp) => (
        <section key={grp.teamId} className="mb-8">
          <SectionTitle
            eyebrow="Box score"
            title={grp.name}
            right={
              <Link
                to="/$league/teams/$teamId"
                params={{ league, teamId: grp.teamId }}
                className="text-sm font-medium text-team hover:underline"
              >
                Team page
              </Link>
            }
          />
          {grp.categories.map((cat) => (
          <div key={cat.name} className="surface mb-4 p-4">
            {grp.categories.length > 1 ? <p className="eyebrow mb-2">{cat.name}</p> : null}
            <StatTable
              labels={cat.labels}
              rows={cat.rows.map((p) => ({
                key: p.id || p.name,
                muted: p.didNotPlay,
                stats: p.didNotPlay ? [p.reason ?? "DNP"] : p.stats,
                label: (
                  <div className="flex items-center gap-2">
                    <FavButton
                      active={isPlayerFav(p.id)}
                      onClick={() => togglePlayer({ id: p.id, name: p.name, headshot: p.headshot })}
                      label={`Favorite ${p.name}`}
                    />
                    <Link
                      to="/$league/player/$playerId"
                      params={{ league, playerId: p.id }}
                      className="font-medium hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {p.position}
                      {p.starter ? " · S" : ""}
                    </span>
                  </div>
                ),
              }))}
            />
          </div>
          ))}
        </section>
      ))}

      <section>
        <SectionTitle eyebrow="Team totals" title="Team comparison" />
        <div className="grid gap-4 md:grid-cols-2">
          {teamStats.map((t) => (
            <div key={t.teamId} className="surface p-4">
              <div className="mb-3 flex items-center gap-2">
                <Logo src={t.logo} alt={t.name} size={28} />
                <h3 className="text-lg font-bold uppercase">{t.name}</h3>
              </div>
              <dl className="grid grid-cols-2 gap-y-1 text-sm">
                {t.stats.map((s) => (
                  <div key={s.label} className="col-span-2 flex justify-between border-b border-border/60 py-1">
                    <dt className="text-muted-foreground">{s.label}</dt>
                    <dd className="stat-num font-medium">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
