// The menu on a phone: the asterisk at the top right (the About page and the
// project pages; the home page has its own copy in home.js).
// A tap turns the asterisk and opens a red menu; another tap turns it
// again and closes the menu. A tap on a word spreads its letters
// (like hover on a computer) and then opens the page; so does a tap on "Home".
const menuButton = document.querySelector('.menu-button');
const phoneMenu = document.querySelector('.phone-menu');
let menuTurns = 0;
let menuReveal = null; // the red frame's opening or closing movement

// Reads a time like "700ms" from the CSS variables in styles.css
function cssTime(name) {
  return parseFloat(getComputedStyle(document.body).getPropertyValue(name)) || 0;
}

function setMenu(open) {
  menuTurns += 1;
  menuButton.style.setProperty('--menu-turn', menuTurns * 360 + 'deg');
  menuButton.setAttribute('aria-expanded', open);
  menuButton.classList.toggle('is-open', open);
  document.documentElement.classList.toggle('menu-is-open', open); // the page doesn't scroll behind the menu

  // The red frame is uncovered from the right edge to the left,
  // and closes the same way back to the right edge
  const lessMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = lessMotion ? 0 : cssTime('--menu-reveal-duration');
  const shut = 'inset(0 0 0 100%)';
  const full = 'inset(0 0 0 0)';
  if (menuReveal) menuReveal.cancel();
  phoneMenu.hidden = false;
  menuReveal = phoneMenu.animate(
    { clipPath: open ? [shut, full] : [full, shut] },
    { duration, easing: getComputedStyle(document.body).getPropertyValue('--switch-easing').trim() || 'ease' }
  );
  menuReveal.finished.then(() => {
    menuReveal = null;
    phoneMenu.hidden = !open;
  }).catch(() => {}); // cancelled by a quick second tap
}

menuButton.addEventListener('click', () => {
  setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
});

// The Escape key closes the menu too
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !phoneMenu.hidden) setMenu(false);
});

phoneMenu.querySelectorAll('.menu-link').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    link.classList.add('is-spread');
    const lessMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wait = lessMotion ? 0 : cssTime('--nav-hover-duration');
    setTimeout(() => {
      if (link.href) window.location.href = link.href; 
      else link.classList.remove('is-spread');
    }, wait);
  });
});

// On a phone, a tap on "Home" at the top left spreads its letters too (like the
// menu's words), and then the home page opens
const homeLink = document.querySelector('a.home-name');
if (homeLink) {
  homeLink.addEventListener('click', event => {
    if (!window.matchMedia('(max-width: 791px)').matches) return; // a computer opens it at once
    event.preventDefault();
    homeLink.classList.add('is-spread');
    const lessMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wait = lessMotion ? 0 : cssTime('--nav-hover-duration');
    setTimeout(() => { window.location.href = homeLink.href; }, wait);
  });
}
