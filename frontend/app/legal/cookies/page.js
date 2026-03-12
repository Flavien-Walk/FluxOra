export const metadata = { title: 'Politique de cookies — Fluxora' };

export default function Cookies() {
  return (
    <article className="prose prose-slate max-w-none">
      <div className="mb-10">
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">Cookies</span>
        <h1 className="text-3xl font-bold text-slate-900 mt-2 mb-1">Politique de cookies</h1>
        <p className="text-sm text-slate-400">Version 1.0 — Dernière mise à jour : mars 2026</p>
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">1. Qu&apos;est-ce qu&apos;un cookie ?</h2>
        <p className="text-slate-600 leading-relaxed">
          Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone)
          lors de la visite d&apos;un site web. Il permet au site de mémoriser vos préférences et d&apos;améliorer
          votre expérience de navigation.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">2. Cookies utilisés par Fluxora</h2>

        <h3 className="text-base font-semibold text-slate-700 mb-3 mt-5">2.1 Cookies strictement nécessaires</h3>
        <p className="text-slate-600 leading-relaxed">
          Ces cookies sont indispensables au fonctionnement de la Plateforme. Ils ne peuvent pas être désactivés.
        </p>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm text-slate-600 border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left p-3 font-semibold text-slate-700 border border-slate-200">Nom</th>
                <th className="text-left p-3 font-semibold text-slate-700 border border-slate-200">Fournisseur</th>
                <th className="text-left p-3 font-semibold text-slate-700 border border-slate-200">Finalité</th>
                <th className="text-left p-3 font-semibold text-slate-700 border border-slate-200">Durée</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-slate-200">__clerk_*</td>
                <td className="p-3 border border-slate-200">Clerk</td>
                <td className="p-3 border border-slate-200">Session d&apos;authentification</td>
                <td className="p-3 border border-slate-200">Session</td>
              </tr>
              <tr className="bg-slate-50">
                <td className="p-3 border border-slate-200">__session</td>
                <td className="p-3 border border-slate-200">Fluxora</td>
                <td className="p-3 border border-slate-200">Maintien de la session utilisateur</td>
                <td className="p-3 border border-slate-200">7 jours</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-base font-semibold text-slate-700 mb-3 mt-8">2.2 Cookies de performance (analytics)</h3>
        <p className="text-slate-600 leading-relaxed">
          Ces cookies nous permettent de mesurer l&apos;audience et d&apos;améliorer nos services.
          Ils nécessitent votre consentement.
        </p>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm text-slate-600 border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="text-left p-3 font-semibold text-slate-700 border border-slate-200">Nom</th>
                <th className="text-left p-3 font-semibold text-slate-700 border border-slate-200">Fournisseur</th>
                <th className="text-left p-3 font-semibold text-slate-700 border border-slate-200">Finalité</th>
                <th className="text-left p-3 font-semibold text-slate-700 border border-slate-200">Durée</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-slate-200">_vercel_*</td>
                <td className="p-3 border border-slate-200">Vercel</td>
                <td className="p-3 border border-slate-200">Analytics de performance</td>
                <td className="p-3 border border-slate-200">24h</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-base font-semibold text-slate-700 mb-3 mt-8">2.3 Cookies de paiement</h3>
        <p className="text-slate-600 leading-relaxed">
          Lors du processus de paiement, Stripe dépose des cookies nécessaires à la sécurisation des transactions.
          Ces cookies sont soumis à la politique de cookies de Stripe.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">3. Gestion de vos préférences</h2>
        <p className="text-slate-600 leading-relaxed">
          Vous pouvez à tout moment modifier vos préférences cookies depuis le bandeau de consentement
          affiché lors de votre première visite, ou depuis vos paramètres de compte.
        </p>
        <p className="text-slate-600 leading-relaxed mt-3">
          Vous pouvez également configurer votre navigateur pour refuser tout ou partie des cookies.
          Attention : le refus des cookies nécessaires peut empêcher le bon fonctionnement de la Plateforme.
        </p>
        <ul className="mt-3 space-y-1 text-slate-600">
          <li><a href="https://support.google.com/chrome/answer/95647" className="text-indigo-600" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
          <li><a href="https://support.mozilla.org/fr/kb/activer-desactiver-cookies" className="text-indigo-600" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
          <li><a href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac" className="text-indigo-600" target="_blank" rel="noopener noreferrer">Safari</a></li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">4. Contact</h2>
        <p className="text-slate-600 leading-relaxed">
          Pour toute question relative aux cookies :{' '}
          <a href="mailto:dpo@fluxora.io" className="text-indigo-600">dpo@fluxora.io</a>
        </p>
      </section>
    </article>
  );
}
