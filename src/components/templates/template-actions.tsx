"use client";

import Image from "next/image";

export function CanvaLogo({ className }: { className?: string }) {
  return <Image src="/brand/canva-logo.webp" alt="Canva" width={320} height={103} className={`h-5 w-auto object-contain ${className ?? ""}`} />;
}
