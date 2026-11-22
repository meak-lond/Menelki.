# MENELKI

**Wear your story.** Boutique en ligne de streetwear élégant (vêtements, chaussures, bijoux et bracelets), basée à Yamoussoukro, Côte d'Ivoire.

🌐 Site : https://meak-lond.github.io/Menelki./
📸 Instagram : [@menelki_shop](https://www.instagram.com/menelki_shop) · 🎵 TikTok : [@menelki_shop](https://www.tiktok.com/@menelki_shop)

## Ce que fait le site
- Catalogue, fiches produit, favoris, panier et compte client (connexion e-mail ou Google).
- Commande avec livraison : Yamoussoukro 1 000 FCFA, Abidjan 1 500 FCFA, 3 jours maximum.
- Paiement en ligne avec CinetPay, ou paiement manuel par Wave et Orange Money.
- Application iPhone (PWA) installable sur l'écran d'accueil, avec mode hors connexion.
- Page d'administration (`admin.html`) : commandes, retours, produits, promotions, alertes et rapports par e-mail.
- Pages légales : mentions légales, CGU, conditions de vente, confidentialité et gestion des cookies.
- Mesure d'audience Google Analytics 4, activée seulement si le visiteur accepte les cookies.

## Technique
Site statique (HTML, CSS, JavaScript) publié par GitHub Pages depuis la branche `main`, sans étape de compilation.

| Service | Rôle |
|---|---|
| Supabase | comptes, catalogue, commandes, fonctions de paiement |
| CinetPay | paiement en ligne |
| Resend | e-mails (alertes, rapports, confirmations) |
| Google Analytics 4 | statistiques de visite |

Fichiers principaux : `index.html`, `style.css`, `app.js` et `config.js` (tous les réglages : contacts, réseaux, paiement, textes de livraison et de retour). L'administration est dans `admin.html`, `admin.css` et `admin.js`. Le détail est dans `.claude/skills/menelki-site/references/structure.md`.

## Modifier le site
1. Changer le fichier voulu (les réglages se font seulement dans `config.js`).
2. Augmenter le numéro `?v=` du fichier modifié dans `index.html` (ou `admin.html`) et `VERSION` dans `sw.js`, pour que les téléphones rechargent la nouvelle version.
3. Un commit par étape, puis publication sur `main`.

**Ne jamais mettre de secret dans ce dépôt** (il est public) : les clés CinetPay, Resend et la clé privée Supabase restent dans les secrets Supabase. Seule la clé publique `anon` de Supabase est autorisée ici.

## Skills Claude
Le dossier `.claude/skills/` contient trois guides que Claude utilise quand il travaille sur ce dépôt :
- `menelki-site` : modifier et publier le site.
- `menelki-pub` : publicités, légendes, calendrier et vidéos (le générateur `scripts/make_video.py` et les vidéos faites).
- `menelki-commandes` : paiements, livraisons, retours et réponses aux clients.

## Contact
Kouakou Inza Seth, Yamoussoukro, Côte d'Ivoire · sethglgk@icloud.com · WhatsApp +225 07 58 32 84 09

© 2026 MENELKI. Tous droits réservés.
