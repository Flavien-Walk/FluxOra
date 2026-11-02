# Registre des activités de traitement (art. 30 RGPD)

> Projet étudiant Epitech en bêta non commerciale. Document de travail à faire valider par un DPO ou un juriste.
> Contact : mvpfintech798@gmail.com — Dernière mise à jour : septembre 2026.

| # | Traitement | Finalité | Personnes concernées | Données | Base légale | Destinataires / sous-traitants | Hors UE | Conservation |
|---|---|---|---|---|---|---|---|---|
| 1 | Comptes utilisateurs | Accès au service | Utilisateurs | Nom, email, identifiant | Contrat | Clerk | USA (DPF / CCT) | Durée du compte |
| 2 | Gestion commerciale | Devis, factures, clients | Clients des utilisateurs (tiers) | Nom, email, téléphone, adresse, SIRET, montants | Contrat (Fluxora = sous-traitant de l'utilisateur) | MongoDB Atlas (Paris), Render (Francfort) | Non (sociétés US : DPF) | Durée du compte ; 10 ans pour les pièces comptables (à la charge de l'utilisateur) |
| 3 | Envoi d'emails | Envoi des devis et factures | Clients des utilisateurs | Email, nom, document | Contrat | Brevo | Non | Journaux Brevo |
| 4 | Suivi d'ouverture | Savoir si un email a été ouvert | Clients des utilisateurs | Date d'ouverture | Désactivé par défaut ; activé par l'utilisateur sous sa responsabilité | — | — | Durée du document |
| 5 | Dépenses et OCR | Saisie des dépenses | Utilisateurs, fournisseurs | Montants, fournisseurs, reçus | Contrat | Mindee | Non | Durée du compte |
| 6 | Virements / bénéficiaires (simulés) | Démonstration | Bénéficiaires | Nom, IBAN, BIC, email | Contrat | — | — | Durée du compte |
| 7 | Assistant IA | Réponses, brouillons | Utilisateurs, tiers cités | Messages, extraits de données de gestion | Contrat ; fonction désactivable | Anthropic | USA (CCT / DPA) | Non conservé par Fluxora au-delà de la session |
| 8 | Communication LinkedIn | Rédiger et publier des posts | Utilisateurs | Texte, image, jeton OAuth chiffré, nom et photo de profil LinkedIn | Contrat | LinkedIn, Unsplash | Irlande / USA | Jusqu'à déconnexion ou 60 jours |
| 9 | Paiement des factures | Encaissement | Payeurs | Montant, référence ; carte gérée par Stripe | Contrat | Stripe | USA (DPF) | Obligations légales de Stripe |
| 10 | Journal d'audit | Sécurité, preuve | Utilisateurs, visiteurs des liens publics | Identifiant, action, date, IP tronquée | Intérêt légitime | MongoDB Atlas | Non | 12 mois (suppression automatique) |

## Mesures de sécurité
Voir `SECURITY.md`.
