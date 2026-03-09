import {
  Users, FileText, ClipboardList, Receipt,
  BookOpen, BarChart3,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Users,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    border: 'hover:border-emerald-500/30',
    title: 'CRM Clients',
    desc: 'Centralisez vos contacts, suivez l\'historique de chaque client et accédez à toutes leurs factures en un clic.',
  },
  {
    icon: ClipboardList,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    border: 'hover:border-blue-500/30',
    title: 'Devis professionnels',
    desc: 'Créez des devis en quelques secondes, envoyez-les par email et transformez-les en factures d\'un clic.',
  },
  {
    icon: FileText,
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-400',
    border: 'hover:border-indigo-500/30',
    title: 'Facturation simple',
    desc: 'Générez des factures PDF conformes, suivez les paiements et relancez automatiquement les clients en retard.',
  },
  {
    icon: Receipt,
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-400',
    border: 'hover:border-rose-500/30',
    title: 'Suivi des dépenses',
    desc: 'Enregistrez vos dépenses par catégorie, visualisez vos postes de coût et gardez le cap sur votre budget.',
  },
  {
    icon: BookOpen,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    border: 'hover:border-amber-500/30',
    title: 'Comptabilité intégrée',
    desc: 'Toutes vos entrées et sorties dans un journal comptable clair. Export simplifié pour votre expert-comptable.',
  },
  {
    icon: BarChart3,
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    border: 'hover:border-purple-500/30',
    title: 'Dashboard analytique',
    desc: 'Visualisez votre chiffre d\'affaires, votre cashflow et vos KPI clés en temps réel sur un seul écran.',
  },
];

export default function FeaturesGrid() {
  return (
    <section id="features" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
            Tout ce dont vous avez besoin
          </div>
          <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">
            Un cockpit complet pour votre activité
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Fluxora remplace cinq outils par un seul. Moins de friction, plus de clarté, plus de temps pour votre métier.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`group p-7 rounded-2xl border border-slate-100 bg-white hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] ${f.border} hover:border transition-all duration-200 cursor-default`}
              >
                <div className={`inline-flex w-12 h-12 rounded-xl items-center justify-center mb-5 ${f.iconBg}`}>
                  <Icon size={22} className={f.iconColor} strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
