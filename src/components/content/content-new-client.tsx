"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Sparkles, Save, Send, Calendar, ChevronDown,
  FileText, Wand2, Copy, RefreshCw, Check
} from "lucide-react";
import Link from "next/link";
import { cn, CHANNEL_LABELS } from "@/lib/utils";

interface Event {
  id: string;
  title: string;
  startDate: Date;
  category: string;
  description: string | null;
}

interface Community {
  name: string;
  tone: string;
  hashtags: string[];
  signature: string | null;
  editorialRules: string | null;
  channels: Array<{ type: string; isConnected: boolean; isActive: boolean }>;
}

interface Props {
  communityId: string;
  events: Event[];
  community: Community;
  defaultType?: string;
  defaultEventId?: string;
  aiMode?: boolean;
}

const CONTENT_TYPES = [
  { value: "EVENT_ANNOUNCEMENT", label: "Annonce d'événement", emoji: "📣" },
  { value: "EVENT_REMINDER", label: "Rappel d'événement", emoji: "⏰" },
  { value: "SHABBAT_TIMES", label: "Horaires Chabbat", emoji: "🕯️" },
  { value: "HOLIDAY_GREETING", label: "Vœux de fête", emoji: "✨" },
  { value: "COMMUNITY_NEWS", label: "Actualité", emoji: "📰" },
  { value: "COURSE_ANNOUNCEMENT", label: "Annonce de cours", emoji: "📚" },
  { value: "GENERAL", label: "Contenu général", emoji: "✍️" },
];

export function ContentNewClient({ communityId, events, community, defaultType, defaultEventId, aiMode }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"compose" | "channels">("compose");
  const [loading, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Formulaire
  const [contentType, setContentType] = useState(defaultType ?? "GENERAL");
  const [selectedEventId, setSelectedEventId] = useState(defaultEventId ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [hashtags, setHashtags] = useState(community.hashtags.join(" "));
  const [selectedChannels, setSelectedChannels] = useState<string[]>(
    community.channels.filter((c) => c.isConnected).map((c) => c.type)
  );

  const activeChannels = community.channels.filter((c) => c.isActive);

  async function generateWithAI() {
    if (!body && !selectedEventId && contentType === "GENERAL") {
      alert("Décrivez votre sujet ou sélectionnez un événement pour générer du contenu.");
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId,
          contentType,
          eventId: selectedEventId || undefined,
          instructions: body,
        }),
      });

      const data = await res.json();
      if (data.body) {
        setBody(data.body);
        if (data.title) setTitle(data.title);
        if (data.hashtags?.length) setHashtags(data.hashtags.join(" "));
      }
    } catch {
      alert("Erreur lors de la génération. Réessayez.");
    } finally {
      setAiLoading(false);
    }
  }

  async function saveDraft(status: "DRAFT" | "READY_TO_PUBLISH" = "DRAFT") {
    if (!body.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/content/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId,
          title: title || undefined,
          body,
          contentType,
          eventId: selectedEventId || undefined,
          hashtags: hashtags.split(/\s+/).filter(Boolean),
          status,
        }),
      });

      const draft = await res.json();
      if (draft.id) {
        router.push(`/dashboard/content/${draft.id}`);
      }
    } catch {
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  function copyBody() {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const charCount = body.length;
  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/content">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
            Retour
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">Nouveau contenu</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => saveDraft("DRAFT")} loading={loading}>
            <Save className="size-4" />
            Sauvegarder
          </Button>
          <Button size="sm" onClick={() => saveDraft("READY_TO_PUBLISH")} loading={loading}>
            <Send className="size-4" />
            Marquer prêt
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-4">
          {/* Type de contenu */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Type de contenu
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CONTENT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setContentType(type.value)}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all text-left",
                        contentType === type.value
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <span>{type.emoji}</span>
                      <span className="truncate">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Événement lié */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  Événement lié <span className="text-slate-400 font-normal">(optionnel)</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-8 py-2.5 text-sm text-slate-900 appearance-none focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">— Aucun événement —</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title} ({new Date(event.startDate).toLocaleDateString("fr-FR")})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                </div>
                {selectedEvent?.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 pl-1">
                    {selectedEvent.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Éditeur de texte */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FileText className="size-4" />
                  Contenu
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={copyBody}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Copier"
                  >
                    {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateWithAI}
                    loading={aiLoading}
                    className="text-amber-600 border-amber-200 hover:bg-amber-50"
                  >
                    <Wand2 className="size-3.5" />
                    Générer avec l&apos;IA
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {/* Titre */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre (optionnel)"
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />

              {/* Corps du texte */}
              <div className="relative">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={
                    aiMode
                      ? "Décrivez ce que vous voulez générer... ex: 'Post Instagram pour l'office de Chabbat de vendredi, style chaleureux'"
                      : "Rédigez votre contenu ici..."
                  }
                  rows={12}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y leading-relaxed"
                />
                <div className="absolute bottom-3 right-3 text-[11px] text-slate-400">
                  {charCount} car.
                </div>
              </div>

              {/* Hashtags */}
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Hashtags</label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#shabbat #communauté"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Aide IA */}
              {aiMode && !body && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                  <Sparkles className="size-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    Décrivez votre sujet dans le champ ci-dessus, puis cliquez sur{" "}
                    <strong>Générer avec l&apos;IA</strong>. L&apos;IA créera un contenu adapté à votre
                    communauté et au canal.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite — Canaux */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">
                Canaux de diffusion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeChannels.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-400">Aucun canal actif</p>
                  <Link href="/dashboard/settings/channels" className="text-xs text-blue-600 hover:underline mt-1 block">
                    Connecter des canaux →
                  </Link>
                </div>
              ) : (
                activeChannels.map((channel) => {
                  const isSelected = selectedChannels.includes(channel.type);
                  const emoji = {
                    INSTAGRAM: "📸", FACEBOOK: "👥", WHATSAPP: "💬",
                    TELEGRAM: "✈️", EMAIL: "📧", WEB: "🌐",
                  }[channel.type] ?? "📢";

                  return (
                    <button
                      key={channel.type}
                      onClick={() => {
                        setSelectedChannels((prev) =>
                          prev.includes(channel.type)
                            ? prev.filter((c) => c !== channel.type)
                            : [...prev, channel.type]
                        );
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        isSelected
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <span className="text-lg">{emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">
                          {CHANNEL_LABELS[channel.type]}
                        </p>
                        <p className={`text-xs ${channel.isConnected ? "text-emerald-600" : "text-amber-600"}`}>
                          {channel.isConnected ? "Connecté" : "Non connecté"}
                        </p>
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0",
                        isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300"
                      )}>
                        {isSelected && <Check className="size-2.5 text-white" />}
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Infos communauté */}
          <Card className="border-dashed">
            <CardContent className="p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Identité éditoriale
              </p>
              <p className="text-xs text-slate-500">
                <strong>Ton :</strong>{" "}
                {{ MODERN: "Moderne", TRADITIONAL: "Traditionnel", FORMAL: "Formel", FRIENDLY: "Convivial", RELIGIOUS: "Religieux" }[community.tone] ?? community.tone}
              </p>
              {community.signature && (
                <p className="text-xs text-slate-500">
                  <strong>Signature :</strong> {community.signature}
                </p>
              )}
              {community.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {community.hashtags.slice(0, 5).map((tag) => (
                    <span key={tag} className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
