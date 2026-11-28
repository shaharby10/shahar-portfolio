// The About page:
// 1. Images go from a blurred preview to sharp when they load (like the project pages).
// 2. Recent work: hovering a work shows its images and its role.
// 3. Education: the Bezalel emblem appears and turns once when it scrolls into view, and stays;
//    on a computer it turns again each time the mouse comes over it; on a phone each time
//    it scrolls into view, and at each tap.
// 4. On a computer, a click on the portrait throws letters out of the red block's top left
//    corner; they fall and pile up at its bottom. Another click plays it all backwards.
// 5. On a phone, the red "v" under each role opens a small gallery of the work's images.
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
const emblemTurns = new Map(); // the turn each emblem is making now (computer, phone)

function turnEmblem(target = emblem) {
  const running = emblemTurns.get(target);
  if (running && running.playState === 'running') return; // let a turn finish first
  const duration = parseFloat(getComputedStyle(target).getPropertyValue('--emblem-turn-duration')) || 1200;
  // "rotate" is separate from the emblem's own small tilt (its "transform" in styles.css);
  // from -360° to 0° is one full turn clockwise
  emblemTurns.set(target, target.animate([{ rotate: '-360deg' }, { rotate: '0deg' }], { duration, easing: 'ease-in-out' }));
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

// On a phone (no mouse): each time the emblem scrolls well into the screen it turns
// once (the first time it also appears, and stays); a tap on it turns it again too
const phoneEmblem = document.querySelector('.about-mobile .about-emblem');
const emblemWatcher = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) {
    phoneEmblem.classList.add('is-shown');
    turnEmblem(phoneEmblem);
  }
}, { threshold: 0.6 });
emblemWatcher.observe(phoneEmblem);
phoneEmblem.addEventListener('click', () => {
  if (phoneEmblem.classList.contains('is-shown')) turnEmblem(phoneEmblem);
});

// ---------- 4. The portrait throws letters into the red block ----------
// A click on the portrait (computer) lets the letters of the first sentence next to it
// fall, one after another, out of the red block's top left corner: the same fall as the
// home page's entrance (home.js, section 9), with the same physics (physics.js) and the
// same timings (the --entrance-* tokens in styles.css). They fly a little to the right,
// fall, hit each other and pile up at the bottom of the block, and then they stop.
// A second click does exactly the same again: the same sentence falls once more
// out of the same corner onto the pile. A third click sends them all back, one after
// another, each in an arc into the corner it came from (sendBack, below).
// The next click starts again from the beginning.
// Not for people who ask their computer for less motion.
const redBlock = document.querySelector('.about-desktop .about-red-block');
const portrait = document.querySelector('.about-desktop .about-portrait');
const lessMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (redBlock && portrait && typeof makeBody === 'function' && !lessMotion) {
  const paragraphs = document.querySelectorAll('.about-desktop .about-intro p');
  const withoutSpaces = text => [...text].filter(ch => ch.trim());
  const firstSentence = withoutSpaces(paragraphs[0].textContent.split(/[.!?]/)[0]);
  // 'empty'; 'first' and 'second' (falling, or already lying in the pile); or 'back' (flying back)
  let state = 'empty';
  let layer = null, world = null, pieces = [], frameId = 0;

  // A time token from styles.css ("30ms" or "2.6s") in milliseconds
  const cssTime = (name, css) => {
    const value = css.getPropertyValue(name).trim();
    return value.endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000 || 0;
  };
  const random = (from, to) => from + Math.random() * (to - from);

  // Where a piece is drawn: where its body's center is now, and how much it is turned
  function pose(body) {
    const [a, b] = body.corners;
    const c = bodyCenter(body);
    return [c.x, c.y, Math.atan2(b.y - a.y, b.x - a.x)];
  }
  function place(piece, [x, y, angle]) {
    piece.element.style.transform =
      `translate(${x - piece.centerX}px, ${y - piece.centerY}px) rotate(${angle}rad)`;
  }

  // Letters are small, and under the weight of the pile the physics can squash one flat
  // or turn it inside out. After every step each letter is put back into its own true
  // shape (the same size, turned the way its corners point), and lifted if that put it
  // below the bottom of the block.
  const template = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  function keepShape(body, w, h, floor) {
    const c = bodyCenter(body);
    let dot = 0, cross = 0;
    body.corners.forEach((p, i) => {
      const lx = template[i][0] * w / 2, ly = template[i][1] * h / 2;
      const rx = p.x - c.x, ry = p.y - c.y;
      dot += lx * rx + ly * ry; cross += lx * ry - ly * rx;
    });
    const angle = Math.atan2(cross, dot), cos = Math.cos(angle), sin = Math.sin(angle);
    let lift = 0;
    body.corners.forEach((p, i) => {
      const lx = template[i][0] * w / 2, ly = template[i][1] * h / 2;
      p.x = c.x + lx * cos - ly * sin;
      p.y = c.y + lx * sin + ly * cos;
      lift = Math.max(lift, p.y - floor);
    });
    if (lift > 0) body.corners.forEach(p => { p.y -= lift; p.oldY -= lift; });
  }

  // The layer the letters live in, and the sizes and forces of their small world
  function startWorld() {
    layer?.remove();
    layer = document.createElement('div');
    layer.className = 'about-letters';
    layer.setAttribute('aria-hidden', 'true');
    redBlock.append(layer);

    const css = getComputedStyle(document.body);
    const unit = parseFloat(getComputedStyle(layer).fontSize) / 25; // the letters are 25 Figma px
    world = {
      stagger: cssTime('--entrance-stagger', css),
      settle: cssTime('--entrance-settle', css),
      // Gravity as on the home page: how far a piece falls more each step (1/60 s)
      gravity: parseFloat(css.getPropertyValue('--entrance-gravity')) * window.innerHeight / 3600,
      width: redBlock.clientWidth,
      floor: redBlock.clientHeight,
      corner: { x: (11 + 8) * unit, y: 8 * unit }, // the block starts 11px left of the page
      measure: document.createElement('canvas').getContext('2d')
    };
    // How many steps a letter needs to fall from the top to the bottom of the block,
    // so its push to the right lands it somewhere across the whole block
    world.fallSteps = Math.sqrt(2 * world.floor / world.gravity);
    pieces = [];
  }

  // One letter, waiting in the corner (hidden) until its turn to fall
  function makeLetter(ch, startAt) {
    const { corner, width, fallSteps, measure } = world;
    const element = document.createElement('span');
    element.className = 'about-letter';
    element.textContent = ch;
    element.style.visibility = 'hidden';
    layer.append(element);

    // As on the home page, the body is only as tall as the letter's ink, so letters
    // touch where they really touch, and lie right on the bottom of the block
    const style = getComputedStyle(element);
    const marker = document.createElement('span');
    marker.style.cssText = 'display:inline-block;width:0;height:0';
    element.append(marker);
    const baseline = marker.offsetTop; // where the letter stands, inside its box
    marker.remove();
    measure.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const ink = measure.measureText(ch);
    const inkTop = baseline - ink.actualBoundingBoxAscent, inkBottom = baseline + ink.actualBoundingBoxDescent;
    const w = element.offsetWidth, h = Math.max(inkBottom - inkTop, 4);
    const centerX = w / 2, centerY = (inkTop + inkBottom) / 2;
    element.style.transformOrigin = `${centerX}px ${centerY}px`;

    // It starts in the corner, a little turned, pushed to the right (the speed is
    // the step from "old" to "now")
    const body = makeBody(w, h, corner.x + w / 2, corner.y + h / 2, random(-0.25, 0.25));
    const vx = random(0.05, 0.95) * (width - corner.x) / fallSteps;
    body.corners.forEach(c => { c.oldX = c.x - vx; });
    return { element, body, w, h, centerX, centerY, startAt };
  }

  // Lets these letters fall, one after another, onto whatever already lies in the block.
  // The world runs (one step = 1/60 s) until the pile is still, or for at most
  // --entrance-settle after the last letter starts. Then it stops.
  function dropLetters(chars) {
    cancelAnimationFrame(frameId);
    const { stagger, settle, gravity, floor, width } = world;
    const started = performance.now();
    // their turns are counted from this click (the letters already thrown keep moving)
    const newPieces = chars.map((ch, i) => makeLetter(ch, i * stagger));
    pieces = pieces.concat(newPieces);
    const lastStart = (chars.length - 1) * stagger;
    let stepsDone = 0, stillFrames = 0;
    const tick = now => {
      const elapsed = now - started;
      const stepsDue = Math.min(Math.floor(elapsed / (1000 / 60)), stepsDone + 4); // never more than 4 at once
      for (; stepsDone < stepsDue; stepsDone++) {
        const time = stepsDone * 1000 / 60;
        newPieces.forEach(p => { if (time >= p.startAt) p.body.active = true; });
        stepWorld(pieces.map(p => p.body), gravity, floor, width);
        // put every letter back into its shape, then push apart the ones that overlap
        // because of it, a few times over
        const live = pieces.filter(p => p.body.active);
        for (let round = 0; round < 4; round++) {
          live.forEach(p => keepShape(p.body, p.w, p.h, floor));
          separateAll(live.map(p => p.body));
        }
        live.forEach(p => keepShape(p.body, p.w, p.h, floor));
      }
      // draw every letter that has been thrown where its body is now
      pieces.forEach(p => {
        if (p.body.active) { p.element.style.visibility = ''; place(p, pose(p.body)); }
      });
      // Still: no corner moved more than half a pixel in the last step
      const fastest = Math.max(...pieces.map(p => Math.max(...p.body.corners.map(c => Math.hypot(c.x - c.oldX, c.y - c.oldY)))));
      // (counted in steps of the world, not in clock time: on a slow computer the world
      // runs behind the clock, and the letters must not stop in the air)
      const worldTime = stepsDone * 1000 / 60;
      stillFrames = worldTime > lastStart && fastest < 0.5 ? stillFrames + 1 : 0;
      if (stillFrames < 20 && worldTime < lastStart + settle) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
  }

  // The way back: like the fall, the other way round. The letters leave the pile one
  // after another (--entrance-stagger), from the last one that fell to the first, as one
  // group. Each flies in an arc, under the same gravity, up into the corner it fell from:
  // exactly as if it had been dropped from that corner, played backwards, so it slows
  // down as it rises and stops there. Then it is gone.
  function sendBack() {
    cancelAnimationFrame(frameId);
    state = 'back';
    const { stagger, gravity, corner } = world;
    const stepTime = 1000 / 60; // one step of the world
    const flights = pieces.filter(p => p.body.active).reverse().map((p, i) => {
      const [x, y, angle] = pose(p.body);
      const toX = corner.x + p.w / 2, toY = corner.y + p.h / 2;
      // the time a drop from the corner takes to fall this far (in steps)
      const steps = Math.max(Math.sqrt(2 * Math.max(y - toY, 0) / gravity), 20);
      // the shortest turn back to straight (never more than half a turn)
      const turn = ((-angle % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
      return { p, x, y, angle, toX, toY, steps, turn, startAt: i * stagger };
    });
    pieces.filter(p => !p.body.active).forEach(p => { p.element.style.visibility = 'hidden'; });
    const started = performance.now();
    const tick = now => {
      const elapsed = now - started;
      let flying = 0;
      flights.forEach(f => {
        const t = (elapsed - f.startAt) / stepTime; // steps since it left the pile
        if (t < 0) { flying++; return; }
        if (t >= f.steps) { f.p.element.style.visibility = 'hidden'; return; }
        flying++;
        // played backwards: r is how many steps it still has before reaching the corner
        const r = f.steps - t, part = r / f.steps;
        const x = f.toX + (f.x - f.toX) * part;           // across: at an even speed
        const y = f.toY + gravity * r * r / 2;            // up: slowing down into the corner
        place(f.p, [x, y, f.angle + f.turn * (1 - part)]);
      });
      if (flying) frameId = requestAnimationFrame(tick);
      else { layer.remove(); layer = null; state = 'empty'; }
    };
    frameId = requestAnimationFrame(tick);
  }

  portrait.addEventListener('click', () => {
    if (state === 'empty') { startWorld(); state = 'first'; dropLetters(firstSentence); }
    else if (state === 'first') { state = 'second'; dropLetters(firstSentence); }
    else if (state === 'second') sendBack();
    // (while they fly back, a click waits for them to arrive)
  });
}

// ---------- 5. Phone: a small gallery under each role ----------

// A tap on the red "v" under a role opens a red frame right under it, with the work's
// images (the same ones the computer shows on hover), one at a time, each whole,
// fading into the next by itself. Everything under it glides down to make room.
// The "v" stays where it is and turns upside down; another tap closes the gallery.
// The sizes and times are in styles.css (--about-gallery-...).
const aboutPhone = document.querySelector('.about-mobile');
const galleryButtons = aboutPhone ? [...aboutPhone.querySelectorAll('.about-phone-more')] : [];
const cssNumber = name => parseFloat(getComputedStyle(document.body).getPropertyValue(name)) || 0;
const figmaTop = element => parseFloat(element.style.getPropertyValue('--top')) || 0;

const galleries = galleryButtons.map(button => {
  const work = button.dataset.work;
  // what lies below the "v" (its bottom edge) moves down when the gallery opens
  const below = figmaTop(button) + parseFloat(button.style.getPropertyValue('--height'));
  const top = below + cssNumber('--about-gallery-gap');
  const gallery = document.createElement('div');
  gallery.className = 'about-gallery project-placed';
  gallery.style.cssText = `--left: 24; --top: ${top}; --width: 342`;
  const frame = document.createElement('div');
  frame.className = 'about-gallery-frame';
  gallery.append(frame);
  // The work's images, from the computer version of the page
  const images = [...document.querySelectorAll(`.about-desktop .about-work-image[data-work="${work}"] img`)].map(source => {
    const image = document.createElement('img');
    image.className = 'about-gallery-image';
    image.src = source.getAttribute('src');
    image.alt = source.alt;
    image.loading = 'lazy';
    // An image can ask to be cut to another shape in the gallery, and bigger
    // (data-gallery-crop: its shape, data-gallery-focus: the point the cut keeps in view)
    if (source.dataset.galleryCrop) {
      image.classList.add('is-cut');
      image.style.setProperty('--gallery-crop', source.dataset.galleryCrop);
      image.style.setProperty('--gallery-focus', source.dataset.galleryFocus || '50% 50%');
    }
    frame.append(image);
    return image;
  });
  if (images[0]) images[0].classList.add('is-shown');
  button.after(gallery);
  return { button, gallery, images, top, below, open: false, timer: 0, current: 0 };
});

// Everything under an open gallery is pushed down by its height (and a gap under it)
function pushAboutPage() {
  const room = cssNumber('--about-gallery-height') + cssNumber('--about-gallery-gap');
  let total = 0;
  galleries.forEach(g => { if (g.open) total += room; });
  aboutPhone.style.setProperty('--about-push-total', total);
  aboutPhone.querySelectorAll('.project-placed').forEach(element => {
    const top = figmaTop(element);
    let push = 0;
    galleries.forEach(g => { if (g.open && g.gallery !== element && g.below <= top) push += room; });
    // a gallery itself moves with the galleries above it
    if (element.classList.contains('about-gallery')) {
      push = 0;
      galleries.forEach(g => { if (g.open && g.top < top) push += room; });
    }
    element.style.setProperty('--about-push', push);
  });
}

function showNext(g) {
  if (g.images.length < 2) return;
  g.images[g.current].classList.remove('is-shown');
  g.current = (g.current + 1) % g.images.length;
  g.images[g.current].classList.add('is-shown');
}

galleries.forEach(g => {
  g.button.addEventListener('click', () => {
    g.open = !g.open;
    g.button.setAttribute('aria-expanded', g.open);
    g.gallery.classList.toggle('is-open', g.open);
    clearInterval(g.timer);
    if (g.open) g.timer = setInterval(() => showNext(g), cssNumber('--about-gallery-interval'));
    pushAboutPage();
  });
});
