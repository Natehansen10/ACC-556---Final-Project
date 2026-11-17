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
  done-700: "#2c6644"
  done-100: "#e3f2e8"
  error-800: "#991b1b"
  strava-orange: "#FC4C02"
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
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.navy-900}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
  pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  pill-active:
    backgroundColor: "{colors.navy-800}"
    textColor: "{colors.surface}"
  check-dot:
    rounded: "{rounded.full}"
    size: "28px"
  check-dot-done:
    backgroundColor: "{colors.done-500}"
    textColor: "{colors.surface}"
  header:
    backgroundColor: "{colors.navy-900}"
    textColor: "{colors.surface}"
---

# Design System: Family Health Tracker

This file records the **incumbent** visual system as of Nov 2026, before the UI polish pass. It is the reference to preserve or deliberately change, not a target.

## Overview

**Creative North Star: "The Fridge Chart"** (proposed, not yet confirmed). A habit chart on the family fridge: everyone's row, one mark per day, readable from across the room. Calm, plain, honest.

The current interface is a neutral gray page with white cards, a dark navy header, one muted navy accent for actions, and green reserved for "done" and "won". Density is moderate. Everything is system type, small sizes, and thin borders. It reads as a clean default rather than a product with its own character: competent, quiet, and a little generic.

**Key Characteristics:**
- Gray page, white bordered cards with a faint shadow, one card per person or section.
- Navy for actions and selection; green only for completion and prize winners.
- System sans-serif everywhere; monospace only for SQL.
- Plain HTML/CSS charts with their own blue ramp, separate from the navy UI accent.
- Light mode only.

## Colors

Cool neutrals with one desaturated navy accent and one green for success.

### Primary
- **Harbor Navy** (#2c455d, ramp #1d2d3d to #eef6ff): primary buttons, active pills, focus rings, tappable check-in circle outlines (#597ea3). The header uses the deepest step (#1d2d3d).

### Secondary
- **Done Green** (#3f8f5f, text #2c6644, tint #e3f2e8): completed check-ins, full progress bars, prize winner badge, positive change. Never decorative.

### Tertiary
- **Strava Orange** (#FC4C02): only on the Strava connect button and label, per Strava branding.

### Chart palette (Trends only)
- **Series Blue** (#2a78d6) with **Track Blue** (#cde2fb) and an ordinal month ramp (#86b6ef, #3987e5, #1c5cab). Gridlines #e1e0d9. Validated against the white card. Text never uses series colors.

### Neutral
- **Ink** (#1d1f20): body text and headings.
- **Muted Ink** (#5d5d60): secondary text, hints, metadata.
- **Page Gray** (#f2f2f3): page background.
- **Surface White** (#ffffff): cards and inputs.
- **Divider** (ink at 14%): card borders, row dividers.
- **Code Black** (neutral-900): SQL blocks, with neutral-100 text.

### Named Rules
**The Green Means Done Rule.** Green appears only for a completed check-in, a met target, a positive change, or a prize. Never as decoration.

## Typography

**Body Font:** system UI sans-serif stack.
**Mono Font:** system monospace stack, for SQL only.

**Character:** neutral, unbranded, legible. Hierarchy comes from weight (600 vs 400) more than size.

### Hierarchy
- **Headline** (600, 1.5rem, tight tracking): page titles (Today, Goals, Trends).
- **Title** (600, 1rem): card titles (person names, section titles); 1.125rem for a few section headings.
- **Body** (400, 0.875rem): most text, form labels, list rows. Goal names are 1rem medium.
- **Label** (400, 0.75rem; 10-11px for weekday letters and axis ticks): metadata, legends, axis labels, footer.
- **Code** (mono, 0.75rem, relaxed leading): SQL.

## Layout

Single centered column, max width 56rem (`max-w-4xl`), 16px side gutter, 24px top padding. Pages stack sections with 20px gaps. Cards pad 16px (20px from `sm`). On phones, rows stack vertically; from `sm` (640px) goal rows put the title left and the 7-day circles right. The header wraps to two or three lines on phones.

## Elevation & Depth

Mostly flat. Cards use a 1px divider border plus Tailwind's `shadow-sm`. Tooltips use `shadow-md`. Depth otherwise comes from the gray page against white cards.

## Shapes

Soft rectangles: 6px radius on buttons and inputs, 8px on cards, full rounding on pills, check-in circles, place badges, and progress bars. Bars in charts round only their leading end.

## Components

### Buttons
- **Shape:** 6px radius.
- **Primary:** Harbor Navy fill, white text, 8px 16px padding, 14px medium.
- **Hover:** one step darker navy. Disabled: 60% opacity.
- **Secondary:** white with divider border, ink text, 6px 12px padding; hover neutral-100.

### Pills (PillNav)
- Report, person, and month pickers. Full rounding, 4px 12px padding, 14px. Active: navy fill, white text, `aria-current="page"`.

### Cards
- White, 8px radius, divider border, `shadow-sm`, 16-20px padding. One per person on Today and Goals.

### Inputs
- White, divider border, 6px radius, 8px 12px padding, 14px text. Focus: navy-600 border plus navy-200 2px ring.

### Check-in circle (CheckDot / Dot)
- 28px circle. Done: green fill with a white check. Tappable and not done: navy-600 outline, white fill. Read-only not done: neutral-300 outline. Goal not running: short gray dash. Two-letter weekday label above.

### Progress bar
- 8px tall, fully rounded, neutral-200 track; navy-600 fill, green when at or above 100%.

### Alert
- Small bordered box. Success: green tint. Error: red-50 with red-800 text. `role="status"` or `role="alert"`.

### Empty state
- Dashed divider border, centered title, muted description, optional action button.

### Charts (Trends)
- Plain HTML/CSS bars. Each mark is focusable (`tabIndex=0`) with a CSS tooltip on hover and focus. Legend above, axis ticks below. Same rows are available in a "Show as table" disclosure, and the exact SQL is shown in a dark code block below.

## Do's and Don'ts

- **Do** keep green for completion only.
- **Do** keep every chart readable without its tooltip, and keep the table and SQL one tap away.
- **Do** keep tap targets at least 44px on phones (the 28px check-in circle currently fails this).
- **Don't** add a chart, component, or animation library.
- **Don't** nest bordered cards inside cards (the Weekly report's per-person boxes currently do).
- **Don't** convey state by color alone.
