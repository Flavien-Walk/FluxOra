const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const dateFormatter = new Intl.DateTimeFormat('fr-FR');

const EXPENSE_CATEGORY_LABELS = {
  software: 'Logiciels / SaaS',
  marketing: 'Marketing / Pub',
  suppliers: 'Fournisseurs',
  travel: 'Deplacements',
  office: 'Bureautique',
  salaries: 'Salaires',
  taxes: 'Taxes / Impots',
  banking: 'Frais bancaires',
  other: 'Autre',
};

export const DEFAULT_REVIEW_DRAFT = {
  payment: {
    amount: '4200',
    date: '2026-03-09',
    reference: '',
    clientHint: '',
    missionHint: '',
  },
  duplicate: {
    amount: '4200',
    clientHint: '',
    missionHint: '',
  },
  partial: {
    invoiceTotal: '1800',
    paidAmount: '1200',
    clientHint: '',
    reference: '',
  },
  expense: {
    amount: '320',
    vendorHint: 'Stripe',
    date: '',
    reference: '',
  },
};

function toNumber(value) {
  if (value == null || value === '') return null;
  const normalized = String(value).replace(/\s/g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function toReference(value) {
  return normalize(value).replace(/[^a-z0-9]/g, '');
}

function referencesMatch(left, right) {
  const a = toReference(left);
  const b = toReference(right);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 5 && b.length >= 5) {
    return a.includes(b) || b.includes(a);
  }
  return false;
}

function includesQuery(text, query) {
  if (!normalize(query)) return true;
  return normalize(text).includes(normalize(query));
}

function formatCurrency(value) {
  return currencyFormatter.format(value ?? 0);
}

function formatDate(value) {
  if (!value) return 'information manquante';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'information manquante';
  return dateFormatter.format(date);
}

function toDateKey(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function sameDay(left, right) {
  if (!left || !right) return false;
  return toDateKey(left) === toDateKey(right);
}

function dateDistanceInDays(left, right) {
  if (!left || !right) return Number.POSITIVE_INFINITY;
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.abs(Math.round((leftDate - rightDate) / 86400000));
}

function amountEquals(left, right) {
  if (left == null || right == null) return false;
  return Math.abs(Number(left) - Number(right)) < 0.01;
}

function pushUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
}

function listSummary(values) {
  if (values.length === 0) return 'information manquante';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} et ${values[1]}`;
  return `${values.slice(0, -1).join(', ')} et ${values[values.length - 1]}`;
}

function invoiceClientLabel(invoice) {
  return invoice?.clientId?.name || invoice?.clientId?.company || 'information manquante';
}

function invoiceSearchText(invoice) {
  return [
    invoice?.number,
    invoice?.clientId?.name,
    invoice?.clientId?.company,
    invoice?.notes,
    ...(invoice?.lines || []).map((line) => line.description),
  ].filter(Boolean).join(' ');
}

function transactionSearchText(transaction) {
  return [
    transaction?.label,
    transaction?.party,
    transaction?.reference,
    transaction?.category,
  ].filter(Boolean).join(' ');
}

function accountingSearchText(entry) {
  return [
    entry?.description,
    entry?.reference,
    entry?.category,
    entry?.source,
  ].filter(Boolean).join(' ');
}

function expenseSearchText(expense) {
  return [
    expense?.description,
    expense?.vendor,
    expense?.notes,
    expense?.category,
  ].filter(Boolean).join(' ');
}

function tokenize(text) {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);
}

function overlappingKeywords(left, right) {
  const rightTokens = new Set(tokenize(right));
  return tokenize(left).filter((token) => rightTokens.has(token));
}

function matchesHints(text, ...queries) {
  return queries.every((query) => includesQuery(text, query));
}

function buildDuplicatePairs(invoices, { amount, clientHint, missionHint }) {
  const scoped = invoices.filter((invoice) => {
    if (amount != null && !amountEquals(invoice.total, amount)) return false;
    if (clientHint && !includesQuery(invoiceSearchText(invoice), clientHint)) return false;
    if (missionHint && !includesQuery(invoiceSearchText(invoice), missionHint)) return false;
    return true;
  });

  const pairs = [];

  for (let index = 0; index < scoped.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < scoped.length; compareIndex += 1) {
      const left = scoped[index];
      const right = scoped[compareIndex];
      const reasons = [];
      let score = 0;

      const sameClient =
        (left?.clientId?._id && right?.clientId?._id && left.clientId._id === right.clientId._id) ||
        normalize(invoiceClientLabel(left)) === normalize(invoiceClientLabel(right));

      if (sameClient) {
        score += 2;
        reasons.push('meme client');
      }

      if (amountEquals(left.total, right.total)) {
        score += 2;
        reasons.push(`meme montant (${formatCurrency(left.total)})`);
      }

      const gap = dateDistanceInDays(left.issueDate || left.createdAt, right.issueDate || right.createdAt);
      if (gap <= 30) {
        score += 1;
        reasons.push(`dates proches (${gap} j)`);
      }

      const overlap = overlappingKeywords(invoiceSearchText(left), invoiceSearchText(right));
      if (overlap.length > 0) {
        score += 1;
        reasons.push(`descriptions proches (${overlap.slice(0, 2).join(', ')})`);
      }

      if (missionHint && includesQuery(invoiceSearchText(left), missionHint) && includesQuery(invoiceSearchText(right), missionHint)) {
        score += 1;
        reasons.push(`mission "${missionHint}"`);
      }

      if (score >= 4) {
        pairs.push({
          score,
          reasons,
          left,
          right,
          gap,
        });
      }
    }
  }

  return pairs.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.gap - right.gap;
  }).slice(0, 6);
}

function classifyStripeNature(expense) {
  const haystack = normalize(expenseSearchText(expense));
  if (haystack.includes('commission') || haystack.includes('fee') || haystack.includes('frais')) {
    return 'commission';
  }
  if (haystack.includes('abonnement') || haystack.includes('subscription') || haystack.includes('plan')) {
    return 'subscription';
  }
  if (expense?.category === 'banking') return 'commission';
  if (expense?.category === 'software') return 'subscription';
  return '';
}

export function buildManualReviewReport({
  draft,
  invoices = [],
  transactions = [],
  entries = [],
  expenses = [],
}) {
  const summary = [];
  const certain = [];
  const probable = [];
  const missing = [];
  const checks = [];
  const suggestions = [];

  const paymentAmount = toNumber(draft?.payment?.amount);
  const duplicateAmount = toNumber(draft?.duplicate?.amount);
  const partialInvoiceTotal = toNumber(draft?.partial?.invoiceTotal);
  const partialPaidAmount = toNumber(draft?.partial?.paidAmount);
  const expenseAmount = toNumber(draft?.expense?.amount);

  const paymentReference = draft?.payment?.reference?.trim() || '';
  const paymentClientHint = draft?.payment?.clientHint?.trim() || '';
  const paymentMissionHint = draft?.payment?.missionHint?.trim() || '';
  const duplicateClientHint = draft?.duplicate?.clientHint?.trim() || '';
  const duplicateMissionHint = draft?.duplicate?.missionHint?.trim() || '';
  const partialClientHint = draft?.partial?.clientHint?.trim() || '';
  const partialReference = draft?.partial?.reference?.trim() || '';
  const expenseVendorHint = draft?.expense?.vendorHint?.trim() || '';
  const expenseReference = draft?.expense?.reference?.trim() || '';

  const paymentTransactions = paymentAmount == null ? [] : transactions.filter((transaction) => (
    transaction.type === 'revenue' &&
    amountEquals(transaction.amount, paymentAmount)
  ));
  const paymentTransactionsExact = paymentTransactions.filter((transaction) => {
    if (draft?.payment?.date && !sameDay(transaction.date, draft.payment.date)) return false;
    if (paymentClientHint && !includesQuery(transactionSearchText(transaction), paymentClientHint)) return false;
    if (paymentReference && !includesQuery(transactionSearchText(transaction), paymentReference)) return false;
    return true;
  });
  const paymentTransactionsNearby = paymentTransactions.filter((transaction) => {
    if (paymentTransactionsExact.includes(transaction)) return false;
    if (draft?.payment?.date && dateDistanceInDays(transaction.date, draft.payment.date) > 7) return false;
    return true;
  }).slice(0, 6);

  const paymentEntries = paymentAmount == null ? [] : entries.filter((entry) => (
    entry.type === 'credit' &&
    amountEquals(entry.amount, paymentAmount) &&
    ['payment', 'invoice'].includes(entry.source)
  ));
  const paymentEntriesExact = paymentEntries.filter((entry) => {
    if (draft?.payment?.date && !sameDay(entry.date, draft.payment.date)) return false;
    if (paymentReference && !includesQuery(accountingSearchText(entry), paymentReference)) return false;
    return true;
  });
  const paymentEntriesNearby = paymentEntries.filter((entry) => {
    if (paymentEntriesExact.includes(entry)) return false;
    if (draft?.payment?.date && dateDistanceInDays(entry.date, draft.payment.date) > 7) return false;
    return true;
  }).slice(0, 6);

  const paymentInvoices = paymentAmount == null ? [] : invoices.filter((invoice) => amountEquals(invoice.total, paymentAmount));
  const paymentInvoicesByReference = paymentInvoices.filter((invoice) => {
    if (paymentReference && referencesMatch(invoice.number, paymentReference)) return true;
    return paymentTransactionsExact.some((transaction) => referencesMatch(invoice.number, transaction.reference)) ||
      paymentEntriesExact.some((entry) => referencesMatch(invoice.number, entry.reference));
  });
  const paymentInvoicesByHints = paymentInvoices.filter((invoice) => {
    if (paymentInvoicesByReference.includes(invoice)) return false;
    return matchesHints(invoiceSearchText(invoice), paymentClientHint, paymentMissionHint);
  });
  const paymentInvoicesSameAmount = paymentInvoices.filter((invoice) => {
    if (paymentInvoicesByReference.includes(invoice) || paymentInvoicesByHints.includes(invoice)) return false;
    return true;
  }).slice(0, 6);

  const duplicatePairs = buildDuplicatePairs(invoices, {
    amount: duplicateAmount,
    clientHint: duplicateClientHint,
    missionHint: duplicateMissionHint,
  });

  const partialInvoices = partialInvoiceTotal == null ? [] : invoices.filter((invoice) => {
    if (!amountEquals(invoice.total, partialInvoiceTotal)) return false;
    if (partialClientHint && !includesQuery(invoiceSearchText(invoice), partialClientHint)) return false;
    if (partialReference && !includesQuery(invoiceSearchText(invoice), partialReference) && !referencesMatch(invoice.number, partialReference)) {
      return false;
    }
    return true;
  });

  const partialTransactions = partialPaidAmount == null ? [] : transactions.filter((transaction) => {
    if (transaction.type !== 'revenue') return false;
    if (!amountEquals(transaction.amount, partialPaidAmount)) return false;
    if (partialClientHint && !includesQuery(transactionSearchText(transaction), partialClientHint)) return false;
    if (partialReference && !includesQuery(transactionSearchText(transaction), partialReference) && !referencesMatch(transaction.reference, partialReference)) {
      return false;
    }
    return true;
  });

  const partialEntries = partialPaidAmount == null ? [] : entries.filter((entry) => {
    if (entry.type !== 'credit') return false;
    if (!amountEquals(entry.amount, partialPaidAmount)) return false;
    if (partialReference && !includesQuery(accountingSearchText(entry), partialReference) && !referencesMatch(entry.reference, partialReference)) {
      return false;
    }
    return true;
  });

  const partialLinks = partialInvoices.filter((invoice) => (
    partialTransactions.some((transaction) => referencesMatch(invoice.number, transaction.reference)) ||
    partialEntries.some((entry) => referencesMatch(invoice.number, entry.reference)) ||
    (partialReference && referencesMatch(invoice.number, partialReference))
  ));

  const stripeExpenses = expenseAmount == null ? [] : expenses.filter((expense) => {
    if (!amountEquals(expense.amount, expenseAmount)) return false;
    if (expenseVendorHint && !includesQuery(expenseSearchText(expense), expenseVendorHint)) return false;
    if (draft?.expense?.date && !sameDay(expense.date, draft.expense.date)) return false;
    if (expenseReference && !includesQuery(expenseSearchText(expense), expenseReference)) return false;
    return true;
  });

  const stripeTransactions = expenseAmount == null ? [] : transactions.filter((transaction) => {
    if (transaction.type !== 'expense') return false;
    if (!amountEquals(transaction.amount, expenseAmount)) return false;
    if (expenseVendorHint && !includesQuery(transactionSearchText(transaction), expenseVendorHint)) return false;
    if (draft?.expense?.date && !sameDay(transaction.date, draft.expense.date)) return false;
    return true;
  });

  const stripeEntries = expenseAmount == null ? [] : entries.filter((entry) => {
    if (entry.type !== 'debit') return false;
    if (!amountEquals(entry.amount, expenseAmount)) return false;
    if (entry.source && entry.source !== 'expense') return false;
    if (expenseVendorHint && !includesQuery(accountingSearchText(entry), expenseVendorHint)) return false;
    if (draft?.expense?.date && !sameDay(entry.date, draft.expense.date)) return false;
    return true;
  });

  pushUnique(
    summary,
    `Analyse en lecture seule sur ${invoices.length} facture(s), ${transactions.length} transaction(s), ${entries.length} ecriture(s) comptables et ${expenses.length} depense(s).`,
  );
  pushUnique(
    summary,
    'Le rapport reste prudent : aucun statut n est modifie, aucune creation automatique n est proposee et aucune suppression n est executee.',
  );
  if (paymentAmount != null) {
    pushUnique(
      summary,
      `Le brouillon controle un paiement de ${formatCurrency(paymentAmount)}, une facture de ${partialInvoiceTotal != null ? formatCurrency(partialInvoiceTotal) : 'information manquante'} avec un encaissement de ${partialPaidAmount != null ? formatCurrency(partialPaidAmount) : 'information manquante'}, et une depense de ${expenseAmount != null ? formatCurrency(expenseAmount) : 'information manquante'}.`,
    );
  }

  if (paymentTransactionsExact.length > 0) {
    pushUnique(
      certain,
      `Un encaissement de ${formatCurrency(paymentAmount)} apparait dans Transactions ${draft?.payment?.date ? `le ${formatDate(draft.payment.date)}` : ''}.`,
    );
  } else if (paymentTransactionsNearby.length > 0) {
    pushUnique(
      probable,
      `Un ou plusieurs encaissements de ${formatCurrency(paymentAmount)} existent dans Transactions, mais la date ou la reference reste a confirmer.`,
    );
  } else if (paymentAmount != null) {
    pushUnique(
      missing,
      `information manquante : aucune transaction d encaissement de ${formatCurrency(paymentAmount)} n a ete retrouvee dans les donnees chargees.`,
    );
  }

  if (paymentEntriesExact.length > 0) {
    pushUnique(
      certain,
      `Une ecriture comptable de type paiement ou facture a ${formatCurrency(paymentAmount)} existe dans Comptabilite.`,
    );
  } else if (paymentEntriesNearby.length > 0) {
    pushUnique(
      probable,
      `Une ou plusieurs ecritures comptables a ${formatCurrency(paymentAmount)} semblent correspondre au paiement, sans rapprochement explicite confirme.`,
    );
  }

  if (paymentInvoicesByReference.length === 1) {
    pushUnique(
      certain,
      `La facture ${paymentInvoicesByReference[0].number} est explicitement rapprochable avec le paiement de ${formatCurrency(paymentAmount)} via la reference disponible.`,
    );
  } else if (paymentInvoicesByReference.length > 1) {
    pushUnique(
      probable,
      `Plusieurs factures partagent une reference compatible avec le paiement de ${formatCurrency(paymentAmount)} ; le rapprochement reste ambigu.`,
    );
  } else if (paymentInvoicesByHints.length === 1) {
    pushUnique(
      probable,
      `Une facture de ${formatCurrency(paymentAmount)} existe (${paymentInvoicesByHints[0].number}), mais le lien avec le paiement n est pas explicitement confirme.`,
    );
  } else if (paymentInvoicesByHints.length + paymentInvoicesSameAmount.length > 1) {
    pushUnique(
      probable,
      `Plusieurs factures a ${formatCurrency(paymentAmount)} existent dans Fluxora ; un doublon ou un mauvais rapprochement reste possible.`,
    );
  } else if (paymentAmount != null && paymentInvoices.length === 0) {
    pushUnique(
      missing,
      `information manquante : aucune facture a ${formatCurrency(paymentAmount)} n a ete retrouvee dans les donnees chargees.`,
    );
  }

  if (!paymentClientHint && !paymentReference && !paymentMissionHint) {
    pushUnique(
      missing,
      `information manquante : client, reference ou mission du paiement de ${paymentAmount != null ? formatCurrency(paymentAmount) : 'information manquante'}.`,
    );
  }

  if (duplicatePairs.length > 0) {
    const topPair = duplicatePairs[0];
    pushUnique(
      probable,
      `Un doublon de facture est plausible entre ${topPair.left.number} et ${topPair.right.number} (${listSummary(topPair.reasons)}).`,
    );
  } else if (duplicateAmount != null) {
    pushUnique(
      probable,
      `Aucun doublon manifeste n est detecte automatiquement sur le montant ${formatCurrency(duplicateAmount)}, mais la verification manuelle reste necessaire.`,
    );
  }

  if (!duplicateClientHint && !duplicateMissionHint) {
    pushUnique(
      missing,
      `information manquante : client ou mission pour confirmer le doublon de facture suspecte.`,
    );
  }

  if (partialInvoices.length > 0) {
    pushUnique(
      certain,
      `Au moins une facture de ${formatCurrency(partialInvoiceTotal)} existe dans Fluxora (${listSummary(partialInvoices.map((invoice) => invoice.number).slice(0, 3))}).`,
    );
  } else if (partialInvoiceTotal != null) {
    pushUnique(
      missing,
      `information manquante : aucune facture de ${formatCurrency(partialInvoiceTotal)} n a ete retrouvee dans les donnees chargees.`,
    );
  }

  if (partialTransactions.length > 0 || partialEntries.length > 0) {
    pushUnique(
      certain,
      `Une trace de paiement a ${formatCurrency(partialPaidAmount)} existe dans Fluxora.`,
    );
  } else if (partialPaidAmount != null) {
    pushUnique(
      missing,
      `information manquante : aucune trace de paiement a ${formatCurrency(partialPaidAmount)} n a ete retrouvee pour la facture partielle.`,
    );
  }

  if (partialLinks.length === 1) {
    const remaining = (partialInvoiceTotal ?? 0) - (partialPaidAmount ?? 0);
    pushUnique(
      certain,
      `La facture ${partialLinks[0].number} peut etre rattachee a un paiement de ${formatCurrency(partialPaidAmount)} par reference ; le reliquat theorique est de ${formatCurrency(remaining)}.`,
    );
  } else if (partialInvoices.length > 0 && (partialTransactions.length > 0 || partialEntries.length > 0)) {
    pushUnique(
      probable,
      `La facture de ${formatCurrency(partialInvoiceTotal)} semble avoir recu ${formatCurrency(partialPaidAmount)}, mais le lien explicite par reference n est pas confirme.`,
    );
  }

  pushUnique(
    certain,
    'L interface facture actuelle ne propose pas de statut explicite "partiellement payee" ni de champ de reliquat visible.',
  );

  if (stripeExpenses.length === 1) {
    const expense = stripeExpenses[0];
    pushUnique(
      certain,
      `Une depense a ${formatCurrency(expenseAmount)} liee a ${expense.vendor || expense.description || 'Stripe'} existe dans Fluxora et elle est actuellement classee en ${EXPENSE_CATEGORY_LABELS[expense.category] || expense.category || 'Autre'}.`,
    );
  } else if (stripeExpenses.length > 1) {
    pushUnique(
      probable,
      `Plusieurs depenses a ${formatCurrency(expenseAmount)} correspondent au filtre Stripe ; la charge exacte reste a confirmer.`,
    );
  } else if (expenseAmount != null) {
    pushUnique(
      missing,
      `information manquante : aucune depense a ${formatCurrency(expenseAmount)} correspondant a ${expenseVendorHint || 'ce fournisseur'} n a ete retrouvee.`,
    );
  }

  if (stripeTransactions.length > 0) {
    pushUnique(
      certain,
      `Une sortie de ${formatCurrency(expenseAmount)} apparait aussi dans Transactions.`,
    );
  }

  if (stripeEntries.length > 0) {
    pushUnique(
      certain,
      `Une ecriture comptable de depense a ${formatCurrency(expenseAmount)} existe dans Comptabilite.`,
    );
  }

  if (stripeExpenses.length > 0) {
    const nature = classifyStripeNature(stripeExpenses[0]);
    if (nature === 'commission') {
      pushUnique(
        probable,
        `La nature de la depense Stripe a ${formatCurrency(expenseAmount)} ressemble plutot a une commission ou a des frais.`,
      );
    } else if (nature === 'subscription') {
      pushUnique(
        probable,
        `La nature de la depense Stripe a ${formatCurrency(expenseAmount)} ressemble plutot a un abonnement logiciel.`,
      );
    }
  }

  pushUnique(
    missing,
    'information manquante : le justificatif ou la preuve documentaire de la depense Stripe n est pas visible dans les donnees front chargees.',
  );

  pushUnique(
    checks,
    `Dans Transactions, filtrer les encaissements et verifier les lignes a ${paymentAmount != null ? formatCurrency(paymentAmount) : 'information manquante'} en relevant date, tiers et reference.`,
  );
  pushUnique(
    checks,
    'Dans Comptabilite, comparer les ecritures Paiement et Facture autour des montants suspects avant toute correction.',
  );
  if (paymentInvoices.length > 0) {
    pushUnique(
      checks,
      `Ouvrir les factures candidates ${listSummary(paymentInvoices.slice(0, 3).map((invoice) => invoice.number))} et comparer client, prestations et historique.`,
    );
  } else {
    pushUnique(
      checks,
      'Verifier manuellement dans Factures si le montant recherche existe sur un autre numero ou un autre client.',
    );
  }
  if (duplicatePairs.length > 0) {
    pushUnique(
      checks,
      `Comparer les factures suspectes ${duplicatePairs[0].left.number} et ${duplicatePairs[0].right.number} sur les lignes, dates d emission et references visibles.`,
    );
  }
  pushUnique(
    checks,
    `Pour la facture a ${partialInvoiceTotal != null ? formatCurrency(partialInvoiceTotal) : 'information manquante'}, verifier si la trace de ${partialPaidAmount != null ? formatCurrency(partialPaidAmount) : 'information manquante'} porte la meme reference facture.`,
  );
  pushUnique(
    checks,
    `Pour la depense Stripe a ${expenseAmount != null ? formatCurrency(expenseAmount) : 'information manquante'}, verifier description, fournisseur, categorie, TVA et reference croisee avec Transactions.`,
  );

  if (paymentTransactionsExact.length > 0 && paymentInvoices.length === 0) {
    pushUnique(
      suggestions,
      `Si l encaissement de ${formatCurrency(paymentAmount)} est confirme et qu aucune facture n est retrouvee, creer ou importer la facture manuellement seulement apres identification certaine du client et de la mission.`,
    );
  }
  if (paymentInvoices.length > 1 || duplicatePairs.length > 0) {
    pushUnique(
      suggestions,
      'Ne rien supprimer tant que numero, historique, reference et prestation ne designent pas clairement la facture canonique.',
    );
  }
  if (partialInvoices.length > 0 && (partialTransactions.length > 0 || partialEntries.length > 0)) {
    pushUnique(
      suggestions,
      `Ne pas marquer la facture a ${formatCurrency(partialInvoiceTotal)} comme payee tant que le solde theorique de ${formatCurrency((partialInvoiceTotal ?? 0) - (partialPaidAmount ?? 0))} n est pas regle.`,
    );
    pushUnique(
      suggestions,
      'Si l interface ne gere pas le paiement partiel, conserver une trace manuelle du reliquat plutot que de forcer un statut final.',
    );
  }
  if (stripeExpenses.length > 0) {
    const expense = stripeExpenses[0];
    if (expense.category !== 'banking' && classifyStripeNature(expense) === 'commission') {
      pushUnique(
        suggestions,
        'Si la depense Stripe correspond a des frais ou commissions, la reclasser manuellement en Frais bancaires apres verification du libelle et de la reference.',
      );
    }
    if (expense.category !== 'software' && classifyStripeNature(expense) === 'subscription') {
      pushUnique(
        suggestions,
        'Si la depense Stripe correspond a un abonnement, la reclasser manuellement en Logiciels / SaaS apres verification du justificatif.',
      );
    }
    if (!classifyStripeNature(expense)) {
      pushUnique(
        suggestions,
        'Si la nature du paiement Stripe reste ambiguë, laisser l entree a verifier jusqu a ce qu un justificatif ou une reference fiable confirme la charge.',
      );
    }
  }

  return {
    summary,
    certain,
    probable,
    missing,
    checks,
    suggestions,
    evidence: {
      payment: {
        transactionsExact: paymentTransactionsExact,
        transactionsNearby: paymentTransactionsNearby,
        entriesExact: paymentEntriesExact,
        entriesNearby: paymentEntriesNearby,
        invoicesByReference: paymentInvoicesByReference,
        invoicesByHints: paymentInvoicesByHints,
        invoicesSameAmount: paymentInvoicesSameAmount,
      },
      duplicates: duplicatePairs,
      partial: {
        invoices: partialInvoices,
        transactions: partialTransactions,
        entries: partialEntries,
        linkedInvoices: partialLinks,
      },
      expense: {
        expenses: stripeExpenses,
        transactions: stripeTransactions,
        entries: stripeEntries,
      },
    },
    meta: {
      counts: {
        invoices: invoices.length,
        transactions: transactions.length,
        entries: entries.length,
        expenses: expenses.length,
      },
    },
  };
}

function renderSection(title, items) {
  const lines = [`# ${title}`, ''];
  if (!items.length) {
    lines.push('- information manquante');
    lines.push('');
    return lines.join('\n');
  }

  items.forEach((item) => {
    lines.push(`- ${item}`);
  });
  lines.push('');
  return lines.join('\n');
}

export function buildManualReviewMarkdown(report) {
  return [
    renderSection('Résumé de la demande', report.summary),
    renderSection('Informations certaines', report.certain),
    renderSection('Informations probables', report.probable),
    renderSection('Informations manquantes', report.missing),
    renderSection('Vérifications à faire', report.checks),
    renderSection('Corrections suggérées (sans exécution)', report.suggestions),
  ].join('\n').trim();
}
