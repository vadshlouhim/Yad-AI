import Image from "next/image";
import {
  ArrowRight,
  Check,
  Download,
  FileText,
  ImagePlus,
  Paintbrush,
  Printer,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";
import type { PublicTool } from "@/lib/public-tools";
import {
  MOBILE_HOME_HEADER_CLASS,
  MODULE_COLORS,
  NEWSLETTER_HEADER_CLASS,
  POSTER_HEADER_CLASS,
} from "@/components/presentation/platform-style";
import {
  AgentTile,
  CHANNEL_VISUALS,
  ToolIcon,
} from "@/components/presentation/tool-visual";

export type DemoScreenProps = {
  tool: PublicTool;
  phase: number;
  progress: number;
};
const INVITATION =
  "Un Chabbat, ensemble. Retrouvez-nous vendredi à 19 h 30 pour un repas communautaire. Réservez votre place auprès de la communauté de démonstration.";
export function DemoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 min-h-5 text-sm font-semibold text-slate-900">
        {value || "\u00a0"}
      </p>
    </div>
  );
}
export function DemoAction({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={`flex min-h-11 items-center justify-center gap-2 rounded-2xl px-3 text-center text-xs font-black ${dark ? "bg-[#17253f] text-white" : "bg-gradient-to-r from-[#7130d8] to-[#d92d7c] text-white"}`}
    >
      {children}
    </div>
  );
}
export function ExamplePoster({ compact = false }: { compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl bg-[#fffdf7]">
      <Image
        src="/presentation/chabbat-demo.png"
        alt="Affiche fictive d’un repas communautaire de Chabbat"
        width={424}
        height={600}
        sizes="(max-width: 640px) 70vw, 320px"
        className={`mx-auto w-full object-contain ${compact ? "max-h-56" : "max-h-80"}`}
      />
    </div>
  );
}

export function HomeDemoScreen({ progress }: { progress: number }) {
  return (
    <div className="bg-[#fffaf4] pb-4">
      <div className={`${MOBILE_HOME_HEADER_CLASS} !px-4 !pt-5 !pb-5`}>
        <p className="text-2xl font-black leading-none tracking-tight">
          Bienvenue, Sarah
        </p>
        <div className="mt-5 flex items-center justify-between">
          <p className="flex items-center gap-2 text-lg font-extrabold">
            <Sparkles className="size-5 fill-[#ffba13] text-[#ffba13]" />
            Vos agents IA
          </p>
          <ArrowRight className="size-5" />
        </div>
        <div className="mt-3 flex gap-3 overflow-hidden">
          <AgentTile
            name="Dov"
            role="Réseaux sociaux"
            portrait="/agents/dov-ber-transparent.png"
          />
          <AgentTile
            name="David"
            role="Automatisations"
            portrait="/agents/david-transparent.png"
          />
        </div>
      </div>
      <div className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-black tracking-tight">
          <Sparkles className="size-5 fill-[#ffb20b] text-[#ffb20b]" />
          Que souhaitez-vous faire ?
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            ["publish", "Publier partout en un clic", MODULE_COLORS.publish],
            ["newsletter", "Le Newsletter", MODULE_COLORS.newsletter],
            ["contacts", "Contacts", MODULE_COLORS.contacts],
            ["posters", "Affiches & Visuels", MODULE_COLORS.posters],
          ].map(([id, name, surface]) => (
            <div
              key={id}
              className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-[1.8rem] border border-white/25 p-3 text-center text-white shadow-lg ${surface} ${id === "posters" && progress > 0.65 ? "ring-4 ring-white/80 scale-[0.98]" : ""}`}
            >
              <ToolIcon id={id} className="size-7" />
              <span className="text-sm font-black leading-tight">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export function PosterDemoScreen({ phase, progress }: DemoScreenProps) {
  if (phase === 0)
    return (
      <div className="space-y-4 p-4">
        <div className={`${POSTER_HEADER_CLASS} !p-5`}>
          <div className="flex gap-3">
            <Paintbrush className="size-9 shrink-0 rounded-xl bg-white/15 p-1.5" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-white/70">
                Banque visuelle
              </p>
              <h3 className="mt-1 text-2xl font-black leading-none">
                BANQUE
                <br />
                D’AFFICHES
              </h3>
              <p className="mt-3 text-xs font-semibold leading-5 text-white/80">
                Choisissez une affiche et décrivez simplement les textes à
                modifier.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-[2rem] border border-violet-100 bg-[#fffaf4] p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#d92d7c]">
            Explorez les thèmes
          </p>
          <h3 className="mt-1 text-lg font-black">Trouvez l’affiche idéale</h3>
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white p-3 text-xs text-slate-500">
            <Search className="size-4" />
            Rechercher une affiche…
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {["Toutes", "Chabbat", "Fêtes", "Événements"].map((label) => (
              <div
                key={label}
                className={`rounded-2xl border py-3 text-center text-xs font-black ${label === "Chabbat" && progress > 0.45 ? "border-[#421388] bg-[#421388] text-white" : "border-violet-200 bg-white text-violet-700"}`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
        <div
          className={`rounded-2xl bg-white p-3 shadow-sm ${progress > 0.8 ? "ring-2 ring-[#d92d7c]" : ""}`}
        >
          <ExamplePoster compact />
          <p className="mt-2 text-xs font-black text-[#d92d7c]">
            Personnaliser · exemple fictif
          </p>
        </div>
      </div>
    );
  if (phase === 1)
    return (
      <div className="space-y-4 p-4">
        <p className="text-xs font-black text-violet-700">
          ← Retour aux affiches
        </p>
        <div className="rounded-[2rem] border border-violet-100 bg-white p-5">
          <Sparkles className="size-8 rounded-xl bg-violet-100 p-1.5 text-violet-700" />
          <h3 className="mt-3 text-xl font-black">
            Que souhaitez-vous afficher ?
          </h3>
          <div className="mt-4 min-h-28 rounded-2xl border border-violet-100 bg-[#fffaf4] p-4 text-sm leading-6 text-slate-800">
            {INVITATION.slice(0, Math.floor(progress * INVITATION.length))}
            <span className="text-violet-700">▏</span>
          </div>
          <div className="mt-4">
            <DemoAction>
              <Sparkles className="size-4" />
              Préparer la personnalisation
            </DemoAction>
          </div>
        </div>
        <ExamplePoster compact />
      </div>
    );
  return (
    <div className="space-y-4 p-5">
      <p className="text-xs font-black text-violet-700">
        ← Retour aux modifications
      </p>
      <h3 className="text-xl font-black">Votre aperçu</h3>
      <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50/40 p-3">
        <ExamplePoster />
      </div>
      <DemoAction>
        <ImagePlus className="size-4" />
        Affiche prête à être relue
      </DemoAction>
      <p className="text-center text-[10px] text-slate-500">
        Exemple fictif · aucune génération
      </p>
    </div>
  );
}
export function PublishDemoScreen({ phase, progress }: DemoScreenProps) {
  const chosen = Math.floor(progress * 4);
  return (
    <div className="space-y-4 p-4">
      <div className="flex min-h-36 items-center gap-2 overflow-hidden rounded-[1.6rem] bg-[#d92d7c] p-4 text-white">
        <div className="min-w-0 flex-1">
          <div className="mb-3 h-1 w-8 rounded-full bg-white/80" />
          <h3 className="text-2xl font-black leading-[1.04] tracking-tight">
            Publiez partout,
            <br />
            depuis un seul espace
          </h3>
        </div>
        <Image
          src="/agents/dov-ber-transparent.png"
          alt=""
          width={80}
          height={125}
          sizes="80px"
          className="h-32 w-20 shrink-0 object-contain object-bottom"
        />
      </div>
      {phase === 0 ? (
        <div className="space-y-3 rounded-2xl border border-rose-100 bg-white p-4">
          <DemoAction>
            <Sparkles className="size-4" />
            Transformer avec l’IA
          </DemoAction>
          <div className="min-h-32 rounded-xl border border-slate-200 p-3 text-sm leading-6 text-slate-800">
            {INVITATION.slice(0, Math.floor(progress * INVITATION.length))}
          </div>
          <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-rose-300 bg-rose-50/60 p-3 text-xs font-bold">
            <Upload className="size-4" />
            Ajouter une image
          </div>
          <div className="grid grid-cols-2 gap-2">
            <DemoAction>
              <ImagePlus className="size-4" />
              Banque d’images
            </DemoAction>
            <DemoAction>
              <Sparkles className="size-4" />
              Créer avec l’IA
            </DemoAction>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-fuchsia-100 bg-white p-4">
          <h3 className="text-base font-black">Choisissez vos canaux</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Sélectionnez les réseaux qui recevront cette publication.
          </p>
          <div className="mt-3 space-y-3">
            {CHANNEL_VISUALS.map((channel, index) => (
              <div
                key={channel.name}
                className={`rounded-xl border border-white/25 p-3 text-white shadow-md ${channel.surface} ${phase === 1 && index >= chosen ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white">
                    <Image src={channel.logo} width={24} height={24} alt="" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black">
                      {channel.name}
                    </span>
                    <span className="text-[10px] text-white/85">
                      Canal de démonstration
                    </span>
                  </span>
                  {(phase === 2 || index < chosen) && (
                    <Check className="size-5 rounded-full bg-white p-1 text-[#d92d7c]" />
                  )}
                </div>
                <p className="mt-3 border-t border-white/20 pt-2 text-[10px] font-bold">
                  {phase === 2 || index < chosen
                    ? "Sélectionné pour l’exemple"
                    : "Sélectionnez ce canal"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {phase === 2 && (
        <p className="rounded-2xl bg-violet-50 p-3 text-center text-xs font-bold text-violet-900">
          Publication préparée · aucun envoi
        </p>
      )}
    </div>
  );
}
export function NewsletterDemoScreen({ phase, progress }: DemoScreenProps) {
  return (
    <div className="space-y-4 bg-[#fffaf1] pb-5">
      <div className={`${NEWSLETTER_HEADER_CLASS} !px-5 !py-5`}>
        <p className="text-[9px] font-black uppercase tracking-widest text-[#e9c76a]">
          Votre feuillet communautaire
        </p>
        <h3 className="mt-2 text-3xl font-black leading-none tracking-tight">
          Le Chabaton{" "}
          <span className="rounded-lg bg-[#e9c76a] px-2 py-1 align-middle text-[10px] text-[#17253f]">
            PDF
          </span>
        </h3>
      </div>
      <div className="px-4">
        <div className="mb-4 grid grid-cols-3 gap-2">
          {["Rubriques", "Contenu", "Aperçu"].map((label, index) => (
            <div
              key={label}
              className={`flex min-h-12 items-center justify-center gap-1 rounded-2xl border px-1 text-[10px] font-black ${index === phase ? "border-[#17253f] bg-[#17253f] text-white" : "border-[#e6dcc7] bg-white text-[#5d6b7d]"}`}
            >
              <span
                className={
                  index === phase
                    ? "rounded-md bg-[#e9c76a] px-1.5 py-1 text-[#17253f]"
                    : "px-1"
                }
              >
                {index + 1}
              </span>
              {label}
            </div>
          ))}
        </div>
        {phase === 0 ? (
          <div className="rounded-[1.65rem] border border-[#e6dcc7] bg-white p-4">
            <h3 className="text-lg font-black">Rubriques à activer</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                "Mot du Rav",
                "Photos",
                "Affiches",
                "Événements",
                "Anniversaires",
                "Chabbat",
              ].map((name, index) => (
                <div
                  key={name}
                  className={`flex min-h-16 flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-xs font-bold ${index <= progress * 6 ? "border-[#b8c6d9] bg-[#edf2f8] text-[#17253f]" : "border-[#e1e7ef] text-slate-600"}`}
                >
                  <FileText className="size-5" />
                  {name}
                </div>
              ))}
            </div>
          </div>
        ) : phase === 1 ? (
          <div className="space-y-3 rounded-[1.65rem] border border-[#e6dcc7] bg-white p-4">
            <h3 className="text-lg font-black">Les détails</h3>
            <DemoField label="Titre" value="Le Chabatone" />
            <DemoField
              label="Événement"
              value={"Repas communautaire de Chabbat".slice(
                0,
                Math.floor(progress * 31),
              )}
            />
            <DemoField
              label="Votre communauté"
              value="Communauté de démonstration"
            />
          </div>
        ) : (
          <div>
            <div className="mb-3 grid grid-cols-2 gap-2 text-center text-xs font-black">
              <div className="rounded-2xl bg-[#17253f] py-3 text-white">
                Recto
              </div>
              <div className="rounded-2xl border border-[#e6dcc7] bg-white py-3 text-[#17253f]">
                Verso
              </div>
            </div>
            <article className="rounded-xl border-[6px] border-[#e1e7ef] bg-[#fffdf7] p-4 text-[#17253f]">
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#52648e]">
                Feuillet hebdomadaire de Chabbat
              </p>
              <h4 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                Le Chabatone
              </h4>
              <p className="mt-2 text-xs font-semibold leading-5">
                Votre feuillet communautaire des activités de la semaine.
              </p>
              <p className="mt-4 text-xs font-bold">
                Communauté de démonstration
              </p>
              <div className="my-4 grid grid-cols-2 gap-2">
                {["Vie communautaire", "Rendez-vous"].map((label) => (
                  <div
                    key={label}
                    className="rounded-2xl bg-[#1b284c] p-3 text-[10px] font-bold text-white"
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="border-t-4 border-[#1b284c] pt-3">
                <p className="text-[9px] font-black uppercase tracking-widest">
                  Activités et événements à venir
                </p>
                <h4 className="mt-2 text-lg font-black">
                  Un Chabbat, ensemble.
                </h4>
                <p className="mt-1 text-xs">
                  Repas communautaire · vendredi, 19 h 30.
                </p>
              </div>
            </article>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-black">
              <div className="flex items-center justify-center gap-1 rounded-xl bg-[#17253f] p-3 text-white">
                <Sparkles className="size-3" />
                IA
              </div>
              <div className="flex items-center justify-center gap-1 rounded-xl border border-[#e6dcc7] bg-white p-3">
                <Printer className="size-3" />
                Imprimer
              </div>
              <div className="flex items-center justify-center gap-1 rounded-xl bg-[#e9c76a] p-3">
                <Download className="size-3" />
                PDF
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export function SummaryDemoScreen() {
  return (
    <div className="flex min-h-full flex-col justify-center gap-3 bg-[#fffaf4] p-5 [&_img]:max-h-40">
      <Sparkles className="size-9 fill-[#ffba13] text-[#ffba13]" />
      <h3 className="text-3xl font-black leading-none tracking-tight text-[#421388]">
        Un événement.
        <br />
        Trois résultats.
      </h3>
      <ExamplePoster compact />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#2962ff] p-4 text-white">
          <ToolIcon id="publish" className="size-5" />
          <p className="mt-3 text-sm font-black">Diffusion préparée</p>
        </div>
        <div className="rounded-2xl bg-[#17253f] p-4 text-white">
          <FileText className="size-6 text-[#e9c76a]" />
          <p className="mt-3 text-sm font-black">Newsletter prête à relire</p>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Exemples fictifs. Aucun envoi ni génération.
      </p>
    </div>
  );
}
