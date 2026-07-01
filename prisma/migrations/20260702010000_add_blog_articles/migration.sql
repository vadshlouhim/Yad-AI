CREATE TYPE "BlogArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "BlogArticle" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'Communication IA',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "coverImageUrl" TEXT,
  "coverImageAlt" TEXT NOT NULL,
  "metaTitle" TEXT NOT NULL,
  "metaDescription" TEXT NOT NULL,
  "canonicalUrl" TEXT,
  "authorName" TEXT NOT NULL DEFAULT 'Équipe EasyCom IA',
  "readingMinutes" INTEGER NOT NULL DEFAULT 3,
  "status" "BlogArticleStatus" NOT NULL DEFAULT 'DRAFT',
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "isIndexable" BOOLEAN NOT NULL DEFAULT true,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlogArticle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlogArticle_slug_key" ON "BlogArticle"("slug");
CREATE INDEX "BlogArticle_slug_idx" ON "BlogArticle"("slug");
CREATE INDEX "BlogArticle_status_idx" ON "BlogArticle"("status");
CREATE INDEX "BlogArticle_isFeatured_idx" ON "BlogArticle"("isFeatured");
CREATE INDEX "BlogArticle_publishedAt_idx" ON "BlogArticle"("publishedAt");

INSERT INTO "BlogArticle" (
  "id", "slug", "title", "excerpt", "content", "category", "tags", "coverImageAlt",
  "metaTitle", "metaDescription", "authorName", "readingMinutes", "status", "isFeatured", "isIndexable", "publishedAt"
) VALUES
('blog_communication-ia-communautes', 'communication-ia-communautes', 'Comment l''IA transforme la communication des communautés',
'Une méthode concrète pour centraliser messages, réseaux sociaux, emails et rappels sans perdre l''identité humaine de votre structure.',
'L''intelligence artificielle devient utile quand elle simplifie les gestes répétitifs sans remplacer le discernement humain. Pour une communauté, cela signifie préparer les annonces, relances, réponses et publications dans un espace unique.

Avec EasyCom IA, l''objectif n''est pas de publier davantage pour publier davantage. L''objectif est de publier mieux, au bon moment, avec un ton cohérent. Les messages WhatsApp, emails, publications Instagram, Facebook et rappels d''événements peuvent être préparés depuis une même logique éditoriale.

Un bon système commence par trois fondations : un agenda clair, des canaux connectés et une mémoire éditoriale. L''agenda évite les oublis. Les canaux connectés évitent la duplication. La mémoire éditoriale permet à l''IA de respecter le vocabulaire, le ton et les usages de la structure.',
'Communication IA', ARRAY['communication IA','communauté','productivité','EasyCom IA'], 'Tableau de bord IA pour communication communautaire',
'Comment l''IA transforme la communication des communautés - EasyCom IA', 'Découvrez comment l''IA aide les communautés, associations et synagogues à mieux organiser leur communication quotidienne.', 'Équipe EasyCom IA', 3, 'PUBLISHED', true, true, CURRENT_TIMESTAMP),
('blog_planification-instagram-facebook-whatsapp', 'planification-instagram-facebook-whatsapp', 'Planifier Instagram, Facebook et WhatsApp sans multiplier les outils',
'Pourquoi une stratégie multicanale simple aide à rester visible sans transformer la communication en charge mentale.',
'La difficulté d''une communication multicanale n''est pas seulement de créer du contenu. Elle est de garder une cohérence entre les plateformes. Instagram privilégie le visuel, Facebook contextualise, WhatsApp crée la proximité.

Une organisation efficace consiste à partir d''un message source, puis à l''adapter. Une annonce d''événement peut devenir une publication Instagram, un post Facebook plus détaillé et un rappel WhatsApp court. L''IA accélère cette adaptation tout en gardant la validation humaine.

Le calendrier éditorial doit rester lisible : temps forts, rappels, publications récurrentes, puis récapitulatifs. EasyCom IA réunit ces usages dans le dashboard pour éviter les copier-coller dispersés.',
'Réseaux sociaux', ARRAY['Instagram','Facebook','WhatsApp','planification'], 'Calendrier éditorial pour réseaux sociaux',
'Planifier Instagram, Facebook et WhatsApp - EasyCom IA', 'Apprenez à organiser Instagram, Facebook et WhatsApp dans un seul calendrier éditorial simple et efficace.', 'Équipe EasyCom IA', 3, 'PUBLISHED', true, true, CURRENT_TIMESTAMP),
('blog_whatsapp-communautaire-bonnes-pratiques', 'whatsapp-communautaire-bonnes-pratiques', 'WhatsApp communautaire : bonnes pratiques pour informer sans saturer',
'Fréquence, clarté, consentement et segmentation : les règles simples pour que WhatsApp reste un canal utile.',
'WhatsApp est un canal puissant parce qu''il est direct. C''est aussi pour cette raison qu''il doit être utilisé avec retenue. Un message utile arrive au bon moment, avec une intention claire.

La première règle consiste à segmenter les destinataires. Tous les contacts n''ont pas besoin de recevoir toutes les annonces. Les rappels d''événements, les informations urgentes et les messages récurrents doivent être distingués.

EasyCom IA permet de préparer le texte, prévisualiser le rendu et envoyer seulement après validation. Cette étape de contrôle protège la relation de confiance avec les membres.',
'WhatsApp', ARRAY['WhatsApp','messages','contacts','segmentation'], 'Conversation WhatsApp communautaire organisée',
'WhatsApp communautaire : bonnes pratiques - EasyCom IA', 'Conseils pratiques pour utiliser WhatsApp dans une communication communautaire respectueuse et efficace.', 'Équipe EasyCom IA', 2, 'PUBLISHED', false, true, CURRENT_TIMESTAMP),
('blog_repondre-avis-google-avec-ia', 'repondre-avis-google-avec-ia', 'Répondre aux avis Google avec l''IA tout en gardant un ton humain',
'Une réponse rapide peut améliorer la relation client, mais elle doit rester personnalisée et fidèle à votre voix.',
'Les avis Google participent à la confiance et au référencement local. Répondre vite est important, mais répondre juste l''est encore plus. Une réponse générique peut donner une impression froide.

L''IA doit proposer une base : remerciement, reprise du contexte, réponse au point soulevé, invitation à poursuivre l''échange si nécessaire. L''humain garde le dernier mot avant publication.

Pour une structure locale, les avis sont aussi une source d''apprentissage. Ils révèlent les attentes, les incompréhensions et les points forts.',
'Référencement', ARRAY['avis Google','réputation','réponse IA','SEO local'], 'Avis Google et réponse assistée par IA',
'Répondre aux avis Google avec l''IA - EasyCom IA', 'Méthode pour répondre aux avis Google avec l''IA sans perdre la personnalisation et la qualité relationnelle.', 'Équipe EasyCom IA', 2, 'PUBLISHED', false, true, CURRENT_TIMESTAMP),
('blog_email-association-automatisation', 'email-association-automatisation', 'Email associatif : automatiser sans perdre la personnalisation',
'Comment préparer newsletters, rappels et réponses avec une IA qui respecte le contexte de chaque communauté.',
'L''email reste un canal solide pour les informations détaillées. Il est moins immédiat que WhatsApp, mais plus adapté aux contenus structurés : programme, compte rendu, campagne de dons, annonce importante.

L''automatisation utile commence par le tri. Quels emails nécessitent une réponse ? Lesquels peuvent attendre ? Lesquels doivent devenir une action dans l''agenda ?

Ensuite vient la rédaction assistée. Une IA peut proposer une réponse claire, mais elle doit s''appuyer sur le contexte : nom de la communauté, ton, habitudes, liens importants.',
'Email', ARRAY['email','association','newsletter','automatisation'], 'Boîte email triée par intelligence artificielle',
'Email associatif et automatisation IA - EasyCom IA', 'Guide pour automatiser la communication email d''une association tout en gardant un ton personnel.', 'Équipe EasyCom IA', 2, 'PUBLISHED', false, true, CURRENT_TIMESTAMP),
('blog_calendrier-editorial-chabbat-evenements', 'calendrier-editorial-chabbat-evenements', 'Construire un calendrier éditorial autour de Chabbat et des événements',
'Une méthode simple pour anticiper les temps forts, rappels et publications récurrentes.',
'Les communautés ont des rythmes naturels : Chabbat, fêtes, cours, repas, campagnes et événements ponctuels. Le calendrier éditorial doit suivre ces rythmes plutôt que créer une pression artificielle.

Une bonne organisation distingue les contenus récurrents, les annonces à préparer, les rappels et les récapitulatifs. Chaque contenu peut ensuite être adapté aux canaux : image Instagram, post Facebook, message WhatsApp, email.

L''automatisation devient pertinente lorsqu''elle respecte ce calendrier. Elle ne remplace pas la décision, elle prépare les bons éléments au bon moment.',
'Automatisation', ARRAY['Chabbat','événements','calendrier éditorial','rappels'], 'Calendrier éditorial pour Chabbat et événements',
'Calendrier éditorial Chabbat et événements - EasyCom IA', 'Organisez un calendrier éditorial régulier autour de Chabbat, fêtes, cours et événements communautaires.', 'Équipe EasyCom IA', 2, 'PUBLISHED', false, true, CURRENT_TIMESTAMP),
('blog_seo-local-ia-communication', 'seo-local-ia-communication', 'SEO local et IA : comment rendre votre structure plus visible',
'Les contenus utiles, avis Google, pages claires et données structurées renforcent la visibilité locale et IA.',
'Le référencement local repose sur la cohérence : un site clair, des informations à jour, des avis suivis, des pages utiles et une structure technique propre.

Les moteurs de recherche et assistants IA valorisent les contenus explicites. Une page doit répondre à une intention. Un article doit traiter un sujet avec précision. Un titre doit annoncer clairement la promesse.

Les données structurées, le sitemap et les pages légales renforcent la lisibilité technique. Les liens internes aident les moteurs à comprendre les relations entre les pages.',
'Référencement', ARRAY['SEO local','IA','Google','visibilité'], 'Référencement local Google et intelligence artificielle',
'SEO local et IA pour rendre votre structure visible - EasyCom IA', 'Comprendre comment l''IA, le contenu utile et le SEO local renforcent la visibilité d''une structure.', 'Équipe EasyCom IA', 2, 'PUBLISHED', true, true, CURRENT_TIMESTAMP),
('blog_association-reseaux-sociaux-regularite', 'association-reseaux-sociaux-regularite', 'Pourquoi la régularité compte plus que la quantité sur les réseaux sociaux',
'Publier moins mais mieux : une stratégie réaliste pour associations, commerces et communautés.',
'La régularité crée la confiance. Une structure qui communique de manière stable devient plus lisible pour son public. Cela ne signifie pas publier tous les jours, mais tenir un rythme réaliste.

Un bon rythme peut être hebdomadaire : une annonce, un rappel, puis un récapitulatif. Pour certains événements, une séquence J-10, J-5 et jour J suffit.

L''IA aide à transformer ce rythme en système. Elle propose les textes, adapte les formats et évite les oublis, mais la validation reste centrale.',
'Réseaux sociaux', ARRAY['régularité','réseaux sociaux','association','contenu'], 'Planning simple de publications régulières',
'Régularité sur les réseaux sociaux - EasyCom IA', 'Découvrez pourquoi une communication régulière et cohérente est plus efficace qu''une publication intensive.', 'Équipe EasyCom IA', 2, 'PUBLISHED', false, true, CURRENT_TIMESTAMP),
('blog_centraliser-contacts-communication', 'centraliser-contacts-communication', 'Centraliser ses contacts pour mieux communiquer',
'Une base de contacts propre améliore les emails, WhatsApp, rappels et campagnes ciblées.',
'La qualité d''une communication dépend aussi de la qualité de la base de contacts. Un message pertinent envoyé aux mauvaises personnes perd son efficacité.

Centraliser les contacts permet de segmenter : membres actifs, donateurs, participants, familles, prospects, bénévoles. Chaque groupe peut recevoir un message adapté.

Cette organisation réduit aussi les erreurs : doublons, anciens numéros, emails invalides, oublis. Elle facilite les campagnes de dons, les rappels d''événements et les suivis personnalisés.',
'Associations', ARRAY['contacts','segmentation','CRM','communication'], 'Contacts organisés pour communication ciblée',
'Centraliser ses contacts pour mieux communiquer - EasyCom IA', 'Pourquoi centraliser les contacts améliore fortement la pertinence des messages et campagnes.', 'Équipe EasyCom IA', 2, 'PUBLISHED', false, true, CURRENT_TIMESTAMP),
('blog_pages-legales-confiance-seo', 'pages-legales-confiance-seo', 'Pages légales, cookies et confiance : un socle souvent négligé',
'Les pages légales ne servent pas seulement à cocher une case : elles rassurent les utilisateurs et clarifient le cadre.',
'Un site sérieux doit rendre ses règles faciles à trouver. Conditions d''utilisation, confidentialité, cookies, contact et suppression des données créent un cadre lisible.

Ces pages aident l''utilisateur à comprendre comment le service fonctionne, quelles données sont utilisées et comment exercer ses droits. Elles aident aussi les moteurs à interpréter le site comme une entité structurée.

Le plan du site HTML complète le sitemap XML. Le premier aide les visiteurs, le second aide les robots d''exploration.',
'Référencement', ARRAY['pages légales','cookies','confiance','RGPD'], 'Documents légaux et confiance numérique',
'Pages légales, cookies et confiance SEO - EasyCom IA', 'Comprendre pourquoi les pages légales, cookies et confidentialité renforcent la confiance et la clarté SEO.', 'Équipe EasyCom IA', 2, 'PUBLISHED', false, true, CURRENT_TIMESTAMP);
