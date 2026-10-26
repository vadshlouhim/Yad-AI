"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, BookOpen, CalendarClock, Check, FileText, Image as ImageIcon, Menu,
  MessageCircle, Play, Plus, Printer, Settings, Share2, Sparkles, Users,
  X, ShoppingBag, Clock, Mail, Volume2, VolumeX,
} from "lucide-react";
import { PUBLIC_TOOLS, getLocalizedPublicTool, type PublicTool } from "@/lib/public-tools";
import { ToolIcon } from "@/components/presentation/tool-visual";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { HOME_AGENT_IMAGES, MAIN_VIDEO_URL, homeVideoSource } from "./home-media";
import { isFeatureEnabled } from "@/lib/features-by-locale";
import { SUBSCRIPTION_MONTHLY_CENTS, SUBSCRIPTION_YEARLY_CENTS } from "@/lib/billing/subscription-policy";
import "./easycom-home.css";

const PreviewDialog = dynamic(() => import("./home-video-dialog"), {
  ssr: false,
  loading: () => <div role="status" className="home-loading">…</div>,
});
const MEDIA = "/media/home/";
const TOOLS = [
  { id: "publish", name: "Publier partout", badge: "En un clic", media: "02-dovber-publier-partout", agent: "Dov Ber", role: "Réseaux sociaux", portrait: HOME_AGENT_IMAGES.dovBer, Icon: Share2 },
  { id: "newsletter", name: "Newsletter", badge: "Imprimable pour Chabbat", media: "04-levik-newsletter", agent: "Levik", role: "Newsletter", portrait: HOME_AGENT_IMAGES.levik, Icon: FileText },
  { id: "shabbat", name: "Horaires Chabbat et Fêtes", badge: "Publié automatiquement", media: "05-david-horaires-chabbat", agent: "David", role: "Horaires Chabbat et Fêtes", portrait: HOME_AGENT_IMAGES.david, Icon: Clock },
  { id: "automations", name: "Hayom Yom & anniversaire juif", badge: "Intelligent", media: "06-david-anniversaires", agent: "David", role: "Automatisations", portrait: HOME_AGENT_IMAGES.david, Icon: Settings },
  { id: "reminders", name: "Automatisations J-10 J-5", badge: "Rappels intelligents", media: "07-david-automatisations", agent: "David", role: "Rappels d’événements", portrait: HOME_AGENT_IMAGES.david, Icon: CalendarClock },
  { id: "contacts", name: "CRM 2.0", badge: "Connecter Unisoft", media: "06-david-anniversaires", agent: "Israël", role: "CRM communautaire", portrait: "/agents/israel-transparent.png", Icon: Users },
  { id: "posters", name: "Affiches & Visuels", badge: "IA & Canva", media: "03-zalman-affiches", agent: "Zalman", role: "Affiches & Visuels", portrait: HOME_AGENT_IMAGES.zalman, Icon: ImageIcon },
  { id: "torah", name: "Cours de Torah", badge: "Sources fiables", media: "08-shmouel-cours-torah", agent: "Shmouel", role: "Cours de Torah", portrait: HOME_AGENT_IMAGES.shmouel, Icon: BookOpen },
  { id: "email", name: "Email & Avis Google", badge: "Surveillé et intelligent", media: "10-email-avis-google", agent: "Levik", role: "Email & Avis Google", portrait: HOME_AGENT_IMAGES.levik, Icon: Mail },
  { id: "coming-soon", name: "À venir…", badge: "Bientôt disponible", media: "11-upcoming", agent: "EasyCom AI", role: "Nouveauté", portrait: HOME_AGENT_IMAGES.dovBer, Icon: Sparkles },
] as const;

const HE_COMING_HOME_MODULES = [
  { key: "posters", Icon: ImageIcon },
  { key: "shabbatTimes", Icon: Clock },
  { key: "birthdays", Icon: CalendarClock },
  { key: "automations", Icon: Settings },
  { key: "crm", Icon: Users },
  { key: "torah", Icon: BookOpen },
  { key: "emailReviews", Icon: Mail },
  { key: "shop", Icon: ShoppingBag },
] as const;
type HomeTool = (typeof TOOLS)[number];
const NAV = [
  { href: "#fonctionnalites", label: "features" },
  { href: "/fonctionnalites-a-venir", label: "comingSoon", nextLink: true },
  { href: "#demo", label: "demo" },
  { href: "#tarifs", label: "pricingShort" },
  { href: "#faq", label: "faq", desktop: true },
];
const LEGAL = [
  { href: "/privacy", label: "privacy" },
  { href: "/legal/terms", label: "terms" },
  { href: "/cookies", label: "cookies" },
  { href: "/data-deletion", label: "deleteData" },
];

function Brand() {
  const t = useTranslations("nav");
  return <Link href="/" className="home-brand" aria-label={t("brandHome")}>
    <Image src={`${MEDIA}easycom-brand-mark.webp`} width={40} height={30} alt="" />
    <span>EasyCom AI</span>
  </Link>;
}
function TrialLink({ yellow = false }: { yellow?: boolean }) {
  const t = useTranslations("nav");
  return <Link href="/auth/register" prefetch={false} className={`home-button home-button-primary${yellow ? " home-button-yellow" : ""}`}>
    {t("tryFree")} <ArrowRight className="rtl-mirror" size={20} aria-hidden="true" />
  </Link>;
}
function HomeToolIcon({ id }: { id: string }) {
  if (id !== "publish") return <ToolIcon id={id} className="home-tool-icon" />;
  return <span className="home-publish-icons" aria-hidden="true">
    {["facebook", "instagram", "whatsapp"].map(channel => <Image key={channel} src={`${MEDIA}${channel}-white.svg`} width={32} height={32} className="home-tool-icon" alt="" />)}
  </span>;
}
function DemoLink() {
  const t = useTranslations("home");
  return <a href="https://www.youtube.com/@EasyComAI-Synagogue-BethHabad" target="_blank" rel="noopener noreferrer" className="home-button home-button-secondary">
    <span className="home-play-small"><Play size={14} fill="currentColor" aria-hidden="true" /></span>{t("watchVideo")}
  </a>;
}
function HomeHeader() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");
  const locale = useLocale();
  const visibleNav = NAV.filter(link => locale !== "he" || !["features", "comingSoon"].includes(link.label));
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
      <nav className="home-desktop-nav" aria-label={t("primaryLabel")}>{visibleNav.map(link => link.nextLink ? <Link key={link.href} href={link.href}>{t(link.label)}</Link> : <a key={link.href} href={link.href}>{t(link.label)}</a>)}</nav>
      <div className="home-header-actions">
        <span className="home-language-desktop"><LanguageSwitcher compact /></span>
        <Link href="/auth/login" prefetch={false} className="home-login">{t("loginShort")}</Link>
        <Link href="/auth/register" prefetch={false} className="home-header-trial">{t("tryFree")}</Link>
        <button ref={toggle} type="button" className="home-menu-toggle" aria-label={open ? t("closeMenu") : t("openMenu")} aria-expanded={open} aria-controls="home-mobile-menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>
    </div>
    {open && <>
      <button type="button" className="home-menu-backdrop" aria-label={t("closeMenu")} onClick={() => { setOpen(false); toggle.current?.focus(); }} />
      <nav ref={mobileMenu} id="home-mobile-menu" className="home-mobile-menu" aria-label={t("mobileLabel")}>
        <div className="home-language-mobile"><LanguageSwitcher /></div>
        {visibleNav.filter(link => locale === "he" || !link.desktop).map(link => link.nextLink ? <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{t(link.label)}<ArrowRight className="rtl-mirror" size={16} /></Link> : <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{t(link.label)}<ArrowRight className="rtl-mirror" size={16} /></a>)}
        <Link href="/contact" onClick={() => setOpen(false)}>{t("contact")}<ArrowRight className="rtl-mirror" size={16} /></Link>
        <Link href="/auth/login" prefetch={false} onClick={() => setOpen(false)}>{t("loginShort")}<ArrowRight className="rtl-mirror" size={16} /></Link>
      </nav>
    </>}
  </header>;
}
function Hero() {
  const t = useTranslations("home");
  const locale = useLocale();
  return <section className="home-container home-hero" aria-labelledby="home-title">
    <div className="home-hero-copy">
      <h1 id="home-title"><span className="home-title-line">{t("title1")}</span>{" "}<span className="home-title-line">{t("title2")}</span>{" "}<span className="home-title-accent">{t("title3")}</span></h1>
      <p className="home-hero-subtitle">{t("subtitle")}</p>
      <div className="home-hero-buttons"><TrialLink /><DemoLink /></div>
      {locale !== "he" ? <Link href="/fonctionnalites-a-venir" className="home-coming-soon-chip">
        <span className="home-coming-soon-rocket" aria-hidden="true">🚀</span>
        <span>{t("discoverUpcoming")}</span>
        <small>NEW</small>
      </Link> : null}
    </div>
    <div className="home-hero-art" aria-label={t("agentAria")}>
      <div className="home-hero-portrait"><Image src={HOME_AGENT_IMAGES.dovBer} alt={t("agentAria")} width={899} height={1100} sizes="(max-width: 767px) 44vw, 520px" preload /></div>
      {locale === "he" ? <>
        <span className="home-orbit home-orbit-publish"><FileText /><span>{t("heBadgeNewsletter")}</span></span>
        <span className="home-orbit home-orbit-newsletter"><Printer /><span>{t("heBadgePdf")}</span></span>
        <span className="home-orbit home-orbit-posters"><Sparkles /><span>{t("heBadgeAi")}</span></span>
      </> : <>
        <span className="home-orbit home-orbit-publish"><ToolIcon id="publish" className="size-5" /><span>Publier partout</span></span>
        <span className="home-orbit home-orbit-newsletter"><FileText /><span>Newsletter</span></span>
        <span className="home-orbit home-orbit-posters"><ImageIcon /><span>Affiches</span></span>
        <span className="home-orbit home-orbit-automations"><Settings /><span>Automatisations</span></span>
      </>}
    </div>
    <ul className="home-reassurance" aria-label={t("simpleStart")}>{["reassurance1", "reassurance2", "reassurance3"].map(key => <li key={key}><span><Check size={12} strokeWidth={3} aria-hidden="true" /></span>{t(key)}</li>)}</ul>
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
  const t = useTranslations("home");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(true);
  const [src, setSrc] = useState<string>();

  // Start the presentation (about 40 MB) only once the page itself has loaded, so it
  // no longer competes with the page code for bandwidth on slow connections.
  useEffect(() => {
    let timer = 0;
    const start = () => { timer = window.setTimeout(() => setSrc(MAIN_VIDEO_URL), 300); };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      window.clearTimeout(timer);
    };
  }, []);

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
      className={`home-master-video${loaded && !failed ? " home-master-video-ready" : ""}${failed ? " home-master-video-failed" : ""}`}
      src={src}
      autoPlay
      muted={muted}
      controls
      playsInline
      preload="metadata"
      aria-label={t("presentationVideo")}
      onCanPlay={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
    {loaded && !failed ? (
      <button type="button" className="home-video-sound" onClick={toggleSound} aria-pressed={!muted} aria-label={muted ? t("enableSound") : t("disableSound")}>
        {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
        <span>{muted ? t("enableSound") : t("soundOn")}</span>
      </button>
    ) : null}
    {!loaded ? <span role="status" className="home-video-loading">{t("videoLoading")}</span> : null}
    {failed ? <p role="status" className="home-video-error">{t("videoUnavailable")}</p> : null}
  </>;
}

function MainDemo({ blocked }: { blocked: boolean }) {
  const t = useTranslations("home");
  const locale = useLocale();
  const container = useRef<HTMLElement>(null);
  const setContainerRef = (node: HTMLElement | null) => {
    container.current = node;
  };
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

  if (locale === "he") {
    return <section id="demo" className="home-container home-demo" aria-label={t("demoAria")}>
      <div ref={setContainerRef} className="home-demo-frame home-demo-hebrew">
        <div className="home-demo-hebrew-copy">
          <h2>{t("heDemoAvailableTitle")}</h2>
          <div className="home-demo-hebrew-grid">
            {["newsletter", "publish"].map((key) => <Link key={key} href="/auth/register" prefetch={false} className="home-demo-hebrew-card" aria-label={t(`heDemoCards.${key}.aria`)}>
              <span className="home-demo-hebrew-kicker">{t(`heDemoCards.${key}.label`)}</span>
              <strong>{t(`heDemoCards.${key}.title`)}</strong>
              <p>{t(`heDemoCards.${key}.description`)}</p>
              <span className="home-demo-hebrew-cta">{t("heDemoCta")}</span>
            </Link>)}
          </div>
        </div>
      </div>
    </section>;
  }

  return <section id="demo" className="home-container home-demo" aria-label={t("demoAria")}>
    <div ref={setContainerRef} className="home-demo-frame">
      <picture className="home-demo-poster"><source media="(max-width: 767px)" srcSet={`${MEDIA}demo-mobile.webp`} />
        <img src={`${MEDIA}demo-desktop.webp`} alt={t("demoImageAlt")} width={1600} height={670} loading="lazy" />
      </picture>
      {active ? <MainVideoPlayer /> : null}
      {!active ? <button id="home-demo-play" type="button" className="home-demo-play" aria-label={t("playDemo")} onClick={() => setManuallyStarted(true)}><Play fill="currentColor" aria-hidden="true" /></button> : null}
      <span className="home-demo-label">{t("demoLabel")}</span>
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
  const locale = useLocale();
  function start() { if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setActive(tool.id); }
  return <button ref={button} type="button" className={`home-tool home-tool-${tool.id}${active && ready ? " home-tool-previewing" : ""}`} aria-label={`${locale === "he" ? "לגלות" : "Découvrir"} ${tool.name}, ${tool.badge}`} aria-haspopup="dialog" onMouseEnter={start} onMouseLeave={() => { if (active) setActive(null); }} onFocus={start} onBlur={() => { if (active) setActive(null); }} onClick={event => { setActive(null); onOpen(tool, event.currentTarget); }}>
    <video ref={player} muted playsInline preload="none" loop poster={tool.id === "coming-soon" ? undefined : `${MEDIA}${tool.media}.webp`} aria-hidden="true" tabIndex={-1} onPlaying={() => setReady(true)} onTimeUpdate={() => { const video = player.current; if (video && video.currentTime >= 8) video.currentTime = 0; }} />
    <span className="home-tool-shade" />
    <span className="home-tool-content">
      <span className="home-tool-icon-shell">{["automations", "reminders", "contacts", "shabbat", "email", "coming-soon"].includes(tool.id) ? <tool.Icon className="home-tool-icon" aria-hidden="true" /> : <HomeToolIcon id={tool.id} />}</span>
      <span className="home-tool-title"><span className="home-tool-name">{tool.name}</span><small className="home-tool-badge">{tool.badge}</small></span>
    </span>
    <span className="home-card-arrow"><ArrowRight size={20} aria-hidden="true" /></span>
  </button>;
}
function FAQ() {
  const t = useTranslations("home");
  const [expanded, setExpanded] = useState<number | null>(null);
  const items = [
    { q: t("faq1q"), a: t("faq1a") },
    { q: t("faq2q"), a: t("faq2a") },
  ];
  return <section id="faq" className="home-faq" aria-labelledby="home-faq-title">
    <h2 id="home-faq-title"><MessageCircle fill="currentColor" aria-hidden="true" />{t("faqTitle")}</h2>
    <div className="home-faq-items">{items.map((item, index) => <div key={item.q} className="home-faq-item">
      <h3><button type="button" aria-expanded={expanded === index} aria-controls={`home-faq-answer-${index}`} onClick={() => setExpanded(expanded === index ? null : index)}>{item.q}<Plus className={expanded === index ? "home-faq-open" : ""} size={19} aria-hidden="true" /></button></h3>
      <div id={`home-faq-answer-${index}`} hidden={expanded !== index}><p>{item.a}</p></div>
    </div>)}</div>
  </section>;
}
function CardRow({ id, className, label, children, footer }: { id: string; className: string; label: string; children: ReactNode; footer?: ReactNode }) {
  const locale = useLocale();
  const row = useRef<HTMLDivElement>(null);
  const [navigation, setNavigation] = useState({ overflow: false, previous: false, next: false });
  useEffect(() => {
    const element = row.current;
    if (!element) return;
    function update() {
      if (!element) return;
      const remaining = element.scrollWidth - element.clientWidth;
      const position = Math.abs(element.scrollLeft);
      setNavigation({ overflow: remaining > 1, previous: position > 1, next: position < remaining - 1 });
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
    element.scrollBy({ left: direction * element.clientWidth * (locale === "he" ? -1 : 1), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }
  return <>
    <div ref={row} id={id} className={className}>{children}</div>
    {(footer || navigation.overflow) && <div className={footer ? "home-row-footer" : undefined}>
    {footer}
    {navigation.overflow && <nav className="home-row-navigation" aria-label={locale === "he" ? `גלילה בין ${label}` : `Défilement des ${label}`}>
      <button type="button" aria-controls={id} aria-label={locale === "he" ? `${label} קודמים` : `Voir les ${label} précédents`} disabled={!navigation.previous} onClick={() => advance(-1)}><ArrowLeft className="rtl-mirror" size={20} aria-hidden="true" /></button>
      <button type="button" aria-controls={id} aria-label={locale === "he" ? `${label} הבאים` : `Voir les ${label} suivants`} disabled={!navigation.next} onClick={() => advance(1)}><ArrowRight className="rtl-mirror" size={20} aria-hidden="true" /></button>
    </nav>}
    </div>}
  </>;
}

function HebrewComingSoonGrid() {
  const t = useTranslations("home");
  return <section id="fonctionnalites" className="home-features home-coming-features" aria-labelledby="home-features-title">
    <div className="home-coming-heading">
      <h2 id="home-features-title"><Sparkles className="home-sparkles" fill="currentColor" aria-hidden="true" />{t("heComingTitle")}</h2>
      <p>{t("heComingSubtitle")}</p>
    </div>
    <div className="home-coming-grid">
      {HE_COMING_HOME_MODULES.map(({ key, Icon }) => <button key={key} type="button" disabled className="home-coming-card" aria-disabled="true">
        <div className="home-coming-card-top"><Icon aria-hidden="true" /><span>{t("comingSoonBadge")}</span></div>
        <strong>{t(`heComingModules.${key}.name`)}</strong>
        <p>{t(`heComingModules.${key}.description`)}</p>
      </button>)}
    </div>
  </section>;
}

function WhatsAppBubble() {
  const t = useTranslations("home");
  const message = encodeURIComponent(t("whatsappMessage"));
  return <a
    href={`https://wa.me/33668508898?text=${message}`}
    className="home-whatsapp-bubble"
    target="_blank"
    rel="noopener noreferrer"
    aria-label={t("whatsapp")}
  >
    <span className="home-whatsapp-bubble-icon"><Image src={`${MEDIA}whatsapp-white.svg`} width={30} height={30} alt="" /></span>
    <span className="home-whatsapp-bubble-label"><strong>{t("question")}</strong><small>{t("chat")}</small></span>
  </a>;
}

export function EasyComHome() {
  const locale = useLocale();
  const t = useTranslations("home");
  const nav = useTranslations("nav");
  const footer = useTranslations("footer");
  const hebrewToolCopy = locale === "he" ? t.raw("toolCopy") as Record<string, { name: string; badge: string; role: string }> : {};
  const tools = TOOLS.map((tool) => locale === "he" ? { ...tool, ...hebrewToolCopy[tool.id] } : tool) as HomeTool[];
  const priceLocale = locale === "he" ? "he-IL" : locale === "en" ? "en-US" : "fr-FR";
  const formatPrice = (value: number) => new Intl.NumberFormat(priceLocale, { style: "currency", currency: "EUR", minimumFractionDigits: value === 0 ? 0 : 2 }).format(value);
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
    const base = PUBLIC_TOOLS.find(item => item.id === tool.id) ?? (comingSoon ? PUBLIC_TOOLS[0] : undefined);
    const original = base ? getLocalizedPublicTool(base, locale) : undefined;
    if (!original) return;
    setActive(null);
    setSelected({ item: { ...original, id: tool.id, name: tool.name, agent: tool.agent, portrait: tool.portrait }, media: tool.media, trigger, comingSoon });
  }
  return <div className="easycom-home">
    <a className="home-skip" href="#home-main">{t("skip")}</a>
    <HomeHeader />
    <main id="home-main">
      <Hero />
      <MainDemo blocked={selected !== null} />
      <div className="home-container home-body">
        {locale === "he" ? <HebrewComingSoonGrid /> : isFeatureEnabled(locale, "publish") ? <section id="fonctionnalites" className="home-features" aria-labelledby="home-features-title">
          <h2 id="home-features-title"><Sparkles className="home-sparkles" fill="currentColor" aria-hidden="true" />{t("whatToDo")}</h2>
          <CardRow id="home-functions-row" className="home-tool-row" label={t("toolsLabel")} footer={<div className="home-feature-links">
            <a href="https://linktr.ee/Yadshlouhim" className="home-feature-link home-feature-link-shop"><span className="home-feature-link-icon"><ShoppingBag aria-hidden="true" /></span><span className="home-feature-link-copy">{t("shop")}<small>{t("online")}</small></span><ArrowRight className="rtl-mirror home-feature-link-arrow" size={17} aria-hidden="true" /></a>
            <Link href="/affiches" prefetch={false} className="home-feature-link home-feature-link-posters"><span className="home-feature-link-icon"><ImageIcon aria-hidden="true" /></span><span className="home-feature-link-copy">{t("posters")}<small>IA &amp; Canva</small></span><ArrowRight className="rtl-mirror home-feature-link-arrow" size={17} aria-hidden="true" /></Link>
          </div>}>{tools.filter(tool => tool.id !== "posters").map(tool => <FeatureCard key={tool.id} tool={tool} active={active === tool.id} setActive={setActive} onOpen={open} />)}
          </CardRow>
        </section> : null}
        <section id="agents" className="home-agents" aria-labelledby="home-agents-title">
          <div className="home-section-heading"><h2 id="home-agents-title"><Users fill="currentColor" aria-hidden="true" /><span className="home-agents-desktop-title">{t("agents")}</span><span className="home-agents-mobile-title">{t("specializedAgents")}</span></h2>{locale === "he" ? <p className="home-agents-availability">{t("agentsAvailability")}</p> : null}</div>
          <CardRow id="home-agents-row" className="home-agent-row" label={t("agents")}>{tools.filter(tool => !["shabbat", "email", "coming-soon", "reminders", "contacts"].includes(tool.id)).map(tool => {
            const enabled = locale !== "he" || tool.id === "newsletter" || tool.id === "publish";
            return <button key={tool.id} type="button" className={`home-agent home-agent-${tool.id}${enabled ? " home-agent-enabled" : " home-agent-disabled"}`} aria-label={`${tool.agent}, ${tool.role}`} aria-haspopup={enabled ? "dialog" : undefined} aria-disabled={!enabled || undefined} disabled={!enabled} onClick={enabled ? event => open(tool, event.currentTarget) : undefined}>
            <span className="home-agent-art"><Image src={tool.portrait} alt="" width={260} height={310} sizes="(max-width: 767px) 100px, (max-width: 1023px) 150px, 240px" /><span className="home-agent-badge"><tool.Icon size={23} aria-hidden="true" /></span>{locale === "he" ? <span className="home-agent-status">{t(enabled ? "availableNow" : "comingSoonBadge")}</span> : null}</span>
            <span className="home-agent-info"><strong>{tool.agent}</strong><span>{tool.role}</span><ArrowRight size={19} className="rtl-mirror home-agent-arrow" aria-hidden="true" /></span>
          </button>})}</CardRow>
        </section>
        <section id="tarifs" className="home-pricing" aria-label={t("specialOffer")}>
          <h2><Sparkles className="home-sparkles" fill="currentColor" aria-hidden="true" />{t("tryTitle")}</h2>
          <p className="home-price-special">{t("specialOffer")}</p>
          <p className="home-price-gift">{locale === "he" ? t("trialFeatures") : t("gift")}</p>
          <p className="home-price"><bdi dir="ltr">{formatPrice(0)}</bdi> <span>{t("trialPriceCaption")}</span></p>
          <p className="home-price-after">{t("thenPrice", { price: formatPrice(SUBSCRIPTION_MONTHLY_CENTS / 100), yearly: formatPrice(SUBSCRIPTION_YEARLY_CENTS / 100) })}</p>
          <p className="home-price-after">{t("cardRequired")}</p>
          <TrialLink />
        </section>
        <FAQ />
        <section className="home-final" aria-labelledby="home-final-title">
          <Image src={`${MEDIA}synagogue-evening.webp`} fill sizes="(max-width: 767px) 100vw, 1280px" alt="" className="home-final-image" />
          <div className="home-final-content"><h2 id="home-final-title">{t("final1")}<br />{t("final2")}</h2><div className="home-final-buttons"><TrialLink yellow /><DemoLink /></div></div>
        </section>
      </div>
    </main>
    <footer className="home-container home-footer">
      <div className="home-footer-top"><Brand /><nav aria-label={t("footerNav")}>{NAV.map(link => {
        if (locale === "he" && ["features", "comingSoon"].includes(link.label)) return <a key={link.label} href="#fonctionnalites" className={link.desktop ? "home-footer-faq" : ""}>{nav(link.label)}</a>;
        return link.nextLink ? <Link key={link.href} href={link.href} className={link.desktop ? "home-footer-faq" : ""}>{nav(link.label)}</Link> : <a key={link.href} href={link.href} className={link.desktop ? "home-footer-faq" : ""}>{nav(link.label)}</a>;
      })}<Link href="/contact" className="home-footer-contact">{nav("contact")}</Link></nav></div>
      <div className="home-footer-bottom"><p>{footer("rights", { year: new Date().getFullYear() })}</p><nav aria-label={t("legalLinks")}>{LEGAL.map(link => <Link key={link.href} href={link.href}>{footer(link.label)}</Link>)}</nav></div>
    </footer>
    <WhatsAppBubble />
    {selected && <PreviewDialog item={selected.item} media={selected.media} trigger={selected.trigger} comingSoon={selected.comingSoon} onClose={() => setSelected(null)} />}
  </div>;
}
