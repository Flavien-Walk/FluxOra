# Procédure en cas de violation de données (art. 33 et 34 RGPD)

1. **Détecter et contenir (heure 0)** : couper l'accès compromis (régénérer les clés Clerk, MongoDB, Stripe, Brevo,
   Anthropic, LinkedIn et Unsplash ; révoquer les sessions Clerk ; suspendre le service Render si nécessaire).
2. **Évaluer (avant 24 h)** : quelles données, combien de personnes, quelles organisations, depuis quand.
   S'appuyer sur le journal d'audit (collection `auditlogs`) et les journaux Render.
3. **Consigner** : toute violation est inscrite au registre des violations (date, faits, effets, mesures), même sans notification.
4. **Notifier la CNIL sous 72 h** si la violation présente un risque pour les personnes : téléservice
   « Notifier une violation de données personnelles » sur cnil.fr. Une notification incomplète peut être complétée ensuite.
5. **Informer les personnes** sans délai si le risque est élevé (ex. fuite d'IBAN ou de données financières).
   Pour les données des clients d'un utilisateur, prévenir l'utilisateur (responsable de traitement) sans délai (art. 33.2).
6. **Corriger et tirer les leçons** : correctif, test, mise à jour de ce document.

Contact de crise : mvpfintech798@gmail.com — les trois membres de l'équipe projet.
