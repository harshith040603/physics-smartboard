/* ═══════════ Practice - 50 Questions (Kinematics L1-4) ═══════════
   Section-filterable question navigator with reveal answers and a
   jump-to-number grid. Data in src/data/kinematics-practice.ts.      */

import { PRACTICE, SECTIONS } from '../data/kinematics-practice';

const $ = (id: string) => document.getElementById(id)!;

let pool: number[] = PRACTICE.map((_, i) => i); // indexes into PRACTICE
let pos = 0;                                    // position within pool
let activeSec = 'ALL';
const seen = new Set<number>();

function render() {
  const qi = pool[pos];
  const item = PRACTICE[qi];
  seen.add(qi);
  $('prTag').textContent = `Q${qi + 1} · Section ${item.sec} · ${SECTIONS[item.sec]}`;
  $('prText').textContent = item.q;
  $('prAns').textContent = item.a;
  $('prAns').classList.remove('shown');
  $('prReveal').textContent = 'Show answer';
  $('prCounter').textContent = `${pos + 1}/${pool.length}`;
  ($('prPrev') as HTMLButtonElement).disabled = pos === 0;
  $('prNext').textContent = pos === pool.length - 1 ? '↺ First question' : 'Next ›';
  renderGrid();
}

function renderGrid() {
  const grid = $('prGrid');
  grid.innerHTML = '';
  pool.forEach((qi, k) => {
    const b = document.createElement('button');
    b.className = 'pr-num';
    if (seen.has(qi)) b.classList.add('seen');
    if (k === pos) b.classList.add('active');
    b.textContent = String(qi + 1);
    b.onclick = () => { pos = k; render(); };
    grid.appendChild(b);
  });
}

function setSection(sec: string) {
  activeSec = sec;
  pool = PRACTICE.map((_, i) => i).filter(
    (i) => sec === 'ALL' || PRACTICE[i].sec === sec
  );
  pos = 0;
  document.querySelectorAll<HTMLButtonElement>('#prChips .rev-chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.sec === sec);
  });
  render();
}

function buildChips() {
  const holder = $('prChips');
  holder.innerHTML = '';
  const entries: Array<[string, string]> = [
    ['ALL', 'All 50'],
    ...Object.entries(SECTIONS).map(
      ([k, name]) => [k, `${k} · ${name}`] as [string, string]
    ),
  ];
  entries.forEach(([sec, label]) => {
    const b = document.createElement('button');
    b.className = 'rev-chip';
    b.dataset.sec = sec;
    b.textContent = label;
    b.onclick = () => setSection(sec);
    holder.appendChild(b);
  });
}

let built = false;

export function practiceScreenInit() {
  if (!built) {
    built = true;
    buildChips();
    $('prReveal').addEventListener('click', () => {
      const ans = $('prAns');
      ans.classList.toggle('shown');
      $('prReveal').textContent = ans.classList.contains('shown') ? 'Hide answer' : 'Show answer';
    });
    $('prPrev').addEventListener('click', () => { if (pos > 0) { pos--; render(); } });
    $('prNext').addEventListener('click', () => {
      pos = pos === pool.length - 1 ? 0 : pos + 1;
      render();
    });
    setSection('ALL');
  }
}
