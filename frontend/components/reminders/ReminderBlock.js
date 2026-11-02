'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import {
  computeQuoteTimeline, computeInvoiceTimeline, computeRiskScore,
  getAIRecommendation, getNextQuoteReminder, getNextInvoiceReminder,
  fmtDate, fmtDateFull,
} from '@/lib/reminderUtils';
import { cn } from '@/lib/utils';
import {
  Bell, BellOff, ChevronDown, ChevronUp, Send, CheckCircle2,
  Clock, AlertTriangle, Sparkles, History, Settings2, Zap,
} from 'lucide-react';

// ─── Step status config ───────────────────────────────────────────────────────
const STEP_STYLE = {
  done:    { dot: 'bg-success-500 border-success-200',  text: 'text-slate-400 line-through', badge: 'bg-success-50 text-success-700' },
  pending: { dot: 'bg-slate-200 border-slate-100',      text: 'text-slate-700',              badge: 'bg-slate-50 text-slate-500' },
  overdue: { dot: 'bg-danger-500 border-danger-200',    text: 'text-danger-700 font-medium', badge: 'bg-danger-50 text-danger-700' },
  skipped: { dot: 'bg-slate-100 border-slate-50',       text: 'text-slate-300',              badge: 'bg-slate-50 text-slate-300' },
};

const STEP_TYPE_ICON = {
  event:     '📤',
  reminder:  '🔔',
  milestone: '📅',
  final:     '✅',
};

// ─── Risk badge ───────────────────────────────────────────────────────────────
function RiskBadge({ risk }) {
  if (!risk || risk.level === 'none') return null;
  const styles = {
    low:    'bg-success-50 text-success-700 border-success-100',
    medium: 'bg-warning-50 text-warning-700 border-warning-100',
    high:   'bg-danger-50 text-danger-700 border-danger-100',
  };
  const icons = { low: '🟢', medium: '🟡', high: '🔴' };
  return (
    <div className={cn('flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-xs', styles[risk.level])}>
      <span>{icons[risk.level]}</span>
      <div className="flex-1">
        <p className="font-semibold">Risque d&apos;impayé : {risk.label}</p>
        {risk.factors.length > 0 && (
          <p className="mt-0.5 opacity-80">{risk.factors.slice(0, 2).join(' · ')}</p>
        )}
      </div>
    </div>
  );
}

// ─── AI recommendation card ───────────────────────────────────────────────────
function AICard({ recommendation, onSendReminder, loading }) {
  if (!recommendation) return null;
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50/60 border border-indigo-100 rounded-xl p-3.5">
      <div className="flex items-start gap-2.5 mb-2.5">
        <div className="w-7 h-7 bg-white rounded-lg border border-indigo-100 flex items-center justify-center flex-shrink-0 shadow-xs">
          <Sparkles size={13} className="text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-indigo-900">{recommendation.scenario}</p>
          <p className="text-[11px] text-indigo-600 mt-0.5 leading-relaxed">{recommendation.reason}</p>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {recommendation.actions.map((action) => (
          <button
            key={action.type}
            onClick={() => onSendReminder(action.type)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            <Send size={10} /> {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Settings panel ───────────────────────────────────────────────────────────
function SettingsPanel({ type, config, onSave, saving }) {
  const [local, setLocal] = useState({ ...config });

  const Field = ({ label, fieldKey, min = 0, max = 30, hint }) => (
    <div>
      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={local[fieldKey] ?? 0}
          onChange={(e) => setLocal((p) => ({ ...p, [fieldKey]: Number(e.target.value) }))}
          className="w-16 h-8 border border-slate-200 rounded-lg px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
        <span className="text-xs text-slate-400">{hint}</span>
      </div>
    </div>
  );

  const Toggle = ({ label, fieldKey }) => (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <div
        onClick={() => setLocal((p) => ({ ...p, [fieldKey]: !p[fieldKey] }))}
        className={cn(
          'relative w-8 h-4.5 rounded-full transition-colors flex-shrink-0',
          local[fieldKey] ? 'bg-accent-600' : 'bg-slate-200'
        )}
      >
        <span className={cn(
          'absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform',
          local[fieldKey] ? 'translate-x-4' : 'translate-x-0.5'
        )} />
      </div>
      <span className="text-xs text-slate-600">{label}</span>
    </label>
  );

  return (
    <div className="bg-slate-50/80 rounded-xl border border-slate-100 p-4 space-y-4">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Paramètres de relance</p>
      <div className="grid grid-cols-2 gap-4">
        {type === 'quote' && (
          <>
            <Field label="1ère relance" fieldKey="firstReminderDays" hint="jours après envoi" />
            <Field label="Rappel avant expiration" fieldKey="beforeExpiryDays" hint="jours avant" />
          </>
        )}
        {type === 'invoice' && (
          <>
            <Field label="Rappel avant échéance" fieldKey="beforeDueDays" hint="jours avant" />
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Relances impayées</label>
              <p className="text-xs text-slate-400">
                {type === 'invoice' && (local.afterDueDays || [5, 15]).join(' j · ')} j après échéance
              </p>
            </div>
          </>
        )}
      </div>
      {type === 'quote' && (
        <Toggle label="Relance après expiration" fieldKey="afterExpiryEnabled" />
      )}
      {type === 'invoice' && (
        <Toggle label="Rappel le jour de l'échéance" fieldKey="onDueDayEnabled" />
      )}
      <button
        onClick={() => onSave(local)}
        disabled={saving}
        className="px-3 py-1.5 bg-accent-600 text-white text-xs font-semibold rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-60"
      >
        {saving ? 'Sauvegarde…' : 'Appliquer'}
      </button>
    </div>
  );
}

// ─── History list ─────────────────────────────────────────────────────────────
function HistoryList({ history }) {
  if (!history || history.length === 0) {
    return <p className="text-xs text-slate-400 text-center py-3">Aucune relance envoyée</p>;
  }
  return (
    <div className="space-y-2">
      {[...history].reverse().map((entry, i) => (
        <div key={i} className="flex items-start gap-3 text-xs">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-400 flex-shrink-0 mt-1.5" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-700">{entry.note || entry.type}</p>
            <p className="text-slate-400">{entry.recipientEmail} · {fmtDateFull(entry.sentAt)}</p>
          </div>
          <span className={cn(
            'px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0',
            entry.status === 'sent' ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'
          )}>
            {entry.status === 'sent' ? 'Envoyé' : 'Échec'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main ReminderBlock ───────────────────────────────────────────────────────
export default function ReminderBlock({ doc, docType, mutate }) {
  const cfg = doc.reminderConfig || {};
  const enabled = cfg.enabled !== false;

  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingType, setSendingType] = useState('');
  const [lastSent, setLastSent] = useState('');

  const timeline = docType === 'quote' ? computeQuoteTimeline(doc) : computeInvoiceTimeline(doc);
  const riskScore = docType === 'invoice' ? computeRiskScore(doc) : null;
  const recommendation = getAIRecommendation(doc, docType, riskScore);
  const history = cfg.history || [];
  const nextReminder = docType === 'quote' ? getNextQuoteReminder(doc) : getNextInvoiceReminder(doc);

  const apiBase = docType === 'quote' ? '/api/quotes' : '/api/invoices';

  const toggleEnabled = async () => {
    setSaving(true);
    try {
      await api.put(`${apiBase}/${doc._id}/reminders`, { enabled: !enabled });
      mutate();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (newCfg) => {
    setSaving(true);
    try {
      await api.put(`${apiBase}/${doc._id}/reminders`, newCfg);
      setShowSettings(false);
      mutate();
    } finally {
      setSaving(false);
    }
  };

  const handleSendReminder = async (reminderType) => {
    setSendingType(reminderType);
    try {
      await api.post(`${apiBase}/${doc._id}/send-reminder`, { type: reminderType });
      setLastSent(reminderType);
      mutate();
    } catch (err) {
      alert(err.response?.data?.error || 'Erreur lors de l\'envoi');
    } finally {
      setSendingType('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0', enabled ? 'bg-accent-50' : 'bg-slate-100')}>
              {enabled ? <Bell size={13} className="text-accent-600" /> : <BellOff size={13} className="text-slate-400" />}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Relances automatiques</h3>
              {nextReminder && enabled && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Prochaine : {fmtDate(nextReminder.date)} — {nextReminder.label}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Settings2 size={13} />
            </button>
            <button
              disabled={saving}
              onClick={toggleEnabled}
              className={cn(
                'relative w-10 h-5 rounded-full transition-colors flex-shrink-0',
                enabled ? 'bg-accent-600' : 'bg-slate-200',
                saving && 'opacity-60'
              )}
            >
              <span className={cn(
                'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform',
                enabled ? 'translate-x-5' : 'translate-x-0.5'
              )} />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardBody className="space-y-4">

        {/* Confirmation envoi */}
        {lastSent && (
          <div className="flex items-center gap-2 text-xs text-success-700 bg-success-50 px-3 py-2 rounded-lg border border-success-100">
            <CheckCircle2 size={13} className="flex-shrink-0" /> Rappel envoyé avec succès
          </div>
        )}

        {/* Settings panel */}
        {showSettings && (
          <SettingsPanel
            type={docType}
            config={cfg}
            onSave={handleSaveSettings}
            saving={saving}
          />
        )}

        {/* Risk score (invoice only) */}
        {docType === 'invoice' && riskScore && riskScore.level !== 'none' && riskScore.level !== 'low' && (
          <RiskBadge risk={riskScore} />
        )}

        {/* AI recommendation */}
        {enabled && recommendation && (
          <AICard
            recommendation={recommendation}
            onSendReminder={handleSendReminder}
            loading={!!sendingType}
          />
        )}

        {/* Timeline */}
        {enabled && timeline.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Calendrier de relance</p>
            <ol className="space-y-0">
              {timeline.map((step, i) => {
                const style = STEP_STYLE[step.status] || STEP_STYLE.pending;
                const isLast = i === timeline.length - 1;
                return (
                  <li key={step.id} className="flex gap-3 relative">
                    {!isLast && (
                      <div className="absolute left-[9px] top-6 bottom-0 w-px bg-slate-100 z-0" />
                    )}
                    <span className={cn('w-4.5 h-4.5 rounded-full flex-shrink-0 border-2 z-10 mt-0.5', style.dot)} />
                    <div className={cn('flex-1 pb-3.5 flex items-start justify-between gap-2', isLast && 'pb-0')}>
                      <div>
                        <p className={cn('text-xs leading-snug', style.text)}>
                          {STEP_TYPE_ICON[step.type]} {step.label}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{fmtDate(step.date)}</p>
                      </div>
                      {step.type === 'reminder' && step.status === 'overdue' && (
                        <button
                          onClick={() => handleSendReminder(step.reminderType)}
                          disabled={!!sendingType}
                          className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                          {sendingType === step.reminderType ? '…' : <><Zap size={9} /> Envoyer</>}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {!enabled && (
          <p className="text-xs text-slate-400 text-center py-2">
            Les relances automatiques sont désactivées pour ce document.
          </p>
        )}

        {/* History toggle */}
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-600 transition-colors pt-1 border-t border-slate-100"
        >
          <span className="flex items-center gap-1.5">
            <History size={11} />
            Historique des envois ({history.length})
          </span>
          {showHistory ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
        {showHistory && <HistoryList history={history} />}

      </CardBody>
    </Card>
  );
}
