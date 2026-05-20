import Link from "next/link";
import { notFound } from "next/navigation";
import { HDate } from "@hebcal/core";
import { CalendarDays, Clock, Edit, FileText, MapPin, Send, Sparkles } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  EVENT_CATEGORY_LABELS,
  EVENT_STATUS_LABELS,
  EVENT_CATEGORY_COLORS,
  cn,
} from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Événement" };

type PageProps = {
  params: Promise<{ id: string }>;
};

const STATUS_BADGE_VARIANT: Record<string, "draft" | "ready" | "scheduled" | "published" | "archived"> = {
  DRAFT: "draft",
  READY: "ready",
  SCHEDULED: "scheduled",
  PUBLISHED: "published",
  COMPLETED: "published",
  ARCHIVED: "archived",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatHebrewDate(value: string) {
  return new HDate(new Date(value)).renderGematriya();
}

export default async function EventDetailPage({ params }: PageProps) {
  const { profile } = await requireAuth();
  const { id } = await params;
  const admin = createAdminClient();

  const { data: event } = await admin
    .from("Event")
    .select("*, contentDrafts:ContentDraft(id), publications:Publication(id)")
    .eq("id", id)
    .eq("communityId", profile.communityId!)
    .single();

  if (!event) notFound();

  const contentCount = Array.isArray(event.contentDrafts) ? event.contentDrafts.length : 0;
  const publicationCount = Array.isArray(event.publications) ? event.publications.length : 0;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-teal-50 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Link href="/dashboard/events" className="text-sm font-medium text-emerald-700 hover:underline">
              Retour à Mon agenda
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">{event.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_BADGE_VARIANT[event.status] ?? "draft"}>
                  {EVENT_STATUS_LABELS[event.status] ?? event.status}
                </Badge>
                <span className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  EVENT_CATEGORY_COLORS[event.category] ?? "border-slate-200 bg-slate-100 text-slate-600"
                )}>
                  {EVENT_CATEGORY_LABELS[event.category] ?? event.category}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline">
              <Link href={`/dashboard/events/${event.id}/edit`}>
                <Edit className="size-4" />
                Modifier
              </Link>
            </Button>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500">
              <Link href={`/dashboard/content/new?eventId=${event.id}`}>
                <Sparkles className="size-4" />
                Générer contenu IA
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="space-y-5 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <CalendarDays className="size-4 text-emerald-600" />
                  Date civile
                </p>
                <p className="mt-2 capitalize text-sm text-slate-600">{formatDate(event.startDate)}</p>
                <p className="mt-1 text-sm font-medium text-emerald-700 hebrew">{formatHebrewDate(event.startDate)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Clock className="size-4 text-emerald-600" />
                  Horaires
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {formatTime(event.startDate)}
                  {event.endDate ? ` - ${formatTime(event.endDate)}` : ""}
                </p>
              </div>
            </div>

            {(event.location || event.address) && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <MapPin className="size-4 text-emerald-600" />
                  Lieu
                </p>
                {event.location && <p className="mt-2 text-sm text-slate-700">{event.location}</p>}
                {event.address && <p className="text-sm text-slate-500">{event.address}</p>}
              </div>
            )}

            {event.description && (
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Description</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{event.description}</p>
              </div>
            )}

            {event.notes && (
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Notes internes</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">{event.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="space-y-3 p-5">
            <h2 className="text-sm font-semibold text-slate-900">Actions liées</h2>
            <Link href={`/dashboard/content/new?eventId=${event.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm text-slate-600 hover:bg-slate-50">
              <span className="flex items-center gap-2">
                <FileText className="size-4 text-emerald-600" />
                Contenus IA
              </span>
              <span>{contentCount}</span>
            </Link>
            <Link href="/dashboard/publications" className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm text-slate-600 hover:bg-slate-50">
              <span className="flex items-center gap-2">
                <Send className="size-4 text-emerald-600" />
                Publications
              </span>
              <span>{publicationCount}</span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
