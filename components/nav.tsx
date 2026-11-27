"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SlidingPill } from "./sliding-pill";

// The four pages. A client component only because it reads the URL to mark the current tab.
const TABS = [
  { href: "/", label: "Today", icon: TodayIcon },
  { href: "/goals", label: "Goals", icon: GoalsIcon },
  { href: "/leaderboard", label: "Leaderboard", icon: LeaderboardIcon },
  { href: "/trends", label: "Trends", icon: TrendsIcon },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// Desktop: muted text links in the header. The current page is a charcoal pill; one pill
// (SlidingPill) slides between the links instead of each link drawing its own.
export function TopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden sm:block">
      <div className="group/pill relative isolate">
        <SlidingPill watch={pathname} className="rounded-full bg-accent-800" />
        <ul className="flex items-center gap-1">
          {TABS.map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className="group press flex min-h-11 items-center rounded-full text-sm font-medium"
                >
                  <span
                    data-pill-target
                    className={`flex h-9 items-center rounded-full px-3.5 transition-colors duration-200 ${
                      active
                        ? "bg-accent-800 text-white group-data-[ready]/pill:bg-transparent"
                        : "text-muted group-hover:bg-accent-100 group-hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

// Phone: a tab bar fixed to the bottom of the screen, where thumbs reach.
// The current page is a charcoal pill with white icon and label. There is one pill for the
// whole bar: it is a quarter of the bar wide and slides to tab 1, 2, 3, or 4 with a transform.
// The tabs are equal widths, so no measuring is needed and it is in the right place on first paint.
export function TabBar() {
  const pathname = usePathname();
  const index = TABS.findIndex((t) => isActive(pathname, t.href));
  return (
    <>
      {/* Spacer at the end of the page (order-last) so the footer never hides under the bar. */}
      <div aria-hidden className="order-last h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0 sm:hidden" />
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 overflow-x-clip border-t border-divider bg-surface pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] sm:hidden"
      >
        <div className="relative isolate">
          <span
            aria-hidden
            className={`pill-slide pointer-events-none absolute inset-y-0 left-0 -z-10 flex w-1/4 items-center px-1 ${
              index < 0 ? "opacity-0" : ""
            }`}
            style={{ transform: `translateX(${Math.max(index, 0) * 100}%)` }}
          >
            <span className="h-12 w-full rounded-full bg-accent-800" />
          </span>
          <ul className="grid h-16 grid-cols-4">
            {TABS.map((t) => {
              const active = isActive(pathname, t.href);
              const Icon = t.icon;
              return (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    aria-current={active ? "page" : undefined}
                    className="press flex h-full items-center justify-center px-1 text-xs"
                  >
                    <span
                      className={`flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-full transition-colors duration-200 ${
                        active ? "font-semibold text-white" : "font-medium text-muted"
                      }`}
                    >
                      <Icon />
                      {t.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </>
  );
}

// Icons: one 24px grid, 1.75 stroke, round caps.
function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      {children}
    </svg>
  );
}
function TodayIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.25l2.4 2.4 4.6-5" />
    </Svg>
  );
}
function GoalsIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.75" fill="currentColor" />
    </Svg>
  );
}
function LeaderboardIcon() {
  return (
    <Svg>
      <path d="M4 20h16" />
      <path d="M6 20v-6h4v6" />
      <path d="M10 20V8h4v12" />
      <path d="M14 20v-9h4v9" />
    </Svg>
  );
}
function TrendsIcon() {
  return (
    <Svg>
      <path d="M4 19h16" />
      <path d="M5 15l4.5-4.5 3.5 3 6-6.5" />
      <path d="M15 7h4v4" />
    </Svg>
  );
}
