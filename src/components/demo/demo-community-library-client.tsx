"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  FileText,
  HeartHandshake,
  ImageIcon,
  Library,
  Megaphone,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  Users,
  WandSparkles,
  X,
} from "lucide-react";

type Category = "Affiche" | "Image" | "Document" | "Texte";
type Tab = "resources" | "requests";

type DemoResource = {
  id: string;
  title: string;
  description: string;
  category: Category;
  theme: string;
  format: string;
  featured?: boolean;
  preview: "shabbat" | "purim" | "torah" | "donation" | "youth" | "calendar" | "document" | "message";
};

const RESOURCES: DemoResource[] = [
  { id: "1", title: "Horaires de Chabbat", description: "Affiche hebdomadaire prête à personnaliser.", category: "Affiche", theme: "Chabbat", format: "PNG", featured: true, preview: "shabbat" },
  { id: "2", title: "Grande fête de Pourim", description: "Visuel festif pour les réseaux sociaux.", category: "Affiche", theme: "Fêtes", format: "PNG", featured: true, preview: "purim" },
  { id: "3", title: "Cours de Torah hebdomadaire", description: "Annonce moderne pour votre communauté.", category: "Image", theme: "Torah", format: "JPG", preview: "torah" },
  { id: "4", title: "Campagne de dons", description: "Affiche solidaire avec appel à l’action.", category: "Affiche", theme: "Solidarité", format: "PNG", preview: "donation" },
  { id: "5", title: "Programme jeunesse", description: "Visuel coloré pour les activités enfants.", category: "Image", theme: "Jeunesse", format: "PNG", preview: "youth" },
  { id: "6", title: "Calendrier communautaire", description: "Planning mensuel simple et lisible.", category: "Document", theme: "Communauté", format: "PDF", preview: "calendar" },
  { id: "7", title: "Guide d’accueil des familles", description: "Livret pratique à remettre aux nouveaux membres.", category: "Document", theme: "Accueil", format: "PDF", preview: "document" },
  { id: "8", title: "Message Mazal Tov", description: "Texte chaleureux à adapter avec le prénom.", category: "Texte", theme: "Anniversaire", format: "TXT", preview: "message" },
  { id: "9", title: "Repas communautaire", description: "Invitation élégante pour Chabbat.", category: "Affiche", theme: "Événement", format: "PNG", preview: "shabbat" },
  { id: "10", title: "Collecte alimentaire", description: "Publication prête pour Facebook et WhatsApp.", category: "Image", theme: "Solidarité", format: "JPG", preview: "donation" },
  { id: "11", title: "Étude de la Paracha", description: "Fiche pédagogique structurée et imprimable.", category: "Document", theme: "Torah", format: "PDF", preview: "document" },
  { id: "12", title: "Invitation aux familles", description: "Message convivial pour une activité jeunesse.", category: "Texte", theme: "Jeunesse", format: "TXT", preview: "message" },
];

const REQUESTS = [
  { title: "Affiche Lag BaOmer", category: "Affiche", theme: "Fêtes", detail: "Un modèle moderne pour annoncer la sortie communautaire.", urgency: "Cette semaine" },
  { title: "Livret nouveaux adhérents", category: "Document", theme: "Accueil", detail: "Une présentation courte des services de la communauté.", urgency: "Ce mois-ci" },
  { title: "Texte appel aux bénévoles", category: "Texte", theme: "Solidarité", detail: "Un message WhatsApp chaleureux et mobilisateur.", urgency: "Dès que possible" },
  { title: "Programme Gan Israël", category: "Image", theme: "Jeunesse", detail: "Une image carrée pour présenter les activités de l’été.", urgency: "Ce mois-ci" },
];

const CATEGORIES: Array<Category | "Toutes"> = ["Toutes", "Affiche", "Image", "Document", "Texte"];

const PREVIEW_STYLES = {
  shabbat: { background: "#421388", accent: "#f5b916", label: "CHABBAT", title: "HORAIRES DE CHABBAT", detail: "Allumage 19h42  •  Sortie 20h51", icon: CalendarDays },
  purim: { background: "#9d2261", accent: "#ffd15c", label: "POURIM", title: "GRANDE FÊTE DE POURIM", detail: "Musique • Méguila • Buffet", icon: Sparkles },
  torah: { background: "#087f85", accent: "#ffffff", label: "COURS", title: "ÉTUDE & PARTAGE", detail: "Chaque mardi à 20h30", icon: BookOpen },
  donation: { background: "#176f4d", accent: "#f7c84b", label: "SOLIDARITÉ", title: "ENSEMBLE, AGISSONS", detail: "Chaque don fait la différence", icon: HeartHandshake },
  youth: { background: "#1967d2", accent: "#ffd15c", label: "JEUNESSE", title: "UN DIMANCHE PLEIN DE JOIE", detail: "Ateliers • Jeux • Goûter", icon: Users },
  calendar: { background: "#f5f2fa", accent: "#421388", label: "CE MOIS-CI", title: "AGENDA COMMUNAUTAIRE", detail: "Tous vos rendez-vous en un coup d’œil", icon: CalendarDays },
  document: { background: "#f8f6f1", accent: "#421388", label: "RESSOURCE", title: "GUIDE PRATIQUE", detail: "Une fiche claire, prête à imprimer", icon: FileText },
  message: { background: "#fff1f5", accent: "#b42365", label: "MESSAGE", title: "MAZAL TOV !", detail: "Un texte chaleureux à personnaliser", icon: MessageCircle },
} as const;

function Preview({ resource }: { resource: DemoResource }) {
  const design = PREVIEW_STYLES[resource.preview];
  const Icon = design.icon;
  const darkText = resource.preview === "calendar" || resource.preview === "document" || resource.preview === "message";

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl p-4" style={{ backgroundColor: design.background, color: darkText ? "#111827" : "white" }}>
      <div className="absolute -right-7 -top-7 size-24 rounded-full border-[18px] opacity-10" style={{ borderColor: design.accent }} />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black tracking-[0.2em]" style={{ color: design.accent }}>{design.label}</span>
          <span className="flex size-8 items-center justify-center rounded-xl bg-white shadow-sm"><Icon className="size-4" style={{ color: design.accent }} /></span>
        </div>
        <p className="mt-auto max-w-[90%] text-xl font-black leading-[1.05]">{design.title}</p>
        <p className="mt-2 text-[11px] font-semibold opacity-80">{design.detail}</p>
      </div>
    </div>
  );
}

function AdaptDialog({ resource, onClose }: { resource: DemoResource; onClose: () => void }) {
  const [generated, setGenerated] = useState(false);

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Adapter la ressource" onClick={onClose}>
      <div className="w-full max-w-lg rounded-[2rem] bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">Adaptation simulée</p><h2 className="mt-1 text-xl font-black text-slate-950">{resource.title}</h2></div>
          <button type="button" onClick={onClose} className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-600"><X className="size-5" /></button>
        </div>
        <textarea className="mt-4 min-h-28 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" defaultValue="Adaptez cette ressource avec le nom Beth Habad du Marais et un ton chaleureux." />
        <button type="button" onClick={() => setGenerated(true)} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#421388] px-4 font-black text-white"><WandSparkles className="size-5" /> Générer la version adaptée</button>
        {generated && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><p className="flex items-center gap-2 font-black"><Check className="size-4" /> Version prête</p><p className="mt-1">La ressource a été personnalisée pour le Beth Habad du Marais. Cette action reste entièrement simulée.</p></div>}
      </div>
    </div>
  );
}

export function DemoCommunityLibraryClient() {
  const [tab, setTab] = useState<Tab>("resources");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "Toutes">("Toutes");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [adaptTarget, setAdaptTarget] = useState<DemoResource | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filteredResources = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return RESOURCES.filter((resource) => {
      const matchesCategory = category === "Toutes" || resource.category === category;
      const matchesQuery = !normalized || `${resource.title} ${resource.description} ${resource.theme}`.toLocaleLowerCase("fr").includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  function simulateDownload(resource: DemoResource) {
    setNotice(`« ${resource.title} » a été préparé pour le téléchargement (simulation).`);
    window.setTimeout(() => setNotice(null), 3200);
  }

  return (
    <div className="space-y-5 pb-24 sm:space-y-6 sm:pb-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#421388] px-6 py-7 text-white shadow-[0_24px_58px_-34px_rgba(66,19,136,0.7)] sm:px-9 sm:py-8">
        <div className="absolute -right-16 -top-20 size-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em]"><Library className="size-4" /> Démonstration</span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Bibliothèque partagée</h1>
          <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/80 sm:text-base">Des ressources communautaires prêtes à télécharger, adapter et partager.</p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-center">
        <button type="button" onClick={() => setNotice("Le formulaire de contribution est simulé dans cette démonstration.")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#421388] px-4 text-sm font-bold text-white shadow-lg shadow-violet-200"><Plus className="size-4" /> Soumettre</button>
        <button type="button" onClick={() => setTab("requests")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-white px-4 text-sm font-bold text-violet-800 shadow-sm"><MessageCircle className="size-4" /> Demander</button>
      </div>

      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <button type="button" onClick={() => setTab("resources")} className={`flex-1 rounded-xl py-3 text-sm font-black transition ${tab === "resources" ? "bg-[#421388] text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}>Explorer <span className="ml-1 opacity-70">({RESOURCES.length})</span></button>
        <button type="button" onClick={() => setTab("requests")} className={`flex-1 rounded-xl py-3 text-sm font-black transition ${tab === "requests" ? "bg-[#421388] text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}>Demandes <span className="ml-1 opacity-70">({REQUESTS.length})</span></button>
      </div>

      {tab === "resources" ? (
        <>
          <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_20px_48px_-35px_rgba(66,19,136,0.34)] sm:p-5">
            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1">
                <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-violet-700" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher une ressource…" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-base outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />
              </label>
              <button type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} className="flex min-h-12 items-center gap-2 rounded-2xl bg-[#421388] px-4 font-bold text-white">Filtres <ChevronDown className={`size-4 transition ${filtersOpen ? "rotate-180" : ""}`} /></button>
            </div>
            {filtersOpen && <div className="flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-3">{CATEGORIES.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-full border px-3 py-2 text-xs font-black transition ${category === item ? "border-[#421388] bg-[#421388] text-white" : "border-slate-200 bg-white text-slate-600 hover:border-violet-300"}`}>{item}</button>)}</div>}
            <p className="text-sm font-semibold text-slate-500">{filteredResources.length} ressource{filteredResources.length > 1 ? "s" : ""} disponible{filteredResources.length > 1 ? "s" : ""}</p>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredResources.map((resource) => (
              <article key={resource.id} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_14px_34px_-26px_rgba(66,19,136,0.36)] transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg">
                <Preview resource={resource} />
                <div className="flex flex-1 flex-col p-2 pb-1 pt-4">
                  <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 className="text-base font-black text-slate-950">{resource.title}</h2><p className="mt-1 text-sm leading-5 text-slate-500">{resource.description}</p></div>{resource.featured && <Sparkles className="size-5 shrink-0 text-amber-500" />}</div>
                  <div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-800">{resource.category}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{resource.theme}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{resource.format}</span></div>
                  <div className="mt-auto grid grid-cols-2 gap-2 pt-4"><button type="button" onClick={() => simulateDownload(resource)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#421388] px-2 text-xs font-black text-white"><Download className="size-4" /> Télécharger</button><button type="button" onClick={() => setAdaptTarget(resource)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-white px-2 text-xs font-black text-violet-800"><WandSparkles className="size-4" /> Adapter</button></div>
                </div>
              </article>
            ))}
          </div>

          {filteredResources.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-14 text-center"><ImageIcon className="mx-auto size-10 text-slate-300" /><p className="mt-3 font-black text-slate-700">Aucune ressource trouvée</p><button type="button" onClick={() => { setQuery(""); setCategory("Toutes"); }} className="mt-3 text-sm font-bold text-violet-700">Effacer les filtres</button></div>}
        </>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">Besoins de la communauté</p><h2 className="mt-1 text-2xl font-black text-slate-950">Demandes de ressources</h2></div><button type="button" onClick={() => setNotice("Nouvelle demande simulée.")} className="flex size-11 items-center justify-center rounded-2xl bg-[#421388] text-white"><Plus className="size-5" /></button></div>
          {REQUESTS.map((request) => <article key={request.title} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><Megaphone className="size-5" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-950">{request.title}</h3><span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-bold text-violet-800">{request.category}</span></div><p className="mt-1 text-sm leading-6 text-slate-600">{request.detail}</p><p className="mt-2 text-xs font-bold text-slate-400">{request.theme} · {request.urgency}</p></div></div></article>)}
        </section>
      )}

      {notice && <div className="fixed bottom-24 left-1/2 z-[230] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-2xl" role="status"><Check className="size-5 shrink-0 text-emerald-400" /> <span className="min-w-0 flex-1">{notice}</span><button type="button" onClick={() => setNotice(null)}><X className="size-4" /></button></div>}
      {adaptTarget && <AdaptDialog resource={adaptTarget} onClose={() => setAdaptTarget(null)} />}
    </div>
  );
}
