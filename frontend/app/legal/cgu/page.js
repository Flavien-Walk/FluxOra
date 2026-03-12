export const metadata = { title: 'CGU — Conditions Générales d\'Utilisation — Fluxora' };

export default function CGU() {
  return (
    <article className="prose prose-slate max-w-none">
      <div className="mb-10">
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">Conditions Générales d&apos;Utilisation</span>
        <h1 className="text-3xl font-bold text-slate-900 mt-2 mb-1">CGU — Conditions Générales d&apos;Utilisation</h1>
        <p className="text-sm text-slate-400">Version 1.0 — Dernière mise à jour : mars 2026</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-10 text-sm text-amber-800">
        <strong>Important :</strong> Fluxora est un outil de gestion financière (logiciel SaaS). Fluxora n&apos;est pas une banque,
        un établissement de paiement, ni un établissement de crédit. Fluxora ne détient aucun fonds pour le compte de ses utilisateurs.
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">1. Objet</h2>
        <p className="text-slate-600 leading-relaxed">
          Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») régissent l&apos;accès et l&apos;utilisation
          de la plateforme Fluxora (ci-après « la Plateforme »), éditée par Fluxora SAS.
          Toute utilisation de la Plateforme implique l&apos;acceptation pleine et entière des présentes CGU.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">2. Définitions</h2>
        <ul className="space-y-2 text-slate-600">
          <li><strong>Utilisateur :</strong> toute personne physique ou morale accédant à la Plateforme.</li>
          <li><strong>Organisation :</strong> entité (entreprise, freelance) créée par l&apos;Utilisateur dans Fluxora.</li>
          <li><strong>Données :</strong> toute information saisie, importée ou générée par l&apos;Utilisateur dans la Plateforme.</li>
          <li><strong>Services :</strong> l&apos;ensemble des fonctionnalités proposées par Fluxora (gestion des dépenses, facturation, reporting, etc.).</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">3. Accès à la Plateforme</h2>
        <p className="text-slate-600 leading-relaxed">
          L&apos;accès à la Plateforme nécessite la création d&apos;un compte via notre prestataire d&apos;authentification (Clerk).
          L&apos;Utilisateur est responsable de la confidentialité de ses identifiants et de toutes les actions effectuées depuis son compte.
        </p>
        <p className="text-slate-600 leading-relaxed mt-3">
          Fluxora se réserve le droit de suspendre ou de résilier l&apos;accès à tout compte en cas de violation des présentes CGU,
          d&apos;utilisation frauduleuse, ou de comportement portant atteinte aux intérêts de Fluxora ou de tiers.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">4. Description des Services</h2>
        <p className="text-slate-600 leading-relaxed">La Plateforme propose notamment :</p>
        <ul className="mt-3 space-y-1 text-slate-600">
          <li>Gestion des cartes entreprises (émission, plafonds, blocage)</li>
          <li>Suivi et catégorisation des dépenses</li>
          <li>Gestion des virements et bénéficiaires</li>
          <li>Facturation, devis et relances automatiques</li>
          <li>Reporting financier et tableaux de bord</li>
          <li>Automatisation comptable et export vers expert-comptable</li>
          <li>Suivi de trésorerie en temps réel</li>
        </ul>
        <p className="text-slate-600 leading-relaxed mt-3">
          Les fonctionnalités disponibles dépendent du plan souscrit. Fluxora se réserve le droit de modifier,
          d&apos;ajouter ou de supprimer des fonctionnalités à tout moment, sous réserve d&apos;un préavis raisonnable.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">5. Obligations de l&apos;Utilisateur</h2>
        <p className="text-slate-600 leading-relaxed">L&apos;Utilisateur s&apos;engage à :</p>
        <ul className="mt-3 space-y-1 text-slate-600">
          <li>Fournir des informations exactes et à les maintenir à jour</li>
          <li>Ne pas utiliser la Plateforme à des fins illicites ou frauduleuses</li>
          <li>Ne pas tenter d&apos;accéder aux données d&apos;autres utilisateurs</li>
          <li>Ne pas perturber le fonctionnement de la Plateforme</li>
          <li>Respecter les lois applicables en matière fiscale, comptable et de lutte contre le blanchiment d&apos;argent (LCB-FT)</li>
          <li>Ne pas utiliser la Plateforme pour dissimuler des activités illicites ou contourner des obligations réglementaires</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">6. Propriété des données</h2>
        <p className="text-slate-600 leading-relaxed">
          L&apos;Utilisateur conserve la pleine propriété de ses Données. Fluxora n&apos;acquiert aucun droit de propriété
          sur les Données de l&apos;Utilisateur. Fluxora est autorisée à traiter ces Données uniquement dans le cadre
          de la fourniture des Services et conformément à sa Politique de confidentialité.
        </p>
        <p className="text-slate-600 leading-relaxed mt-3">
          L&apos;Utilisateur peut à tout moment exporter l&apos;intégralité de ses Données depuis la Plateforme,
          dans un format standard (CSV, PDF).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">7. Disponibilité et maintenance</h2>
        <p className="text-slate-600 leading-relaxed">
          Fluxora s&apos;efforce d&apos;assurer une disponibilité maximale de la Plateforme (objectif 99,9% selon le plan).
          Des interruptions peuvent survenir pour des opérations de maintenance, des incidents techniques ou des événements
          de force majeure. Fluxora ne saurait être tenue responsable des interruptions de service.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">8. Limitation de responsabilité</h2>
        <p className="text-slate-600 leading-relaxed">
          Fluxora est un outil d&apos;aide à la gestion financière. Les informations affichées (reporting, trésorerie, projections)
          sont fournies à titre indicatif et ne constituent pas un conseil financier, fiscal ou juridique.
          L&apos;Utilisateur reste seul responsable de ses décisions financières et de la conformité de ses obligations légales
          (déclarations fiscales, obligations comptables, etc.).
        </p>
        <p className="text-slate-600 leading-relaxed mt-3">
          La responsabilité de Fluxora ne pourra être engagée que pour des dommages directs résultant d&apos;une faute prouvée,
          et sera en tout état de cause limitée au montant des sommes effectivement versées par l&apos;Utilisateur
          à Fluxora au cours des 12 derniers mois.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">9. Résiliation</h2>
        <p className="text-slate-600 leading-relaxed">
          L&apos;Utilisateur peut résilier son compte à tout moment depuis ses paramètres. La résiliation prend effet
          à la fin de la période d&apos;abonnement en cours. L&apos;Utilisateur dispose d&apos;un délai de 30 jours
          après la résiliation pour exporter ses Données.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">10. Modification des CGU</h2>
        <p className="text-slate-600 leading-relaxed">
          Fluxora se réserve le droit de modifier les présentes CGU à tout moment. L&apos;Utilisateur sera informé
          par email ou par notification dans la Plateforme au moins 30 jours avant l&apos;entrée en vigueur des modifications.
          La poursuite de l&apos;utilisation de la Plateforme après cette date vaut acceptation des nouvelles CGU.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">11. Droit applicable</h2>
        <p className="text-slate-600 leading-relaxed">
          Les présentes CGU sont soumises au droit français. En cas de litige, les parties s&apos;efforceront de trouver
          une solution amiable. À défaut, les tribunaux du ressort du siège social de Fluxora SAS seront seuls compétents.
        </p>
      </section>
    </article>
  );
}
