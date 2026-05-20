"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Save, Sparkles, Calendar, MapPin, Users, AlignLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  defaultValues?: Partial<EventFormData>;
  eventId?: string;
}

interface EventFormData {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  address: string;
  category: string;
  audience: string;
  status: string;
  isRecurring: boolean;
  recurrenceFreq: string;
  recurrenceDays: number[];
  isPublic: boolean;
  notes: string;
}

const CATEGORIES = [
  { value: "SHABBAT", label: "Chabbat", emoji: "🕯️" },
  { value: "HOLIDAY", label: "Fête", emoji: "✡️" },
  { value: "COURSE", label: "Cours", emoji: "📖" },
  { value: "PRAYER", label: "Prière", emoji: "🙏" },
  { value: "COMMUNITY", label: "Communautaire", emoji: "🤝" },
  { value: "YOUTH", label: "Jeunesse", emoji: "🎉" },
  { value: "CULTURAL", label: "Culturel", emoji: "🎭" },
  { value: "FUNDRAISING", label: "Collecte", emoji: "💛" },
  { value: "ANNOUNCEMENT", label: "Annonce", emoji: "📢" },
  { value: "OTHER", label: "Autre", emoji: "📌" },
];

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

const defaultFormData: EventFormData = {
  title: "",
  description: "",
  startDate: new Date().toISOString().split("T")[0],
  startTime: "19:00",
  endDate: "",
  endTime: "",
  location: "",
  address: "",
  category: "COMMUNITY",
  audience: "",
  status: "DRAFT",
  isRecurring: false,
  recurrenceFreq: "WEEKLY",
  recurrenceDays: [],
  isPublic: true,
  notes: "",
};

export function EventForm({ defaultValues, eventId }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<EventFormData>({ ...defaultFormData, ...defaultValues });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "recurrence" | "notes">("details");

  function update(key: keyof EventFormData, value: EventFormData[keyof EventFormData]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleRecurrenceDay(day: number) {
    const days = form.recurrenceDays.includes(day)
      ? form.recurrenceDays.filter((d) => d !== day)
      : [...form.recurrenceDays, day];
    update("recurrenceDays", days);
  }

  async function handleSubmit(statusOverride?: string) {
    if (!form.title.trim()) {
      setError("Le titre est obligatoire.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const startDateTime = new Date(`${form.startDate}T${form.startTime || "00:00"}`);
      const endDateTime = form.endDate
        ? new Date(`${form.endDate}T${form.endTime || "23:59"}`)
        : null;

      const payload = {
        title: form.title,
        description: form.description || null,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime?.toISOString() ?? null,
        location: form.location || null,
        address: form.address || null,
        category: form.category,
        audience: form.audience || null,
        status: statusOverride ?? form.status,
        isRecurring: form.isRecurring,
        recurrenceRule: form.isRecurring
          ? { freq: form.recurrenceFreq, byday: form.recurrenceDays }
          : null,
        isPublic: form.isPublic,
        notes: form.notes || null,
      };

      const url = eventId
        ? `/api/events/${eventId}`
        : "/api/events";
      const method = eventId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur lors de la sauvegarde");
      }

      const data = await res.json();
      router.push(`/dashboard/events/${data.id ?? eventId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      setSaving(false);
    }
  }

  const tabs = [
    { id: "details", label: "Détails" },
    { id: "recurrence", label: "Récurrence" },
    { id: "notes", label: "Notes" },
  ] as const;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          {/* =================== ONGLET DÉTAILS =================== */}
          {activeTab === "details" && (
            <>
              {/* Titre */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Titre de l&apos;événement <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="Ex. Cours de Torah — Paracha Vayikra"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Catégorie */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Catégorie</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => update("category", cat.value)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border-2 py-2.5 px-2 text-xs transition-all",
                        form.category === cat.value
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      )}
                    >
                      <span className="text-lg">{cat.emoji}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                    <Calendar className="size-3.5" />Début <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => update("startDate", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => update("startTime", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Fin (optionnel)</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => update("endDate", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => update("endTime", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Lieu */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  <MapPin className="size-3.5" />Lieu
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="Ex. Grande salle de la synagogue"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Adresse complète (optionnel)"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  <AlignLeft className="size-3.5" />Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Description de l'événement pour l'IA et les contenus générés…"
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none resize-none"
                />
              </div>

              {/* Public */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  <Users className="size-3.5" />Public cible
                </label>
                <input
                  type="text"
                  value={form.audience}
                  onChange={(e) => update("audience", e.target.value)}
                  placeholder="Ex. Toute la communauté, Familles avec enfants, Adultes…"
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Visibilité */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(e) => update("isPublic", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                </label>
                <span className="text-sm text-slate-700">Événement public</span>
              </div>
            </>
          )}

          {/* =================== ONGLET RÉCURRENCE =================== */}
          {activeTab === "recurrence" && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isRecurring}
                    onChange={(e) => update("isRecurring", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
                </label>
                <div>
                  <span className="text-sm font-medium text-slate-700">Événement récurrent</span>
                  <p className="text-xs text-slate-400">Se répète selon une fréquence définie</p>
                </div>
              </div>

              {form.isRecurring && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Fréquence</label>
                    <div className="flex gap-2">
                      {[
                        { value: "DAILY", label: "Quotidien" },
                        { value: "WEEKLY", label: "Hebdomadaire" },
                        { value: "MONTHLY", label: "Mensuel" },
                      ].map((freq) => (
                        <button
                          key={freq.value}
                          type="button"
                          onClick={() => update("recurrenceFreq", freq.value)}
                          className={cn(
                            "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                            form.recurrenceFreq === freq.value
                              ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-white text-slate-600"
                          )}
                        >
                          {freq.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {form.recurrenceFreq === "WEEKLY" && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Jour(s) de la semaine</label>
                      <div className="flex gap-2">
                        {DAYS_FR.map((day, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => toggleRecurrenceDay(i)}
                            className={cn(
                              "w-10 h-10 rounded-full text-xs font-semibold border-2 transition-all",
                              form.recurrenceDays.includes(i)
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-slate-200 bg-white text-slate-600"
                            )}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
                    <strong>💡 Note :</strong> Le moteur d&apos;automatisation générera automatiquement
                    les contenus associés avant chaque occurrence.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================== ONGLET NOTES =================== */}
          {activeTab === "notes" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Notes internes</label>
              <textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Notes privées, informations logistiques, contacts…"
                rows={8}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none resize-none"
              />
              <p className="text-xs text-slate-400">
                Ces notes sont privées et ne seront pas publiées.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={() => router.back()}
          disabled={saving}
        >
          Annuler
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => handleSubmit("DRAFT")}
          disabled={saving}
        >
          <Save className="size-4" />
          Enregistrer brouillon
        </Button>
        <Button
          size="lg"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500"
          onClick={() => handleSubmit("READY")}
          loading={saving}
        >
          <Sparkles className="size-4" />
          Enregistrer et générer les contenus
        </Button>
      </div>
    </div>
  );
}
