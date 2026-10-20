"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Bell, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileMainMenuDialog } from "./mobile-main-menu-dialog";
import {
  getOfficialDashboardMenuSections,
} from "./dashboard-nav";
import { useDashboardCopy } from "@/lib/i18n/use-dashboard-copy";

interface TopBarProps {
  communityName: string;
  communityType?: string | null;
  userAvatar: string | null | undefined;
  userName: string;
  unreadNotifications: number;
}

export function TopBar({ communityName, communityType, userAvatar, userName, unreadNotifications }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const tr = useDashboardCopy();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isAssistantPage = pathname.startsWith("/dashboard/assistant");
  const menuSections = getOfficialDashboardMenuSections(communityType, tr, locale);

  useEffect(() => {
    function handleOpenMainMenu() {
      if (window.innerWidth < 768) {
        setMobileNavOpen(true);
      }
    }

    window.addEventListener("dashboard:open-main-menu", handleOpenMainMenu as EventListener);
    return () => window.removeEventListener("dashboard:open-main-menu", handleOpenMainMenu as EventListener);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileNavOpen]);

  function getPageTitle() {
    if (pathname.startsWith("/dashboard/assistant")) return tr("Agents intelligents");
    if (pathname.startsWith("/dashboard/automations")) return locale === "he" ? "אוטומציות" : "Automatisations";
    if (pathname.startsWith("/dashboard/communication-ciblee")) return tr("Communication ciblée");
    if (pathname.startsWith("/dashboard/notifications")) return tr("Notifications");
    if (pathname.startsWith("/dashboard/social-networks")) return locale === "he" ? "כל הרשתות שלי" : "Tous mes réseaux";
    if (pathname.startsWith("/dashboard/whatsapp")) return "WhatsApp";
    if (pathname.startsWith("/dashboard/facebook")) return "Facebook";
    if (pathname.startsWith("/dashboard/instagram")) return "Instagram";
    if (pathname.startsWith("/dashboard/email")) return "Email";
    if (pathname.startsWith("/dashboard/google-reviews")) return tr("Avis Google");
    if (pathname.startsWith("/dashboard/daily-assistant")) return locale === "he" ? "הסוכן היומי" : "Assistant du quotidien";
    if (pathname.startsWith("/dashboard/events")) return tr("Mon Agenda");
    if (pathname.startsWith("/dashboard/boutique/communautaire/publier")) return tr("Publier une annonce");
    if (pathname.startsWith("/dashboard/boutique/communautaire")) return tr("Annonces & Ressources");
    if (pathname.startsWith("/dashboard/boutique/calendrier-horaires-tichri")) return tr("Calendrier de Tichri");
    if (pathname.startsWith("/dashboard/boutique/magnets-chabbat")) return tr("Magnets de Chabbat");
    if (pathname.startsWith("/dashboard/boutique/birkat-hachana")) return tr("Birkat Hachana");
    if (pathname.startsWith("/dashboard/boutique/box-tehilim")) return tr("Box de Tehilim");
    if (pathname.startsWith("/dashboard/boutique/anniversaire-juif")) return tr("Anniversaire juif");
    if (pathname.startsWith("/dashboard/boutique/plaquette-teffilin")) return tr("Plaquette Teffilin en 6 étapes");
    if (pathname.startsWith("/dashboard/boutique")) return tr("La Boutique d’EasyCom-AI");
    if (pathname.startsWith("/dashboard/articles")) return tr("Articles");
    if (pathname.startsWith("/dashboard/referencement")) return tr("Referencement");
    if (pathname.startsWith("/dashboard/shabbat-times-auto")) return tr("Horaire de Chabbat");
    if (pathname.startsWith("/dashboard/templates")) return tr("Affiches");
    if (pathname.startsWith("/dashboard/newsletter")) return tr("Newsletter papier Chabbat");
    if (pathname.startsWith("/dashboard/settings")) return tr("Parametres");
    return tr("Accueil");
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <>
      <header
        className={cn(
          "z-[900] h-16 flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6",
          isAssistantPage ? "hidden" : "hidden md:flex",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{getPageTitle()}</p>
        </div>

        <div className="ms-auto flex items-center gap-1.5">
          <Link
            href="/dashboard/notifications"
            className="relative hidden rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <Bell className="size-5" />
            {unreadNotifications > 0 && <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />}
          </Link>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((value) => !value)}
              className="flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-slate-100 sm:px-3"
            >
              <div className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-full bg-slate-200">
                {userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userAvatar} alt={userName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-600">
                    {userName.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <ChevronDown className="size-3.5 text-slate-400" />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-[998]" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute end-0 top-full z-[999] mt-1 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800">{userName}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{communityName}</p>
                  </div>
                  <Link
                    href="/dashboard/settings?section=profile"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User className="size-4" />
                    {tr("Mon profil")}
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings className="size-4" />
                    {tr("Parametres")}
                  </Link>
                  <div className="mt-1 border-t border-slate-100 pt-1">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-start text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="size-4" />
                      {tr("Se deconnecter")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {mobileNavOpen && (
        <MobileMainMenuDialog
          communityName={communityName}
          sections={menuSections}
          onClose={() => setMobileNavOpen(false)}
        />
      )}
    </>
  );
}
