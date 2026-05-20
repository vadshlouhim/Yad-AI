import { Sidebar } from "@/components/layout/sidebar";
import { DemoTopBar } from "@/components/demo/demo-topbar";
import { DemoBanner } from "@/components/demo/demo-banner";
import { DEMO_COMMUNITY } from "@/lib/demo/data";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const community = {
    id: DEMO_COMMUNITY.id,
    name: DEMO_COMMUNITY.name,
    logoUrl: DEMO_COMMUNITY.logoUrl,
    plan: DEMO_COMMUNITY.plan,
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Bannière démo — en haut, en dehors du layout flex principal */}
      <DemoBanner />

      {/* Shell principal */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          community={community}
          userAvatar={null}
          userName="Rabbi Lévi Cohen"
          basePath="/demo"
        />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <DemoTopBar
            communityName={DEMO_COMMUNITY.name}
            userName="Rabbi Lévi Cohen"
            unreadNotifications={3}
          />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
