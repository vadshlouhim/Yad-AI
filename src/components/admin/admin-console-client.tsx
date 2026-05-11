"use client";

import {
  Activity,
  Bot,
  Building2,
  CheckCircle2,
  Database,
  ImageIcon,
  LayoutDashboard,
  MessageSquare,
  Moon,
  Pencil,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  UploadCloud,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

interface AdminMetrics {
  userCount: number;
  communityCount: number;
  conversationCount: number;
  messageCount: number;
  draftCount: number;
  aiGeneratedDraftCount: number;
  mediaCount: number;
  templateCount: number;
  globalTemplateCount: number;
  activeTemplateCount: number;
  articleCount: number;
  automationCount: number;
  eventCount: number;
  publicationCount: number;
  imageGenerationCount: number;
  templateUsageCount: number;
  databaseItemCount: number;
}

interface AdminTemplate {
  id: string;
  communityId: string | null;
  name: string;
  description: string | null;
  category: string;
  subCategory: string | null;
  channelType: string | null;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  isGlobal: boolean;
  isPremium: boolean;
  isActive: boolean;
  tags: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AdminCommunity {
  id: string;
  name: string;
  city: string | null;
  plan: string;
  onboardingDone: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  communityId: string | null;
}

interface AdminAutomation {
  id: string;
  communityId: string;
  name: string;
  description: string | null;
  trigger: string;
  triggerConfig: unknown;
  actions: unknown;
  isActive: boolean;
  status: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  community: { id: string; name: string | null; city: string | null } | null;
}

interface RecentConversation {
  id: string;
  title: string;
  communityId: string;
  createdAt: string;
  updatedAt: string;
  community: { name: string | null; city: string | null } | null;
}

interface Props {
  metrics: AdminMetrics;
  templates: AdminTemplate[];
  communities: AdminCommunity[];
  users: AdminUser[];
  automations: AdminAutomation[];
  recentConversations: RecentConversation[];
}

type AdminSection = "overview" | "templates" | "automations" | "communities" | "activity" | "data";
type ThemeMode = "light" | "dark";

const numberFormatter = new Intl.NumberFormat("fr-FR");
const TEMPLATE_CATEGORIES = ["ALL", "SHABBAT", "HOLIDAY", "EVENT", "COURSE", "ANNOUNCEMENT", "RECAP", "GREETING", "GENERAL"];
const EDITABLE_TEMPLATE_CATEGORIES = TEMPLATE_CATEGORIES.filter((category) => category !== "ALL");
const CHANNEL_TYPES = ["", "INSTAGRAM", "FACEBOOK", "WHATSAPP", "TELEGRAM", "EMAIL", "WEB"];
const VISIBILITY_FILTERS = ["ALL", "GLOBAL", "LOCAL"] as const;
const STATUS_FILTERS = ["ALL", "ACTIVE", "INACTIVE", "PREMIUM"] as const;
const ADMIN_AUTOMATION_PRESETS = [
  { key: "WEEKLY_SHABBAT", logo: "🕯️", name: "Horaires de Chabbat", description: "Prépare les horaires chaque semaine.", trigger: "WEEKLY_SHABBAT" },
  { key: "DAILY_THOUGHT", logo: "✨", name: "Pensée du jour", description: "Prépare une pensée quotidienne.", trigger: "DAILY" },
  { key: "WEEKLY_COURSE_REMINDER", logo: "📖", name: "Rappel de cours", description: "Prépare les annonces de cours.", trigger: "CUSTOM_SCHEDULE" },
  { key: "HOLIDAY_GREETING", logo: "🎉", name: "Voeux de fêtes", description: "Prépare des messages avant les fêtes.", trigger: "JEWISH_HOLIDAY" },
  { key: "DONATION_REMINDER", logo: "💛", name: "Rappel de dons", description: "Prépare un message de collecte.", trigger: "CUSTOM_SCHEDULE" },
];

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  theme,
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof Activity;
  tone: string;
  theme: ThemeMode;
}) {
  const isDark = theme === "dark";
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${isDark ? "border-white/10 bg-white/[0.07]" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>{label}</p>
          <p className={`mt-3 text-3xl font-black ${isDark ? "text-white" : "text-slate-950"}`}>{formatNumber(value)}</p>
          <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>{hint}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tone}`}>
          <Icon className="size-5 text-white" />
        </div>
      </div>
    </div>
  );
}

export function AdminConsoleClient({ metrics, templates, communities, users, automations, recentConversations }: Props) {
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [visibilityFilter, setVisibilityFilter] = useState<(typeof VISIBILITY_FILTERS)[number]>("ALL");
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [automationCommunityFilter, setAutomationCommunityFilter] = useState("ALL");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingField, setUploadingField] = useState<"thumbnail" | "preview" | null>(null);
  const [automationSaving, setAutomationSaving] = useState<string | null>(null);
  const [drafts, setDrafts] = useState(() => new Map(templates.map((template) => [template.id, template])));

  const isDark = theme === "dark";
  const selectedTemplate = drafts.get(selectedId) ?? Array.from(drafts.values())[0] ?? null;
  const allTemplates = useMemo(() => Array.from(drafts.values()), [drafts]);
  const templateStats = useMemo(() => {
    const active = allTemplates.filter((template) => template.isActive).length;
    const inactive = allTemplates.length - active;
    const global = allTemplates.filter((template) => template.isGlobal).length;
    const premium = allTemplates.filter((template) => template.isPremium).length;
    return { active, inactive, global, premium };
  }, [allTemplates]);
  const filteredAutomations = useMemo(() => {
    return automations.filter((automation) =>
      automationCommunityFilter === "ALL" ? true : automation.communityId === automationCommunityFilter
    );
  }, [automationCommunityFilter, automations]);
  const selectedAutomationCommunity =
    automationCommunityFilter !== "ALL" ? automationCommunityFilter : communities[0]?.id ?? "";

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return allTemplates.filter((template) => {
      if (categoryFilter !== "ALL" && template.category !== categoryFilter) return false;
      if (statusFilter === "ACTIVE" && !template.isActive) return false;
      if (statusFilter === "INACTIVE" && template.isActive) return false;
      if (statusFilter === "PREMIUM" && !template.isPremium) return false;
      if (visibilityFilter === "GLOBAL" && !template.isGlobal) return false;
      if (visibilityFilter === "LOCAL" && template.isGlobal) return false;
      if (!normalizedQuery) return true;
      return [
        template.name,
        template.description ?? "",
        template.category,
        template.subCategory ?? "",
        template.channelType ?? "",
        template.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [allTemplates, categoryFilter, query, statusFilter, visibilityFilter]);

  const shellClass = isDark
    ? "min-h-screen bg-[#071016] text-slate-100"
    : "min-h-screen bg-[#f6f3ec] text-slate-950";
  const panelClass = isDark
    ? "border-white/10 bg-slate-950/75 shadow-black/25"
    : "border-slate-200 bg-white shadow-slate-200/70";
  const mutedText = isDark ? "text-slate-400" : "text-slate-500";
  const strongText = isDark ? "text-white" : "text-slate-950";
  const inputClass = isDark
    ? "border-white/10 bg-white/10 text-white placeholder:text-slate-500 focus:border-emerald-300/60"
    : "border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 focus:border-emerald-500";

  function updateSelectedTemplate(patch: Partial<AdminTemplate>) {
    if (!selectedTemplate) return;
    const nextTemplate = { ...selectedTemplate, ...patch };
    setDrafts((previous) => {
      const next = new Map(previous);
      next.set(nextTemplate.id, nextTemplate);
      return next;
    });
  }

  async function saveTemplate() {
    if (!selectedTemplate) return;
    setSaving(true);
    setStatus(null);

    const response = await fetch(`/api/admin/templates/${selectedTemplate.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        category: selectedTemplate.category,
        subCategory: selectedTemplate.subCategory,
        channelType: selectedTemplate.channelType,
        thumbnailUrl: selectedTemplate.thumbnailUrl,
        previewUrl: selectedTemplate.previewUrl,
        tags: selectedTemplate.tags,
        isGlobal: selectedTemplate.isGlobal,
        isActive: selectedTemplate.isActive,
        isPremium: selectedTemplate.isPremium,
      }),
    });

    const payload = await response.json();
    setSaving(false);

    if (!response.ok) {
      setStatus(payload.error ?? "Impossible d'enregistrer l'affiche.");
      return;
    }

    setDrafts((previous) => {
      const next = new Map(previous);
      next.set(selectedTemplate.id, {
        ...selectedTemplate,
        ...payload,
        tags: payload.tags ?? [],
        thumbnailUrl: payload.thumbnailUrl ?? null,
        previewUrl: payload.previewUrl ?? null,
      });
      return next;
    });
    setStatus("Affiche mise à jour. Les nouvelles consignes seront utilisées par l'assistant.");
  }

  async function createTemplate() {
    setCreating(true);
    setStatus(null);

    const response = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Nouvelle affiche",
        category: "GENERAL",
        description: "Décrire ici quand l'assistant doit suggérer cette affiche.",
        isGlobal: true,
        isActive: true,
        tags: ["nouvelle-affiche"],
      }),
    });
    const payload = await response.json();
    setCreating(false);

    if (!response.ok) {
      setStatus(payload.error ?? "Impossible de créer l'affiche.");
      return;
    }

    const nextTemplate: AdminTemplate = {
      ...payload,
      thumbnailUrl: payload.thumbnailUrl ?? null,
      previewUrl: payload.previewUrl ?? null,
      tags: payload.tags ?? [],
    };
    setDrafts((previous) => {
      const next = new Map(previous);
      next.set(nextTemplate.id, nextTemplate);
      return next;
    });
    setSelectedId(nextTemplate.id);
    setActiveSection("templates");
    setStatus("Nouvelle affiche créée. Complétez sa fiche puis enregistrez.");
  }

  async function deleteTemplate() {
    if (!selectedTemplate) return;
    const confirmed = window.confirm(`Supprimer définitivement l'affiche "${selectedTemplate.name}" ?`);
    if (!confirmed) return;

    setDeleting(true);
    setStatus(null);
    const response = await fetch(`/api/admin/templates/${selectedTemplate.id}`, { method: "DELETE" });
    const payload = await response.json();
    setDeleting(false);

    if (!response.ok) {
      setStatus(payload.error ?? "Impossible de supprimer l'affiche.");
      return;
    }

    setDrafts((previous) => {
      const next = new Map(previous);
      next.delete(selectedTemplate.id);
      setSelectedId(next.keys().next().value ?? "");
      return next;
    });
    setStatus("Affiche supprimée.");
  }

  async function uploadTemplateImage(file: File, kind: "thumbnail" | "preview") {
    if (!selectedTemplate) return;
    setUploadingField(kind);
    setStatus(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    formData.append("templateId", selectedTemplate.id);

    const response = await fetch("/api/admin/uploads/template-image", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    setUploadingField(null);
    if (!response.ok) {
      setStatus(payload.error ?? "Upload impossible.");
      return;
    }
    updateSelectedTemplate(kind === "thumbnail" ? { thumbnailUrl: payload.url } : { previewUrl: payload.url });
    setStatus(`${kind === "thumbnail" ? "Miniature" : "Affiche"} convertie en WebP et envoyée.`);
  }

  async function createPresetAutomation(preset: string) {
    if (!selectedAutomationCommunity) {
      setStatus("Choisissez d'abord une communauté cible.");
      return;
    }
    setAutomationSaving(preset);
    const response = await fetch("/api/admin/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId: selectedAutomationCommunity, preset }),
    });
    const payload = await response.json().catch(() => ({}));
    setAutomationSaving(null);
    if (!response.ok) {
      setStatus(payload.error ?? "Création impossible.");
      return;
    }
    window.location.reload();
  }

  async function toggleAdminAutomation(automation: AdminAutomation) {
    setAutomationSaving(automation.id);
    const response = await fetch(`/api/admin/automations/${automation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !automation.isActive }),
    });
    setAutomationSaving(null);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setStatus(payload.error ?? "Modification impossible.");
      return;
    }
    window.location.reload();
  }

  const navItems = [
    { id: "overview" as const, label: "Vue globale", icon: LayoutDashboard, value: formatNumber(metrics.databaseItemCount) },
    { id: "templates" as const, label: "Affiches", icon: ImageIcon, value: formatNumber(allTemplates.length) },
    { id: "automations" as const, label: "Automatisations", icon: Zap, value: formatNumber(automations.length) },
    { id: "communities" as const, label: "Beth Habad", icon: Building2, value: formatNumber(metrics.communityCount) },
    { id: "activity" as const, label: "Activité IA", icon: Bot, value: formatNumber(metrics.conversationCount) },
    { id: "data" as const, label: "Données", icon: Database, value: formatNumber(metrics.databaseItemCount) },
  ];

  const overviewCards = (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Conversations" value={metrics.conversationCount} hint={`${formatNumber(metrics.messageCount)} messages IA`} icon={MessageSquare} tone="bg-cyan-500" theme={theme} />
      <MetricCard label="Generations image" value={metrics.imageGenerationCount} hint={`${formatNumber(metrics.templateUsageCount)} rendus d'affiches`} icon={ImageIcon} tone="bg-amber-500" theme={theme} />
      <MetricCard label="Banque de donnees" value={metrics.databaseItemCount} hint={`${formatNumber(metrics.draftCount)} contenus, ${formatNumber(metrics.mediaCount)} medias`} icon={Database} tone="bg-emerald-500" theme={theme} />
      <MetricCard label="Affiches" value={metrics.templateCount} hint={`${formatNumber(metrics.globalTemplateCount)} globales, ${formatNumber(metrics.activeTemplateCount)} actives`} icon={Wand2} tone="bg-rose-500" theme={theme} />
    </section>
  );

  return (
    <main className={shellClass}>
      <div className="flex min-h-screen">
        <aside className={`sticky top-0 hidden h-screen w-72 flex-shrink-0 border-r p-5 lg:block ${isDark ? "border-white/10 bg-slate-950/70" : "border-slate-200 bg-white/90"}`}>
          <div className="flex h-full flex-col">
            <div>
              <div className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black uppercase tracking-[0.18em] ${isDark ? "bg-emerald-300/10 text-emerald-200" : "bg-emerald-100 text-emerald-800"}`}>
                <Sparkles className="size-3.5" />
                Admin global
              </div>
              <h1 className={`mt-4 text-2xl font-black leading-tight ${strongText}`}>Pilotage Shalom IA</h1>
              <p className={`mt-2 text-sm leading-6 ${mutedText}`}>Supervisez les structures, les usages IA, les données et surtout la banque d&apos;affiches.</p>
            </div>

            <nav className="mt-8 space-y-2">
              {navItems.map((item) => {
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-bold transition ${
                      active
                        ? isDark
                          ? "bg-emerald-300 text-slate-950"
                          : "bg-slate-950 text-white"
                        : isDark
                          ? "text-slate-300 hover:bg-white/10"
                          : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="size-4" />
                      {item.label}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-white/20" : isDark ? "bg-white/10" : "bg-slate-100"}`}>{item.value}</span>
                  </button>
                );
              })}
            </nav>

            <div className={`mt-6 rounded-3xl border p-4 ${panelClass}`}>
              <p className={`text-xs font-black uppercase tracking-[0.18em] ${mutedText}`}>Affiches</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><span className={strongText}>{templateStats.active}</span><span className={`block text-xs ${mutedText}`}>actives</span></div>
                <div><span className={strongText}>{templateStats.global}</span><span className={`block text-xs ${mutedText}`}>globales</span></div>
                <div><span className={strongText}>{templateStats.inactive}</span><span className={`block text-xs ${mutedText}`}>masquées</span></div>
                <div><span className={strongText}>{templateStats.premium}</span><span className={`block text-xs ${mutedText}`}>premium</span></div>
              </div>
            </div>

            <div className="mt-auto space-y-3">
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${isDark ? "border-white/10 bg-white/10 text-white hover:bg-white/15" : "border-slate-200 bg-slate-950 text-white hover:bg-slate-800"}`}
              >
                {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {isDark ? "Vision claire" : "Dark mode"}
              </button>
              <a href="/dashboard/assistant" className={`flex w-full items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${isDark ? "border-white/10 bg-white/10 text-white hover:bg-white/15" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
                Retour assistant
              </a>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <header className={`rounded-[2rem] border p-5 shadow-sm ${panelClass}`}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${isDark ? "bg-emerald-300/10 text-emerald-200" : "bg-emerald-100 text-emerald-800"}`}>
                  <SlidersHorizontal className="size-3.5" />
                  {activeSection === "templates" ? "Pilotage des affiches" : "Mode admin global"}
                </p>
                <h2 className={`mt-3 text-3xl font-black tracking-tight md:text-4xl ${strongText}`}>Tableau de contrôle</h2>
                <p className={`mt-2 max-w-3xl text-sm leading-6 ${mutedText}`}>Vue claire par défaut, dark mode en option. Les filtres permettent de retrouver rapidement les affiches à modifier ou à suggérer.</p>
              </div>
              <div className="flex flex-wrap gap-2 lg:hidden">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`rounded-full px-3 py-2 text-xs font-bold ${activeSection === item.id ? "bg-slate-950 text-white" : isDark ? "bg-white/10 text-slate-200" : "bg-white text-slate-600"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black lg:hidden ${isDark ? "border-white/10 bg-white/10 text-white" : "border-slate-200 bg-slate-950 text-white"}`}
              >
                {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                {isDark ? "Vision claire" : "Dark mode"}
              </button>
            </div>
          </header>

          {(activeSection === "overview" || activeSection === "data") && <div className="mt-6">{overviewCards}</div>}

          {(activeSection === "overview" || activeSection === "templates") && (
            <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className={`rounded-[2rem] border p-5 shadow-sm ${panelClass}`}>
                <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
                  <div>
                    <h3 className={`text-xl font-black ${strongText}`}>Affiches suggerables</h3>
                    <p className={`mt-1 text-sm ${mutedText}`}>{filteredTemplates.length} affiche(s) affichée(s) sur {allTemplates.length}.</p>
                  </div>
                  <button
                    type="button"
                    onClick={createTemplate}
                    disabled={creating}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus className="size-4" />
                    {creating ? "Création..." : "Ajouter une affiche"}
                  </button>
                </div>

                <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(220px,1fr)_160px_150px_140px]">
                  <label className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${inputClass}`}>
                    <Search className="size-4 opacity-60" />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher par thème, tag, nom..." className="w-full bg-transparent outline-none" />
                  </label>
                  <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={`rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}>
                    {TEMPLATE_CATEGORIES.map((category) => <option key={category} value={category}>{category === "ALL" ? "Toutes catégories" : category}</option>)}
                  </select>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className={`rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}>
                    {STATUS_FILTERS.map((statusOption) => <option key={statusOption} value={statusOption}>{statusOption === "ALL" ? "Tous statuts" : statusOption}</option>)}
                  </select>
                  <select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value as typeof visibilityFilter)} className={`rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}>
                    {VISIBILITY_FILTERS.map((visibility) => <option key={visibility} value={visibility}>{visibility === "ALL" ? "Toutes" : visibility}</option>)}
                  </select>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {filteredTemplates.map((template) => {
                    const isSelected = selectedTemplate?.id === template.id;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedId(template.id)}
                        className={`group overflow-hidden rounded-3xl border p-3 text-left transition ${
                          isSelected
                            ? isDark ? "border-emerald-300/70 bg-emerald-300/10" : "border-emerald-500 bg-emerald-50"
                            : isDark ? "border-white/10 bg-slate-950/55 hover:border-white/25" : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`h-24 w-20 flex-shrink-0 overflow-hidden rounded-2xl ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                            {template.thumbnailUrl || template.previewUrl ? (
                              <img src={template.thumbnailUrl ?? template.previewUrl ?? ""} alt={template.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center"><ImageIcon className={`size-6 ${mutedText}`} /></div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`line-clamp-2 text-sm font-black ${strongText}`}>{template.name}</h4>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isDark ? "bg-white/10 text-slate-300" : "bg-slate-100 text-slate-600"}`}>{template.usageCount}</span>
                            </div>
                            <p className={`mt-1 text-xs uppercase tracking-[0.18em] ${mutedText}`}>{template.category}{template.channelType ? ` · ${template.channelType}` : ""}</p>
                            <p className={`mt-2 line-clamp-2 text-xs leading-5 ${mutedText}`}>{template.description || "Aucune consigne IA renseignee."}</p>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {template.isGlobal && <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-600">Global</span>}
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${template.isActive ? "bg-emerald-500/15 text-emerald-600" : "bg-slate-500/15 text-slate-500"}`}>{template.isActive ? "Active" : "Masquee"}</span>
                              {template.isPremium && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600">Premium</span>}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside className={`rounded-[2rem] border p-5 shadow-sm xl:sticky xl:top-6 xl:self-start ${panelClass}`}>
                {selectedTemplate ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={isDark ? "rounded-2xl bg-emerald-400/15 p-3" : "rounded-2xl bg-emerald-100 p-3"}><Pencil className="size-5 text-emerald-600" /></div>
                      <div><h3 className={`font-black ${strongText}`}>Fiche affiche</h3><p className={`text-xs ${mutedText}`}>Modification + consignes IA.</p></div>
                    </div>

                    <label className={`block text-sm font-semibold ${strongText}`}>Nom affiche<input value={selectedTemplate.name} onChange={(event) => updateSelectedTemplate({ name: event.target.value })} className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`} /></label>
                    <label className={`block text-sm font-semibold ${strongText}`}>Famille / cas d&apos;usage<input value={selectedTemplate.subCategory ?? ""} onChange={(event) => updateSelectedTemplate({ subCategory: event.target.value })} placeholder="Ex: Chabbat horaires, fete juive, cours" className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`} /></label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className={`block text-sm font-semibold ${strongText}`}>Catégorie<select value={selectedTemplate.category} onChange={(event) => updateSelectedTemplate({ category: event.target.value })} className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}>{EDITABLE_TEMPLATE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                      <label className={`block text-sm font-semibold ${strongText}`}>Canal<select value={selectedTemplate.channelType ?? ""} onChange={(event) => updateSelectedTemplate({ channelType: event.target.value || null })} className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}>{CHANNEL_TYPES.map((channel) => <option key={channel || "ALL"} value={channel}>{channel || "Tous"}</option>)}</select></label>
                    </div>

                    <label className={`block text-sm font-semibold ${strongText}`}>Consignes IA / quand suggerer cette affiche<textarea value={selectedTemplate.description ?? ""} onChange={(event) => updateSelectedTemplate({ description: event.target.value })} rows={6} placeholder="Ex: A proposer quand l'utilisateur demande une affiche pour les horaires de Chabbat..." className={`mt-2 w-full resize-none rounded-2xl border px-3 py-2 text-sm leading-6 outline-none ${inputClass}`} /></label>
                    <label className={`block text-sm font-semibold ${strongText}`}>Mots-cles de suggestion<input value={selectedTemplate.tags.join(", ")} onChange={(event) => updateSelectedTemplate({ tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} placeholder="chabbat, horaires, synagogue" className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`} /></label>
                    <label className={`block text-sm font-semibold ${strongText}`}>URL miniature<input value={selectedTemplate.thumbnailUrl ?? ""} onChange={(event) => updateSelectedTemplate({ thumbnailUrl: event.target.value || null })} placeholder="https://..." className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`} /></label>
                    <div
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const file = event.dataTransfer.files[0];
                        if (file) uploadTemplateImage(file, "thumbnail");
                      }}
                      className={`rounded-2xl border border-dashed p-3 text-sm ${isDark ? "border-white/15 bg-white/5" : "border-slate-300 bg-slate-50"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={mutedText}>Glisser-déposer miniature PNG/JPEG/WebP</span>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-white">
                          <UploadCloud className="size-4" />
                          {uploadingField === "thumbnail" ? "Upload..." : "Choisir"}
                          <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) uploadTemplateImage(file, "thumbnail");
                            event.target.value = "";
                          }} />
                        </label>
                      </div>
                    </div>
                    <label className={`block text-sm font-semibold ${strongText}`}>URL aperçu / image de référence<input value={selectedTemplate.previewUrl ?? ""} onChange={(event) => updateSelectedTemplate({ previewUrl: event.target.value || null })} placeholder="https://..." className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`} /></label>
                    <div
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const file = event.dataTransfer.files[0];
                        if (file) uploadTemplateImage(file, "preview");
                      }}
                      className={`rounded-2xl border border-dashed p-3 text-sm ${isDark ? "border-white/15 bg-white/5" : "border-slate-300 bg-slate-50"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={mutedText}>Glisser-déposer affiche PNG/JPEG/WebP</span>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-white">
                          <UploadCloud className="size-4" />
                          {uploadingField === "preview" ? "Upload..." : "Choisir"}
                          <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) uploadTemplateImage(file, "preview");
                            event.target.value = "";
                          }} />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[["isGlobal", "Globale"], ["isActive", "Active"], ["isPremium", "Premium"]].map(([field, label]) => {
                        const enabled = selectedTemplate[field as "isGlobal" | "isActive" | "isPremium"];
                        return <button key={field} type="button" onClick={() => updateSelectedTemplate({ [field]: !enabled })} className={`rounded-2xl border px-3 py-2 text-xs font-bold transition ${enabled ? "border-emerald-500 bg-emerald-500 text-white" : isDark ? "border-white/10 bg-white/5 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"}`}>{label}</button>;
                      })}
                    </div>

                    <button type="button" onClick={saveTemplate} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"><Save className="size-4" />{saving ? "Enregistrement..." : "Enregistrer la fiche"}</button>
                    <button type="button" onClick={deleteTemplate} disabled={deleting} className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${isDark ? "border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/20" : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"}`}><Trash2 className="size-4" />{deleting ? "Suppression..." : "Supprimer cette affiche"}</button>
                    {status && <p className={`rounded-2xl border px-3 py-2 text-sm ${isDark ? "border-white/10 bg-white/10 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}>{status}</p>}
                  </div>
                ) : <p className={`text-sm ${mutedText}`}>Aucune affiche disponible.</p>}
              </aside>
            </section>
          )}

          {(activeSection === "overview" || activeSection === "automations") && (
            <section className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <div className={`rounded-[2rem] border p-5 ${panelClass}`}>
                <h3 className={`flex items-center gap-2 text-xl font-black ${strongText}`}><Zap className="size-5 text-violet-500" />Automatisations prédéfinies</h3>
                <p className={`mt-1 text-sm ${mutedText}`}>Choisissez une communauté puis ajoutez un modèle au compte client.</p>
                <select value={automationCommunityFilter === "ALL" ? communities[0]?.id ?? "" : automationCommunityFilter} onChange={(event) => setAutomationCommunityFilter(event.target.value)} className={`mt-4 w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}>
                  {communities.map((community) => <option key={community.id} value={community.id}>{community.name}{community.city ? ` · ${community.city}` : ""}</option>)}
                </select>
                <div className="mt-4 space-y-3">
                  {ADMIN_AUTOMATION_PRESETS.map((preset) => (
                    <div key={preset.key} className={`rounded-3xl border p-4 ${isDark ? "border-white/10 bg-slate-950/55" : "border-slate-200 bg-slate-50"}`}>
                      <div className="flex gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">{preset.logo}</div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-black ${strongText}`}>{preset.name}</p>
                          <p className={`mt-1 text-xs leading-5 ${mutedText}`}>{preset.description}</p>
                          <button type="button" onClick={() => createPresetAutomation(preset.key)} disabled={automationSaving === preset.key} className="mt-3 rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-60">
                            {automationSaving === preset.key ? "Ajout..." : "Ajouter au compte"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`rounded-[2rem] border p-5 ${panelClass}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className={`text-xl font-black ${strongText}`}>Automatisations utilisateurs</h3>
                    <p className={`mt-1 text-sm ${mutedText}`}>{filteredAutomations.length} automatisation(s) affichée(s).</p>
                  </div>
                  <select value={automationCommunityFilter} onChange={(event) => setAutomationCommunityFilter(event.target.value)} className={`rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}>
                    <option value="ALL">Tous les comptes</option>
                    {communities.map((community) => <option key={community.id} value={community.id}>{community.name}</option>)}
                  </select>
                </div>
                <div className="mt-4 space-y-3">
                  {filteredAutomations.map((automation) => {
                    const ownerUsers = users.filter((user) => user.communityId === automation.communityId);
                    return (
                      <div key={automation.id} className={`rounded-3xl border p-4 ${isDark ? "border-white/10 bg-slate-950/55" : "border-slate-200 bg-white"}`}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className={`font-black ${strongText}`}>{automation.name}</p>
                            <p className={`mt-1 text-sm ${mutedText}`}>{automation.community?.name ?? "Compte inconnu"}{automation.community?.city ? ` · ${automation.community.city}` : ""}</p>
                            <p className={`mt-1 text-xs ${mutedText}`}>{ownerUsers.map((user) => user.email).join(", ") || "Aucun utilisateur listé"}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full bg-violet-500/15 px-2 py-1 text-xs font-bold text-violet-600">{automation.trigger}</span>
                              <span className={`rounded-full px-2 py-1 text-xs font-bold ${automation.isActive ? "bg-emerald-500/15 text-emerald-600" : "bg-slate-500/15 text-slate-500"}`}>{automation.isActive ? "Actif" : "Pause"}</span>
                            </div>
                          </div>
                          <button type="button" onClick={() => toggleAdminAutomation(automation)} disabled={automationSaving === automation.id} className={`rounded-xl px-3 py-2 text-xs font-black ${automation.isActive ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"} disabled:opacity-60`}>
                            {automationSaving === automation.id ? "Modification..." : automation.isActive ? "Mettre en pause" : "Activer"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredAutomations.length === 0 && <p className={`rounded-2xl border p-4 text-sm ${isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>Aucune automatisation pour ce filtre.</p>}
                </div>
              </div>
            </section>
          )}

          {(activeSection === "overview" || activeSection === "communities" || activeSection === "activity") && (
            <section className="mt-6 grid gap-6 lg:grid-cols-3">
              {(activeSection === "overview" || activeSection === "communities") && (
                <div className={`rounded-[2rem] border p-5 lg:col-span-2 ${panelClass}`}>
                  <h3 className={`flex items-center gap-2 text-xl font-black ${strongText}`}><Building2 className="size-5 text-cyan-500" />Beth Habad et structures</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {communities.map((community) => <div key={community.id} className={`rounded-3xl border p-4 ${isDark ? "border-white/10 bg-slate-950/55" : "border-slate-200 bg-slate-50"}`}><div className="flex items-start justify-between gap-3"><div><p className={`font-bold ${strongText}`}>{community.name}</p><p className={`text-sm ${mutedText}`}>{community.city ?? "Ville non renseignee"}</p></div>{community.onboardingDone && <CheckCircle2 className="size-5 text-emerald-500" />}</div><div className={`mt-4 flex items-center justify-between text-xs ${mutedText}`}><span>{community.plan}</span><span>MAJ {formatDate(community.updatedAt)}</span></div></div>)}
                  </div>
                </div>
              )}

              {(activeSection === "overview" || activeSection === "activity") && (
                <div className={`rounded-[2rem] border p-5 ${panelClass}`}>
                  <h3 className={`flex items-center gap-2 text-xl font-black ${strongText}`}><Bot className="size-5 text-emerald-500" />Activite recente</h3>
                  <div className="mt-4 space-y-3">
                    {recentConversations.map((conversation) => <div key={conversation.id} className={`rounded-2xl border p-3 ${isDark ? "border-white/10 bg-slate-950/55" : "border-slate-200 bg-slate-50"}`}><p className={`line-clamp-2 text-sm font-bold ${strongText}`}>{conversation.title}</p><p className={`mt-1 text-xs ${mutedText}`}>{conversation.community?.name ?? "Structure inconnue"} · {formatDate(conversation.updatedAt)}</p></div>)}
                  </div>
                </div>
              )}
            </section>
          )}

          {(activeSection === "overview" || activeSection === "data") && (
            <section className="mt-6 grid gap-4 md:grid-cols-4">
              <MetricCard label="Utilisateurs" value={metrics.userCount} hint="Comptes inscrits" icon={Users} tone="bg-blue-500" theme={theme} />
              <MetricCard label="Automatisations" value={metrics.automationCount} hint="Regles configurees" icon={Activity} tone="bg-violet-500" theme={theme} />
              <MetricCard label="Contenus IA" value={metrics.aiGeneratedDraftCount} hint="Brouillons generes" icon={Sparkles} tone="bg-fuchsia-500" theme={theme} />
              <MetricCard label="Publications" value={metrics.publicationCount} hint="Historique global" icon={CheckCircle2} tone="bg-lime-500" theme={theme} />
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
