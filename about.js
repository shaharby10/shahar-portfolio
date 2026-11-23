// The About page:
// 1. Images go from a blurred preview to sharp when they load (like the project pages).
// 2. Recent work: hovering a work shows its images and its role.
// 3. Education: the Bezalel emblem comes out of a blur when the mouse reaches it, and stays.
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
// On a computer: when the mouse reaches the Education part
const emblem = document.querySelector('.about-desktop .about-emblem');
document.querySelector('.about-education-area').addEventListener('pointerenter', () => {
  emblem.classList.add('is-shown'); // never removed, so it stays
}, { once: true });

// On a phone (no mouse): when the emblem has scrolled well into the screen
const phoneEmblem = document.querySelector('.about-mobile .about-emblem');
const emblemWatcher = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) {
    phoneEmblem.classList.add('is-shown');
    emblemWatcher.disconnect(); // it stays, nothing more to watch
  }
}, { threshold: 0.6 });
emblemWatcher.observe(phoneEmblem);
