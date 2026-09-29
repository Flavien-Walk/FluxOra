const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const fmt = (n, currency = 'EUR') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n ?? 0);

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

const getServerUrl = () => process.env.SERVER_URL || 'https://fluxora-ld8h.onrender.com';
const getClientUrl = () => process.env.CLIENT_URL || 'https://flux-ora.vercel.app';

// ─── Template de base ────────────────────────────────────────────────────────
const baseTemplate = ({ title, preheader, bodyHtml, orgName }) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#4f46e5;border-radius:12px 12px 0 0;padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Fluxora</span>
                </td>
                <td align="right">
                  <span style="color:#c7d2fe;font-size:13px;">${orgName}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Document généré par <strong>Fluxora</strong> · ${orgName}
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#d1d5db;">
              Cet email a été envoyé automatiquement, merci de ne pas répondre directement.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`;

// ─── Template Facture ─────────────────────────────────────────────────────────
const invoiceEmailHtml = ({ invoice, org, client }) => {
  const serverUrl = getServerUrl();
  const clientUrl = getClientUrl();
  const token = invoice.trackingToken;
  const payUrl = `${clientUrl}/pay/${token}`;

  const linesHtml = invoice.lines.map((l) => `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 12px;font-size:14px;color:#374151;">${l.description}</td>
      <td style="padding:10px 12px;font-size:14px;color:#6b7280;text-align:center;">${l.quantity}</td>
      <td style="padding:10px 12px;font-size:14px;color:#6b7280;text-align:right;">${fmt(l.unitPrice, invoice.currency)}</td>
      <td style="padding:10px 12px;font-size:14px;color:#6b7280;text-align:center;">${l.vatRate}%</td>
      <td style="padding:10px 12px;font-size:14px;font-weight:600;color:#111827;text-align:right;">${fmt(l.quantity * l.unitPrice, invoice.currency)}</td>
    </tr>
  `).join('');

  const bodyHtml = `
    <h2 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111827;">Facture ${invoice.number}</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Émise le ${fmtDate(invoice.issueDate)}${invoice.dueDate ? ` · Échéance le ${fmtDate(invoice.dueDate)}` : ''}</p>

    <!-- Infos client -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Destinataire</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${client.name}</p>
          ${client.company ? `<p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${client.company}</p>` : ''}
          ${client.email ? `<p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${client.email}</p>` : ''}
        </td>
        <td width="16" />
        <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Émetteur</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${org.name}</p>
          ${org.email ? `<p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${org.email}</p>` : ''}
          ${org.siret ? `<p style="margin:2px 0 0;font-size:13px;color:#6b7280;">SIRET : ${org.siret}</p>` : ''}
        </td>
      </tr>
    </table>

    <!-- Tableau des lignes -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;text-align:left;">Prestation</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;text-align:center;">Qté</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;text-align:right;">PU HT</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;text-align:center;">TVA</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;text-align:right;">Total HT</th>
        </tr>
      </thead>
      <tbody>${linesHtml}</tbody>
    </table>

    <!-- Totaux -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td align="right">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:4px 16px;font-size:13px;color:#6b7280;text-align:right;">Sous-total HT</td>
              <td style="padding:4px 0;font-size:13px;color:#374151;text-align:right;min-width:100px;">${fmt(invoice.subtotal, invoice.currency)}</td>
            </tr>
            <tr>
              <td style="padding:4px 16px;font-size:13px;color:#6b7280;text-align:right;">TVA</td>
              <td style="padding:4px 0;font-size:13px;color:#374151;text-align:right;">${fmt(invoice.vatAmount, invoice.currency)}</td>
            </tr>
            <tr style="border-top:2px solid #e5e7eb;">
              <td style="padding:12px 16px;font-size:18px;font-weight:700;color:#111827;text-align:right;">Total TTC</td>
              <td style="padding:12px 0;font-size:18px;font-weight:700;color:#4f46e5;text-align:right;">${fmt(invoice.total, invoice.currency)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${invoice.notes ? `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#92400e;text-transform:uppercase;">Notes</p>
      <p style="margin:0;font-size:13px;color:#78350f;">${invoice.notes}</p>
    </div>` : ''}

    ${token ? `
    <!-- Bouton paiement -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="${payUrl}" style="display:inline-block;background:#4f46e5;color:#fff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:10px;letter-spacing:0.01em;">
            Payer maintenant — ${fmt(invoice.total, invoice.currency)}
          </a>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-top:8px;">
          <span style="font-size:11px;color:#9ca3af;">Paiement sécurisé · Carte, virement, SEPA</span>
        </td>
      </tr>
    </table>` : ''}

    <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;">
      Pour toute question, contactez-nous à <strong>${org.email || 'contact@fluxora.app'}</strong>
    </p>

    <p style="margin:16px 0 0;font-size:11px;line-height:1.5;color:#6b7280;text-align:center;">
      En cas de retard de paiement : pénalités au taux d’intérêt appliqué par la BCE majoré de 10 points
      et indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 du Code de commerce). Pas d’escompte pour paiement anticipé.
    </p>

    ${token && org.emailTrackingEnabled ? `<img src="${serverUrl}/api/public/track/invoice/${token}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;" />` : ''}
  `;

  return baseTemplate({
    title: `Facture ${invoice.number} — ${org.name}`,
    preheader: `Facture ${invoice.number} d'un montant de ${fmt(invoice.total, invoice.currency)} de ${org.name}`,
    bodyHtml,
    orgName: org.name,
  });
};

// ─── Template Devis ───────────────────────────────────────────────────────────
const quoteEmailHtml = ({ quote, org, client }) => {
  const serverUrl = getServerUrl();
  const clientUrl = getClientUrl();
  const token = quote.trackingToken;
  const quoteUrl = `${clientUrl}/q/${token}`;

  const linesHtml = quote.lines.map((l) => `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 12px;font-size:14px;color:#374151;">${l.description}</td>
      <td style="padding:10px 12px;font-size:14px;color:#6b7280;text-align:center;">${l.quantity}</td>
      <td style="padding:10px 12px;font-size:14px;color:#6b7280;text-align:right;">${fmt(l.unitPrice, quote.currency)}</td>
      <td style="padding:10px 12px;font-size:14px;color:#6b7280;text-align:center;">${l.vatRate}%</td>
      <td style="padding:10px 12px;font-size:14px;font-weight:600;color:#111827;text-align:right;">${fmt(l.quantity * l.unitPrice, quote.currency)}</td>
    </tr>
  `).join('');

  const bodyHtml = `
    ${quote.expiryDate ? `
    <div style="background:#eef2ff;border-left:4px solid #4f46e5;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#4338ca;font-weight:500;">
        Devis valable jusqu'au <strong>${fmtDate(quote.expiryDate)}</strong>.
      </p>
    </div>` : ''}

    <h2 style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111827;">Devis ${quote.number}</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Émis le ${fmtDate(quote.issueDate)}${quote.expiryDate ? ` · Valable jusqu'au ${fmtDate(quote.expiryDate)}` : ''}</p>

    <!-- Infos -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Destinataire</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${client.name}</p>
          ${client.company ? `<p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${client.company}</p>` : ''}
        </td>
        <td width="16" />
        <td style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Émetteur</p>
          <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${org.name}</p>
          ${org.email ? `<p style="margin:2px 0 0;font-size:13px;color:#6b7280;">${org.email}</p>` : ''}
        </td>
      </tr>
    </table>

    <!-- Tableau -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;text-align:left;">Prestation</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;text-align:center;">Qté</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;text-align:right;">PU HT</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;text-align:center;">TVA</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;text-align:right;">Total HT</th>
        </tr>
      </thead>
      <tbody>${linesHtml}</tbody>
    </table>

    <!-- Totaux -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td align="right">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:4px 16px;font-size:13px;color:#6b7280;text-align:right;">Sous-total HT</td>
              <td style="padding:4px 0;font-size:13px;color:#374151;text-align:right;min-width:100px;">${fmt(quote.subtotal, quote.currency)}</td>
            </tr>
            <tr>
              <td style="padding:4px 16px;font-size:13px;color:#6b7280;text-align:right;">TVA</td>
              <td style="padding:4px 0;font-size:13px;color:#374151;text-align:right;">${fmt(quote.vatAmount, quote.currency)}</td>
            </tr>
            <tr style="border-top:2px solid #e5e7eb;">
              <td style="padding:12px 16px;font-size:18px;font-weight:700;color:#111827;text-align:right;">Total TTC</td>
              <td style="padding:12px 0;font-size:18px;font-weight:700;color:#4f46e5;text-align:right;">${fmt(quote.total, quote.currency)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${quote.notes ? `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#92400e;text-transform:uppercase;">Notes</p>
      <p style="margin:0;font-size:13px;color:#78350f;">${quote.notes}</p>
    </div>` : ''}

    ${token ? `
    <!-- Boutons Accepter / Refuser -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#4f46e5;border-radius:8px;">
                <a href="${quoteUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;border-radius:8px;">
                  Consulter et répondre au devis
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding-top:12px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:0 8px;">
                <a href="${quoteUrl}?action=accept" style="display:inline-block;background:#d1fae5;color:#065f46;font-size:14px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:8px;border:1px solid #6ee7b7;">
                  Accepter
                </a>
              </td>
              <td style="padding:0 8px;">
                <a href="${quoteUrl}?action=refuse" style="display:inline-block;background:#fff;color:#6b7280;font-size:14px;font-weight:600;text-decoration:none;padding:10px 24px;border-radius:8px;border:1px solid #e5e7eb;">
                  Refuser
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>` : `
    <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;">
      Pour accepter ce devis ou pour toute question : <strong>${org.email || 'contact@fluxora.app'}</strong>
    </p>`}

    ${token && org.emailTrackingEnabled ? `<img src="${serverUrl}/api/public/track/quote/${token}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;" />` : ''}
  `;

  return baseTemplate({
    title: `Devis ${quote.number} — ${org.name}`,
    preheader: `Devis ${quote.number} d'un montant de ${fmt(quote.total, quote.currency)} de ${org.name}`,
    bodyHtml,
    orgName: org.name,
  });
};

// ─── Envoi via Brevo ──────────────────────────────────────────────────────────
const sendEmail = async ({ to, toName, subject, html }) => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('Envoi d’emails non configuré : BREVO_API_KEY manquante sur le serveur.');
  }
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@fluxora.app';
  const senderName = process.env.BREVO_SENDER_NAME || 'Fluxora';

  const body = JSON.stringify({
    sender: { name: senderName, email: senderEmail },
    to: [{ email: to, name: toName || to }],
    subject,
    htmlContent: html,
  });

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo error ${res.status}: ${err}`);
  }

  return res.json();
};

// ─── Exports ──────────────────────────────────────────────────────────────────
const sendInvoiceEmail = async ({ invoice, org, client, overrideEmail }) => {
  const toEmail = overrideEmail || client.email;
  if (!toEmail) throw new Error('Aucune adresse email pour ce client.');

  const html = invoiceEmailHtml({ invoice, org, client });
  return sendEmail({
    to: toEmail,
    toName: client.name,
    subject: `Facture ${invoice.number} — ${org.name}`,
    html,
  });
};

const sendQuoteEmail = async ({ quote, org, client, overrideEmail }) => {
  const toEmail = overrideEmail || client.email;
  if (!toEmail) throw new Error('Aucune adresse email pour ce client.');

  const html = quoteEmailHtml({ quote, org, client });
  return sendEmail({
    to: toEmail,
    toName: client.name,
    subject: `Devis ${quote.number} — ${org.name}`,
    html,
  });
};

// ─── Relances (factures impayées, devis en attente) ──────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Textes par type de relance : [objet, paragraphe principal]
const REMINDER_COPY = {
  before_due: (d) => [`Rappel : facture ${d.number} à régler le ${fmtDate(d.dueDate)}`,
    `Petit rappel : la facture <strong>${esc(d.number)}</strong> d’un montant de <strong>${fmt(d.total, d.currency)}</strong> arrive à échéance le <strong>${fmtDate(d.dueDate)}</strong>.`],
  on_due: (d) => [`Facture ${d.number} : échéance aujourd’hui`,
    `La facture <strong>${esc(d.number)}</strong> d’un montant de <strong>${fmt(d.total, d.currency)}</strong> arrive à échéance aujourd’hui.`],
  overdue_1: (d) => [`Relance : facture ${d.number} en attente de règlement`,
    `Sauf erreur de notre part, la facture <strong>${esc(d.number)}</strong> d’un montant de <strong>${fmt(d.total, d.currency)}</strong>, échue le <strong>${fmtDate(d.dueDate)}</strong>, n’a pas encore été réglée. Si le paiement est en cours, merci de ne pas tenir compte de ce message.`],
  overdue_2: (d) => [`2ᵉ relance : facture ${d.number} impayée`,
    `Malgré notre précédent rappel, la facture <strong>${esc(d.number)}</strong> d’un montant de <strong>${fmt(d.total, d.currency)}</strong>, échue le <strong>${fmtDate(d.dueDate)}</strong>, reste impayée. Nous vous remercions de procéder à son règlement dans les meilleurs délais.`],
  overdue_3: (d) => [`Dernière relance : facture ${d.number}`,
    `La facture <strong>${esc(d.number)}</strong> d’un montant de <strong>${fmt(d.total, d.currency)}</strong>, échue le <strong>${fmtDate(d.dueDate)}</strong>, demeure impayée. Sans règlement de votre part sous 8 jours, nous serons contraints d’engager une procédure de recouvrement. Pour rappel, tout retard entraîne des pénalités et une indemnité forfaitaire de 40 € (art. L441-10 du Code de commerce).`],
  quote_reminder: (d) => [`Votre devis ${d.number} — avez-vous pu le consulter ?`,
    `Nous revenons vers vous au sujet du devis <strong>${esc(d.number)}</strong> d’un montant de <strong>${fmt(d.total, d.currency)}</strong>. Avez-vous pu en prendre connaissance ? Nous restons disponibles pour toute question.`],
  expiry_warning: (d) => [`Votre devis ${d.number} expire le ${fmtDate(d.expiryDate)}`,
    `Le devis <strong>${esc(d.number)}</strong> d’un montant de <strong>${fmt(d.total, d.currency)}</strong> reste valable jusqu’au <strong>${fmtDate(d.expiryDate)}</strong>. Vous pouvez l’accepter en ligne en un clic.`],
  post_expiry: (d) => [`Votre devis ${d.number} a expiré`,
    `Le devis <strong>${esc(d.number)}</strong> a expiré le <strong>${fmtDate(d.expiryDate)}</strong>. Souhaitez-vous que nous vous en proposions une version mise à jour ?`],
};

/**
 * Envoie une relance par email.
 * @param {{ docType: 'invoice'|'quote', doc, org, client, type: string, to: string }} p
 * @returns {{ subject }}
 */
const sendReminderEmail = async ({ docType, doc, org, client, type, to }) => {
  const copy = REMINDER_COPY[type];
  if (!copy) throw new Error(`Type de relance inconnu : ${type}`);
  const [subject, paragraph] = copy(doc);
  const clientUrl = getClientUrl();
  const isInvoice = docType === 'invoice';
  const ctaUrl = isInvoice ? `${clientUrl}/pay/${doc.trackingToken}` : `${clientUrl}/q/${doc.trackingToken}`;
  const ctaLabel = isInvoice ? `Régler la facture — ${fmt(doc.total, doc.currency)}` : 'Consulter et accepter le devis';
  const pixel = org.emailTrackingEnabled && doc.trackingToken
    ? `<img src="${getServerUrl()}/api/public/track/${isInvoice ? 'invoice' : 'quote'}/${doc.trackingToken}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;" />`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;color:#111827;">Bonjour ${esc(client?.name || '')},</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">${paragraph}</p>
    ${doc.trackingToken ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td align="center">
      <a href="${ctaUrl}" style="display:inline-block;background:#4f46e5;color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;">${ctaLabel}</a>
    </td></tr></table>` : ''}
    <p style="margin:0;font-size:14px;color:#374151;">Cordialement,<br /><strong>${esc(org.name)}</strong>${org.email ? `<br /><span style="color:#6b7280;">${esc(org.email)}</span>` : ''}</p>
    ${pixel}
  `;

  await sendEmail({
    to,
    toName: client?.name,
    subject: `${subject} — ${org.name}`,
    html: baseTemplate({ title: subject, preheader: subject, bodyHtml, orgName: org.name }),
  });
  return { subject };
};

// ─── Invitation d'un collaborateur ────────────────────────────────────────────
const sendInvitationEmail = async ({ org, email, roleLabel }) => {
  const url = `${getClientUrl()}/sign-up`;
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:15px;color:#111827;">Bonjour,</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">
      Vous êtes invité(e) à rejoindre <strong>${esc(org.name)}</strong> sur Fluxora avec le rôle <strong>${esc(roleLabel)}</strong>.
      Créez votre compte avec cette adresse email (<strong>${esc(email)}</strong>) : vous serez rattaché(e) automatiquement.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td align="center">
      <a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;">Rejoindre ${esc(org.name)}</a>
    </td></tr></table>`;
  await sendEmail({
    to: email,
    subject: `Invitation à rejoindre ${org.name} sur Fluxora`,
    html: baseTemplate({ title: `Invitation — ${org.name}`, preheader: `Rejoignez ${org.name} sur Fluxora`, bodyHtml, orgName: org.name }),
  });
};

module.exports = { sendInvoiceEmail, sendQuoteEmail, sendReminderEmail, sendInvitationEmail };
