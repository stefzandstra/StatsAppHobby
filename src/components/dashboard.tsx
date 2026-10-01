import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { GameCardItem } from "@/components/nba/game-card";
import { Empty, FavButton, Logo } from "@/components/nba/ui";
import { useDashboardConfig, WIDGETS, type WidgetId } from "@/hooks/use-dashboard-config";
import { useFavorites } from "@/hooks/use-favorites";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { getPlayerStats, getScoreboard, getTeamDetail, type GameCard } from "@/lib/sports.functions";
import { cn } from "@/lib/utils";

type TeamData = Awaited<ReturnType<typeof getTeamDetail>>;
type PlayerData = Awaited<ReturnType<typeof getPlayerStats>>;

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

function form(teamId: string, games: GameCard[]) {
  return games
    .filter((g) => g.state === "post")
    .slice(0, 5)
    .map((g) => {
      const me = g.home.id === teamId ? g.home : g.away;
      return { id: g.id, win: me.winner };
    });
}

/**
 * The personalized dashboard. `league` is null until the client has hydrated
 * (the remembered league lives in localStorage); a skeleton renders meanwhile.
 */
export function Dashboard({ league }: { league: LeagueId | null }) {
  const resolved = league ?? "nba";
  const { ready, teams, players, togglePlayer, toggleTeam } = useFavorites(resolved);
  const { config, toggle, move, setCompact, reset } = useDashboardConfig();
  const [editing, setEditing] = useState(false);

  const teamQueries = useQueries({
    queries: teams.map((t) => ({
      queryKey: ["team", resolved, t.id],
      queryFn: () => getTeamDetail({ data: { league: resolved, teamId: t.id } }),
      staleTime: 10 * 60_000,
      enabled: league !== null,
    })),
  });
  const playerQueries = useQueries({
    queries: players.map((p) => ({
      queryKey: ["player", resolved, p.id],
      queryFn: () => getPlayerStats({ data: { league: resolved, playerId: p.id } }),
      staleTime: 10 * 60_000,
      enabled: league !== null,
    })),
  });
  const scores = useQuery({
    queryKey: ["scoreboard", resolved, ""],
    queryFn: () => getScoreboard({ data: { league: resolved, slate: "" } }),
    staleTime: 60_000,
    enabled: league !== null && !config.hidden.includes("scores"),
  });

  if (!league || !ready) {
    return (
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </main>
    );
  }

  const name = LEAGUES[league].name;
  const hasFavs = teams.length + players.length > 0;

  const widgets: Record<WidgetId, React.ReactNode> = {
    players: (
      <Widget title="Player spotlight" count={players.length}>
        {players.length === 0 ? (
          <Empty>Star players on any box score or roster to spotlight them here.</Empty>
        ) : (
          <div className={cn("grid gap-4", config.compact ? "sm:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2")}>
            {players.map((p, i) => (
              <PlayerCard
                key={p.id}
                league={league}
                fav={p}
                data={playerQueries[i]?.data}
                loading={playerQueries[i]?.isPending ?? true}
                compact={config.compact}
                onRemove={() => togglePlayer({ id: p.id, name: p.name })}
                delay={i}
              />
            ))}
          </div>
        )}
      </Widget>
    ),
    teams: (
      <Widget title="Team form" count={teams.length}>
        {teams.length === 0 ? (
          <Empty>
            No teams yet.{" "}
            <Link to="/$league/teams" params={{ league }} className="font-medium text-team hover:underline">
              Follow a team
            </Link>
          </Empty>
        ) : (
          <div className={cn("grid gap-4", config.compact ? "sm:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2")}>
            {teams.map((t, i) => (
              <TeamCard
                key={t.id}
                league={league}
                fav={t}
                data={teamQueries[i]?.data}
                compact={config.compact}
                onRemove={() => toggleTeam({ id: t.id, name: t.name })}
                delay={i}
              />
            ))}
          </div>
        )}
      </Widget>
    ),
    upcoming: (() => {
      const games = teamQueries
        .flatMap((q) => q.data?.upcoming ?? [])
        .filter((g, i, a) => a.findIndex((x) => x.id === g.id) === i)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6);
      return (
        <Widget title="Up next" count={games.length}>
          {games.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {games.map((g) => (
                <div key={g.id} className="relative">
                  <span className="absolute -top-2 right-3 z-10 rounded-full bg-team px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    {new Date(g.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                  <GameCardItem game={g} league={league} />
                </div>
              ))}
            </div>
          ) : (
            <Empty>{teams.length ? "No upcoming games scheduled yet." : "Follow teams to see their next games."}</Empty>
          )}
        </Widget>
      );
    })(),
    scores: (
      <Widget title={scores.data ? `Latest scores · ${scores.data.title}` : "Latest scores"} count={scores.data?.games.length ?? 0}>
        {scores.data ? (
          <div className="flex snap-x gap-3 overflow-x-auto pb-2">
            {scores.data.games.map((g) => (
              <div key={g.id} className="w-64 shrink-0 snap-start">
                <GameCardItem game={g} league={league} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-36 w-64 shrink-0" />
            ))}
          </div>
        )}
      </Widget>
    ),
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="dash-hero surface relative mb-8 overflow-hidden px-6 py-8 text-white">
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow !text-white/70">
              <Sparkles className="mr-1 inline size-3" /> Your {name} dashboard
            </p>
            <h1 className="mt-1 text-4xl font-bold uppercase sm:text-5xl">
              {hasFavs ? "Your squad, at a glance" : "Build your dashboard"}
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              {[...players.map((p) => ({ id: p.id, img: p.headshot, name: p.name })), ...teams.map((t) => ({ id: t.id, img: t.logo, name: t.name }))]
                .slice(0, 10)
                .map((f) => (
                  <span key={f.id} title={f.name} className="grid size-10 place-items-center overflow-hidden rounded-full bg-white/15 ring-2 ring-white/30">
                    <Logo src={f.img ?? null} alt={f.name} size={40} className="object-cover" />
                  </span>
                ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
          >
            {editing ? <X className="size-4" /> : <SlidersHorizontal className="size-4" />}
            {editing ? "Done" : "Customize"}
          </button>
        </div>
      </section>

      {editing ? (
        <section className="surface mb-8 animate-in fade-in slide-in-from-top-2 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold uppercase">Layout</h2>
            <div className="flex items-center gap-2">
              <div className="flex rounded-full border border-border p-0.5 text-xs font-semibold">
                {[
                  { v: false, l: "Roomy" },
                  { v: true, l: "Compact" },
                ].map((o) => (
                  <button
                    key={o.l}
                    type="button"
                    onClick={() => setCompact(o.v)}
                    className={cn("rounded-full px-3 py-1", config.compact === o.v ? "bg-team text-white" : "text-muted-foreground")}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
              <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold">
                <RotateCcw className="size-3" /> Reset
              </button>
            </div>
          </div>
          <ul className="space-y-2">
            {config.order.map((w, i) => {
              const hidden = config.hidden.includes(w);
              return (
                <li key={w} className={cn("flex items-center gap-3 rounded-xl border border-border px-3 py-2 transition", hidden && "opacity-50")}>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{WIDGETS[w].label}</p>
                    <p className="text-xs text-muted-foreground">{WIDGETS[w].hint}</p>
                  </div>
                  <IconBtn label="Move up" disabled={i === 0} onClick={() => move(w, -1)}>
                    <ArrowUp className="size-4" />
                  </IconBtn>
                  <IconBtn label="Move down" disabled={i === config.order.length - 1} onClick={() => move(w, 1)}>
                    <ArrowDown className="size-4" />
                  </IconBtn>
                  <IconBtn label={hidden ? "Show" : "Hide"} onClick={() => toggle(w)}>
                    {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </IconBtn>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="space-y-10">
        {config.order
          .filter((w) => !config.hidden.includes(w))
          .map((w) => (
            <div key={w}>{widgets[w]}</div>
          ))}
      </div>
    </main>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground transition hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function Widget({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-2xl font-bold uppercase">{title}</h2>
        {count ? <span className="team-chip rounded-full px-2 py-0.5 text-xs font-bold">{count}</span> : null}
        <span className="h-px flex-1 bg-border" />
      </div>
      {children}
    </section>
  );
}

function PlayerCard({
  league,
  fav,
  data,
  loading,
  compact,
  onRemove,
  delay,
}: {
  league: LeagueId;
  fav: { id: string; name: string; headshot?: string | null };
  data: PlayerData | undefined;
  loading: boolean;
  compact: boolean;
  onRemove: () => void;
  delay: number;
}) {
  const primary = data?.categories.find((c) => c.name === data.highlightTitle) ?? data?.categories[0];
  const trendLabel = data?.highlights[0]?.label;
  const ti = primary && trendLabel ? primary.labels.indexOf(trendLabel) : -1;
  const trend = primary && ti >= 0
    ? primary.rows.slice(0, 8).reverse().map((r) => ({ season: r.season, v: parseFloat(String(r.stats[ti]).replace(/,/g, "")) || 0 }))
    : [];
  const max = Math.max(1, ...trend.map((t) => t.v));
  const headshot = data?.player.headshot ?? fav.headshot;
  const stats = (data?.highlights ?? []).slice(0, compact ? 3 : 6);

  return (
    <article
      className="surface group relative overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lg animate-in fade-in slide-in-from-bottom-3"
      style={{ animationDelay: `${delay * 60}ms`, animationFillMode: "both" }}
    >
      <div className="dash-player-bg relative flex items-end gap-4 px-5 pt-5">
        {headshot ? (
          <img src={headshot} alt={fav.name} className={cn("relative z-10 object-cover object-top transition duration-500 group-hover:scale-105", compact ? "h-24 w-28" : "h-36 w-44")} />
        ) : (
          <div className={cn("grid place-items-center rounded-full bg-muted font-bold", compact ? "size-20" : "size-28")}>{fav.name.slice(0, 2)}</div>
        )}
        <div className="relative z-10 min-w-0 flex-1 pb-4">
          {data?.player.teamLogo ? <Logo src={data.player.teamLogo} alt="" size={28} className="mb-1" /> : null}
          <Link to="/$league/player/$playerId" params={{ league, playerId: fav.id }} className="block truncate font-display text-2xl font-bold uppercase leading-tight hover:underline">
            {fav.name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">
            {[data?.player.position, data?.player.jersey && `#${data.player.jersey}`, data?.player.teamName].filter(Boolean).join(" · ") || (loading ? "Loading…" : "")}
          </p>
        </div>
        <FavButton active onClick={onRemove} label={`Remove ${fav.name}`} className="absolute right-3 top-3 z-20" />
      </div>
      <div className="p-5 pt-3">
        <p className="eyebrow mb-2">{data?.seasonLabel ? `${data.seasonLabel} · ${data.highlightTitle}` : "Latest season"}</p>
        {loading ? (
          <Skeleton className="h-14" />
        ) : stats.length ? (
          <div className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-6")}>
            {stats.map((h) => (
              <div key={h.label} className="rounded-lg bg-muted px-2 py-2 text-center">
                <p className="eyebrow">{h.label}</p>
                <p className="stat-num text-lg font-bold text-team">{h.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No recent stats.</p>
        )}
        {!compact && trend.length > 1 ? (
          <div className="mt-4">
            <p className="eyebrow mb-1">{trendLabel} by season</p>
            <div className="flex h-16 items-end gap-1">
              {trend.map((t, i) => (
                <div key={i} className="group/bar relative flex-1" title={`${t.season}: ${t.v}`}>
                  <div
                    className={cn("w-full rounded-t transition-all duration-700", i === trend.length - 1 ? "bg-team" : "bg-team/30")}
                    style={{ height: `${Math.max(6, (t.v / max) * 64)}px` }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function TeamCard({
  league,
  fav,
  data,
  compact,
  onRemove,
  delay,
}: {
  league: LeagueId;
  fav: { id: string; name: string; logo?: string | null; color?: string | null };
  data: TeamData | undefined;
  compact: boolean;
  onRemove: () => void;
  delay: number;
}) {
  const color = `#${data?.team.color ?? fav.color ?? "1d428a"}`;
  const last = data?.games.find((g) => g.state === "post");
  const f = data ? form(fav.id, data.games) : [];
  return (
    <article
      className="surface relative overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-lg animate-in fade-in slide-in-from-bottom-3"
      style={{ animationDelay: `${delay * 60}ms`, animationFillMode: "both" }}
    >
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: color }} />
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-10 blur-2xl"
        style={{ backgroundColor: color }}
      />
      <div className="relative flex items-center gap-4 p-5">
        <Logo src={data?.team.logo ?? fav.logo} alt={fav.name} size={compact ? 48 : 64} />
        <div className="min-w-0 flex-1">
          <Link to="/$league/teams/$teamId" params={{ league, teamId: fav.id }} className="block truncate font-display text-2xl font-bold uppercase hover:underline">
            {fav.name}
          </Link>
          <p className="text-xs text-muted-foreground">
            {data ? `${data.team.record ?? "–"}${data.team.standing ? ` · ${data.team.standing}` : ""}` : "Loading…"}
          </p>
          <div className="mt-2 flex gap-1">
            {data
              ? f.map((r) => (
                  <span
                    key={r.id}
                    className={cn("grid size-6 place-items-center rounded-md text-[11px] font-bold", r.win ? "bg-team text-white" : "bg-muted text-muted-foreground")}
                  >
                    {r.win ? "W" : "L"}
                  </span>
                ))
              : [0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="size-6 rounded-md" />)}
          </div>
        </div>
        <FavButton active onClick={onRemove} label={`Remove ${fav.name}`} />
      </div>
      {!compact && last ? (
        <div className="relative px-5 pb-5">
          <p className="eyebrow mb-2">Latest game</p>
          <GameCardItem game={last} league={league} />
        </div>
      ) : null}
    </article>
  );
}
