"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  FileImage,
  FilePlus,
  FileText,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  RESOURCE_CATEGORIES,
  RESOURCE_THEMES,
  MAX_FILE_SIZE,
  type ResourceCategory,
  type ResourceTheme,
} from "@/lib/community-library";

type Step = "upload" | "metadata" | "confirm";

interface UploadedFile {
  fileUrl: string;
  fileType: string;
  fileSize: number;
  originalName: string;
  mimeType: string;
}

interface Metadata {
  title: string;
  description: string;
  category: ResourceCategory;
  theme: ResourceTheme;
  keywords: string[];
}

const FILE_SIZE_LABEL = `${MAX_FILE_SIZE / (1024 * 1024)} Mo`;

export function SubmitResourceClient({ communityName }: { communityName: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [suggestingMeta, setSuggestingMeta] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null);
  const [meta, setMeta] = useState<Metadata>({
    title: "",
    description: "",
    category: "Cours",
    theme: "Torah",
    keywords: [],
  });
  const [keywordInput, setKeywordInput] = useState("");
  const [success, setSuccess] = useState(false);

  const handleFile = async (file: File) => {
    setUploadError("");
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`Fichier trop lourd. Maximum ${FILE_SIZE_LABEL}.`);
      return;
    }
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif", "text/plain", "text/html"];
    if (!allowed.includes(file.type)) {
      setUploadError("Type non autorisé. Acceptés : PDF, image (JPG/PNG/WebP/GIF), texte.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/community-library/submit", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { setUploadError(data.error ?? "Erreur lors de l'envoi"); return; }
      setUploaded(data);
      setStep("metadata");
      await suggestMetadata(file.name, data.fileType, data.mimeType);
    } finally {
      setUploading(false);
    }
  };

  const suggestMetadata = async (fileName: string, fileType: string, mimeType: string) => {
    setSuggestingMeta(true);
    try {
      const res = await fetch("/api/community-library/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suggest-metadata", fileName, fileType, mimeType, communityName }),
      });
      const data = await res.json();
      if (data.metadata) {
        setMeta((prev) => ({
          title: data.metadata.title || prev.title,
          description: data.metadata.description || prev.description,
          category: RESOURCE_CATEGORIES.includes(data.metadata.category) ? data.metadata.category : prev.category,
          theme: RESOURCE_THEMES.includes(data.metadata.theme) ? data.metadata.theme : prev.theme,
          keywords: Array.isArray(data.metadata.keywords) ? data.metadata.keywords : prev.keywords,
        }));
      }
    } finally {
      setSuggestingMeta(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handlePublish = async () => {
    if (!uploaded) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/community-library/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...meta,
          fileUrl: uploaded.fileUrl,
          fileType: uploaded.fileType,
          fileSize: uploaded.fileSize,
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/dashboard/community-library"), 2000);
      }
    } finally {
      setPublishing(false);
    }
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (kw && !meta.keywords.includes(kw) && meta.keywords.length < 8) {
      setMeta((m) => ({ ...m, keywords: [...m.keywords, kw] }));
      setKeywordInput("");
    }
  };

  const removeKeyword = (kw: string) => {
    setMeta((m) => ({ ...m, keywords: m.keywords.filter((k) => k !== kw) }));
  };

  if (success) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
        <CheckCircle className="mx-auto size-14 text-emerald-500" />
        <h2 className="mt-4 text-xl font-black text-slate-900">Ressource publiée !</h2>
        <p className="mt-2 text-sm text-slate-500">Redirection en cours…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50">
          <ArrowLeft className="size-4 text-slate-500" />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900">Soumettre une ressource</h1>
          <p className="text-sm text-slate-500">Partagez un document avec votre communauté</p>
        </div>
      </div>

      {/* Indicateur d'étape */}
      <div className="flex items-center gap-2">
        {(["upload", "metadata", "confirm"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${step === s ? "bg-violet-600 text-white" : ["upload", "metadata", "confirm"].indexOf(step) > i ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
              {["upload", "metadata", "confirm"].indexOf(step) > i ? <CheckCircle className="size-4" /> : i + 1}
            </div>
            <span className={`text-xs font-semibold hidden sm:inline ${step === s ? "text-violet-700" : "text-slate-400"}`}>
              {s === "upload" ? "Fichier" : s === "metadata" ? "Métadonnées" : "Confirmer"}
            </span>
            {i < 2 && <div className={`h-px flex-1 ${["upload", "metadata", "confirm"].indexOf(step) > i ? "bg-emerald-300" : "bg-slate-200"} hidden sm:block`} />}
          </div>
        ))}
      </div>

      {/* Étape 1 — Upload */}
      {step === "upload" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInput.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 transition-colors ${dragOver ? "border-violet-400 bg-violet-50" : "border-slate-300 hover:border-violet-300 hover:bg-violet-50/40"}`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
              <Upload className="size-6 text-violet-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-800">
                {uploading ? "Envoi en cours…" : "Glissez votre fichier ici ou cliquez"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                PDF, image (JPG/PNG/WebP), texte — max {FILE_SIZE_LABEL}
              </p>
            </div>
            <div className="flex gap-3 text-slate-400">
              <FileText className="size-5" />
              <FileImage className="size-5" />
              <FilePlus className="size-5" />
            </div>
          </div>
          <input
            ref={fileInput}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt,.html"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {uploadError && (
            <p className="mt-3 text-center text-sm font-semibold text-red-600">{uploadError}</p>
          )}
        </div>
      )}

      {/* Étape 2 — Métadonnées */}
      {step === "metadata" && uploaded && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {suggestingMeta && (
            <div className="flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700">
              <Sparkles className="size-4 animate-pulse" /> L&apos;IA analyse le fichier et suggère des métadonnées…
            </div>
          )}

          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <FileText className="size-4 text-slate-400" />
            <span className="font-medium">{uploaded.originalName}</span>
            <span className="text-slate-400">({(uploaded.fileSize / 1024).toFixed(0)} Ko)</span>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Titre *</label>
            <input
              type="text"
              value={meta.title}
              onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
              placeholder="Titre de la ressource"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Description *</label>
            <textarea
              value={meta.description}
              onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))}
              placeholder="Décrivez brièvement cette ressource…"
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Catégorie *</label>
              <select
                value={meta.category}
                onChange={(e) => setMeta((m) => ({ ...m, category: e.target.value as ResourceCategory }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              >
                {RESOURCE_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Thème *</label>
              <select
                value={meta.theme}
                onChange={(e) => setMeta((m) => ({ ...m, theme: e.target.value as ResourceTheme }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              >
                {RESOURCE_THEMES.map((th) => <option key={th}>{th}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Mots-clés (max 8)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                placeholder="Ajouter un mot-clé…"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
              <button
                type="button"
                onClick={addKeyword}
                className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-100"
              >
                Ajouter
              </button>
            </div>
            {meta.keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {meta.keywords.map((kw) => (
                  <span key={kw} className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                    {kw}
                    <button onClick={() => removeKeyword(kw)}><X className="size-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep("upload")}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Retour
            </button>
            <button
              onClick={() => { if (meta.title && meta.description) setStep("confirm"); }}
              disabled={!meta.title || !meta.description}
              className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              Continuer
            </button>
          </div>
        </div>
      )}

      {/* Étape 3 — Confirmation */}
      {step === "confirm" && (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Confirmer la publication</h2>

          <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm">
            <div className="flex justify-between gap-2">
              <span className="font-semibold text-slate-500">Titre</span>
              <span className="font-medium text-slate-900">{meta.title}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="font-semibold text-slate-500">Catégorie</span>
              <span className="font-medium text-slate-900">{meta.category}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="font-semibold text-slate-500">Thème</span>
              <span className="font-medium text-slate-900">{meta.theme}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500">Description</span>
              <p className="mt-1 text-slate-700">{meta.description}</p>
            </div>
            {meta.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {meta.keywords.map((kw) => (
                  <span key={kw} className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">{kw}</span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-700">
            En publiant, vous confirmez que vous êtes autorisé(e) à partager ce document avec votre communauté.
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("metadata")}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Modifier
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {publishing ? "Publication…" : "Publier"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
