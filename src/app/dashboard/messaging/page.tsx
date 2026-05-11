import type { Metadata } from "next";
import { MessagingClient } from "@/components/messaging/messaging-client";

export const metadata: Metadata = { title: "Messagerie unifiée — Shalom IA" };

function minutesAgo(base: Date, minutes: number) {
  const date = new Date(base);
  date.setMinutes(date.getMinutes() - minutes);
  return date;
}

export default async function MessagingPage() {
  const now = new Date();

  const channels = [
    { channel: "EMAIL", connected: true, lastSyncAt: minutesAgo(now, 2), latencySec: 3 },
    { channel: "MESSENGER", connected: true, lastSyncAt: minutesAgo(now, 1), latencySec: 2 },
    { channel: "WHATSAPP", connected: true, lastSyncAt: minutesAgo(now, 1), latencySec: 2 },
    { channel: "INSTAGRAM", connected: true, lastSyncAt: minutesAgo(now, 4), latencySec: 5 },
    {
      channel: "TELEGRAM",
      connected: false,
      lastSyncAt: minutesAgo(now, 45),
      latencySec: 0,
      issue: "Token expiré, reconnexion requise.",
    },
  ] as const;

  const conversations = [
    {
      id: "conv-1",
      contactName: "Sarah Levy",
      contactHandle: "sarah.levy@email.com",
      channel: "EMAIL" as const,
      unreadCount: 1,
      lastMessageAt: minutesAgo(now, 8),
      lastMessagePreview: "Pouvez-vous confirmer l'horaire du cours femmes de jeudi ?",
      tags: ["Cours femmes", "Question"],
      priority: "NORMAL" as const,
      messages: [
        {
          id: "m-1",
          direction: "IN" as const,
          channel: "EMAIL" as const,
          author: "Sarah Levy",
          body: "Pouvez-vous confirmer l'horaire du cours femmes de jeudi ?",
          createdAt: minutesAgo(now, 8),
          status: "READ" as const,
        },
        {
          id: "m-2",
          direction: "OUT" as const,
          channel: "EMAIL" as const,
          author: "Admin",
          body: "Oui, le cours est maintenu à 20h30 à la salle principale.",
          createdAt: minutesAgo(now, 5),
          status: "SENT" as const,
          aiSuggested: true,
        },
      ],
    },
    {
      id: "conv-2",
      contactName: "Groupe Jeunes",
      contactHandle: "WhatsApp · 56 participants",
      channel: "WHATSAPP" as const,
      unreadCount: 4,
      lastMessageAt: minutesAgo(now, 14),
      lastMessagePreview: "On peut avoir le rappel J-1 pour le Chabbat de cette semaine ?",
      tags: ["Jeunesse", "Rappel J-1"],
      priority: "HIGH" as const,
      messages: [
        {
          id: "m-3",
          direction: "IN" as const,
          channel: "WHATSAPP" as const,
          author: "Groupe Jeunes",
          body: "On peut avoir le rappel J-1 pour le Chabbat de cette semaine ?",
          createdAt: minutesAgo(now, 14),
          status: "READ" as const,
        },
        {
          id: "m-4",
          direction: "OUT" as const,
          channel: "WHATSAPP" as const,
          author: "Admin",
          body: "Oui, je l'envoie cet après-midi avec les horaires validés.",
          createdAt: minutesAgo(now, 10),
          status: "DELIVERED" as const,
          aiSuggested: true,
        },
      ],
    },
    {
      id: "conv-3",
      contactName: "David Benhamou",
      contactHandle: "@dbenhamou (Instagram)",
      channel: "INSTAGRAM" as const,
      unreadCount: 0,
      lastMessageAt: minutesAgo(now, 52),
      lastMessagePreview: "Merci pour l'affiche, pouvez-vous aussi envoyer la version Story ?",
      tags: ["Affiche", "Story"],
      priority: "NORMAL" as const,
      messages: [
        {
          id: "m-5",
          direction: "IN" as const,
          channel: "INSTAGRAM" as const,
          author: "David Benhamou",
          body: "Merci pour l'affiche, pouvez-vous aussi envoyer la version Story ?",
          createdAt: minutesAgo(now, 52),
          status: "READ" as const,
        },
        {
          id: "m-6",
          direction: "OUT" as const,
          channel: "INSTAGRAM" as const,
          author: "Admin",
          body: "Bien reçu. Je vous envoie la déclinaison Story dans l'heure.",
          createdAt: minutesAgo(now, 48),
          status: "FAILED" as const,
        },
      ],
    },
    {
      id: "conv-4",
      contactName: "Comité Communication",
      contactHandle: "Messenger · Page officielle",
      channel: "MESSENGER" as const,
      unreadCount: 2,
      lastMessageAt: minutesAgo(now, 120),
      lastMessagePreview: "Validez-vous l'envoi du planning des publications de la semaine ?",
      tags: ["Validation", "Planning"],
      priority: "HIGH" as const,
      messages: [
        {
          id: "m-7",
          direction: "IN" as const,
          channel: "MESSENGER" as const,
          author: "Comité Communication",
          body: "Validez-vous l'envoi du planning des publications de la semaine ?",
          createdAt: minutesAgo(now, 120),
          status: "READ" as const,
        },
        {
          id: "m-8",
          direction: "OUT" as const,
          channel: "MESSENGER" as const,
          author: "Admin",
          body: "Oui, validation donnée pour les rappels J-5 et J-1.",
          createdAt: minutesAgo(now, 110),
          status: "DELIVERED" as const,
          aiSuggested: true,
        },
      ],
    },
  ];

  return (
    <MessagingClient
      channels={channels as Parameters<typeof MessagingClient>[0]["channels"]}
      conversations={conversations as Parameters<typeof MessagingClient>[0]["conversations"]}
    />
  );
}

