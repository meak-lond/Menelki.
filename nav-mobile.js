// MENELKI, navigation mobile : barre d'onglets en bas et bouton « Voir le panier »
(function () {
  function $(id) { return document.getElementById(id); }
  function fcfa(n) { return Number(n).toLocaleString('fr-FR') + ' FCFA'; }
  function relais(idBouton, idCible) {
    var b = $(idBouton);
    if (!b) { return; }
    b.addEventListener('click', function () { var c = $(idCible); if (c) { c.click(); } });
  }
  relais('ob-favoris', 'btn-favoris');
  relais('ob-panier', 'btn-panier');
  relais('ob-compte', 'btn-compte');
  relais('pill-panier', 'btn-panier');

  document.addEventListener('mk-panier', function (e) {
    var d = e.detail || {};
    var n = d.n || 0;
    if ($('ob-nb')) { $('ob-nb').textContent = n ? String(n) : ''; }
    var pill = $('pill-panier');
    if (pill) {
      pill.hidden = !n;
      $('pill-n').textContent = 'Voir le panier · ' + n;
      $('pill-total').textContent = fcfa(d.total || 0);
    }
    document.body.classList.toggle('a-pill', !!n);
  });

  var dernierY = 0;
  function barres(y) {
    if (y > 260 && y > dernierY + 6) { document.body.classList.add('barres-cachees'); }
    else if (y < dernierY - 6 || y <= 260) { document.body.classList.remove('barres-cachees'); }
    dernierY = y;
  }
  function suivre() {
    var haut = $('haut');
    var seuil = haut ? haut.offsetHeight * 0.6 : 300;
    var y = document.body.scrollTop;
    barres(y);
    var bas = y > seuil;
    if ($('ob-accueil')) { $('ob-accueil').classList.toggle('actif', !bas); }
    if ($('ob-boutique')) { $('ob-boutique').classList.toggle('actif', bas); }
  }
  document.body.addEventListener('scroll', suivre, { passive: true });
  suivre();
})();
