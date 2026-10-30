// MENELKI – installation en application (page d'accueil de l'iPhone) et mode hors connexion
(function () {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
  var invite = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); invite = e;
    document.dispatchEvent(new Event('mk-installable'));
  });
  window.addEventListener('appinstalled', function () { invite = null; document.dispatchEvent(new Event('mk-installee')); });
  window.MKPWA = {
    installee: function () {
      try { return navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches); } catch (e) { return false; }
    },
    ios: function () { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); },
    installable: function () { return !!invite; },
    installer: function () {
      if (!invite) { return Promise.resolve(false); }
      var i = invite; invite = null;
      i.prompt();
      return i.userChoice.then(function (c) { return c && c.outcome === 'accepted'; });
    }
  };
})();
