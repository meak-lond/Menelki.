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


### 2026-11-04 — ChatGPT
- **Objectif :** audit de performance frontend MENELKI, sans modification du code applicatif ni de Supabase.
- **Branche examinée :** `main`.
- **Fichiers examinés :** `index.html` et `app.js`.
- **Constats vérifiés dans `index.html` :**
  - Montserrat est chargé depuis Google Fonts.
  - Supabase JS 2.45.4 est chargé depuis jsDelivr.
  - `config.js`, `app.js` et `pwa.js` sont inclus en scripts classiques en bas du `body`, sans attribut `defer`/ `async`.
  - L'image du hero `look-art.jpg` n'a pas d'attribut `loading`; plusieurs images secondaires ont `loading="lazy"`.
  - Le poids réel des images et leur format n'ont pas encore été mesurés.
- **Constats vérifiés dans `app.js` :**
  - Le catalogue utilise déjà une pagination de 24 produits (`PAGE = 24`) et un bouton « Voir plus ».
  - La recherche déclenche `lancerRecherche()` directement sur chaque événement `input`; aucun debounce n'est visible dans le gestionnaire de recherche examiné. Cela peut provoquer plusieurs requêtes pendant la saisie.
  - La sélection `COLONNES` utilisée pour le catalogue comprend aussi des champs détaillés (`description`, `matieres`, `images`, `couleurs_images`, `stock`, `seuil_stock`). À évaluer pour distinguer les besoins de la liste et ceux de la fiche produit.
  - Deux blocs distincts appellent `db.auth.getSession()` et enregistrent chacun un `onAuthStateChange()`. Le second déclenche notamment `chargerFavoris()` lors de l'initialisation et des changements d'authentification. Cette duplication est à analyser avant toute modification.
  - Les favoris sont chargés par une requête `select('produit_id')`; le filtrage d'accès dépend des politiques RLS existantes.
  - Le chargement des produits du panier/favoris utilise `select(COLONNES).in('id', ids)`, donc la même sélection large.
- **Impact / priorité proposée :**
  1. Mesurer les requêtes déclenchées pendant une recherche et envisager un debounce.
  2. Évaluer une sélection de colonnes minimale pour les cartes catalogue, en gardant les détails nécessaires à la fiche produit.
  3. Examiner la duplication des initialisations/listeners d'authentification et ses effets réels avant de la corriger.
  4. Mesurer les poids et dimensions des images avant de convertir ou remplacer des fichiers.
- **Vérifications / limites :** lecture du code GitHub sur `main`; aucune mesure de performance en navigateur, aucun test réseau en conditions réelles et aucun changement de code ou de base de données.
- **Résultat :** audit préliminaire documenté; aucune optimisation appliquée.
- **Prochaine étape proposée :** poursuivre l'inventaire des appels Supabase dans le reste de `app.js`, puis mesurer les images et établir un ordre de correction. Ne rien modifier sans validation explicite.


## Audit performance — app.js (2026-11-04)

**Périmètre :** lecture seule de `app.js` sur `main`. Aucun changement de code ni de Supabase.

**Constats vérifiés :**
- La recherche écoute l'événement `input` et appelle `afficherProduits()`, qui déclenche immédiatement `lancerRecherche()` puis une requête Supabase. Le compteur `rechercheId` empêche l'affichage de réponses obsolètes, mais ne limite pas le nombre de requêtes déjà envoyées. Piste : debounce, après validation.
- Deux blocs distincts appellent `db.auth.getSession()` et `db.auth.onAuthStateChange()`. Le second bloc met à jour l'utilisateur, vérifie le profil et recharge les favoris. Le premier met à jour l'affichage du formulaire de compte et gère `PASSWORD_RECOVERY`. Risque de traitements redondants à analyser avant toute fusion.
- `PAGE = 24` et `.range()` implémentent déjà une pagination du catalogue.
- `requeter()` et `chargerProduitsIds()` utilisent tous deux la sélection étendue `COLONNES`, qui comprend notamment description, matières, images, couleurs_images et stock. Piste : étudier des sélections distinctes catalogue/fiche, sans changer les besoins fonctionnels.
- `chargerProduitsIds()` regroupe les identifiants dans une requête `.in('id', ids)` : pas de requête individuelle par produit dans ce chemin.
- `chargerFavoris()` lit les favoris à l'authentification; `basculerFavori()` effectue un insert ou delete ciblé.
- Les images des cartes produits ont `loading='lazy'` et `decoding='async'`. Les images de galerie et du panier n'ont pas de chargement différé explicite.

**Priorités proposées (non exécutées) :**
1. Mesurer le volume de requêtes de recherche, puis ajouter un debounce si confirmé utile.
2. Cartographier les effets des deux abonnements auth avant de proposer leur regroupement.
3. Déterminer les colonnes strictement nécessaires à chaque vue avant de réduire les sélections.
4. Mesurer poids et dimensions des images avant toute conversion ou compression.

**État :** audit app.js terminé en lecture seule. Aucune modification du code, des données, tables, fonctions ou politiques Supabase. Ces pistes nécessitent validation avant intervention.


## Inventaire initial des images — 2026-11-04

**Périmètre :** inventaire du dépôt GitHub `main` et repérage des références dans `index.html` / `config.js`. Lecture seule, aucun fichier modifié.

**Images raster trouvées à la racine du dépôt (tailles GitHub) :**
- `look-art.jpg` — 335 838 octets (~328 KiB)
- `look-rue.jpg` — 297 776 octets (~291 KiB)
- `look-tabouret.jpg` — 90 449 octets (~88 KiB)
- `look-art-s.jpg` — 85 389 octets (~83 KiB)
- `look-rue-s.jpg` — 79 490 octets (~78 KiB)
- `look-tabouret-s.jpg` — 31 937 octets (~31 KiB)
- `og-image.jpg` — 93 427 octets (~91 KiB)
- `apple-touch-icon.png` — 6 245 octets
- `icone-192.png` — 6 661 octets
- `icone-512.png` — 21 954 octets
- `favicon-32.png` — 867 octets
- `favicon.ico` — 1 516 octets

**Références constatées :** `index.html` référence les visuels look-art, look-rue et look-tabouret (dont les variantes -s), ainsi que les icônes et logos SVG. `app.js` utilise aussi `look-art.jpg` comme image principale selon l'audit précédent. La liste du dépôt ne contient pas de répertoire `images/` à la racine (réponse 404 à l'interrogation de ce chemin).

**Limites de cet inventaire :**
- Les dimensions en pixels et les formats réels décodés ne sont pas encore vérifiés.
- Les images des produits semblent être fournies par les données du catalogue Supabase via `image_url`, `images` et `couleurs_images`; leurs URL et poids n'ont pas été inspectés.
- Les tailles GitHub indiquent les octets stockés dans le dépôt, pas le poids réellement transféré après cache ou compression réseau.

**Conclusion provisoire :** les deux grands visuels look-art.jpg et look-rue.jpg sont les plus lourds parmi les fichiers raster inventoriés. Il faut mesurer dimensions et usage exact avant de décider d'une conversion AVIF/WebP ou d'une compression. Aucun changement apporté au dépôt ou à Supabase.
