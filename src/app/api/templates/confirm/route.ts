import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Le préremplissage automatique est désactivé pour préserver exactement les textes fournis.",
      code: "EXACT_TEXT_REQUIRED",
    },
    { status: 410 }
  );
}
