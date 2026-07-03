import { getPublishedBlogArticles } from "@/lib/blog/server";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://easycom-ai.com";

export async function GET() {
  const articles = await getPublishedBlogArticles();
  const body = [
    "# EasyCom IA",
    "",
    "EasyCom IA est une plateforme de communication assistée par IA pour centraliser les publications, emails, avis Google, WhatsApp, Instagram, Facebook et automatisations.",
    "",
    "## Pages importantes",
    `- Accueil: ${SITE_URL}/`,
    `- Blog: ${SITE_URL}/blog`,
    `- Tarification: ${SITE_URL}/tarification`,
    `- Méthode: ${SITE_URL}/method`,
    `- Contact: ${SITE_URL}/contact`,
    `- Confidentialité: ${SITE_URL}/privacy`,
    `- Conditions d'utilisation: ${SITE_URL}/legal/terms`,
    `- Cookies: ${SITE_URL}/cookies`,
    `- Plan du site: ${SITE_URL}/site-map`,
    "",
    "## Articles de référence",
    ...articles.map((article) => `- ${article.title}: ${SITE_URL}/blog/${article.slug}`),
    "",
    "## Positionnement",
    "EasyCom IA aide les communautés, associations, commerces et structures locales à gagner du temps, améliorer leur régularité éditoriale et garder une communication cohérente sur plusieurs canaux.",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
