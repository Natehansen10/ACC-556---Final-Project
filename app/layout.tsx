import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/actions";
import { getCurrentMember } from "@/lib/auth";
import { getFamilyStats } from "@/lib/queries";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family Health Tracker",
  description: "Our family's health goals, checked in daily. ACC 556 final project.",
};

// Header: the three pages plus who's signed in. Hidden on /login.
async function Header() {
  const me = await getCurrentMember().catch(() => null);
  return (
    <header className="border-b border-divider bg-accent-900 text-white">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          {me ? me.family_name : "Family Health Tracker"}
        </Link>
        {me && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <nav className="flex gap-4">
              <Link href="/" className="hover:underline">Today</Link>
              <Link href="/goals" className="hover:underline">Goals</Link>
              <Link href="/leaderboard" className="hover:underline">Leaderboard</Link>
            </nav>
            <form action={signOut} className="flex items-center gap-2">
              <span className="text-white/70">{me.full_name}</span>
              <button type="submit" className="underline hover:text-white/80">
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}

// Live row counts for your family, shown in the footer: proof on every page
// that the app is reading Supabase. It ticks up when you check in.
async function DbFooter() {
  const me = await getCurrentMember().catch(() => null);
  if (!me) return <p>Family Health Tracker</p>;
  const s = await getFamilyStats(me.family_id).catch(() => null);
  if (!s) return <p>Database unavailable.</p>;
  return (
    <p>
      Live from Supabase: {plural(s.members, "member")} · {plural(s.goals, "goal")} ·{" "}
      {plural(s.checkins, "check-in")}
    </p>
  );
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Suspense fallback={<header className="h-12 border-b border-divider bg-accent-900" />}>
          <Header />
        </Suspense>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-divider px-4 py-4 text-center text-xs text-muted">
          <Suspense fallback={<p>Connecting to Supabase…</p>}>
            <DbFooter />
          </Suspense>
          <p className="mt-1">ACC 556 final project</p>
        </footer>
      </body>
    </html>
  );
}
