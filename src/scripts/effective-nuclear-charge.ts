/* ═══════════ Effective Nuclear Charge & Atomic Size - chapter script ═══════════
   KaTeX formula rendering, static data tables, an interactive Slater's-rules
   Zeff calculator, and tap-to-reveal practice answers. Everything is wired once
   on load - screens are present in the DOM even while hidden.                */

import katex from 'katex';
import 'katex/dist/katex.min.css';

/* ───────── KaTeX formulas ───────── */
function renderEq(id: string, tex: string) {
  const el = document.getElementById(id);
  if (el) katex.render(tex, el, { throwOnError: false });
}

function initFormulas() {
  renderEq('encEq', String.raw`Z_{\text{eff}} = Z - \sigma`);
  renderEq('rcEq', String.raw`r_c = \dfrac{d_{A-A}}{2}`);
  renderEq('rabEq', String.raw`d_{A-B} = r_A + r_B - 0.09\,\Delta\chi`);
  renderEq('rmEq', String.raw`r_{\text{metallic}} = \dfrac{d_{M-M}}{2}`);
  renderEq('ionEq', String.raw`A^{3-} > A^{2-} > A^{-} > A > A^{+} > A^{2+} > A^{3+}`);
}

/* ───────── data tables ───────── */
function buildZeffTable() {
  const el = document.getElementById('zeffTable');
  if (!el) return;
  const sym = ['Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne'];
  const z = [3, 4, 5, 6, 7, 8, 9, 10];
  const zeff = ['1.28', '1.91', '2.42', '3.14', '3.83', '4.45', '5.10', '5.76'];
  el.innerHTML = `
    <thead><tr><th class="rowhead">Element</th>${sym.map((s) => `<th>${s}</th>`).join('')}</tr></thead>
    <tbody>
      <tr><td class="rowhead">Atomic number (Z)</td>${z.map((v) => `<td>${v}</td>`).join('')}</tr>
      <tr><td class="rowhead">Effective charge Z<sub>eff</sub></td>${zeff.map((v) => `<td class="val">${v}</td>`).join('')}</tr>
    </tbody>`;
}

function twoRowPeriod(label: string, syms: string[], sizes: number[]): string {
  return `<tr><td class="rowhead">${label}</td>${syms.map((s) => `<td class="sym">${s}</td>`).join('')}</tr>
          <tr><td class="rowhead">Radius (pm)</td>${sizes.map((v) => `<td class="val">${v}</td>`).join('')}</tr>`;
}

function buildPeriodTable() {
  const el = document.getElementById('periodTable');
  if (!el) return;
  el.innerHTML = `<tbody>
    ${twoRowPeriod('Period 2', ['Li', 'Be', 'B', 'C', 'N', 'O', 'F'], [152, 111, 88, 77, 74, 66, 64])}
    ${twoRowPeriod('Period 3', ['Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl'], [186, 160, 143, 117, 110, 104, 99])}
  </tbody>`;
}

function buildGroupTable() {
  const el = document.getElementById('groupTable');
  if (!el) return;
  el.innerHTML = `<tbody>
    ${twoRowPeriod('Group 1', ['Li', 'Na', 'K', 'Rb', 'Cs'], [152, 186, 231, 244, 262])}
    ${twoRowPeriod('Group 17', ['F', 'Cl', 'Br', 'I', 'At'], [72, 99, 114, 133, 140])}
  </tbody>`;
}

function buildG13Table() {
  const el = document.getElementById('g13Table');
  if (!el) return;
  el.innerHTML = `<tbody>
    ${twoRowPeriod('Group 13', ['B', 'Ga', 'Al', 'In', 'Tl'], [88, 135, 143, 167, 170])}
  </tbody>`;
}

function buildIonicTable() {
  const el = document.getElementById('ionicTable');
  if (!el) return;
  const rows: Array<[string, number, string, number]> = [
    ['Na', 186, 'Na<sup>+</sup>', 102],
    ['Mg', 160, 'Mg<sup>2+</sup>', 72],
    ['Al', 143, 'Al<sup>3+</sup>', 54],
    ['N', 75, 'N<sup>3-</sup>', 146],
    ['O', 73, 'O<sup>2-</sup>', 140],
    ['F', 72, 'F<sup>-</sup>', 133],
  ];
  el.innerHTML = `
    <thead><tr><th>Element</th><th>Atomic radius (pm)</th><th>Ion</th><th>Ionic radius (pm)</th></tr></thead>
    <tbody>${rows.map(([a, r, ion, ir]) =>
      `<tr><td class="sym">${a}</td><td>${r}</td><td class="sym">${ion}</td><td class="val">${ir}</td></tr>`).join('')}</tbody>`;
}

/* ───────── Slater's-rules Zeff calculator (Z = 1..20) ───────── */
const SYMBOLS = ['', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
  'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca'];

/** electrons per principal shell for Z (fills 1s,2s2p,3s3p,4s - valid for Z<=20) */
function shells(z: number): number[] {
  const n1 = Math.min(z, 2);
  const n2 = Math.min(Math.max(z - 2, 0), 8);
  const n3 = Math.min(Math.max(z - 10, 0), 8);
  const n4 = Math.min(Math.max(z - 18, 0), 2);
  const out = [n1];
  if (n2) out.push(n2);
  if (n3) out.push(n3);
  if (n4) out.push(n4);
  return out; // index 0 = shell n=1
}

const SHELL_LABELS = ['1s', '2s,2p', '3s,3p', '4s'];

function sup(n: number): string {
  const map: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return String(n).split('').map((d) => map[d]).join('');
}

function showSlater(z: number) {
  const sh = shells(z);
  const v = sh.length; // valence principal quantum number
  const same = sh[v - 1] - 1; // other electrons in valence shell
  const nMinus1 = v >= 2 ? sh[v - 2] : 0;
  const deeper = v >= 3 ? sh.slice(0, v - 2).reduce((a, b) => a + b, 0) : 0;

  let sigma: number;
  let workLine: string;
  if (v === 1) {
    sigma = 0.30 * same;
    workLine = `&sigma; = 0.30 &times; <span class="k">${same}</span> = <span class="k">${sigma.toFixed(2)}</span>`;
  } else {
    sigma = 0.35 * same + 0.85 * nMinus1 + 1.0 * deeper;
    workLine = `&sigma; = 0.35&times;<span class="k">${same}</span> + 0.85&times;<span class="k">${nMinus1}</span> + 1.00&times;<span class="k">${deeper}</span> = <span class="k">${sigma.toFixed(2)}</span>`;
  }
  const zeff = z - sigma;

  document.querySelectorAll('#slaterChips .slater-chip').forEach((c) =>
    c.classList.toggle('active', +(c as HTMLElement).dataset.z! === z));

  const cfg = sh.map((c, i) =>
    `<span${i === v - 1 ? ' class="grp"' : ''}>(${SHELL_LABELS[i]})${sup(c)}</span>`).join(' ');
  document.getElementById('slaterConfig')!.innerHTML =
    `<b>${SYMBOLS[z]}</b> &nbsp; Z = ${z} &nbsp;·&nbsp; ${cfg}`;

  document.getElementById('slaterWork')!.innerHTML =
    `Valence electron in shell <span class="k">n = ${v}</span><br>${workLine}`;

  document.getElementById('slaterRes')!.innerHTML =
    `Z<sub>eff</sub> = Z &minus; &sigma; = ${z} &minus; ${sigma.toFixed(2)} = <span class="hl">${zeff.toFixed(2)}</span>`;
}

function initSlater() {
  const chips = document.getElementById('slaterChips');
  if (!chips) return;
  chips.innerHTML = '';
  for (let z = 1; z <= 20; z++) {
    const b = document.createElement('button');
    b.className = 'slater-chip';
    b.dataset.z = String(z);
    b.textContent = SYMBOLS[z];
    b.addEventListener('click', () => showSlater(z));
    chips.appendChild(b);
  }
  showSlater(11); // Na - a clear worked example
}

/* ───────── practice reveal ───────── */
function initPractice() {
  document.querySelectorAll<HTMLButtonElement>('.pq-reveal').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.pq-card')!.classList.add('revealed');
    });
  });
}

/* ───────── boot ───────── */
function boot() {
  initFormulas();
  buildZeffTable();
  buildPeriodTable();
  buildGroupTable();
  buildG13Table();
  buildIonicTable();
  initSlater();
  initPractice();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
