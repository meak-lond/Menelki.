// MENELKI – service worker : permet d'installer le site comme une application
// et d'ouvrir l'écran de base même sans connexion.
// Principe : on va TOUJOURS chercher la version la plus récente sur Internet ;
// la copie gardée en mémoire ne sert que si la connexion est coupée.
// Les données (commandes, clients, produits) ne sont JAMAIS gardées ici.
var VERSION = 'menelki-v1';
var BASE = [
  './', 'index.html', 'admin.html', 'admin.css', 'admin.js', 'style.css', 'app.js', 'config.js',
  'hors-ligne.html', 'pwa.js', 'favicon.svg', 'icone-192.png', 'icone-512.png', 'apple-touch-icon.png',
  'menelki-symbole-blanc.svg', 'menelki-logo-blanc.svg', 'manifest.webmanifest', 'admin.webmanifest'
];
var CDN_OK = /^https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@/;

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      return Promise.all(BASE.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (cles) {
      return Promise.all(cles.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') { return; }
  var url = new URL(req.url);
  var memeSite = url.origin === self.location.origin;
  if (!memeSite && !CDN_OK.test(req.url)) { return; }   // Supabase, polices, etc. : on ne touche à rien

  // Bibliothèque Supabase (adresse versionnée, donc immuable) : copie d'abord
  if (!memeSite) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        return hit || fetch(req).then(function (rep) {
          var copie = rep.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copie); });
          return rep;
        });
      })
    );
    return;
  }

  // Pages et fichiers du site : Internet d'abord, copie en secours
  e.respondWith(
    fetch(req).then(function (rep) {
      if (rep && rep.ok && rep.type === 'basic') {
        var copie = rep.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copie); });
      }
      return rep;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) { return hit; }
        if (req.mode === 'navigate') { return caches.match('hors-ligne.html'); }
        return new Response('', { status: 504, statusText: 'Hors connexion' });
      });
    })
  );
});
