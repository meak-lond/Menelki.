// Administration MENELKI : gestion des articles et des photos
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var db = null;
  try {
    if (typeof SUPABASE_URL === 'string' && SUPABASE_URL.indexOf('http') === 0) {
      db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
  } catch (e) { db = null; }

  var CATS = { vetements: 'Vêtements', chaussures: 'Chaussures', bijoux: 'Bijoux', bracelets: 'Bracelets' };
  var articles = [];
  var enCours = null;      // id de l'article modifié, ou null pour un nouvel article
  var photos = [];         // adresses des photos de l'article en cours
  var envoiEnCours = 0;

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) { e.className = cls; } if (txt !== undefined) { e.textContent = txt; } return e; }
  function fcfa(n) { return Number(n).toLocaleString('fr-FR') + ' FCFA'; }
  function montrer(id) { $('connexion').hidden = (id !== 'connexion'); $('app').hidden = (id !== 'app'); window.scrollTo(0, 0); }
  function montrerProd(id) { $('liste').hidden = (id !== 'liste'); $('formulaire').hidden = (id !== 'formulaire'); window.scrollTo(0, 0); }
  function listeDe(txt) {
    return txt.split(',').map(function (s) { return s.trim(); }).filter(function (s, i, a) { return s && a.indexOf(s) === i; });
  }

  // ----- Connexion -----
  async function demarrer() {
    if (!db) { $('ad-msg').textContent = "Le site n'est pas encore relié à Supabase (config.js)."; montrer('connexion'); return; }
    var s = await db.auth.getSession();
    if (!s.data.session) { montrer('connexion'); return; }
    var a = await db.rpc('est_admin');
    if (a.error || a.data !== true) {
      await db.auth.signOut();
      $('ad-msg').textContent = "Ce compte n'est pas administrateur.";
      montrer('connexion');
      return;
    }
    $('admin-email').textContent = s.data.session.user.email || '';
    $('avatar').textContent = ((s.data.session.user.email || 'A').charAt(0) || 'A').toUpperCase();
    montrer('app');
    aller(location.hash.replace('#', '') || 'tableau');
    compterEnAttente();
  }

  $('ad-entrer').addEventListener('click', async function () {
    $('ad-msg').textContent = '';
    if (!db) { return; }
    var r = await db.auth.signInWithPassword({ email: $('ad-email').value.trim(), password: $('ad-mdp').value });
    if (r.error) { $('ad-msg').textContent = 'E-mail ou mot de passe incorrect.'; return; }
    $('ad-mdp').value = '';
    demarrer();
  });
  $('ad-mdp').addEventListener('keydown', function (e) { if (e.key === 'Enter') { $('ad-entrer').click(); } });
  $('deco').addEventListener('click', async function () { if (db) { await db.auth.signOut(); } fermerMenu(); montrer('connexion'); });

  // ----- Liste des articles -----
  async function chargerArticles() {
    $('msg-liste').className = 'msg'; $('msg-liste').textContent = '';
    var r = await db.from('produits')
      .select('id,nom,prix,categorie,image_url,stock,disponible,en_promo,meilleure_vente')
      .order('cree_le', { ascending: false });
    if (r.error) { $('msg-liste').textContent = 'Impossible de charger les articles : ' + r.error.message; return; }
    articles = r.data || [];
    dessinerListe();
  }

  function dessinerListe() {
    var z = $('articles'); z.textContent = '';
    var q = $('recherche').value.trim().toLowerCase();
    var vus = articles.filter(function (a) { return !q || a.nom.toLowerCase().indexOf(q) >= 0; });
    if (!vus.length) { z.appendChild(el('p', 'vide', articles.length ? 'Aucun article trouvé.' : "Aucun article pour l'instant. Touche « + Nouvel article » pour commencer.")); return; }
    vus.forEach(function (a) {
      var b = el('button', 'art');
      var m = el('div', 'mini');
      var im = el('img');
      if (a.image_url) { im.src = a.image_url; im.alt = ''; im.loading = 'lazy'; }
      else { im.src = 'menelki-symbole-blanc.svg'; im.alt = ''; im.className = 'logo-vide'; }
      m.appendChild(im);
      var inf = el('div', 'inf');
      inf.appendChild(el('div', 'nom', a.nom));
      inf.appendChild(el('div', 'prix', fcfa(a.prix) + ' · ' + (CATS[a.categorie] || a.categorie)));
      var bd = el('div', 'badges');
      if (!a.disponible) { bd.appendChild(el('span', 'badge alerte', 'Masqué')); }
      if (a.stock === 0) { bd.appendChild(el('span', 'badge alerte', 'Épuisé')); }
      else if (a.stock !== null) { bd.appendChild(el('span', 'badge', 'Stock ' + a.stock)); }
      if (a.en_promo) { bd.appendChild(el('span', 'badge', 'Promo')); }
      if (a.meilleure_vente) { bd.appendChild(el('span', 'badge', 'Meilleure vente')); }
      inf.appendChild(bd);
      b.appendChild(m); b.appendChild(inf);
      b.addEventListener('click', function () { ouvrirFormulaire(a.id); });
      z.appendChild(b);
    });
  }
  $('recherche').addEventListener('input', dessinerListe);
  $('nouveau').addEventListener('click', function () { ouvrirFormulaire(null); });

  // ----- Formulaire -----
  function remplir(p) {
    $('f-nom').value = p.nom || '';
    $('f-cat').value = p.categorie || 'vetements';
    $('f-prix').value = (p.prix === undefined || p.prix === null) ? '' : p.prix;
    $('f-tailles').value = (p.tailles || []).join(', ');
    $('f-couleurs').value = (p.couleurs || []).join(', ');
    $('f-desc').value = p.description || '';
    $('f-mat').value = p.matieres || '';
    $('f-stock').value = (p.stock === undefined || p.stock === null) ? '' : p.stock;
    $('f-dispo').checked = (p.disponible === undefined) ? true : !!p.disponible;
    $('f-best').checked = !!p.meilleure_vente;
    $('f-promo').checked = !!p.en_promo;
    $('f-ancien').value = (p.ancien_prix === undefined || p.ancien_prix === null) ? '' : p.ancien_prix;
    $('bloc-ancien').hidden = !$('f-promo').checked;
    photos = (p.images && p.images.length) ? p.images.slice() : (p.image_url ? [p.image_url] : []);
    dessinerPhotos();
  }

  async function ouvrirFormulaire(id) {
    enCours = id;
    $('f-msg').textContent = ''; $('f-msg').className = 'msg'; $('f-envoi').textContent = '';
    $('f-suppr').hidden = (id === null);
    $('f-titre').textContent = id === null ? 'Nouvel article' : "Modifier l'article";
    $('f-save').disabled = false;
    if (id === null) { remplir({}); montrerProd('formulaire'); return; }
    var r = await db.from('produits').select('*').eq('id', id).single();
    if (r.error || !r.data) { $('msg-liste').textContent = "Impossible d'ouvrir cet article."; return; }
    remplir(r.data);
    montrerProd('formulaire');
  }

  $('f-promo').addEventListener('change', function () { $('bloc-ancien').hidden = !this.checked; });
  $('f-retour').addEventListener('click', retourListe);
  $('f-annuler').addEventListener('click', retourListe);
  function retourListe() { montrerProd('liste'); chargerArticles(); }

  // ----- Photos -----
  function dessinerPhotos() {
    var z = $('photos'); z.textContent = '';
    photos.forEach(function (u, i) {
      var c = el('div', 'photo');
      var b = el('button', 'choisir'); b.setAttribute('aria-label', 'Mettre en première photo');
      var im = el('img'); im.src = u; im.alt = ''; b.appendChild(im);
      b.addEventListener('click', function () { if (i > 0) { photos.unshift(photos.splice(i, 1)[0]); dessinerPhotos(); } });
      var x = el('button', 'x', '×'); x.setAttribute('aria-label', 'Retirer la photo');
      x.addEventListener('click', function () { photos.splice(i, 1); dessinerPhotos(); });
      c.appendChild(b); c.appendChild(x);
      if (i === 0) { c.appendChild(el('span', 'etiq', 'Principale')); }
      z.appendChild(c);
    });
  }

  // Réduit la photo (1600 px max, JPEG) avant l'envoi : plus rapide et plus léger
  function reduire(fichier) {
    return new Promise(function (ok, ko) {
      var url = URL.createObjectURL(fichier), im = new Image();
      im.onload = function () {
        var k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { if (b) { ok(b); } else { ko(new Error('Photo illisible')); } }, 'image/jpeg', 0.86);
      };
      im.onerror = function () { URL.revokeObjectURL(url); ko(new Error('Photo illisible')); };
      im.src = url;
    });
  }

  $('f-fichiers').addEventListener('change', async function () {
    var fichiers = Array.prototype.slice.call(this.files || []);
    this.value = '';
    if (!fichiers.length) { return; }
    $('f-envoi').className = 'msg ok';
    $('f-save').disabled = true;
    envoiEnCours++;
    var echecs = 0;
    for (var i = 0; i < fichiers.length; i++) {
      $('f-envoi').textContent = 'Envoi de la photo ' + (i + 1) + ' sur ' + fichiers.length + '…';
      try {
        var blob = await reduire(fichiers[i]);
        var nom = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + '.jpg';
        var up = await db.storage.from('produits').upload(nom, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
        if (up.error) { throw up.error; }
        photos.push(db.storage.from('produits').getPublicUrl(nom).data.publicUrl);
        dessinerPhotos();
      } catch (e) { echecs++; }
    }
    envoiEnCours--;
    if (!envoiEnCours) { $('f-save').disabled = false; }
    if (echecs) { $('f-envoi').className = 'msg'; $('f-envoi').textContent = echecs + ' photo(s) non envoyée(s). Vérifie ta connexion et réessaie.'; }
    else { $('f-envoi').textContent = 'Photo(s) ajoutée(s). Pense à enregistrer.'; }
  });

  // ----- Enregistrer / supprimer -----
  function entier(champ) { var v = $(champ).value.trim(); return v === '' ? null : parseInt(v, 10); }
  function erreur(t) { $('f-msg').className = 'msg'; $('f-msg').textContent = t; }

  $('f-save').addEventListener('click', async function () {
    var nom = $('f-nom').value.trim(), prix = entier('f-prix'), stock = entier('f-stock');
    var promo = $('f-promo').checked, ancien = entier('f-ancien');
    if (!nom) { erreur('Entre le nom de l\'article.'); return; }
    if (prix === null || isNaN(prix) || prix < 0) { erreur('Entre un prix valide en FCFA.'); return; }
    if (stock !== null && (isNaN(stock) || stock < 0)) { erreur('Le stock doit être un nombre positif, ou vide.'); return; }
    if (promo && (ancien === null || isNaN(ancien) || ancien <= prix)) { erreur("En promotion, l'ancien prix doit être supérieur au prix actuel."); return; }
    var charge = {
      nom: nom, categorie: $('f-cat').value, prix: prix,
      image_url: photos[0] || null, images: photos.slice(),
      tailles: listeDe($('f-tailles').value), couleurs: listeDe($('f-couleurs').value),
      description: $('f-desc').value.trim() || null, matieres: $('f-mat').value.trim() || null,
      stock: stock, disponible: $('f-dispo').checked, meilleure_vente: $('f-best').checked,
      en_promo: promo, ancien_prix: promo ? ancien : null
    };
    $('f-save').disabled = true; erreur('');
    var r = enCours === null ? await db.from('produits').insert(charge) : await db.from('produits').update(charge).eq('id', enCours);
    $('f-save').disabled = false;
    if (r.error) { erreur("Enregistrement impossible : " + r.error.message); return; }
    montrerProd('liste');
    await chargerArticles();
    $('msg-liste').className = 'msg ok';
    $('msg-liste').textContent = 'Article enregistré.';
  });

  $('f-suppr').addEventListener('click', async function () {
    if (enCours === null) { return; }
    if (!window.confirm('Supprimer définitivement cet article ? Pour seulement le cacher, décoche « Visible sur la boutique ».')) { return; }
    var r = await db.from('produits').delete().eq('id', enCours);
    if (r.error) { erreur('Suppression impossible : ' + r.error.message); return; }
    montrerProd('liste');
    await chargerArticles();
    $('msg-liste').className = 'msg ok';
    $('msg-liste').textContent = 'Article supprimé.';
  });

  // ----- Icônes -----
  var ICO = {
    tableau: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    commandes: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    produits: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
    clients: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
    stats: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20H2"/>',
    marketing: '<path d="m3 11 18-7v16L3 13z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    reglages: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    burger: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    cloche: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    sortie: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    argent: '<path d="M12 2v20"/><path d="M17 6.5A4 4 0 0 0 13 5h-2.5a3.5 3.5 0 0 0 0 7h3a3.5 3.5 0 0 1 0 7H10a4 4 0 0 1-4-1.5"/>',
    panier: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>'
  };
  function svg(nom) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICO[nom] + '</svg>'; }
  $('burger').innerHTML = svg('burger'); $('cloche').insertAdjacentHTML('afterbegin', svg('cloche')); $('deco').innerHTML = svg('sortie');
  $('date-jour').textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // ----- Navigation -----
  var VUES = [
    { id: 'tableau', nom: 'Tableau de bord', ico: 'tableau' },
    { id: 'commandes', nom: 'Commandes', ico: 'commandes' },
    { id: 'produits', nom: 'Produits', ico: 'produits' },
    { id: 'clients', nom: 'Clients', ico: 'clients' },
    { id: 'stats', nom: 'Statistiques', ico: 'stats' },
    { id: 'marketing', nom: 'Marketing', ico: 'marketing', bientot: 'Les codes promo, les promotions et les envois aux abonnés.' },
    { id: 'reglages', nom: 'Réglages', ico: 'reglages', bientot: 'Les réglages de la boutique : livraison, paiement, contacts.' }
  ];
  var vueActive = 'tableau';
  VUES.forEach(function (v) {
    var b = el('button', 'nav-lien'); b.id = 'nav-' + v.id; b.innerHTML = svg(v.ico);
    b.appendChild(el('span', '', v.nom));
    if (v.id === 'commandes') { var nb = el('span', 'nb'); nb.id = 'nav-nb'; nb.hidden = true; b.appendChild(nb); }
    b.addEventListener('click', function () { aller(v.id); fermerMenu(); });
    $('nav').appendChild(b);
  });

  function aller(id) {
    var v = VUES.filter(function (x) { return x.id === id; })[0] || VUES[0];
    vueActive = v.id;
    ['v-tableau', 'v-produits', 'v-commandes', 'v-clients', 'v-stats', 'v-bientot'].forEach(function (x) { $(x).hidden = true; });
    VUES.forEach(function (x) { $('nav-' + x.id).classList.toggle('actif', x.id === v.id); });
    $('titre-vue').textContent = v.nom;
    try { history.replaceState(null, '', '#' + v.id); } catch (e) {}
    if (v.id === 'tableau') { $('v-tableau').hidden = false; chargerTableau(); }
    else if (v.id === 'commandes') { $('v-commandes').hidden = false; montrerCmd('liste'); chargerCommandes(); }
    else if (v.id === 'clients') { $('v-clients').hidden = false; montrerCli('liste'); chargerClients(); }
    else if (v.id === 'stats') { $('v-stats').hidden = false; chargerStats(); }
    else if (v.id === 'produits') { $('v-produits').hidden = false; montrerProd('liste'); chargerArticles(); }
    else { $('bientot-titre').textContent = v.nom; $('bientot-texte').textContent = v.bientot; $('v-bientot').hidden = false; }
    window.scrollTo(0, 0);
  }

  function fermerMenu() { $('lateral').classList.remove('ouvert'); $('voile').classList.remove('ouvert'); }
  $('burger').addEventListener('click', function () { $('lateral').classList.add('ouvert'); $('voile').classList.add('ouvert'); });
  $('voile').addEventListener('click', fermerMenu);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { fermerMenu(); } });
  $('cloche').addEventListener('click', function () { filtreCmd = 'en_attente'; aller('commandes'); });
  $('recherche-haut').addEventListener('submit', function (e) {
    e.preventDefault();
    var q = $('rech-haut').value;
    aller('produits');
    $('recherche').value = q; dessinerListe();
  });

  // ----- Tableau de bord : chiffres -----
  var JOUR = 86400000;
  function pct(a, b) { return b > 0 ? ((a - b) / b) * 100 : null; }
  function deltaHtml(a, b) {
    var d = el('span', 'delta');
    var p = pct(a, b);
    if (p === null) { d.textContent = a > 0 ? 'Nouveau' : '—'; return d; }
    var r = Math.round(p * 10) / 10;
    d.textContent = (r > 0 ? '▲ +' : r < 0 ? '▼ ' : '') + String(r).replace('.', ',') + ' %';
    if (r > 0) { d.className += ' hausse'; } else if (r < 0) { d.className += ' baisse'; }
    return d;
  }
  function carte(nom, ico, valeur, unite, a, b) {
    var k = el('div', 'kpi');
    var t = el('div', 'kpi-tete'); t.appendChild(el('span', 'kpi-nom', nom));
    var i = el('span', 'kpi-ico'); i.innerHTML = svg(ico); t.appendChild(i); k.appendChild(t);
    var v = el('div', 'kpi-val', valeur); if (unite) { v.appendChild(el('small', '', unite)); } k.appendChild(v);
    var p = el('div', 'kpi-pied');
    if (a !== null) { p.appendChild(deltaHtml(a, b)); p.appendChild(el('span', 'kpi-vs', 'vs 30 j précédents')); }
    k.appendChild(p);
    return k;
  }
  function articlesVendus(c) {
    var n = 0;
    (Array.isArray(c.articles) ? c.articles : []).forEach(function (l) { n += parseInt(l.qte, 10) || 0; });
    return n;
  }
  function paye(c) { return c.statut === 'payee' || c.statut === 'expediee' || c.statut === 'livree'; }
  function stats(liste) {
    var ca = 0, ventes = 0, nb = 0, clients = {};
    liste.forEach(function (c) {
      if (c.statut === 'annulee') { return; }
      nb++;
      if (c.user_id) { clients[c.user_id] = 1; }
      if (paye(c)) { ca += c.total; ventes += articlesVendus(c); }
    });
    return { ca: ca, ventes: ventes, nb: nb, clients: Object.keys(clients).length };
  }

  var cmd90 = [], periode = 30, dernieres = [];
  async function chargerTableau() {
    var z = $('kpis'); $('msg-tableau').textContent = '';
    if (!z.children.length) {
      ['Chiffre d\'affaires', 'Ventes', 'Commandes', 'Clients actifs'].forEach(function (n, i) {
        z.appendChild(carte(n, ['argent', 'panier', 'commandes', 'clients'][i], '…', '', null, null));
      });
      z.classList.add('squelette');
    }
    
var maintenant = Date.now();

var dateDebut = new Date();
dateDebut.setDate(1);
dateDebut.setHours(0, 0, 0, 0);
dateDebut.setMonth(dateDebut.getMonth() - 6);

var debut = dateDebut.toISOString();
    var r = await db.from('commandes').select('id,total,statut,user_id,articles,cree_le').gte('cree_le', debut).order('cree_le', { ascending: false }).limit(1000);
    if (r.error) { $('msg-tableau').textContent = 'Impossible de charger les chiffres : ' + r.error.message; return; }
    cmd90 = r.data || [];
    var limite = maintenant - 30 * JOUR;
    var recent = [], avant = [];
    cmd90.forEach(function (c) { var t = new Date(c.cree_le).getTime(); if (t >= limite) { recent.push(c); } else if (t >= maintenant - 60 * JOUR) { avant.push(c); } });
    var A = stats(recent), B = stats(avant);
    // Le nombre de profils est distinct du nombre de clients ayant commandé récemment.
    var comptes = await db.from('profils').select('user_id', { count: 'exact', head: true });
    z.classList.remove('squelette'); z.textContent = '';
    z.appendChild(carte("Chiffre d'affaires", 'argent', A.ca.toLocaleString('fr-FR'), 'FCFA', A.ca, B.ca));
    z.appendChild(carte('Articles vendus', 'panier', A.ventes.toLocaleString('fr-FR'), '', A.ventes, B.ventes));
    z.appendChild(carte('Commandes', 'commandes', A.nb.toLocaleString('fr-FR'), '', A.nb, B.nb));
    z.appendChild(carte('Clients acheteurs', 'clients', A.clients.toLocaleString('fr-FR'), '', A.clients, B.clients));
    if (comptes.error) {
      $('msg-tableau').textContent = "Les ventes sont chargées, mais le nombre de comptes inscrits n'est pas accessible : " + comptes.error.message;
    } else {
      z.appendChild(carte('Comptes inscrits', 'clients', Number(comptes.count || 0).toLocaleString('fr-FR'), '', null, null));
    }
    dessinerGraphe();
    dessinerTop(recent);
    dessinerRecentes();
  }

  // ----- Graphique des ventes -----
  function cleJour(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function court(n) {
    if (n >= 1e6) { return (Math.round(n / 1e5) / 10).toString().replace('.', ',') + ' M'; }
    if (n >= 1e3) { return Math.round(n / 1e3) + ' k'; }
    return String(Math.round(n));
  }
  function joliMax(m) {
    if (m <= 0) { return 1000; }
    var p = Math.pow(10, Math.floor(Math.log(m) / Math.LN10)), f = m / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }
  function dessinerGraphe() {
    var z = $('graph'); z.textContent = '';
    var n = periode, jours = [], index = {};
    var auj = new Date(); auj.setHours(12, 0, 0, 0);
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(auj.getTime() - i * JOUR);
      index[cleJour(d)] = jours.length; jours.push({ d: d, v: 0 });
    }
    var total = 0;
    cmd90.forEach(function (c) {
      if (!paye(c)) { return; }
      var k = cleJour(new Date(c.cree_le));
      if (index[k] !== undefined) { jours[index[k]].v += c.total; total += c.total; }
    });
    $('graph-total').innerHTML = total.toLocaleString('fr-FR') + '<small>FCFA</small>';
    var W = z.clientWidth || 600, H = 230, pg = 40, pd = 10, ph = 10, pb = 26;
    var iw = W - pg - pd, ih = H - ph - pb;
    var max = joliMax(Math.max.apply(null, jours.map(function (j) { return j.v; })));
    var X = function (i) { return pg + (n === 1 ? iw / 2 : i * iw / (n - 1)); };
    var Y = function (v) { return ph + ih - (v / max) * ih; };
    var pts = jours.map(function (j, i) { return [X(i), Y(j.v)]; });
    var ligne = 'M' + pts[0][0] + ',' + pts[0][1];
    for (var k2 = 0; k2 < pts.length - 1; k2++) {
      var p1 = pts[k2], p2 = pts[k2 + 1], mx = (p1[0] + p2[0]) / 2;
      ligne += ' C' + mx + ',' + p1[1] + ' ' + mx + ',' + p2[1] + ' ' + p2[0] + ',' + p2[1];
    }
    var aire = ligne + ' L' + pts[pts.length - 1][0] + ',' + (ph + ih) + ' L' + pts[0][0] + ',' + (ph + ih) + ' Z';
    var g = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Courbe des ventes"><defs><linearGradient id="deg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f2f2" stop-opacity=".28"/><stop offset="1" stop-color="#f2f2f2" stop-opacity="0"/></linearGradient></defs>';
    for (var t = 0; t <= 4; t++) {
      var v = max * t / 4, y = Y(v);
      g += '<line class="grille" x1="' + pg + '" x2="' + (W - pd) + '" y1="' + y + '" y2="' + y + '"/><text class="axe" x="' + (pg - 8) + '" y="' + (y + 3) + '" text-anchor="end">' + court(v) + '</text>';
    }
    var pas = Math.max(1, Math.round((n - 1) / (W < 500 ? 3 : 4)));
    for (var i2 = 0; i2 < n; i2 += pas) {
      if (n - 1 - i2 < pas * 0.6 && i2 !== n - 1) { continue; }
      g += '<text class="axe" x="' + X(i2) + '" y="' + (H - 6) + '" text-anchor="' + (i2 === 0 ? 'start' : (i2 >= n - 1 ? 'end' : 'middle')) + '">' + jours[i2].d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + '</text>';
    }
    g += '<path d="' + aire + '" fill="url(#deg)"/><path d="' + ligne + '" fill="none" stroke="#f2f2f2" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    g += '<line id="g-trait" y1="' + ph + '" y2="' + (ph + ih) + '" stroke="#b7b7b7" stroke-dasharray="3 3" opacity="0"/><circle id="g-point" r="5" fill="#050505" stroke="#f2f2f2" stroke-width="2" opacity="0"/></svg>';
    z.innerHTML = g;
    if (!total) { z.appendChild(el('div', 'vide-graph', 'Aucune vente sur cette période.')); }
    var bulle = el('div', 'info-bulle'); bulle.hidden = true; z.appendChild(bulle);
    var trait = z.querySelector('#g-trait'), point = z.querySelector('#g-point');
    function survol(e) {
      var r = z.getBoundingClientRect(), x = (e.clientX - r.left) * (W / r.width);
      var i = Math.max(0, Math.min(n - 1, Math.round((x - pg) / (iw / Math.max(1, n - 1)))));
      var px = pts[i][0], py = pts[i][1];
      trait.setAttribute('x1', px); trait.setAttribute('x2', px); trait.setAttribute('opacity', 1);
      point.setAttribute('cx', px); point.setAttribute('cy', py); point.setAttribute('opacity', 1);
      bulle.innerHTML = '<b>' + jours[i].v.toLocaleString('fr-FR') + ' FCFA</b><span>' + jours[i].d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + '</span>';
      bulle.hidden = false;
      var bx = px * (r.width / W); bx = Math.max(52, Math.min(r.width - 52, bx));
      bulle.style.left = bx + 'px';
    }
    function quitte() { trait.setAttribute('opacity', 0); point.setAttribute('opacity', 0); bulle.hidden = true; }
    z.addEventListener('pointermove', survol); z.addEventListener('pointerdown', survol); z.addEventListener('pointerleave', quitte);
  }
  $('periodes').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) { return; }
    periode = parseInt(b.getAttribute('data-j'), 10);
    Array.prototype.forEach.call($('periodes').children, function (x) { x.classList.toggle('actif', x === b); });
    dessinerGraphe();
  });
  var minuteur = null;
  window.addEventListener('resize', function () { clearTimeout(minuteur); minuteur = setTimeout(function () { if (vueActive === 'tableau' && !$('v-tableau').hidden) { dessinerGraphe(); } }, 150); });

  // ----- Meilleures ventes -----
  function dessinerTop(liste) {
    var z = $('top'); z.textContent = '';
    var tab = {};
    liste.forEach(function (c) {
      if (!paye(c) || !Array.isArray(c.articles)) { return; }
      c.articles.forEach(function (l) {
        var cle = l.id || l.nom, q = parseInt(l.qte, 10) || 0, p = parseInt(l.prix, 10) || 0;
        if (!tab[cle]) { tab[cle] = { nom: l.nom || 'Article', q: 0, ca: 0 }; }
        tab[cle].q += q; tab[cle].ca += q * p;
      });
    });
    var top = Object.keys(tab).map(function (k) { return tab[k]; }).sort(function (a, b) { return b.q - a.q; }).slice(0, 5);
    if (!top.length) { z.appendChild(el('p', 'vide', 'Aucune vente sur les 30 derniers jours.')); return; }
    var m = top[0].q;
    top.forEach(function (p) {
      var l = el('div', 'ligne-top'); l.appendChild(el('div', 'nom', p.nom));
      var ch = el('div', 'chiffres'); ch.innerHTML = '<b>' + p.q + '</b> vendu' + (p.q > 1 ? 's' : '') + ' · ' + p.ca.toLocaleString('fr-FR') + ' FCFA'; l.appendChild(ch);
      var b = el('div', 'barre'), i = el('i'); b.appendChild(i); l.appendChild(b);
      z.appendChild(l);
      setTimeout(function () { i.style.width = Math.max(4, Math.round(p.q / m * 100)) + '%'; }, 60);
    });
  }

  // ----- Dernières commandes -----
  var STATUTS = { en_attente: 'En attente', payee: 'Payée', expediee: 'Expédiée', livree: 'Livrée', annulee: 'Annulée' };
  async function dessinerRecentes() {
    var z = $('recentes'); z.textContent = '';
    var r = await db.from('commandes').select('id,total,statut,user_id,cree_le').order('cree_le', { ascending: false }).limit(6);
    var liste = (r && r.data) || [];
    if (!liste.length) { z.appendChild(el('p', 'vide', "Aucune commande pour l'instant.")); return; }
    var noms = {};
    var ids = liste.map(function (c) { return c.user_id; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    if (ids.length) {
      var p = await db.from('profils').select('user_id,prenom,nom').in('user_id', ids);
      ((p && p.data) || []).forEach(function (x) { noms[x.user_id] = x.prenom + ' ' + (x.nom || '').charAt(0) + '.'; });
    }
    liste.forEach(function (c) {
      var l = el('div', 'ligne-cmd');
      var q = el('div', 'qui', noms[c.user_id] || 'Client'); q.appendChild(el('small', '', '#' + c.id)); l.appendChild(q);
      l.appendChild(el('div', 'montant', c.total.toLocaleString('fr-FR') + ' FCFA'));
      l.appendChild(el('div', 'quand', new Date(c.cree_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })));
      var st = el('span', 'pill ' + c.statut, STATUTS[c.statut] || c.statut); st.className += ' pastille-st'; l.appendChild(st);
      z.appendChild(l);
    });
  }
  $('voir-commandes').addEventListener('click', function () { filtreCmd = 'tous'; aller('commandes'); });

  // ----- Page Commandes -----
  var cmdTout = [], profMap = {}, filtreCmd = 'tous';
  var SUITE = {
    en_attente: { vers: 'payee', texte: 'Confirmer le paiement', q: 'Confirmer que le paiement de cette commande a bien été reçu ?' },
    payee: { vers: 'expediee', texte: 'Marquer comme expédiée', q: 'Marquer cette commande comme expédiée ?' },
    expediee: { vers: 'livree', texte: 'Marquer comme livrée', q: 'Marquer cette commande comme livrée ?' }
  };
  function montrerCmd(id) { $('cmd-liste').hidden = (id !== 'liste'); $('cmd-detail').hidden = (id !== 'detail'); window.scrollTo(0, 0); }
  function nomClient(c) { var p = profMap[c.user_id]; return p ? p.prenom + ' ' + p.nom : 'Client'; }
  function dateLongue(t) { return new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }

  async function chargerCommandes() {
    $('msg-cmd').textContent = '';
    var r = await db.from('commandes').select('*').order('cree_le', { ascending: false }).limit(500);
    if (r.error) { $('msg-cmd').textContent = 'Impossible de charger les commandes : ' + r.error.message; return; }
    cmdTout = r.data || [];
    var p = await db.from('profils').select('user_id,prenom,nom,telephone').limit(1000);
    profMap = {};
    ((p && p.data) || []).forEach(function (x) { profMap[x.user_id] = x; });
    dessinerFiltres(); dessinerCmd();
  }

  function dessinerFiltres() {
    var z = $('filtres'); z.textContent = '';
    var n = { tous: cmdTout.length };
    cmdTout.forEach(function (c) { n[c.statut] = (n[c.statut] || 0) + 1; });
    [['tous', 'Toutes'], ['en_attente', 'En attente'], ['payee', 'Payées'], ['expediee', 'Expédiées'], ['livree', 'Livrées'], ['annulee', 'Annulées']].forEach(function (f) {
      var b = el('button', f[0] === filtreCmd ? 'actif' : '', f[1]);
      b.appendChild(el('b', '', String(n[f[0]] || 0)));
      b.addEventListener('click', function () { filtreCmd = f[0]; dessinerFiltres(); dessinerCmd(); });
      z.appendChild(b);
    });
  }

  function dessinerCmd() {
    var z = $('cmd-zone'); z.textContent = '';
    var q = $('rech-cmd').value.trim().toLowerCase();
    var vues = cmdTout.filter(function (c) {
      if (filtreCmd !== 'tous' && c.statut !== filtreCmd) { return false; }
      if (!q) { return true; }
      return ('#' + c.id + ' ' + c.id + ' ' + nomClient(c) + ' ' + (c.telephone || '') + ' ' + (c.adresse || '')).toLowerCase().indexOf(q) >= 0;
    });
    if (!vues.length) { z.appendChild(el('p', 'vide', cmdTout.length ? 'Aucune commande ne correspond.' : "Aucune commande pour l'instant. Elles apparaîtront ici dès qu'un client commandera.")); return; }
    vues.forEach(function (c) {
      var b = el('button', 'cmd-ligne');
      var qui = el('div', 'qui', nomClient(c)); qui.appendChild(el('small', '', '#' + c.id)); b.appendChild(qui);
      b.appendChild(el('div', 'montant', c.total.toLocaleString('fr-FR') + ' FCFA'));
      b.appendChild(el('div', 'quand', new Date(c.cree_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })));
      b.appendChild(el('span', 'pill ' + c.statut, STATUTS[c.statut] || c.statut));
      b.addEventListener('click', function () { ouvrirCmd(c.id); });
      z.appendChild(b);
    });
  }
  $('rech-cmd').addEventListener('input', dessinerCmd);

  function chiffresTel(t) {
    var d = String(t || '').replace(/\D/g, '');
    if (d.length === 10 && d.charAt(0) === '0') { d = '225' + d; }   // numéro ivoirien à 10 chiffres
    return d;
  }

  function ouvrirCmd(id, message) {
    var c = cmdTout.filter(function (x) { return x.id === id; })[0];
    if (!c) { return; }
    var z = $('cmd-detail'); z.textContent = '';
    var re = el('button', 'retour', '← Retour aux commandes'); re.addEventListener('click', function () { montrerCmd('liste'); dessinerFiltres(); dessinerCmd(); });
    z.appendChild(re);
    var t = el('div', 'detail-tete'); t.appendChild(el('h2', '', 'Commande #' + c.id)); t.appendChild(el('span', 'pill ' + c.statut, STATUTS[c.statut] || c.statut)); z.appendChild(t);
    z.appendChild(el('p', 'aide', dateLongue(c.cree_le)));

    var cl = el('div', 'bloc-det'); cl.appendChild(el('h3', '', 'Client'));
    cl.appendChild(el('p', '', nomClient(c)));
    cl.appendChild(el('p', '', c.telephone || ''));
    cl.appendChild(el('p', '', c.adresse || ''));
    var ct = el('div', 'contacts'), tel = chiffresTel(c.telephone);
    if (tel) {
      var a1 = el('a', '', 'Appeler'); a1.href = 'tel:+' + tel; ct.appendChild(a1);
      var a2 = el('a', '', 'WhatsApp'); a2.href = 'https://wa.me/' + tel + '?text=' + encodeURIComponent('Bonjour, c\'est MENELKI au sujet de votre commande #' + c.id + '.'); a2.target = '_blank'; a2.rel = 'noopener'; ct.appendChild(a2);
    }
    cl.appendChild(ct); z.appendChild(cl);

    var ar = el('div', 'bloc-det'); ar.appendChild(el('h3', '', 'Articles'));
    (Array.isArray(c.articles) ? c.articles : []).forEach(function (l) {
      var r = el('div', 'art-l');
      r.appendChild(el('div', 'n', (l.nom || 'Article') + ' × ' + (l.qte || 0)));
      r.appendChild(el('div', 'm', ((parseInt(l.prix, 10) || 0) * (parseInt(l.qte, 10) || 0)).toLocaleString('fr-FR') + ' FCFA'));
      var opt = [l.taille ? 'Taille ' + l.taille : '', l.couleur || ''].filter(Boolean).join(' · ');
      if (opt) { r.appendChild(el('div', 'o', opt)); }
      ar.appendChild(r);
    });
    function ligne(txt, val, fort) { var d = el('div', 'tot-l' + (fort ? ' fort' : '')); d.appendChild(el('span', '', txt)); d.appendChild(el('span', '', val)); ar.appendChild(d); }
    ligne('Sous-total', c.sous_total.toLocaleString('fr-FR') + ' FCFA');
    if (c.remise > 0) { ligne('Remise' + (c.code_promo ? ' (' + c.code_promo + ')' : ''), '− ' + c.remise.toLocaleString('fr-FR') + ' FCFA'); }
    ligne('Total à payer', c.total.toLocaleString('fr-FR') + ' FCFA', true);
    z.appendChild(ar);

    var msg = el('p', 'msg' + (message ? ' ok' : ''), message || '');
    var ac = el('div', 'actions-cmd');
    var suite = SUITE[c.statut];
    function lancer(vers, question, boutons) {
      if (!window.confirm(question)) { return; }
      boutons.forEach(function (b) { b.disabled = true; });
      db.from('commandes').update({ statut: vers }).eq('id', c.id).select('id').then(function (r) {
        if (r.error || !(r.data && r.data.length)) {
          boutons.forEach(function (b) { b.disabled = false; });
          msg.className = 'msg'; msg.textContent = 'Changement impossible' + (r.error ? ' : ' + r.error.message : '. Vérifie que ton compte est bien administrateur.');
          return;
        }
        c.statut = vers; ouvrirCmd(c.id, 'Statut mis à jour : ' + STATUTS[vers] + '.'); compterEnAttente();
      });
    }
    var btns = [];
    if (suite) { var b1 = el('button', 'btn', suite.texte); btns.push(b1); b1.addEventListener('click', function () { lancer(suite.vers, suite.q, btns); }); ac.appendChild(b1); }
    if (c.statut !== 'livree' && c.statut !== 'annulee') {
      var b2 = el('button', 'btn danger', 'Annuler la commande'); b2.style.marginTop = '0'; btns.push(b2);
      b2.addEventListener('click', function () { lancer('annulee', 'Annuler la commande #' + c.id + ' ? Les articles seront remis en stock. Cette action est définitive.', btns); });
      ac.appendChild(b2);
    }
    if (c.statut === 'livree') { ac.appendChild(el('p', 'aide', 'Commande terminée.')); }
    if (c.statut === 'annulee') { ac.appendChild(el('p', 'aide', 'Commande annulée. Les articles ont été remis en stock.')); }
    z.appendChild(ac); z.appendChild(msg);
    montrerCmd('detail');
  }

  // ----- Page Clients -----
  var cliTout = [], cliCmd = {}, news = [];
  function montrerCli(id) { $('cli-liste').hidden = (id !== 'liste'); $('cli-detail').hidden = (id !== 'detail'); window.scrollTo(0, 0); }

  async function chargerClients() {
    $('msg-cli').textContent = '';
    var p = await db.from('profils').select('*').order('cree_le', { ascending: false }).limit(1000);
    if (p.error) { $('msg-cli').textContent = 'Impossible de charger les clients : ' + p.error.message; return; }
    cliTout = p.data || [];
    var r = await db.from('commandes').select('id,user_id,total,statut,cree_le').order('cree_le', { ascending: false }).limit(1000);
    cliCmd = {};
    ((r && r.data) || []).forEach(function (c) { if (c.user_id) { (cliCmd[c.user_id] = cliCmd[c.user_id] || []).push(c); } });
    var a = await db.from('abonnes').select('*').order('cree_le', { ascending: false }).limit(1000);
    news = (a && a.data) || [];
    dessinerCliKpis(); dessinerCli(); dessinerNews();
  }
  function depense(uid) { var t = 0; (cliCmd[uid] || []).forEach(function (c) { if (paye(c)) { t += c.total; } }); return t; }

  function dessinerCliKpis() {
    var z = $('cli-kpis'); z.textContent = '';
    var lim = Date.now() - 30 * JOUR, nouveaux = 0, marketing = 0;
    cliTout.forEach(function (c) { if (new Date(c.cree_le).getTime() >= lim) { nouveaux++; } if (c.consent_marketing) { marketing++; } });
    [[cliTout.length, 'Clients'], [nouveaux, 'Nouveaux'], [marketing, 'Marketing OK']].forEach(function (x) {
      var m = el('div', 'mini'); m.appendChild(el('b', '', String(x[0]))); m.appendChild(el('span', '', x[1])); z.appendChild(m);
    });
  }
  function dessinerCli() {
    var z = $('cli-zone'); z.textContent = '';
    var q = $('rech-cli').value.trim().toLowerCase();
    var vus = cliTout.filter(function (c) { return !q || (c.prenom + ' ' + c.nom + ' ' + (c.telephone || '')).toLowerCase().indexOf(q) >= 0; })
      .sort(function (a, b) { return depense(b.user_id) - depense(a.user_id); });
    if (!vus.length) { z.appendChild(el('p', 'vide', cliTout.length ? 'Aucun client trouvé.' : "Aucun client inscrit pour l'instant.")); return; }
    vus.forEach(function (c) {
      var n = (cliCmd[c.user_id] || []).length;
      var b = el('button', 'cmd-ligne');
      b.appendChild(el('div', 'qui', c.prenom + ' ' + c.nom));
      b.appendChild(el('div', 'montant', depense(c.user_id).toLocaleString('fr-FR') + ' FCFA'));
      b.appendChild(el('div', 'quand', n + ' commande' + (n > 1 ? 's' : '') + ' · inscrit le ' + new Date(c.cree_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })));
      b.addEventListener('click', function () { ouvrirClient(c); });
      z.appendChild(b);
    });
  }
  $('rech-cli').addEventListener('input', dessinerCli);

  function ouvrirClient(c) {
    var z = $('cli-detail'); z.textContent = '';
    var re = el('button', 'retour', '← Retour aux clients'); re.addEventListener('click', function () { montrerCli('liste'); }); z.appendChild(re);
    var t = el('div', 'detail-tete'); t.appendChild(el('h2', '', c.prenom + ' ' + c.nom)); z.appendChild(t);
    z.appendChild(el('p', 'aide', 'Inscrit le ' + new Date(c.cree_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })));
    var info = el('div', 'bloc-det'); info.appendChild(el('h3', '', 'Coordonnées'));
    info.appendChild(el('p', '', c.telephone || 'Téléphone non renseigné'));
    info.appendChild(el('p', '', c.adresse || 'Adresse non renseignée'));
    var tel = chiffresTel(c.telephone);
    if (tel) {
      var ct = el('div', 'contacts');
      var a1 = el('a', '', 'Appeler'); a1.href = 'tel:+' + tel; ct.appendChild(a1);
      var a2 = el('a', '', 'WhatsApp'); a2.href = 'https://wa.me/' + tel; a2.target = '_blank'; a2.rel = 'noopener'; ct.appendChild(a2);
      info.appendChild(ct);
    }
    var tg = el('div', 'tags');
    tg.appendChild(el('span', 'badge', c.consent_marketing ? 'Accepte le marketing' : 'Refuse le marketing'));
    (c.interets || []).forEach(function (i) { tg.appendChild(el('span', 'badge', i)); });
    info.appendChild(tg); z.appendChild(info);

    var liste = cliCmd[c.user_id] || [];
    var bl = el('div', 'bloc-det'); bl.appendChild(el('h3', '', 'Commandes (' + liste.length + ') · ' + depense(c.user_id).toLocaleString('fr-FR') + ' FCFA dépensés'));
    if (!liste.length) { bl.appendChild(el('p', 'aide', "Aucune commande pour l'instant.")); }
    liste.forEach(function (o) {
      var l = el('div', 'mini-cmd'); var g = el('div', '', '#' + o.id + ' · ' + o.total.toLocaleString('fr-FR') + ' FCFA');
      g.appendChild(el('small', '', new Date(o.cree_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })));
      l.appendChild(g); l.appendChild(el('span', 'pill ' + o.statut, STATUTS[o.statut] || o.statut)); bl.appendChild(l);
    });
    z.appendChild(bl);
    montrerCli('detail');
  }

  function dessinerNews() {
    $('news-total').textContent = news.length + ' abonné' + (news.length > 1 ? 's' : '') + ' à la newsletter';
    var z = $('news-zone'); z.textContent = '';
    if (!news.length) { z.appendChild(el('p', 'vide', "Aucun abonné pour l'instant.")); return; }
    news.forEach(function (a) {
      var l = el('div', 'news-ligne'); l.appendChild(el('div', '', a.email));
      l.appendChild(el('span', '', new Date(a.cree_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }))); z.appendChild(l);
    });
  }
  $('news-copier').addEventListener('click', function () {
    var txt = news.map(function (a) { return a.email; }).join(', ');
    function ok(m) { $('msg-news').className = 'msg ok'; $('msg-news').textContent = m; }
    function ko() { $('msg-news').className = 'msg'; $('msg-news').textContent = 'Copie impossible depuis ce navigateur.'; }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(function () { ok('E-mails copiés.'); }, ko); } else { ko(); }
  });
  $('cli-onglets').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) { return; }
    Array.prototype.forEach.call($('cli-onglets').children, function (x) { x.classList.toggle('actif', x === b); });
    $('cli-clients').hidden = (b.getAttribute('data-o') !== 'clients'); $('cli-news').hidden = (b.getAttribute('data-o') !== 'news');
  });

  // ----- Page Statistiques -----
  var periodeSt = 30;
  var NOMS_CAT = CATS;
  function barres(zone, items, vide) {
    zone.textContent = '';
    if (!items.length) { zone.appendChild(el('p', 'vide', vide || 'Pas encore de données.')); return; }
    var m = Math.max.apply(null, items.map(function (x) { return x.val; })) || 1;
    items.forEach(function (x) {
      var l = el('div', 'ligne-top'); l.appendChild(el('div', 'nom', x.nom));
      var ch = el('div', 'chiffres'); ch.innerHTML = x.html; l.appendChild(ch);
      var b = el('div', 'barre'), i = el('i'); b.appendChild(i); l.appendChild(b); zone.appendChild(l);
      setTimeout(function () { i.style.width = (x.val > 0 ? Math.max(4, Math.round(x.val / m * 100)) : 0) + '%'; }, 60);
    });
  }
  function fc(n) { return n.toLocaleString('fr-FR') + ' FCFA'; }

  async function chargerStats() {
    $('msg-stats').textContent = '';
    var debut = new Date(Date.now() - 90 * JOUR).toISOString();
    var r = await db.from('commandes').select('id,total,statut,user_id,articles,cree_le').gte('cree_le', debut).order('cree_le', { ascending: false }).limit(1000);
    if (r.error) { $('msg-stats').textContent = 'Impossible de charger les statistiques : ' + r.error.message; return; }
    var p = await db.from('produits').select('id,nom,categorie,stock,seuil_stock');
    var prods = {}; ((p && p.data) || []).forEach(function (x) { prods[x.id] = x; });
    var lim = Date.now() - periodeSt * JOUR;
    var liste = (r.data || []).filter(function (c) { return new Date(c.cree_le).getTime() >= lim; });

    var payees = liste.filter(paye), annulees = liste.filter(function (c) { return c.statut === 'annulee'; });
    var ca = 0; payees.forEach(function (c) { ca += c.total; });
    var hors = liste.length;                              // toutes les commandes passées
    var parClient = {}; payees.forEach(function (c) { if (c.user_id) { parClient[c.user_id] = (parClient[c.user_id] || 0) + 1; } });
    var nbClients = Object.keys(parClient).length, fideles = Object.keys(parClient).filter(function (k) { return parClient[k] >= 2; }).length;

    var z = $('st-kpis'); z.textContent = '';
    function k(nom, ico, val, unite) { var d = carte(nom, ico, val, unite, null, null); z.appendChild(d); }
    k('Panier moyen', 'panier', (payees.length ? Math.round(ca / payees.length) : 0).toLocaleString('fr-FR'), 'FCFA');
    k('Revenu par jour', 'argent', Math.round(ca / periodeSt).toLocaleString('fr-FR'), 'FCFA');
    k("Taux d'annulation", 'commandes', (hors ? Math.round(annulees.length / hors * 100) : 0) + ' %', '');
    k('Clients fidèles', 'clients', (nbClients ? Math.round(fideles / nbClients * 100) : 0) + ' %', '');

    var cat = {}, tp = {}, jours = [0, 0, 0, 0, 0, 0, 0];
    payees.forEach(function (c) {
      var jr = (new Date(c.cree_le).getDay() + 6) % 7; jours[jr] += c.total;
      (Array.isArray(c.articles) ? c.articles : []).forEach(function (l) {
        var q = parseInt(l.qte, 10) || 0, pr = parseInt(l.prix, 10) || 0, pd = prods[l.id];
        var kc = pd ? pd.categorie : 'autre'; cat[kc] = (cat[kc] || 0) + q * pr;
        var kn = l.id || l.nom; tp[kn] = tp[kn] || { nom: l.nom || 'Article', q: 0, ca: 0 }; tp[kn].q += q; tp[kn].ca += q * pr;
      });
    });
    barres($('st-cat'), Object.keys(cat).map(function (x) { return { nom: NOMS_CAT[x] || 'Autres', val: cat[x], html: '<b>' + fc(cat[x]) + '</b>' }; }).sort(function (a, b) { return b.val - a.val; }), 'Aucune vente sur la période.');
    var NJ = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    barres($('st-jours'), payees.length ? jours.map(function (v, i) { return { nom: NJ[i], val: v, html: '<b>' + fc(v) + '</b>' }; }) : [], 'Aucune vente sur la période.');
    barres($('st-top'), Object.keys(tp).map(function (x) { return tp[x]; }).sort(function (a, b) { return b.q - a.q; }).slice(0, 8).map(function (x) { return { nom: x.nom, val: x.q, html: '<b>' + x.q + '</b> vendu' + (x.q > 1 ? 's' : '') + ' · ' + fc(x.ca) }; }), 'Aucune vente sur la période.');

    var bas = Object.keys(prods).map(function (x) { return prods[x]; }).filter(function (x) { return x.stock !== null && x.stock !== undefined && x.stock <= (x.seuil_stock === null || x.seuil_stock === undefined ? 3 : x.seuil_stock); }).sort(function (a, b) { return a.stock - b.stock; });
    var zs = $('st-stock'); zs.textContent = '';
    if (!bas.length) { zs.appendChild(el('p', 'vide', 'Aucun article en stock faible.')); }
    bas.slice(0, 10).forEach(function (x) {
      var l = el('div', 'mini-cmd'); l.appendChild(el('div', '', x.nom));
      l.appendChild(el('span', 'pill ' + (x.stock === 0 ? 'annulee' : 'en_attente'), x.stock === 0 ? 'Épuisé' : 'Reste ' + x.stock)); zs.appendChild(l);
    });
  }
  $('periodes-st').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) { return; }
    periodeSt = parseInt(b.getAttribute('data-j'), 10);
    Array.prototype.forEach.call($('periodes-st').children, function (x) { x.classList.toggle('actif', x === b); });
    chargerStats();
  });

  // ----- Commandes en attente (cloche) -----
  async function compterEnAttente() {
    var r = await db.from('commandes').select('id', { count: 'exact', head: true }).eq('statut', 'en_attente');
    var n = r.count || 0;
    $('pastille').textContent = n > 99 ? '99+' : n; $('pastille').hidden = !n;
    $('nav-nb').textContent = n; $('nav-nb').hidden = !n;
  }

  demarrer();
})();
