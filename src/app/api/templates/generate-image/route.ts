import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "L'édition générative d'un template est désactivée. Utilisez la composition par calques de texte.",
      code: "IMMUTABLE_TEMPLATE_REQUIRED",
    },
    { status: 410 }
  );
}
