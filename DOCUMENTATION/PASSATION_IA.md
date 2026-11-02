# Passation entre assistants — MENELKI

Ce document est le journal partagé du projet. Il sert à transmettre les décisions et les changements vérifiables entre ChatGPT, Claude et toute personne qui intervient sur le dépôt.

## Règles de coordination

1. **Vérifier avant de modifier.** Lire l'état actuel du dépôt et de Supabase avant toute intervention.
2. **Tracer chaque changement.** Après une intervention, ajouter une entrée au journal avec la date, l'auteur (ChatGPT, Claude ou humain), le périmètre, les fichiers ou objets concernés et les vérifications effectuées.
3. **Ne pas confondre les environnements.** Le dépôt GitHub MENELKI et le projet Supabase MENELKI sont distincts du projet Urban Drip.
4. **Protéger la production.** Ne pas appliquer de migration, modifier des données, changer des politiques RLS, des clés, des paramètres d'authentification ou le déploiement de production sans validation explicite et vérification préalable.
5. **Ne jamais écrire de secrets ici.** Aucun mot de passe, clé `service_role`, jeton d'accès, chaîne de connexion ou donnée personnelle sensible dans ce fichier, les commits ou les issues.
6. **Distinguer faits et hypothèses.** Indiquer clairement ce qui a été observé, ce qui reste à vérifier et ce qui est seulement proposé.
7. **Utiliser des commits et branches identifiables.** Préférer une branche de travail et une pull request à une modification directe de `main`, surtout pour le code applicatif ou le schéma SQL.
8. **Relire les changements des autres.** Avant de poursuivre, examiner les derniers commits, les fichiers modifiés et, si nécessaire, comparer l'état du schéma Supabase.

## Repères connus du projet

- Dépôt GitHub : `meak-lond/Menelki.`
- Branche de production connue : `main`.
- Projet Supabase MENELKI lié lors de l'audit : référence `ddldwxdnrjbhppcztgiu`.
- Un autre projet Supabase nommé Urban Drip existe : ne pas le modifier dans le cadre de MENELKI.
- Le site utilise GitHub Pages et Supabase.
- Le déploiement automatique de production via l'intégration Supabase-GitHub avait été laissé désactivé lors du dernier contrôle.

## État de l'audit technique — dernier point documenté

### Vérifié
- Le dépôt contient le frontend du site (notamment `index.html`, `app.js`, `config.js` et `admin.js`).
- Le projet Supabase MENELKI contient 11 tables dans le schéma `public` : `abonnes`, `admins`, `codes_promo`, `commandes`, `commandes_historique`, `commandes_notes`, `favoris`, `notif_email`, `produits`, `profils` et `retours`.
- Les 11 tables avaient été observées avec RLS activé lors d'un contrôle antérieur.
- Une révocation du privilège `TRUNCATE` pour `anon`, `authenticated` et `PUBLIC` avait été appliquée et vérifiée.
- L'audit récent a initialisé Supabase CLI dans un espace Replit, créé une branche locale `audit-menelki`, authentifié et lié la CLI au projet MENELKI.
- La commande `supabase migration list` a échoué avec une erreur 403 indiquant une permission `database_write` manquante. Aucune migration n'a donc été confirmée par cette commande.

### Non confirmé / à terminer
- L'inventaire des contraintes (clés primaires, clés étrangères, contraintes uniques et CHECK) est en attente du résultat de la requête SQL en lecture seule.
- Les index, triggers, fonctions, valeurs par défaut, types exacts des tableaux et privilèges doivent encore être inventoriés et vérifiés.
- La synchronisation complète entre le schéma Supabase réel et des migrations versionnées n'est pas établie.
- Aucun audit de sécurité ne doit être présenté comme une certification ou un test d'intrusion complet.

### Précautions
- Ne pas supposer qu'un échec de permission CLI autorise à élargir les droits du jeton. Chercher d'abord une méthode de lecture appropriée.
- Ne pas reconstruire une migration à partir d'une liste partielle de colonnes.
- Ne pas publier sur `main` ni activer le déploiement de production simplement pour résoudre un problème de documentation.

## Journal des interventions

Ajoute une entrée en haut de cette section à chaque intervention significative.

### 2026-11-01 — Claude (lecture du document, état des lieux en lecture seule)
- **Objectif :** lire ce document, examiner l'état réel du dépôt et de Supabase MENELKI, compléter l'inventaire laissé en attente, sans rien modifier en production.
- **Branche / commit :** `coordination/passation-ia`, commit « docs: état des lieux Supabase et journal Claude ».
- **Modifications :** ce journal ; nouveau fichier `DOCUMENTATION/SCHEMA_SUPABASE.md` (instantané du schéma : tables, colonnes, contraintes, index, déclencheurs, fonctions, politiques RLS, privilèges). Aucun autre fichier du dépôt, aucune branche d'application modifiée.
- **Supabase (si concerné) :** lecture seule uniquement, sur le projet `ddldwxdnrjbhppcztgiu` : liste des tables, migrations, extensions, Edge Functions, alertes de sécurité, définitions de fonctions, déclencheurs, politiques, index, colonnes, privilèges, Realtime, noms des secrets Vault (valeurs non lues), réponses `pg_net`. **Aucune migration appliquée, aucune donnée modifiée.**
- **Vérifications effectuées :**
  - 11 tables, RLS activé sur les 11 ; toutes les politiques attendues sont présentes.
  - `TRUNCATE` retiré à `anon` et `authenticated` : confirmé (0 privilège). Aucun privilège accordé à `PUBLIC` sur les tables.
  - L'inventaire des contraintes, index, déclencheurs, fonctions et valeurs par défaut est fait : voir `SCHEMA_SUPABASE.md`.
  - 6 migrations enregistrées le 2026-10-31 (durcissement `search_path`, révocation `TRUNCATE`, restriction RPC de `rls_auto_enable`). Auteur non identifié depuis Supabase. Relecture statique des fonctions touchées : aucune référence non qualifiée trouvée.
  - E-mails d'alerte : le secret Vault `resend_api_key` existe, un destinataire est configuré, et un envoi de test du 2026-10-30 a reçu le code 200 de Resend.
  - Dépôt : `main` à `743a718` (fusion de la PR #1 par l'humain à 15:12) ; tous les fichiers de `main` sont identiques aux versions préparées par Claude, sauf `config.js` (valeurs réelles Supabase : la clé est de rôle `anon`, projet MENELKI).
  - Branches distantes : `main`, `audit-menelki` (au commit `e5cab3e`, identique à l'ancien `main`), `coordination/passation-ia`.
- **Résultat :** état sain, aucune anomalie bloquante.
- **Points non résolus / risques :**
  1. `passer_commande` et `verifier_code` ont changé de `search_path` (31/10) : relecture statique OK, mais **aucun test d'exécution réel** n'a été fait depuis ; à valider par une commande de test contrôlée ou sur une branche Supabase.
  2. Les scripts SQL qui ont construit le schéma ne sont pas versionnés dans le dépôt ; les 6 migrations enregistrées ne couvrent qu'une partie. Ne pas générer de migration à partir de l'instantané seul.
  3. Les privilèges de table sont plus larges que prévu par les scripts d'origine (par ex. mise à jour de `commandes` non limitée à `statut`) ; la protection repose sur la RLS. À examiner avant tout durcissement, avec validation.
  4. `retours.statut` n'a pas de contrainte CHECK alors que l'interface n'utilise que `nouveau`, `en_cours`, `accepte`, `refuse`, `termine`.
  5. Protection contre les mots de passe compromis désactivée (réglage Auth Supabase, éventuellement payant).
  6. Non vérifié : réglages Auth (confirmation d'e-mail, URL de redirection), état de GitHub Pages, détails du bucket Storage.
  7. Adresse réelle du site : `https://meak-lond.github.io/Menelki./` (avec le point final). La PR #1 a corrigé `og:url`, `og:image` et le bloc de données Google de `index.html` ; le chargement de `og-image.jpg` à cette adresse reste à confirmer par l'humain.
- **Prochaine étape proposée (à valider) :** (a) versionner les scripts SQL existants dans le dépôt (par ex. `supabase/scripts/`) via une pull request ; (b) test contrôlé d'une commande de bout en bout ; (c) F2 (rapport récapitulatif, demande l'extension `pg_cron`) ou G2 (notifications push, demande une Edge Function) uniquement après accord explicite.

### 2026-10-24 → 2026-11-01 — Claude (historique rétroactif, reconstitué le 2026-11-01)
- **Objectif :** retracer ce qui a été produit avant la création de ce journal.
- **Branche / commit :** livraisons sous forme de fichiers téléversés à la main par l'humain sur `main` (historique « Add files via upload »), puis PR #1 (`dfbe9ad`, fusionnée en `743a718`).
- **Modifications (fichiers du dépôt) :** `admin.html`, `admin.css`, `admin.js` (tableau de bord, commandes avancées, alertes en direct, retours, produits avancés, réglages e-mail, application installable) ; `sw.js`, `pwa.js`, `manifest.webmanifest`, `admin.webmanifest`, `hors-ligne.html`, `icone-192.png` ; `index.html` (balises PWA, puis correction des 3 adresses).
- **Supabase :** scripts SQL fournis puis exécutés par l'humain dans l'éditeur SQL : `menelki-admin` (droits administrateur), `-admin-2` (notes et historique de commandes), `-admin-3` (Realtime commandes), `-admin-4` (Realtime retours), `-admin-5` (e-mails d'alerte : table `notif_email`, déclencheurs `notifier_*`, fonctions de test). Copies des scripts dans les documents du projet Claude `claude/menelki-*.sql`. La clé Resend n'a jamais été écrite dans le dépôt : elle est dans Vault.
- **Vérifications effectuées :** scripts testés sur un PostgreSQL local de substitution ; interface testée avec un navigateur automatisé et une base simulée ; **aucun de ces tests n'a tourné contre le vrai projet Supabase avant le 2026-11-01.**
- **Résultat :** fonctionnalités livrées ; état réel confirmé par l'entrée ci-dessus.
- **Points non résolus / risques :** voir l'entrée du 2026-11-01 ci-dessus.
- **Prochaine étape proposée :** voir l'entrée du 2026-11-01 ci-dessus.

### 2026-11-01 — ChatGPT
- Création de ce document de passation sur la branche `coordination/passation-ia`.
- Objectif : centraliser les faits vérifiés, les décisions, les modifications et les prochaines étapes pour permettre une reprise fiable par Claude ou ChatGPT.
- Aucun changement du code applicatif ni du schéma Supabase effectué par cette entrée.
- Vérification restante : récupérer les résultats de l'inventaire SQL des contraintes et compléter progressivement l'état technique.

## Modèle d'entrée à copier

### AAAA-MM-JJ — [ChatGPT / Claude / humain]
- **Objectif :**
- **Branche / commit :**
- **Modifications :**
- **Supabase (si concerné) :**
- **Vérifications effectuées :**
- **Résultat :**
- **Points non résolus / risques :**
- **Prochaine étape proposée :**
