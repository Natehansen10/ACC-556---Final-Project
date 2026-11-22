---
name: Family Health Tracker
description: One family's daily health habits on one board.
colors:
  ink: "#1c1b1a"
  muted-ink: "#5e5a54"
  page: "#f7f1e8"
  surface: "#fffdf8"
  divider: "#e1dcd3"
  track: "#ece4d6"
  upcoming: "#cfc9bf"
  faint: "#878279"
  focus: "#4a4741"
  charcoal-900: "#19191c"
  charcoal-800: "#222428"
  stone-700: "#4a4741"
  stone-600: "#6b665e"
  stone-500: "#a8a5a0"
  stone-200: "#e6dfd3"
  stone-100: "#efe9de"
  olive-100: "#eef0e4"
  olive-500: "#5c6f5d"
  olive-600: "#4f6150"
  olive-700: "#34432f"
  error-800: "#991b1b"
  error-50: "#fef2f2"
  strava: "#c93b00"
  strava-ink: "#b33400"
  viz-series: "#9a6417"
  viz-track: "#efe0c2"
  viz-track-edge: "#9a6417"
  viz-month-1: "#b8893f"
  viz-month-2: "#9a6417"
  viz-month-3: "#6b4510"
  viz-grid: "#e1dcd3"
  viz-ink: "#1c1b1a"
typography:
  display:
    fontFamily: "Instrument Serif, Iowan Old Style, Palatino Linotype, Georgia, serif"
    fontSize: "2.5rem"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Instrument Serif, Iowan Old Style, Palatino Linotype, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.15
  title:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.75rem"
    lineHeight: 1.625
rounded:
  sm: "2px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.charcoal-800}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.charcoal-900}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    borderColor: "{colors.stone-700}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "44px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.stone-700}"
    rounded: "{rounded.full}"
    height: "44px"
  button-quiet-hover:
    backgroundColor: "{colors.stone-100}"
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.divider}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.stone-700}"
    rounded: "{rounded.xl}"
    height: "44px"
  segment-track:
    backgroundColor: "{colors.track}"
    rounded: "{rounded.full}"
  segment-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.divider}"
    rounded: "{rounded.full}"
    height: "44px"
  check-row:
    backgroundColor: "{colors.page}"
    borderColor: "{colors.divider}"
    rounded: "{rounded.xl}"
    height: "64px"
  check-row-done:
    backgroundColor: "{colors.olive-100}"
    textColor: "{colors.olive-700}"
  day-dot-done:
    backgroundColor: "{colors.olive-600}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    size: "24px"
  header:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    borderColor: "{colors.divider}"
  tab-active:
    backgroundColor: "{colors.charcoal-800}"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
---

# Design System: Family Health Tracker

This file records the visual system after the Nov 2026 "Oatmeal" redesign (branch `feat/oatmeal-redesign`). Change it together with `app/globals.css` and `components/ui.tsx`.

The system was adapted from `design/DESIGN.reference.md`, an analysis of Oura's design language (OpenDesignMD, MIT). That file is a reference for feel only. The tokens in this file win wherever the two differ. We do not use Oura's logo, photos, product names, or its blue call-to-action color.

## Overview

**Creative North Star: "The Oatmeal Journal".** A paper journal the family keeps together: warm oatmeal page, cream cards, serif titles, one mark per day. Calm, warm, premium. A considered object, not a fitness app.

A warm oatmeal page with cream cards, a header the same color as the page, one charcoal color for actions, and olive only for "done" and "won". Checking in is the main event: each of your goals is one large button. Everything else is quieter. Mobile first, with a tab bar at the bottom on phones.

**Key Characteristics:**
- Every control is at least 44px tall; the check-in button is 64px.
- Charcoal for actions and selection; olive only for completion, met targets, positive change, and prizes.
- Done = olive circle with a check, missed = faint dot, today not yet = open ring. Never color alone.
- Instrument Serif for titles, Hanken Grotesk for everything else.
- Depth comes from surface steps (page, then card, then tint) and hairlines. No shadows on cards.
- Plain HTML/CSS charts in a warm ochre ramp, separate from the olive "done" color.
- Light mode only.

## Colors

Warm neutrals, one charcoal action ramp, and one olive for success. Token names in `app/globals.css` keep their old names (`accent-*`, `success-*`, `--viz-*`) so classes did not change. Every text pair passes WCAG AA; the ratios below are computed, not estimated.

### Primary
- **Charcoal and Stone** (the `accent-*` ramp): `accent-900` #19191c (primary hover, tooltips), `accent-800` #222428 (primary buttons, active tab pill; white text 15.5:1), `accent-700` #4a4741 (quiet buttons, links, input borders, today ring, progress fill; 9.1:1 on surface), `accent-600` #6b665e, `accent-500` #a8a5a0, `accent-200` #e6dfd3 (progress track, neutral chips, selection), `accent-100` #efe9de (quiet-button hover).
- **Focus** (#4a4741): the 2px focus outline on every control (8.2:1 on the page, 9.1:1 on surface).

### Secondary
- **Olive** (the `success-*` ramp): `success-100` #eef0e4 (done row tint, "All done today" chip), `success-500` #5c6f5d (brand mark), `success-600` #4f6150 (fills behind white checks, 6.65:1), `success-700` #34432f (text on the tint, 9.2:1).

### Tertiary
- **Strava Orange** (#c93b00, text #b33400): darkened from the brand orange so white text passes AA (5.1:1). Only on Strava's own controls. Unchanged.
- **Error** (red-800 #991b1b on red-50 #fef2f2, 7.6:1): failed actions only. Unchanged.

### Chart palette (Trends only)
- **Series Ochre** `--viz-1` #9a6417 (4.9:1 on surface), **Track** `--viz-track` #efe0c2 with a `--viz-track-edge` #9a6417 outline, month ramp oldest to newest `--viz-month-1` #b8893f, `--viz-month-2` #9a6417, `--viz-month-3` #6b4510, gridlines `--viz-grid` #e1dcd3, marks and goal ticks `--viz-ink` #1c1b1a. Text never uses series colors.

### Neutral
- **Ink** `--foreground` #1c1b1a (15.3:1 on the page, 16.9:1 on surface).
- **Muted Ink** `--muted` #5e5a54 (6.1:1 on the page, 6.7:1 on surface, 5.9:1 on the done tint, 5.2:1 on chips).
- **Faint** `--faint` #878279: missed-day dots only, never text (3.4:1 on the page, 3.8:1 on surface).
- **Oatmeal Page** `--background` #f7f1e8, **Cream Surface** `--surface` #fffdf8, **Hairline** `--divider` #e1dcd3 (solid), **Segment Track** `--track` #ece4d6, **Upcoming** `--upcoming` #cfc9bf (dashed ring for days still to come, dashed outlines).
- Browser surfaces: `::selection` #e6dfd3 with #19191c text, `accent-color` and `caret-color` #4a4741, `themeColor` #f7f1e8.

### Named Rules
**The Olive Means Done Rule.** Olive appears only for a completed check-in, a met target, a positive change, or a prize.
**The No Red For Now Rule.** A month in progress is never shown as a red drop. It shows "on pace" or "behind pace" and a pace mark.
**The One Dark Action Rule.** Charcoal is the only filled action color. One primary button per view. Strava keeps its own orange.

## Typography

Both fonts load through `next/font/google` in `app/layout.tsx`, so they are downloaded at build time and served from our own site.

- **Display Font:** [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif), weight 400 plus italic. Exposed as `--font-display` (class `font-display`). Never bold, `font-synthesis: none`, never below 20px.
- **Body Font:** [Hanken Grotesk](https://fonts.google.com/specimen/Hanken+Grotesk), weights 400, 500, 600, 700. Exposed as `--font-sans`, with the system sans-serif stack as fallback.
- **Mono Font:** system monospace stack, kept as a token; the UI does not currently show code.

### Hierarchy
- **Display** (serif 400, 2.5rem on phones, 2.75rem from 640px, line-height 1.05, tracking -0.01em): page titles. The sign-in headline runs larger (up to 3.5rem on desktop).
- **Headline** (serif 400, 1.5rem to 1.625rem): card and section titles ("Your goals", "Family", the Leaderboard month, the Trends report). The header family name is serif at 1.3rem.
- **Title** (sans 600, 1rem): goal names and people's names.
- **Body** (sans 400, 0.875rem; 1rem in inputs on phones so iOS doesn't zoom): most text.
- **Label** (sans 400, 0.75rem): weekday labels, legends, axis ticks, footer. Nothing smaller than 12px.

Numbers stay `tabular-nums` in the sans, never the serif. Long text uses `text-pretty`; explanatory paragraphs cap at 60ch (about 80 characters).

## Layout

Single centered column, max width 56rem, 16px side gutter. Sections stack with 24px gaps. Phones get a fixed bottom tab bar (64px plus the safe-area inset); from 640px the four pages move into the header. Family lists are one card with dividers, never a card per person.

## Elevation & Depth

Flat. Depth comes from surface color steps (oatmeal page, cream card, then a tint) and 1px hairlines. Cards have a hairline border and no shadow. The active segment is a surface step with a hairline, not a lift. Tooltips are the one exception: a single soft warm shadow (`0 4px 12px rgb(28 27 26 / 0.08)`). No nested cards.

## Shapes

Full rounding on buttons, segments, chips, day dots, place badges, progress bars, and the nav pills. 8px on cards, alerts, and empty states. 12px on inputs and the check-in button.

## Components

### Header and navigation
- Header: page color with a 1px hairline under it. Family name in Instrument Serif, ink. "Sign out" in muted sans, 14px/500.
- Desktop (TopNav): muted text links; the current page is a charcoal pill with white text. Each link is a 44px target.
- Phone (TabBar): surface background, hairline on top, 64px plus the safe-area inset. The current tab is a charcoal pill holding its white icon and label.

### Check-in button (CheckRow)
- One per goal on Today. 64px tall, full width, 12px radius. 40px circle on the left, title and frequency in the middle, "Tap when done" or "Done / tap to undo" on the right.
- Idle: page-color fill, 1.5px hairline border, circle with a 2px stone ring. Done: olive tint fill, no border, circle filled olive with a white check, title and status in dark olive.
- Flips the moment it is tapped (optimistic), then the check lands with a 420ms ease-out "pop". The pop never plays on page load and is off under reduced motion.
- `aria-pressed` carries the state.

### Day dots
- This week, Sunday to Saturday, weekday label above (today labeled "Today"). Done: 24px olive circle with a white check. Today not yet: open 2px stone ring. Missed: faint 8px dot. Later this week: 1px dashed ring (#cfc9bf). Not running: blank. Each day has screen-reader text. The count beside it is "x of y this week".

### Buttons
- All pills. **Primary:** charcoal fill, white text, 48px tall. **Secondary:** transparent with a 1px stone border, ink text, 44px. **Quiet:** stone text only, cream hover, still 44px tall (e.g. "Mark yesterday done").

### Inputs
- 12px radius, 1px stone border on the cream surface, 44px tall, 16px text on phones. Focus: ink border plus the 2px focus outline.

### Segmented switcher (SegmentedNav)
- Report and month pickers. A pill track (#ece4d6) with pill segments; the active one is cream with a hairline border and `aria-current`. Links, so every view is a shareable URL.

### Chips and badges
- Fully rounded. Olive tint with dark olive text for "All done today" and "Prize winner". The prize winner's place badge is solid olive with a white number; first place before the prize is awarded is the olive tint; other places and neutral tags ("Ended", "Example") are stone-200 with ink or muted text.

### Disclosure
- Every `<details>` uses the same 44px summary with a chevron that turns when open.

### Progress bar
- 10px tall, fully rounded. Track #e6dfd3, stone fill (#4a4741), olive at 100%. Optional pace mark: a thin dark line at "complete days ÷ days in the month" with a 1px cream outline, so it reads on the track and on the charcoal fill (the outline is 9.1:1 against the fill).

### Charts (Trends)
- Plain HTML/CSS bars, no browser JavaScript, in the ochre ramp. Every mark is a 44px focusable target with a charcoal tooltip on hover, tap, and keyboard focus. Under each chart: the rows as a table, one tap away. The app does not show SQL.

### Sign-in page (front door)
- Signed-out visitors land here, so it reads as the product's landing page. Desktop (lg+): serif headline, one-line pitch, and an example board on the left; the sign-in card on the right, vertically centered. Phones: headline and pitch, then the form (above the fold at 390x664), then the example board.
- The example board reuses the day-dot marks, is `aria-hidden`, carries an "Example" tag, and uses generic goal names only. No real names, stats, or quotes.
- Signed out, the header shows the brand mark (an olive circle with a white check: the app icon without its charcoal tile) beside "Family Health Tracker".

### Icons and link card
- `app/icon.svg`: charcoal tile (#222428), olive circle (#5c6f5d), white check. `app/apple-icon.png` and `app/favicon.ico` are rendered from it. `app/opengraph-image.png` is a 1200x630 screenshot of `design/link-card.html`.

## Do's and Don'ts

- **Do** keep every control at least 44px tall and every label at least 12px.
- **Do** keep olive for completion only, and never show a month in progress as a decline.
- **Do** keep the table one tap away on Trends.
- **Do** keep the serif for titles at 20px and up, at weight 400.
- **Don't** add a second filled action color, or put a shadow on anything but a tooltip.
- **Don't** add a chart, component, icon, or animation library. Icons are inline SVG on a 24px grid, 1.75 stroke.
- **Don't** nest cards, or use unicode glyphs as icons.
- **Don't** add more motion than the check-in pop and simple color transitions.
- **Don't** borrow Oura's logo, photos, product names, or blue.
