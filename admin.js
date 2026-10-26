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
  function montrer(id) { ['connexion', 'liste', 'formulaire'].forEach(function (x) { $(x).hidden = (x !== id); }); window.scrollTo(0, 0); }
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
    montrer('liste');
    chargerArticles();
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
  $('deco').addEventListener('click', async function () { if (db) { await db.auth.signOut(); } montrer('connexion'); });

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
    if (id === null) { remplir({}); montrer('formulaire'); return; }
    var r = await db.from('produits').select('*').eq('id', id).single();
    if (r.error || !r.data) { $('msg-liste').textContent = "Impossible d'ouvrir cet article."; return; }
    remplir(r.data);
    montrer('formulaire');
  }

  $('f-promo').addEventListener('change', function () { $('bloc-ancien').hidden = !this.checked; });
  $('f-retour').addEventListener('click', retourListe);
  $('f-annuler').addEventListener('click', retourListe);
  function retourListe() { montrer('liste'); chargerArticles(); }

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
    montrer('liste');
    await chargerArticles();
    $('msg-liste').className = 'msg ok';
    $('msg-liste').textContent = 'Article enregistré.';
  });

  $('f-suppr').addEventListener('click', async function () {
    if (enCours === null) { return; }
    if (!window.confirm('Supprimer définitivement cet article ? Pour seulement le cacher, décoche « Visible sur la boutique ».')) { return; }
    var r = await db.from('produits').delete().eq('id', enCours);
    if (r.error) { erreur('Suppression impossible : ' + r.error.message); return; }
    montrer('liste');
    await chargerArticles();
    $('msg-liste').className = 'msg ok';
    $('msg-liste').textContent = 'Article supprimé.';
  });

  demarrer();
})();
