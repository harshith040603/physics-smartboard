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

  const legend = v === 1
    ? `<span><i style="background:#00A0E3"></i>1s electron · others shield ×0.30</span>`
    : [`<span><i style="background:#00A0E3"></i>same shell ×0.35</span>`,
       `<span><i style="background:#f59e0b"></i>n&minus;1 shell ×0.85</span>`,
       v >= 3 ? `<span><i style="background:#e11d48"></i>deeper ×1.00</span>` : ''].filter(Boolean).join('');
  const fig = document.getElementById('shellFig');
  if (fig) fig.innerHTML = drawShells(sh, v) + `<div class="shell-legend">${legend}</div>`;
}

/** electron-shell diagram, colour-coded by Slater contribution */
function drawShells(sh: number[], v: number): string {
  const cx = 110, cy = 110;
  let rings = '';
  let dots = '';
  sh.forEach((count, i) => {
    const r = 30 + i * 25;
    rings += `<circle class="shell-ring" cx="${cx}" cy="${cy}" r="${r}"/>`;
    const color = i === v - 1 ? '#00A0E3' : i === v - 2 ? '#f59e0b' : '#e11d48';
    for (let j = 0; j < count; j++) {
      const ang = (-90 + (360 / count) * j) * Math.PI / 180;
      const x = cx + r * Math.cos(ang);
      const y = cy + r * Math.sin(ang);
      const one = i === v - 1 && j === 0;
      dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${one ? 6.5 : 5}" fill="${color}"${one ? ' stroke="#fff" stroke-width="2"' : ''}/>`;
    }
  });
  return `<svg viewBox="0 0 220 220" role="img" aria-label="Electron shells coloured by Slater contribution">
    ${rings}
    <circle class="shell-nuc" cx="${cx}" cy="${cy}" r="14"/>
    <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="15" font-weight="800" fill="#0f2647" font-family="Bricolage Grotesque">+</text>
    ${dots}
  </svg>`;
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

/* ───────── scaled-atom size explorer ───────── */
const SIZE_SETS: Record<string, { tab: string; trend: string; rev: boolean; els: Array<[string, number]> }> = {
  period2: {
    tab: 'Across Period 2', rev: false,
    trend: 'Left → right: size <b>shrinks</b> - same shell, rising Z<sub>eff</sub> pulls it in',
    els: [['Li', 152], ['Be', 111], ['B', 88], ['C', 77], ['N', 74], ['O', 66], ['F', 64]],
  },
  group1: {
    tab: 'Down Group 1', rev: true,
    trend: 'Top → bottom: size <b>grows</b> - a new shell is added each period',
    els: [['Li', 152], ['Na', 186], ['K', 231], ['Rb', 244], ['Cs', 262]],
  },
  group17: {
    tab: 'Down Group 17', rev: true,
    trend: 'Top → bottom: size <b>grows</b> - a new shell is added each period',
    els: [['F', 72], ['Cl', 99], ['Br', 114], ['I', 133], ['At', 140]],
  },
};

/** map a real radius (pm) to a pixel diameter on one shared scale (64→30px, 262→130px) */
function scaleDia(pm: number): number {
  return Math.round(30 + (pm - 64) * (100 / (262 - 64)));
}

function renderSizeRow(el: HTMLElement, els: Array<[string, number]>, highlight: string[] = []) {
  el.innerHTML = els.map(([sym, pm], i) => {
    const d = scaleDia(pm);
    const hl = highlight.includes(sym) ? ' hl' : '';
    return `<div class="size-atom${hl}">
      <div class="size-circle" style="width:${d}px;height:${d}px;animation-delay:${i * 70}ms"></div>
      <div class="size-meta"><div class="size-sym">${sym}</div><div class="size-val">${pm} pm</div></div>
    </div>`;
  }).join('');
  el.querySelectorAll<HTMLElement>('.size-atom').forEach((a) => {
    a.addEventListener('click', () => {
      const on = a.classList.contains('hl');
      el.querySelectorAll('.size-atom').forEach((x) => x.classList.remove('hl'));
      if (!on) a.classList.add('hl');
    });
  });
}

function initSizeExplorer() {
  const tabs = document.getElementById('sizeTabs');
  const row = document.getElementById('sizeRow');
  const trend = document.getElementById('sizeTrend');
  if (!tabs || !row || !trend) return;
  const keys = Object.keys(SIZE_SETS);
  const show = (k: string) => {
    const set = SIZE_SETS[k];
    tabs.querySelectorAll('.size-tab').forEach((t) =>
      t.classList.toggle('active', (t as HTMLElement).dataset.k === k));
    renderSizeRow(row, set.els);
    trend.innerHTML = `<span class="size-arrow${set.rev ? ' rev' : ''}"></span><span>${set.trend}</span>`;
  };
  tabs.innerHTML = keys.map((k) =>
    `<button class="size-tab" data-k="${k}">${SIZE_SETS[k].tab}</button>`).join('');
  tabs.querySelectorAll<HTMLElement>('.size-tab').forEach((t) =>
    t.addEventListener('click', () => show(t.dataset.k!)));
  show('period2');
}

function initG13Viz() {
  const row = document.getElementById('g13Row');
  if (!row) return;
  renderSizeRow(row as HTMLElement,
    [['B', 88], ['Ga', 135], ['Al', 143], ['In', 167], ['Tl', 170]], ['Ga', 'Al']);
}

/* ───────── ion (cation / anion) interactive ───────── */
function initIon() {
  const disc = document.getElementById('ionDisc');
  const scene = document.getElementById('ionScene');
  const label = document.getElementById('ionLabel');
  if (!disc || !scene || !label) return;
  const STATES: Record<string, { d: number; cls: string; sym: string; text: string }> = {
    neutral: { d: 120, cls: '', sym: 'A', text: 'Neutral atom <span class="sz">A</span>' },
    cat: { d: 78, cls: 'cat', sym: 'A⁺', text: 'Cation <span class="sz">A⁺</span> - lost an electron, so the same Z<sub>eff</sub> pulls a smaller cloud in tighter' },
    an: { d: 150, cls: 'an', sym: 'A⁻', text: 'Anion <span class="sz">A⁻</span> - gained an electron, so extra repulsion swells the cloud outward' },
  };
  const fly = (kind: 'out' | 'in') => {
    const e = document.createElement('div');
    e.className = 'ion-e';
    e.style.animation = `${kind === 'out' ? 'eOut' : 'eIn'} .7s ease forwards`;
    scene.appendChild(e);
    setTimeout(() => e.remove(), 760);
  };
  const set = (k: string) => {
    const s = STATES[k];
    disc.className = 'ion-disc' + (s.cls ? ' ' + s.cls : '');
    disc.style.width = s.d + 'px';
    disc.style.height = s.d + 'px';
    disc.textContent = s.sym;
    label.innerHTML = s.text;
    if (k === 'cat') fly('out');
    if (k === 'an') fly('in');
  };
  document.querySelectorAll<HTMLElement>('.ion-btn').forEach((b) =>
    b.addEventListener('click', () => set(b.dataset.ion!)));
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
  initSizeExplorer();
  initG13Viz();
  initIon();
  initPractice();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
