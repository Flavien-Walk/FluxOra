const SECTION_CONFIG = [
  ['summary', 'Résumé de la demande'],
  ['certain', 'Informations certaines'],
  ['probable', 'Informations probables'],
  ['missing', 'Informations manquantes'],
  ['checks', 'Vérifications à faire'],
  ['suggestedCorrections', 'Corrections suggérées (sans exécution)'],
];

const SECTION_ALIASES = {
  summary: ['summary', 'resume'],
  certain: ['certain', 'confirmed', 'certainties'],
  probable: ['probable', 'likely'],
  missing: ['missing', 'informationManquante'],
  checks: ['checks', 'verifications', 'toCheck'],
  suggestedCorrections: ['suggestedCorrections', 'suggestions', 'corrections'],
};

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function normalizeTextField(value) {
  if (value == null) return '';
  return typeof value === 'string' ? value : String(value);
}

function normalizeSections(sections) {
  if (!sections || typeof sections !== 'object') return null;

  const normalized = {};

  SECTION_CONFIG.forEach(([key]) => {
    const alias = SECTION_ALIASES[key];
    const raw = alias
      .map((name) => sections[name])
      .find((value) => value != null);
    normalized[key] = asArray(raw).map(normalizeTextField);
  });

  const hasContent = Object.values(normalized).some((items) => items.length > 0);
  return hasContent ? normalized : null;
}

function normalizeConfidence(confidence) {
  if (confidence == null) return null;

  if (typeof confidence === 'number') {
    const label = confidence >= 0.8 ? 'Élevée' : confidence >= 0.5 ? 'Moyenne' : 'Faible';
    return { score: confidence, label };
  }

  if (typeof confidence === 'string') {
    return { score: null, label: confidence };
  }

  if (typeof confidence === 'object') {
    return {
      score: typeof confidence.score === 'number' ? confidence.score : null,
      label: confidence.label || confidence.level || null,
    };
  }

  return null;
}

function normalizeObjectCard(card, index) {
  if (!card) return null;

  const fields = asArray(card.fields).map((field) => {
    if (typeof field === 'string') return { label: '', value: field };
    return {
      label: field.label || '',
      value: normalizeTextField(field.value),
    };
  });

  return {
    id: card.id || `${card.type || 'card'}-${index}`,
    type: card.type || 'generic',
    tone: card.tone || 'default',
    title: card.title || card.name || 'Élément',
    subtitle: card.subtitle || card.detail || '',
    badge: card.badge || '',
    confidence: normalizeConfidence(card.confidence),
    fields,
    actions: asArray(card.actions),
  };
}

function normalizeModal(modal) {
  if (!modal || typeof modal !== 'object') return null;

  return {
    type: modal.type || modal.modalType || '',
    title: modal.title || '',
    description: modal.description || '',
    submitLabel: modal.submitLabel || '',
    cancelLabel: modal.cancelLabel || '',
    payload: modal.payload || {},
    confirmedFields: asArray(modal.confirmedFields),
    missingFields: asArray(modal.missingFields),
    confidence: normalizeConfidence(modal.confidence),
    requiresConfirmation: !!modal.requiresConfirmation,
  };
}

export const ASSISTANT_SECTION_CONFIG = SECTION_CONFIG;

export function normalizeAssistantResponse(data) {
  const envelope = data?.message && typeof data.message === 'object' ? data.message : data || {};

  return {
    role: 'assistant',
    content: normalizeTextField(envelope.reply || envelope.content),
    error: envelope.error || '',
    mode: envelope.mode || 'reply',
    actions: asArray(envelope.actions),
    entityCard: envelope.entityCard || null,
    objectCards: asArray(envelope.objectCards)
      .map((card, index) => normalizeObjectCard(card, index))
      .filter(Boolean),
    sections: normalizeSections(envelope.sections),
    modal: normalizeModal(envelope.modal),
    guided: envelope.guided || null,
    requiresConfirmation: !!envelope.requiresConfirmation,
    confidence: normalizeConfidence(envelope.confidence),
    journalEntry: envelope.journalEntry || null,
    contextPatch: envelope.contextPatch || null,
  };
}
