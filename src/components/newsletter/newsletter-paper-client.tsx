"use client";
/* eslint-disable @next/next/no-img-element */

import { type ChangeEvent, type ReactNode, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  BookOpen,
  CalendarDays,
  Cake,
  Clock3,
  Download,
  Eye,
  FileText,
  Gift,
  HandHeart,
  HeartHandshake,
  ImagePlus,
  LayoutList,
  Loader2,
  Printer,
  PenLine,
  Sparkles,
  Store,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NewsletterEvent = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  category: string | null;
};

export type NewsletterBirthday = {
  id: string;
  name: string;
  hebrewDate: string;
  gregorianDate: string;
};

export type NewsletterShabbat = {
  date: string;
  hebrewDate: string | null;
  parasha: string | null;
  entry: string | null;
  exit: string | null;
};

type CommunityInfo = {
  name: string;
  logoUrl: string | null;
  coverUrl: string | null;
  city: string;
  timezone: string;
  signature: string | null;
  donationUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  isBethHabad: boolean;
};

type ModuleKey = "ravWord" | "sicha" | "photos" | "posters" | "parness" | "birthdays" | "kiddush" | "events" | "restaurantAd" | "support" | "shabbat";
type EditorStep = "modules" | "content" | "preview";

type ModuleConfig = {
  key: ModuleKey;
  title: string;
  description: string;
  icon: LucideIcon;
  locked?: boolean;
};

type UploadedPhoto = {
  id: string;
  url: string;
  name: string;
};

type GeneratedNewsletter = {
  title: string;
  intro: string;
  ravWord: string;
  shabbatNote: string;
  eventIntro: string;
  restaurantAd: string;
  sichaTitle: string;
  sichaExcerpt: string;
  sichaUrl: string;
  proofreadNote: string;
  warnings: string[];
};

const MODULES: ModuleConfig[] = [
  { key: "ravWord", title: "Mot du Rav", description: "Texte court de Torah adapte au theme.", icon: BookOpen },
  { key: "sicha", title: "Siha du Rabbi", description: "Extrait officiel Chabad.org, sans IA.", icon: BookOpen },
  { key: "photos", title: "Photos de la semaine", description: "Grille de 3 a 5 photos televersees.", icon: ImagePlus },
  { key: "posters", title: "Affiches a venir", description: "Affiches des prochains rendez-vous.", icon: ImagePlus },
  { key: "parness", title: "Parness Hayom", description: "Leylouy Nichmat, Refoua Chelema ou soutien.", icon: HeartHandshake },
  { key: "birthdays", title: "Anniversaires", description: "Membres concernes cette semaine.", icon: Cake },
  { key: "kiddush", title: "Kidouch offert", description: "Mention du sponsor du Kidouch.", icon: Gift },
  { key: "events", title: "Evenements a venir", description: "Pre-rempli depuis Mon Agenda.", icon: CalendarDays },
  { key: "restaurantAd", title: "Pub partenaire", description: "Visuels partenaires optionnels.", icon: Store },
  { key: "support", title: "Nous soutenir", description: "Lien vers votre page de dons.", icon: HandHeart },
  { key: "shabbat", title: "Repere Chabbat", description: "Paracha et horaires disponibles.", icon: Clock3, locked: true },
];

const DEFAULT_ENABLED: Record<ModuleKey, boolean> = {
  ravWord: true,
  sicha: false,
  photos: true,
  posters: false,
  parness: true,
  birthdays: true,
  kiddush: true,
  events: true,
  restaurantAd: false,
  support: true,
  shabbat: true,
};

function formatDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`));
}

function initialGenerated(community: CommunityInfo, shabbat: NewsletterShabbat | null): GeneratedNewsletter {
  return {
    title: "Le Chabatone",
    intro: "Votre feuillet communautaire des activites de la semaine.",
    ravWord: "Selectionnez un theme puis lancez la generation IA pour preparer le Mot du Rav.",
    shabbatNote: shabbat?.parasha
      ? `Un resume de ${shabbat.parasha} sera prepare par l'IA lorsque vous genererez votre feuillet.`
      : "Generez le feuillet pour recevoir un resume clair de la Paracha de la semaine.",
    eventIntro: "Les rendez-vous importants des prochains jours sont rassembles ici pour une lecture claire avant Chabbat.",
    restaurantAd: "Votre partenaire cacher de la semaine vous souhaite Chabbat Chalom.",
    sichaTitle: "",
    sichaExcerpt: "",
    sichaUrl: "",
    proofreadNote: "Pret pour relecture avant impression.",
    warnings: [],
  };
}

export function NewsletterPaperClient({
  community,
  initialEvents,
  initialBirthdays,
  initialShabbat,
}: {
  community: CommunityInfo;
  initialEvents: NewsletterEvent[];
  initialBirthdays: NewsletterBirthday[];
  initialShabbat: NewsletterShabbat | null;
}) {
  const rectoRef = useRef<HTMLDivElement>(null);
  const versoRef = useRef<HTMLDivElement>(null);
  const pdfRectoRef = useRef<HTMLDivElement>(null);
  const pdfVersoRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState<Record<ModuleKey, boolean>>(() => ({ ...DEFAULT_ENABLED, support: Boolean(community.donationUrl) }));
  const [editorStep, setEditorStep] = useState<EditorStep>("modules");
  const [mobilePreviewPage, setMobilePreviewPage] = useState<"front" | "back">("front");
  const [ravTheme, setRavTheme] = useState("");
  const [parnessText, setParnessText] = useState("");
  const [kiddushText, setKiddushText] = useState("");
  const [sichaUrl, setSichaUrl] = useState("");
  const [importingSicha, setImportingSicha] = useState(false);
  const [partnerAds, setPartnerAds] = useState<UploadedPhoto[]>([]);
  const [donationUrl, setDonationUrl] = useState(community.donationUrl ?? "");
  const [savingDonationUrl, setSavingDonationUrl] = useState(false);
  const tone = "Professionnel, chaleureux, clair";
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [posters, setPosters] = useState<UploadedPhoto[]>([]);
  const [bannerPhotoUrl, setBannerPhotoUrl] = useState(community.coverUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generated, setGenerated] = useState<GeneratedNewsletter>(() => initialGenerated(community, initialShabbat));
  const [error, setError] = useState<string | null>(null);

  const activeCount = useMemo(() => Object.values(enabled).filter(Boolean).length, [enabled]);
  const visibleEvents = initialEvents.slice(0, 6);
  const visiblePhotos = photos.slice(0, 9);
  const visiblePosters = posters.slice(0, 3);
  const visiblePartnerAds = partnerAds.slice(0, 3);
  const previewCommunity = { ...community, donationUrl };

  function toggleModule(key: ModuleKey) {
    if (key === "shabbat") return;
    setEnabled((current) => ({ ...current, [key]: !current[key] }));
  }

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, 9 - photos.length));
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/uploads/attachment", { method: "POST", body: form });
        const data = await response.json().catch(() => ({})) as { url?: string; name?: string; error?: string };
        if (!response.ok || !data.url) throw new Error(data.error ?? "Televersement impossible.");
        return { id: crypto.randomUUID(), url: data.url, name: data.name ?? file.name } satisfies UploadedPhoto;
      }));
      setPhotos((current) => [...current, ...uploaded].slice(0, 9));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Televersement impossible.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function uploadBannerPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/uploads/attachment", { method: "POST", body: form });
      const data = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Televersement impossible.");
      setBannerPhotoUrl(data.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Televersement impossible.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function uploadPosters(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, 3 - posters.length));
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/uploads/attachment", { method: "POST", body: form });
        const data = await response.json().catch(() => ({})) as { url?: string; name?: string; error?: string };
        if (!response.ok || !data.url) throw new Error(data.error ?? "Televersement impossible.");
        return { id: crypto.randomUUID(), url: data.url, name: data.name ?? file.name } satisfies UploadedPhoto;
      }));
      setPosters((current) => [...current, ...uploaded].slice(0, 3));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Televersement impossible.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function uploadPartnerAds(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, 3 - partnerAds.length));
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await Promise.all(files.map(async (file) => {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/uploads/attachment", { method: "POST", body: form });
        const data = await response.json().catch(() => ({})) as { url?: string; name?: string; error?: string };
        if (!response.ok || !data.url) throw new Error(data.error ?? "Televersement impossible.");
        return { id: crypto.randomUUID(), url: data.url, name: data.name ?? file.name } satisfies UploadedPhoto;
      }));
      setPartnerAds((current) => [...current, ...uploaded].slice(0, 3));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Televersement impossible.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function generateNewsletter() {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/newsletter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modules: enabled,
          ravTheme,
          parnessText,
          kiddushText,
          restaurantText: "",
          photoCount: photos.length,
          tone,
        }),
      });
      const data = await response.json().catch(() => ({})) as Partial<GeneratedNewsletter> & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Generation impossible.");
      setGenerated((current) => ({
        title: data.title || current.title,
        intro: data.intro || current.intro,
        ravWord: data.ravWord || current.ravWord,
        shabbatNote: data.shabbatNote || current.shabbatNote,
        eventIntro: data.eventIntro || current.eventIntro,
        restaurantAd: data.restaurantAd || current.restaurantAd,
        sichaTitle: current.sichaTitle,
        sichaExcerpt: current.sichaExcerpt,
        sichaUrl: current.sichaUrl,
        proofreadNote: data.proofreadNote || "Relu et adapte a l'impression.",
        warnings: Array.isArray(data.warnings) ? data.warnings : [],
      }));
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Generation impossible.");
    } finally {
      setGenerating(false);
    }
  }

  async function rewriteRavWord() {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/newsletter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: { ...enabled, ravWord: true }, ravTheme, tone, mode: "rav" }),
      });
      const data = await response.json().catch(() => ({})) as Partial<GeneratedNewsletter> & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Reecriture impossible.");
      if (data.ravWord?.trim()) setGenerated((current) => ({ ...current, ravWord: data.ravWord!.trim() }));
    } catch (rewriteError) {
      setError(rewriteError instanceof Error ? rewriteError.message : "Reecriture impossible.");
    } finally {
      setGenerating(false);
    }
  }

  async function importOfficialSicha() {
    setImportingSicha(true);
    setError(null);
    try {
      const response = await fetch("/api/newsletter/sicha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sichaUrl }),
      });
      const data = await response.json().catch(() => ({})) as { title?: string; excerpt?: string; url?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Import impossible.");
      setGenerated((current) => ({ ...current, sichaTitle: data.title ?? "", sichaExcerpt: data.excerpt ?? "", sichaUrl: data.url ?? "" }));
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import impossible.");
    } finally {
      setImportingSicha(false);
    }
  }

  async function saveDonationLink() {
    setSavingDonationUrl(true);
    setError(null);
    try {
      const response = await fetch("/api/newsletter/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donationUrl }),
      });
      const data = await response.json().catch(() => ({})) as { donationUrl?: string | null; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Enregistrement impossible.");
      setDonationUrl(data.donationUrl ?? "");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Enregistrement impossible.");
    } finally {
      setSavingDonationUrl(false);
    }
  }

  async function downloadPdf() {
    const pages = [pdfRectoRef.current, pdfVersoRef.current].filter((page): page is HTMLDivElement => Boolean(page));
    if (pages.length === 0) return;
    setExporting(true);
    setError(null);
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const exportWidth = 794;
      const exportHeight = 1123;
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      for (const [index, page] of pages.entries()) {
        const dataUrl = await toPng(page, {
          cacheBust: true,
          pixelRatio: 2,
          width: exportWidth,
          height: exportHeight,
          backgroundColor: "#fffdf7",
          style: {
            boxSizing: "border-box",
            width: `${exportWidth}px`,
            minWidth: `${exportWidth}px`,
            maxWidth: `${exportWidth}px`,
            height: `${exportHeight}px`,
            minHeight: `${exportHeight}px`,
            margin: "0",
          },
        });
        if (index > 0) pdf.addPage("a4", "portrait");
        pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      }
      pdf.save(`newsletter-chabbat-${community.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "communaute"}.pdf`);
    } catch (pdfError) {
      setError(pdfError instanceof Error ? pdfError.message : "Export PDF impossible.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 bg-[#fffaf1] pb-48 md:pb-28 sm:px-6 sm:pt-6">
      <section className="relative overflow-hidden rounded-b-[2.4rem] bg-[radial-gradient(circle_at_82%_0%,#36506d_0%,#17253f_48%,#0f1c2e_100%)] px-5 pb-6 pt-7 text-white shadow-[0_18px_35px_rgba(23,37,63,0.2)] sm:rounded-[2rem] sm:px-8">
        <span className="pointer-events-none absolute -right-14 top-12 size-48 rounded-full bg-[#e9c76a]/20 blur-3xl" />
        <span className="pointer-events-none absolute -left-10 bottom-0 size-36 rounded-full bg-[#36506d]/35 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e9c76a]">Votre feuillet communautaire</p>
            <h1 className="mt-2 break-words text-[clamp(2rem,9vw,3.1rem)] font-black leading-[0.95] tracking-[-0.055em]">Le Chabaton <span className="inline-flex translate-y-[-0.15em] rounded-lg bg-[#e9c76a] px-2 py-1 text-[0.36em] tracking-normal text-[#17253f] shadow-sm">PDF</span></h1>
          </div>
          <span className="flex size-14 shrink-0 items-center justify-center rounded-[1.25rem] border border-white/20 bg-white/10 text-2xl font-black shadow-lg backdrop-blur-sm">ב&quot;ה</span>
        </div>
      </section>

      <nav className="mx-4 grid grid-cols-3 gap-2 sm:mx-0 print:hidden" aria-label="Étapes de création">
        {([ ["modules", "1", "Rubriques", LayoutList], ["content", "2", "Contenu", PenLine], ["preview", "3", "Aperçu", Eye] ] as const).map(([step, number, label, Icon]) => (
          <button key={step} type="button" onClick={() => setEditorStep(step)} className={cn("flex min-h-14 items-center justify-center gap-1.5 rounded-2xl px-2 text-xs font-black transition sm:text-sm", editorStep === step ? "bg-[#17253f] text-white shadow-lg shadow-slate-300" : "border border-[#e6dcc7] bg-white text-[#5d6b7d] hover:bg-[#fff5dc]")}>
            <span className={cn("flex size-6 items-center justify-center rounded-lg text-[10px]", editorStep === step ? "bg-[#e9c76a] text-[#17253f]" : "bg-[#edf1f6] text-[#52648e]")}>{number}</span><Icon className="size-3.5" />{label}
          </button>
        ))}
      </nav>

      <div className="grid gap-5 px-4 sm:px-0 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <aside className="space-y-4 print:hidden">
          <section className={cn("rounded-[1.65rem] border border-[#e6dcc7] bg-white p-4 shadow-[0_12px_28px_rgba(23,37,63,0.08)]", editorStep !== "modules" && "hidden")}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">Rubriques a activer</h2>
              </div>
              <span className="rounded-full bg-[#edf1f6] px-3 py-1 text-xs font-black text-[#36506d]">{activeCount}/11</span>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-500">Activez uniquement ce que vous voulez voir dans le PDF.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
              {MODULES.map((module) => {
                const Icon = module.icon;
                const isActive = enabled[module.key];
                return (
                  <button
                    key={module.key}
                    type="button"
                    onClick={() => toggleModule(module.key)}
                    className={cn(
                      "flex min-h-[72px] items-center gap-2 rounded-2xl border p-2.5 text-left transition",
                      isActive ? "border-[#b8c6d9] bg-[#edf2f8] text-[#17253f]" : "border-[#e1e7ef] bg-white text-slate-600 hover:bg-[#f5f7fc]"
                    )}
                  >
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", isActive ? "bg-[#36506d] text-white" : "bg-slate-100 text-slate-500")}>
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-black">{module.title}</span>
                    </span>
                    <span className={cn("flex h-5 w-9 items-center rounded-full p-1 transition", isActive ? "bg-[#36506d]" : "bg-slate-200")}>
                      <span className={cn("size-4 rounded-full bg-white shadow transition", isActive && "translate-x-5")} />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {editorStep === "content" ? <>
          <section className="rounded-[1.65rem] border border-[#e6dcc7] bg-white p-4 shadow-[0_12px_28px_rgba(23,37,63,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#36506d]">2. Les details</p>
            <div className="mt-4 space-y-3">
              {enabled.ravWord ? (
                <label className="block text-sm font-bold text-slate-700">
                  Mot du Rav
                  <input value={ravTheme} onChange={(event) => setRavTheme(event.target.value)} placeholder="Theme souhaite (facultatif)" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#36506d] focus:ring-2 focus:ring-[#dfe8f3]" />
                  <textarea
                    value={generated.ravWord}
                    onChange={(event) => setGenerated((current) => ({ ...current, ravWord: event.target.value }))}
                    rows={7}
                    className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium leading-6 outline-none focus:border-[#36506d] focus:ring-2 focus:ring-[#dfe8f3]"
                  />
                  <button type="button" onClick={() => void rewriteRavWord()} disabled={generating} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#edf2f8] px-3 text-xs font-black text-[#17253f] transition hover:bg-[#dfe8f3] disabled:opacity-60">
                    <Sparkles className="size-4" /> Retravailler avec l&apos;IA
                  </button>
                </label>
              ) : null}
              {enabled.sicha ? (
                <section className="rounded-2xl border border-[#d9e0f1] bg-[#f5f7fc] p-3 text-sm text-slate-700">
                  <p className="font-black text-[#17253f]">Siha du Rabbi</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Collez le lien de la Siha liée à la Paracha sur Chabad.org. Le texte importé reste exactement celui de la source officielle : aucune IA ne l’écrit ni ne le modifie.</p>
                  <input value={sichaUrl} onChange={(event) => setSichaUrl(event.target.value)} placeholder="https://fr.chabad.org/..." className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#36506d] focus:ring-2 focus:ring-[#dfe8f3]" />
                  <button type="button" onClick={() => void importOfficialSicha()} disabled={importingSicha || !sichaUrl.trim()} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#17253f] px-3 text-xs font-black text-white disabled:opacity-60">
                    {importingSicha ? <Loader2 className="size-4 animate-spin" /> : <BookOpen className="size-4" />} Importer depuis Chabad.org
                  </button>
                  {generated.sichaTitle ? <p className="mt-3 font-black text-[#17253f]">{generated.sichaTitle}</p> : null}
                  {generated.sichaExcerpt ? <p className="mt-1 text-xs leading-5 text-slate-600">{generated.sichaExcerpt}</p> : null}
                </section>
              ) : null}
              {enabled.parness ? <TextInput label="Parness Hayom" value={parnessText} onChange={setParnessText} placeholder="Ex. Leylouy Nichmat..." /> : null}
              {enabled.kiddush ? <TextInput label="Kidouch offert par" value={kiddushText} onChange={setKiddushText} placeholder="Ex. Famille Cohen" /> : null}
              <label className="block text-sm font-bold text-slate-700">
                Lien de la page de dons
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                  <input value={donationUrl} onChange={(event) => setDonationUrl(event.target.value)} placeholder="https://allodons.fr/..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#36506d] focus:ring-2 focus:ring-[#dfe8f3]" />
                  <button type="button" onClick={() => void saveDonationLink()} disabled={savingDonationUrl} className="min-h-10 rounded-xl bg-[#18264d] px-3 text-xs font-black text-white disabled:opacity-60">{savingDonationUrl ? "Enregistrement..." : "Enregistrer"}</button>
                </div>
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Photo de banniere (synagogue / Beth Habad)
                <span className="mt-1.5 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  <span className="truncate">{bannerPhotoUrl ? "Photo ajoutee au feuillet" : "Photo circulaire optionnelle"}</span>
                  <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[#36506d] shadow-sm">Choisir</span>
                  <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(event) => void uploadBannerPhoto(event)} />
                </span>
              </label>
              {enabled.restaurantAd ? <section className="text-sm font-bold text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <span>Pub partenaire</span>
                  <span className="text-xs font-semibold text-slate-400">{partnerAds.length}/3 visuel(x)</span>
                </div>
                <label className="mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  <span className="truncate">Ajoutez jusqu&apos;a 3 images de publicite</span>
                  <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[#36506d] shadow-sm">Televerser</span>
                  <input type="file" accept="image/*" multiple className="sr-only" disabled={uploading || partnerAds.length >= 3} onChange={(event) => void uploadPartnerAds(event)} />
                </label>
                {partnerAds.length > 0 ? <div className="mt-3 grid grid-cols-3 gap-2">
                  {partnerAds.map((ad) => <div key={ad.id} className="group relative overflow-hidden rounded-xl bg-slate-100">
                    <img src={ad.url} alt={ad.name} className="aspect-square w-full object-cover" />
                    <button type="button" onClick={() => setPartnerAds((current) => current.filter((item) => item.id !== ad.id))} className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black text-slate-700 opacity-0 shadow transition group-hover:opacity-100">Retirer</button>
                  </div>)}
                </div> : null}
              </section> : null}
            </div>
          </section>

          {enabled.photos ? <section className="rounded-[1.65rem] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(48,25,91,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Photos</p>
                <p className="mt-1 text-sm text-slate-500">{photos.length}/9 photo(s) ajoutee(s)</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#36506d] px-3 py-2 text-xs font-black text-white transition hover:bg-[#17253f]">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Ajouter
                <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => void uploadPhotos(event)} disabled={uploading || photos.length >= 9} />
              </label>
            </div>
            {photos.length > 0 ? (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative overflow-hidden rounded-xl bg-slate-100">
                    <img src={photo.url} alt={photo.name} className="aspect-square w-full object-cover" />
                    <button type="button" onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))} className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black text-slate-700 opacity-0 shadow transition group-hover:opacity-100">
                      Retirer
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">
                Ajoutez jusqu&apos;a 9 photos pour creer une vraie page retour en images.
              </div>
            )}
          </section> : null}

          {enabled.posters ? <section className="rounded-[1.65rem] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(48,25,91,0.08)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Affiches a venir</p>
                <p className="mt-1 text-sm text-slate-500">{posters.length}/3 affiche(s) ajoutee(s)</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#18264d] px-3 py-2 text-xs font-black text-white transition hover:bg-[#101b37]">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                Ajouter
                <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => void uploadPosters(event)} disabled={uploading || posters.length >= 3} />
              </label>
            </div>
            {posters.length > 0 ? <div className="mt-4 grid grid-cols-3 gap-2">
              {posters.map((poster) => <div key={poster.id} className="group relative overflow-hidden rounded-xl bg-slate-100">
                <img src={poster.url} alt={poster.name} className="aspect-[3/4] w-full object-cover" />
                <button type="button" onClick={() => setPosters((current) => current.filter((item) => item.id !== poster.id))} className="absolute right-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-black text-slate-700 opacity-0 shadow transition group-hover:opacity-100">Retirer</button>
              </div>)}
            </div> : <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">Ajoutez jusqu&apos;a 3 affiches pour les prochains rendez-vous.</div>}
          </section> : null}

          {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
          {generated.warnings.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {generated.warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          ) : null}

          <div className="hidden grid-cols-1 gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <Button type="button" onClick={() => void generateNewsletter()} loading={generating} className="h-12 rounded-2xl bg-[#17253f] px-2 font-black text-white hover:bg-[#0f1c2e] xl:px-4">
              <Sparkles className="size-4" />
              Generer avec l&apos;IA
            </Button>
            <Button type="button" variant="outline" onClick={() => window.print()} className="h-12 rounded-2xl border-slate-200 px-3 font-black xl:px-4">
              <Printer className="size-4" />
              Imprimer le feuillet
            </Button>
            <Button type="button" variant="outline" onClick={() => void downloadPdf()} loading={exporting} className="h-12 rounded-2xl border-[#36506d]/20 px-3 font-black text-[#17253f] hover:bg-[#f5f7fc] xl:px-4">
              <Download className="size-4" />
              Telecharger le PDF
            </Button>
          </div>
          </> : null}
        </aside>

        {editorStep === "preview" ? <main className="min-w-0 xl:col-span-2">
          <div className="mb-3 grid grid-cols-2 gap-2 sm:hidden print:hidden">
            <button type="button" onClick={() => { setMobilePreviewPage("front"); rectoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className={cn("min-h-11 rounded-xl text-sm font-black", mobilePreviewPage === "front" ? "bg-[#17253f] text-white" : "border border-[#e6dcc7] bg-white text-[#17253f]")}>Recto</button>
            <button type="button" onClick={() => { setMobilePreviewPage("back"); versoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className={cn("min-h-11 rounded-xl text-sm font-black", mobilePreviewPage === "back" ? "bg-[#17253f] text-white" : "border border-[#e6dcc7] bg-white text-[#17253f]")}>Verso</button>
          </div>
          <div className="overflow-hidden rounded-[1.65rem] bg-[#e8eef6] p-2 shadow-inner sm:overflow-auto sm:p-3 print:overflow-visible print:rounded-none print:bg-white print:p-0 print:shadow-none">
            <article ref={rectoRef} className="mx-auto min-h-[760px] w-full max-w-[794px] bg-[#fffdf7] text-slate-950 shadow-2xl sm:min-h-[1122px] print:min-h-screen print:w-full print:shadow-none">
              <NewsletterPreview
                community={previewCommunity}
                enabled={enabled}
                generated={generated}
                ravTheme={ravTheme}
                parnessText={parnessText}
                kiddushText={kiddushText}
                partnerAds={visiblePartnerAds}
                events={visibleEvents}
                birthdays={initialBirthdays}
                shabbat={initialShabbat}
                photos={visiblePhotos}
                posters={visiblePosters}
                bannerPhotoUrl={bannerPhotoUrl}
                page="front"
              />
            </article>
            <article ref={versoRef} className="mx-auto mt-4 min-h-[760px] w-full max-w-[794px] bg-[#fffdf7] text-slate-950 shadow-2xl sm:min-h-[1122px] print:mt-0 print:min-h-screen print:w-full print:break-before-page print:shadow-none">
              <NewsletterPreview
                community={previewCommunity}
                enabled={enabled}
                generated={generated}
                ravTheme={ravTheme}
                parnessText={parnessText}
                kiddushText={kiddushText}
                partnerAds={visiblePartnerAds}
                events={visibleEvents}
                birthdays={initialBirthdays}
                shabbat={initialShabbat}
                photos={visiblePhotos}
                posters={visiblePosters}
                bannerPhotoUrl={bannerPhotoUrl}
                page="back"
              />
            </article>
          </div>
        </main> : null}
      </div>
      <div aria-hidden="true" className="pointer-events-none fixed left-[-10000px] top-0 w-[794px]">
        <article ref={pdfRectoRef} className="h-[1123px] w-[794px] overflow-hidden bg-[#fffdf7] text-slate-950">
          <NewsletterPreview
            community={previewCommunity}
            enabled={enabled}
            generated={generated}
            ravTheme={ravTheme}
            parnessText={parnessText}
            kiddushText={kiddushText}
            partnerAds={visiblePartnerAds}
            events={visibleEvents}
            birthdays={initialBirthdays}
            shabbat={initialShabbat}
            photos={visiblePhotos}
            posters={visiblePosters}
            bannerPhotoUrl={bannerPhotoUrl}
            page="front"
            exportMode
          />
        </article>
        <article ref={pdfVersoRef} className="mt-4 h-[1123px] w-[794px] overflow-hidden bg-[#fffdf7] text-slate-950">
          <NewsletterPreview
            community={previewCommunity}
            enabled={enabled}
            generated={generated}
            ravTheme={ravTheme}
            parnessText={parnessText}
            kiddushText={kiddushText}
            partnerAds={visiblePartnerAds}
            events={visibleEvents}
            birthdays={initialBirthdays}
            shabbat={initialShabbat}
            photos={visiblePhotos}
            posters={visiblePosters}
            bannerPhotoUrl={bannerPhotoUrl}
            page="back"
            exportMode
          />
        </article>
      </div>
      <div className="fixed inset-x-0 bottom-[calc(5.9rem+env(safe-area-inset-bottom))] z-20 border-t border-[#e5dcc8] bg-[#fffaf1]/95 p-3 backdrop-blur print:hidden md:bottom-0 md:z-40">
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-2">
          <Button type="button" onClick={() => void generateNewsletter()} loading={generating} className="min-h-12 rounded-2xl bg-[#17253f] px-2 text-xs font-black text-white hover:bg-[#0f1c2e] sm:text-sm"><Sparkles className="size-4" />IA</Button>
          <Button type="button" variant="outline" onClick={() => window.print()} className="min-h-12 rounded-2xl border-[#d8ccb3] bg-white px-2 text-xs font-black text-[#17253f] sm:text-sm"><Printer className="size-4" />Imprimer</Button>
          <Button type="button" variant="outline" onClick={() => void downloadPdf()} loading={exporting} className="min-h-12 rounded-2xl border-[#d8ccb3] bg-[#e9c76a] px-2 text-xs font-black text-[#17253f] hover:bg-[#ddbb5d] sm:text-sm"><Download className="size-4" />PDF</Button>
        </div>
      </div>
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#36506d] focus:ring-2 focus:ring-[#dfe8f3]" />
    </label>
  );
}

function NewsletterPreview({
  community,
  enabled,
  generated,
  ravTheme,
  parnessText,
  kiddushText,
  partnerAds,
  events,
  birthdays,
  shabbat,
  photos,
  posters,
  bannerPhotoUrl,
  page,
  exportMode = false,
}: {
  community: CommunityInfo;
  enabled: Record<ModuleKey, boolean>;
  generated: GeneratedNewsletter;
  ravTheme: string;
  parnessText: string;
  kiddushText: string;
  partnerAds: UploadedPhoto[];
  events: NewsletterEvent[];
  birthdays: NewsletterBirthday[];
  shabbat: NewsletterShabbat | null;
  photos: UploadedPhoto[];
  posters: UploadedPhoto[];
  bannerPhotoUrl: string;
  page: "front" | "back";
  exportMode?: boolean;
}) {
  return (
    <div className={cn("flex flex-col", exportMode ? "min-h-[1123px] p-10" : "min-h-[760px] p-5 sm:min-h-[1122px] sm:p-10 print:min-h-screen")}>
      {page === "front" ? <header className="relative border-b-4 border-[#18264d] pb-6">
        <span className="absolute right-0 top-0 text-sm font-black text-[#17253f] sm:text-xl">ב&quot;ה</span>
        <div className={cn("flex flex-col items-start justify-between gap-4 sm:flex-row sm:gap-6", exportMode && "!flex-row !gap-6")}>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#52648e]">Feuillet hebdomadaire de Chabbat</p>
            <h1 className="mt-2 max-w-[520px] pr-8 text-[clamp(1.8rem,8vw,3rem)] font-black leading-[0.98] tracking-normal text-slate-950 sm:mt-3">{generated.title}</h1>
            <p className="mt-3 max-w-[560px] text-[12px] font-semibold leading-5 text-slate-600 sm:mt-4 sm:text-[15px] sm:leading-6">{generated.intro}</p>
          </div>
          <div className={cn("flex w-full shrink-0 flex-row items-center gap-3 text-left sm:w-40 sm:flex-col sm:items-end sm:pt-7 sm:text-right", exportMode && "!w-40 !flex-col !items-end !pt-7 !text-right")}>
            {bannerPhotoUrl || community.logoUrl ? <img src={bannerPhotoUrl || community.logoUrl || ""} alt={community.name} className={cn("size-14 rounded-full border-3 border-white object-cover shadow-[0_8px_20px_rgba(23,37,63,0.2)] ring-2 ring-[#36506d] sm:size-24 sm:border-4", exportMode && "!size-24 !border-4")} /> : null}
            <p className={cn("sm:mt-3 text-base font-black text-[#18264d] sm:text-xl", exportMode && "!mt-3 !text-xl")}>{community.name}</p>
            <p className="mt-1 text-sm font-bold text-slate-500">{community.city}</p>
          </div>
        </div>
        {enabled.shabbat ? (
          <div className={cn("mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-4 sm:gap-3", exportMode && "!mt-6 !grid-cols-4 !gap-3")}>
            <InfoTile label="Paracha" value={shabbat?.parasha ?? "Chabbat"} />
            <InfoTile label="Date hebraique" value={shabbat?.hebrewDate ?? "Cette semaine"} />
            <InfoTile label="Entree" value={shabbat?.entry ?? "A verifier"} />
            <InfoTile label="Sortie" value={shabbat?.exit ?? "A verifier"} />
          </div>
        ) : null}
      </header> : <header className="flex items-center justify-between border-b-4 border-[#18264d] pb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#36506d]">La vie de notre communaute</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Rendez-vous & souvenirs</h1>
        </div>
        {community.logoUrl ? <img src={community.logoUrl} alt={community.name} className="size-14 rounded-full object-contain ring-2 ring-[#36506d]/20" /> : <span className="text-xl font-black text-[#17253f]">ב&quot;ה</span>}
      </header>}

      <div className={cn("grid flex-1 grid-cols-1 gap-4 py-4 sm:grid-cols-[1.35fr_0.9fr] sm:gap-6 sm:py-6", exportMode && "!grid-cols-[1.35fr_0.9fr] !gap-6 !py-6")}>
        <div className="space-y-5">
          {page === "front" && enabled.ravWord ? (
            <PrintBlock icon={BookOpen} title="Mot du Rav" accent="navy">
              {ravTheme ? <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[#52648e]">Theme: {ravTheme}</p> : null}
              <p className="text-[14px] leading-[1.62] text-slate-700">{generated.ravWord}</p>
            </PrintBlock>
          ) : null}

          {page === "front" && enabled.sicha ? (
            <PrintBlock icon={BookOpen} title="Siha du Rabbi" accent="gold" compact>
              {generated.sichaTitle ? <p className="text-[14px] font-black leading-5 text-slate-900">{generated.sichaTitle}</p> : null}
              <p className="mt-2 text-[12px] leading-5 text-slate-700">{generated.sichaExcerpt || "Ajoutez le lien officiel Chabad.org pour importer le résumé de la Siha, sans modification."}</p>
              {generated.sichaUrl ? <p className="mt-2 break-all text-[9px] font-bold text-[#52648e]">Source : {generated.sichaUrl}</p> : null}
            </PrintBlock>
          ) : null}

          {page === "back" && enabled.photos ? (
            <PrintBlock icon={ImagePlus} title="Photos de la semaine" accent="slate">
              {photos.length > 0 ? (
                <div className={cn("grid gap-2", photos.length >= 7 ? "grid-cols-3" : photos.length >= 5 ? "grid-cols-6" : "grid-cols-2")}>
                  {photos.map((photo, index) => (
                    <img
                      key={photo.id}
                      src={photo.url}
                      alt={photo.name}
                      className={cn("h-32 w-full rounded-xl object-cover sm:h-36", photos.length >= 7 ? "col-span-1" : photos.length >= 5 && index < 2 ? "col-span-3" : photos.length >= 5 ? "col-span-2" : "")}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs font-bold text-slate-400">
                      Photo {item}
                    </div>
                  ))}
                </div>
              )}
            </PrintBlock>
          ) : null}

          {page === "back" && enabled.events ? (
            <PrintBlock icon={CalendarDays} title="Activites et evenements a venir" accent="violet">
              <p className="mb-3 text-[13px] leading-5 text-slate-600">{generated.eventIntro}</p>
              <div className="space-y-2">
                {events.length > 0 ? events.map((event) => (
                  <div key={event.id} className="rounded-xl border border-[#d9e0f1] bg-[#f5f7fc] px-3 py-2">
                    <p className="text-[13px] font-black text-slate-950">{event.title}</p>
                    <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#52648e]">{formatDate(event.startDate, community.timezone)}{event.location ? ` · ${event.location}` : ""}</p>
                  </div>
                )) : <p className="text-sm text-slate-500">Aucun evenement renseigne pour le moment.</p>}
              </div>
            </PrintBlock>
          ) : null}

          {page === "back" && enabled.posters ? (
            <PrintBlock icon={ImagePlus} title="Affiches a venir" accent="slate">
              {posters.length > 0 ? <div className="space-y-3">
                {posters.map((poster) => <img key={poster.id} src={poster.url} alt={poster.name} className="h-48 w-full rounded-xl bg-slate-100 object-contain shadow-sm sm:h-56" />)}
              </div> : <p className="text-sm text-slate-500">Ajoutez les affiches des prochains rendez-vous.</p>}
            </PrintBlock>
          ) : null}
        </div>

        <aside className={cn("grid grid-cols-1 gap-4 sm:block sm:space-y-5", exportMode && "!block !space-y-5")}>
          {page === "front" && enabled.shabbat ? (
            <PrintBlock icon={Clock3} title="Resume de la Paracha" accent="navy" compact>
              <p className="text-[13px] leading-5 text-slate-700">{generated.shabbatNote}</p>
            </PrintBlock>
          ) : null}

          {page === "front" && enabled.parness ? (
            <PrintBlock icon={HeartHandshake} title="Parness Hayom" accent="gold" compact>
              <p className="text-[13px] font-bold leading-5 text-slate-700">{parnessText || "Leylouy Nichmat / Refoua Chelema / soutien de la semaine"}</p>
            </PrintBlock>
          ) : null}

          {page === "front" && enabled.kiddush ? (
            <PrintBlock icon={Gift} title="Kidouch offert par" accent="violet" compact>
              <p className="text-[16px] font-black leading-6 text-slate-900">{kiddushText || "A completer"}</p>
            </PrintBlock>
          ) : null}

          {page === "back" && enabled.birthdays ? (
            <PrintBlock icon={Cake} title="Anniversaires de la semaine" accent="rose" compact>
              {birthdays.length > 0 ? (
                <div className="space-y-2">
                  {birthdays.slice(0, 8).map((birthday) => (
                    <div key={birthday.id} className="flex items-start justify-between gap-2 rounded-lg bg-[#f5f7fc] px-2.5 py-2">
                      <p className="text-[12px] font-black text-slate-900">{birthday.name}</p>
                      <p className="shrink-0 text-right text-[10px] font-bold text-[#52648e]">{formatShortDate(birthday.gregorianDate)}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-[13px] leading-5 text-slate-500">Aucun anniversaire juif renseigne cette semaine.</p>}
            </PrintBlock>
          ) : null}

          {page === "back" && enabled.restaurantAd ? (
            <PrintBlock icon={Store} title="Pub partenaire" accent="slate" compact>
              {partnerAds.length > 0 ? <div className="grid grid-cols-1 gap-2">
                {partnerAds.map((ad) => <img key={ad.id} src={ad.url} alt={ad.name} className="h-28 w-full rounded-xl bg-slate-100 object-contain" />)}
              </div> : <p className="text-[13px] leading-5 text-slate-500">Ajoutez jusqu&apos;a 3 visuels de partenaires.</p>}
            </PrintBlock>
          ) : null}

          {page === "back" && enabled.support ? (
            <PrintBlock icon={HandHeart} title="Nous soutenir" accent="gold" compact>
              <p className="text-[13px] font-bold leading-5 text-slate-700">Soutenez les actions de {community.name}.</p>
              <p className="mt-2 break-all text-[11px] font-black text-amber-800">{community.donationUrl || "Lien de dons a renseigner dans vos parametres."}</p>
            </PrintBlock>
          ) : null}
        </aside>
      </div>

      <footer className={cn("mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 text-[9px] font-bold text-slate-500 sm:mt-auto sm:text-[11px]", exportMode && "!mt-auto !text-[11px]")}>
        <div className="flex min-w-0 items-center gap-3">
          {community.logoUrl ? <img src={community.logoUrl} alt="" className="size-9 shrink-0 rounded-full object-contain" /> : null}
          <p className="leading-4">
            <span className="block break-words text-[11px] font-black text-slate-700">{community.name}{community.city ? ` · ${community.city}` : ""}</span>
            {[community.address, community.city, community.signature ? `Rabbin / responsable : ${community.signature}` : null, community.phone, community.email, community.website].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1"><FileText className="size-3" />Page {page === "front" ? "1" : "2"}/2</span>
      </footer>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#18264d] px-3 py-3 text-white shadow-[0_8px_18px_rgba(24,38,77,0.18)]">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#c6d1e2]">{label}</p>
      <p className="mt-1 truncate text-lg font-black">{value}</p>
    </div>
  );
}

function PrintBlock({
  icon: Icon,
  title,
  accent,
  compact = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  accent: "navy" | "violet" | "gold" | "rose" | "slate";
  compact?: boolean;
  children: ReactNode;
}) {
  const styles = {
    navy: "border-[#d9e0f1] bg-[#f5f7fc] text-[#18264d]",
    violet: "border-[#d9e0f1] bg-[#f5f7fc] text-[#18264d]",
    gold: "border-[#e6dcc7] bg-[#fffdf7] text-[#36506d]",
    rose: "border-[#d9e0f1] bg-[#f5f7fc] text-[#18264d]",
    slate: "border-slate-200 bg-white text-slate-900",
  }[accent];

  return (
    <section className={cn("break-inside-avoid rounded-2xl border p-4", styles, compact && "p-3.5")}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/80 shadow-sm">
          <Icon className="size-4" />
        </span>
        <h2 className="text-[15px] font-black tracking-normal">{title}</h2>
      </div>
      {children}
    </section>
  );
}
