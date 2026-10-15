import React from "react";
import { createRoot } from "react-dom/client";
import { NewsletterPaperClient } from "../../src/components/newsletter/newsletter-paper-client";
import { baseNewsletter, sampleImage } from "./newsletter-layout-cases";

const sleep = (ms = 60) => new Promise(resolve => setTimeout(resolve, ms));
const check = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const data = baseNewsletter();
data.enabled.seferHamitsvot = false; data.enabled.events = false; data.enabled.birthdays = false;
data.photos = [sampleImage("photo-one", 500, 300), sampleImage("photo-two", 300, 500)];
let draft = { ...data, version: 1, savedAt: Date.now(), title: data.generated.title, editorStep: "preview", donationUrl: data.community.donationUrl, mobilePreviewPage: "front" };
let mode = "layout";
const requests: Record<string, unknown>[] = [];
window.fetch = (async (url: string, options?: RequestInit) => {
  if (url === "/api/newsletter/draft") {
    if (options?.method === "PUT") { draft = JSON.parse(String(options.body)).draft; return Response.json({ updatedAt: "revision-" + Date.now() }); }
    return Response.json({ draft, updatedAt: "revision-0" });
  }
  if (url === "/api/newsletter/revise") {
    const body = JSON.parse(String(options?.body)); requests.push(body);
    if (mode === "offline") throw new Error("Connexion interrompue");
    return Response.json({ changes: mode === "protected" ? { ravWord: "NE PAS APPLIQUER" } : mode === "rewrite" ? { ravWord: "Un message revu à votre demande." } : mode === "impossible" ? { ravWord: "Un article trop long pour la page. ".repeat(350) } : {}, layout: { photoSide: "back" }, summary: "Photos au verso" });
  }
  return Response.json({});
}) as typeof fetch;
const root = createRoot(document.getElementById("root")!);
const render = (key: string) => root.render(<NewsletterPaperClient key={key} userId="fixture-user" community={data.community} initialEvents={data.events} initialBirthdays={data.birthdays} initialShabbat={data.shabbat} />);
render("first");
const button = (text: string) => [...document.querySelectorAll("button")].find(node => node.textContent?.includes(text))!;
function input(node: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(node, value); node.dispatchEvent(new Event("input", { bubbles: true }));
}
async function waitFor(predicate: () => boolean, message: string) {
  for (let i = 0; i < 100; i++) { if (predicate()) return; await sleep(); }
  throw new Error(message);
}
async function ask(text: string) {
  if (!document.getElementById("newsletter-ai-instructions")) { button("Modifier ce feuillet avec l’IA").click(); await sleep(); }
  input(document.querySelector("#newsletter-ai-instructions textarea")!, text); await sleep(); button("Recréer le PDF").click(); await sleep(250);
  await waitFor(() => !document.querySelector('main [role="status"]')?.textContent?.includes("prépare"), "révision ne finit pas");
}
async function run() {
  await waitFor(() => Boolean(document.querySelector("main article")), "aperçu initial");
  check(![...document.querySelectorAll("button")].some(node => ["Modifier", "Imprimer"].includes(node.textContent ?? "")), "anciens boutons retirés");
  check(document.documentElement.scrollWidth <= innerWidth, "pas de débordement mobile");
  if (new URLSearchParams(location.search).has("preview")) { document.querySelector("main")!.scrollIntoView(); return; }
  const original = data.generated.ravWord;
  await ask("Place les photos au verso, sans changer les textes.");
  check(document.querySelector('main [data-newsletter-text="rav"]')?.textContent === original, "texte protégé exact");
  check(button("Revenir à la version précédente"), "retour disponible");
  await sleep(850);
  const saved = JSON.parse(localStorage.getItem("easycom.newsletter.draft.fixture.fixture-user")!);
  check(saved.previousRevision.generated.ravWord === original && saved.layout.photoSide === "back", "version précédente sauvegardée");
  render("reloaded"); await waitFor(() => Boolean(document.querySelector("main article")), "restauration"); await sleep(250);
  check(button("Revenir à la version précédente"), "retour après rechargement");
  button("Revenir à la version précédente").click(); await sleep(250);
  mode = "protected"; await ask("Agrandis les photos");
  check(document.querySelector('main [data-newsletter-text="rav"]')?.textContent === original, "réécriture non autorisée bloquée");
  mode = "rewrite";
  const permission = [...document.querySelectorAll("#newsletter-ai-instructions label")].find(node => node.textContent === "Mot du Rav")!.querySelector("input")!;
  permission.click(); await sleep(); await ask("Raccourcis le Mot du Rav.");
  check(document.querySelector('main [data-newsletter-text="rav"]')?.textContent === "Un message revu à votre demande.", "réécriture explicite");
  mode = "impossible"; await ask("Allonge le Mot du Rav");
  check(document.querySelector('main [data-newsletter-text="rav"]')?.textContent === "Un message revu à votre demande.", "composition impossible conserve PDF");
  mode = "offline"; await ask("Réorganise les rubriques"); check(document.body.textContent?.includes("Connexion interrompue"), "erreur réseau utile");
  button("Personnaliser").click(); await sleep();
  const caption = [...document.querySelectorAll("label")].find(node => node.textContent?.startsWith("Légende de la photo 1"))!.querySelector("textarea")!;
  input(caption, "Préparatifs de la kermesse"); await sleep();
  const groups = [...document.querySelectorAll("label")].filter(node => node.textContent === "Grouper"); groups.forEach(label => label.querySelector("input")!.click()); await sleep();
  const common = [...document.querySelectorAll("label")].find(node => node.textContent?.startsWith("Légende commune"))!.querySelector("input")!;
  input(common, "Kermesse des enfants de l’école"); await sleep(); button("Appliquer au groupe").click(); await sleep();
  button("Feuillet").click(); await waitFor(() => Boolean(document.querySelector('main [data-photo-caption="photo-one"]')), "légende présente");
  check(document.querySelectorAll("main [data-photo-group-caption]").length === 1, "légende commune une fois");
  await sleep(850);
  check(draft.photos[0].caption === "Préparatifs de la kermesse", "légende enregistrée");
  check(requests.length === 5, "IA uniquement sur action explicite");
  document.body.insertAdjacentHTML("beforeend", '<p id="result">PASS NEWSLETTER REVISION UI</p>');
}
run().catch(error => document.body.insertAdjacentHTML("beforeend", `<pre id="result">FAIL: ${error.stack}</pre>`));
