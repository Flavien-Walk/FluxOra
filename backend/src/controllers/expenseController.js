const Expense = require('../models/Expense');
const Alert = require('../models/Alert');
const AccountingEntry = require('../models/AccountingEntry');
const Organization = require('../models/Organization');

const getUserOrg = async (userId) =>
  Organization.findOne({
    $or: [{ clerkOwnerId: userId }, { 'members.clerkUserId': userId }],
  });

// Taux de déductibilité TVA par catégorie
const VAT_DEDUCTIBILITY = {
  software:  1.0,
  marketing: 1.0,
  suppliers: 1.0,
  travel:    1.0,
  office:    1.0,
  other:     1.0,
  banking:   0,
  taxes:     0,
  salaries:  0,
};

// Calcule les montants TVA depuis amountHT + vatRate
function calcVat(amountHT, vatRate, category) {
  const vatAmount = Math.round(amountHT * vatRate) / 100;
  const deductibility = VAT_DEDUCTIBILITY[category] ?? 1.0;
  const vatRecoverable = Math.round(vatAmount * deductibility * 100) / 100;
  const amountTTC = Math.round((amountHT + vatAmount) * 100) / 100;
  return { vatAmount: Math.round(vatAmount * 100) / 100, vatRecoverable, amountTTC };
}

// Crée des alertes si nécessaire
async function createAlertsIfNeeded(expense, orgId) {
  const alerts = [];
  const isVatEligible = VAT_DEDUCTIBILITY[expense.category] > 0;

  if (isVatEligible && expense.vatRate === 0 && expense.amount > 50) {
    alerts.push({
      organizationId: orgId,
      type: 'missing_vat',
      severity: 'medium',
      expenseId: expense._id,
      message: `TVA non renseignée pour "${expense.description}" (${expense.amount} €). Vérifiez si la TVA est récupérable.`,
    });
  }

  if (!expense.receiptUrl && expense.amount > 100) {
    alerts.push({
      organizationId: orgId,
      type: 'missing_receipt',
      severity: expense.amount > 500 ? 'high' : 'medium',
      expenseId: expense._id,
      message: `Justificatif manquant pour "${expense.description}" (${expense.amount} €).`,
    });
  }

  if (alerts.length > 0) {
    await Alert.insertMany(alerts);
    await Expense.findByIdAndUpdate(expense._id, { status: 'pending_review' });
  }
}

// GET /api/expenses
const getExpenses = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { category, status, from, to, page = 1, limit = 50 } = req.query;
  const query = { organizationId: org._id };
  if (category) query.category = category;
  if (status)   query.status   = status;
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to)   query.date.$lte = new Date(to);
  }

  const [expenses, total] = await Promise.all([
    Expense.find(query).sort({ date: -1 }).skip((page - 1) * limit).limit(Number(limit)),
    Expense.countDocuments(query),
  ]);

  res.json({ expenses, total, page: Number(page), limit: Number(limit) });
};

// GET /api/expenses/vat-summary
const getVatSummary = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { from, to } = req.query;
  const query = { organizationId: org._id, status: { $ne: 'non_eligible' } };
  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to)   query.date.$lte = new Date(to);
  }

  const expenses = await Expense.find(query).select('amountHT vatRate vatAmount vatRecoverable amount');

  const summary = {
    totalHT:        0,
    totalTTC:       0,
    vatRecoverable: 0,
    byRate:         { 0: 0, 5.5: 0, 10: 0, 20: 0 },
    count:          expenses.length,
  };

  for (const e of expenses) {
    summary.totalHT        += e.amountHT || 0;
    summary.totalTTC       += e.amount   || 0;
    summary.vatRecoverable += e.vatRecoverable || 0;
    const rate = e.vatRate ?? 0;
    if (summary.byRate[rate] !== undefined) {
      summary.byRate[rate] += e.vatRecoverable || 0;
    }
  }

  // Arrondi à 2 décimales
  summary.totalHT        = Math.round(summary.totalHT * 100) / 100;
  summary.totalTTC       = Math.round(summary.totalTTC * 100) / 100;
  summary.vatRecoverable = Math.round(summary.vatRecoverable * 100) / 100;

  res.json(summary);
};

// GET /api/expenses/:id
const getExpense = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const expense = await Expense.findOne({ _id: req.params.id, organizationId: org._id });
  if (!expense) return res.status(404).json({ error: 'Dépense introuvable.' });
  res.json(expense);
};

// POST /api/expenses
const createExpense = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const { description, vendor, category, date, receiptUrl, notes, vatRate = 20 } = req.body;
  let { amountHT, amount } = req.body;

  // Calcul TVA
  let vatAmount = 0;
  let vatRecoverable = 0;

  if (amountHT != null && amountHT > 0) {
    const calc = calcVat(Number(amountHT), Number(vatRate), category);
    vatAmount      = calc.vatAmount;
    vatRecoverable = calc.vatRecoverable;
    amount         = calc.amountTTC;
  } else if (amount != null && Number(vatRate) > 0) {
    // Retrouver HT depuis TTC
    amountHT       = Math.round(Number(amount) / (1 + Number(vatRate) / 100) * 100) / 100;
    vatAmount      = Math.round((Number(amount) - amountHT) * 100) / 100;
    const deductibility = VAT_DEDUCTIBILITY[category] ?? 1.0;
    vatRecoverable = Math.round(vatAmount * deductibility * 100) / 100;
  } else {
    amountHT = Number(amount) || 0;
  }

  const expense = await Expense.create({
    organizationId: org._id,
    description,
    vendor,
    category,
    date:          date || Date.now(),
    amountHT:      Number(amountHT) || 0,
    vatRate:       Number(vatRate),
    vatAmount,
    vatRecoverable,
    amount:        Number(amount),
    currency:      req.body.currency || 'EUR',
    receiptUrl,
    notes,
  });

  // Écriture comptable
  await AccountingEntry.create({
    organizationId: org._id,
    date:        expense.date,
    description: `Dépense — ${description}`,
    category,
    type:        'debit',
    amount:      expense.amount,
    currency:    expense.currency,
    source:      'expense',
    sourceId:    expense._id,
    sourceModel: 'Expense',
  });

  // Alertes
  await createAlertsIfNeeded(expense, org._id);

  const saved = await Expense.findById(expense._id);
  res.status(201).json(saved);
};

// PUT /api/expenses/:id
const updateExpense = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const expense = await Expense.findOneAndUpdate(
    { _id: req.params.id, organizationId: org._id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!expense) return res.status(404).json({ error: 'Dépense introuvable.' });

  // Si la dépense est mise à jour et qu'une alerte manquant-justificatif existait, la résoudre auto
  if (req.body.receiptUrl) {
    await Alert.updateMany(
      { expenseId: expense._id, type: 'missing_receipt', status: 'open' },
      { status: 'resolved', resolvedAt: new Date() }
    );
  }
  if (req.body.vatRate && req.body.vatRate > 0) {
    await Alert.updateMany(
      { expenseId: expense._id, type: 'missing_vat', status: 'open' },
      { status: 'resolved', resolvedAt: new Date() }
    );
  }

  res.json(expense);
};

// DELETE /api/expenses/:id
const deleteExpense = async (req, res) => {
  const org = await getUserOrg(req.userId);
  if (!org) return res.status(404).json({ error: 'Organisation introuvable.' });

  const expense = await Expense.findOneAndDelete({ _id: req.params.id, organizationId: org._id });
  if (!expense) return res.status(404).json({ error: 'Dépense introuvable.' });

  await Promise.all([
    AccountingEntry.deleteOne({ sourceId: expense._id, sourceModel: 'Expense' }),
    Alert.deleteMany({ expenseId: expense._id }),
  ]);

  res.json({ message: 'Dépense supprimée.' });
};

// POST /api/expenses/scan — OCR via Mindee v2
const MINDEE_MODEL_ID = process.env.MINDEE_MODEL_ID || '09cef90e-48fb-406c-8a34-0335748bb7a1';
const MINDEE_V2_BASE  = 'https://api-v2.mindee.net';
const LEGAL_VAT_RATES = [0, 5.5, 10, 20];

const scanReceipt = async (req, res) => {
  const { image, mimeType } = req.body;
  if (!image) return res.status(400).json({ error: 'Image manquante.' });

  const apiKey = process.env.MINDEE_API_KEY;
  if (!apiKey) {
    return res.status(501).json({ error: 'MINDEE_API_KEY non configuré.' });
  }

  try {
    const FormData = require('form-data');
    const axios    = require('axios');

    const buffer = Buffer.from(image, 'base64');
    const ext    = (mimeType || 'image/jpeg').includes('pdf') ? 'receipt.pdf' : 'receipt.jpg';

    // 1. Enqueue le document
    const form = new FormData();
    form.append('file',     buffer,          { filename: ext, contentType: mimeType || 'image/jpeg' });
    form.append('model_id', MINDEE_MODEL_ID);

    const { data: enqueueData } = await axios.post(
      `${MINDEE_V2_BASE}/v2/products/extraction/enqueue`,
      form,
      { headers: { Authorization: apiKey, ...form.getHeaders() } }
    );

    const jobId      = enqueueData.job?.id;
    const pollingUrl = enqueueData.job?.polling_url;
    if (!jobId) return res.status(502).json({ error: 'Job ID manquant dans la réponse Mindee.' });

    // 2. Poll jusqu'au résultat (max 15s, toutes les 2s)
    let result = null;
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const { data: jobData } = await axios.get(
        pollingUrl || `${MINDEE_V2_BASE}/v2/jobs/${jobId}`,
        { headers: { Authorization: apiKey } }
      );
      if (jobData.inference?.result) {
        result = jobData.inference.result;
        break;
      }
      if (jobData.job?.status === 'Failed') {
        return res.status(502).json({ error: 'OCR échoué côté Mindee.' });
      }
    }

    if (!result) return res.status(504).json({ error: 'Délai OCR dépassé. Réessayez.' });

    // 3. Extraire les champs utiles
    const fields      = result.fields || {};
    const supplier    = fields.supplier_name?.value   || '';
    const rawDate     = fields.date?.value             || null;
    const totalAmount = fields.total_amount?.value     || null;
    const totalNet    = fields.total_net?.value        || null;
    const rawVatRate  = fields.tax_rate?.value
                     ?? fields.taxes?.items?.[0]?.rate
                     ?? null;

    const vatRate = rawVatRate != null
      ? LEGAL_VAT_RATES.reduce((p, c) => Math.abs(c - rawVatRate) < Math.abs(p - rawVatRate) ? c : p)
      : 20;

    const amountHT = totalNet != null
      ? Math.round(totalNet * 100) / 100
      : totalAmount != null
        ? Math.round(totalAmount / (1 + vatRate / 100) * 100) / 100
        : null;

    res.json({
      supplier,
      date:       rawDate,
      amountHT,
      vatRate,
      confidence: fields.total_amount?.confidence ?? null,
    });
  } catch (err) {
    const msg = err.response?.data?.detail || err.response?.data?.message || err.message;
    res.status(502).json({ error: `Erreur OCR: ${msg}` });
  }
};

module.exports = { getExpenses, getExpense, getVatSummary, scanReceipt, createExpense, updateExpense, deleteExpense };
