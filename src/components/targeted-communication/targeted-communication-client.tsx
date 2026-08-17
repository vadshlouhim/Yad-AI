"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Check,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Info,
  ListChecks,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  QrCode,
  Save,
  Send,
  Settings2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  TargetedAutomationDto,
  TargetedCategoryDto,
  TargetedDashboardData,
  TargetedSettingsDto,
} from "@/lib/targeted-communication/types";

const PRIMARY_BUTTON = "bg-[#421388] text-white shadow-sm hover:bg-[#35106f]";
const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const VARIABLES = ["{Prénom}", "{Nom}", "{Événement}", "{Date}", "{Heure}", "{Adresse}", "{Lien}"];
const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#421388] focus:ring-4 focus:ring-violet-100";
const labelClass = "mb-1.5 block text-sm font-bold text-slate-700";

type Tab = "categories" | "automations" | "member";
type AutomationForm = {
  id?: string;
  name: string;
  categoryId: string;
  weekday: number;
  sendTime: string;
  eventTime: string;
  eventName: string;
  address: string;
  link: string;
  message: string;
  mode: "AUTO" | "CONFIRM";
  skipYomTov: boolean;
  skipHolHamoed: boolean;
  skipSchoolHolidays: boolean;
  schoolZone: "A" | "B" | "C";
  isActive: boolean;
};

const emptyAutomation: AutomationForm = {
  name: "",
  categoryId: "",
  weekday: 2,
  sendTime: "18:00",
  eventTime: "20:00",
  eventName: "",
  address: "",
  link: "",
  message: "Chalom {Prénom}, petit rappel : {Événement} aura lieu aujourd’hui à {Heure} au {Adresse}",
  mode: "CONFIRM",
  skipYomTov: true,
  skipHolHamoed: true,
  skipSchoolHolidays: true,
  schoolZone: "C",
  isActive: true,
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Une erreur est survenue.");
  return payload as T;
}

export function TargetedCommunicationClient() {
  const [data, setData] = useState<TargetedDashboardData | null>(null);
  const [settings, setSettings] = useState<TargetedSettingsDto | null>(null);
  const [tab, setTab] = useState<Tab>("categories");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [automationForm, setAutomationForm] = useState<AutomationForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [occurrenceEdit, setOccurrenceEdit] = useState<{
    automation: TargetedAutomationDto;
    message: string;
    eventTime: string;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const result = await api<TargetedDashboardData>("/api/communication-ciblee");
      setData(result);
      setSettings(result.settings);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const publicUrl = useMemo(
    () => data && typeof window !== "undefined" ? `${window.location.origin}/communication/${data.community.slug}` : "",
    [data],
  );

  useEffect(() => {
    if (!publicUrl) return;
    void QRCode.toDataURL(publicUrl, {
      width: 520,
      margin: 2,
      color: { dark: "#421388", light: "#ffffff" },
    }).then(setQrCode);
  }, [publicUrl]);

  async function createCategory(event: React.FormEvent) {
    event.preventDefault();
    if (!categoryName.trim()) return;
    try {
      setSaving(true);
      await api("/api/communication-ciblee/categories", {
        method: "POST",
        body: JSON.stringify({ name: categoryName }),
      });
      setCategoryName("");
      setShowCategoryForm(false);
      toast.success("Catégorie créée");
      await load();
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "Création impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function updateCategory(id: string, body: Record<string, unknown>) {
    try {
      await api(`/api/communication-ciblee/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setEditingCategory(null);
      await load();
      toast.success("Catégorie mise à jour");
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : "Modification impossible.");
    }
  }

  async function deleteCategory(category: TargetedCategoryDto) {
    if (!window.confirm(`Supprimer « ${category.name} » ?`)) return;
    try {
      await api(`/api/communication-ciblee/categories/${category.id}`, { method: "DELETE" });
      await load();
      toast.success("Catégorie supprimée");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Suppression impossible.");
    }
  }

  async function moveCategory(index: number, direction: -1 | 1) {
    if (!data) return;
    const next = [...data.categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setData({ ...data, categories: next });
    try {
      await api("/api/communication-ciblee/categories", {
        method: "PATCH",
        body: JSON.stringify({ ids: next.map((category) => category.id) }),
      });
    } catch (moveError) {
      toast.error(moveError instanceof Error ? moveError.message : "Réorganisation impossible.");
      await load();
    }
  }

  function openAutomation(automation?: TargetedAutomationDto) {
    setAutomationForm(automation ? {
      id: automation.id,
      name: automation.name,
      categoryId: automation.categoryId,
      weekday: automation.weekday,
      sendTime: automation.sendTime,
      eventTime: automation.eventTime ?? "",
      eventName: automation.eventName ?? "",
      address: automation.address ?? "",
      link: automation.link ?? "",
      message: automation.message,
      mode: automation.mode,
      skipYomTov: automation.skipYomTov,
      skipHolHamoed: automation.skipHolHamoed,
      skipSchoolHolidays: automation.skipSchoolHolidays,
      schoolZone: automation.schoolZone,
      isActive: automation.isActive,
    } : {
      ...emptyAutomation,
      categoryId: data?.categories.find((category) => category.isActive)?.id ?? "",
      address: data?.community.address ?? "",
    });
  }

  async function saveAutomation(event: React.FormEvent) {
    event.preventDefault();
    if (!automationForm) return;
    try {
      setSaving(true);
      await api(
        automationForm.id
          ? `/api/communication-ciblee/automations/${automationForm.id}`
          : "/api/communication-ciblee/automations",
        {
          method: automationForm.id ? "PATCH" : "POST",
          body: JSON.stringify(automationForm),
        },
      );
      setAutomationForm(null);
      await load();
      toast.success(automationForm.id ? "Envoi mis à jour" : "Envoi programmé");
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAutomation(automation: TargetedAutomationDto) {
    if (!window.confirm(`Supprimer « ${automation.name} » ?`)) return;
    try {
      await api(`/api/communication-ciblee/automations/${automation.id}`, { method: "DELETE" });
      await load();
      toast.success("Envoi supprimé");
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Suppression impossible.");
    }
  }

  async function toggleAutomation(automation: TargetedAutomationDto) {
    try {
      await api(`/api/communication-ciblee/automations/${automation.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !automation.isActive }),
      });
      await load();
      toast.success(automation.isActive ? "Envoi mis en pause" : "Envoi activé");
    } catch (toggleError) {
      toast.error(toggleError instanceof Error ? toggleError.message : "Modification impossible.");
    }
  }

  async function createWithAi() {
    if (!aiPrompt.trim() || !automationForm) return;
    try {
      setAiLoading(true);
      const result = await api<Partial<AutomationForm>>("/api/communication-ciblee/ai", {
        method: "POST",
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      setAutomationForm({ ...automationForm, ...result, categoryId: result.categoryId || automationForm.categoryId });
      toast.success("Formulaire prérempli — vérifiez les informations");
    } catch (aiError) {
      toast.error(aiError instanceof Error ? aiError.message : "Création assistée impossible.");
    } finally {
      setAiLoading(false);
    }
  }

  async function occurrenceAction(
    automation: TargetedAutomationDto,
    action: string,
    extra: Record<string, unknown> = {},
  ) {
    try {
      const result = await api<{ sent?: number; total?: number }>(
        `/api/communication-ciblee/automations/${automation.id}/occurrence`,
        { method: "POST", body: JSON.stringify({ action, ...extra }) },
      );
      setOccurrenceEdit(null);
      await load();
      toast.success(
        action === "approve"
          ? `Message envoyé (${result.sent ?? 0}/${result.total ?? 0})`
          : action === "cancel"
            ? "Envoi de cette semaine annulé"
            : "Occurrence modifiée",
      );
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : "Action impossible.");
    }
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;
    try {
      setSaving(true);
      await api("/api/communication-ciblee", {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      await load();
      toast.success("Page membre mise à jour");
    } catch (settingsError) {
      toast.error(settingsError instanceof Error ? settingsError.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <LoaderCircle className="size-7 animate-spin text-[#421388]" />
        <span className="ml-3 text-sm font-semibold text-slate-600">Chargement…</span>
      </div>
    );
  }

  if (error || !data || !settings) {
    const migrationMissing = error.includes("pas encore activé") || error.includes("migration");
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-amber-200 bg-white p-7 shadow-sm sm:p-9">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <TriangleAlert className="size-6" />
          </span>
          <h1 className="mt-5 text-2xl font-black text-slate-950">
            {migrationMissing ? "Activation technique nécessaire" : "Communication ciblée indisponible"}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{error}</p>
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            Aucune catégorie n’a été perdue : la création n’a simplement pas pu être enregistrée.
          </p>
          <Button variant="outline" className="mt-5" onClick={() => { setLoading(true); void load(); }}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof ListChecks; count?: number }> = [
    { id: "categories", label: "Catégories", icon: ListChecks, count: data.categories.length },
    { id: "automations", label: "Envois", icon: CalendarClock, count: data.automations.length },
    { id: "member", label: "Page membre", icon: QrCode },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#421388]">
            <MessageCircle className="size-4" /> WhatsApp personnalisé
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Communication ciblée</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Chaque membre choisit ses sujets. Vous envoyez uniquement les messages utiles.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0 border-violet-200 text-[#421388] hover:bg-violet-50">
          <Link href={publicUrl} target="_blank"><ExternalLink /> Voir la page membre</Link>
        </Button>
      </header>

      <div className="mt-7 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <div className="flex min-w-max gap-1" role="tablist" aria-label="Communication ciblée">
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition",
                  active ? "bg-[#421388] text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                )}
              >
                <Icon className="size-4" />
                {item.label}
                {item.count !== undefined && (
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px]", active ? "bg-white/15" : "bg-slate-100")}>{item.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <main className="mt-5">
        {tab === "categories" && (
          <CategoriesPanel
            categories={data.categories}
            showForm={showCategoryForm}
            setShowForm={setShowCategoryForm}
            categoryName={categoryName}
            setCategoryName={setCategoryName}
            editingCategory={editingCategory}
            editingName={editingName}
            setEditingCategory={setEditingCategory}
            setEditingName={setEditingName}
            saving={saving}
            onCreate={createCategory}
            onUpdate={updateCategory}
            onDelete={deleteCategory}
            onMove={moveCategory}
          />
        )}

        {tab === "automations" && (
          <AutomationsPanel
            categories={data.categories}
            automations={data.automations}
            form={automationForm}
            setForm={setAutomationForm}
            saving={saving}
            aiPrompt={aiPrompt}
            setAiPrompt={setAiPrompt}
            aiLoading={aiLoading}
            onAi={createWithAi}
            onOpen={openAutomation}
            onSave={saveAutomation}
            onDelete={deleteAutomation}
            onToggle={toggleAutomation}
            onOccurrence={occurrenceAction}
            setOccurrenceEdit={setOccurrenceEdit}
          />
        )}

        {tab === "member" && (
          <MemberPagePanel
            settings={settings}
            setSettings={setSettings}
            publicUrl={publicUrl}
            qrCode={qrCode}
            slug={data.community.slug}
            saving={saving}
            onSave={saveSettings}
          />
        )}
      </main>

      {occurrenceEdit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-4 sm:items-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">Modifier cette semaine</h2>
                <p className="mt-1 text-sm text-slate-500">La programmation habituelle ne changera pas.</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setOccurrenceEdit(null)}><X /></Button>
            </div>
            <label className="mt-5 block">
              <span className={labelClass}>Message exceptionnel</span>
              <textarea className={cn(inputClass, "h-28 py-3")} value={occurrenceEdit.message} onChange={(event) => setOccurrenceEdit({ ...occurrenceEdit, message: event.target.value })} />
            </label>
            <label className="mt-4 block">
              <span className={labelClass}>Heure cette semaine</span>
              <input type="time" className={inputClass} value={occurrenceEdit.eventTime} onChange={(event) => setOccurrenceEdit({ ...occurrenceEdit, eventTime: event.target.value })} />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOccurrenceEdit(null)}>Annuler</Button>
              <Button className={PRIMARY_BUTTON} onClick={() => void occurrenceAction(occurrenceEdit.automation, "edit", { messageOverride: occurrenceEdit.message, eventTimeOverride: occurrenceEdit.eventTime })}>
                <Save /> Enregistrer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">{children}</section>;
}

function CategoriesPanel(props: {
  categories: TargetedCategoryDto[];
  showForm: boolean;
  setShowForm: (value: boolean) => void;
  categoryName: string;
  setCategoryName: (value: string) => void;
  editingCategory: string | null;
  editingName: string;
  setEditingCategory: (value: string | null) => void;
  setEditingName: (value: string) => void;
  saving: boolean;
  onCreate: (event: React.FormEvent) => void;
  onUpdate: (id: string, body: Record<string, unknown>) => Promise<void>;
  onDelete: (category: TargetedCategoryDto) => Promise<void>;
  onMove: (index: number, direction: -1 | 1) => Promise<void>;
}) {
  return (
    <PanelShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">Catégories proposées aux membres</h2>
          <p className="mt-1 text-sm text-slate-500">Un nom suffit. Vous pourrez le modifier plus tard.</p>
        </div>
        {!props.showForm && (
          <Button className={PRIMARY_BUTTON} onClick={() => props.setShowForm(true)}><Plus /> Nouvelle catégorie</Button>
        )}
      </div>

      {props.showForm && (
        <form onSubmit={props.onCreate} className="mt-5 flex flex-col gap-2 rounded-2xl border border-violet-200 bg-violet-50/50 p-3 sm:flex-row">
          <input autoFocus className={cn(inputClass, "flex-1")} value={props.categoryName} onChange={(event) => props.setCategoryName(event.target.value)} placeholder="Ex. Activités jeunes" maxLength={80} required />
          <Button type="submit" loading={props.saving} className={PRIMARY_BUTTON}><Check /> Ajouter</Button>
          <Button type="button" variant="ghost" onClick={() => props.setShowForm(false)}>Annuler</Button>
        </form>
      )}

      {props.categories.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-violet-200 bg-violet-50/30 px-5 py-10 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-violet-100 text-[#421388]"><ListChecks className="size-6" /></span>
          <h3 className="mt-4 font-black text-slate-950">Commencez par une catégorie</h3>
          <p className="mt-1 text-sm text-slate-500">Par exemple : Chabbat, cours du mardi ou activités enfants.</p>
          {!props.showForm && <Button className={cn(PRIMARY_BUTTON, "mt-5")} onClick={() => props.setShowForm(true)}><Plus /> Créer ma première catégorie</Button>}
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {props.categories.map((category, index) => (
            <article key={category.id} className={cn("flex items-center gap-3 rounded-2xl border border-slate-200 p-3 transition", !category.isActive && "bg-slate-50 opacity-70")}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 font-black text-[#421388]">{index + 1}</span>
              {props.editingCategory === category.id ? (
                <form className="flex min-w-0 flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); void props.onUpdate(category.id, { name: props.editingName }); }}>
                  <input autoFocus className={cn(inputClass, "h-10")} value={props.editingName} onChange={(event) => props.setEditingName(event.target.value)} />
                  <Button type="submit" size="icon" className={PRIMARY_BUTTON}><Check /></Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => props.setEditingCategory(null)}><X /></Button>
                </form>
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-950">{category.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{category.isActive ? "Visible par les membres" : "Masquée"}</p>
                </div>
              )}
              <div className="flex shrink-0 items-center gap-0.5">
                <Button size="icon-sm" variant="ghost" disabled={index === 0} onClick={() => void props.onMove(index, -1)} aria-label="Monter"><ArrowUp /></Button>
                <Button size="icon-sm" variant="ghost" disabled={index === props.categories.length - 1} onClick={() => void props.onMove(index, 1)} aria-label="Descendre"><ArrowDown /></Button>
                <Button size="icon-sm" variant="ghost" onClick={() => void props.onUpdate(category.id, { isActive: !category.isActive })} aria-label={category.isActive ? "Masquer" : "Afficher"}>
                  {category.isActive ? <ToggleRight className="text-emerald-600" /> : <ToggleLeft />}
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => { props.setEditingCategory(category.id); props.setEditingName(category.name); }} aria-label="Renommer"><Pencil /></Button>
                <Button size="icon-sm" variant="ghost" className="text-red-500" onClick={() => void props.onDelete(category)} aria-label="Supprimer"><Trash2 /></Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

function AutomationsPanel(props: {
  categories: TargetedCategoryDto[];
  automations: TargetedAutomationDto[];
  form: AutomationForm | null;
  setForm: React.Dispatch<React.SetStateAction<AutomationForm | null>>;
  saving: boolean;
  aiPrompt: string;
  setAiPrompt: (value: string) => void;
  aiLoading: boolean;
  onAi: () => void;
  onOpen: (automation?: TargetedAutomationDto) => void;
  onSave: (event: React.FormEvent) => void;
  onDelete: (automation: TargetedAutomationDto) => Promise<void>;
  onToggle: (automation: TargetedAutomationDto) => Promise<void>;
  onOccurrence: (automation: TargetedAutomationDto, action: string, extra?: Record<string, unknown>) => Promise<void>;
  setOccurrenceEdit: (value: { automation: TargetedAutomationDto; message: string; eventTime: string } | null) => void;
}) {
  const hasActiveCategory = props.categories.some((category) => category.isActive);
  return (
    <PanelShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">Envois programmés</h2>
          <p className="mt-1 text-sm text-slate-500">Un message, une catégorie, un horaire.</p>
        </div>
        {!props.form && (
          <Button className={PRIMARY_BUTTON} disabled={!hasActiveCategory} onClick={() => props.onOpen()}><Plus /> Programmer un envoi</Button>
        )}
      </div>

      {!hasActiveCategory && (
        <div className="mt-5 flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          <Info className="mt-0.5 size-5 shrink-0" /> Créez d’abord une catégorie active.
        </div>
      )}

      {props.form && (
        <AutomationEditor
          form={props.form}
          setForm={props.setForm}
          categories={props.categories}
          saving={props.saving}
          aiPrompt={props.aiPrompt}
          setAiPrompt={props.setAiPrompt}
          aiLoading={props.aiLoading}
          onAi={props.onAi}
          onSubmit={props.onSave}
          onClose={() => props.setForm(null)}
        />
      )}

      {!props.form && props.automations.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center">
          <CalendarClock className="mx-auto size-9 text-slate-300" />
          <h3 className="mt-3 font-black text-slate-950">Aucun envoi programmé</h3>
          <p className="mt-1 text-sm text-slate-500">Programmez votre premier rappel lorsque vos catégories sont prêtes.</p>
        </div>
      )}

      {!props.form && props.automations.length > 0 && (
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {props.automations.map((automation) => {
            const awaiting = automation.occurrences.find((occurrence) => occurrence.status === "AWAITING_VALIDATION");
            return (
              <article key={automation.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-black text-[#421388]">{automation.categoryName}</span>
                    <h3 className="mt-3 truncate font-black text-slate-950">{automation.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{DAYS[automation.weekday]} · {automation.sendTime}</p>
                  </div>
                  <button type="button" onClick={() => void props.onToggle(automation)} className={cn("rounded-full px-3 py-1 text-xs font-black", automation.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>{automation.isActive ? "Actif" : "Pause"}</button>
                </div>
                <p className="mt-4 line-clamp-2 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{automation.message}</p>
                {awaiting && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-bold text-amber-900">Prêt à être envoyé</p>
                    <Button size="sm" className={cn(PRIMARY_BUTTON, "mt-2")} onClick={() => void props.onOccurrence(automation, "approve", { occurrenceId: awaiting.id })}><Send /> Valider</Button>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => props.onOpen(automation)}><Pencil /> Modifier</Button>
                  <Button size="sm" variant="ghost" onClick={() => props.setOccurrenceEdit({ automation, message: automation.message, eventTime: automation.eventTime ?? "" })}><MoreHorizontal /> Cette semaine</Button>
                  <Button size="icon-sm" variant="ghost" className="text-red-500" onClick={() => void props.onDelete(automation)}><Trash2 /></Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PanelShell>
  );
}

function AutomationEditor(props: {
  form: AutomationForm;
  setForm: React.Dispatch<React.SetStateAction<AutomationForm | null>>;
  categories: TargetedCategoryDto[];
  saving: boolean;
  aiPrompt: string;
  setAiPrompt: (value: string) => void;
  aiLoading: boolean;
  onAi: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onClose: () => void;
}) {
  function set<K extends keyof AutomationForm>(key: K, value: AutomationForm[K]) {
    props.setForm((current) => current ? { ...current, [key]: value } : current);
  }
  return (
    <form onSubmit={props.onSubmit} className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/30 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-950">{props.form.id ? "Modifier l’envoi" : "Programmer un envoi"}</h3>
          <p className="mt-1 text-sm text-slate-500">Renseignez uniquement l’essentiel.</p>
        </div>
        <Button type="button" size="icon" variant="ghost" onClick={props.onClose}><X /></Button>
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-xl bg-white p-3 sm:flex-row">
        <input className={cn(inputClass, "flex-1")} value={props.aiPrompt} onChange={(event) => props.setAiPrompt(event.target.value)} placeholder="Décrivez l’envoi en une phrase…" />
        <Button type="button" variant="outline" loading={props.aiLoading} onClick={props.onAi}><Sparkles /> Préremplir avec l’IA</Button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label><span className={labelClass}>Catégorie</span><select className={inputClass} value={props.form.categoryId} onChange={(event) => set("categoryId", event.target.value)} required><option value="">Choisir</option>{props.categories.filter((category) => category.isActive || category.id === props.form.categoryId).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label><span className={labelClass}>Nom de l’envoi</span><input className={inputClass} value={props.form.name} onChange={(event) => set("name", event.target.value)} placeholder="Rappel cours du mardi" required /></label>
        <label><span className={labelClass}>Jour</span><select className={inputClass} value={props.form.weekday} onChange={(event) => set("weekday", Number(event.target.value))}>{DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
        <label><span className={labelClass}>Heure d’envoi</span><input type="time" className={inputClass} value={props.form.sendTime} onChange={(event) => set("sendTime", event.target.value)} required /></label>
      </div>

      <label className="mt-4 block"><span className={labelClass}>Message</span><textarea className={cn(inputClass, "h-28 py-3")} value={props.form.message} onChange={(event) => set("message", event.target.value)} maxLength={3000} required /></label>
      <div className="mt-2 flex flex-wrap gap-1.5">{VARIABLES.map((variable) => <button type="button" key={variable} onClick={() => set("message", `${props.form.message}${props.form.message.endsWith(" ") ? "" : " "}${variable}`)} className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-xs font-bold text-[#421388] hover:bg-violet-50">{variable}</button>)}</div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => set("mode", "AUTO")} className={cn("rounded-xl border p-3 text-left text-sm transition", props.form.mode === "AUTO" ? "border-[#421388] bg-violet-50" : "border-slate-200 bg-white")}><strong className="block text-slate-950">Envoi automatique</strong><span className="text-xs text-slate-500">Le message part seul.</span></button>
        <button type="button" onClick={() => set("mode", "CONFIRM")} className={cn("rounded-xl border p-3 text-left text-sm transition", props.form.mode === "CONFIRM" ? "border-[#421388] bg-violet-50" : "border-slate-200 bg-white")}><strong className="block text-slate-950">Validation avant envoi</strong><span className="text-xs text-slate-500">Vous confirmez chaque message.</span></button>
      </div>

      <details className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-black text-slate-800">Options avancées</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label><span className={labelClass}>Nom de l’événement</span><input className={inputClass} value={props.form.eventName} onChange={(event) => set("eventName", event.target.value)} /></label>
          <label><span className={labelClass}>Heure de l’événement</span><input type="time" className={inputClass} value={props.form.eventTime} onChange={(event) => set("eventTime", event.target.value)} /></label>
          <label><span className={labelClass}>Adresse</span><input className={inputClass} value={props.form.address} onChange={(event) => set("address", event.target.value)} /></label>
          <label><span className={labelClass}>Lien</span><input type="url" className={inputClass} value={props.form.link} onChange={(event) => set("link", event.target.value)} /></label>
        </div>
        <div className="mt-4 space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={props.form.skipYomTov} onChange={(event) => set("skipYomTov", event.target.checked)} className="size-4 accent-[#421388]" /> Ne pas envoyer Yom Tov</label>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={props.form.skipHolHamoed} onChange={(event) => set("skipHolHamoed", event.target.checked)} className="size-4 accent-[#421388]" /> Ne pas envoyer ‘Hol Hamoed</label>
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={props.form.skipSchoolHolidays} onChange={(event) => set("skipSchoolHolidays", event.target.checked)} className="size-4 accent-[#421388]" /> Ne pas envoyer pendant les vacances scolaires</label>
          {props.form.skipSchoolHolidays && <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">Zone <select value={props.form.schoolZone} onChange={(event) => set("schoolZone", event.target.value as "A" | "B" | "C")} className="rounded-lg border border-slate-200 px-2 py-1"><option>A</option><option>B</option><option>C</option></select></label>}
        </div>
      </details>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-semibold text-slate-500"><CheckCircle2 className="size-4 text-emerald-600" /> Le texte restera identique.</p>
        <div className="flex gap-2"><Button type="button" variant="outline" onClick={props.onClose}>Annuler</Button><Button type="submit" loading={props.saving} className={PRIMARY_BUTTON}><Save /> Enregistrer</Button></div>
      </div>
    </form>
  );
}

function MemberPagePanel(props: {
  settings: TargetedSettingsDto;
  setSettings: (settings: TargetedSettingsDto) => void;
  publicUrl: string;
  qrCode: string;
  slug: string;
  saving: boolean;
  onSave: (event: React.FormEvent) => void;
}) {
  return (
    <PanelShell>
      <div>
        <h2 className="text-xl font-black text-slate-950">Page membre</h2>
        <p className="mt-1 text-sm text-slate-500">Partagez le lien. Les membres choisissent leurs sujets en quelques secondes.</p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="rounded-2xl bg-gradient-to-br from-[#421388] to-violet-700 p-6 text-white">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15"><QrCode className="size-5" /></span>
          <h3 className="mt-5 text-xl font-black">Votre page est prête</h3>
          <p className="mt-2 text-sm leading-6 text-violet-100">Envoyez ce lien sur WhatsApp ou affichez le QR code dans votre structure.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button className="bg-white text-[#421388] hover:bg-violet-50" onClick={() => { void navigator.clipboard.writeText(props.publicUrl); toast.success("Lien copié"); }}><Clipboard /> Copier le lien</Button>
            <Button asChild className="border border-white/25 bg-white/10 text-white hover:bg-white/20"><Link href={props.publicUrl} target="_blank"><ExternalLink /> Ouvrir</Link></Button>
          </div>
        </div>
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 p-4 text-center">
          <div className="flex aspect-square w-full max-w-[190px] items-center justify-center rounded-xl bg-white p-2">
            {props.qrCode ? <Image unoptimized width={190} height={190} src={props.qrCode} alt="QR code de la page membre" /> : <LoaderCircle className="animate-spin text-[#421388]" />}
          </div>
          {props.qrCode && <Button asChild variant="ghost" size="sm" className="mt-2 text-[#421388]"><a href={props.qrCode} download={`qr-communication-${props.slug}.png`}><QrCode /> Télécharger</a></Button>}
        </div>
      </div>

      <details className="mt-5 rounded-2xl border border-slate-200">
        <summary className="flex cursor-pointer list-none items-center justify-between p-4 font-black text-slate-800"><span className="flex items-center gap-2"><Settings2 className="size-4 text-[#421388]" /> Personnaliser la page</span><Pencil className="size-4 text-slate-400" /></summary>
        <form onSubmit={props.onSave} className="border-t border-slate-100 p-4 sm:p-5">
          <label className="flex items-center justify-between rounded-xl bg-slate-50 p-3"><span><strong className="block text-sm text-slate-900">Page active</strong><span className="text-xs text-slate-500">Autoriser les inscriptions</span></span><input type="checkbox" checked={props.settings.isActive} onChange={(event) => props.setSettings({ ...props.settings, isActive: event.target.checked })} className="size-5 accent-[#421388]" /></label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label><span className={labelClass}>Nom affiché</span><input className={inputClass} value={props.settings.displayName} onChange={(event) => props.setSettings({ ...props.settings, displayName: event.target.value })} /></label>
            <label><span className={labelClass}>Logo</span><input className={inputClass} value={props.settings.logoUrl} onChange={(event) => props.setSettings({ ...props.settings, logoUrl: event.target.value })} placeholder="URL du logo" /></label>
          </div>
          <label className="mt-4 block"><span className={labelClass}>Titre</span><input className={inputClass} value={props.settings.title} onChange={(event) => props.setSettings({ ...props.settings, title: event.target.value })} /></label>
          <label className="mt-4 block"><span className={labelClass}>Introduction</span><textarea className={cn(inputClass, "h-20 py-3")} value={props.settings.introduction} onChange={(event) => props.setSettings({ ...props.settings, introduction: event.target.value })} /></label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label><span className={labelClass}>Couleur principale</span><input type="color" className="h-11 w-full rounded-xl border border-slate-200 bg-white p-1" value={props.settings.primaryColor} onChange={(event) => props.setSettings({ ...props.settings, primaryColor: event.target.value })} /></label>
            <label><span className={labelClass}>Couleur secondaire</span><input type="color" className="h-11 w-full rounded-xl border border-slate-200 bg-white p-1" value={props.settings.accentColor} onChange={(event) => props.setSettings({ ...props.settings, accentColor: event.target.value })} /></label>
          </div>
          <Button type="submit" loading={props.saving} className={cn(PRIMARY_BUTTON, "mt-5")}><Save /> Enregistrer</Button>
        </form>
      </details>
    </PanelShell>
  );
}
