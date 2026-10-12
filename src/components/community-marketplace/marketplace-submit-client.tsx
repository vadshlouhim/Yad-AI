"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, FileUp, Package, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, LISTING_CATEGORIES, type ListingAccess, type ListingKind, type SellerProfile } from "@/lib/community-marketplace";

const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

export function MarketplaceSubmitClient({ communityName }: { communityName: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<ListingKind>("digital");
  const [access, setAccess] = useState<ListingAccess>("free");
  const [visibility, setVisibility] = useState<"owner" | "community" | "platform">("community");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const [seller, setSeller] = useState<Partial<SellerProfile>>({ contactType: "email", paymentProvider: "paypal" });
  const [sellerAccepted, setSellerAccepted] = useState(false);

  useEffect(() => {
    fetch("/api/community-marketplace/seller-profile", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (payload?.data) {
          setSeller({ ...payload.data, paymentProvider: payload.data.paymentProvider ?? "paypal" });
          setSellerAccepted(true);
        }
      })
      .catch(() => undefined);
  }, []);

  function chooseAccess(value: ListingAccess) {
    setAccess(value);
    if (value === "personal") {
      setKind("digital");
      setVisibility("owner");
    } else if (visibility === "owner") {
      setVisibility("community");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!rightsAccepted) return setError("Confirmez que vous avez le droit de partager ou vendre ce contenu.");
    if (files.length === 0) return setError(kind === "physical" ? "Ajoutez au moins une photo." : "Ajoutez le fichier à publier.");
    setSubmitting(true);
    const formElement = event.currentTarget;
    const fields = new FormData(formElement);

    try {
      if (access === "paid" || kind === "physical") {
        const sellerResponse = await fetch("/api/community-marketplace/seller-profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...seller, acceptedTerms: sellerAccepted, requiresPayment: access === "paid" }),
        });
        const sellerPayload = await sellerResponse.json();
        if (!sellerResponse.ok) throw new Error(sellerPayload.error ?? "Profil vendeur incomplet");
      }

      const metadata = {
        kind,
        access,
        visibility,
        title: fields.get("title"),
        description: fields.get("description"),
        category: fields.get("category"),
        theme: fields.get("theme"),
        price: fields.get("price"),
        condition: kind === "physical" ? fields.get("condition") : null,
        fulfillmentMode: kind === "physical" ? fields.get("fulfillmentMode") : null,
        city: kind === "physical" ? fields.get("city") : null,
        shippingNote: kind === "physical" ? fields.get("shippingNote") : null,
      };
      const payload = new FormData();
      payload.set("metadata", JSON.stringify(metadata));
      files.forEach((file) => payload.append("files", file));
      const response = await fetch("/api/community-marketplace/listings", { method: "POST", body: payload });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Publication impossible");
      router.push("/dashboard/boutique/communautaire");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Publication impossible");
      setSubmitting(false);
    }
  }

  return <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
    <Link href="/dashboard/boutique/communautaire" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#421388]"><ArrowLeft className="size-4" /> Retour aux annonces</Link>
    <div className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50 sm:p-8">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#421388]">{communityName}</p>
      <h1 className="mt-2 text-3xl font-black text-slate-950">Publier simplement</h1>
      <p className="mt-2 text-sm text-slate-500">Choisissez le type, ajoutez les informations utiles, puis publiez immédiatement.</p>
      <form onSubmit={submit} className="mt-8 space-y-8">
        <Section number="1" title="Que publiez-vous ?">
          <div className="grid gap-3 sm:grid-cols-2"><Choice active={kind === "digital"} onClick={() => setKind("digital")} icon={<FileUp />} title="Ressource numérique" detail="PDF, image ou document" /><Choice active={kind === "physical"} disabled={access === "personal"} onClick={() => setKind("physical")} icon={<Package />} title="Article physique" detail="Livre, objet ou judaïca" /></div>
        </Section>
        <Section number="2" title="Quel accès ?">
          <div className="grid gap-3 sm:grid-cols-3"><Choice active={access === "free"} onClick={() => chooseAccess("free")} title="Gratuit" detail="Visible et accessible sans paiement" /><Choice active={access === "paid"} onClick={() => chooseAccess("paid")} title="À vendre" detail="Paiement direct PayPal ou Revolut" /><Choice active={access === "personal"} onClick={() => chooseAccess("personal")} title="Personnel" detail="Seulement visible par vous" /></div>
          {access !== "personal" && <div className="mt-4"><label className="text-sm font-bold text-slate-700">Visibilité</label><select value={visibility} onChange={(event) => setVisibility(event.target.value as "community" | "platform")} className={`${inputClass} mt-2`}><option value="community">Ma communauté uniquement</option><option value="platform">Tous les utilisateurs EasyCom</option></select></div>}
        </Section>
        <Section number="3" title="Présentez votre publication">
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Titre"><input name="title" required maxLength={120} className={inputClass} placeholder="Ex. Sidour en très bon état" /></Field><Field label="Catégorie"><select name="category" required className={inputClass}>{LISTING_CATEGORIES.map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}</select></Field></div>
          <Field label="Description"><textarea name="description" required minLength={10} maxLength={3000} rows={5} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" placeholder="Décrivez clairement le contenu, l’état et ce qui est inclus…" /></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Thème (facultatif)"><input name="theme" maxLength={80} className={inputClass} placeholder="Chabbat, fêtes, étude…" /></Field>{access === "paid" && <Field label="Prix en euros"><input name="price" required type="number" min="0.5" step="0.01" className={inputClass} placeholder="18.00" /></Field>}</div>
          {kind === "physical" && <div className="grid gap-4 sm:grid-cols-2"><Field label="État"><select name="condition" required className={inputClass}><option value="new">Neuf</option><option value="very_good">Très bon état</option><option value="good">Bon état</option><option value="fair">État correct</option></select></Field><Field label="Remise"><select name="fulfillmentMode" required className={inputClass}><option value="pickup">Remise en main propre</option><option value="shipping">Expédition à convenir</option><option value="both">Remise ou expédition</option></select></Field><Field label="Ville"><input name="city" required className={inputClass} /></Field><Field label="Précision de livraison"><input name="shippingNote" maxLength={500} className={inputClass} placeholder="Frais, secteur de retrait…" /></Field></div>}
          <Field label={kind === "physical" ? "Photos (1 à 5, 15 Mo max chacune)" : "Fichier (PDF, image ou texte, 15 Mo max)"}><input type="file" required multiple={kind === "physical"} accept={kind === "physical" ? "image/jpeg,image/png,image/webp" : "application/pdf,image/jpeg,image/png,image/webp,text/plain"} onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, kind === "physical" ? 5 : 1))} className="block w-full rounded-xl border border-dashed border-violet-300 bg-violet-50 p-4 text-sm text-violet-800 file:mr-3 file:rounded-lg file:border-0 file:bg-[#421388] file:px-3 file:py-2 file:font-bold file:text-white" /></Field>
        </Section>
        {(access === "paid" || kind === "physical") && <Section number="4" title={access === "paid" ? "Recevoir votre paiement" : "Vos coordonnées de contact"}>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900"><WalletCards className="mb-2 size-5" />{access === "paid" ? "L’acheteur vous contacte puis paie directement sur votre lien. EasyCom-AI ne reçoit jamais l’argent." : "Votre contact choisi sera communiqué uniquement aux membres intéressés par cet objet."}</div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Nom affiché"><input value={seller.displayName ?? ""} onChange={(event) => setSeller({ ...seller, displayName: event.target.value })} required className={inputClass} /></Field><Field label="Ville"><input value={seller.city ?? ""} onChange={(event) => setSeller({ ...seller, city: event.target.value })} className={inputClass} /></Field><Field label="Contact"><select value={seller.contactType ?? "email"} onChange={(event) => setSeller({ ...seller, contactType: event.target.value as "email" | "whatsapp" })} className={inputClass}><option value="email">E-mail</option><option value="whatsapp">WhatsApp</option></select></Field><Field label={seller.contactType === "whatsapp" ? "Numéro WhatsApp" : "Adresse e-mail"}><input value={seller.contactValue ?? ""} onChange={(event) => setSeller({ ...seller, contactValue: event.target.value })} required className={inputClass} /></Field>{access === "paid" && <><Field label="Paiement"><select value={seller.paymentProvider ?? "paypal"} onChange={(event) => setSeller({ ...seller, paymentProvider: event.target.value as "paypal" | "revolut" })} className={inputClass}><option value="paypal">PayPal</option><option value="revolut">Revolut</option></select></Field><Field label="Lien public de paiement"><input type="url" value={seller.paymentUrl ?? ""} onChange={(event) => setSeller({ ...seller, paymentUrl: event.target.value })} required className={inputClass} placeholder={seller.paymentProvider === "revolut" ? "https://revolut.me/..." : "https://paypal.me/..."} /></Field></>}</div>
          <CheckRow checked={sellerAccepted} onChange={setSellerAccepted}>J’accepte les règles entre particuliers et reste responsable de l’exactitude de l’annonce, de la remise, de la livraison et, en cas de vente, d’un éventuel remboursement.</CheckRow>
        </Section>}
        <div className="rounded-2xl bg-slate-50 p-4"><CheckRow checked={rightsAccepted} onChange={setRightsAccepted}>Je confirme disposer des droits nécessaires et que cette publication ne contient aucun contenu interdit, trompeur ou illicite.</CheckRow></div>
        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button asChild variant="ghost"><Link href="/dashboard/boutique/communautaire">Annuler</Link></Button><Button type="submit" size="lg" loading={submitting}><Check /> Publier maintenant</Button></div>
      </form>
    </div>
  </div>;
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) { return <section className="space-y-4 border-t border-slate-100 pt-7 first:border-0 first:pt-0"><h2 className="flex items-center gap-3 text-lg font-black text-slate-900"><span className="flex size-8 items-center justify-center rounded-full bg-violet-100 text-sm text-[#421388]">{number}</span>{title}</h2>{children}</section>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-2 text-sm font-bold text-slate-700"><span>{label}</span>{children}</label>; }
function Choice({ active, disabled, onClick, icon, title, detail }: { active: boolean; disabled?: boolean; onClick: () => void; icon?: React.ReactNode; title: string; detail: string }) { return <button type="button" disabled={disabled} onClick={onClick} className={`rounded-2xl border p-4 text-left transition disabled:opacity-40 ${active ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100" : "border-slate-200 hover:border-violet-200"}`}><span className="flex items-center gap-2 font-black text-slate-900">{icon}{title}{active && <Check className="ml-auto size-4 text-[#421388]" />}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span></button>; }
function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: (value: boolean) => void; children: React.ReactNode }) { return <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-slate-600"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 size-4 accent-[#421388]" /><span>{children}</span></label>; }
