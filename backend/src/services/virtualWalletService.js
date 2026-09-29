/**
 * Portefeuille virtuel : capital fictif, espèces, journal des opérations et historique de valorisation.
 * Les achats débitent les espèces (refusés si le solde est insuffisant), les ventes les créditent.
 */
const VirtualWallet = require('../models/VirtualWallet');
const VirtualTransaction = require('../models/VirtualTransaction');
const SimulatedPosition = require('../models/SimulatedPosition');
const equities = require('./market/equitiesService');
const { yahoo } = require('./market/yahooClient');

const DEFAULT_CAPITAL = 100_000;
const MIN_CAPITAL = 1_000;
const MAX_CAPITAL = 10_000_000;
const MAX_SNAPSHOTS = 800; // ~3 ans de séances

const round2 = (n) => Math.round(n * 100) / 100;
const httpError = (status, message) => Object.assign(new Error(message), { status });
const eur = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
const parisDay = (d = new Date()) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

function checkCapital(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < MIN_CAPITAL || n > MAX_CAPITAL) {
    throw httpError(400, `Montant entre ${eur(MIN_CAPITAL)} et ${eur(MAX_CAPITAL)}.`);
  }
  return round2(n);
}

/**
 * Portefeuille de l'organisation, créé au premier accès.
 * Les positions simulées déjà existantes sont reprises : le capital de départ couvre ce qui a été investi.
 */
async function getWallet(orgId) {
  const existing = await VirtualWallet.findOne({ organizationId: orgId });
  if (existing) return existing;

  const positions = await SimulatedPosition.find({ organizationId: orgId }, 'investedEur proceedsEur status boughtAt').lean();
  const netInvested = round2(positions.reduce((s, p) => s + p.investedEur - (p.status === 'sold' ? p.proceedsEur || 0 : 0), 0));
  const initialCapital = Math.max(DEFAULT_CAPITAL, Math.ceil(netInvested / 10_000) * 10_000);
  const startedAt = positions.length ? new Date(Math.min(...positions.map((p) => new Date(p.boughtAt).getTime()))) : new Date();
  try {
    const wallet = await VirtualWallet.create({ organizationId: orgId, initialCapital, cash: round2(initialCapital - netInvested), startedAt });
    await VirtualTransaction.create({ organizationId: orgId, type: 'deposit', name: 'Capital de départ', amountEur: initialCapital, cashAfter: initialCapital, at: startedAt });
    return wallet;
  } catch (err) {
    if (err.code === 11000) return VirtualWallet.findOne({ organizationId: orgId }); // créé en parallèle
    throw err;
  }
}

/** Débit atomique : refusé si les espèces sont insuffisantes. */
async function debit(orgId, amountEur, txn) {
  await getWallet(orgId);
  const wallet = await VirtualWallet.findOneAndUpdate(
    { organizationId: orgId, cash: { $gte: amountEur } },
    { $inc: { cash: -amountEur } },
    { new: true }
  );
  if (!wallet) {
    const { cash } = await VirtualWallet.findOne({ organizationId: orgId }, 'cash').lean();
    throw httpError(409, `Solde insuffisant : ${eur(cash)} disponibles pour un ordre de ${eur(amountEur)}.`);
  }
  // Arrondi : évite les résidus de virgule flottante
  const cashAfter = round2(wallet.cash);
  if (cashAfter !== wallet.cash) await VirtualWallet.updateOne({ _id: wallet._id }, { $set: { cash: cashAfter } });
  await VirtualTransaction.create({ ...txn, organizationId: orgId, amountEur: -amountEur, cashAfter });
  return cashAfter;
}

async function credit(orgId, amountEur, txn) {
  await getWallet(orgId);
  const wallet = await VirtualWallet.findOneAndUpdate({ organizationId: orgId }, { $inc: { cash: amountEur } }, { new: true });
  const cashAfter = round2(wallet.cash);
  if (cashAfter !== wallet.cash) await VirtualWallet.updateOne({ _id: wallet._id }, { $set: { cash: cashAfter } });
  if (txn) await VirtualTransaction.create({ ...txn, organizationId: orgId, amountEur, cashAfter });
  return cashAfter;
}

/** Apport de capital fictif supplémentaire. */
async function deposit(orgId, userId, amount) {
  const amountEur = checkCapital(amount);
  await getWallet(orgId);
  await VirtualWallet.updateOne({ organizationId: orgId }, { $inc: { initialCapital: amountEur } });
  return credit(orgId, amountEur, { createdBy: userId, type: 'deposit', name: 'Apport de capital' });
}

/** Remise à zéro : positions et journal effacés, nouveau capital de départ. */
async function reset(orgId, userId, capital = DEFAULT_CAPITAL) {
  const initialCapital = checkCapital(capital);
  await SimulatedPosition.deleteMany({ organizationId: orgId });
  await VirtualTransaction.deleteMany({ organizationId: orgId });
  await VirtualWallet.findOneAndUpdate(
    { organizationId: orgId },
    { $set: { initialCapital, cash: initialCapital, startedAt: new Date(), snapshots: [] }, $inc: { resets: 1 } },
    { upsert: true, new: true }
  );
  await VirtualTransaction.create({ organizationId: orgId, createdBy: userId, type: 'deposit', name: 'Capital de départ', amountEur: initialCapital, cashAfter: initialCapital });
}

// Niveau du CAC 40, mis en cache 1 h (référence du graphique de performance)
const cacCache = { at: 0, value: null };
async function getCac() {
  if (Date.now() - cacCache.at < 3600_000) return cacCache.value;
  const blocked = equities.getMarketHealth().blockedUntil;
  if (blocked && new Date(blocked) > new Date()) return cacCache.value; // Yahoo limite l'accès : on ne relance pas
  cacCache.at = Date.now();
  try {
    const q = await yahoo.quote('^FCHI', {}, { validateResult: false });
    if (q?.regularMarketPrice) cacCache.value = q.regularMarketPrice;
  } catch { /* indice indisponible */ }
  return cacCache.value;
}

/** Enregistre (ou met à jour) la valorisation du jour. */
async function snapshot(wallet, { valueEur }) {
  const day = parisDay();
  const entry = { day, valueEur: round2(valueEur), cashEur: round2(wallet.cash), investedEur: wallet.initialCapital, cac: await getCac() };
  const last = wallet.snapshots[wallet.snapshots.length - 1];
  if (last?.day === day) {
    if (entry.cac == null) entry.cac = last.cac;
    await VirtualWallet.updateOne({ _id: wallet._id, 'snapshots.day': day }, { $set: { 'snapshots.$': entry } });
  } else {
    await VirtualWallet.updateOne({ _id: wallet._id }, { $push: { snapshots: { $each: [entry], $slice: -MAX_SNAPSHOTS } } });
  }
}

/** Valorisation de clôture de tous les portefeuilles (cron). */
async function snapshotAll(computePortfolio) {
  const wallets = await VirtualWallet.find({}, 'organizationId').lean();
  let ok = 0;
  for (const w of wallets) {
    try { await computePortfolio(w.organizationId); ok++; } catch (e) { console.error('[Portefeuilles]', String(w.organizationId), e.message); }
  }
  return { wallets: wallets.length, ok };
}

const listTransactions = (orgId, limit = 100) =>
  VirtualTransaction.find({ organizationId: orgId }).sort({ at: -1, _id: -1 }).limit(limit).lean();

module.exports = { getWallet, debit, credit, deposit, reset, snapshot, snapshotAll, listTransactions, parisDay, DEFAULT_CAPITAL, MIN_CAPITAL };
