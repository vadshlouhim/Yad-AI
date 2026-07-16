import { sendPushToUser } from "@/lib/notifications/push";
import { describeRule } from "@/lib/email/notification-rules";
import type { EmailAiClassification, EmailNotificationRule } from "@/lib/email/ai-settings";
import type { createAdminClient } from "@/lib/supabase/admin";
import { createNotificationOnce } from "@/lib/notifications/create-once";

type Admin = ReturnType<typeof createAdminClient>;

export function ruleMatchesEmail(rule: EmailNotificationRule, email: EmailAiClassification, now: Date) {
  const c = rule.conditions;
  const hasPositiveCondition = Boolean(
    c.senderEmail ||
      c.senderDomain ||
      c.subjectKeywords?.length ||
      c.bodyKeywords?.length ||
      c.hasAttachment ||
      c.categories?.length ||
      c.unansweredSinceDays
  );

  if (!hasPositiveCondition) return false;

  if (c.senderEmail && email.senderEmail.toLowerCase() !== c.senderEmail.toLowerCase()) return false;
  if (c.senderDomain && !email.senderEmail.toLowerCase().endsWith(`@${c.senderDomain.toLowerCase()}`)) return false;
  if (c.subjectKeywords?.length && !c.subjectKeywords.some((keyword) => email.subject.toLowerCase().includes(keyword.toLowerCase()))) return false;
  if (c.bodyKeywords?.length && !c.bodyKeywords.some((keyword) => email.body.toLowerCase().includes(keyword.toLowerCase()))) return false;
  if (c.hasAttachment && !email.hasAttachment) return false;
  if (c.categories?.length && !c.categories.includes(email.category)) return false;
  if (c.excludeNewsletters) {
    const text = `${email.senderEmail} ${email.subject} ${email.body}`.toLowerCase();
    if (/newsletter|unsubscribe|se desabonner|no-reply|noreply/.test(text)) return false;
  }
  if (c.unansweredSinceDays) {
    const ageMs = now.getTime() - email.timestamp;
    if (ageMs < c.unansweredSinceDays * 24 * 60 * 60 * 1000) return false;
  }
  return true;
}

export async function notifyForMatchingEmailRules({
  admin,
  userId,
  communityId,
  classifications,
  rules,
  now,
  source,
}: {
  admin: Admin;
  userId: string;
  communityId: string;
  classifications: EmailAiClassification[];
  rules: EmailNotificationRule[];
  now: Date;
  source: "manual" | "page_open" | "daily_16h";
}) {
  const matched = classifications.filter((email) => rules.some((rule) => ruleMatchesEmail(rule, email, now)));

  if (matched.length === 0) {
    return { matchedCount: 0, notificationSent: false };
  }

  const top = matched[0];
  const matchingRule = rules.find((rule) => ruleMatchesEmail(rule, top, now));

  const created = await createNotificationOnce(admin, {
    userId,
    communityId,
    type: "SYSTEM",
    title: "Alerte Email IA",
    body: `${top.sender} - ${top.subject}`,
    link: "/dashboard/email",
    data: {
      category: top.category,
      source,
      rule: matchingRule ? describeRule(matchingRule) : null,
    },
    dedupeKey: `email-ai:${userId}:${top.id}:${matchingRule?.id ?? "matching-rule"}`,
  });

  if (!created) return { matchedCount: matched.length, notificationSent: false };

  await sendPushToUser(admin, userId, {
    title: "Alerte Email IA",
    body: `${top.sender} - ${top.subject}`,
    url: "/dashboard/email",
    tag: `email-ai-${top.id}`,
  });

  return { matchedCount: matched.length, notificationSent: true };
}
