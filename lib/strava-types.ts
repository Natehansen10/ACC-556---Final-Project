// Which Strava activities can count for a goal. Shared by the forms (browser) and the server.
// The database CHECK constraint on goals.strava_sport_type lists the same values (sql/07_strava.sql).
export const STRAVA_SPORT_TYPES = [
  "Any",
  "Run",
  "Walk",
  "Ride",
  "Swim",
  "Hike",
  "WeightTraining",
  "Yoga",
] as const;

export function stravaTypeLabel(type: string): string {
  if (type === "Any") return "Any activity";
  if (type === "WeightTraining") return "Weight training";
  return type;
}
