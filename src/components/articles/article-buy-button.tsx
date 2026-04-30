"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { startArticleCheckout } from "@/lib/articles/checkout-client";

interface Props {
  articleId: string;
  label?: string;
  className?: string;
  variant?: "default" | "outline";
}

export function ArticleBuyButton({
  articleId,
  label = "Commander",
  className,
  variant = "default",
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      await startArticleCheckout(articleId);
    } catch (error) {
      console.error(error);
      alert("Impossible de lancer le paiement pour cet article.");
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleCheckout}
      loading={loading}
      className={className}
      variant={variant}
    >
      {label}
    </Button>
  );
}
