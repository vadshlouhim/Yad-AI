import { DEMO_DRAFTS } from "@/lib/demo/data";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FileText, Sparkles } from "lucide-react";
import { formatRelative, CONTENT_STATUS_LABELS, truncate } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "draft" | "info" | "ready" | "published" | "scheduled"> = {
  DRAFT: "draft",
  AI_PROPOSAL: "info",
  READY_TO_PUBLISH: "ready",
  PUBLISHED: "published",
  ARCHIVED: "draft",
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  SHABBAT_TIMES: "Horaires Chabbat",
  COURSE_ANNOUNCEMENT: "Annonce cours",
  HOLIDAY_GREETING: "Vœux de fête",
  EVENT_ANNOUNCEMENT: "Annonce événement",
  GENERAL: "Général",
};

export default function DemoContentPage() {
  return (
    <div className="pt-10 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Contenu</h1>
            <p className="text-slate-500 mt-1">Brouillons, propositions IA et contenu prêt à publier</p>
          </div>
          <Button size="sm" disabled>
            <Plus className="size-4" />
            Nouveau contenu
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {["Tous", "Brouillons", "Propositions IA", "Prêt à publier"].map((f, i) => (
            <button
              key={f}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                i === 0 ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600"
              }`}
            >
              {f}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${i === 0 ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                {i === 0 ? DEMO_DRAFTS.length : [1, 2, 1][i - 1]}
              </span>
            </button>
          ))}
        </div>

        <div className="grid gap-3">
          {DEMO_DRAFTS.map((draft) => (
            <Card key={draft.id} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${draft.aiGenerated ? "bg-amber-100" : "bg-slate-100"}`}>
                    {draft.aiGenerated
                      ? <Sparkles className="size-5 text-amber-600" />
                      : <FileText className="size-5 text-slate-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {draft.title ?? truncate(draft.body, 60)}
                        </p>
                        {draft.title && (
                          <p className="text-sm text-slate-400 mt-0.5 line-clamp-2">
                            {truncate(draft.body, 100)}
                          </p>
                        )}
                      </div>
                      <Badge variant={STATUS_VARIANT[draft.status] ?? "draft"} className="flex-shrink-0 text-[11px]">
                        {CONTENT_STATUS_LABELS[draft.status] ?? draft.status}
                      </Badge>
                    </div>
                    <div className="flex items-center flex-wrap gap-3 mt-3">
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {CONTENT_TYPE_LABELS[draft.contentType] ?? draft.contentType}
                      </span>
                      {draft.event && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          📅 {draft.event.title}
                        </span>
                      )}
                      {draft.aiGenerated && (
                        <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          ✨ Généré par IA
                        </span>
                      )}
                      <span className="text-xs text-slate-400 ml-auto">
                        {formatRelative(draft.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
  );
}
