import { Bot, CalendarDays, ImageIcon, Sparkles, Zap } from "lucide-react";
import { DemoFeaturePage } from "@/components/demo/demo-feature-page";
import { DEMO_DRAFTS, DEMO_EVENTS } from "@/lib/demo/data";

const DEMO_CHAT = [
  {
    role: "user",
    text: "Prépare un plan de communication Chabbat pour cette semaine.",
  },
  {
    role: "assistant",
    text: "Plan prêt: 1) post Instagram jeudi 18h, 2) rappel WhatsApp vendredi 14h, 3) affiche Chabbat avec horaires. Voulez-vous que je génère l'affiche?",
  },
];

export default function DemoAssistantPage() {
  return (
    <DemoFeaturePage
      title="Assistant IA"
      subtitle="Mode demo complet: tests de prompts, plans de publication, génération de contenus et actions guidées."
      highlights={[
        "Suggestions contextuelles en un clic",
        "Préparation de posts et affiches",
        "Planification par événement et calendrier",
      ]}
      primaryCta={{ label: "Lancer un prompt demo" }}
      secondaryCta={{ label: "Ouvrir les affiches", href: "/demo/templates" }}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-3">
            {DEMO_CHAT.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${message.role === "user" ? "bg-blue-600 text-white" : "border border-slate-200 bg-slate-50 text-slate-800"}`}>
                  {message.text}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
            Zone de saisie demo: toutes les actions sont simulées, sans écriture réelle en base.
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-900">Actions rapides demo</p>
            <div className="mt-3 space-y-2">
              <button type="button" className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-700">
                <Sparkles className="size-4 text-amber-500" />
                Plan Chabbat en 1 clic
              </button>
              <button type="button" className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-700">
                <ImageIcon className="size-4 text-blue-500" />
                Générer une affiche demo
              </button>
              <button type="button" className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-700">
                <Zap className="size-4 text-emerald-500" />
                Créer une automatisation demo
              </button>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-slate-900">Contexte chargé</p>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <p className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5 text-slate-400" /> {DEMO_EVENTS.length} événements demo</p>
              <p className="inline-flex items-center gap-1.5"><Bot className="size-3.5 text-slate-400" /> {DEMO_DRAFTS.length} brouillons prêts</p>
            </div>
          </div>
        </div>
      </div>
    </DemoFeaturePage>
  );
}

