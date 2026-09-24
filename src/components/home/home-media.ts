import sources from "./home-video-sources.json";

const origin = new URL(sources["02-dovber-publier-partout"]).origin;
const images = `${origin}/storage/v1/object/public/${encodeURIComponent("Image du site")}/`;
export const HOME_AGENT_IMAGES = {
  dovBer: images + encodeURIComponent("Dov -ber instagram.webp"),
  levik: images + encodeURIComponent("Levig email gmail.webp"),
  david: images + encodeURIComponent("David automatisations.webp"),
  zalman: images + encodeURIComponent("Zalman Affiche visuel...webp"),
  shmouel: images + encodeURIComponent("Shmouel etude Torah.webp"),
};
export const MAIN_VIDEO_URL = `${origin}/storage/v1/object/public/${encodeURIComponent("Video du site")}/${encodeURIComponent("Accueil principal 2026-09-23.mp4")}`;
export function homeVideoSource(media: string) {
  return sources[media as keyof typeof sources] ?? `/media/home/${media}.mp4`;
}
