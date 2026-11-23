// Project pages and the index page:
// 1. Images and the video go from a blurred preview to sharp when they load.
// 2. "Back to top" glides back to the top of the page.
// 3. On the project page the title ends on the same line as the description.
// 4. Carousels (Cinema South, Shufuni on the phone), and the Cinema South teaser's sound button.
// 5. (No longer used: the index page's navigation is plain black, styles.css.)
// 6. Sections (Figma groups) that are taller than the screen shrink to fit.
// 7. Cinema South: a magnifier for the program page.
// 8. Project pages: each image comes into focus as it reaches the screen.
// 9. Project pages: the next project's words fall and go back to their places.

// ---------- 1. Progressive images and video ----------

function showWhenLoaded(media) {
  const box = media.closest('.progressive');
  const reveal = () => box.classList.add('is-loaded');
  const fail = () => box.classList.add('is-failed'); // the blurred preview stays

  if (media.tagName === 'VIDEO') {
    // A video is ready once its first frame can be shown
    if (media.readyState >= 2) reveal();
    else media.addEventListener('loadeddata', reveal, { once: true });
    // If the video can't load, its poster (a still from it) is shown instead
    media.addEventListener('error', () => (media.poster ? reveal : fail)(), { once: true });
    return;
  }

  if (media.complete) {
    // Already loaded (for example from the browser cache)
    if (media.naturalWidth > 0) media.decode().catch(() => {}).then(reveal); else fail();
  } else {
    // Wait until the image is decoded, so it appears in one smooth step
    media.addEventListener('load', () => media.decode().catch(() => {}).then(reveal), { once: true });
    media.addEventListener('error', fail, { once: true });
  }
}

document.querySelectorAll('.progressive-image').forEach(showWhenLoaded);

// People who ask their computer for less motion see the still first frame
// of the video instead of the turning plant
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('video').forEach(video => {
    video.removeAttribute('autoplay');
    video.pause();
  });
}

// ---------- 2. Back to top ----------

// The link already jumps to the top by itself (href="#").
// With JavaScript the page glides up smoothly instead
// (or jumps, for people who ask their computer for less motion).
document.querySelector('.nav-back-to-top').addEventListener('click', event => {
  event.preventDefault();
  const lessMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: lessMotion ? 'auto' : 'smooth' });
});

// ---------- 3. Project page: the title and the description end on one line ----------
// The title, the details next to it and the description's first paragraph
// ("…tradition and identity.") end on the same line. The browser rounds the
// description's letters a little differently at each window width, so the title
// and the details (which move together) are nudged into place by a few pixels.

const projectTitle = document.querySelector('.project-title');
const descriptionText = document.querySelector('.project-intro p');

// The height of the line the letters sit on, at the end of an element
function lastBaseline(element) {
  const marker = document.createElement('span');
  marker.style.cssText = 'display:inline-block;width:0;height:0';
  element.append(marker);
  const y = marker.getBoundingClientRect().top;
  marker.remove();
  return y;
}

function alignTitle() {
  document.body.style.setProperty('--title-shift', '0px');
  const shift = lastBaseline(descriptionText) - lastBaseline(projectTitle);
  document.body.style.setProperty('--title-shift', shift + 'px');
}

if (projectTitle && descriptionText) {
  document.fonts.ready.then(alignTitle);
  window.addEventListener('resize', alignTitle);
}

// ---------- 4. Cinema South: the program carousel and the teaser's sound ----------

// Carousels (.carousel): one slide at a time, sliding like a strip. The arrows slide
// to the next or previous one, and after the last one it goes back to the first (and
// the other way round); on a touch screen a finger can also drag them. On Cinema South: the pages-turning video first (it plays by itself),
// then three spreads. A video in a slide plays only while its slide shows.
document.querySelectorAll('.carousel').forEach(carousel => {
  const slides = [...carousel.querySelectorAll('.carousel-slide')];
  const lessMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = getComputedStyle(document.body);
  const duration = lessMotion ? 0 : parseFloat(css.getPropertyValue('--carousel-duration')) || 0;
  const easing = css.getPropertyValue('--carousel-easing').trim() || 'ease';
  let current = 0;
  let moving = false;
  const neighbor = direction => slides[(current + direction + slides.length) % slides.length];

  // Slides from the current image to the next (direction 1, it comes from the right)
  // or the previous one (-1). "from": how far the images have already been dragged.
  function go(direction, from = 0) {
    if (moving || slides.length < 2) return;
    const width = carousel.clientWidth;
    const leaving = slides[current];
    const coming = neighbor(direction);
    current = slides.indexOf(coming);
    carousel.classList.add('has-moved');
    moving = true;
    leaving.classList.add('is-moving');
    coming.classList.add('is-current');
    const comingVideo = coming.querySelector('video');
    if (comingVideo && !lessMotion) comingVideo.play().catch(() => {});
    // the rest of the way takes the rest of the time
    const time = duration * (1 - Math.min(Math.abs(from) / width, 0.9));
    leaving.style.translate = coming.style.translate = '';
    leaving.animate([{ translate: `${from}px 0` }, { translate: `${-direction * width}px 0` }], { duration: time, easing });
    const arrival = coming.animate([{ translate: `${from + direction * width}px 0` }, { translate: '0 0' }], { duration: time, easing });
    arrival.onfinish = () => {
      leaving.classList.remove('is-current', 'is-moving');
      const leavingVideo = leaving.querySelector('video');
      if (leavingVideo) leavingVideo.pause();
      moving = false;
    };
  }

  // A drag that was too short: everything glides back
  function goBack(direction, from) {
    const width = carousel.clientWidth;
    const here = slides[current], other = neighbor(direction);
    here.style.translate = other.style.translate = '';
    here.animate([{ translate: `${from}px 0` }, { translate: '0 0' }], { duration: duration / 2, easing });
    const back = other.animate([{ translate: `${from + direction * width}px 0` }, { translate: `${direction * width}px 0` }], { duration: duration / 2, easing });
    back.onfinish = () => other.classList.remove('is-moving');
  }

  carousel.querySelector('.carousel-next').addEventListener('click', () => go(1));
  carousel.querySelector('.carousel-previous').addEventListener('click', () => go(-1));

  // A finger (or pen) can drag the images: the next one follows the finger,
  // and letting go finishes the slide (or brings it back if the drag was short)
  let start = null;
  carousel.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' || moving || slides.length < 2 || event.target.closest('.carousel-arrow')) return;
    start = { x: event.clientX, y: event.clientY, time: performance.now(), dx: 0, direction: 0 };
  });
  carousel.addEventListener('pointermove', event => {
    if (!start) return;
    const dx = event.clientX - start.x;
    if (!start.direction) {
      if (Math.abs(event.clientY - start.y) > Math.abs(dx)) { start = null; return; } // scrolling the page
      if (Math.abs(dx) < 6) return;
      carousel.setPointerCapture(event.pointerId);
    }
    const direction = dx < 0 ? 1 : -1;
    if (start.direction && direction !== start.direction) neighbor(start.direction).classList.remove('is-moving'), neighbor(start.direction).style.translate = '';
    start.direction = direction;
    start.dx = dx;
    const width = carousel.clientWidth;
    const other = neighbor(direction);
    other.classList.add('is-moving');
    slides[current].style.translate = `${dx}px 0`;
    other.style.translate = `${dx + direction * width}px 0`;
  });
  const letGo = () => {
    if (!start) return;
    const { dx, direction, time } = start;
    start = null;
    if (!direction) return;
    const fast = Math.abs(dx) / (performance.now() - time) > 0.4; // a quick flick
    if (Math.abs(dx) > carousel.clientWidth * 0.2 || fast) go(direction, dx);
    else goBack(direction, dx);
  };
  carousel.addEventListener('pointerup', letGo);
  carousel.addEventListener('pointercancel', letGo);
});

// The teaser plays by itself without sound. "sound on" starts it again from
// the beginning, with sound; "sound off" turns the sound off and it goes on.
const soundButton = document.querySelector('.teaser-sound');
const teaser = document.querySelector('.project-teaser video');

if (soundButton && teaser) {
  soundButton.addEventListener('click', () => {
    const turnOn = teaser.muted;
    if (turnOn) {
      teaser.currentTime = 0;
      teaser.muted = false;
      teaser.play().catch(() => {});
    } else {
      teaser.muted = true;
    }
    soundButton.textContent = turnOn ? 'sound off' : 'sound on';
    soundButton.setAttribute('aria-pressed', turnOn);
  });
}

// ---------- 6. Sections taller than the screen shrink to fit ----------
// Each element marked data-section belongs to a section (a group in Figma).
// The page grows and shrinks with the window's width, like the Figma frame. On a
// screen too short for a section, the section's images shrink together, keeping
// their composition, until they fit (with --fit-margin above and below), toward the
// section's left side, which stays where it is in Figma (a band marked data-section-background or data-section-stretch keeps its
// width, and only its height shrinks). Text keeps its size and box width (and stays
// lined up with an image whose left side it shares in Figma), and keeps its place next to the
// biggest image beside it: the same distance sideways, and the same relative height.
// The sections then follow one another with the same space between them as in Figma.
// Everything is in Figma pixels; the CSS turns them into real pixels (--fit-left...).

const sectionItems = [...document.querySelectorAll('[data-section]')];

if (sectionItems.length) {
  const figma = item => {
    const style = item.style;
    const get = name => parseFloat(style.getPropertyValue(name));
    const box = { left: get('--left'), top: get('--top'), width: get('--width') || 0, height: get('--height') || 0 };
    // A turned element takes a little more room: measure the box around it
    const turn = Math.abs(get('--turn') || 0) * Math.PI / 180;
    if (turn) {
      const width = box.width * Math.cos(turn) + box.height * Math.sin(turn);
      const height = box.width * Math.sin(turn) + box.height * Math.cos(turn);
      box.left -= (width - box.width) / 2; box.top -= (height - box.height) / 2;
      box.width = width; box.height = height;
      box.turned = true;
    }
    return box;
  };
  const centered = item => getComputedStyle(item).transform.startsWith('matrix(1, 0, 0, 1, -'); // placed by its middle
  const items = sectionItems.map(item => ({
    item, section: item.dataset.section, box: figma(item),
    isText: item.hasAttribute('data-section-text'),
    isBackground: item.hasAttribute('data-section-background'),
    isStretched: item.hasAttribute('data-section-stretch') // keeps its width; only its height shrinks
  }));

  // The sections, in the order they come down the page
  const names = [...new Set(items.map(i => i.section))];
  const sections = names.map(name => {
    const all = items.filter(i => i.section === name);
    const images = all.filter(i => !i.isText);
    const outer = images.length ? images : all;
    return {
      all, images: images.filter(i => !i.isBackground),
      top: Math.min(...outer.map(i => i.box.top)),
      bottom: Math.max(...outer.map(i => i.box.top + i.box.height))
    };
  }).sort((a, b) => a.top - b.top);

  // The page's height in Figma pixels (the number in --project-page-height, styles.css)
  const pageHeight = parseFloat((getComputedStyle(document.body).getPropertyValue('--project-page-height').match(/[\d.]+/) || [0])[0]);

  function fitSections() {
    const unit = document.body.clientWidth / 1440;
    const margin = parseFloat(getComputedStyle(document.body).getPropertyValue('--fit-margin')) || 0;
    const room = (window.innerHeight - 2 * margin) / unit; // in Figma pixels
    let shift = 0; // how much shorter the page has become
    const placed = []; // the sections already placed (their elements: Figma box and new box)
    sections.forEach(section => {
      const height = section.bottom - section.top;
      const shrink = section.images.length ? Math.min(1, room / height) : 1;
      // The section starts under everything above it that it lines up with sideways,
      // at the same distance as in Figma (so nothing goes into anything else)
      const sLeft = Math.min(...section.all.map(i => i.box.left)), sRight = Math.max(...section.all.map(i => i.box.left + i.box.width));
      const previous = placed.length ? placed[placed.length - 1] : [];
      const above = previous.filter(p => p.box.left < sRight && p.box.left + p.box.width > sLeft);
      const gapUnder = p => section.top - (p.box.top + p.box.height); // its distance in Figma
      const newBottom = p => p.fit.top + (p.isText ? p.box.height : p.fit.height);
      // The tightest space in Figma between the section and an image above it
      const imageGaps = above.filter(p => !p.isText).map(gapUnder).filter(g => g >= 0);
      const tightest = imageGaps.length ? Math.min(...imageGaps) : Infinity;
      // Each element above keeps its distance, but never more than the tightest one
      // (an element that ended high above in Figma doesn't push the section down)
      const limits = above.map(p => newBottom(p) + Math.min(gapUnder(p), tightest));
      // (if nothing above lines up with it sideways: the same space under the section above)
      const previousBottom = previous.length ? Math.max(...previous.map(newBottom)) : 0;
      const previousFigmaBottom = previous.length ? Math.max(...previous.map(p => p.box.top + p.box.height)) : 0;
      const newTop = limits.length ? Math.max(...limits)
        : previous.length ? previousBottom + (section.top - previousFigmaBottom) : section.top - shift;
      const imgs = section.images;
      const left = imgs.length ? Math.min(...imgs.map(i => i.box.left)) : 0;
      const right = imgs.length ? Math.max(...imgs.map(i => i.box.left + i.box.width)) : 0;
      // A section that shrinks stays on its left side, where it is in Figma
      // (its sizes shrink the same; only where it shrinks toward changes).
      // An image that reaches the page's right edge (or past it) stays on the right edge,
      // so the left and right parts of the section move apart instead of into each other.
      const anchor = left;
      const touchesRight = b => b.left > anchor && b.left + b.width >= 1440 - 1;
      // Where a right-side image goes: on the right edge, but if it has data-fit-gap,
      // only that far (Figma pixels, shrinking with the section) from the images on its left
      const rightSide = (i, b, w) => {
        const onEdge = b.left + b.width - w;
        const gap = parseFloat(i.item.dataset.fitGap);
        if (isNaN(gap)) return onEdge;
        const leftImages = section.images.filter(x => x !== i && !touchesRight(x.box) && x.fit);
        if (!leftImages.length) return onEdge;
        const leftEnd = Math.max(...leftImages.map(x => x.fit.left + x.fit.width));
        return Math.min(onEdge, leftEnd + gap * shrink);
      };
      const place = (i, l, t, w, h) => {
        i.fit = { left: l, top: t, width: w, height: h };
        const set = (name, value) => value === null ? i.item.style.removeProperty(name) : i.item.style.setProperty(name, value);
        const still = shrink === 1 && Math.abs(newTop - section.top) < 0.01;
        set('--fit-left', still ? null : l);
        set('--fit-top', still ? null : t);
        set('--fit-width', shrink === 1 || i.isText ? null : w);
        set('--fit-height', shrink === 1 || i.isText ? null : h);
      };
      // 1. The images (and a background band, which stays as wide as the page)
      const order = i => (touchesRight(i.box) ? 1 : 0);
      section.all.filter(i => !i.isText).sort((x, y) => order(x) - order(y)).forEach(i => {
        const b = i.box;
        const t = newTop + (b.top - section.top) * shrink;
        if (i.isBackground || i.isStretched) place(i, b.left, t, b.width, b.height * shrink); // keeps its width
        else if (b.turned) {
          // placed by the box around it, sized by its own box
          const own = { width: parseFloat(i.item.style.getPropertyValue('--width')), height: parseFloat(i.item.style.getPropertyValue('--height')) };
          const w = b.width * shrink, h = b.height * shrink;
          const l = touchesRight(b) ? rightSide(i, b, w) : anchor + (b.left - anchor) * shrink;
          place(i, l + (w - own.width * shrink) / 2, t + (h - own.height * shrink) / 2, own.width * shrink, own.height * shrink);
          i.fit = { left: l, top: t, width: w, height: h }; // (for the text beside it and the next section)
        }
        else if (touchesRight(b)) place(i, rightSide(i, b, b.width * shrink), t, b.width * shrink, b.height * shrink);
        else place(i, anchor + (b.left - anchor) * shrink, t, b.width * shrink, b.height * shrink);
        if (i.item.classList.contains('program-carousel')) i.item.style.setProperty('--fit', shrink);
      });
      // 2. The text: next to the biggest image beside it (or the biggest image in the section)
      section.all.filter(i => i.isText).forEach(i => {
        const b = i.box;
        const beside = imgs.filter(m => m.box.top < b.top + Math.max(b.height, 1) && m.box.top + m.box.height > b.top);
        const pool = beside.length ? beside : imgs;
        if (!pool.length) { place(i, b.left, newTop + (b.top - section.top), b.width, b.height); return; }
        const near = pool.reduce((x, y) => x.box.width * x.box.height >= y.box.width * y.box.height ? x : y);
        const m = near.box, f = near.fit;
        const textLeft = centered(i.item) ? b.left - b.width / 2 : b.left;
        let l;
        if (textLeft >= m.left + m.width) l = b.left + (f.left + f.width) - (m.left + m.width);       // right of it: same gap
        else if (textLeft + b.width <= m.left) l = b.left + f.left - m.left;                            // left of it: same gap
        else l = f.left + (b.left - m.left) / m.width * f.width;                                       // above or below it
        // Text lined up in Figma with an image's left side stays lined up with it
        const lined = imgs.find(x => Math.abs(x.box.left - textLeft) < 1);
        if (lined) l = lined.fit.left + (b.left - textLeft);
        const t = f.top + (b.top - m.top) / m.height * f.height;                                        // same relative height
        place(i, l, t, b.width, b.height);
      });
      // A section marked data-section-center: the whole group, as it is (same sizes and
      // distances), is moved sideways so its middle is the page's middle, on every screen.
      // Its visible edges are measured on what shows: text boxes, images, and for an image
      // with see-through sides, the part given in data-ink-x (from, to: parts of its width).
      if (section.all.some(i => i.item.hasAttribute('data-section-center'))) {
        const edges = section.all.filter(i => !i.item.hasAttribute('data-center-ignore')).map(i => {
          const f = i.fit, isCentered = i.isText && centered(i.item);
          const from = isCentered ? f.left - f.width / 2 : f.left;
          const ink = (i.item.dataset.inkX || '0 1').split(' ').map(Number);
          return [from + ink[0] * f.width, from + ink[1] * f.width];
        });
        const dx = 720 - (Math.min(...edges.map(e => e[0])) + Math.max(...edges.map(e => e[1]))) / 2;
        section.all.forEach(i => {
          const style = i.item.style;
          const current = name => parseFloat(style.getPropertyValue('--fit-' + name) || style.getPropertyValue('--' + name));
          style.setProperty('--fit-left', current('left') + dx);
          style.setProperty('--fit-top', current('top'));
          i.fit.left += dx;
        });
      }
      placed.push(section.all);
      shift = section.top - newTop + height * (1 - shrink);
    });
    document.body.style.setProperty('--project-page-height', `calc(${pageHeight - shift} * var(--unit))`);
  }

  if (!window.matchMedia('(max-width: 791px)').matches) {
    fitSections();
    window.addEventListener('resize', fitSections);
  }
}

// ---------- 7. Cinema South: a magnifier for the program page ----------
// Over the program page and the close-up (each .magnifier-target) the mouse becomes,
// by itself, a wide red rectangle that shows what is under it, enlarged (from a sharper
// copy of the image, data-zoom-src). Only for a mouse.

const magnifierTargets = [...document.querySelectorAll('.magnifier-target')];

if (magnifierTargets.length) {
  const lens = document.createElement('div');
  lens.className = 'magnifier-lens';
  lens.setAttribute('aria-hidden', 'true');
  document.body.append(lens);
  // On only where there is a mouse (a phone or a tablet has no mouse to turn into a lens)
  const mouse = window.matchMedia('(hover: hover) and (pointer: fine)');
  let on = mouse.matches;
  document.body.classList.toggle('is-magnifying', on);
  mouse.addEventListener('change', () => {
    on = mouse.matches;
    document.body.classList.toggle('is-magnifying', on);
  });
  let current = null; // the image the lens is over now

  function moveLens(event) {
    if (!on) return;
    const box = event.currentTarget.getBoundingClientRect();
    const zoom = parseFloat(getComputedStyle(document.body).getPropertyValue('--magnifier-zoom')) || 2.5;
    const width = lens.offsetWidth, height = lens.offsetHeight;
    // where the mouse is on the image, as a part of its width and height (0 to 1)
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    // the lens is centered on the mouse, and so is the enlarged spot inside it
    lens.style.left = event.clientX - width / 2 + 'px';
    lens.style.top = event.clientY - height / 2 + 'px';
    lens.style.backgroundSize = `${box.width * zoom}px ${box.height * zoom}px`;
    lens.style.backgroundPosition = `${width / 2 - x * box.width * zoom}px ${height / 2 - y * box.height * zoom}px`;
  }

  magnifierTargets.forEach(target => {
    target.addEventListener('pointerenter', event => {
      if (!on || event.pointerType !== 'mouse') return;
      // the sharper copy of this image (it loads the first time the lens is over it)
      lens.style.backgroundImage = `url('${target.dataset.zoomSrc}')`;
      current = target;
      lens.classList.add('is-showing');
      moveLens(event);
    });
    target.addEventListener('pointermove', moveLens);
    // (only when leaving the image it is showing: the images touch, and the order of
    // "leave" and "enter" between them is not always the same)
    target.addEventListener('pointerleave', () => { if (current === target) lens.classList.remove('is-showing'); });
  });
}


// ---------- 8. Project pages: each image comes into focus as it reaches the screen ----------
// When an image (or video) first reaches the screen it is blurred, and it comes into
// focus, then stays in focus. It takes a second for an image and half a second for a
// video (--focus-duration and --focus-duration-video, styles.css), or less when the
// page is scrolled fast: the focus also follows how far the image has moved up since
// it arrived (a share of the screen's height, --focus-distance).
// The images at the top of each page (the header, .project-header-media) are left out.
// People who ask their computer for less motion see the images in focus right away.
const focusBoxes = document.querySelectorAll('.project .progressive:not(.project-header-media)');

if (focusBoxes.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const pageStyle = getComputedStyle(document.body);
  const focusDuration = parseFloat(pageStyle.getPropertyValue('--focus-duration')) || 1000;
  const focusDurationVideo = parseFloat(pageStyle.getPropertyValue('--focus-duration-video')) || 500;
  const focusDistance = parseFloat(pageStyle.getPropertyValue('--focus-distance')) || 0.3;
  const arriving = new Map(); // image box → { when it arrived, where its top was then }
  let frameAsked = false;

  // Every image starts blurred (styles.css), until it has come into focus once
  focusBoxes.forEach(box => box.classList.add('is-unfocused'));

  function focusStep(now) {
    frameAsked = false;
    arriving.forEach((start, box) => {
      const byTime = Math.min(1, (now - start.time) / start.duration);
      const easedTime = 1 - (1 - byTime) * (1 - byTime); // fast at first, softer at the end
      const moved = start.top - box.getBoundingClientRect().top;
      const byScroll = moved / (window.innerHeight * focusDistance);
      const focus = Math.min(1, Math.max(0, easedTime, byScroll));
      box.style.setProperty('--focus', focus);
      if (focus >= 1) {
        // In focus: it stays so
        arriving.delete(box);
        box.classList.remove('is-unfocused');
        box.style.removeProperty('--focus');
      }
    });
    if (arriving.size) askFocusFrame();
  }

  function askFocusFrame() {
    if (frameAsked) return;
    frameAsked = true;
    requestAnimationFrame(focusStep);
  }

  const focusWatcher = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const duration = entry.target.querySelector('video') ? focusDurationVideo : focusDuration;
      arriving.set(entry.target, { time: performance.now(), top: entry.boundingClientRect.top, duration });
      focusWatcher.unobserve(entry.target); // only the first time
    });
    if (arriving.size) askFocusFrame();
  });
  focusBoxes.forEach(box => focusWatcher.observe(box));
}

// ---------- 9. Project pages: the next project's words fall, then go back one by one ----------
// When the "NEXT UP" block at the bottom reaches the screen (and at least 1.5 s,
// --next-fall-delay, after the project's last image did), its words (and the hand, the
// arrow and the red line) fall from above the screen by themselves, like the sentence on
// the home page: one after another, with the same gravity, as solid bodies that hit each
// other and pile up at the bottom of the screen. They fall behind the project's images,
// never in front of them. "VIEW PROJECT" falls as one piece. Unlike the home page, each
// piece goes straight back to its place as soon as it lies still on the pile, without
// waiting for the others. Once all are back, the arrow next to "VIEW PROJECT" wiggles a
// little, to show it can be clicked. Copies move; the real words are hidden until all the
// copies are back. Once per visit, and not for people who ask their computer for less
// motion. (The physics is in physics.js.)

const nextPieceSelector = [
  '.project-next-label', '.project-next-hand', '.project-next-tag', '.project-next-arrow',
  '.project-next-view', '.project-next-title',
  '.phone-next-label', '.phone-next-title', '.phone-next-tag', '.phone-next-line',
  '.phone-next-arrow', '.phone-next-view'
].join(', ');

// The main that shows now (the computer's or the phone's)
function visibleProjectMain() {
  return [...document.querySelectorAll('main.project')].find(main => main.offsetParent !== null || main.getClientRects().length);
}

// The pieces that fall: every word of the block's text, "VIEW PROJECT" as one piece,
// and the hand and the red line whole
function nextPieces(elements) {
  const pieces = [];
  elements.forEach(element => {
    if (element.tagName === 'IMG' || element.classList.contains('phone-next-line')) {
      pieces.push({ element, whole: true, box: element.getBoundingClientRect() });
      return;
    }
    if (element.matches('.project-next-view, .phone-next-view')) {
      const range = document.createRange();
      range.selectNodeContents(element);
      const box = range.getBoundingClientRect();
      if (box.width) pieces.push({ text: element.textContent.trim(), box, style: getComputedStyle(element) });
      return;
    }
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      for (const match of node.textContent.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        const box = range.getBoundingClientRect();
        if (box.width) pieces.push({ text: match[0], box, style: getComputedStyle(node.parentElement) });
      }
    }
  });
  return pieces;
}

function playNextFall(main) {
  const elements = [...main.querySelectorAll(nextPieceSelector)];
  if (!elements.length) return;

  const css = getComputedStyle(document.body);
  const time = name => parseFloat(css.getPropertyValue(name)) || 0;
  const stagger = time('--entrance-stagger');
  const settle = time('--entrance-settle');
  const arrange = time('--entrance-arrange-duration');
  const easing = css.getPropertyValue('--switch-easing').trim() || 'ease';
  const gravity = parseFloat(css.getPropertyValue('--entrance-gravity')) * window.innerHeight / 3600;
  const random = (from, to) => from + Math.random() * (to - from);

  // The copies live in a layer inside the project, before all of its images, so every
  // image is drawn over them: the words fall behind the images, never in front.
  // The layer starts at the top left of the page (page coordinates, so the page can scroll).
  const pageX = window.scrollX, pageY = window.scrollY;
  const mainBox = main.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.className = 'next-fall-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.left = -(mainBox.left + pageX) + 'px';
  layer.style.top = -(mainBox.top + pageY) + 'px';
  main.prepend(layer);
  // The floor is always the bottom of the screen as it is right now: if the page is
  // still scrolling (or the visitor scrolls during the fall), it moves with the screen
  const screenBottom = () => window.scrollY + window.innerHeight;
  const width = document.documentElement.clientWidth;
  const measure = document.createElement('canvas').getContext('2d');

  const pieces = nextPieces(elements).map((piece, i) => {
    let copy;
    if (piece.whole) {
      copy = piece.element.cloneNode(true);
      copy.removeAttribute('style');
      copy.className = 'morph-word';
      copy.style.width = piece.box.width + 'px';
      copy.style.height = piece.box.height + 'px';
      if (piece.element.tagName !== 'IMG') copy.style.background = getComputedStyle(piece.element).backgroundColor;
    } else {
      copy = document.createElement('span');
      copy.className = 'morph-word';
      copy.textContent = piece.text;
      ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'color', 'letterSpacing', 'textTransform', 'textDecoration']
        .forEach(key => { copy.style[key] = piece.style[key]; });
      copy.style.lineHeight = piece.box.height + 'px';
    }
    copy.style.left = (piece.box.left + pageX) + 'px';
    copy.style.top = (piece.box.top + pageY) + 'px';
    layer.append(copy);

    // The body is as tall as the letters' ink (whole pieces: their whole box)
    let inkTop = 0, inkBottom = piece.box.height;
    if (!piece.whole) {
      const marker = document.createElement('span');
      marker.style.cssText = 'display:inline-block;width:0;height:0';
      copy.append(marker);
      const baseline = marker.getBoundingClientRect().top - copy.getBoundingClientRect().top;
      marker.remove();
      measure.font = `${piece.style.fontStyle} ${piece.style.fontWeight} ${piece.style.fontSize} ${piece.style.fontFamily}`;
      const m = measure.measureText(piece.text);
      inkTop = baseline - m.actualBoundingBoxAscent;
      inkBottom = baseline + m.actualBoundingBoxDescent;
    }
    const bodyHeight = Math.max(inkBottom - inkTop, 4);
    const inkCenterY = (inkTop + inkBottom) / 2;
    copy.style.transformOrigin = `50% ${inkCenterY}px`;

    const homeX = piece.box.left + pageX + piece.box.width / 2;
    const homeY = piece.box.top + pageY + inkCenterY;
    // It starts above the screen, anywhere across it, a little turned
    const startX = random(piece.box.width / 2, width - piece.box.width / 2);
    const startY = pageY - bodyHeight - random(20, 160);
    const body = makeBody(piece.box.width, bodyHeight, startX, startY, random(-0.25, 0.25));
    body.corners.forEach(c => { c.oldX = c.x - random(-1.5, 1.5); });
    return { copy, body, homeX, homeY, startAt: i * stagger, still: 0, home: false };
  });

  // The real block hides while its copies fall
  elements.forEach(element => { element.style.visibility = 'hidden'; });

  const placeCopy = ({ copy, body, homeX, homeY }) => {
    const center = bodyCenter(body);
    const [c0, c1] = body.corners;
    const angle = Math.atan2(c1.y - c0.y, c1.x - c0.x) * 180 / Math.PI;
    copy.style.transform = `translate(${center.x - homeX}px, ${center.y - homeY}px) rotate(${angle}deg)`;
  };
  pieces.forEach(placeCopy);

  let arrived = 0;
  // A piece leaves the pile and glides straight back to its place
  function sendHome(piece) {
    piece.home = true;
    piece.body.active = false;
    const from = piece.copy.style.transform.replace(/rotate\((-?[\d.e-]+)deg\)/, (_, a) => `rotate(${((+a % 360) + 540) % 360 - 180}deg)`);
    piece.copy.animate([{ transform: from }, { transform: 'none' }], { duration: arrange, easing, fill: 'both' })
      .finished.then(() => {
        arrived += 1;
        if (arrived === pieces.length) {
          // All back: show the real block again, and the arrow wiggles to invite a click
          elements.forEach(element => { element.style.visibility = ''; });
          layer.remove();
          main.querySelectorAll('.project-next-arrow, .phone-next-arrow').forEach(arrow => {
            arrow.classList.add('is-inviting');
            arrow.addEventListener('animationend', () => arrow.classList.remove('is-inviting'), { once: true });
          });
        }
      });
  }

  // Fall: one step = 1/60 s. A piece that has started and lies still for a moment
  // goes home at once; whatever is left after --entrance-settle goes home too.
  const started = performance.now();
  const lastStart = (pieces.length - 1) * stagger;
  let stepsDone = 0;
  function frame(now) {
    const elapsed = now - started;
    const stepsDue = Math.min(Math.floor(elapsed / (1000 / 60)), stepsDone + 4);
    for (; stepsDone < stepsDue; stepsDone++) {
      const stepTime = stepsDone * 1000 / 60;
      pieces.forEach(p => { if (!p.home && stepTime >= p.startAt) p.body.active = true; });
      stepWorld(pieces.map(p => p.body), gravity, screenBottom(), width);
    }
    pieces.forEach(piece => {
      if (piece.home || !piece.body.active) return;
      placeCopy(piece);
      const speed = Math.max(...piece.body.corners.map(c => Math.hypot(c.x - c.oldX, c.y - c.oldY)));
      piece.still = speed < 0.5 ? piece.still + 1 : 0;
      if (piece.still >= 8) sendHome(piece); // still for about 8 frames: it has landed
    });
    const waiting = pieces.filter(p => !p.home);
    if (!waiting.length) return;
    if (elapsed > lastStart + settle) { waiting.forEach(sendHome); return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (typeof makeBody === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const main = visibleProjectMain();
  const images = main ? [...main.querySelectorAll('.progressive')] : [];
  const lastImage = images[images.length - 1];
  const block = main && main.querySelector('.project-next-label, .phone-next-label');
  if (lastImage && block) {
    const delay = parseFloat(getComputedStyle(document.body).getPropertyValue('--next-fall-delay')) || 1500;
    let lastImageSeenAt = null;
    let started = false;

    // When the last image first reaches the screen
    const imageWatcher = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      lastImageSeenAt = performance.now();
      imageWatcher.disconnect();
    });
    imageWatcher.observe(lastImage);

    // When the NEXT UP block itself is on the screen: start (once), but not sooner
    // than --next-fall-delay after the last image was reached
    const blockWatcher = new IntersectionObserver(entries => {
      if (started || !entries.some(entry => entry.isIntersecting)) return;
      started = true;
      blockWatcher.disconnect();
      const since = lastImageSeenAt === null ? 0 : performance.now() - lastImageSeenAt;
      setTimeout(() => playNextFall(main), Math.max(0, delay - since));
    }, { threshold: 0.5 });
    blockWatcher.observe(block);
  }
}
