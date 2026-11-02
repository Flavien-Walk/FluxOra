import { LegalHeader, Section, Table, Mail } from '../LegalParts';

export const metadata = { title: 'Politique de cookies — Fluxora' };

export default function Cookies() {
  return (
    <article className="max-w-none">
      <LegalHeader eyebrow="Cookies" title="Politique de cookies" updated="septembre 2026" />

      <Section title="1. Ce que nous déposons">
        <p>
          Fluxora n&apos;utilise <strong>que des cookies strictement nécessaires</strong> au fonctionnement du service
          (connexion et sécurité). Aucun cookie publicitaire ni de mesure d&apos;audience n&apos;est déposé : c&apos;est pourquoi
          aucun bandeau de consentement n&apos;est affiché (lignes directrices CNIL du 17 septembre 2020).
        </p>
        <Table
          head={['Nom', 'Fournisseur', 'Finalité', 'Durée']}
          rows={[
            ['__session, __client_uat', 'Clerk', 'Maintien de votre session de connexion', 'Session / 1 an'],
            ['__clerk_db_jwt, __clerk_*', 'Clerk', 'Sécurisation de l’authentification', 'Session'],
            ['Stockage local du navigateur', 'Fluxora', 'Préférences d’affichage (ex. services partenaires connectés)', 'Jusqu’à suppression'],
          ]}
        />
      </Section>

      <Section title="2. Paiement en ligne">
        <p>
          Lorsque vous réglez une facture, vous êtes redirigé vers Stripe, qui dépose ses propres cookies nécessaires à la
          sécurité de la transaction, selon sa politique de cookies.
        </p>
      </Section>

      <Section title="3. Emails de devis et de factures">
        <p>
          Le suivi d&apos;ouverture des emails (pixel invisible) est <strong>désactivé par défaut</strong>. S&apos;il est activé par
          l&apos;entreprise qui vous écrit, celle-ci doit vous en informer.
        </p>
      </Section>

      <Section title="4. Contact">
        <p>Pour toute question relative aux cookies : <Mail />.</p>
      </Section>
    </article>
  );
}
