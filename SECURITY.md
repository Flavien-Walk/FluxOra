# Politique de sécurité — Fluxora

## Signaler une vulnérabilité
Écrivez à **mvpfintech798@gmail.com** avec l'objet « [SECURITE] ». Décrivez la faille, les étapes pour la reproduire
et son impact. N'exploitez pas la faille au-delà de la preuve, et n'accédez pas aux données d'autres utilisateurs.
Nous accusons réception sous 72 h et publions un correctif dès que possible.

## Mesures en place
| Domaine | Mesure |
|---|---|
| Authentification | Clerk (sessions signées), routes privées protégées côté Next.js et API |
| Autorisations | Cloisonnement par organisation sur toutes les requêtes ; rôles viewer / manager / finance / admin appliqués côté API |
| Entrées | Validation des montants, IBAN (modulo 97), BIC, URL d'images (anti-SSRF) |
| Transport et en-têtes | HTTPS/HSTS, helmet (API), CSP anti-clickjacking, X-Content-Type-Options, Referrer-Policy (front) |
| Abus | Limites de débit : 60 req/min par IP (routes publiques), 300 req/min par utilisateur (API) |
| Paiement | Stripe Checkout ; une facture ne passe « payée » que par le webhook signé (idempotent). Mode démo explicite `DEMO_PAYMENTS=true` |
| Secrets | Variables d'environnement Render / Vercel uniquement ; jetons OAuth chiffrés AES-256-GCM |
| Traçabilité | Journal d'audit des écritures (IP tronquée, conservation 12 mois) |
| Dépendances | `npm audit` à 0 vulnérabilité en production (septembre 2026) ; Dependabot hebdomadaire |
| IA | Consignes anti-injection ; aucune action sans confirmation humaine ; IA désactivable par organisation |

## Rotation des secrets
En cas de fuite suspectée : régénérer la clé Clerk, le mot de passe MongoDB Atlas et les clés Stripe, Brevo,
Anthropic, LinkedIn et Unsplash, puis mettre à jour Render et Vercel. Voir `docs/rgpd/procedure-violation.md`.
