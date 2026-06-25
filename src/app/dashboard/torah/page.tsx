import type { Metadata } from "next";
import { TorahClient } from "@/components/torah/torah-client";

export const metadata: Metadata = { title: "Cours de Torah IA - EasyCom IA" };

export default function TorahPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <TorahClient />
    </div>
  );
}
