---
name: Quantis
description: AI-augmented statistical research platform for higher education and empirical research
colors:
  primary: "#0061bb"
  primary-hover: "#004f9a"
  primary-muted: "#dbeafe"
  neutral-bg: "#ffffff"
  neutral-surface: "#f3f4f6"
  neutral-subtle: "#f9fafb"
  neutral-border: "#e5e7eb"
  neutral-text: "#111827"
  neutral-muted: "#6b7280"
  dark-bg: "#030712"
  dark-surface: "#111827"
  dark-border: "#1f2937"
  dark-text: "#f3f4f6"
  dark-muted: "#9ca3af"
  semantic-missing: "#f43f5e"
  semantic-warning: "#f59e0b"
  semantic-destructive: "#dc2626"
typography:
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "0em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: "0em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  input-text:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  card-container:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: Quantis

## Overview

**Creative North Star: "The Open Scholar's Desk"**

Quantis is a disciplined, scholarly workstation designed for undergraduate students, graduate researchers, and university faculty. It brings the functional precision, variable metadata rigors, and dense data inspection familiar from legacy econometric tools (SPSS, Stata) into a clean, modern web interface. The interface prioritizes scannable empirical data, zero-friction calculation, and transparent scientific reporting over gratuitous decoration.

Aesthetic philosophy centers on Scholarly Precision and Clean Restraint. Every element earns its place through utility: data grids display high-density numerical information without clipping, statistical test outputs follow clear tabular hierarchies with APA standards, and interactive affordances remain calm and tactile. Visual bloat, marketing gradients, and generic SaaS card patterns are deliberately excluded.

The design system harmonizes seamlessly with the National Economics University (NEU) AI Portal design standards, supporting both standalone academic workstations and embedded iframe environments with automatic light and dark mode synchronization.

**Key Characteristics:**
- High-density data grid tables with sticky numerical indices and monospace alignments.
- Authoritative institutional cobalt accent paired with neutral slate-gray surfaces.
- Clear semantic markers for missing data and invalid numerical inputs that educate without obstructing.
- Strict 6px control and 8px container corner rhythm aligned with the NEU AI Portal design language.
- Flat structural layout with purposeful, state-driven elevations.

## Colors

The palette is characterized as "Academic Cobalt & Slate Paper" — an authoritative institutional blue anchored by high-contrast, cool-tinted slate neutrals and functional semantic indicators.

### Primary
- **Academic Cobalt** (#0061bb): The primary brand tone, representing academic authority and scholarly rigor. Used for primary actions, active navigation indicators, key selection rings, and interactive focal points.
- **Cobalt Deep** (#004f9a): Darker hover and pressed state for primary interactive elements.
- **Cobalt Mist** (#dbeafe): Very soft blue tint used for subtle active tab fills and imputed cell highlights (`rgba(0, 97, 187, 0.08)`).

### Neutral
- **Clean Paper** (#ffffff): Default canvas background in light mode and card surfaces.
- **Subtle Wash** (#f9fafb / gray-50): Table striping, secondary container fills, and toolbar backgrounds.
- **Slate Surface** (#f3f4f6 / gray-100): Secondary button backgrounds, inactive tab fills, and hover highlights.
- **Grid Border** (#e5e7eb / gray-200): 1px structural table borders, card dividers, and input outlines.
- **Scholar Ink** (#111827 / gray-900): Primary text, headings, and high-contrast data values.
- **Muted Graphite** (#6b7280 / gray-500): Secondary labels, statistical degree-of-freedom annotations, and table column headers.
- **Abyssal Slate** (#030712 / gray-950): Root page canvas in dark mode (synchronizing with NEU AI Portal's `gray-950`).
- **Card Charcoal** (#111827 / gray-900): Surface fill for cards, modals, and sticky grid headers in dark mode.
- **Dark Divider** (#1f2937 / gray-800): Subtle borders and interactive hover fills in dark mode.

### Semantic
- **Missing Rose** (#f43f5e / tint #fff1f2): Dedicated visual indicator for declared missing values in data tables and summary diagnostics, providing immediate identification without alarmism.
- **Caution Amber** (#f59e0b / tint #fef3c7): Warning state for invalid numeric entries (e.g., text or unparsed comma decimals in numeric columns), accompanied by warning icons.
- **Error Crimson** (#dc2626): Destructive action confirmations, critical API calculation failures, and fatal validation alerts.

### Named Rules
**The 10% Cobalt Rule.** Academic Cobalt is reserved for primary focal actions, active selections, and state highlights. It should cover no more than 10% of any analytical screen to prevent visual fatigue during prolonged research sessions.

**The Semantic Reserve Rule.** Rose, Amber, and Crimson are strictly reserved for data validity states and system alerts. They are never used for decorative accents or unrelated categorizations.

## Typography

**Display Font:** Inter (with system fallback: `ui-sans-serif, system-ui, -apple-system, sans-serif`)
**Body Font:** Inter (with system fallback: `ui-sans-serif, system-ui, -apple-system, sans-serif`)
**Label/Mono Font:** System Monospace (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`)

**Character:** Balanced, crisp, and objective. Inter provides exceptional legibility at small sizes (11px–13px) with dedicated Vietnamese diacritic OpenType adjustments. Monospace is deployed purposefully for numbers, code snippets, formula bars, and matrix cells to guarantee tabular alignment.

### Hierarchy
- **Headline** (Semi-bold 600, 1.125rem (18px), line-height 1.25): Modal titles, main view headers, and primary analysis section titles.
- **Title** (Semi-bold 600, 1rem (16px), line-height 1.5): Card headers, diagnostic subsection titles, and dialog group captions.
- **Body** (Regular 400, 0.875rem (14px), line-height 1.5): Standard analytical text, user instructions, AI narrative interpretations, and form inputs.
- **Label** (Medium 500, 0.75rem (12px), line-height 1.33): Navigation tabs, button labels, badges, variable attributes, and table column names.
- **Data Mono** (Regular 400 & Semi-bold 600, 0.6875rem (11px) – 0.75rem (12px), line-height 1.25, font-mono): Row indices (#), numerical cell values, p-values, test statistics, and formula inputs.

### Named Rules
**The Tabular Numbers Rule.** All statistical results, p-values, regression coefficients, and matrix cells must render with tabular figures or within monospace contexts so decimal points and digit positions align vertically.

**The Scientific Case Rule.** Variable names, statistical metrics (e.g., $R^2$, $F$, $t$, $p$), and formula expressions retain exact scientific capitalization; never apply CSS `uppercase` transformations to statistical symbols.

## Layout

The spatial model is structured around a persistent application shell with a 14-unit (56px) top navigation bar, collapsible left data sidebar (w-64 on desktop, sliding overlay on mobile), and an adaptive main workspace.

- **Grid & Alignment:** Zero-gap collapsed table borders for dense data grids. 16px (1rem) standard card padding and 12px (0.75rem) gap rhythm between analytical toolbars and action bars.
- **Viewport Constraints:** Optimized for full viewport occupancy (`100dvh` / `100vh`), eliminating double scrollbars by keeping navigation and toolbars sticky while data areas scroll independently.
- **Responsive Adaptations:**
  - Desktop (>1024px): Multi-column sidebars, horizontal toolbars, and parallel Data View / Variable View switching.
  - Tablet (768px–1024px): Collapsible drawer navigation and horizontal scrolling toolbar trays (`.toolbar` with `overscroll-behavior-x: contain`).
  - Mobile (<768px): Overlay slide-out menus, full-width touch targets (minimum 44px touch height on interactive tabs), and responsive data tables with touch momentum scrolling.

## Elevation & Depth

Quantis adheres to a flat and structurally layered elevation philosophy. Data tables, toolbars, and content surfaces sit flat on the canvas at rest, using crisp 1px borders (`#e5e7eb` light, `#1f2937` dark) rather than ambient shadows to delineate boundaries. Shadows are deployed strictly as functional elevation cues for floating, dismissible, or sticky interactive elements.

### Shadow Vocabulary
- **Sticky Table Header** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): Anchors column headers above scrolling table content.
- **Dropdown / Context Menu** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): Floats context menus and action dropdowns above the data grid.
- **Modal Dialog** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`): Elevates confirmation dialogs, variable editors, and settings above a 50% opacity backdrop.

### Named Rules
**The Flat Canvas Rule.** Primary data grids, cards, and toolbars are flat at rest. Drop shadows must never be added to standard content cards or table cells; depth is conveyed purely via 1px border contrast and tonal step-downs.

## Shapes

Quantis maintains a disciplined dual-tier corner radius rhythm adhering to the NEU AI Portal specification:
- **Controls & Small Components (6px / `rounded-md`):** Buttons, text inputs, dropdown selects, badges, and tab items use a compact 6px radius (`0.375rem`), conveying precision and structural density.
- **Containers & Overlays (8px / `rounded-lg`):** Modals, confirmation dialogs, settings cards, and floating menu panels use an 8px radius (`0.5rem`).
- **Spreadsheet Grid Cells (0px / `rounded-none`):** Data cells in the spreadsheet view maintain sharp 90-degree corners with collapsed borders to preserve dense tabular alignment.

## Components

Interactive components are characterized as "Refined and Restrained" — compact, quiet at rest, with high-contrast keyboard focus indicators.

### Buttons
- **Shape:** 6px radius (`rounded-md`, 0.375rem).
- **Primary:** Background `#0061bb` (Academic Cobalt), text `#ffffff`, padding 6px 12px (text-sm font-medium). Focus visible: 2px solid `#0061bb` with 2px offset.
- **Hover / Focus:** Hover background `#004f9a` or opacity 90%; smooth 150ms transition.
- **Secondary:** Background `#f3f4f6` (dark: `#1f2937`), text `#111827` (dark: `#f3f4f6`), hover background `#e5e7eb` (dark: `#374151`), padding 6px 12px.
- **Ghost / Icon:** Padding 8px, transparent background, text `#6b7280`, hover background `#f3f4f6` (dark: `#1f2937`), rounded 6px.

### Cards / Containers
- **Corner Style:** 8px radius (`rounded-lg`, 0.5rem).
- **Background:** `#ffffff` (dark: `#111827`).
- **Border:** 1px solid `#e5e7eb` (dark: `#1f2937`).
- **Shadow:** Flat at rest; no ambient shadow.
- **Internal Padding:** 16px (1rem) standard.

### Inputs / Fields
- **Style:** 1px border `#e5e7eb` (dark: `#1f2937`), background `#ffffff` (dark: `#111827`), 6px radius (`rounded-md`), text `#111827` (dark: `#f3f4f6`), padding 6px 12px, font-size 14px (0.875rem).
- **Focus:** 2px ring `#0061bb` (`ring-2 ring-brand`), border-color transparent, outline none.
- **Invalid / Warning:** Border `#f59e0b`, background `#fffbeb` (dark: `#451a03` at 20% opacity).

### Navigation & Tabs
- **Main Header Tabs:** Bottom-bordered tabs (`border-b-2`), min-height 44px, padding 10px 16px. Active state: `border-brand text-brand bg-brand/5 dark:bg-brand/10`. Inactive state: `border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100`.
- **Sub-Tabs & Pills:** Compact 6px rounded pills for secondary analytical navigation (Correlation, Tests, Regression, SEM, etc.).

### Data Grid Cells (Signature Component)
- **Cell Structure:** 0-gap collapsed table cells, padding 0px with inner content padded 4px 10px, 1px solid border (`#e5e7eb` light, `#1f2937` dark).
- **Active State:** Inset 2px ring `#0061bb` with 5% cobalt background (`ring-2 ring-inset ring-brand bg-brand/5`).
- **Missing Value State:** Soft rose tint background `#fff1f2` (dark: `rgba(244, 63, 94, 0.15)`).
- **Invalid Number State:** Soft amber tint background `#fffbeb` (dark: `rgba(245, 158, 11, 0.15)`).
- **Imputed Value State:** Cobalt tint background `rgba(0, 97, 187, 0.1)` with 1px inset ring.

## Do's and Don'ts

### Do:
- **Do** maintain a strict 6px radius (`rounded-md`) for controls and 8px (`rounded-lg`) for modal containers.
- **Do** format all statistical output with monospace tabular numerals and scientific notation where precision demands it.
- **Do** reserve Academic Cobalt (#0061bb) for intentional primary focal points, selections, and active states.
- **Do** highlight missing values with soft rose (#fff1f2) and invalid numeric cells with soft amber (#fffbeb).
- **Do** ensure all interactive elements have visible keyboard focus rings (`outline: 2px solid var(--color-brand); outline-offset: 2px`).

### Don't:
- **Don't** add decorative dropshadows, blurred gradient orbs, or floating glows to standard content cards.
- **Don't** apply uppercase text transformation to variable names or statistical indicators ($p$, $t$, $F$, $R^2$).
- **Don't** round numeric values prematurely in the grid; preserve raw user input precision in data storage.
- **Don't** use saturated red or green accents for standard neutral data states.
- **Don't** introduce non-standard corner radiuses (e.g. 16px, 24px pill buttons) that break the NEU AI Portal alignment.
