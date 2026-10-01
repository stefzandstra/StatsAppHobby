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
        className={cn("grid place-items-center rounded-full bg-muted text-xs font-bold", className)}
        style={{ width: size, height: size }}
      >
        {alt.slice(0, 3).toUpperCase()}
      </div>
    );
  }
  return (
    <img src={src} alt={alt} width={size} height={size} className={cn("object-contain", className)} />
  );
}

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
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors",
        active
          ? "border-transparent bg-team text-white"
          : "border-border bg-card text-muted-foreground hover:border-team hover:text-team",
        className,
      )}
    >
      <Star className="size-4" fill={active ? "currentColor" : "none"} />
    </button>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="text-2xl font-bold uppercase">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function StatTable({
  labels,
  rows,
  firstColHeader = "Player",
}: {
  labels: string[];
  rows: Array<{ key: string; label: ReactNode; stats: string[]; muted?: boolean }>;
  firstColHeader?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full border-collapse text-sm"
        style={{ minWidth: `${Math.min(46, 14 + labels.length * 3.5)}rem` }}
      >

        <thead>
          <tr className="border-b border-border text-left">
            <th className="eyebrow py-2 pr-3 font-semibold">{firstColHeader}</th>
            {labels.map((l, li) => (
              <th key={`${l}-${li}`} className="eyebrow px-2 py-2 text-right font-semibold whitespace-nowrap">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-border/60 last:border-0">
              <td className={cn("py-2 pr-3", r.muted && "text-muted-foreground")}>{r.label}</td>
              {labels.map((l, i) => (
                <td key={i} className="stat-num px-2 py-2 text-right whitespace-nowrap">
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
    <div className="surface p-8 text-center text-sm text-muted-foreground">{children}</div>
  );
}
