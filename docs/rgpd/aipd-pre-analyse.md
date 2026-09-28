# Pré-analyse : faut-il une analyse d'impact (AIPD) ?

> À valider par un DPO. Référence : lignes directrices du CEPD (WP248) et liste CNIL des traitements soumis à AIPD.

| Critère CEPD | Présent ? | Commentaire |
|---|---|---|
| Évaluation / notation | Oui | Score de risque de retard de paiement calculé sur les clients des utilisateurs |
| Décision automatique à effet juridique | Non | Les actions de l'IA exigent une confirmation humaine |
| Surveillance systématique | Partiel | Suivi d'ouverture des emails (désactivé par défaut) |
| Données sensibles ou hautement personnelles | Oui | Données financières (factures, IBAN, trésorerie) |
| Traitement à grande échelle | Non (bêta) | À réévaluer au lancement commercial |
| Croisement de données | Non | |
| Personnes vulnérables | Non | |
| Usage innovant | Oui | Assistant IA générative |
| Obstacle à un droit ou un service | Non | |

**Conclusion provisoire** : au moins trois critères sont réunis. Une **AIPD est recommandée avant le lancement
commercial**, en priorité sur l'assistant IA et le score de risque de paiement.
