import { DemoFeaturePage } from "@/components/demo/demo-feature-page";

const THREADS = [
  { id: "th-1", sender: "Sarah M.", preview: "Merci pour les horaires de Chabbat 🙏", channel: "Instagram" },
  { id: "th-2", sender: "David L.", preview: "Peut-on avoir un rappel pour le cours ?", channel: "Facebook" },
  { id: "th-3", sender: "Miriam A.", preview: "Inscription de 3 enfants au programme jeunesse", channel: "WhatsApp" },
];

export default function DemoMessagingPage() {
  return (
    <DemoFeaturePage
      title="Messagerie"
      subtitle="Boîte de réception unifiée en mode demo, avec priorisation et réponses suggérées."
      highlights={[
        "Filtrage par canal",
        "Réponses rapides assistées",
        "Historique centralisé",
      ]}
      primaryCta={{ label: "Répondre en mode demo" }}
    >
      <div className="grid gap-3">
        {THREADS.map((thread) => (
          <article key={thread.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{thread.sender}</p>
                <p className="mt-1 text-sm text-slate-600">{thread.preview}</p>
              </div>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{thread.channel}</span>
            </div>
          </article>
        ))}
      </div>
    </DemoFeaturePage>
  );
}

