import React from "react";
import { createRoot } from "react-dom/client";
import { ContactsManager } from "../../src/components/settings/contacts-manager";
import { ContactsTools } from "../../src/components/settings/contacts-tools";
import { MobileBottomNav } from "../../src/components/layout/mobile-bottom-nav";
import { buildMemberPatch } from "../../src/lib/contacts/member-patch";

const sleep = (ms = 30) => new Promise(resolve => setTimeout(resolve, ms));
const assert = (value: unknown, message: string) => { if (!value) throw new Error(message); };
const rows = Array.from({ length: 63 }, (_, i) => ({ id: String(i), firstName: i === 0 ? "Élie" : "David", lastName: "Cohen " + String(i).padStart(2, "0"), displayName: i === 0 ? "Élie Cohen" : "David Cohen " + i, email: i % 2 ? null : `contact${i}@example.test`, phone: i % 3 ? null : "+33612345678", city: "Créteil", tags: ["Bénévoles"], notes: "Note conservée", birthDate: "1990-01-01", birthAfterSunset: false, hebrewBirthDay: 4, hebrewBirthMonth: 10, hebrewBirthYear: 5750 }));
const calls: { url: string; body?: Record<string, unknown> }[] = [];
let fail = false;
let aiResolve: ((response: Response) => void) | null = null;
window.confirm = () => true;
window.fetch = (async (url: string, options?: RequestInit) => {
  const body = options?.body ? JSON.parse(String(options.body)) : undefined;
  calls.push({ url, body });
  if (url.endsWith("ai-search")) return new Promise<Response>(resolve => { aiResolve = resolve; });
  if (options?.method === "PATCH") {
    await sleep(120);
    if (fail) throw new Error("Connexion interrompue");
    const row = rows.find(row => row.id === url.split("/").at(-1))!;
    Object.assign(row, buildMemberPatch(row, body));
    return Response.json(row);
  }
  if (options?.method === "DELETE") { const index = rows.findIndex(row => row.id === url.split("/").at(-1)); rows.splice(index, 1); return Response.json({ success: true }); }
  if (options?.method === "POST") {
    const added = { ...rows[0], ...body, id: String(rows.length + 100), displayName: body.displayName || [body.firstName, body.lastName].join(" ") };
    rows.push(added); return Response.json([added]);
  }
  if (url === "/api/community/members") return Response.json(rows);
  if (url.includes("unisoft")) return Response.json({ connected: false });
  return Response.json([]);
}) as typeof fetch;
document.body.innerHTML = '<div id="root"></div>';
createRoot(document.getElementById("root")!).render(<div className="mx-auto w-full min-w-0 max-w-7xl space-y-3 px-3 py-4 pb-28"><ContactsManager /><ContactsTools /><MobileBottomNav /></div>);
const byLabel = (label: string) => document.querySelector(`[aria-label="${label}"]`) as HTMLInputElement;
function input(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  setter.call(element, value); element.dispatchEvent(new Event("input", { bubbles: true }));
}
const button = (text: string) => [...document.querySelectorAll("button")].find(element => element.textContent === text)!;
async function run() {
  await sleep(150);
  assert(document.querySelectorAll("tbody tr").length === 50, "pagination initiale");
  assert(calls.length === 1, "outils secondaires non chargés");
  assert(document.documentElement.scrollWidth <= innerWidth, "aucun débordement du document");
  const region = document.querySelector('[role="region"]') as HTMLElement;
  assert(region.scrollWidth > region.clientWidth, "tableau défilant");
  if (innerWidth < 768) assert(getComputedStyle(document.querySelector('td')!).position === "sticky", "nom fixe mobile");
  if (new URLSearchParams(location.search).has("preview")) return;
  button("Suivant").click(); await sleep(); assert(document.querySelectorAll("tbody tr").length === 13, "page suivante");
  button("Précédent").click(); await sleep();
  input(byLabel("Rechercher les contacts"), "elie benevoles"); await sleep(); assert(document.querySelectorAll("tbody tr").length === 1, "recherche accent/groupes");
  input(byLabel("Rechercher les contacts"), ""); await sleep();
  byLabel("Modifier Téléphone de Élie Cohen").click(); await sleep();
  input(byLabel("Téléphone de Élie Cohen"), "0611111111"); await sleep();
  byLabel("Téléphone de Élie Cohen").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await sleep();
  assert(!calls.some(call => call.body?.phone === "0611111111"), "Escape annule");
  assert(document.activeElement === byLabel("Modifier Téléphone de Élie Cohen"), "focus restauré après Escape");
  byLabel("Modifier Téléphone de Élie Cohen").click(); await sleep();
  input(byLabel("Téléphone de Élie Cohen"), "0622222222"); await sleep(); byLabel("Téléphone de Élie Cohen").blur();
  await sleep(200); assert(rows[0].phone === "0622222222" && rows[0].notes === "Note conservée", "sauvegarde partielle");
  assert(Object.keys(calls.find(call => call.body?.phone === "0622222222")!.body!).length === 1, "seul téléphone envoyé");
  fail = true;
  byLabel("Modifier Ville de Élie Cohen").click(); await sleep(); input(byLabel("Ville de Élie Cohen"), "Paris"); await sleep(); byLabel("Ville de Élie Cohen").blur(); await sleep(200);
  assert(button("Réessayer"), "échec visible"); assert(byLabel("Modifier Ville de Élie Cohen").textContent === "Paris", "saisie retenue");
  let prevented = false; window.confirm = () => false; prevented = !window.dispatchEvent(new Event("contacts:before-navigate", { cancelable: true })); assert(prevented, "navigation protégée"); window.confirm = () => true;
  fail = false; button("Réessayer").click(); await sleep(200); assert(rows[0].city === "Paris", "nouvelle tentative");
  byLabel("Modifier Groupes de Élie Cohen").click(); await sleep(); input(byLabel("Groupes de Élie Cohen"), "Parents, parents, Bénévoles"); await sleep(); byLabel("Groupes de Élie Cohen").blur(); await sleep(200); assert(rows[0].tags.length === 2, "groupes sans doublons");
  byLabel("Modifier Email de Élie Cohen").click(); await sleep(); input(byLabel("Email de Élie Cohen"), "invalide"); await sleep(); byLabel("Email de Élie Cohen").blur(); await sleep(); assert(byLabel("Email de Élie Cohen").value === "invalide", "email invalide conservé sans envoi"); byLabel("Email de Élie Cohen").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await sleep();
  byLabel("Modifier Email de Élie Cohen").click(); await sleep(); input(byLabel("Email de Élie Cohen"), ""); await sleep(); byLabel("Email de Élie Cohen").blur(); await sleep(200); assert(rows[0].email === null, "effacement explicite");
  byLabel("Modifier Naissance civile de Élie Cohen").click(); await sleep(); input(byLabel("Naissance civile"), "2000-02-29"); await sleep(); button("Valider").click(); await sleep(200); assert(rows[0].birthDate === "2000-02-29", "date synchronisée");
  input(byLabel("Rechercher les contacts"), "Paris"); await sleep(); byLabel("Rechercher avec l’IA").click(); await sleep(); input(byLabel("Rechercher les contacts"), "introuvable"); await sleep(); aiResolve!(Response.json({ ids: ["0"], summary: "Ancienne recherche" })); await sleep(); assert(!document.body.textContent?.includes("Ancienne recherche"), "IA obsolète ignorée"); assert(!document.querySelector("tbody tr"), "nouvelle recherche conservée");
  input(byLabel("Rechercher les contacts"), ""); await sleep(); byLabel("Filtres").click(); await sleep();
  const missing = [...document.querySelectorAll("label")].find(label => label.textContent === "Sans téléphone")!.querySelector("input")!; missing.click(); await sleep(); assert(document.querySelectorAll("tbody tr").length === 42, "filtre avant pagination"); missing.click(); await sleep();
  button("Ajouter").click(); await sleep();
  const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
  assert(dialog.getBoundingClientRect().width <= innerWidth && dialog.getBoundingClientRect().left >= 0, "fiche adaptée à écran");
  button("Date hébraïque").click(); await sleep(); assert(dialog.scrollWidth <= dialog.clientWidth, "éditeur de date sans débordement mobile"); button("Annuler").click(); await sleep();
  const lastName = [...document.querySelectorAll('[role="dialog"] label')].find(label => label.textContent === "Nom")!.querySelector("input")!;
  input(lastName, "Test ajouté"); await sleep(); button("Enregistrer").click(); await sleep(200); assert(rows.some(row => row.lastName === "Test ajouté"), "ajout");
  byLabel("Actions pour Élie Cohen").click(); await sleep(); button("Fiche complète").click(); await sleep();
  const cityInput = [...document.querySelectorAll('[role="dialog"] label')].find(label => label.textContent === "Ville")!.querySelector("input")!;
  input(cityInput, "Lyon"); await sleep(); button("Enregistrer").click(); await sleep(200); assert(rows[0].city === "Lyon" && rows[0].notes === "Note conservée", "fiche complète conserve les champs");
  byLabel("Actions pour Élie Cohen").click(); await sleep(); button("Supprimer").click(); await sleep(); assert(!rows.some(row => row.id === "0"), "suppression confirmée");
  [...document.querySelectorAll("summary")].find(element => element.textContent === "Unisoft")!.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(200); assert(calls.some(call => call.url.includes("unisoft")), "chargement à ouverture");
  document.body.insertAdjacentHTML("beforeend", '<p id="result">PASS CRM BROWSER</p>');
}
run().catch(error => { document.body.insertAdjacentHTML("beforeend", `<pre id="result">FAIL: ${error.stack}</pre>`); });
