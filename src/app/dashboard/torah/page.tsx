import type { Metadata } from "next";
import { TorahClient } from "@/components/torah/torah-client";

export const metadata: Metadata = { title: "Cours de Torah IA - EasyCom IA" };

export default function TorahPage() {
  return <TorahClient />;
}
