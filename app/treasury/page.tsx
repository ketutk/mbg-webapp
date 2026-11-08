import type { Metadata } from "next";
import TreasuryApp from "@/components/TreasuryApp";

export const metadata: Metadata = {
  title: "Treasury",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TreasuryPage() {
  return <TreasuryApp />;
}

