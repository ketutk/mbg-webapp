import type { Metadata } from "next";
import MatchApp from "@/components/matches/MatchApp";

export const metadata: Metadata = {
  title: "Sessions",
};

export default function SessionsPage() {
  return <MatchApp />;
}
