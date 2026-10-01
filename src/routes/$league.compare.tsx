import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { SectionTitle } from "@/components/nba/ui";
import { useFavorites } from "@/hooks/use-favorites";
import { searchPlayers } from "@/lib/extras.functions";
import { LEAGUES, type LeagueId } from "@/lib/leagues";
import { getPlayerStats } from "@/lib/sports.functions";

const playerQuery = (league: LeagueId, id: string) =>
  queryOptions({
    queryKey: ["player", league, id],
    queryFn: () => getPlayerStats({ data: { league, playerId: id } }),
    staleTime: 5 * 60_000,
  });

export const Route = createFileRoute("/$league/compare")({
  validateSearch: (s: Record<string, unknown>) => ({
    a: s['a'] != null && s['a'] !== '' ? String(s['a']) : undefined,
    b: s['b'] != null && s['b'] !== '' ? String(s['b']) : undefined,
  }),
  head: ({ params }) => {
    const n = LEAGUES[params.league as LeagueId]?.name ?? "League";
    const title = `Compare ${n} players — Statline`;
    const description = `Put two ${n} players side by side and compare their latest season stats.`;
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
  component: Compare,
});

const num = (v: string | undefined) => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};
const LOWER_IS_BETTER = /^(INT|TO|PF|FUM|LOST|SACK)$/i;

function Compare() {
  const { league: raw } = Route.useParams();
  const league = raw as LeagueId;
  const { a, b } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const set = (slot: "a" | "b", id: string | undefined) =>
    navigate({ search: (s) => ({ ...s, [slot]: id }) });

  const qa = useQuery({ ...playerQuery(league, a ?? ""), enabled: !!a });
  const qb = useQuery({ ...playerQuery(league, b ?? ""), enabled: !!b });
  const pa = a ? qa.data : undefined;
  const pb = b ? qb.data : undefined;

  // Categories both players have, compared on their latest season.
  const shared = pa && pb
    ? pa.categories
        .map((ca) => ({ ca, cb: pb.categories.find((c) => c.name === ca.name) }))
        .filter((x) => x.cb && x.ca.rows[0] && x.cb.rows[0])
    : [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <SectionTitle eyebrow="Head to head" title="Compare players" />
      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <Slot league={league} id={a} data={pa} loading={qa.isLoading && !!a} onPick={(id) => set("a", id)} side="left" />
        <Slot league={league} id={b} data={pb} loading={qb.isLoading && !!b} onPick={(id) => set("b", id)} side="right" />
      </div>

      {pa && pb ? (
        shared.length ? (
          <div className="mt-8 space-y-4">
            {shared.map(({ ca, cb }, si) => {
              const ra = ca.rows[0]!;
              const rb = cb!.rows[0]!;
              return (
                <div key={`${ca.name}-${si}`} className="surface animate-in fade-in p-4 sm:p-6">
                  <div className="mb-4 flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                    <span>{ra.season}</span>
                    <p className="eyebrow text-foreground">{ca.name}</p>
                    <span>{rb.season}</span>
                  </div>
                  <div className="space-y-2.5">
                    {ca.labels.map((label, i) => {
                      const j = cb!.labels.indexOf(label);
                      if (j < 0) return null;
                      const va = ra.stats[i];
                      const vb = rb.stats[j];
                      const na = num(va);
                      const nb = num(vb);
                      const total = (Math.abs(na ?? 0) + Math.abs(nb ?? 0)) || 1;
                      const lowWins = LOWER_IS_BETTER.test(label);
                      const aWins = na != null && nb != null && na !== nb && (lowWins ? na < nb : na > nb);
                      const bWins = na != null && nb != null && na !== nb && !aWins;
                      return (
                        <div key={`${label}-${i}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`stat-num ${aWins ? "font-bold text-foreground" : "text-muted-foreground"}`}>{va}</span>
                            <div className="h-2 w-full max-w-40 overflow-hidden rounded-full bg-muted">
                              <div className={`ml-auto h-full rounded-full transition-all duration-700 ${aWins ? "bg-team" : "bg-muted-foreground/40"}`} style={{ width: `${(Math.abs(na ?? 0) / total) * 100}%` }} />
                            </div>
                          </div>
                          <span className="eyebrow w-12 text-center">{label}</span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-full max-w-40 overflow-hidden rounded-full bg-muted">
                              <div className={`h-full rounded-full transition-all duration-700 ${bWins ? "bg-team" : "bg-muted-foreground/40"}`} style={{ width: `${(Math.abs(nb ?? 0) / total) * 100}%` }} />
                            </div>
                            <span className={`stat-num ${bWins ? "font-bold text-foreground" : "text-muted-foreground"}`}>{vb}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="surface mt-8 p-6 text-center text-sm text-muted-foreground">
            These two players don't share any stat categories — try players at similar positions.
          </p>
        )
      ) : (
        <p className="mt-8 text-center text-sm text-muted-foreground">Pick two players to see them head to head.</p>
      )}
    </main>
  );
}

type PlayerData = Awaited<ReturnType<typeof getPlayerStats>>;

function Slot({
  league, id, data, loading, onPick, side,
}: {
  league: LeagueId;
  id: string | undefined;
  data: PlayerData | undefined;
  loading: boolean;
  onPick: (id: string | undefined) => void;
  side: "left" | "right";
}) {
  if (id && (loading || !data)) return <div className="surface h-64 animate-pulse" />;
  if (id && data) {
    const p = data.player;
    return (
      <div className={`surface animate-in fade-in relative flex flex-col items-center p-4 text-center sm:p-6`}>
        <button onClick={() => onPick(undefined)} aria-label="Change player" className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="size-4" />
        </button>
        {p.headshot ? (
          <img src={p.headshot} alt={p.name} className="size-24 rounded-full bg-muted object-cover ring-4 ring-team/30 sm:size-32" />
        ) : (
          <div className="size-24 rounded-full bg-muted sm:size-32" />
        )}
        <Link to="/$league/player/$playerId" params={{ league, playerId: p.id }} className="mt-3 font-display text-lg font-bold uppercase leading-tight hover:underline sm:text-2xl">
          {p.name}
        </Link>
        <p className="text-xs text-muted-foreground">{[p.teamName, p.position, p.jersey && `#${p.jersey}`].filter(Boolean).join(" · ")}</p>
        {data.highlights.length ? (
          <div className="mt-4 grid w-full grid-cols-3 gap-2">
            {data.highlights.slice(0, 3).map((h, hi) => (
              <div key={`${h.label}-${hi}`} className="rounded-lg bg-muted/60 p-2">
                <p className="stat-num text-lg font-bold">{h.value}</p>
                <p className="eyebrow">{h.label}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }
  return <Picker league={league} onPick={onPick} side={side} />;
}

function Picker({ league, onPick }: { league: LeagueId; onPick: (id: string) => void; side: string }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const { players } = useFavorites(league);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const { data: results, isFetching } = useQuery({
    queryKey: ["search", league, debounced],
    queryFn: () => searchPlayers({ data: { league, q: debounced } }),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });
  const list = debounced.length >= 2 ? (results ?? []) : players;

  return (
    <div className="surface flex min-h-64 flex-col p-4">
      <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-team/40">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a player…"
          className="w-full bg-transparent text-sm outline-none"
        />
      </label>
      <p className="eyebrow mb-1 mt-3">{debounced.length >= 2 ? (isFetching ? "Searching…" : "Results") : "Your favorites"}</p>
      {list.length ? (
        <ul className="space-y-1">
          {list.map((p) => (
            <li key={p.id}>
              <button onClick={() => onPick(p.id)} className="flex w-full items-center gap-2 rounded-md p-1.5 text-left text-sm hover:bg-muted">
                {p.headshot ? <img src={p.headshot} alt="" className="size-7 rounded-full bg-muted object-cover" /> : <span className="size-7 rounded-full bg-muted" />}
                <span className="truncate">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          {debounced.length >= 2 ? "No players found." : "Search above, or favorite players to see them here."}
        </p>
      )}
    </div>
  );
}
