/* ═══════════ Periodic Classification - chapter script ═══════════
   Interactive hooks for four screens (triads, octaves, predictions are
   handled inline, iupac) plus KaTeX for Moseley. Registered on
   window.SCREEN_INIT, consumed by studio-core go().                    */

import katex from 'katex';
import 'katex/dist/katex.min.css';

const done = new Set<string>();

/* ───────── 02 · Döbereiner's triads ───────── */
interface Triad { key: string; els: Array<[string, number, string]>; pass: boolean; }
const TRIADS: Triad[] = [
  { key: 'Li · Na · K', pass: true,  els: [['Li', 7, 'Lithium'], ['Na', 23, 'Sodium'], ['K', 39, 'Potassium']] },
  { key: 'Ca · Sr · Ba', pass: true, els: [['Ca', 40, 'Calcium'], ['Sr', 88, 'Strontium'], ['Ba', 137, 'Barium']] },
  { key: 'Cl · Br · I', pass: true,  els: [['Cl', 35.5, 'Chlorine'], ['Br', 80, 'Bromine'], ['I', 127, 'Iodine']] },
  { key: 'P · As · Sb', pass: true,  els: [['P', 31, 'Phosphorus'], ['As', 75, 'Arsenic'], ['Sb', 120, 'Antimony']] },
  { key: 'H · Li · Na', pass: false, els: [['H', 1, 'Hydrogen'], ['Li', 7, 'Lithium'], ['Na', 23, 'Sodium']] },
  { key: 'O · S · Se', pass: false,  els: [['O', 16, 'Oxygen'], ['S', 32, 'Sulfur'], ['Se', 79, 'Selenium']] },
];

function showTriad(i: number) {
  const t = TRIADS[i];
  const [a, b, c] = t.els;
  const mean = (a[1] + c[1]) / 2;

  document.querySelectorAll('#triadChips .chem-chip').forEach((el, j) =>
    el.classList.toggle('active', j === i));

  const holder = document.getElementById('triadEls')!;
  holder.innerHTML = t.els.map((e, j) => `
    <div class="triad-el${j === 1 ? ' mid' : ''}">
      <div class="triad-sym">${e[0]}</div>
      <div class="triad-mass">${e[1]}</div>
      <div class="triad-role">${j === 1 ? 'middle' : e[2]}</div>
    </div>`).join('');

  document.getElementById('triadCalc')!.innerHTML =
    `( ${a[1]} + ${c[1]} ) / 2 = <span class="hl">${mean}</span>&nbsp;&nbsp;·&nbsp;&nbsp;middle = ${b[1]}`;

  const v = document.getElementById('triadVerdict')!;
  if (t.pass) {
    v.className = 'verdict ok';
    v.textContent = `Mean ${mean} ≈ ${b[1]} - the middle element matches. A valid triad!`;
  } else {
    v.className = 'verdict no';
    v.textContent = `Mean ${mean}, but the middle element is ${b[1]} - too far off. The rule breaks here.`;
  }
}

function initTriads() {
  if (done.has('triads')) return;
  done.add('triads');
  const chips = document.getElementById('triadChips')!;
  chips.innerHTML = TRIADS.map((t, i) =>
    `<button class="chem-chip" data-i="${i}">${t.key}</button>`).join('');
  chips.querySelectorAll('.chem-chip').forEach((btn) =>
    btn.addEventListener('click', () => showTriad(+(btn as HTMLElement).dataset.i!)));
  showTriad(0);
}

/* ───────── 03 · Newlands' octaves ───────── */
const OCTAVE = [
  'Li', 'Be', 'B', 'C', 'N', 'O', 'F',
  'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl',
  'K', 'Ca', 'Cr', 'Ge', 'As', 'Se', 'Br',
];

function initOctaves() {
  if (done.has('octaves')) return;
  done.add('octaves');
  const grid = document.getElementById('octGrid')!;
  grid.innerHTML = OCTAVE.map((s, i) =>
    `<div class="oct-cell" data-i="${i}"><span class="oct-sym">${s}</span><span class="oct-idx">${i + 1}</span></div>`).join('');
  const readout = document.getElementById('octReadout')!;

  grid.querySelectorAll('.oct-cell').forEach((cell) => {
    cell.addEventListener('click', () => {
      const i = +(cell as HTMLElement).dataset.i!;
      grid.querySelectorAll('.oct-cell').forEach((c) => c.classList.remove('selected', 'eighth'));
      cell.classList.add('selected');
      const eighth = i + 7;
      if (eighth < OCTAVE.length) {
        grid.querySelectorAll('.oct-cell')[eighth].classList.add('eighth');
        readout.className = 'oct-readout';
        readout.innerHTML = `Starting at <span class="hl">${OCTAVE[i]}</span>, the eighth element is <span class="hl">${OCTAVE[eighth]}</span> - it repeats the same properties, like a musical octave.`;
      } else {
        readout.className = 'oct-readout';
        readout.innerHTML = `<span class="hl">${OCTAVE[i]}</span> has no eighth element within this set - the octave pattern runs out for heavier elements.`;
      }
    });
  });
}

/* ───────── 06 · Moseley relation (KaTeX) ───────── */
function initMoseley() {
  const el = document.getElementById('mosEq');
  if (!el || done.has('moseley')) return;
  done.add('moseley');
  katex.render(String.raw`\sqrt{\nu}\ \propto\ Z`, el, { throwOnError: false });
}

/* ───────── 09 · IUPAC nomenclature ───────── */
const ROOTS = ['nil', 'un', 'bi', 'tri', 'quad', 'pent', 'hex', 'sept', 'oct', 'enn'];
const LETTERS = ['n', 'u', 'b', 't', 'q', 'p', 'h', 's', 'o', 'e'];
const OFFICIAL: Record<number, [string, string]> = {
  101: ['Mendelevium', 'Md'], 102: ['Nobelium', 'No'], 103: ['Lawrencium', 'Lr'],
  104: ['Rutherfordium', 'Rf'], 105: ['Dubnium', 'Db'], 106: ['Seaborgium', 'Sg'],
  107: ['Bohrium', 'Bh'], 108: ['Hassium', 'Hs'], 109: ['Meitnerium', 'Mt'],
  110: ['Darmstadtium', 'Ds'], 111: ['Roentgenium', 'Rg'], 112: ['Copernicium', 'Cn'],
  113: ['Nihonium', 'Nh'], 114: ['Flerovium', 'Fl'], 115: ['Moscovium', 'Mc'],
  116: ['Livermorium', 'Lv'], 117: ['Tennessine', 'Ts'], 118: ['Oganesson', 'Og'],
};

function systematic(z: number): { name: string; symbol: string } {
  const digits = String(z).split('').map(Number);
  let base = '';
  digits.forEach((d) => {
    const root = ROOTS[d];
    // final 'n' of 'enn' is elided before 'nil'
    if (base.endsWith('enn') && root === 'nil') base = base.slice(0, -1);
    base += root;
  });
  // final 'i' of 'bi'/'tri' is elided before the 'ium' suffix
  if (base.endsWith('i')) base = base.slice(0, -1);
  const name = base.charAt(0).toUpperCase() + base.slice(1) + 'ium';
  const sym = digits.map((d) => LETTERS[d]).join('');
  const symbol = sym.charAt(0).toUpperCase() + sym.slice(1);
  return { name, symbol };
}

function updateIupac(z: number) {
  const sysEl = document.getElementById('iupacSys')!;
  const offEl = document.getElementById('iupacOfficial')!;
  if (!Number.isFinite(z) || z < 100 || z > 999) {
    sysEl.innerHTML = '-';
    offEl.innerHTML = '-';
    return;
  }
  const { name, symbol } = systematic(z);
  sysEl.innerHTML = `${name} <span class="sym">(${symbol})</span>`;
  const off = OFFICIAL[z];
  offEl.innerHTML = off ? `${off[0]} <span class="sym">(${off[1]})</span>` : '<span style="color:#8fb6e0;">not yet named</span>';
}

function initIupac() {
  if (done.has('iupac')) return;
  done.add('iupac');

  const ref = document.getElementById('iupacRef')!;
  let cards = '';
  for (let z = 101; z <= 118; z++) {
    const { name, symbol } = systematic(z);
    const off = OFFICIAL[z]!;
    cards += `<div class="iupac-ref-card">
      <div class="iref-z">Z = ${z}</div>
      <div class="iref-name">${off[0]}</div>
      <div class="iref-sym">${off[1]}</div>
      <div class="iref-sys">${name} · ${symbol}</div>
    </div>`;
  }
  ref.innerHTML = cards;

  const input = document.getElementById('iupacInput') as HTMLInputElement;
  input.addEventListener('input', () => updateIupac(parseInt(input.value, 10)));
  updateIupac(parseInt(input.value, 10));
}

/* ───────── screen-init registry ───────── */
(window as any).SCREEN_INIT = {
  triads: initTriads,
  octaves: initOctaves,
  moseley: initMoseley,
  iupac: initIupac,
};
