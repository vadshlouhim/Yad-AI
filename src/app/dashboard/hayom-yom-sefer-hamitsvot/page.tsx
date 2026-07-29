import type { Metadata } from "next";
import { HayomYomSeferHamitsvotClient } from "@/components/hayom-yom-sefer-hamitsvot/hayom-yom-sefer-hamitsvot-client";

export const metadata: Metadata = { title: "Sefer Hamitsvot / Hayom Yom - EasyCom IA" };

export default function HayomYomSeferHamitsvotPage() {
  return <HayomYomSeferHamitsvotClient />;
}
