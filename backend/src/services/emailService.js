const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const fmt = (n, currency = 'EUR') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(n ?? 0);

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

// ─── Template de base ───────────────────────────────────────────────────────
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
                  <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">⚡ Fluxora</span>
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

// ─── Template Facture ────────────────────────────────────────────────────────
const invoiceEmailHtml = ({ invoice, org, client }) => {
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

    <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;">
      Pour toute question, contactez-nous à <strong>${org.email || 'contact@fluxora.app'}</strong>
    </p>
  `;

  return baseTemplate({
    title: `Facture ${invoice.number} — ${org.name}`,
    preheader: `Facture ${invoice.number} d'un montant de ${fmt(invoice.total, invoice.currency)} de ${org.name}`,
    bodyHtml,
    orgName: org.name,
  });
};

// ─── Template Devis ──────────────────────────────────────────────────────────
const quoteEmailHtml = ({ quote, org, client }) => {
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
    <div style="background:#eef2ff;border-left:4px solid #4f46e5;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#4338ca;font-weight:500;">
        📋 Ce devis est valable jusqu'au <strong>${fmtDate(quote.expiryDate)}</strong>. Pour l'accepter, contactez-nous.
      </p>
    </div>

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

    <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;">
      Pour accepter ce devis ou pour toute question : <strong>${org.email || 'contact@fluxora.app'}</strong>
    </p>
  `;

  return baseTemplate({
    title: `Devis ${quote.number} — ${org.name}`,
    preheader: `Devis ${quote.number} d'un montant de ${fmt(quote.total, quote.currency)} de ${org.name}`,
    bodyHtml,
    orgName: org.name,
  });
};

// ─── Envoi via Brevo ─────────────────────────────────────────────────────────
const sendEmail = async ({ to, toName, subject, html }) => {
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

// ─── Exports ─────────────────────────────────────────────────────────────────
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

module.exports = { sendInvoiceEmail, sendQuoteEmail };
