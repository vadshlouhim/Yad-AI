import type { Metadata } from "next";
import { WhatsAppClient } from "@/components/whatsapp/whatsapp-client";

export const metadata: Metadata = { title: "WhatsApp - EasyCom IA" };

export default function WhatsAppPage() {
  return (
    <div className="container max-w-6xl mx-auto py-6 px-4 sm:px-6">
      <WhatsAppClient />
    </div>
  );
}
