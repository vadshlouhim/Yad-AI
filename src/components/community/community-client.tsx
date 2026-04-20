"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Users, Calendar, FileText, Send, Image,
  Globe, MapPin, Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  city: string | null;
  country: string;
  timezone: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  postalCode: string | null;
  tone: string;
  language: string;
  communityType: string;
  religiousStream: string | null;
  plan: string;
  users: { id: string; name: string | null; email: string; role: string; avatarUrl: string | null }[];
  channels: { id: string; type: string; name: string; isConnected: boolean; isActive: boolean }[];
  _count: { events: number; publications: number; contentDrafts: number; mediaFiles: number };
}

interface Props {
  community: Community;
}

const CHANNEL_EMOJI: Record<string, string> = {
  INSTAGRAM: "📸", FACEBOOK: "👥", WHATSAPP: "💬",
  TELEGRAM: "✈️", EMAIL: "📧", WEB: "🌐",
};

const TONE_LABELS: Record<string, string> = {
  MODERN: "Moderne", TRADITIONAL: "Traditionnel", FORMAL: "Formel",
  FRIENDLY: "Convivial", RELIGIOUS: "Religieux",
};

const TYPE_LABELS: Record<string, string> = {
  SYNAGOGUE: "Synagogue", ASSOCIATION: "Association", SCHOOL: "École",
  CENTER: "Centre communautaire", OTHER: "Autre",
};

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  FREE_TRIAL: { label: "Essai gratuit", color: "bg-slate-100 text-slate-700" },
  STARTER: { label: "Starter", color: "bg-blue-100 text-blue-700" },
  PROFESSIONAL: { label: "Pro", color: "bg-violet-100 text-violet-700" },
  ENTERPRISE: { label: "Enterprise", color: "bg-amber-100 text-amber-700" },
};

export function CommunityClient({ community }: Props) {
  const plan = PLAN_LABELS[community.plan] ?? PLAN_LABELS.FREE_TRIAL;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="size-16 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
          {community.name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{community.name}</h1>
            <Badge className={cn("text-xs", plan.color)}>{plan.label}</Badge>
          </div>
          <p className="text-slate-500 mt-1">
            {TYPE_LABELS[community.communityType] ?? community.communityType}
            {community.religiousStream && ` · ${community.religiousStream}`}
            {community.city && ` · ${community.city}`}
          </p>
          {community.description && (
            <p className="text-sm text-slate-600 mt-2">{community.description}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Événements", value: community._count.events, icon: Calendar, color: "text-blue-600" },
          { label: "Publications", value: community._count.publications, icon: Send, color: "text-emerald-600" },
          { label: "Brouillons", value: community._count.contentDrafts, icon: FileText, color: "text-violet-600" },
          { label: "Médias", value: community._count.mediaFiles, icon: Image, color: "text-amber-600" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 py-4">
              <stat.icon className={cn("size-8", stat.color)} />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Informations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-5" /> Informations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {community.address && (
              <div className="flex items-start gap-2 text-slate-600">
                <MapPin className="size-4 mt-0.5 shrink-0" />
                <span>{community.address}{community.postalCode && `, ${community.postalCode}`} {community.city}</span>
              </div>
            )}
            {community.website && (
              <div className="flex items-center gap-2 text-slate-600">
                <Globe className="size-4 shrink-0" />
                <a href={community.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {community.website}
                </a>
              </div>
            )}
            {community.email && (
              <div className="flex items-center gap-2 text-slate-600">
                <span className="text-lg">📧</span>
                <span>{community.email}</span>
              </div>
            )}
            {community.phone && (
              <div className="flex items-center gap-2 text-slate-600">
                <span className="text-lg">📞</span>
                <span>{community.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-slate-600">
              <Hash className="size-4 shrink-0" />
              <span>Ton : {TONE_LABELS[community.tone] ?? community.tone} · Langue : {community.language.toUpperCase()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Canaux */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="size-5" /> Canaux de diffusion
            </CardTitle>
          </CardHeader>
          <CardContent>
            {community.channels.length === 0 ? (
              <p className="text-sm text-slate-400">Aucun canal configuré</p>
            ) : (
              <div className="space-y-3">
                {community.channels.map((channel) => (
                  <div key={channel.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{CHANNEL_EMOJI[channel.type] ?? "📢"}</span>
                      <span className="text-sm font-medium text-slate-700">{channel.name}</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        channel.isConnected
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {channel.isConnected ? "Connecté" : "Déconnecté"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Membres */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-5" /> Membres ({community.users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {community.users.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-white text-sm font-medium">
                      {(user.name ?? user.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{user.name ?? "Sans nom"}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">{user.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
