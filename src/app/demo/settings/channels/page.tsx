import { DemoFeaturePage } from "@/components/demo/demo-feature-page";
import { DEMO_CHANNELS } from "@/lib/demo/data";

export default function DemoSettingsChannelsPage() {
  return (
    <DemoFeaturePage
      title="Connecter mes réseaux"
      subtitle="Simulation de connexion des canaux sociaux et de messagerie."
      highlights={[
        "Instagram / Facebook",
        "Telegram / WhatsApp / Email",
        "Statuts de connexion en temps réel (demo)",
      ]}
      primaryCta={{ label: "Lancer une connexion demo" }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {DEMO_CHANNELS.map((channel) => (
          <article key={channel.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">{channel.name}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${channel.isConnected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {channel.isConnected ? "Connecté" : "Non connecté"}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">{channel.handle ?? "Aucun identifiant public"}</p>
            <button type="button" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
              {channel.isConnected ? "Reconfigurer (demo)" : "Connecter (demo)"}
            </button>
          </article>
        ))}
      </div>
    </DemoFeaturePage>
  );
}

