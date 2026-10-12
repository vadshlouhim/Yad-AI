"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Download,
  Eye,
  FileText,
  Heart,
  Loader2,
  MapPin,
  Package,
  Plus,
  Search,
  ShieldAlert,
  ShoppingBag,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_LABELS,
  CONDITION_LABELS,
  FULFILLMENT_LABELS,
  LISTING_CATEGORIES,
  formatMarketplacePrice,
  type MarketplaceListing,
} from "@/lib/community-marketplace";

type Scope = "discover" | "mine" | "favorites";

interface ContactData {
  displayName: string;
  city: string | null;
  contactType: "email" | "whatsapp";
  contactValue: string;
  paymentProvider?: "paypal" | "revolut" | null;
  paymentUrl?: string | null;
  reference: string;
}

export function CommunityMarketplaceClient({
  currentUserId,
  communityName,
  canPublish,
}: {
  currentUserId: string;
  communityName: string;
  canPublish: boolean;
}) {
  const [scope, setScope] = useState<Scope>("discover");
  const [items, setItems] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [access, setAccess] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<MarketplaceListing | null>(null);
  const [contact, setContact] = useState<ContactData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams({ scope });
    if (q.trim()) params.set("q", q.trim());
    if (kind) params.set("kind", kind);
    if (access) params.set("access", access);
    if (category) params.set("category", category);
    return params.toString();
  }, [access, category, kind, q, scope]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/community-marketplace/listings?${query}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Chargement impossible");
      setItems(payload.data ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(load, q ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, q]);

  async function openListing(listing: MarketplaceListing) {
    setContact(null);
    setSelected(listing);
    fetch(`/api/community-marketplace/listings/${listing.id}/view`, { method: "POST" }).catch(() => undefined);
    try {
      const response = await fetch(`/api/community-marketplace/listings/${listing.id}`, { cache: "no-store" });
      const payload = await response.json();
      if (response.ok) setSelected((current) => current ? { ...current, ...payload.data } : payload.data);
    } catch {
      // The list card remains usable if detail hydration fails.
    }
  }

  async function toggleFavorite(listing: MarketplaceListing) {
    const response = await fetch(`/api/community-marketplace/listings/${listing.id}/favorite`, { method: "POST" });
    if (!response.ok) return;
    setItems((current) => current.map((item) => item.id === listing.id
      ? { ...item, isFavorite: !item.isFavorite, favoriteCount: Math.max(0, (item.favoriteCount ?? 0) + (item.isFavorite ? -1 : 1)) }
      : item));
  }

  async function revealContact(listing: MarketplaceListing) {
    setActionLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/community-marketplace/listings/${listing.id}/contact`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Coordonnées indisponibles");
      setContact(payload.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Coordonnées indisponibles");
    } finally {
      setActionLoading(false);
    }
  }

  async function reportListing(listing: MarketplaceListing) {
    const reason = window.prompt("Pourquoi souhaitez-vous signaler cette annonce ?");
    if (!reason?.trim()) return;
    const response = await fetch(`/api/community-marketplace/listings/${listing.id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "other", details: reason.trim() }),
    });
    window.alert(response.ok ? "Merci, le signalement a été transmis." : "Le signalement n’a pas pu être envoyé.");
  }

  async function changeStatus(listing: MarketplaceListing, action: "sold" | "republish" | "archive") {
    setActionLoading(true);
    const response = await fetch(`/api/community-marketplace/listings/${listing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setActionLoading(false);
    if (response.ok) {
      setSelected(null);
      await load();
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-5 sm:px-6 sm:py-8">
      <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#250763,#421388_55%,#7652bd)] px-6 py-8 text-white shadow-xl sm:px-9">
        <Link href="/dashboard/boutique" className="inline-flex items-center gap-2 text-xs font-bold text-white/75 hover:text-white">
          <ArrowLeft className="size-4" /> La Boutique d’EasyCom-AI
        </Link>
        <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="border-white/20 bg-white/10 text-white">{communityName}</Badge>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Annonces & Ressources communautaires</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">Partagez un fichier, donnez une ressource ou vendez occasionnellement un objet entre membres EasyCom.</p>
          </div>
          {canPublish ? (
            <Button asChild size="lg" className="bg-white text-[#421388] hover:bg-violet-50">
              <Link href="/dashboard/boutique/communautaire/publier"><Plus /> Publier une annonce</Link>
            </Button>
          ) : (
            <Button asChild size="lg" variant="outline"><Link href="/dashboard/settings/billing">Débloquer la publication</Link></Button>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap gap-2">
          {([['discover', 'Découvrir'], ['mine', 'Mes annonces'], ['favorites', 'Mes favoris']] as const).map(([value, label]) => (
            <button key={value} onClick={() => setScope(value)} className={`rounded-full px-4 py-2 text-sm font-bold transition ${scope === value ? "bg-[#421388] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>
          ))}
          <Link href="/dashboard/community-library/request" className="rounded-full bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100">Faire une demande</Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(0,180px))]">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3"><Search className="size-4 text-slate-400" /><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Rechercher une ressource…" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
          <Filter value={kind} onChange={setKind} label="Tous les formats" options={[["digital", "Numérique"], ["physical", "Objet physique"]]} />
          <Filter value={access} onChange={setAccess} label="Tous les accès" options={[["free", "Gratuit"], ["paid", "Payant"]]} />
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none">
            <option value="">Toutes les catégories</option>
            {LISTING_CATEGORIES.map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}
          </select>
        </div>
      </section>

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}
      {loading ? (
        <div className="flex min-h-56 items-center justify-center text-slate-500"><Loader2 className="mr-2 size-5 animate-spin" /> Chargement…</div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <ShoppingBag className="mx-auto size-10 text-slate-300" /><h2 className="mt-4 text-lg font-black text-slate-800">Aucune annonce ici pour le moment</h2><p className="mt-2 text-sm text-slate-500">Modifiez les filtres ou publiez la première ressource.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((listing) => <ListingCard key={listing.id} listing={listing} onOpen={() => openListing(listing)} onFavorite={() => toggleFavorite(listing)} />)}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => event.currentTarget === event.target && setSelected(null)}>
          <article className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur"><span className="text-sm font-black text-slate-500">Détail de l’annonce</span><Button variant="ghost" size="icon" onClick={() => setSelected(null)} aria-label="Fermer"><X /></Button></div>
            <div className="grid gap-6 p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                {selected.assets?.find((asset) => asset.signedUrl)?.signedUrl ? <Image unoptimized width={800} height={600} src={selected.assets.find((asset) => asset.signedUrl)!.signedUrl!} alt="" className="mb-5 aspect-[4/3] w-full rounded-2xl object-cover" /> : <div className="mb-5 flex aspect-[4/3] items-center justify-center rounded-2xl bg-violet-50 text-violet-300">{selected.kind === "physical" ? <Package className="size-16" /> : <FileText className="size-16" />}</div>}
                <div className="flex flex-wrap gap-2"><Badge variant={selected.access === "paid" ? "warning" : "success"}>{selected.access === "paid" ? formatMarketplacePrice(selected.priceCents, selected.currency) : selected.access === "personal" ? "Personnel" : "Gratuit"}</Badge><Badge variant="outline">{selected.kind === "physical" ? "Objet physique" : "Fichier numérique"}</Badge>{selected.status === "sold" && <Badge variant="secondary">Vendu</Badge>}</div>
                <h2 className="mt-4 text-2xl font-black text-slate-950">{selected.title}</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selected.description}</p>
              </div>
              <aside className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p className="font-black text-slate-900">Informations</p>
                  <p className="mt-3">{CATEGORY_LABELS[selected.category]}</p>
                  {selected.condition && <p className="mt-2">{CONDITION_LABELS[selected.condition]}</p>}
                  {selected.fulfillmentMode && <p className="mt-2">{FULFILLMENT_LABELS[selected.fulfillmentMode]}</p>}
                  {selected.city && <p className="mt-2 flex items-center gap-1"><MapPin className="size-4" /> {selected.city}</p>}
                  <p className="mt-2 flex gap-4 text-xs text-slate-400"><span className="flex items-center gap-1"><Eye className="size-3" /> {selected.viewCount ?? 0}</span><span className="flex items-center gap-1"><Heart className="size-3" /> {selected.favoriteCount ?? 0}</span></p>
                </div>
                {selected.ownerUserId === currentUserId ? (
                  <div className="space-y-2">
                    {selected.kind === "digital" && <Button asChild className="w-full"><a href={`/api/community-marketplace/listings/${selected.id}/download`}><Download /> Télécharger</a></Button>}
                    {selected.status === "published" ? <Button variant="outline" className="w-full" loading={actionLoading} onClick={() => changeStatus(selected, "sold")}>Marquer comme vendu</Button> : selected.status === "sold" ? <Button variant="outline" className="w-full" loading={actionLoading} onClick={() => changeStatus(selected, "republish")}>Remettre en ligne</Button> : null}
                    <Button variant="ghost" className="w-full text-red-600" loading={actionLoading} onClick={() => changeStatus(selected, "archive")}>Archiver</Button>
                  </div>
                ) : selected.kind === "digital" && selected.access === "free" ? (
                  <Button asChild className="w-full"><a href={`/api/community-marketplace/listings/${selected.id}/download`}><Download /> Télécharger gratuitement</a></Button>
                ) : selected.status === "sold" ? (
                  <Button className="w-full" disabled>Annonce vendue</Button>
                ) : (
                  <Button className="w-full" loading={actionLoading} onClick={() => revealContact(selected)}>{selected.access === "paid" ? "Contacter et payer" : "Contacter le donneur"}</Button>
                )}
                {contact && <ContactBox contact={contact} isPaid={selected.access === "paid"} />}
                {selected.ownerUserId !== currentUserId && <button onClick={() => reportListing(selected)} className="flex w-full items-center justify-center gap-2 py-2 text-xs font-bold text-slate-400 hover:text-red-600"><ShieldAlert className="size-4" /> Signaler l’annonce</button>}
              </aside>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}

function Filter({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: readonly (readonly [string, string])[] }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"><option value="">{label}</option>{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select>;
}

function ListingCard({ listing, onOpen, onFavorite }: { listing: MarketplaceListing; onOpen: () => void; onFavorite: () => void }) {
  const image = listing.assets?.find((asset) => asset.signedUrl)?.signedUrl;
  return <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
    <button onClick={onOpen} className="block w-full text-left">
      {image ? <Image unoptimized width={800} height={600} src={image} alt="" className="aspect-[4/3] w-full object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center bg-[linear-gradient(145deg,#f5f0ff,#fafafa)] text-violet-300">{listing.kind === "physical" ? <Package className="size-14" /> : <BookOpen className="size-14" />}</div>}
    </button>
    <div className="p-5">
      <div className="flex items-start justify-between gap-3"><div className="flex flex-wrap gap-2"><Badge variant={listing.access === "paid" ? "warning" : "success"}>{listing.access === "paid" ? formatMarketplacePrice(listing.priceCents, listing.currency) : listing.access === "personal" ? "Personnel" : "Gratuit"}</Badge>{listing.status === "sold" && <Badge variant="secondary">Vendu</Badge>}</div><button onClick={onFavorite} className={`rounded-full p-2 ${listing.isFavorite ? "bg-rose-50 text-rose-600" : "text-slate-400 hover:bg-slate-100"}`} aria-label="Ajouter aux favoris"><Heart className={`size-5 ${listing.isFavorite ? "fill-current" : ""}`} /></button></div>
      <button onClick={onOpen} className="mt-3 block w-full text-left"><h2 className="line-clamp-2 text-lg font-black text-slate-950">{listing.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">{listing.description}</p></button>
      <div className="mt-4 flex items-center justify-between text-xs font-medium text-slate-400"><span>{listing.kind === "physical" ? "Objet physique" : "Numérique"}</span><span>{listing.owner?.name ?? "Membre EasyCom"}</span></div>
    </div>
  </article>;
}

function ContactBox({ contact, isPaid }: { contact: ContactData; isPaid: boolean }) {
  const contactHref = contact.contactType === "email" ? `mailto:${contact.contactValue}?subject=${encodeURIComponent(`Annonce ${contact.reference}`)}` : `https://wa.me/${contact.contactValue.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour, je vous contacte pour l’annonce ${contact.reference}.`)}`;
  return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950"><p className="font-black">Transaction directe avec {contact.displayName}</p><p className="mt-1">Référence : {contact.reference}</p>{isPaid && <p className="mt-2">Payez uniquement après avoir confirmé la disponibilité avec le vendeur. Pour un fichier numérique, le vendeur vous l’envoie manuellement après paiement. EasyCom-AI ne reçoit pas le paiement et ne garantit pas la transaction.</p>}<div className="mt-3 grid gap-2"><a href={contactHref} target={contact.contactType === "whatsapp" ? "_blank" : undefined} rel="noopener noreferrer" className="rounded-lg bg-white px-3 py-2 text-center font-black shadow-sm">Contacter par {contact.contactType === "email" ? "e-mail" : "WhatsApp"}</a>{isPaid && contact.paymentUrl && <a href={contact.paymentUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-[#421388] px-3 py-2 text-center font-black text-white">Ouvrir {contact.paymentProvider === "paypal" ? "PayPal" : "Revolut"}</a>}</div></div>;
}
