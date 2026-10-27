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
    { id: 'commandes', nom: 'Commandes', ico: 'commandes', bientot: "Ici tu verras toutes les commandes, confirmeras les paiements Wave et Orange Money, et suivras l'expédition et la livraison." },
    { id: 'produits', nom: 'Produits', ico: 'produits' },
    { id: 'clients', nom: 'Clients', ico: 'clients', bientot: 'La liste de tes clients, leurs commandes et les abonnés à la newsletter.' },
    { id: 'stats', nom: 'Statistiques', ico: 'stats', bientot: 'Les ventes par jour, par catégorie et par produit, pour décider quoi réapprovisionner.' },
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
    ['v-tableau', 'v-produits', 'v-bientot'].forEach(function (x) { $(x).hidden = true; });
    VUES.forEach(function (x) { $('nav-' + x.id).classList.toggle('actif', x.id === v.id); });
    $('titre-vue').textContent = v.nom;
    try { history.replaceState(null, '', '#' + v.id); } catch (e) {}
    if (v.id === 'tableau') { $('v-tableau').hidden = false; chargerTableau(); }
    else if (v.id === 'produits') { $('v-produits').hidden = false; montrerProd('liste'); chargerArticles(); }
    else { $('bientot-titre').textContent = v.nom; $('bientot-texte').textContent = v.bientot; $('v-bientot').hidden = false; }
    window.scrollTo(0, 0);
  }

  function fermerMenu() { $('lateral').classList.remove('ouvert'); $('voile').classList.remove('ouvert'); }
  $('burger').addEventListener('click', function () { $('lateral').classList.add('ouvert'); $('voile').classList.add('ouvert'); });
  $('voile').addEventListener('click', fermerMenu);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { fermerMenu(); } });
  $('cloche').addEventListener('click', function () { aller('commandes'); });
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
  function stats(liste) {
    var ca = 0, ventes = 0, nb = 0, clients = {};
    liste.forEach(function (c) {
      if (c.statut === 'annulee') { return; }
      nb++;
      if (c.user_id) { clients[c.user_id] = 1; }
      if (c.statut === 'payee' || c.statut === 'expediee' || c.statut === 'livree') { ca += c.total; ventes += articlesVendus(c); }
    });
    return { ca: ca, ventes: ventes, nb: nb, clients: Object.keys(clients).length };
  }
  async function chargerTableau() {
    var z = $('kpis'); $('msg-tableau').textContent = '';
    if (!z.children.length) {
      ['Chiffre d\'affaires', 'Ventes', 'Commandes', 'Clients actifs'].forEach(function (n, i) {
        z.appendChild(carte(n, ['argent', 'panier', 'commandes', 'clients'][i], '…', '', null, null));
      });
      z.classList.add('squelette');
    }
    var maintenant = Date.now();
    var debut = new Date(maintenant - 60 * JOUR).toISOString();
    var r = await db.from('commandes').select('id,total,statut,user_id,articles,cree_le').gte('cree_le', debut).order('cree_le', { ascending: false }).limit(1000);
    if (r.error) { $('msg-tableau').textContent = 'Impossible de charger les chiffres : ' + r.error.message; return; }
    var limite = maintenant - 30 * JOUR;
    var recent = [], avant = [];
    (r.data || []).forEach(function (c) { (new Date(c.cree_le).getTime() >= limite ? recent : avant).push(c); });
    var A = stats(recent), B = stats(avant);
    z.classList.remove('squelette'); z.textContent = '';
    z.appendChild(carte("Chiffre d'affaires", 'argent', A.ca.toLocaleString('fr-FR'), 'FCFA', A.ca, B.ca));
    z.appendChild(carte('Ventes', 'panier', A.ventes.toLocaleString('fr-FR'), 'ARTICLES', A.ventes, B.ventes));
    z.appendChild(carte('Commandes', 'commandes', A.nb.toLocaleString('fr-FR'), '', A.nb, B.nb));
    z.appendChild(carte('Clients actifs', 'clients', A.clients.toLocaleString('fr-FR'), '', A.clients, B.clients));
  }

  // ----- Commandes en attente (cloche) -----
  async function compterEnAttente() {
    var r = await db.from('commandes').select('id', { count: 'exact', head: true }).eq('statut', 'en_attente');
    var n = r.count || 0;
    $('pastille').textContent = n > 99 ? '99+' : n; $('pastille').hidden = !n;
    $('nav-nb').textContent = n; $('nav-nb').hidden = !n;
  }

  demarrer();
})();
