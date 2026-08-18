import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateTorahCourse, torahCourseRequestSchema } from "@/lib/torah/generate-course";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const parsed = torahCourseRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });

    return NextResponse.json({ result: await generateTorahCourse(parsed.data) });
  } catch (error) {
    console.error("[Torah Generate] Erreur:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur lors de la génération du cours" }, { status: 500 });
  }
}
