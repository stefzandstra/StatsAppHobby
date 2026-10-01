import { Star } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Logo({
  src,
  alt,
  size = 40,
  className,
}: {
  src?: string | null;
  alt: string;
  size?: number;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "grid shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-muted-foreground",
          className,
        )}
        style={{ width: size, height: size }}
      >
        {alt.slice(0, 3).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className={cn("shrink-0 object-contain", className)}
    />
  );
}

/** 36px visual, 44px hit area (Apple HIG / WCAG 2.5.8). */
export function FavButton({
  active,
  onClick,
  label,
  className,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors after:absolute after:-inset-1 after:content-['']",
        active
          ? "bg-brand-soft text-brand"
          : "text-subtle-foreground hover:bg-secondary hover:text-foreground",
        className,
      )}
    >
      <Star className="size-[18px]" fill={active ? "currentColor" : "none"} />
    </button>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  right,
  as: Heading = "h2",
}: {
  eyebrow?: string;
  title: string;
  right?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
        <Heading
          className={cn(
            "font-bold uppercase leading-none",
            Heading === "h1" ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl",
          )}
        >
          {title}
        </Heading>
      </div>
      {right}
    </div>
  );
}

/** Segmented control: one choice out of a few (Hick's law). */
export function Segmented({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="group" className={cn("inline-flex rounded-full bg-secondary p-1", className)}>
      {children}
    </div>
  );
}

export function segmentClass(active: boolean) {
  return cn(
    "inline-flex min-h-9 flex-1 items-center justify-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors",
    active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
  );
}

/** Always visible game status: live gets a dot plus label, never color alone. */
export function StatusBadge({
  state,
  status,
}: {
  state: "pre" | "in" | "post" | string;
  status: string;
}) {
  if (state === "in") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-live/15 px-2 py-0.5 text-xs font-semibold text-live">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-live opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-live" />
        </span>
        Live · {status}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-semibold",
        state === "post" ? "bg-secondary text-muted-foreground" : "bg-brand-soft text-brand",
      )}
    >
      {state === "post" ? status.replace(/^Final/, "Eindstand") : status}
    </span>
  );
}

/**
 * Data table: numbers right-aligned in tabular figures, hairline row dividers
 * (no zebra), sticky header row and sticky first column for horizontal scroll.
 */
export function StatTable({
  labels,
  rows,
  firstColHeader = "Speler",
}: {
  labels: string[];
  rows: Array<{ key: string; label: ReactNode; stats: string[]; muted?: boolean }>;
  firstColHeader?: string;
}) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="eyebrow sticky left-0 z-10 border-b border-border bg-card py-2 pl-4 pr-3 text-left sm:pl-0">
              {firstColHeader}
            </th>
            {labels.map((l, li) => (
              <th
                key={`${l}-${li}`}
                className="eyebrow border-b border-border px-2.5 py-2 text-right whitespace-nowrap last:pr-4 sm:last:pr-0"
              >
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="group">
              <td
                className={cn(
                  "sticky left-0 z-10 max-w-44 border-b border-border/60 bg-card py-1.5 pl-4 pr-3 group-last:border-0 sm:max-w-none sm:pl-0",
                  r.muted && "text-subtle-foreground",
                )}
              >
                {r.label}
              </td>
              {labels.map((l, i) => (
                <td
                  key={i}
                  className={cn(
                    "stat-num border-b border-border/60 px-2.5 py-1.5 text-right whitespace-nowrap group-last:border-0 last:pr-4 sm:last:pr-0",
                    r.muted && "text-subtle-foreground",
                  )}
                >
                  {r.stats[i] ?? "–"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="surface px-6 py-10 text-center text-sm leading-6 text-muted-foreground">
      {children}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-secondary/60", className)} />;
}

export function PageError({ what, error }: { what: string; error: unknown }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div role="alert" className="surface px-6 py-10 text-center">
        <p className="font-display text-2xl font-bold uppercase">{what} laden lukt nu niet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : String(error)}
        </p>
      </div>
    </main>
  );
}
