import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { sql } from "./db";
import { createSupabase } from "./supabase";

// "Auth tells me who you are, SQL decides what you see."
// Supabase Auth gives the logged-in user's id. That id is also their
// profiles.id, so one SQL lookup gives their name, role, and family.
// Every page and action scopes its queries to member.family_id.

export type CurrentMember = {
  id: string;
  full_name: string;
  role: "admin" | "member";
  family_id: string;
  family_name: string;
  timezone: string;
  today: string; // YYYY-MM-DD in the member's own timezone
  yesterday: string;
  month: string; // first day of the current month, YYYY-MM-01
};

// cache(): runs once per request, however many components ask.
export const getSessionUser = cache(async () => {
  const supabase = await createSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email ?? "" } : null;
});

export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const [row] = await sql<CurrentMember[]>`
    SELECT p.id,
           p.full_name,
           p.role,
           p.family_id,
           f.name AS family_name,
           p.timezone,
           (now() AT TIME ZONE p.timezone)::date::text                          AS today,
           ((now() AT TIME ZONE p.timezone)::date - 1)::text                    AS yesterday,
           date_trunc('month', now() AT TIME ZONE p.timezone)::date::text       AS month
    FROM public.profiles p
    JOIN public.families f ON f.id = p.family_id
    WHERE p.id = ${user.id}
  `;
  return row ?? null;
});

// For pages: signed out -> /login, signed in without a profile -> /setup.
export async function requireMember(): Promise<CurrentMember> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const member = await getCurrentMember();
  if (!member) redirect("/setup");
  return member;
}
