import type { WeeklyImageStyleId } from "@/lib/automation/weekly-images";

export const POSTER_SIZE = 1080;

const BORDER_PALETTE = ["#7c3aed", "#2563eb", "#16a34a", "#d97706", "#db2777", "#0891b2"];

export interface WeeklyPosterProps {
  styleId: WeeklyImageStyleId;
  photos: string[];
  logoUrl: string | null;
  communityName?: string;
  subtitle?: string;
}

function Bh() {
  return (
    <div style={{ position: "absolute", top: 44, right: 56, fontSize: 44, fontWeight: 700, color: "#0f172a" }}>
      ב&quot;ה
    </div>
  );
}

function LogoCircle({ logoUrl, color = "#7c3aed" }: { logoUrl: string | null; color?: string }) {
  if (!logoUrl) return null;
  return (
    <div
      style={{
        width: 96,
        height: 96,
        borderRadius: "9999px",
        border: `3px solid ${color}`,
        overflow: "hidden",
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
}

function Photo({ url, border, radius = 18 }: { url: string; border?: string; radius?: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: radius,
        overflow: "hidden",
        background: "#eef2f7",
        border: border ? `3px solid ${border}` : "1px solid #e2e8f0",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </div>
  );
}

function gridColumns(n: number): number {
  if (n <= 1) return 1;
  if (n === 2) return 2;
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  return 4;
}

// ── Fond A : grille classique ────────────────────────────────────────────────
function GridStyle({ photos, logoUrl, subtitle }: { photos: string[]; logoUrl: string | null; subtitle: string }) {
  const cols = gridColumns(photos.length);
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#fff", padding: 64, display: "flex", flexDirection: "column" }}>
      <Bh />
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, color: "#0f172a" }}>Cette semaine</div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, color: "#6d28d9" }}>en images</div>
        <div style={{ marginTop: 12, fontSize: 26, color: "#64748b" }}>{subtitle}</div>
        <div style={{ margin: "20px auto 0", width: 220, height: 8, borderRadius: 9999, background: "#6d28d9" }} />
      </div>
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 22,
          alignContent: "center",
        }}
      >
        {photos.map((p, i) => (
          <div key={i} style={{ aspectRatio: "4 / 3" }}>
            <Photo url={p} />
          </div>
        ))}
      </div>
      {logoUrl && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
          <LogoCircle logoUrl={logoUrl} color="#6d28d9" />
        </div>
      )}
    </div>
  );
}

// ── Fond B : magazine (1 grande + le reste) ──────────────────────────────────
function MagazineStyle({ photos, logoUrl, subtitle }: { photos: string[]; logoUrl: string | null; subtitle: string }) {
  const [main, ...rest] = photos;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#fff", padding: 56, display: "flex", flexDirection: "column" }}>
      <Bh />
      <div style={{ borderRadius: 28, background: "#f5f3ff", padding: "26px 32px", textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 60, fontWeight: 800, color: "#0f172a" }}>Cette semaine en images</div>
        <div style={{ marginTop: 8, fontSize: 24, color: "#64748b" }}>{subtitle}</div>
      </div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridAutoRows: "1fr", gap: 22 }}>
        {main && (
          <div style={{ gridColumn: "span 2", gridRow: "span 2" }}>
            <Photo url={main} border={BORDER_PALETTE[0]} radius={22} />
          </div>
        )}
        {rest.map((p, i) => (
          <div key={i}>
            <Photo url={p} border={BORDER_PALETTE[(i + 1) % BORDER_PALETTE.length]} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 26, display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
        <div style={{ flex: 1, borderRadius: 9999, border: "1px solid #e2e8f0", padding: "16px 24px", textAlign: "center", fontSize: 22, color: "#64748b" }}>
          Une semaine de partage, d&apos;étude et de beaux moments
        </div>
        {logoUrl && <LogoCircle logoUrl={logoUrl} color="#6d28d9" />}
      </div>
    </div>
  );
}

// ── Fond C : moments partagés (cartes en éventail) ───────────────────────────
function ScrapbookStyle({ photos, logoUrl, subtitle }: { photos: string[]; logoUrl: string | null; subtitle: string }) {
  const rotations = [-3, 2, -2, 3, -1, 2.5, -2.5];
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#fff", padding: 56, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Pastilles décoratives */}
      <div style={{ position: "absolute", top: -120, left: -120, width: 360, height: 360, borderRadius: 9999, background: "#ede9fe" }} />
      <div style={{ position: "absolute", top: 120, right: -140, width: 320, height: 320, borderRadius: 9999, background: "#dbeafe" }} />
      <Bh />
      <div style={{ position: "relative", textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 70, fontWeight: 800, lineHeight: 1.05, color: "#0f172a" }}>Cette semaine</div>
        <div style={{ fontSize: 70, fontWeight: 800, lineHeight: 1.05, color: "#2563eb" }}>en images</div>
        <div style={{ marginTop: 10, fontSize: 26, color: "#64748b" }}>{subtitle}</div>
      </div>
      <div style={{ position: "relative", flex: 1, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 28 }}>
        {photos.map((p, i) => (
          <div
            key={i}
            style={{
              transform: `rotate(${rotations[i % rotations.length]}deg)`,
              background: "#fff",
              borderRadius: 22,
              padding: 14,
              boxShadow: "0 18px 40px rgba(15,23,42,0.12)",
              width: photos.length <= 4 ? 320 : 260,
            }}
          >
            <div style={{ aspectRatio: "1 / 1" }}>
              <Photo url={p} border={BORDER_PALETTE[i % BORDER_PALETTE.length]} radius={14} />
            </div>
            <div style={{ textAlign: "center", marginTop: 10, fontSize: 20, color: "#94a3b8" }}>moment partagé</div>
          </div>
        ))}
      </div>
      {logoUrl && (
        <div style={{ position: "relative", display: "flex", justifyContent: "center", marginTop: 16 }}>
          <LogoCircle logoUrl={logoUrl} color="#2563eb" />
        </div>
      )}
    </div>
  );
}

export function WeeklyPoster({ styleId, photos, logoUrl, subtitle }: WeeklyPosterProps) {
  const safeSubtitle = subtitle ?? "Les moments forts de notre communauté";
  const content =
    styleId === "magazine" ? (
      <MagazineStyle photos={photos} logoUrl={logoUrl} subtitle={safeSubtitle} />
    ) : styleId === "scrapbook" ? (
      <ScrapbookStyle photos={photos} logoUrl={logoUrl} subtitle={safeSubtitle} />
    ) : (
      <GridStyle photos={photos} logoUrl={logoUrl} subtitle={safeSubtitle} />
    );

  return (
    <div
      style={{
        width: POSTER_SIZE,
        height: POSTER_SIZE,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        background: "#fff",
      }}
    >
      {content}
    </div>
  );
}
