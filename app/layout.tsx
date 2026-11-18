import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/actions";
import { TabBar, TopNav } from "@/components/nav";
import { getCurrentMember } from "@/lib/auth";
import "./globals.css";

// Link previews (iMessage, Slack, email) read these tags. The icons and the card image are
// files in app/ (favicon.ico, icon.svg, apple-icon.png, opengraph-image.png) that Next.js links
// automatically. Their URLs end in .ico/.svg/.png, so proxy.ts lets signed-out link bots fetch them.
const description = "Set a goal. Check in each day. Cheer each other on. ACC 556 final project.";

export const metadata: Metadata = {
  metadataBase: new URL("https://acc556finalproject.vercel.app"),
  title: "Family Health Tracker",
  description,
  applicationName: "Family Health Tracker",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Family Health Tracker",
    title: "Family Health Tracker",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Family Health Tracker",
    description,
  },
};

// viewport-fit=cover lets the phone tab bar sit above the home indicator (safe-area inset).
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#1d2d3d",
};

// Header: family name, the four pages (desktop), who's signed in. On phones the
// pages move to a tab bar at the bottom. Hidden pieces on /login and /setup.
async function Header() {
  const me = await getCurrentMember().catch(() => null);
  return (
    <>
      <header className="bg-accent-900 text-white">
        <div className="mx-auto flex min-h-14 max-w-4xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 py-3 font-semibold tracking-tight">
            {!me && <BrandMark />}
            <span className="truncate">{me ? me.family_name : "Family Health Tracker"}</span>
          </Link>
          {me && (
            <div className="flex shrink-0 items-center gap-2">
              <TopNav />
              <form action={signOut} className="flex items-center sm:ml-2 sm:border-l sm:border-white/20 sm:pl-3">
                <span className="hidden text-sm text-white/80 md:inline">{me.full_name}</span>
                <button
                  type="submit"
                  className="ml-1 flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </header>
      {me && <TabBar />}
    </>
  );
}

// The app icon (app/icon.svg) without its navy tile: a green circle with a check.
// Shown beside the product name when signed out.
function BrandMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden>
      <circle cx="12" cy="12" r="10" className="fill-success-500" />
      <path
        d="M7.5 12.25l3 3 6-6.5"
        fill="none"
        stroke="#fff"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Suspense fallback={<header className="min-h-14 bg-accent-900" />}>
          <Header />
        </Suspense>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-6 pb-10">{children}</main>
        <footer className="border-t border-divider px-4 py-4 text-center text-xs text-muted">
          <p>ACC 556 final project</p>
        </footer>
      </body>
    </html>
  );
}
