import type { Metadata } from "next";
import { ComingSoonFeatures } from "@/components/coming-soon/coming-soon-features";

export const metadata: Metadata = { title: "Fonctionnalités à venir" };

export default function DashboardComingSoonPage() {
  return <ComingSoonFeatures dashboard />;
}
