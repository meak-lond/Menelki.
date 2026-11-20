// ============================================================
// MENELKI, réglages du site. C'est le seul fichier à modifier.
// Les lignes qui commencent par // sont des explications.
// ============================================================

// --- 1. Supabase (comptes, catalogue, commandes) ---
// Supabase > Project Settings > API : copie « Project URL » et la clé « anon public ».
var SUPABASE_URL = 'https://ddldwxdnrjbhppcztgiu.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRkbGR3eGRucmpiaHBwY3p0Z2l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNDIyNTgsImV4cCI6MjEwODYxODI1OH0.awkp9F7Y-ZYPC-bYQaLWmBKArsyEKNQ1prOwfbdKE5U' ;

// --- 2. Connexions sociales actives ---
// Ajoute 'google' (puis 'facebook' ou 'apple') quand elles sont prêtes dans Supabase.
// Exemple : var FOURNISSEURS = ['google'];
var FOURNISSEURS = [];

// --- 3. Ouverture des commandes ---
// false = vitrine seulement (le site reste invisible pour Google).
// true  = les clients peuvent commander.
var COMMANDES_OUVERTES = true;

// --- 4. Contact (affiché dans le chat et les pages légales) ---
var CONTACT_EMAIL = 'sethglgk@icloud.com';      // ex. 'contact@menelki.com'
var CONTACT_WHATSAPP = '+225 07 58 32 84 09';   // ex. '+225 07 00 00 00 00'

// --- 5. Paiement par mobile money (affiché après la commande) ---
var LIEN_WAVE = 'https://pay.wave.com/m/M_ci_gC8-1W2xPLpz/c/ci/';   // lien de paiement Wave Business (le montant est ajouté automatiquement)
var NUMERO_WAVE = '';                  // facultatif : numéro Wave à afficher en plus du lien
var NUMERO_ORANGE = '07 58 32 84 09';  // numéro Orange Money Business

// --- 6. Livraison, retours, tailles (textes affichés sur le site) ---
// var FRAIS_LIVRAISON = 2000;   // décommente pour afficher des frais fixes (en FCFA)
var INFO_LIVRAISON = 'Livraison à Yamoussoukro : 1 000 FCFA. Livraison à Abidjan : 1 500 FCFA. Délai : 3 jours maximum après confirmation du paiement. Les frais de livraison sont confirmés avec toi avant l\'expédition.';     // ex. 'Abidjan : 1 à 2 jours, 2 000 FCFA. International : 7 à 14 jours.'
var INFO_RETOURS = 'Tu peux demander un retour dans un délai de 7 jours après la réception, pour un article non porté, non lavé, avec ses étiquettes et dans son état d\'origine. Contacte-nous d\'abord par WhatsApp ou par e-mail avec ton numéro de commande. Si l\'article est défectueux ou ne correspond pas à ta commande, MENELKI prend en charge les frais de retour. Dans les autres cas, les frais de retour sont à ta charge. Une fois l\'article reçu et contrôlé, le remboursement (hors frais de livraison initiaux, sauf erreur ou défaut) est effectué dans un délai de 7 jours, par le même moyen de paiement. Les bijoux et bracelets portés ne sont pas repris.';       // ex. 'Retour possible sous 7 jours, article non porté.'
var INFO_TAILLES = 'Vêtements (tour de poitrine) : S 88-96 cm · M 96-104 cm · L 104-112 cm · XL 112-120 cm. Chaussures (longueur du pied, approximative) : 38 = 24 cm · 39 = 24,5 cm · 40 = 25 cm · 41 = 26 cm · 42 = 26,5 cm · 43 = 27,5 cm · 44 = 28 cm · 45 = 29 cm. Les coupes varient selon les marques : en cas de doute entre deux tailles, prends la plus grande ou écris-nous sur WhatsApp avant de commander.';       // ex. 'S : 36-38 · M : 40 · L : 42 · XL : 44'

// --- 7. Âge minimum pour créer un compte ---
var AGE_MINIMUM = 16;

// --- 8. Réseaux sociaux (l'icône n'apparaît que si le lien est rempli) ---
var LIEN_INSTAGRAM = 'https://www.instagram.com/menelki_shop';     // ex. 'https://instagram.com/menelki'
var LIEN_TIKTOK = '';
var LIEN_YOUTUBE = '';
var LIEN_FACEBOOK = '';

// --- 9. Mentions légales (éditeur du site) ---
var EDITEUR_NOM = 'Kouakou Inza Seth (MENELKI)';        // ton nom ou celui de ta société
var EDITEUR_STATUT = 'Entrepreneur individuel';     // ex. 'Entrepreneur individuel'
var EDITEUR_ADRESSE = 'QPGW+XF Yamoussoukro, Côte d\'Ivoire';
var EDITEUR_NUMERO = '';     // numéro d'immatriculation, si tu en as un
