import { DashboardClient } from "@/components/dashboard/dashboard-client";
import {
  DEMO_COMMUNITY, DEMO_EVENTS, DEMO_DRAFTS,
  DEMO_PUBLICATIONS, DEMO_STATS, DEMO_NOTIFICATIONS
} from "@/lib/demo/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Démo — Yad.ia",
  description: "Découvrez Yad.ia en mode démo avec des données fictives.",
};

export default function DemoPage() {
  const upcomingEvents = DEMO_EVENTS.slice(0, 5).map((e) => ({
    id: e.id,
    title: e.title,
    startDate: e.startDate,
    category: e.category,
    status: e.status,
  }));

  const pendingPublications = DEMO_PUBLICATIONS.filter((p) =>
    ["PENDING", "SCHEDULED", "FAILED"].includes(p.status)
  ).map((p) => ({
    id: p.id,
    status: p.status,
    scheduledAt: p.scheduledAt,
    channelType: p.channelType,
    content: p.content,
    channel: p.channel,
    event: p.event,
  }));

  const recentDrafts = DEMO_DRAFTS.slice(0, 5).map((d) => ({
    id: d.id,
    title: d.title,
    body: d.body,
    status: d.status,
    contentType: d.contentType,
    updatedAt: d.updatedAt,
    event: d.event,
  }));

  const community = {
    name: DEMO_COMMUNITY.name,
    tone: DEMO_COMMUNITY.tone,
    hashtags: DEMO_COMMUNITY.hashtags,
    channels: [
      { type: "INSTAGRAM", isConnected: true },
      { type: "FACEBOOK", isConnected: true },
      { type: "WHATSAPP", isConnected: false },
      { type: "TELEGRAM", isConnected: true },
      { type: "EMAIL", isConnected: true },
    ],
    plan: DEMO_COMMUNITY.plan,
  };

  const notifications = DEMO_NOTIFICATIONS.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    type: n.type,
    createdAt: n.createdAt,
  }));

  return (
    <div className="pt-10">
      <DashboardClient
        userName="Rabbi Lévi Cohen"
        community={community}
        upcomingEvents={upcomingEvents}
        pendingPublications={pendingPublications}
        recentDrafts={recentDrafts}
        stats={DEMO_STATS}
        notifications={notifications}
      />
    </div>
  );
}
