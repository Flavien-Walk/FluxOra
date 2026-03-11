# FLUXORA — Documentation Projet Complète

> Version Mars 2026 — Flavien Walk, Obinna, Maxime

---

## Table des matières

1. [Contexte & Vision](#1-contexte--vision)
2. [Proposition de valeur](#2-proposition-de-valeur)
3. [Segmentation client](#3-segmentation-client)
4. [Solution & Fonctionnalités](#4-solution--fonctionnalités)
5. [Architecture technique](#5-architecture-technique)
6. [Déploiement](#6-déploiement)
7. [Modèle économique](#7-modèle-économique)
8. [Stratégie réglementaire](#8-stratégie-réglementaire)
9. [Cartographie des risques](#9-cartographie-des-risques)
10. [Roadmap produit](#10-roadmap-produit)
11. [Conventions de développement](#11-conventions-de-développement)

---

## 1. Contexte & Vision

### Qu'est-ce que Fluxora ?

Fluxora est une **plateforme financière SaaS B2B** destinée aux freelances et PME européennes. Elle centralise la gestion financière quotidienne en un seul outil : facturation, devis, dépenses, trésorerie et comptabilité automatisée.

À terme, Fluxora ambitionne de devenir un véritable **copilote financier intelligent** pour les PME — capable d'analyser automatiquement la santé financière d'une entreprise, d'anticiper les problèmes de trésorerie, d'optimiser les paiements fournisseurs et de générer les documents comptables sans intervention manuelle.

### Stratégie réglementaire progressive

Le projet suit une trajectoire en trois phases, inspirée de Qonto, N26, Stripe et Wise :

```
Phase 1          Phase 2              Phase 3
BaaS  ────────►  Licence EMI  ──────►  Financial Platform / Hybrid

Speed            Control              Autonomy
```

- **Phase 1** — lancement via partenaire BaaS (Solaris) : 6 à 9 mois, capital réduit, focus produit
- **Phase 2** — obtention d'une licence EMI dès que les métriques le justifient (≥ 50 000 comptes, ≥ 50M€/mois)
- **Phase 3** — plateforme financière hybride, marketplace de services financiers embarqués

> La licence bancaire directe est délibérément écartée à court terme : incompatible avec le rythme et le capital d'une startup.

---

## 2. Proposition de valeur

- **Gestion financière unifiée** : devis → facture → paiement en flux continu, sans jongler entre plusieurs outils
- **Automatisation comptable** : journal débit/crédit généré automatiquement à chaque transaction
- **Visibilité temps réel** : dashboard KPIs, cashflow, alertes budgétaires
- **Pages publiques client** : le client reçoit un email, consulte son devis, l'accepte ou refuse, et paie sa facture — sans compte Fluxora
- **Tracking email** : l'émetteur voit si son email a été ouvert, si le document a été consulté
- **Copilote financier IA** *(roadmap)* : analyse des dépenses, prévision de trésorerie, score de santé financière

---

## 3. Segmentation client

| Segment | Profil | Besoins principaux |
|---|---|---|
| **Freelance** (entrée de gamme) | 1 personne, faible volume de transactions | Simplicité, prix accessible, auto-décideur |
| **PME principale** (50–249 salariés) | Multi-utilisateurs, volume élevé | Contrôle budgétaire par équipe, reporting avancé, intégration comptable, validation des dépenses — Décideurs : CFO, DAF, CEO |

---

## 4. Solution & Fonctionnalités

### 4.1 Modules actuellement implémentés

#### Authentification & Organisation
- Sign-up / sign-in via Clerk
- Onboarding guidé : création de l'organisation (nom, SIRET, TVA, devise)
- Gestion des membres avec rôles : `admin`, `finance`, `manager`, `viewer`
- Multi-tenant : toutes les données sont isolées par `organizationId`

#### CRM Clients
- CRUD complet des clients (nom, email, téléphone, société, adresse, SIRET, TVA)
- Recherche full-text, pagination backend
- Notes internes par client

#### Factures
- Création avec lignes de détail (description, quantité, prix unitaire, taux TVA)
- Calcul HT / TVA / TTC automatique
- Numérotation automatique `FAC-YYYY-###`
- Cycle de vie complet : `draft` → `sent` → `email_opened` → `viewed` → `payment_pending` → `paid` / `late` / `cancelled`
- Envoi email professionnel via Brevo (template HTML)
- Tracking pixel : détection d'ouverture email, enregistrement d'événement horodaté
- Page de paiement publique (`/pay/[token]`) — 5 méthodes simulées (carte, virement, SEPA, Apple Pay, Google Pay)
- Timeline des événements sur la page de détail
- Intégration Stripe (structure prête, clés à activer en production)

#### Devis
- CRUD complet, numérotation `DEV-YYYY-###`
- Même calcul TVA automatique que les factures
- Cycle de vie : `draft` → `sent` → `email_opened` → `viewed` → `accepted` / `refused` / `expired`
- Envoi email avec tracking pixel
- Page publique client (`/q/[token]`) : consulter, accepter ou refuser sans compte
- Expiration automatique si `expiryDate` dépassée
- Conversion devis → facture en un clic
- Timeline des événements

#### Dépenses
- CRUD avec 9 catégories : `marketing`, `software`, `salaries`, `suppliers`, `taxes`, `banking`, `travel`, `office`, `other`
- Création automatique d'une écriture comptable (débit) à chaque dépense
- Suppression en cascade (dépense + écriture liée)
- Champ `receiptUrl` pour justificatifs

#### Comptabilité
- Journal des écritures débit/crédit
- Génération automatique des écritures : factures payées (crédit), dépenses (débit), paiements Stripe
- Écritures manuelles (ajout/suppression)
- Filtrage par type, source, période
- Calcul du solde net (crédits − débits)

#### Dashboard
- KPIs temps réel (CA total, CA du mois, factures en attente, en retard)
- Graphique d'évolution CA sur 6 mois (Recharts)
- Répartition dépenses par catégorie (annuel)
- Rafraîchissement automatique toutes les 60 secondes

---

### 4.2 Fonctionnalités en cours / à compléter (priorité immédiate)

| Module | Ce qui reste |
|---|---|
| Routes publiques backend | Créer `publicController.js` + `routes/public.js` (tracking + paiement simulé) |
| Modèles Invoice + Quote | Ajouter `trackingToken`, `events[]`, statuts étendus |
| Email service | Pixel tracking + boutons d'action dans les templates |
| Page Settings | Formulaire de mise à jour organisation (nom, SIRET, TVA, devise) |
| Page Client detail | Infos client + liste factures + liste devis |

---

### 4.3 Fonctionnalités futures — Roadmap IA & Intelligence financière

Les trois axes suivants constituent la **vision produit à moyen terme** de Fluxora. Ils transforment l'outil de gestion en un véritable copilote financier.

---

#### A. Assistant financier IA

Un assistant intégré dans le dashboard qui analyse en temps réel les données financières de l'organisation et produit des recommandations actionnables.

**Analyse des dépenses**
- Détection des dépenses récurrentes et des anomalies (pic inhabituel sur une catégorie)
- Comparaison mois/mois et année/année par catégorie
- Identification des fournisseurs les plus coûteux et évolution dans le temps
- Suggestions de réduction : abonnements SaaS inutilisés détectés, doublons fournisseurs

**Répartition et contrôle budgétaire**
- Définition de budgets par catégorie de dépense
- Alertes en temps réel quand un seuil est approché ou dépassé
- Vue d'ensemble de la consommation budgétaire par période et par équipe

**Prévisions de trésorerie**
- Modèle de projection basé sur l'historique (revenus récurrents, dépenses fixes vs variables)
- Simulation de scénarios : "si je règle ce fournisseur aujourd'hui, quel est mon solde dans 30 jours ?"
- Alertes prédictives : détection d'un risque de trésorerie négative avant qu'il survienne
- Visualisation du cashflow prévisionnel sur 30 / 60 / 90 jours

**Gestion intelligente des fournisseurs**
- Analyse des délais de paiement fournisseurs et impact sur le BFR
- Recommandation d'ordonnancement des paiements pour optimiser la trésorerie
- Détection des fournisseurs en retard de livraison ou de facturation
- Suggestion de négociation : fournisseurs où l'historique justifie de demander de meilleures conditions

**Interface**
- Chat contextuel (type "Quelle est ma dépense software ce trimestre ?")
- Résumé hebdomadaire automatique : "Voici ce qui s'est passé cette semaine financièrement"
- Recommandations proactives affichées sur le dashboard

---

#### B. Score de santé financière (Financial Health Score)

Un **score dynamique** calculé automatiquement à partir des données de l'organisation, jouant le rôle d'un "credit score interne" pour les PME.

**Objectif**
Donner à chaque organisation une vision synthétique et objective de sa santé financière — sans nécessiter de comptable ni d'analyste financier.

**Composantes du score (ex : score sur 100)**

| Composante | Poids | Ce qui est analysé |
|---|---|---|
| **Liquidité** | 25% | Ratio trésorerie disponible / dépenses mensuelles moyennes. Idéal : ≥ 3 mois de runway |
| **Rentabilité** | 25% | Marge nette (CA − dépenses totales) sur les 3 derniers mois, évolution |
| **Régularité des encaissements** | 20% | Délai moyen de paiement des factures, taux de factures payées à temps vs en retard |
| **Maîtrise des dépenses** | 15% | Variance des dépenses mois/mois, dépassements budgétaires, anomalies |
| **Évolution du CA** | 15% | Tendance sur 6 mois : croissance, stagnation ou déclin |

**Niveaux du score**

| Score | Label | Couleur | Signification |
|---|---|---|---|
| 80–100 | Excellent | Vert | Santé financière solide, croissance maîtrisée |
| 60–79 | Bon | Bleu | Situation saine, quelques points d'attention |
| 40–59 | À surveiller | Orange | Risques identifiés, actions recommandées |
| < 40 | Critique | Rouge | Intervention urgente requise |

**Usages**
- Affichage en widget sur le dashboard avec détail par composante
- Évolution du score dans le temps (courbe mensuelle)
- Rapport auto-généré : "Votre score a baissé de 8 points ce mois-ci, voici pourquoi"
- À terme : partage du score avec un partenaire financier (demande de financement, crédit fournisseur)

---

#### C. Notes de frais automatiques & Capture des justificatifs

**Objectif**
Éliminer la saisie manuelle des dépenses et la gestion fastidieuse des justificatifs — un sujet évoqué dès le départ dans la vision produit.

**Capture des justificatifs**
- Upload photo via mobile (application web progressive ou app native future)
- OCR automatique : extraction du montant, de la date, du fournisseur et de la catégorie depuis l'image
- Association automatique à une dépense existante ou création d'une nouvelle entrée
- Stockage sécurisé des justificatifs (Cloudinary / S3) avec lien permanent

**Génération automatique des notes de frais**
- Agrégation automatique des dépenses sur une période (semaine, mois, mission)
- Génération d'une note de frais PDF formatée : en-tête organisation, tableau des dépenses, total, TVA, pièces jointes
- Workflow de validation : soumission → approbation manager → marquage "remboursé"
- Envoi automatique au service comptable ou export vers l'outil comptable tiers

**Règles et politiques de dépenses**
- Configuration de plafonds par catégorie (ex : repas ≤ 25€/pers)
- Alertes automatiques si une dépense dépasse la politique interne
- Statistiques d'utilisation : qui dépense quoi, sur quelle mission

---

## 5. Architecture Technique

### 5.1 Stack

| Couche | Technologie | Détail |
|---|---|---|
| **Frontend** | Next.js 16 + React 19 | App Router |
| **Styling** | Tailwind CSS 3.4 | Utility-first |
| **Icônes / Charts** | lucide-react + Recharts 3 | |
| **Auth frontend** | @clerk/nextjs v7 | Provider + middleware |
| **Requêtes** | SWR + Axios | SWR pour cache/revalidation, Axios avec intercepteur Clerk |
| **Backend** | Node.js + Express 4 | CommonJS (require/module.exports) |
| **Auth backend** | @clerk/express v2 | clerkMiddleware + requireAuth |
| **Base de données** | MongoDB Atlas | Mongoose 8, multi-tenant par `organizationId` |
| **Email** | Brevo REST API | fetch natif, sender vérifié `mvpfintech798@gmail.com` |
| **Paiements** | Stripe v14 | Checkout Sessions + Webhook |

### 5.2 Structure backend

```
backend/src/
├── index.js                    ← Express entry point
├── config/db.js                ← Connexion MongoDB
├── middleware/auth.js          ← clerkMiddleware + requireAuth
├── models/
│   ├── Organization.js
│   ├── Client.js
│   ├── Invoice.js              ← trackingToken, events[], statuts étendus
│   ├── Quote.js                ← trackingToken, events[], statuts étendus
│   ├── Expense.js
│   ├── Payment.js
│   └── AccountingEntry.js
├── controllers/
│   ├── organizationController.js
│   ├── clientController.js
│   ├── invoiceController.js
│   ├── quoteController.js
│   ├── expenseController.js
│   ├── accountingController.js
│   ├── dashboardController.js
│   └── publicController.js     ← endpoints sans auth (tracking + paiement)
├── routes/
│   ├── health.js
│   ├── organizations.js
│   ├── clients.js
│   ├── invoices.js
│   ├── quotes.js
│   ├── expenses.js
│   ├── accounting.js
│   ├── dashboard.js
│   ├── public.js               ← monté AVANT clerkMiddleware()
│   └── webhooks.js
└── services/
    └── emailService.js         ← Templates Brevo + pixel tracking
```

### 5.3 Structure frontend

```
frontend/
├── app/
│   ├── (auth)/                 ← sign-in, sign-up (Clerk)
│   ├── (dashboard)/            ← pages protégées
│   │   ├── dashboard/
│   │   ├── clients/[id]/
│   │   ├── invoices/[id]/      ← timeline événements
│   │   ├── quotes/[id]/        ← timeline événements
│   │   ├── expenses/
│   │   ├── accounting/
│   │   └── settings/
│   ├── onboarding/
│   ├── q/[token]/              ← page devis publique (sans auth)
│   └── pay/[token]/            ← page paiement publique (sans auth)
├── components/
│   ├── layout/ (Sidebar, Header)
│   ├── ui/ (Badge, Button, Card, Modal)
│   └── modules/ (InvoiceForm, QuoteForm, ClientForm)
├── hooks/                      ← SWR hooks par domaine
├── lib/api.js                  ← Instance Axios + intercepteur token Clerk
└── proxy.js                    ← Middleware Next.js (laisse /q/*, /pay/* publics)
```

### 5.4 Schémas de données clés

**Invoice**
```
organizationId, clientId, number (FAC-YYYY-###),
status: draft | sent | email_opened | viewed | payment_pending | paid | late | cancelled,
lines[]: { description, quantity, unitPrice, vatRate },
subtotal, vatAmount, total (calculés auto via pre-save hook),
trackingToken (unique, crypto.randomBytes(32)),
events[]: { type, timestamp, note },
currency, issueDate, dueDate, sentAt, paidAt, paymentMethod
```

**Quote**
```
organizationId, clientId, number (DEV-YYYY-###),
status: draft | sent | email_opened | viewed | accepted | refused | expired,
lines[], subtotal, vatAmount, total,
trackingToken, events[], customMessage,
issueDate, expiryDate, sentAt, acceptedAt, refusedAt,
invoiceId (lien vers facture convertie)
```

### 5.5 Routes API principales

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | ❌ | Health check |
| `GET/POST/PUT` | `/api/organizations` | ✅ | Org courante / création / mise à jour |
| `GET/POST/PUT/DELETE` | `/api/clients` | ✅ | CRUD clients |
| `GET/POST/PUT/DELETE` | `/api/invoices` | ✅ | CRUD factures |
| `POST` | `/api/invoices/:id/send-email` | ✅ | Envoi email + event `sent` |
| `GET/POST/PUT/DELETE` | `/api/quotes` | ✅ | CRUD devis |
| `POST` | `/api/quotes/:id/send-email` | ✅ | Envoi email + event `sent` |
| `POST` | `/api/quotes/:id/convert` | ✅ | Conversion devis → facture |
| `GET/POST/PUT/DELETE` | `/api/expenses` | ✅ | CRUD dépenses |
| `GET/POST/DELETE` | `/api/accounting` | ✅ | Journal comptable |
| `GET` | `/api/dashboard/summary` | ✅ | KPIs + agrégats MongoDB |
| `POST` | `/api/webhooks/stripe` | ❌ (raw) | Webhook paiement Stripe |
| `GET` | `/api/public/track/invoice/:token` | ❌ | Pixel tracking email |
| `GET` | `/api/public/invoices/:token` | ❌ | Données facture publique + event `viewed` |
| `POST` | `/api/public/invoices/:token/pay` | ❌ | Paiement simulé → `paid` |
| `GET` | `/api/public/track/quote/:token` | ❌ | Pixel tracking email |
| `GET` | `/api/public/quotes/:token` | ❌ | Données devis publique + event `viewed` |
| `POST` | `/api/public/quotes/:token/accept` | ❌ | Acceptation devis |
| `POST` | `/api/public/quotes/:token/refuse` | ❌ | Refus devis |

### 5.6 Automatismes métier

| Déclencheur | Effet automatique |
|---|---|
| Création/modification facture ou devis | Recalcul HT + TVA + TTC (pre-save hook) |
| Premier save sans `trackingToken` | Génération `crypto.randomBytes(32).toString('hex')` |
| Envoi email | event `sent` ajouté + statut → `sent` |
| Ouverture email (pixel 1×1 GIF) | event `email_opened` + mise à jour statut |
| Visite page publique | event `viewed` (une seule fois, idempotent) |
| Acceptation / refus devis | event + statut mis à jour |
| GET public devis avec `expiryDate` dépassée | `status = expired` automatique |
| Facture marquée `paid` (manual ou Stripe) | Payment créé + AccountingEntry crédit |
| Création dépense | AccountingEntry débit automatique |
| Suppression dépense | Suppression cascade AccountingEntry liée |

---

## 6. Déploiement

### 6.1 Infrastructure

| Service | Plateforme | Branche | Root dir |
|---|---|---|---|
| **Frontend** | Vercel | `master` | `frontend/` |
| **Backend** | Render | `backend` | `backend/` |
| **Base de données** | MongoDB Atlas | — | Cluster0, DB `fluxora` |
| **Auth** | Clerk | — | Application `Fluxora` |
| **Email** | Brevo | — | Sender `mvpfintech798@gmail.com` |
| **Paiements** | Stripe | — | Clés test (webhook non encore configuré en prod) |

### 6.2 URLs de production

- Frontend : `https://flux-ora.vercel.app`
- Backend : `https://fluxora-ld8h.onrender.com`
- GitHub : `https://github.com/Flavien-Walk/FluxOra`

### 6.3 Variables d'environnement

**Backend (Render) :**
```env
PORT=5000
MONGODB_URI=mongodb+srv://...
CLERK_SECRET_KEY=sk_live_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLIENT_URL=https://flux-ora.vercel.app
SERVER_URL=https://fluxora-ld8h.onrender.com
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=mvpfintech798@gmail.com
BREVO_SENDER_NAME=Fluxora
```

**Frontend (Vercel) :**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_API_URL=https://fluxora-ld8h.onrender.com
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

### 6.4 Workflow Git

```
Feature fullstack :
  1. Commit tout sur `backend`  →  git push origin backend  →  Render déploie
  2. git checkout master
  3. git checkout backend -- frontend/app/... frontend/components/...
  4. git commit + git push origin master  →  Vercel déploie

Feature frontend only :
  Commit directement sur master → Vercel déploie
```

> ⚠️ Ne jamais committer `.env` ou `.env.local`

### 6.5 Pièges connus

1. **Stripe lazy init** : `require('stripe')(key)` doit être dans le handler, pas au module level — sinon crash au démarrage Render avec clé placeholder
2. **Webhook Stripe** : `express.raw()` monté AVANT `express.json()` dans `index.js`
3. **Routes publiques** : `/api/public/*` enregistré AVANT `app.use(clerkMiddleware())`
4. **Brevo sender** : utiliser `mvpfintech798@gmail.com` (domaine vérifié) — ne pas utiliser `noreply@fluxora.app` sans vérification préalable
5. **Middleware Next.js** : fichier `proxy.js` (pas `middleware.js`) à la racine de `frontend/`
6. **Multi-tenant** : ne jamais faire `Model.find({})` sans filtre `{ organizationId: org._id }`

---

## 7. Modèle Économique

### Sources de revenus

| Source | Type | Description |
|---|---|---|
| **Abonnement SaaS** | Récurrent | Multi-offres mensuels (Freelance ~15€, PME ~49€) |
| **Commission crédit** | Transactionnel | Sur produits de financement partenaires |
| **AssurTec** | Récurrent | RC pro, prévoyance via partenaires |
| **Trésorerie dormante** | Variable | Placement des fonds clients |
| **Interchange** | Flux continu | Commission sur chaque transaction carte |

### Structure des coûts

- Partenaire BaaS : frais par compte, IBAN, émission carte, transaction, KYC/onboarding
- Infrastructure cloud : hébergement, base de données, cybersécurité
- Acquisition clients : marketing digital, LinkedIn, commerciaux
- Développement produit : dev, UI/UX, maintenance, évolutions
- Conformité et protection des données
- Support et relation client

### Partenaires clés

- **Solaris** — BaaS (IBAN, comptes, cartes)
- **Visa** — Infrastructure réseau carte
- **AWS** — Infrastructure cloud
- **Cegid** — Intégration comptable *(roadmap)*

---

## 8. Stratégie Réglementaire

### Phase 1 — BaaS (0–18 mois)

Lancement via Solaris. Fluxora externalise totalement la couche réglementaire et se concentre sur le produit.

**Gate :** contrat BaaS signé + KYC opérationnel

> ⚠️ **Leçon Wirecard (2020)** : la faillite du sponsor bank a bloqué des dizaines de fintech européennes. Mitigation : architecture modulaire anti lock-in + plan de migration documenté.

### Phase 2 — Licence EMI (18–36 mois)

Internalisation progressive. Une licence EMI permet : émission de monnaie électronique, comptes de paiement, cartes, virements SEPA.

**Régulateur cible :** Bank of Lithuania (6–12 mois) plutôt qu'ACPR (12–18 mois)

**Gate Go/No-Go :**

| Critère | Seuil |
|---|---|
| Comptes PME actifs | ≥ 50 000 |
| Flux mensuels | ≥ 50M€ |
| Marge brute | > 60% |

**Équipe compliance à recruter :** Head of Compliance, MLRO, Risk Officer, Internal Audit

### Phase 3 — Plateforme Hybride (36 mois+)

Rester EMI + orchestrateur. Intégrer crédit, investissement, assurance en embedded finance marketplace. Modèle Qonto / Shopify Capital.

> La licence bancaire est écartée : capital 50–100M€ incompatible avec la trajectoire startup.

---

## 9. Cartographie des Risques

### Risques critiques

| Risque | Proba. | Impact | Mitigation | Si ça arrive |
|---|---|---|---|---|
| Dépendance BaaS (scénario Wirecard) | Moyenne | Critique | Architecture multi-provider, exit plan testé | Activation plan de continuité, bascule BaaS secondaire |
| Non-conformité AML/KYC | Moyenne | Critique | Transaction monitoring, SAR | Notification régulateur, gel comptes suspects |
| Faille cybersécurité | Moyenne | Critique | Chiffrement, RBAC, pentests réguliers | Incident response plan, notification CNIL sous 72h |
| Sanctions régulateur | Basse | Critique | Veille LCB-FT, audits internes | Avocat spécialisé, engagement régulateur |

### Risques élevés

| Risque | Proba. | Impact | Mitigation |
|---|---|---|---|
| Fraude financière | Moyenne | Élevé | Scoring comportemental, limites transactions |
| Vendor lock-in | Moyenne | Élevé | Architecture modulaire, export données |
| Indisponibilité API BaaS | Moyenne | Élevé | Monitoring permanent, circuit de secours |
| Blocage comptes clients | Moyenne | Élevé | Procédures claires, déblocage express < 24h |
| Perte de confiance utilisateurs | Moyenne | Élevé | Communication proactive, support efficace |
| Panne cloud | Basse | Élevé | Multi-cloud, PRA/PCA, bascule automatique |

### Risques moyens

| Risque | Proba. | Impact | Mitigation |
|---|---|---|---|
| Chargebacks élevés | Moyenne | Moyen | Monitoring PSP, suivi litiges |
| Mauvaise UX | Moyenne | Moyen | Feedback continu, sprint correctif |
| Complexité multi-pays (Phase 3) | Moyenne | Moyen | Expansion progressive pays par pays |

---

## 10. Roadmap Produit

### Priorité immédiate (avant pitch / démo)

| Tâche | Détail |
|---|---|
| Routes publiques backend | `publicController.js` + `routes/public.js` : tracking pixel, GET devis/facture, accept/refuse, paiement simulé |
| Modèles Invoice + Quote | Ajouter `trackingToken`, `events[]`, statuts étendus, `paymentMethod`, `customMessage`, `refusedAt` |
| Email service | Pixel tracking + boutons action dans les templates Brevo |
| Page Settings | Formulaire mise à jour organisation : nom, SIRET, TVA, devise, email |
| Page Client detail | Infos client + liste de ses factures + liste de ses devis |
| Variables d'env Render | Configurer `BREVO_API_KEY`, `SERVER_URL`, `CLIENT_URL` |

### Priorité moyenne

| Tâche | Détail |
|---|---|
| Stripe réel | Activer clés, `POST /api/invoices/:id/create-payment-link` |
| Pagination UI | Les endpoints supportent déjà skip/limit/page/total |
| Rappels automatiques | Cron : relances factures en retard, devis expirés → email |
| Filtres date UI | Dépenses et comptabilité |

### Vision à moyen terme — IA & Intelligence financière

| Fonctionnalité | Priorité | Complexité |
|---|---|---|
| Assistant financier IA (analyse dépenses, prévisions trésorerie) | Haute | Élevée |
| Score de santé financière PME | Haute | Moyenne |
| Notes de frais automatiques + OCR justificatifs | Haute | Moyenne |
| Workflow validation dépenses (soumission → approbation) | Moyenne | Moyenne |
| Export PDF factures / devis | Moyenne | Faible |
| Intégration Cegid (sync comptable) | Moyenne | Élevée |
| Internationalisation (multi-langue) | Basse | Moyenne |

---

## 11. Conventions de Développement

### Backend — pattern controller

```js
const getUserOrg = async (userId) =>
  Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }]
  });

const myAction = async (req, res) => {
  const org = await getUserOrg(req.userId); // req.userId vient de clerkMiddleware
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });
  // logique métier...
  res.json(result);
};
```

### Frontend — pattern hook SWR

```js
export function useInvoices(status) {
  const { getToken } = useAuth();
  const key = status ? `/api/invoices?status=${status}` : '/api/invoices';
  const { data, error, isLoading, mutate } = useSWR(key, async (url) => {
    const token = await getToken();
    const { data } = await api.get(url, { headers: { Authorization: `Bearer ${token}` } });
    return data;
  });
  return { invoices: data?.invoices || [], total: data?.total || 0, isLoading, error, mutate };
}
```

### Règles absolues

- PAS de TypeScript — JS pur partout
- PAS d'ESM sur backend — `require/module.exports` uniquement
- Multi-tenant — toujours filtrer par `organizationId`
- Fichiers max ~300 lignes
- Calcul TVA : `quantity × unitPrice × vatRate / 100` (vatRate en %, ex: `20`)
- Events Mongoose : `document.events.push({ type: 'sent', timestamp: new Date() })` puis `document.save()`
- Ne jamais committer `.env` ou `.env.local`

### Badge statuts → couleurs

| Statut | Couleur |
|---|---|
| `draft` | Gris |
| `sent` | Bleu |
| `email_opened` | Indigo |
| `viewed` | Indigo |
| `payment_pending` | Violet |
| `paid` | Vert |
| `late` | Rouge |
| `cancelled` | Jaune |
| `accepted` | Vert |
| `refused` | Rouge |
| `expired` | Jaune |

---

*Fluxora — Document interne — Mars 2026*
