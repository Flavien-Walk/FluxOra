// FAQ de la landing — partagée entre l'affichage (FAQSection) et les données structurées SEO (FAQPage).
// Chaque réponse décrit ce que le produit fait réellement aujourd'hui (pas de promesse non tenue).
export const FAQS = [
  {
    q: 'Fluxora est-il une banque ?',
    a: "Non. Fluxora est un logiciel de pilotage financier, pas un établissement bancaire ni de paiement : nous ne détenons pas vos fonds. Le paiement en ligne des factures passe par Stripe, établissement de paiement agréé. Les virements, cartes et placements présentés dans la bêta sont des simulations destinées à la démonstration.",
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: "Les échanges sont chiffrés (HTTPS), la base de données est chiffrée au repos et les accès de connexion aux réseaux sociaux sont chiffrés. Chaque membre a un rôle (lecteur, manager, finance, admin) et les actions sensibles sont journalisées. L'API et la base sont hébergées dans l'Union européenne ; l'interface (Vercel) et l'authentification (Clerk) sont fournies par des prestataires américains encadrés par des garanties contractuelles. Le détail est dans notre politique de confidentialité.",
  },
  {
    q: 'Combien coûte Fluxora ?',
    a: "Fluxora est actuellement en bêta : l'accès est gratuit pendant cette phase. Les tarifs affichés sont indicatifs et pourront évoluer avant le lancement commercial.",
  },
  {
    q: 'Fluxora est-il compatible avec mon expert-comptable ?',
    a: "Fluxora génère un journal comptable à partir de vos factures, paiements et dépenses, ainsi qu'un relevé de TVA exportable en PDF. L'export au format FEC et l'accès dédié pour votre comptable sont en cours de développement.",
  },
  {
    q: 'Combien de temps pour démarrer ?',
    a: 'Quelques minutes : créez votre compte, renseignez votre organisation, ajoutez un client et envoyez votre premier devis.',
  },
  {
    q: "Fluxora utilise-t-il l'intelligence artificielle ?",
    a: "Oui, un assistant IA (modèle Claude d'Anthropic) peut préparer des devis, retrouver des factures ou rédiger des posts LinkedIn. Il ne réalise aucune action sans votre validation, et vous pouvez le désactiver dans Paramètres → Confidentialité.",
  },
  {
    q: 'Puis-je récupérer ou supprimer mes données ?',
    a: "Oui. Depuis Paramètres → Confidentialité, un administrateur peut exporter toutes les données de l'organisation (fichier JSON) et le propriétaire peut supprimer définitivement l'organisation. Pensez à conserver vos pièces comptables : la loi impose de les garder 10 ans.",
  },
];
