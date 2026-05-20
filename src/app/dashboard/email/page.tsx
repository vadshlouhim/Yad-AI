import type { Metadata } from "next";
import { EmailClient } from "@/components/email/email-client";

export const metadata: Metadata = { title: "Messagerie Email — Easycom AI" };

export default async function EmailPage() {
  return <EmailClient />;
}
