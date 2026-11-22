# Redesign: adopt the Oura-style "Oatmeal" design system (light only)

You're working in the Family Health Tracker repo (Next.js 16 App Router, Tailwind v4, no component/chart/animation libraries). Read `PRODUCT.md` and `DESIGN.md` first. Replace the current "Fridge Chart" look (gray page, navy header, green done) with a calm, premium, warm look based on Oura's design language. This is a visual-only change.

## Hard constraints (do not break)
- Do NOT change SQL, schema, query text, auth, Strava logic, Server Actions, routes, or what data is shown. Visual changes only.
- No new dependencies except fonts through `next/font/google` (part of Next.js). No component kit, chart library, icon library or animation library.
- Light mode only.
- Keep every accessibility rule in PRODUCT.md and DESIGN.md: every tap target at least 44px (check-in row 64px), no text under 12px, inputs 16px on phones, WCAG AA text contrast (4.5:1; 3:1 for large text and non-text marks), visible focus ring, never color alone (done = filled circle + check), reduced motion respected, no horizontal scroll at 390px, Trends keeps "Show as table".
- Keep the "no red for a month in progress" rule and the warm, no-guilt voice. Don't change copy unless a layout needs it.

## 1. Reference file
Download https://opendesignmd.com/designs/ouraring/DESIGN.md (MIT licensed) and save it as `design/DESIGN.reference.md` with this first line:
`<!-- Reference only. Source: https://opendesignmd.com/designs/ouraring/DESIGN.md (OpenDesignMD, MIT). Our adapted system lives in /DESIGN.md. -->`
Use it for feel only. The tokens below win wherever they differ. Do not copy Oura's logo, photos, product names, or its blue CTA color.

## 2. Tokens (app/globals.css)
Keep the existing token NAMES (accent-*, success-*, --viz-*, etc.) so existing classes keep working; just change the values. Update the comments to match.

Neutrals
- --background (page): #f7f1e8 (warm oatmeal)
- --surface (cards): #fffdf8
- --foreground (ink): #1c1b1a
- --muted: #5e5a54 (6.1:1 on page, 6.7:1 on surface)
- --faint (missed-day dots, non-text only): #878279 (3.4:1 on page, 3.8:1 on surface)
- --divider / hairlines: #e1dcd3 (solid, replace the color-mix)
- upcoming dashed ring: #cfc9bf
- --focus: #4a4741

Action ramp ("Charcoal and Stone", replaces navy; keep the accent-* names)
- accent-900 #19191c, accent-800 #222428 (primary buttons, active tab pill; white text 15.5:1), accent-700 #4a4741 (quiet buttons, links, focus, today ring), accent-600 #6b665e, accent-500 #a8a5a0, accent-200 #e6dfd3, accent-100 #efe9de (quiet-button hover, selection)

Done ramp ("Olive", replaces green; keep the success-* names)
- success-100 #eef0e4 (done row tint, "All done today" chip), success-500 #5c6f5d (brand mark), success-600 #4f6150 (fills behind white checks, 6.65:1), success-700 #34432f (text on tint, 9.2:1)

Charts (Trends), warm ochre, separate from the olive "done" color
- --viz-1 (series): #9a6417 (4.9:1 on surface)
- --viz-track: #efe0c2, --viz-track-edge: #9a6417
- month ramp oldest to newest: --viz-month-1 #b8893f, --viz-month-2 #9a6417, --viz-month-3 #6b4510
- --viz-grid: #e1dcd3, --viz-ink: #1c1b1a

Unchanged: Strava (#c93b00 / ink #b33400, still passes on the cream), error alerts (red-800 on red-50).

Also update: ::selection (bg #e6dfd3, text #19191c), accent-color and caret-color (#4a4741), focus outline 2px #4a4741, and `themeColor` in app/layout.tsx to #f7f1e8.

## 3. Typography
- Load via next/font/google and expose as CSS variables: **Instrument Serif** (weight 400, plus italic) for display, **Hanken Grotesk** (400, 500, 600, 700) for all UI. Set `--font-sans` to Hanken Grotesk with the current system stack as fallback; add `--font-display`. Keep `--font-mono` as is.
- Serif (Instrument Serif 400, never bold, set `font-synthesis: none`; never below 20px): page titles (PageHeader h1: ~2.5rem phones / 2.75rem sm+, line-height 1.05, letter-spacing -0.01em), card and section titles ("Your goals", "Family", Leaderboard/Trends section headings, ~1.5 to 1.625rem), the header family name (~1.3rem), the sign-in headline.
- Sans for everything else: goal names 1rem/600, body 0.875rem, labels 0.75rem minimum. Numbers stay `tabular-nums` in the sans, not the serif.

## 4. Shapes, depth, layout
- Buttons: fully rounded pills (rounded-full), min-h-11 (primary can be 48px). Primary = accent-800 fill, white text. Secondary = transparent with 1px accent-700 border, ink text. Quiet = accent-700 text, hover bg accent-100.
- Cards: 8px radius, surface fill, 1px #e1dcd3 border, NO shadow. Never nest cards.
- Inputs: 12px radius, 1px #4a4741 border on surface, focus border and outline #1c1b1a / focus color.
- Check-in row (CheckRow): 12px radius, 64px tall. Idle: page-color fill with 1.5px hairline border, 40px circle with 2px accent-700 ring. Done: success-100 fill, no border, circle filled success-600 with a white check, title and status in success-700. Keep the 420ms check-pop.
- Day dots: done = 24px success-600 circle + white check; today not yet = 2px accent-700 ring; missed = 8px faint dot; upcoming = 1px dashed #cfc9bf ring.
- SegmentedNav: pill track (#ece4d6, rounded-full) with pill segments; active segment = surface fill, ink text, 1px hairline border instead of a shadow.
- Progress bar: track #e6dfd3, fill accent-700, success-600 at 100%. Pace mark unchanged.
- Chips/badges ("All done today", place badges): rounded-full, success-100 / success-700.
- Tooltips may keep one soft warm shadow (0 4px 12px rgb(28 27 26 / 0.08)); nothing else gets a shadow.
- Depth comes from surface color steps (page cream, then surface, then tints) and hairlines, not shadows.

## 5. Chrome
- Header: drop the navy bar. Cream background (page color) with a 1px #e1dcd3 bottom border; family name in Instrument Serif, ink color; Sign out in muted sans 14px/500. Desktop TopNav: muted text links, active = charcoal pill with white text.
- Phone TabBar: surface background, top hairline, active tab = accent-800 pill with white text. Keep 64px plus safe-area inset.
- Brand mark and app/icon.svg: circle becomes success-500 (#5c6f5d) with white check; the icon tile becomes #222428 instead of navy. Update design/link-card.html to match. If apple-icon.png / opengraph-image.png can be regenerated from existing sources, do it; otherwise list them as a follow-up in the PR.
- Sign-in page: same layout, new tokens; serif headline; example board uses the new dot styles.

## 6. Rewrite DESIGN.md
Rewrite DESIGN.md (keep the same structure and YAML front-matter format) for the new system: Creative North Star **"The Oatmeal Journal"** (calm, warm, premium; a considered object, not a fitness app). Record every token above, the fonts with Google Fonts links, radii, and the Named Rules, renamed: **Olive Means Done** (olive only for completed check-ins, met targets, positive change, prizes), **No Red For Now** (unchanged), **One Dark Action** (charcoal is the only filled action color; Strava keeps its own orange). Note that it was adapted from design/DESIGN.reference.md.

## 7. Verify before opening the PR
- Grep for leftovers: old hexes (#1d2d3d, #2c455d, #416180, #597ea3, #2f7a4d, #3f8f5f, #f2f2f3, #2a78d6) and any hard-coded navy/green/neutral-* classes that now look off on cream (e.g. bg-neutral-200, border-neutral-300/400, hover:bg-neutral-100); map them to the new tokens.
- `npm run lint` and `npm run build` pass.
- Compute (don't eyeball) contrast for every text/background pair you touched; list the ratios in the PR.
- Run the app and check every screen (Sign in, Today, Goals, Leaderboard, Trends, Setup, not-found, error) at 390x844 and 1280x800: no horizontal scroll, 44px targets, focus ring visible, reduced motion turns off the pop. Attach screenshots of Today, Leaderboard and Trends at both sizes.

## Delivery
Work on a branch named `feat/oatmeal-redesign`, commit in logical steps (tokens, fonts, components, chrome, DESIGN.md), and open a PR with the screenshots and contrast table. Don't merge; Nate will review it first (merging to main deploys to Vercel).
