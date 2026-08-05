import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";
import { detectFileType, MAX_FILE_SIZE, STORAGE_BUCKET } from "@/lib/community-library";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

async function getAuthorizedCommunity(userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", userId).single();
  return profile?.communityId ?? null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const communityId = await getAuthorizedCommunity(user.id);
  if (!communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const admin = createAdminClient();
  const { data: community } = await admin.from("Community").select("plan, name").eq("id", communityId).single();
  if (!community || community.plan === "FREE_TRIAL") {
    return NextResponse.json({ error: "Abonnement requis pour soumettre une ressource" }, { status: 402 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    return handleFileUpload(request, communityId, admin);
  }

  const body = await request.json() as Record<string, unknown>;
  const { action } = body;

  if (action === "suggest-metadata") {
    return handleSuggestMetadata(body);
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

async function handleFileUpload(request: Request, communityId: string, admin: ReturnType<typeof createAdminClient>) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Fichier trop lourd, maximum 15 Mo" }, { status: 400 });
  }

  const fileType = detectFileType(file.type);
  if (!fileType) {
    return NextResponse.json({ error: "Type de fichier non autorisé. Acceptés : PDF, image, texte" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? fileType;
  const storagePath = `${communityId}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let { error: uploadError } = await admin.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });

  if (uploadError?.message.toLowerCase().includes("bucket")) {
    await admin.storage.createBucket(STORAGE_BUCKET, { public: true });
    const retry = await admin.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    uploadError = retry.error;
  }

  if (uploadError) {
    return NextResponse.json({ error: "Erreur lors de l'envoi du fichier" }, { status: 500 });
  }

  const { data: publicUrlData } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

  return NextResponse.json({
    fileUrl: publicUrlData.publicUrl,
    fileType,
    fileSize: file.size,
    originalName: file.name,
    mimeType: file.type,
  });
}

async function handleSuggestMetadata(body: Record<string, unknown>) {
  const { fileName, fileType, mimeType, communityName } = body;

  const prompt = `Tu es un assistant spécialisé dans les ressources communautaires juives francophones.
À partir des informations suivantes, suggère des métadonnées pertinentes pour classer cette ressource dans la bibliothèque communautaire.

Fichier : ${String(fileName ?? "")}
Type : ${String(fileType ?? "")} (${String(mimeType ?? "")})
Communauté : ${String(communityName ?? "communauté juive")}

Réponds UNIQUEMENT avec un objet JSON valide (sans backticks, sans markdown) avec ces champs :
{
  "title": "titre court et descriptif",
  "description": "description 1-2 phrases, max 200 caractères",
  "category": "Cours" | "Affiche" | "Lettre" | "Texte WhatsApp",
  "theme": "Chabbat" | "Fêtes juives" | "Torah" | "Jeunesse" | "Famille" | "Communauté" | "Campagne de dons" | "Événements",
  "keywords": ["mot1", "mot2", "mot3"]
}

Choisis la catégorie et le thème les plus pertinents. Les keywords doivent être en français.`;

  try {
    const completion = await openrouter.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const metadata = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json({ metadata });
  } catch {
    return NextResponse.json({
      metadata: {
        title: "",
        description: "",
        category: "Cours",
        theme: "Torah",
        keywords: [],
      },
    });
  }
}
