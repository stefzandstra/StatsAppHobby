import { Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";

import { Logo, StatusBadge } from "@/components/nba/ui";
import type { LeagueId } from "@/lib/leagues";
import type { GameCard as Game, TeamSide } from "@/lib/sports.functions";
import { useTeamColors } from "@/hooks/use-team-colors";
import { teamColor } from "@/lib/team-colors";
import { cn } from "@/lib/utils";

function Row({
  side,
  final,
  pre,
  color,
}: {
  side: TeamSide;
  final: boolean;
  pre: boolean;
  color: string;
}) {
  const lost = final && !side.winner;
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="h-8 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <Logo src={side.logo} alt={side.abbrev || side.short} size={28} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[15px] font-semibold leading-5",
            lost && "font-medium text-muted-foreground",
          )}
        >
          {side.short || side.name}
        </p>
        {side.record ? (
          <p className="stat-num text-xs leading-4 text-subtle-foreground">{side.record}</p>
        ) : null}
      </div>
      <span
        className={cn(
          "stat-num font-display text-2xl font-bold leading-none",
          lost && "font-semibold text-subtle-foreground",
        )}
      >
        {pre ? "" : (side.score ?? "")}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "w-0 border-y-[5px] border-r-[6px] border-y-transparent",
          final && side.winner ? "border-r-foreground" : "border-r-transparent",
        )}
      />
    </div>
  );
}

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

/** Away above home (US convention); the whole card is the tap target. */
export function GameCardItem({ game, league }: { game: Game; league: LeagueId }) {
  const final = game.state === "post";
  const pre = game.state === "pre";
  // Some feeds (team schedules) omit colors; fall back to the cached team list.
  const colorOf = useTeamColors([league]);
  const sideColor = (s: TeamSide) =>
    s.color ? teamColor(s.color, s.altColor) : (colorOf(league, s.id) ?? teamColor(null, null));
  const away = sideColor(game.away);
  const home = sideColor(game.home);
  const colors = { "--tc": away, "--tc2": home } as CSSProperties;
  return (
    <Link
      to="/$league/game/$gameId"
      params={{ league, gameId: game.id }}
      style={colors}
      className="surface surface-link team-wash relative block overflow-hidden p-4 pt-5"
    >
      <span aria-hidden="true" className="team-strip absolute inset-x-0 top-0 h-1.5" />
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="eyebrow truncate" suppressHydrationWarning>
          {dateLabel(game.date)}
        </span>
        {/* Upcoming games show kickoff in the reader's own timezone. */}
        <span suppressHydrationWarning>
          <StatusBadge state={game.state} status={pre ? timeLabel(game.date) : game.status} />
        </span>
      </div>
      <div className="space-y-2.5">
        <Row side={game.away} final={final} pre={pre} color={away} />
        <Row side={game.home} final={final} pre={pre} color={home} />
      </div>
    </Link>
  );
}
