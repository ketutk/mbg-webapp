import type { Metadata } from "next";
import AdminsApp from "@/components/admins/AdminsApp";

export const metadata: Metadata = {
  title: "Admins",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminsPage() {
  return <AdminsApp />;
}

