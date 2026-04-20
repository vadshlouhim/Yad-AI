"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, ArrowLeft, ArrowRight, Download, Check,
  Pencil, Crown, ImageIcon, Loader2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// TYPES
// ============================================================

interface DesignZone {
  id: string;
  label: string;
  type: "title" | "subtitle" | "date" | "time" | "location" | "body" | "contact" | "cta";
  defaultText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  fontFamily: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  design: DesignZone[];
  isGlobal: boolean;
  isPremium: boolean;
  tags: string[];
  usageCount: number;
}

interface Community {
  id: string;
  name: string;
  city: string | null;
  tone: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  religiousStream: string | null;
  plan: string;
}

interface Props {
  templates: Template[];
  community: Community;
  plan: string;
}

// ============================================================
// CONSTANTES
// ============================================================

const CATEGORY_LABELS: Record<string, string> = {
  SHABBAT: "Chabbat",
  HOLIDAY: "Fêtes",
  EVENT: "Événements",
  COURSE: "Cours",
  ANNOUNCEMENT: "Annonces",
  RECAP: "Récap",
  GREETING: "Voeux",
  GENERAL: "Général",
};

const CATEGORY_EMOJI: Record<string, string> = {
  SHABBAT: "🕯️",
  HOLIDAY: "🕎",
  EVENT: "🎉",
  COURSE: "📖",
  ANNOUNCEMENT: "📣",
  RECAP: "📝",
  GREETING: "✨",
  GENERAL: "📋",
};

// Questions de personnalisation par catégorie
const CATEGORY_QUESTIONS: Record<string, { id: string; label: string; placeholder: string }[]> = {
  SHABBAT: [
    { id: "parasha", label: "Paracha de la semaine", placeholder: "Ex: Bereshit" },
    { id: "date", label: "Date du Chabbat", placeholder: "Ex: Vendredi 20 Avril 2026" },
    { id: "candle_lighting", label: "Allumage des bougies", placeholder: "Ex: 19h45" },
    { id: "havdala", label: "Havdala", placeholder: "Ex: 20h55" },
    { id: "special_event", label: "Événement spécial (optionnel)", placeholder: "Ex: Kiddouch communautaire" },
  ],
  HOLIDAY: [
    { id: "holiday_name", label: "Nom de la fête", placeholder: "Ex: Pessah, Pourim, Hanouka..." },
    { id: "date", label: "Date", placeholder: "Ex: Du 12 au 20 Avril 2026" },
    { id: "program", label: "Programme / activités", placeholder: "Ex: Lecture de la Meguila, repas..." },
    { id: "special_info", label: "Informations complémentaires", placeholder: "Ex: Inscription obligatoire" },
  ],
  EVENT: [
    { id: "event_name", label: "Nom de l'événement", placeholder: "Ex: Gala annuel du Beth Habad" },
    { id: "date", label: "Date et heure", placeholder: "Ex: Dimanche 25 Avril 2026 à 19h30" },
    { id: "location", label: "Lieu", placeholder: "Ex: Salle des fêtes, 12 rue..." },
    { id: "description", label: "Description courte", placeholder: "Ex: Soirée exceptionnelle avec..." },
    { id: "price", label: "Tarif (optionnel)", placeholder: "Ex: 36€ par personne" },
    { id: "registration", label: "Inscription", placeholder: "Ex: Sur yad-ia.com ou 01 23 45 67 89" },
  ],
  COURSE: [
    { id: "course_name", label: "Nom du cours", placeholder: "Ex: Talmud Baba Metzia" },
    { id: "teacher", label: "Enseignant", placeholder: "Ex: Rav Lévi Cohen" },
    { id: "schedule", label: "Horaire", placeholder: "Ex: Tous les mardis à 20h" },
    { id: "level", label: "Niveau", placeholder: "Ex: Tout niveau" },
    { id: "topic", label: "Sujet cette semaine (optionnel)", placeholder: "Ex: Les lois du Chabbat" },
  ],
  DEFAULT: [
    { id: "title", label: "Titre de l'affiche", placeholder: "Ex: Annonce importante" },
    { id: "date", label: "Date", placeholder: "Ex: Dimanche 25 Avril 2026" },
    { id: "description", label: "Description", placeholder: "Décrivez le contenu de l'affiche..." },
    { id: "contact", label: "Contact (optionnel)", placeholder: "Ex: 01 23 45 67 89" },
  ],
};

// ============================================================
// COMPOSANT
// ============================================================

type Step = "gallery" | "questions" | "preview";

export function TemplatesClient({ templates, community, plan }: Props) {
  const [step, setStep] = useState<Step>("gallery");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generatedTexts, setGeneratedTexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [editingZone, setEditingZone] = useState<string | null>(null);

  const categories = [...new Set(templates.map((t) => t.category))];
  const filteredTemplates = activeCategory
    ? templates.filter((t) => t.category === activeCategory)
    : templates;

  const isPremiumUser = plan !== "FREE_TRIAL";

  // ── Sélectionner un template ──
  function selectTemplate(template: Template) {
    if (template.isPremium && !isPremiumUser) return;
    setSelectedTemplate(template);
    setAnswers({});
    setGeneratedTexts({});
    setStep("questions");
  }

  // ── Générer les textes IA ──
  async function generateTexts() {
    if (!selectedTemplate) return;
    setLoading(true);

    try {
      const res = await fetch("/api/templates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          answers,
        }),
      });

      if (!res.ok) throw new Error("Erreur API");
      const data = await res.json();
      setGeneratedTexts(data.generatedTexts);
      setStep("preview");
    } catch (error) {
      console.error("Erreur génération:", error);
    } finally {
      setLoading(false);
    }
  }

  // ── Retour ──
  function goBack() {
    if (step === "preview") setStep("questions");
    else if (step === "questions") {
      setStep("gallery");
      setSelectedTemplate(null);
    }
  }

  // ── Télécharger (placeholder — sera remplacé par l'appel API image) ──
  function downloadPoster() {
    // TODO: Appeler l'API de génération d'image (nano banana ou autre)
    alert("Fonctionnalité de téléchargement en cours de développement");
  }

  const questions = selectedTemplate
    ? CATEGORY_QUESTIONS[selectedTemplate.category] ?? CATEGORY_QUESTIONS.DEFAULT
    : [];

  // ============================================================
  // RENDER — GALERIE
  // ============================================================

  if (step === "gallery") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Templates d'affiches</h1>
          <p className="text-slate-500 mt-1">
            Choisissez un modèle, personnalisez-le avec l'IA, et téléchargez votre affiche prête à publier.
          </p>
        </div>

        {/* Filtres par catégorie */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={activeCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(null)}
          >
            Tous ({templates.length})
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(cat)}
            >
              {CATEGORY_EMOJI[cat]} {CATEGORY_LABELS[cat] ?? cat} (
              {templates.filter((t) => t.category === cat).length})
            </Button>
          ))}
        </div>

        {/* Grille de templates */}
        {filteredTemplates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-slate-400">
              <ImageIcon className="size-16 mb-4" />
              <p className="text-lg font-medium">Aucun template disponible</p>
              <p className="text-sm mt-1">
                Les templates apparaîtront ici une fois ajoutés au bucket Supabase.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className={cn(
                  "group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1",
                  template.isPremium && !isPremiumUser && "opacity-60"
                )}
                onClick={() => selectTemplate(template)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-[3/4] bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                  {template.thumbnailUrl ? (
                    <img
                      src={template.thumbnailUrl}
                      alt={template.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="size-12 text-slate-300" />
                    </div>
                  )}

                  {/* Badges overlay */}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <Badge variant="secondary" className="text-[10px] bg-white/90 backdrop-blur">
                      {CATEGORY_EMOJI[template.category]} {CATEGORY_LABELS[template.category]}
                    </Badge>
                  </div>

                  {template.isPremium && (
                    <div className="absolute top-2 right-2">
                      <Badge className="text-[10px] bg-amber-500 text-white gap-1">
                        <Crown className="size-3" /> Premium
                      </Badge>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <Button
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <Sparkles className="size-4 mr-1.5" />
                      Personnaliser
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <CardContent className="p-3">
                  <p className="text-sm font-semibold text-slate-900 truncate">{template.name}</p>
                  {template.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{template.description}</p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    Utilisé {template.usageCount} fois
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // RENDER — QUESTIONS DE PERSONNALISATION
  // ============================================================

  if (step === "questions" && selectedTemplate) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Personnaliser l'affiche</h1>
            <p className="text-sm text-slate-500">
              {selectedTemplate.name} · {CATEGORY_LABELS[selectedTemplate.category]}
            </p>
          </div>
        </div>

        {/* Aperçu du template choisi */}
        <Card className="overflow-hidden">
          <div className="flex gap-4 p-4">
            <div className="w-32 aspect-[3/4] rounded-lg overflow-hidden bg-slate-100 shrink-0">
              {selectedTemplate.thumbnailUrl ? (
                <img
                  src={selectedTemplate.thumbnailUrl}
                  alt={selectedTemplate.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="size-8 text-slate-300" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">{selectedTemplate.name}</h3>
              {selectedTemplate.description && (
                <p className="text-sm text-slate-500 mt-1">{selectedTemplate.description}</p>
              )}
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {selectedTemplate.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Info communauté pré-remplie */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-violet-500" />
              <p className="text-sm font-semibold text-slate-700">
                Informations de {community.name} (pré-remplies)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              {community.city && <p>📍 {community.city}</p>}
              {community.phone && <p>📞 {community.phone}</p>}
              {community.email && <p>📧 {community.email}</p>}
              {community.website && <p>🌐 {community.website}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardContent className="py-5 space-y-4">
            <p className="text-sm font-semibold text-slate-700">
              Répondez aux questions pour personnaliser votre affiche :
            </p>
            {questions.map((q) => (
              <div key={q.id}>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">
                  {q.label}
                </label>
                <input
                  type="text"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder={q.placeholder}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={goBack} className="flex-1">
            <ArrowLeft className="size-4 mr-2" /> Retour
          </Button>
          <Button
            onClick={generateTexts}
            disabled={loading || Object.keys(answers).length === 0}
            className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 text-white"
          >
            {loading ? (
              <><Loader2 className="size-4 mr-2 animate-spin" /> Génération en cours...</>
            ) : (
              <><Sparkles className="size-4 mr-2" /> Générer avec l'IA</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER — PREVIEW & ÉDITION
  // ============================================================

  if (step === "preview" && selectedTemplate) {
    const zones = selectedTemplate.design as DesignZone[];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Aperçu de l'affiche</h1>
              <p className="text-sm text-slate-500">
                Modifiez les textes si besoin, puis téléchargez
              </p>
            </div>
          </div>
          <Button onClick={downloadPoster} className="bg-gradient-to-r from-blue-600 to-violet-600 text-white">
            <Download className="size-4 mr-2" /> Télécharger
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Preview de l'affiche */}
          <Card className="overflow-hidden">
            <div className="relative aspect-[3/4] bg-slate-900">
              {selectedTemplate.thumbnailUrl ? (
                <img
                  src={selectedTemplate.thumbnailUrl}
                  alt={selectedTemplate.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="size-16 text-slate-600" />
                </div>
              )}

              {/* Zones de texte superposées */}
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="absolute cursor-pointer hover:outline hover:outline-2 hover:outline-blue-400 hover:outline-dashed rounded transition-all"
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                  }}
                  onClick={() => setEditingZone(zone.id)}
                  title={`Cliquer pour modifier : ${zone.label}`}
                >
                  <div
                    className="w-full h-full flex items-center justify-center p-1 text-center leading-tight"
                    style={{
                      fontSize: `${zone.fontSize * 0.6}px`,
                      color: zone.color,
                      fontFamily: zone.fontFamily,
                    }}
                  >
                    {generatedTexts[zone.id] ?? zone.defaultText}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Panneau d'édition des textes */}
          <div className="space-y-4">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-4">
                  <Pencil className="size-4 text-blue-500" />
                  <p className="text-sm font-semibold text-slate-700">Textes générés par l'IA</p>
                </div>

                <div className="space-y-3">
                  {zones.map((zone) => (
                    <div key={zone.id}>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">
                        {zone.label}
                      </label>
                      {editingZone === zone.id ? (
                        <div className="flex gap-2">
                          <input
                            value={generatedTexts[zone.id] ?? zone.defaultText}
                            onChange={(e) =>
                              setGeneratedTexts((prev) => ({
                                ...prev,
                                [zone.id]: e.target.value,
                              }))
                            }
                            autoFocus
                            className="flex-1 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setEditingZone(null)}
                          >
                            <Check className="size-4 text-emerald-600" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="group flex items-center gap-2 cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 hover:border-blue-300 transition-colors"
                          onClick={() => setEditingZone(zone.id)}
                        >
                          <p className="flex-1 text-sm text-slate-800">
                            {generatedTexts[zone.id] ?? zone.defaultText}
                          </p>
                          <Pencil className="size-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("questions")} className="flex-1">
                <ArrowLeft className="size-4 mr-2" /> Modifier les réponses
              </Button>
              <Button
                onClick={generateTexts}
                variant="outline"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="size-4 mr-2" />
                )}
                Regénérer
              </Button>
            </div>

            <Button
              onClick={downloadPoster}
              className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white h-12 text-base"
            >
              <Download className="size-5 mr-2" /> Télécharger l'affiche
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
