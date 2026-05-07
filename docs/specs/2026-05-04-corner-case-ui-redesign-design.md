# Corner Case Bench — UI Redesign

**Date:** 2026-05-04
**Status:** Approved (design phase)
**Scope:** Frontend only (Next.js dashboard). No backend or pipeline changes.

## Goals

Move the dashboard away from the generic "AI-generated" aesthetic (glassmorphism, gradient mesh background, 5-color accent palette, glow effects, heavy motion) toward an intentional design that fits the project's nature as a robustness benchmark. The new look pairs an editorial header treatment (serif title, narrative deck, hairline rule) with engineering-style data display (monospace numerics, dense tables, single signal color).

## Non-goals

- Changing the data model, API shape, or page structure (Overview, Compare, Gallery remain).
- Adding new features. This is a visual redesign on top of existing functionality.
- Restyling the underlying ImageCompare overlay logic (positions/scaling stay correct; only colors and typography change).
- Replacing chart library (Recharts stays, just retheme).

## Design tokens

```ts
// frontend/src/app/lib/tokens.ts (new file, exported as TS object + CSS variables)

colors: {
  bg:        '#F5F4EE',  // page background — warm off-white
  card:      '#FFFFFF',  // card / table surface
  ink:       '#18181B',  // primary text, hairline rules, baseline overlays' label tag
  ink2:      '#2C2A26',  // body prose
  muted:     '#4A4842',  // subdued body
  meta:      '#6B6962',  // labels, captions, metadata
  divider:   '#D8D5CB',  // section dividers
  card_brd:  '#E5E2D6',  // card borders
  signal:    '#B8410F',  // terracotta — used ONLY on alert states
  dim:       '#9B9485',  // values that are "fine" / dimmed
  dim2:      '#C5C0B0',  // dim bar fills, dim borders
  baseline_overlay: '#C5C0B0',  // baseline detection box border (Compare)
  // dark image tag chip
  on_dark_bg: 'rgba(0,0,0,0.7)',
  on_dark_fg: '#FFFFFF',
}
```

CSS variables in [globals.css](../../../frontend/src/app/globals.css) are rewritten to expose these. The five existing `--danger / --warning / --success / --primary / --accent` variables are **removed** and any references replaced with `--signal` (only on actual alerts), `--ink`, or `--dim`.

```ts
typography: {
  serif:  "'Source Serif Pro', 'Source Serif 4', Georgia, serif",
  mono:   "'JetBrains Mono', 'Menlo', monospace",
  sans:   "'Inter', system-ui, -apple-system, sans-serif",
}
```

| Role | Family | Used for |
|---|---|---|
| serif | Source Serif Pro | Page titles, section headings, narrative prose paragraphs |
| mono | JetBrains Mono | All numerics, table cells, metadata strips, code-like elements (image_id, timestamps), labels in eyebrow style |
| sans | Inter | Body text, button labels, descriptions where serif would be too heavy |

Both Source Serif Pro and JetBrains Mono need to be loaded — Inter already is. We'll load all via Google Fonts in [layout.tsx](../../../frontend/src/app/layout.tsx) `<head>`.

```ts
spacing: {
  // Use Tailwind's default scale; key vertical rhythms in pages:
  page_padding_y: '56px',
  page_padding_x: '64px',
  section_gap:    '40px',
  block_gap:      '14-18px',
}

borderRadius: {
  none: '0',     // tables, buttons, image containers
  sm:   '2px',   // tight inputs
  md:   '4px',   // cards
  lg:   '8px',   // page-level frames
  // No rounded-2xl/3xl/full anywhere
}
```

No box-shadow values. No `backdrop-filter`. Borders only.

## Removals

- `mesh-bg` div + radial-gradient body background — gone.
- `.glass-card` class — replaced with simple `.surface` class (white background, 1px solid border, optional 4px radius).
- `framer-motion` animations on metric cards, gallery items, condition chart — replaced with a single page-level opacity fade-in (200ms, no Y/scale).
- `.badge-danger` / `.badge-warning` / `.badge-success` — gone (Gallery uses number-only signaling per spec).
- "CC" pill in nav with blue→purple gradient — replaced with text-only wordmark.
- Glow / hover scale effects on gallery cards — replaced with border color change on hover.
- Multi-color severity in [SafetyGauge.tsx](../../../frontend/src/app/components/SafetyGauge.tsx) and other chart components.

## Global chrome

### Top nav ([layout.tsx](../../../frontend/src/app/layout.tsx))

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Corner Case Bench                  [SEG] [DET]    Overview  Compare …   │
└──────────────────────────────────────────────────────────────────────────┘
```

- Background: `var(--bg)`. Sticky. 1px bottom border in `var(--divider)`.
- Wordmark: serif, weight 600, 16px, no icon/badge.
- Task toggle: redesigned to two text buttons with a thin border (1px ink), active state inverts (bg=ink, fg=bg). No glow. See [TaskToggle.tsx](../../../frontend/src/app/components/TaskToggle.tsx) below.
- Nav links: sans 13px, current page underlined with 2px ink line, others muted.

### Page container ([layout.tsx](../../../frontend/src/app/layout.tsx))

- Max width: 1100px (down from 1280px) to give editorial reading rhythm.
- Padding: 56px vertical / 64px horizontal on desktop, 28px / 24px on mobile.
- Background: `var(--bg)` set on `body` directly.

## Page designs

### Overview page

Layout (top to bottom):
1. **Editorial header**
   - Eyebrow: 10px uppercase, letter-spaced, `var(--meta)`. Text: `Corner Case Bench · Robustness Report`.
   - Title (serif, 38px, weight 600, line-height 1.15): a one-liner derived deterministically from `/api/summary`. The selection rule:
     - If `worst_condition`'s FN rate ≥ 0.5: `` `YOLOv8 misses ${(fn * 100).toFixed(0)}% of objects in ${cond.replace('_',' ')}.` ``
     - Else: `` `YOLOv8 confidence drops ${(drop * 100).toFixed(0)}% under ${cond.replace('_',' ')}.` ``
     - Fallback (no data): the static string `Corner Case Bench — robustness report`.
   - Deck (sans 15px, line-height 1.55, max-width 640px, `var(--muted)`): `A stress test of YOLOv8m and YOLOv8m-seg under six adverse conditions, evaluated on N synthetic corner cases derived from the BDD100K val set.`
   - Dateline (mono 11px, `var(--meta)`): `YYYY-MM-DD · run #<hash> · n = N`. Date = today; hash = derived from data file mtimes; N = total images.
   - 1px hairline rule below.

2. **Top-line metric strip** (4 columns, separated by 1px `var(--divider)` lines)
   - Each cell: small uppercase label (10px, meta) + large mono number (32px, ink) + sub-meta (11px mono).
   - Cells: `Images`, `Worst FN rate` (signal-colored), `Largest conf drop` (signal-colored), `Mean IoU`.
   - The two "worst" cells use `var(--signal)`; others use `var(--ink)`.

3. **By-condition table**
   - Section header: serif 18px `By condition` left-aligned, mono meta right-aligned (`task = seg · sorted by FN rate`).
   - Table: 6 columns — `condition`, `n`, `fn_rate`, `iou`, `conf_drop`, bar column.
   - Header row: 10px uppercase mono meta, 1px ink underline.
   - Body: 12px mono. Numerics tabular-nums, right-aligned. Worst rows have `fn_rate` and `conf_drop` in signal; "fine" rows (snow/rain) have those values in `var(--dim)`. Bar column shows a horizontal `var(--signal)` (or dim) rectangle scaled to FN rate.
   - Row hover: `background-color: #ECEAE0`.

4. **Key findings block**
   - Two-column grid (1.4fr / 1fr).
   - Left column: 1-2 short serif paragraphs (15px, line-height 1.6) explaining the headline insight. Inline `<span>` markers for emphasized words use `var(--signal)`.
   - Right column: mono bullet list (11.5px) with kebab-case keys and short values, like `silent_failure  FN 76.7%, drop 0.03`.

5. **Footer** (1px top divider)
   - Three mono 10.5px metadata strings: model name, source/synthetic counts, generator name.

**Components changing for Overview:**
- [SummaryCards.tsx](../../../frontend/src/app/components/SummaryCards.tsx) → replaced by inline metric strip in [page.tsx](../../../frontend/src/app/page.tsx) (no separate component needed; small enough).
- [ConditionChart.tsx](../../../frontend/src/app/components/ConditionChart.tsx) → replaced by the by-condition HTML table. Recharts not used here.
- [SafetyGauge.tsx](../../../frontend/src/app/components/SafetyGauge.tsx) → **removed**. Replaced by the "Mean IoU" cell + "Worst FN" cell in the metric strip.
- [RadarChart.tsx](../../../frontend/src/app/components/RadarChart.tsx) → **removed**. The bar column in the condition table conveys the same comparison more directly.
- [ClassVulnerability.tsx](../../../frontend/src/app/components/ClassVulnerability.tsx) → restyled into the same table aesthetic (mono, ink/signal/dim values, 1px ink divider). Kept on the page as a second table after Findings, titled `By class`.

### Compare page

Layout:
1. **Page top** (single line)
   - Section title (serif 22px, `Compare`).
   - Mono meta (`task = seg · condition · index/total`).
   - 1px ink divider below.

2. **Controls row** (mono 11px throughout)
   - Condition selector: native `<select>` styled with `1px solid var(--card_brd)` border, no chevron beautification.
   - Prev / Next: text buttons with 1px ink border, hover inverts. Disabled state lowers border-color to `var(--card_brd)` and text to `var(--dim)`.
   - Right-aligned: `42 / 200` style nav indicator in mono.

3. **Two-image side-by-side** (replaces the slider)
   - 2-column grid, 14px gap, no border-radius (or 0–4px).
   - Each image card has a thin 16px label chip top-left (`ORIGINAL` / `DENSE_FOG`) and a count chip top-right (`11 detected`). Chips are mono 9-10px, on a 70% black background with white text.
   - Overlays:
     - **baseline (left image)**: 2px solid `var(--baseline_overlay)` (#C5C0B0) with 10% white tint fill. Label tag uses the same color background, ink text.
     - **synthetic (right image)**: 2px solid `var(--signal)` (#B8410F) with 16% terracotta tint fill. Label tag uses signal background, off-white text.
     - **missed boxes** (in synthetic only): 2px **dashed** signal border, 40% opacity, label `missed`.
   - Mask polygons (seg mode): same color rules — baseline polygons use `var(--baseline_overlay)` stroke + 10% fill; synthetic polygons use signal stroke + 16% fill.
   - Toggle row above images: two mono buttons `Overlays`, `Labels` (1px border, active state inverts).

4. **Per-image metric strip** (4 columns, same style as Overview's strip but smaller)
   - Cells: `IoU`, `Conf drop`, `FN`, `Class flip`.
   - `Conf drop` cell colors by threshold: `var(--signal)` if `≥ 0.3`, else `var(--ink)`.
   - `FN` cell colors by threshold: `var(--signal)` if `≥ 0.5`, else `var(--ink)`.
   - `IoU` and `Class flip` always render in `var(--ink)` (no threshold treatment).

5. **Two-column lower row**
   - Left: `ConfidenceDistribution` chart, restyled — baseline histogram in `var(--baseline_overlay)`, synthetic histogram in `var(--signal)`. No glow, no rounded corners. Axis labels in mono 10px meta.
   - Right: `MetricsTable` — restyled per-object table (mono numerics, 1px ink header divider, signal text for missed objects, ink for matched).

**Components changing for Compare:**
- [ImageCompare.tsx](../../../frontend/src/app/components/ImageCompare.tsx) → palette swap (baseline color from `#22c55e` → `#C5C0B0`, synthetic from `#ef4444` → `#B8410F`). Slider already replaced earlier; only chip + button styles update.
- [OverlayLayer.tsx](../../../frontend/src/app/components/OverlayLayer.tsx) → palette swap; missed boxes now dashed with 40% opacity.
- [ConfidenceDistribution.tsx](../../../frontend/src/app/components/ConfidenceDistribution.tsx) → Recharts retheme (colors, font family, no shadows, no rounded bars).
- [MetricsTable.tsx](../../../frontend/src/app/components/MetricsTable.tsx) → restyle to mono table.

### Gallery page

Layout:
1. **Page top** with title (serif 18px `Gallery`), filter controls (mono selects: `condition`, `sort by`), `1259 results` mono meta. 1px ink divider.

2. **3-column card grid**, 14px gap. Each card:
   - Image area (16:9, no border-radius, 1px border `var(--card_brd)` only on the bottom — image bleeds top).
   - Top-left chip: mono uppercase condition name (e.g., `DENSE_FOG`).
   - Top-right: 8×8 solid `var(--signal)` square — present **only** when card is in the worst-bucket (FN ≥ 0.5 or conf drop ≥ 0.3). Otherwise nothing.
   - Card body (12px 14px padding, white background):
     - Top row: image_id (mono 10px, meta) on left, condition name (sans 11px, ink2) on right.
     - Big stat: large mono number `−47%` (22px) + small uppercase label `conf drop`. Number uses `var(--signal)` if worst-bucket; `var(--dim)` if "fine" (FN ≤ 0.2 and drop ≤ 0.05); `var(--ink)` otherwise.
     - 3px horizontal bar showing FN rate: `var(--signal)` if worst, `var(--dim2)` otherwise.
     - Bottom small row: `fn 73%`, `missed 8/11`, `iou 0.31` — mono 10px meta, three columns.
   - Card hover: border-color goes from `var(--card_brd)` → `var(--ink)`. No scale, no shadow.

3. **No CRITICAL / WARNING / OK badges**. Severity is communicated entirely via:
   - The corner mark on worst cards.
   - Color of the big number (signal / ink / dim).
   - Bar fill color.

**Components changing for Gallery:**
- [gallery/page.tsx](../../../frontend/src/app/gallery/page.tsx) → drop the `getSeverityBadge` helper and the colored progress bar variants. Implement the new card body inline (no new sub-component).

## Component-level details

### TaskToggle ([components/TaskToggle.tsx](../../../frontend/src/app/components/TaskToggle.tsx))

```
┌──────┬──────┐
│ SEG  │ DET  │
└──────┴──────┘
```

- Two equal-width text buttons inside a 1px solid ink container with a divider in the middle.
- Inactive: text `var(--ink)`, bg transparent.
- Active: bg `var(--ink)`, text `var(--bg)`.
- Hover (inactive only): bg `#ECEAE0`.
- Mono 10px uppercase labels, letter-spacing 0.08em.
- Padding 5px 14px.
- No rounded corners.
- All transitions 100ms ease.

### Recharts retheme

Single shared theme object exported from [lib/chart-theme.ts](../../../frontend/src/app/lib/chart-theme.ts) (new file):
- `tick`: `{ fill: '#6B6962', fontFamily: 'JetBrains Mono', fontSize: 10 }`
- `axisLine`: `{ stroke: '#18181B' }`
- `gridLine`: `{ stroke: '#E5E2D6', strokeDasharray: '2 2' }`
- Bar colors: `var(--signal)` for "bad" series, `var(--baseline_overlay)` for "baseline" series.
- No `<defs>` gradients.
- Tooltip: 1px ink border, white background, mono text, no shadow.

### Motion / animation

- **Removed**: framer-motion `motion.div` initialAnim on metric cards, gallery cards, condition chart, safety alert pulsing.
- **Kept**: page-level `motion.div` opacity 0→1 over 200ms when route content first mounts (for compare's image swap and gallery's filter change). Subtle, single-property only.

## What stays the same

- Backend API contract (no changes).
- Routing structure (Overview at `/`, Compare at `/compare`, Gallery at `/gallery`).
- Task toggle behavior (localStorage, `?task=` param).
- All data flows in [page.tsx](../../../frontend/src/app/page.tsx), [compare/page.tsx](../../../frontend/src/app/compare/page.tsx), [gallery/page.tsx](../../../frontend/src/app/gallery/page.tsx).

## Files touched

```
frontend/src/app/
├── globals.css                 (rewrite tokens; remove glass / mesh / glows)
├── layout.tsx                  (load fonts, restyle nav, max-width, replace CC pill)
├── lib/
│   ├── tokens.ts               (NEW — exported tokens)
│   ├── chart-theme.ts          (NEW — Recharts theme)
│   └── useTask.ts              (no change)
├── page.tsx                    (rewrite Overview body)
├── compare/page.tsx            (controls + lower section restyle)
├── gallery/page.tsx            (card body rewrite)
└── components/
    ├── TaskToggle.tsx          (restyle)
    ├── ImageCompare.tsx        (palette swap on overlays + chips/buttons)
    ├── OverlayLayer.tsx        (palette swap, dashed missed)
    ├── ConfidenceDistribution.tsx  (chart retheme)
    ├── MetricsTable.tsx        (restyle to mono)
    ├── ClassVulnerability.tsx  (restyle to ink table)
    ├── SummaryCards.tsx        (DELETE — replaced by inline strip)
    ├── ConditionChart.tsx      (DELETE — replaced by inline table)
    ├── SafetyGauge.tsx         (DELETE)
    ├── RadarChart.tsx          (DELETE)
    └── BBoxOverlay.tsx         (already dead code from earlier work — DELETE)
```

## Out of scope (for this redesign)

- Mobile responsive treatment beyond the existing layout. The dashboard is desktop-first; we leave mobile behavior at "shrinks gracefully but not optimized."
- Internationalization. Copy stays in English (chrome/labels) and Korean (any future copy in CLAUDE.md / README is unaffected).
- Light/dark mode toggle. The dashboard is light-only.
- Print stylesheet (potential future work — the editorial layout would translate well, but not in this PR).

## Verification

After implementation, verify by:
1. `npx tsc --noEmit` clean.
2. Open `/`, `/compare`, `/gallery` in dev — visually compare against the three approved mockups in `.superpowers/brainstorm/.../content/`.
3. Toggle SEG/DET — both views render without color-palette regressions.
4. Pick a "worst" image in Compare — terracotta overlays appear only on synthetic side; baseline is dim stone.
5. Browse Gallery — corner mark appears only on worst-bucket cards (FN ≥ 50% or drop ≥ 30%).
6. Browse Gallery and Overview at the same time — confirm only one signal color (terracotta) appears on either page.
