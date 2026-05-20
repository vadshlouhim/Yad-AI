import { DemoFeaturePage } from "@/components/demo/demo-feature-page";
import { DEMO_CHANNELS, DEMO_COMMUNITY } from "@/lib/demo/data";

export default function DemoSettingsPage() {
  return (
    <DemoFeaturePage
      title="Paramètres"
      subtitle="Réglez identité, tonalité, hashtags, et canaux de diffusion en mode demo."
      highlights={[
        "Identité communautaire",
        "Préférences éditoriales",
        "Canaux connectés et statuts",
      ]}
      secondaryCta={{ label: "Voir les canaux", href: "/demo/settings/channels" }}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Identité</p>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p><span className="font-semibold text-slate-800">Communauté:</span> {DEMO_COMMUNITY.name}</p>
            <p><span className="font-semibold text-slate-800">Ville:</span> {DEMO_COMMUNITY.city}</p>
            <p><span className="font-semibold text-slate-800">Tonalité:</span> {DEMO_COMMUNITY.tone}</p>
            <p><span className="font-semibold text-slate-800">Signature:</span> {DEMO_COMMUNITY.signature}</p>
          </div>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Canaux actifs</p>
          <div className="mt-3 space-y-2">
            {DEMO_CHANNELS.map((channel) => (
              <div key={channel.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <span className="font-medium text-slate-700">{channel.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${channel.isConnected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {channel.isConnected ? "Connecté" : "À connecter"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DemoFeaturePage>
  );
}

