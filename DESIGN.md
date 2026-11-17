---
name: Family Health Tracker
description: One family's daily health habits on one board, with the SQL behind every number.
colors:
  ink: "#1d1f20"
  muted-ink: "#5d5d60"
  page: "#f2f2f3"
  surface: "#ffffff"
  divider: "color-mix(in srgb, #1d1f20 14%, transparent)"
  navy-900: "#1d2d3d"
  navy-800: "#2c455d"
  navy-700: "#416180"
  navy-600: "#597ea3"
  navy-500: "#749dc4"
  navy-200: "#d6ebff"
  navy-100: "#eef6ff"
  done-500: "#3f8f5f"
  done-600: "#2f7a4d"
  faint: "#8c8d90"
  focus: "#416180"
  done-700: "#2c6644"
  done-100: "#e3f2e8"
  error-800: "#991b1b"
  strava: "#c93b00"
  strava-ink: "#b33400"
  viz-series: "#2a78d6"
  viz-track: "#cde2fb"
  viz-month-1: "#86b6ef"
  viz-month-2: "#3987e5"
  viz-month-3: "#1c5cab"
  viz-grid: "#e1e0d9"
  code-bg: "#171717"
typography:
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    letterSpacing: "-0.025em"
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
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
    backgroundColor: "{colors.navy-800}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.navy-900}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "16px"
  segment-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "44px"
  check-row:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    height: "64px"
  check-row-done:
    backgroundColor: "{colors.done-100}"
    textColor: "{colors.done-700}"
  day-dot-done:
    backgroundColor: "{colors.done-600}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
    size: "24px"
  header:
    backgroundColor: "{colors.navy-900}"
    textColor: "{colors.surface}"
---

# Design System: Family Health Tracker

This file records the visual system after the Nov 2026 UI polish pass (branch `feat/ui-polish`). Change it together with `app/globals.css` and `components/ui.tsx`.

## Overview

**Creative North Star: "The Fridge Chart"** (proposed). A habit chart on the family fridge: everyone's row, one mark per day, readable from across the room. Calm, plain, honest.

A neutral gray page with white cards, a dark navy header, one navy accent for actions, and green only for "done" and "won". Checking in is the main event: each of your goals is one large button. Everything else is quieter. Mobile first, with a tab bar at the bottom on phones.

**Key Characteristics:**
- Every control is at least 44px tall; the check-in button is 64px.
- Navy for actions and selection; green only for completion, met targets, and prizes.
- Done = green check, missed = faint dot, today not yet = open ring. Never color alone.
- System sans-serif everywhere; monospace only for SQL and column names.
- Plain HTML/CSS charts with their own blue ramp, separate from the navy UI accent.
- Light mode only.

## Colors

Cool neutrals with one desaturated navy accent and one green for success. Every text pair passes WCAG AA.

### Primary
- **Harbor Navy** (#2c455d, ramp #1d2d3d to #eef6ff): primary buttons, active tab, check-in ring (#597ea3), links and quiet actions (#416180). The header uses the deepest step (#1d2d3d).
- **Focus** (#416180): the 2px focus outline on every control.

### Secondary
- **Done Green** (fill #2f7a4d, text #2c6644, tint #e3f2e8): completed check-ins, met targets, prize winner, positive change.

### Tertiary
- **Strava Orange** (#c93b00, text #b33400): darkened from the brand orange so white text passes AA. Only on Strava's own controls.

### Chart palette (Trends only)
- **Series Blue** (#2a78d6), **Track Blue** (#cde2fb with a #597ea3 outline), month ramp (#86b6ef, #3987e5, #1c5cab), gridlines #e1e0d9. Text never uses series colors.

### Neutral
- **Ink** (#1d1f20), **Muted Ink** (#5d5d60), **Faint** (#8c8d90, missed-day dots only), **Page Gray** (#f2f2f3), **Surface White** (#ffffff), **Divider** (ink at 14%), **Code Black** (neutral-900).

### Named Rules
**The Green Means Done Rule.** Green appears only for a completed check-in, a met target, a positive change, or a prize.
**The No Red For Now Rule.** A month in progress is never shown as a red drop. It shows "on pace" or "behind pace" and a pace mark.

## Typography

**Body Font:** system UI sans-serif stack. **Mono Font:** system monospace stack, for SQL and column names only.

### Hierarchy
- **Headline** (600, 1.5rem, tight tracking): page titles.
- **Title** (600, 1rem to 1.125rem): card and section titles, goal names.
- **Body** (400, 0.875rem; 1rem in inputs on phones so iOS doesn't zoom): most text.
- **Label** (400, 0.75rem): weekday labels, legends, axis ticks, footer. Nothing smaller than 12px.
- **Code** (mono, 0.75rem, relaxed leading): SQL. Wraps on phones, scrolls sideways on desktop.

Long text uses `text-pretty`; explanatory paragraphs cap at 60ch (about 80 characters).

## Layout

Single centered column, max width 56rem, 16px side gutter. Sections stack with 24px gaps. Phones get a fixed bottom tab bar (64px plus the safe-area inset); from 640px the four pages move into the header. Family lists are one card with dividers, never a card per person.

## Elevation & Depth

Flat. Cards: 1px divider border plus a 1px-offset, 2px-blur shadow at 5%. Tooltips: 4px offset, 12px blur. The active segment gets a light lift. No nested cards.

## Shapes

8px radius on buttons, inputs, and segments; 12px on cards and the check-in button; full rounding on day dots, place badges, progress bars, and the tab bar's active pill.

## Components

### Check-in button (CheckRow)
- One per goal on Today. 64px tall, full width. 40px circle on the left, title and frequency in the middle, "Tap when done" or "Done / tap to undo" on the right.
- Flips the moment it is tapped (optimistic), then the check lands with a 420ms ease-out "pop". The pop never plays on page load and is off under reduced motion.
- `aria-pressed` carries the state.

### Day dots
- This week, Sunday to Saturday, weekday label above (today labeled "Today"). Done: 24px green circle with a check. Today not yet: open navy ring. Missed: faint 8px dot. Later this week: light dashed ring. Not running: blank. Each day has screen-reader text. The count beside it is "x of y this week".

### Buttons
- **Primary:** navy fill, white text, 44px tall. **Secondary:** white with a gray border. **Quiet:** navy text only, still 44px tall (e.g. "Mark yesterday done").

### Segmented switcher (SegmentedNav)
- Report and month pickers. Gray track, white active segment with `aria-current`. Links, so every view is a shareable URL.

### Disclosure
- Every `<details>` uses the same 44px summary with a chevron that turns when open.

### Progress bar
- 10px tall, fully rounded. Navy fill, green at 100%. Optional pace mark: a thin dark line at "complete days ÷ days in the month".

### Charts (Trends)
- Plain HTML/CSS bars, no browser JavaScript. Every mark is a 44px focusable target with a tooltip on hover, tap, and keyboard focus. The tooltip names the SQL column(s) behind the number. Under each chart: one sentence mapping marks to columns, then the query's steps, then the rows as a table, then the full SQL card.

## Do's and Don'ts

- **Do** keep every control at least 44px tall and every label at least 12px.
- **Do** keep green for completion only, and never show a month in progress as a decline.
- **Do** keep the table and the exact SQL one tap away on Trends.
- **Don't** add a chart, component, icon, or animation library. Icons are inline SVG on a 24px grid, 1.75 stroke.
- **Don't** nest cards, or use unicode glyphs as icons.
- **Don't** add more motion than the check-in pop and simple color transitions.
