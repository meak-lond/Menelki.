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
    compterRetours();
    compterStockBas();
    demarrerAlertes();
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
  $('deco').addEventListener('click', async function () { arreterAlertes(); if (db) { await db.auth.signOut(); } fermerMenu(); montrer('connexion'); });

  // ----- Liste des articles -----
  var filtreProd = 'tous', enAttenteProd = {};
  function seuilDe(a) { return (a.seuil_stock === null || a.seuil_stock === undefined) ? 3 : a.seuil_stock; }
  function etatStock(a) {
    if (a.stock === null || a.stock === undefined) { return 'illimite'; }
    if (a.stock === 0) { return 'epuise'; }
    return a.stock <= seuilDe(a) ? 'bas' : 'ok';
  }
  async function chargerArticles() {
    $('msg-liste').className = 'msg'; $('msg-liste').textContent = '';
    var r = await db.from('produits')
      .select('id,nom,prix,categorie,image_url,stock,seuil_stock,disponible,en_promo,meilleure_vente,cree_le')
      .order('cree_le', { ascending: false });
    if (r.error) { $('msg-liste').textContent = 'Impossible de charger les articles : ' + r.error.message; return; }
    articles = r.data || [];
    dessinerListe(); majBadgeProd();
  }
  function majBadgeProd() {
    var n = articles.filter(function (a) { var e = etatStock(a); return e === 'bas' || e === 'epuise'; }).length;
    var b = $('nav-nb-prod'); if (b) { b.textContent = n; b.hidden = !n; }
  }
  async function compterStockBas() {
    if (!db) { return; }
    var r = await db.from('produits').select('stock,seuil_stock');
    if (!r || r.error) { return; }
    var n = (r.data || []).filter(function (a) { var e = etatStock(a); return e === 'bas' || e === 'epuise'; }).length;
    var b = $('nav-nb-prod'); if (b) { b.textContent = n; b.hidden = !n; }
  }
  function kpiProd(nom, val, ico) {
    var k = el('div', 'kpi');
    var t = el('div', 'kpi-tete'); t.appendChild(el('span', 'kpi-nom', nom));
    var i = el('span', 'kpi-ico'); i.innerHTML = svg(ico); t.appendChild(i); k.appendChild(t);
    k.appendChild(el('div', 'kpi-val', val)); return k;
  }
  function dessinerResume() {
    var z = $('prod-kpis'); z.textContent = '';
    var vis = 0, bas = 0, ep = 0, val = 0;
    articles.forEach(function (a) {
      if (a.disponible) { vis++; }
      var e = etatStock(a); if (e === 'bas') { bas++; } if (e === 'epuise') { ep++; }
      if (a.stock !== null && a.stock !== undefined) { val += a.stock * a.prix; }
    });
    z.appendChild(kpiProd('Articles', String(articles.length), 'produits'));
    z.appendChild(kpiProd('Visibles', String(vis), 'tableau'));
    z.appendChild(kpiProd('Stock à suivre', String(bas + ep), 'stats'));
    z.appendChild(kpiProd('Valeur du stock', val.toLocaleString('fr-FR') + ' FCFA', 'commandes'));
    var al = $('prod-alerte'); al.textContent = '';
    if (bas + ep) {
      al.hidden = false;
      var t = el('span', '', (ep ? ep + ' épuisé' + (ep > 1 ? 's' : '') : '') + (ep && bas ? ' · ' : '') + (bas ? bas + ' en stock bas' : ''));
      var bt = el('button', 'lien', 'Voir');
      bt.addEventListener('click', function () { filtreProd = 'alerte'; dessinerListe(); });
      al.appendChild(el('b', '', 'Stock à surveiller')); al.appendChild(t); al.appendChild(bt);
    } else { al.hidden = true; }
  }
  function dessinerFiltresProd() {
    var z = $('prod-filtres'); z.textContent = '';
    var n = { tous: articles.length, visibles: 0, masques: 0, alerte: 0, epuise: 0 };
    articles.forEach(function (a) {
      if (a.disponible) { n.visibles++; } else { n.masques++; }
      var e = etatStock(a); if (e === 'bas' || e === 'epuise') { n.alerte++; } if (e === 'epuise') { n.epuise++; }
    });
    [['tous', 'Tous'], ['visibles', 'Visibles'], ['masques', 'Masqués'], ['alerte', 'Stock bas'], ['epuise', 'Épuisés']].forEach(function (f) {
      var b = el('button', f[0] === filtreProd ? 'actif' : '', f[1]); b.appendChild(el('b', '', String(n[f[0]])));
      b.addEventListener('click', function () { filtreProd = f[0]; dessinerListe(); });
      z.appendChild(b);
    });
  }
  function articlesVus() {
    var q = $('recherche').value.trim().toLowerCase(), cat = $('prod-cat').value, tri = $('prod-tri').value;
    var vus = articles.filter(function (a) {
      if (q && a.nom.toLowerCase().indexOf(q) < 0) { return false; }
      if (cat && a.categorie !== cat) { return false; }
      var e = etatStock(a);
      if (filtreProd === 'visibles') { return !!a.disponible; }
      if (filtreProd === 'masques') { return !a.disponible; }
      if (filtreProd === 'alerte') { return e === 'bas' || e === 'epuise'; }
      if (filtreProd === 'epuise') { return e === 'epuise'; }
      return true;
    });
    vus = vus.slice();
    if (tri === 'nom') { vus.sort(function (x, y) { return x.nom.localeCompare(y.nom, 'fr'); }); }
    else if (tri === 'prix_asc') { vus.sort(function (x, y) { return x.prix - y.prix; }); }
    else if (tri === 'prix_desc') { vus.sort(function (x, y) { return y.prix - x.prix; }); }
    else if (tri === 'stock') { vus.sort(function (x, y) { return (x.stock === null || x.stock === undefined ? 1e9 : x.stock) - (y.stock === null || y.stock === undefined ? 1e9 : y.stock); }); }
    return vus;
  }

  function dessinerListe() {
    dessinerResume(); dessinerFiltresProd();
    var z = $('articles'); z.textContent = '';
    var vus = articlesVus();
    $('prod-compte').textContent = vus.length + ' article' + (vus.length > 1 ? 's' : '') + ' affiché' + (vus.length > 1 ? 's' : '');
    if (!vus.length) { z.appendChild(el('p', 'vide', articles.length ? 'Aucun article ne correspond.' : "Aucun article pour l'instant. Touche « + Nouvel article » pour commencer.")); return; }
    vus.forEach(function (a) {
      var ligne = el('div', 'art-carte' + (a.disponible ? '' : ' masque'));
      var b = el('button', 'art');
      var m = el('div', 'mini');
      var im = el('img');
      if (a.image_url) { im.src = a.image_url; im.alt = ''; im.loading = 'lazy'; }
      else { im.src = 'menelki-symbole-blanc.svg'; im.alt = ''; im.className = 'logo-vide'; }
      m.appendChild(im);
      var inf = el('div', 'inf');
      inf.appendChild(el('div', 'nom', a.nom));
      inf.appendChild(el('div', 'prix', fcfa(a.prix) + ' · ' + (CATS[a.categorie] || a.categorie)));
      var bd = el('div', 'badges'), e = etatStock(a);
      if (!a.disponible) { bd.appendChild(el('span', 'badge alerte', 'Masqué')); }
      if (e === 'epuise') { bd.appendChild(el('span', 'badge alerte', 'Épuisé')); }
      else if (e === 'bas') { bd.appendChild(el('span', 'badge orange', 'Stock bas')); }
      if (a.en_promo) { bd.appendChild(el('span', 'badge', 'Promo')); }
      if (a.meilleure_vente) { bd.appendChild(el('span', 'badge', 'Meilleure vente')); }
      inf.appendChild(bd);
      b.appendChild(m); b.appendChild(inf);
      b.addEventListener('click', function () { ouvrirFormulaire(a.id); });
      ligne.appendChild(b);

      var ac = el('div', 'art-actions');
      var st = el('div', 'stepper' + (e === 'bas' ? ' bas' : e === 'epuise' ? ' epuise' : ''));
      var moins = el('button', '', '−'); moins.setAttribute('aria-label', 'Retirer 1 au stock');
      var val = el('button', 'val', a.stock === null || a.stock === undefined ? 'Illimité' : String(a.stock)); val.setAttribute('aria-label', 'Modifier le stock');
      var plus = el('button', '', '+'); plus.setAttribute('aria-label', 'Ajouter 1 au stock');
      moins.disabled = (a.stock === null || a.stock === undefined || a.stock <= 0) || !!enAttenteProd[a.id];
      plus.disabled = !!enAttenteProd[a.id];
      moins.addEventListener('click', function () { changerStock(a.id, (a.stock || 0) - 1); });
      plus.addEventListener('click', function () { changerStock(a.id, (a.stock === null || a.stock === undefined ? 0 : a.stock) + 1); });
      val.addEventListener('click', function () {
        var rep = window.prompt('Quantité en stock pour « ' + a.nom + ' »\n(laisse vide pour un stock illimité)', a.stock === null || a.stock === undefined ? '' : String(a.stock));
        if (rep === null) { return; }
        rep = rep.trim();
        if (rep === '') { changerStock(a.id, null); return; }
        var n = parseInt(rep, 10);
        if (isNaN(n) || n < 0 || String(n) !== rep) { $('msg-liste').className = 'msg'; $('msg-liste').textContent = 'Entre un nombre entier positif (ou vide pour illimité).'; return; }
        changerStock(a.id, n);
      });
      st.appendChild(moins); st.appendChild(val); st.appendChild(plus); ac.appendChild(st);
      var vis = el('button', 'btn petit clair', a.disponible ? 'Masquer' : 'Afficher');
      vis.disabled = !!enAttenteProd[a.id];
      vis.addEventListener('click', function () { basculerVisible(a.id); });
      var du = el('button', 'btn petit clair', 'Dupliquer');
      du.disabled = !!enAttenteProd[a.id];
      du.addEventListener('click', function () { dupliquer(a.id); });
      ac.appendChild(vis); ac.appendChild(du);
      ligne.appendChild(ac);
      z.appendChild(ligne);
    });
  }
  function trouver(id) { return articles.filter(function (x) { return x.id === id; })[0]; }
  async function changerStock(id, n) {
    var a = trouver(id); if (!a || enAttenteProd[id]) { return; }
    var avant = a.stock;
    enAttenteProd[id] = true; a.stock = n; dessinerListe(); majBadgeProd();
    var r = await db.from('produits').update({ stock: n }).eq('id', id).select('id');
    delete enAttenteProd[id];
    if (r.error || !r.data || !r.data.length) {
      a.stock = avant; dessinerListe(); majBadgeProd();
      $('msg-liste').className = 'msg'; $('msg-liste').textContent = "Le stock n'a pas pu être modifié" + (r.error ? ' : ' + r.error.message : '. Vérifie ta connexion.');
      return;
    }
    $('msg-liste').className = 'msg ok'; $('msg-liste').textContent = '« ' + a.nom + ' » : stock ' + (n === null ? 'illimité' : n) + '.';
    dessinerListe();
  }
  async function basculerVisible(id) {
    var a = trouver(id); if (!a || enAttenteProd[id]) { return; }
    var avant = a.disponible, nouveau = !avant;
    enAttenteProd[id] = true; a.disponible = nouveau; dessinerListe();
    var r = await db.from('produits').update({ disponible: nouveau }).eq('id', id).select('id');
    delete enAttenteProd[id];
    if (r.error || !r.data || !r.data.length) {
      a.disponible = avant; dessinerListe();
      $('msg-liste').className = 'msg'; $('msg-liste').textContent = "La visibilité n'a pas pu être modifiée" + (r.error ? ' : ' + r.error.message : '.');
      return;
    }
    $('msg-liste').className = 'msg ok'; $('msg-liste').textContent = '« ' + a.nom + ' » est maintenant ' + (nouveau ? 'visible' : 'masqué') + ' sur la boutique.';
    dessinerListe();
  }
  async function dupliquer(id) {
    if (enAttenteProd[id]) { return; }
    enAttenteProd[id] = true; dessinerListe();
    var r = await db.from('produits').select('*').eq('id', id).single();
    if (r.error || !r.data) { delete enAttenteProd[id]; dessinerListe(); $('msg-liste').className = 'msg'; $('msg-liste').textContent = "Impossible de dupliquer cet article."; return; }
    var copie = Object.assign({}, r.data);
    delete copie.id; delete copie.cree_le;
    copie.nom = (copie.nom + ' (copie)').slice(0, 80);
    copie.disponible = false; copie.meilleure_vente = false;
    var w = await db.from('produits').insert(copie).select('id').single();
    delete enAttenteProd[id];
    if (w.error || !w.data) { dessinerListe(); $('msg-liste').className = 'msg'; $('msg-liste').textContent = 'Duplication impossible' + (w.error ? ' : ' + w.error.message : '.'); return; }
    await chargerArticles();
    $('msg-liste').className = 'msg ok'; $('msg-liste').textContent = 'Copie créée (masquée). Modifie-la puis coche « Visible sur la boutique ».';
    ouvrirFormulaire(w.data.id);
  }
  function exporterStock() {
    var vus = articlesVus();
    if (!vus.length) { $('msg-liste').className = 'msg'; $('msg-liste').textContent = 'Aucun article à exporter avec ce filtre.'; return; }
    var lignes = [['N°', 'Article', 'Catégorie', 'Prix (FCFA)', 'Stock', 'Seuil d\'alerte', 'État du stock', 'Visible', 'Valeur du stock (FCFA)']];
    var ET = { ok: 'OK', bas: 'Stock bas', epuise: 'Épuisé', illimite: 'Illimité' };
    vus.forEach(function (a) {
      lignes.push([a.id, a.nom, CATS[a.categorie] || a.categorie, a.prix, a.stock === null || a.stock === undefined ? '' : a.stock, seuilDe(a), ET[etatStock(a)], a.disponible ? 'Oui' : 'Non', a.stock === null || a.stock === undefined ? '' : a.stock * a.prix]);
    });
    var texte = '﻿' + lignes.map(function (l) { return l.map(celCsv).join(';'); }).join('\r\n');
    var blob = new Blob([texte], { type: 'text/csv;charset=utf-8' });
    var lien = document.createElement('a'), url = URL.createObjectURL(blob);
    lien.href = url; lien.download = 'stock-menelki-' + cleJour(new Date()) + '.csv';
    document.body.appendChild(lien); lien.click(); document.body.removeChild(lien);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    $('msg-liste').className = 'msg ok'; $('msg-liste').textContent = vus.length + ' article(s) exporté(s).';
  }
  $('recherche').addEventListener('input', dessinerListe);
  $('prod-cat').addEventListener('change', dessinerListe);
  $('prod-tri').addEventListener('change', dessinerListe);
  $('prod-export').addEventListener('click', exporterStock);
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
    $('f-seuil').value = (p.seuil_stock === undefined || p.seuil_stock === null) ? 3 : p.seuil_stock;
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
    $('f-suppr').hidden = (id === null); $('f-dupli').hidden = (id === null);
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
    var promo = $('f-promo').checked, ancien = entier('f-ancien'), seuil = entier('f-seuil');
    if (seuil === null) { seuil = 3; }
    if (isNaN(seuil) || seuil < 0) { erreur("L'alerte de stock bas doit être un nombre positif."); return; }
    if (!nom) { erreur('Entre le nom de l\'article.'); return; }
    if (prix === null || isNaN(prix) || prix < 0) { erreur('Entre un prix valide en FCFA.'); return; }
    if (stock !== null && (isNaN(stock) || stock < 0)) { erreur('Le stock doit être un nombre positif, ou vide.'); return; }
    if (promo && (ancien === null || isNaN(ancien) || ancien <= prix)) { erreur("En promotion, l'ancien prix doit être supérieur au prix actuel."); return; }
    var charge = {
      nom: nom, categorie: $('f-cat').value, prix: prix,
      image_url: photos[0] || null, images: photos.slice(),
      tailles: listeDe($('f-tailles').value), couleurs: listeDe($('f-couleurs').value),
      description: $('f-desc').value.trim() || null, matieres: $('f-mat').value.trim() || null,
      stock: stock, seuil_stock: seuil, disponible: $('f-dispo').checked, meilleure_vente: $('f-best').checked,
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

  $('f-dupli').addEventListener('click', async function () {
    if (enCours === null) { return; }
    var id = enCours; montrerProd('liste'); await chargerArticles(); dupliquer(id);
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
    retours: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    panier: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>'
  };
  function svg(nom) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICO[nom] + '</svg>'; }
  $('burger').innerHTML = svg('burger'); $('cloche').insertAdjacentHTML('afterbegin', svg('cloche')); $('deco').innerHTML = svg('sortie');
  $('date-jour').textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // ----- Navigation -----
  var VUES = [
    { id: 'tableau', nom: 'Tableau de bord', ico: 'tableau' },
    { id: 'commandes', nom: 'Commandes', ico: 'commandes' },
    { id: 'retours', nom: 'Retours', ico: 'retours' },
    { id: 'produits', nom: 'Produits', ico: 'produits' },
    { id: 'clients', nom: 'Clients', ico: 'clients' },
    { id: 'stats', nom: 'Statistiques', ico: 'stats' },
    { id: 'marketing', nom: 'Marketing', ico: 'marketing' },
    { id: 'reglages', nom: 'Réglages', ico: 'reglages' }
  ];
  var vueActive = 'tableau';
  VUES.forEach(function (v) {
    var b = el('button', 'nav-lien'); b.id = 'nav-' + v.id; b.innerHTML = svg(v.ico);
    b.appendChild(el('span', '', v.nom));
    if (v.id === 'commandes') { var nb = el('span', 'nb'); nb.id = 'nav-nb'; nb.hidden = true; b.appendChild(nb); }
    if (v.id === 'produits') { var np = el('span', 'nb nb-orange'); np.id = 'nav-nb-prod'; np.hidden = true; b.appendChild(np); }
    if (v.id === 'retours') { var nr = el('span', 'nb'); nr.id = 'nav-nb-ret'; nr.hidden = true; b.appendChild(nr); }
    b.addEventListener('click', function () { aller(v.id); fermerMenu(); });
    $('nav').appendChild(b);
  });

  function aller(id) {
    var v = VUES.filter(function (x) { return x.id === id; })[0] || VUES[0];
    vueActive = v.id;
    ['v-tableau', 'v-produits', 'v-commandes', 'v-retours', 'v-clients', 'v-stats', 'v-marketing', 'v-reglages', 'v-bientot'].forEach(function (x) { $(x).hidden = true; });
    VUES.forEach(function (x) { $('nav-' + x.id).classList.toggle('actif', x.id === v.id); });
    $('titre-vue').textContent = v.nom;
    try { history.replaceState(null, '', '#' + v.id); } catch (e) {}
    if (v.id === 'tableau') { $('v-tableau').hidden = false; chargerTableau(); }
    else if (v.id === 'commandes') { $('v-commandes').hidden = false; montrerCmd('liste'); promesseCmd = chargerCommandes(); }
    else if (v.id === 'retours') { $('v-retours').hidden = false; montrerRet('liste'); promesseRet = chargerRetours(); }
    else if (v.id === 'clients') { $('v-clients').hidden = false; montrerCli('liste'); chargerClients(); }
    else if (v.id === 'stats') { $('v-stats').hidden = false; chargerStats(); }
    else if (v.id === 'marketing') { $('v-marketing').hidden = false; montrerPromo('liste'); chargerPromos(); }
    else if (v.id === 'reglages') { $('v-reglages').hidden = false; dessinerReglages(); }
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
    var dateDebut = new Date();                       // début du mois, il y a 6 mois (pour le graphique mensuel)
    dateDebut.setDate(1); dateDebut.setHours(0, 0, 0, 0); dateDebut.setMonth(dateDebut.getMonth() - 6);
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
    var pp = await db.from('produits').select('id,image_url,categorie');
    prodMap = {}; ((pp && pp.data) || []).forEach(function (x) { prodMap[x.id] = x; });
    dessinerGraphe();
    dessinerGrapheMensuel();
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
    var g = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Courbe des ventes"><defs><linearGradient id="deg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe5ee" stop-opacity=".38"/><stop offset="1" stop-color="#8d93a0" stop-opacity="0"/></linearGradient><filter id="lueur" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
    for (var t = 0; t <= 4; t++) {
      var v = max * t / 4, y = Y(v);
      g += '<line class="grille" x1="' + pg + '" x2="' + (W - pd) + '" y1="' + y + '" y2="' + y + '"/><text class="axe" x="' + (pg - 8) + '" y="' + (y + 3) + '" text-anchor="end">' + court(v) + '</text>';
    }
    var pas = Math.max(1, Math.round((n - 1) / (W < 500 ? 3 : 4)));
    for (var i2 = 0; i2 < n; i2 += pas) {
      if (n - 1 - i2 < pas * 0.6 && i2 !== n - 1) { continue; }
      g += '<text class="axe" x="' + X(i2) + '" y="' + (H - 6) + '" text-anchor="' + (i2 === 0 ? 'start' : (i2 >= n - 1 ? 'end' : 'middle')) + '">' + jours[i2].d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + '</text>';
    }
    g += '<path d="' + aire + '" fill="url(#deg)"/><path d="' + ligne + '" fill="none" stroke="#eef2f8" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" filter="url(#lueur)"/>';
    pts.forEach(function (p, i) {
      var v0 = jours[i].v; if (!v0) { return; }
      if (n > 31) { var a0 = i ? jours[i - 1].v : 0, b0 = i < n - 1 ? jours[i + 1].v : 0; if (v0 < a0 || v0 < b0) { return; } }
      g += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="#07080a" stroke="#eef2f8" stroke-width="2" filter="url(#lueur)"/>';
    });
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
  window.addEventListener('resize', function () { clearTimeout(minuteur); minuteur = setTimeout(function () { if (vueActive === 'tableau' && !$('v-tableau').hidden) { dessinerGraphe(); dessinerGrapheMensuel(); } }, 150); });

  // ----- Chiffre d'affaires par mois -----
  function dessinerGrapheMensuel() {
    var z = $('graph-mensuel');
    if (!z) { return; }
    z.textContent = '';
    var base = new Date(); base.setDate(1); base.setHours(12, 0, 0, 0);
    var mois = [], index = {};
    for (var i = 5; i >= 0; i--) {
      var d = new Date(base); d.setMonth(d.getMonth() - i);
      index[d.getFullYear() + '-' + d.getMonth()] = mois.length; mois.push({ d: d, v: 0 });
    }
    var total = 0;
    cmd90.forEach(function (c) {
      if (!paye(c)) { return; }
      var t = new Date(c.cree_le), k = index[t.getFullYear() + '-' + t.getMonth()];
      if (k !== undefined) { mois[k].v += Number(c.total) || 0; total += Number(c.total) || 0; }
    });
    var W = z.clientWidth || 600, H = 230, pg = 40, pd = 10, ph = 22, pb = 28;
    var iw = W - pg - pd, ih = H - ph - pb;
    var max = joliMax(Math.max.apply(null, mois.map(function (m) { return m.v; })));
    var X = function (i) { return pg + (i + 0.5) * iw / mois.length; };
    var Y = function (v) { return ph + ih - (v / max) * ih; };
    var g = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Chiffre d’affaires mensuel"><defs><linearGradient id="degm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f7fb"/><stop offset="1" stop-color="#5d6471"/></linearGradient><filter id="lueurm" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
    for (var t = 0; t <= 4; t++) {
      var vv = max * t / 4, y = Y(vv);
      g += '<line class="grille" x1="' + pg + '" x2="' + (W - pd) + '" y1="' + y + '" y2="' + y + '"/><text class="axe" x="' + (pg - 8) + '" y="' + (y + 3) + '" text-anchor="end">' + court(vv) + '</text>';
    }
    var lar = Math.min(38, iw / mois.length * 0.55);
    mois.forEach(function (m, i) {
      var x = X(i), y2 = Y(m.v), h2 = ph + ih - y2;
      var nomMois = m.d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      g += '<rect x="' + (x - lar / 2) + '" y="' + y2 + '" width="' + lar + '" height="' + h2 + '" rx="6" fill="url(#degm)" filter="url(#lueurm)" opacity=".92"><title>' + nomMois + ' : ' + m.v.toLocaleString('fr-FR') + ' FCFA</title></rect>';
      if (m.v > 0) { g += '<text class="axe" x="' + x + '" y="' + (y2 - 6) + '" text-anchor="middle" style="fill:#f2f2f2">' + court(m.v) + '</text>'; }
      g += '<text class="axe" x="' + x + '" y="' + (H - 8) + '" text-anchor="middle">' + m.d.toLocaleDateString('fr-FR', { month: 'short' }) + '</text>';
    });
    z.innerHTML = g + '</svg>';
    if (!total) { z.appendChild(el('div', 'vide-graph', 'Aucune vente sur les 6 derniers mois.')); }
  }

  // ----- Meilleures ventes -----
  var prodMap = {};
  function dessinerTop(liste) {
    var z = $('top'); z.textContent = '';
    var tab = {};
    liste.forEach(function (c) {
      if (!paye(c) || !Array.isArray(c.articles)) { return; }
      c.articles.forEach(function (l) {
        var cle = l.id || l.nom, q = parseInt(l.qte, 10) || 0, p = parseInt(l.prix, 10) || 0;
        if (!tab[cle]) { tab[cle] = { id: l.id, nom: l.nom || 'Article', q: 0, ca: 0 }; }
        tab[cle].q += q; tab[cle].ca += q * p;
      });
    });
    var top = Object.keys(tab).map(function (k) { return tab[k]; }).sort(function (a, b) { return b.q - a.q; }).slice(0, 5);
    if (!top.length) { z.appendChild(el('p', 'vide', 'Aucune vente sur les 30 derniers jours.')); return; }
    var m = top[0].q;
    top.forEach(function (p) {
      var l = el('div', 'ligne-top riche'), pd = prodMap[p.id];
      var v = el('div', 'vignette');
      if (pd && pd.image_url) { var im = el('img'); im.src = pd.image_url; im.alt = ''; im.loading = 'lazy'; v.appendChild(im); } else { v.innerHTML = svg('produits'); }
      l.appendChild(v);
      var nm = el('div', 'nom', p.nom); if (pd) { nm.appendChild(el('small', '', CATS[pd.categorie] || pd.categorie)); } l.appendChild(nm);
      var ch = el('div', 'chiffres'); ch.innerHTML = '<b>' + p.q + '</b> vendu' + (p.q > 1 ? 's' : '') + ' · ' + p.ca.toLocaleString('fr-FR') + ' FCFA'; l.appendChild(ch);
      var b = el('div', 'barre'), i = el('i'); b.appendChild(i); l.appendChild(b);
      z.appendChild(l);
      setTimeout(function () { i.style.width = Math.max(4, Math.round(p.q / m * 100)) + '%'; }, 60);
    });
  }

  // ----- Dernières commandes -----
  var STATUTS = { en_attente: 'En attente', payee: 'Payée', expediee: 'Expédiée', livree: 'Livrée', annulee: 'Annulée' };
  function ilY(t) {
    var m = Math.round((Date.now() - new Date(t).getTime()) / 60000);
    if (m < 1) { return "à l'instant"; }
    if (m < 60) { return 'il y a ' + m + ' min'; }
    var h = Math.round(m / 60); if (h < 24) { return 'il y a ' + h + ' h'; }
    var j = Math.round(h / 24); if (j < 7) { return 'il y a ' + j + ' j'; }
    return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
  async function dessinerRecentes() {
    var z = $('recentes'); z.textContent = '';
    var r = await db.from('commandes').select('id,total,statut,user_id,cree_le').order('cree_le', { ascending: false }).limit(6);
    var liste = (r && r.data) || [];
    if (!liste.length) { z.appendChild(el('p', 'vide', "Aucune commande pour l'instant.")); return; }
    z.appendChild(Object.assign(el('div', 'tab-tete'), { innerHTML: '<span>Client</span><span>Statut</span><span>Date</span><span>Total</span>' }));
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
      l.appendChild(el('div', 'quand', ilY(c.cree_le)));
      var st = el('span', 'pill ' + c.statut, STATUTS[c.statut] || c.statut); st.className += ' pastille-st'; l.appendChild(st);
      z.appendChild(l);
    });
  }
  $('voir-commandes').addEventListener('click', function () { filtreCmd = 'tous'; aller('commandes'); });

  // ----- Page Commandes -----
  var cmdTout = [], cmdVues = [], profMap = {}, filtreCmd = 'tous', promesseCmd = null;
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
    cmdVues = vues;
    var somme = 0; vues.forEach(function (c) { if (c.statut !== 'annulee') { somme += c.total; } });
    $('cmd-compte').textContent = vues.length + ' commande' + (vues.length > 1 ? 's' : '') + ' affichée' + (vues.length > 1 ? 's' : '') + ' · ' + somme.toLocaleString('fr-FR') + ' FCFA (hors annulées)';
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
    var bi = el('button', 'btn clair', 'Imprimer le bon de livraison'); bi.style.marginTop = '0';
    bi.addEventListener('click', function () { imprimerBons([c]); });
    ac.appendChild(bi);
    z.appendChild(ac); z.appendChild(msg);

    var bn = el('div', 'bloc-det note-zone'); bn.appendChild(el('h3', '', 'Note interne'));
    var bh = el('div', 'bloc-det'); bh.appendChild(el('h3', '', 'Historique'));
    z.appendChild(bn); z.appendChild(bh);
    chargerExtras(c, bn, bh);
    montrerCmd('detail');
  }

  // ----- Note interne et historique d'une commande -----
  var LIB_HIST = { en_attente: 'Remise en attente', payee: 'Paiement confirmé', expediee: 'Commande expédiée', livree: 'Commande livrée', annulee: 'Commande annulée (stock remis)' };
  function dateCourte(t) { return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  async function chargerExtras(c, zn, zh) {
    var n = await db.from('commandes_notes').select('note,maj_le').eq('commande_id', c.id).maybeSingle();
    var h = await db.from('commandes_historique').select('statut,cree_le').eq('commande_id', c.id).order('cree_le', { ascending: true });
    if (n.error || h.error) {
      var hint = "Option non activée : lance le script « menelki-admin-2 » dans Supabase > SQL Editor.";
      zn.appendChild(el('p', 'indice-sql', hint)); zh.appendChild(el('p', 'indice-sql', hint));
      zh.appendChild(chrono(c, []));
      return;
    }
    var ta = el('textarea'); ta.rows = 3; ta.maxLength = 1000; ta.placeholder = 'Ex. Client à rappeler, livraison avant vendredi…';
    ta.value = (n.data && n.data.note) || '';
    var ok = el('button', 'btn petit', 'Enregistrer la note'), info = el('p', 'note-info', n.data && n.data.maj_le ? 'Dernière modification : ' + dateCourte(n.data.maj_le) : 'Visible uniquement par toi, jamais par le client.');
    ok.addEventListener('click', async function () {
      ok.disabled = true;
      var r = await db.from('commandes_notes').upsert({ commande_id: c.id, note: ta.value.trim(), maj_le: new Date().toISOString() });
      ok.disabled = false;
      info.className = 'note-info'; info.textContent = r.error ? 'Enregistrement impossible : ' + r.error.message : 'Note enregistrée.';
    });
    zn.appendChild(ta); zn.appendChild(ok); zn.appendChild(info);
    zh.appendChild(chrono(c, h.data || []));
  }
  function chrono(c, lignes) {
    var ul = el('ul', 'chrono');
    function li(titre, t) { var x = el('li', '', titre); x.appendChild(el('small', '', dateCourte(t))); ul.appendChild(x); }
    li('Commande passée', c.cree_le);
    lignes.forEach(function (l) { li(LIB_HIST[l.statut] || l.statut, l.cree_le); });
    return ul;
  }

  // ----- Export CSV -----
  function celCsv(v) {
    v = String(v === null || v === undefined ? '' : v);
    if (/^[=@]/.test(v) || (/^[+\-]/.test(v) && !/^[+\-]?[\d\s().\-]+$/.test(v))) { v = "'" + v; }   // protège contre les formules Excel
    return '"' + v.replace(/"/g, '""') + '"';
  }
  function exporterCsv(liste) {
    if (!liste.length) { $('msg-cmd').className = 'msg'; $('msg-cmd').textContent = 'Aucune commande à exporter avec ce filtre.'; return; }
    var lignes = [['N°', 'Date', 'Client', 'Téléphone', 'Adresse', 'Articles', 'Sous-total (FCFA)', 'Remise (FCFA)', 'Code promo', 'Total (FCFA)', 'Statut']];
    liste.forEach(function (c) {
      var arts = (Array.isArray(c.articles) ? c.articles : []).map(function (l) {
        var opt = [l.taille, l.couleur].filter(Boolean).join(', ');
        return (l.nom || 'Article') + ' x' + (l.qte || 0) + (opt ? ' (' + opt + ')' : '');
      }).join(' | ');
      lignes.push([c.id, new Date(c.cree_le).toLocaleString('fr-FR'), nomClient(c), c.telephone, c.adresse, arts, c.sous_total, c.remise, c.code_promo || '', c.total, STATUTS[c.statut] || c.statut]);
    });
    var texte = '﻿' + lignes.map(function (l) { return l.map(celCsv).join(';'); }).join('\r\n');
    var blob = new Blob([texte], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = 'commandes-menelki-' + cleJour(new Date()) + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    $('msg-cmd').className = 'msg ok'; $('msg-cmd').textContent = liste.length + ' commande(s) exportée(s).';
  }
  $('cmd-export').addEventListener('click', function () { exporterCsv(cmdVues); });

  // ----- Bon de livraison -----
  function bonLivraison(c) {
    var b = el('div', 'bon');
    var t = el('div', 'bon-tete');
    var m = el('div', 'bon-marque'); var lg = el('img'); lg.src = 'menelki-symbole-noir.svg'; lg.alt = ''; m.appendChild(lg); m.appendChild(el('span', '', 'MENELKI')); t.appendChild(m);
    var ti = el('div', 'bon-titre', 'Bon de livraison'); ti.appendChild(el('b', '', 'N° ' + c.id)); ti.appendChild(document.createTextNode(new Date(c.cree_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }))); t.appendChild(ti);
    b.appendChild(t);
    var cols = el('div', 'bon-cols');
    var d1 = el('div'); d1.appendChild(el('h4', '', 'Destinataire')); d1.appendChild(el('div', '', nomClient(c))); d1.appendChild(el('div', '', c.telephone || '')); d1.appendChild(el('div', '', c.adresse || '')); cols.appendChild(d1);
    var d2 = el('div'); d2.appendChild(el('h4', '', 'Paiement'));
    var st = c.statut === 'en_attente' ? 'À ENCAISSER : ' + c.total.toLocaleString('fr-FR') + ' FCFA' : c.statut === 'annulee' ? 'COMMANDE ANNULÉE' : 'PAYÉ';
    d2.appendChild(el('span', 'bon-statut', st));
    if (c.code_promo) { d2.appendChild(el('div', '', 'Code promo : ' + c.code_promo)); }
    cols.appendChild(d2); b.appendChild(cols);
    var tb = el('table'), th = el('thead'), tr = el('tr');
    [['Qté', ''], ['Article', ''], ['Taille', ''], ['Couleur', ''], ['Prix', 'd']].forEach(function (x) { tr.appendChild(el('th', x[1], x[0])); });
    th.appendChild(tr); tb.appendChild(th);
    var tbody = el('tbody');
    (Array.isArray(c.articles) ? c.articles : []).forEach(function (l) {
      var r = el('tr');
      r.appendChild(el('td', '', String(l.qte || 0))); r.appendChild(el('td', '', l.nom || 'Article')); r.appendChild(el('td', '', l.taille || '—')); r.appendChild(el('td', '', l.couleur || '—'));
      r.appendChild(el('td', 'd', ((parseInt(l.prix, 10) || 0) * (parseInt(l.qte, 10) || 0)).toLocaleString('fr-FR') + ' FCFA'));
      tbody.appendChild(r);
    });
    tb.appendChild(tbody); b.appendChild(tb);
    var tot = el('div', 'bon-totaux');
    function l2(a, v, f) { var d = el('div', f ? 'f' : ''); d.appendChild(el('span', '', a)); d.appendChild(el('span', '', v)); tot.appendChild(d); }
    l2('Sous-total', c.sous_total.toLocaleString('fr-FR') + ' FCFA');
    if (c.remise > 0) { l2('Remise', '− ' + c.remise.toLocaleString('fr-FR') + ' FCFA'); }
    l2('Total', c.total.toLocaleString('fr-FR') + ' FCFA', true);
    b.appendChild(tot);
    var pied = el('div', 'bon-pied');
    pied.appendChild(el('span', '', 'Merci pour ta commande. Wear your story.'));
    pied.appendChild(el('span', '', 'Préparé ☐   Contrôlé ☐   Remis ☐'));
    b.appendChild(pied);
    return b;
  }
  function imprimerBons(liste) {
    if (!liste.length) { $('msg-cmd').className = 'msg'; $('msg-cmd').textContent = 'Aucune commande à imprimer avec ce filtre.'; return; }
    var z = $('impression'); z.textContent = '';
    liste.slice(0, 50).forEach(function (c) { z.appendChild(bonLivraison(c)); });
    window.print();
  }
  $('cmd-imprimer').addEventListener('click', function () {
    var aImprimer = cmdVues.filter(function (c) { return c.statut !== 'annulee'; });
    if (aImprimer.length > 50) { $('msg-cmd').className = 'msg'; $('msg-cmd').textContent = 'Seuls les 50 premiers bons sont imprimés. Filtre par statut pour réduire la liste.'; }
    imprimerBons(aImprimer);
  });

  // ----- Page Retours -----
  var retTout = [], retVues = [], filtreRet = 'tous', promesseRet = null;
  var STATUTS_RET = { nouveau: 'Nouveau', en_cours: 'En cours', accepte: 'Accepté', refuse: 'Refusé', termine: 'Terminé' };
  var SUITE_RET = {
    nouveau: [['en_cours', 'Prendre en charge', 'Marquer cette demande comme prise en charge ?', 'btn'], ['accepte', 'Accepter le retour', 'Accepter cette demande de retour ?', 'btn clair'], ['refuse', 'Refuser le retour', 'Refuser cette demande de retour ?', 'btn danger']],
    en_cours: [['accepte', 'Accepter le retour', 'Accepter cette demande de retour ?', 'btn'], ['refuse', 'Refuser le retour', 'Refuser cette demande de retour ?', 'btn danger']],
    accepte: [['termine', 'Marquer comme terminé', "Le retour est terminé (article reçu, remboursement ou échange fait) ?", 'btn']]
  };
  function montrerRet(id) { $('ret-liste').hidden = (id !== 'liste'); $('ret-detail').hidden = (id !== 'detail'); window.scrollTo(0, 0); }

  async function chargerRetours() {
    $('msg-ret').className = 'msg'; $('msg-ret').textContent = '';
    var r = await db.from('retours').select('*, commandes(id,total,statut,telephone,adresse,articles,cree_le)').order('cree_le', { ascending: false }).limit(300);
    if (r.error) { $('msg-ret').textContent = 'Impossible de charger les retours : ' + r.error.message; return; }
    retTout = r.data || [];
    var ids = retTout.map(function (x) { return x.user_id; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    profMap = profMap || {};
    if (ids.length) {
      var p = await db.from('profils').select('user_id,prenom,nom,telephone').in('user_id', ids);
      ((p && p.data) || []).forEach(function (x) { profMap[x.user_id] = x; });
    }
    dessinerFiltresRet(); dessinerRet(); compterRetours();
  }
  function nomRet(r) { var p = profMap[r.user_id]; return p ? p.prenom + ' ' + p.nom : 'Client'; }

  function dessinerFiltresRet() {
    var z = $('ret-filtres'); z.textContent = '';
    var n = { tous: retTout.length };
    retTout.forEach(function (c) { n[c.statut] = (n[c.statut] || 0) + 1; });
    [['tous', 'Toutes'], ['nouveau', 'Nouvelles'], ['en_cours', 'En cours'], ['accepte', 'Acceptées'], ['refuse', 'Refusées'], ['termine', 'Terminées']].forEach(function (f) {
      var b = el('button', f[0] === filtreRet ? 'actif' : '', f[1]); b.appendChild(el('b', '', String(n[f[0]] || 0)));
      b.addEventListener('click', function () { filtreRet = f[0]; dessinerFiltresRet(); dessinerRet(); });
      z.appendChild(b);
    });
  }
  function dessinerRet() {
    var z = $('ret-zone'); z.textContent = '';
    var q = $('rech-ret').value.trim().toLowerCase();
    var vues = retTout.filter(function (r) {
      if (filtreRet !== 'tous' && r.statut !== filtreRet) { return false; }
      return !q || ('#' + r.commande_id + ' ' + r.commande_id + ' ' + nomRet(r) + ' ' + r.motif + ' ' + (r.message || '')).toLowerCase().indexOf(q) >= 0;
    });
    retVues = vues;
    $('ret-compte').textContent = vues.length + ' demande' + (vues.length > 1 ? 's' : '') + ' affichée' + (vues.length > 1 ? 's' : '');
    if (!vues.length) { z.appendChild(el('p', 'vide', retTout.length ? 'Aucune demande ne correspond.' : "Aucune demande de retour pour l'instant. Elles apparaîtront ici quand un client en enverra une depuis son espace.")); return; }
    vues.forEach(function (r) {
      var b = el('button', 'cmd-ligne');
      var qui = el('div', 'qui', nomRet(r)); qui.appendChild(el('small', '', 'commande #' + r.commande_id)); b.appendChild(qui);
      b.appendChild(el('span', 'pill ' + r.statut, STATUTS_RET[r.statut] || r.statut));
      b.appendChild(el('div', 'quand', r.motif + ' · ' + ilY(r.cree_le)));
      b.addEventListener('click', function () { ouvrirRet(r.id); });
      z.appendChild(b);
    });
  }
  $('rech-ret').addEventListener('input', dessinerRet);

  function ouvrirRet(id, message) {
    var r = retTout.filter(function (x) { return x.id === id; })[0];
    if (!r) { return; }
    var cmd = r.commandes || null;
    var z = $('ret-detail'); z.textContent = '';
    var re = el('button', 'retour', '← Retour aux demandes'); re.addEventListener('click', function () { montrerRet('liste'); dessinerFiltresRet(); dessinerRet(); }); z.appendChild(re);
    var t = el('div', 'detail-tete'); t.appendChild(el('h2', '', 'Retour #' + r.id)); t.appendChild(el('span', 'pill ' + r.statut, STATUTS_RET[r.statut] || r.statut)); z.appendChild(t);
    z.appendChild(el('p', 'aide', 'Demande envoyée le ' + dateCourte(r.cree_le)));

    var bc = el('div', 'bloc-det'); bc.appendChild(el('h3', '', 'Client'));
    bc.appendChild(el('p', '', nomRet(r)));
    var tel = chiffresTel((cmd && cmd.telephone) || (profMap[r.user_id] && profMap[r.user_id].telephone));
    if (cmd && cmd.telephone) { bc.appendChild(el('p', '', cmd.telephone)); }
    if (cmd && cmd.adresse) { bc.appendChild(el('p', '', cmd.adresse)); }
    if (tel) {
      var ct = el('div', 'contacts');
      var a1 = el('a', '', 'Appeler'); a1.href = 'tel:+' + tel; ct.appendChild(a1);
      var a2 = el('a', '', 'WhatsApp'); a2.href = 'https://wa.me/' + tel + '?text=' + encodeURIComponent("Bonjour, c'est MENELKI au sujet de votre demande de retour pour la commande #" + r.commande_id + '.'); a2.target = '_blank'; a2.rel = 'noopener'; ct.appendChild(a2);
      bc.appendChild(ct);
    }
    z.appendChild(bc);

    var bd = el('div', 'bloc-det'); bd.appendChild(el('h3', '', 'Demande'));
    bd.appendChild(el('p', 'motif-ret', r.motif));
    if (r.message) { bd.appendChild(el('div', 'citation', r.message)); } else { bd.appendChild(el('p', 'aide', 'Aucun message du client.')); }
    z.appendChild(bd);

    var bo = el('div', 'bloc-det cmd-liee'); bo.appendChild(el('h3', '', 'Commande concernée'));
    if (cmd) {
      var tete = el('div', 'mini-cmd'); var g = el('div', '', '#' + cmd.id + ' · ' + Number(cmd.total).toLocaleString('fr-FR') + ' FCFA'); g.appendChild(el('small', '', dateCourte(cmd.cree_le))); tete.appendChild(g);
      tete.appendChild(el('span', 'pill ' + cmd.statut, STATUTS[cmd.statut] || cmd.statut)); bo.appendChild(tete);
      (Array.isArray(cmd.articles) ? cmd.articles : []).forEach(function (l) {
        var x = el('div', 'art-l'); x.appendChild(el('div', 'n', (l.nom || 'Article') + ' × ' + (l.qte || 0)));
        x.appendChild(el('div', 'm', ((parseInt(l.prix, 10) || 0) * (parseInt(l.qte, 10) || 0)).toLocaleString('fr-FR') + ' FCFA'));
        var opt = [l.taille ? 'Taille ' + l.taille : '', l.couleur || ''].filter(Boolean).join(' · '); if (opt) { x.appendChild(el('div', 'o', opt)); }
        bo.appendChild(x);
      });
      var vc = el('button', 'btn clair petit', 'Voir la commande'); vc.style.marginTop = '12px'; vc.addEventListener('click', function () { voirCommande(cmd.id); }); bo.appendChild(vc);
    } else { bo.appendChild(el('p', 'aide', 'Commande introuvable.')); }
    z.appendChild(bo);

    var msg = el('p', 'msg' + (message ? ' ok' : ''), message || '');
    var ac = el('div', 'actions-cmd'), btns = [];
    (SUITE_RET[r.statut] || []).forEach(function (a) {
      var b = el('button', a[3], a[1]); if (a[3].indexOf('danger') >= 0) { b.style.marginTop = '0'; } btns.push(b);
      b.addEventListener('click', function () {
        if (!window.confirm(a[2])) { return; }
        btns.forEach(function (x) { x.disabled = true; });
        db.from('retours').update({ statut: a[0] }).eq('id', r.id).select('id').then(function (res) {
          if (res.error || !(res.data && res.data.length)) {
            btns.forEach(function (x) { x.disabled = false; });
            msg.className = 'msg'; msg.textContent = 'Changement impossible' + (res.error ? ' : ' + res.error.message : '. Vérifie que ton compte est bien administrateur.'); return;
          }
          r.statut = a[0]; ouvrirRet(r.id, 'Statut mis à jour : ' + STATUTS_RET[a[0]] + '.'); compterRetours();
        });
      });
      ac.appendChild(b);
    });
    if (r.statut === 'refuse') { ac.appendChild(el('p', 'aide', 'Demande refusée. Pense à prévenir le client.')); }
    if (r.statut === 'termine') { ac.appendChild(el('p', 'aide', 'Retour terminé.')); }
    if (r.statut === 'accepte') { ac.appendChild(el('p', 'aide', "Le stock n'est pas modifié automatiquement : si l'article revient en bon état, ajuste sa quantité dans Produits.")); }
    z.appendChild(ac); z.appendChild(msg);
    montrerRet('detail');
  }

  async function compterRetours() {
    var r = await db.from('retours').select('id', { count: 'exact', head: true }).eq('statut', 'nouveau');
    var n = (r && r.count) || 0, b = $('nav-nb-ret');
    if (b) { b.textContent = n; b.hidden = !n; }
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

    var rets = await db.from('retours').select('id', { count: 'exact', head: true }).gte('cree_le', new Date(lim).toISOString());
    var nbRet = (rets && rets.count) || 0;
    var z = $('st-kpis'); z.textContent = '';
    function k(nom, ico, val, unite) { var d = carte(nom, ico, val, unite, null, null); z.appendChild(d); }
    k('Panier moyen', 'panier', (payees.length ? Math.round(ca / payees.length) : 0).toLocaleString('fr-FR'), 'FCFA');
    k('Revenu par jour', 'argent', Math.round(ca / periodeSt).toLocaleString('fr-FR'), 'FCFA');
    k("Taux d'annulation", 'commandes', (hors ? Math.round(annulees.length / hors * 100) : 0) + ' %', '');
    k('Demandes de retour', 'retours', String(nbRet), (payees.length ? Math.round(nbRet / payees.length * 100) + ' %' : ''));
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

  // ----- Page Marketing : codes promo -----
  var promos = [], promoEnCours = null;
  function montrerPromo(id) { $('promo-liste').hidden = (id !== 'liste'); $('promo-form').hidden = (id !== 'form'); window.scrollTo(0, 0); }
  function etatPromo(p) {
    if (!p.actif) { return ['Désactivé', 'annulee']; }
    if (p.expire_le && new Date(p.expire_le).getTime() < Date.now()) { return ['Expiré', 'annulee']; }
    if (p.max_utilisations !== null && p.utilisations >= p.max_utilisations) { return ['Épuisé', 'en_attente']; }
    return ['Actif', 'payee'];
  }
  async function chargerPromos() {
    $('msg-promo').className = 'msg'; $('msg-promo').textContent = '';
    var r = await db.from('codes_promo').select('*').order('code');
    if (r.error) { $('msg-promo').textContent = 'Impossible de charger les codes : ' + r.error.message; return; }
    promos = r.data || [];
    var z = $('promo-zone'); z.textContent = '';
    if (!promos.length) { z.appendChild(el('p', 'vide', 'Aucun code promo pour l\'instant. Touche « + Nouveau code » pour en créer un.')); return; }
    promos.forEach(function (p) {
      var b = el('button', 'promo-ligne'), e = etatPromo(p);
      b.appendChild(el('div', 'code', p.code)); b.appendChild(el('span', 'pill ' + e[1], e[0]));
      var det = [p.type === 'pourcentage' ? '− ' + p.valeur + ' %' : '− ' + p.valeur.toLocaleString('fr-FR') + ' FCFA'];
      if (p.minimum > 0) { det.push('dès ' + p.minimum.toLocaleString('fr-FR') + ' FCFA'); }
      det.push(p.utilisations + (p.max_utilisations !== null ? '/' + p.max_utilisations : '') + ' utilisation' + (p.utilisations > 1 ? 's' : ''));
      if (p.expire_le) { det.push("jusqu'au " + new Date(p.expire_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })); }
      b.appendChild(el('div', 'det', det.join(' · ')));
      b.addEventListener('click', function () { ouvrirPromo(p.code); });
      z.appendChild(b);
    });
  }
  function libValeur() { $('pf-valeur-lib').textContent = $('pf-type').value === 'pourcentage' ? 'Valeur (%) *' : 'Valeur (FCFA) *'; }
  $('pf-type').addEventListener('change', libValeur);
  function ouvrirPromo(code) {
    promoEnCours = code;
    var p = code ? promos.filter(function (x) { return x.code === code; })[0] : null;
    $('pf-titre').textContent = p ? 'Modifier le code' : 'Nouveau code';
    $('pf-code').value = p ? p.code : ''; $('pf-code').disabled = !!p;
    $('pf-type').value = p ? p.type : 'pourcentage';
    $('pf-valeur').value = p ? p.valeur : '';
    $('pf-min').value = p && p.minimum ? p.minimum : '';
    $('pf-max').value = p && p.max_utilisations !== null ? p.max_utilisations : '';
    $('pf-exp').value = p && p.expire_le ? cleJour(new Date(p.expire_le)) : '';
    $('pf-actif').checked = p ? p.actif : true;
    $('pf-suppr').hidden = !p; $('pf-msg').textContent = ''; $('pf-save').disabled = false;
    libValeur(); montrerPromo('form');
  }
  $('promo-nouveau').addEventListener('click', function () { ouvrirPromo(null); });
  $('pf-retour').addEventListener('click', function () { montrerPromo('liste'); });
  $('pf-annuler').addEventListener('click', function () { montrerPromo('liste'); });
  function pfErr(t) { $('pf-msg').className = 'msg'; $('pf-msg').textContent = t; }
  $('pf-save').addEventListener('click', async function () {
    var code = $('pf-code').value.trim().toUpperCase(), type = $('pf-type').value;
    var valeur = parseInt($('pf-valeur').value, 10), min = parseInt($('pf-min').value, 10) || 0;
    var max = $('pf-max').value.trim() === '' ? null : parseInt($('pf-max').value, 10), exp = $('pf-exp').value;
    if (!/^[A-Z0-9]{3,20}$/.test(code)) { pfErr('Le code doit faire 3 à 20 lettres ou chiffres, sans espace.'); return; }
    if (isNaN(valeur) || valeur < 1) { pfErr('Entre une valeur supérieure à 0.'); return; }
    if (type === 'pourcentage' && valeur > 100) { pfErr('Un pourcentage ne peut pas dépasser 100.'); return; }
    if (max !== null && (isNaN(max) || max < 1)) { pfErr("Le nombre d'utilisations doit être 1 ou plus, ou vide."); return; }
    var charge = { type: type, valeur: valeur, minimum: min, max_utilisations: max, expire_le: exp ? new Date(exp + 'T23:59:59').toISOString() : null, actif: $('pf-actif').checked };
    $('pf-save').disabled = true; pfErr('');
    var r;
    if (promoEnCours) { r = await db.from('codes_promo').update(charge).eq('code', promoEnCours).select('code'); }
    else { charge.code = code; r = await db.from('codes_promo').insert(charge); }
    $('pf-save').disabled = false;
    if (r.error) { pfErr(r.error.code === '23505' ? 'Ce code existe déjà.' : 'Enregistrement impossible : ' + r.error.message); return; }
    if (promoEnCours && !(r.data && r.data.length)) { pfErr("Modification refusée. Vérifie que ton compte est administrateur."); return; }
    montrerPromo('liste'); await chargerPromos();
    $('msg-promo').className = 'msg ok'; $('msg-promo').textContent = 'Code enregistré.';
  });
  $('pf-suppr').addEventListener('click', async function () {
    if (!promoEnCours || !window.confirm('Supprimer définitivement le code ' + promoEnCours + ' ? Pour seulement l\'arrêter, décoche « Code actif ».')) { return; }
    var r = await db.from('codes_promo').delete().eq('code', promoEnCours);
    if (r.error) { pfErr('Suppression impossible : ' + r.error.message); return; }
    montrerPromo('liste'); await chargerPromos();
    $('msg-promo').className = 'msg ok'; $('msg-promo').textContent = 'Code supprimé.';
  });

  // ----- Page Réglages -----
  function cfg(n) { var v = window[n]; return (v === undefined || v === null) ? '' : v; }
  function dessinerReglages() {
    var pret = 0, z = $('rg-liste'); z.textContent = '';
    var reseaux = ['LIEN_INSTAGRAM', 'LIEN_TIKTOK', 'LIEN_YOUTUBE', 'LIEN_FACEBOOK'].filter(function (n) { return cfg(n); }).length;
    var ouvert = cfg('COMMANDES_OUVERTES') === true;
    var lignes = [
      ['Commandes', ouvert, ouvert ? 'Ouvertes aux clients' : 'Vitrine seulement : personne ne peut encore commander', 'COMMANDES_OUVERTES = true'],
      ['E-mail de contact', !!cfg('CONTACT_EMAIL'), cfg('CONTACT_EMAIL')],
      ['WhatsApp de contact', !!cfg('CONTACT_WHATSAPP'), cfg('CONTACT_WHATSAPP')],
      ['Numéro Wave', !!cfg('NUMERO_WAVE'), cfg('NUMERO_WAVE')],
      ['Numéro Orange Money', !!cfg('NUMERO_ORANGE'), cfg('NUMERO_ORANGE')],
      ['Infos de livraison', !!cfg('INFO_LIVRAISON'), cfg('INFO_LIVRAISON')],
      ['Infos de retours', !!cfg('INFO_RETOURS'), cfg('INFO_RETOURS')],
      ['Guide des tailles', !!cfg('INFO_TAILLES'), cfg('INFO_TAILLES')],
      ['Réseaux sociaux', reseaux > 0, reseaux + ' lien(s) renseigné(s)'],
      ['Mentions légales (éditeur)', !!(cfg('EDITEUR_NOM') && cfg('EDITEUR_ADRESSE')), cfg('EDITEUR_NOM')]
    ];
    lignes.forEach(function (l) {
      if (l[1]) { pret++; }
      var r = el('div', 'rg-ligne'), g = el('div', ''); g.appendChild(document.createTextNode(l[0]));
      var det = l[1] ? l[2] : (l[3] || ''); if (det) { g.appendChild(el('small', '', det)); }
      r.appendChild(g); r.appendChild(el('span', 'pill ' + (l[1] ? 'payee' : 'en_attente'), l[1] ? 'OK' : 'À remplir')); z.appendChild(r);
    });
    $('rg-score').textContent = pret + ' sur ' + lignes.length + ' réglages prêts';
    var b = $('rg-barre'); b.style.width = '0'; setTimeout(function () { b.style.width = Math.round(pret / lignes.length * 100) + '%'; }, 60);
    initAlertes(); initEmail();
    db.auth.getSession().then(function (s) { var u = s && s.data && s.data.session; $('rg-email').textContent = u ? 'Connecté : ' + u.user.email : ''; });
  }

  // ----- E-mails d'alerte (Resend) -----
  var emailPret = false;
  function emMsg(t, ok) { var m = $('em-msg'); m.className = ok ? 'msg ok' : 'msg'; m.textContent = t; }
  async function initEmail() {
    emMsg('', true);
    ['em-dest', 'em-exp', 'em-cmd', 'em-ret', 'em-save', 'em-test'].forEach(function (x) { $(x).disabled = true; });
    var r = await db.from('notif_email').select('*').eq('id', 1).maybeSingle();
    if (!r || r.error || !r.data) {
      emailPret = false;
      $('em-etat').textContent = "Les e-mails ne sont pas encore installés : lance le script menelki-admin-5.sql dans Supabase (SQL Editor), puis recharge cette page.";
      return;
    }
    emailPret = true;
    ['em-dest', 'em-exp', 'em-cmd', 'em-ret', 'em-save', 'em-test'].forEach(function (x) { $(x).disabled = false; });
    $('em-dest').value = r.data.destinataire || '';
    $('em-exp').value = r.data.expediteur || '';
    $('em-cmd').checked = !!r.data.nouvelle_commande;
    $('em-ret').checked = !!r.data.nouveau_retour;
    majEtatEmail(r.data.destinataire);
  }
  function majEtatEmail(dest) {
    $('em-etat').textContent = dest
      ? 'Alertes actives vers ' + dest + '. Chaque nouvelle commande ou demande de retour t\'est envoyée par e-mail.'
      : "Aucune adresse pour l'instant : renseigne-la ci-dessous pour recevoir les alertes par e-mail.";
  }
  async function enregistrerEmail() {
    var dest = $('em-dest').value.trim(), exp = $('em-exp').value.trim();
    if (dest && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dest)) { emMsg("Cette adresse e-mail n'a pas l'air valide.", false); return false; }
    if (exp.length < 5) { exp = 'MENELKI <onboarding@resend.dev>'; $('em-exp').value = exp; }
    var lien = location.href.split('#')[0].split('?')[0];
    var r = await db.from('notif_email').update({
      destinataire: dest || null, expediteur: exp, lien_admin: /^https:\/\//i.test(lien) ? lien : null,
      nouvelle_commande: $('em-cmd').checked, nouveau_retour: $('em-ret').checked, maj_le: new Date().toISOString()
    }).eq('id', 1).select('id');
    if (r.error || !r.data || !r.data.length) { emMsg("Enregistrement impossible" + (r.error ? ' : ' + r.error.message : '.'), false); return false; }
    majEtatEmail(dest);
    return true;
  }
  $('em-save').addEventListener('click', async function () {
    if (!emailPret) { return; }
    $('em-save').disabled = true;
    var ok = await enregistrerEmail();
    $('em-save').disabled = false;
    if (ok) { emMsg('Réglages enregistrés.', true); }
  });
  function attendre(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
  $('em-test').addEventListener('click', async function () {
    if (!emailPret) { return; }
    $('em-test').disabled = true; emMsg('Envoi du test…', true);
    try {
      if (!(await enregistrerEmail())) { return; }
      var r = await db.rpc('envoyer_email_test');
      if (r.error) { emMsg("Le test n'a pas pu partir : " + r.error.message, false); return; }
      var d = r.data || {};
      if (!d.ok) {
        emMsg(d.raison === 'cle' ? "La clé Resend n'est pas encore rangée dans Supabase (voir l'étape « Ranger la clé » du guide)." : "Renseigne d'abord l'adresse qui reçoit les alertes.", false);
        return;
      }
      for (var i = 0; i < 4; i++) {
        await attendre(1500);
        var s = await db.rpc('resultat_email', { p_id: d.id });
        var v = s && s.data;
        if (v && v.pret) {
          if (v.statut >= 200 && v.statut < 300) { emMsg('Test envoyé à ' + $('em-dest').value.trim() + '. Regarde ta boîte de réception (et les courriers indésirables).', true); }
          else {
            var txt = v.erreur || v.extrait || '';
            try { var o = JSON.parse(v.extrait); if (o && o.message) { txt = o.message; } } catch (e) {}
            emMsg('Resend a refusé l\'envoi (code ' + (v.statut || '?') + ') : ' + txt, false);
          }
          return;
        }
      }
      emMsg("Envoi lancé. Si rien n'arrive d'ici une minute, vérifie la clé Resend.", true);
    } finally { $('em-test').disabled = false; }
  });
  $('rg-mdp-ok').addEventListener('click', async function () {
    var a = $('rg-mdp1').value, b = $('rg-mdp2').value, m = $('rg-mdp-msg');
    m.className = 'msg';
    if (a.length < 8) { m.textContent = '8 caractères minimum.'; return; }
    if (a !== b) { m.textContent = 'Les deux mots de passe ne sont pas identiques.'; return; }
    $('rg-mdp-ok').disabled = true;
    var r = await db.auth.updateUser({ password: a });
    $('rg-mdp-ok').disabled = false;
    if (r.error) { m.textContent = 'Impossible de changer le mot de passe : ' + r.error.message; return; }
    $('rg-mdp1').value = ''; $('rg-mdp2').value = ''; m.className = 'msg ok'; m.textContent = 'Mot de passe modifié.';
  });

  // ----- Alertes de commandes en direct -----
  var vu = { dernierId: 0, dernierRet: 0, canal: null, minuteur: null, etat: '', son: true, notif: false };
  function pref(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function setPref(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  vu.son = pref('mk_son', '1') === '1';
  vu.notif = pref('mk_notif', '0') === '1';

  // Son généré par le navigateur (aucun fichier). iPhone : il faut avoir touché la page au moins une fois.
  var audio = null;
  function debloquerAudio() {
    try {
      if (!audio) { var A = window.AudioContext || window.webkitAudioContext; if (A) { audio = new A(); } }
      if (audio && audio.state === 'suspended') { audio.resume(); }
    } catch (e) {}
  }
  document.addEventListener('pointerdown', debloquerAudio);
  document.addEventListener('keydown', debloquerAudio);
  function bip() {
    if (!vu.son || !audio) { return; }
    try {
      if (audio.state === 'suspended') { audio.resume(); }
      [[880, 0], [1175, 0.16]].forEach(function (n) {
        var o = audio.createOscillator(), g = audio.createGain(), t0 = audio.currentTime + n[1];
        o.type = 'sine'; o.frequency.value = n[0];
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.30);
        o.connect(g); g.connect(audio.destination); o.start(t0); o.stop(t0 + 0.32);
      });
    } catch (e) {}
  }

  // Bulle d'alerte
  var zoneToasts = document.createElement('div'); zoneToasts.id = 'toasts'; zoneToasts.setAttribute('aria-live', 'polite'); document.body.appendChild(zoneToasts);
  function toast(titre, texte, action) {
    var t = el('div', 'toast');
    var i = el('div', 't-ico'); i.innerHTML = svg('commandes'); t.appendChild(i);
    t.appendChild(el('b', '', titre));
    var x = el('button', 't-x', '×'); x.setAttribute('aria-label', 'Fermer'); t.appendChild(x);
    t.appendChild(el('span', 't-txt', texte));
    function fermerToast() { t.classList.add('sortie'); setTimeout(function () { if (t.parentNode) { t.parentNode.removeChild(t); } }, 320); }
    x.addEventListener('click', fermerToast);
    if (action) { var v = el('button', 't-voir', 'Voir la commande'); v.addEventListener('click', function () { fermerToast(); action(); }); t.appendChild(v); }
    zoneToasts.appendChild(t);
    while (zoneToasts.children.length > 4) { zoneToasts.removeChild(zoneToasts.firstChild); }
    setTimeout(fermerToast, 15000);
  }
  function notifierSysteme(titre, corps) {
    if (!vu.notif || !('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) { return; }
    try { new Notification(titre, { body: corps, icon: 'icone-512.png', tag: 'menelki-commande' }); } catch (e) {}
  }

  async function voirCommande(id) {
    filtreCmd = 'tous'; aller('commandes');
    try { await promesseCmd; } catch (e) {}
    ouvrirCmd(id);
  }
  function rafraichirVue() {
    if (vueActive === 'tableau') { chargerTableau(); }
    else if (vueActive === 'commandes' && !$('cmd-liste').hidden) { chargerCommandes(); }
  }
  async function nouvelleCommande(c) {
    if (!c || !c.id || c.id <= vu.dernierId) { return; }      // déjà signalée (temps réel + vérification régulière)
    vu.dernierId = c.id;
    var nom = 'Client';
    try {
      if (c.user_id) { var p = await db.from('profils').select('prenom,nom').eq('user_id', c.user_id).maybeSingle(); if (p && p.data) { nom = p.data.prenom + ' ' + (p.data.nom || '').charAt(0) + '.'; } }
    } catch (e) {}
    var texte = nom + ' · ' + Number(c.total || 0).toLocaleString('fr-FR') + ' FCFA';
    toast('Nouvelle commande #' + c.id, texte, function () { voirCommande(c.id); });
    bip(); notifierSysteme('Nouvelle commande #' + c.id, texte);
    compterEnAttente(); rafraichirVue();
  }

  async function nouveauRetour(r) {
    if (!r || !r.id || r.id <= vu.dernierRet) { return; }
    vu.dernierRet = r.id;
    var nom = 'Client';
    try { if (r.user_id) { var p = await db.from('profils').select('prenom,nom').eq('user_id', r.user_id).maybeSingle(); if (p && p.data) { nom = p.data.prenom + ' ' + (p.data.nom || '').charAt(0) + '.'; } } } catch (e) {}
    var texte = nom + ' · ' + (r.motif || 'Demande de retour') + ' · commande #' + r.commande_id;
    toast('Demande de retour #' + r.id, texte, function () { filtreRet = 'tous'; aller('retours'); promesseRet.then(function () { ouvrirRet(r.id); }); });
    bip(); notifierSysteme('Demande de retour #' + r.id, texte);
    compterRetours();
    if (vueActive === 'retours' && !$('ret-liste').hidden) { chargerRetours(); }
  }
  async function verifierNouvelles() {
    if (!db || !vu.canal) { return; }
    var rr = await db.from('retours').select('id,motif,commande_id,user_id').gt('id', vu.dernierRet).order('id', { ascending: true }).limit(5);
    if (rr && !rr.error) { for (var j = 0; j < (rr.data || []).length; j++) { await nouveauRetour(rr.data[j]); } }
    var r = await db.from('commandes').select('id,total,user_id').gt('id', vu.dernierId).order('id', { ascending: true }).limit(5);
    if (r && !r.error) { for (var i = 0; i < (r.data || []).length; i++) { await nouvelleCommande(r.data[i]); } }
  }
  function majEtatAlertes() {
    var e = $('al-etat'); if (!e) { return; }
    e.textContent = ''; var s = el('span', 'etat-direct' + (vu.etat === 'en direct' ? ' ok' : ''), vu.etat === 'en direct' ? 'Alertes en direct actives' : 'Vérification toutes les minutes (le direct n’est pas connecté)');
    e.appendChild(s);
  }
  async function demarrerAlertes() {
    if (!db || vu.canal) { return; }
    var d = await db.from('commandes').select('id').order('id', { ascending: false }).limit(1);
    vu.dernierId = (d && d.data && d.data[0]) ? d.data[0].id : 0;
    var dr = await db.from('retours').select('id').order('id', { ascending: false }).limit(1);
    vu.dernierRet = (dr && dr.data && dr.data[0]) ? dr.data[0].id : 0;
    try {
      vu.canal = db.channel('menelki-commandes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'commandes' }, function (p) { nouvelleCommande(p.new); })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'retours' }, function (p) { nouveauRetour(p.new); })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'commandes' }, function () { compterEnAttente(); rafraichirVue(); })
        .subscribe(function (statut) { vu.etat = (statut === 'SUBSCRIBED') ? 'en direct' : ''; majEtatAlertes(); });
    } catch (e) { vu.canal = {}; }
    vu.minuteur = setInterval(verifierNouvelles, 60000);          // filet de sécurité
  }
  function arreterAlertes() {
    if (vu.minuteur) { clearInterval(vu.minuteur); vu.minuteur = null; }
    try { if (vu.canal && db && db.removeChannel) { db.removeChannel(vu.canal); } } catch (e) {}
    vu.canal = null; vu.etat = '';
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { verifierNouvelles(); compterEnAttente(); } });

  // Réglages des alertes
  function initAlertes() {
    $('al-son').checked = vu.son;
    var ok = ('Notification' in window);
    $('al-notif').checked = vu.notif && ok && Notification.permission === 'granted';
    $('al-notif').disabled = !ok;
    $('al-notif-aide').textContent = ok ? (Notification.permission === 'denied' ? "Les notifications sont bloquées dans les réglages de ton navigateur pour ce site." : '')
      : "Sur iPhone, les notifications du navigateur ne sont disponibles que lorsque l'administration est installée sur l'écran d'accueil.";
    majEtatAlertes();
  }
  $('al-son').addEventListener('change', function () { vu.son = this.checked; setPref('mk_son', vu.son ? '1' : '0'); debloquerAudio(); if (vu.son) { bip(); } });
  $('al-notif').addEventListener('change', async function () {
    var box = this;
    if (!box.checked) { vu.notif = false; setPref('mk_notif', '0'); return; }
    try {
      var r = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      vu.notif = (r === 'granted'); box.checked = vu.notif; setPref('mk_notif', vu.notif ? '1' : '0');
      if (!vu.notif) { $('al-notif-aide').textContent = "Autorisation refusée : tu peux la changer dans les réglages de ton navigateur."; }
    } catch (e) { box.checked = false; }
  });
  $('al-test').addEventListener('click', function () {
    debloquerAudio();
    toast('Nouvelle commande #TEST', 'Awa K. · 45 000 FCFA (ceci est un test)', null);
    bip();
  });

  // ----- Commandes en attente (cloche) -----
  async function compterEnAttente() {
    var r = await db.from('commandes').select('id', { count: 'exact', head: true }).eq('statut', 'en_attente');
    var n = r.count || 0;
    $('pastille').textContent = n > 99 ? '99+' : n; $('pastille').hidden = !n;
    $('nav-nb').textContent = n; $('nav-nb').hidden = !n;
    document.title = (n ? '(' + n + ') ' : '') + 'Administration – MENELKI';
  }

  demarrer();
})();
