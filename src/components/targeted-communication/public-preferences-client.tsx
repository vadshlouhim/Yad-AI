"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Check, CheckCircle2, Clipboard, LoaderCircle, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PublicData {
  active: boolean;
  community: { name: string; logoUrl: string };
  title: string;
  introduction: string;
  primaryColor: string;
  accentColor: string;
  categories: Array<{ id: string; name: string }>;
  member: { firstName: string | null; lastName: string | null; phone: string | null } | null;
  selectedCategoryIds: string[];
  tokenValid: boolean | null;
}

function contrastColor(hex: string) {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return "#ffffff";
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? "#111827" : "#ffffff";
}

export function PublicPreferencesClient({ slug, token }: { slug: string; token: string }) {
  const [data, setData] = useState<PublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [managementUrl, setManagementUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const query = token ? `?token=${encodeURIComponent(token)}` : "";
    fetch(`/api/communication-ciblee/public/${encodeURIComponent(slug)}${query}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Page indisponible.");
        return payload as PublicData;
      })
      .then((payload) => {
        setData(payload);
        setSelected(payload.selectedCategoryIds);
        setForm({
          firstName: payload.member?.firstName ?? "",
          lastName: payload.member?.lastName ?? "",
          phone: payload.member?.phone ?? "",
        });
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") {
          setError(loadError instanceof Error ? loadError.message : "Page indisponible.");
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [slug, token]);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setSaved(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!token && selected.length === 0) {
      setError("Choisissez au moins une catégorie.");
      return;
    }
    try {
      setSaving(true);
      const response = await fetch(`/api/communication-ciblee/public/${encodeURIComponent(slug)}`, {
        method: token ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { token, categoryIds: selected } : { ...form, categoryIds: selected }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Enregistrement impossible.");
      setManagementUrl(payload.managementUrl ?? "");
      setSaved(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50">
        <LoaderCircle className="size-7 animate-spin text-[#421388]" />
        <span className="ml-3 text-sm font-bold text-slate-600">Chargement…</span>
      </main>
    );
  }

  if (error && !data) {
    return <StatusPage icon={MessageCircle} title="Lien indisponible" description={error} tone="red" />;
  }
  if (!data) return null;
  if (token && data.tokenValid === false) {
    return <StatusPage icon={ShieldCheck} title="Lien personnel invalide ou expiré" description="Demandez un nouveau lien à votre communauté." tone="amber" />;
  }
  if (!data.active && !token) {
    return <StatusPage icon={MessageCircle} title="Inscriptions momentanément fermées" description="Cette page sera bientôt de nouveau disponible." tone="slate" />;
  }

  const primaryText = contrastColor(data.primaryColor);

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,#f5f3ff_0%,#f8fafc_48%,#f8fafc_100%)] px-4 py-5 sm:py-9">
      <div className="mx-auto max-w-xl">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          <header
            className="px-6 py-8 text-center sm:px-9"
            style={{ background: `linear-gradient(145deg, ${data.primaryColor}, ${data.accentColor})`, color: primaryText }}
          >
            {data.community.logoUrl ? (
              <Image
                unoptimized
                width={72}
                height={72}
                src={data.community.logoUrl}
                alt={`Logo ${data.community.name}`}
                className="mx-auto mb-4 size-[72px] rounded-2xl border-4 border-white/30 bg-white object-contain shadow-lg"
              />
            ) : (
              <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-white/15">
                <MessageCircle className="size-7" />
              </span>
            )}
            <p className="text-sm font-bold opacity-80">{data.community.name}</p>
            <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
              {token ? "Mes préférences" : data.title}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 opacity-85">
              {token ? "Choisissez uniquement les sujets qui vous intéressent." : data.introduction}
            </p>
          </header>

          <form onSubmit={submit} className="p-5 sm:p-8">
            {saved && (
              <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                <CheckCircle2 className="mx-auto size-8 text-emerald-600" />
                <h2 className="mt-2 font-black text-emerald-950">Préférences enregistrées</h2>
                <p className="mt-1 text-sm text-emerald-800">Vous recevrez uniquement les sujets sélectionnés.</p>
                {managementUrl && (
                  <button
                    type="button"
                    onClick={() => { void navigator.clipboard.writeText(managementUrl); toast.success("Lien personnel copié"); }}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-black shadow-sm"
                    style={{ color: data.primaryColor }}
                  >
                    <Clipboard className="size-4" /> Conserver mon lien personnel
                  </button>
                )}
              </div>
            )}

            <fieldset>
              <legend className="text-base font-black text-slate-950">
                {token ? "Mes sujets" : "Que souhaitez-vous recevoir ?"}
              </legend>
              <p className="mt-1 text-sm text-slate-500">Vous pouvez faire plusieurs choix.</p>
              {data.categories.length === 0 ? (
                <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-500">
                  Aucun sujet disponible pour le moment.
                </p>
              ) : (
                <div className="mt-5 grid gap-3">
                  {data.categories.map((category) => {
                    const checked = selected.includes(category.id);
                    return (
                      <label
                        key={category.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 transition hover:-translate-y-0.5 active:scale-[0.99]",
                          checked ? "shadow-sm" : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
                        )}
                        style={checked ? { borderColor: data.primaryColor, backgroundColor: `${data.primaryColor}0d` } : undefined}
                      >
                        <input type="checkbox" checked={checked} onChange={() => toggle(category.id)} className="sr-only" />
                        <span
                          className="flex size-7 shrink-0 items-center justify-center rounded-full border-2"
                          style={checked
                            ? { backgroundColor: data.primaryColor, borderColor: data.primaryColor, color: primaryText }
                            : { borderColor: "#cbd5e1" }}
                        >
                          {checked && <Check className="size-4" />}
                        </span>
                        <span className="font-bold text-slate-900">{category.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>

            {!token && (
              <fieldset className="mt-7 border-t border-slate-100 pt-6">
                <legend className="text-base font-black text-slate-950">Vos coordonnées WhatsApp</legend>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <PublicField label="Prénom" value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} autoComplete="given-name" />
                  <PublicField label="Nom" value={form.lastName} onChange={(value) => setForm({ ...form, lastName: value })} autoComplete="family-name" />
                </div>
                <div className="mt-3">
                  <PublicField label="Numéro WhatsApp" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} autoComplete="tel" type="tel" placeholder="06 12 34 56 78" />
                </div>
              </fieldset>
            )}

            {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={saving || data.categories.length === 0}
              className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-black shadow-lg transition hover:-translate-y-0.5 hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: data.primaryColor, color: primaryText, boxShadow: `0 14px 30px ${data.primaryColor}32` }}
            >
              {saving ? <LoaderCircle className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
              {token ? "Enregistrer mes choix" : "Valider mes choix"}
            </button>
            <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs leading-5 text-slate-500">
              <ShieldCheck className="size-4 shrink-0" /> Votre numéro sert uniquement aux sujets choisis.
            </p>
          </form>
        </section>
        <p className="py-5 text-center text-xs font-semibold text-slate-400">Propulsé par EasyCom IA</p>
      </div>
    </main>
  );
}

function PublicField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-bold text-slate-700">{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-slate-200 px-3 text-slate-950 outline-none transition focus:border-[#421388] focus:ring-4 focus:ring-violet-100"
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        required
      />
    </label>
  );
}

function StatusPage({ icon: Icon, title, description, tone }: {
  icon: typeof MessageCircle;
  title: string;
  description: string;
  tone: "red" | "amber" | "slate";
}) {
  const tones = {
    red: "bg-red-50 text-red-500",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-500",
  };
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-5">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-xl shadow-slate-900/10">
        <span className={cn("mx-auto flex size-12 items-center justify-center rounded-2xl", tones[tone])}><Icon className="size-6" /></span>
        <h1 className="mt-4 text-xl font-black text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </main>
  );
}
