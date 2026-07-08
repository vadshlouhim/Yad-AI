"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DataPanel, PanelAction, PanelField, PanelItem } from "@/lib/ai/assistant/panels";
import { PANEL_ENTITY_CONFIG, badgeClassFor } from "./panel-config";

// Panneau interactif générique affiché dans le fil de conversation de l'assistant :
// listes d'entités (agenda, contacts, brouillons…), fiches détaillées et vues de réglages,
// avec champs éditables et actions (exécution d'outil, message, navigation).

export interface PanelActionPayload {
  action: PanelAction;
  /** Champs édités localement, fusionnés dans le payload de l'outil. */
  edits?: Record<string, unknown>;
}

interface Props {
  panel: DataPanel;
  runningActionId: string | null;
  onAction: (payload: PanelActionPayload) => void;
}

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: PanelField;
  value: string;
  onChange: (next: string) => void;
}) {
  const baseClass =
    "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";
  if (field.inputType === "textarea") {
    return <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className={cn(baseClass, "resize-none")} />;
  }
  if (field.inputType === "select" && field.options) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={baseClass}>
        {field.options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      type={field.inputType === "date" ? "date" : field.inputType === "time" ? "time" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={baseClass}
    />
  );
}

function ActionButtons({
  actions,
  edits,
  runningActionId,
  onAction,
}: {
  actions: PanelAction[];
  edits?: Record<string, unknown>;
  runningActionId: string | null;
  onAction: (payload: PanelActionPayload) => void;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((action) => {
        const isConfirming = confirmingId === action.id;
        const isRunning = runningActionId === action.id;
        return (
          <Button
            key={action.id}
            size="sm"
            variant={action.style === "danger" ? "destructive" : action.style === "primary" ? "default" : "outline"}
            className="h-7 rounded-lg px-2.5 text-[11px]"
            disabled={isRunning}
            onClick={() => {
              if (action.confirm && !isConfirming) {
                setConfirmingId(action.id);
                window.setTimeout(() => setConfirmingId((current) => (current === action.id ? null : current)), 4000);
                return;
              }
              setConfirmingId(null);
              onAction({ action, edits });
            }}
          >
            {isRunning ? <Loader2 className="size-3 animate-spin" /> : null}
            {isConfirming ? "Confirmer ?" : action.label}
          </Button>
        );
      })}
    </div>
  );
}

function PanelItemRow({
  item,
  entity,
  runningActionId,
  onAction,
}: {
  item: PanelItem;
  entity: DataPanel["entity"];
  runningActionId: string | null;
  onAction: (payload: PanelActionPayload) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const editableFields = (item.fields ?? []).filter((f) => f.editable);
  const hasExpandableContent = editableFields.length > 0;

  const currentEdits: Record<string, unknown> = {};
  for (const field of editableFields) {
    const edited = edits[field.key];
    if (edited !== undefined && edited !== field.value) currentEdits[field.key] = edited;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-slate-300">
      <div className="flex items-start gap-3">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold tracking-tight text-slate-900">{item.title}</p>
            <div className="flex shrink-0 items-center gap-1.5">
              {item.badge && (
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", badgeClassFor(entity, item.badge))}>
                  {item.badge}
                </span>
              )}
              {hasExpandableContent && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label={expanded ? "Replier" : "Modifier"}
                >
                  {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                </button>
              )}
            </div>
          </div>
          {item.subtitle && <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">{item.subtitle}</p>}

          {expanded && editableFields.length > 0 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {editableFields.map((field) => (
                <div key={field.key} className={cn("space-y-1", field.inputType === "textarea" && "sm:col-span-2")}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{field.label}</p>
                  <FieldEditor
                    field={field}
                    value={edits[field.key] ?? field.value}
                    onChange={(next) => setEdits((prev) => ({ ...prev, [field.key]: next }))}
                  />
                </div>
              ))}
            </div>
          )}

          {(item.actions?.length ?? 0) > 0 && (expanded || editableFields.length === 0) && (
            <div className="mt-2.5">
              <ActionButtons
                actions={item.actions ?? []}
                edits={Object.keys(currentEdits).length > 0 ? currentEdits : undefined}
                runningActionId={runningActionId}
                onAction={onAction}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AssistantDataPanel({ panel, runningActionId, onAction }: Props) {
  const config = PANEL_ENTITY_CONFIG[panel.entity] ?? PANEL_ENTITY_CONFIG.settings;
  const Icon = config.icon;
  const [fieldEdits, setFieldEdits] = useState<Record<string, string>>({});

  // Champs racine (entity_detail / settings_view)
  const rootFields = panel.fields ?? [];
  const rootEdits: Record<string, unknown> = {};
  for (const field of rootFields) {
    if (!field.editable) continue;
    const edited = fieldEdits[field.key];
    if (edited !== undefined && edited !== field.value) rootEdits[field.key] = edited;
  }

  return (
    <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Icon className="size-4" />
        </div>
        <p className="text-sm font-semibold tracking-tight text-slate-900">{panel.title}</p>
        {typeof panel.meta?.total === "number" && panel.meta.total > (panel.items?.length ?? 0) && (
          <span className="ml-auto text-[10px] font-semibold text-slate-400">
            {panel.items?.length ?? 0} affichés sur {panel.meta.total}
          </span>
        )}
      </div>

      {panel.panelType === "entity_list" && (
        <div className="space-y-2">
          {(panel.items?.length ?? 0) === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
              {panel.emptyText ?? "Aucun élément."}
            </p>
          ) : (
            panel.items!.map((item) => (
              <PanelItemRow key={item.id} item={item} entity={panel.entity} runningActionId={runningActionId} onAction={onAction} />
            ))
          )}
        </div>
      )}

      {(panel.panelType === "entity_detail" || panel.panelType === "settings_view") && (
        <div className="space-y-2.5">
          <div className="grid gap-2 sm:grid-cols-2">
            {rootFields.map((field) => (
              <div key={field.key} className={cn("space-y-1", field.inputType === "textarea" && "sm:col-span-2")}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{field.label}</p>
                {field.editable ? (
                  <FieldEditor
                    field={field}
                    value={fieldEdits[field.key] ?? field.value}
                    onChange={(next) => setFieldEdits((prev) => ({ ...prev, [field.key]: next }))}
                  />
                ) : (
                  <p className="text-xs font-medium text-slate-700">{field.value || "—"}</p>
                )}
              </div>
            ))}
          </div>
          {(panel.actions?.length ?? 0) > 0 && (
            <ActionButtons
              actions={panel.actions ?? []}
              edits={Object.keys(rootEdits).length > 0 ? rootEdits : undefined}
              runningActionId={runningActionId}
              onAction={onAction}
            />
          )}
        </div>
      )}
    </div>
  );
}
