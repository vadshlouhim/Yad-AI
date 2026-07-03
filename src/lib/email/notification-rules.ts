import type { EmailCategory, EmailNotificationRule } from "@/lib/email/ai-settings";

function normalizeRuleName(prompt: string) {
  const text = prompt.trim();
  if (!text) return "Nouvelle regle email";
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

function extractQuotedValue(prompt: string) {
  const quoted = prompt.match(/"([^"]+)"/);
  if (quoted?.[1]) return quoted[1];
  const single = prompt.match(/'([^']+)'/);
  return single?.[1] ?? null;
}

function extractEmail(prompt: string) {
  return prompt.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null;
}

function extractDomain(prompt: string) {
  const direct = prompt.match(/@([A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1];
  if (direct) return direct.toLowerCase();
  const byWord = prompt.match(/domaine\s+([A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1];
  return byWord?.toLowerCase() ?? null;
}

function extractDays(prompt: string) {
  const days = prompt.match(/(\d+)\s*jour/i)?.[1];
  return days ? Number(days) : null;
}

function extractCategories(prompt: string): EmailCategory[] | undefined {
  const lower = prompt.toLowerCase();
  const categories: EmailCategory[] = [];
  if (lower.includes("urgent")) categories.push("urgent");
  if (lower.includes("important") && !lower.includes("non important")) categories.push("important");
  if (lower.includes("non important")) categories.push("non_important");
  return categories.length > 0 ? categories : undefined;
}

export function buildNotificationRuleFromPrompt(userId: string, prompt: string): EmailNotificationRule {
  const lower = prompt.toLowerCase();
  const quotedValue = extractQuotedValue(prompt);
  const senderEmail = extractEmail(prompt);
  const senderDomain = extractDomain(prompt);
  const categories = extractCategories(prompt);
  const subjectKeywords =
    /objet|sujet/.test(lower) && quotedValue
      ? [quotedValue]
      : undefined;
  const bodyKeywords =
    /message|contenu|mot-cl/.test(lower) && quotedValue
      ? [quotedValue]
      : undefined;
  const hasAttachment = /piece jointe|pi[eè]ce jointe|attachment/.test(lower) ? true : undefined;
  const unansweredSinceDays = /sans reponse/.test(lower) ? extractDays(prompt) : null;
  const excludeNewsletters = /newsletter/.test(lower) && (/ne jamais|ignorer|exclure/.test(lower));

  return {
    id: crypto.randomUUID(),
    userId,
    name: normalizeRuleName(prompt),
    status: "ACTIVE",
    conditions: {
      senderEmail,
      senderDomain,
      subjectKeywords,
      bodyKeywords,
      hasAttachment,
      categories,
      unansweredSinceDays,
      excludeNewsletters,
      customPrompt: prompt.trim(),
    },
    notificationChannel: "browser_push",
    createdByAi: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function describeRule(rule: EmailNotificationRule) {
  const c = rule.conditions;
  if (c.senderEmail) return `Expediteur : ${c.senderEmail}`;
  if (c.senderDomain) return `Domaine : ${c.senderDomain}`;
  if (c.subjectKeywords?.length) return `Sujet contient : ${c.subjectKeywords.join(", ")}`;
  if (c.bodyKeywords?.length) return `Message contient : ${c.bodyKeywords.join(", ")}`;
  if (c.hasAttachment) return "Avec piece jointe";
  if (c.unansweredSinceDays) return `Sans reponse depuis ${c.unansweredSinceDays} jours`;
  if (c.categories?.length) return `Niveaux : ${c.categories.join(", ")}`;
  if (c.excludeNewsletters) return "Ignore les newsletters";
  return "Regle personnalisee";
}
