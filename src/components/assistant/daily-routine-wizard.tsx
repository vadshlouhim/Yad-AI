"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronRight, ChevronLeft, Plus, X, Check,
  Sparkles, Settings, Clock,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface RoutineItem {
  label: string;
  frequency: string;
  day?: string;
  time?: string;
  channels: string[];
  notes?: string;
}

interface Props {
  communityName: string;
  onSave: (items: RoutineItem[]) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

// ── Données ────────────────────────────────────────────────────────────────

const SUGGESTED_ACTIONS = [
  { label: "Horaires de Chabbat",    icon: "🕯️", defaultFrequency: "Chaque vendredi", defaultDay: "Vendredi",  defaultChannels: ["WHATSAPP", "INSTAGRAM"] },
  { label: "Cours de Torah",         icon: "📖", defaultFrequency: "Hebdomadaire",    defaultDay: undefined,   defaultChannels: ["WHATSAPP"] },
  { label: "Annonce d'événement",    icon: "📅", defaultFrequency: "Selon besoins",   defaultDay: undefined,   defaultChannels: ["WHATSAPP", "INSTAGRAM"] },
  { label: "Vœux de fêtes",          icon: "🎊", defaultFrequency: "Saisonnier",      defaultDay: undefined,   defaultChannels: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"] },
  { label: "Collecte de dons",       icon: "💛", defaultFrequency: "Mensuel",         defaultDay: undefined,   defaultChannels: ["WHATSAPP", "EMAIL"] },
  { label: "Rappel J-1 événement",   icon: "🔔", defaultFrequency: "Avant chaque événement", defaultDay: undefined, defaultChannels: ["WHATSAPP"] },
  { label: "Pensée du jour",         icon: "✨", defaultFrequency: "Quotidien",       defaultDay: undefined,   defaultChannels: ["WHATSAPP", "INSTAGRAM"] },
  { label: "Activités jeunesse",     icon: "🎉", defaultFrequency: "Hebdomadaire",    defaultDay: undefined,   defaultChannels: ["WHATSAPP"] },
  { label: "Programme des femmes",   icon: "🌸", defaultFrequency: "Mensuel",         defaultDay: undefined,   defaultChannels: ["WHATSAPP"] },
  { label: "Accueil nouveaux membres", icon: "👋", defaultFrequency: "Selon besoins", defaultDay: undefined,  defaultChannels: ["WHATSAPP"] },
  { label: "Résumé hebdomadaire",    icon: "📰", defaultFrequency: "Hebdomadaire",    defaultDay: undefined,   defaultChannels: ["EMAIL", "WHATSAPP"] },
  { label: "Communiqué officiel",    icon: "📣", defaultFrequency: "Selon besoins",   defaultDay: undefined,   defaultChannels: ["WHATSAPP", "FACEBOOK", "EMAIL"] },
];

const FREQUENCIES = [
  "Quotidien",
  "Chaque vendredi",
  "Hebdomadaire",
  "Bi-mensuel",
  "Mensuel",
  "Saisonnier",
  "Avant chaque événement",
  "Selon besoins",
];

// Fréquences qui affichent le sélecteur de jour
const FREQ_WITH_DAY = new Set(["Hebdomadaire", "Bi-mensuel", "Mensuel"]);
// Fréquences qui affichent le sélecteur d'heure
const FREQ_WITH_TIME = new Set(["Quotidien", "Chaque vendredi", "Hebdomadaire", "Bi-mensuel", "Mensuel"]);
// Fréquences qui pré-fixent le jour
const FREQ_PRESET_DAY: Record<string, string> = { "Chaque vendredi": "Vendredi" };

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const TIME_SLOTS = [
  "8h00", "9h00", "10h00", "11h00",
  "12h00", "13h00", "14h00", "15h00",
  "16h00", "17h00", "18h00", "19h00", "20h00", "21h00",
];

const CHANNELS: { key: string; label: string; emoji: string }[] = [
  { key: "WHATSAPP",  label: "WhatsApp",  emoji: "💬" },
  { key: "INSTAGRAM", label: "Instagram", emoji: "📸" },
  { key: "FACEBOOK",  label: "Facebook",  emoji: "👥" },
  { key: "EMAIL",     label: "Email",     emoji: "📧" },
  { key: "TELEGRAM",  label: "Telegram",  emoji: "✈️" },
];

const STEPS = [
  { id: 0, label: "Vos contenus" },
  { id: 1, label: "Canaux & horaires" },
  { id: 2, label: "Confirmation" },
];

// ── Composant ──────────────────────────────────────────────────────────────

export function DailyRoutineWizard({ communityName, onSave, onCancel, saving }: Props) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<RoutineItem[]>([]);

  function toggle(action: typeof SUGGESTED_ACTIONS[0]) {
    const exists = selected.find((s) => s.label === action.label);
    if (exists) {
      setSelected((prev) => prev.filter((s) => s.label !== action.label));
    } else {
      setSelected((prev) => [
        ...prev,
        {
          label: action.label,
          frequency: action.defaultFrequency,
          day: action.defaultDay,
          channels: action.defaultChannels,
        },
      ]);
    }
  }

  function updateItem(label: string, patch: Partial<RoutineItem>) {
    setSelected((prev) => prev.map((s) => s.label === label ? { ...s, ...patch } : s));
  }

  function changeFrequency(label: string, freq: string) {
    const preset = FREQ_PRESET_DAY[freq];
    updateItem(label, {
      frequency: freq,
      // Pré-remplir le jour si la fréquence l'implique, sinon vider
      day: preset ?? (FREQ_WITH_DAY.has(freq) ? undefined : undefined),
      // Conserver l'heure si la nouvelle fréquence supporte les heures, sinon vider
      time: FREQ_WITH_TIME.has(freq) ? selected.find((s) => s.label === label)?.time : undefined,
    });
  }

  function toggleChannel(label: string, channel: string) {
    const item = selected.find((s) => s.label === label);
    if (!item) return;
    const has = item.channels.includes(channel);
    updateItem(label, {
      channels: has ? item.channels.filter((c) => c !== channel) : [...item.channels, channel],
    });
  }

  const isSelected = (label: string) => selected.some((s) => s.label === label);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 shadow-md">
            <Settings className="size-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Définir mon quotidien</h2>
          <p className="mt-1 text-sm text-slate-500">
            Configurez les actions récurrentes pour <strong>{communityName}</strong>
          </p>
        </div>

        {/* Barre de progression */}
        <div className="mb-8 flex items-center justify-between gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                  step > s.id ? "border-blue-600 bg-blue-600 text-white"
                    : step === s.id ? "border-blue-600 bg-white text-blue-600"
                    : "border-slate-200 bg-white text-slate-400"
                )}>
                  {step > s.id ? <Check className="size-4" /> : s.id + 1}
                </div>
                <span className={cn(
                  "text-[10px] font-medium hidden sm:block",
                  step === s.id ? "text-blue-600" : step > s.id ? "text-slate-600" : "text-slate-400"
                )}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("h-0.5 flex-1 mx-2 transition-all", step > s.id ? "bg-blue-600" : "bg-slate-200")} />
              )}
            </div>
          ))}
        </div>

        {/* ── Étape 0 : sélection des contenus ── */}
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-700">
              Quels contenus publiez-vous régulièrement ?{" "}
              <span className="font-normal text-slate-400">(sélectionnez tout ce qui s'applique)</span>
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTED_ACTIONS.map((action) => {
                const active = isSelected(action.label);
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => toggle(action)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all",
                      active
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <span className="text-xl shrink-0">{action.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", active ? "text-blue-700" : "text-slate-700")}>
                        {action.label}
                      </p>
                      <p className="text-xs text-slate-400">{action.defaultFrequency}</p>
                    </div>
                    {active
                      ? <X className="size-4 text-blue-500 shrink-0" />
                      : <Plus className="size-4 text-slate-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {selected.length > 0 && (
              <p className="text-center text-xs text-blue-600 font-medium">
                {selected.length} action{selected.length > 1 ? "s" : ""} sélectionnée{selected.length > 1 ? "s" : ""}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="lg" onClick={onCancel} className="flex-shrink-0">
                Annuler
              </Button>
              <Button
                size="lg"
                className="flex-1"
                disabled={selected.length === 0}
                onClick={() => setStep(1)}
              >
                Continuer
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Étape 1 : canaux, fréquence, jour & heure ── */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-700">
              Pour chaque action, précisez les canaux et les horaires
            </p>
            <div className="space-y-3">
              {selected.map((item) => {
                const action = SUGGESTED_ACTIONS.find((a) => a.label === item.label);
                const showDayPicker = FREQ_WITH_DAY.has(item.frequency);
                const presetDay = FREQ_PRESET_DAY[item.frequency];
                const showTimePicker = FREQ_WITH_TIME.has(item.frequency);

                return (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
                    {/* Titre */}
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{action?.icon}</span>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    </div>

                    {/* Fréquence */}
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Fréquence</p>
                      <div className="flex flex-wrap gap-1.5">
                        {FREQUENCIES.map((freq) => (
                          <button
                            key={freq}
                            type="button"
                            onClick={() => changeFrequency(item.label, freq)}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                              item.frequency === freq
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                            )}
                          >
                            {freq}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Jour — sous-filtre après fréquence */}
                    {(showDayPicker || presetDay) && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                        {presetDay ? (
                          <p className="text-xs text-slate-500">
                            Jour : <span className="font-semibold text-slate-700">{presetDay}</span>
                          </p>
                        ) : (
                          <>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Quel jour ?</p>
                            <div className="flex flex-wrap gap-1.5">
                              {DAYS.map((day) => (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => updateItem(item.label, { day: item.day === day ? undefined : day })}
                                  className={cn(
                                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                                    item.day === day
                                      ? "border-violet-600 bg-violet-600 text-white"
                                      : "border-slate-200 bg-white text-slate-600 hover:border-violet-300"
                                  )}
                                >
                                  {day}
                                </button>
                              ))}
                            </div>
                          </>
                        )}

                        {/* Heure — sous-filtre après le jour */}
                        {showTimePicker && (
                          <div className="pt-1 space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
                              <Clock className="size-3" /> À quelle heure ?
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {TIME_SLOTS.map((slot) => (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => updateItem(item.label, { time: item.time === slot ? undefined : slot })}
                                  className={cn(
                                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                                    item.time === slot
                                      ? "border-emerald-600 bg-emerald-600 text-white"
                                      : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                                  )}
                                >
                                  {slot}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Heure seule (sans jour) — ex: Quotidien */}
                    {showTimePicker && !showDayPicker && !presetDay && (
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1">
                          <Clock className="size-3" /> À quelle heure ?
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {TIME_SLOTS.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => updateItem(item.label, { time: item.time === slot ? undefined : slot })}
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                                item.time === slot
                                  ? "border-emerald-600 bg-emerald-600 text-white"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                              )}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Canaux */}
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Canaux</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CHANNELS.map((ch) => {
                          const active = item.channels.includes(ch.key);
                          return (
                            <button
                              key={ch.key}
                              type="button"
                              onClick={() => toggleChannel(item.label, ch.key)}
                              className={cn(
                                "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                                active
                                  ? "border-blue-600 bg-blue-50 text-blue-700"
                                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                              )}
                            >
                              <span>{ch.emoji}</span>
                              {ch.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="lg" onClick={() => setStep(0)} className="flex-shrink-0">
                <ChevronLeft className="size-4" />
                Retour
              </Button>
              <Button size="lg" className="flex-1" onClick={() => setStep(2)}>
                Récapitulatif
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Étape 2 : récapitulatif + confirmation ── */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-700">Récapitulatif de votre quotidien</p>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {selected.map((item, i) => {
                const action = SUGGESTED_ACTIONS.find((a) => a.label === item.label);
                const channelLabels = item.channels
                  .map((c) => CHANNELS.find((ch) => ch.key === c))
                  .filter(Boolean)
                  .map((ch) => `${ch!.emoji} ${ch!.label}`)
                  .join("  ");
                const schedule = [item.frequency, item.day, item.time].filter(Boolean).join(" · ");
                return (
                  <div
                    key={item.label}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3",
                      i < selected.length - 1 && "border-b border-slate-100"
                    )}
                  >
                    <span className="text-lg shrink-0 mt-0.5">{action?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-500">{schedule}</p>
                      {channelLabels && (
                        <p className="mt-1 text-xs text-slate-400">{channelLabels}</p>
                      )}
                    </div>
                    <div className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                      <Check className="size-3.5 text-emerald-600" />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Shalom IA</strong> mémorisera ces actions et vous proposera proactivement les contenus au bon moment.
                Vous pourrez toujours modifier via le bouton <strong>Mon quotidien</strong> dans l'assistant.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" size="lg" onClick={() => setStep(1)} className="flex-shrink-0">
                <ChevronLeft className="size-4" />
                Modifier
              </Button>
              <Button
                size="lg"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => onSave(selected)}
                loading={saving}
              >
                <Sparkles className="size-4" />
                Enregistrer mon quotidien
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
