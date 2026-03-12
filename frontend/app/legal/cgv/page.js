export const metadata = { title: 'CGV — Conditions Générales de Vente — Fluxora' };

export default function CGV() {
  return (
    <article className="prose prose-slate max-w-none">
      <div className="mb-10">
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">Conditions Générales de Vente</span>
        <h1 className="text-3xl font-bold text-slate-900 mt-2 mb-1">CGV — Conditions Générales de Vente</h1>
        <p className="text-sm text-slate-400">Version 1.0 — Dernière mise à jour : mars 2026</p>
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">1. Objet</h2>
        <p className="text-slate-600 leading-relaxed">
          Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre Fluxora SAS
          (ci-après « Fluxora ») et tout client professionnel (ci-après « le Client ») souscrivant à un plan payant
          de la Plateforme Fluxora. Elles prévalent sur tout autre document du Client.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">2. Plans et tarifs</h2>
        <p className="text-slate-600 leading-relaxed">Les plans disponibles sont :</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm text-slate-600 border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left p-3 font-semibold text-slate-700 border border-slate-200">Plan</th>
                <th className="text-left p-3 font-semibold text-slate-700 border border-slate-200">Prix HT/mois</th>
                <th className="text-left p-3 font-semibold text-slate-700 border border-slate-200">Utilisateurs</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-slate-200">Starter</td>
                <td className="p-3 border border-slate-200">49 €</td>
                <td className="p-3 border border-slate-200">1</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="p-3 border border-slate-200">Business</td>
                <td className="p-3 border border-slate-200">99 €</td>
                <td className="p-3 border border-slate-200">Jusqu&apos;à 10</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200">Enterprise</td>
                <td className="p-3 border border-slate-200">Sur devis</td>
                <td className="p-3 border border-slate-200">Illimité</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-slate-500 text-sm mt-3">
          Tous les prix s&apos;entendent hors taxes. TVA applicable au taux en vigueur (20%). Fluxora se réserve le droit
          de modifier ses tarifs avec un préavis de 30 jours.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">3. Souscription et prise d&apos;effet</h2>
        <p className="text-slate-600 leading-relaxed">
          La souscription est effectuée en ligne via la Plateforme. Le contrat prend effet à la date de validation
          du paiement. L&apos;abonnement est mensuel, renouvelable par tacite reconduction.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">4. Modalités de paiement</h2>
        <p className="text-slate-600 leading-relaxed">
          Le paiement est effectué par carte bancaire via notre prestataire de paiement sécurisé (Stripe).
          Le prélèvement est effectué le jour de la souscription, puis à chaque date anniversaire mensuelle.
          En cas d&apos;échec de paiement, Fluxora se réserve le droit de suspendre l&apos;accès à la Plateforme
          après un délai de grâce de 7 jours.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">5. Droit de rétractation</h2>
        <p className="text-slate-600 leading-relaxed">
          Conformément à l&apos;article L221-28 du Code de la consommation, le droit de rétractation ne s&apos;applique pas
          aux contrats de fourniture de contenu numérique dont l&apos;exécution a commencé avec l&apos;accord exprès du consommateur.
        </p>
        <p className="text-slate-600 leading-relaxed mt-3">
          Toutefois, Fluxora accorde à tout nouveau Client un délai de 14 jours à compter de la souscription pour
          demander un remboursement intégral, sans justification, en contactant <a href="mailto:support@fluxora.io" className="text-indigo-600">support@fluxora.io</a>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">6. Résiliation</h2>
        <p className="text-slate-600 leading-relaxed">
          Le Client peut résilier son abonnement à tout moment depuis ses paramètres de compte.
          La résiliation prend effet à la fin de la période d&apos;abonnement en cours. Aucun remboursement
          au prorata ne sera effectué pour la période restante, sauf accord exprès de Fluxora.
        </p>
        <p className="text-slate-600 leading-relaxed mt-3">
          En cas de manquement grave du Client aux CGU ou aux présentes CGV, Fluxora se réserve le droit
          de résilier le contrat sans préavis ni indemnité.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">7. Facturation</h2>
        <p className="text-slate-600 leading-relaxed">
          Une facture est émise automatiquement à chaque paiement et disponible en téléchargement dans
          l&apos;espace client. Les factures sont conformes aux exigences fiscales françaises et mentionnent
          le numéro de TVA intracommunautaire de Fluxora.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">8. Force majeure</h2>
        <p className="text-slate-600 leading-relaxed">
          Fluxora ne pourra être tenue responsable de tout manquement à ses obligations contractuelles
          résultant d&apos;un événement de force majeure au sens de l&apos;article 1218 du Code civil.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">9. Médiation et litiges</h2>
        <p className="text-slate-600 leading-relaxed">
          En cas de litige, le Client peut recourir gratuitement à un médiateur de la consommation.
          Le Client peut également saisir la plateforme européenne de règlement en ligne des litiges :
          <a href="https://ec.europa.eu/consumers/odr" className="text-indigo-600 ml-1" target="_blank" rel="noopener noreferrer">
            ec.europa.eu/consumers/odr
          </a>.
        </p>
        <p className="text-slate-600 leading-relaxed mt-3">
          Les présentes CGV sont soumises au droit français. À défaut de résolution amiable,
          le tribunal compétent sera celui du siège social de Fluxora SAS.
        </p>
      </section>
    </article>
  );
}
