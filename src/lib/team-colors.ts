/** Pure team-color helpers, shared by components and hooks. */

const luminance = (hex: string) => {
  const n = parseInt(hex, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

/**
 * A team's primary color as `#rrggbb`. Near-black or near-white primaries
 * (they vanish on one of the two themes) fall back to the alternate color.
 */
export function teamColor(color?: string | null, alt?: string | null): string {
  const clean = (c?: string | null) =>
    c && /^#?[0-9a-f]{6}$/i.test(c) ? c.replace("#", "") : null;
  const main = clean(color);
  const second = clean(alt);
  if (!main) return second ? `#${second}` : "#64748b";
  const l = luminance(main);
  if ((l < 0.012 || l > 0.85) && second) {
    const l2 = luminance(second);
    if (l2 >= 0.012 && l2 <= 0.85) return `#${second}`;
  }
  return `#${main}`;
}
