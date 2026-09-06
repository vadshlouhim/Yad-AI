import { getPublishedBlogArticles } from "@/lib/blog/server";
import { EASYCOM_AGENTS } from "@/lib/agents";
import { absoluteUrl } from "@/lib/site-url";

export async function GET() {
  const articles = await getPublishedBlogArticles();
  const body = [
    "# EasyCom IA",
    "",
    "EasyCom IA est une plateforme de communication assistée par IA pour centraliser les publications, emails, avis Google, WhatsApp, Instagram, Facebook et automatisations.",
    "",
    "## Pages importantes",
    `- Accueil: ${absoluteUrl("/")}`,
    `- Affiches et visuels: ${absoluteUrl("/affiches")}`,
    `- Blog: ${absoluteUrl("/blog")}`,
    `- Tarification: ${absoluteUrl("/tarification")}`,
    `- Méthode: ${absoluteUrl("/method")}`,
    `- Contact: ${absoluteUrl("/contact")}`,
    `- Aide: ${absoluteUrl("/help")}`,
    `- Confidentialité: ${absoluteUrl("/privacy")}`,
    `- Conditions d'utilisation: ${absoluteUrl("/legal/terms")}`,
    `- Plan du site: ${absoluteUrl("/site-map")}`,
    "",
    "## Agents IA",
    ...EASYCOM_AGENTS.map(
      (agent) => `- ${agent.name}, ${agent.role}: ${absoluteUrl(`/agents/${agent.slug}`)}`
    ),
    "",
    "## Articles de référence",
    ...articles.map((article) => `- ${article.title}: ${absoluteUrl(`/blog/${article.slug}`)}`),
    "",
    "## Positionnement",
    "EasyCom IA aide les communautés, associations, commerces et structures locales à gagner du temps, améliorer leur régularité éditoriale et garder une communication cohérente sur plusieurs canaux.",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
