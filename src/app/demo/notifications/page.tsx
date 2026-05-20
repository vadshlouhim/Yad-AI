import { DemoFeaturePage } from "@/components/demo/demo-feature-page";
import { DEMO_NOTIFICATIONS } from "@/lib/demo/data";

export default function DemoNotificationsPage() {
  return (
    <DemoFeaturePage
      title="Notifications"
      subtitle="Centre de notifications demo: contenu IA prêt, publications, et alertes automatisations."
      highlights={[
        "Tri par type",
        "Liens de suivi",
        "Historique récent",
      ]}
    >
      <div className="grid gap-3">
        {DEMO_NOTIFICATIONS.map((notification) => (
          <article key={notification.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-slate-900">{notification.title}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${notification.isRead ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-700"}`}>
                {notification.isRead ? "Lu" : "Nouveau"}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600">{notification.body}</p>
          </article>
        ))}
      </div>
    </DemoFeaturePage>
  );
}

