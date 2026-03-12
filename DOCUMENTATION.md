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

Fluxora est une **plateforme financière SaaS B2B** destinée aux PME européennes (10–200 employés). Elle centralise la gestion financière en un seul outil : facturation, devis, dépenses, trésorerie, comptabilité automatisée, cartes entreprises, virements, placements de trésorerie et marketplace financière.

Fluxora n'est pas une banque. Elle orchestre des services financiers réglementés via des partenaires API (modèle "fintech orchestration layer") et ajoute une couche d'intelligence : catégorisation automatique, reporting temps réel, alertes prédictives, assistant IA financier, et relances automatiques.

**Pivot stratégique réalisé** : cible initiale freelances → cible actuelle PME 10–200 employés. Ce pivot est irréversible et stratégiquement correct : ARPU 4 à 10× supérieur, churn structurellement plus bas, LTV plus élevée.

### Stratégie réglementaire progressive

```
Phase 1          Phase 2              Phase 3
BaaS  ────────►  Licence EMI  ──────►  Financial Platform / Hybrid

Speed            Control              Autonomy
```

- **Phase 1** — lancement via partenaire BaaS (Solaris / Treezor) : 6 à 9 mois, capital réduit, focus produit
- **Phase 2** — obtention d'une licence EMI dès que les métriques le justifient (≥ 200–300 comptes actifs, marge compressée par BaaS)
- **Phase 3** — plateforme financière hybride, marketplace de services financiers embarqués (crédit, assurance, placements)

> La licence bancaire directe est délibérément écartée à court terme : capital 50–100M€ incompatible avec la trajectoire startup.

---

## 2. Proposition de valeur

- **Gestion financière unifiée** : devis → facture → paiement en flux continu, sans jongler entre plusieurs outils
- **Automatisation comptable** : journal débit/crédit généré automatiquement à chaque transaction (facture payée, dépense, placement, retrait)
- **Visibilité temps réel** : dashboard KPIs, cashflow, alertes budgétaires
- **Cartes entreprises** : cartes physiques et virtuelles avec limites paramétrables, réconciliation automatique
- **Relances automatiques** : système de relance configurable par document (factures et devis), avec timeline, score de risque et recommandations IA
- **Marketplace financière** : placements de trésorerie, crédit PME, assurance — accessibles depuis la plateforme
- **Assistant IA** : agent financier conversationnel capable d'analyser les données, créer des documents et exécuter des workflows
- **Pages publiques client** : le client reçoit un email, consulte son devis, l'accepte ou refuse, et paie sa facture — sans compte Fluxora
- **Tracking email** : détection d'ouverture email, enregistrement d'événement horodaté

---

## 3. Segmentation client

| Segment | Profil | Besoins principaux |
|---|---|---|
| **PME principale** (10–100 salariés) | Multi-utilisateurs, volume moyen | Cartes, dépenses, facturation, reporting — Décideurs : CEO, DAF, office manager |
| **PME avancée** (100–200 salariés) | Finance ops structurée | Workflows d'approbation, RBAC, intégrations comptables, marketplace |

> Le segment freelance n'est plus la cible principale. Il peut accéder au plan Starter mais le développement produit est orienté PME.

---

## 4. Solution & Fonctionnalités

### 4.1 Modules implémentés

#### Authentification & Organisation
- Sign-up / sign-in via Clerk
- Onboarding guidé : création de l'organisation (nom, SIRET, TVA, devise)
- Gestion des membres avec rôles : `admin`, `finance`, `manager`, `viewer`
- Multi-tenant : toutes les données isolées par `organizationId`

#### CRM Clients
- CRUD complet des clients (nom, email, téléphone, société, adresse, SIRET, TVA)
- Recherche full-text, pagination backend
- Page de détail client : infos + liste des factures + liste des devis associés

#### Factures
- Création avec lignes de détail (description, quantité, prix unitaire, taux TVA)
- Calcul HT / TVA / TTC automatique (pre-save hook Mongoose)
- Numérotation automatique `FAC-YYYY-###`
- Cycle de vie : `draft` → `sent` → `email_opened` → `viewed` → `payment_initiated` → `paid` / `late` / `cancelled`
- Envoi email professionnel via Brevo (template HTML)
- Tracking pixel : détection d'ouverture email, enregistrement d'événement horodaté
- Page de paiement publique (`/pay/[token]`)
- Timeline des événements sur la page de détail
- **Système de relances automatiques** : configuration par facture, timeline de relances, score de risque, recommandations IA, historique des envois

#### Devis
- CRUD complet, numérotation `DEV-YYYY-###`
- Même calcul TVA automatique que les factures
- Cycle de vie : `draft` → `sent` → `email_opened` → `viewed` → `accepted` / `refused` / `expired`
- Envoi email avec tracking pixel
- Page publique client (`/q/[token]`) : consulter, accepter ou refuser sans compte
- Expiration automatique si `expiryDate` dépassée
- Conversion devis → facture en un clic
- Timeline des événements
- **Système de relances automatiques** : configuration, timeline, historique

#### Relances automatiques (ReminderBlock)
- Composant `ReminderBlock` réutilisable sur factures et devis
- Activation/désactivation par document
- Configuration des délais : J+X avant/après échéance, rappels préventifs
- Timeline visuelle des étapes (passées, en attente, à venir)
- Score de risque calculé côté client : `low` / `medium` / `high` selon montant, retard, historique
- Recommandations IA (rule-based) : ton recommandé, canal, urgence
- Historique des relances envoyées avec horodatage
- API : `PUT /api/invoices/:id/reminders`, `POST /api/invoices/:id/send-reminder` (idem quotes)

#### Dépenses
- CRUD avec 9 catégories : `marketing`, `software`, `salaries`, `suppliers`, `taxes`, `banking`, `travel`, `office`, `other`
- Création automatique d'une écriture comptable (débit) à chaque dépense
- Suppression en cascade (dépense + écriture liée)
- Champ `receiptUrl` pour justificatifs

#### Comptabilité
- Journal des écritures débit/crédit
- Génération automatique : factures payées (crédit), dépenses (débit), placements/retraits (débit/crédit)
- Écritures manuelles (ajout/suppression)
- Filtrage par type, source, période, DateRangePicker
- Calcul du solde net (crédits − débits)

#### Cartes entreprises
- Liste des cartes virtuelles et physiques
- Détail carte : numéro masqué, limite, statut (`active` / `frozen` / `cancelled`)
- Gel/dégel de carte
- Transactions associées par carte
- Composant `InteractiveCard3D` : rendu 3D animé de la carte

#### Virements
- Liste des virements émis
- Création de virement (IBAN bénéficiaire, montant, libellé, référence)
- Gestion des bénéficiaires sauvegardés

#### Transactions
- Liste paginée des transactions de compte
- Filtrage par type, période, montant
- Lien avec les écritures comptables

#### TVA
- Tableau de bord des déclarations TVA
- Calcul automatique TVA collectée vs TVA déductible
- Génération des périodes déclaratives

#### Investissements / Trésorerie
- Vue du portefeuille de placements actifs
- KPIs : total investi, gains accumulés, trésorerie disponible
- Catalogue de produits avec taux live (via `marketDataService` — taux ECB + ETFs)
- Création d'un placement (vérifie la trésorerie disponible via le journal comptable)
- Retrait avec calcul du gain prorata temporis
- Écriture comptable automatique : débit à la création, crédit au retrait
- Cron quotidien de mise à jour des taux (08h15 CET, jours ouvrés)

#### Marketplace Partenariats
- Page `/partenariats` : catalogue des partenaires financiers
- Catégories : Banque & Paiements, Assurances, Financement, Outils Métier
- Filtres dynamiques par catégorie
- PartnerCard avec image (logo ou bannière dégradé), badge, description, avantages
- Modal de connexion partenaire (formulaire d'intégration)
- Gestion des connexions via hook `usePartnerConnections`
- Partenaires actuels : Shine, SumUp, Wix, Aésio, Orus, Orange Pro, Lenovo, bsp-auto (Qonto exclu — concurrent direct)

#### Dashboard
- KPIs temps réel (CA total, CA du mois, factures en attente, en retard)
- Graphique d'évolution CA sur 6 mois (Recharts)
- Répartition dépenses par catégorie (annuel)
- Activité récente (timeline événements)
- Alertes financières intelligentes
- Rafraîchissement automatique toutes les 60 secondes

#### Alertes
- Alertes financières configurables (seuils de trésorerie, factures en retard, dépenses anormales)
- Marquage lu/non lu

#### Assistant IA financier
- Panel conversationnel (`AssistantPanel`) accessible via `AssistantTrigger`
- Analyse des données financières en temps réel
- Création de documents (factures, devis, dépenses) via commande naturelle
- Exécution de workflows (création + envoi email en une étape)
- Recherche dans les entités (clients, factures, devis) via `assistantSearch`
- Affichage des résultats structurés : `AssistantEntityCard`, `AssistantObjectCard`, `AssistantSectionReport`
- Journal d'exécution agent : `AssistantAgentLog`
- Sélecteur de client intégré : `AssistantClientPicker`
- Workflows prédéfinis : `AssistantWorkflowCard`, `AssistantHubActions`

#### Settings
- Formulaire de mise à jour de l'organisation (nom, SIRET, TVA, devise, email)

---

### 4.2 Fonctionnalités futures — Vision à moyen terme

#### A. Score de santé financière (Financial Health Score)

Un score dynamique calculé automatiquement (0–100) reflétant la santé financière de l'organisation.

| Composante | Poids | Ce qui est analysé |
|---|---|---|
| **Liquidité** | 25% | Trésorerie disponible / dépenses mensuelles moyennes |
| **Rentabilité** | 25% | Marge nette sur les 3 derniers mois |
| **Régularité encaissements** | 20% | Délai moyen paiement factures, taux de paiement à temps |
| **Maîtrise des dépenses** | 15% | Variance mensuelle, dépassements budgétaires |
| **Évolution du CA** | 15% | Tendance sur 6 mois |

#### B. Notes de frais automatiques & OCR justificatifs

- Upload photo de reçu → OCR automatique (montant, date, fournisseur, catégorie)
- Workflow de validation : soumission → approbation manager → marquage "remboursé"
- Génération PDF de la note de frais

#### C. Export & Intégrations comptables avancées

- Export FEC conforme
- Connecteur natif Pennylane (priorité)
- Connecteur QuickBooks / Cegid

---

## 5. Architecture Technique

### 5.1 Stack

| Couche | Technologie | Détail |
|---|---|---|
| **Frontend** | Next.js 16 + React 19 | App Router, pas de src/ |
| **Styling** | Tailwind CSS 3.4 | Design system : slate-*, accent-*, success/danger/warning |
| **Icônes / Charts** | lucide-react + Recharts 3 | |
| **Auth frontend** | @clerk/nextjs v7 | Provider + middleware |
| **Requêtes** | SWR + Axios | SWR pour cache/revalidation, Axios avec intercepteur Clerk |
| **Notifications** | sonner (toast) | Notifications in-app |
| **Backend** | Node.js + Express 4 | CommonJS (require/module.exports) |
| **Auth backend** | @clerk/express v2 | clerkMiddleware + requireAuth |
| **Base de données** | MongoDB Atlas | Mongoose 8, multi-tenant par `organizationId` |
| **Email** | Brevo REST API | fetch natif, sender vérifié `mvpfintech798@gmail.com` |
| **Paiements** | Stripe v14 | Checkout Sessions + Webhook |
| **Cron** | node-cron | Mise à jour taux marché quotidienne |

### 5.2 Structure backend

```
backend/src/
├── index.js                          ← Express entry point + cron marketDataService
├── config/db.js                      ← Connexion MongoDB
├── middleware/auth.js                 ← clerkMiddleware + requireAuth
├── models/
│   ├── Organization.js
│   ├── Client.js
│   ├── Invoice.js                    ← trackingToken, events[], reminderConfig, statuts étendus
│   ├── Quote.js                      ← trackingToken, events[], reminderConfig, statuts étendus
│   ├── Expense.js
│   ├── Payment.js
│   ├── AccountingEntry.js
│   ├── Alert.js
│   ├── VirtualCard.js
│   ├── Transfer.js
│   ├── Beneficiary.js
│   ├── VATDeclaration.js
│   └── Investment.js                 ← montant, expectedRate, gains virtuels, écritures comptables
├── controllers/
│   ├── organizationController.js
│   ├── clientController.js
│   ├── invoiceController.js
│   ├── quoteController.js
│   ├── expenseController.js
│   ├── accountingController.js
│   ├── dashboardController.js
│   ├── alertController.js
│   ├── cardController.js
│   ├── transferController.js
│   ├── vatController.js
│   ├── transactionController.js
│   ├── reminderController.js         ← updateReminders + sendReminder (factures & devis)
│   ├── investmentController.js       ← CRUD placements + calcul gains + écritures comptables
│   ├── publicController.js           ← endpoints sans auth (tracking + paiement + devis public)
│   └── assistantController.js        ← IA financière conversationnelle
├── routes/
│   ├── health.js
│   ├── organizations.js
│   ├── clients.js
│   ├── invoices.js                   ← +PUT /:id/reminders, POST /:id/send-reminder
│   ├── quotes.js                     ← +PUT /:id/reminders, POST /:id/send-reminder
│   ├── expenses.js
│   ├── accounting.js
│   ├── dashboard.js
│   ├── alerts.js
│   ├── cards.js
│   ├── transfers.js
│   ├── vat.js
│   ├── transactions.js
│   ├── investments.js                ← GET /, GET /products, GET /rates, POST /, POST /:id/withdraw, DELETE /:id
│   ├── assistant.js
│   ├── public.js                     ← monté AVANT clerkMiddleware()
│   └── webhooks.js
└── services/
    ├── emailService.js               ← Templates Brevo + pixel tracking
    ├── marketDataService.js          ← Taux ECB + ETFs, cache MongoDB, cron update
    ├── assistantService.js           ← Logique IA + buildSystemPrompt
    ├── assistantSearch.js            ← Recherche multi-entités
    └── assistantActionService.js     ← Exécution d'actions depuis l'assistant
```

### 5.3 Structure frontend

```
frontend/
├── app/
│   ├── (auth)/                       ← sign-in, sign-up (Clerk)
│   ├── (dashboard)/                  ← pages protégées
│   │   ├── dashboard/
│   │   ├── clients/
│   │   │   └── [id]/                 ← détail client + factures + devis
│   │   ├── invoices/
│   │   │   └── [id]/                 ← détail + timeline + ReminderBlock
│   │   ├── quotes/
│   │   │   └── [id]/                 ← détail + timeline + ReminderBlock
│   │   ├── expenses/
│   │   ├── accounting/
│   │   ├── cards/                    ← cartes entreprises 3D
│   │   ├── transfers/                ← virements + bénéficiaires
│   │   ├── transactions/             ← historique transactions
│   │   ├── vat/                      ← déclarations TVA
│   │   ├── investissements/          ← placements de trésorerie
│   │   ├── partenariats/             ← marketplace partenaires financiers
│   │   └── settings/
│   ├── onboarding/
│   ├── q/[token]/                    ← page devis publique (sans auth)
│   └── pay/[token]/                  ← page paiement publique (sans auth)
├── components/
│   ├── layout/
│   │   ├── Sidebar.js                ← Navigation principale
│   │   └── Header.js                 ← En-tête avec titre + actions
│   ├── ui/
│   │   ├── Badge.js                  ← Badges de statut colorés
│   │   ├── Button.js                 ← Bouton avec variants + loading
│   │   ├── Card.js                   ← Card / CardHeader / CardBody
│   │   ├── Modal.js                  ← Modal générique avec sizes
│   │   ├── EmptyState.js             ← État vide avec icône + CTA
│   │   ├── Skeleton.js               ← SkeletonTable, SkeletonCard
│   │   ├── GlobalSearch.js           ← Recherche globale multi-entités
│   │   ├── ActivityTimeline.js       ← Timeline d'événements
│   │   ├── DateRangePicker.js        ← Sélecteur de plage de dates
│   │   ├── CardDetailModal.js        ← Modal détail carte entreprise
│   │   └── InteractiveCard3D.js      ← Rendu 3D animé de carte bancaire
│   ├── modules/
│   │   ├── InvoiceForm.js            ← Formulaire facture (create + edit)
│   │   ├── QuoteForm.js              ← Formulaire devis (create + edit)
│   │   └── ClientForm.js             ← Formulaire client
│   ├── reminders/
│   │   └── ReminderBlock.js          ← Bloc relances auto (toggle + config + timeline + IA + historique)
│   ├── partners/
│   │   ├── PartnerCard.js            ← Carte partenaire (logo / bannière + infos + CTA)
│   │   ├── PartnerFilters.js         ← Filtres catégories marketplace
│   │   └── PartnerConnectModal.js    ← Modal connexion partenaire
│   ├── assistant/
│   │   ├── AssistantPanel.js         ← Panel conversationnel principal
│   │   ├── AssistantTrigger.js       ← Bouton d'ouverture flottant
│   │   ├── AssistantActions.js       ← Actions rapides
│   │   ├── AssistantHubActions.js    ← Hub de workflows prédéfinis
│   │   ├── AssistantWorkflowCard.js  ← Carte workflow avec étapes
│   │   ├── AssistantAgentLog.js      ← Journal d'exécution agent
│   │   ├── AssistantModalHost.js     ← Hôte de modals générées par l'IA
│   │   ├── AssistantEntityCard.js    ← Affichage entité (client, facture...)
│   │   ├── AssistantObjectCard.js    ← Affichage objet générique
│   │   ├── AssistantClientPicker.js  ← Sélecteur client pour l'assistant
│   │   └── AssistantSectionReport.js ← Rapport sectionné IA
│   └── landing/
│       ├── HeroSection.js
│       ├── FeaturesGrid.js
│       ├── HowItWorks.js
│       ├── PricingSection.js
│       ├── FAQSection.js
│       ├── LandingNav.js
│       └── LandingFooter.js
├── hooks/
│   ├── useClients.js
│   ├── useInvoices.js                ← useInvoices(filter) + useInvoice(id)
│   ├── useQuotes.js                  ← useQuotes(filter) + useQuote(id)
│   ├── useExpenses.js
│   ├── useAccounting.js
│   ├── useDashboard.js
│   ├── useAlerts.js
│   ├── useCards.js
│   ├── useTransfers.js
│   ├── useVat.js
│   ├── useInvestments.js             ← useInvestments() + useInvestmentProducts()
│   ├── usePartnerConnections.js
│   ├── useOrganization.js
│   └── useCountUp.js                 ← Animation de compteur numérique
├── lib/
│   ├── api.js                        ← Instance Axios + intercepteur token Clerk
│   ├── utils.js                      ← cn() (classnames), formatters
│   └── reminderUtils.js              ← computeQuoteTimeline, computeInvoiceTimeline,
│                                         computeRiskScore, getAIRecommendation,
│                                         getNextQuoteReminder, getNextInvoiceReminder
├── data/
│   └── partners.js                   ← Catalogue des partenaires marketplace
└── proxy.js                          ← Middleware Next.js (laisse /q/*, /pay/* publics)
```

### 5.4 Schémas de données clés

**Invoice**
```
organizationId, clientId, number (FAC-YYYY-###),
status: draft | sent | email_opened | viewed | payment_initiated | paid | late | cancelled,
lines[]: { description, quantity, unitPrice, vatRate },
subtotal, vatAmount, total (calculés auto via pre-save hook),
trackingToken (unique, crypto.randomBytes(32)),
events[]: { type, timestamp, note },
reminderConfig: {
  enabled, beforeDueDays, onDueDayEnabled, afterDueDays[],
  history[]: { sentAt, step, channel, note }
},
currency, issueDate, dueDate, sentAt, paidAt, paymentMethod
```

**Quote**
```
organizationId, clientId, number (DEV-YYYY-###),
status: draft | sent | email_opened | viewed | accepted | refused | expired,
lines[], subtotal, vatAmount, total,
trackingToken, events[], customMessage,
reminderConfig: {
  enabled, firstReminderDays, beforeExpiryDays, afterExpiryEnabled,
  history[]: { sentAt, step, channel, note }
},
issueDate, expiryDate, sentAt, acceptedAt, refusedAt,
invoiceId (lien vers facture convertie)
```

**Investment**
```
organizationId,
productId: 'money-market' | 'short-bond' | 'oat-1-3y' | 'cat',
productName,
amount, expectedRate (taux annuel % au moment de la souscription),
status: active | withdrawn | matured,
investedAt, maturityDate, withdrawnAt, withdrawnAmount,
virtuals: currentGain, currentValue (calculés à la volée)
```

### 5.5 Routes API complètes

| Méthode | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | ❌ | Health check |
| `GET/POST/PUT` | `/api/organizations` | ✅ | Org courante / création / mise à jour |
| `GET/POST/PUT/DELETE` | `/api/clients` | ✅ | CRUD clients |
| `GET/POST/PUT/DELETE` | `/api/invoices` | ✅ | CRUD factures |
| `POST` | `/api/invoices/:id/send-email` | ✅ | Envoi email + event `sent` |
| `PUT` | `/api/invoices/:id/reminders` | ✅ | Config relances automatiques |
| `POST` | `/api/invoices/:id/send-reminder` | ✅ | Envoi manuel d'une relance |
| `GET/POST/PUT/DELETE` | `/api/quotes` | ✅ | CRUD devis |
| `POST` | `/api/quotes/:id/send-email` | ✅ | Envoi email + event `sent` |
| `POST` | `/api/quotes/:id/convert` | ✅ | Conversion devis → facture |
| `PUT` | `/api/quotes/:id/reminders` | ✅ | Config relances automatiques |
| `POST` | `/api/quotes/:id/send-reminder` | ✅ | Envoi manuel d'une relance |
| `GET/POST/PUT/DELETE` | `/api/expenses` | ✅ | CRUD dépenses |
| `GET/POST/DELETE` | `/api/accounting` | ✅ | Journal comptable |
| `GET` | `/api/dashboard/summary` | ✅ | KPIs + agrégats MongoDB |
| `GET/POST/PUT/DELETE` | `/api/alerts` | ✅ | Alertes financières |
| `GET/POST/PUT/DELETE` | `/api/cards` | ✅ | Cartes entreprises |
| `GET/POST/PUT/DELETE` | `/api/transfers` | ✅ | Virements + bénéficiaires |
| `GET/POST/DELETE` | `/api/vat` | ✅ | Déclarations TVA |
| `GET` | `/api/transactions` | ✅ | Historique transactions |
| `GET` | `/api/investments` | ✅ | Portefeuille + trésorerie disponible |
| `GET` | `/api/investments/products` | ✅ | Catalogue produits avec taux live |
| `GET` | `/api/investments/rates` | ✅ | Snapshot brut taux ECB + ETFs |
| `POST` | `/api/investments` | ✅ | Créer un placement |
| `POST` | `/api/investments/:id/withdraw` | ✅ | Retirer un placement |
| `DELETE` | `/api/investments/:id` | ✅ | Supprimer un placement |
| `POST` | `/api/assistant/chat` | ✅ | Conversation IA financière |
| `POST` | `/api/webhooks/stripe` | ❌ (raw) | Webhook paiement Stripe |
| `GET` | `/api/public/track/invoice/:token` | ❌ | Pixel tracking email facture |
| `GET` | `/api/public/invoices/:token` | ❌ | Données facture publique + event `viewed` |
| `POST` | `/api/public/invoices/:token/pay` | ❌ | Paiement simulé → `paid` |
| `GET` | `/api/public/track/quote/:token` | ❌ | Pixel tracking email devis |
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
| Facture marquée `paid` | Payment créé + AccountingEntry crédit |
| Création dépense | AccountingEntry débit automatique |
| Suppression dépense | Suppression cascade AccountingEntry liée |
| Création placement (Investment) | AccountingEntry débit `banking` |
| Retrait placement (Investment) | AccountingEntry crédit `banking` (principal + intérêts) |
| Démarrage serveur (jours ouvrés, 08h15 CET) | Cron `updateMarketRates()` — taux ECB + ETFs |

### 5.7 Design system frontend

| Token | Usage |
|---|---|
| `slate-*` | Textes, fonds, bordures (couleur principale neutre) |
| `accent-*` | Actions primaires, liens, badges informations |
| `success-*` | Statuts positifs (`paid`, `accepted`) |
| `danger-*` | Statuts d'alerte (`late`, `refused`, risque élevé) |
| `warning-*` | Statuts intermédiaires (`expired`, attention) |

Composants UI réutilisables : `Card / CardHeader / CardBody`, `Button` (variants : primary, secondary, danger, ghost), `Modal` (sizes : sm, md, lg), `Badge`, `EmptyState`, `SkeletonTable`, `Header`.

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
Worktrees :
  - c:/Users/flavi/Desktop/MVP Fintech/          → branche master  (frontend)
  - c:/Users/flavi/Desktop/MVP-Fintech-backend/  → branche backend (backend)
  - .backend-worktree/                            → branche backend (worktree secondaire)

Feature fullstack :
  1. Commits backend dans MVP-Fintech-backend/ → git push origin backend → Render déploie
  2. Commits frontend dans MVP Fintech/ → git push origin master → Vercel déploie

Feature frontend only :
  Commit directement sur master → Vercel déploie
```

> ⚠️ Ne jamais committer `.env` ou `.env.local`
> ⚠️ Ne jamais committer `mvpfintech798_db_user.txt` ou tout fichier contenant des secrets

### 6.5 Pièges connus

1. **Stripe lazy init** : `require('stripe')(key)` dans le handler, pas au module level
2. **Webhook Stripe** : `express.raw()` monté AVANT `express.json()` dans `index.js`
3. **Routes publiques** : `/api/public/*` enregistré AVANT `app.use(clerkMiddleware())`
4. **Brevo sender** : utiliser `mvpfintech798@gmail.com` (domaine vérifié)
5. **Middleware Next.js** : fichier `proxy.js` (pas `middleware.js`) à la racine de `frontend/`
6. **Multi-tenant** : ne jamais faire `Model.find({})` sans filtre `{ organizationId: org._id }`
7. **GitHub push protection** : ne jamais stager de fichiers contenant des API keys — GitHub bloque le push
8. **Cron marketDataService** : le cron est initialisé dans le callback de `app.listen()` dans `index.js`
9. **Investissement** : le modèle `Investment` utilise `expectedRate` (pas `rate`) — cohérence avec le controller
10. **SWR `useInvestmentProducts`** : refresh toutes les heures (pas à chaque render)

---

## 7. Modèle Économique

### Sources de revenus

| Source | Type | Détail |
|---|---|---|
| **Abonnement SaaS** | Récurrent | Starter ~49€/mois, Business ~99€/mois, Enterprise sur devis |
| **Interchange cartes** | Flux continu | 0,2–0,3% par transaction EU ; davantage hors EU |
| **Frais transactionnels** | Transactionnel | Virements express, FX, services premium |
| **Commissions marketplace** | Transactionnel | Crédit PME (1–3%), assurance (10–20%), placements (0,1–0,3% sur encours) |
| **Upsell fonctionnalités** | Récurrent | IA avancée, reporting premium, cartes métal |

### Unit economics cibles

| Indicateur | Hypothèse | Réaliste |
|---|---|---|
| ARPU | 80–100€/mois | 70–80€ Year 1 |
| CAC | 300–800€ | 1 000–2 000€ outbound / 300–500€ via experts-comptables |
| Marge brute | ~65% | ~50–55% Phase 1 (coût BaaS élevé), ~65% à maturité |
| Payback | < 12–15 mois | 15–30 mois réaliste |
| Churn annuel | 5–10% | 8–12% Year 1, < 7% à partir de Year 2 |
| LTV/CAC cible | > 3 | Atteignable si canal expert-comptable actif |

### Structure des coûts

- **Partenaire BaaS** (~35–45% des revenus SaaS en Phase 1) : frais par compte, IBAN, émission carte, transaction, KYC
- **Infrastructure cloud AWS** : 300–8 000€/mois selon volume
- **Conformité & juridique** : 150 000–270 000€/an (non négociable)
- **Équipe** : 400 000–550 000€/an (5–7 personnes au lancement)
- **Acquisition clients** : 200 000–500 000€/an

> Budget total Year 1 estimé : **1 à 1,5M€** — cible de levée seed recommandée : **1,5 à 2,5M€**

### Partenaires clés

- **Solaris** — BaaS EU (IBAN DE, cartes Visa) — SPOF critique à mitiger
- **Treezor** — Alternative BaaS France (IBAN FR) — à négocier en parallèle
- **Onfido / Sumsub** — KYC/AML onboarding
- **Stripe** — Paiements entrants (migration Adyen envisagée à volume)
- **Brevo** — Emails transactionnels
- **AWS** — Infrastructure cloud (région EU-West)

---

## 8. Stratégie Réglementaire

### Phase 1 — BaaS (0–18 mois)

Lancement via Solaris (et/ou Treezor). Fluxora externalise la couche réglementaire et se concentre sur le produit.

**Obligations Fluxora même sans licence propre :**
- KYC (Onfido) + KYB entreprise (Infogreffe, bénéficiaires effectifs, listes sanctions)
- Dispositif AML/LCB-FT : transaction monitoring, règles d'alerte, SAR Tracfin
- MLRO désigné dès le premier client en production
- RGPD : DPO, registre des traitements, DPA avec chaque partenaire
- RBAC + chiffrement (TLS 1.3 en transit, AES-256 au repos)
- Audit trail immuable avec horodatage et auteur

**Gate :** contrat BaaS signé + KYC opérationnel + dispositif LCB-FT documenté

> ⚠️ **Leçon Wirecard (2020)** : mitigation = négocier Treezor en parallèle de Solaris, plan de migration IBAN documenté.

### Phase 2 — Licence EMI (18–36 mois)

Internalisation progressive via licence EMI ACPR (France) ou Banque de Lituanie (plus rapide : 6–12 mois vs 12–18 mois ACPR).

**Ce que l'EMI change :**
- Fluxora émet de la monnaie électronique en propre
- IBAN FR possible (si ACPR)
- Safeguarding des fonds clients obligatoire
- Capital réglementaire minimum : 350 000€
- Reporting périodique ACPR, dirigeant agréé

**Coût total dossier EMI estimé :** 600 000–950 000€ sur 18–28 mois

**Gate Go/No-Go :**

| Critère | Seuil recommandé |
|---|---|
| Comptes actifs | ≥ 200–300 |
| Coût BaaS / revenus SaaS | ≥ 35% |
| Marge brute | > 55% |
| Cash disponible | ≥ 18 mois de runway post-dossier |

**Statuts requis pour la marketplace :**
- Crédit PME : statut **IOBSP** (inscription ORIAS) — via agent d'un IOBSP existant
- Assurance : statut **IAS** (inscription ORIAS) — via agent d'un assureur partenaire
- Placements (fonds monétaires, comptes à terme) : partenariat structuré avec un PSI agréé

> ⚠️ Ne pas commercialiser crédit / assurance / placements sans ces statuts — risque de sanction ACPR.

### Phase 3 — Plateforme Hybride (36 mois+)

Rester EMI + orchestrateur. Passeport européen → expansion EU sans licences supplémentaires. Marketplace crédit/assurance/placements mature. Modèle Qonto / Shopify Capital.

> La licence bancaire est écartée : capital 50–100M€ incompatible avec la trajectoire startup.

---

## 9. Cartographie des Risques

### Risques existentiels (5)

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Défaillance / restriction Solaris (scénario Wirecard) | Faible | Catastrophique | Négocier Treezor en parallèle, SLA strict, plan migration IBAN documenté |
| Incident cyber / fuite données financières | Modérée | Catastrophique | SOC 24/7, pentest trimestriel, ISO 27001, assurance cyber |
| Sanction ACPR / Tracfin (défaillance AML) | Modérée | Catastrophique | Transaction monitoring dès J1, MLRO désigné, audits LCB-FT |
| CAC réel 3× supérieur aux hypothèses | Élevée | Élevé | Modéliser CAC 1 500–2 000€, lever 2M€+, prioriser canal expert-comptable |
| Commercialisation marketplace sans statuts IOBSP/IAS | Élevée | Élevé | Audit juridique avant tout développement marketplace |

### Risques majeurs

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Migration IBAN en cas de changement BaaS | Modérée | Élevé | Préférer Treezor (IBAN FR), clause portabilité dans contrat Solaris |
| Churn précoce (produit non différenciant) | Élevée | Élevé | Focus rétention avant acquisition, NPS mensuel, itérations rapides |
| Résistance PME à IBAN DE | Élevée | Moyen | Obtenir IBAN FR via Treezor dès Phase 1 |
| Panne API BaaS | Modérée | Élevé | Monitoring permanent, circuit de secours documenté |
| Mauvaise UX onboarding | Élevée | Moyen | Tests utilisateurs, activation < 10 min, support proactif J1 |

### Risques modérés

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Lock-in AWS | Faible | Moyen | Abstraction cloud, multi-cloud à partir de 1M ARR |
| Concurrence Qonto sur marketplace | Modérée | Moyen | Accélérer différenciation marketplace + canal expert-comptable |
| Perte CTO en phase critique | Faible | Élevé | Documentation technique, couverture assurance homme-clé |
| Chargebacks élevés | Modérée | Moyen | Monitoring PSP, scoring comportemental |

---

## 10. Roadmap Produit

### Accompli (depuis la dernière version)

| Module | Statut |
|---|---|
| Relances automatiques (ReminderBlock + backend) | ✅ Livré |
| Système d'alertes | ✅ Livré |
| Cartes entreprises + InteractiveCard3D | ✅ Livré |
| Virements + bénéficiaires | ✅ Livré |
| Transactions | ✅ Livré |
| TVA | ✅ Livré |
| Investissements / Placements de trésorerie | ✅ Livré |
| marketDataService (taux ECB live + cron) | ✅ Livré |
| Marketplace Partenariats | ✅ Livré |
| Assistant IA financier (panel + agent + workflows) | ✅ Livré |
| Page détail client (factures + devis associés) | ✅ Livré |
| Page Settings organisation | ✅ Livré |
| Design system unifié (slate, accent, success/danger/warning) | ✅ Livré |

### Priorité immédiate

| Tâche | Détail |
|---|---|
| Audit juridique marketplace | Vérifier statuts IOBSP / IAS / CIF requis avant commercialisation |
| Contrat BaaS Treezor | Obtenir IBAN FR, réduire dépendance Solaris |
| Dispositif LCB-FT documenté | Procédures AML, MLRO désigné, outil transaction monitoring |
| Stripe réel | Activer clés prod, `POST /api/invoices/:id/create-payment-link` |
| Validation terrain PME | 15 entretiens DAF/CEO, LoI de 3–5 PME pilotes |

### Priorité moyenne

| Tâche | Détail |
|---|---|
| Export FEC / PDF factures + devis | Conformité comptable |
| Intégration Pennylane | Connecteur natif (priorité canal expert-comptable) |
| Pagination UI avancée | Dépenses, transactions, comptabilité |
| Rappels automatiques cron | Tâche planifiée : détection factures en retard, devis expirés |
| Programme partenaires experts-comptables | Portail dédié, commissions, reporting client consolidé |

### Vision à moyen terme

| Fonctionnalité | Priorité | Complexité |
|---|---|---|
| Score de santé financière PME | Haute | Moyenne |
| Notes de frais automatiques + OCR | Haute | Moyenne |
| Prévisions de trésorerie IA (30/60/90 jours) | Haute | Élevée |
| Workflow validation dépenses (soumission → approbation) | Moyenne | Moyenne |
| Intégration Cegid / Sage | Moyenne | Élevée |
| Internationalisation (DACH, Espagne) | Basse | Élevée |
| Préparation dossier EMI | Haute (à partir de 200 clients) | Très élevée |

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
- Ne jamais committer `.env`, `.env.local`, ni fichiers contenant des secrets
- Toujours utiliser le design system (slate/accent/success/danger) — pas de couleurs arbitraires

### Badge statuts → couleurs

| Statut | Couleur |
|---|---|
| `draft` | Gris (`slate`) |
| `sent` | Bleu (`accent`) |
| `email_opened` | Indigo |
| `viewed` | Indigo |
| `payment_initiated` | Violet |
| `paid` | Vert (`success`) |
| `late` | Rouge (`danger`) |
| `cancelled` | Jaune (`warning`) |
| `accepted` | Vert (`success`) |
| `refused` | Rouge (`danger`) |
| `expired` | Jaune (`warning`) |
| `active` | Vert (`success`) |
| `withdrawn` | Gris (`slate`) |
| `matured` | Bleu (`accent`) |

---

*Fluxora — Document interne — Mars 2026*
