import type { Metadata } from "next";
import { WhatsAppClient } from "@/components/whatsapp/whatsapp-client";

export const metadata: Metadata = { title: "WhatsApp - EasyCom AI" };

export default function WhatsAppPage() {
  return <WhatsAppClient />;
}
