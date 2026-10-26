// Remplit les pages légales avec les valeurs de config.js
(function () {
  function valeur(nom) {
    if (nom === 'CONTACT') {
      var c = [];
      if (typeof CONTACT_EMAIL === 'string' && CONTACT_EMAIL) { c.push(CONTACT_EMAIL); }
      if (typeof CONTACT_WHATSAPP === 'string' && CONTACT_WHATSAPP) { c.push('WhatsApp ' + CONTACT_WHATSAPP); }
      return c.join(' · ');
    }
    var v = window[nom];
    return (typeof v === 'string') ? v : '';
  }
  document.querySelectorAll('[data-cfg]').forEach(function (e) {
    var v = valeur(e.getAttribute('data-cfg'));
    if (v) { e.textContent = v; }
  });
  var ligneNumero = document.getElementById('li-numero');
  if (ligneNumero && valeur('EDITEUR_NUMERO')) { ligneNumero.style.display = 'list-item'; }

  var contact = document.getElementById('contact');
  if (contact && valeur('CONTACT')) { contact.textContent = valeur('CONTACT'); }

  var reset = document.getElementById('cookies-reset');
  if (reset) {
    reset.addEventListener('click', function () {
      try { localStorage.removeItem('mk_cookies'); } catch (e) {}
      window.location.href = 'index.html';
    });
  }
})();
