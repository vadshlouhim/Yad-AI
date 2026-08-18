import type { Metadata } from "next";
import { DemoCommunityLibraryClient } from "@/components/demo/demo-community-library-client";

export const metadata: Metadata = {
  title: "Bibliothèque partagée",
  robots: { index: false, follow: false, noarchive: true },
};

export default function DemoCommunityLibraryPage() {
  return <DemoCommunityLibraryClient />;
}
