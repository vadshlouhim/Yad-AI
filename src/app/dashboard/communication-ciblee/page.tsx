import type { Metadata } from "next";
import { TargetedCommunicationClient } from "@/components/targeted-communication/targeted-communication-client";

export const metadata: Metadata = { title: "Communication ciblée" };

export default function TargetedCommunicationPage() {
  return <TargetedCommunicationClient />;
}

