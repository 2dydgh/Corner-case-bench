export const tokens = {
  colors: {
    bg: "#FFFFFF",
    card: "#FFFFFF",
    ink: "#18181B",
    ink2: "#2A2A2D",
    muted: "#4B4B4F",
    meta: "#6B6B70",
    dim: "#9B9BA0",
    dim2: "#D0D0D0",
    divider: "#E5E5E5",
    cardBrd: "#EBEBEB",
    signal: "#A86A00",
    signalBg: "#FFE96B",
    signalBar: "#FFE96B",
    baselineOverlay: "#C0C0C0",
    chipBg: "rgba(0,0,0,0.7)",
    chipFg: "#FFFFFF",
  },
  fonts: {
    serif: "'Source Serif 4', 'Source Serif Pro', Georgia, serif",
    mono: "'JetBrains Mono', Menlo, monospace",
    sans: "Inter, system-ui, -apple-system, sans-serif",
  },
} as const;

/** Threshold rules (must match the spec). */
export const thresholds = {
  signalFn: 0.5,
  signalDrop: 0.3,
  dimFn: 0.2,
  dimDrop: 0.05,
} as const;

/** Returns "signal" / "ink" / "dim" given an FN-rate value. */
export function fnLevel(fn: number): "signal" | "ink" | "dim" {
  if (fn >= thresholds.signalFn) return "signal";
  if (fn <= thresholds.dimFn) return "dim";
  return "ink";
}

/** Returns "signal" / "ink" / "dim" given a confidence-drop value. */
export function dropLevel(drop: number): "signal" | "ink" | "dim" {
  if (drop >= thresholds.signalDrop) return "signal";
  if (drop <= thresholds.dimDrop) return "dim";
  return "ink";
}

/** "Worst-bucket" predicate for Gallery cards / corner marks. */
export function isWorstBucket(fn: number, drop: number): boolean {
  return fn >= thresholds.signalFn || drop >= thresholds.signalDrop;
}
