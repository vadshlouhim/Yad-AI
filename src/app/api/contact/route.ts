import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const RECIPIENTS = ["chlomitaieb@gmail.com", "vadshlouhim@gmail.com"];

function cleanText(value: unknown, maxLength = 2000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildLeadEmailHtml(params: {
  name: string;
  email: string;
  phone: string;
  organization: string;
  subject: string;
  message: string;
  pageUrl: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}) {
  const rows = [
    ["Nom", params.name],
    ["Email", params.email],
    ["Téléphone", params.phone || "Non renseigné"],
    ["Organisation", params.organization || "Non renseignée"],
    ["Sujet", params.subject],
    ["Page source", params.pageUrl || "Non renseignée"],
    ["IP", params.ipAddress || "Non renseignée"],
    ["Navigateur", params.userAgent || "Non renseigné"],
    ["Date", new Date(params.createdAt).toLocaleString("fr-FR")],
  ];

  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
      <div style="max-width:680px;margin:0 auto;background:white;border:1px solid #e2e8f0;border-radius:24px;padding:28px">
        <p style="margin:0 0 8px;color:#2563eb;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase">Nouveau lead EasyCom IA</p>
        <h1 style="margin:0 0 18px;font-size:26px;line-height:1.2">Quelqu'un a rempli le formulaire de contact</h1>
        <table style="width:100%;border-collapse:collapse;margin:18px 0">
          ${rows
            .map(
              ([label, value]) => `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:700;width:150px">${escapeHtml(label)}</td>
                  <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700">${escapeHtml(value)}</td>
                </tr>
              `
            )
            .join("")}
        </table>
        <div style="margin-top:18px;padding:16px;border-radius:18px;background:#eff6ff;border:1px solid #bfdbfe">
          <p style="margin:0 0 8px;color:#1d4ed8;font-size:13px;font-weight:800">Message</p>
          <p style="margin:0;white-space:pre-line;line-height:1.65;font-size:14px">${escapeHtml(params.message)}</p>
        </div>
        <p style="margin:22px 0 0;color:#64748b;font-size:12px">Ce lead est aussi stocké dans l'onglet Super Admin > Leads.</p>
      </div>
    </div>
  `;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const name = cleanText((body as Record<string, unknown>).name, 160);
  const email = cleanText((body as Record<string, unknown>).email, 240).toLowerCase();
  const phone = cleanText((body as Record<string, unknown>).phone, 80);
  const organization = cleanText((body as Record<string, unknown>).organization, 180);
  const subject = cleanText((body as Record<string, unknown>).subject, 220);
  const message = cleanText((body as Record<string, unknown>).message, 5000);
  const pageUrl = cleanText((body as Record<string, unknown>).pageUrl, 500);
  const createdAt = new Date().toISOString();

  if (name.length < 2) return NextResponse.json({ error: "Le nom est requis." }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: "Email invalide." }, { status: 400 });
  if (subject.length < 2) return NextResponse.json({ error: "Le sujet est requis." }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ error: "Le message doit contenir au moins 10 caractères." }, { status: 400 });

  const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "";
  const userAgent = request.headers.get("user-agent") ?? "";
  const admin = createAdminClient();

  const { data: lead, error: insertError } = await admin
    .from("ContactLead")
    .insert({
      id: `lead_${crypto.randomUUID()}`,
      name,
      email,
      phone: phone || null,
      organization: organization || null,
      subject,
      message,
      source: "contact_form",
      pageUrl: pageUrl || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      status: "NEW",
      metadata: { recipients: RECIPIENTS },
      createdAt,
      updatedAt: createdAt,
    })
    .select()
    .single();

  if (insertError || !lead) {
    return NextResponse.json({ error: insertError?.message ?? "Impossible d'enregistrer le lead." }, { status: 500 });
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY manquant");

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: process.env.EMAIL_FROM?.replace(/^"|"$/g, "") ?? "EasyCom IA <noreply@easycom-ai.com>",
      to: RECIPIENTS,
      replyTo: email,
      subject: `Nouveau lead EasyCom IA - ${subject}`,
      html: buildLeadEmailHtml({ name, email, phone, organization, subject, message, pageUrl, ipAddress, userAgent, createdAt }),
    });

    await admin.from("ContactLead").update({ emailSentAt: new Date().toISOString(), emailError: null }).eq("id", lead.id);
  } catch (error) {
    const emailError = error instanceof Error ? error.message : "Erreur inconnue Resend";
    await admin.from("ContactLead").update({ emailError }).eq("id", lead.id);
    return NextResponse.json({ success: true, warning: "Lead enregistré, mais email non envoyé." }, { status: 202 });
  }

  return NextResponse.json({ success: true });
}
