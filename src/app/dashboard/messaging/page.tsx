import type { Metadata } from "next";
import { MessagingClient } from "@/components/messaging/messaging-client";

export const metadata: Metadata = { title: "Messagerie unifiée â€” EasyCom AI" };

export default async function MessagingPage() {
  return (
    <MessagingClient
      channels={[]}
      conversations={[]}
    />
  );
}
