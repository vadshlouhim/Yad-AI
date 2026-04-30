"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Building2, User, Palette, ChevronRight, ShieldCheck, Users, Smartphone, Trash2, Share2 } from "lucide-react";
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
  authProviders: string[];
}

interface Props {
  community: Community;
  profile: Profile;
}

interface CommunityMember {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  profession: string | null;
  age: number | null;
  city: string | null;
  familyStatus: string | null;
  notes: string | null;
  source: string;
}

interface ContactPickerContact {
  name?: string[];
  email?: string[];
  tel?: string[];
}

interface NavigatorWithContacts extends Navigator {
  contacts?: {
    select: (
      properties: Array<"name" | "email" | "tel">,
      options?: { multiple?: boolean }
    ) => Promise<ContactPickerContact[]>;
  };
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
  const [activeSection, setActiveSection] = useState<"community" | "contacts" | "editorial" | "profile">("community");

  // Community form
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description ?? "");
  const [city, setCity] = useState(community.city ?? "");
  const [country, setCountry] = useState(community.country);
  const [timezone] = useState(community.timezone);
  const [phone, setPhone] = useState(community.phone ?? "");
  const [email, setEmail] = useState(community.email ?? "");
  const [website, setWebsite] = useState(community.website ?? "");
  const [address] = useState(community.address ?? "");
  const [communityType, setCommunityType] = useState(community.communityType);
  const [religiousStream, setReligiousStream] = useState(community.religiousStream ?? "");

  // Editorial form
  const [tone, setTone] = useState(community.tone);
  const [signature, setSignature] = useState(community.signature ?? "");
  const [hashtags, setHashtags] = useState(community.hashtags.join(" "));
  const [editorialRules, setEditorialRules] = useState(community.editorialRules ?? "");

  // Profile form
  const [profileName, setProfileName] = useState(profile.name);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberProfession, setMemberProfession] = useState("");
  const [memberAge, setMemberAge] = useState("");
  const [memberCity, setMemberCity] = useState("");
  const [memberFamilyStatus, setMemberFamilyStatus] = useState("");
  const [memberNotes, setMemberNotes] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

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

  async function savePassword() {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (password.length < 8) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordError(
          data.error ?? "Impossible d'enregistrer le mot de passe."
        );
        return;
      }

      setPassword("");
      setConfirmPassword("");
      setPasswordSuccess(
        data.message ??
          "Mot de passe enregistré. Vous pouvez maintenant vous connecter avec votre email."
      );
      router.refresh();
    } catch {
      setPasswordError("Impossible d'enregistrer le mot de passe.");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function loadMembers() {
    setMembersLoading(true);
    try {
      const response = await fetch("/api/community/members");
      if (response.ok) setMembers(await response.json());
    } finally {
      setMembersLoading(false);
    }
  }

  async function addMember() {
    setMemberError(null);
    if (!memberName.trim() && !memberEmail.trim() && !memberPhone.trim()) {
      setMemberError("Ajoutez au moins un nom, email ou téléphone.");
      return;
    }

    const response = await fetch("/api/community/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: memberName,
        email: memberEmail,
        phone: memberPhone,
        profession: memberProfession,
        age: memberAge,
        city: memberCity,
        familyStatus: memberFamilyStatus,
        notes: memberNotes,
        source: "manual",
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      setMemberError(data.error ?? "Impossible d'ajouter ce membre.");
      return;
    }

    setMemberName("");
    setMemberEmail("");
    setMemberPhone("");
    setMemberProfession("");
    setMemberAge("");
    setMemberCity("");
    setMemberFamilyStatus("");
    setMemberNotes("");
    await loadMembers();
  }

  async function importPhoneContacts() {
    setMemberError(null);
    const contactsApi = (navigator as NavigatorWithContacts).contacts;
    if (!contactsApi?.select) {
      setMemberError("L'import des contacts du smartphone n'est pas disponible sur ce navigateur.");
      return;
    }

    const contacts = await contactsApi.select(["name", "email", "tel"], { multiple: true });
    const response = await fetch("/api/community/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        members: contacts.map((contact) => ({
          displayName: contact.name?.[0] ?? "",
          email: contact.email?.[0] ?? null,
          phone: contact.tel?.[0] ?? null,
          source: "phone_contacts",
        })),
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      setMemberError(data.error ?? "Import impossible.");
      return;
    }

    await loadMembers();
  }

  async function deleteMember(id: string) {
    await fetch(`/api/community/members/${id}`, { method: "DELETE" });
    setMembers((current) => current.filter((member) => member.id !== id));
  }

  const authProviders = profile.authProviders.length > 0 ? profile.authProviders : ["email"];

  const navItems = [
    { id: "community" as const, label: "Communauté", icon: Building2 },
    { id: "contacts" as const, label: "Contacts", icon: Users },
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
          <Link
            href="/dashboard/settings/channels"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left text-slate-600 hover:bg-slate-100"
          >
            <Share2 className="size-4" />
            Réseaux sociaux
          </Link>
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

          {activeSection === "contacts" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="size-4" />
                  Contacts de la communauté
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                  Ces contacts sont les membres destinataires des messages WhatsApp et emails.
                  Ils ne sont pas administrateurs et n&apos;ont pas accès au dashboard. Vous pouvez
                  aussi renseigner leur profession, âge, ville et notes pour mieux personnaliser les communications.
                </div>

                {memberError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {memberError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <input
                    type="text"
                    value={memberName}
                    onChange={(event) => setMemberName(event.target.value)}
                    placeholder="Nom du membre"
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <input
                    type="email"
                    value={memberEmail}
                    onChange={(event) => setMemberEmail(event.target.value)}
                    placeholder="Email"
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <input
                    type="tel"
                    value={memberPhone}
                    onChange={(event) => setMemberPhone(event.target.value)}
                    placeholder="Téléphone WhatsApp"
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <input
                    type="text"
                    value={memberProfession}
                    onChange={(event) => setMemberProfession(event.target.value)}
                    placeholder="Profession"
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <input
                    type="number"
                    min="0"
                    value={memberAge}
                    onChange={(event) => setMemberAge(event.target.value)}
                    placeholder="Âge"
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <input
                    type="text"
                    value={memberCity}
                    onChange={(event) => setMemberCity(event.target.value)}
                    placeholder="Ville"
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <input
                    type="text"
                    value={memberFamilyStatus}
                    onChange={(event) => setMemberFamilyStatus(event.target.value)}
                    placeholder="Statut familial"
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 lg:col-span-1"
                  />
                  <textarea
                    value={memberNotes}
                    onChange={(event) => setMemberNotes(event.target.value)}
                    placeholder="Notes utiles : centres d'intérêt, préférences, informations de suivi…"
                    rows={2}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 lg:col-span-2"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={addMember}>
                    <Users className="size-4" />
                    Ajouter le membre
                  </Button>
                  <Button variant="outline" onClick={importPhoneContacts}>
                    <Smartphone className="size-4" />
                    Importer depuis le smartphone
                  </Button>
                </div>

                <div className="rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {members.length} membre{members.length > 1 ? "s" : ""}
                    </p>
                    {membersLoading && <span className="text-xs text-slate-400">Chargement…</span>}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {members.length === 0 && !membersLoading ? (
                      <p className="px-4 py-8 text-center text-sm text-slate-400">
                        Aucun contact enregistré pour le moment.
                      </p>
                    ) : (
                      members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{member.displayName}</p>
                            <p className="truncate text-xs text-slate-500">
                              {[member.email, member.phone].filter(Boolean).join(" · ") || "Contact sans canal"}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                              {[member.profession, member.age ? `${member.age} ans` : null, member.city, member.familyStatus]
                                .filter(Boolean)
                                .join(" · ") || "Profil à compléter"}
                              {member.notes ? ` — ${member.notes}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {member.source === "phone_contacts" ? "Smartphone" : "Manuel"}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => deleteMember(member.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
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
                  <label className="text-sm font-medium text-slate-700">Méthodes de connexion</label>
                  <div className="flex flex-wrap gap-2">
                    {authProviders.map((provider) => (
                      <Badge key={provider} variant="secondary" className="capitalize">
                        {provider === "email" ? "Email / mot de passe" : provider}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">
                    Si vous utilisez Google, vous pouvez aussi définir un mot de passe ci-dessous pour vous connecter avec la même adresse email.
                  </p>
                </div>

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

                <div className="border-t border-slate-200 pt-4 space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-slate-500" />
                      <h3 className="text-sm font-semibold text-slate-900">
                        Définir ou modifier le mot de passe
                      </h3>
                    </div>
                    <p className="text-sm text-slate-500">
                      Cela active aussi la connexion par email et mot de passe pour ce compte.
                    </p>
                  </div>

                  {passwordError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                      {passwordSuccess}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Nouveau mot de passe</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="8 caractères minimum"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700">Confirmer le mot de passe</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Répétez le mot de passe"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <Button onClick={savePassword} loading={passwordSaving}>
                    <ShieldCheck className="size-4" />
                    Enregistrer le mot de passe
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
