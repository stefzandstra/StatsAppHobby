import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/nba/ui";
import type { LeagueId } from "@/lib/leagues";
import type { GameCard as Game, TeamSide } from "@/lib/sports.functions";
import { cn } from "@/lib/utils";

function Row({ side, final }: { side: TeamSide; final: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Logo src={side.logo} alt={side.abbrev || side.short} size={32} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-semibold",
            final && !side.winner && "text-muted-foreground",
          )}
        >
          {side.short || side.name}
        </p>
        {side.record ? <p className="text-xs text-muted-foreground">{side.record}</p> : null}
      </div>
      <span
        className={cn(
          "stat-num text-lg font-semibold tabular-nums",
          final && !side.winner && "text-muted-foreground",
        )}
      >
        {side.score ?? "–"}
      </span>
    </div>
  );
}

export function GameCardItem({ game, league }: { game: Game; league: LeagueId }) {
  const final = game.state === "post";
  const live = game.state === "in";
  return (
    <Link
      to="/$league/game/$gameId"
      params={{ league, gameId: game.id }}
      className="surface block p-4 transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="eyebrow">{game.venue ?? "NBA"}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            live ? "bg-team-accent/20 text-foreground" : "team-chip",
          )}
        >
          {live ? `LIVE · ${game.status}` : game.status}
        </span>
      </div>
      <div className="space-y-3">
        <Row side={game.away} final={final} />
        <Row side={game.home} final={final} />
      </div>
    </Link>
  );
}
