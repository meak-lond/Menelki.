/* MENELKI – logique du site (comptes, catalogue, panier, assistant, animations)
   Les réglages (Supabase, contacts, livraison…) sont dans config.js */
(function () {
  'use strict';

  // ===== Comptes clients (Supabase) =====
  var db = null;
  try {
    if (typeof SUPABASE_URL === 'string' && SUPABASE_URL.indexOf('http') === 0) { db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY); }
  } catch (e) { db = null; }

  var $ = function (id) { return document.getElementById(id); };
  var mode = 'connexion';
  var reduit = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function cfg(n) { var v = window[n]; return (typeof v === 'string') ? v : ''; }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; }
  function icone(nom) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg'); svg.setAttribute('class', 'ic');
    var u = document.createElementNS(ns, 'use'); u.setAttribute('href', '#i-' + nom);
    svg.appendChild(u); return svg;
  }

  function message(texte, type) { var m = $('compte-msg'); m.textContent = texte; m.className = type || ''; }
  function ouvrir() { $('compte-fond').classList.add('open'); message(''); }
  function fermer() { $('compte-fond').classList.remove('open'); }

  function choisirMode(m) {
    mode = m;
    $('onglet-connexion').className = m === 'connexion' ? 'actif' : '';
    $('onglet-inscription').className = m === 'inscription' ? 'actif' : '';
    $('champ-prenom').style.display = m === 'inscription' ? 'block' : 'none';
    $('btn-valider').textContent = m === 'inscription' ? 'Créer mon compte' : 'Se connecter';
    $('champ-mdp').autocomplete = m === 'inscription' ? 'new-password' : 'current-password';
    $('lien-oubli').style.display = m === 'inscription' ? 'none' : 'block';
    message('');
  }

  function afficherSession(session) {
    var user = session ? session.user : null;
    $('vue-connecte').style.display = user ? 'block' : 'none';
    $('vue-formulaire').style.display = user ? 'none' : 'block';
    if (user) {
      var prenom = (user.user_metadata && user.user_metadata.prenom) ? user.user_metadata.prenom : user.email;
      $('bonjour').textContent = 'Salut ' + prenom;
      $('nom-compte').textContent = prenom.split(' ')[0];
    } else {
      $('nom-compte').textContent = '';
    }
  }

  async function valider() {
    if (!db) { message('Le site n\'est pas encore relié à Supabase.', 'err'); return; }
    var email = $('champ-email').value.trim();
    var mdp = $('champ-mdp').value;
    if (!email || !mdp) { message('Remplis ton e-mail et ton mot de passe.', 'err'); return; }
    if (mode === 'inscription') {
      var prenom = $('champ-prenom').value.trim();
      if (!prenom) { message('Entre ton prénom.', 'err'); return; }
      if (mdp.length < 8) { message('Le mot de passe doit faire 8 caractères minimum.', 'err'); return; }
      var r = await db.auth.signUp({ email: email, password: mdp, options: { data: { prenom: prenom }, emailRedirectTo: (window.location.origin + window.location.pathname) } });
      if (r.error) { message(r.error.message, 'err'); return; }
      if (r.data.session) { message('Compte créé, bienvenue chez MENELKI.', 'ok'); }
      else { message('Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse.', 'ok'); }
    } else {
      var c = await db.auth.signInWithPassword({ email: email, password: mdp });
      if (c.error) { message('E-mail ou mot de passe incorrect.', 'err'); return; }
      message('Connexion réussie !', 'ok');
    }
  }

  async function oubli() {
    if (!db) { message('Le site n\'est pas encore relié à Supabase.', 'err'); return; }
    var email = $('champ-email').value.trim();
    if (!email) { message('Entre ton e-mail puis reclique sur le lien.', 'err'); return; }
    var r = await db.auth.resetPasswordForEmail(email, { redirectTo: (window.location.origin + window.location.pathname) });
    if (r.error) { message(r.error.message, 'err'); return; }
    message('E-mail envoyé : suis le lien pour choisir un nouveau mot de passe.', 'ok');
  }

  var NOMS = { google: 'Continuer avec Google', facebook: 'Continuer avec Facebook', apple: 'Continuer avec iCloud (Apple)' };
  var actifs = (typeof FOURNISSEURS !== 'undefined' && FOURNISSEURS) ? FOURNISSEURS : [];
  if (db && actifs.length) {
    $('social').style.display = 'block';
    actifs.forEach(function (nom) {
      if (!NOMS[nom]) return;
      var b = document.createElement('button');
      b.className = 'social-btn';
      b.textContent = NOMS[nom];
      b.addEventListener('click', async function () {
        var r = await db.auth.signInWithOAuth({ provider: nom, options: { redirectTo: (window.location.origin + window.location.pathname) } });
        if (r.error) { message(r.error.message, 'err'); }
      });
      $('boutons-social').appendChild(b);
    });
  }

  $('btn-compte').addEventListener('click', function () { if (utilisateur) { ouvrirEspace(); } else { ouvrir(); } });
  $('compte-fermer').addEventListener('click', fermer);
  $('compte-fond').addEventListener('click', function (e) { if (e.target === $('compte-fond')) fermer(); });
  $('onglet-connexion').addEventListener('click', function () { choisirMode('connexion'); });
  $('onglet-inscription').addEventListener('click', function () { choisirMode('inscription'); });
  $('btn-valider').addEventListener('click', valider);
  $('lien-oubli').addEventListener('click', oubli);
  $('btn-deco').addEventListener('click', async function () { if (db) { await db.auth.signOut(); fermer(); } });

  if (db) {
    db.auth.getSession().then(function (r) { afficherSession(r.data.session); });
    db.auth.onAuthStateChange(function (evt, session) {
      afficherSession(session);
      if (evt === 'PASSWORD_RECOVERY') { setTimeout(ouvrirNouveauMdp, 0); }
    });
  }

  // ===== Catalogue, panier et commande =====
  var NOMS_CAT = { vetements: 'Vêtements', chaussures: 'Chaussures', bijoux: 'Bijoux', bracelets: 'Bracelets' };
  var produits = [];
  var filtre = null;
  var panier = {};
  var utilisateur = null;
  var codePromo = null;
  try { panier = JSON.parse(localStorage.getItem('mk_panier') || '{}') || {}; } catch (e) { panier = {}; }

  function commandesOuvertes() { return typeof COMMANDES_OUVERTES !== 'undefined' && COMMANDES_OUVERTES === true; }
  function sauverPanier() { try { localStorage.setItem('mk_panier', JSON.stringify(panier)); } catch (e) {} }
  function fcfa(n) { return Number(n).toLocaleString('fr-FR') + ' FCFA'; }
  function urlImage(u) { return (u && (u.indexOf('https://') === 0 || u.indexOf('images/') === 0)) ? u : ''; }
  function cle(id, taille, couleur) { return id + '|' + (taille || '') + '|' + (couleur || ''); }
  function fondLogo(conteneur) {
    var im = el('img', 'ph-logo'); im.src = 'menelki-symbole-blanc.svg'; im.alt = ''; conteneur.appendChild(im);
  }
  function lignes() {
    var out = [];
    Object.keys(panier).forEach(function (k) {
      var q = panier[k];
      if (!(q > 0)) { return; }
      var parts = String(k).split('|');
      var p = produits.filter(function (x) { return String(x.id) === parts[0]; })[0];
      if (p) { out.push({ p: p, qte: q, taille: parts[1] || '', couleur: parts[2] || '', cle: k }); }
    });
    return out;
  }
  function totalPanier() { return lignes().reduce(function (t, l) { return t + l.p.prix * l.qte; }, 0); }
  function nbArticles() { return lignes().reduce(function (n, l) { return n + l.qte; }, 0); }
  function majBadge() { var n = nbArticles(); $('nb-panier').textContent = n ? String(n) : ''; }
  function ajouter(id, taille, couleur) { var k = cle(id, taille, couleur); panier[k] = (panier[k] || 0) + 1; sauverPanier(); majBadge(); }
  function changer(k, d) {
    codePromo = null;
    var q = (panier[k] || 0) + d;
    if (q <= 0) { delete panier[k]; } else { panier[k] = q; }
    sauverPanier(); majBadge(); dessinerPanier();
  }
  function fraisLivraison() { return (typeof FRAIS_LIVRAISON === 'number') ? FRAIS_LIVRAISON : null; }

  function choisirOptions(p, apres) {
    var t = p.tailles || [], c = p.couleurs || [];
    if (!t.length && !c.length) { ajouter(p.id); if (apres) { apres(); } return; }
    var f = $('options-corps'); f.textContent = '';
    f.appendChild(el('h3', '', p.nom)); f.appendChild(el('p', 'prix', fcfa(p.prix)));
    function liste(titre, valeurs, invite) {
      f.appendChild(el('span', 'lbl', titre));
      var sel = el('select', 'esp-champ');
      var o0 = el('option', '', invite); o0.value = ''; sel.appendChild(o0);
      valeurs.forEach(function (v) { var o = el('option', '', v); o.value = v; sel.appendChild(o); });
      f.appendChild(sel); return sel;
    }
    var st = t.length ? liste('Taille', t, 'Choisis ta taille') : null;
    var sc = c.length ? liste('Couleur', c, 'Choisis ta couleur') : null;
    var etat = el('p', 'esp-etat err'), ok = el('button', 'btn', 'Ajouter au panier');
    ok.addEventListener('click', function () {
      if (st && !st.value) { etat.textContent = 'Choisis ta taille.'; return; }
      if (sc && !sc.value) { etat.textContent = 'Choisis ta couleur.'; return; }
      ajouter(p.id, st ? st.value : '', sc ? sc.value : '');
      $('options-fond').classList.remove('open');
      if (apres) { apres(); }
    });
    f.appendChild(ok); f.appendChild(etat);
    $('options-fond').classList.add('open');
  }
  $('options-fermer').addEventListener('click', function () { $('options-fond').classList.remove('open'); });
  $('options-fond').addEventListener('click', function (e) { if (e.target === $('options-fond')) { $('options-fond').classList.remove('open'); } });

  var terme = '';
  var observe = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entrees) {
    entrees.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); observe.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }) : null;
  function reveler(e) { e.classList.add('revele'); if (observe) { observe.observe(e); } else { e.classList.add('visible'); } }

  function carte(p) {
    var c = el('div', 'fiche');
    var ph = el('div', 'photo');
    if (urlImage(p.image_url)) { var im = el('img'); im.src = urlImage(p.image_url); im.alt = p.nom; im.loading = 'lazy'; im.decoding = 'async'; ph.appendChild(im); }
    else { fondLogo(ph); }
    if (p.en_promo) { ph.appendChild(el('span', 'badge', 'PROMO')); }
    var inf = el('div', 'infos', p.nom);
    var pr = el('div', 'prix', fcfa(p.prix));
    if (p.en_promo && p.ancien_prix) { pr.appendChild(el('s', 'ancien', fcfa(p.ancien_prix))); }
    inf.appendChild(pr);
    var b = el('button', 'btn petit', 'Ajouter');
    b.addEventListener('click', function () { choisirOptions(p); });
    var coeur = el('button', 'coeur-f');
    coeur.setAttribute('data-fav', p.id);
    coeur.setAttribute('aria-label', 'Ajouter aux favoris');
    coeur.appendChild(icone('heart'));
    if (favori(p.id)) { coeur.classList.add('actif'); }
    coeur.addEventListener('click', function (e) { e.stopPropagation(); basculerFavori(p); });
    ph.appendChild(coeur);
    c.appendChild(ph); c.appendChild(inf); c.appendChild(b);
    ph.addEventListener('click', function () { ouvrirFiche(p); });
    inf.addEventListener('click', function () { ouvrirFiche(p); });
    reveler(c);
    return c;
  }

  function remplir(id, liste) {
    var z = $(id); z.textContent = '';
    liste.forEach(function (p) { z.appendChild(carte(p)); });
  }

  // ===== Catalogue paginé =====
  var PAGE = 24, pageSuivante = 0, plusDispo = false, resultats = [], rechercheId = 0;
  var COLONNES = 'id,nom,prix,categorie,image_url,meilleure_vente,en_promo,ancien_prix,tailles,couleurs,description,matieres,images,couleurs_images,stock,seuil_stock';

  function requeter(page) {
    var q = db.from('produits').select(COLONNES).eq('disponible', true).order('cree_le', { ascending: false });
    if (filtre) { q = q.eq('categorie', filtre); }
    if (terme) { q = q.ilike('nom', '%' + terme.replace(/[%_,()]/g, '') + '%'); }
    return q.range(page * PAGE, page * PAGE + PAGE - 1);
  }

  function ajouterAuCache(lot) {
    lot.forEach(function (p) {
      if (!produits.some(function (x) { return String(x.id) === String(p.id); })) { produits.push(p); }
    });
  }

  function renderResultats() {
    var z = $('liste-produits');
    z.textContent = '';
    if (!resultats.length) { z.textContent = 'Aucun article trouvé.'; return; }
    resultats.forEach(function (p) { z.appendChild(carte(p)); });
    if (plusDispo) {
      var b = el('button', 'btn clair voir-plus', 'Voir plus');
      b.addEventListener('click', function () { chargerSuite(b); });
      z.appendChild(b);
    }
  }

  async function chargerSuite(bouton) {
    var id = rechercheId;
    if (bouton) { bouton.disabled = true; bouton.textContent = 'Chargement…'; }
    var r = await requeter(pageSuivante);
    if (id !== rechercheId) { return; }
    if (r.error) { if (bouton) { bouton.disabled = false; bouton.textContent = 'Voir plus'; } return; }
    ajouterAuCache(r.data || []);
    resultats = resultats.concat(r.data || []);
    pageSuivante++;
    plusDispo = (r.data || []).length === PAGE;
    renderResultats();
  }

  async function lancerRecherche(defiler) {
    var id = ++rechercheId;
    resultats = []; pageSuivante = 0; plusDispo = false;
    if (!db) { $('liste-produits').textContent = 'Catalogue indisponible pour le moment.'; return; }
    $('liste-produits').textContent = 'Chargement…';
    var r = await requeter(0);
    if (id !== rechercheId) { return; }
    if (r.error) { $('liste-produits').textContent = 'Impossible de charger les articles.'; return; }
    ajouterAuCache(r.data || []);
    resultats = r.data || [];
    pageSuivante = 1;
    plusDispo = resultats.length === PAGE;
    renderResultats();
    if (defiler) { $('resultats').scrollIntoView({ behavior: 'smooth' }); }
  }

  function afficherProduits(defiler) {
    var actif = !!(filtre || terme);
    $('resultats').style.display = actif ? 'block' : 'none';
    $('bandes').style.display = actif ? 'none' : 'block';
    if (actif) {
      var info = $('filtre-info');
      info.textContent = '';
      var parts = [];
      if (filtre) parts.push(NOMS_CAT[filtre]);
      if (terme) parts.push('« ' + terme + ' »');
      info.appendChild(document.createTextNode(parts.join(' · ') + ' · '));
      var a = el('a', 'lien-filtre', 'Tout afficher');
      a.addEventListener('click', function () { filtre = null; terme = ''; $('champ-recherche').value = ''; afficherProduits(); });
      info.appendChild(a);
      lancerRecherche(defiler);
      return;
    }
    if (!produits.length) { $('rail-nouveautes').textContent = 'La première collection arrive bientôt.'; return; }
    remplir('rail-nouveautes', produits.slice(0, 10));
    var v = produits.filter(function (p) { return p.meilleure_vente; });
    var promo = produits.filter(function (p) { return p.en_promo; });
    $('ventes').style.display = v.length ? 'block' : 'none';
    $('promos').style.display = promo.length ? 'block' : 'none';
    remplir('rail-ventes', v); remplir('rail-promos', promo);
  }

  // ===== Chargement des articles manquants (panier, favoris) =====
  var tentes = {};

  function idsManquants(ids) {
    var connus = {};
    produits.forEach(function (p) { connus[String(p.id)] = true; });
    return ids.map(String).filter(function (id) { return !connus[id] && !tentes[id]; });
  }

  async function chargerProduitsIds(ids) {
    ids = ids.map(String);
    ids.forEach(function (id) { tentes[id] = true; });
    if (!db || !ids.length) { return; }
    var r = await db.from('produits').select(COLONNES).in('id', ids);
    if (!r.error) { ajouterAuCache(r.data || []); }
  }

  async function chargerProduits() {
    if (!db) { $('rail-nouveautes').textContent = 'Catalogue indisponible pour le moment.'; return; }
    var r = await requeter(0);
    if (r.error) { $('rail-nouveautes').textContent = 'Impossible de charger les produits.'; return; }
    ajouterAuCache(r.data || []);
    afficherProduits();
    majBadge();
  }

  function dessinerPanier() {
    var manquants = idsManquants(Object.keys(panier).map(function (k) { return String(k).split('|')[0]; }));
    if (manquants.length) { chargerProduitsIds(manquants).then(dessinerPanier); }
    var zl = $('panier-lignes'), zb = $('panier-bas');
    zl.textContent = ''; zb.textContent = '';
    var L = lignes();
    if (!L.length) { zl.appendChild(el('p', '', 'Ton panier est vide.')); return; }
    L.forEach(function (l) {
      var row = el('div', 'art');
      var ph = el('div', 'art-photo');
      if (urlImage(l.p.image_url)) { var im = el('img'); im.src = urlImage(l.p.image_url); im.alt = l.p.nom; im.decoding = 'async'; ph.appendChild(im); }
      else { fondLogo(ph); }
      var inf = el('div', 'art-infos');
      inf.appendChild(el('div', 'art-marque', 'MENELKI'));
      inf.appendChild(el('div', 'art-nom', l.p.nom));
      inf.appendChild(el('div', 'art-prix', fcfa(l.p.prix)));
      var det = el('div', 'art-det');
      [['Réf. Art.', 'MK-' + ('000000' + l.p.id).slice(-6)], ['Couleur', l.couleur], ['Taille', l.taille], ['Quantité', String(l.qte)], ['Total', fcfa(l.p.prix * l.qte)]].forEach(function (d) {
        if (!d[1]) { return; }
        det.appendChild(el('span', 'k', d[0])); det.appendChild(el('span', 'v', d[1]));
      });
      inf.appendChild(det);
      var qt = el('div', 'art-qte');
      var moins = el('button'); moins.appendChild(icone(l.qte > 1 ? 'minus' : 'trash')); moins.setAttribute('aria-label', l.qte > 1 ? 'Moins' : 'Supprimer');
      moins.addEventListener('click', function () { changer(l.cle, -1); });
      var plus = el('button'); plus.appendChild(icone('plus')); plus.setAttribute('aria-label', 'Plus');
      plus.addEventListener('click', function () { changer(l.cle, 1); });
      qt.appendChild(moins); qt.appendChild(el('span', '', String(l.qte))); qt.appendChild(plus);
      inf.appendChild(qt);
      row.appendChild(ph); row.appendChild(inf); zl.appendChild(row);
    });
    var valeur = totalPanier(), frais = fraisLivraison();
    function resume(a, b, gras) {
      var d = el('div', gras ? 'res gras' : 'res'); d.appendChild(el('span', '', a)); d.appendChild(el('span', '', b)); zb.appendChild(d);
    }
    resume('Valeur de la commande', fcfa(valeur));
    resume('Frais de livraison estimés', frais === null ? 'À confirmer' : fcfa(frais));
    if (codePromo) { resume('Code ' + codePromo.code, '− ' + fcfa(codePromo.remise)); }
    var remiseAppliquee = codePromo ? codePromo.remise : 0;
    resume('Total de la commande :', fcfa(valeur - remiseAppliquee + (frais || 0)), true);
    var promoZone = el('div', 'promo-zone');
    var pligne = el('div', 'promo-ligne');
    var pin = el('input'); pin.type = 'text'; pin.id = 'promo-code'; pin.placeholder = 'Code promo';
    pin.value = codePromo ? codePromo.code : '';
    pin.setAttribute('autocapitalize', 'characters');
    var pbtn = el('button', 'btn clair petit', codePromo ? 'Retirer' : 'Appliquer');
    var pmsg = el('p', 'promo-msg');
    pbtn.addEventListener('click', async function () {
      if (codePromo) { codePromo = null; dessinerPanier(); return; }
      if (!utilisateur) { ouvrir(); return; }
      var code = pin.value.trim();
      if (!code) { pmsg.textContent = 'Entre un code.'; return; }
      var v = await db.rpc('verifier_code', { p_code: code, p_total: totalPanier() });
      if (v.error) { pmsg.textContent = 'Vérification impossible pour le moment.'; return; }
      if (!v.data.valide) { pmsg.textContent = v.data.message; return; }
      codePromo = { code: code.toUpperCase(), remise: v.data.remise };
      dessinerPanier();
    });
    pligne.appendChild(pin); pligne.appendChild(pbtn);
    promoZone.appendChild(pligne); promoZone.appendChild(pmsg);
    zb.appendChild(promoZone);
    if (!commandesOuvertes()) {
      zb.appendChild(el('p', '', "Les commandes ouvrent bientôt. Garde ton panier : tu pourras commander dès l'ouverture."));
      return;
    }
    if (!utilisateur) {
      var seConnecter = function () { fermerPanier(); ouvrir(); };
      var bc = el('button', 'btn clair', 'Connexion'); bc.addEventListener('click', seConnecter);
      var bt = el('button', 'btn', 'Terminer ma commande'); bt.addEventListener('click', seConnecter);
      zb.appendChild(bc); zb.appendChild(bt);
      return;
    }
    if (profilOk === false) {
      zb.appendChild(el('p', '', "Complète ton profil pour pouvoir commander."));
      var bp = el('button', 'btn', 'Compléter mon profil');
      bp.addEventListener('click', function () { fermerPanier(); ouvrirProfil(); });
      zb.appendChild(bp);
      return;
    }
    var tel = el('input'); tel.id = 'cmd-tel'; tel.type = 'tel'; tel.placeholder = 'Ton numéro de téléphone';
    var adr = el('input'); adr.id = 'cmd-adr'; adr.type = 'text'; adr.placeholder = 'Adresse de livraison';
    if (profilDonnees) { tel.value = profilDonnees.telephone || ''; adr.value = profilDonnees.adresse || ''; }
    zb.appendChild(tel); zb.appendChild(adr);
    var o1 = el('label', 'option-paiement'); var r1 = el('input'); r1.type = 'radio'; r1.name = 'paiement'; r1.checked = true;
    o1.appendChild(r1); o1.appendChild(document.createTextNode(' Mobile money (Wave / Orange Money)'));
    var o2 = el('label', 'option-paiement grise'); var r2 = el('input'); r2.type = 'radio'; r2.name = 'paiement'; r2.disabled = true;
    o2.appendChild(r2); o2.appendChild(document.createTextNode(' Paiement automatique CinetPay (bientôt)'));
    zb.appendChild(o1); zb.appendChild(o2);
    var bv = el('button', 'btn', 'Terminer ma commande');
    bv.addEventListener('click', commander);
    zb.appendChild(bv);
  }

  async function commander() {
    if (!commandesOuvertes() || profilOk === false) { return; }
    var m = $('panier-msg');
    var tel = $('cmd-tel').value.trim(), adr = $('cmd-adr').value.trim();
    if (tel.length < 8 || adr.length < 5) { m.textContent = 'Entre ton téléphone et ton adresse.'; m.className = 'err'; return; }
    var L = lignes();
    if (!L.length || !db) return;
    // Le serveur recalcule les prix : le navigateur n'envoie que les articles et les choix
    var articles = L.map(function (l) { return { id: l.p.id, qte: l.qte, taille: l.taille, couleur: l.couleur }; });
    var r = await db.rpc('passer_commande', { p_articles: articles, p_telephone: tel, p_adresse: adr, p_code: codePromo ? codePromo.code : null });
    if (r.error) { m.textContent = 'La commande a échoué : ' + r.error.message; m.className = 'err'; return; }
    panier = {}; sauverPanier(); majBadge();
    codePromo = null;
    confirmation(r.data.id, r.data.total);
  }

  function confirmation(id, total) {
    var z = $('panier-lignes');
    z.textContent = ''; $('panier-bas').textContent = ''; $('panier-msg').textContent = ''; $('panier-msg').className = '';
    z.appendChild(el('p', 'total-l', 'Commande n°' + id + ' enregistrée ✓'));
    z.appendChild(el('p', '', 'Pour la valider, envoie ' + fcfa(total) + ' par mobile money en indiquant le numéro de commande ' + id + ' en référence.'));
    var wave = cfg('NUMERO_WAVE'), om = cfg('NUMERO_ORANGE');
    if (wave) z.appendChild(el('p', '', 'Wave : ' + wave));
    if (om) z.appendChild(el('p', '', 'Orange Money : ' + om));
    if (!wave && !om) z.appendChild(el('p', '', 'Nous te contacterons au numéro indiqué pour finaliser le paiement.'));
    z.appendChild(el('p', '', 'Ta commande sera préparée dès la réception du paiement.'));
  }

  function ouvrirPanier() { $('panier-fond').classList.add('open'); $('panier-titre').textContent = 'Mon panier'; $('panier-msg').textContent = ''; dessinerPanier(); }
  function fermerPanier() { $('panier-fond').classList.remove('open'); }

  document.querySelectorAll('.cat').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); filtre = a.getAttribute('data-cat'); afficherProduits(true); });
  });
  $('btn-panier').addEventListener('click', ouvrirPanier);
  $('panier-fermer').addEventListener('click', fermerPanier);
  $('panier-fond').addEventListener('click', function (e) { if (e.target === $('panier-fond')) fermerPanier(); });

  if (db) {
    db.auth.getSession().then(function (r) { utilisateur = r.data.session ? r.data.session.user : null; majMenuCompte(); setTimeout(verifierProfil, 0); chargerFavoris(); });
    db.auth.onAuthStateChange(function (evt, session) {
      utilisateur = session ? session.user : null; majMenuCompte(); setTimeout(verifierProfil, 0); chargerFavoris();
      if ($('panier-fond').classList.contains('open')) dessinerPanier();
    });
  }

  // ===== Profil après la création du compte =====
  var profilOk = null, profilVerifPour = null, profilDonnees = null;
  var AGE_MIN = (typeof AGE_MINIMUM === 'number') ? AGE_MINIMUM : 16;
  $('profil-age').textContent = 'Tu dois avoir ' + AGE_MIN + ' ans ou plus pour utiliser MENELKI.';

  (function remplirDate() {
    var mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    function opt(sel, valeur, texte) { var o = document.createElement('option'); o.value = valeur; o.textContent = texte; sel.appendChild(o); }
    opt($('dob-j'), '', 'Jour'); opt($('dob-m'), '', 'Mois'); opt($('dob-a'), '', 'Année');
    for (var j = 1; j <= 31; j++) { opt($('dob-j'), j, String(j)); }
    mois.forEach(function (n, i) { opt($('dob-m'), i + 1, n); });
    var an = new Date().getFullYear();
    for (var a = an; a >= an - 100; a--) { opt($('dob-a'), a, String(a)); }
  })();

  function ageDe(j, m, a) {
    var n = new Date(), ans = n.getFullYear() - a;
    if (n.getMonth() + 1 < m || (n.getMonth() + 1 === m && n.getDate() < j)) { ans--; }
    return ans;
  }

  function ouvrirProfil() {
    if (!utilisateur) { return; }
    fermer();
    var md = utilisateur.user_metadata || {};
    $('profil-email').textContent = utilisateur.email || '';
    $('profil-prenom').value = md.prenom || md.given_name || '';
    $('profil-nom').value = md.family_name || '';
    $('profil-msg').textContent = ''; $('profil-msg').className = '';
    $('profil-valider').disabled = false;
    var p = profilDonnees;
    $('profil-titre').textContent = p ? 'Mes informations' : 'On adore les nouveaux visages';
    $('profil-intro').textContent = p ? '' : 'Finalise ton profil pour pouvoir commander.';
    $('profil-valider').textContent = p ? 'Enregistrer' : 'Rejoindre MENELKI';
    if (p) {
      $('profil-prenom').value = p.prenom || ''; $('profil-nom').value = p.nom || '';
      var dn = (p.date_naissance || '').split('-');
      if (dn.length === 3) { $('dob-a').value = dn[0]; $('dob-m').value = String(Number(dn[1])); $('dob-j').value = String(Number(dn[2])); }
      document.querySelectorAll('#profil-fond .interets input').forEach(function (i) { i.checked = (p.interets || []).indexOf(i.value) >= 0; });
      $('profil-consent').checked = !!p.consent_marketing;
    }
    $('profil-fond').classList.add('open');
  }
  function fermerProfil() { $('profil-fond').classList.remove('open'); }

  async function verifierProfil() {
    if (!db || !utilisateur) { profilOk = null; profilVerifPour = null; profilDonnees = null; return; }
    if (profilVerifPour === utilisateur.id) { return; }
    profilVerifPour = utilisateur.id;
    var r = await db.from('profils').select('*').eq('user_id', utilisateur.id).maybeSingle();
    if (r.error) { profilOk = null; return; }
    profilOk = !!r.data;
    profilDonnees = r.data || null;
    if (!profilOk && !modeRecup) { ouvrirProfil(); }
  }

  async function validerProfil() {
    var msg = $('profil-msg');
    msg.className = 'err';
    var prenom = $('profil-prenom').value.trim(), nom = $('profil-nom').value.trim();
    var j = Number($('dob-j').value), m = Number($('dob-m').value), a = Number($('dob-a').value);
    if (!prenom || !nom) { msg.textContent = 'Entre ton prénom et ton nom.'; return; }
    if (!j || !m || !a) { msg.textContent = 'Entre ta date de naissance.'; return; }
    var d = new Date(a, m - 1, j);
    if (d.getFullYear() !== a || d.getMonth() !== m - 1 || d.getDate() !== j) { msg.textContent = 'Date de naissance invalide.'; return; }
    if (ageDe(j, m, a) < AGE_MIN) {
      msg.textContent = 'Désolé, tu dois avoir ' + AGE_MIN + ' ans ou plus pour utiliser MENELKI.';
      $('profil-valider').disabled = true;
      if (db) { await db.auth.signOut(); }
      return;
    }
    var interets = Array.prototype.map.call(document.querySelectorAll('#profil-fond .interets input:checked'), function (c) { return c.value; });
    var iso = a + '-' + ('0' + m).slice(-2) + '-' + ('0' + j).slice(-2);
    var accord = $('profil-consent').checked;
    $('profil-valider').disabled = true;
    var r = await db.from('profils').upsert({
      user_id: utilisateur.id, prenom: prenom, nom: nom, date_naissance: iso, interets: interets,
      consent_marketing: accord, consent_date: accord ? new Date().toISOString() : null
    }, { onConflict: 'user_id' });
    if (r.error) { msg.textContent = 'Enregistrement impossible : ' + r.error.message; $('profil-valider').disabled = false; return; }
    await db.auth.updateUser({ data: { prenom: prenom } });
    var edition = !!profilDonnees;
    profilDonnees = Object.assign({}, profilDonnees || {}, { prenom: prenom, nom: nom, date_naissance: iso, interets: interets, consent_marketing: accord });
    profilOk = true;
    msg.className = 'ok'; msg.textContent = edition ? 'Informations enregistrées.' : 'Bienvenue chez MENELKI.';
    setTimeout(fermerProfil, 1200);
  }

  $('profil-fermer').addEventListener('click', fermerProfil);
  $('espace-fermer').addEventListener('click', fermerEspace);
  $('espace-fond').addEventListener('click', function (e) { if (e.target === $('espace-fond')) { fermerEspace(); } });
  $('profil-valider').addEventListener('click', validerProfil);

  // ===== Espace compte =====
  function ligne(nom, texte, action) {
    var b = el('button', 'esp-ligne'); b.appendChild(icone(nom)); b.appendChild(document.createTextNode(texte));
    b.addEventListener('click', action); return b;
  }
  function corps() { var c = $('espace-corps'); c.textContent = ''; return c; }
  function boutonRetour(c) { var b = el('button', 'esp-retour', '← Mon compte'); b.addEventListener('click', vueAccueil); c.appendChild(b); }
  function ouvrirEspace(vue) { if (!utilisateur) { return; } fermer(); $('espace-fond').classList.add('open'); (vue || vueAccueil)(); }
  function fermerEspace() { $('espace-fond').classList.remove('open'); $('espace-fond').classList.remove('recup'); }

  // ===== Nouveau mot de passe (lien « mot de passe oublié » reçu par e-mail) =====
  var modeRecup = false;
  function ouvrirNouveauMdp() {
    if (!db) { return; }
    modeRecup = true;
    fermerProfil();
    fermer();
    var c = corps();
    c.appendChild(el('h3', '', 'Nouveau mot de passe'));
    c.appendChild(el('p', 'profil-note', "Choisis un nouveau mot de passe d'au moins 8 caractères. Si ton iPhone te propose un mot de passe fort, accepte de l'enregistrer dans ton trousseau."));
    var a = champ(c, 'password', 'Nouveau mot de passe', ''); a.autocomplete = 'new-password';
    var b = champ(c, 'password', 'Confirme le mot de passe', ''); b.autocomplete = 'new-password';
    var voir = el('label', 'esp-case'), cb = el('input'); cb.type = 'checkbox';
    voir.appendChild(cb); voir.appendChild(document.createTextNode(' Afficher les mots de passe'));
    cb.addEventListener('change', function () { a.type = cb.checked ? 'text' : 'password'; b.type = a.type; });
    var etat = el('p', 'esp-etat'), ok = el('button', 'btn', 'Enregistrer');
    ok.addEventListener('click', async function () {
      etat.className = 'esp-etat err';
      if (a.value.length < 8) { etat.textContent = '8 caractères minimum.'; return; }
      if (a.value !== b.value) { etat.textContent = 'Les deux mots de passe ne sont pas identiques.'; return; }
      ok.disabled = true;
      var r = await db.auth.updateUser({ password: a.value });
      if (r.error) { ok.disabled = false; etat.textContent = 'Impossible de changer le mot de passe : ' + r.error.message; return; }
      etat.className = 'esp-etat ok'; etat.textContent = 'Mot de passe modifié. Tu es connecté.';
      try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {}
      setTimeout(function () { modeRecup = false; fermerEspace(); }, 1800);
    });
    c.appendChild(voir); c.appendChild(ok); c.appendChild(etat);
    $('espace-fond').classList.add('open'); $('espace-fond').classList.add('recup');
  }
  async function chargerProfil() {
    if (!db || !utilisateur) { return; }
    var r = await db.from('profils').select('*').eq('user_id', utilisateur.id).maybeSingle();
    if (!r.error) { profilDonnees = r.data || null; }
  }
  function champ(c, type, texte, valeur) { var i = el('input'); i.type = type; i.placeholder = texte; i.value = valeur || ''; c.appendChild(i); return i; }

  async function vueAccueil() {
    await chargerProfil();
    var c = corps();
    var md = utilisateur.user_metadata || {}, p = profilDonnees || {};
    var prenom = p.prenom || md.prenom || md.given_name || '', nom = p.nom || md.family_name || '';
    var ini = ((prenom.charAt(0) + nom.charAt(0)) || (utilisateur.email || '?').charAt(0)).toUpperCase();
    c.appendChild(el('div', 'avatar', ini));
    c.appendChild(el('p', 'esp-salut', 'Salut,'));
    c.appendChild(el('p', 'esp-nom', (prenom + ' ' + nom).trim() || utilisateur.email));
    c.appendChild(ligne('colis', 'Mes commandes', vueCommandes));
    c.appendChild(ligne('retour', 'Demande de retour', vueRetour));
    c.appendChild(ligne('info', "Besoin d'aide ?", function () { fermerEspace(); $('chat-box').classList.add('open'); }));
    c.appendChild(el('div', 'esp-sep'));
    c.appendChild(ligne('user', 'Mes informations', function () { fermerEspace(); ouvrirProfil(); }));
    c.appendChild(ligne('home', "Carnet d'adresses", vueAdresse));
    c.appendChild(ligne('card', 'Moyens de paiement', vuePaiement));
    c.appendChild(ligne('chat', 'Préférences de contact', vueContact));
    c.appendChild(ligne('users', 'Comptes sociaux', vueSocial));
    c.appendChild(el('div', 'esp-sep'));
    c.appendChild(ligne('logout', 'Se déconnecter', async function () { if (db) { await db.auth.signOut(); } fermerEspace(); }));
  }

  async function vueCommandes() {
    var c = corps(); boutonRetour(c); c.appendChild(el('h3', '', 'Mes commandes'));
    var z = el('div', '', 'Chargement…'); c.appendChild(z);
    var r = await db.from('commandes').select('id,total,statut,cree_le,articles').order('cree_le', { ascending: false });
    z.textContent = '';
    if (r.error) { z.textContent = 'Impossible de charger tes commandes.'; return; }
    if (!r.data.length) { z.textContent = 'Aucune commande pour le moment.'; return; }
    var STATUTS = { en_attente: 'En attente de paiement' };
    r.data.forEach(function (o) {
      var row = el('div', 'ligne-panier');
      row.appendChild(el('span', 'nom-l', 'Commande n°' + o.id + ' · ' + new Date(o.cree_le).toLocaleDateString('fr-FR')));
      row.appendChild(el('span', 'prix-l', fcfa(o.total)));
      z.appendChild(row);
      var det = (o.articles || []).map(function (a) { return a.qte + ' × ' + a.nom + (a.taille ? ' (' + a.taille + ')' : ''); }).join(', ');
      z.appendChild(el('p', 'statut', (STATUTS[o.statut] || o.statut) + (det ? ' · ' + det : '')));
    });
  }

  async function vueRetour() {
    var c = corps(); boutonRetour(c); c.appendChild(el('h3', '', 'Demande de retour'));
    var r = await db.from('commandes').select('id,total').order('cree_le', { ascending: false });
    if (r.error || !r.data.length) { c.appendChild(el('p', '', "Tu n'as pas encore de commande.")); return; }
    var sel = el('select', 'esp-champ');
    r.data.forEach(function (o) { var op = el('option', '', 'Commande n°' + o.id + ' · ' + fcfa(o.total)); op.value = o.id; sel.appendChild(op); });
    var motif = el('select', 'esp-champ');
    ['Mauvaise taille', 'Article défectueux', 'Ne correspond pas à la description', 'Autre'].forEach(function (t) { var op = el('option', '', t); op.value = t; motif.appendChild(op); });
    var msg = el('textarea', 'esp-champ'); msg.rows = 3; msg.placeholder = 'Explique-nous en quelques mots';
    var etat = el('p', 'esp-etat'), ok = el('button', 'btn', 'Envoyer ma demande');
    ok.addEventListener('click', async function () {
      ok.disabled = true;
      var x = await db.from('retours').insert({ commande_id: Number(sel.value), motif: motif.value, message: msg.value.trim() });
      if (x.error) { etat.className = 'esp-etat err'; etat.textContent = 'Envoi impossible : ' + x.error.message; ok.disabled = false; return; }
      etat.className = 'esp-etat ok'; etat.textContent = 'Demande envoyée. Nous te recontactons à son sujet.';
    });
    c.appendChild(sel); c.appendChild(motif); c.appendChild(msg); c.appendChild(ok); c.appendChild(etat);
  }

  function vueAdresse() {
    var c = corps(); boutonRetour(c); c.appendChild(el('h3', '', "Carnet d'adresses"));
    if (!profilDonnees) { c.appendChild(el('p', '', "Complète d'abord tes informations pour enregistrer une adresse.")); return; }
    var tel = champ(c, 'tel', 'Numéro de téléphone', profilDonnees.telephone);
    var adr = champ(c, 'text', 'Adresse de livraison', profilDonnees.adresse);
    var etat = el('p', 'esp-etat'), ok = el('button', 'btn', 'Enregistrer');
    ok.addEventListener('click', async function () {
      var x = await db.from('profils').update({ telephone: tel.value.trim(), adresse: adr.value.trim() }).eq('user_id', utilisateur.id);
      if (x.error) { etat.className = 'esp-etat err'; etat.textContent = 'Enregistrement impossible : ' + x.error.message; return; }
      profilDonnees.telephone = tel.value.trim(); profilDonnees.adresse = adr.value.trim();
      etat.className = 'esp-etat ok'; etat.textContent = 'Adresse enregistrée. Elle sera proposée à ta prochaine commande.';
    });
    c.appendChild(ok); c.appendChild(etat);
  }

  function vuePaiement() {
    var c = corps(); boutonRetour(c); c.appendChild(el('h3', '', 'Moyens de paiement'));
    c.appendChild(el('p', '', "Tu paies par mobile money (Wave / Orange Money) une fois ta commande validée : le numéro et la référence s'affichent à la fin de la commande. Nous ne conservons aucun numéro de carte ni code secret. Le paiement automatique en ligne arrivera bientôt."));
  }

  function vueContact() {
    var c = corps(); boutonRetour(c); c.appendChild(el('h3', '', 'Préférences de contact'));
    if (!profilDonnees) { c.appendChild(el('p', '', "Complète d'abord tes informations pour choisir tes préférences.")); return; }
    var cb = el('input'); cb.type = 'checkbox'; cb.checked = !!profilDonnees.consent_marketing;
    var lab = el('label', 'esp-case'); lab.appendChild(cb);
    lab.appendChild(document.createTextNode("Je souhaite recevoir les nouveautés et offres de MENELKI par e-mail."));
    var etat = el('p', 'esp-etat'), ok = el('button', 'btn', 'Enregistrer');
    ok.addEventListener('click', async function () {
      var x = await db.from('profils').update({ consent_marketing: cb.checked, consent_date: cb.checked ? new Date().toISOString() : null }).eq('user_id', utilisateur.id);
      if (x.error) { etat.className = 'esp-etat err'; etat.textContent = 'Enregistrement impossible : ' + x.error.message; return; }
      profilDonnees.consent_marketing = cb.checked;
      etat.className = 'esp-etat ok'; etat.textContent = 'Préférence enregistrée.';
    });
    c.appendChild(lab); c.appendChild(ok); c.appendChild(etat);
  }

  function vueSocial() {
    var c = corps(); boutonRetour(c); c.appendChild(el('h3', '', 'Comptes sociaux'));
    var N = { email: 'E-mail et mot de passe', google: 'Google' };
    var ids = (utilisateur.identities || []).map(function (i) { return N[i.provider] || i.provider; });
    c.appendChild(el('p', '', ids.length ? 'Tu te connectes avec : ' + ids.join(', ') + '.' : 'Aucune information de connexion disponible.'));
  }

  // ===== Fiche produit =====
  function accordeon(titre, texte) {
    var w = el('div', 'acc'), t = el('button', 'acc-t', titre);
    t.appendChild(icone('plus'));
    t.addEventListener('click', function () { w.classList.toggle('ouvert'); });
    w.appendChild(t); w.appendChild(el('div', 'acc-c', texte));
    return w;
  }
  function fermerFiche() { $('fiche-fond').classList.remove('open'); }

  function ouvrirFiche(p) {
    var c = $('fiche-corps'); c.textContent = '';
    var cols = p.couleurs || [], tailles = p.tailles || [], ci = p.couleurs_images || {};
    var imgs = ((p.images && p.images.length) ? p.images : (p.image_url ? [p.image_url] : [])).map(urlImage).filter(Boolean);
    var choix = { taille: '', couleur: '' };
    var etat = el('p', 'esp-etat err');

    var gal = el('div', 'galerie');
    if (imgs.length) {
      imgs.forEach(function (u) { var d = el('div', 'gal-img'); var im = el('img'); im.src = u; im.alt = p.nom; im.decoding = 'async'; d.appendChild(im); gal.appendChild(d); });
    } else { var g0 = el('div', 'gal-img'); fondLogo(g0); gal.appendChild(g0); }
    c.appendChild(gal);
    c.appendChild(el('h3', 'fiche-nom', p.nom));
    var pr = el('div', 'fiche-prix', fcfa(p.prix));
    if (p.en_promo && p.ancien_prix) { pr.appendChild(el('s', 'ancien', fcfa(p.ancien_prix))); }
    c.appendChild(pr);

    if (cols.length) {
      var libelle = el('div', 'fiche-lbl', 'Couleurs :');
      c.appendChild(libelle);
      var sw = el('div', 'swatches');
      cols.forEach(function (nom) {
        var b = el('button', 'sw'), u = urlImage(ci[nom]);
        if (u) { var im = el('img'); im.src = u; im.alt = nom; b.appendChild(im); } else { b.textContent = nom; b.classList.add('sw-texte'); }
        b.setAttribute('aria-label', nom);
        b.addEventListener('click', function () {
          choix.couleur = nom; libelle.textContent = 'Couleurs : ' + nom; etat.textContent = '';
          sw.querySelectorAll('.sw').forEach(function (x) { x.classList.remove('actif'); });
          b.classList.add('actif');
          var idx = imgs.indexOf(u);
          if (u && idx >= 0) { gal.scrollTo({ left: idx * gal.clientWidth, behavior: 'smooth' }); }
        });
        sw.appendChild(b);
      });
      c.appendChild(sw);
    }

    if (tailles.length) {
      c.appendChild(el('div', 'fiche-lbl', 'Taille'));
      var grille = el('div', 'tailles');
      tailles.forEach(function (t) {
        var b = el('button', 'taille', t);
        b.addEventListener('click', function () {
          choix.taille = t; etat.textContent = '';
          grille.querySelectorAll('.taille').forEach(function (x) { x.classList.remove('actif'); });
          b.classList.add('actif');
        });
        grille.appendChild(b);
      });
      c.appendChild(grille);
      var guide = cfg('INFO_TAILLES');
      if (guide) {
        var lien = el('button', 'lien-guide', 'Guide des tailles'), txt = el('p', 'guide-txt', guide);
        txt.style.display = 'none';
        lien.addEventListener('click', function () { txt.style.display = (txt.style.display === 'none') ? 'block' : 'none'; });
        c.appendChild(lien); c.appendChild(txt);
      }
    }

    var ajout = el('button', 'btn', 'Ajouter au panier');
    ajout.addEventListener('click', function () {
      if (tailles.length && !choix.taille) { etat.textContent = 'Choisis ta taille.'; return; }
      if (cols.length && !choix.couleur) { etat.textContent = 'Choisis ta couleur.'; return; }
      ajouter(p.id, choix.taille, choix.couleur);
      ajout.textContent = 'Ajouté au panier';
      setTimeout(function () { ajout.textContent = 'Ajouter au panier'; }, 1500);
    });
    var fb = el('button', 'btn clair fav-texte', favori(p.id) ? 'Retirer des favoris' : 'Ajouter aux favoris');
    fb.setAttribute('data-fav-id', p.id);
    fb.addEventListener('click', function () { basculerFavori(p); });
    c.appendChild(fb);
    c.appendChild(ajout); c.appendChild(etat);

    var liv = cfg('INFO_LIVRAISON');
    c.appendChild(accordeon('Description et coupe', p.description || 'Description à venir.'));
    c.appendChild(accordeon('Matériaux et entretien', p.matieres || 'Informations à venir.'));
    c.appendChild(accordeon('Livraison et paiement', (liv ? liv + ' ' : 'Les informations de livraison sont dans nos conditions de vente. ') + 'Paiement par mobile money (Wave / Orange Money).'));

    var autres = produits.filter(function (x) { return x.id !== p.id && x.categorie !== p.categorie; }).slice(0, 4);
    if (autres.length) {
      c.appendChild(el('h3', 'fiche-sous', 'À porter avec'));
      var rail = el('div', 'rail');
      autres.forEach(function (x) { rail.appendChild(carte(x)); });
      c.appendChild(rail);
    }
    $('fiche-fond').classList.add('open');
    $('fiche-fond').querySelector('.compte').scrollTop = 0;
  }
  $('fiche-fermer').addEventListener('click', fermerFiche);

  function majMenuCompte() {
    var u = utilisateur;
    var prenom = u ? ((u.user_metadata && u.user_metadata.prenom) ? u.user_metadata.prenom.split(' ')[0] : u.email) : '';
    $('m-bienvenue').textContent = u ? 'Salut ' + prenom : 'Bienvenue chez MENELKI';
    $('m-invite').style.display = u ? 'none' : 'block';
    $('m-connecte').style.display = u ? 'block' : 'none';
  }

  // ===== Menu latéral et navigation =====
  function ouvrirMenu() { $('menu').classList.add('open'); $('menu-fond').classList.add('open'); document.body.classList.add('menu-ouvert'); }
  function fermerMenu() { $('menu').classList.remove('open'); $('menu-fond').classList.remove('open'); document.body.classList.remove('menu-ouvert'); }
  function allerA(id) {
    filtre = null; terme = ''; $('champ-recherche').value = '';
    afficherProduits();
    var cible = $(id);
    if (!cible || cible.style.display === 'none') { cible = $('bandes'); }
    cible.scrollIntoView({ behavior: 'smooth' });
  }

  $('btn-menu').addEventListener('click', ouvrirMenu);
  $('menu-fermer').addEventListener('click', fermerMenu);
  $('menu-fond').addEventListener('click', fermerMenu);
  document.querySelectorAll('[data-go]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var id = a.getAttribute('data-go');
      var dansMenu = !!a.closest('#menu');
      if (dansMenu) { fermerMenu(); }
      setTimeout(function () { if (id === 'haut') { window.scrollTo({ top: 0, behavior: 'smooth' }); } else { allerA(id); } }, dansMenu ? 60 : 0);
    });
  });
  document.querySelectorAll('#menu [data-cat]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var cat = a.getAttribute('data-cat');
      fermerMenu();
      setTimeout(function () { filtre = cat; afficherProduits(true); }, 60);
    });
  });
  document.querySelectorAll('.acc-t').forEach(function (b) {
    b.addEventListener('click', function () { b.parentNode.classList.toggle('ouvert'); });
  });
  $('m-connexion').addEventListener('click', function () { fermerMenu(); choisirMode('connexion'); ouvrir(); });
  $('m-inscription').addEventListener('click', function () { fermerMenu(); choisirMode('inscription'); ouvrir(); });
  $('m-moncompte').addEventListener('click', function () { fermerMenu(); if (utilisateur) { ouvrirEspace(); } else { ouvrir(); } });
  $('m-commandes').addEventListener('click', function () {
    fermerMenu();
    if (!utilisateur) { choisirMode('connexion'); ouvrir(); } else { ouvrirEspace(vueCommandes); }
  });
  $('m-deco').addEventListener('click', async function () { if (db) { await db.auth.signOut(); } fermerMenu(); });

  // Réseaux sociaux : affichés seulement si le lien est renseigné dans config.js
  var vusMenu = 0, vusPied = 0;
  [['insta', 'LIEN_INSTAGRAM'], ['tt', 'LIEN_TIKTOK'], ['yt', 'LIEN_YOUTUBE'], ['fb', 'LIEN_FACEBOOK']].forEach(function (x) {
    var lien = cfg(x[1]);
    ['m-', 'p-'].forEach(function (pref) {
      var a = $(pref + x[0]);
      if (lien.indexOf('https://') === 0) { a.href = lien; a.target = '_blank'; a.rel = 'noopener'; if (pref === 'm-') { vusMenu++; } else { vusPied++; } }
      else { a.style.display = 'none'; }
    });
  });
  if (!vusMenu) { $('m-reseaux').style.display = 'none'; }
  if (!vusPied) { $('p-reseaux-bloc').style.display = 'none'; }

  // ===== Cookies =====
  var choixCookies = null;
  try { choixCookies = localStorage.getItem('mk_cookies'); } catch (e) {}
  window.cookiesAcceptes = (choixCookies === 'accepte');
  if (!choixCookies) { setTimeout(function () { $('cookies').classList.add('visible'); }, 3600); }
  function repondreCookies(valeur) {
    try { localStorage.setItem('mk_cookies', valeur); } catch (e) {}
    window.cookiesAcceptes = (valeur === 'accepte');
    $('cookies').classList.remove('visible');
  }
  $('cookies-ok').addEventListener('click', function () { repondreCookies('accepte'); });
  $('cookies-non').addEventListener('click', function () { repondreCookies('refuse'); });
  $('gerer-cookies').addEventListener('click', function (e) {
    e.preventDefault();
    try { localStorage.removeItem('mk_cookies'); } catch (er) {}
    $('cookies').classList.add('visible');
  });

  if (!commandesOuvertes()) {
    var bandeau = document.querySelector('.defile');
    if (bandeau) { bandeau.textContent = 'Ouverture bientôt · Inscris-toi pour être prévenu(e) · MENELKI · Wear your story'; }
  }

  // ===== Newsletter =====
  $('news-btn').addEventListener('click', async function () {
    var m = $('news-msg'), mail = $('news-email').value.trim().toLowerCase();
    m.className = 'news-msg err';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { m.textContent = 'Entre une adresse e-mail valide.'; return; }
    if (!db) { m.textContent = 'Inscription indisponible pour le moment.'; return; }
    var r = await db.from('abonnes').insert({ email: mail });
    if (r.error && r.error.code !== '23505') { m.textContent = 'Inscription impossible pour le moment.'; return; }
    m.className = 'news-msg ok'; m.textContent = 'Merci, bienvenue chez MENELKI.'; $('news-email').value = '';
  });

  // ===== Assistant automatique =====
  var zoneChat = $('chat-body');
  function norm(t) { return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function bulle(texte, qui) {
    var b = el('div', qui === 'moi' ? 'bulle moi' : 'bulle', texte);
    zoneChat.appendChild(b); zoneChat.scrollTop = zoneChat.scrollHeight; return b;
  }
  function actions(liste) {
    var d = el('div', 'chat-actions');
    liste.forEach(function (a) { var b = el('button', 'chip', a.texte); b.addEventListener('click', a.fn); d.appendChild(b); });
    zoneChat.appendChild(d); zoneChat.scrollTop = zoneChat.scrollHeight;
  }
  function fermerChat() { $('chat-box').classList.remove('open'); }
  function aller(page) { return function () { window.location.href = page; }; }
  var PUCES = [
    { texte: 'Nouveautés', fn: function () { demander('nouveautés'); } },
    { texte: 'Promotions', fn: function () { demander('promotions'); } },
    { texte: 'Livraison', fn: function () { demander('livraison'); } },
    { texte: 'Paiement', fn: function () { demander('paiement'); } },
    { texte: 'Retours', fn: function () { demander('retours'); } },
    { texte: "Joindre l'équipe", fn: function () { demander('contact'); } }
  ];
  function montrerProduits(liste, intro) {
    if (!liste.length) { bulle("Je n'ai rien trouvé pour le moment. La première collection arrive bientôt."); return; }
    bulle(intro);
    liste.slice(0, 4).forEach(function (p) {
      var b = bulle(p.nom + ' · ' + fcfa(p.prix) + (p.en_promo ? ' (promo)' : ''));
      var ajout = el('button', 'chip', 'Ajouter au panier');
      ajout.addEventListener('click', function () { choisirOptions(p, function () { ajout.textContent = 'Ajouté'; ajout.disabled = true; }); });
      b.appendChild(el('br')); b.appendChild(ajout);
    });
  }
  function contact() {
    var e = cfg('CONTACT_EMAIL'), w = cfg('CONTACT_WHATSAPP');
    if (e || w) { bulle("Tu peux joindre l'équipe : " + [e, w ? 'WhatsApp ' + w : ''].filter(Boolean).join(' · ') + '.'); }
    else { bulle("Les coordonnées de l'équipe sont dans nos mentions légales."); actions([{ texte: 'Mentions légales', fn: aller('mentions-legales.html') }]); }
  }
  var CATS = [
    ['vetements', /(vetement|habit|tshirt|t-shirt|hoodie|pull|pantalon|robe|short|veste|jean|tenue|casquette)/],
    ['chaussures', /(chaussure|basket|sneaker|soulier|sandale)/],
    ['bijoux', /(bijou|bague|collier|boucle)/],
    ['bracelets', /(bracelet)/]
  ];

  function repondre(q) {
    var a = function (re) { return re.test(q); };
    var nombres = (q.replace(/[ .]/g, '').match(/\d+/g) || []).map(Number).filter(function (n) { return n >= 500; });
    if (a(/^(bonjour|bonsoir|salut|coucou|hello|hey)/)) { bulle('Salut ! Que puis-je faire pour toi ?'); actions(PUCES); return; }
    if (a(/(merci|parfait|genial)/)) { bulle('Avec plaisir ! Autre chose ?'); return; }
    if (a(/(humain|conseiller|joindre|contact|whatsapp|telephone|appeler|equipe)/)) { contact(); return; }
    if (nombres.length && a(/(moins|budget|max|jusqu|fcfa|cfa|francs|pas cher)/)) {
      var m = nombres[0];
      montrerProduits(produits.filter(function (p) { return p.prix <= m; }), "Voici ce que j'ai jusqu'à " + fcfa(m) + ' :');
      return;
    }
    if (a(/(promo|reduction|solde|remise|bon plan)/)) {
      var pr = produits.filter(function (p) { return p.en_promo; });
      if (pr.length) { montrerProduits(pr, 'Nos promotions du moment :'); }
      else { montrerProduits(produits, "Pas de promo pour l'instant, mais voici nos articles :"); }
      return;
    }
    if (a(/(nouveau|nouveaute|dernier|arrivage)/)) { montrerProduits(produits, 'Nos dernières nouveautés :'); return; }
    for (var i = 0; i < CATS.length; i++) {
      if (a(CATS[i][1])) {
        var cat = CATS[i][0];
        montrerProduits(produits.filter(function (p) { return p.categorie === cat; }), 'Voici nos ' + NOMS_CAT[cat].toLowerCase() + ' :');
        actions([{ texte: 'Voir toute la catégorie', fn: function () { fermerChat(); filtre = cat; afficherProduits(true); } }]);
        return;
      }
    }
    if (a(/(livraison|livrer|delai|expedi|frais de port|international)/)) {
      var l = cfg('INFO_LIVRAISON');
      bulle(l ? 'Livraison : ' + l : 'Les zones, délais et frais de livraison sont détaillés dans nos conditions de vente.');
      actions([{ texte: 'Conditions de vente', fn: aller('conditions-de-vente.html') }]); return;
    }
    if (a(/(paiement|payer|paye|wave|orange|mobile money|momo|cinetpay|carte)/)) {
      bulle("Tu paies par mobile money (Wave ou Orange Money) : une fois ta commande validée, on t'indique le numéro et la référence à utiliser. Le paiement automatique en ligne arrive bientôt." + (commandesOuvertes() ? '' : ' Les commandes ouvrent bientôt.'));
      return;
    }
    if (a(/(retour|rembours|echange|renvoyer|defectueu)/)) {
      var r = cfg('INFO_RETOURS');
      bulle("Pour un retour, connecte-toi puis ouvre Mon compte > Demande de retour." + (r ? ' ' + r : ''));
      actions([{ texte: 'Ouvrir mon compte', fn: function () { fermerChat(); if (utilisateur) { ouvrirEspace(); } else { ouvrir(); } } }]); return;
    }
    if (a(/(commande|suivi|statut|colis)/)) {
      bulle('Retrouve toutes tes commandes et leur statut dans Mon compte > Mes commandes.');
      actions([{ texte: 'Mes commandes', fn: function () { fermerChat(); if (utilisateur) { ouvrirEspace(vueCommandes); } else { ouvrir(); } } }]); return;
    }
    if (a(/(compte|inscri|connexion|connecter|mot de passe|google)/)) {
      bulle("Touche l'icône de profil en haut de la page pour te connecter ou créer un compte, avec ton e-mail ou ton compte Google.");
      actions([{ texte: 'Créer un compte', fn: function () { fermerChat(); choisirMode('inscription'); ouvrir(); } }]); return;
    }
    if (a(/(confidential|donnee|cookie|vie privee|rgpd)/)) {
      bulle('Tout est expliqué dans notre politique de confidentialité.');
      actions([{ texte: 'Politique de confidentialité', fn: aller('confidentialite.html') }]); return;
    }
    if (a(/(taille|pointure|guide)/)) { bulle('Pour une question de taille ou de pointure sur un article précis, écris directement à l\'équipe.'); contact(); return; }
    if (a(/(prix|combien|tarif|cher)/)) { montrerProduits(produits, 'Voici quelques articles avec leur prix :'); return; }
    bulle("Je ne suis pas sûr de bien comprendre. Je peux t'aider sur les produits, la livraison, le paiement ou les retours, ou te mettre en contact avec l'équipe.");
    actions(PUCES);
  }

  function demander(texte) {
    texte = (texte || '').trim();
    if (!texte) { return; }
    bulle(texte, 'moi');
    var q = norm(texte);
    setTimeout(function () { repondre(q); }, 350);
  }
  $('chat-btn').addEventListener('click', function () { $('chat-box').classList.toggle('open'); });
  $('chat-envoyer').addEventListener('click', function () { var i = $('chat-input'); var t = i.value; i.value = ''; demander(t); });
  $('chat-input').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('chat-envoyer').click(); } });
  $('chat-fermer').addEventListener('click', fermerChat);
  bulle("Salut ! Je suis l'assistant automatique de MENELKI. Je peux t'aider à trouver un article et répondre sur la livraison, le paiement ou les retours.");
  actions(PUCES);

  // ===== Accessibilité et référencement =====
  if (!commandesOuvertes()) {
    var robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex';
    document.head.appendChild(robots);
  }
  ['compte-fond', 'espace-fond', 'profil-fond', 'panier-fond', 'fiche-fond', 'options-fond', 'favoris-fond'].forEach(function (id) {
    $(id).setAttribute('role', 'dialog'); $(id).setAttribute('aria-modal', 'true');
  });
  document.querySelectorAll('[role=button]').forEach(function (b) {
    b.setAttribute('tabindex', '0');
    b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); } });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') { return; }
    ['options-fond', 'fiche-fond', 'profil-fond', 'espace-fond', 'panier-fond', 'compte-fond', 'favoris-fond', 'menu', 'menu-fond', 'chat-box'].forEach(function (id) { $(id).classList.remove('open'); });
    document.body.classList.remove('menu-ouvert');
  });

  // ===== Favoris =====
  var favoris = {};
  function favori(id) { return !!favoris[id]; }

  function majCoeurs() {
    document.querySelectorAll('[data-fav]').forEach(function (b) {
      var on = favori(b.getAttribute('data-fav'));
      b.classList.toggle('actif', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    document.querySelectorAll('.fav-texte').forEach(function (b) {
      b.textContent = favori(b.getAttribute('data-fav-id')) ? 'Retirer des favoris' : 'Ajouter aux favoris';
    });
    var n = Object.keys(favoris).length;
    $('nb-favoris').textContent = n ? String(n) : '';
  }

  async function chargerFavoris() {
    favoris = {};
    if (db && utilisateur) {
      var r = await db.from('favoris').select('produit_id');
      if (!r.error) { (r.data || []).forEach(function (x) { favoris[x.produit_id] = true; }); }
    }
    majCoeurs();
    if (produits.length) { afficherProduits(); }
  }

  async function basculerFavori(p) {
    if (!utilisateur || !db) { ouvrir(); return; }
    if (favori(p.id)) {
      var r = await db.from('favoris').delete().eq('user_id', utilisateur.id).eq('produit_id', p.id);
      if (r.error) { return; }
      delete favoris[p.id];
    } else {
      var x = await db.from('favoris').insert({ user_id: utilisateur.id, produit_id: p.id });
      if (x.error) { return; }
      favoris[p.id] = true;
    }
    majCoeurs();
  }

  function ouvrirFavoris() {
    if (!utilisateur) { ouvrir(); return; }
    var manquantsFav = idsManquants(Object.keys(favoris));
    if (manquantsFav.length) { chargerProduitsIds(manquantsFav).then(ouvrirFavoris); return; }
    var c = $('favoris-corps'); c.textContent = '';
    var items = produits.filter(function (p) { return favori(p.id); });
    if (!items.length) {
      c.appendChild(el('p', '', 'Aucun favori pour le moment. Touche le cœur d’un article pour le garder ici.'));
    }
    items.forEach(function (p) {
      var row = el('div', 'ligne-panier fav-ligne');
      var inf = el('div', 'nom-l', p.nom);
      inf.appendChild(el('div', 'prix', fcfa(p.prix)));
      var acts = el('div', 'fav-actions');
      var add = el('button', 'btn petit', 'Ajouter au panier');
      add.addEventListener('click', function () { choisirOptions(p); });
      var del = el('button', 'btn clair petit', 'Retirer');
      del.addEventListener('click', function () { basculerFavori(p).then(ouvrirFavoris); });
      acts.appendChild(add); acts.appendChild(del);
      row.appendChild(inf); row.appendChild(acts);
      c.appendChild(row);
    });
    $('favoris-fond').classList.add('open');
  }

  $('btn-favoris').addEventListener('click', ouvrirFavoris);
  $('favoris-fermer').addEventListener('click', function () { $('favoris-fond').classList.remove('open'); });

  // ===== Recherche =====
  $('champ-recherche').addEventListener('input', function () {
    var avant = terme;
    terme = this.value.trim().toLowerCase();
    afficherProduits(!avant && !!terme);
  });
  $('btn-recherche').addEventListener('click', function () {
    var z = $('zone-recherche');
    z.classList.toggle('open');
    if (z.classList.contains('open')) { setTimeout(function () { $('champ-recherche').focus(); }, 200); }
  });

  // ===== Animations : en-tête, progression, parallaxe, apparitions =====
  var entete = $('entete'), progres = $('progres');
  var dernierY = 0, ticking = false;
  var parallaxes = Array.prototype.slice.call(document.querySelectorAll('.px'));

  function auDefilement() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    var haut = document.documentElement.scrollHeight - window.innerHeight;
    progres.style.transform = 'scaleX(' + (haut > 0 ? Math.min(1, y / haut) : 0) + ')';
    entete.classList.toggle('fond', y > 30);
    var rechercheOuverte = $('zone-recherche').classList.contains('open');
    if (y > 260 && y > dernierY + 6 && !rechercheOuverte) { entete.classList.add('cache'); }
    else if (y < dernierY - 6 || y <= 260) { entete.classList.remove('cache'); }
    dernierY = y;
    if (!reduit) {
      var h = window.innerHeight;
      parallaxes.forEach(function (im) {
        var r = im.parentNode.getBoundingClientRect();
        if (r.bottom < -50 || r.top > h + 50) { return; }
        var p = ((r.top + r.height / 2) - h / 2) / h;
        im.style.setProperty('--py', Math.max(-1, Math.min(1, p)) * -26 + 'px');
      });
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; window.requestAnimationFrame(auDefilement); } }, { passive: true });
  window.addEventListener('resize', auDefilement);
  auDefilement();

  document.querySelectorAll('.revele, .revele-img').forEach(function (e) {
    if (observe) { observe.observe(e); } else { e.classList.add('visible'); }
  });
  if (!observe) { document.querySelectorAll('.cat, .look-cadre').forEach(function (e) { e.classList.add('visible'); }); }

  chargerProduits();
})();
