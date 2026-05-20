"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { OnboardingData } from "../onboarding-wizard";
import { Radio, ChevronRight, ChevronLeft, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  data: OnboardingData;
  updateData: (partial: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

const AVAILABLE_CHANNELS = [
  {
    type: "INSTAGRAM",
    label: "Instagram",
    logo: "/logo/instagram-2-1-logo-svgrepo-com%20(1).svg",
    logoBg: "bg-gradient-to-br from-pink-50 to-orange-50 border border-pink-100",
    description: "Publications + Stories",
    needsHandle: true,
    handlePlaceholder: "@votre_compte",
    publishMode: "API Meta (connexion OAuth)",
  },
  {
    type: "FACEBOOK",
    label: "Facebook",
    logo: "/logo/facebook-3-logo-svgrepo-com.svg",
    logoBg: "bg-blue-50 border border-blue-100",
    description: "Posts sur votre Page",
    needsHandle: true,
    handlePlaceholder: "Nom de votre Page",
    publishMode: "API Meta (connexion OAuth)",
  },
  {
    type: "WHATSAPP",
    label: "WhatsApp",
    logo: "/logo/whatsapp-svgrepo-com.svg",
    logoBg: "bg-green-50 border border-green-100",
    description: "Canal ou groupe broadcast",
    needsHandle: false,
    handlePlaceholder: "",
    publishMode: "Fallback : copier-coller guidé",
  },
  {
    type: "TELEGRAM",
    label: "Telegram",
    logo: "/logo/telegram-svgrepo-com.svg",
    logoBg: "bg-sky-50 border border-sky-100",
    description: "Canal ou groupe",
    needsHandle: true,
    handlePlaceholder: "@votre_canal",
    publishMode: "Bot Telegram (configuration requise)",
  },
  {
    type: "EMAIL",
    label: "Email / Newsletter",
    logo: "/logo/gmail-svgrepo-com.svg",
    logoBg: "bg-slate-50 border border-slate-200",
    description: "Envoi à votre liste",
    needsHandle: false,
    handlePlaceholder: "",
    publishMode: "Via Resend (configuration requise)",
  },
];

export function StepChannels({ data, updateData, onNext, onPrev }: Props) {
  function toggleChannel(type: string) {
    const exists = data.channels.find((c) => c.type === type);
    if (exists) {
      updateData({ channels: data.channels.filter((c) => c.type !== type) });
    } else {
      const channelDef = AVAILABLE_CHANNELS.find((c) => c.type === type)!;
      updateData({
        channels: [...data.channels, { type, name: channelDef.label, handle: "" }],
      });
    }
  }

  function updateHandle(type: string, handle: string) {
    updateData({
      channels: data.channels.map((c) =>
        c.type === type ? { ...c, handle } : c
      ),
    });
  }

  function isSelected(type: string) {
    return data.channels.some((c) => c.type === type);
  }

  function getHandle(type: string) {
    return data.channels.find((c) => c.type === type)?.handle ?? "";
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-4">
        <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-3">
          <Radio className="size-6 text-green-600" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-xl">Vos canaux de diffusion</CardTitle>
          <span className="text-xs font-medium text-slate-400 border border-slate-200 rounded-full px-2 py-0.5">Facultatif</span>
        </div>
        <CardDescription>
          Sélectionnez où vous souhaitez diffuser. Les connexions seront finalisées depuis les Paramètres après l&apos;onboarding.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex gap-2.5">
          <Info className="size-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            Les connexions OAuth (Instagram, Facebook) seront finalisées dans les Paramètres.
            Pour WhatsApp et Email, EasyCom AI prépare le contenu et vous guide pour la diffusion.
          </p>
        </div>

        <div className="space-y-3">
          {AVAILABLE_CHANNELS.map((channel) => {
            const selected = isSelected(channel.type);
            return (
              <div key={channel.type} className="space-y-2">
                <button
                  type="button"
                  onClick={() => toggleChannel(channel.type)}
                  className={cn(
                    "w-full flex items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition-all",
                    selected
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  {/* Logo */}
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 p-2",
                    channel.logoBg
                  )}>
                    <img
                      src={channel.logo}
                      alt={`Logo ${channel.label}`}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-semibold",
                      selected ? "text-blue-700" : "text-slate-800"
                    )}>
                      {channel.label}
                    </p>
                    <p className="text-xs text-slate-500">{channel.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{channel.publishMode}</p>
                  </div>

                  {/* Checkbox */}
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                    selected ? "border-blue-600 bg-blue-600" : "border-slate-300"
                  )}>
                    {selected && <CheckCircle2 className="size-4 text-white" />}
                  </div>
                </button>

                {/* Champ handle si canal sélectionné */}
                {selected && channel.needsHandle && (
                  <div className="ml-14">
                    <input
                      type="text"
                      value={getHandle(channel.type)}
                      onChange={(e) => updateHandle(channel.type, e.target.value)}
                      placeholder={channel.handlePlaceholder}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {data.channels.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-2">
            Vous pouvez passer cette étape et configurer vos canaux plus tard.
          </p>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" size="lg" onClick={onPrev} className="flex-shrink-0">
            <ChevronLeft className="size-4" />
            Retour
          </Button>
          <Button size="lg" className="flex-1" onClick={onNext}>
            Continuer
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
