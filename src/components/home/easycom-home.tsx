"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, BookOpen, Check, FileText, Image as ImageIcon, Menu,
  MessageCircle, Pause, Play, Plus, Settings, Share2, Sparkles, Users,
  Volume2, VolumeX, X,
} from "lucide-react";
import { PUBLIC_TOOLS, type PublicTool } from "@/lib/public-tools";
import { ToolIcon } from "@/components/presentation/tool-visual";
import "./easycom-home.css";

const PreviewDialog = dynamic(() => import("./tool-preview-dialog"), {
  ssr: false,
  loading: () => <div role="status" className="home-loading">Ouverture de l’aperçu…</div>,
});
const MEDIA = "/media/home/";
const TOOLS = [
  { id: "publish", name: "Publier partout", media: "02-dovber-publier-partout", agent: "Dov Ber", role: "Réseaux sociaux", portrait: "/agents/dov-ber-transparent.png", Icon: Share2 },
  { id: "newsletter", name: "Newsletter papier", media: "04-levik-newsletter", agent: "Levik", role: "Newsletter", portrait: "/agents/levik-transparent.png", Icon: FileText },
  { id: "automations", name: "Horaires & automatisations", media: "07-david-automatisations", agent: "David", role: "Automatisations", portrait: "/agents/david-transparent.png", Icon: Settings },
  { id: "posters", name: "Affiches & visuels", media: "03-zalman-affiches", agent: "Zalman", role: "Affiches & visuels", portrait: "/agents/zalman-visuals-transparent.png", Icon: ImageIcon },
  { id: "torah", name: "Cours de Torah", media: "08-shmouel-cours-torah", agent: "Shmouel", role: "Cours de Torah", portrait: "/agents/shmouel-transparent.png", Icon: BookOpen },
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
    <Image src="/easycom-ai-logo.png" width={40} height={40} alt="" />
    <span>EasyCom AI</span>
  </Link>;
}
function TrialLink({ yellow = false }: { yellow?: boolean }) {
  return <Link href="/auth/register" prefetch={false} className={`home-button home-button-primary${yellow ? " home-button-yellow" : ""}`}>
    Essayer gratuitement <ArrowRight size={20} aria-hidden="true" />
  </Link>;
}
function DemoLink() {
  return <a href="#demo" className="home-button home-button-secondary" onClick={() => { document.getElementById("home-demo-play")?.click(); }}>
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
      <h1 id="home-title">Toute la communication de votre synagogue.<br /><span>Au même endroit.</span></h1>
      <p className="home-hero-subtitle">Publiez, créez, automatisez. Vos agents IA s’occupent du reste.</p>
      <div className="home-hero-buttons"><TrialLink /><DemoLink /></div>
    </div>
    <div className="home-hero-art" aria-label="Dov Ber, votre agent de communication">
      <div className="home-hero-halo" />
      <div className="home-hero-portrait"><Image src={`${MEDIA}dov-ber-hero.png`} alt="Dov Ber présente EasyCom AI sur son téléphone" width={899} height={1100} sizes="(max-width: 767px) 44vw, 520px" preload /></div>
      <span className="home-orbit home-orbit-publish"><ToolIcon id="publish" className="size-5" /><span>Publier partout</span></span>
      <span className="home-orbit home-orbit-newsletter"><FileText /><span>Newsletter</span></span>
      <span className="home-orbit home-orbit-posters"><ImageIcon /><span>Affiches</span></span>
      <span className="home-orbit home-orbit-automations"><Settings /><span>Automatisations</span></span>
    </div>
    <ul className="home-reassurance" aria-label="Pour commencer simplement">{["Sans engagement", "Configuration en 5 minutes", "Support en français"].map(text => <li key={text}><span><Check size={12} strokeWidth={3} aria-hidden="true" /></span>{text}</li>)}</ul>
  </section>;
}
function MainDemo({ blocked }: { blocked: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const manualPause = useRef(false);
  const manuallyStarted = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = container.current;
    const player = video.current;
    if (!element || !player) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || blocked) { player.pause(); return; }
      if (!manualPause.current && (!reduced.matches || manuallyStarted.current)) {
        if (!player.getAttribute("src")) player.src = `${MEDIA}easycom-demo-master.mp4`;
        void player.play().catch(() => {});
      }
    }, { threshold: 0.35 });
    observer.observe(element);
    function onVisibility() { if (document.hidden) player?.pause(); }
    function onMotionChange() { if (reduced.matches && !manuallyStarted.current) player?.pause(); }
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", onMotionChange);
    if (blocked) player.pause();
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); reduced.removeEventListener("change", onMotionChange); };
  }, [blocked]);
  function togglePlayback() {
    const player = video.current;
    if (!player) return;
    if (player.paused) {
      manuallyStarted.current = true;
      manualPause.current = false;
      if (!player.getAttribute("src")) player.src = `${MEDIA}easycom-demo-master.mp4`;
      if (player.ended) player.currentTime = 0;
      void player.play().catch(() => setFailed(true));
    } else { manualPause.current = true; player.pause(); }
  }
  return <section id="demo" className="home-container home-demo" aria-label="Démonstration d’EasyCom AI">
    <div ref={container} className={`home-demo-frame${started ? " home-demo-started" : ""}`}>
      <picture className="home-demo-poster"><source media="(max-width: 767px)" srcSet={`${MEDIA}demo-mobile.webp`} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${MEDIA}demo-desktop.webp`} alt="Découvrez EasyCom AI en action" width={1600} height={670} loading="lazy" />
      </picture>
      <video ref={video} className="home-master-video" muted={muted} playsInline preload="none" controls={started} poster={`${MEDIA}easycom-demo-master.webp`} aria-label="Vidéo de démonstration générale d’EasyCom AI" onPlay={() => { setPlaying(true); setStarted(true); setFailed(false); }} onPause={() => setPlaying(false)} onEnded={() => { manualPause.current = true; setPlaying(false); }} onError={() => { setFailed(true); setPlaying(false); }} />
      {!playing && <button id="home-demo-play" type="button" className="home-demo-play" aria-label={started ? "Reprendre la démonstration" : "Lire la démonstration d’EasyCom AI"} onClick={togglePlayback}><Play fill="currentColor" aria-hidden="true" /></button>}
      {playing && <button id="home-demo-play" type="button" className="home-demo-pause" aria-label="Mettre la démonstration en pause" onClick={togglePlayback}><Pause size={17} aria-hidden="true" /></button>}
      <span className="home-demo-label">Démonstration — données fictives</span>
      {started && <button type="button" className="home-demo-sound" aria-label={muted ? "Activer le son" : "Couper le son"} onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>}
      {failed && <p role="status" className="home-video-error">La vidéo est indisponible. Réessayez avec le bouton lecture.</p>}
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
      if (!video.getAttribute("src")) video.src = `${MEDIA}${tool.media}.mp4`;
      void video.play().catch(() => {});
    } else { video.pause(); if (video.readyState > 0) video.currentTime = 0; }
    return () => video.pause();
  }, [active, tool.media]);
  function start() { if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setActive(tool.id); }
  return <button ref={button} type="button" className={`home-tool home-tool-${tool.id}${active && ready ? " home-tool-previewing" : ""}`} aria-label={`Découvrir ${tool.name}`} aria-haspopup="dialog" onMouseEnter={start} onMouseLeave={() => { if (active) setActive(null); }} onFocus={start} onBlur={() => { if (active) setActive(null); }} onClick={event => { setActive(null); onOpen(tool, event.currentTarget); }}>
    <video ref={player} muted playsInline preload="none" loop poster={`${MEDIA}${tool.media}.webp`} aria-hidden="true" tabIndex={-1} onPlaying={() => setReady(true)} onTimeUpdate={() => { const video = player.current; if (video && video.currentTime >= 8) video.currentTime = 0; }} />
    <span className="home-tool-shade" />
    <span className="home-tool-content">{tool.id === "automations" ? <Settings className="home-tool-icon" aria-hidden="true" /> : <ToolIcon id={tool.id} className="home-tool-icon" />}<span className="home-tool-title">{tool.name}</span></span>
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
export function EasyComHome() {
  const [active, setActive] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ item: PublicTool; trigger: HTMLElement } | null>(null);
  function open(tool: HomeTool, trigger: HTMLElement) {
    const original = PUBLIC_TOOLS.find(item => item.id === tool.id);
    if (!original) return;
    setActive(null);
    setSelected({ item: { ...original, name: tool.name, agent: tool.agent, portrait: tool.portrait }, trigger });
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
          <div className="home-tool-row">{TOOLS.map(tool => <FeatureCard key={tool.id} tool={tool} active={active === tool.id} setActive={setActive} onOpen={open} />)}</div>
        </section>
        <section id="agents" className="home-agents" aria-labelledby="home-agents-title">
          <div className="home-section-heading"><h2 id="home-agents-title"><Users fill="currentColor" aria-hidden="true" /><span className="home-agents-desktop-title">Vos agents IA</span><span className="home-agents-mobile-title">Vos agents IA spécialisés</span></h2></div>
          <div className="home-agent-row">{TOOLS.map(tool => <button key={tool.id} type="button" className={`home-agent home-agent-${tool.id}`} aria-label={`Découvrir ${tool.agent}, ${tool.role}`} aria-haspopup="dialog" onClick={event => open(tool, event.currentTarget)}>
            <span className="home-agent-art"><Image src={tool.id === "publish" ? `${MEDIA}dov-ber-hero.png` : tool.portrait} alt="" width={260} height={310} sizes="(max-width: 767px) 100px, (max-width: 1023px) 150px, 240px" /><span className="home-agent-badge"><tool.Icon size={23} aria-hidden="true" /></span></span>
            <span className="home-agent-info"><strong>{tool.agent}</strong><span>{tool.role}</span><ArrowRight size={19} className="home-agent-arrow" aria-hidden="true" /></span>
          </button>)}</div>
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
    {selected && <PreviewDialog item={selected.item} trigger={selected.trigger} onClose={() => setSelected(null)} />}
  </div>;
}
