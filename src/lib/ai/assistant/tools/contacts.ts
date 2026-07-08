import type { AssistantToolDef } from "../types";
import type { PanelItem } from "../panels";
import { buildMemberRow, normalizeEmail, normalizePhone, type MemberInput } from "@/lib/contacts/normalize";
import { panelId } from "./shared";

// Contacts (CommunityMember) : lecture, création (unitaire ou en lot ≤ 50),
// modification (DB directe — pas de route PATCH existante) et suppression.

const CONTACT_PROPERTIES = {
  firstName: { type: "string" },
  lastName: { type: "string" },
  displayName: { type: "string" },
  email: { type: "string" },
  phone: { type: "string" },
  profession: { type: "string" },
  city: { type: "string" },
  notes: { type: "string" },
} as const;

export const listContacts: AssistantToolDef = {
  name: "list_contacts",
  label: "Consulter les contacts",
  summarize: () => "Consulter les contacts de la communauté.",
  schema: {
    type: "function",
    function: {
      name: "list_contacts",
      description: "Liste les contacts de la communauté. Filtre optionnel par recherche (nom, email, téléphone).",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Texte à rechercher dans le nom, l'email ou le téléphone" },
        },
      },
    },
  },
  read: async (ctx, args) => {
    let query = ctx.admin
      .from("CommunityMember")
      .select("id, displayName, firstName, lastName, email, phone, city, profession, optInEmail, optInWhatsapp")
      .eq("communityId", ctx.communityId)
      .order("displayName", { ascending: true })
      .limit(20);
    if (typeof args.search === "string" && args.search.trim()) {
      const s = args.search.trim();
      query = query.or(`displayName.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`);
    }
    const { data } = await query;
    const contacts = data ?? [];

    const { count } = await ctx.admin
      .from("CommunityMember")
      .select("id", { count: "exact", head: true })
      .eq("communityId", ctx.communityId);

    const items: PanelItem[] = contacts.map((c) => ({
      id: c.id,
      title: c.displayName,
      subtitle: [c.email, c.phone].filter(Boolean).join(" · ") || "Aucune coordonnée",
      badge: [c.optInEmail ? "Email ✓" : null, c.optInWhatsapp ? "WhatsApp ✓" : null].filter(Boolean).join(" ") || undefined,
      fields: [
        { key: "displayName", label: "Nom affiché", value: c.displayName ?? "", editable: true, inputType: "text" as const },
        { key: "email", label: "Email", value: c.email ?? "", editable: true, inputType: "text" as const },
        { key: "phone", label: "Téléphone", value: c.phone ?? "", editable: true, inputType: "text" as const },
        { key: "city", label: "Ville", value: c.city ?? "", editable: true, inputType: "text" as const },
        { key: "notes", label: "Notes", value: "", editable: true, inputType: "textarea" as const },
      ],
      actions: [
        { id: `save-${c.id}`, label: "Enregistrer", style: "primary" as const, kind: "execute_tool" as const, toolKind: "update_contact", payload: { contactId: c.id } },
        { id: `del-${c.id}`, label: "Supprimer", style: "danger" as const, kind: "execute_tool" as const, toolKind: "delete_contact", payload: { contactId: c.id }, confirm: true },
      ],
    }));

    return {
      llmResult: {
        total: count ?? contacts.length,
        contacts: contacts.map((c) => ({ id: c.id, name: c.displayName, email: c.email, phone: c.phone })),
      },
      panel: {
        id: panelId("contacts"),
        panelType: "entity_list",
        entity: "contact",
        title: `Contacts — ${count ?? contacts.length} au total${contacts.length < (count ?? 0) ? ` (${contacts.length} affichés)` : ""}`,
        emptyText: "Aucun contact trouvé.",
        items,
        meta: { total: count ?? contacts.length },
      },
    };
  },
};

export const createContact: AssistantToolDef = {
  name: "create_contact",
  label: "Ajouter un contact",
  summarize: (payload) => {
    const members = Array.isArray(payload.contacts) ? payload.contacts : [payload];
    if (members.length > 1) return `Ajouter ${members.length} contacts à la communauté.`;
    const m = members[0] as MemberInput;
    const name = m?.displayName || [m?.firstName, m?.lastName].filter(Boolean).join(" ") || m?.email || m?.phone || "?";
    return `Ajouter le contact « ${name} ».`;
  },
  schema: {
    type: "function",
    function: {
      name: "create_contact",
      description: "Ajoute un ou plusieurs contacts (max 50) à la communauté. Fournis au moins un nom, email ou téléphone par contact.",
      parameters: {
        type: "object",
        properties: {
          ...CONTACT_PROPERTIES,
          contacts: {
            type: "array",
            description: "Pour un ajout en lot : liste de contacts (max 50)",
            items: { type: "object", properties: { ...CONTACT_PROPERTIES } },
          },
        },
      },
    },
  },
  execute: async (ctx, payload) => {
    const inputs: MemberInput[] = Array.isArray(payload.contacts)
      ? (payload.contacts as MemberInput[]).slice(0, 50)
      : [payload as MemberInput];

    const rows = inputs
      .map((member) => buildMemberRow(ctx.communityId, { ...member, source: "assistant" }))
      .filter((row) => row.email || row.phone || row.displayName !== "Membre");

    if (rows.length === 0) {
      return { success: false, message: "Aucun contact exploitable (nom, email ou téléphone requis)." };
    }

    const { data, error } = await ctx.admin.from("CommunityMember").insert(rows).select("id");
    if (error) return { success: false, message: `Erreur : ${error.message}` };
    const n = data?.length ?? rows.length;
    return {
      success: true,
      message: n > 1 ? `${n} contacts ajoutés.` : `Contact « ${rows[0].displayName} » ajouté.`,
      data: { ids: (data ?? []).map((r: { id: string }) => r.id) },
    };
  },
};

export const updateContact: AssistantToolDef = {
  name: "update_contact",
  label: "Modifier un contact",
  summarize: (payload) => {
    const changes = Object.keys(CONTACT_PROPERTIES)
      .filter((k) => payload[k] !== undefined)
      .map((k) => `${k} → ${String(payload[k])}`)
      .join(", ");
    return `Modifier le contact : ${changes || "(aucun changement)"}.`;
  },
  schema: {
    type: "function",
    function: {
      name: "update_contact",
      description: "Modifie un contact existant. Utilise list_contacts pour trouver le contactId.",
      parameters: {
        type: "object",
        properties: {
          contactId: { type: "string" },
          ...CONTACT_PROPERTIES,
          optInEmail: { type: "boolean" },
          optInWhatsapp: { type: "boolean" },
        },
        required: ["contactId"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const contactId = String(payload.contactId ?? "");
    if (!contactId) return { success: false, message: "contactId manquant." };

    const { data: existing } = await ctx.admin
      .from("CommunityMember")
      .select("id, displayName")
      .eq("id", contactId)
      .eq("communityId", ctx.communityId)
      .single();
    if (!existing) return { success: false, message: "Contact introuvable." };

    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (typeof payload.firstName === "string") update.firstName = payload.firstName.trim() || null;
    if (typeof payload.lastName === "string") update.lastName = payload.lastName.trim() || null;
    if (typeof payload.displayName === "string" && payload.displayName.trim()) update.displayName = payload.displayName.trim();
    if (typeof payload.email === "string") update.email = normalizeEmail(payload.email);
    if (typeof payload.phone === "string") update.phone = normalizePhone(payload.phone);
    if (typeof payload.profession === "string") update.profession = payload.profession.trim() || null;
    if (typeof payload.city === "string") update.city = payload.city.trim() || null;
    if (typeof payload.notes === "string") update.notes = payload.notes.trim() || null;
    if (typeof payload.optInEmail === "boolean") update.optInEmail = payload.optInEmail;
    if (typeof payload.optInWhatsapp === "boolean") update.optInWhatsapp = payload.optInWhatsapp;

    await ctx.admin.from("CommunityMember").update(update).eq("id", contactId).eq("communityId", ctx.communityId);
    return { success: true, message: `Contact « ${String(update.displayName ?? existing.displayName)} » mis à jour.` };
  },
};

export const deleteContact: AssistantToolDef = {
  name: "delete_contact",
  label: "Supprimer un contact",
  summarize: () => "Supprimer définitivement un contact de la communauté.",
  schema: {
    type: "function",
    function: {
      name: "delete_contact",
      description: "Supprime définitivement un contact. Utilise list_contacts pour trouver le contactId.",
      parameters: {
        type: "object",
        properties: { contactId: { type: "string" } },
        required: ["contactId"],
      },
    },
  },
  execute: async (ctx, payload) => {
    const contactId = String(payload.contactId ?? "");
    if (!contactId) return { success: false, message: "contactId manquant." };
    const { data: existing } = await ctx.admin
      .from("CommunityMember")
      .select("id, displayName")
      .eq("id", contactId)
      .eq("communityId", ctx.communityId)
      .single();
    if (!existing) return { success: false, message: "Contact introuvable." };

    await ctx.admin.from("CommunityMember").delete().eq("id", contactId).eq("communityId", ctx.communityId);
    return { success: true, message: `Contact « ${existing.displayName} » supprimé.` };
  },
};

export const contactTools: AssistantToolDef[] = [listContacts, createContact, updateContact, deleteContact];
