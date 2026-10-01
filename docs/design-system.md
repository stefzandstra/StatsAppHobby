# Statline design system

The rules the UI follows, and where they come from. Tokens live in `src/styles.css`, and shared building blocks in `src/components/nba/ui.tsx`.

## Principles

| Rule | Source |
|---|---|
| A light theme by default (off-white base, white cards, hairline borders), with an opt-in dark theme via the moon/sun button in the header (remembered on the device). Dark is never pure black and uses lighter surfaces for depth instead of shadows. | Material dark theme, Apple HIG |
| Three text tones: `foreground`, `muted-foreground` (≥ 4.5:1 on every surface), `subtle-foreground` (meta info only). | WCAG 2.2 AA, Refactoring UI |
| One brand accent (`brand`, amber) for the key value and the active tab. A theme team chosen via "Teamkleuren gebruiken" takes over that accent (lightness clamped for contrast) and adds a line at the top of the header. | Refactoring UI, Apple Sports |
| Team colors on every card: a two-tone strip on top, a faint diagonal wash (`team-wash` with `--tc`/`--tc2`) and a color bar per team row. Team colors are never used for body text. Use `teamColor()` (`src/lib/team-colors.ts`), which switches to the alternate color when the primary is near-black/white; `useTeamColors()` fills in colors when a feed doesn't provide them. | Apple Sports, FotMob |
| Status colors `live`, `win` and `loss` always come with text or a symbol (LIVE badge with a dot, W/V, +/-). | WCAG 1.4.1 |
| Two typefaces: Barlow Condensed (headings and big numbers) and Inter (everything else). Every number uses `stat-num` (tabular figures). | Typography / Tufte |
| Labels are small, uppercase and muted (`eyebrow`); the value is large and bright. | Refactoring UI: hierarchy through de-emphasis |
| Tap targets are at least 44×44 px (`min-h-11`, `size-11`, or `FavButton` with an enlarged hit area). Whole cards and rows are clickable. | Apple HIG, WCAG 2.5.8, Fitts |
| Visible `:focus-visible` ring (2px, brand color) on every control. | WCAG 2.4.7 |
| Tables: numbers right-aligned, hairline dividers (no zebra), sticky header and sticky first column, horizontal scrolling on mobile. | Tufte, Ström-Awn table design |
| One card level (`surface`); no cards inside cards. Group by spacing. | Gestalt (proximity, common region) |
| Phone: a bottom tab bar (Vandaag, Wedstrijden, Stand, Leiders, Mijn). Desktop: a top nav. One league switcher per screen. | Apple HIG, Hick's law |
| Away above home, winner bold with a ◀ marker, loser muted, upcoming games show kickoff in local time. | Sports conventions (Jakob's law) |
| Always show system status: an "updated" time, a notice when showing sample data, skeletons in the shape of the final layout. | Nielsen #1 |
| Progressive disclosure: brief → "Waarom is dit bijzonder?"; box score per team via segmented tabs. | Nielsen #8, Miller |
| UI copy is Dutch. Stat abbreviations (PTS, YDS, Q1) stay standard. | Nielsen #4 (consistency) |

## Building blocks

- `surface` / `surface-link`: a card, plus a hover step for cards that are links.
- `eyebrow`: a label above a heading or value.
- `stat-num`: tabular figures for every number.
- `Segmented` + `segmentClass()`: choose 1 of a few options.
- `StatusBadge`: game status (live, upcoming, final).
- `StatTable`: a stat table with sticky first column.
- `FavButton`: favorite star with a 44px hit area.
- `Skeleton`, `Empty`, `PageError`: loading, empty and error states.
