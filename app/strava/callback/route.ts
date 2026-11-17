import { NextResponse, type NextRequest } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db";
import { connectStrava, syncStrava } from "@/lib/strava";

// Strava sends the person back here with a one-time code (or an error if they said no).
export async function GET(request: NextRequest) {
  const back = (result: string) => {
    const response = NextResponse.redirect(new URL(`/?strava=${result}`, request.url));
    response.cookies.delete({ name: "strava_state", path: "/strava" });
    return response;
  };

  const me = await getCurrentMember();
  if (!me) return NextResponse.redirect(new URL("/login", request.url));

  const params = request.nextUrl.searchParams;
  const state = params.get("state");
  if (!state || state !== request.cookies.get("strava_state")?.value) return back("expired");
  if (params.get("error")) return back("denied");

  const code = params.get("code");
  const scope = params.get("scope") ?? "";
  if (!code) return back("denied");
  if (!scope.includes("activity:read")) return back("no-activity-access");

  try {
    await connectStrava(me.id, code);
  } catch (err) {
    // athlete_id is UNIQUE: one Strava account can't be linked to two family members.
    if (pgErrorCode(err) === PG_UNIQUE_VIOLATION) return back("already-linked");
    console.error(err);
    return back("failed");
  }
  await syncStrava(me, true).catch((err) => console.error(err));
  return back("connected");
}
