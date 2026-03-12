export const metadata = { title: 'Mentions légales — Fluxora' };

export default function MentionsLegales() {
  return (
    <article className="prose prose-slate max-w-none">
      <div className="mb-10">
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">Mentions légales</span>
        <h1 className="text-3xl font-bold text-slate-900 mt-2 mb-1">Mentions légales</h1>
        <p className="text-sm text-slate-400">Dernière mise à jour : mars 2026</p>
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">1. Éditeur du site</h2>
        <p className="text-slate-600 leading-relaxed">
          Le site <strong>fluxora.io</strong> est édité par la société <strong>Fluxora SAS</strong>, société par actions simplifiée au capital de [montant] €,
          immatriculée au Registre du Commerce et des Sociétés de [ville] sous le numéro SIRET [numéro],
          dont le siège social est situé à [adresse complète], France.
        </p>
        <ul className="mt-4 space-y-1 text-slate-600">
          <li><strong>Directeur de la publication :</strong> [Nom du dirigeant]</li>
          <li><strong>Email :</strong> <a href="mailto:contact@fluxora.io" className="text-indigo-600">contact@fluxora.io</a></li>
          <li><strong>TVA intracommunautaire :</strong> FR[numéro]</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">2. Hébergement</h2>
        <p className="text-slate-600 leading-relaxed">
          Le site est hébergé par :
        </p>
        <ul className="mt-3 space-y-1 text-slate-600">
          <li><strong>Frontend :</strong> Vercel Inc., 340 Pine Street, Suite 701, San Francisco, CA 94104, États-Unis</li>
          <li><strong>Backend / API :</strong> Render Services Inc., 525 Brannan Street, Suite 300, San Francisco, CA 94107, États-Unis</li>
          <li><strong>Base de données :</strong> MongoDB Atlas (MongoDB Inc.) — région EU (Ireland)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">3. Nature du service</h2>
        <p className="text-slate-600 leading-relaxed">
          Fluxora est un logiciel de gestion financière (cockpit financier) destiné aux freelances, TPE et PME.
          <strong> Fluxora n'est pas un établissement de crédit, ni un établissement de paiement, ni une entreprise d'investissement.</strong>
          Fluxora ne détient pas les fonds de ses utilisateurs. Les services de paiement, lorsqu'ils sont proposés,
          sont fournis par des partenaires agréés par l'Autorité de Contrôle Prudentiel et de Résolution (ACPR)
          ou par d'autres autorités compétentes de l'Espace Économique Européen.
        </p>
        <p className="text-slate-600 leading-relaxed mt-3">
          Fluxora agit en qualité d'agent de services d'information sur les comptes (AIS) et/ou d'intermédiaire technique,
          dans le cadre de la Directive sur les Services de Paiement 2 (DSP2 / PSD2),
          lorsqu'il est amené à agréger des données de compte bancaire tierces avec le consentement explicite de l'utilisateur.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">4. Propriété intellectuelle</h2>
        <p className="text-slate-600 leading-relaxed">
          L'ensemble des contenus présents sur le site fluxora.io (textes, images, logos, graphismes, interfaces, code source)
          est la propriété exclusive de Fluxora SAS ou de ses concédants de licence, et est protégé par les lois françaises
          et internationales relatives à la propriété intellectuelle.
        </p>
        <p className="text-slate-600 leading-relaxed mt-3">
          Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site,
          quel que soit le moyen ou le procédé utilisé, est interdite sans l'autorisation préalable et écrite de Fluxora SAS,
          sauf dispositions légales contraires.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">5. Limitation de responsabilité</h2>
        <p className="text-slate-600 leading-relaxed">
          Fluxora SAS s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur son site.
          Toutefois, Fluxora SAS ne peut garantir l'exactitude, la complétude ou l'actualité des informations diffusées,
          notamment à caractère financier. Ces informations sont fournies à titre indicatif et ne constituent pas
          un conseil en investissement, un conseil fiscal ou un conseil juridique.
        </p>
        <p className="text-slate-600 leading-relaxed mt-3">
          Fluxora SAS ne saurait être tenue responsable des dommages directs ou indirects résultant de l'utilisation
          des informations présentes sur le site ou de l'impossibilité d'y accéder.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">6. Droit applicable et juridiction compétente</h2>
        <p className="text-slate-600 leading-relaxed">
          Le présent site et les présentes mentions légales sont soumis au droit français.
          En cas de litige relatif à l'utilisation du site, les tribunaux français seront seuls compétents.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">7. Contact</h2>
        <p className="text-slate-600 leading-relaxed">
          Pour toute question relative aux présentes mentions légales, vous pouvez nous contacter à :{' '}
          <a href="mailto:legal@fluxora.io" className="text-indigo-600 hover:underline">legal@fluxora.io</a>
        </p>
      </section>
    </article>
  );
}
