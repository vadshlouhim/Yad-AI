import OpenAI from "openai";
import type { EmailAiClassification, EmailCategory } from "@/lib/email/ai-settings";
import type { GmailFetchedMessage } from "@/lib/email/gmail-fetch";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const MODEL = "google/gemini-2.5-flash";

interface AiClassificationPayload {
  id?: string;
  category?: string;
  urgency_score?: number;
  reason?: string;
  action?: string;
  suggested_reply?: string;
}

function normalizeCategory(value: string | undefined): EmailCategory {
  if (value === "urgent") return "urgent";
  if (value === "important") return "important";
  return "non_important";
}

function fallbackClassification(email: GmailFetchedMessage): EmailAiClassification {
  const text = `${email.subject} ${email.body}`.toLowerCase();
  const urgentHit = /(urgent|ce soir|aujourd'hui|des que possible|immediat|bloquant|important|probleme)/.test(text);
  const importantHit = /(rendez-vous|inscription|reservation|question|information|reponse|demande)/.test(text);
  const category: EmailCategory = urgentHit ? "urgent" : importantHit ? "important" : "non_important";

  return {
    ...email,
    category,
    urgencyScore: category === "urgent" ? 90 : category === "important" ? 60 : 20,
    classificationReason:
      category === "urgent"
        ? "Demande avec urgence ou consequence immediate."
        : category === "important"
          ? "Demande necessitant une reponse utile."
          : "Message informatif ou peu prioritaire.",
    actionRecommended:
      category === "non_important" ? null : category === "urgent" ? "Repondre rapidement." : "Prevoir une reponse.",
    suggestedReply: null,
    classifiedAt: new Date().toISOString(),
  };
}

export async function classifyEmailsWithAi(emails: GmailFetchedMessage[]): Promise<EmailAiClassification[]> {
  if (emails.length === 0) return [];

  const list = emails
    .map(
      (email, index) =>
        `[${index}] id="${email.id}"\nExpediteur: ${email.sender} <${email.senderEmail}>\nObjet: ${email.subject}\nPiece jointe: ${email.hasAttachment ? "oui" : "non"}\nExtrait: ${email.body.slice(0, 600)}`
    )
    .join("\n\n");

  const system = `Tu classes des emails pour EasyCom IA.

Retourne pour CHAQUE email :
- category: urgent | important | non_important
- urgency_score: un entier de 0 a 100
- reason: une raison courte en francais
- action: une action recommandee courte ou null
- suggested_reply: une suggestion tres courte seulement si une reponse semble utile, sinon null

Regles :
- urgent = demande critique, delai court, probleme bloquant, besoin d'action rapide
- important = demande utile qui merite une reponse, sans urgence immediate
- non_important = information, newsletter, message peu prioritaire
- pas de texte hors JSON

Format JSON attendu :
{"classifications":[{"id":"...","category":"urgent|important|non_important","urgency_score":80,"reason":"...","action":"...","suggested_reply":"..."}]}`;

  try {
    const response = await openrouter.chat.completions.create({
      model: MODEL,
      temperature: 0,
      max_tokens: 1800,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Classe ces ${emails.length} emails :\n\n${list}` },
      ],
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content ?? "{}") as {
      classifications?: AiClassificationPayload[];
    };

    const byId = new Map((parsed.classifications ?? []).map((item) => [String(item.id ?? ""), item]));

    return emails.map((email) => {
      const ai = byId.get(email.id);
      if (!ai) return fallbackClassification(email);

      return {
        ...email,
        category: normalizeCategory(ai.category),
        urgencyScore:
          typeof ai.urgency_score === "number" && Number.isFinite(ai.urgency_score)
            ? Math.max(0, Math.min(100, Math.round(ai.urgency_score)))
            : fallbackClassification(email).urgencyScore,
        classificationReason: typeof ai.reason === "string" && ai.reason.trim() ? ai.reason.trim() : fallbackClassification(email).classificationReason,
        actionRecommended: typeof ai.action === "string" && ai.action.trim() ? ai.action.trim() : null,
        suggestedReply: typeof ai.suggested_reply === "string" && ai.suggested_reply.trim() ? ai.suggested_reply.trim() : null,
        classifiedAt: new Date().toISOString(),
      };
    });
  } catch (error) {
    console.error("[Email AI Classify] Fallback local:", error);
    return emails.map(fallbackClassification);
  }
}
