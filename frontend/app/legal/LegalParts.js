// Éléments de mise en page partagés par les pages légales
export const CONTACT_EMAIL = 'mvpfintech798@gmail.com';

export function LegalHeader({ eyebrow, title, updated }) {
  return (
    <div className="mb-10">
      <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">{eyebrow}</span>
      <h1 className="text-3xl font-bold text-slate-900 mt-2 mb-1">{title}</h1>
      <p className="text-sm text-slate-500">Dernière mise à jour : {updated}</p>
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-slate-800 mb-4">{title}</h2>
      <div className="space-y-3 text-slate-600 leading-relaxed">{children}</div>
    </section>
  );
}

export function Table({ head, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-slate-600 border-collapse">
        <thead>
          <tr className="bg-slate-100">
            {head.map((h) => <th key={h} scope="col" className="text-left p-3 font-semibold text-slate-700 border border-slate-200">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} className="p-3 border border-slate-200 align-top">{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Mail() {
  return <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600">{CONTACT_EMAIL}</a>;
}
