---
name: menelki-commandes
description: À utiliser pour suivre les commandes MENELKI : paiements (CinetPay, Wave, Orange Money), livraisons, retours, fournisseurs, et pour aider à répondre aux clients.
---

# Suivi des commandes MENELKI

Données dans le projet Supabase de MENELKI (pas celui d'Urban Drip). Lire avant d'écrire ; ne jamais supprimer ni modifier une commande sans l'accord explicite de l'utilisateur.

## Suivi d'audience
- Google Analytics 4 compte les vues de produit, les ajouts au panier et les commandes enregistrées (`commande_enregistree`, montant en FCFA) pour les visiteurs qui acceptent les cookies. Une commande enregistrée n'est pas forcément payée : la vérité reste l'administration et les paiements.

## Paiements
- Paiement en ligne : CinetPay (API v1, secrets `CINETPAY_API_KEY` et `CINETPAY_API_PASSWORD` dans Supabase ; CinetPay exige 5 transactions test réussies avant la mise en production). Les fonctions `creer-paiement-cinetpay` et `cinetpay-webhook` sont dans Supabase.
- Paiement manuel : lien Wave Business et numéro Orange Money affichés après la commande (voir `config.js`). Une commande payée à la main n'est confirmée qu'après vérification du paiement par l'utilisateur.
- Les clés et mots de passe vivent dans les secrets Supabase, jamais dans le dépôt ni dans une réponse.

## Livraison
- Yamoussoukro : 1 000 FCFA. Abidjan : 1 500 FCFA. Délai : 3 jours maximum après confirmation du paiement.
- Livraison Abidjan → Yamoussoukro possible par Yango, coût élevé : le prévoir avant d'accepter une commande d'un article situé à Abidjan.
- Détails et suivi : `references/livraison-retours.md`.

## Retours
- 7 jours après réception, article non porté avec étiquettes. Frais à la charge de MENELKI si article défectueux ou erroné. Texte complet dans `config.js` (source de vérité).

## Réponses aux clients
- Tutoiement, courtes, polies. Ne jamais promettre un délai, un stock ou un remboursement qui n'est pas dans les règles ci-dessus.
- Fournir un brouillon prêt à copier pour WhatsApp ; l'utilisateur l'envoie lui-même.

## Fournisseurs
- Pas encore de fournisseurs confirmés : articles de marques connues auprès de fournisseurs d'Abidjan. Ne rien afficher en stock sur le site sans confirmation d'un fournisseur.
