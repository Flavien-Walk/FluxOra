export const metadata = { title: 'Politique de confidentialité — Fluxora' };

export default function Confidentialite() {
  return (
    <article className="prose prose-slate max-w-none">
      <div className="mb-10">
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">RGPD &amp; Confidentialité</span>
        <h1 className="text-3xl font-bold text-slate-900 mt-2 mb-1">Politique de confidentialité</h1>
        <p className="text-sm text-slate-400">Version 1.0 — Dernière mise à jour : mars 2026</p>
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">1. Responsable du traitement</h2>
        <p className="text-slate-600 leading-relaxed">
          Le responsable du traitement des données personnelles est <strong>Fluxora SAS</strong>,
          dont le siège social est situé à [adresse], France. Contact DPO : <a href="mailto:dpo@fluxora.io" className="text-indigo-600">dpo@fluxora.io</a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">2. Données collectées</h2>
        <p className="text-slate-600 leading-relaxed">Nous collectons les catégories de données suivantes :</p>
        <ul className="mt-3 space-y-2 text-slate-600">
          <li><strong>Données d&apos;identification :</strong> nom, prénom, adresse email, numéro de téléphone</li>
          <li><strong>Données professionnelles :</strong> nom de l&apos;entreprise, SIRET, adresse, TVA intracommunautaire</li>
          <li><strong>Données financières :</strong> données de facturation, dépenses, flux de trésorerie (saisies par l&apos;utilisateur)</li>
          <li><strong>Données de connexion :</strong> adresse IP, logs d&apos;accès, cookies techniques</li>
          <li><strong>Données de paiement :</strong> gérées exclusivement par Stripe — Fluxora ne stocke aucun numéro de carte</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">3. Finalités et bases légales</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-slate-600 border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left p-3 font-semibold text-slate-700 border border-slate-200">Finalité</th>
                <th className="text-left p-3 font-semibold text-slate-700 border border-slate-200">Base légale</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-slate-200">Fourniture du service Fluxora</td>
                <td className="p-3 border border-slate-200">Exécution du contrat</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="p-3 border border-slate-200">Facturation et gestion des abonnements</td>
                <td className="p-3 border border-slate-200">Obligation légale / Exécution du contrat</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200">Sécurité et prévention de la fraude</td>
                <td className="p-3 border border-slate-200">Intérêt légitime</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="p-3 border border-slate-200">Communications marketing</td>
                <td className="p-3 border border-slate-200">Consentement</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200">Amélioration du service (analytics anonymisés)</td>
                <td className="p-3 border border-slate-200">Intérêt légitime</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="p-3 border border-slate-200">Respect des obligations LCB-FT (AML)</td>
                <td className="p-3 border border-slate-200">Obligation légale</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">4. Sous-traitants et transferts</h2>
        <p className="text-slate-600 leading-relaxed">Fluxora fait appel aux sous-traitants suivants :</p>
        <ul className="mt-3 space-y-2 text-slate-600">
          <li><strong>Clerk (auth) :</strong> authentification et gestion des sessions — USA (CCF)</li>
          <li><strong>Stripe (paiement) :</strong> traitement des paiements — USA (CCF)</li>
          <li><strong>MongoDB Atlas (BDD) :</strong> hébergement base de données — UE (Irlande)</li>
          <li><strong>Vercel (frontend) :</strong> hébergement de l&apos;interface — USA (CCF)</li>
          <li><strong>Render (backend) :</strong> hébergement de l&apos;API — USA (CCF)</li>
          <li><strong>SendGrid (emails) :</strong> envoi d&apos;emails transactionnels — USA (CCF)</li>
        </ul>
        <p className="text-slate-500 text-sm mt-3">
          CCF = Clauses Contractuelles Types de la Commission Européenne. Tous les transferts hors UE
          sont encadrés par des garanties appropriées conformément au RGPD (art. 46).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">5. Durée de conservation</h2>
        <ul className="space-y-2 text-slate-600">
          <li><strong>Données de compte :</strong> durée de l&apos;abonnement + 3 ans après résiliation</li>
          <li><strong>Données comptables et financières :</strong> 10 ans (obligation légale)</li>
          <li><strong>Logs de connexion :</strong> 12 mois</li>
          <li><strong>Données de prospection :</strong> 3 ans après le dernier contact</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">6. Vos droits</h2>
        <p className="text-slate-600 leading-relaxed">
          Conformément au RGPD, vous disposez des droits suivants :
        </p>
        <ul className="mt-3 space-y-1 text-slate-600">
          <li>Droit d&apos;accès à vos données (art. 15)</li>
          <li>Droit de rectification (art. 16)</li>
          <li>Droit à l&apos;effacement (art. 17)</li>
          <li>Droit à la limitation du traitement (art. 18)</li>
          <li>Droit à la portabilité des données (art. 20)</li>
          <li>Droit d&apos;opposition (art. 21)</li>
          <li>Droit de retirer votre consentement à tout moment</li>
        </ul>
        <p className="text-slate-600 leading-relaxed mt-3">
          Pour exercer vos droits : <a href="mailto:dpo@fluxora.io" className="text-indigo-600">dpo@fluxora.io</a>
        </p>
        <p className="text-slate-600 leading-relaxed mt-3">
          Vous pouvez également déposer une réclamation auprès de la CNIL :{' '}
          <a href="https://www.cnil.fr" className="text-indigo-600" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">7. Sécurité</h2>
        <p className="text-slate-600 leading-relaxed">
          Fluxora met en œuvre les mesures techniques et organisationnelles suivantes pour protéger vos données :
        </p>
        <ul className="mt-3 space-y-1 text-slate-600">
          <li>Chiffrement en transit : TLS 1.3</li>
          <li>Chiffrement au repos : AES-256</li>
          <li>Authentification forte (MFA) disponible</li>
          <li>Accès aux données restreint par rôle (RBAC)</li>
          <li>Audit logs de toutes les actions sensibles</li>
          <li>Tests de sécurité réguliers</li>
          <li>Plan de réponse aux incidents conforme au RGPD (notification CNIL sous 72h si violation)</li>
        </ul>
      </section>
    </article>
  );
}
