/**
 * Client Yahoo Finance partagé (yahoo-finance2 v3 : l'API s'utilise via une instance).
 * Cotations Euronext diffusées avec 15 minutes de différé.
 */
const pkg = require('yahoo-finance2');

const YahooFinance = pkg.default || pkg;
const yahoo = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

module.exports = { yahoo };
