// Loaded only with the preview dialog. These are read-only presentation views.
import Image from "next/image";
import {
  BookOpen,
  CalendarDays,
  Check,
  Search,
  Star,
  Users,
} from "lucide-react";
import { ToolIcon } from "@/components/presentation/tool-visual";
import {
  DemoAction,
  DemoField,
  ExamplePoster,
  type DemoScreenProps,
} from "./platform-demo-screens";

export const TOOL_DEMO_CONFIG: Record<
  string,
  {
    title: string;
    section: string;
    tabs: readonly string[];
    fields: readonly [string, string][];
    family:
      | "chat"
      | "document"
      | "resources"
      | "message"
      | "contacts"
      | "review"
      | "automation"
      | "calendar";
  }
> = {
  assistant: {
    title: "Vos agents IA",
    section: "Votre conversation",
    tabs: ["Agents", "Conversation"],
    fields: [["Votre besoin", "Préparons l’annonce du repas de Chabbat"]],
    family: "chat",
  },
  torah: {
    title: "Cours de Torah IA",
    section: "Préparons votre cours",
    tabs: ["Durée", "Public", "Thème"],
    fields: [
      ["Durée souhaitée", "15 minutes"],
      ["À qui s’adresse le cours ?", "Adultes · débutants"],
      ["Thème", "L’accueil et le partage"],
    ],
    family: "document",
  },
  library: {
    title: "Bibliothèque partagée",
    section: "Ressources communautaires",
    tabs: ["Ressources", "Demandes"],
    fields: [
      ["Recherche", "Supports pour la vie communautaire"],
      ["Type", "Cours et activités"],
    ],
    family: "resources",
  },
  creations: {
    title: "Mes créations",
    section: "Votre collection de visuels",
    tabs: ["Toutes", "Affiches"],
    fields: [["Recherche", "Repas de Chabbat"]],
    family: "resources",
  },
  instagram: {
    title: "Instagram",
    section: "Votre publication",
    tabs: ["Créer", "Historique"],
    fields: [
      ["Votre légende", "Un Chabbat, ensemble"],
      ["Visuel", "Affiche du repas communautaire"],
    ],
    family: "message",
  },
  facebook: {
    title: "Facebook",
    section: "Votre publication",
    tabs: ["Créer", "Historique"],
    fields: [
      ["Votre texte", "Retrouvons-nous pour le repas de Chabbat"],
      ["Visuel", "Affiche du repas communautaire"],
    ],
    family: "message",
  },
  whatsapp: {
    title: "WhatsApp",
    section: "Votre message",
    tabs: ["Message", "Destinataires", "Programmation"],
    fields: [
      ["Votre message", "Retrouvons-nous vendredi pour Chabbat"],
      ["Destinataires", "Participants au repas · exemple"],
    ],
    family: "message",
  },
  email: {
    title: "Email",
    section: "Votre boîte email",
    tabs: ["Boîte de réception", "Réponses", "Règles IA"],
    fields: [
      ["Objet", "Invitation au repas communautaire"],
      ["Brouillon", "Bonjour, partageons un Chabbat ensemble"],
    ],
    family: "message",
  },
  targeted: {
    title: "Communication ciblée",
    section: "Votre public",
    tabs: ["Publics", "Messages"],
    fields: [
      ["Groupe", "Participants au repas"],
      ["Message", "Invitation au prochain Chabbat"],
    ],
    family: "contacts",
  },
  reviews: {
    title: "Avis Google",
    section: "Vos avis",
    tabs: ["Avis", "Réponses"],
    fields: [
      ["Avis fictif", "Un accueil chaleureux et attentionné"],
      ["Réponse à relire", "Merci pour votre visite et votre retour"],
    ],
    family: "review",
  },
  automations: {
    title: "Vos automatisations",
    section: "Communication communautaire",
    tabs: ["Modules", "Automatisations enregistrées"],
    fields: [
      ["Module", "Communication hebdomadaire"],
      ["Rythme", "Chaque semaine"],
      ["Validation", "Relecture avant diffusion"],
    ],
    family: "automation",
  },
  shabbat: {
    title: "Horaires de Chabbat",
    section: "Votre programmation",
    tabs: ["Configuration", "Programmation"],
    fields: [
      ["Ville", "Paris"],
      ["Rythme", "Chaque vendredi"],
      ["Canaux", "Vos canaux à connecter"],
    ],
    family: "automation",
  },
  "daily-study": {
    title: "Hayom Yom & Sefer Hamitsvot",
    section: "Votre étude quotidienne",
    tabs: ["Contenu", "Programmation"],
    fields: [
      ["Contenus", "Hayom Yom · Sefer Hamitsvot"],
      ["Rythme", "Quotidien"],
      ["Validation", "À relire"],
    ],
    family: "automation",
  },
  birthdays: {
    title: "Anniversaires juifs",
    section: "Votre programmation",
    tabs: ["Contacts", "Message", "Programmation"],
    fields: [
      ["Contact fictif", "Léa"],
      ["Votre message", "Un joyeux anniversaire, Léa !"],
      ["Canaux", "Votre sélection"],
    ],
    family: "automation",
  },
  reminders: {
    title: "Rappels d’événements",
    section: "Votre programmation",
    tabs: ["Événement", "Message", "Programmation"],
    fields: [
      ["Événement", "Repas de Chabbat"],
      ["Rappel", "Avant l’événement"],
      ["Message", "Nous avons hâte de vous retrouver"],
    ],
    family: "automation",
  },
  recap: {
    title: "Récaps automatiques",
    section: "Votre programmation",
    tabs: ["Période", "Contenu", "Programmation"],
    fields: [
      ["Période", "La semaine communautaire"],
      ["Contenu", "Activités et prochains rendez-vous"],
      ["Validation", "Votre relecture"],
    ],
    family: "automation",
  },
  "weekly-images": {
    title: "Images hebdomadaires",
    section: "Votre programmation",
    tabs: ["Visuel", "Programmation"],
    fields: [
      ["Visuel", "Votre sélection"],
      ["Rythme", "Hebdomadaire"],
      ["Validation", "Aperçu à relire"],
    ],
    family: "automation",
  },
  holidays: {
    title: "Fêtes juives",
    section: "Votre programmation",
    tabs: ["Fête", "Message", "Programmation"],
    fields: [
      ["Fête", "Votre sélection"],
      ["Message", "Une invitation à partager"],
      ["Canaux", "Vos canaux à connecter"],
    ],
    family: "automation",
  },
  events: {
    title: "Mon Agenda",
    section: "Votre semaine",
    tabs: ["Calendrier", "Liste"],
    fields: [
      ["Événement", "Repas de Chabbat"],
      ["Horaire du repas", "Vendredi · 19 h 30"],
      ["Lieu", "Lieu fictif"],
    ],
    family: "calendar",
  },
  contacts: {
    title: "Mes contacts",
    section: "Vos contacts",
    tabs: ["Contacts", "Groupes"],
    fields: [
      ["Recherche", "Participants au repas"],
      ["Groupe", "Vie communautaire"],
    ],
    family: "contacts",
  },
  calendar: {
    title: "Calendrier hébraïque",
    section: "Vos prochains rendez-vous",
    tabs: ["Chabbat", "Fêtes"],
    fields: [
      ["Ville", "Paris"],
      ["Période", "Votre sélection"],
    ],
    family: "calendar",
  },
  "daily-assistant": {
    title: "Assistant du quotidien",
    section: "Votre demande",
    tabs: ["Conversation", "Exemples rapides"],
    fields: [["Votre demande", "Ajoute une réunion mardi à 18 h"]],
    family: "chat",
  },
};

export function ToolDemoScreen({ tool, phase, progress }: DemoScreenProps) {
  const config = TOOL_DEMO_CONFIG[tool.id];
  if (!config) throw new Error(`Missing public presentation for ${tool.id}`);
  const family = config.family;
  return (
    <div className="space-y-4 bg-[#fffaf4] p-4">
      <div
        className={`relative overflow-hidden rounded-[2rem] p-5 text-white ${tool.id === "daily-assistant" ? "bg-gradient-to-br from-slate-950 via-blue-950 to-sky-800" : "bg-[radial-gradient(circle_at_72%_12%,#7028bd_0%,#421388_45%,#210763_100%)]"}`}
      >
        <div className="flex items-start gap-3">
          <ToolIcon id={tool.id} className="size-7" />
          <h3 className="min-w-0 flex-1 text-2xl font-black leading-tight tracking-tight">
            {config.title}
          </h3>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Image
            src={tool.portrait}
            width={40}
            height={55}
            sizes="40px"
            alt=""
            className="h-14 w-10 object-contain"
          />
          <span className="text-xs font-bold">
            {tool.agent}, votre agent IA
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {config.tabs.map((tab, index) => (
          <span
            key={tab}
            className={`rounded-xl px-3 py-2 text-[10px] font-bold ${index === Math.min(phase, config.tabs.length - 1) ? "bg-[#421388] text-white" : "border border-violet-100 bg-white text-violet-800"}`}
          >
            {tab}
          </span>
        ))}
      </div>
      {phase < 2 ? (
        <div className="space-y-3 rounded-[1.8rem] border border-violet-100 bg-white p-4">
          <h3 className="text-lg font-black">{config.section}</h3>
          {phase === 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-violet-50 p-3 text-xs font-semibold text-violet-800">
              <Search className="size-4" />
              {config.fields[0][1]}
            </div>
          )}
          {config.fields.map(([label, value], index) => (
            <DemoField
              key={label}
              label={label}
              value={
                phase === 0
                  ? index === 0 && progress > 0.6
                    ? value
                    : "Votre sélection"
                  : value.slice(0, Math.floor(progress * value.length))
              }
            />
          ))}
          <DemoAction>Préparation de l’exemple</DemoAction>
        </div>
      ) : (
        <div className="space-y-4 rounded-[1.8rem] border border-violet-100 bg-white p-4">
          {family === "contacts" ? (
            <>
              <h3 className="flex items-center gap-2 text-lg font-black">
                <Users className="size-5" />
                {config.section}
              </h3>
              {["Sarah", "Léa", "David"].map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-3 rounded-xl border border-violet-100 p-3"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-800">
                    {name[0]}
                  </span>
                  <span className="flex-1 text-sm font-semibold">
                    {name}
                    <span className="block text-[9px] text-slate-500">
                      Contact fictif · vie communautaire
                    </span>
                  </span>
                  <Check className="size-4 text-teal-700" />
                </div>
              ))}
            </>
          ) : family === "calendar" ? (
            <>
              <h3 className="flex items-center gap-2 text-lg font-black">
                <CalendarDays className="size-5" />
                {config.section}
              </h3>
              <div className="grid grid-cols-5 gap-1 text-center">
                {["Lun", "Mar", "Mer", "Jeu", "Ven"].map((day) => (
                  <div
                    key={day}
                    className={`rounded-xl p-2 text-[10px] font-bold ${day === "Ven" ? "bg-[#421388] text-white" : "bg-violet-50 text-violet-800"}`}
                  >
                    {day}
                  </div>
                ))}
              </div>
              <DemoField
                label={
                  tool.id === "events"
                    ? "Événement fictif"
                    : "Rendez-vous hebdomadaire"
                }
                value={
                  tool.id === "events"
                    ? "Repas de Chabbat · 19 h 30"
                    : "Chabbat · horaires selon votre ville"
                }
              />
            </>
          ) : family === "resources" ? (
            <>
              <h3 className="text-lg font-black">{config.section}</h3>
              {tool.id === "creations" ? (
                <ExamplePoster compact />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {["Support de cours", "Idée d’activité"].map((title) => (
                    <div key={title} className="rounded-2xl bg-violet-50 p-4">
                      <BookOpen className="size-7 text-violet-700" />
                      <p className="mt-3 text-xs font-black">{title}</p>
                      <p className="mt-1 text-[9px] text-slate-500">
                        Ressource fictive
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : family === "review" ? (
            <>
              <p
                className="flex gap-1 text-[#b07b32]"
                aria-label="Exemple d’avis"
              >
                <Star className="size-5" />
                <Star className="size-5" />
                <Star className="size-5" />
              </p>
              <blockquote className="text-sm font-semibold">
                « Un accueil chaleureux et attentionné. »
              </blockquote>
              <DemoField
                label="Proposition de réponse"
                value="Merci pour votre visite et votre retour."
              />
            </>
          ) : family === "chat" ? (
            <>
              <div className="ml-7 rounded-2xl bg-[#421388] p-3 text-xs text-white">
                {config.fields[0][1]}
              </div>
              <div className="mr-4 rounded-2xl bg-violet-50 p-3 text-xs leading-6 text-slate-800">
                {tool.id === "daily-assistant"
                  ? "Voici un aperçu de votre réunion. Relisez les détails avant de confirmer."
                  : "Préparons votre annonce ensemble. Voici une proposition à relire et à adapter."}
              </div>
            </>
          ) : family === "automation" ? (
            <>
              <h3 className="text-lg font-black">Aperçu de la programmation</h3>
              {config.fields.map(([label, value]) => (
                <DemoField key={label} label={label} value={value} />
              ))}
              <p className="rounded-xl bg-teal-50 p-3 text-xs font-bold text-teal-800">
                Scénario fictif · non activé
              </p>
            </>
          ) : family === "document" ? (
            <>
              <h3 className="text-xl font-black">L’accueil et le partage</h3>
              <p className="text-xs font-semibold text-violet-700">
                Support de cours fictif · 15 minutes
              </p>
              {[
                "Introduction",
                "Points à développer",
                "Questions pour échanger",
              ].map((label) => (
                <div key={label} className="border-t border-violet-100 pt-3">
                  <h4 className="text-sm font-bold">{label}</h4>
                  <p className="mt-1 text-xs text-slate-600">
                    Un plan de séance à enrichir et à relire.
                  </p>
                </div>
              ))}
            </>
          ) : (
            <>
              <h3 className="text-lg font-black">{tool.scenes[1].title}</h3>
              {config.fields.map(([label, value]) => (
                <DemoField key={label} label={label} value={value} />
              ))}
              <p className="rounded-xl bg-violet-50 p-3 text-xs leading-6">
                {tool.scenes[1].lines.join(" · ")}
              </p>
            </>
          )}
          <p className="text-[10px] leading-5 text-slate-500">
            Données fictives · aucune action exécutée
          </p>
        </div>
      )}
    </div>
  );
}
