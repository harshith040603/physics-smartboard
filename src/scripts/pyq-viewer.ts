/* ═══════════ JEE Main PYQ viewer (Units & Dimensions) ═══════════
   Section-filterable question list. Answers + solutions stay hidden
   until the student clicks "Check answer" on a card (or "Reveal all").
   Markup is rendered server-side in the Astro page; this only wires up
   the filtering and the reveal toggles.                              */

let built = false;

function updateCount() {
  const visible = document.querySelectorAll<HTMLElement>('.pyq-card:not(.hide)').length;
  const el = document.getElementById('pyqCount');
  if (el) el.textContent = `${visible} question${visible === 1 ? '' : 's'}`;
}

function setSection(sec: string) {
  document.querySelectorAll<HTMLElement>('.pyq-card').forEach((card) => {
    card.classList.toggle('hide', sec !== 'ALL' && card.dataset.sec !== sec);
  });
  document.querySelectorAll<HTMLButtonElement>('.pyq-chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.sec === sec);
  });
  updateCount();
}

function toggleCard(card: HTMLElement, show?: boolean) {
  const ans = card.querySelector<HTMLElement>('.pyq-answer');
  const btn = card.querySelector<HTMLButtonElement>('.pyq-reveal');
  if (!ans || !btn) return;
  const open = show === undefined ? !card.classList.contains('open') : show;
  card.classList.toggle('open', open);
  btn.textContent = open ? 'Hide answer' : 'Check answer';
}

export function pyqViewerInit() {
  if (built) return;
  built = true;

  document.querySelectorAll<HTMLButtonElement>('.pyq-chip').forEach((chip) => {
    chip.addEventListener('click', () => setSection(chip.dataset.sec || 'ALL'));
  });

  document.querySelectorAll<HTMLElement>('.pyq-card').forEach((card) => {
    const btn = card.querySelector<HTMLButtonElement>('.pyq-reveal');
    btn?.addEventListener('click', () => toggleCard(card));
  });

  const allBtn = document.getElementById('pyqRevealAll');
  allBtn?.addEventListener('click', () => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.pyq-card:not(.hide)'));
    const anyClosed = cards.some((c) => !c.classList.contains('open'));
    cards.forEach((c) => toggleCard(c, anyClosed));
    allBtn.textContent = anyClosed ? 'Hide all answers' : 'Reveal all answers';
  });

  setSection('ALL');
}
