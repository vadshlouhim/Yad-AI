"use client";

import {
  Activity,
  Bot,
  Building2,
  CheckCircle2,
  CreditCard,
  Database,
  Eye,
  FileText,
  ImageIcon,
  LayoutDashboard,
  Lock,
  Maximize2,
  MessageSquare,
  Moon,
  Move,
  Pencil,
  PlayCircle,
  Plus,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Unlock,
  UploadCloud,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { PointerEvent } from "react";
import { useMemo, useState } from "react";
import { OnboardingWizard, demoOnboardingData } from "@/components/onboarding/onboarding-wizard";
import type { BillingConfig, PlanTier } from "@/lib/billing";
import { planToTier, tierLabel } from "@/lib/billing";

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
  leadCount: number;
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
  design: DynamicTemplateZone[];
  isGlobal: boolean;
  isPremium: boolean;
  isActive: boolean;
  tags: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

type DynamicTemplateZone = {
  id: string;
  label: string;
  variableKey: string;
  variableType: string;
  defaultText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  align: "left" | "center" | "right";
  fontSize: number;
  color: string;
  fontFamily: string;
  overflow: "shrink" | "wrap" | "truncate" | "hide";
  locked: boolean;
};

interface AdminCommunity {
  id: string;
  name: string;
  city: string | null;
  plan: string;
  planExpiresAt: string | null;
  onboardingDone: boolean;
  communityType: string;
  religiousStream: string | null;
  vocabulary?: unknown;
  createdAt: string;
  updatedAt: string;
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  communityId: string | null;
  communityName?: string | null;
  communityCity?: string | null;
  communityPlan?: string | null;
  planExpiresAt?: string | null;
  adminBillingSince?: string | null;
  subscription?: {
    id: string;
    plan: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    createdAt: string;
  } | null;
}

interface ContactLead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  subject: string;
  message: string;
  source: string;
  pageUrl: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: string;
  emailSentAt: string | null;
  emailError: string | null;
  createdAt: string;
  updatedAt: string;
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

interface AdminAutomationPreset {
  id: string;
  title: string;
  description: string | null;
  category: string;
  icon: string | null;
  trigger: string;
  triggerConfig: unknown;
  actions: unknown;
  isActive: boolean;
  isGlobal: boolean;
  clientTypes: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
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
  contactLeads: ContactLead[];
  automations: AdminAutomation[];
  automationPresets: AdminAutomationPreset[];
  recentConversations: RecentConversation[];
  billingConfig: BillingConfig;
}

type AdminSection = "overview" | "templates" | "presets" | "automations" | "pricing" | "communities" | "activity" | "data" | "development" | "users" | "leads";
type ThemeMode = "light" | "dark";
type AdminAutomationFormState = {
  communityId: string;
  name: string;
  description: string;
  trigger: string;
  contentType: string;
  channels: string[];
  date: string;
  day: string;
  time: string;
  message: string;
  isActive: boolean;
};

const numberFormatter = new Intl.NumberFormat("fr-FR");
const TEMPLATE_CATEGORIES = ["ALL", "SHABBAT", "HOLIDAY", "EVENT", "COURSE", "ANNOUNCEMENT", "RECAP", "GREETING", "GENERAL"];
const EDITABLE_TEMPLATE_CATEGORIES = TEMPLATE_CATEGORIES.filter((category) => category !== "ALL");
const CHANNEL_TYPES = ["", "INSTAGRAM", "FACEBOOK", "WHATSAPP", "TELEGRAM", "EMAIL", "WEB"];
const TEMPLATE_VARIABLES = [
  { key: "SHABBAT_TIMES", label: "Horaires de Chabbat", type: "TIME" },
  { key: "HOLIDAY_TIMES", label: "Horaires de fête", type: "TIME" },
  { key: "DATE", label: "Date", type: "TIME" },
  { key: "TIME", label: "Heure", type: "TIME" },
  { key: "USER_LOGO", label: "Logo utilisateur", type: "IMAGE" },
  { key: "BET_DIN_NAME", label: "Nom de l'organisation", type: "ORGANIZATION" },
  { key: "TITLE", label: "Titre", type: "TEXT" },
  { key: "SUBTITLE", label: "Sous-titre", type: "TEXT" },
  { key: "MESSAGE", label: "Message personnalisé", type: "TEXT" },
  { key: "LOCATION", label: "Lieu", type: "TEXT" },
  { key: "CONTACT", label: "Contact", type: "TEXT" },
  { key: "CUSTOM_TEXT", label: "Texte libre", type: "TEXT" },
] as const;
const TEMPLATE_ALIGNMENTS = ["left", "center", "right"] as const;
const TEMPLATE_OVERFLOWS = [
  { value: "shrink", label: "Réduire la taille" },
  { value: "wrap", label: "Retour à la ligne" },
  { value: "truncate", label: "Couper avec ..." },
  { value: "hide", label: "Masquer si trop long" },
] as const;
const AUTOMATION_CHANNEL_TYPES = ["EMAIL", "WHATSAPP", "INSTAGRAM", "FACEBOOK", "TELEGRAM", "WEB"];
const AUTOMATION_TRIGGER_TYPES = [
  { value: "MANUAL", label: "Manuel" },
  { value: "CUSTOM_SCHEDULE", label: "Planifie" },
  { value: "DAILY", label: "Tous les jours" },
  { value: "WEEKLY_SHABBAT", label: "Chabbat" },
  { value: "JEWISH_HOLIDAY", label: "Fete juive" },
];
const AUTOMATION_CONTENT_TYPES = [
  { value: "GENERAL", label: "General" },
  { value: "COURSE_ANNOUNCEMENT", label: "Cours" },
  { value: "COMMUNITY_NEWS", label: "Actualite" },
  { value: "SHABBAT_TIMES", label: "Horaires de Chabbat" },
  { value: "HOLIDAY_GREETING", label: "Fetes" },
  { value: "FUNDRAISING", label: "Dons" },
];
const AUTOMATION_DAY_TYPES = [
  { value: "sunday", label: "Dimanche" },
  { value: "monday", label: "Lundi" },
  { value: "tuesday", label: "Mardi" },
  { value: "wednesday", label: "Mercredi" },
  { value: "thursday", label: "Jeudi" },
  { value: "friday", label: "Vendredi" },
  { value: "saturday", label: "Samedi" },
];
const VISIBILITY_FILTERS = ["ALL", "GLOBAL", "LOCAL"] as const;
const STATUS_FILTERS = ["ALL", "ACTIVE", "INACTIVE", "PREMIUM"] as const;
const COMMUNITY_PROFILE_OPTIONS = [
  { value: "SYNAGOGUE", label: "Synagogue" },
  { value: "RESTAURANT", label: "Restaurateur" },
  { value: "CATERER", label: "Traiteur" },
  { value: "SPORT_COACH", label: "Coach sportif" },
  { value: "ASSOCIATION", label: "Association" },
  { value: "SCHOOL", label: "École" },
  { value: "COMMERCE", label: "Commerce" },
  { value: "BUSINESS", label: "Entreprise" },
  { value: "CONTENT_CREATOR", label: "Créateur de contenu" },
  { value: "CENTER", label: "Centre" },
  { value: "OTHER", label: "Autre profil" },
];
const USER_PLAN_TIERS: Array<{ value: PlanTier; label: string; helper: string }> = [
  { value: "FREE", label: "Gratuit", helper: "Limites de l'offre gratuite" },
  { value: "PRO", label: "Pro", helper: "WhatsApp, 3 automatisations et 50 messages IA / mois" },
  { value: "BUSINESS", label: "Business", helper: "Droits Business, emails, avis Google et messages IA illimités" },
] as const;
const ADMIN_AUTOMATION_PRESETS = [
  { key: "WEEKLY_SHABBAT", logo: "🕯️", name: "Horaires de Chabbat", description: "Prépare les horaires chaque semaine.", trigger: "WEEKLY_SHABBAT" },
  { key: "DAILY_THOUGHT", logo: "✨", name: "Pensée du jour", description: "Prépare une pensée quotidienne.", trigger: "DAILY" },
  { key: "WEEKLY_COURSE_REMINDER", logo: "📖", name: "Rappel de cours", description: "Prépare les annonces de cours.", trigger: "CUSTOM_SCHEDULE" },
  { key: "HOLIDAY_GREETING", logo: "🎉", name: "Vœux de fêtes", description: "Prépare des messages avant les fêtes.", trigger: "JEWISH_HOLIDAY" },
  { key: "DONATION_REMINDER", logo: "💛", name: "Rappel de dons", description: "Prépare un message de collecte.", trigger: "CUSTOM_SCHEDULE" },
];
void ADMIN_AUTOMATION_PRESETS;

function isBethHabadCommunity(community: Pick<AdminCommunity, "communityType" | "religiousStream"> | null | undefined) {
  return community?.communityType === "SYNAGOGUE" && community.religiousStream === "BETH_HABAD";
}

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

function formatDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeInput(value: Date) {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

function buildNextRunAt(date: string, time: string) {
  if (!date || !time) return null;
  const nextRun = new Date(`${date}T${time}:00`);
  if (Number.isNaN(nextRun.getTime())) return null;
  return nextRun.toISOString();
}

function createDefaultAdminAutomationForm(communityId: string): AdminAutomationFormState {
  const defaultSendAt = new Date(Date.now() + 5 * 60 * 1000);
  return {
    communityId,
    name: "Nouvelle automatisation",
    description: "",
    trigger: "CUSTOM_SCHEDULE",
    contentType: "GENERAL",
    channels: ["EMAIL"],
    date: formatDateInput(defaultSendAt),
    day: "monday",
    time: formatTimeInput(defaultSendAt),
    message: "",
    isActive: true,
  };
}

function createTemplateZone(index: number): DynamicTemplateZone {
  const variable = TEMPLATE_VARIABLES[Math.min(index, TEMPLATE_VARIABLES.length - 1)] ?? TEMPLATE_VARIABLES[0];

  return {
    id: `zone_${crypto.randomUUID()}`,
    label: variable.label,
    variableKey: variable.key,
    variableType: variable.type,
    defaultText: variable.key === "SHABBAT_TIMES" ? "Entrée : 20h41\nSortie : 21h53" : `{{${variable.key}}}`,
    x: 12,
    y: 12 + (index % 5) * 14,
    width: variable.type === "IMAGE" ? 22 : 68,
    height: variable.type === "IMAGE" ? 16 : 12,
    align: "center",
    fontSize: variable.type === "IMAGE" ? 28 : 42,
    color: "#111827",
    fontFamily: "Arial, Helvetica, sans-serif",
    overflow: "shrink",
    locked: false,
  };
}

function normalizeTemplateDesign(value: unknown): DynamicTemplateZone[] {
  if (!Array.isArray(value)) return [];

  return value.map((zone, index) => {
    const item = zone && typeof zone === "object" ? zone as Partial<DynamicTemplateZone> & { type?: string } : {};
    const variable = TEMPLATE_VARIABLES.find((entry) => entry.key === (item.variableKey ?? item.type)) ?? TEMPLATE_VARIABLES[8];

    return {
      ...createTemplateZone(index),
      ...item,
      id: String(item.id ?? `zone_${index}`),
      label: String(item.label ?? variable.label),
      variableKey: String(item.variableKey ?? item.type ?? variable.key),
      variableType: String(item.variableType ?? variable.type),
      align: TEMPLATE_ALIGNMENTS.includes(item.align as (typeof TEMPLATE_ALIGNMENTS)[number]) ? item.align as DynamicTemplateZone["align"] : "center",
      overflow: TEMPLATE_OVERFLOWS.some((overflow) => overflow.value === item.overflow) ? item.overflow as DynamicTemplateZone["overflow"] : "shrink",
      locked: Boolean(item.locked),
    };
  });
}

function getFakeVariableValue(zone: DynamicTemplateZone): string {
  if (zone.variableKey === "SHABBAT_TIMES") return "Entrée : 20h41\nSortie : 21h53";
  if (zone.variableKey === "HOLIDAY_TIMES") return "Office : 09h30\nAllumage : 20h12";
  if (zone.variableKey === "DATE") return "Vendredi 3 juillet 2026";
  if (zone.variableKey === "TIME") return "20h30";
  if (zone.variableKey === "BET_DIN_NAME") return "Beth Din de Paris";
  if (zone.variableKey === "TITLE") return "Beth Din de Paris";
  if (zone.variableKey === "SUBTITLE") return "Programme communautaire";
  if (zone.variableKey === "MESSAGE") return "Shabbat Shalom à tous.";
  if (zone.variableKey === "LOCATION") return "Paris";
  if (zone.variableKey === "CONTACT") return "01 23 45 67 89";
  if (zone.variableKey === "USER_LOGO") return "Logo";
  return "Texte exemple";
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

export function AdminConsoleClient({ metrics, templates, communities, users, contactLeads, automations, automationPresets, recentConversations, billingConfig }: Props) {
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const [selectedPresetId, setSelectedPresetId] = useState(automationPresets[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL");
  const [visibilityFilter, setVisibilityFilter] = useState<(typeof VISIBILITY_FILTERS)[number]>("ALL");
  const [presetProfileFilter, setPresetProfileFilter] = useState("ALL");
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [automationCommunityFilter, setAutomationCommunityFilter] = useState("ALL");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [status, setStatus] = useState<string | null>(null);
  const [billingDraft, setBillingDraft] = useState({
    basePriceEuros: (billingConfig.basePriceCents / 100).toFixed(2),
    launchPriceEuros: (billingConfig.launchPriceCents / 100).toFixed(2),
    launchEndsAt: billingConfig.launchEndsAt,
    launchMessage: billingConfig.launchMessage,
  });
  const [billingSaving, setBillingSaving] = useState(false);
  const [showDevelopmentPreview, setShowDevelopmentPreview] = useState(false);
  const [developmentPreviewRun, setDevelopmentPreviewRun] = useState(0);
  const [adminAutomationFormOpen, setAdminAutomationFormOpen] = useState(false);
  const [adminAutomationForm, setAdminAutomationForm] = useState<AdminAutomationFormState>(() => createDefaultAdminAutomationForm(""));
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [savingUserBillingId, setSavingUserBillingId] = useState<string | null>(null);
  const [userDeleteConfirm, setUserDeleteConfirm] = useState<AdminUser | null>(null);
  const [uploadingField, setUploadingField] = useState<"thumbnail" | "preview" | null>(null);
  const [automationSaving, setAutomationSaving] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);
  const [draggingZoneId, setDraggingZoneId] = useState<string | null>(null);
  const [resizingZoneId, setResizingZoneId] = useState<string | null>(null);
  const [canvasGuides, setCanvasGuides] = useState({ vertical: false, horizontal: false });
  const [showFakePreview, setShowFakePreview] = useState(true);
  const [drafts, setDrafts] = useState(() => new Map(templates.map((template) => [template.id, { ...template, design: normalizeTemplateDesign(template.design) }])));
  const [presetDrafts, setPresetDrafts] = useState(() => new Map(automationPresets.map((preset) => [preset.id, preset])));

  const isDark = theme === "dark";
  const selectedTemplate = drafts.get(selectedId) ?? Array.from(drafts.values())[0] ?? null;
  const selectedZone = selectedTemplate?.design.find((zone) => zone.id === selectedZoneId) ?? selectedTemplate?.design[0] ?? null;
  const selectedZoneCount = selectedZoneIds.length;
  const selectedPreset = presetDrafts.get(selectedPresetId) ?? Array.from(presetDrafts.values())[0] ?? null;
  const allTemplates = useMemo(() => Array.from(drafts.values()), [drafts]);
  const allPresets = useMemo(() => Array.from(presetDrafts.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)), [presetDrafts]);
  const filteredPresets = useMemo(() => {
    if (presetProfileFilter === "ALL") return allPresets;
    if (presetProfileFilter === "GENERAL_DEFAULT") return allPresets.filter((preset) => preset.category === "GENERAL_DEFAULT");
    return allPresets.filter((preset) => preset.clientTypes?.includes(presetProfileFilter));
  }, [allPresets, presetProfileFilter]);
  const templateStats = useMemo(() => {
    const active = allTemplates.filter((template) => template.isActive).length;
    const inactive = allTemplates.length - active;
    const global = allTemplates.filter((template) => template.isGlobal).length;
    const premium = allTemplates.filter((template) => template.isPremium).length;
    return { active, inactive, global, premium };
  }, [allTemplates]);
  const filteredAutomations = useMemo(() => {
    return automations.filter((automation) => {
      if (automationCommunityFilter === "ALL") return true;
      if (automationCommunityFilter === "BETH_HABAD") {
        const community = communities.find((item) => item.id === automation.communityId);
        return isBethHabadCommunity(community);
      }
      return automation.communityId === automationCommunityFilter;
    });
  }, [automationCommunityFilter, automations, communities]);
  const bethHabadCommunities = communities.filter(isBethHabadCommunity);
  const selectedAutomationCommunity =
    automationCommunityFilter !== "ALL" && automationCommunityFilter !== "BETH_HABAD"
      ? automationCommunityFilter
      : bethHabadCommunities[0]?.id ?? communities[0]?.id ?? "";

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

  function updateSelectedTemplateDesign(design: DynamicTemplateZone[]) {
    updateSelectedTemplate({ design });
  }

  function selectTemplateZone(zoneId: string, additive = false) {
    setSelectedZoneId(zoneId);
    setSelectedZoneIds((previous) => {
      if (!additive) return [zoneId];
      return previous.includes(zoneId)
        ? previous.filter((id) => id !== zoneId)
        : [...previous, zoneId];
    });
  }

  function addTemplateZone() {
    if (!selectedTemplate) return;
    const nextZone = createTemplateZone(selectedTemplate.design.length);
    updateSelectedTemplateDesign([...selectedTemplate.design, nextZone]);
    selectTemplateZone(nextZone.id);
  }

  function updateTemplateZone(zoneId: string, patch: Partial<DynamicTemplateZone>) {
    if (!selectedTemplate) return;
    updateSelectedTemplateDesign(
      selectedTemplate.design.map((zone) => {
        if (zone.id !== zoneId) return zone;
        const next = { ...zone, ...patch };
        const width = Math.max(1, Math.min(100, Number(next.width) || zone.width));
        const height = Math.max(1, Math.min(100, Number(next.height) || zone.height));
        return {
          ...next,
          width,
          height,
          x: Math.min(100 - width, Math.max(0, Number(next.x) || 0)),
          y: Math.min(100 - height, Math.max(0, Number(next.y) || 0)),
          fontSize: Math.max(8, Math.min(180, Number(next.fontSize) || zone.fontSize)),
        };
      })
    );
  }

  function deleteTemplateZone(zoneId: string) {
    if (!selectedTemplate) return;
    const nextDesign = selectedTemplate.design.filter((zone) => zone.id !== zoneId);
    updateSelectedTemplateDesign(nextDesign);
    const nextSelectedId = nextDesign[0]?.id ?? null;
    setSelectedZoneId(nextSelectedId);
    setSelectedZoneIds(nextSelectedId ? [nextSelectedId] : []);
  }

  function updateZoneVariable(zoneId: string, variableKey: string) {
    const variable = TEMPLATE_VARIABLES.find((entry) => entry.key === variableKey);
    updateTemplateZone(zoneId, {
      variableKey,
      variableType: variable?.type ?? "TEXT",
      label: variable?.label ?? variableKey,
      defaultText:
        variableKey === "SHABBAT_TIMES"
          ? "Entrée : 20h41\nSortie : 21h53"
          : variableKey === "USER_LOGO"
            ? "Logo du compte"
            : `{{${variableKey}}}`,
    });
  }

  function autoPlaceTemplateZones() {
    if (!selectedTemplate) return;
    const total = selectedTemplate.design.length;
    if (total === 0) return;

    const nextDesign = selectedTemplate.design.map((zone, index) => {
      if (zone.locked) return zone;
      const isLogo = zone.variableType === "IMAGE" || zone.variableKey === "USER_LOGO";
      const presets = total <= 3
        ? [
            { x: 16, y: 12, width: 68, height: 12 },
            { x: 14, y: 42, width: 72, height: 18 },
            { x: 18, y: 74, width: 64, height: 12 },
          ]
        : [
            { x: 10, y: 8, width: 24, height: 14 },
            { x: 18, y: 18, width: 64, height: 10 },
            { x: 14, y: 34, width: 72, height: 16 },
            { x: 12, y: 58, width: 76, height: 14 },
            { x: 18, y: 78, width: 64, height: 10 },
          ];
      const preset = presets[index % presets.length];

      return {
        ...zone,
        ...preset,
        width: isLogo ? 22 : preset.width,
        height: isLogo ? 16 : preset.height,
        x: isLogo ? 39 : preset.x,
      };
    });

    updateSelectedTemplateDesign(nextDesign);
    setStatus("Placement automatique appliqué aux zones non verrouillées.");
  }

  function applyCanvasCenterGuides(zone: DynamicTemplateZone, next: Partial<Pick<DynamicTemplateZone, "x" | "y" | "width" | "height">>) {
    const width = next.width ?? zone.width;
    const height = next.height ?? zone.height;
    let x = next.x ?? zone.x;
    let y = next.y ?? zone.y;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const vertical = Math.abs(centerX - 50) <= 1.5;
    const horizontal = Math.abs(centerY - 50) <= 1.5;

    if (vertical) x = 50 - width / 2;
    if (horizontal) y = 50 - height / 2;
    setCanvasGuides({ vertical, horizontal });

    return { x, y, width, height };
  }

  function moveZoneByPointerDelta(event: PointerEvent<HTMLDivElement>, zone: DynamicTemplateZone) {
    if (!selectedTemplate || zone.locked) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const guided = applyCanvasCenterGuides(zone, {
      x: zone.x + (event.movementX / rect.width) * 100,
      y: zone.y + (event.movementY / rect.height) * 100,
    });
    updateTemplateZone(zone.id, { x: guided.x, y: guided.y });
  }

  function resizeZoneByPointerDelta(event: PointerEvent<HTMLDivElement>, zone: DynamicTemplateZone) {
    if (!selectedTemplate || zone.locked) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const guided = applyCanvasCenterGuides(zone, {
      width: Math.max(4, zone.width + (event.movementX / rect.width) * 100),
      height: Math.max(4, zone.height + (event.movementY / rect.height) * 100),
    });
    updateTemplateZone(zone.id, {
      x: guided.x,
      y: guided.y,
      width: guided.width,
      height: guided.height,
    });
  }

  function updateSelectedPreset(patch: Partial<AdminAutomationPreset>) {
    if (!selectedPreset) return;
    const nextPreset = { ...selectedPreset, ...patch };
    setPresetDrafts((previous) => {
      const next = new Map(previous);
      next.set(nextPreset.id, nextPreset);
      return next;
    });
  }

  function getSelectedPresetTriggerConfig() {
    const config = selectedPreset?.triggerConfig;
    return config && typeof config === "object" && !Array.isArray(config)
      ? config as Record<string, unknown>
      : {};
  }

  function getSelectedPresetTriggerConfigText(key: string) {
    const value = getSelectedPresetTriggerConfig()[key];
    return typeof value === "string" ? value : "";
  }

  function updateSelectedPresetTriggerConfig(patch: Record<string, unknown>) {
    updateSelectedPreset({ triggerConfig: { ...getSelectedPresetTriggerConfig(), ...patch } });
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
        design: selectedTemplate.design,
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
        design: normalizeTemplateDesign(payload.design),
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
      design: normalizeTemplateDesign(payload.design),
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

  async function deleteTemplateById(template: AdminTemplate) {
    const confirmed = window.confirm(`Supprimer définitivement l'affiche "${template.name}" ?`);
    if (!confirmed) return;

    setDeletingId(template.id);
    setStatus(null);
    const response = await fetch(`/api/admin/templates/${template.id}`, { method: "DELETE" });
    const payload = await response.json();
    setDeletingId(null);

    if (!response.ok) {
      setStatus(payload.error ?? "Impossible de supprimer l'affiche.");
      return;
    }

    setDrafts((previous) => {
      const next = new Map(previous);
      next.delete(template.id);
      if (selectedId === template.id) {
        setSelectedId(next.keys().next().value ?? "");
      }
      return next;
    });
    setStatus("Affiche supprimée.");
  }

  async function deleteTemplate() {
    if (!selectedTemplate) return;
    await deleteTemplateById(selectedTemplate);
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

  async function createAutomationPreset() {
    setStatus(null);
    const response = await fetch("/api/admin/automation-presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Nouvelle publication IA",
        description: "Décrivez quand proposer cette automatisation.",
        category: "GENERAL",
        icon: "⚡",
        trigger: "MANUAL",
        triggerConfig: {
          aiInstruction: "Décrivez ici la logique IA interne. Elle ne sera pas affichée à l'utilisateur.",
          assistantMessage: "Je vais préparer cette publication automatiquement. Ça vous convient ?",
          notificationHoursBefore: 2,
          whatsappDeliveryMode: "manual_copy",
          whatsappAutoSend: false,
        },
        actions: [],
        isActive: true,
        isGlobal: true,
        clientTypes: ["SYNAGOGUE"],
        sortOrder: allPresets.length * 10 + 10,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(payload.error ?? "Impossible de créer la publication IA.");
      return;
    }
    const nextPreset = { ...payload, usageCount: 0 };
    setPresetDrafts((previous) => new Map(previous).set(nextPreset.id, nextPreset));
    setSelectedPresetId(nextPreset.id);
    setActiveSection("presets");
  }

  async function saveAutomationPreset() {
    if (!selectedPreset) return;
    setStatus(null);
    const response = await fetch(`/api/admin/automation-presets/${selectedPreset.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: selectedPreset.title,
        description: selectedPreset.description,
        category: selectedPreset.category,
        trigger: selectedPreset.trigger,
        triggerConfig: selectedPreset.triggerConfig,
        actions: selectedPreset.actions,
        isActive: selectedPreset.isActive,
        isGlobal: true,
        clientTypes: selectedPreset.clientTypes,
        sortOrder: selectedPreset.sortOrder,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStatus(payload.error ?? "Impossible d'enregistrer la publication IA.");
      return;
    }
    setPresetDrafts((previous) => new Map(previous).set(selectedPreset.id, { ...selectedPreset, ...payload }));
    setStatus("Publication IA enregistrée.");
  }

  async function deleteAutomationPreset(preset: AdminAutomationPreset) {
    const warning = preset.usageCount > 0
      ? `\n\nAttention : cette automatisation est déjà utilisée par ${preset.usageCount} compte(s). Si la suppression peut casser des données clientes, elle sera désactivée globalement.`
      : "";
    if (!window.confirm(`Voulez-vous vraiment supprimer cette automatisation de tous les comptes concernés ?${warning}`)) return;
    const response = await fetch(`/api/admin/automation-presets/${preset.id}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 409 && window.confirm(`${payload.error}\n\nDésactiver cette automatisation globalement ?`)) {
        await fetch(`/api/admin/automation-presets/${preset.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        });
        setPresetDrafts((previous) => new Map(previous).set(preset.id, { ...preset, isActive: false }));
      } else {
        setStatus(payload.error ?? "Suppression impossible.");
      }
      return;
    }
    setPresetDrafts((previous) => {
      const next = new Map(previous);
      next.delete(preset.id);
      setSelectedPresetId(next.keys().next().value ?? "");
      return next;
    });
  }

  async function createPresetAutomation(presetId: string) {
    if (!selectedAutomationCommunity) {
      setStatus("Choisissez d'abord une communauté cible.");
      return;
    }
    setAutomationSaving(presetId);
    const response = await fetch("/api/admin/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId: selectedAutomationCommunity, presetId }),
    });
    const payload = await response.json().catch(() => ({}));
    setAutomationSaving(null);
    if (!response.ok) {
      setStatus(payload.error ?? "Création impossible.");
      return;
    }
    window.location.reload();
  }

  function toggleSelectedPresetClientType(clientType: string) {
    if (!selectedPreset) return;
    const currentTypes = new Set(selectedPreset.clientTypes ?? []);
    if (currentTypes.has(clientType)) currentTypes.delete(clientType);
    else currentTypes.add(clientType);
    updateSelectedPreset({ clientTypes: Array.from(currentTypes) });
  }

  async function createPresetAutomationForBethHabad(presetId: string) {
    if (bethHabadCommunities.length === 0) {
      setStatus("Aucun compte Beth Habad à cibler.");
      return;
    }
    setAutomationSaving(`beth-habad-${presetId}`);
    const results = await Promise.all(
      bethHabadCommunities.map((community) =>
        fetch("/api/admin/automations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ communityId: community.id, presetId }),
        })
      )
    );
    setAutomationSaving(null);
    const failed = results.filter((response) => !response.ok).length;
    if (failed > 0) {
      setStatus(`${failed} automatisation(s) Beth Habad n'ont pas pu être créées.`);
      return;
    }
    window.location.reload();
  }

  function openAdminAutomationForm() {
    setAdminAutomationForm(createDefaultAdminAutomationForm(selectedAutomationCommunity || communities[0]?.id || ""));
    setAdminAutomationFormOpen(true);
  }

  function updateAdminAutomationForm(patch: Partial<AdminAutomationFormState>) {
    setAdminAutomationForm((previous) => ({ ...previous, ...patch }));
  }

  function toggleAdminAutomationChannel(channel: string) {
    setAdminAutomationForm((previous) => {
      const channels = previous.channels.includes(channel)
        ? previous.channels.filter((item) => item !== channel)
        : [...previous.channels, channel];
      return { ...previous, channels };
    });
  }

  function buildAdminAutomationTriggerConfig() {
    return {
      day: adminAutomationForm.day,
      time: adminAutomationForm.time,
      date: adminAutomationForm.date,
      repeat: adminAutomationForm.trigger === "DAILY" ? "daily" : "weekly",
      days: [adminAutomationForm.day],
      message: adminAutomationForm.message.trim(),
      eventTitle: adminAutomationForm.name.trim(),
    };
  }

  async function submitAdminAutomationForm() {
    if (!adminAutomationForm.communityId) {
      setStatus("Choisissez un compte cible.");
      return;
    }
    if (!adminAutomationForm.name.trim()) {
      setStatus("Donnez un nom à l'automatisation.");
      return;
    }
    if (adminAutomationForm.trigger !== "MANUAL" && (!adminAutomationForm.date || !adminAutomationForm.time)) {
      setStatus("Choisissez une date et une heure d'envoi.");
      return;
    }
    if (adminAutomationForm.channels.length === 0) {
      setStatus("Choisissez au moins un canal.");
      return;
    }

    setAutomationSaving("admin-create");
    const response = await fetch("/api/admin/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        communityId: adminAutomationForm.communityId,
        name: adminAutomationForm.name.trim(),
        description: adminAutomationForm.description.trim(),
        trigger: adminAutomationForm.trigger,
        triggerConfig: buildAdminAutomationTriggerConfig(),
        contentType: adminAutomationForm.contentType,
        channels: adminAutomationForm.channels,
        isActive: adminAutomationForm.isActive,
        nextRunAt: adminAutomationForm.trigger === "MANUAL" ? null : buildNextRunAt(adminAutomationForm.date, adminAutomationForm.time),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setAutomationSaving(null);
    if (!response.ok) {
      setStatus(payload.error ?? "Création impossible.");
      return;
    }
    setAdminAutomationFormOpen(false);
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

  async function editAdminAutomation(automation: AdminAutomation) {
    const name = window.prompt("Nom de l'automatisation", automation.name);
    if (!name || name.trim() === automation.name) return;
    setAutomationSaving(automation.id);
    const response = await fetch(`/api/admin/automations/${automation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setAutomationSaving(null);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setStatus(payload.error ?? "Modification impossible.");
      return;
    }
    window.location.reload();
  }

  async function deleteUser(user: AdminUser) {
    setDeletingUserId(user.id);
    setStatus(null);
    const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    setDeletingUserId(null);
    setUserDeleteConfirm(null);
    if (!response.ok) {
      setStatus(payload.error ?? "Suppression impossible.");
      return;
    }
    setStatus(`Compte de ${user.email} supprimé avec toutes ses données.`);
    window.location.reload();
  }

  async function saveUserBilling(user: AdminUser, planTier: PlanTier, startedAt: string) {
    setSavingUserBillingId(user.id);
    setStatus(null);
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planTier, subscriptionStartedAt: startedAt }),
    });
    const payload = await response.json().catch(() => ({}));
    setSavingUserBillingId(null);
    if (!response.ok) {
      setStatus(payload.error ?? "Modification de l'abonnement impossible.");
      return;
    }
    setStatus(`Abonnement de ${user.email} mis à jour.`);
    window.location.reload();
  }

  async function deleteAdminAutomation(automation: AdminAutomation) {
    if (!window.confirm(`Supprimer l'automatisation "${automation.name}" ?`)) return;
    setAutomationSaving(automation.id);
    const response = await fetch(`/api/admin/automations/${automation.id}`, { method: "DELETE" });
    setAutomationSaving(null);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setStatus(payload.error ?? "Suppression impossible.");
      return;
    }
    window.location.reload();
  }

  async function saveBillingPricing() {
    setBillingSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/billing-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billingDraft),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setStatus(payload.error ?? "Enregistrement de la tarification impossible.");
        return;
      }
      setStatus("Tarification mise à jour.");
    } finally {
      setBillingSaving(false);
    }
  }

  const navItems = [
    { id: "overview" as const, label: "Vue globale", icon: LayoutDashboard, value: formatNumber(metrics.databaseItemCount) },
    { id: "templates" as const, label: "Affiches", icon: ImageIcon, value: formatNumber(allTemplates.length) },
    { id: "presets" as const, label: "Publications IA", icon: Sparkles, value: formatNumber(allPresets.length) },
    { id: "automations" as const, label: "Automatisations", icon: Zap, value: formatNumber(automations.length) },
    { id: "pricing" as const, label: "Tarification", icon: CreditCard, value: "€" },
    { id: "communities" as const, label: "Beth Habad", icon: Building2, value: formatNumber(metrics.communityCount) },
    { id: "users" as const, label: "Utilisateurs", icon: Users, value: formatNumber(users.length) },
    { id: "leads" as const, label: "Leads", icon: MessageSquare, value: formatNumber(contactLeads.length) },
    { id: "activity" as const, label: "Activité IA", icon: Bot, value: formatNumber(metrics.conversationCount) },
    { id: "data" as const, label: "Données", icon: Database, value: formatNumber(metrics.databaseItemCount) },
    { id: "development" as const, label: "Développement", icon: PlayCircle, value: "UI" },
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
              <h1 className={`mt-4 text-2xl font-black leading-tight ${strongText}`}>Pilotage EasyCom IA</h1>
              <p className={`mt-2 text-sm leading-6 ${mutedText}`}>Supervisez les structures, les usages IA, les données et surtout la banque d&apos;affiches.</p>
            </div>

            <nav className="mt-8 space-y-2">
              <Link
                href="/admin/blog"
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm font-bold transition ${
                  isDark ? "text-slate-300 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center gap-3">
                  <FileText className="size-4" />
                  Blog SEO
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${isDark ? "bg-white/10" : "bg-slate-100"}`}>CMS</span>
              </Link>
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
                  {activeSection === "templates" ? "Pilotage des affiches" : "Admin global"}
                </p>
                <h2 className={`mt-3 text-3xl font-black tracking-tight md:text-4xl ${strongText}`}>Tableau de contrôle</h2>
                <p className={`mt-2 max-w-3xl text-sm leading-6 ${mutedText}`}>Vue claire par défaut, dark mode en option. Les filtres permettent de retrouver rapidement les affiches à modifier ou à suggérer.</p>
              </div>
              <div className="flex flex-wrap gap-2 lg:hidden">
                <Link
                  href="/admin/blog"
                  className={`rounded-full px-3 py-2 text-xs font-bold ${isDark ? "bg-white/10 text-slate-200" : "bg-white text-slate-600"}`}
                >
                  Blog SEO
                </Link>
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
              <div className={`rounded-[2rem] border p-5 shadow-sm xl:order-2 ${panelClass}`}>
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

                <div className="mt-5 grid gap-3">
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

                <div className="mt-5 grid gap-3">
                  {filteredTemplates.map((template) => {
                    const isSelected = selectedTemplate?.id === template.id;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedId(template.id)}
                        className={`group relative overflow-hidden rounded-3xl border p-3 text-left transition ${
                          isSelected
                            ? isDark ? "border-emerald-300/70 bg-emerald-300/10" : "border-emerald-500 bg-emerald-50"
                            : isDark ? "border-white/10 bg-slate-950/55 hover:border-white/25" : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`Supprimer l'affiche ${template.name}`}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void deleteTemplateById(template);
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" && event.key !== " ") return;
                            event.preventDefault();
                            event.stopPropagation();
                            void deleteTemplateById(template);
                          }}
                          className={`absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                            deletingId === template.id
                              ? isDark
                                ? "border-red-400/40 bg-red-500/20 text-red-100"
                                : "border-red-200 bg-red-100 text-red-700"
                              : isDark
                                ? "border-white/10 bg-slate-950/80 text-slate-300 hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-100"
                                : "border-slate-200 bg-white/95 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                          }`}
                        >
                          <Trash2 className={`size-4 ${deletingId === template.id ? "animate-pulse" : ""}`} />
                        </span>
                        <div className="flex gap-3">
                          <div className={`relative h-24 w-20 flex-shrink-0 overflow-hidden rounded-2xl ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                            {template.thumbnailUrl || template.previewUrl ? (
                              <Image
                                src={template.thumbnailUrl ?? template.previewUrl ?? ""}
                                alt={template.name}
                                fill
                                sizes="80px"
                                className="object-cover transition group-hover:scale-105"
                              />
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
                              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-600">{template.design.length} zone(s)</span>
                              {template.isPremium && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600">Premium</span>}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <aside className={`rounded-[2rem] border p-5 shadow-sm xl:order-1 xl:sticky xl:top-6 xl:self-start ${panelClass}`}>
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

                    <div className={`rounded-3xl border p-4 ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className={`text-sm font-black ${strongText}`}>Zones dynamiques</h4>
                          <p className={`mt-1 text-xs leading-5 ${mutedText}`}>
                            Placez les variables sur l&apos;image. Les coordonnées sont en pourcentage pour rester compatibles Instagram, Facebook, WhatsApp ou A4.
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowFakePreview((value) => !value)}
                            className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-black ${showFakePreview ? "border-blue-200 bg-blue-50 text-blue-700" : isDark ? "border-white/10 text-slate-300" : "border-slate-200 text-slate-600"}`}
                          >
                            <Eye className="size-3.5" />
                            Aperçu fake
                          </button>
                          <button
                            type="button"
                            onClick={autoPlaceTemplateZones}
                            className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-black ${isDark ? "border-white/10 text-slate-200 hover:bg-white/10" : "border-slate-200 text-slate-700 hover:bg-white"}`}
                          >
                            <Wand2 className="size-3.5" />
                            Placement auto
                          </button>
                          <button
                            type="button"
                            onClick={addTemplateZone}
                            className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white hover:bg-blue-700"
                          >
                            <Plus className="size-3.5" />
                            Zone
                          </button>
                        </div>
                      </div>

                      <div
                        className={`relative mt-4 aspect-[3/4] overflow-hidden rounded-2xl border ${isDark ? "border-white/10 bg-slate-900" : "border-slate-200 bg-white"}`}
                        onPointerMove={(event) => {
                          if (!selectedTemplate) return;
                          if (resizingZoneId) {
                            const zone = selectedTemplate.design.find((item) => item.id === resizingZoneId);
                            if (zone) resizeZoneByPointerDelta(event, zone);
                            return;
                          }
                          if (draggingZoneId) {
                            const zone = selectedTemplate.design.find((item) => item.id === draggingZoneId);
                            if (zone) moveZoneByPointerDelta(event, zone);
                          }
                        }}
                        onPointerUp={() => {
                          setDraggingZoneId(null);
                          setResizingZoneId(null);
                          setCanvasGuides({ vertical: false, horizontal: false });
                        }}
                        onPointerLeave={() => {
                          setDraggingZoneId(null);
                          setResizingZoneId(null);
                          setCanvasGuides({ vertical: false, horizontal: false });
                        }}
                      >
                        {selectedTemplate.previewUrl || selectedTemplate.thumbnailUrl ? (
                          <Image
                            src={selectedTemplate.previewUrl ?? selectedTemplate.thumbnailUrl ?? ""}
                            alt={selectedTemplate.name}
                            fill
                            sizes="420px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className={`size-10 ${mutedText}`} />
                          </div>
                        )}

                        {canvasGuides.vertical && (
                          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.95)]">
                            <span className="absolute left-2 top-2 rounded-full bg-cyan-500 px-2 py-0.5 text-[10px] font-black text-white shadow-sm">Milieu vertical</span>
                          </div>
                        )}
                        {canvasGuides.horizontal && (
                          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-px -translate-y-1/2 bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.95)]">
                            <span className="absolute left-2 top-2 rounded-full bg-cyan-500 px-2 py-0.5 text-[10px] font-black text-white shadow-sm">Milieu horizontal</span>
                          </div>
                        )}

                        {selectedTemplate.design.map((zone) => {
                          const isZoneSelected = selectedZoneIds.includes(zone.id) || selectedZone?.id === zone.id;
                          const zoneText = showFakePreview ? getFakeVariableValue(zone) : `{{${zone.variableKey}}}`;
                          const previewFontSize = Math.max(6, Math.round(zone.fontSize * 0.33));
                          return (
                            <div
                              key={zone.id}
                              role="button"
                              tabIndex={0}
                              onClick={(event) => selectTemplateZone(zone.id, event.ctrlKey || event.metaKey)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") selectTemplateZone(zone.id, event.ctrlKey || event.metaKey);
                              }}
                              className={`absolute rounded-xl border-2 shadow-sm transition ${
                                isZoneSelected
                                  ? selectedZoneIds.length > 1
                                    ? "border-cyan-400 bg-cyan-400/10 ring-4 ring-cyan-300/25"
                                    : "border-blue-500 bg-blue-500/10 ring-4 ring-blue-500/20"
                                  : zone.locked
                                    ? "border-amber-300/90 bg-amber-950/10 hover:border-amber-200"
                                    : "border-white/80 bg-white/10 hover:border-blue-300"
                              }`}
                              style={{
                                left: `${zone.x}%`,
                                top: `${zone.y}%`,
                                width: `${zone.width}%`,
                                height: `${zone.height}%`,
                              }}
                              title={`Variable {{${zone.variableKey}}}`}
                            >
                              <button
                                type="button"
                                aria-label={zone.locked ? "Déverrouiller la zone" : "Verrouiller la zone"}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  updateTemplateZone(zone.id, { locked: !zone.locked });
                                }}
                                className={`absolute -right-2 -top-2 inline-flex size-6 items-center justify-center rounded-full border text-[10px] shadow-sm ${zone.locked ? "border-amber-200 bg-amber-400 text-amber-950" : "border-white/70 bg-slate-950/70 text-white"}`}
                              >
                                {zone.locked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
                              </button>
                              {!zone.locked && (
                                <button
                                  type="button"
                                  aria-label={`Déplacer ${zone.label}`}
                                  onPointerDown={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    selectTemplateZone(zone.id, event.ctrlKey || event.metaKey);
                                    setDraggingZoneId(zone.id);
                                  }}
                                  className="absolute -left-2 -top-2 inline-flex size-6 cursor-move items-center justify-center rounded-full border border-white/70 bg-blue-600 text-white shadow-sm"
                                >
                                  <Move className="size-3" />
                                </button>
                              )}
                              <span
                                className="flex h-full w-full whitespace-pre-line break-words px-2 py-1 leading-tight"
                                style={{
                                  alignItems: "center",
                                  justifyContent: zone.align === "left" ? "flex-start" : zone.align === "right" ? "flex-end" : "center",
                                  textAlign: zone.align,
                                  color: showFakePreview ? zone.color : "#ffffff",
                                  fontFamily: zone.fontFamily,
                                  fontSize: `${previewFontSize}px`,
                                  fontWeight: 700,
                                  overflow: "hidden",
                                }}
                              >
                                {zoneText}
                              </span>
                              {!zone.locked && (
                                <button
                                  type="button"
                                  aria-label={`Redimensionner ${zone.label}`}
                                  onPointerDown={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    selectTemplateZone(zone.id, event.ctrlKey || event.metaKey);
                                    setResizingZoneId(zone.id);
                                  }}
                                  className="absolute -bottom-2 -right-2 inline-flex size-6 cursor-nwse-resize items-center justify-center rounded-full border border-white/70 bg-emerald-500 text-white shadow-sm"
                                >
                                  <Maximize2 className="size-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {selectedZone ? (
                        <div className="mt-4 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className={`text-xs font-black uppercase tracking-[0.14em] ${mutedText}`}>Zone sélectionnée</p>
                              {selectedZoneCount > 1 && (
                                <p className="mt-1 text-xs font-semibold text-cyan-600">
                                  {selectedZoneCount} variables sélectionnées avec Ctrl/Cmd
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => updateTemplateZone(selectedZone.id, { locked: !selectedZone.locked })}
                                className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-black ${selectedZone.locked ? "border-amber-200 bg-amber-50 text-amber-700" : isDark ? "border-white/10 text-slate-200 hover:bg-white/10" : "border-slate-200 text-slate-700 hover:bg-white"}`}
                              >
                                {selectedZone.locked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
                                {selectedZone.locked ? "Bloquée" : "Libre"}
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteTemplateZone(selectedZone.id)}
                                className={`rounded-xl border px-3 py-1.5 text-xs font-black ${isDark ? "border-red-400/30 text-red-100 hover:bg-red-500/20" : "border-red-200 text-red-700 hover:bg-red-50"}`}
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className={`block text-xs font-black uppercase tracking-[0.12em] ${mutedText}`}>
                              Variable
                              <select
                                value={selectedZone.variableKey}
                                onChange={(event) => updateZoneVariable(selectedZone.id, event.target.value)}
                                className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm font-semibold normal-case tracking-normal outline-none ${inputClass}`}
                              >
                                {TEMPLATE_VARIABLES.map((variable) => (
                                  <option key={variable.key} value={variable.key}>{variable.label}</option>
                                ))}
                              </select>
                            </label>
                            <label className={`block text-xs font-black uppercase tracking-[0.12em] ${mutedText}`}>
                              Libellé admin
                              <input value={selectedZone.label} onChange={(event) => updateTemplateZone(selectedZone.id, { label: event.target.value })} className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm font-semibold normal-case tracking-normal outline-none ${inputClass}`} />
                            </label>
                          </div>

                          {selectedZone.variableKey !== "USER_LOGO" && selectedZone.variableType !== "IMAGE" && (
                            <label className={`block text-xs font-black uppercase tracking-[0.12em] ${mutedText}`}>
                              Texte de secours
                              <textarea
                                value={selectedZone.defaultText}
                                onChange={(event) => updateTemplateZone(selectedZone.id, { defaultText: event.target.value })}
                                rows={3}
                                className={`mt-2 w-full resize-none rounded-2xl border px-3 py-2 text-sm font-semibold normal-case tracking-normal outline-none ${inputClass}`}
                              />
                            </label>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            {(["x", "y", "width", "height"] as const).map((field) => (
                              <label key={field} className={`block text-xs font-black uppercase tracking-[0.12em] ${mutedText}`}>
                                {field.toUpperCase()} %
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={Math.round(selectedZone[field] * 10) / 10}
                                  onChange={(event) => updateTemplateZone(selectedZone.id, { [field]: Number(event.target.value) })}
                                  className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm font-semibold normal-case tracking-normal outline-none ${inputClass}`}
                                />
                              </label>
                            ))}
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className={`block text-xs font-black uppercase tracking-[0.12em] ${mutedText}`}>
                              <div className="flex items-center justify-between gap-3">
                                <span>Taille des lettres</span>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-black normal-case tracking-normal ${isDark ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"}`}>
                                  {Math.round(selectedZone.fontSize)} px
                                </span>
                              </div>
                              <div className={`mt-2 flex items-center gap-2 rounded-2xl border px-3 py-2 ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"}`}>
                                <button
                                  type="button"
                                  onClick={() => updateTemplateZone(selectedZone.id, { fontSize: selectedZone.fontSize - 2 })}
                                  className={`inline-flex size-8 items-center justify-center rounded-xl text-sm font-black ${isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                                >
                                  -
                                </button>
                                <input
                                  type="range"
                                  min={8}
                                  max={180}
                                  step={1}
                                  value={selectedZone.fontSize}
                                  onChange={(event) => updateTemplateZone(selectedZone.id, { fontSize: Number(event.target.value) })}
                                  className="h-2 min-w-0 flex-1 cursor-pointer accent-emerald-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateTemplateZone(selectedZone.id, { fontSize: selectedZone.fontSize + 2 })}
                                  className={`inline-flex size-8 items-center justify-center rounded-xl text-sm font-black ${isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            <label className={`block text-xs font-black uppercase tracking-[0.12em] ${mutedText}`}>
                              Couleur
                              <input type="color" value={selectedZone.color} onChange={(event) => updateTemplateZone(selectedZone.id, { color: event.target.value })} className={`mt-2 h-[42px] w-full rounded-2xl border px-2 py-1 outline-none ${inputClass}`} />
                            </label>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className={`block text-xs font-black uppercase tracking-[0.12em] ${mutedText}`}>
                              Alignement
                              <select value={selectedZone.align} onChange={(event) => updateTemplateZone(selectedZone.id, { align: event.target.value as DynamicTemplateZone["align"] })} className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm font-semibold normal-case tracking-normal outline-none ${inputClass}`}>
                                {TEMPLATE_ALIGNMENTS.map((align) => <option key={align} value={align}>{align}</option>)}
                              </select>
                            </label>
                            <label className={`block text-xs font-black uppercase tracking-[0.12em] ${mutedText}`}>
                              Texte trop long
                              <select value={selectedZone.overflow} onChange={(event) => updateTemplateZone(selectedZone.id, { overflow: event.target.value as DynamicTemplateZone["overflow"] })} className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm font-semibold normal-case tracking-normal outline-none ${inputClass}`}>
                                {TEMPLATE_OVERFLOWS.map((overflow) => <option key={overflow.value} value={overflow.value}>{overflow.label}</option>)}
                              </select>
                            </label>
                          </div>

                          <label className={`block text-xs font-black uppercase tracking-[0.12em] ${mutedText}`}>
                            Police
                            <input value={selectedZone.fontFamily} onChange={(event) => updateTemplateZone(selectedZone.id, { fontFamily: event.target.value })} className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm font-semibold normal-case tracking-normal outline-none ${inputClass}`} />
                          </label>
                        </div>
                      ) : (
                        <p className={`mt-4 rounded-2xl border border-dashed px-3 py-4 text-center text-sm ${isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                          Ajoutez une première zone dynamique pour rendre ce modèle personnalisable.
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[["isGlobal", "Globale"], ["isActive", "Active"], ["isPremium", "Premium"]].map(([field, label]) => {
                        const enabled = selectedTemplate[field as "isGlobal" | "isActive" | "isPremium"];
                        return <button key={field} type="button" onClick={() => updateSelectedTemplate({ [field]: !enabled })} className={`rounded-2xl border px-3 py-2 text-xs font-bold transition ${enabled ? "border-emerald-500 bg-emerald-500 text-white" : isDark ? "border-white/10 bg-white/5 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"}`}>{label}</button>;
                      })}
                    </div>

                    <button type="button" onClick={saveTemplate} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"><Save className="size-4" />{saving ? "Enregistrement..." : "Enregistrer la fiche"}</button>
                    <button type="button" onClick={deleteTemplate} disabled={deletingId === selectedTemplate.id} className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${isDark ? "border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/20" : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"}`}><Trash2 className="size-4" />{deletingId === selectedTemplate.id ? "Suppression..." : "Supprimer cette affiche"}</button>
                    {status && <p className={`rounded-2xl border px-3 py-2 text-sm ${isDark ? "border-white/10 bg-white/10 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}>{status}</p>}
                  </div>
                ) : <p className={`text-sm ${mutedText}`}>Aucune affiche disponible.</p>}
              </aside>
            </section>
          )}

          {(activeSection === "overview" || activeSection === "presets") && (
            <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
              <div className={`rounded-[2rem] border p-5 ${panelClass}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className={`text-xl font-black ${strongText}`}>Publications automatiques IA proposées</h3>
                    <p className={`mt-1 text-sm ${mutedText}`}>Créez les modèles proposés par défaut selon le profil utilisateur. L&apos;utilisateur choisira ensuite son horaire, sa date, sa récurrence et ses canaux.</p>
                  </div>
                  <button type="button" onClick={createAutomationPreset} className="rounded-2xl bg-violet-600 px-4 py-2 text-sm font-black text-white">
                    <Plus className="mr-1 inline size-4" />Ajouter une publication IA
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[{ value: "ALL", label: "Tous" }, { value: "GENERAL_DEFAULT", label: "Générales par défaut" }, ...COMMUNITY_PROFILE_OPTIONS].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPresetProfileFilter(option.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                        presetProfileFilter === option.value
                          ? "border-blue-300 bg-blue-600 text-white"
                          : isDark
                            ? "border-white/10 text-slate-300"
                            : "border-slate-200 text-slate-600"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {filteredPresets.map((preset) => (
                    <div key={preset.id} className={`relative rounded-3xl border p-4 ${selectedPreset?.id === preset.id ? "border-violet-300 bg-violet-50" : isDark ? "border-white/10 bg-slate-950/55" : "border-slate-200 bg-white"}`}>
                      <button
                        type="button"
                        aria-label="Supprimer cette automatisation"
                        onClick={() => deleteAutomationPreset(preset)}
                        className="absolute right-3 top-3 rounded-full bg-red-500 p-1.5 text-white shadow-sm hover:bg-red-600"
                      >
                        <X className="size-3.5" />
                      </button>
                      <button type="button" onClick={() => setSelectedPresetId(preset.id)} className="block w-full pr-8 text-left">
                        <p className={`font-black ${strongText}`}>{preset.icon ?? "⚡"} {preset.title}</p>
                        <p className={`mt-1 text-xs ${mutedText}`}>{preset.category}</p>
                        <p className={`mt-2 line-clamp-2 text-sm ${mutedText}`}>{preset.description ?? "Aucune description."}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={`rounded-full px-2 py-1 text-xs font-bold ${preset.isActive ? "bg-emerald-500/15 text-emerald-600" : "bg-slate-500/15 text-slate-500"}`}>{preset.isActive ? "Actif" : "Inactif"}</span>
                          {(preset.clientTypes ?? []).map((clientType) => (
                            <span key={clientType} className="rounded-full bg-blue-500/15 px-2 py-1 text-xs font-bold text-blue-700">
                              {COMMUNITY_PROFILE_OPTIONS.find((option) => option.value === clientType)?.label ?? clientType}
                            </span>
                          ))}
                          {preset.usageCount > 0 && <span className="rounded-full bg-amber-500/15 px-2 py-1 text-xs font-bold text-amber-700">{preset.usageCount} compte(s)</span>}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <aside className={`rounded-[2rem] border p-5 ${panelClass}`}>
                {selectedPreset ? (
                  <div className="space-y-4">
                    <h3 className={`font-black ${strongText}`}>Fiche publication IA</h3>
                    <label className={`block text-sm font-semibold ${strongText}`}>Titre<input value={selectedPreset.title} onChange={(event) => updateSelectedPreset({ title: event.target.value })} className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`} /></label>
                    <label className={`block text-sm font-semibold ${strongText}`}>Description<textarea value={selectedPreset.description ?? ""} onChange={(event) => updateSelectedPreset({ description: event.target.value })} rows={4} className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`} /></label>
                    <label className={`block text-sm font-semibold ${strongText}`}>
                      Logique IA interne
                      <textarea
                        value={getSelectedPresetTriggerConfigText("aiInstruction")}
                        onChange={(event) => updateSelectedPresetTriggerConfig({ aiInstruction: event.target.value })}
                        rows={4}
                        className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}
                      />
                      <span className={`mt-1 block text-xs font-normal ${mutedText}`}>Visible seulement par le Super Admin. L&apos;utilisateur ne voit jamais ce prompt.</span>
                    </label>
                    <label className={`block text-sm font-semibold ${strongText}`}>
                      Réponse courte de l&apos;Assistant IA
                      <textarea
                        value={getSelectedPresetTriggerConfigText("assistantMessage")}
                        onChange={(event) => updateSelectedPresetTriggerConfig({ assistantMessage: event.target.value })}
                        rows={3}
                        className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}
                      />
                    </label>
                    <label className={`block text-sm font-semibold ${strongText}`}>Catégorie éventuelle<input value={selectedPreset.category} onChange={(event) => updateSelectedPreset({ category: event.target.value })} className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`} /></label>
                    <div className="space-y-2">
                      <p className={`text-sm font-semibold ${strongText}`}>Profil utilisateur concerné</p>
                      <div className="flex flex-wrap gap-2">
                        {COMMUNITY_PROFILE_OPTIONS.map((option) => {
                          const selected = selectedPreset.clientTypes?.includes(option.value) ?? false;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => toggleSelectedPresetClientType(option.value)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                                selected
                                  ? "border-blue-300 bg-blue-600 text-white"
                                  : isDark
                                    ? "border-white/10 text-slate-300"
                                    : "border-slate-200 text-slate-600"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className={`text-xs ${mutedText}`}>
                        Si aucun profil n&apos;est coché, cette publication IA ne sera proposée à aucun nouveau profil métier.
                      </p>
                    </div>
                    <button type="button" onClick={() => updateSelectedPreset({ isActive: !selectedPreset.isActive })} className={`w-full rounded-2xl px-3 py-2 text-xs font-black ${selectedPreset.isActive ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700"}`}>{selectedPreset.isActive ? "Actif" : "Inactif"}</button>
                    <button type="button" onClick={saveAutomationPreset} className="w-full rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white"><Save className="mr-1 inline size-4" />Enregistrer</button>
                  </div>
                ) : <p className={`text-sm ${mutedText}`}>Aucune publication IA.</p>}
              </aside>
            </section>
          )}

          {(activeSection === "overview" || activeSection === "automations") && (
            <section className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <div className={`rounded-[2rem] border p-5 ${panelClass}`}>
                <h3 className={`flex items-center gap-2 text-xl font-black ${strongText}`}><Zap className="size-5 text-violet-500" />Automatisations prédéfinies</h3>
                <p className={`mt-1 text-sm ${mutedText}`}>Choisissez une communauté puis ajoutez un modèle au compte client.</p>
                <select value={selectedAutomationCommunity} onChange={(event) => setAutomationCommunityFilter(event.target.value)} className={`mt-4 w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}>
                  {communities.map((community) => <option key={community.id} value={community.id}>{community.name}{community.city ? ` · ${community.city}` : ""}</option>)}
                </select>
                <div className="mt-4 space-y-3">
                  {allPresets.filter((preset) => preset.isActive).map((preset) => (
                    <div key={preset.id} className={`rounded-3xl border p-4 ${isDark ? "border-white/10 bg-slate-950/55" : "border-slate-200 bg-slate-50"}`}>
                      <div className="flex gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">{preset.icon ?? "⚡"}</div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-black ${strongText}`}>{preset.title}</p>
                          <p className={`mt-1 text-xs leading-5 ${mutedText}`}>{preset.description}</p>
                          <button type="button" onClick={() => createPresetAutomation(preset.id)} disabled={automationSaving === preset.id} className="mt-3 rounded-xl bg-violet-600 px-3 py-2 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-60">
                            {automationSaving === preset.id ? "Ajout..." : "Ajouter au compte"}
                          </button>
                          <button type="button" onClick={() => createPresetAutomationForBethHabad(preset.id)} disabled={automationSaving === `beth-habad-${preset.id}`} className="mt-2 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-black text-violet-700 hover:bg-violet-50 disabled:opacity-60">
                            {automationSaving === `beth-habad-${preset.id}` ? "Création..." : `Créer pour ${bethHabadCommunities.length} Beth Habad`}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <select value={automationCommunityFilter} onChange={(event) => setAutomationCommunityFilter(event.target.value)} className={`rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}>
                      <option value="ALL">Tous les comptes</option>
                      <option value="BETH_HABAD">Beth Habad</option>
                      {communities.map((community) => <option key={community.id} value={community.id}>{community.name}</option>)}
                    </select>
                    <button type="button" onClick={openAdminAutomationForm} className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-black text-white shadow-sm shadow-violet-200 hover:bg-violet-700">
                      <Plus className="size-4" />
                      Créer une automatisation
                    </button>
                  </div>
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
                              {isBethHabadCommunity(communities.find((community) => community.id === automation.communityId)) && (
                                <span className="rounded-full bg-blue-500/15 px-2 py-1 text-xs font-bold text-blue-700">Beth Habad</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => toggleAdminAutomation(automation)} disabled={automationSaving === automation.id} className={`rounded-xl px-3 py-2 text-xs font-black ${automation.isActive ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"} disabled:opacity-60`}>
                              {automationSaving === automation.id ? "Modification..." : automation.isActive ? "Mettre en pause" : "Activer"}
                            </button>
                            <button type="button" onClick={() => editAdminAutomation(automation)} disabled={automationSaving === automation.id} className={`rounded-xl border px-3 py-2 text-xs font-black ${isDark ? "border-white/10 text-slate-200 hover:bg-white/10" : "border-slate-200 text-slate-700 hover:bg-slate-50"} disabled:opacity-60`}>
                              Modifier
                            </button>
                            <button type="button" onClick={() => deleteAdminAutomation(automation)} disabled={automationSaving === automation.id} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-60">
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredAutomations.length === 0 && <p className={`rounded-2xl border p-4 text-sm ${isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>Aucune automatisation pour ce filtre.</p>}
                </div>
              </div>
            </section>
          )}

          {adminAutomationFormOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
              <div className={`max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border p-5 shadow-2xl ${panelClass}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className={`text-xl font-black ${strongText}`}>Créer une automatisation</h3>
                    <p className={`mt-1 text-sm ${mutedText}`}>Choisissez un compte utilisateur et configurez une automatisation depuis le Super Admin.</p>
                  </div>
                  <button type="button" onClick={() => setAdminAutomationFormOpen(false)} className={`rounded-2xl border p-2 ${isDark ? "border-white/10 hover:bg-white/10" : "border-slate-200 hover:bg-slate-50"}`}>
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className={`space-y-1.5 text-sm font-bold ${strongText}`}>
                    Compte cible
                    <select value={adminAutomationForm.communityId} onChange={(event) => updateAdminAutomationForm({ communityId: event.target.value })} className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}>
                      {communities.map((community) => (
                        <option key={community.id} value={community.id}>
                          {community.name}{community.city ? ` · ${community.city}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={`space-y-1.5 text-sm font-bold ${strongText}`}>
                    Nom
                    <input value={adminAutomationForm.name} onChange={(event) => updateAdminAutomationForm({ name: event.target.value })} className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`} />
                  </label>
                  <label className={`space-y-1.5 text-sm font-bold ${strongText}`}>
                    Déclencheur
                    <select value={adminAutomationForm.trigger} onChange={(event) => updateAdminAutomationForm({ trigger: event.target.value })} className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}>
                      {AUTOMATION_TRIGGER_TYPES.map((trigger) => <option key={trigger.value} value={trigger.value}>{trigger.label}</option>)}
                    </select>
                  </label>
                  <label className={`space-y-1.5 text-sm font-bold ${strongText}`}>
                    Type de contenu
                    <select value={adminAutomationForm.contentType} onChange={(event) => updateAdminAutomationForm({ contentType: event.target.value })} className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}>
                      {AUTOMATION_CONTENT_TYPES.map((contentType) => <option key={contentType.value} value={contentType.value}>{contentType.label}</option>)}
                    </select>
                  </label>
                  {adminAutomationForm.trigger !== "MANUAL" && (
                    <>
                      <label className={`space-y-1.5 text-sm font-bold ${strongText}`}>
                        Date d&apos;envoi
                        <input type="date" value={adminAutomationForm.date} onChange={(event) => updateAdminAutomationForm({ date: event.target.value })} className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`} />
                      </label>
                      <label className={`space-y-1.5 text-sm font-bold ${strongText}`}>
                        Jour
                        <select value={adminAutomationForm.day} onChange={(event) => updateAdminAutomationForm({ day: event.target.value })} className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}>
                          {AUTOMATION_DAY_TYPES.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                        </select>
                      </label>
                      <label className={`space-y-1.5 text-sm font-bold ${strongText}`}>
                        Heure
                        <input type="time" value={adminAutomationForm.time} onChange={(event) => updateAdminAutomationForm({ time: event.target.value })} className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`} />
                      </label>
                    </>
                  )}
                  <label className={`space-y-1.5 text-sm font-bold ${strongText} md:col-span-2`}>
                    Description
                    <textarea value={adminAutomationForm.description} onChange={(event) => updateAdminAutomationForm({ description: event.target.value })} rows={2} className={`w-full resize-none rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`} />
                  </label>
                  <label className={`space-y-1.5 text-sm font-bold ${strongText} md:col-span-2`}>
                    Message à préparer
                    <textarea value={adminAutomationForm.message} onChange={(event) => updateAdminAutomationForm({ message: event.target.value })} rows={3} placeholder="Exemple : Rappel du cours de Torah ce soir à 20h30." className={`w-full resize-none rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`} />
                  </label>
                  <div className="space-y-2 md:col-span-2">
                    <p className={`text-sm font-bold ${strongText}`}>Canaux</p>
                    <div className="flex flex-wrap gap-2">
                      {AUTOMATION_CHANNEL_TYPES.map((channel) => (
                        <button
                          key={channel}
                          type="button"
                          onClick={() => toggleAdminAutomationChannel(channel)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                            adminAutomationForm.channels.includes(channel)
                              ? "border-violet-300 bg-violet-600 text-white"
                              : isDark
                                ? "border-white/10 text-slate-300 hover:bg-white/10"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {channel}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-sm font-bold md:col-span-2 ${isDark ? "border-white/10" : "border-slate-200"} ${strongText}`}>
                    Automatisation active
                    <input type="checkbox" checked={adminAutomationForm.isActive} onChange={(event) => updateAdminAutomationForm({ isActive: event.target.checked })} className="h-5 w-5 accent-violet-600" />
                  </label>
                </div>

                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => setAdminAutomationFormOpen(false)} className={`rounded-2xl border px-4 py-2 text-sm font-black ${isDark ? "border-white/10 text-slate-200 hover:bg-white/10" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>
                    Annuler
                  </button>
                  <button type="button" onClick={submitAdminAutomationForm} disabled={automationSaving === "admin-create"} className="rounded-2xl bg-violet-600 px-4 py-2 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-60">
                    {automationSaving === "admin-create" ? "Création..." : "Créer l'automatisation"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "pricing" && (
            <section className={`mt-6 rounded-[2rem] border p-5 shadow-sm ${panelClass}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className={`flex items-center gap-2 text-2xl font-black ${strongText}`}>
                    <CreditCard className="size-6 text-blue-500" />
                    Tarification de lancement
                  </h3>
                  <p className={`mt-2 max-w-2xl text-sm leading-6 ${mutedText}`}>
                    Ces valeurs alimentent les pages Facturation, Onboarding et les pop-ups de paiement.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={saveBillingPricing}
                  disabled={billingSaving}
                  className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  <Save className="mr-1 inline size-4" />
                  {billingSaving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>

              {status && (
                <p className={`mt-4 rounded-2xl border px-3 py-2 text-sm ${isDark ? "border-white/10 bg-white/10 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                  {status}
                </p>
              )}

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <label className={`text-sm font-semibold ${strongText}`}>
                  Tarif normal HT mensuel
                  <input
                    value={billingDraft.basePriceEuros}
                    onChange={(event) => setBillingDraft((current) => ({ ...current, basePriceEuros: event.target.value }))}
                    className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}
                    inputMode="decimal"
                    placeholder="19.99"
                  />
                </label>
                <label className={`text-sm font-semibold ${strongText}`}>
                  Tarif réduit HT mensuel
                  <input
                    value={billingDraft.launchPriceEuros}
                    onChange={(event) => setBillingDraft((current) => ({ ...current, launchPriceEuros: event.target.value }))}
                    className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}
                    inputMode="decimal"
                    placeholder="9.99"
                  />
                </label>
                <label className={`text-sm font-semibold ${strongText}`}>
                  Date de fin du tarif réduit
                  <input
                    type="date"
                    value={billingDraft.launchEndsAt}
                    onChange={(event) => setBillingDraft((current) => ({ ...current, launchEndsAt: event.target.value }))}
                    className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}
                  />
                </label>
                <div className={`rounded-3xl border p-4 ${isDark ? "border-blue-300/20 bg-blue-300/10" : "border-blue-100 bg-blue-50"}`}>
                  <p className={`text-xs font-black uppercase tracking-[0.16em] ${isDark ? "text-blue-100" : "text-blue-700"}`}>Aperçu public</p>
                  <p className={`mt-3 text-sm font-bold ${mutedText}`}>
                    <span className="line-through">{billingDraft.basePriceEuros || "19.99"} € HT</span>
                    <span className={`ml-3 text-2xl font-black ${isDark ? "text-white" : "text-blue-700"}`}>
                      {billingDraft.launchPriceEuros || "9.99"} € HT
                    </span>
                    <span className="ml-1 text-xs">/ mois</span>
                  </p>
                </div>
              </div>

              <label className={`mt-5 block text-sm font-semibold ${strongText}`}>
                Message de lancement
                <textarea
                  value={billingDraft.launchMessage}
                  onChange={(event) => setBillingDraft((current) => ({ ...current, launchMessage: event.target.value }))}
                  rows={4}
                  className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm outline-none ${inputClass}`}
                  placeholder="Offre de lancement..."
                />
              </label>
            </section>
          )}

          {activeSection === "leads" && (
            <section className="mt-6">
              <div className={`rounded-[2rem] border p-5 shadow-sm ${panelClass}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className={`text-xl font-black ${strongText}`}>Leads</h3>
                    <p className={`mt-1 text-sm ${mutedText}`}>
                      {contactLeads.length} demande(s) reçue(s) depuis le formulaire de contact public.
                    </p>
                  </div>
                  <div className={`rounded-2xl border px-4 py-3 text-sm font-black ${isDark ? "border-white/10 bg-white/5 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                    Emails envoyés : {contactLeads.filter((lead) => lead.emailSentAt).length}/{contactLeads.length}
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {contactLeads.length === 0 ? (
                    <p className={`rounded-2xl border border-dashed p-6 text-sm ${isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                      Aucun lead pour le moment.
                    </p>
                  ) : (
                    contactLeads.map((lead) => (
                      <article key={lead.id} className={`rounded-3xl border p-4 ${isDark ? "border-white/10 bg-slate-950/55" : "border-slate-200 bg-white"}`}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className={`text-lg font-black ${strongText}`}>{lead.name}</h4>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${lead.status === "NEW" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                                {lead.status}
                              </span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${lead.emailSentAt ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                {lead.emailSentAt ? "Email Resend envoyé" : "Email à vérifier"}
                              </span>
                            </div>
                            <p className={`mt-1 text-sm font-semibold ${mutedText}`}>{lead.subject}</p>
                            <div className={`mt-3 grid gap-2 text-sm ${mutedText}`}>
                              <p><span className={`font-black ${strongText}`}>Email :</span> <a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline">{lead.email}</a></p>
                              {lead.phone && <p><span className={`font-black ${strongText}`}>Téléphone :</span> <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">{lead.phone}</a></p>}
                              {lead.organization && <p><span className={`font-black ${strongText}`}>Organisation :</span> {lead.organization}</p>}
                              {lead.pageUrl && <p><span className={`font-black ${strongText}`}>Page :</span> {lead.pageUrl}</p>}
                              <p><span className={`font-black ${strongText}`}>Reçu le :</span> {new Date(lead.createdAt).toLocaleString("fr-FR")}</p>
                            </div>
                          </div>
                          <div className={`rounded-2xl border p-3 text-xs ${isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                            <p><span className="font-black">IP :</span> {lead.ipAddress ?? "Non renseignée"}</p>
                            {lead.emailError && <p className="mt-2 text-red-600"><span className="font-black">Erreur email :</span> {lead.emailError}</p>}
                          </div>
                        </div>
                        <div className={`mt-4 rounded-2xl border p-4 text-sm leading-7 ${isDark ? "border-white/10 bg-white/5 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                          {lead.message}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>
          )}

          {activeSection === "users" && (
            <section className="mt-6">
              <div className={`rounded-[2rem] border p-5 shadow-sm ${panelClass}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className={`text-xl font-black ${strongText}`}>Comptes utilisateurs</h3>
                    <p className={`mt-1 text-sm ${mutedText}`}>{users.length} compte(s) inscrit(s). La suppression efface toutes les données associées en cascade.</p>
                  </div>
                </div>

                {status && (
                  <p className={`mt-4 rounded-2xl border px-3 py-2 text-sm ${isDark ? "border-white/10 bg-white/10 text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                    {status}
                  </p>
                )}

                <div className="mt-5 space-y-3">
                  {users.map((user) => {
                    const community = communities.find((community) => community.id === user.communityId);
                    const planTier = planToTier(user.communityPlan);
                    const planTierMeta = USER_PLAN_TIERS.find((item) => item.value === planTier) ?? USER_PLAN_TIERS[0];
                    const billingSince = user.adminBillingSince
                      ? new Date(user.adminBillingSince).toISOString().slice(0, 10)
                      : formatDateInput(new Date());
                    return (
                      <div key={user.id} className={`grid gap-4 rounded-3xl border p-4 xl:grid-cols-[1fr_520px] ${isDark ? "border-white/10 bg-slate-950/55" : "border-slate-200 bg-white"}`}>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`font-black ${strongText}`}>{user.name ?? user.email}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${user.role === "SUPER_ADMIN" ? "bg-rose-500/15 text-rose-600" : user.role === "ADMIN" ? "bg-amber-500/15 text-amber-600" : "bg-slate-500/15 text-slate-500"}`}>
                              {user.role}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              planTier === "BUSINESS"
                                ? "bg-violet-500/15 text-violet-600"
                                : planTier === "PRO"
                                  ? "bg-emerald-500/15 text-emerald-600"
                                  : "bg-slate-500/15 text-slate-500"
                            }`}>
                              {planTierMeta.label}
                            </span>
                          </div>
                          <p className={`mt-0.5 text-sm ${mutedText}`}>{user.email}</p>
                          {(community || user.communityName) && (
                            <p className={`mt-0.5 text-xs ${mutedText}`}>
                              {user.communityName ?? community?.name}{(user.communityCity ?? community?.city) ? ` · ${user.communityCity ?? community?.city}` : ""}
                            </p>
                          )}
                          <div className={`mt-3 grid gap-2 rounded-2xl border px-3 py-2 text-xs ${isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                            <p>
                              <span className="font-black">Plan technique :</span>{" "}
                              {user.communityPlan ?? "Aucune communauté"}
                            </p>
                            <p>
                              <span className="font-black">Abonnement depuis :</span>{" "}
                              {user.adminBillingSince ? new Date(user.adminBillingSince).toLocaleDateString("fr-FR") : "Non renseigné"}
                            </p>
                            {user.subscription && (
                              <p>
                                <span className="font-black">Subscription :</span> {user.subscription.status} · {user.subscription.plan}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-3">
                          <form
                            className={`grid gap-3 rounded-2xl border p-3 ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}
                            onSubmit={(event) => {
                              event.preventDefault();
                              const formData = new FormData(event.currentTarget);
                              const planTier = String(formData.get("planTier")) as PlanTier;
                              const startedAt = String(formData.get("subscriptionStartedAt") ?? "");
                              void saveUserBilling(user, planTier, startedAt);
                            }}
                          >
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className={`text-xs font-black uppercase tracking-[0.14em] ${mutedText}`}>
                                Offre et permissions
                                <select
                                  name="planTier"
                                  defaultValue={planTier}
                                  disabled={!user.communityId || savingUserBillingId === user.id}
                                  className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm font-semibold normal-case tracking-normal outline-none ${inputClass}`}
                                >
                                  {USER_PLAN_TIERS.map((tier) => (
                                    <option key={tier.value} value={tier.value}>{tier.label}</option>
                                  ))}
                                </select>
                              </label>
                              <label className={`text-xs font-black uppercase tracking-[0.14em] ${mutedText}`}>
                                Abonnement depuis
                                <input
                                  name="subscriptionStartedAt"
                                  type="date"
                                  defaultValue={billingSince}
                                  disabled={!user.communityId || savingUserBillingId === user.id}
                                  className={`mt-2 w-full rounded-2xl border px-3 py-2 text-sm font-semibold normal-case tracking-normal outline-none ${inputClass}`}
                                />
                              </label>
                            </div>
                            <p className={`text-xs ${mutedText}`}>
                              Le choix met immédiatement à jour le plan de la communauté et les permissions associées. {tierLabel(planTier)} : {planTierMeta.helper}.
                            </p>
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                type="submit"
                                disabled={!user.communityId || savingUserBillingId === user.id}
                                className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2 text-sm font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Save className={`size-4 ${savingUserBillingId === user.id ? "animate-pulse" : ""}`} />
                                {savingUserBillingId === user.id ? "Sauvegarde..." : "Enregistrer"}
                              </button>
                            </div>
                          </form>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => setUserDeleteConfirm(user)}
                              disabled={deletingUserId === user.id}
                              className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${isDark ? "border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/20" : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"}`}
                            >
                              <Trash2 className={`size-4 ${deletingUserId === user.id ? "animate-pulse" : ""}`} />
                              {deletingUserId === user.id ? "Suppression..." : "Supprimer"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {userDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
              <div className={`w-full max-w-md rounded-[2rem] border p-6 shadow-2xl ${panelClass}`}>
                <h3 className={`text-lg font-black ${strongText}`}>Supprimer ce compte ?</h3>
                <p className={`mt-3 text-sm leading-6 ${mutedText}`}>
                  Vous êtes sur le point de supprimer définitivement le compte de{" "}
                  <span className={`font-black ${strongText}`}>{userDeleteConfirm.email}</span>.
                </p>
                <p className={`mt-2 rounded-2xl border px-3 py-2 text-sm ${isDark ? "border-red-400/20 bg-red-500/10 text-red-200" : "border-red-200 bg-red-50 text-red-700"}`}>
                  ⚠ Cette action est irréversible. Toutes les données associées (communauté, conversations, contenus, automatisations, médias, etc.) seront supprimées en cascade.
                </p>
                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setUserDeleteConfirm(null)}
                    className={`rounded-2xl border px-4 py-2 text-sm font-black ${isDark ? "border-white/10 text-slate-200 hover:bg-white/10" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteUser(userDeleteConfirm)}
                    disabled={deletingUserId === userDeleteConfirm.id}
                    className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {deletingUserId === userDeleteConfirm.id ? "Suppression en cours..." : "Oui, supprimer définitivement"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "development" && (
            <section className="mt-6 space-y-6">
              <div className={`rounded-[2rem] border p-5 shadow-sm ${panelClass}`}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 className={`text-xl font-black ${strongText}`}>Onboarding de demonstration</h3>
                    <p className={`mt-2 max-w-3xl text-sm leading-6 ${mutedText}`}>
                      Lancez une copie frontend du vrai onboarding avec les donnees fictives Chlomi-test et test.
                      Les appels OAuth, upload et finalisation sont simules, sans creation de compte ni ecriture en base.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDevelopmentPreviewRun((run) => run + 1);
                      setShowDevelopmentPreview(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-600"
                  >
                    <PlayCircle className="size-4" />
                    Lancer l&apos;onboarding de demonstration
                  </button>
                </div>
              </div>

              {showDevelopmentPreview && (
                <div className={`overflow-hidden rounded-[2rem] border shadow-sm ${isDark ? "border-white/10 bg-white" : "border-slate-200 bg-white"}`}>
                  <OnboardingWizard
                    key={developmentPreviewRun}
                    userId="demo-user"
                    userName="test"
                    communityId="demo-community"
                    initialData={demoOnboardingData}
                    simulationMode
                  />
                </div>
              )}
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
