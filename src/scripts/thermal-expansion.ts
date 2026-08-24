/* ═══════════ Thermometry Studio · Thermal Expansion ═══════════
   Animation-only lecture. Five screens on window.SCREEN_INIT:

     why    - the lopsided interatomic well: flatten it into a symmetric
              one and the expansion genuinely disappears
     rod    - Δl = l α ΔT with a stated magnification, negative ΔT included
     cube   - the grown square and the grown cube cut into pieces, so the
              2 and the 3 are counted rather than memorised
     metals - four rods in one furnace, plus a liquid for scale
     hole   - vote, then the pencil-circle argument; and a ring onto a shaft

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

/* ───────── shared drawing helpers ───────── */
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

/* a two-headed horizontal dimension line with the label above it */
function dimH(p: p5, x1: number, x2: number, y: number, label: string, col: string) {
  p.stroke(col);
  p.strokeWeight(2);
  arrow(p, x1, y, x2, y, 8);
  arrow(p, x2, y, x1, y, 8);
  p.strokeWeight(1.4);
  p.line(x1, y - 9, x1, y + 9);
  p.line(x2, y - 9, x2, y + 9);
  chip(p, label, (x1 + x2) / 2, y - 30, 'center', 14.5, col);
}

function dt(p: p5) {
  return Math.min(p.deltaTime || 16.7, 120) / 1000;
}

function dashed(p: p5, on: boolean, pattern: number[] = [6, 6]) {
  (p.drawingContext as CanvasRenderingContext2D).setLineDash(on ? pattern : []);
}

function ease(cur: number, target: number, rate: number, d: number) {
  return cur + (target - cur) * (1 - Math.exp(-rate * d));
}

/* temperature → colour, cool grey-blue through amber to red */
const HEAT_STOPS: Array<[number, [number, number, number]]> = [
  [-200, [30, 64, 140]],
  [-50, [96, 165, 250]],
  [20, [186, 210, 232]],
  [140, [250, 204, 120]],
  [320, [242, 130, 60]],
  [620, [186, 24, 24]],
];
function heatRGB(t: number): [number, number, number] {
  if (t <= HEAT_STOPS[0][0]) return HEAT_STOPS[0][1];
  for (let i = 1; i < HEAT_STOPS.length; i++) {
    if (t <= HEAT_STOPS[i][0]) {
      const [t0, c0] = HEAT_STOPS[i - 1];
      const [t1, c1] = HEAT_STOPS[i];
      const f = (t - t0) / (t1 - t0);
      return [0, 1, 2].map((k) => c0[k] + f * (c1[k] - c0[k])) as [number, number, number];
    }
  }
  return HEAT_STOPS[HEAT_STOPS.length - 1][1];
}

function fmt(v: number, dp: number) { return v.toFixed(dp); }
/* percentages here span 20% down to 10⁻⁸% - switch notation rather than
   printing "1.5e+0%" at one end or a row of zeros at the other */
function pct(v: number) {
  return v >= 0.01 ? `${v.toFixed(2)}%` : `${v.toExponential(1)}%`;
}
function el(id: string) { return document.getElementById(id)!; }
function slider(id: string) { return document.getElementById(id) as HTMLInputElement; }

function wireTabs(tabsId: string, onSwitch: (paneId: string) => void) {
  const tabs = el(tabsId);
  tabs.querySelectorAll<HTMLButtonElement>('.th-chip').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.pane!;
      tabs.querySelectorAll('.th-chip').forEach((x) => x.classList.toggle('active', x === b));
      const scope = tabs.closest('.screen')!;
      scope.querySelectorAll<HTMLElement>('.th-pane').forEach((e) => {
        e.classList.toggle('active', e.id === id);
      });
      onSwitch(id);
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

/* ───────── the metals, in the order the lecture uses them ───────── */
interface Metal { name: string; alpha: number; col: string; }
const METALS: Record<string, Metal> = {
  steel: { name: 'Steel', alpha: 1.2e-5, col: '#295990' },
  copper: { name: 'Copper', alpha: 1.7e-5, col: '#b45309' },
  brass: { name: 'Brass', alpha: 2.0e-5, col: '#a16207' },
  alu: { name: 'Aluminium', alpha: 2.4e-5, col: '#7c3aed' },
};
const MET_ORDER = ['steel', 'copper', 'brass', 'alu'];

/* ══════════════════════════════════════════════════════════════════════
   1 · WHY THINGS EXPAND
   A Morse well U = D[1 - e^{-a(r-r0)}]². At energy E the turning points
   are exact:

     s = √(E/D),  r_in  = r0 - ln(1+s)/a,  r_out = r0 - ln(1-s)/a

   so the midpoint sits at r0 - ln(1-s²)/(2a) > r0 and creeps outward as
   the solid warms. The symmetric comparison well is the parabola that
   matches its curvature at the bottom, where the midpoint never moves.
   ══════════════════════════════════════════════════════════════════════ */

const R0 = 1, MW_A = 3, MW_D = 1;

const uMorse = (r: number) => MW_D * (1 - Math.exp(-MW_A * (r - R0))) ** 2;
const uHarm = (r: number) => MW_D * MW_A * MW_A * (r - R0) ** 2;

/* turning points at fractional energy s² */
function turning(s: number, sym: boolean): [number, number] {
  if (sym) {
    const half = s / MW_A;
    return [R0 - half, R0 + half];
  }
  return [R0 - Math.log(1 + s) / MW_A, R0 - Math.log(1 - s) / MW_A];
}

const why = { s: 0.24, sym: false, trail: false, phase: 0, marks: [] as number[] };

function whyReadouts() {
  const [a, b] = turning(why.s, why.sym);
  const mid = (a + b) / 2;
  el('l3WIn').textContent = `${fmt(a, 3)} r₀`;
  el('l3WOut').textContent = `${fmt(b, 3)} r₀`;
  el('l3WAvg').textContent = `${fmt(mid, 3)} r₀`;
  const g = el('l3WGrow');
  const pct = (mid - R0) * 100;
  g.textContent = pct < 0.05 ? 'not at all' : `+${fmt(pct, 2)}%`;
  g.style.color = pct < 0.05 ? C.grey : C.green;
  const labels: Array<[number, string]> = [
    [0.18, 'cold'], [0.34, 'warm'], [0.55, 'hot'], [0.72, 'very hot'], [1, 'glowing'],
  ];
  el('l3WT').textContent = labels.find(([lim]) => why.s <= lim)![1];
}

const whySketch = (p: p5) => {
  const holder = el('l3WhyCanvas');
  const canvasH = () => Math.max(420, Math.min(540, Math.round(holder.clientWidth * 0.44)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    p.textFont('DM Sans');

    const [rIn, rOut] = turning(why.s, why.sym);
    const mid = (rIn + rOut) / 2;

    /* the atom swings between the turning points; slower near the walls */
    why.phase += d * (1.1 + why.s * 1.4);
    const u = (1 - Math.cos(why.phase)) / 2;
    const r = rIn + (rOut - rIn) * u;

    /* ── left: the two atoms on their spring ── */
    const lw = Math.min(p.width * 0.42, 430);
    const ax = 76, cy = p.height * 0.44;
    const scale = (lw - 176) / 1.15;
    const bx = ax + (r - 0.35) * scale;

    p.noStroke();
    p.fill(41, 89, 144, 22);
    p.rect(14, 44, lw - 28, p.height - 92, 16);

    /* the spring between them */
    p.stroke(C.grey);
    p.strokeWeight(3);
    p.noFill();
    p.beginShape();
    for (let k = 0; k <= 60; k++) {
      const f = k / 60;
      p.vertex(ax + 22 + f * (bx - ax - 44), cy + (k === 0 || k === 60 ? 0 : 13 * Math.sin(f * 22)));
    }
    p.endShape();

    /* fixed atom, then the moving one */
    const [hr, hg, hb] = heatRGB(-40 + why.s * 620);
    p.noStroke();
    p.fill(C.dark);
    p.circle(ax, cy, 40);
    p.fill(hr, hg, hb);
    p.circle(bx, cy, 40);
    p.stroke(C.navy);
    p.strokeWeight(2.4);
    p.noFill();
    p.circle(bx, cy, 40);

    /* where the turning points and the average sit, in the same picture */
    const px = (rr: number) => ax + (rr - 0.35) * scale;
    p.stroke(41, 89, 144, 80);
    p.strokeWeight(1.6);
    dashed(p, true, [4, 4]);
    p.line(px(rIn), cy - 46, px(rIn), cy + 46);
    p.line(px(rOut), cy - 46, px(rOut), cy + 46);
    dashed(p, false);
    p.stroke(C.grey);
    p.strokeWeight(2);
    dashed(p, true, [5, 4]);
    p.line(px(R0), cy + 52, px(R0), cy + 74);
    dashed(p, false);
    p.stroke(why.sym ? C.grey : C.green);
    p.strokeWeight(3);
    p.line(px(mid), cy + 52, px(mid), cy + 108);
    chip(p, 'cold spacing', px(R0), cy + 78, 'center', 12.5, C.grey);
    chip(p, why.sym ? 'average - has not moved' : 'average now',
      px(mid), cy + 112, 'center', 12.5, why.sym ? C.grey : C.green);
    chip(p, 'the atom swings between the dashed lines', 22, 54, 'left', 13, C.dark);

    /* ── right: the energy well ── */
    const gx = lw + 66, gw = p.width - lw - 100, gy = 54, gh = p.height - 132;
    const RA = 0.55, RB = 2.15, UA = 0, UB = 1.15;
    const X = (rr: number) => gx + ((rr - RA) / (RB - RA)) * gw;
    const Y = (uu: number) => gy + gh - ((uu - UA) / (UB - UA)) * gh;

    p.noStroke();
    p.fill(255);
    p.rect(gx - 46, gy - 26, gw + 66, gh + 68, 14);

    p.stroke(C.navy);
    p.strokeWeight(2.2);
    p.line(gx, gy + gh, gx + gw, gy + gh);
    p.line(gx, gy, gx, gy + gh);
    p.noStroke();
    p.fill(C.dark);
    p.textSize(12.5);
    p.textAlign(p.CENTER, p.TOP);
    p.text('separation r  →', gx + gw / 2, gy + gh + 26);
    p.push();
    p.translate(gx - 34, gy + gh / 2);
    p.rotate(-Math.PI / 2);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('energy U', 0, 0);
    p.pop();

    /* both wells, the inactive one ghosted so the difference is visible */
    const curve = (f: (rr: number) => number, col: string, weight: number) => {
      p.stroke(col);
      p.strokeWeight(weight);
      p.noFill();
      p.beginShape();
      for (let rr = RA; rr <= RB; rr += 0.01) {
        const uu = f(rr);
        if (uu <= UB) p.vertex(X(rr), Y(uu));
      }
      p.endShape();
    };
    curve(why.sym ? uMorse : uHarm, 'rgba(118,137,160,0.35)', 2);
    curve(why.sym ? uHarm : uMorse, why.sym ? C.grey : C.dark, 4);

    /* the energy line the atom is riding on */
    const E = why.s * why.s * MW_D;
    p.stroke(C.amber);
    p.strokeWeight(2.6);
    p.line(X(rIn), Y(E), X(rOut), Y(E));
    p.noStroke();
    p.fill(C.amber);
    p.circle(X(rIn), Y(E), 11);
    p.circle(X(rOut), Y(E), 11);
    chip(p, 'the hotter it is, the higher this line', X(rOut) + 12, Y(E) - 34, 'left', 13, C.amber);

    /* the live atom on the curve, and the midpoint marker */
    p.noStroke();
    p.fill(C.navy);
    p.circle(X(r), Y(E), 15);
    p.fill(255);
    p.circle(X(r), Y(E), 7);

    p.stroke(why.sym ? C.grey : C.green);
    p.strokeWeight(3);
    dashed(p, true, [5, 4]);
    p.line(X(mid), Y(E) - 8, X(mid), gy + gh);
    dashed(p, false);
    p.noStroke();
    p.fill(why.sym ? C.grey : C.green);
    p.triangle(X(mid) - 8, gy + gh + 4, X(mid) + 8, gy + gh + 4, X(mid), gy + gh - 8);

    p.stroke(C.grey);
    p.strokeWeight(1.6);
    dashed(p, true, [4, 4]);
    p.line(X(R0), gy, X(R0), gy + gh);
    dashed(p, false);
    p.noStroke();
    p.fill(C.grey);
    p.textSize(12.5);
    p.textAlign(p.CENTER, p.TOP);
    p.text('r₀', X(R0), gy + gh + 6);

    /* the trail of past averages, so the drift is undeniable */
    if (why.trail) {
      why.marks.forEach((m, i) => {
        p.noStroke();
        p.fill(22, 163, 74, 40 + i * 12);
        p.circle(X(m), gy + gh - 8, 8);
      });
    }

    chip(p, why.sym
      ? 'A SYMMETRIC well: the two sides match, so the midpoint never moves.'
      : 'The REAL well: steep on the left, gentle on the right.',
      gx, 18, 'left', 15, why.sym ? C.grey : C.navy);

    if (!why.sym) {
      chip(p, 'hard to squeeze', X(0.72), Y(0.62), 'center', 12.5, C.red);
      chip(p, 'easy to stretch', X(1.72), Y(0.72), 'center', 12.5, C.green);
    }
  };
};

let whyInst: p5 | null = null;

function whyWire() {
  const s = slider('l3WTs');
  s.addEventListener('input', () => {
    why.s = +s.value / 100;
    if (why.trail) {
      const [a, b] = turning(why.s, why.sym);
      why.marks.push((a + b) / 2);
      if (why.marks.length > 26) why.marks.shift();
    }
    whyReadouts();
  });
  wireSegmented('l3WWell', 'well', (k) => {
    why.sym = k === 'sym';
    why.marks = [];
    whyReadouts();
  });
  const t = el('l3WTrail') as HTMLButtonElement;
  t.addEventListener('click', () => {
    why.trail = !why.trail;
    why.marks = [];
    t.classList.toggle('on', why.trail);
    t.textContent = why.trail ? '✦ Trail on' : '✦ Leave a trail';
  });
  whyReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   2 · ROD GETS LONGER
   Δl = l α ΔT drawn honestly - the real change is far too small to see,
   so the picture magnifies it and says by how much.
   ══════════════════════════════════════════════════════════════════════ */

const rod = { mat: 'steel', l: 1.0, dT: 100, shown: 100 };

function rodReadouts() {
  const M = METALS[rod.mat];
  const dl = rod.l * M.alpha * rod.dT;
  el('l3RAlpha').textContent = `${fmt(M.alpha * 1e5, 1)} × 10⁻⁵ /°C`;
  el('l3RDl').textContent = `${dl >= 0 ? '+' : '−'}${fmt(Math.abs(dl) * 1000, 3)} mm`;
  el('l3RNew').textContent = `${fmt(rod.l + dl, 6)} m`;
  const w = el('l3RWhat');
  if (Math.abs(rod.dT) < 1) { w.textContent = 'nothing - ΔT = 0'; w.style.color = C.grey; }
  else if (rod.dT > 0) { w.textContent = 'expanding'; w.style.color = C.red; }
  else { w.textContent = 'contracting'; w.style.color = C.accent; }

  katex.render(
    String.raw`\Delta l = l\,\alpha\,\Delta T
      = (${fmt(rod.l, 2)})(${fmt(M.alpha * 1e5, 1)}\times10^{-5})(${fmt(rod.dT, 0)})
      = \mathbf{${dl >= 0 ? '' : '-'}${fmt(Math.abs(dl) * 1000, 3)}}\ \mathrm{mm}`,
    el('l3RWork'), KO
  );
}

const rodSketch = (p: p5) => {
  const holder = el('l3RodCanvas');
  const canvasH = () => Math.max(400, Math.min(500, Math.round(holder.clientWidth * 0.36)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    rod.shown = ease(rod.shown, rod.dT, 4.5, dt(p));
    p.textFont('DM Sans');

    const M = METALS[rod.mat];
    const dl = rod.l * M.alpha * rod.shown;

    const x0 = 74, maxW = p.width - 250;
    const barW = maxW * 0.58;                    // the rod is drawn one size
    const cy = p.height * 0.42, h = 46;

    /* Δl is invisible at true scale. Magnify it by a fixed factor picked so
       the largest case on these sliders still fits inside the canvas. */
    const MAXX = METALS.alu.alpha * 400;         // biggest α ΔT available
    const MAG = Math.round(0.34 / MAXX);
    const grown = (dl / rod.l) * barW * MAG;

    /* the original length, ghosted */
    p.noStroke();
    p.fill(41, 89, 144, 26);
    p.rect(x0, cy - h / 2, barW, h, 6);
    p.stroke(41, 89, 144, 90);
    p.strokeWeight(2);
    dashed(p, true, [6, 5]);
    p.noFill();
    p.rect(x0, cy - h / 2, barW, h, 6);
    dashed(p, false);

    /* the heated rod */
    const [r, g, b] = heatRGB(20 + rod.shown);
    p.noStroke();
    p.fill(r, g, b);
    p.rect(x0, cy - h / 2, Math.max(6, barW + grown), h, 6);
    p.stroke(C.navy);
    p.strokeWeight(2.6);
    p.noFill();
    p.rect(x0, cy - h / 2, Math.max(6, barW + grown), h, 6);

    /* the wall it is pinned to on the left */
    p.noStroke();
    p.fill(C.navy);
    p.rect(x0 - 16, cy - h / 2 - 12, 14, h + 24, 4);
    for (let k = 0; k < 6; k++) {
      p.stroke(C.navy);
      p.strokeWeight(2);
      p.line(x0 - 16, cy - h / 2 - 12 + k * 12, x0 - 28, cy - h / 2 - 4 + k * 12);
    }

    /* heat shimmer / frost, so hot and cold read differently */
    if (rod.shown > 40) {
      p.stroke(220, 38, 38, Math.min(160, rod.shown * 0.6));
      p.strokeWeight(2);
      p.noFill();
      for (let i = 0; i < 5; i++) {
        const sx = x0 + 40 + i * (barW / 5);
        p.beginShape();
        for (let k = 0; k <= 12; k++) {
          p.vertex(sx + 6 * Math.sin(k * 0.55 + p.frameCount * 0.07 + i), cy - h / 2 - 6 - k * 2.2);
        }
        p.endShape();
      }
    } else if (rod.shown < -30) {
      p.stroke(190, 230, 255, 220);
      p.strokeWeight(2);
      for (let i = 0; i < 5; i++) {
        const sx = x0 + 40 + i * (barW / 5);
        for (let k = 0; k < 3; k++) {
          const a = (k * Math.PI) / 3;
          p.line(sx - 7 * Math.cos(a), cy - h / 2 - 20 - 7 * Math.sin(a),
            sx + 7 * Math.cos(a), cy - h / 2 - 20 + 7 * Math.sin(a));
        }
      }
    }

    /* the two dimension lines */
    dimH(p, x0, x0 + barW, cy + 84, `l = ${fmt(rod.l, 2)} m`, C.dark);
    if (Math.abs(grown) > 3) {
      const gx1 = grown > 0 ? x0 + barW : x0 + barW + grown;
      const gx2 = grown > 0 ? x0 + barW + grown : x0 + barW;
      p.noStroke();
      p.fill(grown > 0 ? p.color(225, 29, 72, 60) : p.color(0, 160, 227, 60));
      p.rect(gx1, cy - h / 2, gx2 - gx1, h);
      dimH(p, gx1, gx2, cy - h / 2 - 44,
        `Δl = ${grown >= 0 ? '+' : '−'}${fmt(Math.abs(dl) * 1000, 2)} mm`,
        grown > 0 ? C.red : C.accent);
    }

    /* the honesty note */
    chip(p, `The rod is one fixed size on screen; Δl is drawn ${MAG}× oversize, `
      + 'because at true scale it is thinner than this line.',
      x0, p.height - 40, 'left', 13.5, C.grey);
    chip(p, `${M.name}  ·  α = ${fmt(M.alpha * 1e5, 1)} × 10⁻⁵ per °C  ·  ΔT = ${fmt(rod.shown, 0)} °C`,
      x0, 16, 'left', 15, C.navy);

    /* what it means on something big */
    const spanX = p.width - 176;
    p.noStroke();
    p.fill(255);
    p.rect(spanX - 12, 54, 168, 118, 14);
    p.fill(C.dark);
    p.textSize(12.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text('ON A 100 m BRIDGE', spanX, 68);
    p.fill(C.navy);
    p.textFont('DM Sans');
    p.textSize(27);
    const bridge = 100 * M.alpha * rod.shown * 1000;
    p.text(`${bridge >= 0 ? '' : '−'}${fmt(Math.abs(bridge), 0)} mm`, spanX, 92);
    p.fill(60, 80, 105);
    p.textSize(13);
    p.text('this is why expansion joints exist', spanX, 128, 150, 44);
  };
};

let rodInst: p5 | null = null;

function rodWire() {
  wireSegmented('l3RMat', 'mat', (k) => { rod.mat = k; rodReadouts(); });
  const sl = slider('l3RL'), st = slider('l3RT');
  sl.addEventListener('input', () => {
    rod.l = +sl.value / 10;
    el('l3RLVal').textContent = `${fmt(rod.l, 1)} m`;
    rodReadouts();
  });
  st.addEventListener('input', () => {
    rod.dT = +st.value;
    el('l3RTVal').textContent = `${rod.dT >= 0 ? '+' : ''}${rod.dT} °C`;
    rodReadouts();
  });
  rodReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   3 · AREA AND VOLUME
   The grown square is the old square + two strips + one corner; the grown
   cube is the old cube + three slabs + three bars + one crumb. Counting
   the surviving pieces is the derivation.

   x = α ΔT is the fractional growth. Realistic x is about 0.001, at which
   the corner is a millionth of the area - the exaggeration slider is the
   only reason you can ever see it.
   ══════════════════════════════════════════════════════════════════════ */

const REAL_X = 0.0012;                    // α ΔT for steel over ~100 °C
const geo = { xA: 0.24, xB: 0.24, splitA: false, splitB: false, gA: 0, gB: 0 };

/* slider 0..100 → fractional growth, from realistic up to a silly 0.34 */
const xFromSlider = (v: number) => REAL_X * Math.pow(10 ** (2.45 * (v / 100)), 1);

function geoReadouts() {
  const x = geo.xA;
  el('l3CEVal').textContent = `×${fmt(x / REAL_X, 0)}`;
  el('l3SqStrip').textContent = `2x = ${pct(2 * x * 100)} of A`;
  el('l3SqCorner').textContent = `x² = ${pct(x * x * 100)} of A`;
  el('l3SqRes').textContent = `2α ΔT, so β = 2α`;

  const y = geo.xB;
  el('l3CE2Val').textContent = `×${fmt(y / REAL_X, 0)}`;
  el('l3CuSlab').textContent = `3x = ${pct(3 * y * 100)} of V`;
  el('l3CuBar').textContent = `3x² = ${pct(3 * y * y * 100)} of V`;
  el('l3CuCube').textContent = `x³ = ${pct(y ** 3 * 100)} of V`;
  el('l3CuRes').textContent = `3α ΔT, so γ = 3α`;
}

/* ── the square ── */
const sqSketch = (p: p5) => {
  const holder = el('l3SqCanvas');
  const canvasH = () => Math.max(420, Math.min(520, Math.round(holder.clientWidth * 0.4)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    geo.gA = ease(geo.gA, geo.splitA ? 1 : 0, 5, dt(p));
    p.textFont('DM Sans');

    const x = geo.xA;
    const side = Math.min(p.height - 230, p.width * 0.36);
    const ox = 84, oy = 76;
    const d = side * x;                     // the drawn growth
    const gap = geo.gA * 26;                // how far the pieces slide apart

    /* the original square */
    p.noStroke();
    p.fill(0, 160, 227, 55);
    p.rect(ox, oy, side, side);
    p.stroke(C.accent);
    p.strokeWeight(2.6);
    p.noFill();
    p.rect(ox, oy, side, side);
    p.noStroke();
    p.fill(C.dark);
    p.textSize(19);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('A = l²', ox + side / 2, oy + side / 2);

    /* the two strips */
    p.noStroke();
    p.fill(22, 163, 74, 90);
    p.rect(ox + side + gap, oy, d, side);            // right strip
    p.rect(ox, oy + side + gap, side, d);            // bottom strip
    p.stroke(C.green);
    p.strokeWeight(2);
    p.noFill();
    p.rect(ox + side + gap, oy, d, side);
    p.rect(ox, oy + side + gap, side, d);

    /* the corner - the piece that gets thrown away */
    p.noStroke();
    p.fill(225, 29, 72, 150);
    p.rect(ox + side + gap, oy + side + gap, d, d);
    p.stroke(C.red);
    p.strokeWeight(2);
    p.noFill();
    p.rect(ox + side + gap, oy + side + gap, d, d);

    /* labels for each piece */
    if (d > 14) {
      chip(p, 'l·Δl', ox + side + gap + d / 2, oy + side / 2 - 10, 'center', 14, C.green);
      chip(p, 'l·Δl', ox + side / 2, oy + side + gap + d / 2 - 10, 'center', 14, C.green);
    }
    if (d > 15) {
      chip(p, 'Δl²', ox + side + gap + d / 2, oy + side + gap + d / 2 - 10, 'center', 13.5, C.red);
    } else {
      chip(p, 'the corner is here,\ntoo small to draw', ox + side + 44, oy + side + 34, 'left', 13, C.red);
      p.stroke(C.red);
      p.strokeWeight(1.6);
      arrow(p, ox + side + 40, oy + side + 44, ox + side + d + 4, oy + side + d + 4, 7);
    }

    /* dimensions */
    dimH(p, ox, ox + side, oy - 30, 'l', C.dark);
    if (d > 10) dimH(p, ox + side + gap, ox + side + gap + d, oy - 30, 'Δl = l αΔT', C.green);

    /* the arithmetic, written out beside it */
    const tx = ox + side + Math.max(d, 40) + 76;
    if (p.width - tx > 220) {
      p.noStroke();
      p.fill(255);
      p.rect(tx - 14, 74, p.width - tx - 6, 216, 14);
      p.fill(C.navy);
      p.textFont('DM Sans');
      p.textAlign(p.LEFT, p.TOP);
      p.textSize(17);
      p.text('A′ = (l + Δl)²', tx, 92);
      p.text('   = l² + 2l·Δl + Δl²', tx, 120);
      p.fill(C.green);
      p.textSize(15.5);
      p.text('two strips survive  →  2l·Δl', tx, 158);
      p.fill(C.red);
      p.text(`corner is x² = ${pct(x * x * 100)} — drop it`, tx, 182);
      p.fill(C.navy);
      p.textSize(18);
      p.text('ΔA = 2l·Δl = 2A αΔT', tx, 218);
      p.fill(C.accent);
      p.textSize(21);
      p.text('β = 2α', tx, 250);
    }

    chip(p, x <= REAL_X * 1.4
      ? 'This is real size. The corner is a millionth of the area - that is why it is dropped.'
      : `Growth exaggerated ${fmt(x / REAL_X, 0)}× so the pieces are visible.`,
      ox, p.height - 38, 'left', 13.5, x <= REAL_X * 1.4 ? C.green : C.grey);
  };
};

/* ── the cube, drawn isometric ──
   The three faces we can see are the top (+Y), the right (+X) and the front
   (-Z), so the growth is put on exactly those. Pieces are painted far-to-near
   using the depth key X + Y - Z, which is what makes the stack read as solid. */
const cuSketch = (p: p5) => {
  const holder = el('l3CuCanvas');
  const canvasH = () => Math.max(430, Math.min(540, Math.round(holder.clientWidth * 0.42)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    geo.gB = ease(geo.gB, geo.splitB ? 1 : 0, 5, dt(p));
    p.textFont('DM Sans');

    const x = geo.xB;
    const s = 1, d = x, gp = geo.gB * 0.1;

    /* the eight pieces: the cube, three slabs, three bars and the crumb */
    type Piece = { X: number; Y: number; Z: number; w: number; h: number; dd: number;
                   col: [number, number, number]; line: string; core?: boolean };
    const pieces: Piece[] = [
      { X: 0, Y: 0, Z: 0, w: s, h: s, dd: s, col: [56, 170, 224], line: '#0b6ea0', core: true },
      { X: s + gp, Y: 0, Z: 0, w: d, h: s, dd: s, col: [52, 168, 96], line: '#0f7a38' },
      { X: 0, Y: s + gp, Z: 0, w: s, h: d, dd: s, col: [52, 168, 96], line: '#0f7a38' },
      { X: 0, Y: 0, Z: s + gp, w: s, h: s, dd: d, col: [52, 168, 96], line: '#0f7a38' },
      { X: s + gp, Y: s + gp, Z: 0, w: d, h: d, dd: s, col: [225, 70, 105], line: '#a3123c' },
      { X: s + gp, Y: 0, Z: s + gp, w: d, h: s, dd: d, col: [225, 70, 105], line: '#a3123c' },
      { X: 0, Y: s + gp, Z: s + gp, w: s, h: d, dd: d, col: [225, 70, 105], line: '#a3123c' },
      { X: s + gp, Y: s + gp, Z: s + gp, w: d, h: d, dd: d, col: [140, 90, 240], line: '#5b21b6' },
    ];

    /* fit by projecting every corner of every piece at unit scale, then
       scaling and centring whatever bounding box comes out */
    const corners: Array<[number, number]> = [];
    pieces.forEach((q) => {
      [q.X, q.X + q.w].forEach((X) => [q.Y, q.Y + q.h].forEach((Y) =>
        [q.Z, q.Z + q.dd].forEach((Z) => {
          corners.push([(X - Z) * 0.87, -Y + (X + Z) * 0.5]);
        })));
    });
    const uMin = Math.min(...corners.map((c) => c[0]));
    const uMax = Math.max(...corners.map((c) => c[0]));
    const vMin = Math.min(...corners.map((c) => c[1]));
    const vMax = Math.max(...corners.map((c) => c[1]));

    const panelW = Math.min(p.width * 0.52, p.width - 360);
    const availW = panelW - 80, availH = p.height - 190;
    const k = Math.min(availW / (uMax - uMin), availH / (vMax - vMin));
    const ox = 46 + (availW - (uMax - uMin) * k) / 2 - uMin * k;
    const oy = 78 - vMin * k;

    const P = (X: number, Y: number, Z: number) => ({
      x: ox + (X - Z) * 0.87 * k,
      y: oy + (-Y + (X + Z) * 0.5) * k,
    });

    /* far to near: the near corner of the picture is (X max, Y min, Z max) */
    pieces.sort((a, b) => (a.X + a.Z - a.Y) - (b.X + b.Z - b.Y));

    pieces.forEach((q) => {
      const { X, Y, Z, w, h, dd } = q;
      const [cr, cg, cb] = q.col;
      /* the three faces that actually point at the viewer */
      const t1 = P(X, Y + h, Z), t2 = P(X + w, Y + h, Z);
      const t3 = P(X + w, Y + h, Z + dd), t4 = P(X, Y + h, Z + dd);
      const r1 = P(X + w, Y + h, Z), r2 = P(X + w, Y + h, Z + dd);
      const r3 = P(X + w, Y, Z + dd), r4 = P(X + w, Y, Z);
      const f1 = P(X, Y + h, Z + dd), f2 = P(X + w, Y + h, Z + dd);
      const f3 = P(X + w, Y, Z + dd), f4 = P(X, Y, Z + dd);
      const al = q.core ? 255 : 186;             // see the core through its shell
      p.stroke(q.line);
      p.strokeWeight(1.6);
      p.fill(cr, cg, cb, al);                            // top
      p.quad(t1.x, t1.y, t2.x, t2.y, t3.x, t3.y, t4.x, t4.y);
      p.fill(cr * 0.72, cg * 0.72, cb * 0.72, al);       // right
      p.quad(r1.x, r1.y, r2.x, r2.y, r3.x, r3.y, r4.x, r4.y);
      p.fill(cr * 0.86, cg * 0.86, cb * 0.86, al);       // front-left
      p.quad(f1.x, f1.y, f2.x, f2.y, f3.x, f3.y, f4.x, f4.y);
    });

    const mid = P(s * 0.5, s, s * 0.6);
    chip(p, 'V = l³', mid.x, mid.y - 10, 'center', 16, '#0b6ea0');

    /* a key, since the pieces are what the derivation counts */
    const ky = p.height - 118;
    const key: Array<[string, string]> = [
      ['3 flat slabs  l²·Δl  — these survive', C.green],
      ['3 thin bars  l·Δl²  — dropped', C.red],
      ['1 crumb  Δl³  — dropped', C.violet],
    ];
    key.forEach(([txt, col], i) => {
      p.noStroke();
      p.fill(col);
      p.rect(22, ky + i * 24, 14, 14, 3);
      p.fill(C.navy);
      p.textSize(13.5);
      p.textAlign(p.LEFT, p.TOP);
      p.text(txt, 44, ky + i * 24 - 1);
    });

    /* the arithmetic */
    const tx = p.width - 328;
    p.noStroke();
    p.fill(255);
    p.rect(tx - 14, 62, 320, 250, 14);
    p.fill(C.navy);
    p.textAlign(p.LEFT, p.TOP);
    p.textSize(17);
    p.text('V′ = (l + Δl)³', tx, 80);
    p.text('   = l³ + 3l²Δl + 3lΔl² + Δl³', tx, 108);
    p.fill(C.green);
    p.textSize(15.5);
    p.text('3 slabs survive  →  3l²·Δl', tx, 148);
    p.fill(C.red);
    p.text(`3 bars = ${pct(3 * x * x * 100)} — drop`, tx, 172);
    p.fill(C.violet);
    p.text(`1 crumb = ${pct(x ** 3 * 100)} — drop`, tx, 196);
    p.fill(C.navy);
    p.textSize(18);
    p.text('ΔV = 3l²·Δl = 3V αΔT', tx, 232);
    p.fill(C.accent);
    p.textSize(22);
    p.text('γ = 3α', tx, 264);

    chip(p, 'length 1  ·  area 2  ·  volume 3      α : β : γ = 1 : 2 : 3',
      tx - 14, p.height - 58, 'left', 15, C.navy);
    chip(p, x <= REAL_X * 1.4
      ? 'Real size: everything red and violet has vanished.'
      : `Growth exaggerated ${fmt(x / REAL_X, 0)}×.`,
      20, 18, 'left', 13.5, x <= REAL_X * 1.4 ? C.green : C.grey);
  };
};

let sqInst: p5 | null = null, cuInst: p5 | null = null;

function geoWire() {
  const a = slider('l3CE'), b = slider('l3CE2');
  a.addEventListener('input', () => { geo.xA = xFromSlider(+a.value); geoReadouts(); });
  b.addEventListener('input', () => { geo.xB = xFromSlider(+b.value); geoReadouts(); });
  el('l3CSplit').addEventListener('click', () => {
    geo.splitA = !geo.splitA;
    el('l3CSplit').classList.toggle('on', geo.splitA);
  });
  el('l3CSplit2').addEventListener('click', () => {
    geo.splitB = !geo.splitB;
    el('l3CSplit2').classList.toggle('on', geo.splitB);
  });
  const toReal = (sl: HTMLInputElement, which: 'A' | 'B') => {
    sl.value = '0';
    if (which === 'A') geo.xA = xFromSlider(0); else geo.xB = xFromSlider(0);
    geoReadouts();
  };
  el('l3CReal').addEventListener('click', () => toReal(a, 'A'));
  el('l3CReal2').addEventListener('click', () => toReal(b, 'B'));
  geo.xA = xFromSlider(+a.value);
  geo.xB = xFromSlider(+b.value);
  geoReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   4 · WHICH METAL GROWS MOST
   Four identical rods, one furnace. The order never changes, and a liquid
   is drawn alongside so the ~100× gap has a shape.
   ══════════════════════════════════════════════════════════════════════ */

/* γ for two real liquids, so the "liquids expand far more" point rests on
   numbers rather than a slogan: mercury is only ~5× steel, ethanol ~30×. */
const G_HG = 1.8e-4, G_ETH = 1.1e-3;
const met = { dT: 100, run: false, prog: 0 };

function metReadouts() {
  el('l3MMin').textContent = `Steel · 1.2 × 10⁻⁵`;
  el('l3MMax').textContent = `Aluminium · 2.4 × 10⁻⁵`;
  el('l3MRatio').textContent = `${fmt(METALS.alu.alpha / METALS.steel.alpha, 1)}× as much`;
  el('l3MLiq').textContent = `ethanol γ ≈ ${fmt(G_ETH / (3 * METALS.steel.alpha), 0)}× steel's`;
}

const metSketch = (p: p5) => {
  const holder = el('l3MetCanvas');
  const canvasH = () => Math.max(430, Math.min(540, Math.round(holder.clientWidth * 0.42)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    met.prog = ease(met.prog, met.run ? 1 : 0, 2.2, d);
    p.textFont('DM Sans');

    const x0 = 132, maxW = p.width - 300;
    const top = 76, rowH = 54;
    const dTeff = met.dT * met.prog;
    /* one magnification for all four rods, set so the worst case still fits */
    const barW = maxW * 0.55;
    const MAXX = METALS.alu.alpha * 400;
    const MAG = Math.round(0.33 / MAXX);

    /* the furnace glow behind the rods while it is running */
    if (met.prog > 0.02) {
      const [r, g, b] = heatRGB(20 + dTeff);
      p.noStroke();
      p.fill(r, g, b, 40 * met.prog);
      p.rect(x0 - 26, top - 22, maxW + 150, rowH * 4 + 24, 16);
    }

    MET_ORDER.forEach((key, i) => {
      const M = METALS[key];
      const y = top + i * rowH;
      const dl = 1.0 * M.alpha * dTeff;
      const grown = barW * (M.alpha * dTeff) * MAG;

      p.noStroke();
      p.fill(C.dark);
      p.textSize(15);
      p.textAlign(p.RIGHT, p.CENTER);
      p.text(M.name, x0 - 16, y + 18);

      /* the original length, ghosted */
      p.fill(41, 89, 144, 22);
      p.rect(x0, y, barW, 34, 5);
      p.stroke(41, 89, 144, 70);
      p.strokeWeight(1.6);
      dashed(p, true, [5, 4]);
      p.noFill();
      p.rect(x0, y, barW, 34, 5);
      dashed(p, false);

      /* the heated rod */
      const [r, g, b] = heatRGB(20 + dTeff);
      p.noStroke();
      p.fill(r, g, b);
      p.rect(x0, y, barW + grown, 34, 5);
      p.stroke(M.col);
      p.strokeWeight(2.4);
      p.noFill();
      p.rect(x0, y, barW + grown, 34, 5);

      /* the bit it gained */
      if (grown > 2) {
        p.noStroke();
        p.fill(225, 29, 72, 130);
        p.rect(x0 + barW, y + 2, grown, 30, 3);
      }

      p.noStroke();
      p.fill(C.navy);
      p.textSize(14);
      p.textAlign(p.LEFT, p.CENTER);
      p.text(`α = ${fmt(M.alpha * 1e5, 1)} × 10⁻⁵    Δl = ${fmt(dl * 1000, 2)} mm`,
        x0 + barW + grown + 16, y + 18);
    });

    chip(p, `Every rod starts at 1.000 m. Heating all of them by ${fmt(dTeff, 0)} °C.`,
      20, 20, 'left', 15, C.navy);
    chip(p, `every rod drawn the same size; growth magnified ${MAG}×`,
      20, p.height - 36, 'left', 13, C.grey);

    /* ── a liquid, for scale ── */
    const ly = top + rowH * 4 + 26;
    p.noStroke();
    p.fill(C.dark);
    p.textSize(13);
    p.textAlign(p.LEFT, p.TOP);
    p.text('SAME HEATING, VOLUME EXPANSION', x0 - 16, ly);

    const bars: Array<[string, number, string]> = [
      ['Steel  γ = 3α', 3 * METALS.steel.alpha, C.dark],
      ['Aluminium  γ = 3α', 3 * METALS.alu.alpha, C.violet],
      ['Mercury, a liquid', G_HG, C.amber],
      ['Ethanol, a liquid', G_ETH, C.accent],
    ];
    const gMax = G_ETH;
    bars.forEach(([nm, gv, col], i) => {
      const by = ly + 24 + i * 26;
      p.noStroke();
      p.fill(41, 89, 144, 20);
      p.rect(x0, by, barW, 16, 8);
      p.fill(col);
      p.rect(x0, by, barW * (gv / gMax) * met.prog, 16, 8);
      p.fill(C.navy);
      p.textSize(12.5);
      p.textAlign(p.LEFT, p.CENTER);
      p.text(`${nm}  ·  ${(gv).toExponential(1)} /°C`, x0 + barW + 14, by + 8);
    });
  };
};

let metInst: p5 | null = null;

function metWire() {
  const s = slider('l3MT');
  s.addEventListener('input', () => {
    met.dT = +s.value;
    el('l3MTVal').textContent = `+${met.dT} °C`;
  });
  el('l3MRun').addEventListener('click', () => { met.run = true; });
  el('l3MRst').addEventListener('click', () => { met.run = false; });
  metReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   5a · THE HOLE QUESTION
   Vote first, then the pencil-circle argument in four steps.
   ══════════════════════════════════════════════════════════════════════ */

const A_STEEL = 1.2e-5, D0 = 2.0, T0C = 20;
const holeD = (t: number) => D0 * (1 + A_STEEL * (t - T0C));

const hole = { step: 0, t: T0C, shown: T0C, vote: '' as string, cut: 0, overlay: 0 };

function holeReadouts() {
  const d = holeD(hole.shown);
  el('l3HNow').textContent = `${fmt(d, 4)} cm`;
  el('l3HDd').textContent = `+${fmt((d - D0) * 10, 3)} mm`;
}

const holeSketch = (p: p5) => {
  const holder = el('l3HoleCanvas');
  const canvasH = () => Math.max(420, Math.min(520, Math.round(holder.clientWidth * 0.4)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    hole.shown = ease(hole.shown, hole.t, 3.6, d);
    hole.cut = ease(hole.cut, hole.step >= 2 ? 1 : 0, 3.4, d);
    hole.overlay = ease(hole.overlay, hole.step >= 4 ? 1 : 0, 3.4, d);
    holeReadouts();
    p.textFont('DM Sans');

    /* everything on the plate scales by the same factor - that is the point */
    const MAG = 260;
    const f = 1 + A_STEEL * (hole.shown - T0C) * MAG;

    const half = p.width / 2;
    const plateW = Math.min(half - 90, 320), plateH = plateW * 0.72;
    const [r, g, b] = heatRGB(hole.shown);

    const drawPlate = (cx: number, cy: number, showDisc: boolean, cutAway: number, label: string) => {
      const w = plateW * f, h = plateH * f, dia = plateW * 0.34 * f;

      /* the plate */
      p.noStroke();
      p.fill(r, g, b);
      p.rect(cx - w / 2, cy - h / 2, w, h, 10);
      p.stroke(C.navy);
      p.strokeWeight(2.6);
      p.noFill();
      p.rect(cx - w / 2, cy - h / 2, w, h, 10);

      /* the original outline, so the growth is visible */
      p.stroke(41, 89, 144, 90);
      p.strokeWeight(1.6);
      dashed(p, true, [5, 4]);
      p.rect(cx - plateW / 2, cy - plateH / 2, plateW, plateH, 10);
      dashed(p, false);

      if (showDisc) {
        /* pencil circle drawn on solid metal */
        p.stroke(C.navy);
        p.strokeWeight(2.4);
        dashed(p, true, [7, 5]);
        p.noFill();
        p.circle(cx, cy, dia);
        dashed(p, false);
        chip(p, 'pencil circle', cx, cy - dia / 2 - 30, 'center', 13, C.navy);
      } else {
        /* the hole itself, and the disc sliding away */
        p.noStroke();
        p.fill(C.paper);
        p.circle(cx, cy, dia);
        p.stroke(C.red);
        p.strokeWeight(3);
        p.noFill();
        p.circle(cx, cy, dia);
        if (cutAway > 0.02 && cutAway < 0.98) {
          p.noStroke();
          p.fill(r, g, b, 200 * (1 - cutAway));
          p.circle(cx + cutAway * 150, cy - cutAway * 60, dia);
        }
      }

      /* the diameter, dimensioned */
      p.stroke(showDisc ? C.navy : C.red);
      p.strokeWeight(2);
      arrow(p, cx - dia / 2, cy, cx + dia / 2, cy, 7);
      arrow(p, cx + dia / 2, cy, cx - dia / 2, cy, 7);
      chip(p, `${fmt(holeD(hole.shown), 4)} cm`, cx, cy + 18, 'center', 14,
        showDisc ? C.navy : C.red);

      p.noStroke();
      p.fill(C.dark);
      p.textSize(14.5);
      p.textAlign(p.CENTER, p.TOP);
      p.text(label, cx, cy + plateH / 2 * f + 22);
    };

    const captions = [
      'Vote above, then walk through it.',
      'Step 1 · Draw a circle on SOLID metal and heat the plate. Everything drawn on it grows too.',
      'Step 2 · Now cut the disc out along that line and throw it away.',
      'Step 3 · Heat the plate again. The metal left behind has no idea the disc ever went.',
      'Step 4 · Lay them on top of each other. The hole and the pencil circle match exactly.',
    ];

    if (hole.step <= 1) {
      drawPlate(p.width / 2, p.height * 0.46, true, 0, 'solid plate, circle drawn on it');
    } else if (hole.step >= 4) {
      const cx = p.width / 2;
      drawPlate(cx, p.height * 0.46, true, 0, 'the two, superimposed');
      const dia = plateW * 0.34 * f;
      p.stroke(C.red);
      p.strokeWeight(3 * hole.overlay);
      p.noFill();
      p.circle(cx, p.height * 0.46, dia);
      chip(p, 'the hole sits exactly on the pencil circle',
        cx, p.height * 0.46 + dia / 2 + 34, 'center', 15, C.green);
    } else {
      drawPlate(p.width * 0.27, p.height * 0.46, true, 0, 'circle drawn on solid metal');
      drawPlate(p.width * 0.73, p.height * 0.46, false, hole.cut, 'disc removed');
    }

    p.noStroke();
    p.fill(C.navy);
    p.textSize(15.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text(captions[Math.min(hole.step, 4)], 20, 16, p.width - 40, 44);
    chip(p, `expansion magnified ${MAG}×  ·  plate at ${fmt(hole.shown, 0)} °C`,
      20, p.height - 34, 'left', 13, C.grey);
  };
};

let holeInst: p5 | null = null;

function holeWire() {
  el('l3HVote').querySelectorAll<HTMLButtonElement>('.th-btn').forEach((b) => {
    b.addEventListener('click', () => {
      hole.vote = b.dataset.vote!;
      el('l3HVote').querySelectorAll('.th-btn').forEach((x) => x.classList.toggle('on', x === b));
      const v = el('l3HVerdict');
      if (hole.vote === 'big') { v.textContent = 'correct - it grows'; v.style.color = C.green; }
      else if (hole.vote === 'small') { v.textContent = 'the popular answer, and wrong'; v.style.color = C.red; }
      else { v.textContent = 'not quite - it grows'; v.style.color = C.red; }
      el('l3HSteps').style.display = '';
      if (hole.step === 0) hole.step = 1;
    });
  });
  const st = slider('l3HT');
  st.addEventListener('input', () => {
    hole.t = +st.value;
    el('l3HTVal').textContent = `${hole.t} °C`;
    holeReadouts();
  });
  const set = (n: number) => { hole.step = n; if (hole.t === T0C) { hole.t = 220; st.value = '220'; el('l3HTVal').textContent = '220 °C'; } };
  el('l3HS1').addEventListener('click', () => set(1));
  el('l3HS2').addEventListener('click', () => set(2));
  el('l3HS3').addEventListener('click', () => set(3));
  el('l3HS4').addEventListener('click', () => set(4));
  el('l3HRst').addEventListener('click', () => {
    hole.step = 1; hole.t = T0C; st.value = '20';
    el('l3HTVal').textContent = '20 °C';
    holeReadouts();
  });
  holeReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   5b · RING ONTO A SHAFT
   The hole rule with a job to do: heat the ring and it slides on.
   ══════════════════════════════════════════════════════════════════════ */

const SHAFT_D = 4.0, RING_D0 = 3.98, A_RING = 1.7e-5;
const ringHole = (t: number) => RING_D0 * (1 + A_RING * (t - T0C));

const ring = { t: T0C, shown: T0C, slide: false, pos: 0 };

function ringReadouts() {
  const d = ringHole(ring.shown);
  el('l3HRHole').textContent = `${fmt(d, 4)} cm`;
  const gap = d - SHAFT_D;
  const g = el('l3HRGap');
  g.textContent = `${gap >= 0 ? '+' : '−'}${fmt(Math.abs(gap) * 10, 3)} mm`;
  g.style.color = gap >= 0 ? C.green : C.red;
}

const ringSketch = (p: p5) => {
  const holder = el('l3RingCanvas');
  const canvasH = () => Math.max(400, Math.min(500, Math.round(holder.clientWidth * 0.34)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    ring.shown = ease(ring.shown, ring.t, 3.4, d);
    const fits = ringHole(ring.shown) >= SHAFT_D;
    ring.pos = ease(ring.pos, ring.slide && fits ? 1 : 0, 2.6, d);
    ringReadouts();
    p.textFont('DM Sans');

    /* Head on. The shaft is drawn to size and only the clearance is
       magnified, so "bore equals shaft" really does look like it. */
    const MAG = 34;
    const shaftR = Math.min(104, p.height * 0.26);
    const pxPerCm = shaftR / (SHAFT_D / 2);
    const holeR = shaftR + ((ringHole(ring.shown) - SHAFT_D) / 2) * pxPerCm * MAG;
    const wall = 34;

    const cy = p.height * 0.5;
    const parked = p.width * 0.27, onShaft = p.width * 0.66;
    const cx = parked + (onShaft - parked) * ring.pos;
    const sx = onShaft;

    /* the shaft, head on */
    p.noStroke();
    p.fill(120, 134, 153);
    p.circle(sx, cy, shaftR * 2);
    p.stroke(C.navy);
    p.strokeWeight(2.6);
    p.noFill();
    p.circle(sx, cy, shaftR * 2);
    p.noStroke();
    p.fill(255, 255, 255, 60);
    p.circle(sx - shaftR * 0.3, cy - shaftR * 0.3, shaftR * 0.7);
    p.fill(C.dark);
    p.textSize(13.5);
    p.textAlign(p.CENTER, p.TOP);
    p.text('shaft, 4.000 cm', sx, cy + shaftR + 16);

    /* the ring, drawn as a thick stroked circle so it really is an annulus -
       fill the bore and it would paint over the shaft it has just gone onto */
    const [r, g, b] = heatRGB(ring.shown);
    p.noFill();
    p.stroke(r, g, b);
    p.strokeWeight(wall);
    p.circle(cx, cy, holeR * 2 + wall);
    p.stroke(C.navy);
    p.strokeWeight(2.6);
    p.circle(cx, cy, (holeR + wall) * 2);
    p.stroke(fits ? C.green : C.red);
    p.strokeWeight(3);
    p.circle(cx, cy, holeR * 2);

    /* while it is parked, show the bore against the shaft it has to clear */
    if (ring.pos < 0.35) {
      p.stroke(C.grey);
      p.strokeWeight(2);
      dashed(p, true, [6, 5]);
      p.noFill();
      p.circle(cx, cy, shaftR * 2);
      dashed(p, false);
      chip(p, 'shaft size, for comparison', cx, cy - shaftR - 34, 'center', 12.5, C.grey);
    }

    /* the bore, dimensioned */
    p.stroke(fits ? C.green : C.red);
    p.strokeWeight(2);
    arrow(p, cx - holeR, cy, cx + holeR, cy, 8);
    arrow(p, cx + holeR, cy, cx - holeR, cy, 8);
    chip(p, `bore ${fmt(ringHole(ring.shown), 4)} cm`, cx, cy + 14, 'center', 14,
      fits ? C.green : C.red);

    /* heat coming off a hot ring */
    if (ring.shown > 80) {
      p.stroke(220, 38, 38, Math.min(150, ring.shown * 0.35));
      p.strokeWeight(2);
      p.noFill();
      for (let i = -1; i <= 1; i++) {
        p.beginShape();
        for (let k = 0; k <= 12; k++) {
          p.vertex(cx + i * 30 + 5 * Math.sin(k * 0.6 + p.frameCount * 0.08 + i),
            cy - holeR - wall - 10 - k * 2.6);
        }
        p.endShape();
      }
    }

    chip(p, fits
      ? '✓ the bore is now wider than the shaft - it slides straight on'
      : '✗ the bore is still narrower than the shaft - it will not go on',
      20, 18, 'left', 15.5, fits ? C.green : C.red);
    chip(p, `ring at ${fmt(ring.shown, 0)} °C  ·  shaft drawn to size, `
      + `clearance magnified ${MAG}×`, 20, p.height - 34, 'left', 13, C.grey);

    if (ring.pos > 0.9) {
      chip(p, 'now let it cool: the bore shrinks back and grips the shaft',
        p.width - 20, p.height - 62, 'right', 14.5, C.accent);
    }
  };
};

let ringInst: p5 | null = null;

function ringWire() {
  const s = slider('l3HRT');
  s.addEventListener('input', () => {
    ring.t = +s.value;
    el('l3HRTVal').textContent = `${ring.t} °C`;
    ringReadouts();
  });
  el('l3HRSlide').addEventListener('click', () => { ring.slide = true; });
  el('l3HRRst').addEventListener('click', () => { ring.slide = false; });
  ringReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   registry + boot
   ══════════════════════════════════════════════════════════════════════ */

function mount(inst: p5 | null, sk: (p: p5) => void, holderId: string): p5 {
  if (inst) { inst.windowResized?.(); return inst; }
  return new p5(sk, el(holderId));
}

let geoPane = 'l3CA', holePane = 'l3HA';

function geoMount() {
  if (geoPane === 'l3CA') sqInst = mount(sqInst, sqSketch, 'l3SqCanvas');
  else cuInst = mount(cuInst, cuSketch, 'l3CuCanvas');
}
function holeMount() {
  if (holePane === 'l3HA') holeInst = mount(holeInst, holeSketch, 'l3HoleCanvas');
  else ringInst = mount(ringInst, ringSketch, 'l3RingCanvas');
}

(window as any).SCREEN_INIT = {
  why: () => { whyInst = mount(whyInst, whySketch, 'l3WhyCanvas'); },
  rod: () => { rodInst = mount(rodInst, rodSketch, 'l3RodCanvas'); },
  cube: geoMount,
  metals: () => { metInst = mount(metInst, metSketch, 'l3MetCanvas'); },
  hole: holeMount,
};

whyWire();
rodWire();
geoWire();
metWire();
holeWire();
ringWire();
wireTabs('l3CTabs', (id) => { geoPane = id; geoMount(); });
wireTabs('l3HTabs', (id) => { holePane = id; holeMount(); });
