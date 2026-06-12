import type { Metadata } from "next";
import { WhatsAppClient } from "@/components/whatsapp/whatsapp-client";

export const metadata: Metadata = { title: "WhatsApp - Yad.ia" };

export default function WhatsAppPage() {
  return <WhatsAppClient />;
}
