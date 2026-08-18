"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Download,
  FileImage,
  FileText,
  Filter,
  Library,
  Lock,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import {
  RESOURCE_CATEGORIES,
  RESOURCE_THEMES,
  URGENCY_LABELS,
  isPaidPlan,
  type CommunityResource,
  type ResourceCategory,
  type ResourceRequest,
  type ResourceTheme,
} from "@/lib/community-library";

interface Props {
  community: {
    id: string;
    name: string;
    logoUrl: string | null;
    plan: string | null;
    tone: string | null;
  };
  initialResources: CommunityResource[];
  initialTotal: number;
  initialRequests: ResourceRequest[];
}

type Tab = "explorer" | "demandes";

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="size-5 text-red-500" />,
  image: <FileImage className="size-5 text-blue-500" />,
  text: <FileText className="size-5 text-slate-500" />,
};

function PaywallBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
      <Lock className="size-3" /> Abonne
    </span>
  );
}

function ResourceCard({
  resource,
  isPaid,
  onAdapt,
}: {
  resource: CommunityResource;
  isPaid: boolean;
  onAdapt: (r: CommunityResource) => void;
}) {
  const icon = FILE_ICONS[resource.fileType] ?? <FileText className="size-5 text-slate-400" />;

  function handleDownload() {
    if (!isPaid) return;
    window.open(resource.fileUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <article className="group flex min-w-0 flex-col gap-3 overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-[0_12px_32px_-24px_rgba(66,19,136,0.3)] transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_20px_42px_-24px_rgba(66,19,136,0.34)] sm:rounded-3xl">
      {resource.isFeatured ? (
        <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200/70">
          <Sparkles className="size-3.5" /> A la une
        </div>
      ) : null}

      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f5ecff_0%,#eef7ff_100%)] ring-1 ring-violet-100 transition-transform group-hover:scale-105">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-black text-slate-900">{resource.title}</h3>
          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">{resource.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-800">
          {resource.category}
        </span>
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {resource.theme}
        </span>
      </div>

      {resource.keywords.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {resource.keywords.slice(0, 4).map((kw) => (
            <span key={kw} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
              {kw}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row">
        {isPaid ? (
          <>
            <button
              onClick={handleDownload}
              className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#421388] px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#35106f]"
            >
              <Download className="size-3.5" /> Telecharger
            </button>
            <button
              onClick={() => onAdapt(resource)}
              className="flex min-w-0 items-center justify-center gap-1.5 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs font-semibold text-violet-800 transition-colors hover:bg-violet-100"
            >
              <WandSparkles className="size-3.5" /> Adapter
            </button>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
            <span className="text-xs text-slate-500">Acces reserve</span>
            <PaywallBadge />
          </div>
        )}
      </div>
    </article>
  );
}

function RequestCard({ req }: { req: ResourceRequest }) {
  return (
    <article className="flex items-start gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_-24px_rgba(66,19,136,0.32)]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f3ebff_0%,#fff2f8_100%)]">
        <MessageCircle className="size-4 text-violet-700" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-black text-slate-900">{req.title}</h3>
          <span className="rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-800">
            {req.category}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{req.description}</p>
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
          <span>{req.theme}</span>
          <span className={req.urgency === "high" ? "font-semibold text-rose-500" : ""}>{URGENCY_LABELS[req.urgency]}</span>
          {req.aiRefined ? (
            <span className="flex items-center gap-0.5 text-violet-700">
              <Sparkles className="size-3" /> Affine par IA
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function AdaptModal({
  resource,
  onClose,
}: {
  resource: CommunityResource;
  onClose: () => void;
}) {
  const [action, setAction] = useState<"generate-whatsapp-text" | "adapt-description">("generate-whatsapp-text");
  const [instructions, setInstructions] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleAdapt() {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/community-library/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, resourceId: resource.id, instructions }),
      });
      const data = await res.json();
      if (action === "generate-whatsapp-text") {
        setResult(data.text ?? "");
      } else {
        const adapted = data.adapted ?? {};
        setResult(`${adapted.title ?? ""}\n\n${adapted.description ?? ""}`);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-[1.8rem] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900">Adapter avec l&apos;IA</h2>
          <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-slate-100">
            <X className="size-5 text-slate-400" />
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500">L&apos;IA cree une nouvelle version. L&apos;original n&apos;est jamais modifie.</p>
        <div className="mt-2 rounded-2xl bg-[linear-gradient(180deg,#faf7ff_0%,#f7f5fc_100%)] px-3 py-2 text-xs font-medium text-slate-700">
          {resource.title}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setAction("generate-whatsapp-text")}
            className={`flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-semibold transition-colors ${action === "generate-whatsapp-text" ? "bg-[#421388] text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            <MessageCircle className="size-3.5" /> Texte WhatsApp
          </button>
          <button
            onClick={() => setAction("adapt-description")}
            className={`flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-semibold transition-colors ${action === "adapt-description" ? "bg-[#421388] text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            <WandSparkles className="size-3.5" /> Adapter la fiche
          </button>
        </div>

        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Instructions specifiques : ton, public cible, langue..."
          rows={2}
          className="mt-3 w-full resize-none rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />

        <button
          onClick={handleAdapt}
          disabled={loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#421388] py-2.5 text-sm font-semibold text-white hover:bg-[#35106f] disabled:opacity-60"
        >
          <Sparkles className="size-4" />
          {loading ? "Generation en cours..." : "Generer"}
        </button>

        {result ? (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Resultat</span>
              <button onClick={handleCopy} className="text-violet-700 hover:underline">
                {copied ? "Copie !" : "Copier"}
              </button>
            </div>
            <div className="mt-1 whitespace-pre-wrap rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-800">{result}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CommunityLibraryClient({ community, initialResources, initialTotal, initialRequests }: Props) {
  const isPaid = isPaidPlan(community.plan);
  const [tab, setTab] = useState<Tab>("explorer");
  const [resources, setResources] = useState<CommunityResource[]>(initialResources);
  const [total, setTotal] = useState(initialTotal);
  const [requests] = useState<ResourceRequest[]>(initialRequests);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ResourceCategory | "">("");
  const [activeTheme, setActiveTheme] = useState<ResourceTheme | "">("");
  const [loading, setLoading] = useState(false);
  const [adaptTarget, setAdaptTarget] = useState<CommunityResource | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResources = useCallback(async (q: string, category: string, theme: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      if (theme) params.set("theme", theme);
      const res = await fetch(`/api/community-library/resources?${params.toString()}`);
      const json = await res.json();
      setResources(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleSearch(value: string) {
    setQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchResources(value, activeCategory, activeTheme), 350);
  }

  function handleCategoryFilter(cat: ResourceCategory | "") {
    setActiveCategory(cat);
    fetchResources(query, cat, activeTheme);
  }

  function handleThemeFilter(th: ResourceTheme | "") {
    setActiveTheme(th);
    fetchResources(query, activeCategory, th);
  }

  function clearFilters() {
    setQuery("");
    setActiveCategory("");
    setActiveTheme("");
    fetchResources("", "", "");
  }

  const hasFilters = query || activeCategory || activeTheme;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 overflow-x-hidden px-4 py-4 sm:space-y-6 sm:px-6 sm:py-6">
      <section className="overflow-hidden rounded-[2rem] bg-[#421388] text-white shadow-[0_24px_58px_-34px_rgba(66,19,136,0.7)]">
        <div className="relative px-5 pb-12 pt-5 sm:px-9 sm:py-8">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute left-1/3 top-10 h-28 w-28 rounded-full bg-fuchsia-300/10 blur-3xl" />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
              <Library className="size-3.5" /> Bibliotheque partagee
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Bibliotheque partagee</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/85 sm:text-base">
              Explorez les contenus de la communaute, telechargez-les et adaptez-les facilement.
            </p>
          </div>
        </div>
        <div className="h-7 bg-[#fffaf4]" style={{ borderTopLeftRadius: "44% 100%", borderTopRightRadius: "44% 100%" }} />
      </section>

      <div className="flex flex-wrap justify-center gap-3">
        {isPaid ? (
          <>
            <Link
              href="/dashboard/community-library/submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#421388] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200/70 transition hover:-translate-y-0.5 hover:bg-[#35106f]"
            >
              <Plus className="size-4" /> Soumettre une ressource
            </Link>
            <Link
              href="/dashboard/community-library/request"
              className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-50"
            >
              <MessageCircle className="size-4" /> Faire une demande
            </Link>
          </>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800">
            <Lock className="size-4" /> Abonnez-vous pour contribuer
          </div>
        )}
      </div>

      <div className="flex gap-1.5 rounded-[1.7rem] border border-slate-200 bg-white p-1.5 shadow-[0_16px_34px_-28px_rgba(66,19,136,0.35)]">
        {([
          ["explorer", "Explorer"],
          ["demandes", "Demandes"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-[1.1rem] py-3 text-sm font-black transition ${tab === key ? "bg-[#421388] text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-violet-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "explorer" ? (
        <>
          <div className="mx-auto w-full max-w-5xl space-y-3 rounded-[1.85rem] border border-slate-200 bg-white p-4 shadow-[0_20px_48px_-35px_rgba(66,19,136,0.34)] sm:rounded-3xl sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-violet-700" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Ex. cours sur la paracha, affiche de fete, texte WhatsApp..."
                  aria-label="Rechercher dans la bibliotheque"
                  className="w-full rounded-[1.25rem] border border-slate-200 bg-[linear-gradient(180deg,#fbfbfe_0%,#f6f4fb_100%)] py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </div>
              <button
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
                className={`flex items-center justify-center gap-1.5 rounded-[1.25rem] border px-4 py-3 text-sm font-black transition ${showFilters ? "border-[#421388] bg-[#421388] text-white shadow-md shadow-violet-200" : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700"}`}
              >
                <Filter className="size-4" /> Filtres
                {activeCategory || activeTheme ? <span className="ml-1 size-2 rounded-full bg-white" /> : null}
              </button>
            </div>

            {showFilters ? (
              <div className="space-y-5 rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#fffdf8_0%,#faf8ff_100%)] p-4">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-violet-800">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleCategoryFilter("")}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${!activeCategory ? "bg-[#421388] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"}`}
                    >
                      Toutes
                    </button>
                    {RESOURCE_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleCategoryFilter(cat)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${activeCategory === cat ? "border-[#421388] bg-[#421388] text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-violet-700">Themes</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleThemeFilter("")}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${!activeTheme ? "bg-[#421388] text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"}`}
                    >
                      Tous
                    </button>
                    {RESOURCE_THEMES.map((th) => (
                      <button
                        key={th}
                        onClick={() => handleThemeFilter(th)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${activeTheme === th ? "border-[#421388] bg-[#421388] text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"}`}
                      >
                        {th}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {hasFilters ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>
                  {total} resultat{total !== 1 ? "s" : ""}
                </span>
                <button onClick={clearFilters} className="flex items-center gap-1 text-violet-700 hover:underline">
                  <X className="size-3.5" /> Effacer les filtres
                </button>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-52 animate-pulse rounded-[1.7rem] bg-[linear-gradient(180deg,#f3effb_0%,#fbf9ff_100%)]" />
              ))}
            </div>
          ) : resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[1.9rem] border border-dashed border-slate-300 bg-white px-5 py-16 text-center shadow-[0_18px_40px_-34px_rgba(66,19,136,0.34)]">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-[linear-gradient(135deg,#f2eaff_0%,#eff8ff_100%)]">
                <Library className="size-6 text-violet-600" />
              </div>
              <h2 className="mt-4 text-lg font-black text-slate-800">{hasFilters ? "Aucune ressource trouvee" : "La bibliotheque est vide"}</h2>
              <p className="mt-1 max-w-xs text-sm text-slate-500">
                {hasFilters ? "Essayez d'autres mots-cles ou filtres." : "Soyez le premier a contribuer en soumettant une ressource !"}
              </p>
              {!hasFilters && isPaid ? (
                <Link
                  href="/dashboard/community-library/submit"
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#421388] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#35106f]"
                >
                  <Plus className="size-4" /> Soumettre
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((res) => (
                <ResourceCard key={res.id} resource={res} isPaid={isPaid} onAdapt={setAdaptTarget} />
              ))}
            </div>
          )}

          {!isPaid && resources.length > 0 ? (
            <div className="rounded-[1.6rem] border border-amber-200 bg-[linear-gradient(180deg,#fff9ec_0%,#fff5db_100%)] px-5 py-4 text-center">
              <p className="text-sm font-semibold text-amber-800">
                <Lock className="mb-0.5 mr-1 inline size-4" />
                Abonnez-vous pour telecharger et adapter les ressources.
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-[1.7rem] border border-slate-200 bg-white px-4 py-3 shadow-[0_14px_30px_-24px_rgba(66,19,136,0.3)]">
            <h2 className="text-base font-black text-slate-900">Demandes de ressources ({requests.length})</h2>
            {isPaid ? (
              <Link
                href="/dashboard/community-library/request"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-[#421388] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#35106f]"
              >
                <Plus className="size-4" /> Faire une demande
              </Link>
            ) : null}
          </div>

          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[1.8rem] border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-[0_18px_40px_-34px_rgba(66,19,136,0.34)]">
              <MessageCircle className="size-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-500">Aucune demande ouverte</p>
              {isPaid ? (
                <Link href="/dashboard/community-library/request" className="mt-3 text-sm text-violet-700 hover:underline">
                  Faire la premiere demande
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <RequestCard key={req.id} req={req} />
              ))}
            </div>
          )}
        </div>
      )}

      {adaptTarget ? <AdaptModal resource={adaptTarget} onClose={() => setAdaptTarget(null)} /> : null}
    </div>
  );
}
