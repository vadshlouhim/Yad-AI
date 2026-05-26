"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clipboard,
  ImagePlus,
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AUTOMATION_SCENARIOS = [
  {
    label: "Horaires de Chabbat",
    description: "Preparez le message hebdomadaire avec validation avant envoi.",
    status: "Disponible",
  },
  {
    label: "Activites",
    description: "Annoncez vos activites regulieres ou ponctuelles par WhatsApp.",
    status: "Parametrable",
  },
  {
    label: "Cours reguliers",
    description: "Planifiez les rappels de cours avec un message adapte.",
    status: "Parametrable",
  },
  {
    label: "Messages automatiques",
    description: "Preparez un message quotidien ou communautaire a envoyer.",
    status: "Parametrable",
  },
  {
    label: "Notifications importantes",
    description: "Centralisez les messages importants prets a valider.",
    status: "Parametrable",
  },
];

const DEFAULT_MESSAGE =
  "Prepare un message WhatsApp pour annoncer le cours de Torah de mardi soir a 20h30 au Beth Habad, avec un ton chaleureux et professionnel.";

export function WhatsAppClient() {
  const [prompt, setPrompt] = useState("");
  const [preparedMessage, setPreparedMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [mediaPrepared, setMediaPrepared] = useState(false);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const messageToSend = useMemo(() => preparedMessage.trim() || prompt.trim(), [preparedMessage, prompt]);
  const previewUrl = useMemo(() => (selectedImage ? URL.createObjectURL(selectedImage) : ""), [selectedImage]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleImageUpload(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Le fichier doit etre une image.");
      return;
    }

    setSelectedImage(file);
    setMediaPrepared(false);
    setError("");
  }

  function prepareMessage() {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setError("Indiquez d'abord le message ou les informations a preparer.");
      return;
    }

    setError("");
    setPreparedMessage(cleanPrompt);
    setCopied(false);
    setMediaPrepared(false);
  }

  async function sendViaWhatsApp() {
    const cleanMessage = messageToSend.trim();
    if (!cleanMessage) {
      setError("Preparez ou ecrivez un message avant d'ouvrir WhatsApp.");
      return;
    }

    setError("");
    setCopied(false);
    setMediaPrepared(false);
    try {
      if (
        selectedImage &&
        typeof window !== "undefined" &&
        "ClipboardItem" in window &&
        navigator.clipboard &&
        "write" in navigator.clipboard
      ) {
        const clipboardData: Record<string, Blob> = {
          "text/plain": new Blob([cleanMessage], { type: "text/plain" }),
          [selectedImage.type]: selectedImage,
        };

        const clipboardItem = new window.ClipboardItem(clipboardData);
        await navigator.clipboard.write([clipboardItem]);
        setCopied(true);
        setMediaPrepared(true);
      } else {
        await navigator.clipboard.writeText(cleanMessage);
        setCopied(true);
      }
    } catch {
      setCopied(false);
      setMediaPrepared(false);
    }

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(cleanMessage)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#0f9f6e] p-6 shadow-[0_20px_44px_-28px_rgba(6,78,59,0.42)]">
        <div className="max-w-4xl">
          <div className="mb-3 h-1.5 w-10 rounded-full bg-emerald-200/90" />
          <h1 className="text-3xl font-bold tracking-tight text-white">WhatsApp</h1>
          <p className="mt-3 text-sm leading-6 text-emerald-50/90">
            Parlez a l&apos;assistant IA et indiquez le message que vous souhaitez envoyer par WhatsApp. Vous pouvez aussi
            creer des automatisations WhatsApp pour preparer vos messages a l&apos;avance.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-inner">
              <Sparkles className="size-6" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Assistant IA WhatsApp</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Parlez a l&apos;assistant IA et indiquez le message que vous souhaitez envoyer par WhatsApp. Vous pouvez
              aussi creer des automatisations WhatsApp pour preparer vos messages a l&apos;avance.
            </p>
          </div>

          <Link href="/dashboard/automations" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="h-11 w-full rounded-2xl border-emerald-200 bg-white px-5 text-emerald-700 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-800 active:scale-[0.98] sm:w-auto"
            >
              <Zap className="size-4" />
              Creer une automatisation WhatsApp
            </Button>
          </Link>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/40 p-4">
            <label htmlFor="whatsapp-prompt" className="text-sm font-semibold text-slate-900">
              Message a preparer
            </label>
            <textarea
              id="whatsapp-prompt"
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                setError("");
              }}
              placeholder={DEFAULT_MESSAGE}
              className="mt-3 min-h-48 w-full resize-none rounded-2xl border border-emerald-100 bg-white p-4 text-sm leading-6 text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
            />

            <div className="mt-4 rounded-2xl border border-emerald-100 bg-white p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Image a joindre (optionnel)</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100">
                  <ImagePlus className="size-4" />
                  Televerser une image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleImageUpload(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              {selectedImage && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2">
                  <p className="truncate text-xs text-emerald-800">{selectedImage.name}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setMediaPrepared(false);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-800"
                  >
                    <Trash2 className="size-3.5" />
                    Retirer
                  </button>
                </div>
              )}
            </div>
            {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={prepareMessage}
                className="h-11 rounded-2xl bg-emerald-700 px-5 text-white shadow-[0_12px_28px_rgba(4,120,87,0.2)] transition-transform duration-200 hover:bg-emerald-800 active:scale-[0.98]"
              >
                <MessageCircle className="size-4" />
                Preparer le message WhatsApp
              </Button>
              <Button
                type="button"
                onClick={sendViaWhatsApp}
                variant="outline"
                className="h-11 rounded-2xl border-emerald-200 bg-white px-5 text-emerald-700 transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-800 active:scale-[0.98]"
              >
                <Send className="size-4" />
                Envoyer via WhatsApp
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 h-1.5 w-10 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-950">Message retravaille par l&apos;IA</h3>
            <div className="mt-3 min-h-40 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
              {messageToSend ? (
                messageToSend
              ) : (
                <span className="text-slate-400">Votre message prepare apparaitra ici avant l&apos;ouverture de WhatsApp.</span>
              )}
            </div>
            {previewUrl && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <img src={previewUrl} alt="Apercu du visuel WhatsApp" className="h-40 w-full object-cover" />
              </div>
            )}
            <div
              className={cn(
                "mt-4 flex items-start gap-2 rounded-2xl border p-3 text-xs leading-5",
                copied ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"
              )}
            >
              {copied ? <CheckCircle2 className="mt-0.5 size-4 flex-shrink-0" /> : <Clipboard className="mt-0.5 size-4 flex-shrink-0" />}
              <span>
                {copied && mediaPrepared
                  ? "Le texte et l'image ont ete prepares dans le presse-papiers. Ouvrez une conversation WhatsApp et collez avant d'envoyer."
                  : copied
                    ? "Le texte a ete copie. Dans WhatsApp, choisissez le destinataire puis envoyez."
                    : "Le message retravaille par l'IA apparait ici avant l'ouverture de WhatsApp."}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 h-1.5 w-10 rounded-full bg-emerald-500" />
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Automatisations WhatsApp</h2>
            <p className="mt-2 text-sm text-slate-600">
              Retrouvez les scenarios deja presents dans Mes automatisations, prets a etre parametres pour WhatsApp.
            </p>
          </div>
          <Link href="/dashboard/automations" className="w-full sm:w-auto">
            <Button className="h-11 w-full rounded-2xl bg-emerald-700 px-5 text-white transition-transform duration-200 hover:bg-emerald-800 active:scale-[0.98] sm:w-auto">
              <CalendarClock className="size-4" />
              Parametrer les envois
            </Button>
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {AUTOMATION_SCENARIOS.map((scenario) => (
            <article
              key={scenario.label}
              className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-all duration-200 hover:border-emerald-200 hover:shadow-[0_16px_32px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">{scenario.label}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{scenario.description}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  {scenario.status}
                </span>
              </div>
              <Link
                href="/dashboard/automations"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:text-emerald-800"
              >
                Configurer
                <ArrowRight className="size-3.5" />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
