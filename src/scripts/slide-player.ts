// Drives an exported slide deck (public/slides/*.html) sitting in a same-origin iframe.
// The deck already handles arrow keys, swipes and left/right-half taps on its own window;
// the buttons here just send it the same arrow keys, and the counter reads the deck's
// own "#n" location hash.

const NAV_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];

document.querySelectorAll<HTMLElement>('[data-slide-player]').forEach((player) => {
  const frame = player.querySelector<HTMLIFrameElement>('iframe')!;
  const prev = player.querySelector<HTMLButtonElement>('[data-sp="prev"]')!;
  const next = player.querySelector<HTMLButtonElement>('[data-sp="next"]')!;
  const count = player.querySelector<HTMLElement>('[data-sp="count"]')!;
  const fs = player.querySelector<HTMLButtonElement>('[data-sp="fs"]')!;

  const send = (key: string, shiftKey = false) => {
    frame.contentWindow?.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }));
    refresh();
  };

  function refresh() {
    const doc = frame.contentDocument;
    if (!doc) return;
    const total = doc.querySelectorAll('.deck-slide').length;
    if (!total) return;
    const m = /^#(\d+)$/.exec(frame.contentWindow!.location.hash);
    const cur = m ? Math.min(total, Math.max(1, Number(m[1]))) : 1;
    count.textContent = `${cur} / ${total}`;
    prev.disabled = cur <= 1;
    next.disabled = cur >= total;
  }

  prev.addEventListener('click', () => { prev.blur(); send('ArrowLeft'); });
  next.addEventListener('click', () => { next.blur(); send('ArrowRight'); });

  // Taps, swipes and keys inside the deck change the slide without telling us, so poll the hash.
  frame.addEventListener('load', refresh);
  setInterval(refresh, 250);

  // Keys pressed while the page (not the deck) has focus - e.g. a presenter clicker.
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || !NAV_KEYS.includes(e.key)) return;
    e.preventDefault();
    send(e.key, e.shiftKey);
  });

  fs.addEventListener('click', () => {
    fs.blur();
    const d = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
    const el = player as HTMLElement & { webkitRequestFullscreen?: () => void };
    if (document.fullscreenElement || d.webkitFullscreenElement) {
      (document.exitFullscreen ? document.exitFullscreen() : d.webkitExitFullscreen?.());
    } else if (el.requestFullscreen) {
      el.requestFullscreen();
    } else {
      el.webkitRequestFullscreen?.();
    }
  });
});
