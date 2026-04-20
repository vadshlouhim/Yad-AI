"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Building2, User, Palette, Globe, ChevronRight } from "lucide-react";
import Link from "next/link";
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
  signature: string | null;
  hashtags: string[];
  mentions: string[];
  editorialRules: string | null;
  communityType: string;
  religiousStream: string | null;
  plan: string;
}

interface Profile {
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface Props {
  community: Community;
  profile: Profile;
}

const TONE_OPTIONS = [
  { value: "MODERN", label: "Moderne", description: "Accessible et contemporain" },
  { value: "TRADITIONAL", label: "Traditionnel", description: "Ancré dans la tradition" },
  { value: "FORMAL", label: "Formel", description: "Institutionnel et professionnel" },
  { value: "FRIENDLY", label: "Convivial", description: "Chaleureux et proche" },
  { value: "RELIGIOUS", label: "Religieux", description: "Axé sur les valeurs spirituelles" },
];

const COMMUNITY_TYPE_OPTIONS = [
  { value: "SYNAGOGUE", label: "Synagogue" },
  { value: "ASSOCIATION", label: "Association" },
  { value: "SCHOOL", label: "École" },
  { value: "CENTER", label: "Centre communautaire" },
  { value: "OTHER", label: "Autre" },
];

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  FREE_TRIAL: { label: "Essai gratuit", color: "bg-slate-100 text-slate-700" },
  STARTER: { label: "Starter", color: "bg-blue-100 text-blue-700" },
  PROFESSIONAL: { label: "Professionnel", color: "bg-purple-100 text-purple-700" },
  ENTERPRISE: { label: "Enterprise", color: "bg-amber-100 text-amber-700" },
};

export function SettingsGeneralClient({ community, profile }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<"community" | "editorial" | "profile">("community");

  // Community form
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description ?? "");
  const [city, setCity] = useState(community.city ?? "");
  const [country, setCountry] = useState(community.country);
  const [timezone, setTimezone] = useState(community.timezone);
  const [phone, setPhone] = useState(community.phone ?? "");
  const [email, setEmail] = useState(community.email ?? "");
  const [website, setWebsite] = useState(community.website ?? "");
  const [address, setAddress] = useState(community.address ?? "");
  const [communityType, setCommunityType] = useState(community.communityType);
  const [religiousStream, setReligiousStream] = useState(community.religiousStream ?? "");

  // Editorial form
  const [tone, setTone] = useState(community.tone);
  const [signature, setSignature] = useState(community.signature ?? "");
  const [hashtags, setHashtags] = useState(community.hashtags.join(" "));
  const [editorialRules, setEditorialRules] = useState(community.editorialRules ?? "");

  // Profile form
  const [profileName, setProfileName] = useState(profile.name);

  async function saveCommunity() {
    setSaving(true);
    try {
      await fetch("/api/community/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, description: description || null, city: city || null,
          country, timezone, phone: phone || null, email: email || null,
          website: website || null, address: address || null,
          communityType, religiousStream: religiousStream || null,
        }),
      });
      router.refresh();
    } catch {
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEditorial() {
    setSaving(true);
    try {
      await fetch("/api/community/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone,
          signature: signature || null,
          hashtags: hashtags.split(/\s+/).filter(Boolean),
          editorialRules: editorialRules || null,
        }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const navItems = [
    { id: "community" as const, label: "Communauté", icon: Building2 },
    { id: "editorial" as const, label: "Identité éditoriale", icon: Palette },
    { id: "profile" as const, label: "Mon profil", icon: User },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
          <p className="text-slate-500 mt-1">Gérez votre communauté et votre profil</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/settings/channels">
            <Button variant="outline" size="sm">
              <Globe className="size-4" />
              Canaux
              <ChevronRight className="size-3.5 ml-1" />
            </Button>
          </Link>
          <Link href="/dashboard/settings/billing">
            <Button variant="outline" size="sm">
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", PLAN_LABELS[community.plan]?.color)}>
                {PLAN_LABELS[community.plan]?.label ?? community.plan}
              </span>
              Facturation
              <ChevronRight className="size-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Nav latérale */}
        <nav className="w-48 flex-shrink-0 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left",
                activeSection === item.id
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Contenu */}
        <div className="flex-1 space-y-4">
          {/* Section communauté */}
          {activeSection === "community" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="size-4" />
                  Informations de la communauté
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Nom</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Type</label>
                    <select
                      value={communityType}
                      onChange={(e) => setCommunityType(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none bg-white"
                    >
                      {COMMUNITY_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Présentez votre communauté en quelques mots…"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Ville</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Paris"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Pays</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@communaute.fr"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Téléphone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+33 1 23 45 67 89"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Site web</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://www.communaute.fr"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Courant religieux</label>
                  <input
                    type="text"
                    value={religiousStream}
                    onChange={(e) => setReligiousStream(e.target.value)}
                    placeholder="Ashkénaze, Séfarade, Loubavitch…"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <Button onClick={saveCommunity} loading={saving}>
                  <Save className="size-4" />
                  Sauvegarder
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Section éditoriale */}
          {activeSection === "editorial" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="size-4" />
                  Identité éditoriale
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Ton */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Ton de communication</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {TONE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setTone(opt.value)}
                        className={cn(
                          "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                          tone === opt.value
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <span className={cn("text-sm font-medium", tone === opt.value ? "text-blue-700" : "text-slate-700")}>
                          {opt.label}
                        </span>
                        <span className="text-xs text-slate-400 mt-0.5">{opt.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Signature */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Signature <span className="text-slate-400 font-normal">(optionnel)</span>
                  </label>
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder="— Votre communauté"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Hashtags */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Hashtags par défaut</label>
                  <input
                    type="text"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    placeholder="#shabbat #communauté #judaisme"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-xs text-slate-400">Séparez les hashtags par des espaces</p>
                </div>

                {/* Règles éditoriales */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Règles éditoriales <span className="text-slate-400 font-normal">(instructions pour l&apos;IA)</span>
                  </label>
                  <textarea
                    value={editorialRules}
                    onChange={(e) => setEditorialRules(e.target.value)}
                    rows={4}
                    placeholder="Ex: Toujours inclure les horaires précis, utiliser le terme 'Chabbat' et non 'Sabbat', ne pas mentionner les billets de loterie…"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y"
                  />
                </div>

                <Button onClick={saveEditorial} loading={saving}>
                  <Save className="size-4" />
                  Sauvegarder
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Section profil */}
          {activeSection === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="size-4" />
                  Mon profil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Nom complet</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-400">
                    L&apos;email est géré par votre fournisseur d&apos;authentification.
                  </p>
                </div>

                <Button onClick={saveProfile} loading={saving}>
                  <Save className="size-4" />
                  Sauvegarder
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
