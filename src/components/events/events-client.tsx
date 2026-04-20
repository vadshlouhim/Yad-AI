"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatDate,
  EVENT_CATEGORY_LABELS,
  EVENT_CATEGORY_COLORS,
  EVENT_STATUS_LABELS,
  cn,
} from "@/lib/utils";
import {
  Plus, Search, Filter, Calendar, MapPin, Users,
  FileText, Send, MoreHorizontal, Edit, Trash2, Sparkles,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date | null;
  location: string | null;
  category: string;
  status: string;
  isRecurring: boolean;
  coverImageUrl: string | null;
  _count: { contentDrafts: number; publications: number };
}

interface Props {
  events: Event[];
  statusCounts: Record<string, number>;
}

const STATUS_FILTERS = [
  { value: "", label: "Tous" },
  { value: "DRAFT", label: "Brouillons" },
  { value: "READY", label: "Prêts" },
  { value: "SCHEDULED", label: "Programmés" },
  { value: "PUBLISHED", label: "Publiés" },
  { value: "COMPLETED", label: "Terminés" },
  { value: "ARCHIVED", label: "Archivés" },
];

const STATUS_BADGE_VARIANT: Record<string, "draft" | "ready" | "scheduled" | "published" | "archived"> = {
  DRAFT: "draft",
  READY: "ready",
  SCHEDULED: "scheduled",
  PUBLISHED: "published",
  COMPLETED: "published",
  ARCHIVED: "archived",
};

export function EventsClient({ events, statusCounts }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const activeStatus = searchParams.get("status") ?? "";

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const totalAll = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Événements</h1>
          <p className="text-slate-500 text-sm mt-1">
            {totalAll} événement{totalAll !== 1 ? "s" : ""} au total
          </p>
        </div>
        <Link href="/dashboard/events/new">
          <Button>
            <Plus className="size-4" />
            Nouvel événement
          </Button>
        </Link>
      </div>

      {/* Filtres statuts */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((filter) => {
          const count = filter.value
            ? (statusCounts[filter.value] ?? 0)
            : totalAll;
          const isActive = activeStatus === filter.value;
          return (
            <button
              key={filter.value}
              onClick={() => updateFilter("status", filter.value)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all",
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              )}
            >
              {filter.label}
              <span className={cn(
                "text-xs rounded-full px-1.5 py-0.5",
                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && updateFilter("q", search)}
          placeholder="Rechercher un événement…"
          className="w-full max-w-md rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Liste événements */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Calendar className="size-7 text-slate-400" />
          </div>
          <div>
            <p className="text-slate-700 font-semibold">Aucun événement</p>
            <p className="text-slate-400 text-sm mt-1">
              Créez votre premier événement pour commencer.
            </p>
          </div>
          <Link href="/dashboard/events/new">
            <Button variant="outline">
              <Plus className="size-4" />
              Créer un événement
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Date badge */}
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center">
            <span className="text-xs font-medium text-blue-600 uppercase">
              {formatDate(event.startDate, "MMM")}
            </span>
            <span className="text-xl font-bold text-blue-700 leading-none">
              {formatDate(event.startDate, "d")}
            </span>
          </div>

          {/* Contenu */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-wrap">
                <Link
                  href={`/dashboard/events/${event.id}`}
                  className="text-base font-semibold text-slate-900 hover:text-blue-700 transition-colors"
                >
                  {event.title}
                  {event.isRecurring && (
                    <span className="ml-2 text-xs text-slate-400 font-normal">↻ récurrent</span>
                  )}
                </Link>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Badge variant={STATUS_BADGE_VARIANT[event.status] ?? "draft"} className="text-[11px]">
                  {EVENT_STATUS_LABELS[event.status] ?? event.status}
                </Badge>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-20">
                        <Link
                          href={`/dashboard/events/${event.id}/edit`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                          <Edit className="size-4" /> Modifier
                        </Link>
                        <Link
                          href={`/dashboard/content/new?eventId=${event.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                          <Sparkles className="size-4" /> Générer contenu IA
                        </Link>
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setMenuOpen(false);
                            // TODO: confirm + delete
                          }}
                        >
                          <Trash2 className="size-4" /> Supprimer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                {formatDate(event.startDate, "EEEE d MMMM yyyy à HH:mm")}
              </span>
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {event.location}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <span className={cn(
                "inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border",
                EVENT_CATEGORY_COLORS[event.category] ?? "bg-slate-100 text-slate-600 border-slate-200"
              )}>
                {EVENT_CATEGORY_LABELS[event.category] ?? event.category}
              </span>

              {event._count.contentDrafts > 0 && (
                <Link
                  href={`/dashboard/events/${event.id}?tab=content`}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600"
                >
                  <FileText className="size-3" />
                  {event._count.contentDrafts} contenu{event._count.contentDrafts > 1 ? "s" : ""}
                </Link>
              )}
              {event._count.publications > 0 && (
                <Link
                  href={`/dashboard/events/${event.id}?tab=publications`}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-600"
                >
                  <Send className="size-3" />
                  {event._count.publications} publication{event._count.publications > 1 ? "s" : ""}
                </Link>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
