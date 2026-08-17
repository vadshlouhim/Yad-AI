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
  CATEGORY_COLORS,
  THEME_COLORS,
  isPaidPlan,
  type CommunityResource,
  type ResourceCategory,
  type ResourceTheme,
  type ResourceRequest,
  URGENCY_LABELS,
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
      <Lock className="size-3" /> Abonné
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

  const handleDownload = () => {
    if (!isPaid) return;
    window.open(resource.fileUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <article className="group flex min-w-0 flex-col gap-3 overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-white via-white to-cyan-50/50 p-4 shadow-[0_12px_35px_-24px_rgba(76,29,149,0.45)] transition duration-300 hover:-translate-y-1 hover:border-teal-200 hover:shadow-[0_20px_45px_-24px_rgba(13,148,136,0.45)]">
      {resource.isFeatured && (
        <div className="flex items-center gap-1 text-xs font-semibold text-amber-600">
          <Sparkles className="size-3.5" /> À la une
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-50 to-cyan-50 ring-1 ring-violet-100 transition-transform group-hover:scale-105">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-slate-900">{resource.title}</h3>
          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-slate-500">{resource.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[resource.category]}`}>
          {resource.category}
        </span>
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${THEME_COLORS[resource.theme]}`}>
          {resource.theme}
        </span>
      </div>

      {resource.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {resource.keywords.slice(0, 4).map((kw) => (
            <span key={kw} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
              {kw}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row">
        {isPaid ? (
          <>
            <button
              onClick={handleDownload}
              className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-teal-700 hover:to-cyan-700"
            >
              <Download className="size-3.5" /> Télécharger
            </button>
            <button
              onClick={() => onAdapt(resource)}
              className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 transition-colors hover:bg-violet-100"
            >
              <WandSparkles className="size-3.5" /> Adapter
            </button>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5">
            <span className="text-xs text-slate-500">Accès réservé</span>
            <PaywallBadge />
          </div>
        )}
      </div>
    </article>
  );
}

function RequestCard({ req }: { req: ResourceRequest }) {
  return (
    <article className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50">
        <MessageCircle className="size-4 text-teal-700" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">{req.title}</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[req.category]}`}>
            {req.category}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{req.description}</p>
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
          <span>{req.theme}</span>
          <span className={req.urgency === "high" ? "font-semibold text-rose-500" : ""}>
            {URGENCY_LABELS[req.urgency]}
          </span>
          {req.aiRefined && (
            <span className="flex items-center gap-0.5 text-teal-600">
              <Sparkles className="size-3" /> Affiné par IA
            </span>
          )}
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

  const handleAdapt = async () => {
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
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Adapter avec l&apos;IA</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100">
            <X className="size-5 text-slate-400" />
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          L&apos;IA crée une nouvelle version — l&apos;original n&apos;est jamais modifié.
        </p>
        <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
          {resource.title}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setAction("generate-whatsapp-text")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${action === "generate-whatsapp-text" ? "bg-teal-700 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            <MessageCircle className="size-3.5" /> Texte WhatsApp
          </button>
          <button
            onClick={() => setAction("adapt-description")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${action === "adapt-description" ? "bg-teal-700 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            <WandSparkles className="size-3.5" /> Adapter la fiche
          </button>
        </div>

        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Instructions spécifiques (optionnel) : ton, public cible, langue..."
          rows={2}
          className="mt-3 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />

        <button
          onClick={handleAdapt}
          disabled={loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          <Sparkles className="size-4" />
          {loading ? "Génération en cours…" : "Générer"}
        </button>

        {result && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Résultat</span>
              <button onClick={handleCopy} className="text-teal-700 hover:underline">
                {copied ? "Copié !" : "Copier"}
              </button>
            </div>
            <div className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-800">
              {result}
            </div>
          </div>
        )}
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

  const handleSearch = (value: string) => {
    setQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchResources(value, activeCategory, activeTheme), 350);
  };

  const handleCategoryFilter = (cat: ResourceCategory | "") => {
    setActiveCategory(cat);
    fetchResources(query, cat, activeTheme);
  };

  const handleThemeFilter = (th: ResourceTheme | "") => {
    setActiveTheme(th);
    fetchResources(query, activeCategory, th);
  };

  const clearFilters = () => {
    setQuery("");
    setActiveCategory("");
    setActiveTheme("");
    fetchResources("", "", "");
  };

  const hasFilters = query || activeCategory || activeTheme;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 overflow-x-hidden px-4 py-6 sm:px-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(125deg,#0f766e_0%,#0891b2_45%,#7c3aed_100%)] px-6 py-7 text-white shadow-[0_28px_70px_-35px_rgba(76,29,149,0.7)] sm:px-9 sm:py-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-fuchsia-300/25 blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 h-52 w-52 rounded-full bg-cyan-200/25 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
            <Library className="size-3.5" /> Bibliothèque partagée
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Bibliothèque partagée</h1>
        </div>
      </section>

      <div className="flex flex-wrap justify-center gap-3">
        {isPaid ? (
          <>
            <Link
              href="/dashboard/community-library/submit"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-200/70 transition hover:-translate-y-0.5 hover:from-violet-700 hover:to-fuchsia-700"
            >
              <Plus className="size-4" /> Soumettre une ressource
            </Link>
            <Link
              href="/dashboard/community-library/request"
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-bold text-cyan-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-100"
            >
              <MessageCircle className="size-4" /> Faire une demande
            </Link>
          </>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-teal-100 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-800">
            <Lock className="size-4" /> Abonnez-vous pour contribuer
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-violet-100 bg-gradient-to-r from-cyan-50 via-white to-violet-50 p-1.5 shadow-sm">
        {([["explorer", "Explorer"], ["demandes", "Demandes"]] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${tab === key ? "bg-gradient-to-r from-teal-600 to-violet-600 text-white shadow-md" : "text-slate-500 hover:bg-white/70 hover:text-violet-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "explorer" && (
        <>
          {/* Barre de recherche + filtres */}
          <div className="mx-auto w-full max-w-5xl space-y-3 rounded-3xl border border-violet-100 bg-[linear-gradient(135deg,rgba(236,254,255,0.9),rgba(255,255,255,0.95),rgba(245,243,255,0.9))] p-4 shadow-[0_20px_55px_-35px_rgba(76,29,149,0.45)] sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-teal-600" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Ex. cours sur la paracha, affiche de fête, texte WhatsApp…"
                  aria-label="Rechercher dans la bibliothèque"
                  className="w-full rounded-2xl border border-teal-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>
              <button
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
                className={`flex items-center justify-center gap-1.5 rounded-2xl border px-4 py-3 text-sm font-bold transition ${showFilters ? "border-violet-200 bg-violet-600 text-white shadow-md shadow-violet-200" : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-700"}`}
              >
                <Filter className="size-4" /> Filtres
                {(activeCategory || activeTheme) && (
                  <span className="ml-1 size-2 rounded-full bg-teal-500" />
                )}
              </button>
            </div>

            {showFilters && (
              <div className="space-y-5 rounded-2xl border border-white bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Catégories</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleCategoryFilter("")}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${!activeCategory ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700"}`}
                    >
                      Toutes
                    </button>
                    {RESOURCE_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => handleCategoryFilter(cat)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${activeCategory === cat ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-sm" : `border border-white shadow-sm hover:-translate-y-0.5 ${CATEGORY_COLORS[cat]}`}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-violet-700">Thèmes</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleThemeFilter("")}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${!activeTheme ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-700"}`}
                    >
                      Tous
                    </button>
                    {RESOURCE_THEMES.map((th) => (
                      <button
                        key={th}
                        onClick={() => handleThemeFilter(th)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${activeTheme === th ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-sm" : `border border-white shadow-sm hover:-translate-y-0.5 ${THEME_COLORS[th]}`}`}
                      >
                        {th}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {hasFilters && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>{total} résultat{total !== 1 ? "s" : ""}</span>
                <button onClick={clearFilters} className="flex items-center gap-1 text-teal-700 hover:underline">
                  <X className="size-3.5" /> Effacer les filtres
                </button>
              </div>
            )}
          </div>

          {/* Grille de ressources */}
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-52 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50">
                <Library className="size-6 text-teal-500" />
              </div>
              <h2 className="mt-4 text-base font-bold text-slate-800">
                {hasFilters ? "Aucune ressource trouvée" : "La bibliothèque est vide"}
              </h2>
              <p className="mt-1 max-w-xs text-sm text-slate-500">
                {hasFilters
                  ? "Essayez d'autres mots-clés ou filtres."
                  : "Soyez le premier à contribuer en soumettant une ressource !"}
              </p>
              {!hasFilters && isPaid && (
                <Link
                  href="/dashboard/community-library/submit"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800"
                >
                  <Plus className="size-4" /> Soumettre
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resources.map((res) => (
                <ResourceCard
                  key={res.id}
                  resource={res}
                  isPaid={isPaid}
                  onAdapt={setAdaptTarget}
                />
              ))}
            </div>
          )}

          {!isPaid && resources.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-center">
              <p className="text-sm font-semibold text-amber-800">
                <Lock className="mb-0.5 mr-1 inline size-4" />
                Abonnez-vous pour télécharger et adapter les ressources.
              </p>
            </div>
          )}
        </>
      )}

      {tab === "demandes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Demandes de ressources ({requests.length})
            </h2>
            {isPaid && (
              <Link
                href="/dashboard/community-library/request"
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800"
              >
                <Plus className="size-4" /> Faire une demande
              </Link>
            )}
          </div>

          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
              <MessageCircle className="size-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-500">Aucune demande ouverte</p>
              {isPaid && (
                <Link
                  href="/dashboard/community-library/request"
                  className="mt-3 text-sm text-teal-700 hover:underline"
                >
                  Faire la première demande
                </Link>
              )}
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

      {adaptTarget && (
        <AdaptModal
          resource={adaptTarget}
          onClose={() => setAdaptTarget(null)}
        />
      )}
    </div>
  );
}
