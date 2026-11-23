// The navigation buttons (Index, About...) between pages.
// The button of the page you are on stays spread (aria-current="page", styles.css).
// When you leave that page, its button closes up with the same movement as after a
// hover: the next page remembers which button was spread, shows it spread from its
// very first picture (data-spread-nav on <html>, styles.css), and then lets it close
// up smoothly to its normal spacing, while it glides to its new place.
// (This file is loaded in <head>, before the page is drawn, so it runs right away.)

// Arriving: the button that was spread on the last page (if any)
let spreadNav = '';
try {
  spreadNav = sessionStorage.getItem('spread-nav') || '';
  sessionStorage.removeItem('spread-nav');
} catch (error) { /* without storage, the button simply starts closed */ }

if (spreadNav) {
  document.documentElement.dataset.spreadNav = spreadNav;
  // Once the page is ready (and the other scripts made their copies of the buttons),
  // let it close up: two frames later, so the spread look is drawn first
  document.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      delete document.documentElement.dataset.spreadNav;
    }));
  });
}

// Leaving the page: remember the button that is spread here (if any)
window.addEventListener('pagehide', () => {
  const current = document.querySelector('.nav-item[aria-current="page"]');
  const name = current ? [...current.classList].find(c => c.startsWith('nav-') && c !== 'nav-item') : '';
  try {
    if (name) sessionStorage.setItem('spread-nav', name);
    else sessionStorage.removeItem('spread-nav');
  } catch (error) { /* nothing to remember */ }
});
