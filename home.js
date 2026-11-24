// Home page behavior:
// 1. The intro blurs once the projects start scrolling over it.
// 2. Project images (and the poster video) go from a blurred preview to sharp when they load.
// 3. The Switch button changes the layout of the intro and the navigation.
// 4. The long dash spins when clicked. 5. The asterisk over the big name.
// 6. On a phone, the red asterisk opens the menu.
// 7. The red periods bounce on hover and roll away and back when clicked
//    (also over and on the words they end: "direction." and "look.").
//    The red commas wiggle on hover; a click drops them to the line below and they bounce back up.
// 8. (removed: the grid of a project's images on hover)
// 9. The entrance: the words and the punctuation fall, then arrange themselves.
// 10. On a phone, images go out of focus where they pass under Home and the asterisk.
// The blur strength and timings are CSS variables at the top of styles.css.

// ---------- 1. Intro blur ----------

const intro = document.querySelector('.home-intro');
const work = document.querySelector('.home-work');

// An invisible marker that starts at the top of the first project
// and reaches down to the end of the page
const marker = document.createElement('div');
marker.setAttribute('aria-hidden', 'true');
marker.style.cssText = 'position:absolute;left:0;right:0;bottom:0;pointer-events:none;';
work.prepend(marker);

let introObserver = null;

// The bottom edge of the visible intro text, measured on screen
function introBottom() {
  const parts = intro.querySelectorAll('.intro-text, .intro-im, .intro-name, .intro-rest, .intro-rest-a, .intro-rest-b, .intro-tagline');
  let bottom = 0;
  parts.forEach(part => {
    const box = part.getBoundingClientRect();
    if (box.height > 0) bottom = Math.max(bottom, box.bottom);
  });
  return bottom;
}

// On a phone (the narrow layout in styles.css) the intro blurs as soon as
// the page starts scrolling, because the first image already peeks in below it
const phoneLayout = window.matchMedia('(max-width: 791px)');

function blurOnScroll() {
  intro.classList.toggle('is-blurred', window.scrollY > 0);
}

window.addEventListener('scroll', () => {
  if (phoneLayout.matches) blurOnScroll();
  askForFade();
}, { passive: true });

// The intro also fades towards white little by little: from nothing when the
// projects first reach it, to --sticky-blur-fade after --sticky-fade-distance
// of scrolling (both in styles.css). On a phone it starts with the scrolling.
let fadeWaiting = false;

function fadeIntro() {
  fadeWaiting = false;
  const style = getComputedStyle(intro);
  const unit = document.body.clientWidth / (phoneLayout.matches ? 390 : 1440);
  const distance = parseFloat(style.getPropertyValue('--sticky-fade-distance')) * unit;
  const lowest = parseFloat(style.getPropertyValue('--sticky-blur-fade'));
  const covered = phoneLayout.matches
    ? window.scrollY
    : introBottom() - marker.getBoundingClientRect().top; // how far the projects are over the text
  const progress = Math.min(1, Math.max(0, covered / distance));
  intro.style.setProperty('--sticky-fade-now', 1 - (1 - lowest) * progress);
}

// Measure at most once per screen update, however fast the page scrolls
function askForFade() {
  if (fadeWaiting) return;
  fadeWaiting = true;
  requestAnimationFrame(fadeIntro);
}

// On a phone: the biggest intro text (up to the size in styles.css) that still
// ends above the first project's image, which peeks in at the bottom.
// The running small line (marquee, below) is the last thing in the intro.
function fitIntroOnPhone() {
  intro.style.removeProperty('--size-intro');
  if (!phoneLayout.matches) return;
  const firstImage = document.querySelector('.work-image');
  const gap = 24 * document.body.clientWidth / 390; // --intro-to-peek in styles.css (24 phone pixels)
  let size = parseFloat(getComputedStyle(lead).fontSize); // the big first sentence
  while (size > 20 && marquee.getBoundingClientRect().bottom > firstImage.getBoundingClientRect().top + window.scrollY - gap) {
    size -= 0.5;
    intro.style.setProperty('--size-intro', size + 'px');
  }
}

// On a phone "I shape what ideas say…" comes first, big, above the rest of the
// intro. This is a copy for the eye only; screen readers read the real sentence.
const lead = document.createElement('p');
lead.className = 'intro-lead';
lead.setAttribute('aria-hidden', 'true');
lead.innerHTML = intro.querySelector('.intro-rest-b').innerHTML;
intro.querySelector('.intro-text').before(lead);

// On a phone the small line under the intro ("from the first words…") stays on
// one line and runs from right to left in a loop. The moving line is a copy for
// the eye only; screen readers still read the real line (hidden on a phone, styles.css).
const tagline = intro.querySelector('.intro-tagline');
const marquee = document.createElement('p');
marquee.className = 'intro-marquee';
marquee.setAttribute('aria-hidden', 'true');
const marqueeTrack = document.createElement('span');
marqueeTrack.className = 'intro-marquee-track';
// Two copies one after the other: when the first has moved out on the left,
// the second is exactly where the first started, so the loop has no jump
for (let i = 0; i < 2; i++) {
  const copy = document.createElement('span');
  copy.className = 'intro-marquee-copy';
  // The line without its final period, and a small red arrow instead
  copy.textContent = tagline.textContent.trim().replace(/\.$/, '');
  copy.insertAdjacentHTML('beforeend', '<svg class="intro-marquee-arrow" viewBox="0 0 12 10"><path d="M1 5 H11 M7 1 L11 5 L7 9"/></svg>');
  marqueeTrack.append(copy);
}
marquee.append(marqueeTrack);
tagline.after(marquee);

// Measures the layout and watches for the moment the projects reach the intro.
// The browser only reports when that line is crossed, not on every scroll step.
function watchIntro() {
  if (introObserver) introObserver.disconnect();
  fitIntroOnPhone();
  if (phoneLayout.matches) {
    blurOnScroll();
    askForFade();
    return;
  }

  // Place the marker at the top of the highest project element
  const workTop = work.getBoundingClientRect().top;
  let firstTop = Infinity;
  work.querySelectorAll('.progressive, .work-title, .work-tag').forEach(item => {
    firstTop = Math.min(firstTop, item.getBoundingClientRect().top);
  });
  marker.style.top = (firstTop - workTop) + 'px';

  // Watch only the strip of the window covered by the intro text.
  // While the marker is inside it, some project overlaps the intro.
  const hiddenBelow = Math.max(0, window.innerHeight - introBottom());
  introObserver = new IntersectionObserver(entries => {
    const entry = entries[entries.length - 1];
    intro.classList.toggle('is-blurred', entry.isIntersecting);
  }, { rootMargin: `0px 0px -${hiddenBelow}px 0px` });
  introObserver.observe(marker);
  askForFade();
}

// ---------- 2. Progressive images ----------

function showWhenLoaded(image) {
  const box = image.closest('.progressive');
  const fail = () => box.classList.add('is-failed'); // the blurred preview stays

  // A video is ready once its first frame can be shown
  if (image.tagName === 'VIDEO') {
    const show = () => box.classList.add('is-loaded');
    if (image.readyState >= 2) show();
    else image.addEventListener('loadeddata', show, { once: true });
    image.addEventListener('error', fail, { once: true });
    return;
  }

  const reveal = () => {
    // Wait until the image is decoded, so it appears in one smooth step
    image.decode().catch(() => {}).then(() => box.classList.add('is-loaded'));
  };

  if (image.complete) {
    // Already loaded (for example from the browser cache)
    if (image.naturalWidth > 0) reveal(); else fail();
  } else {
    image.addEventListener('load', reveal, { once: true });
    image.addEventListener('error', fail, { once: true });
  }
}

// People who ask their computer for less motion see the poster standing still
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.home-work video').forEach(video => {
    video.removeAttribute('autoplay');
    video.pause();
  });
}

// Works for images that load later too (loading="lazy"):
// each image waits for its own "load" event
document.querySelectorAll('.progressive-image').forEach(showWhenLoaded);

// ---------- 3. Switch (with a smooth "morph") ----------

// Wraps every word of the intro in its own <span class="word">,
// so each word can glide from its old place to its new place.
// A word keeps its blue punctuation with it (for example "Yaacov,").
function splitIntoWords(container) {
  const nodes = [...container.childNodes];
  container.textContent = '';
  let word = null;
  const startWord = () => {
    word = document.createElement('span');
    word.className = 'word';
    container.append(word);
  };
  nodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { container.append(part); word = null; }
        else { if (!word) startWord(); word.append(part); }
      });
    } else if (node.nodeName === 'BR') {
      container.append(node); word = null;
    } else {
      if (!word) startWord();
      word.append(node); // blue punctuation joins the word before it
    }
  });
}
document.querySelectorAll('.intro-im, .intro-name, .intro-rest-a, .intro-rest-b, .intro-tagline').forEach(splitIntoWords);

// The three layouts Switch goes through (Frames 58, 59 and 61).
// The first one has no class; the others add a class to <body>.
const layouts = ['', 'layout-b', 'layout-c'];
let layoutIndex = 0;

const switchButton = document.querySelector('.nav-switch');

// Reads a time like "900ms" from the CSS variables in styles.css
function cssTime(name) {
  return parseFloat(getComputedStyle(document.body).getPropertyValue(name)) || 0;
}

let morphTimer = null;
let morphLayer = null; // the moving copies of the words, while Switch is animating

switchButton.addEventListener('click', () => {
  if (document.documentElement.classList.contains('is-entering')) return; // wait for the entrance
  const duration = cssTime('--switch-duration');
  const easing = getComputedStyle(document.body).getPropertyValue('--switch-easing').trim() || 'ease';
  const words = [...intro.querySelectorAll('.intro-text .word, .intro-tagline .word')];
  const introBox = intro.getBoundingClientRect();

  // 1. Remember where every word is now
  //    (if a switch is still moving, start from where the copies are right now)
  const copies = morphLayer ? [...morphLayer.children] : null;
  const before = (copies || words).map(w => w.getBoundingClientRect());
  if (morphLayer) morphLayer.remove();

  // 2. Switch the layout (CSS puts everything in its new place at once;
  //    the buttons, the small line and the background glide there with CSS transitions)
  document.body.classList.add('is-morphing');
  if (layouts[layoutIndex]) document.body.classList.remove(layouts[layoutIndex]);
  layoutIndex = (layoutIndex + 1) % layouts.length;
  if (layouts[layoutIndex]) document.body.classList.add(layouts[layoutIndex]);

  // 3. Move a copy of each word from its old place to its new place.
  //    The real text stays untouched and hidden until the copies arrive.
  if (duration > 0) {
    morphLayer = document.createElement('div');
    morphLayer.className = 'morph-layer';
    morphLayer.setAttribute('aria-hidden', 'true');
    words.forEach((w, i) => {
      const after = w.getBoundingClientRect();
      const copy = w.cloneNode(true);
      copy.className = 'morph-word';
      copy.style.font = getComputedStyle(w).font; // intro words and the small line use different fonts
      copy.style.letterSpacing = getComputedStyle(w).letterSpacing; // the big text is 2% tighter ("font" leaves this out)
      copy.style.left = (before[i].left - introBox.left) + 'px';
      copy.style.top = (before[i].top - introBox.top) + 'px';
      copy.style.lineHeight = before[i].height + 'px'; // keeps the letters on the same baseline
      morphLayer.append(copy);
      copy.animate(
        [{ transform: 'none' }, { transform: `translate(${after.left - before[i].left}px, ${after.top - before[i].top}px)` }],
        { duration, easing, fill: 'forwards' }
      );
    });
    intro.append(morphLayer);
    intro.classList.add('is-morphing-words');
  }

  // 4. When everything has arrived: show the real text again,
  //    and measure the intro again for the blur
  clearTimeout(morphTimer);
  morphTimer = setTimeout(() => {
    if (morphLayer) { morphLayer.remove(); morphLayer = null; }
    intro.classList.remove('is-morphing-words');
    document.body.classList.remove('is-morphing');
    watchIntro();
  }, duration + 50);
});

// ---------- 4. The long dash spins when clicked ----------

// Two turns clockwise around its middle. First a small swing backwards
// (like winding up), then a fast spin that slows down by itself and goes
// a bit too far, then smaller and smaller tilts back and forth until it
// rests where it started. The same in all three layouts.
// (On a phone the dash that shows is in the big first sentence, .intro-lead)
const dashes = intro.querySelectorAll('.intro-text .accent-dash, .intro-lead .accent-dash');
const settle = 'cubic-bezier(0.45, 0, 0.55, 1)'; // smooth back-and-forth
const dashSpin = [
  { transform: 'rotate(0deg)', offset: 0, easing: 'cubic-bezier(0.3, 0, 0.5, 1)' },
  { transform: 'rotate(-14deg)', offset: 0.1, easing: 'cubic-bezier(0.55, 0, 0.15, 1)' }, // winding up
  { transform: 'rotate(742deg)', offset: 0.55, easing: settle },   // two turns, a bit too far
  { transform: 'rotate(708deg)', offset: 0.66, easing: settle },   // tilts back
  { transform: 'rotate(728deg)', offset: 0.75, easing: settle },
  { transform: 'rotate(715deg)', offset: 0.83, easing: settle },
  { transform: 'rotate(723deg)', offset: 0.9, easing: settle },
  { transform: 'rotate(718.8deg)', offset: 0.96, easing: settle },
  { transform: 'rotate(720deg)', offset: 1 }                     // at rest, back in place
];
let dashAnimation = null;

function spinDash(dash) {
  const duration = cssTime('--dash-spin-duration');
  if (duration <= 0) return;
  if (dashAnimation) dashAnimation.cancel(); // a new click starts the spin again
  // The red line is the dash's ::after, so that is what turns
  dashAnimation = dash.animate(dashSpin, { duration, pseudoElement: '::after' });
}

dashes.forEach(dash => dash.addEventListener('click', () => spinDash(dash)));

// The words on both sides of the dash ("say" and "not") act like the dash:
// over them it tilts (the .is-inviting class, styles.css), a click spins it
const introDash = intro.querySelector('.intro-text .accent-dash');
const dashWord = introDash.closest('.word');
[dashWord.previousElementSibling, dashWord.nextElementSibling].forEach(word => {
  if (!word || !word.matches('.word')) return;
  word.classList.add('dash-neighbor');
  word.addEventListener('pointerenter', () => introDash.classList.add('is-inviting'));
  word.addEventListener('pointerleave', () => introDash.classList.remove('is-inviting'));
  word.addEventListener('click', () => spinDash(introDash));
});

// ---------- 5. The mouse becomes a spinning asterisk over the big name ----------

// While the mouse is over "Shahar Ben Yaacov," in the intro, the arrow is hidden
// (see styles.css) and the asterisk follows the mouse. When the mouse leaves
// the name, the asterisk disappears and the normal arrow comes back.
const bigName = intro.querySelector('.intro-text .intro-name');
const star = document.querySelector('.cursor-star');

function moveStar(event) {
  star.style.setProperty('--star-x', event.clientX + 'px');
  star.style.setProperty('--star-y', event.clientY + 'px');
}

bigName.addEventListener('pointerenter', event => {
  if (event.pointerType !== 'mouse') return; // only for a mouse, not for touch
  moveStar(event);
  star.classList.add('is-visible');
  window.addEventListener('pointermove', moveStar);
});

function hideStar() {
  star.classList.remove('is-visible');
  window.removeEventListener('pointermove', moveStar);
}

bigName.addEventListener('pointerleave', hideStar);
window.addEventListener('pageshow', hideStar); // coming back from the About page

// ---------- 5b. The mouse becomes "[ VIEW PROJECT ]" over a project's image ----------

// Over a project's image the arrow is hidden (styles.css) and "[ VIEW PROJECT ]"
// follows the mouse: it rises in, its red brackets open and the words appear.
// When the mouse leaves the image, the words go, the brackets close and it
// disappears in place (the order and the timings are in styles.css).
const viewLabels = document.querySelectorAll('.cursor-view'); // the brackets, and the words in X-ray
const wideWithMouse = window.matchMedia('(min-width: 792px) and (hover: hover)');
let viewClosing = null; // the timer that brings the arrow back after closing

function moveViewLabel(event) {
  viewLabels.forEach(label => {
    label.style.setProperty('--view-x', event.clientX + 'px');
    label.style.setProperty('--view-y', event.clientY + 'px');
  });
}

// It keeps following the mouse while it closes and disappears
window.addEventListener('pointermove', event => {
  if (event.pointerType === 'mouse') moveViewLabel(event);
});

document.querySelectorAll('.work-image').forEach(image => {
  image.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return; // only for a mouse, not for touch
    if (!wideWithMouse.matches) return;          // the same screens that hide the arrow (styles.css)
    moveViewLabel(event);
    clearTimeout(viewClosing);
    document.body.classList.remove('is-view-closing');
    viewLabels.forEach(label => label.classList.add('is-shown'));
  });
  image.addEventListener('pointerleave', () => {
    if (!viewLabels[0].classList.contains('is-shown')) return;
    viewLabels.forEach(label => label.classList.remove('is-shown'));
    // The arrow stays hidden until the brackets have closed (styles.css)
    document.body.classList.add('is-view-closing');
    clearTimeout(viewClosing);
    viewClosing = setTimeout(() => document.body.classList.remove('is-view-closing'), cssTime('--view-close-duration'));
  });
});

// Coming back to this page (the Back button): start hidden
window.addEventListener('pageshow', () => viewLabels.forEach(label => label.classList.remove('is-shown')));

// ---------- 6. Phone menu: the red asterisk ----------

// On a phone the navigation hides behind the red asterisk (top right).
// A tap turns the asterisk and opens a red menu; another tap turns it
// again and closes the menu. A tap on a word spreads its letters
// (like hover on a computer) and then opens the page.
const menuButton = document.querySelector('.menu-button');
const phoneMenu = document.querySelector('.phone-menu');
let menuTurns = 0;

let menuReveal = null; // the red frame's opening or closing movement

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
  const shut = 'inset(0 0 0 100%)'; // nothing showing: the left edge is at the right
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

// ---------- 7. The red periods roll away and back ----------

// On a wide screen, a click on a red period rolls it to the right, off the
// screen, and it rolls back in from the left side until it is in its place.
// (The small bounce on hover is only CSS.) It turns as it rolls, like a ball:
// one full turn for every circumference it travels.
const wantsLessMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The dot's size and middle, measured from the letter itself (not its box)
function measureDot(period) {
  const style = getComputedStyle(period);
  const canvas = document.createElement('canvas').getContext('2d');
  canvas.font = style.fontSize + ' ' + style.fontFamily;
  const ink = canvas.measureText('.');
  // A zero-size box at the end of the period sits on the baseline
  const marker = document.createElement('span');
  marker.style.cssText = 'display:inline-block;width:0;height:0';
  period.append(marker);
  const baseline = marker.getBoundingClientRect().top - period.getBoundingClientRect().top;
  marker.remove();
  return {
    size: ink.actualBoundingBoxRight + ink.actualBoundingBoxLeft,
    middleX: (ink.actualBoundingBoxRight - ink.actualBoundingBoxLeft) / 2,
    middleY: baseline - (ink.actualBoundingBoxAscent - ink.actualBoundingBoxDescent) / 2
  };
}

// The whole word ("direction." and "look.") acts like its period:
// over it the period bounces (styles.css), a click rolls the period
intro.querySelectorAll('.intro-text .accent-period').forEach(period => {
  const word = period.closest('.word') || period;
  word.addEventListener('click', () => {
    if (phoneLayout.matches || wantsLessMotion() || period.classList.contains('is-rolling')) return;
    const box = period.getBoundingClientRect();
    const dot = measureDot(period);
    const turn = distance => distance / (Math.PI * dot.size) * 360; // degrees for a distance
    const away = window.innerWidth - box.left + dot.size;  // just past the right edge
    const back = box.right + dot.size;                     // starts just past the left edge
    const outTime = cssTime('--period-roll-out-duration');
    const inTime = cssTime('--period-roll-in-duration');
    const leave = outTime / (outTime + inTime);            // when it leaves the screen

    period.classList.add('is-rolling');
    period.style.transformOrigin = dot.middleX + 'px ' + dot.middleY + 'px';
    period.animate([
      { transform: 'translateX(0) rotate(0deg)', offset: 0, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)' },
      { transform: `translateX(${away}px) rotate(${turn(away)}deg)`, offset: leave },
      // the same moment: it jumps from the right side to the left side
      { transform: `translateX(${-back}px) rotate(${-turn(back)}deg)`, offset: leave, easing: 'cubic-bezier(0.1, 0.5, 0.3, 1)' },
      { transform: 'translateX(0) rotate(0deg)', offset: 1 }
    ], { duration: outTime + inTime }).finished.then(() => {
      period.classList.remove('is-rolling');
    });
  });
});

// ---------- 7b. The red commas (and the apostrophe in "I’m") wiggle, and fall and come back ----------

// On a wide screen, over a red comma (or the word it ends) the comma wiggles a little,
// (the apostrophe in "I’m" is shaped like a comma, so it does the same),
// standing on its thin tail (styles.css). A click tips it over, its thick head going
// outward, so it falls onto the line below (or to the bottom of the screen, when it is
// on the last line). It hits it with its head and bounces straight back up to its place.
// The comma after the name sits inside the link to the About page: a click on the comma
// itself makes it fall, and a click anywhere else on the name still opens the page.

// Where the comma's thin tail ends, inside its box: the point it stands and turns on
function measureCommaTail(comma) {
  const style = getComputedStyle(comma);
  const canvas = document.createElement('canvas').getContext('2d');
  canvas.font = style.fontSize + ' ' + style.fontFamily;
  const ink = canvas.measureText(comma.textContent); // the comma, or the apostrophe in "I’m"
  const marker = document.createElement('span');
  marker.style.cssText = 'display:inline-block;width:0;height:0';
  comma.append(marker);
  const baseline = marker.getBoundingClientRect().top - comma.getBoundingClientRect().top;
  marker.remove();
  const inkLeft = -ink.actualBoundingBoxLeft;
  const inkWidth = ink.actualBoundingBoxRight + ink.actualBoundingBoxLeft;
  return {
    x: inkLeft + inkWidth * 0.3,                  // the tail curls down on the left
    y: baseline + ink.actualBoundingBoxDescent,   // its lowest point
    below: ink.actualBoundingBoxDescent,          // how far the tail reaches under the line
    lying: inkWidth * 0.7                         // how tall it is once it lies on its side
  };
}

function placeCommaTail(comma) {
  const tail = measureCommaTail(comma);
  comma.style.transformOrigin = tail.x + 'px ' + tail.y + 'px';
  return tail;
}

const introText = document.querySelector('.intro-text');

introText.querySelectorAll('.accent-comma').forEach(comma => {
  const word = comma.closest('.word') || comma;
  const insideLink = Boolean(comma.closest('a'));
  const trigger = insideLink ? comma : word;

  // Measure the tail before each wiggle (the size changes with the window)
  word.addEventListener('pointerenter', () => {
    if (!comma.classList.contains('is-falling')) placeCommaTail(comma);
  });

  trigger.addEventListener('click', event => {
    if (phoneLayout.matches || wantsLessMotion()) return;
    if (insideLink) event.preventDefault(); // the comma falls instead of opening About
    if (comma.classList.contains('is-falling')) return;

    const tail = placeCommaTail(comma);
    const box = comma.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(introText).lineHeight);
    const textBottom = introText.getBoundingClientRect().bottom;
    const fontSize = parseFloat(getComputedStyle(comma).fontSize);
    // It hits the next line (the line the letters stand on), or the bottom of
    // the screen when there is no line below
    const onLastLine = box.bottom + lineHeight * 0.5 > textBottom;
    const drop = onLastLine
      ? Math.max(lineHeight * 0.5, window.innerHeight - box.bottom - tail.lying - fontSize * 0.1)
      : lineHeight - tail.below - tail.lying;
    const fall = cssTime('--comma-fall-duration');
    const rise = cssTime('--comma-bounce-duration');
    const total = fall + rise;

    comma.classList.add('is-falling');
    comma.animate([
      // it tips over outward (head first) and falls, faster and faster
      { transform: 'translateY(0) rotate(0deg)', offset: 0, easing: 'cubic-bezier(0.55, 0, 0.9, 0.5)' },
      // it hits the line on its head and bounces straight back up to its place,
      // slowing down as it rises and standing up again on the way
      { transform: `translateY(${drop}px) rotate(95deg)`, offset: fall / total, easing: 'cubic-bezier(0.15, 0.55, 0.35, 1)' },
      { transform: 'translateY(0) rotate(0deg)', offset: 1 }
    ], { duration: total }).finished.then(() => {
      comma.classList.remove('is-falling');
    });
  });
});

// ---------- 9. The entrance: the words fall, then arrange themselves ----------

// When the home page opens, every word of the sentence and every punctuation mark
// falls from above the screen, one after another. Each one is a solid body the size
// of its letters: they fall with gravity, hit each other, turn, and pile up at the
// bottom without going into one another. Then they all glide into their places.
// Copies of the words move; the real sentence stays hidden until they arrive.

// The pieces that fall: each word, and each punctuation mark on its own
function entrancePieces() {
  const pieces = [];
  intro.querySelectorAll('.intro-text .word, .intro-tagline .word').forEach(word => {
    word.childNodes.forEach(node => {
      // The long dash is a red line drawn by the CSS (its letter has no size),
      // so it is measured by its own box and copied whole, line and all
      const isDrawn = node.nodeType !== Node.TEXT_NODE && node.classList.contains('accent-dash');
      const range = document.createRange();
      range.selectNodeContents(node);
      const box = isDrawn ? node.getBoundingClientRect() : range.getBoundingClientRect();
      if (!box.width) return; // hidden in this layout
      const styleOf = node.nodeType === Node.TEXT_NODE ? word : node;
      pieces.push({ node, text: node.textContent, box, isDrawn, style: getComputedStyle(styleOf) });
    });
  });
  return pieces;
}

// (The small physics world for the falling pieces is in physics.js.)

function playEntrance() {
  const root = document.documentElement;
  const finish = () => root.classList.remove('is-entering');
  if (!root.classList.contains('is-entering')) return;
  if (window.scrollY > 0 || wantsLessMotion() || phoneLayout.matches) { finish(); return; }

  // Scrolling (wheel, finger, or keys) during the entrance skips it: the words go straight
  // into the sentence and the projects appear, so the page can be scrolled to them
  let skipped = false;
  let frameId = 0, arrangeTimer = 0, doneTimer = 0;
  const scrollKeys = ['ArrowDown', 'PageDown', 'End', ' ', 'Spacebar'];
  const onKey = event => { if (scrollKeys.includes(event.key)) skip(); };
  const stopListening = () => {
    window.removeEventListener('wheel', skip);
    window.removeEventListener('touchmove', skip);
    window.removeEventListener('scroll', skip);
    window.removeEventListener('keydown', onKey);
  };
  function skip() {
    if (skipped) return;
    skipped = true;
    cancelAnimationFrame(frameId);
    clearTimeout(arrangeTimer);
    clearTimeout(doneTimer);
    stopListening();
    layer.remove();
    finish();
  }
  window.addEventListener('wheel', skip, { passive: true });
  window.addEventListener('touchmove', skip, { passive: true });
  window.addEventListener('scroll', skip, { passive: true });
  window.addEventListener('keydown', onKey);

  const stagger = cssTime('--entrance-stagger');
  const settle = cssTime('--entrance-settle');
  const rest = cssTime('--entrance-rest');
  const arrange = cssTime('--entrance-arrange-duration');
  const spread = cssTime('--entrance-arrange-spread');
  const css = getComputedStyle(document.body);
  const easing = css.getPropertyValue('--switch-easing').trim() || 'ease';
  // Gravity: how far a piece falls more each step (1/60 s), as part of the screen height
  const gravity = parseFloat(css.getPropertyValue('--entrance-gravity')) * window.innerHeight / 3600;
  const random = (from, to) => from + Math.random() * (to - from);

  const introBox = intro.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.className = 'morph-layer';
  layer.setAttribute('aria-hidden', 'true');
  intro.append(layer);

  // The floor: the bottom of the screen (the projects are hidden during the entrance,
  // styles.css, so the words pile up all the way down)
  const floor = window.innerHeight - introBox.top;
  const width = window.innerWidth;

  const measure = document.createElement('canvas').getContext('2d');
  const sizeIntro = parseFloat(css.getPropertyValue('--size-intro')) || 0; // for the dash, below

  const pieces = entrancePieces().map((piece, i) => {
    // The copy sits where the piece is in the sentence
    const copy = document.createElement('span');
    copy.className = 'morph-word';
    if (piece.isDrawn) {
      const drawn = piece.node.cloneNode(true);
      drawn.classList.remove('is-inviting');
      copy.append(drawn);
    } else {
      copy.textContent = piece.text;
    }
    // (each font setting on its own: some browsers don't give the whole "font" at once)
    ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle'].forEach(key => { copy.style[key] = piece.style[key]; });
    copy.style.color = piece.style.color;
    copy.style.letterSpacing = piece.style.letterSpacing;
    copy.style.left = (piece.box.left - introBox.left) + 'px';
    copy.style.top = (piece.box.top - introBox.top) + 'px';
    copy.style.lineHeight = piece.isDrawn ? '0' : piece.box.height + 'px';
    layer.append(copy);

    // The body is only as tall as the letters' ink (from the top of the tallest
    // letter to the bottom of the lowest), so pieces touch where the letters do
    const marker = document.createElement('span');
    marker.style.cssText = 'display:inline-block;width:0;height:0';
    copy.append(marker);
    const baseline = marker.getBoundingClientRect().top - piece.box.top; // inside the copy
    marker.remove();
    let inkTop, inkBottom;
    if (piece.isDrawn) {
      // The dash's red line: 0.204 to 0.288 of the font size above the line the letters stand on
      const size = parseFloat(piece.style.width) || sizeIntro || piece.box.width;
      inkTop = baseline - 0.288 * size; inkBottom = baseline - 0.204 * size;
    } else {
      measure.font = `${piece.style.fontStyle} ${piece.style.fontWeight} ${piece.style.fontSize} ${piece.style.fontFamily}`;
      const m = measure.measureText(piece.text);
      inkTop = baseline - m.actualBoundingBoxAscent; inkBottom = baseline + m.actualBoundingBoxDescent;
    }
    const bodyHeight = Math.max(inkBottom - inkTop, 4);
    const inkCenterY = (inkTop + inkBottom) / 2;
    copy.style.transformOrigin = `50% ${inkCenterY}px`;

    // Where the piece's ink center is in the sentence (the arrival point)
    const homeX = piece.box.left - introBox.left + piece.box.width / 2;
    const homeY = piece.box.top - introBox.top + inkCenterY;
    // It starts above the screen, anywhere across it, a little turned
    const startX = random(piece.box.width / 2, width - piece.box.width / 2);
    const startY = -bodyHeight - random(20, 160);
    const body = makeBody(piece.box.width, bodyHeight, startX, startY, random(-0.25, 0.25));
    body.corners.forEach(c => { c.oldX = c.x - random(-1.5, 1.5); });
    return { copy, body, homeX, homeY, startAt: i * stagger };
  });

  // Puts each copy where its body is now
  const placeCopies = () => pieces.forEach(({ copy, body, homeX, homeY }) => {
    const center = bodyCenter(body);
    const [c0, c1] = body.corners;
    const angle = Math.atan2(c1.y - c0.y, c1.x - c0.x) * 180 / Math.PI;
    copy.style.transform = `translate(${center.x - homeX}px, ${center.y - homeY}px) rotate(${angle}deg)`;
  });
  placeCopies();

  // 1. Fall: run the world (one step = 1/60 s) until the pile is still,
  //    or for at most --entrance-settle after the last piece starts falling
  const started = performance.now();
  const lastStart = (pieces.length - 1) * stagger;
  let stepsDone = 0, stillFrames = 0;
  function frame(now) {
    const elapsed = now - started;
    const stepsDue = Math.min(Math.floor(elapsed / (1000 / 60)), stepsDone + 4); // never more than 4 at once
    for (; stepsDone < stepsDue; stepsDone++) {
      const time = stepsDone * 1000 / 60;
      pieces.forEach(p => { if (time >= p.startAt) p.body.active = true; });
      stepWorld(pieces.map(p => p.body), gravity, floor, width);
    }
    placeCopies();
    // Still: no corner moved more than half a pixel in the last step
    const fastest = Math.max(...pieces.map(p => Math.max(...p.body.corners.map(c => Math.hypot(c.x - c.oldX, c.y - c.oldY)))));
    stillFrames = elapsed > lastStart && fastest < 0.5 ? stillFrames + 1 : 0;
    if (stillFrames < 20 && elapsed < lastStart + settle) frameId = requestAnimationFrame(frame);
    else arrangeTimer = setTimeout(arrangeAll, rest);
  }
  frameId = requestAnimationFrame(frame);

  // 2. Arrange: all glide from the pile into the sentence
  function arrangeAll() {
    let lastArrival = 0;
    pieces.forEach(({ copy }) => {
      // the shortest way back to straight (never more than half a turn)
      const from = copy.style.transform.replace(/rotate\((-?[\d.e-]+)deg\)/, (_, a) => `rotate(${((+a % 360) + 540) % 360 - 180}deg)`);
      const delay = random(0, spread);
      lastArrival = Math.max(lastArrival, delay + arrange);
      copy.animate([{ transform: from }, { transform: 'none' }], { duration: arrange, delay, easing, fill: 'both' });
    });
    // 3. Everything is in place: show the real sentence
    doneTimer = setTimeout(() => { stopListening(); layer.remove(); finish(); }, lastArrival + 30);
  }
}

// ---------- 10. Phone: images go out of focus under "Home" and the asterisk ----------
// For each project image: how much of it has scrolled up above the line under "Home"
// and the asterisk (--top-blur, in pixels). The CSS blurs only that part of the image.

const workImages = [...document.querySelectorAll('.work-image')];
const menuStar = document.querySelector('.menu-button');
let blurWaiting = false;

function blurUnderMenu() {
  blurWaiting = false;
  if (!phoneLayout.matches) return;
  const extra = parseFloat(getComputedStyle(document.body).getPropertyValue('--phone-blur-extra')) || 0;
  const line = menuStar.getBoundingClientRect().bottom + extra;
  workImages.forEach(image => {
    const box = image.getBoundingClientRect();
    const above = Math.min(Math.max(line - box.top, 0), box.height);
    image.style.setProperty('--top-blur', above + 'px');
  });
}

function askForBlur() {
  if (blurWaiting) return;
  blurWaiting = true;
  requestAnimationFrame(blurUnderMenu);
}

if (menuStar) {
  window.addEventListener('scroll', askForBlur, { passive: true });
  window.addEventListener('resize', askForBlur);
  blurUnderMenu();
}

// ---------- Start ----------

// Measure after the fonts are ready (they change the text size),
// and again when the window size changes
document.fonts.ready.then(watchIntro);
// The entrance starts once the fonts are ready (they decide where each word goes)
document.fonts.ready.then(playEntrance);
window.addEventListener('resize', watchIntro);
