import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptIntegrationSecret } from "@/lib/security/integration-secrets";
import { fetchUnisoftContacts } from "@/lib/unisoft/client";
import { normalizeUnisoftContact, unisoftHebrewDate } from "@/lib/unisoft/normalize";
import { normalizeEmail, normalizePhone } from "@/lib/contacts/normalize";

type Admin = ReturnType<typeof createAdminClient> & { from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> };

export type UnisoftSyncReport = { fetched: number; contactsCreated: number; contactsUpdated: number; yahrzeitsCreated: number; yahrzeitsUpdated: number; skipped: number; warnings: string[] };

function inverseRelationship(relationship: string | null) {
  if (!relationship) return null;
  const inverse: Record<string, string> = {
    PARENT: "CHILD",
    CHILD: "PARENT",
    GRANDPARENT: "GRANDCHILD",
    GRANDCHILD: "GRANDPARENT",
  };
  const normalized = relationship.toUpperCase();
  return inverse[normalized] ?? normalized;
}

export async function syncUnisoftCommunity(communityId: string, admin: Admin = createAdminClient() as Admin): Promise<UnisoftSyncReport> {
  const report: UnisoftSyncReport = { fetched: 0, contactsCreated: 0, contactsUpdated: 0, yahrzeitsCreated: 0, yahrzeitsUpdated: 0, skipped: 0, warnings: [] };
  const { data: integration } = await admin.from("CommunityIntegration").select("id, encryptedSecret").eq("communityId", communityId).eq("provider", "UNISOFT").eq("isActive", true).maybeSingle();
  if (!integration) throw new Error("Intégration Unisoft non configurée.");
  try {
    const raw = await fetchUnisoftContacts(decryptIntegrationSecret(integration.encryptedSecret));
    const contacts = raw.map(normalizeUnisoftContact).filter((item): item is NonNullable<typeof item> => Boolean(item));
    report.fetched = contacts.length;
    report.skipped += raw.length - contacts.length;
    const memberIdByExternalId = new Map<string, string>();

    const { data: existingMembers, error: existingError } = await admin.from("CommunityMember").select("id, externalId, email, phone, tags").eq("communityId", communityId);
    if (existingError) throw existingError;
    for (const contact of contacts.filter((item) => !item.deceased)) {
      const email = normalizeEmail(contact.email);
      const phone = normalizePhone(contact.phone);
      const existing = (existingMembers ?? []).find((member) =>
        member.externalId === contact.externalId || (email && member.email === email) || (phone && member.phone === phone));
      const hebrewBirth = unisoftHebrewDate(contact.birthDate, contact.birthAfterSunset);
      const values = {
        firstName: contact.firstName,
        lastName: contact.lastName,
        displayName: contact.displayName,
        email,
        phone,
        birthDate: contact.birthDate,
        birthAfterSunset: contact.birthAfterSunset,
        hebrewBirthDay: hebrewBirth?.day ?? null,
        hebrewBirthMonth: hebrewBirth?.month ?? null,
        hebrewBirthYear: hebrewBirth?.year ?? null,
        hebrewFirstName: contact.hebrewFirstName,
        hebrewFatherName: contact.hebrewFatherName,
        hebrewMotherName: contact.hebrewMotherName,
        externalSource: "unisoft",
        externalId: contact.externalId,
        source: "unisoft",
        tags: [...new Set([...(existing?.tags ?? []), ...contact.tags])],
        updatedAt: new Date().toISOString(),
      };
      if (existing) {
        const { error } = await admin.from("CommunityMember").update(values).eq("id", existing.id).eq("communityId", communityId);
        if (error) throw error;
        memberIdByExternalId.set(contact.externalId, existing.id);
        report.contactsUpdated += 1;
      } else {
        const id = crypto.randomUUID();
        const { error } = await admin.from("CommunityMember").insert({ id, communityId, ...values, optInEmail: Boolean(email), optInWhatsapp: Boolean(phone) });
        if (error) throw error;
        memberIdByExternalId.set(contact.externalId, id);
        report.contactsCreated += 1;
      }
    }

    const deceasedContacts = contacts.filter((item) => item.deceased && item.deceasedDate);
    for (const deceased of deceasedContacts) {
      const hebrew = unisoftHebrewDate(deceased.deceasedDate, deceased.deathAfterSunset);
      if (!hebrew) continue;
      const livingRelationships = new Map<string, string | null>();
      for (const relation of deceased.relations) {
        if (memberIdByExternalId.has(relation.contactId)) {
          livingRelationships.set(relation.contactId, inverseRelationship(relation.relationship));
        }
      }
      // Some Unisoft exports put the relation only on the living person's record.
      for (const living of contacts.filter((item) => !item.deceased)) {
        const relation = living.relations.find((item) => item.contactId === deceased.externalId);
        if (relation) livingRelationships.set(living.externalId, relation.relationship?.toUpperCase() ?? null);
      }
      for (const [livingExternalId, relationship] of livingRelationships) {
        const memberId = memberIdByExternalId.get(livingExternalId);
        if (!memberId) continue;
        const externalId = `${deceased.externalId}:${livingExternalId}`;
        const { data: existing } = await admin.from("MemberYahrzeit").select("id").eq("communityId", communityId).eq("memberId", memberId).eq("externalSource", "unisoft").eq("externalId", externalId).maybeSingle();
        const values = {
          deceasedName: deceased.displayName,
          deceasedHebrewName: deceased.hebrewFirstName,
          fatherHebrewName: deceased.deceasedFatherName,
          motherHebrewName: deceased.deceasedMotherName,
          deathDate: deceased.deceasedDate,
          deathAfterSunset: deceased.deathAfterSunset,
          hebrewDeathDay: hebrew.day,
          hebrewDeathMonth: hebrew.month,
          hebrewDeathYear: hebrew.year,
          relationship,
          externalSource: "unisoft",
          externalId,
          isActive: true,
          updatedAt: new Date().toISOString(),
        };
        if (existing) {
          const { error } = await admin.from("MemberYahrzeit").update(values).eq("id", existing.id);
          if (error) throw error;
          report.yahrzeitsUpdated += 1;
        } else {
          const { error } = await admin.from("MemberYahrzeit").insert({ id: crypto.randomUUID(), communityId, memberId, ...values });
          if (error) throw error;
          report.yahrzeitsCreated += 1;
        }
      }
    }
    if (contacts.length > 0 && deceasedContacts.length === 0) {
      report.warnings.push("Aucune date de décès exploitable n’a été trouvée. Dans Unisoft, ajoutez-la dans un champ personnalisé nommé dateDeces, deathDate ou yahrzeitDate.");
    } else if (deceasedContacts.length > 0 && report.yahrzeitsCreated + report.yahrzeitsUpdated === 0) {
      report.warnings.push("Aucun lien familial exploitable n'a été trouvé pour rattacher les défunts aux membres.");
    }
    await admin.from("CommunityIntegration").update({ lastSyncAt: new Date().toISOString(), lastSyncStatus: "success", lastSyncError: null, lastSyncReport: report, updatedAt: new Date().toISOString() }).eq("id", integration.id);
    return report;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur de synchronisation Unisoft";
    await admin.from("CommunityIntegration").update({ lastSyncAt: new Date().toISOString(), lastSyncStatus: "error", lastSyncError: message, updatedAt: new Date().toISOString() }).eq("id", integration.id);
    throw error;
  }
}

export async function syncAllUnisoftCommunities() {
  const admin = createAdminClient() as Admin;
  const { data, error } = await admin.from("CommunityIntegration").select("communityId, lastSyncAt").eq("provider", "UNISOFT").eq("isActive", true);
  if (error) throw error;
  const results = [];
  for (const integration of data ?? []) {
    const lastSyncAt = integration.lastSyncAt ? new Date(integration.lastSyncAt).getTime() : 0;
    if (lastSyncAt && Date.now() - lastSyncAt < 20 * 60 * 60 * 1000) continue;
    try { results.push({ communityId: integration.communityId, ok: true, report: await syncUnisoftCommunity(integration.communityId, admin) }); }
    catch (error) { results.push({ communityId: integration.communityId, ok: false, error: error instanceof Error ? error.message : "Erreur inconnue" }); }
  }
  return results;
}
