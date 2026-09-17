import Image from "next/image";
import {
  BookOpen,
  CalendarDays,
  FileText,
  Image as ImageIcon,
  Library,
  Mail,
  MessageSquare,
  Sparkles,
  Star,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { MODULE_COLORS } from "./platform-style";

export const CHANNEL_VISUALS = [
  {
    name: "Facebook",
    logo: "/logo/facebook-3-logo-svgrepo-com.svg",
    surface: "bg-gradient-to-r from-[#315ecb] to-[#4b7fe8]",
  },
  {
    name: "Instagram",
    logo: "/logo/instagram-2-1-logo-svgrepo-com (1).svg",
    surface: "bg-gradient-to-r from-[#d92d7c] to-[#f06b45]",
  },
  {
    name: "WhatsApp",
    logo: "/logo/whatsapp-svgrepo-com.svg",
    surface: "bg-gradient-to-r from-[#15966a] to-[#2bbf87]",
  },
] as const;
export function toolSurface(id: string, category: string) {
  return (
    MODULE_COLORS[id as keyof typeof MODULE_COLORS] ??
    (category === "Automatiser"
      ? MODULE_COLORS.automations
      : category === "Organiser"
        ? MODULE_COLORS.contacts
        : category === "Diffuser"
          ? MODULE_COLORS.publish
          : "bg-[#7130d8]")
  );
}
export function ToolIcon({
  id,
  className = "size-8",
}: {
  id: string;
  className?: string;
}) {
  if (id === "publish")
    return (
      <span
        className="flex items-center justify-center gap-2"
        aria-hidden="true"
      >
        {CHANNEL_VISUALS.map((channel) => (
          <Image
            key={channel.name}
            src={channel.logo}
            alt=""
            width={28}
            height={28}
            className={`${className} object-contain brightness-0 invert`}
          />
        ))}
      </span>
    );
  const Icon =
    id === "newsletter"
      ? FileText
      : id === "posters" || id === "weekly-images"
        ? ImageIcon
        : id === "contacts" || id === "targeted"
          ? Users
          : id === "torah" || id === "daily-study"
            ? BookOpen
            : id === "reviews"
              ? Star
              : id === "email"
                ? Mail
                : id === "whatsapp"
                  ? MessageSquare
                  : id === "calendar" || id === "events"
                    ? CalendarDays
                    : id === "creations" || id === "library"
                      ? Library
                      : id === "daily-assistant"
                        ? Target
                        : id === "assistant"
                          ? Sparkles
                          : Zap;
  return <Icon className={className} aria-hidden="true" />;
}
export function AgentTile({
  name,
  role,
  portrait,
}: {
  name: string;
  role: string;
  portrait: string;
}) {
  return (
    <div className="relative h-[142px] w-[167px] shrink-0 overflow-hidden rounded-[1.6rem] border border-white/20 bg-white/[0.055] shadow-[0_12px_22px_rgba(17,2,58,0.2)]">
      <span
        className={`absolute right-3 top-3 flex size-9 items-center justify-center rounded-full ${name === "David" ? "bg-[#7851d8]" : "bg-[#ed3676]"}`}
      >
        <Sparkles className="size-[18px]" aria-hidden="true" />
      </span>
      <Image
        src={portrait}
        width={94}
        height={137}
        sizes="94px"
        alt=""
        className="absolute -bottom-1 left-0 h-[137px] w-[94px] object-contain object-bottom drop-shadow-[0_10px_12px_rgba(8,1,30,0.28)]"
      />
      <span className="absolute bottom-3 left-[88px] right-2">
        <span className="block text-base font-black leading-tight">{name}</span>
        <span className="mt-1 block text-[11px] font-semibold leading-tight text-white/90">
          {role}
        </span>
      </span>
    </div>
  );
}
