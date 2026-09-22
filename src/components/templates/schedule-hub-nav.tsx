import Link from "next/link";
import { CalendarDays, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScheduleHubNav({ active }: { active: "shabbat" | "holidays" }) {
  const items = [
    { key: "shabbat", href: "/dashboard/shabbat-times-auto", label: "Horaires de Chabbat", icon: Clock3 },
    { key: "holidays", href: "/dashboard/jewish-holidays-auto", label: "Horaires des fêtes", icon: CalendarDays },
  ] as const;
  return (
    <nav aria-label="Horaires Chabbat et fêtes" className="rounded-2xl border border-violet-100 bg-white/90 p-2 shadow-sm">
      <p className="px-2 pb-2 text-xs font-black uppercase tracking-[0.14em] text-violet-700">Horaires Chabbat et Fêtes</p>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-center text-sm font-black transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200",
                selected ? "bg-gradient-to-r from-[#7130d8] to-[#421388] text-white shadow-md" : "bg-violet-50 text-violet-800 hover:bg-violet-100",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
