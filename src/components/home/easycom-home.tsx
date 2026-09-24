"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, BookOpen, Check, FileText, Image as ImageIcon, Menu,
  MessageCircle, Play, Plus, Settings, Share2, Sparkles, Users,
  X, ShoppingBag, Clock, Mail, Volume2, VolumeX,
} from "lucide-react";
import { PUBLIC_TOOLS, type PublicTool } from "@/lib/public-tools";
import { ToolIcon } from "@/components/presentation/tool-visual";
import { HOME_AGENT_IMAGES, MAIN_VIDEO_URL, homeVideoSource } from "./home-media";
import "./easycom-home.css";

const PreviewDialog = dynamic(() => import("./home-video-dialog"), {
  ssr: false,
  loading: () => <div role="status" className="home-loading">Ouverture de l’aperçu…</div>,
});
const MEDIA = "/media/home/";
const TOOLS = [
  { id: "publish", name: "Publier partout", badge: "En un clic", media: "02-dovber-publier-partout", agent: "Dov Ber", role: "Réseaux sociaux", portrait: HOME_AGENT_IMAGES.dovBer, Icon: Share2 },
  { id: "newsletter", name: "Newsletter", badge: "Imprimable pour Chabbat", media: "04-levik-newsletter", agent: "Levik", role: "Newsletter", portrait: HOME_AGENT_IMAGES.levik, Icon: FileText },
  { id: "shabbat", name: "Horaires Chabbat et Fêtes", badge: "Publié automatiquement", media: "05-david-horaires-chabbat", agent: "David", role: "Horaires Chabbat et Fêtes", portrait: HOME_AGENT_IMAGES.david, Icon: Clock },
  { id: "automations", name: "Hayom Yom & anniversaire juif", badge: "Intelligent", media: "06-david-anniversaires", agent: "David", role: "Automatisations", portrait: HOME_AGENT_IMAGES.david, Icon: Settings },
  { id: "posters", name: "Affiches & Visuels", badge: "IA & Canva", media: "03-zalman-affiches", agent: "Zalman", role: "Affiches & Visuels", portrait: HOME_AGENT_IMAGES.zalman, Icon: ImageIcon },
  { id: "torah", name: "Cours de Torah", badge: "Sources fiables", media: "08-shmouel-cours-torah", agent: "Shmouel", role: "Cours de Torah", portrait: HOME_AGENT_IMAGES.shmouel, Icon: BookOpen },
  { id: "email", name: "Email & Avis Google", badge: "Surveillé et intelligent", media: "10-email-avis-google", agent: "Levik", role: "Email & Avis Google", portrait: HOME_AGENT_IMAGES.levik, Icon: Mail },
  { id: "coming-soon", name: "À venir…", badge: "Bientôt disponible", media: "11-upcoming", agent: "EasyCom AI", role: "Nouveauté", portrait: HOME_AGENT_IMAGES.dovBer, Icon: Sparkles },
] as const;
type HomeTool = (typeof TOOLS)[number];
const NAV = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#demo", label: "Démo" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#faq", label: "FAQ", desktop: true },
];
const LEGAL = [
  { href: "/privacy", label: "Politique de confidentialité" },
  { href: "/legal/terms", label: "Conditions d’utilisation" },
  { href: "/cookies", label: "Cookies" },
  { href: "/data-deletion", label: "Suppression des données" },
];

function Brand() {
  return <Link href="/" className="home-brand" aria-label="EasyCom AI — Accueil">
    <Image src={`${MEDIA}easycom-brand-mark.webp`} width={40} height={30} alt="" />
    <span>EasyCom AI</span>
  </Link>;
}
function TrialLink({ yellow = false }: { yellow?: boolean }) {
  return <Link href="/auth/register" prefetch={false} className={`home-button home-button-primary${yellow ? " home-button-yellow" : ""}`}>
    Essayer gratuitement <ArrowRight size={20} aria-hidden="true" />
  </Link>;
}
function HomeToolIcon({ id }: { id: string }) {
  if (id !== "publish") return <ToolIcon id={id} className="home-tool-icon" />;
  return <span className="home-publish-icons" aria-hidden="true">
    {["facebook", "instagram", "whatsapp"].map(channel => <Image key={channel} src={`${MEDIA}${channel}-white.svg`} width={32} height={32} className="home-tool-icon" alt="" />)}
  </span>;
}
function DemoLink() {
  return <a href="https://www.youtube.com/@EasyComAI-Synagogue-BethHabad" target="_blank" rel="noopener noreferrer" className="home-button home-button-secondary">
    <span className="home-play-small"><Play size={14} fill="currentColor" aria-hidden="true" /></span>Regarder la vidéo
  </a>;
}
function HomeHeader() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const mobileMenu = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    mobileMenu.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
      if (event.key === "Tab") {
        const links = mobileMenu.current?.querySelectorAll<HTMLAnchorElement>("a");
        if (!links?.length) return;
        if (event.shiftKey && document.activeElement === links[0]) { event.preventDefault(); toggle.current?.focus(); }
        else if (!event.shiftKey && document.activeElement === links[links.length - 1]) { event.preventDefault(); toggle.current?.focus(); }
        else if (document.activeElement === toggle.current) { event.preventDefault(); (event.shiftKey ? links[links.length - 1] : links[0]).focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return <header className="home-header">
    <div className="home-container home-header-inner">
      <Brand />
      <nav className="home-desktop-nav" aria-label="Navigation principale">{NAV.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav>
      <div className="home-header-actions">
        <Link href="/auth/login" prefetch={false} className="home-login">Connexion</Link>
        <Link href="/auth/register" prefetch={false} className="home-header-trial">Essayer gratuitement</Link>
        <button ref={toggle} type="button" className="home-menu-toggle" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={open} aria-controls="home-mobile-menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>
    </div>
    {open && <>
      <button type="button" className="home-menu-backdrop" aria-label="Fermer le menu" onClick={() => { setOpen(false); toggle.current?.focus(); }} />
      <nav ref={mobileMenu} id="home-mobile-menu" className="home-mobile-menu" aria-label="Navigation mobile">
        {NAV.filter(link => !link.desktop).map(link => <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}<ArrowRight size={16} /></a>)}
        <Link href="/contact" onClick={() => setOpen(false)}>Contact<ArrowRight size={16} /></Link>
        <Link href="/auth/login" prefetch={false} onClick={() => setOpen(false)}>Connexion<ArrowRight size={16} /></Link>
      </nav>
    </>}
  </header>;
}
function Hero() {
  return <section className="home-container home-hero" aria-labelledby="home-title">
    <div className="home-hero-copy">
      <p className="home-eyebrow">Pensé pour les synagogues, Beth Habad et associations</p>
      <h1 id="home-title"><span className="home-title-line">Toute la communication</span>{" "}<span className="home-title-line">de votre synagogue.</span>{" "}<span className="home-title-accent">Au même endroit.</span></h1>
      <p className="home-hero-subtitle">Publiez, créez, automatisez. Vos agents IA s’occupent du reste.</p>
      <div className="home-hero-buttons"><TrialLink /><DemoLink /></div>
    </div>
    <div className="home-hero-art" aria-label="Dov Ber, votre agent de communication">
      <div className="home-hero-portrait"><Image src={HOME_AGENT_IMAGES.dovBer} alt="Dov Ber, votre agent de communication" width={899} height={1100} sizes="(max-width: 767px) 44vw, 520px" preload /></div>
      <span className="home-orbit home-orbit-publish"><ToolIcon id="publish" className="size-5" /><span>Publier partout</span></span>
      <span className="home-orbit home-orbit-newsletter"><FileText /><span>Newsletter</span></span>
      <span className="home-orbit home-orbit-posters"><ImageIcon /><span>Affiches</span></span>
      <span className="home-orbit home-orbit-automations"><Settings /><span>Automatisations</span></span>
    </div>
    <ul className="home-reassurance" aria-label="Pour commencer simplement">{["Sans engagement", "Configuration en 5 minutes", "Support en français"].map(text => <li key={text}><span><Check size={12} strokeWidth={3} aria-hidden="true" /></span>{text}</li>)}</ul>
  </section>;
}
function subscribeToReducedMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function subscribeToPageVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}

function MainVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(true);

  function toggleSound() {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
    if (!nextMuted) void video.play().catch(() => {});
  }

  return <>
    <video
      ref={videoRef}
      className="home-master-video"
      src={MAIN_VIDEO_URL}
      autoPlay
      muted={muted}
      controls
      playsInline
      preload="metadata"
      aria-label="Vidéo de présentation générale d’EasyCom AI"
      onCanPlay={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
    {loaded && !failed ? (
      <button type="button" className="home-video-sound" onClick={toggleSound} aria-pressed={!muted} aria-label={muted ? "Activer le son de la vidéo" : "Couper le son de la vidéo"}>
        {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
        <span>{muted ? "Activer le son" : "Son activé"}</span>
      </button>
    ) : null}
    {!loaded ? <span role="status" className="home-video-loading">Chargement de la vidéo…</span> : null}
    {failed ? <p role="status" className="home-video-error">La vidéo est momentanément indisponible.</p> : null}
  </>;
}

function MainDemo({ blocked }: { blocked: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [manuallyStarted, setManuallyStarted] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const pageVisible = useSyncExternalStore(
    subscribeToPageVisibility,
    () => !document.hidden,
    () => true,
  );

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting && entry.intersectionRatio >= 0.2);
    }, { threshold: [0, 0.2], rootMargin: "120px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const active = inView && pageVisible && !blocked && (!reducedMotion || manuallyStarted);

  return <section id="demo" className="home-container home-demo" aria-label="Démonstration d’EasyCom AI">
    <div ref={container} className="home-demo-frame">
      <picture className="home-demo-poster"><source media="(max-width: 767px)" srcSet={`${MEDIA}demo-mobile.webp`} />
        <img src={`${MEDIA}demo-desktop.webp`} alt="Découvrez EasyCom AI en action" width={1600} height={670} loading="lazy" />
      </picture>
      {active ? <MainVideoPlayer /> : null}
      {!active ? <button id="home-demo-play" type="button" className="home-demo-play" aria-label="Lire la démonstration d’EasyCom AI" onClick={() => setManuallyStarted(true)}><Play fill="currentColor" aria-hidden="true" /></button> : null}
      <span className="home-demo-label">Démonstration — données fictives</span>
    </div>
  </section>;
}
function FeatureCard({ tool, active, setActive, onOpen }: {
  tool: HomeTool; active: boolean; setActive: (id: string | null) => void;
  onOpen: (tool: HomeTool, trigger: HTMLElement) => void;
}) {
  const player = useRef<HTMLVideoElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const element = button.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting && active) setActive(null); });
    observer.observe(element);
    return () => observer.disconnect();
  }, [active, setActive]);
  useEffect(() => {
    const video = player.current;
    if (!video) return;
    if (active) {
      if (!video.getAttribute("src")) video.src = homeVideoSource(tool.media);
      void video.play().catch(() => {});
    } else { video.pause(); if (video.readyState > 0) video.currentTime = 0; }
    return () => video.pause();
  }, [active, tool.media]);
  function start() { if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setActive(tool.id); }
  return <button ref={button} type="button" className={`home-tool home-tool-${tool.id}${active && ready ? " home-tool-previewing" : ""}`} aria-label={`Découvrir ${tool.name}, ${tool.badge}`} aria-haspopup="dialog" onMouseEnter={start} onMouseLeave={() => { if (active) setActive(null); }} onFocus={start} onBlur={() => { if (active) setActive(null); }} onClick={event => { setActive(null); onOpen(tool, event.currentTarget); }}>
    <video ref={player} muted playsInline preload="none" loop poster={tool.id === "coming-soon" ? undefined : `${MEDIA}${tool.media}.webp`} aria-hidden="true" tabIndex={-1} onPlaying={() => setReady(true)} onTimeUpdate={() => { const video = player.current; if (video && video.currentTime >= 8) video.currentTime = 0; }} />
    <span className="home-tool-shade" />
    <span className="home-tool-content">
      <span className="home-tool-icon-shell">{["automations", "shabbat", "email", "coming-soon"].includes(tool.id) ? <tool.Icon className="home-tool-icon" aria-hidden="true" /> : <HomeToolIcon id={tool.id} />}</span>
      <span className="home-tool-title"><span className="home-tool-name">{tool.name}</span><small className="home-tool-badge">{tool.badge}</small></span>
    </span>
    <span className="home-card-arrow"><ArrowRight size={20} aria-hidden="true" /></span>
  </button>;
}
function FAQ() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const items = [
    { q: "EasyCom AI est-il réservé aux Beth Habad ?", a: "Non. EasyCom AI s’adresse aux synagogues, Beth Habad et associations communautaires qui souhaitent réunir leur communication au même endroit." },
    { q: "Puis-je arrêter mon abonnement quand je veux ?", a: "Oui. Votre abonnement est sans engagement et peut être annulé à tout moment depuis l’espace Paiement." },
  ];
  return <section id="faq" className="home-faq" aria-labelledby="home-faq-title">
    <h2 id="home-faq-title"><MessageCircle fill="currentColor" aria-hidden="true" />Questions fréquentes</h2>
    <div className="home-faq-items">{items.map((item, index) => <div key={item.q} className="home-faq-item">
      <h3><button type="button" aria-expanded={expanded === index} aria-controls={`home-faq-answer-${index}`} onClick={() => setExpanded(expanded === index ? null : index)}>{item.q}<Plus className={expanded === index ? "home-faq-open" : ""} size={19} aria-hidden="true" /></button></h3>
      <div id={`home-faq-answer-${index}`} hidden={expanded !== index}><p>{item.a}</p></div>
    </div>)}</div>
  </section>;
}
function CardRow({ id, className, label, children, footer }: { id: string; className: string; label: string; children: ReactNode; footer?: ReactNode }) {
  const row = useRef<HTMLDivElement>(null);
  const [navigation, setNavigation] = useState({ overflow: false, previous: false, next: false });
  useEffect(() => {
    const element = row.current;
    if (!element) return;
    function update() {
      if (!element) return;
      const remaining = element.scrollWidth - element.clientWidth;
      setNavigation({ overflow: remaining > 1, previous: element.scrollLeft > 1, next: element.scrollLeft < remaining - 1 });
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    update();
    return () => { observer.disconnect(); element.removeEventListener("scroll", update); };
  }, []);
  function advance(direction: number) {
    const element = row.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  return <>
    <div ref={row} id={id} className={className}>{children}</div>
    {(footer || navigation.overflow) && <div className={footer ? "home-row-footer" : undefined}>
    {footer}
    {navigation.overflow && <nav className="home-row-navigation" aria-label={`Défilement des ${label}`}>
      <button type="button" aria-controls={id} aria-label={`Voir les ${label} précédents`} disabled={!navigation.previous} onClick={() => advance(-1)}><ArrowLeft size={20} aria-hidden="true" /></button>
      <button type="button" aria-controls={id} aria-label={`Voir les ${label} suivants`} disabled={!navigation.next} onClick={() => advance(1)}><ArrowRight size={20} aria-hidden="true" /></button>
    </nav>}
    </div>}
  </>;
}
export function EasyComHome() {
  const [active, setActive] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ item: PublicTool; media: string; trigger: HTMLElement; comingSoon: boolean } | null>(null);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    function stopPreviews() { if (reduced.matches || document.hidden) setActive(null); }
    reduced.addEventListener("change", stopPreviews);
    document.addEventListener("visibilitychange", stopPreviews);
    return () => { reduced.removeEventListener("change", stopPreviews); document.removeEventListener("visibilitychange", stopPreviews); };
  }, []);
  function open(tool: HomeTool, trigger: HTMLElement) {
    const comingSoon = tool.id === "coming-soon";
    const original = PUBLIC_TOOLS.find(item => item.id === tool.id) ?? (comingSoon ? PUBLIC_TOOLS[0] : undefined);
    if (!original) return;
    setActive(null);
    setSelected({ item: { ...original, id: tool.id, name: tool.name, agent: tool.agent, portrait: tool.portrait }, media: tool.media, trigger, comingSoon });
  }
  return <div className="easycom-home">
    <a className="home-skip" href="#home-main">Aller au contenu</a>
    <HomeHeader />
    <main id="home-main">
      <Hero />
      <MainDemo blocked={selected !== null} />
      <div className="home-container home-body">
        <section id="fonctionnalites" className="home-features" aria-labelledby="home-features-title">
          <h2 id="home-features-title"><Sparkles className="home-sparkles" fill="currentColor" aria-hidden="true" />Que souhaitez-vous faire ?</h2>
          <CardRow id="home-functions-row" className="home-tool-row" label="outils" footer={<div className="home-feature-links">
            <a href="https://linktr.ee/Yadshlouhim" className="home-feature-link home-feature-link-shop"><span className="home-feature-link-icon"><ShoppingBag aria-hidden="true" /></span><span className="home-feature-link-copy">Boutique<small>En ligne</small></span><ArrowRight className="home-feature-link-arrow" size={17} aria-hidden="true" /></a>
            <Link href="/affiches" prefetch={false} className="home-feature-link home-feature-link-posters"><span className="home-feature-link-icon"><ImageIcon aria-hidden="true" /></span><span className="home-feature-link-copy">Affiches &amp; Visuels<small>IA &amp; Canva</small></span><ArrowRight className="home-feature-link-arrow" size={17} aria-hidden="true" /></Link>
          </div>}>{TOOLS.filter(tool => tool.id !== "posters").map(tool => <FeatureCard key={tool.id} tool={tool} active={active === tool.id} setActive={setActive} onOpen={open} />)}
          </CardRow>
        </section>
        <section id="agents" className="home-agents" aria-labelledby="home-agents-title">
          <div className="home-section-heading"><h2 id="home-agents-title"><Users fill="currentColor" aria-hidden="true" /><span className="home-agents-desktop-title">Vos agents IA</span><span className="home-agents-mobile-title">Vos agents IA spécialisés</span></h2></div>
          <CardRow id="home-agents-row" className="home-agent-row" label="agents">{TOOLS.filter(tool => tool.id !== "shabbat" && tool.id !== "email" && tool.id !== "coming-soon").map(tool => <button key={tool.id} type="button" className={`home-agent home-agent-${tool.id}`} aria-label={`Découvrir ${tool.agent}, ${tool.role}`} aria-haspopup="dialog" onClick={event => open(tool, event.currentTarget)}>
            <span className="home-agent-art"><Image src={tool.portrait} alt="" width={260} height={310} sizes="(max-width: 767px) 100px, (max-width: 1023px) 150px, 240px" /><span className="home-agent-badge"><tool.Icon size={23} aria-hidden="true" /></span></span>
            <span className="home-agent-info"><strong>{tool.agent}</strong><span>{tool.role}</span><ArrowRight size={19} className="home-agent-arrow" aria-hidden="true" /></span>
          </button>)}</CardRow>
        </section>
        <section id="tarifs" className="home-pricing" aria-label="Offre de bienvenue EasyCom AI">
          <h2><Sparkles className="home-sparkles" fill="currentColor" aria-hidden="true" />Essayez EasyCom AI</h2>
          <p className="home-price">9,99 € <span>le premier mois</span></p><p className="home-price-after">Puis 19,99 €/mois sans engagement</p><TrialLink />
        </section>
        <FAQ />
        <section className="home-final" aria-labelledby="home-final-title">
          <Image src={`${MEDIA}synagogue-evening.webp`} fill sizes="(max-width: 767px) 100vw, 1280px" alt="" className="home-final-image" />
          <div className="home-final-content"><h2 id="home-final-title">Vous vous occupez de votre communauté.<br />EasyCom AI s’occupe de votre communication.</h2><div className="home-final-buttons"><TrialLink yellow /><DemoLink /></div></div>
        </section>
      </div>
    </main>
    <footer className="home-container home-footer">
      <div className="home-footer-top"><Brand /><nav aria-label="Navigation de pied de page">{NAV.map(link => <a key={link.href} href={link.href} className={link.desktop ? "home-footer-faq" : ""}>{link.label}</a>)}<Link href="/contact" className="home-footer-contact">Contact</Link></nav></div>
      <div className="home-footer-bottom"><p>© {new Date().getFullYear()} EasyCom AI. Tous droits réservés.</p><nav aria-label="Liens légaux">{LEGAL.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav></div>
    </footer>
    {selected && <PreviewDialog item={selected.item} media={selected.media} trigger={selected.trigger} comingSoon={selected.comingSoon} onClose={() => setSelected(null)} />}
  </div>;
}
