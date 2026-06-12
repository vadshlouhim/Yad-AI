import { Resend } from "resend";
import * as dotenv from "dotenv";
import * as path from "path";

// Load local .env variables
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error("Erreur: RESEND_API_KEY non trouvee dans le .env");
  process.exit(1);
}

const resend = new Resend(apiKey);
const recipients = ["chloitaieb@gmail.com", "chlomitaieb@gmail.com", "vadshlouhim@gmail.com"];

const examples = [
  {
    subject: "🕯️ Horaires de Chabbat - Parachat Behar-Behoukotaï",
    title: "Beth Habad de Paris",
    content: `Chers membres de la communauté,<br/><br/>
    Voici les horaires de Chabbat pour cette semaine :<br/>
    <ul>
      <li><strong>Parachat :</strong> Behar-Behoukotaï</li>
      <li><strong>Allumage des bougies :</strong> 21h08</li>
      <li><strong>Fin de Chabbat (Havdala) :</strong> 22h24</li>
    </ul>
    Nous vous attendons nombreux pour l'office du vendredi soir à 19h30, suivi d'un kiddouch communautaire chaleureux le samedi midi après l'office de Chaharit.<br/><br/>
    Chabbat Chalom à toutes et à tous !`,
  },
  {
    subject: "📖 Rappel de Cours - Guémara & Halakha",
    title: "Centre Communautaire EasyCom IA",
    content: `Chers amis,<br/><br/>
    Nous avons le plaisir de vous rappeler nos cours de la semaine :<br/><br/>
    <strong>Cours de Talmud (Baba Metzia) :</strong><br/>
    Présenté par le <em>Rav Lévi Cohen</em>.<br/>
    📅 Ce mardi à 20h00 au centre communautaire.<br/>
    💡 Sujet de la semaine : Les lois sur les objets perdus et restitués.<br/><br/>
    <strong>Cours d'étude pour femmes :</strong><br/>
    📅 Mercredi soir à 20h30 sur Zoom.<br/><br/>
    Venez nombreux étudier et partager un moment d'inspiration !`,
  },
  {
    subject: "✨ Pensée hassidique du jour - EasyCom IA",
    title: "L'Étincelle Quotidienne",
    content: `Bonjour,<br/><br/>
    Voici votre pensée quotidienne pour démarrer la journée :<br/><br/>
    <blockquote style="border-left: 4px solid #2563eb; padding-left: 16px; font-style: italic; color: #475569; margin: 16px 0;">
      "La joie brise toutes les barrières. Même lorsque les temps paraissent incertains, cultiver un esprit de gratitude et de joie permet de révéler les bénédictions cachées dans notre quotidien."
    </blockquote>
    Passez une excellente et productive journée !`,
  },
  {
    subject: "🎉 Hag Sameah ! Voeux de Chavouot",
    title: "Communauté EasyCom IA",
    content: `Chers membres,<br/><br/>
    À l'approche de la fête de <strong>Chavouot</strong>, moment du Don de notre sainte Torah, toute l'équipe de la communauté vous souhaite un chaleureux <strong>Hag Sameah</strong> !<br/><br/>
    Ne manquez pas notre programme spécial :<br/>
    <ul>
      <li><strong>Nuit d'étude (Tikoun Leil) :</strong> À partir de 23h30 au Beth Midrach.</li>
      <li><strong>Lecture des Dix Commandements :</strong> Le lendemain matin à 10h30, suivi de notre traditionnel grand buffet lacté et glaces pour les enfants !</li>
    </ul>
    Puissions-nous recevoir la Torah avec joie et sincérité.`,
  },
];

async function sendAll() {
  console.log(`[Resend] Début de l'envoi des ${examples.length} exemples vers ${recipients.join(", ")}...`);

  for (const recipient of recipients) {
    for (const example of examples) {
      const formattedContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${example.title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b; background-color: #f8fafc;">
  <div style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
    <div style="border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
      <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0;">${example.title}</h1>
    </div>
    <div style="font-size: 15px; line-height: 1.7; color: #334155;">
      ${example.content}
    </div>
    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
      Envoyé via <strong>EasyCom IA</strong> · Assistant de communication intelligent
    </div>
  </div>
</body>
</html>`;

      try {
        const response = await resend.emails.send({
          from: "onboarding@resend.dev",
          to: recipient,
          subject: example.subject,
          html: formattedContent,
        });

        if (response.error) {
          console.error(`❌ Erreur pour "${example.subject}" vers ${recipient}:`, response.error);
        } else {
          console.log(`✅ Envoyé : "${example.subject}" vers ${recipient} (ID: ${response.data?.id})`);
        }
      } catch (err) {
        console.error(`❌ Exception pour "${example.subject}" vers ${recipient}:`, err);
      }
    }
  }

  console.log("[Resend] Tous les envois sont terminés !");
}

sendAll();
