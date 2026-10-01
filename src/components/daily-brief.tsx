import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronDown,
  CircleAlert,
  Compass,
  Flame,
  Gauge,
  Hand,
  House,
  Medal,
  CalendarDays,
  Snowflake,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type ComponentType } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDailyBriefInput } from "@/lib/daily-brief.functions";
import { MOCK_BRIEF_INPUT } from "@/lib/daily-brief.mock";
import { buildDailyBrief } from "@/lib/highlights/engine";
import type { HighlightType, SportFilter, SportsHighlight } from "@/lib/highlights/types";

type BriefFilter = SportFilter;

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
  { id: "ALL", label: "For You" },
  { id: "NBA", label: "NBA" },
  { id: "NFL", label: "NFL" },
];

export function DailyBrief() {
  const [filter, setFilter] = useState<BriefFilter>("ALL");
  const fetchInput = useServerFn(getDailyBriefInput);
  const live = useQuery({ queryKey: ["daily-brief-input"], queryFn: () => fetchInput(), staleTime: 10 * 60 * 1000 });
  const usingMock = live.isFetched && !live.data;
  const input = live.data ?? MOCK_BRIEF_INPUT;
  const brief = useMemo(() => buildDailyBrief(input, filter), [input, filter]);
  const slates = (input.slates ?? []).filter((s) => filter === "ALL" || s.sport === filter);
  const loading = live.isPending;
  const highlights = brief.highlights;

  return (
    <main className="daily-brief-shell min-h-screen pb-24 text-brief-foreground md:pb-12">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-7 sm:px-6 lg:px-8">
        <header className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-brief-muted">Donderdag · 1 oktober</p>
            <h1 className="flex items-center gap-3 font-display text-4xl font-bold uppercase leading-none sm:text-5xl">
              Goedemorgen <Hand className="size-8 text-brief-gold sm:size-10" aria-hidden="true" />
            </h1>
            <p className="mt-2 text-lg text-brief-muted">Dit heb je gemist.</p>
            {slates.length ? (
              <p className="mt-1 text-xs text-brief-faint">
                {slates.map((s) => `${s.sport}: ${s.label}`).join(" · ")}
              </p>
            ) : null}
            {usingMock ? (
              <p className="mt-1 text-xs text-brief-hot">Live data niet beschikbaar — je ziet voorbeelddata.</p>
            ) : null}
          </div>
          <div className="hidden items-center gap-2 rounded-md border border-brief-border bg-brief-card px-3 py-2 text-xs text-brief-muted sm:flex">
            <Gauge className="size-4 text-brief-up" />
            <span>{brief.readTime} sec leestijd</span>
          </div>
        </header>

        <div className="sticky top-[61px] z-20 -mx-4 mb-6 border-y border-brief-border bg-brief-bg/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
          <div className="flex w-full rounded-md bg-brief-card p-1 sm:w-fit">
            {FILTERS.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "h-9 flex-1 rounded-sm px-5 text-brief-muted hover:bg-brief-raised hover:text-brief-foreground sm:flex-none",
                  filter === item.id && "bg-brief-foreground text-brief-inverse hover:bg-brief-foreground hover:text-brief-inverse",
                )}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-md border border-brief-border bg-brief-card" />
            ))}
            <p className="text-center text-xs text-brief-muted">De laatste wedstrijden worden geanalyseerd…</p>
          </div>
        ) : (
        <>
        <section className="mb-8 overflow-hidden rounded-md border border-brief-border bg-brief-card">
          <div className="flex items-center justify-between border-b border-brief-border px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase text-brief-up">Morning brief</p>
              <h2 className="mt-1 font-display text-2xl font-bold uppercase">{brief.morning.headline}</h2>
            </div>
            <span className="rounded-sm bg-brief-raised px-2 py-1 font-mono text-[11px] text-brief-muted">{brief.morning.seconds} SEC</span>
          </div>
          <div className="grid gap-2 px-5 py-4 sm:grid-cols-2">
            {brief.morning.lines.map((line) => {
              const meta = TYPE_META[line.type];
              const Icon = meta.icon;
              return (
                <p key={line.text} className="flex items-start gap-3 text-sm leading-6">
                  <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-sm", meta.iconWrap)}>
                    <Icon className={cn("size-3.5", meta.accent)} />
                  </span>
                  <span className="text-brief-foreground">{line.text}</span>
                </p>
              );
            })}
          </div>
          <p className="border-t border-brief-border px-5 py-3 text-xs text-brief-muted">{brief.morning.outro}</p>
        </section>

        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-brief-muted">Gerangschikt op relevantie</p>
            <h2 className="mt-1 font-display text-3xl font-bold uppercase">Wat je moet weten</h2>
          </div>
          <span className="font-mono text-xs text-brief-muted">{highlights.length} highlights</span>
        </div>

        <section className="grid items-start gap-4 lg:grid-cols-2">
          {highlights.map((highlight, index) => (
            <HighlightCard key={highlight.id} highlight={highlight} featured={index === 0} />
          ))}
        </section>
        </>
        )}
      </div>
      <MobileBriefNav />
    </main>
  );
}

function HighlightCard({ highlight, featured }: { highlight: SportsHighlight; featured: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = TYPE_META[highlight.type];
  const Icon = meta.icon;
  const league = highlight.sport.toLowerCase() as "nba" | "nfl";

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-md border border-brief-border bg-brief-card transition-colors hover:border-brief-border-strong",
        featured && "lg:col-span-2 lg:grid lg:grid-cols-[1.35fr_0.65fr]",
      )}
    >
      <div className={cn("relative p-5 sm:p-6", featured && "lg:min-h-80 lg:p-8")}>
        <div className="flex items-center justify-between gap-3">
          <div className={cn("flex items-center gap-2 text-xs font-bold uppercase", meta.accent)}>
            <span className={cn("grid size-7 place-items-center rounded-sm", meta.iconWrap)}>
              <Icon className="size-4" />
            </span>
            {highlight.title}
          </div>
          <span className={cn("rounded-sm border px-2 py-1 font-mono text-[10px] font-bold", highlight.sport === "NBA" ? "border-brief-nba/40 text-brief-nba" : "border-brief-nfl/40 text-brief-nfl")}>{highlight.sport}</span>
        </div>

        <div className={cn("mt-6", highlight.image && "max-w-[68%] sm:max-w-[72%]")}>
          <p className="text-xs font-medium uppercase text-brief-muted">{highlight.subtitle}</p>
          <h3 className="mt-1 font-display text-3xl font-bold uppercase leading-none sm:text-4xl">{highlight.subject}</h3>
          <p className={cn("mt-5 font-display text-4xl font-bold leading-none sm:text-5xl", meta.accent)}>{highlight.primaryStat}</p>
          {highlight.secondaryStats?.length ? (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs font-medium text-brief-muted">
              {highlight.secondaryStats.map((stat) => <span key={stat}>{stat}</span>)}
            </div>
          ) : null}
          <p className="mt-5 max-w-xl text-sm leading-6 text-brief-muted">{highlight.explanation}</p>
        </div>

        {highlight.image ? (
          <img
            src={highlight.image}
            alt=""
            loading="lazy"
            className={cn("absolute bottom-0 right-0 h-[78%] w-[38%] object-contain object-bottom opacity-90 grayscale-[18%] transition group-hover:grayscale-0", featured && "lg:h-[92%] lg:w-[36%]")}
          />
        ) : null}
      </div>

      <div className={cn("border-t border-brief-border", featured && "lg:flex lg:flex-col lg:justify-end lg:border-l lg:border-t-0")}>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="h-auto w-full justify-between rounded-none px-5 py-4 text-sm text-brief-foreground hover:bg-brief-raised hover:text-brief-foreground"
        >
          Waarom is dit bijzonder?
          <ChevronDown className={cn("size-4 text-brief-muted transition-transform", open && "rotate-180")} />
        </Button>
        {open ? (
          <div className="animate-in fade-in slide-in-from-top-1 border-t border-brief-border px-5 pb-5 pt-4">
            <p className="text-sm leading-6 text-brief-muted">{highlight.detail ?? highlight.explanation}</p>
            {highlight.playerId ? (
              <Button asChild variant="link" className="mt-3 h-auto p-0 text-brief-foreground">
                <Link to="/$league/player/$playerId" params={{ league, playerId: highlight.playerId }}>
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

function MobileBriefNav() {
  const itemClass = "flex min-h-12 flex-col items-center justify-center gap-1 border-t-2 text-[10px] font-semibold";
  return (
    <nav aria-label="Hoofdnavigatie" className="fixed inset-x-0 bottom-0 z-40 border-t border-brief-border bg-brief-bg/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        <Link to="/" className={cn(itemClass, "border-brief-up text-brief-foreground")}>
          <House className="size-4" /> Today
        </Link>
        <Link to="/$league" params={{ league: "nba" }} className={cn(itemClass, "border-transparent text-brief-muted")}>
          <CalendarDays className="size-4" /> Games
        </Link>
        <Link
          to="/$league/compare"
          params={{ league: "nba" }}
          search={{ a: undefined, b: undefined }}
          className={cn(itemClass, "border-transparent text-brief-muted")}
        >
          <Users className="size-4" /> Players
        </Link>
        <Link to="/$league/leaders" params={{ league: "nba" }} className={cn(itemClass, "border-transparent text-brief-muted")}>
          <Compass className="size-4" /> Discover
        </Link>
      </div>
    </nav>
  );
}