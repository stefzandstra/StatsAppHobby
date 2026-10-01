import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState, type CSSProperties } from "react";

import {
  Empty,
  FavButton,
  Logo,
  PageError,
  SectionTitle,
  Segmented,
  segmentClass,
  StatTable,
  StatusBadge,
} from "@/components/nba/ui";
import { useFavorites } from "@/hooks/use-favorites";
import type { LeagueId } from "@/lib/leagues";
import { getBoxScore } from "@/lib/sports.functions";
import { teamColor } from "@/lib/team-colors";
import { cn } from "@/lib/utils";

const boxQuery = (league: LeagueId, gameId: string) =>
  queryOptions({
    queryKey: ["boxscore", league, gameId],
    queryFn: () => getBoxScore({ data: { league, gameId } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/$league/game/$gameId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(boxQuery(params.league as LeagueId, params.gameId)),
  head: ({ loaderData }) => {
    const title = loaderData
      ? `${loaderData.game.away.name} – ${loaderData.game.home.name}: box score — Statline`
      : "Box score niet beschikbaar";
    const description = loaderData
      ? `Volledige box score van ${loaderData.game.away.name} – ${loaderData.game.home.name}.`
      : "Deze box score kon niet worden geladen.";
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
  errorComponent: ({ error }) => <PageError what="Deze box score" error={error} />,
  notFoundComponent: () => <Empty>Wedstrijd niet gevonden.</Empty>,
});

/** "Michael Penix Jr." → "M. Penix Jr." so names fit the sticky column on phones. */
function shortName(name: string) {
  const [first, ...rest] = name.split(" ");
  return rest.length && first ? `${first[0]}. ${rest.join(" ")}` : name;
}

function BoxScore() {
  const { league: rawLeague, gameId } = Route.useParams();
  const league = rawLeague as LeagueId;
  const { game, teamStats, playerGroups, leaders, attendance } = useSuspenseQuery(
    boxQuery(league, gameId),
  ).data;
  const { togglePlayer, isPlayerFav } = useFavorites(league);
  const [teamTab, setTeamTab] = useState(0);

  const periods = Math.max(game.home.linescores.length, game.away.linescores.length);
  const final = game.state === "post";
  const sides = [game.away, game.home];
  const group = playerGroups[teamTab] ?? playerGroups[0];
  const [ta, tb] = teamStats;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <Link
        to="/$league"
        params={{ league }}
        className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Alle wedstrijden
      </Link>

      <section
        className="surface team-wash relative mb-8 overflow-hidden"
        style={
          {
            "--tc": teamColor(game.away.color, game.away.altColor),
            "--tc2": teamColor(game.home.color, game.home.altColor),
          } as CSSProperties
        }
      >
        <div className="flex h-1.5" aria-hidden="true">
          {sides.map((s) => (
            <span
              key={s.id}
              className="flex-1"
              style={{ backgroundColor: teamColor(s.color, s.altColor) }}
            />
          ))}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-6 sm:gap-6 sm:px-8 sm:py-8">
          {sides.map((s, i) => {
            const lost = final && !s.winner;
            const team = (
              <Link
                to="/$league/teams/$teamId"
                params={{ league, teamId: s.id }}
                className="flex min-w-0 flex-col items-center gap-2 text-center"
              >
                <Logo src={s.logo} alt={s.abbrev} size={56} className="sm:size-16" />
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold uppercase leading-tight sm:text-2xl">
                    <span className="sm:hidden">{s.abbrev}</span>
                    <span className="hidden sm:inline">{s.name}</span>
                  </p>
                  <p className="stat-num text-xs text-subtle-foreground">
                    {i === 0 ? "Uit" : "Thuis"}
                    {s.record ? ` · ${s.record}` : ""}
                  </p>
                </div>
              </Link>
            );
            return i === 0 ? (
              <div key={s.id} className="min-w-0">
                {team}
              </div>
            ) : (
              <div key={s.id} className="col-start-3 row-start-1 min-w-0">
                {team}
              </div>
            );
          })}
          <div className="col-start-2 row-start-1 flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 sm:gap-5">
              {sides.map((s, i) => (
                <span key={s.id} className="flex items-center gap-3 sm:gap-5">
                  {i === 1 ? <span className="text-2xl text-subtle-foreground">–</span> : null}
                  <span
                    className={cn(
                      "stat-num font-display text-5xl font-bold leading-none sm:text-6xl",
                      final && !s.winner && "text-subtle-foreground",
                    )}
                  >
                    {s.score ?? "–"}
                  </span>
                </span>
              ))}
            </div>
            <StatusBadge
              state={game.state}
              status={game.state === "post" ? "Eindstand" : game.status}
            />
          </div>
        </div>

        {periods > 0 ? (
          <div className="overflow-x-auto border-t border-border px-4 py-3 sm:px-8">
            <table className="mx-auto text-sm">
              <thead>
                <tr>
                  <th className="eyebrow py-1 pr-4 text-left">Team</th>
                  {Array.from({ length: periods }).map((_, i) => (
                    <th key={i} className="eyebrow min-w-9 px-2 py-1 text-right">
                      {i < 4 ? `Q${i + 1}` : `OT${i > 4 ? i - 3 : ""}`}
                    </th>
                  ))}
                  <th className="eyebrow min-w-10 py-1 pl-3 text-right">Tot</th>
                </tr>
              </thead>
              <tbody>
                {sides.map((s) => (
                  <tr key={s.id}>
                    <td className="py-1 pr-4 font-semibold">{s.abbrev}</td>
                    {Array.from({ length: periods }).map((_, i) => (
                      <td key={i} className="stat-num px-2 py-1 text-right text-muted-foreground">
                        {s.linescores[i] ?? "–"}
                      </td>
                    ))}
                    <td className="stat-num py-1 pl-3 text-right font-bold">{s.score ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {game.venue ? (
          <p className="border-t border-border px-4 py-3 text-center text-xs text-subtle-foreground sm:px-8">
            {game.venue}
            {attendance ? ` · ${Number(attendance).toLocaleString("nl-NL")} toeschouwers` : ""}
          </p>
        ) : null}
      </section>

      {playerGroups.length === 0 ? (
        <section className="mb-8">
          <SectionTitle
            eyebrow={game.state === "pre" ? "Voorbeschouwing" : "Uitblinkers"}
            title={game.state === "pre" ? "Spelers om te volgen" : "Topspelers"}
          />
          {game.state === "pre" ? (
            <p className="mb-4 text-sm text-muted-foreground">
              Individuele statistieken verschijnen zodra de wedstrijd begint. De seizoensleiders tot
              nu toe:
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            {leaders
              .filter((t) => t.items.length)
              .map((t) => (
                <div key={t.teamId} className="surface p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Logo src={t.logo} alt={t.name} size={24} />
                    <h3 className="text-lg font-bold uppercase">{t.name}</h3>
                  </div>
                  <ul className="divide-y divide-border/60">
                    {t.items.map((it) => (
                      <li key={it.category} className="flex items-center gap-3 py-2">
                        {it.headshot ? (
                          <img
                            src={it.headshot}
                            alt=""
                            className="size-10 rounded-full bg-secondary object-cover"
                            loading="lazy"
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <p className="eyebrow">{it.category}</p>
                          <Link
                            to="/$league/player/$playerId"
                            params={{ league, playerId: it.id }}
                            className="block truncate font-medium hover:underline"
                          >
                            {it.name}
                          </Link>
                        </div>
                        <span className="stat-num text-right text-sm font-semibold">
                          {it.value}
                        </span>
                        <FavButton
                          active={isPlayerFav(it.id)}
                          onClick={() =>
                            togglePlayer({ id: it.id, name: it.name, headshot: it.headshot })
                          }
                          label={`${it.name} als favoriet`}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      {group ? (
        <section className="mb-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow mb-1">Box score</p>
              <h2 className="text-2xl font-bold uppercase leading-none sm:text-3xl">Spelers</h2>
            </div>
            {playerGroups.length > 1 ? (
              <Segmented className="w-full sm:w-auto">
                {playerGroups.map((g, i) => (
                  <button
                    key={g.teamId}
                    type="button"
                    aria-pressed={i === teamTab}
                    onClick={() => setTeamTab(i)}
                    className={segmentClass(i === teamTab)}
                  >
                    {sides.find((s) => s.id === g.teamId)?.abbrev ?? g.name}
                  </button>
                ))}
              </Segmented>
            ) : null}
          </div>
          {group.categories.map((cat, ci) => (
            <div key={`${cat.name}-${ci}`} className="surface mb-4 px-4 pb-2 pt-3">
              {group.categories.length > 1 ? (
                <p className="eyebrow mb-1 text-foreground">{cat.name}</p>
              ) : null}
              <StatTable
                labels={cat.labels}
                rows={cat.rows.map((p) => ({
                  key: p.id || p.name,
                  muted: p.didNotPlay,
                  stats: p.didNotPlay ? [p.reason ?? "DNP"] : p.stats,
                  label: (
                    <div className="flex min-w-0 items-center gap-1">
                      <FavButton
                        active={isPlayerFav(p.id)}
                        onClick={() =>
                          togglePlayer({ id: p.id, name: p.name, headshot: p.headshot })
                        }
                        label={`${p.name} als favoriet`}
                        className="-ml-2"
                      />
                      <Link
                        to="/$league/player/$playerId"
                        params={{ league, playerId: p.id }}
                        className="min-w-0 truncate font-medium hover:underline"
                      >
                        <span className="sm:hidden">{shortName(p.name)}</span>
                        <span className="hidden sm:inline">{p.name}</span>
                      </Link>
                      <span className="shrink-0 text-xs text-subtle-foreground">
                        {p.position}
                        {p.starter ? " · B" : ""}
                      </span>
                    </div>
                  ),
                }))}
              />
            </div>
          ))}
          <p className="text-xs text-subtle-foreground">
            B = basisspeler. Swipe de tabel opzij voor alle kolommen.
          </p>
        </section>
      ) : null}

      {ta && tb ? (
        <section>
          <SectionTitle eyebrow="Teamtotalen" title="Teamvergelijking" />
          <div className="surface px-4 py-2 sm:px-6">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-border py-2">
              <span className="flex items-center gap-2">
                <Logo src={ta.logo} alt={ta.name} size={24} />
              </span>
              <span />
              <span className="flex justify-end">
                <Logo src={tb.logo} alt={tb.name} size={24} />
              </span>
            </div>
            <dl>
              {ta.stats.map((st, si) => {
                // Labels can repeat (e.g. "Interceptions thrown"), so prefer the same position.
                const other =
                  tb.stats[si]?.label === st.label
                    ? tb.stats[si]
                    : tb.stats.find((x) => x.label === st.label);
                return (
                  <div
                    key={`${st.label}-${si}`}
                    className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-border/60 py-2 text-sm last:border-0"
                  >
                    <dd className="stat-num font-medium">{st.value}</dd>
                    <dt className="text-center text-xs text-muted-foreground">{st.label}</dt>
                    <dd className="stat-num text-right font-medium">{other?.value ?? "–"}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </section>
      ) : null}
    </main>
  );
}
