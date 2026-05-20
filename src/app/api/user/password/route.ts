import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { password, confirmPassword } = await request.json();

  if (typeof password !== "string" || typeof confirmPassword !== "string") {
    return NextResponse.json({ error: "Mot de passe invalide" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 8 caractères." },
      { status: 400 }
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: "Les deux mots de passe ne correspondent pas." },
      { status: 400 }
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Impossible d'enregistrer le mot de passe pour le moment.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message:
      "Votre mot de passe a été enregistré. Vous pouvez désormais vous connecter avec votre email et ce mot de passe.",
  });
}
