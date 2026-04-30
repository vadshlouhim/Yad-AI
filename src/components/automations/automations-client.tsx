"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Zap, Plus, Play, Pause, Clock, CheckCircle, XCircle,
  AlertCircle, Calendar, RefreshCw, Settings, Trash2
} from "lucide-react";
import { formatRelative, formatDateTime, cn } from "@/lib/utils";

interface AutomationRun {
  id: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
  automation: { name: string };
}

interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  isActive: boolean;
  status: string;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  triggerConfig: unknown;
  actions: unknown;
  createdAt: Date;
  event: { title: string; startDate: Date } | null;
  runs: AutomationRun[];
}

interface Props {
  automations: Automation[];
  recentRuns: AutomationRun[];
  embedded?: boolean;
}

const TRIGGER_LABELS: Record<string, string> = {
  WEEKLY_SHABBAT: "🕯️ Chabbat hebdomadaire",
  JEWISH_HOLIDAY: "✨ Fête juive",
  BEFORE_EVENT: "⏰ Avant un événement",
  EVENT_DAY: "📅 Jour de l'événement",
  AFTER_EVENT: "📋 Après un événement",
  DAILY: "🌅 Quotidien",
  CUSTOM_SCHEDULE: "⚙️ Planning personnalisé",
  MANUAL: "👆 Manuel",
};

const RUN_STATUS_ICON: Record<string, React.ReactNode> = {
  RUNNING: <RefreshCw className="size-3.5 text-emerald-600 animate-spin" />,
  SUCCESS: <CheckCircle className="size-3.5 text-emerald-600" />,
  PARTIAL_SUCCESS: <AlertCircle className="size-3.5 text-amber-600" />,
  FAILED: <XCircle className="size-3.5 text-red-600" />,
  SKIPPED: <Clock className="size-3.5 text-slate-400" />,
};

const RUN_STATUS_VARIANT: Record<string, "draft" | "info" | "ready" | "published" | "scheduled" | "failed"> = {
  RUNNING: "info",
  SUCCESS: "published",
  PARTIAL_SUCCESS: "ready",
  FAILED: "failed",
  SKIPPED: "draft",
};

export function AutomationsClient({ automations, recentRuns, embedded = false }: Props) {
  const router = useRouter();
  const [toggling, setToggling] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function toggleAutomation(id: string, isActive: boolean) {
    setToggling(id);
    try {
      await fetch(`/api/automations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      router.refresh();
    } finally {
      setToggling(null);
    }
  }

  async function triggerNow(id: string) {
    setTriggering(id);
    try {
      await fetch(`/api/automations/${id}/trigger`, { method: "POST" });
      router.refresh();
    } catch {
      alert("Erreur lors du déclenchement.");
    } finally {
      setTriggering(null);
    }
  }

  async function deleteAutomation(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette automatisation ?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/automations/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Erreur lors de la suppression.");
      }
    } catch {
      alert("Erreur lors de la suppression.");
    } finally {
      setDeleting(null);
    }
  }

  const activeCount = automations.filter((a) => a.isActive).length;

  return (
    <div className="space-y-6">
      {!embedded && (
      <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-teal-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Communication</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Automatisations</h1>
          <p className="text-slate-500 mt-1">
            {activeCount} automatisation{activeCount !== 1 ? "s" : ""} active{activeCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/dashboard/automations/new">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500">
            <Plus className="size-4" />
            Nouvelle automatisation
          </Button>
        </Link>
        </div>
      </div>
      )}

      {embedded && (
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-teal-50 p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Automatisations</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Programmations automatiques</h2>
            <p className="mt-1 text-slate-500">
              {activeCount} automatisation{activeCount !== 1 ? "s" : ""} active{activeCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des automatisations */}
        <div className="lg:col-span-2 space-y-3">
          {automations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Zap className="size-7 text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Aucune automatisation</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Créez des automatisations pour publier du contenu automatiquement.
                  </p>
                </div>
                <Link href="/dashboard/automations/new">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500">
                    <Plus className="size-4" />
                    Créer une automatisation
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            automations.map((automation) => {
              const lastRun = automation.runs[0];
              return (
                <Card
                  key={automation.id}
                  className={cn(
                    "border transition-shadow hover:shadow-sm",
                    !automation.isActive && "opacity-60"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icône trigger */}
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl",
                        automation.isActive ? "bg-emerald-100" : "bg-slate-100"
                      )}>
                        {TRIGGER_LABELS[automation.trigger]?.split(" ")[0] ?? "⚡"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-800">{automation.name}</p>
                            {automation.description && (
                              <p className="text-xs text-slate-500 mt-0.5">{automation.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Badge
                              variant={automation.isActive ? "published" : "draft"}
                              className="text-[11px]"
                            >
                              {automation.isActive ? "Actif" : "Pausé"}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {TRIGGER_LABELS[automation.trigger]?.slice(2) ?? automation.trigger}
                          </span>
                          {automation.event && (
                            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Calendar className="size-3" />
                              {automation.event.title}
                            </span>
                          )}
                          {automation.nextRunAt && (
                            <span className="text-xs text-slate-500">
                              Prochaine : {formatRelative(automation.nextRunAt)}
                            </span>
                          )}
                          {automation.lastRunAt && (
                            <span className="text-xs text-slate-400">
                              Dernière : {formatRelative(automation.lastRunAt)}
                            </span>
                          )}
                        </div>

                        {/* Dernier run */}
                        {lastRun && (
                          <div className="flex items-center gap-1.5 mt-2">
                            {RUN_STATUS_ICON[lastRun.status]}
                            <span className="text-xs text-slate-500">
                              {{
                                RUNNING: "En cours…",
                                SUCCESS: "Succès",
                                PARTIAL_SUCCESS: "Succès partiel",
                                FAILED: "Échec",
                                SKIPPED: "Ignoré",
                              }[lastRun.status] ?? lastRun.status}{" "}
                              ({formatRelative(lastRun.startedAt)})
                            </span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => toggleAutomation(automation.id, automation.isActive)}
                            loading={toggling === automation.id}
                          >
                            {automation.isActive
                              ? <><Pause className="size-3" /> Mettre en pause</>
                              : <><Play className="size-3" /> Activer</>
                            }
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => triggerNow(automation.id)}
                            loading={triggering === automation.id}
                          >
                            <Play className="size-3" />
                            Lancer maintenant
                          </Button>
                          {!embedded && (
                            <>
                              <Link href={`/dashboard/automations/${automation.id}`}>
                                <Button variant="ghost" size="sm" className="h-7 text-xs">
                                  <Settings className="size-3" />
                                  Configurer
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => deleteAutomation(automation.id)}
                                loading={deleting === automation.id}
                              >
                                <Trash2 className="size-3" />
                                Supprimer
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Journal d'activité */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="size-4 text-slate-500" />
                Activité récente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentRuns.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  Aucune exécution récente
                </p>
              ) : (
                recentRuns.slice(0, 10).map((run) => (
                  <div key={run.id} className="flex items-start gap-2.5 py-2 border-b border-slate-100 last:border-0">
                    {RUN_STATUS_ICON[run.status]}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">
                        {run.automation.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatRelative(run.startedAt)}
                      </p>
                      {run.error && (
                        <p className="text-[11px] text-red-600 line-clamp-1 mt-0.5">
                          {run.error}
                        </p>
                      )}
                    </div>
                    <Badge variant={RUN_STATUS_VARIANT[run.status] ?? "draft"} className="text-[10px] flex-shrink-0">
                      {{
                        RUNNING: "En cours",
                        SUCCESS: "OK",
                        PARTIAL_SUCCESS: "Partiel",
                        FAILED: "Échec",
                        SKIPPED: "Ignoré",
                      }[run.status] ?? run.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Info Chabbat automatique */}
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🕯️</span>
                <p className="text-sm font-semibold text-emerald-900">Automatisation Chabbat</p>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                L&apos;automatisation Chabbat publie automatiquement les horaires chaque vendredi
                en se basant sur votre ville.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
