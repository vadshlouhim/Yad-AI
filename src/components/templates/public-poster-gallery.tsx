"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogIn, UserPlus, X } from "lucide-react";
import {
  PosterGallery,
  posterTemplateImage,
  type PosterGalleryTemplate,
} from "./poster-gallery";
import { CanvaLogo } from "./template-actions";

interface Props {
  templates: PosterGalleryTemplate[];
}

export function PublicPosterGallery({ templates }: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<PosterGalleryTemplate | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  function closePreview() {
    setSelectedTemplate(null);
  }

  useEffect(() => {
    if (!selectedTemplate) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePreview();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [selectedTemplate]);

  const imageUrl = selectedTemplate ? posterTemplateImage(selectedTemplate) : null;
  const callbackUrl = selectedTemplate
    ? `/dashboard/templates?templateId=${encodeURIComponent(selectedTemplate.id)}`
    : "/dashboard/templates";
  const loginUrl = `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <>
      <PosterGallery
        templates={templates}
        onSelect={(template) => {
          if (!template.supportsAi && template.hasCanva) {
            window.open(`/templates/canva/${encodeURIComponent(template.id)}`, "_blank", "noopener,noreferrer");
            return;
          }
          triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          setSelectedTemplate(template);
        }}
        getStatus={(template) => ({
          label: template.supportsAi && template.hasCanva ? "Choisir IA ou Canva" : template.hasCanva ? "Ouvrir dans Canva" : "Voir et personnaliser",
          className: template.hasCanva && !template.supportsAi ? "text-blue-700" : "text-[#d92d7c]",
        })}
        gallerySubtitle="Parcourez toutes nos affiches. Ouvrez un modèle pour le voir en grand."
      />

      {selectedTemplate ? (
        <div
          className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/85 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePreview();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="public-poster-title"
            aria-describedby="public-poster-description"
            className="relative mx-auto grid min-h-[calc(100dvh-1.5rem)] w-full max-w-6xl overflow-hidden rounded-[1.5rem] bg-white shadow-2xl sm:min-h-[calc(100dvh-3rem)] sm:rounded-[2rem] lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closePreview}
              className="absolute right-3 top-3 z-20 inline-flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-lg transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
              aria-label="Fermer l'aperçu"
              title="Fermer"
            >
              <X className="size-5" aria-hidden="true" />
            </button>

            <div className="flex min-h-[52dvh] items-center justify-center bg-[#f7f3ee] p-3 sm:p-6 lg:min-h-0">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={selectedTemplate.name}
                  className="max-h-[64dvh] w-full object-contain lg:max-h-[calc(100dvh-6rem)]"
                />
              ) : (
                <p className="text-sm font-semibold text-slate-500">Aucun aperçu disponible.</p>
              )}
            </div>

            <div className="flex flex-col justify-center border-t border-slate-200 bg-white p-5 sm:p-8 lg:border-l lg:border-t-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Affiche sélectionnée</p>
              <h2 id="public-poster-title" className="mt-2 pr-10 text-2xl font-black text-slate-950 sm:text-3xl">
                {selectedTemplate.name}
              </h2>
              {selectedTemplate.description ? (
                <p className="mt-3 text-sm leading-6 text-slate-500">{selectedTemplate.description}</p>
              ) : null}
              <p id="public-poster-description" className="mt-6 text-base font-semibold leading-7 text-slate-700">
                {selectedTemplate.supportsAi && selectedTemplate.hasCanva
                  ? "Cette affiche est disponible avec EasyCom IA et dans Canva. Choisissez l’outil qui vous convient."
                  : "Connectez-vous ou créez un compte EasyCom IA pour personnaliser automatiquement cette affiche."}
              </p>

              <div className="mt-7 grid gap-3">
                {selectedTemplate.supportsAi ? <>
                  <Link
                    href={loginUrl}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#421388] px-4 text-sm font-black text-white transition hover:bg-[#35106d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
                  >
                    <LogIn className="size-4" aria-hidden="true" />
                    Personnaliser avec l’IA
                  </Link>
                  <Link
                    href={`/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-black text-violet-800 transition hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
                  >
                    <UserPlus className="size-4" aria-hidden="true" />
                    Créer un compte
                  </Link>
                </> : null}
                {selectedTemplate.hasCanva ? (
                  <a
                    href={`/templates/canva/${encodeURIComponent(selectedTemplate.id)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1778f2] px-4 text-sm font-black text-white transition hover:bg-[#1268d7] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
                  >
                    <CanvaLogo className="h-5 brightness-0 invert" />
                    Ouvrir dans Canva
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
