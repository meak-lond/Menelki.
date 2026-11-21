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
2. Augmenter `VERSION` dans `sw.js` (format `menelki-vNN`) pour vider le cache de l'application iPhone.
3. Un commit par étape, message en français, qui décrit le changement. Pousser sur `main` seulement quand l'utilisateur a dit « ok ».
4. Dire à l'utilisateur quoi vérifier sur son iPhone (Safari et application sur l'écran d'accueil).

## À ne jamais faire
- Mettre un secret (clé privée Supabase, clé API de paiement, mot de passe) dans le dépôt : il est public. Seule la clé publique `anon` de Supabase y est autorisée.
- Réintroduire `viewport-fit=cover` : il faisait apparaître les photos sous les barres de Safari.
- Supprimer `Disallow: /admin.html` de `robots.txt`.

## Références
- `references/structure.md` : rôle de chaque fichier.
- `references/design.md` : palette, formes et règles visuelles du site.
