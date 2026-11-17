export type NavKey =
  | "home"
  | "sessions"
  | "leaderboards"
  | "treasury"
  | "admins";

export interface NavItem {
  key: NavKey;
  href: string;
  label: string;
  organiserOnly?: boolean;
  superadminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "home", href: "/", label: "Home" },
  { key: "sessions", href: "/sessions", label: "Sessions" },
  { key: "leaderboards", href: "/leaderboards", label: "Leaderboards" },
  { key: "treasury", href: "/treasury", label: "Treasury", organiserOnly: true },
  { key: "admins", href: "/admins", label: "Admins", organiserOnly: true },
];

export function resolveActiveNavKey(pathname: string): NavKey {
  if (pathname.startsWith("/sessions")) return "sessions";
  if (pathname.startsWith("/leaderboards")) return "leaderboards";
  if (pathname.startsWith("/treasury")) return "treasury";
  if (pathname.startsWith("/admins")) return "admins";
  return "home";
}
