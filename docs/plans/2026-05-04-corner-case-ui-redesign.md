# Corner Case UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current glassmorphism / multi-color / motion-heavy dashboard with a hybrid editorial-header + engineering-data design (single terracotta signal color), per the spec at `docs/specs/2026-05-04-corner-case-ui-redesign-design.md`.

**Architecture:** Pure frontend swap. CSS tokens defined once in `globals.css` (CSS custom properties) and mirrored in `lib/tokens.ts` for component-side access. Pages are rewritten inline (Overview, Compare, Gallery) and the component layer drops dead-weight (`SafetyGauge`, `RadarChart`, `SummaryCards`, `ConditionChart`, `BBoxOverlay`) while restyling the rest. No backend or data shape changes.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Recharts (themed), Framer Motion (mostly removed). Three Google Fonts: Inter (sans), Source Serif Pro (serif), JetBrains Mono (mono).

**Verification:** No formal test infrastructure exists in the frontend. Each task is verified by (a) `npx tsc --noEmit` clean, (b) opening the dev server and visually comparing against the approved mockups in `.superpowers/brainstorm/175277-1777860611/content/`, and (c) toggling SEG/DET to confirm both task views render without regressions.

---

## File Map

| Path | Action | Responsibility |
|---|---|---|
| `frontend/src/app/globals.css` | rewrite | CSS custom properties, base typography, removed `.glass-card` / `.mesh-bg` / badges |
| `frontend/src/app/layout.tsx` | modify | Load 3 font families, restyle nav, change container max-width, replace CC pill |
| `frontend/src/app/lib/tokens.ts` | new | Single source of truth for design tokens (TS object) |
| `frontend/src/app/lib/chart-theme.ts` | new | Shared Recharts theme constants |
| `frontend/src/app/lib/headline.ts` | new | Pure deterministic headline derivation |
| `frontend/src/app/components/TaskToggle.tsx` | rewrite | Two-button mono toggle with ink active state |
| `frontend/src/app/components/OverlayLayer.tsx` | modify | Palette swap; missed boxes dashed at 40% opacity |
| `frontend/src/app/components/ImageCompare.tsx` | modify | Update chip / button / overlay color props |
| `frontend/src/app/components/MetricsTable.tsx` | rewrite | Mono table with ink/signal/dim |
| `frontend/src/app/components/ConfidenceDistribution.tsx` | rewrite | Recharts retheme using `chart-theme.ts` |
| `frontend/src/app/components/ClassVulnerability.tsx` | rewrite | Mono table style matching Overview |
| `frontend/src/app/components/SafetyGauge.tsx` | delete | Replaced by metric strip cells |
| `frontend/src/app/components/RadarChart.tsx` | delete | Replaced by condition table bar column |
| `frontend/src/app/components/SummaryCards.tsx` | delete | Inlined into page.tsx |
| `frontend/src/app/components/ConditionChart.tsx` | delete | Inlined into page.tsx |
| `frontend/src/app/components/BBoxOverlay.tsx` | delete | Already dead code |
| `frontend/src/app/page.tsx` | rewrite | Editorial header + metric strip + condition table + findings + footer |
| `frontend/src/app/compare/page.tsx` | rewrite | Title row, controls, side-by-side, metric strip, lower 2-col |
| `frontend/src/app/gallery/page.tsx` | rewrite | Filters + card grid (number-only signaling) |

---

## Task 1: Define design tokens (CSS + TS)

**Files:**
- Modify: `frontend/src/app/globals.css`
- Create: `frontend/src/app/lib/tokens.ts`

- [ ] **Step 1: Replace CSS custom properties in globals.css**

Replace the entire contents of `frontend/src/app/globals.css` with:

```css
@import "tailwindcss";

:root {
  /* Surfaces */
  --bg: #F5F4EE;
  --card: #FFFFFF;

  /* Text */
  --ink: #18181B;
  --ink-2: #2C2A26;
  --muted: #4A4842;
  --meta: #6B6962;
  --dim: #9B9485;

  /* Lines */
  --divider: #D8D5CB;
  --card-brd: #E5E2D6;
  --dim-2: #C5C0B0;

  /* Signals */
  --signal: #B8410F;
  --baseline-overlay: #C5C0B0;

  /* On-image chips */
  --chip-bg: rgba(0, 0, 0, 0.7);
  --chip-fg: #FFFFFF;

  /* Typography */
  --font-serif: "Source Serif 4", "Source Serif Pro", Georgia, serif;
  --font-mono: "JetBrains Mono", Menlo, monospace;
  --font-sans: Inter, system-ui, -apple-system, sans-serif;
}

* { box-sizing: border-box; }

html, body { margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Surface — flat replacement for .glass-card */
.surface {
  background: var(--card);
  border: 1px solid var(--card-brd);
  border-radius: 4px;
}

/* Eyebrow — small uppercase label */
.eyebrow {
  font-family: var(--font-sans);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--meta);
  font-weight: 500;
}

/* Hairline rule */
.hr-ink { border: 0; border-top: 1px solid var(--ink); }
.hr-divider { border: 0; border-top: 1px solid var(--divider); }

/* Mono numerics utility */
.mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

/* Section heading */
.sec-h {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.005em;
  color: var(--ink);
  margin: 0;
}

/* Page title (Overview) */
.page-title {
  font-family: var(--font-serif);
  font-size: 38px;
  line-height: 1.15;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink);
  margin: 0;
}

/* Removed: .glass-card, .mesh-bg, .badge-*, .nav-link-active, .nav-link */

/* Nav link styles */
.nav-link {
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--meta);
  text-decoration: none;
  padding: 6px 0;
  margin: 0 14px;
  position: relative;
}
.nav-link:hover { color: var(--ink); }
.nav-link[aria-current="page"] {
  color: var(--ink);
  border-bottom: 2px solid var(--ink);
}
```

- [ ] **Step 2: Create lib/tokens.ts (TS mirror)**

Create `frontend/src/app/lib/tokens.ts`:

```ts
export const tokens = {
  colors: {
    bg: "#F5F4EE",
    card: "#FFFFFF",
    ink: "#18181B",
    ink2: "#2C2A26",
    muted: "#4A4842",
    meta: "#6B6962",
    dim: "#9B9485",
    dim2: "#C5C0B0",
    divider: "#D8D5CB",
    cardBrd: "#E5E2D6",
    signal: "#B8410F",
    baselineOverlay: "#C5C0B0",
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
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean (no errors). If "Cannot find module" surfaces from anything still importing the deleted CSS classes, leave for the next task.

- [ ] **Step 4: Commit**

```bash
cd Project
git add Corner_Case/frontend/src/app/globals.css Corner_Case/frontend/src/app/lib/tokens.ts
git commit -m "ui: introduce design tokens (CSS vars + lib/tokens.ts)"
```

---

## Task 2: Load new fonts in layout

**Files:**
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Replace the `<head>` font link to include all three families**

Open `frontend/src/app/layout.tsx`. Replace:

```tsx
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
```

with:

```tsx
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&display=swap"
          rel="stylesheet"
        />
```

- [ ] **Step 2: Run dev server and confirm fonts load**

Run: `cd frontend && npm run dev`
Open http://localhost:3000 and DevTools → Network → filter by `font`. Expect three font families to download (Inter, Source Serif 4, JetBrains Mono). Stop dev server.

- [ ] **Step 3: Commit**

```bash
cd Project
git add Corner_Case/frontend/src/app/layout.tsx
git commit -m "ui: load Source Serif 4 and JetBrains Mono fonts"
```

---

## Task 3: Rewrite layout chrome (nav + container)

**Files:**
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Replace the body content of layout.tsx**

Replace the `RootLayout` function body (everything from `<body>` through `</body>`) with:

```tsx
      <body>
        <nav className="sticky top-0 z-50 bg-[var(--bg)] border-b border-[var(--divider)]">
          <div className="max-w-[1100px] mx-auto px-8 flex items-center h-12">
            <span style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: "16px", color: "var(--ink)" }}>
              Corner Case Bench
            </span>
            <div className="ml-8">
              <TaskToggle />
            </div>
            <div className="ml-auto flex">
              <NavLink href="/">Overview</NavLink>
              <NavLink href="/compare">Compare</NavLink>
              <NavLink href="/gallery">Gallery</NavLink>
            </div>
          </div>
        </nav>
        <main className="max-w-[1100px] mx-auto px-16 py-14">{children}</main>
      </body>
```

(The "CC" gradient pill, mesh-bg div, and backdrop-blur are removed.)

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd Project
git add Corner_Case/frontend/src/app/layout.tsx
git commit -m "ui: restyle nav and container chrome (drop CC pill, narrower max-width)"
```

---

## Task 4: Rewrite TaskToggle component

**Files:**
- Rewrite: `frontend/src/app/components/TaskToggle.tsx`

- [ ] **Step 1: Replace the component**

Replace `frontend/src/app/components/TaskToggle.tsx` entirely with:

```tsx
"use client";

import { useTask, type Task } from "../lib/useTask";

const OPTIONS: { value: Task; label: string }[] = [
  { value: "seg", label: "SEG" },
  { value: "det", label: "DET" },
];

export default function TaskToggle() {
  const [task, setTask] = useTask();
  return (
    <div
      className="inline-flex"
      style={{ border: "1px solid var(--ink)", fontFamily: "var(--font-mono)" }}
    >
      {OPTIONS.map((opt, i) => {
        const active = opt.value === task;
        return (
          <button
            key={opt.value}
            onClick={() => setTask(opt.value)}
            aria-pressed={active}
            style={{
              padding: "5px 14px",
              fontSize: "10px",
              letterSpacing: "0.08em",
              border: "none",
              borderLeft: i === 0 ? "none" : "1px solid var(--ink)",
              background: active ? "var(--ink)" : "transparent",
              color: active ? "var(--bg)" : "var(--ink)",
              cursor: "pointer",
              transition: "background 100ms ease, color 100ms ease",
            }}
            onMouseEnter={(e) => {
              if (!active) (e.target as HTMLElement).style.background = "#ECEAE0";
            }}
            onMouseLeave={(e) => {
              if (!active) (e.target as HTMLElement).style.background = "transparent";
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Visual smoke**

Run dev server. The top nav should now show: serif wordmark "Corner Case Bench", monochrome `[SEG][DET]` toggle (one of them inverted), and three minimal nav links. No gradients, no glass.

- [ ] **Step 4: Commit**

```bash
cd Project
git add Corner_Case/frontend/src/app/components/TaskToggle.tsx
git commit -m "ui: redesign TaskToggle as monochrome ink-bordered button pair"
```

---

## Task 5: Add Recharts theme module

**Files:**
- Create: `frontend/src/app/lib/chart-theme.ts`

- [ ] **Step 1: Create the file**

Create `frontend/src/app/lib/chart-theme.ts`:

```ts
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
    synthetic: tokens.colors.signal,
    neutral: tokens.colors.dim2,
  },
} as const;
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd Project
git add Corner_Case/frontend/src/app/lib/chart-theme.ts
git commit -m "ui: add shared Recharts theme tokens"
```

---

## Task 6: Add headline derivation helper

**Files:**
- Create: `frontend/src/app/lib/headline.ts`

- [ ] **Step 1: Create the file**

Create `frontend/src/app/lib/headline.ts`:

```ts
interface ConditionSummary {
  condition: string;
  avg_false_negative_rate: number;
  avg_confidence_drop: number;
}

interface SummaryShape {
  worst_condition?: string | null;
  worst_conf_drop?: number;
  conditions?: ConditionSummary[];
}

const FALLBACK = "Corner Case Bench — robustness report";

/**
 * Derives a one-line page headline from the summary payload.
 *
 * Rule:
 *   - If worst condition's FN rate >= 0.5  → "YOLOv8 misses N% of objects in <cond>."
 *   - Else                                  → "YOLOv8 confidence drops N% under <cond>."
 *   - If worst_condition is missing/null    → static fallback.
 *
 * Examples (use mentally to verify):
 *   { worst_condition: "dense_fog", conditions: [{ condition: "dense_fog", avg_false_negative_rate: 0.767, avg_confidence_drop: 0.032 }] }
 *     → "YOLOv8 misses 77% of objects in dense fog."
 *   { worst_condition: "strong_glare", conditions: [{ condition: "strong_glare", avg_false_negative_rate: 0.20, avg_confidence_drop: 0.119 }] }
 *     → "YOLOv8 confidence drops 12% under strong glare."
 *   { worst_condition: null }
 *     → "Corner Case Bench — robustness report"
 */
export function deriveHeadline(summary: SummaryShape | null | undefined): string {
  if (!summary || !summary.worst_condition) return FALLBACK;
  const cond = summary.conditions?.find((c) => c.condition === summary.worst_condition);
  if (!cond) return FALLBACK;
  const condText = cond.condition.replace(/_/g, " ");
  if (cond.avg_false_negative_rate >= 0.5) {
    return `YOLOv8 misses ${Math.round(cond.avg_false_negative_rate * 100)}% of objects in ${condText}.`;
  }
  return `YOLOv8 confidence drops ${Math.round(cond.avg_confidence_drop * 100)}% under ${condText}.`;
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd Project
git add Corner_Case/frontend/src/app/lib/headline.ts
git commit -m "ui: add deterministic headline derivation"
```

---

## Task 7: Delete dead BBoxOverlay component

**Files:**
- Delete: `frontend/src/app/components/BBoxOverlay.tsx`

(Other obsolete components — SafetyGauge, RadarChart, SummaryCards, ConditionChart — are deleted at the end of Task 13, after the Overview page rewrite drops their imports. Deleting them now would break tsc.)

- [ ] **Step 1: Verify nothing imports BBoxOverlay**

Run: `cd frontend && grep -r "BBoxOverlay" src/`
Expected: only the file itself appears (no consumers).

- [ ] **Step 2: Delete file**

```bash
cd Project/Corner_Case/frontend/src/app/components
rm BBoxOverlay.tsx
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
cd Project
git add -A Corner_Case/frontend/src/app/components/
git commit -m "ui: remove dead BBoxOverlay (no consumers)"
```

---

## Task 8: Restyle OverlayLayer (palette swap + dashed missed)

**Files:**
- Rewrite: `frontend/src/app/components/OverlayLayer.tsx`

- [ ] **Step 1: Replace OverlayLayer with palette-aware version**

Replace `frontend/src/app/components/OverlayLayer.tsx` entirely with:

```tsx
"use client";

import { tokens } from "../lib/tokens";

interface Detection {
  class: string;
  bbox: [number, number, number, number];
  confidence: number;
  polygons?: number[][][];
  missed?: boolean;
}

interface OverlayLayerProps {
  detections: Detection[];
  task: "seg" | "det";
  side: "baseline" | "synthetic";
  imageWidth: number;
  imageHeight: number;
  showLabels?: boolean;
}

export default function OverlayLayer({
  detections,
  task,
  side,
  imageWidth,
  imageHeight,
  showLabels = true,
}: OverlayLayerProps) {
  const stroke = side === "baseline" ? tokens.colors.baselineOverlay : tokens.colors.signal;
  const fill = side === "baseline" ? "rgba(245,244,238,0.10)" : "rgba(184,65,15,0.16)";
  const labelBg = stroke;
  const labelFg = side === "baseline" ? tokens.colors.ink : tokens.colors.bg;

  return (
    <>
      {task === "seg" && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          preserveAspectRatio="none"
        >
          {detections.flatMap((det, i) =>
            (det.polygons ?? []).map((poly, j) => (
              <polygon
                key={`p-${i}-${j}`}
                points={poly.map(([x, y]) => `${x},${y}`).join(" ")}
                fill={fill}
                stroke={stroke}
                strokeWidth={2}
                strokeDasharray={det.missed ? "4 3" : undefined}
                opacity={det.missed ? 0.4 : 1}
                vectorEffect="non-scaling-stroke"
              />
            ))
          )}
        </svg>
      )}

      {detections.map((det, i) => {
        const [x1, y1, x2, y2] = det.bbox;
        const left = `${(x1 / imageWidth) * 100}%`;
        const top = `${(y1 / imageHeight) * 100}%`;
        const width = `${((x2 - x1) / imageWidth) * 100}%`;
        const height = `${((y2 - y1) / imageHeight) * 100}%`;
        const opacity = det.missed ? 0.4 : 1;
        return (
          <div
            key={`b-${i}`}
            className="absolute pointer-events-none"
            style={{ left, top, width, height, opacity }}
          >
            {task === "det" && (
              <div
                className="absolute inset-0"
                style={{
                  border: `2px ${det.missed ? "dashed" : "solid"} ${stroke}`,
                  background: fill,
                }}
              />
            )}
            {showLabels && (
              <span
                className="absolute -top-4 left-0"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  padding: "1px 5px",
                  background: labelBg,
                  color: labelFg,
                  whiteSpace: "nowrap",
                }}
              >
                {det.missed ? "missed" : `${det.class} ${(det.confidence * 100).toFixed(0)}%`}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
```

(Note: the `color` prop is gone; consumers now pass `side="baseline"` or `side="synthetic"` to get the correct palette automatically. The `missed` flag is new and used by Compare.)

- [ ] **Step 2: Type-check (Compare/ImageCompare will break — expected)**

Run: `cd frontend && npx tsc --noEmit`
Expected: errors in `ImageCompare.tsx` because the prop shape changed. That's OK — fixed in Task 9.

- [ ] **Step 3: Commit**

```bash
cd Project
git add Corner_Case/frontend/src/app/components/OverlayLayer.tsx
git commit -m "ui: OverlayLayer uses side-based palette + dashed missed boxes"
```

---

## Task 9: Restyle ImageCompare

**Files:**
- Rewrite: `frontend/src/app/components/ImageCompare.tsx`

- [ ] **Step 1: Replace the component**

Replace `frontend/src/app/components/ImageCompare.tsx` entirely with:

```tsx
"use client";

import { useState } from "react";
import OverlayLayer from "./OverlayLayer";

interface Detection {
  class: string;
  bbox: [number, number, number, number];
  confidence: number;
  polygons?: number[][][];
  missed?: boolean;
}

interface ImageCompareProps {
  imageId: string;
  condition: string;
  task: "seg" | "det";
  baselineDetections: Detection[];
  syntheticDetections: Detection[];
  imageWidth: number;
  imageHeight: number;
}

export default function ImageCompare({
  imageId,
  condition,
  task,
  baselineDetections,
  syntheticDetections,
  imageWidth,
  imageHeight,
}: ImageCompareProps) {
  const [showOverlays, setShowOverlays] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const originalSrc = `/api/images/original/val/${imageId}.jpg`;
  const syntheticSrc = `/api/images/synthetic/${condition}/${imageId}.jpg`;

  const toggleBtn = (label: string, on: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        padding: "4px 10px",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        border: `1px solid ${on ? "var(--ink)" : "var(--card-brd)"}`,
        background: on ? "var(--ink)" : "transparent",
        color: on ? "var(--bg)" : "var(--meta)",
        cursor: "pointer",
        borderRadius: 0,
      }}
    >
      {label}
    </button>
  );

  const chip = (text: string, side: "left" | "right") => (
    <span
      className="absolute"
      style={{
        top: 8,
        [side]: 10,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.04em",
        padding: "2px 7px",
        background: "var(--chip-bg)",
        color: "var(--chip-fg)",
      }}
    >
      {text}
    </span>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {toggleBtn("Overlays", showOverlays, () => setShowOverlays((v) => !v))}
        {toggleBtn("Labels", showLabels && showOverlays, () => setShowLabels((v) => !v))}
        <span className="ml-auto" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--meta)" }}>
          {baselineDetections.length} → {syntheticDetections.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3.5">
        <div className="relative overflow-hidden bg-[#1a1a1a]" style={{ aspectRatio: "16 / 9" }}>
          <img src={originalSrc} alt="Original" className="w-full h-full object-cover block" />
          {chip("ORIGINAL", "left")}
          {chip(`${baselineDetections.length} detected`, "right")}
          {showOverlays && (
            <OverlayLayer
              detections={baselineDetections}
              task={task}
              side="baseline"
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              showLabels={showLabels}
            />
          )}
        </div>
        <div className="relative overflow-hidden bg-[#1a1a1a]" style={{ aspectRatio: "16 / 9" }}>
          <img src={syntheticSrc} alt="Synthetic" className="w-full h-full object-cover block" />
          {chip(condition.toUpperCase(), "left")}
          {chip(`${syntheticDetections.length} detected`, "right")}
          {showOverlays && (
            <OverlayLayer
              detections={syntheticDetections}
              task={task}
              side="synthetic"
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              showLabels={showLabels}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: errors only from `compare/page.tsx` (because page wraps in `glass-card` etc.). Fixed in Task 13.

- [ ] **Step 3: Commit**

```bash
cd Project
git add Corner_Case/frontend/src/app/components/ImageCompare.tsx
git commit -m "ui: ImageCompare uses side-based palette and mono chips/buttons"
```

---

## Task 10: Restyle MetricsTable

**Files:**
- Rewrite: `frontend/src/app/components/MetricsTable.tsx`

- [ ] **Step 1: Read the existing file to keep its API surface**

Run: `cat frontend/src/app/components/MetricsTable.tsx`
Note the props it expects (`matched`, `missed`).

- [ ] **Step 2: Replace the component**

Replace `frontend/src/app/components/MetricsTable.tsx` entirely with:

```tsx
"use client";

interface MatchDetail {
  baseline: { class: string; confidence: number; bbox: [number, number, number, number] };
  synthetic: { class: string; confidence: number; bbox: [number, number, number, number] };
  iou: number;
}

interface MissedDetail {
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
}

interface MetricsTableProps {
  matched: MatchDetail[];
  missed: MissedDetail[];
}

export default function MetricsTable({ matched, missed }: MetricsTableProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <h3 className="sec-h" style={{ fontSize: 15 }}>
          Per-object detail
        </h3>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--meta)" }}>
          matched {matched.length} · missed {missed.length}
        </span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 11 }}>
        <thead>
          <tr>
            <th style={thStyle}>class</th>
            <th style={{ ...thStyle, textAlign: "right" }}>baseline</th>
            <th style={{ ...thStyle, textAlign: "right" }}>synthetic</th>
            <th style={{ ...thStyle, textAlign: "right" }}>iou</th>
          </tr>
        </thead>
        <tbody>
          {matched.map((m, i) => (
            <tr key={`m-${i}`}>
              <td style={tdStyle}>{m.baseline.class}{m.baseline.class !== m.synthetic.class ? ` → ${m.synthetic.class}` : ""}</td>
              <td style={{ ...tdStyle, textAlign: "right", color: "var(--ink)" }}>{(m.baseline.confidence * 100).toFixed(0)}%</td>
              <td style={{ ...tdStyle, textAlign: "right", color: "var(--ink)" }}>{(m.synthetic.confidence * 100).toFixed(0)}%</td>
              <td style={{ ...tdStyle, textAlign: "right" }}>{m.iou.toFixed(2)}</td>
            </tr>
          ))}
          {missed.map((m, i) => (
            <tr key={`x-${i}`}>
              <td style={{ ...tdStyle, color: "var(--signal)" }}>{m.class}</td>
              <td style={{ ...tdStyle, textAlign: "right", color: "var(--ink)" }}>{(m.confidence * 100).toFixed(0)}%</td>
              <td style={{ ...tdStyle, textAlign: "right", color: "var(--signal)" }}>missed</td>
              <td style={{ ...tdStyle, textAlign: "right", color: "var(--meta)" }}>—</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  textAlign: "left" as const,
  fontWeight: 500,
  padding: "8px 0 6px",
  borderBottom: "1px solid var(--ink)",
  color: "var(--meta)",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};
const tdStyle = {
  padding: "7px 0",
  borderBottom: "1px solid var(--card-brd)",
  color: "var(--ink)",
  fontVariantNumeric: "tabular-nums" as const,
};
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 4: Commit**

```bash
cd Project
git add Corner_Case/frontend/src/app/components/MetricsTable.tsx
git commit -m "ui: MetricsTable as mono ink/signal table"
```

---

## Task 11: Retheme ConfidenceDistribution chart

**Files:**
- Rewrite: `frontend/src/app/components/ConfidenceDistribution.tsx`

- [ ] **Step 1: Read existing for the data shape**

Run: `cat frontend/src/app/components/ConfidenceDistribution.tsx`
Note the prop name (`matched`) and the histogram bucketing logic.

- [ ] **Step 2: Replace with themed version**

Replace `frontend/src/app/components/ConfidenceDistribution.tsx` entirely with:

```tsx
"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTheme } from "../lib/chart-theme";

interface MatchDetail {
  baseline: { confidence: number };
  synthetic: { confidence: number };
}

interface Props {
  matched: MatchDetail[];
}

const BUCKETS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

function bucketize(values: number[]): { range: string; count: number }[] {
  return BUCKETS.map((upper, i) => {
    const lower = i === 0 ? 0 : BUCKETS[i - 1];
    const count = values.filter((v) => v > lower && v <= upper).length;
    return { range: `${(upper * 100).toFixed(0)}`, count };
  });
}

export default function ConfidenceDistribution({ matched }: Props) {
  const baseBuckets = bucketize(matched.map((m) => m.baseline.confidence));
  const synthBuckets = bucketize(matched.map((m) => m.synthetic.confidence));
  const data = baseBuckets.map((b, i) => ({
    range: b.range,
    baseline: b.count,
    synthetic: synthBuckets[i].count,
  }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <h3 className="sec-h" style={{ fontSize: 15 }}>
          Confidence distribution
        </h3>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--meta)" }}>
          baseline → synthetic
        </span>
      </div>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 12, right: 8, bottom: 8, left: -12 }}>
            <CartesianGrid stroke={chartTheme.gridLine.stroke} strokeDasharray={chartTheme.gridLine.strokeDasharray} vertical={false} />
            <XAxis
              dataKey="range"
              stroke={chartTheme.axisLine.stroke}
              tick={chartTheme.tickStyle}
              tickLine={false}
            />
            <YAxis
              stroke={chartTheme.axisLine.stroke}
              tick={chartTheme.tickStyle}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={chartTheme.tooltipStyle}
              cursor={{ fill: "rgba(24,24,27,0.04)" }}
            />
            <Legend
              wrapperStyle={{ fontFamily: chartTheme.tickStyle.fontFamily, fontSize: 10, color: chartTheme.tickStyle.fill }}
            />
            <Bar dataKey="baseline" fill={chartTheme.series.baseline} />
            <Bar dataKey="synthetic" fill={chartTheme.series.synthetic} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 4: Commit**

```bash
cd Project
git add Corner_Case/frontend/src/app/components/ConfidenceDistribution.tsx
git commit -m "ui: retheme ConfidenceDistribution with chart-theme tokens"
```

---

## Task 12: Restyle ClassVulnerability table

**Files:**
- Rewrite: `frontend/src/app/components/ClassVulnerability.tsx`

- [ ] **Step 1: Read the existing file for prop shape**

Run: `cat frontend/src/app/components/ClassVulnerability.tsx`
Note the input prop (`data: ClassStat[]`).

- [ ] **Step 2: Replace with mono-table version**

Replace `frontend/src/app/components/ClassVulnerability.tsx` entirely with:

```tsx
"use client";

import { fnLevel } from "../lib/tokens";

interface ClassStat {
  className: string;
  totalBaseline: number;
  totalMissed: number;
  avgConfDrop: number;
}

interface Props {
  data: ClassStat[];
  limit?: number;
}

export default function ClassVulnerability({ data, limit = 8 }: Props) {
  const rows = [...data]
    .sort((a, b) => b.totalMissed / Math.max(1, b.totalBaseline) - a.totalMissed / Math.max(1, a.totalBaseline))
    .slice(0, limit);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <h3 className="sec-h">By class</h3>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--meta)" }}>
          top {Math.min(limit, rows.length)} by miss rate
        </span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={thStyle}>class</th>
            <th style={{ ...thStyle, textAlign: "right" }}>n</th>
            <th style={{ ...thStyle, textAlign: "right" }}>miss%</th>
            <th style={{ ...thStyle, textAlign: "right" }}>avg drop</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const missRate = r.totalMissed / Math.max(1, r.totalBaseline);
            const level = fnLevel(missRate);
            const color =
              level === "signal" ? "var(--signal)" : level === "dim" ? "var(--dim)" : "var(--ink)";
            return (
              <tr key={r.className}>
                <td style={tdStyle}>{r.className}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{r.totalBaseline}</td>
                <td style={{ ...tdStyle, textAlign: "right", color }}>{(missRate * 100).toFixed(1)}%</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{r.avgConfDrop.toFixed(3)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const thStyle = {
  textAlign: "left" as const,
  fontWeight: 500,
  padding: "10px 0 8px",
  borderBottom: "1px solid var(--ink)",
  color: "var(--meta)",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};
const tdStyle = {
  padding: "9px 0",
  borderBottom: "1px solid var(--card-brd)",
  color: "var(--ink)",
  fontVariantNumeric: "tabular-nums" as const,
};
```

- [ ] **Step 3: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors from this file.

- [ ] **Step 4: Commit**

```bash
cd Project
git add Corner_Case/frontend/src/app/components/ClassVulnerability.tsx
git commit -m "ui: ClassVulnerability as mono ink-table"
```

---

## Task 13: Rewrite Overview page

**Files:**
- Rewrite: `frontend/src/app/page.tsx`

- [ ] **Step 1: Replace the page entirely**

Replace `frontend/src/app/page.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ClassVulnerability from "./components/ClassVulnerability";
import { useTask } from "./lib/useTask";
import { deriveHeadline } from "./lib/headline";
import { dropLevel, fnLevel } from "./lib/tokens";

interface ConditionSummary {
  condition: string;
  num_images: number;
  avg_iou: number;
  avg_confidence_drop: number;
  avg_false_negative_rate: number;
  avg_class_flip_rate: number;
}

interface ClassStat {
  className: string;
  totalBaseline: number;
  totalMissed: number;
  avgConfDrop: number;
}

interface SummaryResponse {
  total_images: number;
  worst_condition: string | null;
  worst_conf_drop: number;
  conditions: ConditionSummary[];
  class_stats: ClassStat[];
}

export default function OverviewPage() {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [task] = useTask();

  useEffect(() => {
    setSummary(null);
    fetch(`/api/summary?task=${task}`)
      .then((res) => res.json())
      .then(setSummary)
      .catch((e) => setError(e.message));
  }, [task]);

  if (error) return <p style={{ color: "var(--signal)" }}>Error: {error}</p>;
  if (!summary) return <p style={{ color: "var(--meta)" }}>Loading…</p>;

  const headline = deriveHeadline(summary);
  const worstFn = summary.conditions.length
    ? Math.max(...summary.conditions.map((c) => c.avg_false_negative_rate))
    : 0;
  const meanIou = summary.conditions.length
    ? summary.conditions.reduce((s, c) => s + c.avg_iou, 0) / summary.conditions.length
    : 0;
  const sortedConditions = [...summary.conditions].sort(
    (a, b) => b.avg_false_negative_rate - a.avg_false_negative_rate
  );
  const maxFn = Math.max(0.01, ...sortedConditions.map((c) => c.avg_false_negative_rate));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {/* Editorial header */}
      <div className="eyebrow" style={{ marginBottom: 14 }}>
        Corner Case Bench · Robustness Report
      </div>
      <h1 className="page-title" style={{ marginBottom: 12 }}>{headline}</h1>
      <p style={{
        fontFamily: "var(--font-sans)", fontSize: 15, lineHeight: 1.55, color: "var(--muted)",
        maxWidth: 640, margin: "0 0 18px"
      }}>
        A stress test of YOLOv8m and YOLOv8m-seg under {summary.conditions.length} adverse
        conditions, evaluated on {summary.total_images.toLocaleString()} synthetic corner cases derived
        from the BDD100K val set.
      </p>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--meta)" }}>
        {today} · task = {task} · n = {summary.total_images.toLocaleString()}
      </div>
      <hr className="hr-ink" style={{ marginTop: 32 }} />

      {/* Top-line metric strip */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        borderBottom: "1px solid var(--divider)", margin: "32px 0 40px",
      }}>
        <Metric label="Images" value={summary.total_images.toLocaleString()} />
        <Metric label="Worst FN rate" value={`${(worstFn * 100).toFixed(1)}%`} signal sub={`${summary.worst_condition?.replace(/_/g, " ") ?? "-"} · ${task}`} />
        <Metric label="Largest conf drop" value={summary.worst_conf_drop.toFixed(3)} signal sub={`${summary.worst_condition?.replace(/_/g, " ") ?? "-"} · ${task}`} />
        <Metric label="Mean IoU" value={meanIou.toFixed(2)} sub="across all conditions" last />
      </div>

      {/* By condition table */}
      <SectionHeader title="By condition" meta={`task = ${task} · sorted by FN rate`} />
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-mono)", fontSize: 12, marginBottom: 40 }}>
        <thead>
          <tr>
            <th style={thStyle}>condition</th>
            <th style={{ ...thStyle, textAlign: "right" }}>n</th>
            <th style={{ ...thStyle, textAlign: "right" }}>fn_rate</th>
            <th style={{ ...thStyle, textAlign: "right" }}>iou</th>
            <th style={{ ...thStyle, textAlign: "right" }}>conf_drop</th>
            <th style={{ ...thStyle, width: 140 }}>&nbsp;</th>
          </tr>
        </thead>
        <tbody>
          {sortedConditions.map((c) => {
            const fnL = fnLevel(c.avg_false_negative_rate);
            const dropL = dropLevel(c.avg_confidence_drop);
            const barWidth = (c.avg_false_negative_rate / maxFn) * 138;
            const barColor = fnL === "signal" ? "var(--signal)" : "var(--dim-2)";
            const fnColor = fnL === "signal" ? "var(--signal)" : fnL === "dim" ? "var(--dim)" : "var(--ink)";
            const dropColor = dropL === "signal" ? "var(--signal)" : dropL === "dim" ? "var(--dim)" : "var(--ink)";
            return (
              <tr key={c.condition} style={{ background: "transparent" }}>
                <td style={tdStyle}>{c.condition}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{c.num_images}</td>
                <td style={{ ...tdStyle, textAlign: "right", color: fnColor }}>{c.avg_false_negative_rate.toFixed(3)}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>{c.avg_iou.toFixed(2)}</td>
                <td style={{ ...tdStyle, textAlign: "right", color: dropColor }}>{c.avg_confidence_drop.toFixed(3)}</td>
                <td style={{ ...tdStyle, paddingRight: 0 }}>
                  <span style={{ display: "inline-block", height: 6, width: barWidth, background: barColor, verticalAlign: "middle" }} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Key findings */}
      <SectionHeader title="Key findings" meta="summary" />
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 56, marginBottom: 40 }}>
        <div>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, lineHeight: 1.6, color: "var(--ink-2)", margin: "0 0 14px" }}>
            The model fails <span style={{ color: "var(--signal)" }}>silently</span> rather than noisily under heavy fog and night conditions, registering normal confidence on the few objects it does detect while missing the rest. This is the most dangerous failure mode for autonomy.
          </p>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, lineHeight: 1.6, color: "var(--ink-2)", margin: 0 }}>
            Lighting, not weather, is the harder stressor. Rain and snow leave the model nearly intact; spatially non-uniform lighting (glare, dark, dirty lens) drives confidence drops four to seven times larger.
          </p>
        </div>
        <ul style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, lineHeight: 1.7, listStyle: "none", padding: 0, margin: 0, color: "var(--ink-2)" }}>
          {[
            ["silent_failure", "FN 76.7%, drop 0.03"],
            ["lighting > weather", "4-7× drop ratio"],
            ["hallucination", "traffic_light, bench (-conf)"],
            ["vehicle confusion", "truck flips 111×"],
            ["seg ≈ det", "Δ ≤ 0.02 across metrics"],
          ].map(([k, v]) => (
            <li key={k} style={{ paddingLeft: 16, position: "relative", marginBottom: 6 }}>
              <span style={{ position: "absolute", left: 0, color: "var(--meta)" }}>·</span>
              <span style={{ color: "var(--meta)", marginRight: 6 }}>{k}</span>
              {v}
            </li>
          ))}
        </ul>
      </div>

      {/* Class table */}
      <ClassVulnerability data={summary.class_stats} limit={8} />

      {/* Footer */}
      <div style={{
        marginTop: 48, paddingTop: 18, borderTop: "1px solid var(--divider)",
        display: "flex", justifyContent: "space-between",
        fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--meta)", letterSpacing: "0.03em",
      }}>
        <span>YOLOv8m · YOLOv8m-seg · Ultralytics</span>
        <span>BDD100K val · 1,000 source · {summary.total_images.toLocaleString()} synthetic</span>
        <span>Generator: InstructPix2Pix</span>
      </div>
    </motion.div>
  );
}

function Metric({ label, value, sub, signal, last }: { label: string; value: string; sub?: string; signal?: boolean; last?: boolean }) {
  return (
    <div style={{ padding: "24px 24px 24px 0", borderRight: last ? "none" : "1px solid var(--divider)" }}>
      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--meta)", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: 32, fontWeight: 500, lineHeight: 1,
        color: signal ? "var(--signal)" : "var(--ink)", fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--meta)", marginTop: 6 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
      <h2 className="sec-h">{title}</h2>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--meta)" }}>{meta}</span>
    </div>
  );
}

const thStyle = {
  textAlign: "left" as const,
  fontWeight: 500,
  padding: "10px 12px 10px 0",
  borderBottom: "1px solid var(--ink)",
  color: "var(--meta)",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};
const tdStyle = {
  padding: "10px 12px 10px 0",
  borderBottom: "1px solid var(--card-brd)",
  color: "var(--ink)",
  fontVariantNumeric: "tabular-nums" as const,
};
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean (Overview no longer imports the deleted components).

- [ ] **Step 3: Visual smoke**

Start dev server. Open http://localhost:3000. Compare against the hybrid mockup at `.superpowers/brainstorm/.../content/hybrid-mockup.html`. Confirm:
- Editorial title is data-driven and reflects the actual worst condition.
- Top-line strip uses ink for Images / Mean IoU and signal (terracotta) for Worst FN / Largest conf drop.
- Condition table sorts dense_fog / night_dark to top with terracotta values; rain / snow at bottom in dim.
- No glassmorphism, no gradient mesh, no "CC" pill.

- [ ] **Step 4: Delete now-unused components**

The Overview rewrite no longer imports SafetyGauge / RadarChart / SummaryCards / ConditionChart. Confirm no other file imports them either:

```bash
cd Project/Corner_Case/frontend
grep -rE "SafetyGauge|RadarChart|SummaryCards|ConditionChart" src/
```
Expected: only the four component files themselves match (no consumers).

```bash
cd src/app/components
rm SafetyGauge.tsx RadarChart.tsx SummaryCards.tsx ConditionChart.tsx
```

Type-check after deletion:

```bash
cd ../../..
npx tsc --noEmit
```
Expected: clean.

- [ ] **Step 5: Commit**

```bash
cd Project
git add -A Corner_Case/frontend/src/app/
git commit -m "ui: rewrite Overview and remove obsolete chart components"
```

---

## Task 14: Rewrite Compare page

**Files:**
- Rewrite: `frontend/src/app/compare/page.tsx`

- [ ] **Step 1: Replace the page**

Replace `frontend/src/app/compare/page.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ImageCompare from "../components/ImageCompare";
import MetricsTable from "../components/MetricsTable";
import ConfidenceDistribution from "../components/ConfidenceDistribution";
import { useTask } from "../lib/useTask";
import { dropLevel, fnLevel } from "../lib/tokens";

interface MatchDetail {
  baseline: { class: string; confidence: number; bbox: [number, number, number, number] };
  synthetic: { class: string; confidence: number; bbox: [number, number, number, number] };
  iou: number;
}
interface MissedDetail {
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
}
interface ResultItem {
  image_id: string;
  condition: string;
  avg_iou: number;
  avg_confidence_drop: number;
  false_negative_rate: number;
  class_flip_rate: number;
  matched_details: MatchDetail[];
  missed_details: MissedDetail[];
}
interface OverlayDetection {
  class: string;
  bbox: [number, number, number, number];
  confidence: number;
  polygons?: number[][][];
  missed?: boolean;
}
interface DetailResponse {
  baseline: { detections: OverlayDetection[] } | null;
  synthetic: { detections: OverlayDetection[] } | null;
  image_size: { width: number; height: number };
}

export default function ComparePage() {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [selectedCondition, setSelectedCondition] = useState<string>("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [task] = useTask();

  useEffect(() => {
    fetch(`/api/summary?task=${task}`)
      .then((res) => res.json())
      .then((data) => {
        const conds = data.conditions?.map((c: { condition: string }) => c.condition) ?? [];
        setConditions(conds);
        if (conds.length > 0) setSelectedCondition((prev) => (conds.includes(prev) ? prev : conds[0]));
      });
  }, [task]);

  useEffect(() => {
    if (!selectedCondition) return;
    fetch(`/api/results?condition=${selectedCondition}&task=${task}`)
      .then((res) => res.json())
      .then((data) => {
        setResults(data.results ?? []);
        setSelectedIdx(0);
      });
  }, [selectedCondition, task]);

  const current = results[selectedIdx];

  useEffect(() => {
    if (!current) {
      setDetail(null);
      return;
    }
    setDetail(null);
    const ctrl = new AbortController();
    fetch(
      `/api/results/${current.image_id}?condition=${current.condition}&task=${task}`,
      { signal: ctrl.signal }
    )
      .then((res) => res.json())
      .then(setDetail)
      .catch(() => {});
    return () => ctrl.abort();
  }, [current, task]);

  // Build overlay detections including missed bboxes (drawn only on synthetic side)
  const baselineDets: OverlayDetection[] = detail?.baseline?.detections ?? [];
  const syntheticDets: OverlayDetection[] = (() => {
    const real = detail?.synthetic?.detections ?? [];
    if (!current) return real;
    const missedAsDets: OverlayDetection[] = current.missed_details.map((m) => ({
      class: m.class,
      bbox: m.bbox,
      confidence: m.confidence,
      missed: true,
    }));
    return [...real, ...missedAsDets];
  })();

  const imgW = detail?.image_size.width ?? 1280;
  const imgH = detail?.image_size.height ?? 720;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        paddingBottom: 18, borderBottom: "1px solid var(--ink)", marginBottom: 18,
      }}>
        <h1 className="sec-h" style={{ fontSize: 22 }}>Compare</h1>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--meta)" }}>
          task = {task} · {selectedCondition || "—"} · {results.length ? `${selectedIdx + 1} / ${results.length}` : "- / -"}
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18, fontFamily: "var(--font-mono)", fontSize: 11 }}>
        <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--meta)" }}>condition</span>
        <select
          value={selectedCondition}
          onChange={(e) => setSelectedCondition(e.target.value)}
          style={{
            border: "1px solid var(--card-brd)", background: "transparent",
            padding: "4px 10px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink)",
          }}
        >
          {conditions.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
        </select>
        <NavBtn onClick={() => setSelectedIdx(Math.max(0, selectedIdx - 1))} disabled={selectedIdx === 0}>← prev</NavBtn>
        <NavBtn onClick={() => setSelectedIdx(Math.min(results.length - 1, selectedIdx + 1))} disabled={selectedIdx >= results.length - 1}>next →</NavBtn>
      </div>

      {current && (
        <>
          <ImageCompare
            imageId={current.image_id}
            condition={current.condition}
            task={task}
            baselineDetections={baselineDets}
            syntheticDetections={syntheticDets}
            imageWidth={imgW}
            imageHeight={imgH}
          />

          {/* Per-image metric strip */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            borderTop: "1px solid var(--divider)", borderBottom: "1px solid var(--divider)", marginTop: 18,
          }}>
            <Cell label="IoU" value={current.avg_iou.toFixed(2)} />
            <Cell label="Conf drop" value={`${(current.avg_confidence_drop * 100).toFixed(1)}%`} signal={dropLevel(current.avg_confidence_drop) === "signal"} />
            <Cell label="FN" value={`${(current.false_negative_rate * 100).toFixed(1)}%`} signal={fnLevel(current.false_negative_rate) === "signal"} />
            <Cell label="Class flip" value={`${(current.class_flip_rate * 100).toFixed(1)}%`} last />
          </div>

          {/* Lower 2-col */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginTop: 32 }}>
            <ConfidenceDistribution matched={current.matched_details} />
            <MetricsTable matched={current.matched_details} missed={current.missed_details} />
          </div>
        </>
      )}
    </motion.div>
  );
}

function NavBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "transparent",
        border: `1px solid ${disabled ? "var(--card-brd)" : "var(--ink)"}`,
        padding: "4px 12px",
        fontFamily: "var(--font-mono)", fontSize: 11,
        color: disabled ? "var(--dim)" : "var(--ink)",
        cursor: disabled ? "default" : "pointer",
        borderRadius: 0,
      }}
    >
      {children}
    </button>
  );
}

function Cell({ label, value, signal, last }: { label: string; value: string; signal?: boolean; last?: boolean }) {
  return (
    <div style={{ padding: "14px 16px", borderRight: last ? "none" : "1px solid var(--divider)" }}>
      <div style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--meta)", marginBottom: 6 }}>{label}</div>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 500,
        color: signal ? "var(--signal)" : "var(--ink)", fontVariantNumeric: "tabular-nums",
      }}>{value}</div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Visual smoke**

Start dev server. Open http://localhost:3000/compare. Pick `dense_fog` from the dropdown. Confirm:
- Two images side-by-side, 16:9 aspect ratio.
- Baseline overlays in stone (#C5C0B0); synthetic overlays in terracotta (#B8410F).
- Missed boxes show as dashed terracotta at 40% opacity on the synthetic side, labeled "missed".
- Conf drop / FN cells go terracotta when above thresholds; IoU and Class flip stay ink.
- Toggle SEG → mask polygons appear in same color rules.

- [ ] **Step 4: Commit**

```bash
cd Project
git add Corner_Case/frontend/src/app/compare/page.tsx
git commit -m "ui: rewrite Compare with mono controls and metric strip"
```

---

## Task 15: Rewrite Gallery page

**Files:**
- Rewrite: `frontend/src/app/gallery/page.tsx`

- [ ] **Step 1: Replace the page**

Replace `frontend/src/app/gallery/page.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTask } from "../lib/useTask";
import { dropLevel, fnLevel, isWorstBucket } from "../lib/tokens";

interface GalleryItem {
  image_id: string;
  condition: string;
  avg_confidence_drop: number;
  false_negative_rate: number;
  total_missed: number;
  total_baseline: number;
  avg_iou: number;
}

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"conf_drop" | "fn_rate">("conf_drop");
  const [task] = useTask();

  useEffect(() => {
    fetch(`/api/summary?task=${task}`)
      .then((res) => res.json())
      .then((data) => {
        const conds = data.conditions?.map((c: { condition: string }) => c.condition) ?? [];
        setConditions(conds);
      });
  }, [task]);

  useEffect(() => {
    const base = filter === "all"
      ? `/api/results?per_page=100`
      : `/api/results?condition=${filter}&per_page=100`;
    fetch(`${base}&task=${task}`)
      .then((res) => res.json())
      .then((data) => setItems(data.results ?? []));
  }, [filter, task]);

  const sorted = [...items].sort((a, b) =>
    sortBy === "conf_drop"
      ? b.avg_confidence_drop - a.avg_confidence_drop
      : b.false_negative_rate - a.false_negative_rate
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        paddingBottom: 14, borderBottom: "1px solid var(--ink)", marginBottom: 18,
      }}>
        <h1 className="sec-h">Gallery</h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 11 }}>
          <span style={{ color: "var(--meta)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>filter</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ border: "1px solid var(--card-brd)", background: "transparent", padding: "4px 9px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink)" }}
          >
            <option value="all">all conditions</option>
            {conditions.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "conf_drop" | "fn_rate")}
            style={{ border: "1px solid var(--card-brd)", background: "transparent", padding: "4px 9px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink)" }}
          >
            <option value="conf_drop">worst conf drop</option>
            <option value="fn_rate">worst FN rate</option>
          </select>
          <span style={{ color: "var(--meta)" }}>· {sorted.length} results</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {sorted.map((item) => {
          const worst = isWorstBucket(item.false_negative_rate, item.avg_confidence_drop);
          const dropL = dropLevel(item.avg_confidence_drop);
          const fnL = fnLevel(item.false_negative_rate);
          const dropColor = dropL === "signal" ? "var(--signal)" : dropL === "dim" ? "var(--dim)" : "var(--ink)";
          const barColor = fnL === "signal" ? "var(--signal)" : "var(--dim-2)";
          return (
            <a
              key={`${item.condition}-${item.image_id}`}
              href={`/compare?condition=${item.condition}&id=${item.image_id}`}
              style={{
                background: "var(--card)", border: "1px solid var(--card-brd)", borderRadius: 4,
                overflow: "hidden", textDecoration: "none", color: "inherit",
                transition: "border-color 150ms ease",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--ink)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--card-brd)")}
            >
              <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#1a1a1a" }}>
                <img
                  src={`/api/images/synthetic/${item.condition}/${item.image_id}.jpg`}
                  alt={`${item.condition} ${item.image_id}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                <span style={{
                  position: "absolute", top: 8, left: 10,
                  fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.04em",
                  padding: "2px 6px", background: "var(--chip-bg)", color: "var(--chip-fg)",
                }}>
                  {item.condition.toUpperCase()}
                </span>
                {worst && (
                  <span style={{ position: "absolute", top: 8, right: 10, width: 8, height: 8, background: "var(--signal)" }} />
                )}
              </div>
              <div style={{ padding: "12px 14px", background: "var(--card)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--meta)" }}>{item.image_id}</span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--ink-2)" }}>{item.condition.replace(/_/g, " ")}</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                  <span style={{ fontSize: 22, fontWeight: 500, color: dropColor }}>
                    −{(item.avg_confidence_drop * 100).toFixed(0)}%
                  </span>
                  <span style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--meta)" }}>
                    conf drop
                  </span>
                </div>
                <div style={{ width: "100%", height: 3, background: "#ECEAE0" }}>
                  <div style={{ width: `${Math.min(100, item.false_negative_rate * 100)}%`, height: "100%", background: barColor }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--meta)" }}>
                  <span>fn {(item.false_negative_rate * 100).toFixed(0)}%</span>
                  <span>missed {item.total_missed}/{item.total_baseline}</span>
                  <span>iou {item.avg_iou.toFixed(2)}</span>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Visual smoke**

Start dev server. Open http://localhost:3000/gallery. Confirm:
- 3-column grid of cards on a warm off-white page.
- No CRITICAL / WARNING / OK pills.
- Worst-bucket cards (FN ≥ 50% or drop ≥ 30%) have an 8×8 terracotta square top-right and their `−X%` is terracotta; "fine" cards (low FN+drop) show the percentage in dim gray.
- Hover swaps card border from card-brd to ink with no scale.

- [ ] **Step 4: Commit**

```bash
cd Project
git add Corner_Case/frontend/src/app/gallery/page.tsx
git commit -m "ui: rewrite Gallery with number-only signaling"
```

---

## Task 16: Final verification

**Files:**
- (none — verification only)

- [ ] **Step 1: Type-check the whole frontend**

Run: `cd frontend && npx tsc --noEmit`
Expected: clean output, no errors.

- [ ] **Step 2: Build**

Run: `cd frontend && npm run build`
Expected: build succeeds, no warnings about deleted files.

- [ ] **Step 3: Run dev server and walk all pages**

Start `npm run dev` and run through this checklist:

| | Page | Action | Expected |
|---|---|---|---|
| ☐ | `/` | Load with task=seg | Editorial title, ink/terracotta strip, sorted condition table, dense_fog at top in terracotta |
| ☐ | `/` | Toggle to det | Same layout, numbers shift slightly (det values), still single signal color |
| ☐ | `/compare` | Pick `dense_fog` | Two images side-by-side, baseline = stone overlays, synthetic = terracotta overlays + dashed missed |
| ☐ | `/compare` | Toggle to det | Bbox-only overlays (no polygons), same color rules |
| ☐ | `/gallery` | Load | 3-col grid, worst cards have corner mark + terracotta number, fine cards in dim |
| ☐ | nav | Click between pages | Wordmark stays serif, [SEG][DET] toggle persists, no AI-feel artifacts (no glow, no glassmorphism, no gradient bg) |

If anything regresses, fix it before committing the README update.

- [ ] **Step 4: Update README screenshots paragraph (if any)**

The README currently has no screenshots. No update needed unless you add new ones. Skip.

- [ ] **Step 5: Commit final state (if any cleanups happened during verification)**

If no changes are needed, no commit — just verify.

```bash
cd Project
git status
# If changes:
git add -A Corner_Case/frontend/
git commit -m "ui: post-verification fixes"
```

---

## Out of scope (deferred to follow-up plans)

- Mobile responsive optimization (current layout only "shrinks gracefully").
- Light/dark mode toggle.
- Print stylesheet.
- Replacing Recharts with a hand-rolled SVG bar/distribution.
- Adding test infrastructure (Vitest + Testing Library) — left for a future plan.
