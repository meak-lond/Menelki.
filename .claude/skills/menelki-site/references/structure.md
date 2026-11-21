# Structure du dépôt

| Fichier | Rôle |
|---|---|
| `index.html` | Page unique du site (accueil, catégories, nouveautés, lookbook, newsletter, panier). |
| `style.css` | Tout le style du site vitrine. |
| `app.js` | Logique du site : catalogue, panier, compte, commande, paiement. |
| `config.js` | Seul fichier de réglages : Supabase (clé publique), contacts, paiement mobile, textes livraison/retours/tailles, réseaux sociaux, mentions légales. |
| `nav-mobile.js` | Navigation mobile (barre du bas). |
| `pwa.js`, `sw.js`, `manifest.webmanifest`, `hors-ligne.html` | Application iPhone : installation, hors connexion, cache. |
| `admin.html`, `admin.css`, `admin.js`, `admin.webmanifest` | Page d'administration (commandes, retours, produits, alertes). |
| `legal.css`, `legal.js`, `mentions-legales.html`, `cgu.html`, `conditions-de-vente.html`, `confidentialite.html` | Pages légales. |
| `robots.txt`, `sitemap.xml`, `og-image.jpg` | Référencement et aperçu de partage. |
| `menelki-*.svg`, `favicon.*`, `icone-*.png`, `apple-touch-icon.png` | Logo Éclat et icônes. |
| `look-*.jpg` | Photos du lookbook (versions `-s` = petites). |

## Services extérieurs
- Supabase : comptes, catalogue, commandes ; fonctions de paiement `creer-paiement-cinetpay` et `cinetpay-webhook`.
- Resend : e-mails (alertes administrateur, rapports, confirmations).
- CinetPay : paiement en ligne (API v1) ; Wave et Orange Money : paiement manuel affiché après la commande.
