import { LegalHeader, Section, Table, Mail } from '../LegalParts';

export const metadata = { title: 'Politique de confidentialité — Fluxora' };

export default function Confidentialite() {
  return (
    <article className="max-w-none">
      <LegalHeader eyebrow="RGPD & Confidentialité" title="Politique de confidentialité" updated="septembre 2026" />

      <Section title="1. Qui est responsable de vos données ?">
        <p>
          Fluxora est un projet étudiant réalisé dans le cadre du cursus Epitech, proposé en <strong>bêta non commerciale</strong>.
          L&apos;équipe projet (voir les <a href="/legal/mentions-legales" className="text-indigo-600">mentions légales</a>) est responsable
          des traitements décrits ici. Pour toute question ou pour exercer vos droits : <Mail />.
        </p>
        <p>
          Pour les données de <strong>vos propres clients</strong> que vous saisissez dans Fluxora (noms, emails, factures), vous êtes
          responsable de traitement et Fluxora agit comme <strong>sous-traitant</strong> (art. 28 RGPD) : nous ne les utilisons que pour
          vous fournir le service.
        </p>
      </Section>

      <Section title="2. Données traitées">
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Compte :</strong> nom, email, identifiant de connexion (géré par Clerk).</li>
          <li><strong>Organisation :</strong> raison sociale, SIRET, adresse, n° de TVA, email et téléphone de contact.</li>
          <li><strong>Données de gestion :</strong> clients, devis, factures, dépenses et justificatifs, écritures comptables, bénéficiaires (IBAN).</li>
          <li><strong>Journal de sécurité :</strong> actions d&apos;écriture (date, utilisateur, action, résultat) et adresse IP tronquée.</li>
          <li><strong>Assistant IA et Communication (facultatifs) :</strong> messages envoyés à l&apos;assistant, posts rédigés, et jeton de connexion LinkedIn (chiffré).</li>
          <li><strong>Paiements :</strong> traités par Stripe ; Fluxora ne voit ni ne stocke aucun numéro de carte.</li>
        </ul>
      </Section>

      <Section title="3. Finalités et bases légales">
        <Table
          head={['Finalité', 'Base légale (art. 6 RGPD)']}
          rows={[
            ['Fournir le service (facturation, dépenses, trésorerie, TVA)', 'Exécution du contrat'],
            ['Envoyer vos devis et factures par email à vos clients', 'Exécution du contrat'],
            ['Assistant IA et rédaction de posts', 'Exécution du contrat — fonction facultative, désactivable'],
            ['Suivi d’ouverture des emails envoyés à vos clients', 'Désactivé par défaut ; activable par vous, qui devez alors en informer vos clients'],
            ['Sécurité du service et journal d’audit', 'Intérêt légitime (prévention de la fraude et des abus)'],
            ['Conservation des pièces comptables', 'Obligation légale (C. com. L123-22)'],
          ]}
        />
      </Section>

      <Section title="4. Destinataires et sous-traitants">
        <Table
          head={['Prestataire', 'Rôle', 'Localisation', 'Encadrement']}
          rows={[
            ['MongoDB Atlas (AWS)', 'Base de données', 'UE — Paris (eu-west-3)', 'DPA MongoDB'],
            ['Render', 'API (serveur)', 'UE — Francfort', 'DPA Render ; société américaine : DPF / clauses types'],
            ['Cloudflare', 'Réseau devant l’API (Render)', 'Mondial', 'DPF / clauses types'],
            ['Vercel', 'Hébergement de l’interface', 'États-Unis / réseau mondial', 'DPF / clauses types'],
            ['Clerk', 'Authentification', 'États-Unis', 'DPF / clauses types'],
            ['Anthropic', 'Assistant IA (modèle Claude)', 'États-Unis', 'DPA Anthropic, clauses types ; fonction désactivable'],
            ['Brevo', 'Envoi des emails', 'UE (France)', 'DPA Brevo'],
            ['Stripe', 'Paiement des factures', 'UE / États-Unis', 'DPF / clauses types'],
            ['Mindee', 'Lecture automatique des reçus (OCR)', 'UE (France)', 'DPA Mindee'],
            ['LinkedIn, Unsplash', 'Publication de posts, photos (si vous les utilisez)', 'Irlande / États-Unis', 'Conditions de ces services'],
          ]}
        />
        <p className="text-sm">DPF : EU-U.S. Data Privacy Framework (décision d&apos;adéquation du 10 juillet 2023). Clauses types : clauses contractuelles types de la Commission européenne (art. 46 RGPD).</p>
      </Section>

      <Section title="5. Durées de conservation">
        <ul className="list-disc pl-5 space-y-2">
          <li>Données du compte et de l&apos;organisation : tant que le compte existe ; supprimées à la suppression de l&apos;organisation.</li>
          <li>Pièces comptables (factures, écritures) : c&apos;est à vous de les conserver <strong>10 ans</strong> — exportez-les avant de supprimer votre organisation.</li>
          <li>Journal de sécurité : <strong>12 mois</strong>, puis suppression automatique.</li>
          <li>Connexion LinkedIn : jusqu&apos;à déconnexion ou expiration (60 jours).</li>
        </ul>
      </Section>

      <Section title="6. Vos droits">
        <p>
          Vous disposez des droits d&apos;accès, de rectification, d&apos;effacement, de limitation, d&apos;opposition et de portabilité
          (art. 15 à 21 RGPD). Dans l&apos;application, <strong>Paramètres → Confidentialité</strong> permet d&apos;exporter toutes vos données
          et de supprimer votre organisation. Pour toute autre demande : <Mail /> (réponse sous un mois).
        </p>
        <p>
          Vous pouvez introduire une réclamation auprès de la CNIL : <a href="https://www.cnil.fr" className="text-indigo-600">www.cnil.fr</a>.
        </p>
      </Section>

      <Section title="7. Sécurité">
        <ul className="list-disc pl-5 space-y-2">
          <li>Chiffrement des échanges (HTTPS) et de la base au repos ; jetons des réseaux sociaux chiffrés (AES-256-GCM).</li>
          <li>Rôles par membre (lecteur, manager, finance, admin) et journal des actions d&apos;écriture.</li>
          <li>Limitation du nombre de requêtes, en-têtes de sécurité, mises à jour des dépendances.</li>
          <li>En cas de violation de données présentant un risque, notification à la CNIL sous 72 heures et information des personnes concernées si le risque est élevé (art. 33 et 34 RGPD).</li>
        </ul>
      </Section>
    </article>
  );
}
