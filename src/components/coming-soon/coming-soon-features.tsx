"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  Heart,
  Lightbulb,
  Mail,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import styles from "./coming-soon-features.module.css";

type Feature = {
  id: string;
  title: string;
  eyebrow: string;
  summary: string;
  description: string;
  highlights: [string, string, string];
  icon: LucideIcon;
  from: string;
  to: string;
  color: string;
  soft: string;
  shadow: string;
};

export const COMING_SOON_FEATURES: Feature[] = [
  { id: "easystore", title: "EasyStore", eyebrow: "Marketplace communautaire", summary: "La première marketplace juive d’occasion.", description: "Un espace de confiance pour vendre, donner ou acheter des objets d’occasion au sein de la communauté, simplement et localement.", highlights: ["Annonces simples à publier", "Recherche par ville et catégorie", "Échanges communautaires facilités"], icon: ShoppingBag, from: "#fb923c", to: "#ea580c", color: "#c2410c", soft: "#fff1e6", shadow: "rgba(234,88,12,.35)" },
  { id: "newsletter-email", title: "Newsletter e-mail", eyebrow: "Communication régulière", summary: "Créez de belles newsletters, prêtes à être envoyées.", description: "Composez vos actualités, événements et messages communautaires dans une newsletter claire, professionnelle et à votre image.", highlights: ["Mise en page assistée", "Contenus suggérés par l’IA", "Programmation des envois"], icon: Mail, from: "#e879f9", to: "#c026d3", color: "#a21caf", soft: "#fdf0fe", shadow: "rgba(192,38,211,.35)" },
  { id: "email-intelligent", title: "E-mails intelligents anti-spam", eyebrow: "Délivrabilité optimisée", summary: "Envoyez le bon message sans saturer vos contacts.", description: "EasyCom vous aidera à personnaliser les messages, choisir le bon rythme et respecter les préférences de chaque contact.", highlights: ["Envois mieux ciblés", "Rythme d’envoi maîtrisé", "Préférences des contacts respectées"], icon: ShieldCheck, from: "#60a5fa", to: "#2563eb", color: "#1d4ed8", soft: "#eaf2ff", shadow: "rgba(37,99,235,.35)" },
  { id: "whatsapp-masse", title: "WhatsApp en masse, intelligemment", eyebrow: "Messages ciblés", summary: "Informez vos groupes avec plus de précision et moins de bruit.", description: "Des campagnes WhatsApp segmentées, personnalisées et programmées, avec des garde-fous contre les messages répétitifs.", highlights: ["Groupes de contacts ciblés", "Messages personnalisés", "Programmation et suivi"], icon: MessageCircle, from: "#4ade80", to: "#16a34a", color: "#15803d", soft: "#eafbef", shadow: "rgba(22,163,74,.35)" },
  { id: "easybanque", title: "EasyBanque", eyebrow: "Ressources juives", summary: "Vendez et achetez des ressources, études et créations communautaires.", description: "Une banque de ressources juives pour partager ou proposer des études, supports pédagogiques, créations et outils.", highlights: ["Études et contenus", "Créations communautaires", "Achat, vente et partage"], icon: BookOpen, from: "#a78bfa", to: "#6d28d9", color: "#6d28d9", soft: "#f3eeff", shadow: "rgba(109,40,217,.35)" },
  { id: "campagnes-dons", title: "Campagnes de dons", eyebrow: "Mobilisation solidaire", summary: "Créez des campagnes claires, belles et faciles à partager.", description: "Lancez une campagne avec un objectif, une histoire et une page dédiée, puis suivez sa progression et remerciez vos donateurs.", highlights: ["Page de campagne personnalisée", "Objectif et progression visibles", "Remerciements facilités"], icon: Heart, from: "#fb7185", to: "#e11d48", color: "#be123c", soft: "#fff0f3", shadow: "rgba(225,29,72,.35)" },
];

type FeatureStyle = CSSProperties & Record<`--feature-${string}`, string>;
const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "33668508898").replace(/\D/g, "");
const WHATSAPP_MESSAGE = "Bonjour EasyCom IA 👋 J'ai une idée de fonctionnalité pour la suite : ";

function featureStyle(feature: Feature): FeatureStyle {
  return { "--feature-from": feature.from, "--feature-to": feature.to, "--feature-color": feature.color, "--feature-soft": feature.soft, "--feature-shadow": feature.shadow };
}

export function ComingSoonFeatures({ dashboard = false }: { dashboard?: boolean }) {
  const [selected, setSelected] = useState<Feature | null>(null);
  const [open, setOpen] = useState(false);
  const understandButtonRef = useRef<HTMLButtonElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragDistance = useRef(0);

  function openFeature(feature: Feature) { setSelected(feature); setOpen(true); }
  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") return;
    dragStartY.current = event.clientY;
    dragDistance.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return;
    dragDistance.current = Math.max(0, event.clientY - dragStartY.current);
    event.currentTarget.style.setProperty("--sheet-drag", `${dragDistance.current}px`);
  }
  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.removeProperty("--sheet-drag");
    if (dragDistance.current > 90) setOpen(false);
    dragStartY.current = null;
    dragDistance.current = 0;
  }

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <div className={`${styles.page} ${dashboard ? styles.dashboard : ""}`}>
        {!dashboard ? (
          <header className={styles.header}>
            <Link href="/" className={styles.brand} aria-label="EasyCom IA, accueil">
              <Image src="/easycom-ai-logo.png" alt="" width={34} height={34} priority />
              <span><strong>EasyCom IA</strong><small>Communication communautaire</small></span>
            </Link>
            <Link href="/auth/login" className={styles.notification} aria-label="Se connecter et voir les notifications"><Bell aria-hidden="true" /><span aria-hidden="true" /></Link>
          </header>
        ) : null}

        <main className={styles.main}>
          <section className={styles.hero} aria-labelledby="coming-soon-title">
            <span className={styles.goldHalo} aria-hidden="true" />
            <div className={styles.heroBadge}><span aria-hidden="true" />La suite d’EasyCom IA</div>
            <h1 id="coming-soon-title">Fonctionnalités<span>à venir…</span></h1>
            <p>De nouveaux outils pour simplifier les échanges, les ressources et les projets de toute la communauté.</p>
            <div className={styles.stats} aria-label="Résumé des nouveautés">
              <div><strong>6</strong><span>nouveaux outils</span></div>
              <div><strong>IA</strong><span>au cœur de chaque outil</span></div>
              <div><strong aria-hidden="true">🔔</strong><span>bientôt disponibles</span></div>
            </div>
          </section>

          <section className={styles.features} aria-labelledby="features-title">
            <div className={styles.sectionHeading}><div><p>En préparation</p><h2 id="features-title">Les prochains outils</h2></div><span>Touchez une carte</span></div>
            <div className={styles.grid}>
              {COMING_SOON_FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <button key={feature.id} type="button" className={styles.card} style={{ ...featureStyle(feature), "--entry-delay": `${100 + index * 60}ms` } as FeatureStyle} onClick={() => openFeature(feature)} aria-haspopup="dialog" aria-label={`En savoir plus sur ${feature.title}`}>
                    <span className={styles.cardGlow} aria-hidden="true" />
                    <span className={styles.icon}><Icon aria-hidden="true" /></span>
                    <span className={styles.cardCopy}>
                      <span className={styles.eyebrow}>{feature.eyebrow}</span>
                      <strong>{feature.title}</strong>
                      <span className={styles.summary}>{feature.summary}</span>
                      <span className={styles.cardFooter}><span>Bientôt</span><b>En savoir plus <ArrowRight aria-hidden="true" /></b></span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles.idea}>
            <Lightbulb className={styles.ideaIcon} aria-hidden="true" />
            <h2>Une idée pour la suite ?</h2>
            <p>Dites-nous quelle fonctionnalité vous serait la plus utile : vos retours fixent nos priorités.</p>
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={styles.ideaButton}><MessageCircle aria-hidden="true" />Partager mon idée<ArrowRight aria-hidden="true" /></a>
          </section>
        </main>
      </div>

      {selected ? (
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content className={styles.sheet} style={featureStyle(selected)} onOpenAutoFocus={(event) => { event.preventDefault(); understandButtonRef.current?.focus(); }} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerEnd} onPointerCancel={handlePointerEnd}>
            <div className={styles.handle} aria-hidden="true" />
            <div className={styles.sheetHeader}>
              <span className={styles.sheetIcon}>{(() => { const Icon = selected.icon; return <Icon aria-hidden="true" />; })()}</span>
              <div><span className={styles.available}><i aria-hidden="true" />Bientôt disponible</span><Dialog.Title>{selected.title}</Dialog.Title></div>
            </div>
            <Dialog.Description>{selected.description}</Dialog.Description>
            <ul className={styles.benefits}>{selected.highlights.map((highlight) => <li key={highlight}><span><Check aria-hidden="true" /></span>{highlight}</li>)}</ul>
            <Dialog.Close ref={understandButtonRef} className={styles.closeButton}>J’ai compris</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      ) : null}
    </Dialog.Root>
  );
}
