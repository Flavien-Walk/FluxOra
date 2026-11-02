/**
 * PDF des factures, devis et avoirs (généré dans le navigateur avec jsPDF).
 * Reprend les mentions obligatoires d'une facture (CGI art. 242 nonies A, C. com. L441-9 et L441-10).
 */

// Montants au format français, sans espace insécable fine (non supportée par les polices PDF standard)
const money = (n, cur = 'EUR') => {
  const v = Number(n || 0);
  const [int, dec] = Math.abs(v).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${v < 0 ? '-' : ''}${grouped},${dec} ${cur === 'EUR' ? '€' : cur}`;
};
const date = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');
const clean = (s) => String(s ?? '').replace(/[  ]/g, ' ');

export const isDraftNumber = (n) => !n || String(n).startsWith('BROUILLON-');
export const displayNumber = (n) => (isDraftNumber(n) ? 'Brouillon' : n);

const KINDS = {
  invoice: { title: 'FACTURE', file: 'Facture' },
  quote: { title: 'DEVIS', file: 'Devis' },
  creditNote: { title: 'AVOIR', file: 'Avoir' },
};

/**
 * @param {'invoice'|'quote'|'creditNote'} kind
 * @param {object} doc     document (number, lines, subtotal, vatAmount, total, issueDate, dueDate/expiryDate, notes…)
 * @param {object} org     émetteur (name, address, siret, vatNumber, email, phone)
 * @param {object} client  destinataire (name, company, address, city, email, vatNumber, siret)
 */
export async function downloadDocumentPdf(kind, doc, org = {}, client = {}) {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210; const M = 18; let y = 20;
  const cur = doc.currency || 'EUR';
  const k = KINDS[kind];
  const draft = kind === 'invoice' && isDraftNumber(doc.number);

  const text = (t, x, yy, opts) => pdf.text(clean(t), x, yy, opts);
  const bold = (on = true) => pdf.setFont('helvetica', on ? 'bold' : 'normal');
  const gray = (on = true) => pdf.setTextColor(on ? 100 : 20);

  // En-tête : émetteur à gauche, type et numéro à droite
  bold(); pdf.setFontSize(15); gray(false); text(org.name || 'Entreprise', M, y);
  pdf.setFontSize(9); bold(false); gray();
  const orgLines = [org.address, org.siret && `SIRET : ${org.siret}`, org.vatNumber && `TVA intracom. : ${org.vatNumber}`, org.email, org.phone].filter(Boolean);
  orgLines.forEach((l, i) => text(l, M, y + 6 + i * 4.5));

  bold(); pdf.setFontSize(20); pdf.setTextColor(28, 110, 242); text(k.title, W - M, y, { align: 'right' });
  pdf.setFontSize(10); gray(false);
  text(draft ? 'BROUILLON — sans valeur' : `N° ${doc.number}`, W - M, y + 7, { align: 'right' });
  bold(false); pdf.setFontSize(9); gray();
  const meta = [
    `Date d’émission : ${date(doc.issueDate)}`,
    kind === 'invoice' && doc.dueDate && `Échéance : ${date(doc.dueDate)}`,
    kind === 'quote' && doc.expiryDate && `Valable jusqu’au : ${date(doc.expiryDate)}`,
    kind === 'creditNote' && doc.invoiceNumber && `Sur facture : ${doc.invoiceNumber}`,
  ].filter(Boolean);
  meta.forEach((l, i) => text(l, W - M, y + 13 + i * 4.5, { align: 'right' }));

  // Destinataire
  y = Math.max(y + 12 + orgLines.length * 4.5, y + 13 + meta.length * 4.5) + 6;
  pdf.setDrawColor(226, 232, 240); pdf.setFillColor(248, 250, 252);
  const clientLines = [client.company && client.name ? client.name : null, client.address, [client.city, client.country].filter(Boolean).join(' '),
    client.siret && `SIRET : ${client.siret}`, client.vatNumber && `TVA intracom. : ${client.vatNumber}`, client.email].filter(Boolean);
  const boxH = 10 + (clientLines.length + 1) * 4.5;
  pdf.roundedRect(W / 2, y, W / 2 - M, boxH, 2, 2, 'FD');
  pdf.setFontSize(8); gray(); text(kind === 'quote' ? 'DEVIS POUR' : 'FACTURÉ À', W / 2 + 4, y + 5);
  bold(); pdf.setFontSize(10); gray(false); text(client.company || client.name || 'Client', W / 2 + 4, y + 10.5);
  bold(false); pdf.setFontSize(9); gray();
  clientLines.forEach((l, i) => text(l, W / 2 + 4, y + 15 + i * 4.5));
  y += boxH + 10;

  // Tableau des lignes
  const cols = [M, 110, 128, 152, W - M]; // désignation, qté, PU HT, TVA, total HT (droite)
  const header = () => {
    pdf.setFillColor(241, 245, 249); pdf.rect(M, y - 5, W - 2 * M, 8, 'F');
    bold(); pdf.setFontSize(8.5); gray(false);
    text('Désignation', cols[0] + 2, y); text('Qté', cols[1], y, { align: 'right' }); text('PU HT', cols[2] + 14, y, { align: 'right' });
    text('TVA', cols[3] + 6, y, { align: 'right' }); text('Total HT', cols[4] - 2, y, { align: 'right' });
    bold(false); y += 8;
  };
  header();
  pdf.setFontSize(9);
  for (const l of doc.lines || []) {
    const desc = pdf.splitTextToSize(clean(l.description), cols[1] - cols[0] - 12);
    const h = desc.length * 4.5;
    if (y + h > 262) { pdf.addPage(); y = 20; header(); }
    gray(false); pdf.text(desc, cols[0] + 2, y);
    text(String(l.quantity), cols[1], y, { align: 'right' });
    text(money(l.unitPrice, cur), cols[2] + 14, y, { align: 'right' });
    text(`${l.vatRate} %`, cols[3] + 6, y, { align: 'right' });
    text(money(l.quantity * l.unitPrice, cur), cols[4] - 2, y, { align: 'right' });
    y += h + 3;
    pdf.setDrawColor(241, 245, 249); pdf.line(M, y - 2, W - M, y - 2);
  }

  // Totaux (avec ventilation de la TVA par taux)
  if (y > 225) { pdf.addPage(); y = 20; }
  y += 4;
  const byRate = {};
  (doc.lines || []).forEach((l) => { byRate[l.vatRate] = (byRate[l.vatRate] || 0) + l.quantity * l.unitPrice * (l.vatRate / 100); });
  const totals = [['Total HT', money(doc.subtotal, cur)], ...Object.entries(byRate).map(([r, v]) => [`TVA ${r} %`, money(v, cur)]), ['Total TTC', money(doc.total, cur)]];
  totals.forEach(([label, value], i) => {
    const last = i === totals.length - 1;
    bold(last); pdf.setFontSize(last ? 11 : 9.5); gray(!last);
    text(label, 140, y, { align: 'right' }); gray(false); text(value, W - M - 2, y, { align: 'right' });
    y += last ? 7 : 5.5;
  });
  if (kind === 'creditNote') { bold(false); pdf.setFontSize(9); gray(); text(`Motif : ${doc.reason || '—'}`, M, y); y += 6; }

  // Mentions
  y += 4; bold(false); pdf.setFontSize(8); gray();
  const mentions = [];
  if (doc.notes) mentions.push(doc.notes);
  if (kind === 'invoice') {
    mentions.push('Paiement à réception ou à l’échéance indiquée. Pas d’escompte pour paiement anticipé.');
    mentions.push('En cas de retard de paiement : pénalités au taux d’intérêt de la BCE majoré de 10 points et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 du Code de commerce).');
  }
  if (kind === 'quote') mentions.push('Devis valable jusqu’à la date indiquée. Bon pour accord : date et signature du client.');
  // Franchise en base : uniquement si aucune ligne ne porte de TVA
  if ((doc.lines || []).length && (doc.lines || []).every((l) => !Number(l.vatRate))) mentions.push('TVA non applicable, art. 293 B du CGI.');
  for (const m of mentions) {
    const wrapped = pdf.splitTextToSize(clean(m), W - 2 * M);
    if (y + wrapped.length * 4 > 285) { pdf.addPage(); y = 20; }
    pdf.text(wrapped, M, y); y += wrapped.length * 4 + 2;
  }

  // Pied de page
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i); pdf.setFontSize(7.5); gray();
    text(`${org.name || ''}${org.siret ? ` — SIRET ${org.siret}` : ''} — page ${i}/${pages}`, W / 2, 290, { align: 'center' });
  }

  pdf.save(`${k.file}-${draft ? 'brouillon' : doc.number}.pdf`);
}
