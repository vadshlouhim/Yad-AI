import type { Metadata } from "next";
import { Film, Sparkles, UploadCloud, Video, WandSparkles } from "lucide-react";
import { AgentPageBanner } from "@/components/dashboard/agent-page-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComingSoonActionGuard } from "@/components/dashboard/coming-soon-action-guard";

export const metadata: Metadata = { title: "Clip Video - EasyCom IA" };

const mockClips = [
  { title: "Clip recap de votre evenement", status: "Bientot", detail: "Aucun clip pour le moment" },
  { title: "Clip format reseaux sociaux", status: "Bientot", detail: "Disponible des l'ouverture de la fonctionnalite" },
  { title: "Clip photos + videos", status: "Bientot", detail: "Vos prochains clips apparaitront ici" },
];

export default function ClipRecapPage() {
  return (
    <ComingSoonActionGuard>
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      <AgentPageBanner
        eyebrow="Studio vidéo"
        title="CLIP VIDEO"
        description="Bientôt, vous pourrez téléverser vos photos et vidéos, donner vos instructions à l’IA, et recevoir un clip prêt à publier sur vos réseaux."
        icon={Video}
        tone="rose"
        stats={[
          { label: "Format", value: "Réseaux" },
          { label: "Montage", value: "IA" },
          { label: "Statut", value: "Bientôt" },
        ]}
      />

      <section className="hidden overflow-hidden rounded-3xl border border-[#c97a85] bg-gradient-to-br from-[#6c1829] via-[#8c2339] to-[#b03b52] p-6 shadow-[0_24px_60px_-32px_rgba(127,29,29,0.45)]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 h-1.5 w-12 rounded-full bg-rose-200/90" />
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">CLIP VIDEO</h1>
              <Badge className="border-white/20 bg-white/14 text-white">A venir</Badge>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-rose-50/90">
              Bientot, vous pourrez televerser vos photos et videos, donner vos instructions a l&apos;IA, et recevoir un clip pret a publier sur vos reseaux.
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-inner shadow-rose-950/20">
            <Video className="size-7" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
        <Card className="rounded-3xl border border-rose-100 bg-white shadow-[0_18px_48px_rgba(127,29,29,0.07)]">
          <CardHeader className="space-y-2 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2 text-rose-600">
              <WandSparkles className="size-4" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">Assistant IA video</span>
            </div>
            <CardTitle className="text-2xl font-black tracking-tight text-slate-950">Assistant IA video</CardTitle>
            <p className="text-sm text-slate-500">Decrivez le clip que vous aimeriez creer.</p>
          </CardHeader>
          <CardContent className="space-y-5 p-6">
            <div className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-red-50/50 p-4 shadow-inner shadow-rose-100/40">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-sm">
                  <Sparkles className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Assistant IA</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Televersez vos photos et videos, puis dites-moi le style souhaite. L&apos;IA transformera vos contenus en clip video pret a publier.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Instructions</label>
              <textarea
                rows={5}
                disabled
                placeholder="Ex. Clip dynamique de 45 secondes, musique joyeuse, textes courts, format reseaux sociaux..."
                className="w-full resize-none rounded-3xl border border-rose-100 bg-rose-50/40 px-4 py-4 text-sm leading-6 text-slate-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Photos et videos</label>
                <Badge variant="secondary" className="bg-rose-100 text-rose-700">Bientot disponible</Badge>
              </div>
              <div className="rounded-3xl border border-dashed border-rose-200 bg-gradient-to-br from-rose-50 via-white to-red-50 p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-sm shadow-rose-100/70">
                  <UploadCloud className="size-6" />
                </div>
                <p className="mt-4 text-sm font-semibold text-slate-800">Glissez vos fichiers ici ou ajoutez-les depuis votre ordinateur.</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Zone de televersement fictive pour le moment.</p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 rounded-3xl border border-rose-100 bg-rose-50/50 p-4">
              <Button className="h-11 rounded-2xl bg-[#8A184D] px-5 text-white hover:bg-[#731441]">
                Creer mon clip
              </Button>
              <p className="text-xs text-slate-500">Cette fonctionnalite sera bientot disponible.</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border border-rose-100 bg-white shadow-[0_18px_48px_rgba(127,29,29,0.07)]">
            <CardHeader className="border-b border-slate-100 pb-5">
              <div className="flex items-center gap-2 text-rose-600">
                <Film className="size-4" />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Mes clips video</span>
              </div>
              <CardTitle className="text-xl font-black tracking-tight text-slate-950">Mes clips video</CardTitle>
              <p className="text-sm text-slate-500">
                Vos clips crees avec l&apos;IA apparaitront ici des que la fonctionnalite sera disponible.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              {mockClips.map((clip) => (
                <div key={clip.title} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{clip.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{clip.detail}</p>
                    </div>
                    <Badge variant="secondary" className="bg-rose-100 text-rose-700">
                      {clip.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-orange-50 shadow-sm shadow-rose-100/50">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-slate-800">Fonctionnalite en preparation</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                L&apos;interface est prete pour vous montrer l&apos;experience a venir, sans activer d&apos;upload reel ni de generation video pour l&apos;instant.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </ComingSoonActionGuard>
  );
}
