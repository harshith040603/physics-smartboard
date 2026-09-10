/* ═══════════ Thermometry Studio · Apparent Expansion ═══════════
   Animation-only lecture. Five screens on window.SCREEN_INIT:

     problem  - three vessels side by side: liquid alone, glass alone,
                both together. The level you see = real − container
     cases    - one vessel, two sliders (γ_L, α_c): level rises, stays
                or falls, with the sign of γ_apparent calling it
     overflow - brim-full vessel spilling into a measuring cup, with
                the "forgot the 3" wrong answer shown in red
     gap      - partly filled vessel: the empty space stays constant
                only when V_L = V γ_c / γ_L (Problem 7)
     drill    - plain DOM: worked problems, homework, the summary box

   Drawing convention: expansions are tiny (10⁻⁴ per °C) so every
   canvas magnifies them and says so in a corner chip. Levels are
   placed by the VOLUME formulas of the lecture, never by pixel
   geometry, so the numbers on screen are the exam numbers.

   Every p5 instance is built lazily: hidden .screen sections are
   display:none, so a canvas created early would have zero width.      */

import p5 from 'p5';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/* ───────── brand palette (matches the tokens in global.css) ───────── */
const C = {
  navy: '#0f2647',
  dark: '#295990',
  accent: '#00A0E3',
  red: '#e11d48',
  green: '#16a34a',
  amber: '#f59e0b',
  violet: '#7c3aed',
  paper: '#f4f8fc',
  grey: '#7689a0',
};

const KO = { throwOnError: false, displayMode: false };

/* ───────── shared helpers ───────── */
function arrow(p: p5, x1: number, y1: number, x2: number, y2: number, head = 9) {
  p.line(x1, y1, x2, y2);
  const a = Math.atan2(y2 - y1, x2 - x1);
  p.line(x2, y2, x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45));
  p.line(x2, y2, x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45));
}

function chip(
  p: p5, txt: string, x: number, y: number,
  align: 'left' | 'right' | 'center' = 'left', size = 14, col = C.navy
) {
  p.textFont('DM Sans');
  p.textSize(size);
  p.textStyle(p.NORMAL);
  const lines = txt.split('\n');
  const w = Math.max(...lines.map((l) => p.textWidth(l)));
  const lh = size * 1.34;
  let bx = x;
  if (align === 'right') bx = x - w;
  if (align === 'center') bx = x - w / 2;
  p.noStroke();
  p.fill(255, 255, 255, 234);
  p.rect(bx - 8, y - 5, w + 16, lh * lines.length + 9, 8);
  p.fill(col);
  p.textAlign(p.LEFT, p.TOP);
  lines.forEach((l, i) => p.text(l, bx, y + i * lh));
}

function dt(p: p5) { return Math.min(p.deltaTime || 16.7, 120) / 1000; }

function dashed(p: p5, on: boolean, pattern: number[] = [6, 6]) {
  (p.drawingContext as CanvasRenderingContext2D).setLineDash(on ? pattern : []);
}

function ease(cur: number, target: number, rate: number, d: number) {
  return cur + (target - cur) * (1 - Math.exp(-rate * d));
}

function fmt(v: number, dp: number) { return v.toFixed(dp); }
function el(id: string) { return document.getElementById(id)!; }
function slider(id: string) { return document.getElementById(id) as HTMLInputElement; }

function wireTabs(tabsId: string) {
  const tabs = el(tabsId);
  tabs.querySelectorAll<HTMLButtonElement>('.th-chip').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.pane!;
      tabs.querySelectorAll('.th-chip').forEach((x) => x.classList.toggle('active', x === b));
      const scope = tabs.closest('.screen')!;
      scope.querySelectorAll<HTMLElement>('.th-pane').forEach((e) => {
        e.classList.toggle('active', e.id === id);
      });
    });
  });
}

function wireSegmented(groupId: string, key: string, onPick: (v: string) => void) {
  const grp = el(groupId);
  grp.querySelectorAll<HTMLButtonElement>('.th-btn').forEach((b) => {
    b.addEventListener('click', () => {
      grp.querySelectorAll('.th-btn').forEach((x) => x.classList.toggle('on', x === b));
      onPick(b.dataset[key]!);
    });
  });
}

function wireReveal(selector: string, cls: string) {
  document.querySelectorAll<HTMLElement>(selector).forEach((box) => {
    const toggle = () => box.classList.toggle(cls);
    box.addEventListener('click', toggle);
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}

function mount(inst: p5 | null, sk: (p: p5) => void, holderId: string): p5 {
  if (inst) { inst.windowResized?.(); return inst; }
  return new p5(sk, el(holderId));
}

/* ───────── a "▶ heat it" run: drives a ΔT slider from 0 to 100 ─────────
   The slider stays the single source of truth; the run just moves it.  */
interface HeatRun { on: boolean; t: number; dur: number }
function heatTick(run: HeatRun, p: p5, s: HTMLInputElement, apply: (T: number) => void) {
  if (!run.on) return;
  run.t += dt(p);
  const T = Math.min(100, Math.round(100 * run.t / run.dur));
  s.value = String(T);
  apply(T);
  if (T >= 100) run.on = false;
}
function wireHeat(run: HeatRun, playId: string, s: HTMLInputElement, apply: (T: number) => void) {
  el(playId).addEventListener('click', () => {
    s.value = '0';
    apply(0);
    run.t = 0;
    run.on = true;
  });
  s.addEventListener('input', () => { run.on = false; apply(+s.value); });
}

/* ───────── the vessel: a beaker that can be drawn scaled up ─────────
   (cx, baseY) is the bottom centre. The walls are scaled by `s` about
   that point (a warm vessel is a slightly larger copy of a cold one).
   The liquid is filled to `liqH` screen pixels above the base, which the
   caller sets from the volume formula. When s > 1 the cold outline is
   drawn dashed behind, so the growth is visible even when it is small. */
function vessel(
  p: p5, cx: number, baseY: number, w: number, h: number, s: number,
  liqH: number, liqCol: string, wall = C.navy
) {
  const W = w * s, H = h * s;
  const x0 = cx - W / 2, x1 = cx + W / 2;
  /* cold outline */
  if (s > 1.0005) {
    p.noFill();
    p.stroke(41, 89, 144, 90);
    p.strokeWeight(1.5);
    dashed(p, true, [4, 4]);
    p.line(cx - w / 2, baseY - h, cx - w / 2, baseY);
    p.line(cx + w / 2, baseY - h, cx + w / 2, baseY);
    p.line(cx - w / 2, baseY, cx + w / 2, baseY);
    dashed(p, false);
  }
  /* liquid */
  if (liqH > 0) {
    p.noStroke();
    p.fill(p.color(liqCol));
    p.rect(x0 + 2, baseY - Math.min(liqH, H), W - 4, Math.min(liqH, H) - 2, 0, 0, 4, 4);
    /* meniscus highlight */
    p.fill(255, 255, 255, 70);
    p.rect(x0 + 2, baseY - Math.min(liqH, H), W - 4, 3);
  }
  /* warm walls */
  p.noFill();
  p.stroke(wall);
  p.strokeWeight(3);
  p.line(x0, baseY - H, x0, baseY);
  p.line(x1, baseY - H, x1, baseY);
  p.line(x0, baseY, x1, baseY);
  /* little lips */
  p.line(x0 - 6, baseY - H, x0, baseY - H);
  p.line(x1, baseY - H, x1 + 6, baseY - H);
}

/* a vertical arrow with a label, drawn beside x from y0 to y1 */
function levelArrow(p: p5, x: number, y0: number, y1: number, col: string, label: string, side: 'left' | 'right') {
  const len = Math.abs(y1 - y0);
  p.stroke(col);
  p.strokeWeight(2.4);
  if (len >= 6) arrow(p, x, y0, x, y1, 8);
  else {
    p.line(x - 6, y0, x + 6, y0);
  }
  /* tick at the start */
  p.strokeWeight(1.5);
  p.line(x - 5, y0, x + 5, y0);
  const ly = Math.min(y0, y1) + len / 2 - 8;
  chip(p, label, side === 'right' ? x + 12 : x - 12, ly, side === 'right' ? 'left' : 'right', 13.5, col);
}

/* ══════════════════════════════════════════════════════════════════════
   1 · THE MEASUREMENT PROBLEM
   Three vessels: liquid alone (real), glass alone (container), both
   (apparent). Levels sit at V-fraction × h0 × MAG so the three arrows
   add up on screen exactly as the numbers do: real − glass = seen.
   ══════════════════════════════════════════════════════════════════════ */

const LIQ = {
  hg: { name: 'Mercury', g: 1.8e-4, col: '#8a94a6', mag: 30 },
  gly: { name: 'Glycerine', g: 4.9e-4, col: '#c9962a', mag: 11 },
};
const A_GLASS = 9e-6, G_GLASS = 3 * A_GLASS;
const V0 = 1000;                                   // mL in the vessel

const prob = { liq: 'hg' as keyof typeof LIQ, T: 0, shown: 0, run: { on: false, t: 0, dur: 4 } as HeatRun };

function probReadouts() {
  const L = LIQ[prob.liq];
  const real = V0 * L.g * prob.T;
  const cont = V0 * G_GLASS * prob.T;
  const app = real - cont;
  el('aePReal').textContent = `+${fmt(real, 1)} mL`;
  el('aePCont').textContent = `+${fmt(cont, 1)} mL`;
  el('aePApp').textContent = `+${fmt(app, 1)} mL`;
  katex.render(
    String.raw`\gamma_{\text{apparent}}=\gamma_{\text{real}}-\gamma_{\text{glass}}
      =${fmt(L.g * 1e4, 2)}\times10^{-4}-\underbrace{0.27\times10^{-4}}_{3\alpha_{\text{glass}}}
      =\mathbf{${fmt((L.g - G_GLASS) * 1e4, 2)}\times10^{-4}}\ ^\circ\mathrm{C}^{-1}`,
    el('aePWork1'), KO
  );
  katex.render(
    String.raw`\text{rise you see}=V\,\gamma_{\text{apparent}}\,\Delta T
      =1000\times${fmt((L.g - G_GLASS) * 1e4, 2)}\times10^{-4}\times${fmt(prob.T, 0)}
      =\mathbf{${fmt(app, 1)}}\ \mathrm{mL}
      \qquad(\text{real }${fmt(real, 1)}-\text{glass }${fmt(cont, 1)})`,
    el('aePWork2'), KO
  );
}

const probSketch = (p: p5) => {
  const holder = el('aeProbCanvas');
  const canvasH = () => Math.max(440, Math.min(540, Math.round(holder.clientWidth * 0.4)));
  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    heatTick(prob.run, p, slider('aePT'), (T) => { prob.T = T; el('aePTVal').textContent = `+${T} °C`; probReadouts(); });
    prob.shown = ease(prob.shown, prob.T, 5, d);
    p.textFont('DM Sans');

    const L = LIQ[prob.liq];
    const MAG = L.mag;
    const T = prob.shown;
    const fReal = L.g * T * MAG;               // liquid volume fraction gained
    const fCont = G_GLASS * T * MAG;           // vessel volume fraction gained
    const sGlass = 1 + A_GLASS * T * MAG;      // linear scale of the warm glass

    const panelW = p.width / 3;
    const vh = Math.min(300, p.height * 0.6);
    const vw = Math.min(150, panelW * 0.42);
    const baseY = p.height - 62;
    const h0 = vh * 0.5;                       // cold level
    const refY = baseY - h0;

    const panels: Array<{ title: string; sub: string; s: number; lvl: number; col: string; lab: string; sign: string }> = [
      { title: 'Heat the LIQUID only', sub: '(imagine the glass frozen)', s: 1, lvl: 1 + fReal, col: C.green, lab: 'REAL rise', sign: '+' },
      { title: 'Heat the GLASS only', sub: '(imagine the liquid frozen)', s: sGlass, lvl: 1 / (1 + fCont), col: C.red, lab: 'glass makes room', sign: '−' },
      { title: 'Heat BOTH - what really happens', sub: 'the difference is all you can see', s: sGlass, lvl: (1 + fReal) / (1 + fCont), col: C.accent, lab: 'what you SEE', sign: '+' },
    ];

    const vals = [V0 * L.g * T, V0 * G_GLASS * T, V0 * (L.g - G_GLASS) * T];
    const ys: number[] = [];

    panels.forEach((pn, i) => {
      const cx = panelW * (i + 0.5);
      /* titles */
      p.noStroke();
      p.fill(C.navy);
      p.textAlign(p.CENTER, p.TOP);
      p.textStyle(p.BOLD);
      p.textSize(16.5);
      p.text(pn.title, cx, 18);
      p.textStyle(p.NORMAL);
      p.fill(C.grey);
      p.textSize(13);
      p.text(pn.sub, cx, 40);

      /* cold-level reference line across the panel */
      p.stroke(118, 137, 160, 160);
      p.strokeWeight(1.3);
      dashed(p, true, [5, 5]);
      p.line(cx - panelW * 0.44, refY, cx + panelW * 0.44, refY);
      dashed(p, false);

      const liqH = h0 * pn.lvl;
      vessel(p, cx, baseY, vw, vh, pn.s, liqH, L.col);
      const y1 = baseY - liqH;
      ys.push(y1);

      /* the arrow */
      const ax = cx + vw * pn.s / 2 + 18;
      if (T > 0.5) {
        levelArrow(p, ax, refY, y1, pn.col, `${pn.lab}\n${pn.sign}${fmt(vals[i], 1)} mL`, 'right');
      } else {
        chip(p, 'level at 0 °C', ax + 6, refY - 9, 'left', 12.5, C.grey);
      }
    });

    /* operator glyphs between panels */
    p.noStroke();
    p.fill(C.navy);
    p.textAlign(p.CENTER, p.CENTER);
    p.textStyle(p.BOLD);
    p.textSize(34);
    p.text('−', panelW, baseY - vh * 0.55);
    p.text('=', panelW * 2, baseY - vh * 0.55);
    p.textStyle(p.NORMAL);

    /* the hidden part: bracket in panel 3 between the real level and the seen level */
    if (T > 0.5) {
      const cx3 = panelW * 2.5;
      const yReal = ys[0], ySeen = ys[2];
      const bx = cx3 - vw * sGlass / 2 - 16;
      p.stroke(C.red);
      p.strokeWeight(1.4);
      dashed(p, true, [3, 4]);
      p.line(panelW * 0.5 + vw / 2 + 4, yReal, bx + 6, yReal);
      dashed(p, false);
      p.strokeWeight(2.2);
      p.line(bx, yReal, bx, ySeen);
      p.line(bx - 5, yReal, bx + 5, yReal);
      p.line(bx - 5, ySeen, bx + 5, ySeen);
      chip(p, `hidden by\nthe glass\n${fmt(vals[1], 1)} mL`, bx - 10, (yReal + ySeen) / 2 - 24, 'right', 12.5, C.red);
    }

    /* bottom labels */
    chip(p, `${V0} mL of ${L.name.toLowerCase()} in a glass vessel  ·  all at +${fmt(T, 0)} °C`, p.width / 2, p.height - 34, 'center', 13.5, C.navy);
    chip(p, `expansions drawn ${MAG}× oversize`, 14, p.height - 30, 'left', 12, C.grey);
  };
};

let probInst: p5 | null = null;

function probWire() {
  const s = slider('aePT');
  const apply = (T: number) => { prob.T = T; el('aePTVal').textContent = `+${T} °C`; probReadouts(); };
  wireSegmented('aePLiq', 'liq', (k) => { prob.liq = k as keyof typeof LIQ; probReadouts(); });
  wireHeat(prob.run, 'aePPlay', s, apply);
  el('aePReset').addEventListener('click', () => { prob.run.on = false; s.value = '0'; apply(0); });
  apply(0);
}

/* ══════════════════════════════════════════════════════════════════════
   2 · RISES, STAYS OR FALLS
   One vessel, γ_L and α_c on sliders. Level fraction = (1+γ_LΔT)/(1+γ_cΔT).
   ══════════════════════════════════════════════════════════════════════ */

const PRESETS = {
  rise: { gL: 18, a: 0.9 },     // mercury in glass (×10⁻⁵)
  same: { gL: 5.4, a: 1.8 },    // Problem 5
  fall: { gL: 3, a: 2.5 },      // container outruns the liquid
};
const cases = { gL: 18e-5, a: 0.9e-5, T: 0, shown: 0, run: { on: false, t: 0, dur: 4 } as HeatRun };
const CASE_MAG = 30;

function casesReadouts() {
  const gC = 3 * cases.a;
  const gA = cases.gL - gC;
  el('aeCGC').textContent = `3 × ${fmt(cases.a * 1e5, 1)} = ${fmt(gC * 1e5, 1)} × 10⁻⁵`;
  el('aeCGA').textContent = `${gA >= 0 ? '+' : '−'}${fmt(Math.abs(gA) * 1e5, 1)} × 10⁻⁵`;
  const v = el('aeCVerdict');
  const eq = Math.abs(gA) < 0.05e-5;
  v.textContent = eq ? 'stays PUT' : gA > 0 ? 'RISES' : 'FALLS';
  v.className = 'th-ro ' + (eq ? '' : gA > 0 ? 'good' : 'bad');
  katex.render(
    String.raw`\gamma_{\text{app}}=\gamma_{\text{real}}-3\alpha_c
      =${fmt(cases.gL * 1e5, 1)}\times10^{-5}-${fmt(gC * 1e5, 1)}\times10^{-5}
      =\mathbf{${gA >= 0 ? '' : '-'}${fmt(Math.abs(gA) * 1e5, 1)}\times10^{-5}}
      \;\Rightarrow\;\text{${eq ? 'zero: the level does not move' : gA > 0 ? 'positive: the level rises' : 'negative: the level falls'}}`,
    el('aeCWork'), KO
  );
}

const casesSketch = (p: p5) => {
  const holder = el('aeCaseCanvas');
  const canvasH = () => Math.max(440, Math.min(540, Math.round(holder.clientWidth * 0.4)));
  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    /* no ΔT slider on this screen: the run drives cases.T itself */
    if (cases.run.on) {
      cases.run.t += d;
      cases.T = Math.min(100, 100 * cases.run.t / cases.run.dur);
      if (cases.T >= 100) cases.run.on = false;
    }
    cases.shown = ease(cases.shown, cases.T, 5, d);
    p.textFont('DM Sans');

    const T = cases.shown;
    const gC = 3 * cases.a;
    const fL = cases.gL * T * CASE_MAG;
    const fC = gC * T * CASE_MAG;
    const s = 1 + cases.a * T * CASE_MAG;

    const vh = Math.min(320, p.height * 0.62);
    const vw = Math.min(190, p.width * 0.18);
    const cx = p.width * 0.36;
    const baseY = p.height - 60;
    const h0 = vh * 0.42;
    const refY = baseY - h0;
    const lvl = (1 + fL) / (1 + fC);
    const liqH = h0 * lvl;
    const y1 = baseY - liqH;

    /* reference line */
    p.stroke(118, 137, 160, 160);
    p.strokeWeight(1.3);
    dashed(p, true, [5, 5]);
    p.line(cx - vw * 0.9, refY, cx + vw * 0.95, refY);
    dashed(p, false);
    chip(p, 'level at 0 °C', cx - vw * 0.92, refY - 9, 'right', 12.5, C.grey);

    vessel(p, cx, baseY, vw, vh, s, liqH, '#4f7fb5');

    const gA = cases.gL - gC;
    const eq = Math.abs(gA) < 0.05e-5;
    const col = eq ? C.violet : gA > 0 ? C.green : C.red;
    const ax = cx + vw * s / 2 + 20;
    if (T > 0.5) {
      const lab = eq ? 'UNCHANGED\nγ_app = 0' : gA > 0 ? `RISES\nby V γ_app ΔT` : `FALLS\nthe glass outran it`;
      levelArrow(p, ax, refY, y1, col, lab, 'right');
    }

    /* the race, as two bars on the right */
    const bx = p.width * 0.6, bw = p.width * 0.34;
    const gMax = 42e-5;
    const rows: Array<[string, number, string]> = [
      ['Liquid wants to grow   γ_real', cases.gL, '#4f7fb5'],
      ['Vessel makes room   γ_c = 3α', gC, '#5a6a80'],
    ];
    rows.forEach(([nm, g, c], i) => {
      const y = 70 + i * 86;
      p.noStroke();
      p.fill(C.navy);
      p.textSize(14);
      p.textAlign(p.LEFT, p.BOTTOM);
      p.text(nm, bx, y - 8);
      p.fill(41, 89, 144, 18);
      p.rect(bx, y, bw, 24, 12);
      p.fill(c);
      p.rect(bx, y, bw * Math.min(1, g / gMax), 24, 12);
      p.fill(C.dark);
      p.textSize(13);
      p.textAlign(p.LEFT, p.TOP);
      p.text(`${fmt(g * 1e5, 1)} × 10⁻⁵ per °C   →   +${fmt(1000 * g * T, 1)} mL of 1000 at +${fmt(T, 0)} °C`, bx, y + 28);
    });
    /* verdict */
    p.noStroke();
    p.fill(col);
    p.textStyle(p.BOLD);
    p.textSize(22);
    p.textAlign(p.LEFT, p.TOP);
    p.text(eq ? 'Dead heat → level stays put' : gA > 0 ? 'Liquid wins → level rises' : 'Vessel wins → level falls', bx, 70 + 2 * 86);
    p.textStyle(p.NORMAL);
    p.fill(C.navy);
    p.textSize(14.5);
    p.text(`γ_apparent = ${fmt(cases.gL * 1e5, 1)} − ${fmt(gC * 1e5, 1)} = ${gA >= 0 ? '' : '−'}${fmt(Math.abs(gA) * 1e5, 1)} × 10⁻⁵`, bx, 70 + 2 * 86 + 32);

    chip(p, `expansions drawn ${CASE_MAG}× oversize  ·  both at +${fmt(T, 0)} °C`, 14, p.height - 30, 'left', 12, C.grey);
  };
};

let casesInst: p5 | null = null;

function casesWire() {
  const sL = slider('aeCGL'), sA = slider('aeCA');
  const setFromSliders = () => {
    cases.gL = +sL.value * 1e-5;
    cases.a = +sA.value * 1e-5;
    el('aeCGLVal').textContent = `${fmt(+sL.value, 1)} × 10⁻⁵`;
    el('aeCAVal').textContent = `${fmt(+sA.value, 1)} × 10⁻⁵`;
    casesReadouts();
  };
  sL.addEventListener('input', setFromSliders);
  sA.addEventListener('input', setFromSliders);
  wireSegmented('aeCPre', 'pre', (k) => {
    const pr = PRESETS[k as keyof typeof PRESETS];
    sL.value = String(pr.gL);
    sA.value = String(pr.a);
    setFromSliders();
  });
  /* the heat run drives cases.T directly (no ΔT slider on this screen) */
  el('aeCPlay').addEventListener('click', () => { cases.T = 0; cases.shown = 0; cases.run.t = 0; cases.run.on = true; });
  el('aeCReset').addEventListener('click', () => { cases.run.on = false; cases.T = 0; });
  setFromSliders();
}

/* ══════════════════════════════════════════════════════════════════════
   3 · HOW MUCH SPILLS?
   Brim-full vessel; the spill runs into a measuring cup whose level is
   the spilled volume. The wrong answer (α instead of 3α) sits beside it.
   ══════════════════════════════════════════════════════════════════════ */

const OPRE = {
  p1: { V: 1000, g: 1.8e-4, name: 'mercury', col: '#8a94a6', T0: 0 },
  p4: { V: 500, g: 4.9e-4, name: 'glycerine', col: '#c9962a', T0: 20 },
};
const over = {
  pre: 'p1' as keyof typeof OPRE, T: 0, shown: 0,
  run: { on: false, t: 0, dur: 4 } as HeatRun,
  drops: [] as Array<{ x: number; y: number; v: number }>,
};

function overReadouts() {
  const P = OPRE[over.pre];
  const gA = P.g - G_GLASS;
  const spill = P.V * gA * over.T;
  const wrong = P.V * (P.g - A_GLASS) * over.T;
  el('aeOGC').textContent = `3 × 9 × 10⁻⁶ = 2.7 × 10⁻⁵`;
  el('aeOGA').textContent = `${fmt(gA * 1e4, 2)} × 10⁻⁴`;
  el('aeOSpill').textContent = `${fmt(spill, 1)} cm³`;
  el('aeOWrong').textContent = `${fmt(wrong, 1)} cm³ ✗`;
  katex.render(
    String.raw`V_{\text{spilt}}=V(\gamma_L-\gamma_c)\Delta T
      =${P.V}\,(${fmt(P.g * 1e4, 1)}\times10^{-4}-\underbrace{2.7\times10^{-5}}_{3\alpha_{\text{glass}}})\times${fmt(over.T, 0)}
      =\mathbf{${fmt(spill, 1)}\ \mathrm{cm^3}}
      \qquad\text{(with }\alpha\text{ alone: }${fmt(wrong, 1)}\ \mathrm{cm^3}\text{ - wrong)}`,
    el('aeOWork'), KO
  );
}

const overSketch = (p: p5) => {
  const holder = el('aeOverCanvas');
  const canvasH = () => Math.max(440, Math.min(540, Math.round(holder.clientWidth * 0.4)));
  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    heatTick(over.run, p, slider('aeOT'), (T) => { over.T = T; el('aeOTVal').textContent = `+${T} °C`; overReadouts(); });
    const prev = over.shown;
    over.shown = ease(over.shown, over.T, 4, d);
    p.textFont('DM Sans');

    const P = OPRE[over.pre];
    const T = over.shown;
    const MAG = 30;
    const s = 1 + A_GLASS * T * MAG;
    const spill = P.V * (P.g - G_GLASS) * T;          // cm³
    const rising = over.shown - prev > 0.02 && spill > 0.05;

    const vh = Math.min(300, p.height * 0.58);
    const vw = Math.min(190, p.width * 0.18);
    const cx = p.width * 0.3;
    const baseY = p.height - 60;
    const brimY = baseY - vh * s;

    /* the vessel, always brim-full */
    vessel(p, cx, baseY, vw, vh, s, vh * s, P.col);

    /* the spout stream: from the right lip down into the cup */
    const cupX = cx + vw * s / 2 + 110, cupW = 90, cupH = 150;
    const cupBase = baseY;
    if (rising) {
      if (p.frameCount % 4 === 0) over.drops.push({ x: cx + vw * s / 2 + 8, y: brimY, v: 40 });
    }
    p.noStroke();
    p.fill(p.color(P.col));
    for (let i = over.drops.length - 1; i >= 0; i--) {
      const q = over.drops[i];
      q.v += 420 * d;
      q.y += q.v * d;
      q.x += 90 * d;                              // drifts toward the cup
      p.ellipse(q.x, q.y, 8, 12);
      if (q.y > cupBase - 6) over.drops.splice(i, 1);
    }
    /* run-off trail along the lip so the stream reads as a pour */
    if (rising) {
      p.fill(p.color(P.col));
      p.rect(cx + vw * s / 2, brimY - 2, 12, 5, 2);
    }

    /* measuring cup: cupMax cm³ full-scale */
    const cupMax = P.V * (P.g - G_GLASS) * 100 * 1.15;
    const fillH = cupH * Math.min(1, spill / cupMax);
    p.noStroke();
    p.fill(p.color(P.col));
    p.rect(cupX - cupW / 2 + 2, cupBase - fillH, cupW - 4, fillH, 0, 0, 4, 4);
    p.noFill();
    p.stroke(C.navy);
    p.strokeWeight(3);
    p.line(cupX - cupW / 2, cupBase - cupH, cupX - cupW / 2, cupBase);
    p.line(cupX + cupW / 2, cupBase - cupH, cupX + cupW / 2, cupBase);
    p.line(cupX - cupW / 2, cupBase, cupX + cupW / 2, cupBase);
    /* graduations */
    p.strokeWeight(1.2);
    for (let k = 1; k <= 5; k++) {
      const gy = cupBase - cupH * k / 5;
      p.line(cupX + cupW / 2 - 10, gy, cupX + cupW / 2, gy);
    }
    chip(p, 'the overflow, caught', cupX, cupBase - cupH - 26, 'center', 13, C.navy);
    if (spill > 0.05) {
      chip(p, `${fmt(spill, 1)} cm³ spilled\n= V γ_app ΔT`, cupX + cupW / 2 + 14, cupBase - fillH - 12, 'left', 14.5, C.red);
    }

    /* the story on the right */
    const tx = p.width * 0.63;
    const lines: Array<[string, string]> = [
      [`Liquid wants to grow by`, `V γ_L ΔT = ${fmt(P.V * P.g * T, 1)} cm³`],
      [`Glass makes room for`, `V (3α) ΔT = ${fmt(P.V * G_GLASS * T, 1)} cm³`],
      [`No room for the rest, so it spills`, `${fmt(spill, 1)} cm³`],
    ];
    lines.forEach(([a, b], i) => {
      const y = 60 + i * 74;
      p.noStroke();
      p.fill(C.grey);
      p.textSize(13.5);
      p.textAlign(p.LEFT, p.TOP);
      p.text(a, tx, y);
      p.fill(i === 2 ? C.red : C.navy);
      p.textStyle(p.BOLD);
      p.textSize(i === 2 ? 22 : 19);
      p.text(b, tx, y + 20);
      p.textStyle(p.NORMAL);
    });
    p.fill(C.green);
    p.textSize(14);
    p.text('γ_glass = 3 × α_glass  -  the 3 people forget', tx, 60 + 3 * 74);

    chip(p, `${P.V} cm³ of ${P.name}, brim-full at ${P.T0} °C, now at ${fmt(P.T0 + T, 0)} °C`, cx, p.height - 34, 'center', 13.5, C.navy);
    chip(p, `glass growth drawn ${MAG}× oversize`, 14, p.height - 30, 'left', 12, C.grey);
  };
};

let overInst: p5 | null = null;

function overWire() {
  const s = slider('aeOT');
  const apply = (T: number) => { over.T = T; el('aeOTVal').textContent = `+${T} °C`; overReadouts(); };
  wireSegmented('aeOPre', 'pre', (k) => { over.pre = k as keyof typeof OPRE; over.drops = []; overReadouts(); });
  wireHeat(over.run, 'aeOPlay', s, apply);
  el('aeOReset').addEventListener('click', () => { over.run.on = false; over.drops = []; s.value = '0'; apply(0); });
  apply(0);
}

/* ══════════════════════════════════════════════════════════════════════
   4 · THE GAP THAT NEVER CHANGES
   Height = volume on this canvas: the vessel's inner height grows by
   γ_cΔT, the liquid column by γ_LΔT, and the amber band between them
   is the empty space. Constant only when V_L γ_L = V γ_c.
   ══════════════════════════════════════════════════════════════════════ */

const G_C = 2.7e-5;
const gap = { ratio: 3, f: 0.5, T: 0, shown: 0, run: { on: false, t: 0, dur: 4 } as HeatRun };
const GAP_MAG = 40;

function gapReadouts() {
  const gL = gap.ratio * G_C;
  const dVes = G_C * gap.T;                    // fraction of V
  const dLiq = gap.f * gL * gap.T;             // fraction of V
  const gap0 = 1 - gap.f;
  const gapNow = gap0 + dVes - dLiq;
  const sweet = 1 / gap.ratio;
  const onSpot = Math.abs(gap.f - sweet) < 0.006;
  el('aeGVes').textContent = `+${fmt(dVes * 100, 3)} % of V`;
  el('aeGLiq').textContent = `+${fmt(dLiq * 100, 3)} % of V`;
  const g = el('aeGGap');
  g.textContent = gapNow < 0 ? 'overflows!' : `${fmt(gap0 * 100, 1)} % → ${fmt(gapNow * 100, 2)} %`;
  g.className = 'th-ro ' + (onSpot ? 'good' : gapNow < 0 ? 'bad' : '');
  el('aeGSweet').textContent = `1 / ${gap.ratio} = ${fmt(sweet * 100, 1)} %${onSpot ? '  ✓ you are on it' : ''}`;
  katex.render(
    String.raw`\text{gap constant}\iff V_L\gamma_L\Delta T=V\gamma_c\Delta T
      \iff \frac{V_L}{V}=\frac{\gamma_c}{\gamma_L}=\frac{1}{${gap.ratio}}
      \qquad\text{you have }\frac{V_L}{V}=${fmt(gap.f, 3)}
      \;\Rightarrow\;\text{${onSpot ? 'gap stays constant' : gap.f * gL > G_C ? 'liquid outgrows the room: gap shrinks' : 'vessel outgrows the liquid: gap widens'}}`,
    el('aeGWork'), KO
  );
}

const gapSketch = (p: p5) => {
  const holder = el('aeGapCanvas');
  const canvasH = () => Math.max(440, Math.min(540, Math.round(holder.clientWidth * 0.4)));
  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    heatTick(gap.run, p, slider('aeGT'), (T) => { gap.T = T; el('aeGTVal').textContent = `+${T} °C`; gapReadouts(); });
    gap.shown = ease(gap.shown, gap.T, 5, d);
    p.textFont('DM Sans');

    const T = gap.shown;
    const gL = gap.ratio * G_C;
    const vh = Math.min(300, p.height * 0.56);       // cold vessel height = V
    const vw = Math.min(190, p.width * 0.18);
    const cx = p.width * 0.3;
    const baseY = p.height - 60;
    const vesH = vh * (1 + G_C * T * GAP_MAG);
    const liqH = vh * gap.f * (1 + gL * T * GAP_MAG);
    const overflow = liqH > vesH;
    const gapPx = Math.max(0, vesH - liqH);
    const gap0Px = vh * (1 - gap.f);

    /* cold reference lines: vessel top and liquid top */
    p.stroke(118, 137, 160, 160);
    p.strokeWeight(1.3);
    dashed(p, true, [5, 5]);
    p.line(cx - vw * 0.85, baseY - vh, cx + vw * 0.95, baseY - vh);
    p.line(cx - vw * 0.85, baseY - vh * gap.f, cx + vw * 0.95, baseY - vh * gap.f);
    dashed(p, false);
    chip(p, 'vessel top at 0 °C', cx - vw * 0.88, baseY - vh - 9, 'right', 12, C.grey);
    chip(p, 'liquid at 0 °C', cx - vw * 0.88, baseY - vh * gap.f - 9, 'right', 12, C.grey);

    /* the empty space, painted amber before the vessel goes on top */
    const sweet = 1 / gap.ratio;
    const onSpot = Math.abs(gap.f - sweet) < 0.006;
    const gcol = onSpot ? C.green : C.amber;
    p.noStroke();
    p.fill(p.color(gcol));
    (p.drawingContext as CanvasRenderingContext2D).globalAlpha = 0.22;
    if (!overflow) p.rect(cx - vw / 2 + 2, baseY - vesH, vw - 4, gapPx);
    (p.drawingContext as CanvasRenderingContext2D).globalAlpha = 1;

    /* vessel with height-only growth (s = 1, but taller): draw by hand */
    const x0 = cx - vw / 2, x1 = cx + vw / 2;
    p.noStroke();
    p.fill('#4f7fb5');
    p.rect(x0 + 2, baseY - Math.min(liqH, vesH), vw - 4, Math.min(liqH, vesH) - 2, 0, 0, 4, 4);
    p.noFill();
    p.stroke(C.navy);
    p.strokeWeight(3);
    p.line(x0, baseY - vesH, x0, baseY);
    p.line(x1, baseY - vesH, x1, baseY);
    p.line(x0, baseY, x1, baseY);
    p.line(x0 - 6, baseY - vesH, x0, baseY - vesH);
    p.line(x1, baseY - vesH, x1 + 6, baseY - vesH);

    /* gap bracket */
    const bx = x1 + 22;
    if (!overflow) {
      p.stroke(gcol);
      p.strokeWeight(2.4);
      p.line(bx, baseY - vesH, bx, baseY - liqH);
      p.line(bx - 6, baseY - vesH, bx + 6, baseY - vesH);
      p.line(bx - 6, baseY - liqH, bx + 6, baseY - liqH);
      const dg = (gapPx - gap0Px) / vh;               // drawn change, magnified
      const lab = T < 0.5 ? `empty space\n${fmt((1 - gap.f) * 100, 1)} % of V`
        : onSpot ? `empty space\nUNCHANGED ✓` : dg > 0 ? `empty space\nWIDENING` : `empty space\nSHRINKING`;
      chip(p, lab, bx + 12, baseY - (vesH + liqH) / 2 - 16, 'left', 14, gcol);
    } else {
      chip(p, 'no gap left - it overflows', bx + 12, baseY - vesH - 10, 'left', 14, C.red);
    }

    /* the two growths on the right */
    const tx = p.width * 0.6, bw = p.width * 0.34;
    const dVes = G_C * T, dLiq = gap.f * gL * T;
    const mx = Math.max(G_C * 100, 0.95 * gL * 100) * 1.05;
    const rows: Array<[string, number, string]> = [
      [`Whole vessel grows   V γ_c ΔT`, dVes, '#5a6a80'],
      [`Liquid grows   V_L γ_L ΔT  (V_L = ${fmt(gap.f * 100, 1)} % of V)`, dLiq, '#4f7fb5'],
    ];
    rows.forEach(([nm, v, c], i) => {
      const y = 70 + i * 86;
      p.noStroke();
      p.fill(C.navy);
      p.textSize(14);
      p.textAlign(p.LEFT, p.BOTTOM);
      p.text(nm, tx, y - 8);
      p.fill(41, 89, 144, 18);
      p.rect(tx, y, bw, 24, 12);
      p.fill(c);
      p.rect(tx, y, bw * Math.min(1, v / mx), 24, 12);
      p.fill(C.dark);
      p.textSize(13);
      p.textAlign(p.LEFT, p.TOP);
      p.text(`+${fmt(v * 100, 3)} % of V`, tx, y + 28);
    });
    p.noStroke();
    p.fill(onSpot ? C.green : C.navy);
    p.textStyle(p.BOLD);
    p.textSize(20);
    p.textAlign(p.LEFT, p.TOP);
    p.text(onSpot ? 'Equal growth → the gap never changes' : 'Make the two bars EQUAL', tx, 70 + 2 * 86);
    p.textStyle(p.NORMAL);
    p.fill(C.navy);
    p.textSize(14.5);
    p.text(`V_L γ_L = V γ_c  →  V_L / V = γ_c / γ_L = 1 / ${gap.ratio} = ${fmt(sweet * 100, 1)} %`, tx, 70 + 2 * 86 + 30);

    chip(p, `height = volume here  ·  growth drawn ${GAP_MAG}× oversize  ·  +${fmt(T, 0)} °C`, 14, p.height - 30, 'left', 12, C.grey);
  };
};

let gapInst: p5 | null = null;

function gapWire() {
  const sF = slider('aeGF'), sT = slider('aeGT');
  const applyT = (T: number) => { gap.T = T; el('aeGTVal').textContent = `+${T} °C`; gapReadouts(); };
  const applyF = (f: number) => { gap.f = f; el('aeGFVal').textContent = `${fmt(f * 100, 1)} %`; gapReadouts(); };
  sF.addEventListener('input', () => applyF(+sF.value / 100));
  wireSegmented('aeGRatio', 'r', (k) => { gap.ratio = +k; gapReadouts(); });
  wireHeat(gap.run, 'aeGPlay', sT, applyT);
  el('aeGSnap').addEventListener('click', () => {
    const f = 1 / gap.ratio;
    sF.value = String(Math.round(f * 200) / 2);
    applyF(f);
  });
  applyF(0.5);
  applyT(0);
}

/* ══════════════════════════════════════════════════════════════════════
   5 · DRILL - plain DOM plus the summary box
   ══════════════════════════════════════════════════════════════════════ */

function drillWire() {
  wireTabs('aeDTabs');
  wireReveal('.th-hw', 'open');
  katex.render(
    String.raw`\gamma_{\text{apparent}}=\gamma_{\text{real}}-\gamma_{\text{container}}
      \qquad\qquad \gamma_{\text{real}}=\gamma_{\text{apparent}}+\gamma_{\text{container}}`,
    el('aeDBox1'), KO
  );
  katex.render(
    String.raw`V_{\text{spilt}}=V(\gamma_L-\gamma_c)\Delta T=V\,\gamma_{\text{apparent}}\,\Delta T`,
    el('aeDBox2'), KO
  );
  katex.render(
    String.raw`\gamma_{\text{container}}=3\,\alpha_{\text{container}}\ \text{(always)}
      \qquad\qquad \gamma_{\text{real}}>\gamma_{\text{apparent}}\ \text{(always)}`,
    el('aeDBox3'), KO
  );
}

/* ═══════════ registry ═══════════ */

(window as any).SCREEN_INIT = {
  problem: () => { probInst = mount(probInst, probSketch, 'aeProbCanvas'); },
  cases: () => { casesInst = mount(casesInst, casesSketch, 'aeCaseCanvas'); },
  overflow: () => { overInst = mount(overInst, overSketch, 'aeOverCanvas'); },
  gap: () => { gapInst = mount(gapInst, gapSketch, 'aeGapCanvas'); },
};

probWire();
casesWire();
overWire();
gapWire();
drillWire();
