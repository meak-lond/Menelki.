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
