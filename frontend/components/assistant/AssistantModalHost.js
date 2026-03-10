'use client';

import { useMemo, useState } from 'react';
import api from '@/lib/api';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import ClientForm from '@/components/modules/ClientForm';
import QuoteForm from '@/components/modules/QuoteForm';
import InvoiceForm from '@/components/modules/InvoiceForm';

const EXPENSE_CATEGORIES = [
  { value: 'software', label: 'Logiciels / SaaS' },
  { value: 'marketing', label: 'Marketing / Pub' },
  { value: 'suppliers', label: 'Fournisseurs' },
  { value: 'travel', label: 'Deplacements' },
  { value: 'office', label: 'Bureautique' },
  { value: 'salaries', label: 'Salaires' },
  { value: 'taxes', label: 'Taxes / Impots' },
  { value: 'banking', label: 'Frais bancaires' },
  { value: 'other', label: 'Autre' },
];

function buildRedirectAction(id, label, path, style = 'primary', icon = 'list') {
  return { id, label, type: 'redirect', path, style, icon };
}

function injectClientIntoNextModal(nextModal, client) {
  if (!nextModal) return null;

  const confirmedFields = Array.isArray(nextModal.confirmedFields) ? [...nextModal.confirmedFields] : [];
  confirmedFields.push(`Client confirmé : ${client.name}`);

  return {
    ...nextModal,
    confirmedFields,
    payload: {
      ...(nextModal.payload || {}),
      initialValues: {
        ...((nextModal.payload && nextModal.payload.initialValues) || {}),
        clientId: client._id,
      },
      client: {
        id: client._id,
        name: client.name,
        company: client.company || '',
      },
    },
  };
}

function ContextList({ title, items, tone }) {
  if (!items?.length) return null;

  const toneClass = tone === 'missing'
    ? 'border-amber-100 bg-amber-50'
    : 'border-emerald-100 bg-emerald-50';

  return (
    <div className={`rounded-xl border px-3.5 py-3 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="text-[12.5px] text-slate-700">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModalIntro({ modal }) {
  return (
    <div className="space-y-3">
      {modal.description && (
        <p className="text-sm leading-relaxed text-slate-600">{modal.description}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <ContextList title="Confirmé" items={modal.confirmedFields} tone="confirmed" />
        <ContextList title="Manquant" items={modal.missingFields} tone="missing" />
      </div>
      {modal.confidence?.label && (
        <div className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
          Confiance {modal.confidence.label.toLowerCase()}
        </div>
      )}
    </div>
  );
}

function CreateClientModal({ modal, onClose, onAppendAssistantMessage, onOpenModal }) {
  const initialValues = modal.payload?.initialValues || {};

  const handleSuccess = (client) => {
    onClose();
    onAppendAssistantMessage({
      content: `Le client **${client.name || 'nouveau client'}** est prêt dans Fluxora.`,
      actions: [
        buildRedirectAction('client_created', 'Ouvrir la fiche client', `/clients/${client._id}`),
      ],
      journalEntry: {
        type: 'client_created',
        label: `Client ${client.name || ''} préparé`,
        status: 'success',
        at: new Date().toISOString(),
      },
    });

    const nextModal = injectClientIntoNextModal(modal.payload?.nextModal, client);
    if (nextModal) onOpenModal(nextModal);
  };

  return (
    <div className="space-y-5">
      <ModalIntro modal={modal} />
      <ClientForm
        initialValues={initialValues}
        onCancel={onClose}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

function CreateQuoteModal({ modal, onClose, onAppendAssistantMessage }) {
  const initialValues = modal.payload?.initialValues || {};

  const handleSuccess = (quote) => {
    onClose();
    onAppendAssistantMessage({
      content: `Le devis **${quote.number || 'brouillon'}** a été préparé. Vérifiez les lignes avant envoi.`,
      actions: [
        buildRedirectAction('quote_created', 'Ouvrir le devis', `/quotes/${quote._id}`),
        buildRedirectAction('quotes_list', 'Voir les devis', '/quotes', 'secondary'),
      ],
      journalEntry: {
        type: 'quote_created',
        label: `Devis ${quote.number || ''} créé`,
        status: 'success',
        at: new Date().toISOString(),
      },
    });
  };

  return (
    <div className="space-y-5">
      <ModalIntro modal={modal} />
      <QuoteForm
        initialValues={initialValues}
        onCancel={onClose}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

function CreateInvoiceModal({ modal, onClose, onAppendAssistantMessage }) {
  const initialValues = modal.payload?.initialValues || {};

  const handleSuccess = (invoice) => {
    onClose();
    onAppendAssistantMessage({
      content: `La facture **${invoice.number || 'brouillon'}** a été préparée. Vérifiez les lignes et l'échéance avant validation.`,
      actions: [
        buildRedirectAction('invoice_created', 'Ouvrir la facture', `/invoices/${invoice._id}`),
        buildRedirectAction('invoices_list', 'Voir les factures', '/invoices', 'secondary'),
      ],
      journalEntry: {
        type: 'invoice_created',
        label: `Facture ${invoice.number || ''} créée`,
        status: 'success',
        at: new Date().toISOString(),
      },
    });
  };

  return (
    <div className="space-y-5">
      <ModalIntro modal={modal} />
      <InvoiceForm
        initialValues={initialValues}
        onCancel={onClose}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

function ExpenseReclassModal({ modal, onClose, onAppendAssistantMessage }) {
  const expense = modal.payload?.expense || {};
  const [category, setCategory] = useState(modal.payload?.suggestedCategory || expense.category || 'other');
  const [notes, setNotes] = useState(expense.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!expense._id) {
      setError('Dépense introuvable.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.put(`/api/expenses/${expense._id}`, { category, notes });
      onClose();
      onAppendAssistantMessage({
        content: `La dépense **${expense.description || expense.vendor || 'Stripe'}** a été requalifiée en **${EXPENSE_CATEGORIES.find((item) => item.value === category)?.label || category}**.`,
        actions: [
          buildRedirectAction('expense_updated', 'Voir les dépenses', '/expenses'),
        ],
        journalEntry: {
          type: 'expense_reclassed',
          label: 'Dépense requalifiée',
          status: 'success',
          at: new Date().toISOString(),
        },
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de mettre à jour la dépense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <ModalIntro modal={modal} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[12px] font-semibold text-slate-800">{expense.description || 'Dépense'}</p>
          <p className="text-[11px] text-slate-500">{expense.vendor || 'Fournisseur inconnu'}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nouvelle catégorie</label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            {EXPENSE_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading}>
            {modal.submitLabel || 'Confirmer la requalification'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function CompleteInfoModal({ modal, onClose, onSendFollowUp }) {
  const fields = useMemo(() => modal.payload?.fields || [], [modal.payload]);
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((field) => [field.name, field.defaultValue || ''])));
  const [loading, setLoading] = useState(false);

  const handleChange = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const lines = fields.map((field) => `- ${field.label}: ${values[field.name] || 'information manquante'}`);
      const followUp = [
        modal.payload?.promptPrefix || 'Suite à ma demande précédente, voici les informations complémentaires :',
        ...lines,
      ].join('\n');
      await onSendFollowUp(followUp);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <ModalIntro modal={modal} />
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="mb-1 block text-sm font-medium text-slate-700">{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea
                rows={3}
                value={values[field.name] || ''}
                onChange={(event) => handleChange(field.name, event.target.value)}
                placeholder={field.placeholder || ''}
                required={field.required}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            ) : (
              <input
                type={field.type || 'text'}
                value={values[field.name] || ''}
                onChange={(event) => handleChange(field.name, event.target.value)}
                placeholder={field.placeholder || ''}
                required={field.required}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            )}
          </div>
        ))}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={loading}>
            {modal.submitLabel || 'Envoyer les informations'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ManualMatchModal({ modal, onClose, onAppendAssistantMessage }) {
  const payment = modal.payload?.payment || {};
  const invoice = modal.payload?.invoice || {};

  const handleConfirm = () => {
    onClose();
    onAppendAssistantMessage({
      content: `Le rapprochement entre **${payment.reference || payment.amount || 'le paiement'}** et **${invoice.number || 'la facture candidate'}** reste un contrôle manuel. Rien n'a été modifié automatiquement.`,
      actions: [
        buildRedirectAction('go_transactions', 'Vérifier les transactions', '/transactions'),
        buildRedirectAction('go_invoices', 'Vérifier les factures', '/invoices', 'secondary'),
      ],
      journalEntry: {
        type: 'manual_match_reviewed',
        label: 'Rapprochement manuel préparé',
        status: 'warning',
        at: new Date().toISOString(),
      },
    });
  };

  return (
    <div className="space-y-5">
      <ModalIntro modal={modal} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Paiement</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">{payment.amount || 'information manquante'}</p>
          <p className="text-xs text-slate-500">{payment.reference || 'Référence manquante'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Facture candidate</p>
          <p className="mt-2 text-sm font-semibold text-slate-800">{invoice.number || 'information manquante'}</p>
          <p className="text-xs text-slate-500">{invoice.client || 'Client manquant'}</p>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button onClick={handleConfirm}>
          {modal.submitLabel || 'Valider le contrôle manuel'}
        </Button>
      </div>
    </div>
  );
}

function ConfirmDraftModal({ modal, onClose, onExecuteAssistantAction, onAppendAssistantMessage }) {
  const actionType = modal.payload?.actionType;
  const actionPayload = modal.payload?.actionPayload || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!actionType) {
      setError('Aucune action de validation n’est disponible.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await onExecuteAssistantAction(actionType, actionPayload);
      onClose();
      onAppendAssistantMessage({
        content: modal.payload?.successMessage || 'Le brouillon a été validé avec succès.',
        actions: result?.redirectTo
          ? [buildRedirectAction('draft_redirect', 'Ouvrir l’élément', result.redirectTo)]
          : [],
        journalEntry: {
          type: 'draft_confirmed',
          label: 'Brouillon validé',
          status: 'success',
          at: new Date().toISOString(),
        },
      });
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Impossible de confirmer ce brouillon.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <ModalIntro modal={modal} />
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {modal.payload?.summary || 'Vérifiez les informations ci-dessus avant confirmation.'}
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Annuler</Button>
        <Button onClick={handleConfirm} loading={loading}>
          {modal.submitLabel || 'Confirmer'}
        </Button>
      </div>
    </div>
  );
}

export default function AssistantModalHost({
  modal,
  open,
  onClose,
  onAppendAssistantMessage,
  onSendFollowUp,
  onOpenModal,
  onExecuteAssistantAction,
}) {
  if (!modal) return null;

  const title = modal.title || {
    create_client: 'Créer un client',
    create_quote: 'Créer un devis',
    create_invoice: 'Créer une facture',
    expense_reclass: 'Corriger une dépense',
    complete_info: 'Compléter les informations',
    manual_match: 'Valider le contrôle manuel',
    confirm_draft: 'Valider le brouillon',
  }[modal.type] || 'Action assistée';

  let content = null;

  if (modal.type === 'create_client') {
    content = (
      <CreateClientModal
        modal={modal}
        onClose={onClose}
        onAppendAssistantMessage={onAppendAssistantMessage}
        onOpenModal={onOpenModal}
      />
    );
  } else if (modal.type === 'create_quote') {
    content = (
      <CreateQuoteModal
        modal={modal}
        onClose={onClose}
        onAppendAssistantMessage={onAppendAssistantMessage}
      />
    );
  } else if (modal.type === 'create_invoice') {
    content = (
      <CreateInvoiceModal
        modal={modal}
        onClose={onClose}
        onAppendAssistantMessage={onAppendAssistantMessage}
      />
    );
  } else if (modal.type === 'expense_reclass') {
    content = (
      <ExpenseReclassModal
        modal={modal}
        onClose={onClose}
        onAppendAssistantMessage={onAppendAssistantMessage}
      />
    );
  } else if (modal.type === 'complete_info') {
    content = (
      <CompleteInfoModal
        modal={modal}
        onClose={onClose}
        onSendFollowUp={onSendFollowUp}
      />
    );
  } else if (modal.type === 'manual_match') {
    content = (
      <ManualMatchModal
        modal={modal}
        onClose={onClose}
        onAppendAssistantMessage={onAppendAssistantMessage}
      />
    );
  } else if (modal.type === 'confirm_draft') {
    content = (
      <ConfirmDraftModal
        modal={modal}
        onClose={onClose}
        onExecuteAssistantAction={onExecuteAssistantAction}
        onAppendAssistantMessage={onAppendAssistantMessage}
      />
    );
  }

  if (!content) return null;

  return (
    <Modal open={open} onClose={onClose} title={title} size={modal.type === 'complete_info' ? 'md' : 'lg'}>
      {content}
    </Modal>
  );
}
