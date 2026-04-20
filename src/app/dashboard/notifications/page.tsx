import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NotificationsClient } from "@/components/notifications/notifications-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Notifications — Yad.ia" };

export default async function NotificationsPage() {
  const { profile } = await requireAuth();

  const notifications = await prisma.notification.findMany({
    where: { userId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return <NotificationsClient notifications={notifications} />;
}
