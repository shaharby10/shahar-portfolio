// The mouse becomes "[ VIEW PROJECT ]" over a project's image
// (on the home page and on the Index; its look and timings are in styles.css).
// Only for a mouse on a wide screen; on a phone nothing changes.

// The images that show it: the projects on the home page, and on the Index
// the projects that have a page (a link)
const viewTargets = '.work-image, a.index-project .index-image';

// Over a project's image the arrow is hidden (styles.css) and "[ VIEW PROJECT ]"
// follows the mouse: it rises in, its brackets open and the words appear.
// When the mouse leaves the image, the words go, the brackets close and it
// disappears in place (the order and the timings are in styles.css).
const viewLabels = document.querySelectorAll('.cursor-view');
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

document.querySelectorAll(viewTargets).forEach(image => {
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
    viewClosing = setTimeout(() => document.body.classList.remove('is-view-closing'), parseFloat(getComputedStyle(document.body).getPropertyValue('--view-close-duration')) || 0);
  });
});

// Coming back to this page (the Back button): start hidden
window.addEventListener('pageshow', () => viewLabels.forEach(label => label.classList.remove('is-shown')));
