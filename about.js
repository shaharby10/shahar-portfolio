// The About page:
// 1. Images go from a blurred preview to sharp when they load (like the project pages).
// 2. Recent work: hovering a work shows its images and its role.
// 3. Education: the Bezalel emblem appears and turns once when it scrolls into view, and stays;
//    on a computer it turns again each time the mouse comes over it.
// (The address lines that copy on a click are in contact.js.)
// (The asterisk menu on a phone is in menu.js.)

// ---------- 1. Progressive images ----------
document.querySelectorAll('.progressive-image').forEach(image => {
  const box = image.closest('.progressive');
  const reveal = () => box.classList.add('is-loaded');
  const fail = () => box.classList.add('is-failed'); // the blurred preview stays

  if (image.complete) {
    if (image.naturalWidth > 0) image.decode().catch(() => {}).then(reveal); else fail();
  } else {
    image.addEventListener('load', () => image.decode().catch(() => {}).then(reveal), { once: true });
    image.addEventListener('error', fail, { once: true });
  }
});

// ---------- 2. Recent work: images and role on hover ----------
// A work with several images: its name is split into equal parts from left
// to right, and the part under the mouse decides which image shows.
document.querySelectorAll('.about-work').forEach(row => {
  const work = row.dataset.work;
  const title = row.querySelector('.about-work-title');
  const images = [...document.querySelectorAll(`.about-work-image[data-work="${work}"]`)];
  const role = document.querySelector(`.about-role[data-work="${work}"]`);

  // Show only image number "index" of this work
  const showImage = index => {
    images.forEach((image, i) => image.classList.toggle('is-shown', i === index));
  };

  row.addEventListener('mousemove', event => {
    const name = title.getBoundingClientRect();
    // Where the mouse is along the name: 0 at its left edge, almost 1 at its right edge
    const along = Math.min(Math.max((event.clientX - name.left) / name.width, 0), 0.999);
    showImage(Math.floor(along * images.length));
    role.classList.add('is-shown');
  });

  row.addEventListener('mouseleave', () => {
    showImage(-1); // hides them all
    role.classList.remove('is-shown');
  });
});

// ---------- 3. Education: the Bezalel emblem appears and stays ----------
// On a computer: when the emblem scrolls into view, it appears and turns once
// clockwise; after that it turns again each time the mouse comes over it.
const emblem = document.querySelector('.about-desktop .about-emblem');
let emblemTurn = null;

function turnEmblem() {
  if (emblemTurn && emblemTurn.playState === 'running') return; // let a turn finish first
  const duration = parseFloat(getComputedStyle(emblem).getPropertyValue('--emblem-turn-duration')) || 1200;
  // "rotate" is separate from the emblem's own small tilt (its "transform" in styles.css);
  // from -360° to 0° is one full turn clockwise
  emblemTurn = emblem.animate([{ rotate: '-360deg' }, { rotate: '0deg' }], { duration, easing: 'ease-in-out' });
}

function showEmblem() {
  if (emblem.classList.contains('is-shown')) return;
  emblem.classList.add('is-shown'); // never removed, so it stays
  turnEmblem();
}

// The first time: by itself, as soon as the emblem has scrolled well into the screen
// (or earlier, if the mouse reaches the Education part first)
const desktopEmblemWatcher = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) {
    showEmblem();
    desktopEmblemWatcher.disconnect(); // it stays, nothing more to watch
  }
}, { threshold: 0.6 });
desktopEmblemWatcher.observe(emblem);

document.querySelector('.about-education-area').addEventListener('pointerenter', showEmblem);
emblem.addEventListener('pointerenter', () => {
  if (emblem.classList.contains('is-shown')) turnEmblem(); else showEmblem();
});

// On a phone (no mouse): when the emblem has scrolled well into the screen
const phoneEmblem = document.querySelector('.about-mobile .about-emblem');
const emblemWatcher = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) {
    phoneEmblem.classList.add('is-shown');
    emblemWatcher.disconnect(); // it stays, nothing more to watch
  }
}, { threshold: 0.6 });
emblemWatcher.observe(phoneEmblem);
