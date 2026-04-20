"use client";

import { useState } from "react";
import { Bell, Search, Info, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  communityName: string;
  userName: string;
  unreadNotifications: number;
}

export function DemoTopBar({ communityName, userName, unreadNotifications }: Props) {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-4 px-6 flex-shrink-0 z-10">
      {/* Barre de recherche fictive */}
      <div className="flex-1 max-w-md">
        <button className="flex items-center gap-2 text-slate-400 cursor-not-allowed">
          <Search className="size-4" />
          <span className="text-sm hidden sm:block">Rechercher…</span>
          <kbd className="hidden sm:inline-flex text-[10px] font-mono bg-slate-100 text-slate-400 rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Badge "Mode Démo" */}
        <span className="hidden sm:flex items-center gap-1.5 bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-200">
          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
          Mode Démo
        </span>

        {/* Notifications fictives */}
        <div className="relative p-2 rounded-lg text-slate-500">
          <Bell className="size-5" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </div>

        {/* User menu fictif */}
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2 bg-slate-50 border border-slate-200">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-blue-700">
            RL
          </div>
          <span className="text-sm font-medium text-slate-700 hidden sm:block">Rabbi Lévi</span>
          <ChevronDown className="size-3.5 text-slate-400" />
        </div>

        {/* Lien vers la page d'accueil (inscription) */}
        <Link href="/">
          <Button size="sm" className="hidden sm:flex">
            Commencer gratuitement →
          </Button>
        </Link>
      </div>
    </header>
  );
}
