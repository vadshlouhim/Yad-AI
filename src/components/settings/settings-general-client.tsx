"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Building2, User, Palette, ChevronRight, ShieldCheck, Users, Smartphone, Trash2, Share2, Bot, SlidersHorizontal, Image as ImageIcon, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getCommunityProfileDisplayLabel } from "@/lib/community/profile-labels";
import { enablePushNotifications } from "@/lib/push/client";

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
  plan: string;
  vocabulary?: Record<string, unknown> | null;
}

interface Profile {
  name: string;
  email: string;
  avatarUrl: string | null;
  canAccessAdmin: boolean;
  authProviders: string[];
}

interface Props {
  community: Community;
  profile: Profile;
  initialSection?: SettingsSection;
}

type SettingsSection = "community" | "contacts" | "editorial" | "profile" | "interface";

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

const COMMUNITY_TYPE_CHOICES = [
  "SYNAGOGUE",
  "RESTAURANT",
  "CATERER",
  "SPORT_COACH",
  "COMMERCE",
  "BUSINESS",
  "CONTENT_CREATOR",
  "ASSOCIATION",
  "RELIGIOUS",
  "SCHOOL",
  "SPORT",
  "CULTURE",
  "PROFESSIONAL",
  "LOCAL",
  "STUDENT",
  "ONLINE",
  "CENTER",
  "OTHER",
];

function getCommunityTypeChoice(value: string) {
  return COMMUNITY_TYPE_CHOICES.includes(value) ? value : "OTHER";
}

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  FREE_TRIAL: { label: "Essai gratuit", color: "bg-slate-100 text-slate-700" },
  STARTER: { label: "Starter", color: "bg-blue-100 text-blue-700" },
  PROFESSIONAL: { label: "Professionnel", color: "bg-purple-100 text-purple-700" },
  ENTERPRISE: { label: "Enterprise", color: "bg-amber-100 text-amber-700" },
};

export function SettingsGeneralClient({ community, profile, initialSection = "community" }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
  const [assistantMode, setAssistantMode] = useState<"simple" | "detailed">("simple");

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
  const [logoUrl, setLogoUrl] = useState(community.logoUrl ?? "");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const communityProfileType = typeof community.vocabulary?.communityProfileType === "string"
    ? community.vocabulary.communityProfileType
    : getCommunityTypeChoice(community.communityType);
  const communityTypeLabel =
    getCommunityProfileDisplayLabel(communityProfileType) ||
    getCommunityProfileDisplayLabel(community.communityType) ||
    community.communityType;
  // Editorial form
  const [tone, setTone] = useState(community.tone);
  const [signature, setSignature] = useState(community.signature ?? "");
  const [hashtags, setHashtags] = useState(community.hashtags.join(" "));
  const [editorialRules, setEditorialRules] = useState(community.editorialRules ?? "");
  const [notificationLeadHours, setNotificationLeadHours] = useState(() => {
    const value = community.vocabulary?.aiNotificationLeadHours;
    return typeof value === "number" && Number.isFinite(value) ? String(value) : "2";
  });
  const [automationValidationMode, setAutomationValidationMode] = useState<"manual" | "automatic">(() => {
    const value = community.vocabulary?.automationValidationMode;
    return value === "automatic" ? "automatic" : "manual";
  });

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

  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmailAddress, setGoogleEmailAddress] = useState("");

  useEffect(() => {
    loadMembers();
    const storedMode = window.localStorage.getItem("shalom-assistant-experience");
    if (storedMode === "detailed") setAssistantMode("detailed");
    setGoogleConnected(window.localStorage.getItem("google_email_connected") === "true");
    setGoogleEmailAddress(window.localStorage.getItem("google_email_address") ?? "");
  }, []);

  const handleConnectGoogle = () => {
    if (googleConnected) {
      window.localStorage.removeItem("google_email_connected");
      window.localStorage.removeItem("google_email_address");
      setGoogleConnected(false);
      setGoogleEmailAddress("");
    } else {
      const email = prompt("Saisissez votre adresse email Google :", "chlomitaieb@gmail.com");
      if (email && email.trim() !== "") {
        window.localStorage.setItem("google_email_connected", "true");
        window.localStorage.setItem("google_email_address", email.trim());
        setGoogleConnected(true);
        setGoogleEmailAddress(email.trim());
      }
    }
  };

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
          logoUrl: logoUrl || null,
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
          vocabulary: {
            ...(community.vocabulary ?? {}),
            aiNotificationLeadHours: Math.max(0.25, Number(notificationLeadHours) || 2),
            automationValidationMode,
            manualValidationBeforeSend: automationValidationMode === "manual",
          },
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

  async function uploadCommunityLogo(file: File) {
    setLogoUploading(true);
    setLogoError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/uploads/community-logo", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        setLogoError(result.error ?? "Impossible de téléverser le logo.");
        return;
      }

      setLogoUrl(result.logoUrl);
      router.refresh();
    } catch {
      setLogoError("Impossible de téléverser le logo.");
    } finally {
      setLogoUploading(false);
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
        data.message ?? "Mot de passe enregistré. Vous pouvez maintenant vous connecter avec votre email."
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
  const settingsCardClass = "rounded-[1.9rem] border border-slate-200/90 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.06)]";
  const settingsHeaderClass = "border-b border-slate-100 pb-5";
  const settingsContentClass = "space-y-5 p-6 sm:p-7";

  return (
    <div className="space-y-6">
      <div className="hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
          <p className="text-slate-500 mt-1">Gérez ici vos réseaux sociaux, votre quotidien, vos contacts, la FAQ et le support.</p>
        </div>
        <div className="flex items-center gap-2">
          {profile.canAccessAdmin && (
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ShieldCheck className="size-4" />
                Admin global
                <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </Link>
          )}
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

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 [&>*]:border-emerald-100 [&>*]:font-semibold [&>*]:shadow-sm [&>*]:transition [&>*]:hover:-translate-y-0.5 [&>*]:hover:border-emerald-200 [&>*]:hover:bg-emerald-50">
        <Link href="/dashboard/settings/channels" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Connexion réseaux sociaux</Link>
        <Link href="/dashboard/events" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Gestion du quotidien</Link>
        <Link href="/help" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">FAQ</Link>
        <button type="button" onClick={() => setActiveSection("contacts")} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50">Ajoutez mes contacts</button>
        <a href="mailto:contact@easycom-AI.com?subject=Suggestion%20Yad.ia" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Envoyer une suggestion</a>
        {profile.canAccessAdmin && (
          <Link href="/admin" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100">
            Admin global
          </Link>
        )}
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
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
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
          {activeSection === "interface" && (
            <Card className={settingsCardClass}>
              <CardHeader className={settingsHeaderClass}>
                <CardTitle className="text-base flex items-center gap-2">
                  <SlidersHorizontal className="size-4" />
                  Mode d&apos;utilisation
                </CardTitle>
              </CardHeader>
              <CardContent className={settingsContentClass}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      value: "simple" as const,
                      title: "Mode simplifié",
                      description: "Assistant conversationnel en page principale, avec boutons d'action sur le compte.",
                    },
                    {
                      value: "detailed" as const,
                      title: "Mode détaillé",
                      description: "Interface experte avec historique, sections et réglages complets.",
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setAssistantMode(option.value);
                        window.localStorage.setItem("shalom-assistant-experience", option.value);
                      }}
                      className={cn(
                        "rounded-xl border p-4 text-left transition",
                        assistantMode === option.value
                          ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      )}
                    >
                      <span className="text-sm font-bold text-slate-900">{option.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-500">{option.description}</span>
                    </button>
                  ))}
                </div>
                <Link href="/dashboard/assistant">
                  <Button size="sm">
                    <Bot className="size-4" />
                    Ouvrir l&apos;assistant
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Section communauté */}
          {activeSection === "community" && (
            <Card className={settingsCardClass}>
              <CardHeader className={settingsHeaderClass}>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="size-4" />
                  Informations de la communauté
                </CardTitle>
              </CardHeader>
              <CardContent className={settingsContentClass}>
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
                    <label className="text-sm font-medium text-slate-700">Type de structure</label>
                    <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
                      {communityTypeLabel}
                    </div>
                    <p className="text-xs text-slate-400">
                      Ce choix est défini à la création du compte et ne peut pas être modifié ici.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Présentez votre communauté en quelques mots..."
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

                <Button onClick={saveCommunity} loading={saving}>
                  <Save className="size-4" />
                  Sauvegarder
                </Button>
              </CardContent>
            </Card>
          )}

          {activeSection === "contacts" && (
            <Card className={settingsCardClass}>
              <CardHeader className={settingsHeaderClass}>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="size-4" />
                  Contacts de la communauté
                </CardTitle>
              </CardHeader>
              <CardContent className={settingsContentClass}>
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
                    placeholder="Notes utiles : centres d'intérêt, préférences, informations de suivi..."
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
                    {membersLoading && <span className="text-xs text-slate-400">Chargement...</span>}
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
                              {member.notes ? ` - ${member.notes}` : ""}
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
            <Card className={settingsCardClass}>
              <CardHeader className={settingsHeaderClass}>
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="size-4" />
                  Identité éditoriale
                </CardTitle>
              </CardHeader>
              <CardContent className={settingsContentClass}>
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
                    placeholder="- Votre communauté"
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
                    placeholder="Ex : toujours inclure les horaires précis, utiliser le terme 'Chabbat' et non 'Sabbat', ne pas mentionner les billets de loterie..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    Délai de notification avant envoi (en heures)
                  </label>
                  <div className="flex max-w-xs items-center gap-2">
                    <input
                      type="number"
                      min="0.25"
                      step="0.25"
                      value={notificationLeadHours}
                      onChange={(e) => setNotificationLeadHours(e.target.value)}
                      className="w-28 rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <span className="text-sm text-slate-500">heures avant l&apos;envoi</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Choisissez combien d&apos;heures avant l&apos;envoi vous souhaitez être notifié.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Validation des automatisations
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      {
                        value: "manual" as const,
                        title: "Validation manuelle",
                        description: "Recommandé : l'IA prépare le message, puis vous validez avant l'envoi.",
                      },
                      {
                        value: "automatic" as const,
                        title: "Envoi automatique",
                        description: "Les automatisations partent seules au bon moment, sans validation manuelle.",
                      },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setAutomationValidationMode(option.value);
                          // Active les notifications push (geste utilisateur) si validation manuelle.
                          if (option.value === "manual") void enablePushNotifications();
                        }}
                        className={cn(
                          "rounded-xl border p-4 text-left transition",
                          automationValidationMode === option.value
                            ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        )}
                      >
                        <span className="text-sm font-bold text-slate-900">{option.title}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-slate-500">{option.description}</span>
                      </button>
                    ))}
                  </div>
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
            <Card className={settingsCardClass}>
              <CardHeader className={settingsHeaderClass}>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="size-4" />
                  Mon profil
                </CardTitle>
              </CardHeader>
              <CardContent className={settingsContentClass}>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        {logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoUrl} alt="Logo de la communauté" className="h-full w-full object-contain p-2" />
                        ) : (
                          <ImageIcon className="size-7 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Logo de la communauté</p>
                        <p className="mt-1 text-sm text-slate-500">
                          Ce logo sera utilisé pour personnaliser votre profil, vos contenus et votre espace.
                        </p>
                      </div>
                    </div>

                    <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                      {logoUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                      {logoUploading ? "Téléversement..." : "Changer le logo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={logoUploading}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadCommunityLogo(file);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>

                  {logoError && (
                    <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                      {logoError}
                    </p>
                  )}
                </div>

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

                <div className="flex gap-2">
                  <Button onClick={saveProfile} loading={saving}>
                    <Save className="size-4" />
                    Sauvegarder
                  </Button>
                </div>

                <div className="border-t border-slate-200 pt-4 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-900">Connexion Google</h3>
                    <p className="text-sm text-slate-500">
                      Connectez votre compte Google pour centraliser la réception et la gestion de vos e-mails et fiches d&apos;établissement.
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500 font-bold">
                        G
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Google Email & Business</p>
                        <p className="text-xs text-slate-500">
                          {googleConnected
                            ? `Connecté à : ${googleEmailAddress}`
                            : "Non connecté"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant={googleConnected ? "destructive" : "outline"}
                      size="sm"
                      onClick={handleConnectGoogle}
                    >
                      {googleConnected ? "Déconnecter" : "Connecter mon compte Google"}
                    </Button>
                  </div>
                </div>

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
