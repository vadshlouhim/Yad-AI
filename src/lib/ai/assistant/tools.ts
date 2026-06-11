import type { ChatCompletionTool } from "openai/resources/chat/completions";

// Définitions des outils exposés à l'assistant (format OpenAI/OpenRouter).
export function buildTools(opts: { gmailConnected: boolean }): ChatCompletionTool[] {
  return [
    {
      type: "function",
      function: {
        name: "update_community_settings",
        description: "Modifie les réglages de la communauté (ton, signature, nom, ville).",
        parameters: {
          type: "object",
          properties: {
            tone: { type: "string", description: "MODERN, TRADITIONAL, FORMAL, FRIENDLY ou RELIGIOUS" },
            signature: { type: "string" },
            name: { type: "string" },
            city: { type: "string" },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_automation",
        description:
          "Crée une automatisation (envoi d'emails/messages, génération de contenu, notifications, avec récurrence).",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            trigger: {
              type: "string",
              enum: ["BEFORE_EVENT", "EVENT_DAY", "AFTER_EVENT", "WEEKLY_SHABBAT", "JEWISH_HOLIDAY", "DAILY", "CUSTOM_SCHEDULE", "MANUAL"],
            },
            triggerConfig: {
              type: "object",
              properties: {
                time: { type: "string", description: "HH:MM" },
                date: { type: "string", description: "YYYY-MM-DD" },
                repeat: { type: "string", enum: ["none", "weekly", "monthly", "custom"] },
                days: { type: "array", items: { type: "string" } },
                startDate: { type: "string" },
                endDate: { type: "string" },
              },
            },
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["GENERATE_CONTENT", "SEND_EMAIL", "SEND_MESSAGE", "CREATE_NOTIFICATION"] },
                  contentType: { type: "string" },
                  channels: { type: "array", items: { type: "string" } },
                  requiresValidation: { type: "boolean" },
                  emailSubject: { type: "string" },
                  emailBody: { type: "string" },
                  messageText: { type: "string" },
                  notificationTitle: { type: "string" },
                  notificationBody: { type: "string" },
                },
                required: ["type"],
              },
            },
          },
          required: ["name", "trigger", "actions"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "toggle_automation",
        description: "Active ou met en pause une automatisation existante.",
        parameters: {
          type: "object",
          properties: {
            automationId: { type: "string" },
            isActive: { type: "boolean" },
          },
          required: ["automationId", "isActive"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "delete_automation",
        description: "Supprime définitivement une automatisation.",
        parameters: {
          type: "object",
          properties: { automationId: { type: "string" } },
          required: ["automationId"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "send_email",
        description: gmailConnected(opts.gmailConnected),
        parameters: {
          type: "object",
          properties: {
            to: { type: "string", description: "Adresse email du destinataire" },
            subject: { type: "string" },
            body: { type: "string", description: "Contenu de l'email" },
          },
          required: ["to", "subject", "body"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "generate_content",
        description: "Génère un contenu (post/annonce) et l'enregistre comme brouillon. Sans danger, à utiliser librement.",
        parameters: {
          type: "object",
          properties: {
            contentType: {
              type: "string",
              description: "GENERAL, SHABBAT_TIMES, EVENT_ANNOUNCEMENT, HOLIDAY_GREETING, COURSE_ANNOUNCEMENT, FUNDRAISING…",
            },
            instructions: { type: "string", description: "Instructions précises pour le contenu" },
            eventId: { type: "string" },
          },
          required: ["contentType"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "publish_content",
        description: "Publie un brouillon existant (draftId) sur les canaux indiqués. Action publique.",
        parameters: {
          type: "object",
          properties: {
            draftId: { type: "string" },
            channelTypes: {
              type: "array",
              items: { type: "string" },
              description: "INSTAGRAM, FACEBOOK, WHATSAPP, TELEGRAM, EMAIL…",
            },
          },
          required: ["draftId", "channelTypes"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_automations",
        description: "Liste les automatisations existantes de la communauté (lecture seule).",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "check_channels",
        description: "Vérifie l'état des canaux connectés (réseaux sociaux, email…) et ce qui reste à configurer.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "remember",
        description:
          "Mémorise un fait durable sur la communauté pour mieux l'aider plus tard (préférence éditoriale, habitude, vocabulaire…).",
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["EDITORIAL_PREFERENCE", "EVENT_PATTERN", "CONTENT_STYLE", "CHANNEL_PREFERENCE", "VOCABULARY", "RECURRING_CONTENT", "USER_FEEDBACK"],
            },
            key: { type: "string", description: "Identifiant court du fait (ex: 'ton_prefere')" },
            value: { description: "La valeur à mémoriser (texte ou objet)" },
          },
          required: ["type", "key", "value"],
        },
      },
    },
  ];
}

function gmailConnected(connected: boolean): string {
  return connected
    ? "Prépare et envoie un email depuis la boîte Gmail connectée."
    : "Prépare et envoie un email (via le canal email configuré, fallback Resend).";
}
