import { tokens } from "./tokens";

export const chartTheme = {
  tickStyle: {
    fill: tokens.colors.meta,
    fontFamily: tokens.fonts.mono,
    fontSize: 10,
  },
  axisLine: { stroke: tokens.colors.ink },
  gridLine: { stroke: tokens.colors.cardBrd, strokeDasharray: "2 2" },
  tooltipStyle: {
    background: tokens.colors.card,
    border: `1px solid ${tokens.colors.ink}`,
    borderRadius: 0,
    fontFamily: tokens.fonts.mono,
    fontSize: 11,
    color: tokens.colors.ink,
    boxShadow: "none",
  },
  series: {
    baseline: tokens.colors.baselineOverlay,
    synthetic: tokens.colors.signalBar,
    neutral: tokens.colors.dim2,
  },
} as const;
