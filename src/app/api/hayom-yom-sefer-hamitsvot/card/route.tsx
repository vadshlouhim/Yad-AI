/* eslint-disable @next/next/no-img-element -- next/og renders this image server-side. */
import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function excerpt(value: string, limit: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit).trimEnd()}…` : clean;
}

function splitStudy(body: string) {
  const seferMarker = /(?:📜|ðŸ“œ)\s*SEFER HAMITSVOT/i;
  const parts = body.split(seferMarker);
  const hayom = parts[0]?.replace(/(?:📖|ðŸ“–)\s*HAYOM YOM/i, "").trim() ?? "";
  const sefer = parts[1]?.trim() ?? "";
  return {
    hayom: excerpt(hayom.replace(/Lire sur Beth Loubavitch:[\s\S]*/i, ""), 360),
    sefer: excerpt(sefer.replace(/Lire sur Beth Loubavitch:[\s\S]*/i, ""), 330),
  };
}

export async function GET(request: Request) {
  const draftId = new URL(request.url).searchParams.get("draftId");
  if (!draftId) return new Response("Missing draftId", { status: 400 });

  const admin = createAdminClient();
  const { data: draft } = await admin.from("ContentDraft")
    .select("id, communityId, title, body")
    .eq("id", draftId)
    .eq("contentType", "DAILY_CONTENT")
    .maybeSingle();
  if (!draft) return new Response("Not found", { status: 404 });

  const { data: community } = await admin.from("Community")
    .select("name, logoUrl")
    .eq("id", draft.communityId)
    .maybeSingle();
  const { hayom, sefer } = splitStudy(draft.body ?? "");
  const date = draft.title.split("—").at(-1)?.trim() || "Aujourd’hui";
  const communityName = community?.name || "Votre communauté";

  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: 64, color: "white", background: "linear-gradient(135deg, #170638 0%, #4a177f 48%, #0b7775 100%)", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 34 }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 28, fontWeight: 700, opacity: 0.94 }}>
          {community?.logoUrl ? <img alt="" src={community.logoUrl} width="56" height="56" style={{ borderRadius: 28, objectFit: "cover", marginRight: 18, border: "2px solid rgba(255,255,255,.65)" }} /> : <div style={{ width: 56, height: 56, borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center", marginRight: 18, background: "rgba(255,255,255,.18)", border: "2px solid rgba(255,255,255,.5)" }}>✦</div>}
          {communityName}
        </div>
        <div style={{ fontSize: 25, fontWeight: 700, color: "#d5ff57" }}>Études du jour</div>
      </div>
      <div style={{ display: "flex", fontSize: 46, fontWeight: 800, letterSpacing: -1.5 }}>Hayom Yom &amp; Sefer Hamitsvot</div>
      <div style={{ display: "flex", marginTop: 10, fontSize: 25, opacity: 0.8 }}>{date}</div>
      <div style={{ display: "flex", flex: 1, gap: 24, marginTop: 34 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 30, borderRadius: 28, background: "rgba(255,255,255,.13)", border: "1px solid rgba(255,255,255,.22)" }}>
          <div style={{ display: "flex", fontSize: 27, fontWeight: 800, color: "#d5ff57", marginBottom: 16 }}>HAYOM YOM</div>
          <div style={{ display: "flex", fontSize: 22, lineHeight: 1.35 }}>{hayom || "Texte du jour"}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 30, borderRadius: 28, background: "rgba(4,205,190,.16)", border: "1px solid rgba(255,255,255,.22)" }}>
          <div style={{ display: "flex", fontSize: 27, fontWeight: 800, color: "#90f7ec", marginBottom: 16 }}>SEFER HAMITSVOT</div>
          <div style={{ display: "flex", fontSize: 22, lineHeight: 1.35 }}>{sefer || "Texte du jour"}</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, fontSize: 20, opacity: 0.72 }}><span>Le texte intégral est dans la légende</span><span>easycom IA</span></div>
    </div>,
    { width: 1080, height: 1080 }
  );
}
