# Schéma Supabase MENELKI — instantané en lecture seule

- **Projet :** `ddldwxdnrjbhppcztgiu` (MENELKI). Ne pas confondre avec le projet Urban Drip.
- **Date de l'instantané :** 2026-11-01
- **Auteur :** Claude
- **Méthode :** requêtes SQL en lecture seule (catalogues système), aucune donnée client lue. Aucun secret, aucune adresse e-mail, aucune valeur de clé n'est reproduite ici.
- **Statut :** photographie de l'état réel observé. Ce n'est **pas** une migration et ne doit pas servir à en reconstruire une sans vérification complémentaire (voir « Limites »).

## Tables du schéma `public` (11, RLS activé sur toutes)

| Table | Lignes (observées) | Rôle |
|---|---|---|
| `produits` | 7 | catalogue |
| `profils` | 2 | profil client (1 par compte) |
| `codes_promo` | 1 | codes de réduction |
| `commandes` | 0 | commandes |
| `retours` | 0 | demandes de retour |
| `favoris` | 0 | favoris client |
| `abonnes` | 0 | inscriptions newsletter |
| `admins` | 1 | comptes administrateurs |
| `commandes_notes` | 0 | note interne par commande |
| `commandes_historique` | 0 | journal des changements de statut |
| `notif_email` | 1 | réglages des e-mails d'alerte (ligne unique `id = 1`) |

## Colonnes, valeurs par défaut et contraintes

**produits** — `id` bigint (identité, PK) · `nom` text NN · `prix` int NN CHECK ≥ 0 · `categorie` text NN CHECK ∈ {vetements, chaussures, bijoux, bracelets} · `image_url` text · `images` text[] NN défaut `{}` · `couleurs` text[] NN défaut `{}` · `tailles` text[] NN défaut `{}` · `couleurs_images` jsonb NN défaut `{}` · `description` text · `matieres` text · `meilleure_vente` bool NN défaut false · `en_promo` bool NN défaut false · `ancien_prix` int CHECK (null ou ≥ 0) · `stock` int CHECK (null ou ≥ 0 ; null = illimité) · `seuil_stock` int NN défaut 3 · `disponible` bool NN défaut true · `cree_le` timestamptz NN défaut now().

**profils** — `user_id` uuid PK, FK → `auth.users` ON DELETE CASCADE · `prenom` text NN · `nom` text NN · `date_naissance` date NN · `interets` text[] NN défaut `{}` · `consent_marketing` bool NN défaut false · `consent_date` timestamptz · `telephone` text · `adresse` text · `cree_le` timestamptz NN défaut now().

**codes_promo** — `code` text PK CHECK (= upper(code)) · `type` text NN CHECK ∈ {pourcentage, montant} · `valeur` int NN CHECK > 0 · `minimum` int NN défaut 0 · `actif` bool NN défaut true · `expire_le` timestamptz · `max_utilisations` int · `utilisations` int NN défaut 0.

**commandes** — `id` bigint (identité, PK) · `user_id` uuid FK → `auth.users` ON DELETE SET NULL · `articles` jsonb NN · `sous_total` int NN · `remise` int NN défaut 0 · `code_promo` text · `total` int NN · `telephone` text NN · `adresse` text NN · `statut` text NN défaut `en_attente` CHECK ∈ {en_attente, payee, expediee, livree, annulee} · `cree_le` timestamptz NN défaut now().

**retours** — `id` bigint (identité, PK) · `commande_id` bigint NN FK → `commandes` ON DELETE CASCADE · `user_id` uuid NN défaut `auth.uid()` FK → `auth.users` ON DELETE CASCADE · `motif` text NN · `message` text · `statut` text NN défaut `nouveau` (**aucune contrainte CHECK** sur ce champ) · `cree_le` timestamptz NN défaut now().

**favoris** — `user_id` uuid NN défaut `auth.uid()` FK → `auth.users` CASCADE · `produit_id` bigint NN FK → `produits` CASCADE · PK (`user_id`, `produit_id`).

**abonnes** — `id` bigint (identité, PK) · `email` text NN UNIQUE CHECK (format e-mail) · `cree_le` timestamptz NN défaut now().

**admins** — `user_id` uuid PK FK → `auth.users` ON DELETE CASCADE · `cree_le` timestamptz NN défaut now().

**commandes_notes** — `commande_id` bigint PK FK → `commandes` CASCADE · `note` text NN défaut `''` · `maj_le` timestamptz NN défaut now().

**commandes_historique** — `id` bigint (identité, PK) · `commande_id` bigint NN FK → `commandes` CASCADE · `statut` text NN · `par` uuid · `cree_le` timestamptz NN défaut now().

**notif_email** — `id` smallint PK défaut 1 CHECK (= 1) · `destinataire` text CHECK (null ou format e-mail) · `expediteur` text NN défaut `MENELKI <onboarding@resend.dev>` CHECK (5 à 120 caractères) · `lien_admin` text CHECK (null ou commence par `https://`) · `nouvelle_commande` bool NN défaut true · `nouveau_retour` bool NN défaut true · `maj_le` timestamptz NN défaut now().

## Index (hors clés primaires)
- `commandes_historique_cmd` sur `commandes_historique (commande_id, cree_le)`.
- `abonnes_email_key` (unicité de l'e-mail).
- Aucun index sur les colonnes de clés étrangères `commandes.user_id`, `retours.commande_id`, `retours.user_id`, `favoris.produit_id` (sans importance à ce volume ; à réévaluer si le volume grandit).

## Déclencheurs
| Table | Déclencheur | Moment | Fonction |
|---|---|---|---|
| `commandes` | `commandes_journal` | AFTER UPDATE OF statut | `journaliser_statut()` |
| `commandes` | `commandes_restituer_stock` | AFTER UPDATE OF statut | `restituer_stock()` (remet le stock quand une commande passe à `annulee`) |
| `commandes` | `trg_notifier_commande` | AFTER INSERT | `notifier_commande()` (e-mail Resend ; n'empêche jamais la commande) |
| `retours` | `trg_notifier_retour` | AFTER INSERT | `notifier_retour()` (idem) |
| `profils` | `profils_age` | BEFORE INSERT / UPDATE OF date_naissance | `verifier_age()` (âge minimum 16 ans, valeur écrite en dur dans la fonction) |

## Fonctions du schéma `public`
| Fonction | SECURITY DEFINER | search_path | Exécutable par |
|---|---|---|---|
| `est_admin()` | oui | `pg_catalog` | authenticated |
| `passer_commande(jsonb, text, text, text)` | oui | `pg_catalog` | authenticated |
| `verifier_code(text, integer)` | oui | `pg_catalog` | authenticated |
| `envoyer_email_test()` | oui | `pg_catalog` | authenticated (refuse les non-administrateurs) |
| `resultat_email(bigint)` | oui | `pg_catalog` | authenticated (refuse les non-administrateurs) |
| `_remise_code`, `_envoyer_email`, `journaliser_statut`, `restituer_stock`, `notifier_commande`, `notifier_retour`, `rls_auto_enable` | oui | `public` (ou `public, extensions`) / `pg_catalog` | aucun rôle API |
| `_h`, `_fc`, `_gabarit_email` (aides de mise en forme) | non | `pg_catalog` | anon, authenticated (fonctions pures sans accès aux données) |
| `verifier_age` | non | `pg_catalog` | anon, authenticated (fonction de déclencheur) |

Les fonctions modifiées par migration le 2026-10-31 (`search_path` passé à `pg_catalog`) référencent toutes leurs tables avec le préfixe `public.` : relecture statique faite, aucun défaut trouvé. **Aucun test d'exécution réel de `passer_commande` n'a encore été fait après ce changement.**

## Politiques RLS (résumé)
- **produits** : lecture publique si `disponible = true` ; tout (ALL) pour l'administrateur.
- **profils** : un client lit, crée et modifie sa propre ligne ; l'administrateur lit tout.
- **commandes** : un client lit ses commandes ; l'administrateur lit tout et peut mettre à jour. Aucune politique d'insertion : les commandes passent par `passer_commande()`.
- **retours** : un client lit ses retours et en crée un uniquement pour l'une de ses commandes ; l'administrateur lit et met à jour.
- **favoris** : un client lit, ajoute et retire ses propres favoris.
- **abonnes** : insertion ouverte (anon et authenticated) ; lecture réservée à l'administrateur.
- **codes_promo**, **commandes_notes**, **notif_email** (lecture/modification), **commandes_historique** (lecture) : administrateur seulement.
- **admins** : RLS activé, volontairement **aucune politique** (table invisible depuis l'API) ; lecture uniquement via `est_admin()`.
- **storage.objects** (bucket `produits`, public en lecture) : ajout, modification et suppression réservés à l'administrateur.

## Privilèges au niveau des tables
- `TRUNCATE` : plus accordé à `anon` ni `authenticated` (migration du 2026-10-31, vérifié : 0 privilège restant). Aucun privilège accordé à `PUBLIC` sur les tables du schéma `public`.
- Au niveau des tables, `anon` et `authenticated` gardent des privilèges larges (SELECT, INSERT, UPDATE, DELETE…) sur la plupart des tables : la sécurité repose donc sur les politiques RLS ci-dessus, pas sur les droits. À noter : les scripts d'origine prévoyaient une mise à jour limitée à la colonne `statut` pour l'administrateur ; ce n'est pas ce que reflètent les droits actuels. Sans conséquence démontrée (seul l'administrateur peut mettre à jour via RLS), mais à examiner avant tout durcissement.

## Autres éléments observés
- **Realtime** (`supabase_realtime`) : `public.commandes` et `public.retours`.
- **Vault** : un secret nommé `resend_api_key` existe (valeur non lue).
- **Extensions installées utiles** : `pg_net`, `supabase_vault`, `pgcrypto`, `uuid-ossp`, `pg_stat_statements`. `pg_cron` est disponible mais **non installé**.
- **Edge Functions** : aucune.
- **Migrations enregistrées** (`list_migrations`) : 6, toutes du 2026-10-31 — `restrict_rls_auto_enable_rpc_access`, `set_search_path_h_helper`, `set_search_path_fc_helper`, `set_search_path_email_template`, `set_search_path_age_trigger`, `revoke_truncate_from_public_roles`.
- **Alertes de sécurité Supabase** : 5 avertissements « SECURITY DEFINER exécutable par authenticated » (attendus : chaque fonction contrôle elle-même `auth.uid()` ou `est_admin()`) ; 1 information « admins sans politique » (voulu) ; 1 avertissement « protection contre les mots de passe compromis désactivée » (réglage Auth, à décider par le propriétaire).

## Limites
- Le schéma réel provient de scripts SQL exécutés à la main dans l'éditeur SQL (`menelki-base`, `menelki-admin`, `-admin-2` à `-admin-5`), qui ne sont **pas versionnés dans ce dépôt**. Les 6 migrations enregistrées ne couvrent qu'une partie de l'historique.
- Réglages Auth (confirmation d'e-mail, URL de redirection), configuration du déploiement GitHub Pages et contenu détaillé du bucket Storage : **non vérifiés**.
- Instantané daté : à rafraîchir avant toute décision qui en dépend.
