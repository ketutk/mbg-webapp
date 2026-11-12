export type NavKey = "matches" | "treasury" | "admins";

export interface NavItem {
  key: NavKey;
  href: string;
  label: string;
  superadminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "matches", href: "/", label: "Matches" },
  { key: "treasury", href: "/treasury", label: "Treasury" },
  { key: "admins", href: "/admins", label: "Admins", superadminOnly: true },
];

