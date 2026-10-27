export const SITE_NAME = "MBG · Minggu Badminton Guys";
export const SITE_SHORT_NAME = "MBG";
export const SITE_TITLE = "MBG · Minggu Badminton Guys — Fair Badminton Match Planner";
export const SITE_DESCRIPTION =
  "Create badminton game sessions, track games played per player, and get fair match recommendations so everyone gets equal court time.";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

export const SITE_KEYWORDS = [
  "badminton",
  "Minggu Badminton Guys",
  "MBG",
  "badminton match planner",
  "badminton session tracker",
  "fair match generator",
  "badminton rotation",
  "badminton court scheduler",
  "doubles match maker",
];

