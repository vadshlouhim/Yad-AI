import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  return NextResponse.json(
    { error: "Les automatisations des fêtes ne sont plus créées ni réactivées. Utilisez la création et la publication manuelles." },
    { status: 410 }
  );
}
