import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeMobileHomeModules } from "@/lib/mobile-dashboard/modules";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { data } = await supabase.from("profiles").select("mobileDashboardLayout").eq("id", user.id).single();
  return NextResponse.json({ modules: normalizeMobileHomeModules(data?.mobileDashboardLayout) });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { modules?: unknown };
  if (!Array.isArray(body.modules)) return NextResponse.json({ error: "Modules invalides" }, { status: 400 });
  const modules = normalizeMobileHomeModules(body.modules);
  if (modules.length !== new Set(body.modules).size || modules.length !== body.modules.length) {
    return NextResponse.json({ error: "La sélection contient des modules non autorisés, en double, ou dépasse la limite de 8." }, { status: 400 });
  }
  const { error } = await supabase.from("profiles").update({ mobileDashboardLayout: modules, updatedAt: new Date().toISOString() }).eq("id", user.id);
  if (error) return NextResponse.json({ error: "Enregistrement impossible" }, { status: 500 });
  return NextResponse.json({ modules });
}
