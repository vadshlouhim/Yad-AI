export async function startArticleCheckout(articleId: string) {
  const origin = window.location.origin;
  const currentUrl = window.location.href;

  const response = await fetch("/api/articles/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      articleId,
      successUrl: `${origin}/dashboard/articles?checkout=success`,
      cancelUrl: currentUrl,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.url) {
    throw new Error(data.error ?? "Impossible de lancer le paiement");
  }

  window.location.href = data.url;
}
