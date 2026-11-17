import { NextResponse, type NextRequest } from "next/server";
import { getCurrentMember } from "@/lib/auth";
import { stravaAuthorizeUrl, stravaConfigured } from "@/lib/strava";

// "Connect Strava": send the person to strava.com to approve read access to their activities.
// The random state is stored in a cookie and checked on the way back, so a forged callback
// link can't attach someone else's Strava account.
export async function GET(request: NextRequest) {
  // Strava only accepts the one callback domain saved in the Strava app settings. Vercel also
  // serves each deployment at its own address (e.g. acc556finalproject-abc123.vercel.app), so if
  // we're on one of those, move to the main address first. Vercel sets this variable itself.
  const mainHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (mainHost && request.nextUrl.host !== mainHost && process.env.VERCEL_ENV === "production") {
    return NextResponse.redirect(`https://${mainHost}/strava/connect`);
  }

  const me = await getCurrentMember();
  if (!me) return NextResponse.redirect(new URL("/login", request.url));
  if (!stravaConfigured()) return NextResponse.redirect(new URL("/?strava=not-configured", request.url));

  const state = crypto.randomUUID();
  const redirectUri = `${request.nextUrl.origin}/strava/callback`;
  const response = NextResponse.redirect(stravaAuthorizeUrl(redirectUri, state));
  response.cookies.set("strava_state", state, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
    path: "/strava",
  });
  return response;
}
