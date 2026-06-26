export const PROGRAM_POSTER_SIZE = 1080;

export interface ProgramEvent {
  name: string;
  date?: string | null;
  time?: string | null;
  location?: string | null;
}

export interface ProgramPosterProps {
  events: ProgramEvent[];
  logoUrl: string | null;
  monthLabel: string;
}

function formatEventDate(date?: string | null): string {
  if (!date) return "";
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" }).format(d);
}

export function ProgramPoster({ events, logoUrl, monthLabel }: ProgramPosterProps) {
  const list = events.slice(0, 10);
  return (
    <div
      style={{
        width: PROGRAM_POSTER_SIZE,
        height: PROGRAM_POSTER_SIZE,
        background: "#fff",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: "relative",
        padding: 64,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ position: "absolute", top: 44, right: 56, fontSize: 44, fontWeight: 700, color: "#0f172a" }}>ב&quot;ה</div>

      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 70, fontWeight: 800, lineHeight: 1.05, color: "#0f172a" }}>Programme</div>
        <div style={{ fontSize: 70, fontWeight: 800, lineHeight: 1.05, color: "#6d28d9" }}>du mois</div>
        <div style={{ marginTop: 10, fontSize: 28, color: "#64748b", textTransform: "capitalize" }}>{monthLabel}</div>
        <div style={{ margin: "20px auto 0", width: 220, height: 8, borderRadius: 9999, background: "#6d28d9" }} />
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, justifyContent: "center" }}>
        {list.length === 0 ? (
          <div style={{ textAlign: "center", fontSize: 28, color: "#94a3b8" }}>Aucun événement ce mois-ci</div>
        ) : (
          list.map((ev, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                borderRadius: 18,
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                padding: "18px 24px",
              }}
            >
              <div
                style={{
                  minWidth: 120,
                  textAlign: "center",
                  borderRadius: 12,
                  background: "#ede9fe",
                  color: "#6d28d9",
                  fontWeight: 800,
                  fontSize: 24,
                  padding: "12px 10px",
                }}
              >
                {formatEventDate(ev.date) || "—"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 30, fontWeight: 700, color: "#0f172a" }}>{ev.name}</div>
                <div style={{ marginTop: 4, fontSize: 22, color: "#64748b" }}>
                  {[ev.time, ev.location].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {logoUrl && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
          <div style={{ width: 96, height: 96, borderRadius: 9999, border: "3px solid #6d28d9", overflow: "hidden", background: "#fff" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        </div>
      )}
    </div>
  );
}
