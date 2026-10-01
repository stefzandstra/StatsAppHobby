import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronDown,
  CircleAlert,
  Flame,
  Gauge,
  Medal,
  Snowflake,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from "react";

import { Segmented, segmentClass, Skeleton } from "@/components/nba/ui";
import { Button } from "@/components/ui/button";
import type { LeagueId } from "@/lib/leagues";
import { cn } from "@/lib/utils";
import { useTeamColors } from "@/hooks/use-team-colors";
import { getDailyBriefInput } from "@/lib/daily-brief.functions";
import { MOCK_BRIEF_INPUT } from "@/lib/daily-brief.mock";
import { buildDailyBrief } from "@/lib/highlights/engine";
import type { HighlightType, SportFilter, SportsHighlight } from "@/lib/highlights/types";

type BriefFilter = SportFilter;

const LEAGUES_BOTH: LeagueId[] = ["nba", "nfl"];

const KICKER: Record<BriefFilter, { kicker: string; games: (n: number) => string }> = {
  ALL: { kicker: "NBA + NFL in één oogopslag", games: (n) => `${n} wedstrijden` },
  NBA: { kicker: "De basketbalnacht in één oogopslag", games: (n) => `${n} NBA-wedstrijden` },
  NFL: { kicker: "De footballnacht in één oogopslag", games: (n) => `${n} NFL-wedstrijden` },
};

const TYPE_META: Record<
  HighlightType,
  { icon: ComponentType<{ className?: string }>; accent: string; iconWrap: string }
> = {
  performance: { icon: Medal, accent: "text-brief-gold", iconWrap: "bg-brief-gold-soft" },
  hot: { icon: Flame, accent: "text-brief-hot", iconWrap: "bg-brief-hot-soft" },
  cold: { icon: Snowflake, accent: "text-brief-cold", iconWrap: "bg-brief-cold-soft" },
  wtf: { icon: Sparkles, accent: "text-brief-pop", iconWrap: "bg-brief-pop-soft" },
  game: { icon: Trophy, accent: "text-brief-gold", iconWrap: "bg-brief-gold-soft" },
  trend_up: { icon: TrendingUp, accent: "text-brief-up", iconWrap: "bg-brief-up-soft" },
  trend_down: { icon: TrendingDown, accent: "text-brief-down", iconWrap: "bg-brief-down-soft" },
  news: { icon: CircleAlert, accent: "text-brief-news", iconWrap: "bg-brief-news-soft" },
};

const FILTERS: { id: BriefFilter; label: string }[] = [
  { id: "ALL", label: "Voor jou" },
  { id: "NBA", label: "NBA" },
  { id: "NFL", label: "NFL" },
];

export function DailyBrief() {
  const [filter, setFilter] = useState<BriefFilter>("ALL");
  const fetchInput = useServerFn(getDailyBriefInput);
  const live = useQuery({
    queryKey: ["daily-brief-input"],
    queryFn: () => fetchInput(),
    staleTime: 10 * 60 * 1000,
  });
  const usingMock = live.isFetched && !live.data;
  const input = live.data ?? MOCK_BRIEF_INPUT;
  const brief = useMemo(() => buildDailyBrief(input, filter), [input, filter]);
  const colorOf = useTeamColors(LEAGUES_BOTH);
  const slates = (input.slates ?? []).filter((s) => filter === "ALL" || s.sport === filter);
  const loading = live.isPending;
  const highlights = brief.highlights;
  const today = useToday();
  const updated = live.dataUpdatedAt
    ? new Date(live.dataUpdatedAt).toLocaleTimeString("nl-NL", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <main className="min-h-screen text-brief-foreground">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <header className="mb-6">
          <p className="eyebrow mb-2" suppressHydrationWarning>
            {today.date}
          </p>
          <h1
            className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl"
            suppressHydrationWarning
          >
            {today.greeting}
          </h1>
          <p className="mt-2 text-lg text-brief-muted">Dit heb je gemist.</p>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brief-faint">
            <span className="inline-flex items-center gap-1.5">
              <Gauge className="size-3.5" aria-hidden="true" />
              <span className="stat-num">{brief.readTime} sec leestijd</span>
            </span>
            {slates.length ? (
              <span>{slates.map((s) => `${s.sport}: ${s.label}`).join(" · ")}</span>
            ) : null}
            {updated && !usingMock ? (
              <span suppressHydrationWarning>Bijgewerkt {updated}</span>
            ) : null}
          </p>
          {usingMock ? (
            <p
              role="status"
              className="mt-3 inline-flex rounded-full bg-brief-hot-soft px-3 py-1 text-xs font-medium text-brief-hot"
            >
              Live data niet beschikbaar — je ziet voorbeelddata.
            </p>
          ) : null}
        </header>

        <div className="sticky top-14 z-20 -mx-4 mb-6 bg-brief-bg/95 px-4 py-2 backdrop-blur-md sm:static sm:mx-0 sm:bg-transparent sm:p-0">
          <Segmented className="flex w-full sm:inline-flex sm:w-auto">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={segmentClass(filter === item.id)}
              >
                {item.label}
              </button>
            ))}
          </Segmented>
        </div>

        {loading ? (
          <div className="grid gap-4" aria-busy="true">
            <Skeleton className="h-40" />
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-72 lg:col-span-2" />
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
            <p role="status" className="text-center text-xs text-brief-muted">
              De laatste wedstrijden worden geanalyseerd…
            </p>
          </div>
        ) : (
          <>
            <section className="surface mb-10 overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-brief-border px-5 py-4">
                <div>
                  <p className="eyebrow text-brief-gold">Morning brief</p>
                  <h2 className="mt-1 font-display text-2xl font-bold uppercase leading-none">
                    {brief.morning.headline}
                  </h2>
                </div>
                <span className="stat-num shrink-0 rounded-full bg-brief-raised px-2.5 py-1 text-[11px] font-medium text-brief-muted">
                  {brief.morning.seconds} sec
                </span>
              </div>
              <div className="grid gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-2">
                {brief.morning.lines.map((line) => {
                  const meta = TYPE_META[line.type];
                  const Icon = meta.icon;
                  return (
                    <p key={line.text} className="flex items-start gap-3 text-sm leading-6">
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-sm",
                          meta.iconWrap,
                        )}
                      >
                        <Icon className={cn("size-3.5", meta.accent)} />
                      </span>
                      <span className="text-brief-foreground">{line.text}</span>
                    </p>
                  );
                })}
              </div>
              <p className="border-t border-brief-border px-5 py-3 text-xs text-brief-faint">
                {brief.morning.outro}
              </p>
            </section>

            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="eyebrow">Gerangschikt op relevantie</p>
                <h2 className="mt-1 font-display text-3xl font-bold uppercase leading-none">
                  Wat je moet weten
                </h2>
              </div>
              <span className="stat-num text-xs text-brief-faint">
                {highlights.length} highlights
              </span>
            </div>

            <section className="grid items-start gap-4 lg:grid-cols-2">
              {highlights.map((highlight, index) => (
                <HighlightCard
                  key={highlight.id}
                  highlight={highlight}
                  featured={index === 0}
                  colors={(highlight.teamIds ?? []).map((id) =>
                    colorOf(highlight.sport === "NBA" ? "nba" : "nfl", id),
                  )}
                />
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function HighlightCard({
  highlight,
  featured,
  colors,
}: {
  highlight: SportsHighlight;
  featured: boolean;
  colors: (string | undefined)[];
}) {
  const [c1, c2] = colors;
  const teamStyle = (c1 ? { "--tc": c1, "--tc2": c2 ?? c1 } : {}) as CSSProperties;
  const [open, setOpen] = useState(false);
  const meta = TYPE_META[highlight.type];
  const Icon = meta.icon;
  const league = highlight.sport.toLowerCase() as "nba" | "nfl";

  return (
    <article
      style={teamStyle}
      className={cn(
        "surface group relative overflow-hidden transition-colors hover:border-brief-border-strong",
        c1 && "team-wash",
        featured && "lg:col-span-2 lg:grid lg:grid-cols-[1.35fr_0.65fr]",
      )}
    >
      {c1 ? (
        <span aria-hidden="true" className="team-strip absolute inset-x-0 top-0 z-10 h-1.5" />
      ) : null}
      <div className={cn("relative p-5 sm:p-6", featured && "lg:min-h-80 lg:p-8")}>
        <div className="flex items-center justify-between gap-3">
          <div
            className={cn(
              "flex items-center gap-2 text-xs font-semibold uppercase tracking-wide",
              meta.accent,
            )}
          >
            <span className={cn("grid size-7 place-items-center rounded-full", meta.iconWrap)}>
              <Icon className="size-4" />
            </span>
            {highlight.title}
          </div>
          <span className="rounded-full bg-brief-raised px-2.5 py-0.5 text-[11px] font-semibold text-brief-muted">
            {highlight.sport}
          </span>
        </div>

        <div className={cn("relative mt-6", highlight.image && "max-w-[68%] sm:max-w-[72%]")}>
          <p className="text-xs font-medium uppercase text-brief-muted">{highlight.subtitle}</p>
          <h3 className="mt-1 font-display text-3xl font-bold uppercase leading-none sm:text-4xl">
            {highlight.subject}
          </h3>
          <p
            className={cn(
              "stat-num mt-4 font-display text-4xl font-bold leading-none sm:text-5xl",
              meta.accent,
            )}
          >
            {highlight.primaryStat}
          </p>
          {highlight.secondaryStats?.length ? (
            <div className="stat-num mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-brief-muted">
              {highlight.secondaryStats.map((stat) => (
                <span key={stat}>{stat}</span>
              ))}
            </div>
          ) : null}
          <p className="mt-5 max-w-xl text-sm leading-6 text-brief-muted">
            {highlight.explanation}
          </p>
        </div>

        {highlight.image && c1 ? (
          <span
            aria-hidden="true"
            className="absolute bottom-0 right-0 h-[85%] w-[45%] opacity-35"
            style={{ background: `radial-gradient(60% 70% at 60% 80%, ${c1}, transparent 70%)` }}
          />
        ) : null}
        {highlight.image ? (
          <img
            src={highlight.image}
            alt=""
            loading="lazy"
            className={cn(
              "absolute bottom-0 right-0 h-[78%] w-[38%] object-contain object-bottom opacity-90 grayscale-[18%] transition group-hover:grayscale-0",
              featured && "lg:h-[92%] lg:w-[36%]",
            )}
          />
        ) : null}
      </div>

      <div
        className={cn(
          "border-t border-brief-border",
          featured && "lg:flex lg:flex-col lg:justify-end lg:border-l lg:border-t-0",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="h-auto min-h-12 w-full justify-between rounded-none px-5 py-3 text-sm font-medium text-brief-foreground hover:bg-brief-raised hover:text-brief-foreground"
        >
          Waarom is dit bijzonder?
          <ChevronDown
            className={cn("size-4 text-brief-muted transition-transform", open && "rotate-180")}
          />
        </Button>
        {open ? (
          <div className="animate-in fade-in slide-in-from-top-1 border-t border-brief-border px-5 pb-5 pt-4">
            <p className="text-sm leading-6 text-brief-muted">
              {highlight.detail ?? highlight.explanation}
            </p>
            {highlight.playerId ? (
              <Button asChild variant="link" className="mt-3 h-auto p-0 text-brief-foreground">
                <Link
                  to="/$league/player/$playerId"
                  params={{ league, playerId: highlight.playerId }}
                >
                  Bekijk volledige stats <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

const GREETINGS: [number, string][] = [
  [6, "Goedenacht"],
  [12, "Goedemorgen"],
  [18, "Goedemiddag"],
  [24, "Goedenavond"],
];

/** Today's date and a time-of-day greeting, in the reader's own timezone. */
function useToday() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const date = now.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  const hour = now.getHours();
  return {
    date: date.replace(" ", " · "),
    greeting: GREETINGS.find(([until]) => hour < until)?.[1] ?? "Hallo",
  };
}
