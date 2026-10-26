// ============================================================
// MENELKI – réglages du site. C'est le seul fichier à modifier.
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
var COMMANDES_OUVERTES = false;

// --- 4. Contact (affiché dans le chat et les pages légales) ---
var CONTACT_EMAIL = '';      // ex. 'contact@menelki.com'
var CONTACT_WHATSAPP = '';   // ex. '+225 07 00 00 00 00'

// --- 5. Paiement par mobile money (affiché après la commande) ---
var NUMERO_WAVE = '';
var NUMERO_ORANGE = '';

// --- 6. Livraison, retours, tailles (textes affichés sur le site) ---
// var FRAIS_LIVRAISON = 2000;   // décommente pour afficher des frais fixes (en FCFA)
var INFO_LIVRAISON = '';     // ex. 'Abidjan : 1 à 2 jours, 2 000 FCFA. International : 7 à 14 jours.'
var INFO_RETOURS = '';       // ex. 'Retour possible sous 7 jours, article non porté.'
var INFO_TAILLES = '';       // ex. 'S : 36-38 · M : 40 · L : 42 · XL : 44'

// --- 7. Âge minimum pour créer un compte ---
var AGE_MINIMUM = 16;

// --- 8. Réseaux sociaux (l'icône n'apparaît que si le lien est rempli) ---
var LIEN_INSTAGRAM = '';     // ex. 'https://instagram.com/menelki'
var LIEN_TIKTOK = '';
var LIEN_YOUTUBE = '';
var LIEN_FACEBOOK = '';

// --- 9. Mentions légales (éditeur du site) ---
var EDITEUR_NOM = '';        // ton nom ou celui de ta société
var EDITEUR_STATUT = '';     // ex. 'Entrepreneur individuel'
var EDITEUR_ADRESSE = '';
var EDITEUR_NUMERO = '';     // numéro d'immatriculation, si tu en as un
