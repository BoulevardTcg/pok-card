// Anti-FOUC : applique le thème (clair/sombre) avant le premier rendu.
// Externalisé (et non inline) pour être couvert par `script-src 'self'` de la
// Content-Security-Policy, sans recourir à 'unsafe-inline'.
(function () {
  var STORAGE_KEY = 'boulevard-theme';
  var theme = 'dark'; // Thème par défaut

  try {
    var stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      theme = stored;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      theme = 'light';
    }
  } catch (e) {}

  document.documentElement.setAttribute('data-theme', theme);
})();
