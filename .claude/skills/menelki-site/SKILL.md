---
name: menelki-site
description: À utiliser pour toute modification du site MENELKI (pages, style, code, config.js, administration, paiement, pages légales) et pour sa publication sur GitHub Pages.
---

# Modifier le site MENELKI

Site statique (HTML/CSS/JS) publié par GitHub Pages depuis la branche `main`.
Dépôt : `meak-lond/Menelki.` (le nom finit par un point). Utilisateur : iPhone uniquement.

## Avant de modifier
1. Récupérer la dernière version du dépôt : d'autres outils (ChatGPT, Codex) peuvent l'avoir modifié. Ne jamais écraser un fichier sans l'avoir relu.
2. Avancer par petites étapes, une seule modification à la fois, puis demander l'avis de l'utilisateur.
3. Les réglages (contacts, liens sociaux, paiement, textes de livraison, retours, tailles) se changent seulement dans `config.js`.

## Après chaque modification
1. Si `style.css`, `app.js`, `config.js`, `nav-mobile.js` ou `pwa.js` ont changé : augmenter le `?v=` correspondant dans `index.html` (et `admin.html` pour l'admin).
2. Augmenter `VERSION` dans `sw.js` (format `menelki-vNN`) pour vider le cache de l'application iPhone, y compris quand seul `admin.css` ou `admin.js` change.
3. Un commit par étape, message en français, qui décrit le changement. Pousser sur `main` seulement quand l'utilisateur a dit « ok ».
4. Dire à l'utilisateur quoi vérifier sur son iPhone (Safari et application sur l'écran d'accueil).

## État du site (21 nov 2026, v27)
- Design : crème + zones sombres, avec effet « liquid glass » (verre dépoli) sur le site et l'administration ; si on ajoute un élément flottant, reprendre les variables `--verre-*` (site) ou `--v-*` (admin) en fin de `style.css` / `admin.css`.
- Mesure d'audience : Google Analytics 4 (`GA_ID` dans `config.js`), chargé seulement si le visiteur accepte les cookies ; événements `view_item`, `add_to_cart`, `commande_enregistree`. Ne jamais coller le code Google Tag directement dans `index.html`.
- Réseaux : Instagram, TikTok et Facebook renseignés ; YouTube volontairement vide (pas de compte). Une icône n'apparaît que si son lien est rempli.
- Paiement en ligne : CinetPay ; paiement manuel : Wave et Orange Money.
- Si on ajoute un outil qui collecte des données, mettre à jour `confidentialite.html` et sa date.

## À ne jamais faire
- Mettre un secret (clé privée Supabase, clé API de paiement, mot de passe) dans le dépôt : il est public. Seule la clé publique `anon` de Supabase y est autorisée.
- Réintroduire `viewport-fit=cover` : il faisait apparaître les photos sous les barres de Safari.
- Supprimer `Disallow: /admin.html` de `robots.txt`.

## Références
- `references/structure.md` : rôle de chaque fichier.
- `references/design.md` : palette, formes et règles visuelles du site.
