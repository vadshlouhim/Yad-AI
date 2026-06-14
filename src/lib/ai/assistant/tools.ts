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
          "Crée une automatisation (envoi d'emails/messages, génération de contenu, notifications, avec récurrence).\n\nRÈGLES CRITIQUES POUR LES RAPPELS :\n1. triggerConfig.time = heure de DÉCLENCHEMENT du rappel (ex: 18:30).\n2. triggerConfig.eventTime = heure RÉELLE de l'événement (ex: 20:30) — OBLIGATOIRE si différente de time. L'agenda utilise eventTime, jamais time.\n3. triggerConfig.eventTitle = titre de l'événement réel dans l'agenda (ex: 'Cours de Torah'), PAS le nom du rappel.\n4. Le corps du message (messageText, emailBody, notificationBody) mentionne toujours l'heure de l'événement (eventTime), jamais l'heure du rappel (time).\n5. Si l'événement réel n'existe pas encore dans l'agenda, appelle create_event séparément avec l'heure eventTime après avoir créé l'automatisation.",
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
                time: { type: "string", description: "HH:MM — heure de DÉCLENCHEMENT de l'automatisation (ex: 18:30 pour un rappel envoyé 2h avant)" },
                eventTime: { type: "string", description: "HH:MM — heure RÉELLE de l'événement que rappelle cette automatisation (ex: 20:30 pour le cours). Obligatoire si time ≠ heure de l'événement. Quand présent, l'agenda utilise cette heure, pas time." },
                eventTitle: { type: "string", description: "Titre de l'événement RÉEL dans l'agenda (ex: 'Cours de Torah'). Si absent, le nom de l'automatisation est utilisé — souvent trompeur pour un rappel." },
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
        name: "email_community",
        description: "Envoie un email à TOUS les contacts de la communauté qui ont accepté les emails (opt-in).",
        parameters: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string", description: "Contenu de l'email" },
          },
          required: ["subject", "body"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "send_whatsapp",
        description:
          "Envoie un message WhatsApp. Par défaut à TOUS les contacts opt-in WhatsApp de la communauté (target='community'), ou à un seul numéro si l'utilisateur le précise (target='phone' + phone). Toujours confirmer la cible (communauté entière vs numéro) si elle est ambiguë.",
        parameters: {
          type: "object",
          properties: {
            text: { type: "string", description: "Contenu du message WhatsApp prêt à envoyer" },
            target: {
              type: "string",
              enum: ["community", "phone"],
              description: "community = tous les contacts opt-in ; phone = un seul numéro",
            },
            phone: { type: "string", description: "Numéro au format international si target='phone'" },
          },
          required: ["text"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_event",
        description: "Ajoute un événement, un rappel ou une date dans l'Agenda connecté IA de la communauté.",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            date: { type: "string", description: "YYYY-MM-DD" },
            time: { type: "string", description: "HH:MM (défaut 10:00)" },
            description: { type: "string" },
          },
          required: ["title"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_events",
        description: "Liste les prochains événements de l'agenda de la communauté (lecture seule).",
        parameters: { type: "object", properties: {} },
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
