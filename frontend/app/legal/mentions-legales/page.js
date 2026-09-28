import { LegalHeader, Section, Mail } from '../LegalParts';

export const metadata = { title: 'Mentions légales — Fluxora' };

export default function MentionsLegales() {
  return (
    <article className="max-w-none">
      <LegalHeader eyebrow="Mentions légales" title="Mentions légales" updated="septembre 2026" />

      <Section title="1. Éditeur">
        <p>
          Fluxora est un <strong>projet étudiant</strong> réalisé dans le cadre du cursus Epitech par Flavien Walk,
          Obinna Houngnibo et Maxime Besseas. Aucune société n&apos;est immatriculée à ce jour : le service est proposé
          en <strong>bêta non commerciale</strong>, sans facturation.
        </p>
        <p>Directeurs de la publication : les membres de l&apos;équipe projet. Contact : <Mail />.</p>
      </Section>

      <Section title="2. Hébergement">
        <ul className="list-disc pl-5 space-y-2">
          <li>Interface : Vercel Inc., San Francisco, Californie, États-Unis.</li>
          <li>API : Render Services Inc., San Francisco, États-Unis — serveurs en Union européenne (Francfort).</li>
          <li>Base de données : MongoDB Inc. (MongoDB Atlas), serveurs AWS à Paris (eu-west-3).</li>
        </ul>
      </Section>

      <Section title="3. Nature du service">
        <p>
          Fluxora est un logiciel de gestion (devis, factures, dépenses, TVA, trésorerie). Fluxora n&apos;est ni un
          établissement de crédit, ni un établissement de paiement, ni une entreprise d&apos;investissement, et ne détient
          pas les fonds de ses utilisateurs.
        </p>
        <p>
          Le paiement en ligne des factures est opéré par Stripe, établissement de paiement agréé. Dans la bêta, les
          virements, cartes et placements présentés sont des <strong>simulations</strong> : aucun ordre n&apos;est transmis à
          une banque. Les rendements affichés sont indicatifs et ne constituent pas un conseil en investissement.
        </p>
      </Section>

      <Section title="4. Propriété intellectuelle">
        <p>
          Les contenus du site (textes, logos, interfaces, code) appartiennent à l&apos;équipe projet ou à leurs auteurs
          respectifs. Les photos issues d&apos;Unsplash restent la propriété de leurs photographes, crédités à l&apos;affichage.
        </p>
      </Section>

      <Section title="5. Droit applicable">
        <p>Le site est soumis au droit français.</p>
      </Section>
    </article>
  );
}
