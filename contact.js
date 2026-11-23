// The contact lines (Email, Instagram, LinkedIn) on the About page and the index page.
// A click on a line (the word or "(copy)") copies its address to the clipboard;
// nothing opens. After copying, "copy" says "copied" for a moment.

// The browser's clipboard works only on a secure page (https, like the site online).
// On the test link (http) the older way is used: the text is selected for a moment
// in a hidden box and copied from there.
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  const box = document.createElement('textarea');
  box.value = text;
  box.setAttribute('readonly', '');
  box.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  document.body.append(box);
  box.select();
  const copied = document.execCommand('copy');
  box.remove();
  return copied ? Promise.resolve() : Promise.reject(new Error('not copied'));
}

document.querySelectorAll('.about-copy').forEach(button => {
  const word = button.querySelector('.about-copy-word');

  button.addEventListener('click', async () => {
    try {
      await copyText(button.dataset.copy);
      word.textContent = 'copied';
      setTimeout(() => { word.textContent = 'copy'; }, 1500);
    } catch (error) { /* the browser did not allow copying */ }
  });
});
