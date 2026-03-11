function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysDiff(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

// ─── Quote timeline ───────────────────────────────────────────────────────────

export function computeQuoteTimeline(quote) {
  const cfg = quote.reminderConfig || {};
  const {
    enabled = true,
    firstReminderDays = 3,
    beforeExpiryDays = 2,
    afterExpiryEnabled = false,
    history = [],
  } = cfg;

  const steps = [];
  const now = new Date();
  const sentAt = quote.sentAt ? new Date(quote.sentAt) : null;
  const expiryDate = quote.expiryDate ? new Date(quote.expiryDate) : null;
  const isTerminated = ['accepted', 'refused', 'rejected'].includes(quote.status);

  // Sent
  if (sentAt) {
    steps.push({ id: 'sent', label: 'Devis envoyé', date: sentAt, status: 'done', type: 'event' });
  }

  if (!enabled) {
    if (expiryDate) steps.push({ id: 'expiry', label: 'Expiration', date: expiryDate, status: quote.status === 'expired' ? 'done' : expiryDate <= now ? 'overdue' : 'pending', type: 'milestone' });
    return steps.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // First reminder after send
  if (sentAt && firstReminderDays > 0 && !isTerminated) {
    const reminderDate = addDays(sentAt, firstReminderDays);
    const alreadySent = history.some((h) => h.type === 'quote_reminder');
    steps.push({
      id: 'first_reminder',
      label: `Rappel automatique (J+${firstReminderDays})`,
      date: reminderDate,
      status: alreadySent ? 'done' : isTerminated ? 'skipped' : reminderDate <= now ? 'overdue' : 'pending',
      type: 'reminder',
      reminderType: 'quote_reminder',
    });
  }

  // Before expiry warning
  if (expiryDate && beforeExpiryDays > 0) {
    const warnDate = addDays(expiryDate, -beforeExpiryDays);
    const alreadySent = history.some((h) => h.type === 'expiry_warning');
    steps.push({
      id: 'expiry_warning',
      label: `Rappel avant expiration (${beforeExpiryDays}j avant)`,
      date: warnDate,
      status: alreadySent ? 'done' : isTerminated ? 'skipped' : warnDate <= now ? 'overdue' : 'pending',
      type: 'reminder',
      reminderType: 'expiry_warning',
    });
  }

  // Expiry milestone
  if (expiryDate) {
    steps.push({
      id: 'expiry',
      label: 'Expiration du devis',
      date: expiryDate,
      status: quote.status === 'expired' ? 'done' : expiryDate <= now ? 'overdue' : 'pending',
      type: 'milestone',
    });
  }

  // Post-expiry reminder
  if (expiryDate && afterExpiryEnabled) {
    const postDate = addDays(expiryDate, 3);
    const alreadySent = history.some((h) => h.type === 'post_expiry');
    steps.push({
      id: 'post_expiry',
      label: 'Relance après expiration',
      date: postDate,
      status: alreadySent ? 'done' : isTerminated ? 'skipped' : postDate <= now ? 'overdue' : 'pending',
      type: 'reminder',
      reminderType: 'post_expiry',
    });
  }

  // Accepted/refused
  if (quote.acceptedAt) steps.push({ id: 'accepted', label: 'Devis accepté', date: new Date(quote.acceptedAt), status: 'done', type: 'final' });

  return steps.sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function getNextQuoteReminder(quote) {
  const timeline = computeQuoteTimeline(quote);
  return timeline.find((s) => s.type === 'reminder' && s.status === 'pending') || null;
}

// ─── Invoice timeline ─────────────────────────────────────────────────────────

export function computeInvoiceTimeline(invoice) {
  const cfg = invoice.reminderConfig || {};
  const {
    enabled = true,
    beforeDueDays = 3,
    onDueDayEnabled = true,
    afterDueDays = [5, 15],
    history = [],
  } = cfg;

  const steps = [];
  const now = new Date();
  const sentAt = invoice.sentAt ? new Date(invoice.sentAt) : null;
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
  const isPaid = invoice.status === 'paid';

  if (sentAt) {
    steps.push({ id: 'sent', label: 'Facture envoyée', date: sentAt, status: 'done', type: 'event' });
  }

  if (!enabled || !dueDate) {
    if (dueDate) steps.push({ id: 'due', label: 'Échéance', date: dueDate, status: isPaid ? 'skipped' : dueDate <= now ? 'overdue' : 'pending', type: 'milestone' });
    return steps.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // Before due reminder
  if (beforeDueDays > 0) {
    const warnDate = addDays(dueDate, -beforeDueDays);
    const alreadySent = history.some((h) => h.type === 'before_due');
    if (sentAt && warnDate > sentAt) {
      steps.push({
        id: 'before_due',
        label: `Rappel avant échéance (${beforeDueDays}j avant)`,
        date: warnDate,
        status: alreadySent ? 'done' : isPaid ? 'skipped' : warnDate <= now ? 'overdue' : 'pending',
        type: 'reminder',
        reminderType: 'before_due',
      });
    }
  }

  // Due date milestone
  steps.push({
    id: 'due',
    label: 'Échéance',
    date: dueDate,
    status: isPaid ? 'skipped' : dueDate <= now ? 'overdue' : 'pending',
    type: 'milestone',
  });

  // On-due reminder
  if (onDueDayEnabled && !isPaid) {
    const alreadySent = history.some((h) => h.type === 'on_due');
    steps.push({
      id: 'on_due',
      label: "Rappel jour d'échéance",
      date: dueDate,
      status: alreadySent ? 'done' : isPaid ? 'skipped' : dueDate <= now ? 'overdue' : 'pending',
      type: 'reminder',
      reminderType: 'on_due',
    });
  }

  // Successive overdue reminders
  (afterDueDays || []).forEach((days, i) => {
    const reminderDate = addDays(dueDate, days);
    const reminderType = `overdue_${i + 1}`;
    const alreadySent = history.some((h) => h.type === reminderType);
    steps.push({
      id: reminderType,
      label: `${i === 0 ? '1ère' : i === 1 ? '2ème' : `${i + 1}ème`} relance impayée (J+${days})`,
      date: reminderDate,
      status: alreadySent ? 'done' : isPaid ? 'skipped' : reminderDate <= now ? 'overdue' : 'pending',
      type: 'reminder',
      reminderType,
    });
  });

  // Paid
  if (invoice.paidAt) steps.push({ id: 'paid', label: 'Payée', date: new Date(invoice.paidAt), status: 'done', type: 'final' });

  return steps.sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function getNextInvoiceReminder(invoice) {
  const timeline = computeInvoiceTimeline(invoice);
  return timeline.find((s) => s.type === 'reminder' && s.status === 'pending') || null;
}

// ─── Risk score (invoice) ─────────────────────────────────────────────────────

export function computeRiskScore(invoice) {
  if (!invoice) return null;
  const now = new Date();
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
  const isPaid = invoice.status === 'paid';

  if (isPaid) return { level: 'none', score: 0, label: 'Payée', factors: [] };

  let score = 0;
  const factors = [];

  // Days overdue
  if (dueDate && dueDate < now) {
    const daysLate = Math.round((now - dueDate) / 86400000);
    if (daysLate > 0) {
      score += Math.min(40, daysLate * 2);
      factors.push(`${daysLate} jour${daysLate > 1 ? 's' : ''} de retard`);
    }
  } else if (dueDate) {
    const daysLeft = Math.round((dueDate - now) / 86400000);
    if (daysLeft <= 3) {
      score += 10;
      factors.push(`Échéance dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`);
    }
  }

  // Number of reminders sent
  const reminderCount = (invoice.events || []).filter((e) => e.type === 'reminder_sent').length;
  if (reminderCount >= 2) { score += 25; factors.push(`${reminderCount} relances déjà envoyées`); }
  else if (reminderCount === 1) { score += 10; factors.push('1 relance envoyée'); }

  // Invoice amount (high amounts = higher risk)
  if ((invoice.total || 0) > 5000) { score += 15; factors.push('Montant élevé'); }
  else if ((invoice.total || 0) > 1500) { score += 5; }

  // Status
  if (invoice.status === 'late') { score += 20; factors.push('Statut : En retard'); }

  score = Math.min(100, score);
  const level = score >= 60 ? 'high' : score >= 25 ? 'medium' : 'low';

  return { level, score, label: level === 'high' ? 'Élevé' : level === 'medium' ? 'Moyen' : 'Faible', factors };
}

// ─── AI recommendation ────────────────────────────────────────────────────────

export function getAIRecommendation(doc, type, riskScore) {
  if (type === 'quote') {
    const daysSinceSent = doc.sentAt ? daysDiff(doc.sentAt, new Date()) : 0;
    const daysToExpiry = doc.expiryDate ? daysDiff(new Date(), doc.expiryDate) : null;

    if (doc.status === 'draft') return null;
    if (['accepted', 'refused', 'rejected'].includes(doc.status)) return null;

    if (daysToExpiry !== null && daysToExpiry <= 2 && daysToExpiry >= 0) {
      return {
        scenario: 'Relance urgente',
        reason: `Expiration dans ${daysToExpiry} jour${daysToExpiry !== 1 ? 's' : ''} — agissez maintenant`,
        tone: 'urgent',
        icon: '⚡',
        actions: [{ type: 'expiry_warning', label: 'Envoyer rappel expiration' }],
      };
    }
    if (daysToExpiry !== null && daysToExpiry < 0) {
      return {
        scenario: 'Devis expiré — relance',
        reason: 'Le devis a expiré, proposez un renouvellement',
        tone: 'firm',
        icon: '🔄',
        actions: [{ type: 'post_expiry', label: 'Relance après expiration' }],
      };
    }
    if (daysSinceSent >= 5) {
      return {
        scenario: 'Relance commerciale',
        reason: `Pas de réponse depuis ${daysSinceSent} jours`,
        tone: 'friendly',
        icon: '📩',
        actions: [{ type: 'quote_reminder', label: 'Envoyer rappel' }],
      };
    }
    if (daysSinceSent >= 2) {
      return {
        scenario: 'Suivi recommandé',
        reason: `Devis envoyé il y a ${daysSinceSent} jours sans réponse`,
        tone: 'soft',
        icon: '💬',
        actions: [{ type: 'quote_reminder', label: 'Envoyer un suivi' }],
      };
    }
    return null;
  }

  if (type === 'invoice') {
    if (!riskScore || riskScore.level === 'none') return null;
    const { level, factors } = riskScore;

    if (level === 'high') {
      return {
        scenario: 'Scénario renforcé',
        reason: `Risque élevé : ${factors.slice(0, 2).join(', ')}`,
        tone: 'firm',
        icon: '🚨',
        actions: [
          { type: 'overdue_1', label: '1ère relance ferme' },
          { type: 'overdue_2', label: '2ème relance' },
        ],
      };
    }
    if (level === 'medium') {
      return {
        scenario: 'Relance standard',
        reason: `Risque modéré : ${factors[0] || 'délai dépassé'}`,
        tone: 'professional',
        icon: '⚠️',
        actions: [{ type: 'overdue_1', label: 'Envoyer relance' }],
      };
    }
    // low
    return {
      scenario: 'Rappel doux',
      reason: 'Client fiable — ton léger recommandé',
      tone: 'soft',
      icon: '✉️',
      actions: [{ type: 'before_due', label: 'Envoyer rappel amical' }],
    };
  }

  return null;
}

export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function fmtDateFull(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}
