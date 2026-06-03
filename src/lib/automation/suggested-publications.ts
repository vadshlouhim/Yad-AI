export interface SuggestedAutomationPublication {
  id: string;
  title: string;
  description: string | null;
  category: string;
  icon: string | null;
  trigger: string;
  triggerConfig: Record<string, unknown>;
  actions: Array<Record<string, unknown>>;
  isActive: boolean;
  isGlobal: boolean;
  clientTypes: string[];
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export const GENERAL_DEFAULT_PUBLICATION_CATEGORY = "GENERAL_DEFAULT";

const DEFAULT_CHANNELS = ["INSTAGRAM", "FACEBOOK", "WHATSAPP"];

function buildSuggestedActions(contentType = "GENERAL", channels = DEFAULT_CHANNELS) {
  return [
    { type: "GENERATE_CONTENT", contentType, channels },
    { type: "CREATE_PUBLICATION", requiresValidation: true },
  ];
}

function publication(params: {
  id: string;
  title: string;
  description: string;
  category?: string;
  icon?: string;
  trigger?: string;
  triggerConfig?: Record<string, unknown>;
  contentType?: string;
  channels?: string[];
  clientTypes?: string[];
  sortOrder: number;
  aiInstruction: string;
  assistantMessage?: string;
}): SuggestedAutomationPublication {
  return {
    id: params.id,
    title: params.title,
    description: params.description,
    category: params.category ?? GENERAL_DEFAULT_PUBLICATION_CATEGORY,
    icon: params.icon ?? "IA",
    trigger: params.trigger ?? "CUSTOM_SCHEDULE",
    triggerConfig: {
      notificationHoursBefore: 2,
      whatsappDeliveryMode: "manual_copy",
      whatsappAutoSend: false,
      ...params.triggerConfig,
      aiInstruction: params.aiInstruction,
      assistantMessage: params.assistantMessage,
    },
    actions: buildSuggestedActions(params.contentType, params.channels),
    isActive: true,
    isGlobal: true,
    clientTypes: params.clientTypes ?? [],
    sortOrder: params.sortOrder,
  };
}

export const SYNAGOGUE_DEFAULT_AUTOMATION_PUBLICATIONS: SuggestedAutomationPublication[] = [
  publication({
    id: "profile_synagogue_shabbat_times",
    title: "Horaires de Chabbat",
    description: "Préparez chaque vendredi vos horaires de Chabbat personnalisés.",
    icon: "🕯️",
    trigger: "WEEKLY_SHABBAT",
    triggerConfig: { day: "friday", dayOfWeek: 5, daysBefore: 1, time: "10:00" },
    contentType: "SHABBAT_TIMES",
    clientTypes: ["SYNAGOGUE"],
    sortOrder: 10,
    aiInstruction: "Proposer les affiches Horaires de Chabbat, récupérer les horaires selon la ville, personnaliser avec nom et logo, puis demander validation.",
    assistantMessage: "Je vais préparer vos horaires de Chabbat chaque vendredi. Je propose vendredi matin à 10h. Ça vous convient ?",
  }),
  publication({
    id: "profile_synagogue_audio_torah",
    title: "Audio d'un cours de Torah",
    description: "Publiez un audio de cours après l'avoir téléversé.",
    icon: "🎧",
    trigger: "AFTER_EVENT",
    triggerConfig: { time: "21:00" },
    contentType: "COURSE_ANNOUNCEMENT",
    channels: ["WHATSAPP", "TELEGRAM", "EMAIL"],
    clientTypes: ["SYNAGOGUE"],
    sortOrder: 20,
    aiInstruction: "Après le cours, rappeler à l'utilisateur de téléverser l'audio, puis préparer un texte court d'accompagnement.",
    assistantMessage: "Je vous rappellerai d'ajouter l'audio après le cours. Je propose juste après le cours. Ça vous convient ?",
  }),
  publication({
    id: "profile_synagogue_video_torah",
    title: "Vidéo d'un cours de Torah",
    description: "Publiez une vidéo de cours après l'avoir téléversée.",
    icon: "🎥",
    trigger: "AFTER_EVENT",
    triggerConfig: { time: "21:00" },
    contentType: "COURSE_ANNOUNCEMENT",
    channels: ["WHATSAPP", "TELEGRAM", "EMAIL"],
    clientTypes: ["SYNAGOGUE"],
    sortOrder: 30,
    aiInstruction: "Après le cours, rappeler à l'utilisateur de téléverser la vidéo, puis préparer un texte court d'accompagnement.",
    assistantMessage: "Je vous rappellerai d'ajouter la vidéo après le cours. Je propose après le cours. Ça vous convient ?",
  }),
  publication({
    id: "profile_synagogue_event_recap",
    title: "Récap après événement",
    description: "Partagez un résumé court après vos événements.",
    icon: "✨",
    trigger: "AFTER_EVENT",
    contentType: "EVENT_RECAP",
    clientTypes: ["SYNAGOGUE"],
    sortOrder: 40,
    aiInstruction: "Après un événement de l'Agenda connecté IA, demander si l'utilisateur souhaite ajouter photos ou vidéos, puis préparer un récap court et chaleureux.",
    assistantMessage: "Je préparerai un récap après vos événements. Je vous le proposerai juste après. Ça vous convient ?",
  }),
  publication({
    id: "profile_synagogue_monthly_recap",
    title: "Récap du mois",
    description: "Résumez les activités importantes du mois.",
    icon: "🗓️",
    triggerConfig: { repeat: "monthly", dayOfMonth: 15, time: "10:00" },
    contentType: "COMMUNITY_NEWS",
    channels: ["INSTAGRAM", "FACEBOOK", "EMAIL"],
    clientTypes: ["SYNAGOGUE"],
    sortOrder: 50,
    aiInstruction: "Récupérer les événements, notes, photos, ressources et historiques du mois, puis préparer un récap mensuel.",
    assistantMessage: "Je préparerai un récap mensuel de vos activités. Je propose le 15 du mois à 10h. Ça vous convient ?",
  }),
  publication({
    id: "profile_synagogue_weekly_course_reminder",
    title: "Rappel du cours hebdomadaire",
    description: "Rappelez votre cours régulier chaque semaine.",
    icon: "📚",
    trigger: "BEFORE_EVENT",
    triggerConfig: { daysBefore: 1, time: "10:00" },
    contentType: "COURSE_ANNOUNCEMENT",
    channels: ["WHATSAPP", "TELEGRAM", "EMAIL"],
    clientTypes: ["SYNAGOGUE"],
    sortOrder: 60,
    aiInstruction: "Surveiller le cours hebdomadaire dans l'Agenda connecté IA et préparer un rappel court avant le cours.",
    assistantMessage: "Je rappellerai votre cours chaque semaine. Je propose la veille à 10h. Ça vous convient ?",
  }),
  publication({
    id: "profile_synagogue_paracha",
    title: "Un mot sur la Paracha",
    description: "Partagez une courte pensée sur la Paracha.",
    icon: "📖",
    triggerConfig: { repeat: "weekly", day: "friday", time: "09:00" },
    contentType: "DAILY_CONTENT",
    clientTypes: ["SYNAGOGUE"],
    sortOrder: 70,
    aiInstruction: "Identifier la Paracha avec le calendrier hébraïque et préparer un message court, simple et inspirant.",
    assistantMessage: "Je préparerai une pensée courte sur la Paracha. Je propose chaque vendredi matin. Ça vous convient ?",
  }),
  publication({
    id: "profile_synagogue_j10",
    title: "Rappel J-10",
    description: "Annoncez vos événements 10 jours avant.",
    icon: "📣",
    trigger: "BEFORE_EVENT",
    triggerConfig: { daysBefore: 10, time: "10:00" },
    contentType: "EVENT_ANNOUNCEMENT",
    clientTypes: ["SYNAGOGUE"],
    sortOrder: 80,
    aiInstruction: "Surveiller les événements de l'Agenda connecté IA et préparer une annonce courte 10 jours avant chaque événement.",
    assistantMessage: "Je surveillerai vos événements et préparerai un rappel J-10. Ça vous convient ?",
  }),
  publication({
    id: "profile_synagogue_j5",
    title: "Rappel J-5",
    description: "Relancez votre communauté 5 jours avant.",
    icon: "🔔",
    trigger: "BEFORE_EVENT",
    triggerConfig: { daysBefore: 5, time: "10:00" },
    contentType: "EVENT_REMINDER",
    clientTypes: ["SYNAGOGUE"],
    sortOrder: 90,
    aiInstruction: "Préparer un rappel court 5 jours avant chaque événement avec date, heure, lieu et lien d'inscription si disponible.",
    assistantMessage: "Je préparerai un rappel 5 jours avant vos événements. Ça vous convient ?",
  }),
  publication({
    id: "profile_synagogue_event_day",
    title: "Rappel J-J",
    description: "Rappelez l'événement le jour même.",
    icon: "⏰",
    trigger: "EVENT_DAY",
    triggerConfig: { time: "08:00" },
    contentType: "EVENT_DAY",
    clientTypes: ["SYNAGOGUE"],
    sortOrder: 100,
    aiInstruction: "Le matin de l'événement, préparer un message court pour rappeler que l'événement a lieu aujourd'hui.",
    assistantMessage: "Je préparerai un rappel le matin de chaque événement. Ça vous convient ?",
  }),
  publication({
    id: "profile_synagogue_weekly_newsletter",
    title: "Newsletter communautaire hebdomadaire",
    description: "Envoyez chaque semaine les nouvelles de la communauté.",
    icon: "✉️",
    triggerConfig: { repeat: "weekly", day: "friday", time: "10:00" },
    contentType: "COMMUNITY_NEWS",
    channels: ["EMAIL"],
    clientTypes: ["SYNAGOGUE"],
    sortOrder: 110,
    aiInstruction: "Préparer un email hebdomadaire avec les cours, événements, horaires et informations importantes.",
    assistantMessage: "Je préparerai une newsletter communautaire chaque semaine. Je propose vendredi matin à 10h. Ça vous convient ?",
  }),
  publication({
    id: "profile_synagogue_registration_reminder",
    title: "Rappel d'inscription repas / événement",
    description: "Rappelez les inscriptions avant un repas ou événement.",
    icon: "📝",
    trigger: "BEFORE_EVENT",
    triggerConfig: { daysBefore: 3, time: "10:00" },
    contentType: "EVENT_REMINDER",
    clientTypes: ["SYNAGOGUE"],
    sortOrder: 120,
    aiInstruction: "Préparer un rappel court avant une date limite d'inscription.",
    assistantMessage: "Je préparerai un rappel d'inscription avant vos événements. Je propose 3 jours avant. Ça vous convient ?",
  }),
  publication({
    id: "profile_synagogue_youth_activity",
    title: "Annonce activité jeunesse",
    description: "Annoncez vos activités enfants, ados ou CTeen.",
    icon: "🎈",
    trigger: "BEFORE_EVENT",
    triggerConfig: { daysBefore: 5, time: "10:00" },
    contentType: "EVENT_ANNOUNCEMENT",
    clientTypes: ["SYNAGOGUE"],
    sortOrder: 130,
    aiInstruction: "Préparer un message dynamique et court pour les activités jeunesse.",
    assistantMessage: "Je préparerai vos annonces jeunesse avec un ton dynamique. Je propose 5 jours avant. Ça vous convient ?",
  }),
  publication({
    id: "profile_synagogue_women_activity",
    title: "Annonce activité femmes",
    description: "Annoncez vos cours ou ateliers pour femmes.",
    icon: "🌸",
    trigger: "BEFORE_EVENT",
    triggerConfig: { daysBefore: 5, time: "10:00" },
    contentType: "EVENT_ANNOUNCEMENT",
    clientTypes: ["SYNAGOGUE"],
    sortOrder: 140,
    aiInstruction: "Préparer un message chaleureux pour les activités, cours ou ateliers dédiés aux femmes.",
    assistantMessage: "Je préparerai vos annonces pour les activités femmes. Je propose 5 jours avant. Ça vous convient ?",
  }),
  publication({
    id: "profile_synagogue_jewish_holiday",
    title: "Préparation fête juive",
    description: "Préparez vos communications avant les fêtes juives.",
    icon: "🕎",
    trigger: "JEWISH_HOLIDAY",
    triggerConfig: { daysBeforeHoliday: 10, time: "10:00" },
    contentType: "HOLIDAY_GREETING",
    clientTypes: ["SYNAGOGUE"],
    sortOrder: 150,
    aiInstruction: "Utiliser le calendrier hébraïque pour détecter les fêtes à venir et préparer des messages courts adaptés.",
    assistantMessage: "Je préparerai vos communications avant les fêtes juives. Je propose 10 jours avant. Ça vous convient ?",
  }),
];

export const RESTAURANT_DEFAULT_AUTOMATION_PUBLICATIONS: SuggestedAutomationPublication[] = [
  publication({ id: "profile_restaurant_daily_menu", title: "Menu du jour", description: "Publiez votre menu ou plat du jour.", icon: "🍽️", trigger: "DAILY", triggerConfig: { time: "09:00" }, contentType: "GENERAL", clientTypes: ["RESTAURANT"], sortOrder: 10, aiInstruction: "Demander ou récupérer le menu du jour, demander une photo si utile, puis préparer une publication courte.", assistantMessage: "Je préparerai votre menu du jour. Je propose chaque matin. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_daily_dish_photo", title: "Photo du plat du jour", description: "Recevez un rappel pour ajouter une photo.", icon: "📷", trigger: "DAILY", triggerConfig: { time: "11:30" }, contentType: "GENERAL", clientTypes: ["RESTAURANT"], sortOrder: 20, aiInstruction: "Notifier avant midi pour demander une photo du plat, puis préparer la publication.", assistantMessage: "Je vous rappellerai d'ajouter la photo du plat. Je propose avant midi. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_weekend_menu", title: "Menu du week-end", description: "Annoncez vos suggestions du week-end.", icon: "🗓️", triggerConfig: { repeat: "weekly", day: "thursday", time: "18:00" }, contentType: "GENERAL", clientTypes: ["RESTAURANT"], sortOrder: 30, aiInstruction: "Préparer chaque jeudi ou vendredi une publication avec les plats, offres ou réservations du week-end.", assistantMessage: "Je préparerai votre menu du week-end. Je propose jeudi soir. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_special_offer", title: "Offre spéciale", description: "Mettez en avant une offre ou promotion.", icon: "🏷️", triggerConfig: { repeat: "weekly", day: "tuesday", time: "10:00" }, contentType: "GENERAL", clientTypes: ["RESTAURANT"], sortOrder: 40, aiInstruction: "Préparer une publication courte avec l'offre, la durée, le prix si disponible et un appel à réserver ou commander.", assistantMessage: "Je préparerai vos offres spéciales. Je propose une fois par semaine. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_lunch_business", title: "Message entreprises midi", description: "Touchez les bureaux proches pour le déjeuner.", icon: "🏢", trigger: "DAILY", triggerConfig: { time: "11:00" }, contentType: "GENERAL", channels: ["EMAIL", "WHATSAPP", "FACEBOOK"], clientTypes: ["RESTAURANT"], sortOrder: 50, aiInstruction: "Préparer un message adapté aux bureaux et salariés proches autour du menu du midi.", assistantMessage: "Je préparerai un message pour les bureaux proches. Je propose 11h. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_reservation_reminder", title: "Rappel réservation", description: "Rappelez aux clients de réserver.", icon: "📌", triggerConfig: { repeat: "weekly", day: "friday", time: "10:00" }, contentType: "GENERAL", clientTypes: ["RESTAURANT"], sortOrder: 60, aiInstruction: "Préparer un message avant les services importants, week-ends, soirées ou événements privés.", assistantMessage: "Je préparerai vos rappels de réservation. Je propose vendredi matin. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_exceptional_hours", title: "Horaires exceptionnels", description: "Annoncez vos changements d'horaires.", icon: "⏱️", trigger: "MANUAL", contentType: "GENERAL", clientTypes: ["RESTAURANT"], sortOrder: 70, aiInstruction: "Quand un changement d'horaire est prévu, préparer une publication claire.", assistantMessage: "Je vous aiderai à annoncer vos horaires exceptionnels. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_new_menu_item", title: "Nouveauté à la carte", description: "Présentez vos nouveaux plats ou produits.", icon: "⭐", triggerConfig: { repeat: "weekly", day: "wednesday", time: "10:00" }, contentType: "GENERAL", clientTypes: ["RESTAURANT"], sortOrder: 80, aiInstruction: "Demander éventuellement une photo, puis préparer une publication courte pour annoncer la nouveauté.", assistantMessage: "Je préparerai vos nouveautés à la carte. Je vous demanderai une photo si besoin. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_google_review_request", title: "Avis Google à demander", description: "Invitez vos clients à laisser un avis.", icon: "⭐", trigger: "MANUAL", contentType: "GENERAL", channels: ["WHATSAPP", "EMAIL"], clientTypes: ["RESTAURANT"], sortOrder: 90, aiInstruction: "Préparer un message simple et poli pour demander un avis Google après une visite, commande ou événement.", assistantMessage: "Je préparerai un message pour demander des avis Google. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_private_event", title: "Événement privé / groupe", description: "Mettez en avant vos services pour groupes.", icon: "🎉", triggerConfig: { repeat: "monthly", time: "10:00" }, contentType: "GENERAL", clientTypes: ["RESTAURANT"], sortOrder: 100, aiInstruction: "Préparer une publication pour anniversaires, repas d'équipe, groupes ou privatisations.", assistantMessage: "Je préparerai une publication pour vos événements privés. Je propose une fois par mois. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_client_newsletter", title: "Newsletter clients hebdomadaire", description: "Envoyez chaque semaine vos nouveautés.", icon: "✉️", triggerConfig: { repeat: "weekly", day: "friday", time: "10:00" }, contentType: "COMMUNITY_NEWS", channels: ["EMAIL"], clientTypes: ["RESTAURANT"], sortOrder: 110, aiInstruction: "Préparer un email court avec les nouveautés, menus, offres et événements du restaurant.", assistantMessage: "Je préparerai une newsletter clients chaque semaine. Je propose vendredi matin à 10h. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_signature_dish", title: "Plat signature", description: "Mettez en avant votre plat phare.", icon: "🍛", triggerConfig: { repeat: "weekly", day: "wednesday", time: "11:00" }, contentType: "GENERAL", clientTypes: ["RESTAURANT"], sortOrder: 120, aiInstruction: "Préparer régulièrement une publication autour d'un plat signature avec photo si disponible.", assistantMessage: "Je mettrai en avant votre plat signature. Je propose une fois par semaine. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_lunch_reminder", title: "Rappel déjeuner du midi", description: "Rappelez votre offre avant midi.", icon: "🥗", trigger: "DAILY", triggerConfig: { time: "11:00" }, contentType: "GENERAL", clientTypes: ["RESTAURANT"], sortOrder: 130, aiInstruction: "Préparer un message avant midi pour rappeler le menu ou l'offre du jour.", assistantMessage: "Je préparerai un rappel déjeuner avant midi. Je propose 11h. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_takeaway_order", title: "Rappel commande à emporter", description: "Encouragez les commandes à emporter.", icon: "🥡", triggerConfig: { repeat: "weekly", day: "thursday", time: "11:00" }, contentType: "GENERAL", clientTypes: ["RESTAURANT"], sortOrder: 140, aiInstruction: "Préparer une publication pour les commandes à emporter ou livraisons.", assistantMessage: "Je préparerai vos rappels de commande à emporter. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_special_evening", title: "Soirée spéciale", description: "Annoncez une soirée ou animation.", icon: "🎶", trigger: "BEFORE_EVENT", triggerConfig: { daysBefore: 7, time: "10:00" }, contentType: "EVENT_ANNOUNCEMENT", clientTypes: ["RESTAURANT"], sortOrder: 150, aiInstruction: "Préparer une communication pour une soirée à thème, animation ou dégustation.", assistantMessage: "Je préparerai vos annonces de soirées spéciales. Je propose 7 jours avant. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_last_tables", title: "Dernières tables disponibles", description: "Rappelez les dernières places restantes.", icon: "🪑", trigger: "MANUAL", contentType: "GENERAL", clientTypes: ["RESTAURANT"], sortOrder: 160, aiInstruction: "Préparer un message court quand il reste peu de tables disponibles.", assistantMessage: "Je préparerai un message pour les dernières tables. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_closure", title: "Fermeture / congés", description: "Annoncez vos fermetures ou vacances.", icon: "🏖️", trigger: "MANUAL", contentType: "GENERAL", clientTypes: ["RESTAURANT"], sortOrder: 170, aiInstruction: "Préparer une publication claire pour fermeture, congés ou reprise.", assistantMessage: "Je préparerai vos annonces de fermeture ou reprise. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_google_review_reply", title: "Avis Google à répondre", description: "Répondez plus vite aux avis reçus.", icon: "💬", trigger: "MANUAL", contentType: "GENERAL", channels: ["EMAIL"], clientTypes: ["RESTAURANT"], sortOrder: 180, aiInstruction: "Préparer des réponses courtes et professionnelles aux avis Google.", assistantMessage: "Je préparerai des réponses à vos avis Google. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_kitchen_backstage", title: "Coulisses cuisine", description: "Partagez les coulisses du restaurant.", icon: "👨‍🍳", triggerConfig: { repeat: "weekly", day: "tuesday", time: "16:00" }, contentType: "GENERAL", clientTypes: ["RESTAURANT"], sortOrder: 190, aiInstruction: "Demander une photo ou vidéo des coulisses, puis préparer une publication humaine et authentique.", assistantMessage: "Je vous rappellerai de partager les coulisses. Ça vous convient ?" }),
  publication({ id: "profile_restaurant_group_offer", title: "Offre groupe / entreprise", description: "Présentez vos offres pour groupes.", icon: "🤝", triggerConfig: { repeat: "monthly", time: "10:00" }, contentType: "GENERAL", clientTypes: ["RESTAURANT"], sortOrder: 200, aiInstruction: "Préparer une publication pour menus groupes, repas d'équipe, plateaux ou privatisations.", assistantMessage: "Je préparerai vos offres pour groupes et entreprises. Ça vous convient ?" }),
];

export const GENERAL_DEFAULT_AUTOMATION_PUBLICATIONS: SuggestedAutomationPublication[] = [
  publication({ id: "default_annonce_j10", title: "Rappel J-10", description: "Annoncez un événement 10 jours avant.", icon: "📣", trigger: "BEFORE_EVENT", triggerConfig: { daysBefore: 10, time: "10:00" }, contentType: "EVENT_ANNOUNCEMENT", sortOrder: 10, aiInstruction: "Surveiller les événements de l'Agenda connecté IA et préparer une annonce 10 jours avant.", assistantMessage: "Je préparerai un rappel 10 jours avant vos événements. Ça vous convient ?" }),
  publication({ id: "default_rappel_j5", title: "Rappel J-5", description: "Relancez quelques jours avant l'événement.", icon: "🔔", trigger: "BEFORE_EVENT", triggerConfig: { daysBefore: 5, time: "10:00" }, contentType: "EVENT_REMINDER", sortOrder: 20, aiInstruction: "Préparer un rappel court 5 jours avant l'événement.", assistantMessage: "Je préparerai un rappel 5 jours avant vos événements. Ça vous convient ?" }),
  publication({ id: "default_rappel_jj", title: "Rappel J-J", description: "Rappelez l'événement le jour même.", icon: "⏰", trigger: "EVENT_DAY", triggerConfig: { time: "08:00" }, contentType: "EVENT_DAY", sortOrder: 30, aiInstruction: "Préparer une publication courte le matin de l'événement.", assistantMessage: "Je préparerai un rappel le matin de chaque événement. Ça vous convient ?" }),
  publication({ id: "default_newsletter_hebdomadaire", title: "Newsletter hebdomadaire", description: "Envoyez chaque semaine un résumé par email.", icon: "✉️", triggerConfig: { repeat: "weekly", day: "friday", time: "10:00" }, contentType: "COMMUNITY_NEWS", channels: ["EMAIL"], sortOrder: 40, aiInstruction: "Préparer un email hebdomadaire à partir de l'Agenda connecté IA, des ressources, photos, notes, messages et historiques disponibles.", assistantMessage: "Je préparerai une newsletter chaque semaine. Je propose vendredi matin à 10h. Ça vous convient ?" }),
  publication({ id: "default_recap_mensuel", title: "Récap du mois", description: "Résumez les activités importantes du mois.", icon: "🗓️", triggerConfig: { repeat: "monthly", dayOfMonth: 15, time: "10:00" }, contentType: "COMMUNITY_NEWS", sortOrder: 50, aiInstruction: "Préparer un récap mensuel à partir des événements, ressources et informations disponibles.", assistantMessage: "Je préparerai un récap mensuel. Je propose le 15 du mois à 10h. Ça vous convient ?" }),
  publication({ id: "default_programme_semaine", title: "Programme de la semaine", description: "Présentez les actions prévues cette semaine.", icon: "📅", triggerConfig: { repeat: "weekly", day: "monday", time: "09:00" }, contentType: "COMMUNITY_NEWS", sortOrder: 60, aiInstruction: "Récupérer les éléments prévus dans l'Agenda connecté IA et préparer une publication simple.", assistantMessage: "Je préparerai votre programme de la semaine. Je propose lundi matin. Ça vous convient ?" }),
  publication({ id: "default_service", title: "Mise en avant d'un service", description: "Présentez régulièrement un service important.", icon: "🚀", triggerConfig: { repeat: "monthly", time: "10:00" }, contentType: "GENERAL", sortOrder: 70, aiInstruction: "Préparer une publication courte pour mettre en avant un service choisi par l'utilisateur.", assistantMessage: "Je mettrai en avant un service régulièrement. Je propose une fois par mois. Ça vous convient ?" }),
  publication({ id: "default_inscription", title: "Rappel d'inscription", description: "Rappelez une inscription avant une date limite.", icon: "📝", trigger: "BEFORE_EVENT", triggerConfig: { daysBefore: 3, time: "10:00" }, contentType: "EVENT_REMINDER", sortOrder: 80, aiInstruction: "Préparer un message court pour inviter les personnes à s'inscrire avant une échéance.", assistantMessage: "Je préparerai vos rappels d'inscription. Je propose 3 jours avant. Ça vous convient ?" }),
  publication({ id: "default_avis_google", title: "Avis Google à demander", description: "Invitez vos clients ou participants à laisser un avis.", icon: "⭐", trigger: "MANUAL", contentType: "GENERAL", channels: ["WHATSAPP", "EMAIL"], sortOrder: 90, aiInstruction: "Préparer un message simple pour demander un avis Google.", assistantMessage: "Je préparerai un message pour demander des avis Google. Ça vous convient ?" }),
  publication({ id: "default_temoignage_client", title: "Témoignage client / participant", description: "Transformez un retour positif en publication.", icon: "💬", trigger: "MANUAL", contentType: "GENERAL", sortOrder: 100, aiInstruction: "Transformer un avis, retour ou message positif en publication courte.", assistantMessage: "Je transformerai vos retours positifs en publications. Ça vous convient ?" }),
  publication({ id: "default_offre_speciale", title: "Offre spéciale", description: "Annoncez une offre ou opportunité.", icon: "🏷️", trigger: "MANUAL", contentType: "GENERAL", sortOrder: 110, aiInstruction: "Préparer une publication pour une promotion, offre limitée ou opportunité.", assistantMessage: "Je préparerai vos offres spéciales quand vous en avez besoin. Ça vous convient ?" }),
  publication({ id: "default_question_communaute", title: "Question à la communauté", description: "Créez de l'interaction avec une question simple.", icon: "❔", triggerConfig: { repeat: "weekly", day: "wednesday", time: "10:00" }, contentType: "GENERAL", sortOrder: 120, aiInstruction: "Préparer une question courte pour engager les abonnés.", assistantMessage: "Je préparerai une question courte pour engager votre communauté. Ça vous convient ?" }),
  publication({ id: "default_welcome_message", title: "Message de bienvenue", description: "Accueillez vos nouveaux abonnés ou membres.", icon: "👋", trigger: "MANUAL", contentType: "GENERAL", sortOrder: 130, aiInstruction: "Préparer un message de bienvenue court et chaleureux.", assistantMessage: "Je préparerai un message de bienvenue court et chaleureux. Ça vous convient ?" }),
  publication({ id: "default_recap_apres_evenement", title: "Récap après événement", description: "Partagez un résumé après un événement.", icon: "✨", trigger: "AFTER_EVENT", contentType: "EVENT_RECAP", sortOrder: 140, aiInstruction: "Demander photos ou vidéos si besoin, puis préparer un récap court.", assistantMessage: "Je préparerai un récap après vos événements. Ça vous convient ?" }),
  publication({ id: "default_publication_photo", title: "Publication avec photo", description: "Ajoutez une photo, l'IA prépare le texte.", icon: "📷", trigger: "MANUAL", contentType: "GENERAL", sortOrder: 150, aiInstruction: "Demander une photo au bon moment, puis préparer une publication adaptée.", assistantMessage: "Je vous demanderai une photo puis je préparerai le texte. Ça vous convient ?" }),
  publication({ id: "default_communication_urgente", title: "Communication urgente", description: "Préparez rapidement un message important.", icon: "🚨", trigger: "MANUAL", contentType: "GENERAL", sortOrder: 160, aiInstruction: "Aider à rédiger une communication rapide : annulation, changement d'horaire ou information urgente.", assistantMessage: "Je préparerai rapidement vos communications urgentes. Ça vous convient ?" }),
];

const PROFILE_DEFAULT_AUTOMATION_PUBLICATIONS: Record<string, SuggestedAutomationPublication[]> = {
  SYNAGOGUE: SYNAGOGUE_DEFAULT_AUTOMATION_PUBLICATIONS,
  RESTAURANT: RESTAURANT_DEFAULT_AUTOMATION_PUBLICATIONS,
};

export function getDefaultAutomationPublicationsForProfile(type: string | null | undefined) {
  const normalized = (type ?? "").trim().toUpperCase();
  return PROFILE_DEFAULT_AUTOMATION_PUBLICATIONS[normalized] ?? [];
}

export function isDefaultAutomationPublicationId(id: string | null | undefined) {
  return Boolean(id?.startsWith("default_") || id?.startsWith("profile_"));
}
