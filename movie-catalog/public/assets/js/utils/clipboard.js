// utils/copyToClipboard.js
export function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied');

    setTimeout(() => {
      btn.classList.remove('copied');
    }, 1200);
  }).catch(err => {
    console.error('Copy failed', err);
  });
}

