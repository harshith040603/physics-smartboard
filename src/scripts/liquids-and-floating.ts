/* ═══════════ Thermometry Studio · Liquids and Floating ═══════════
   Animation-only lecture. Five screens on window.SCREEN_INIT:

     density - fixed mass, growing volume: the density bar falls, and the
               binomial shortcut is compared against the exact answer live
     water   - the anomaly. Pane 1 traces the real 0-20 °C density curve
               with a "pretend it is normal" ghost; pane 2 freezes a lake
               with NO script: twelve water layers cool from the top and
               sort themselves by density, so the convection, the stall at
               4 °C, the ice lid and the 4 °C bottom all emerge on their own
     flask   - real vs apparent expansion, with the γ_glass = 3α trap
     weigh   - a submerged block on a spring balance: swelling solid vs
               thinning liquid, and the scale shows who is winning
     float   - the immersed fraction f = ρ_s/ρ_l heated both ways, plus
               wood floating on 0-10 °C water riding highest at 4 °C

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

/* ───────── water: density in kg/m³ for 0-30 °C ─────────
   One quadratic pinned at the 4 °C maximum reproduces the table to
   ~0.05 kg/m³ across 0-10 °C, which is all this lecture needs:
     ρ(0) = 999.85, ρ(4) = 999.97, ρ(10) = 999.70                    */
const rhoWater = (T: number) => 999.97 - 0.0075 * (T - 4) ** 2;
/* the same liquid if it had no anomaly: γ ≈ 2.1e-4 through ρ(20) */
const rhoNormal = (T: number) => 999.85 * (1 - 2.1e-4 * T);

/* colour for water by temperature: darker = denser, ice-pale at 0 */
function waterRGB(T: number): [number, number, number] {
  const t = Math.max(0, Math.min(1, T / 10));
  /* 0 °C pale ice-blue → 4 °C deep navy-blue → 10 °C teal */
  const stops: Array<[number, [number, number, number]]> = [
    [0, [173, 216, 240]],
    [0.4, [23, 74, 148]],
    [1, [46, 150, 170]],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const f = (t - t0) / (t1 - t0);
      return [0, 1, 2].map((k) => c0[k] + f * (c1[k] - c0[k])) as [number, number, number];
    }
  }
  return stops[stops.length - 1][1];
}

/* ══════════════════════════════════════════════════════════════════════
   1 · HEAT IT, DENSITY FALLS
   A block whose atoms spread out; three bars for m, V and ρ; and the
   binomial shortcut checked against the exact 1/(1+γΔT) live.
   ══════════════════════════════════════════════════════════════════════ */

const DEN = {
  metal: { name: 'a metal', g: 6.0e-5, rho0: 8000, col: '#5a6a80' },
  liquid: { name: 'a liquid', g: 5.0e-4, rho0: 1200, col: '#2e96aa' },
};
const den = { mat: 'metal' as keyof typeof DEN, dT: 100, shown: 100 };

function denReadouts() {
  const M = DEN[den.mat];
  const exact = M.rho0 / (1 + M.g * den.dT);
  const approx = M.rho0 * (1 - M.g * den.dT);
  el('l5DM').textContent = '1.000 kg - fixed';
  el('l5DV').textContent = `+${fmt(M.g * den.dT * 100, 2)} %`;
  el('l5DRho').textContent = `${fmt(exact, 1)} kg/m³`;
  el('l5DCmp').textContent = `off by ${fmt(Math.abs(exact - approx), 2)} kg/m³`;
  katex.render(
    String.raw`\rho'=\dfrac{\rho}{1+\gamma\Delta T}\;\approx\;\rho(1-\gamma\Delta T)
      =${M.rho0}\bigl(1-${fmt(M.g * 1e5, 0)}\times10^{-5}\times${fmt(den.dT, 0)}\bigr)
      =\mathbf{${fmt(approx, 1)}}\ \mathrm{kg/m^3}`,
    el('l5DWork'), KO
  );
}

const denSketch = (p: p5) => {
  const holder = el('l5DenCanvas');
  const canvasH = () => Math.max(400, Math.min(500, Math.round(holder.clientWidth * 0.36)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    den.shown = ease(den.shown, den.dT, 4, dt(p));
    p.textFont('DM Sans');

    const M = DEN[den.mat];
    /* the real growth is invisible - exaggerate it, and say so */
    const MAG = den.mat === 'metal' ? 18 : 2.2;
    const f = 1 + M.g * den.shown * MAG;         // linear factor per side ~ cube root
    const side0 = Math.min(p.height - 190, p.width * 0.24);
    const side = side0 * Math.cbrt(f);

    const cx = p.width * 0.24, cy = p.height * 0.46;

    /* the cold outline */
    p.stroke(41, 89, 144, 90);
    p.strokeWeight(1.8);
    dashed(p, true, [6, 5]);
    p.noFill();
    p.rect(cx - side0 / 2, cy - side0 / 2, side0, side0, 8);
    dashed(p, false);

    /* the block, warm tinted */
    const warm = den.shown / 300;
    p.noStroke();
    p.fill(90 + 130 * warm, 106 - 20 * warm, 128 - 40 * warm, 200);
    p.rect(cx - side / 2, cy - side / 2, side, side, 8);
    p.stroke(C.navy);
    p.strokeWeight(2.4);
    p.noFill();
    p.rect(cx - side / 2, cy - side / 2, side, side, 8);

    /* the SAME 16 atoms, just further apart */
    p.noStroke();
    p.fill(255, 255, 255, 220);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const gx = cx + ((i - 1.5) / 3.6) * side;
        const gy = cy + ((j - 1.5) / 3.6) * side;
        p.circle(gx + 2.4 * Math.sin(p.frameCount * 0.09 + i * 2 + j), 
          gy + 2.4 * Math.cos(p.frameCount * 0.11 + j * 2 + i), 9);
      }
    }
    chip(p, 'the same 16 atoms - none left, none arrived', cx, cy + side / 2 + 16, 'center', 13.5, C.navy);
    chip(p, `growth exaggerated ${MAG}× to be visible`, 18, p.height - 32, 'left', 12.5, C.grey);

    /* ── the three bars ── */
    const bx = p.width * 0.52, bw = p.width * 0.4, rowH = 66;
    const rows: Array<[string, number, string, string]> = [
      ['MASS', 1, C.dark, 'never changes'],
      ['VOLUME', 1 + M.g * den.shown, C.amber, `V(1 + γΔT)`],
      ['DENSITY', 1 / (1 + M.g * den.shown), C.accent, `ρ / (1 + γΔT)`],
    ];
    rows.forEach(([nm, v, col, note], i) => {
      const y = 76 + i * (rowH + 22);
      p.noStroke();
      p.fill(C.dark);
      p.textSize(12.5);
      p.textAlign(p.LEFT, p.BOTTOM);
      p.text(nm, bx, y - 6);
      p.fill(41, 89, 144, 18);
      p.rect(bx, y, bw, 26, 13);
      /* the bar, with the deviation from 1 exaggerated so it reads */
      const shownV = 1 + (v - 1) * (den.mat === 'metal' ? 30 : 4);
      p.fill(col);
      p.rect(bx, y, bw * 0.62 * Math.max(0.05, shownV), 26, 13);
      /* the cold mark */
      p.stroke(C.navy);
      p.strokeWeight(2);
      p.line(bx + bw * 0.62, y - 5, bx + bw * 0.62, y + 31);
      p.noStroke();
      p.fill(C.navy);
      p.textSize(13.5);
      p.textAlign(p.LEFT, p.TOP);
      const pct = (v - 1) * 100;
      p.text(`${note}   ${pct >= 0 ? '+' : ''}${fmt(pct, 2)} %`, bx, y + 32);
    });
    chip(p, 'bar changes exaggerated - the % labels are the real numbers',
      bx, p.height - 32, 'left', 12.5, C.grey);
  };
};

let denInst: p5 | null = null;

function denWire() {
  wireSegmented('l5DMat', 'mat', (k) => { den.mat = k as keyof typeof DEN; denReadouts(); });
  const s = slider('l5DT');
  s.addEventListener('input', () => {
    den.dT = +s.value;
    el('l5DTVal').textContent = `+${den.dT} °C`;
    denReadouts();
  });
  denReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   2a · THE STRANGE CURVE
   The real density of water against temperature, a marker you drag, a
   beaker whose level tracks the volume, and a ghost of how a normal
   liquid would behave.
   ══════════════════════════════════════════════════════════════════════ */

const wcv = { T: 10, shown: 10, norm: false, normA: 0 };

function wcvReadouts() {
  const rho = rhoWater(wcv.T);
  el('l5WRho').textContent = `${fmt(rho, 2)} kg/m³`;
  el('l5WVol').textContent = `${fmt(1e6 / rho, 1)} cm³`;
  const n = el('l5WNote');
  if (wcv.T < 3.8) { n.textContent = 'contracting as it WARMS'; n.style.color = C.red; }
  else if (wcv.T <= 4.2) { n.textContent = 'at maximum density'; n.style.color = C.green; }
  else { n.textContent = 'expanding normally'; n.style.color = C.accent; }
}

const wcvSketch = (p: p5) => {
  const holder = el('l5CurveCanvas');
  const canvasH = () => Math.max(430, Math.min(540, Math.round(holder.clientWidth * 0.42)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    wcv.shown = ease(wcv.shown, wcv.T, 5, d);
    wcv.normA = ease(wcv.normA, wcv.norm ? 1 : 0, 5, d);
    p.textFont('DM Sans');

    /* ── the beaker on the left, level tracking volume (exaggerated) ── */
    const bkX = 96, bkW = Math.min(p.width * 0.16, 150);
    const bkT = 84, bkB = p.height - 96;
    const rho = wcv.norm ? rhoNormal(wcv.shown) : rhoWater(wcv.shown);
    /* volume of a fixed mass, exaggerated ~600× about the 4 °C minimum */
    const vRel = (999.97 / rho - 1) * 600;
    const lvl = bkB - (bkB - bkT) * (0.55 + Math.max(-0.4, Math.min(0.4, vRel)));

    const [wr, wg, wb] = waterRGB(wcv.shown);
    p.noStroke();
    p.fill(wr, wg, wb, 190);
    p.rect(bkX - bkW / 2, lvl, bkW, bkB - lvl, 0, 0, 10, 10);
    p.stroke(C.navy);
    p.strokeWeight(2.6);
    p.noFill();
    p.line(bkX - bkW / 2, bkT - 10, bkX - bkW / 2, bkB);
    p.line(bkX + bkW / 2, bkT - 10, bkX + bkW / 2, bkB);
    p.line(bkX - bkW / 2, bkB, bkX + bkW / 2, bkB);
    /* the 4 °C minimum level, marked */
    const lvl4 = bkB - (bkB - bkT) * 0.55;
    p.stroke(C.green);
    p.strokeWeight(2);
    dashed(p, true, [5, 4]);
    p.line(bkX - bkW / 2 - 12, lvl4, bkX + bkW / 2 + 12, lvl4);
    dashed(p, false);
    chip(p, 'lowest level = 4 °C', bkX, lvl4 + 8, 'center', 12, C.green);
    chip(p, `1 kg of water at ${fmt(wcv.shown, 1)} °C`, bkX, bkB + 14, 'center', 13.5, C.navy);
    chip(p, 'level change exaggerated 600×', bkX, bkT - 40, 'center', 12, C.grey);

    /* ── the curve ── */
    const gx = p.width * 0.32, gw = p.width - gx - 56, gy = 66, gh = p.height - 156;
    const TA = 0, TB = 20, RA = 999.55, RB = 1000.05;
    const X = (T: number) => gx + ((T - TA) / (TB - TA)) * gw;
    const Y = (r: number) => gy + gh - ((r - RA) / (RB - RA)) * gh;

    p.noStroke();
    p.fill(255);
    p.rect(gx - 50, gy - 26, gw + 76, gh + 76, 14);

    p.stroke(41, 89, 144, 24);
    p.strokeWeight(1);
    for (let T = 0; T <= 20; T += 2) p.line(X(T), gy, X(T), gy + gh);
    for (let r = 999.6; r <= 1000; r += 0.1) p.line(gx, Y(r), gx + gw, Y(r));

    p.stroke(C.navy);
    p.strokeWeight(2.2);
    p.line(gx, gy + gh, gx + gw, gy + gh);
    p.line(gx, gy, gx, gy + gh);
    p.noStroke();
    p.fill(C.dark);
    p.textSize(12);
    p.textAlign(p.CENTER, p.TOP);
    for (let T = 0; T <= 20; T += 4) p.text(`${T}`, X(T), gy + gh + 6);
    p.text('temperature (°C)', gx + gw / 2, gy + gh + 26);
    p.textAlign(p.RIGHT, p.CENTER);
    for (let r = 999.6; r <= 1000; r += 0.1) p.text(fmt(r, 1), gx - 7, Y(r));
    p.push();
    p.translate(gx - 44, gy - 8);
    p.rotate(0);
    p.textAlign(p.LEFT, p.BOTTOM);
    p.text('density (kg/m³)', 0, 0);
    p.pop();

    /* the anomalous zone, tinted */
    p.noStroke();
    p.fill(225, 29, 72, 16);
    p.rect(X(0), gy, X(4) - X(0), gh);
    chip(p, 'the anomaly\n0 → 4 °C', X(2), gy + 8, 'center', 12.5, C.red);

    /* both curves, clipped to the plot window */
    const curve = (f: (T: number) => number) => {
      p.beginShape();
      for (let T = 0; T <= 20; T += 0.25) {
        const r = f(T);
        if (r < RA) break;
        p.vertex(X(T), Y(r));
      }
      p.endShape();
    };
    p.stroke(120, 137, 160, 200);
    p.strokeWeight(wcv.normA > 0.5 ? 3.4 : 2);
    dashed(p, true, [7, 6]);
    p.noFill();
    curve(rhoNormal);
    dashed(p, false);
    chip(p, 'a normal liquid\nfalls straight through', X(1.6), Y(999.62), 'left', 12.5, C.grey);

    p.stroke(C.accent);
    p.strokeWeight(4);
    p.noFill();
    curve(rhoWater);

    /* the maximum */
    p.noStroke();
    p.fill(22, 163, 74, 60);
    p.circle(X(4), Y(rhoWater(4)), 26 + 6 * Math.sin(p.frameCount * 0.1));
    p.fill(C.green);
    p.circle(X(4), Y(rhoWater(4)), 11);
    chip(p, 'densest here\n4 °C', X(4) + 14, Y(rhoWater(4)) - 44, 'left', 13, C.green);

    /* the live point */
    const liveRho = Math.max(RA, wcv.norm ? rhoNormal(wcv.shown) : rhoWater(wcv.shown));
    const lx = X(wcv.shown), ly = Y(liveRho);
    p.stroke(C.navy);
    p.strokeWeight(1.6);
    dashed(p, true, [4, 4]);
    p.line(lx, gy + gh, lx, ly);
    p.line(gx, ly, lx, ly);
    dashed(p, false);
    p.noStroke();
    p.fill(C.navy);
    p.circle(lx, ly, 16);
    p.fill(wcv.norm ? C.grey : C.amber);
    p.circle(lx, ly, 9);

    chip(p, wcv.norm
      ? 'Pretending: on the dashed line, warmer is ALWAYS lighter. No maximum anywhere.'
      : wcv.shown < 4
        ? 'Below 4 °C: warming this water makes it DENSER. Almost nothing else on Earth does this.'
        : 'Above 4 °C water behaves itself: warmer, lighter.',
      gx - 40, 16, 'left', 14.5, wcv.norm ? C.grey : C.navy);
  };
};

let wcvInst: p5 | null = null;

function wcvWire() {
  const s = slider('l5WT');
  s.addEventListener('input', () => {
    wcv.T = +s.value;
    el('l5WTVal').textContent = `${fmt(wcv.T, 1)} °C`;
    wcvReadouts();
  });
  const b = el('l5WNorm') as HTMLButtonElement;
  b.addEventListener('click', () => {
    wcv.norm = !wcv.norm;
    b.classList.toggle('on', wcv.norm);
    b.textContent = wcv.norm ? '⇄ Back to real water' : '⇄ Pretend water were normal';
  });
  wcvReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   2b · WHY LAKES FREEZE FROM THE TOP
   Deliberately unscripted. Twelve layers of water each carry a
   temperature. Each tick:

     1. the surface layer exchanges heat with the air (through the ice,
        once there is ice - divided by (1 + 8·ice) so the lid insulates);
     2. a little diffusion between neighbours;
     3. any layer DENSER than the one below it swaps down (convection) -
        and density comes from the real rhoWater() curve.

   That third rule is the whole lesson: while the surface is above 4 °C
   it sinks as it cools and the lake stirs; below 4 °C it floats, the
   stirring dies, the top reaches 0 °C first and freezes, and the bottom
   sits at 4 °C for the rest of winter. Nothing else is imposed.
   ══════════════════════════════════════════════════════════════════════ */

const NL = 12;
const LAKE_PHASES: Array<[string, string, string]> = [
  ['1 · autumn', 'surface cools, sinks - the lake stirs itself', C.accent],
  ['2 · all at 4 °C', 'the whole lake reaches maximum density', C.green],
  ['3 · convection stops', 'colder water now FLOATS - the anomaly', C.violet],
  ['4 · the top freezes', 'ice forms, and insulates the water below', C.red],
];

const lake = {
  T: [] as number[], air: -10, ice: 0,
  run: false, nudge: 0, phase: 0,
  swapGlow: [] as number[],           // per-boundary, fades after a swap
  months: 0,
};

function lakeReset() {
  lake.T = Array.from({ length: NL }, () => 10);
  lake.ice = 0;
  lake.swapGlow = Array.from({ length: NL - 1 }, () => 0);
  lake.phase = 0;
  lake.months = 0;
}
lakeReset();

function lakeStep(d: number) {
  const k = d * 0.55;                                   // overall pace
  /* 1 · surface ↔ air, throttled by the ice lid */
  const insul = 1 + 8 * lake.ice;
  if (lake.ice > 0) {
    /* with a lid, the air acts on the ice; water under it sits near 0 */
    lake.T[0] += (0 - lake.T[0]) * k * 1.2;
    if (lake.air < 0) lake.ice = Math.min(1, lake.ice + (-lake.air) * k * 0.010 / insul);
    else lake.ice = Math.max(0, lake.ice - lake.air * k * 0.02);
  } else {
    lake.T[0] += (lake.air - lake.T[0]) * k * 0.5;
    if (lake.T[0] <= 0) { lake.T[0] = 0; lake.ice = 0.02; }
  }
  /* 2 · gentle diffusion */
  for (let i = 0; i < NL - 1; i++) {
    const flow = (lake.T[i] - lake.T[i + 1]) * k * 0.06;
    lake.T[i] -= flow;
    lake.T[i + 1] += flow;
  }
  /* 3 · buoyancy: denser water sinks below lighter water */
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < NL - 1; i++) {
      if (rhoWater(lake.T[i]) > rhoWater(lake.T[i + 1]) + 1e-4) {
        const t = lake.T[i];
        lake.T[i] = lake.T[i + 1];
        lake.T[i + 1] = t;
        lake.swapGlow[i] = 1;
      }
    }
  }
  lake.swapGlow = lake.swapGlow.map((g) => Math.max(0, g - d * 1.4));
  lake.months += d * 0.25;

  /* which phase are we watching? */
  const stirring = lake.swapGlow.some((g) => g > 0.4);
  const maxT = Math.max(...lake.T);
  if (lake.ice > 0.005) lake.phase = 3;
  else if (lake.T[0] < 3.6 && maxT <= 4.6) lake.phase = 2;
  else if (maxT <= 4.6 && !stirring) lake.phase = 1;
  else lake.phase = 0;
}

function lakeReadouts() {
  el('l5LSurf').textContent = lake.ice > 0.005
    ? `0.0 °C (under ice)` : `${fmt(lake.T[0], 1)} °C`;
  el('l5LBot').textContent = `${fmt(lake.T[NL - 1], 1)} °C`;
  el('l5LIce').textContent = lake.ice > 0.005 ? `${fmt(lake.ice * 60, 0)} cm` : 'none yet';
  const ph = el('l5LPhase');
  ph.textContent = LAKE_PHASES[lake.phase][0];
  ph.style.color = LAKE_PHASES[lake.phase][2];
}

const lakeSketch = (p: p5) => {
  const holder = el('l5LakeCanvas');
  const canvasH = () => Math.max(460, Math.min(560, Math.round(holder.clientWidth * 0.44)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    let step = 0;
    if (lake.run) step = d;
    else if (lake.nudge > 0) { step = Math.min(d, lake.nudge); lake.nudge -= step; }
    if (step > 0) lakeStep(step);
    lakeReadouts();
    p.textFont('DM Sans');

    /* ── the lake cross-section ── */
    const lx = 60, lw = Math.min(p.width * 0.5, 520);
    const skyT = 40, waterT = 118, waterB = p.height - 96;
    const layerH = (waterB - waterT) / NL;

    /* sky */
    const cold = Math.max(0, Math.min(1, -lake.air / 15));
    p.noStroke();
    p.fill(200 - 40 * cold, 220 - 30 * cold, 240, 255);
    p.rect(lx, skyT, lw, waterT - skyT);
    p.fill(C.navy);
    p.textSize(14);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`air  ${lake.air} °C`, lx + 12, skyT + 10);
    if (lake.air < 0) {
      /* a little snow */
      p.fill(255);
      for (let i = 0; i < 14; i++) {
        const sx = lx + ((i * 83 + p.frameCount * (0.4 + (i % 3) * 0.3)) % lw);
        const sy = skyT + ((i * 47 + p.frameCount * (0.5 + (i % 4) * 0.25)) % (waterT - skyT));
        p.circle(sx, sy, 3.5);
      }
    }

    /* ice lid */
    const iceH = lake.ice * 46;
    if (iceH > 1) {
      p.noStroke();
      p.fill(226, 240, 250);
      p.rect(lx, waterT, lw, iceH);
      p.stroke(148, 190, 220);
      p.strokeWeight(1.4);
      for (let k = 1; k < 4; k++) {
        p.line(lx + (lw * k) / 4 + 8 * Math.sin(k * 3), waterT + 2, lx + (lw * k) / 4 - 8, waterT + iceH - 2);
      }
      p.noStroke();
      chip(p, `ICE  ·  ${fmt(lake.ice * 60, 0)} cm`, lx + lw / 2, waterT + iceH / 2 - 9, 'center', 13, C.dark);
    }

    /* water layers, coloured by the real density curve */
    for (let i = 0; i < NL; i++) {
      const y = waterT + iceH + ((waterB - waterT - iceH) * i) / NL;
      const h = (waterB - waterT - iceH) / NL + 1;
      const [r, g, b] = waterRGB(lake.T[i]);
      p.noStroke();
      p.fill(r, g, b);
      p.rect(lx, y, lw, h);
    }

    /* convection arrows where swaps just happened */
    lake.swapGlow.forEach((g, i) => {
      if (g <= 0.03 || lake.ice > 0.005) return;
      const y = waterT + iceH + ((waterB - waterT - iceH) * (i + 1)) / NL;
      const ax = lx + lw * (0.22 + 0.5 * ((i * 37) % 10) / 10);
      p.stroke(255, 255, 255, 220 * g);
      p.strokeWeight(3);
      arrow(p, ax, y - 14, ax, y + 14, 8);           // dense water down
      arrow(p, ax + 40, y + 14, ax + 40, y - 14, 8); // lighter water up
    });
    if (lake.phase === 0 && lake.swapGlow.some((g) => g > 0.2)) {
      chip(p, 'denser water sinking - the lake is stirring', lx + lw / 2, waterT + iceH + 10, 'center', 13, C.navy);
    }
    if (lake.phase >= 2 && lake.ice <= 0.005) {
      chip(p, 'cold water FLOATING on 4 °C water - nothing sinks any more',
        lx + lw / 2, waterT + iceH + 10, 'center', 12.5, C.navy);
    }

    /* the fish, safe at the bottom */
    const fy = waterB - layerH * 0.9;
    const fx = lx + lw * 0.5 + 34 * Math.sin(p.frameCount * 0.014);
    const dir = Math.cos(p.frameCount * 0.014) >= 0 ? 1 : -1;
    p.noStroke();
    p.fill(255, 214, 140);
    p.push();
    p.translate(fx, fy);
    p.scale(dir, 1);
    p.ellipse(0, 0, 30, 13);
    p.triangle(-14, 0, -24, -7, -24, 7);
    p.fill(C.navy);
    p.circle(8, -2, 3);
    p.pop();
    if (lake.phase === 3) {
      chip(p, `alive at ${fmt(lake.T[NL - 1], 1)} °C, under the ice`, fx, fy - 34, 'center', 12.5, C.navy);
    }

    /* lake bed */
    p.noStroke();
    p.fill(120, 96, 60);
    p.rect(lx, waterB, lw, 18);
    p.stroke(C.navy);
    p.strokeWeight(2.2);
    p.noFill();
    p.rect(lx, skyT, lw, waterB + 18 - skyT, 4);

    /* ── temperature-with-depth profile ── */
    const gx = lx + lw + 90, gw = p.width - gx - 46;
    if (gw > 150) {
      const gy = waterT, gh = waterB - waterT;
      p.noStroke();
      p.fill(255);
      p.rect(gx - 44, gy - 40, gw + 66, gh + 76, 14);
      const X = (T: number) => gx + ((T + 2) / 14) * gw;
      p.stroke(41, 89, 144, 24);
      p.strokeWeight(1);
      for (let T = 0; T <= 12; T += 2) p.line(X(T), gy, X(T), gy + gh);
      p.stroke(C.navy);
      p.strokeWeight(2);
      p.line(gx, gy, gx + gw, gy);
      p.line(X(0), gy, X(0), gy + gh);
      p.noStroke();
      p.fill(C.dark);
      p.textSize(12);
      p.textAlign(p.CENTER, p.BOTTOM);
      for (let T = 0; T <= 12; T += 4) p.text(`${T}°`, X(T), gy - 6);
      p.textAlign(p.LEFT, p.BOTTOM);
      p.text('depth ↓  ·  temperature →', gx - 30, gy - 24);

      /* the 4 °C line */
      p.stroke(C.green);
      p.strokeWeight(2);
      dashed(p, true, [5, 4]);
      p.line(X(4), gy, X(4), gy + gh);
      dashed(p, false);
      p.noStroke();
      p.fill(C.green);
      p.textSize(12);
      p.textAlign(p.CENTER, p.TOP);
      p.text('4 °C', X(4), gy + gh + 4);

      /* the profile itself */
      p.stroke(C.red);
      p.strokeWeight(3);
      p.noFill();
      p.beginShape();
      lake.T.forEach((T, i) => {
        p.vertex(X(T), gy + (gh * (i + 0.5)) / NL);
      });
      p.endShape();
      lake.T.forEach((T, i) => {
        p.noStroke();
        p.fill(C.red);
        p.circle(X(T), gy + (gh * (i + 0.5)) / NL, 7);
      });
    }

    /* ── the four phases, live one lit ── */
    const py = p.height - 66;
    LAKE_PHASES.forEach(([title, sub, col], i) => {
      const live = i === lake.phase;
      const xx = lx + i * ((p.width - lx - 40) / 4);
      p.noStroke();
      p.fill(live ? p.color(col) : p.color(41, 89, 144, 16));
      p.rect(xx, py, live ? 8 : 4, 40, 2);
      p.fill(live ? p.color(col) : p.color(120, 137, 160));
      p.textSize(live ? 13.5 : 12);
      p.textAlign(p.LEFT, p.TOP);
      p.text(title, xx + 14, py);
      p.textSize(live ? 12 : 11);
      p.text(sub, xx + 14, py + 20, (p.width - lx - 40) / 4 - 24, 30);
    });
  };
};

let lakeInst: p5 | null = null;

function lakeWire() {
  const s = slider('l5LAir');
  s.addEventListener('input', () => {
    lake.air = +s.value;
    el('l5LAirVal').textContent = `${lake.air >= 0 ? '+' : '−'}${Math.abs(lake.air)} °C`;
  });
  const run = el('l5LRun') as HTMLButtonElement;
  run.addEventListener('click', () => {
    lake.run = !lake.run;
    run.textContent = lake.run ? '⏸ Pause' : '▶ Start the winter';
    run.classList.toggle('primary', !lake.run);
  });
  el('l5LStep').addEventListener('click', () => { lake.nudge += 1.5; });
  el('l5LRst').addEventListener('click', () => {
    lake.run = false;
    run.textContent = '▶ Start the winter';
    run.classList.add('primary');
    lakeReset();
    lakeReadouts();
  });
  lakeReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   3 · THE OVERFLOWING FLASK
   Real expansion vs apparent expansion. The flask is drawn at fixed size;
   the liquid column and the spill carry the (exaggerated) difference.
   ══════════════════════════════════════════════════════════════════════ */

const FLQ = {
  hg: { name: 'Mercury', g: 1.82e-4, col: '#8a94a6' },
  gly: { name: 'Glycerine', g: 4.9e-4, col: '#b8860b' },
};
const A_GLASS = 8.3e-6, G_GLASS = 3 * A_GLASS;
const flask = { liq: 'hg' as keyof typeof FLQ, T: 50, shown: 50, drops: [] as Array<{ y: number; v: number }> };

function flaskReadouts() {
  const L = FLQ[flask.liq];
  const dLiq = L.g * flask.T;                 // fraction of 1 L
  const dGl = G_GLASS * flask.T;
  const over = Math.max(0, dLiq - dGl);
  el('l5FHg').textContent = `+${fmt(dLiq * 1000, 2)} mL`;
  el('l5FGl').textContent = `+${fmt(dGl * 1000, 2)} mL`;
  el('l5FOver').textContent = `${fmt(over * 1000, 2)} mL`;
  katex.render(
    String.raw`V_{\text{over}}=V(\gamma_{\text{liq}}-\underbrace{3\alpha_{\text{glass}}}_{\gamma_{\text{glass}}})\Delta T
      =1\,\mathrm{L}\,(${fmt(L.g * 1e4, 2)}-${fmt(G_GLASS * 1e4, 3)})\times10^{-4}\times${fmt(flask.T, 0)}
      =\mathbf{${fmt(over * 1000, 2)}}\ \mathrm{mL}`,
    el('l5FWork'), KO
  );
}

const flaskSketch = (p: p5) => {
  const holder = el('l5FlaskCanvas');
  const canvasH = () => Math.max(430, Math.min(540, Math.round(holder.clientWidth * 0.4)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    flask.shown = ease(flask.shown, flask.T, 4, d);
    p.textFont('DM Sans');

    const L = FLQ[flask.liq];
    const MAG = 26;
    const dLiq = L.g * flask.shown * MAG;
    const dGl = G_GLASS * flask.shown * MAG;
    const over = Math.max(0, dLiq - dGl);

    /* ── the flask: a bulb with a neck, brim-full at 0 °C ── */
    const cx = p.width * 0.3;
    const bulbR = Math.min(p.height * 0.21, 118);
    const bulbY = p.height - bulbR - 66;
    const neckW = 34, neckTop = 66;
    const brimY = neckTop + 26;

    /* how full the neck is: it spills once the liquid beats the glass */
    const liqTop = brimY - 0;                          // always at the brim
    const spilling = over > 0.0004 && flask.shown > 1;

    /* glass grows a little too - draw its warm outline */
    const gf = 1 + dGl;
    p.stroke(41, 89, 144, 70);
    p.strokeWeight(1.6);
    dashed(p, true, [5, 4]);
    p.noFill();
    p.circle(cx, bulbY, bulbR * 2 * gf);
    dashed(p, false);

    /* liquid: bulb + neck column */
    p.noStroke();
    p.fill(p.color(L.col));
    p.circle(cx, bulbY, bulbR * 2 - 10);
    p.rect(cx - neckW / 2 + 5, liqTop, neckW - 10, bulbY - liqTop, 3);

    /* glass outline */
    p.stroke(C.navy);
    p.strokeWeight(2.6);
    p.noFill();
    p.circle(cx, bulbY, bulbR * 2);
    p.line(cx - neckW / 2, neckTop, cx - neckW / 2, bulbY - bulbR + 12);
    p.line(cx + neckW / 2, neckTop, cx + neckW / 2, bulbY - bulbR + 12);

    /* the spill */
    if (spilling) {
      if (p.frameCount % 5 === 0) flask.drops.push({ y: brimY, v: 60 });
      p.noStroke();
      p.fill(p.color(L.col));
      for (let i = flask.drops.length - 1; i >= 0; i--) {
        const q = flask.drops[i];
        q.v += 300 * d;
        q.y += q.v * d;
        p.ellipse(cx + neckW / 2 + 18, q.y, 8, 12);
        if (q.y > p.height - 60) flask.drops.splice(i, 1);
      }
      /* the puddle: the overflow so far */
      p.ellipse(cx + neckW / 2 + 34, p.height - 52, 60 + over * 260, 12);
      chip(p, `overflow = what you can SEE\n${fmt(Math.max(0, (L.g - G_GLASS) * flask.shown) * 1000, 2)} mL`,
        cx + neckW / 2 + 40, brimY + 30, 'left', 13.5, C.red);
    } else {
      flask.drops = [];
    }
    chip(p, `brim-full with 1 L of ${FLQ[flask.liq].name.toLowerCase()} at 0 °C`,
      cx, p.height - 30, 'center', 13, C.navy);

    /* ── the two growths, raced side by side ── */
    const bx = p.width * 0.56, bw = p.width * 0.36;
    const rows: Array<[string, number, string]> = [
      [`${L.name} wants  V γ_liq ΔT`, L.g, p.color(L.col).toString()],
      ['Flask makes room  V (3α) ΔT', G_GLASS, '#5a6a80'],
    ];
    const gMax = FLQ.gly.g;
    rows.forEach(([nm, g, col], i) => {
      const y = 96 + i * 84;
      p.noStroke();
      p.fill(C.navy);
      p.textSize(13.5);
      p.textAlign(p.LEFT, p.BOTTOM);
      p.text(nm, bx, y - 8);
      p.fill(41, 89, 144, 18);
      p.rect(bx, y, bw, 24, 12);
      p.fill(col);
      p.rect(bx, y, bw * (g * flask.shown) / (gMax * 100), 24, 12);
      p.fill(C.dark);
      p.textSize(13);
      p.textAlign(p.LEFT, p.TOP);
      p.text(`+${fmt(g * flask.shown * 1000, 2)} mL`, bx, y + 28);
    });
    /* the difference bracket */
    const y1 = 96 + (FLQ[flask.liq].g * flask.shown) / (gMax * 100) * 0;
    p.noStroke();
    p.fill(C.red);
    p.textSize(14.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`spilled = difference = ${fmt(Math.max(0, (L.g - G_GLASS) * flask.shown) * 1000, 2)} mL`,
      bx, 96 + 84 + 52);
    p.fill(C.green);
    p.textSize(13.5);
    p.text('γ_glass = 3 × α_glass — the 3 people forget', bx, 96 + 84 + 78);

    chip(p, `both at ${fmt(flask.shown, 0)} °C  ·  expansions drawn ${MAG}× oversize`,
      18, 18, 'left', 12.5, C.grey);
  };
};

let flaskInst: p5 | null = null;

function flaskWire() {
  wireSegmented('l5FLiq', 'liq', (k) => { flask.liq = k as keyof typeof FLQ; flaskReadouts(); });
  const s = slider('l5FT');
  s.addEventListener('input', () => {
    flask.T = +s.value;
    el('l5FTVal').textContent = `${flask.T} °C`;
    flaskReadouts();
  });
  flaskReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   4 · LIGHTER UNDER WATER?
   Fully immersed block on a spring balance. F'/F = (1+γ_SΔT)/(1+γ_LΔT):
   the swelling solid displaces more, the thinning liquid pushes less.
   ══════════════════════════════════════════════════════════════════════ */

const wgh = { gS: 6e-5, gL: 50e-5, dT: 100, shown: 100 };
const W0 = 10;                                        // true weight, N
const F0 = 4;                                         // upthrust cold, N

function wghReadouts() {
  const r = (1 + wgh.gS * wgh.dT) / (1 + wgh.gL * wgh.dT);
  const F = F0 * r;
  el('l5GF').textContent = `${fmt(F, 3)} N  (was ${fmt(F0, 1)} N)`;
  el('l5GW').textContent = `${fmt(W0 - F, 3)} N`;
  const dir = el('l5GDir');
  if (Math.abs(r - 1) < 2e-4) { dir.textContent = 'reads the SAME'; dir.style.color = C.green; }
  else if (r > 1) { dir.textContent = 'feels LIGHTER'; dir.style.color = C.accent; }
  else { dir.textContent = 'feels HEAVIER'; dir.style.color = C.red; }
  katex.render(
    String.raw`\dfrac{F'}{F}=\dfrac{1+\gamma_S\,\Delta T}{1+\gamma_L\,\Delta T}
      =\dfrac{1+(${fmt(wgh.gS * 1e5, 0)})(${fmt(wgh.dT, 0)})\times10^{-5}}
             {1+(${fmt(wgh.gL * 1e5, 0)})(${fmt(wgh.dT, 0)})\times10^{-5}}
      =\mathbf{${fmt(r, 4)}}
      \;\Rightarrow\; \text{upthrust ${r > 1.0002 ? 'up' : r < 0.9998 ? 'down' : 'unchanged'}}`,
    el('l5GWork'), KO
  );
}

const wghSketch = (p: p5) => {
  const holder = el('l5WeighCanvas');
  const canvasH = () => Math.max(420, Math.min(520, Math.round(holder.clientWidth * 0.38)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    wgh.shown = ease(wgh.shown, wgh.dT, 4, dt(p));
    p.textFont('DM Sans');

    const r = (1 + wgh.gS * wgh.shown) / (1 + wgh.gL * wgh.shown);
    const F = F0 * r;
    const reading = W0 - F;

    /* ── tank + block + spring ── */
    const cx = p.width * 0.3;
    const tankW = Math.min(p.width * 0.34, 300), tankT = 150, tankB = p.height - 60;
    const warm = wgh.shown / 200;

    /* liquid, thinning = paler as it heats */
    p.noStroke();
    p.fill(46 + 60 * warm, 150 + 30 * warm, 190, 190 - 60 * warm);
    p.rect(cx - tankW / 2, tankT + 16, tankW, tankB - tankT - 16);
    p.stroke(C.navy);
    p.strokeWeight(2.6);
    p.noFill();
    p.line(cx - tankW / 2, tankT, cx - tankW / 2, tankB);
    p.line(cx + tankW / 2, tankT, cx + tankW / 2, tankB);
    p.line(cx - tankW / 2, tankB, cx + tankW / 2, tankB);

    /* the block, swelling with its own γ (exaggerated) */
    const MAG = 240;
    const bs = 76 * (1 + wgh.gS * wgh.shown * MAG / 3);
    const by = tankT + 120;
    p.noStroke();
    p.fill(120 + 100 * warm, 110, 120, 235);
    p.rect(cx - bs / 2, by - bs / 2, bs, bs, 8);
    p.stroke(C.navy);
    p.strokeWeight(2.4);
    p.noFill();
    p.rect(cx - bs / 2, by - bs / 2, bs, bs, 8);

    /* spring up to the balance */
    p.stroke(C.grey);
    p.strokeWeight(2.6);
    p.noFill();
    p.beginShape();
    for (let k = 0; k <= 30; k++) {
      const f = k / 30;
      p.vertex(cx + (k % 2 === 0 ? -8 : 8) * (k > 2 && k < 28 ? 1 : 0), 40 + f * (by - bs / 2 - 40));
    }
    p.endShape();

    /* upthrust + weight arrows */
    p.stroke(C.accent);
    p.strokeWeight(4);
    arrow(p, cx - bs / 2 - 20, by + 30, cx - bs / 2 - 20, by - 30 - F * 6, 10);
    chip(p, `upthrust ${fmt(F, 2)} N`, cx - bs / 2 - 34, by - 66 - F * 6, 'right', 13.5, C.accent);
    p.stroke(C.red);
    arrow(p, cx + bs / 2 + 20, by - 20, cx + bs / 2 + 20, by + 52, 10);
    chip(p, `weight ${W0} N`, cx + bs / 2 + 34, by + 34, 'left', 13.5, C.red);

    /* ── the dial ── */
    const dx = p.width * 0.72, dy = p.height * 0.42, dr = Math.min(110, p.height * 0.24);
    p.noStroke();
    p.fill(255);
    p.circle(dx, dy, dr * 2);
    p.stroke(C.navy);
    p.strokeWeight(3);
    p.noFill();
    p.circle(dx, dy, dr * 2);
    /* scale 5..7 N across 240° */
    const A = (v: number) => (-210 + ((v - 5) / 2) * 240) * Math.PI / 180;
    for (let v = 5; v <= 7.001; v += 0.25) {
      const a = A(v);
      const major = Math.abs(v % 0.5) < 1e-9;
      p.stroke(41, 89, 144, major ? 200 : 90);
      p.strokeWeight(major ? 2.2 : 1.2);
      p.line(dx + (dr - (major ? 16 : 9)) * Math.cos(a), dy + (dr - (major ? 16 : 9)) * Math.sin(a),
        dx + (dr - 3) * Math.cos(a), dy + (dr - 3) * Math.sin(a));
      if (major) {
        p.noStroke();
        p.fill(C.dark);
        p.textSize(11.5);
        p.textAlign(p.CENTER, p.CENTER);
        p.text(fmt(v, 1), dx + (dr - 30) * Math.cos(a), dy + (dr - 30) * Math.sin(a));
      }
    }
    /* the cold-reading mark */
    const a0 = A(W0 - F0);
    p.stroke(C.grey);
    p.strokeWeight(2.4);
    p.line(dx, dy, dx + (dr - 20) * Math.cos(a0), dy + (dr - 20) * Math.sin(a0));
    /* the needle */
    const an = A(Math.max(5, Math.min(7, reading)));
    p.stroke(C.red);
    p.strokeWeight(3.4);
    p.line(dx, dy, dx + (dr - 14) * Math.cos(an), dy + (dr - 14) * Math.sin(an));
    p.noStroke();
    p.fill(C.navy);
    p.circle(dx, dy, 12);
    chip(p, `reads ${fmt(reading, 3)} N`, dx, dy + dr + 14, 'center', 15,
      Math.abs(r - 1) < 2e-4 ? C.green : (r > 1 ? C.accent : C.red));
    chip(p, 'grey line = the cold reading', dx, dy + dr + 42, 'center', 12, C.grey);

    chip(p, `block swells ×${fmt(1 + wgh.gS * wgh.shown, 4)}   ·   liquid density falls ×${fmt(1 / (1 + wgh.gL * wgh.shown), 4)}`,
      20, 18, 'left', 14.5, C.navy);
    chip(p, `block growth drawn ${MAG}× oversize`, 20, p.height - 30, 'left', 12.5, C.grey);
  };
};

let wghInst: p5 | null = null;

function wghWire() {
  const sS = slider('l5GS'), sL = slider('l5GL'), sT = slider('l5GT');
  const upd = () => {
    el('l5GSVal').textContent = `${fmt(wgh.gS * 1e5, 0)} × 10⁻⁵`;
    el('l5GLVal').textContent = `${fmt(wgh.gL * 1e5, 0)} × 10⁻⁵`;
    el('l5GTVal').textContent = `+${wgh.dT} °C`;
    wghReadouts();
  };
  sS.addEventListener('input', () => { wgh.gS = +sS.value * 1e-5; upd(); });
  sL.addEventListener('input', () => { wgh.gL = +sL.value * 1e-5; upd(); });
  sT.addEventListener('input', () => { wgh.dT = +sT.value; upd(); });
  wireSegmented('l5GPre', 'pre', (k) => {
    if (k === 'solid') { wgh.gS = 40e-5; wgh.gL = 8e-5; }
    else if (k === 'liquid') { wgh.gS = 6e-5; wgh.gL = 50e-5; }
    else { wgh.gS = 20e-5; wgh.gL = 20e-5; }
    sS.value = String(Math.round(wgh.gS * 1e5));
    sL.value = String(Math.round(wgh.gL * 1e5));
    upd();
  });
  upd();
}

/* ══════════════════════════════════════════════════════════════════════
   5a · THE RACE OF THE GAMMAS
   A floating block: f = ρ_s/ρ_l, and after heating f' = f(1+γ_lΔT)/(1+γ_sΔT).
   The inequality points the OPPOSITE way to the apparent-weight screen.
   ══════════════════════════════════════════════════════════════════════ */

const flt = { gS: 6e-5, gL: 18e-5, dT: 100, shown: 100, f0: 0.62 };

function fltF1() {
  return flt.f0 * (1 + flt.gL * flt.dT) / (1 + flt.gS * flt.dT);
}

function fltReadouts() {
  const f1 = fltF1();
  el('l5FF0').textContent = `${fmt(flt.f0 * 100, 1)} %`;
  el('l5FF1').textContent = `${fmt(f1 * 100, 2)} %`;
  const d = el('l5FDir');
  if (Math.abs(f1 - flt.f0) < 1e-4) { d.textContent = 'floats exactly the same'; d.style.color = C.green; }
  else if (f1 > flt.f0) { d.textContent = 'sinks LOWER'; d.style.color = C.red; }
  else { d.textContent = 'rides HIGHER'; d.style.color = C.accent; }
  katex.render(
    String.raw`f'=f\,\dfrac{1+\gamma_l\,\Delta T}{1+\gamma_s\,\Delta T}
      =${fmt(flt.f0, 2)}\times\dfrac{1+(${fmt(flt.gL * 1e5, 0)})(${fmt(flt.dT, 0)})\times10^{-5}}
      {1+(${fmt(flt.gS * 1e5, 0)})(${fmt(flt.dT, 0)})\times10^{-5}}
      =\mathbf{${fmt(f1, 4)}}`,
    el('l5FAWork'), KO
  );
}

/* one reusable drawing: a block floating in a tank at fraction f under */
function drawFloat(
  p: p5, cx: number, tankW: number, surfY: number, tankB: number,
  f: number, warm: number, label: string, ghostF?: number
) {
  /* liquid */
  p.noStroke();
  p.fill(46 + 60 * warm, 150 + 30 * warm, 190, 190 - 50 * warm);
  p.rect(cx - tankW / 2, surfY, tankW, tankB - surfY);
  /* gentle surface */
  p.stroke(255, 255, 255, 130);
  p.strokeWeight(2);
  p.noFill();
  p.beginShape();
  for (let x = -tankW / 2; x <= tankW / 2; x += 8) {
    p.vertex(cx + x, surfY + 2.4 * Math.sin(x * 0.08 + p.frameCount * 0.05));
  }
  p.endShape();
  /* tank walls */
  p.stroke(C.navy);
  p.strokeWeight(2.6);
  p.line(cx - tankW / 2, surfY - 60, cx - tankW / 2, tankB);
  p.line(cx + tankW / 2, surfY - 60, cx + tankW / 2, tankB);
  p.line(cx - tankW / 2, tankB, cx + tankW / 2, tankB);

  /* the block: height H, fraction f below the surface */
  const H = (tankB - surfY) * 0.62, Wd = tankW * 0.44;
  const top = surfY - H * (1 - f);
  if (ghostF !== undefined) {
    p.stroke(41, 89, 144, 110);
    p.strokeWeight(1.8);
    dashed(p, true, [5, 4]);
    p.noFill();
    p.rect(cx - Wd / 2, surfY - H * (1 - ghostF), Wd, H, 6);
    dashed(p, false);
  }
  p.noStroke();
  p.fill(196, 154, 96);
  p.rect(cx - Wd / 2, top, Wd, H, 6);
  /* grain lines */
  p.stroke(150, 110, 60, 160);
  p.strokeWeight(1.4);
  for (let k = 1; k < 4; k++) p.line(cx - Wd / 2 + 6, top + (H * k) / 4, cx + Wd / 2 - 6, top + (H * k) / 4);
  p.stroke(C.navy);
  p.strokeWeight(2.2);
  p.noFill();
  p.rect(cx - Wd / 2, top, Wd, H, 6);

  /* the waterline across the block */
  p.stroke(C.red);
  p.strokeWeight(2.4);
  dashed(p, true, [4, 4]);
  p.line(cx - Wd / 2 - 14, surfY, cx + Wd / 2 + 14, surfY);
  dashed(p, false);

  p.noStroke();
  chip(p, `${fmt(f * 100, 1)} % under`, cx, surfY + 10, 'center', 13.5, C.navy);
  chip(p, label, cx, tankB + 12, 'center', 13.5, C.dark);
  return { top, H, Wd };
}

const fltSketch = (p: p5) => {
  const holder = el('l5FloatCanvas');
  const canvasH = () => Math.max(410, Math.min(500, Math.round(holder.clientWidth * 0.36)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    flt.shown = ease(flt.shown, flt.dT, 4, dt(p));
    p.textFont('DM Sans');

    const f1now = flt.f0 * (1 + flt.gL * flt.shown) / (1 + flt.gS * flt.shown);
    /* exaggerate the CHANGE in f so it is visible */
    const FMAG = 14;
    const fShown = Math.max(0.06, Math.min(0.97, flt.f0 + (f1now - flt.f0) * FMAG));

    const tankW = Math.min(p.width * 0.3, 270);
    const surfY = p.height * 0.42, tankB = p.height - 66;

    drawFloat(p, p.width * 0.24, tankW, surfY, tankB, flt.f0, 0, 'COLD  ·  f = ρ_s / ρ_l');
    drawFloat(p, p.width * 0.66, tankW, surfY, tankB, fShown, flt.shown / 200,
      `HOT  ·  +${fmt(flt.shown, 0)} °C`, flt.f0);

    const who = flt.gL > flt.gS ? 'the LIQUID is thinning faster - it supports less, so more block must go under'
      : flt.gL < flt.gS ? 'the SOLID is thinning faster - it needs less support, so it rides up'
        : 'both thin at the same rate - nothing moves';
    chip(p, who, p.width / 2, 18, 'center', 14.5, C.navy);
    chip(p, `the change in f is drawn ${FMAG}× oversize - the readouts carry the real numbers`,
      18, p.height - 30, 'left', 12.5, C.grey);
  };
};

let fltInst: p5 | null = null;

function fltWire() {
  const sS = slider('l5Fs'), sL = slider('l5Fl'), sT = slider('l5FdT');
  const upd = () => {
    el('l5FsVal').textContent = `${fmt(flt.gS * 1e5, 0)} × 10⁻⁵`;
    el('l5FlVal').textContent = `${fmt(flt.gL * 1e5, 0)} × 10⁻⁵`;
    el('l5FdTVal').textContent = `+${flt.dT} °C`;
    fltReadouts();
  };
  sS.addEventListener('input', () => { flt.gS = +sS.value * 1e-5; upd(); });
  sL.addEventListener('input', () => { flt.gL = +sL.value * 1e-5; upd(); });
  sT.addEventListener('input', () => { flt.dT = +sT.value; upd(); });
  upd();
}

/* ══════════════════════════════════════════════════════════════════════
   5b · WOOD ON 0-10 °C WATER
   f = ρ_wood / ρ_water(T): the fraction above water peaks at 4 °C, and
   the graph of it draws itself as the water warms.
   ══════════════════════════════════════════════════════════════════════ */

const RHO_WOOD = 600;
const wood = { T: 0, shown: 0, auto: false, trail: [] as Array<[number, number]> };

function woodReadouts() {
  const rho = rhoWater(wood.T);
  const above = 1 - RHO_WOOD / rho;
  el('l5FWRho').textContent = `${fmt(rho, 2)} kg/m³`;
  el('l5FWAb').textContent = `${fmt(above * 100, 4)} %`;
}

const woodSketch = (p: p5) => {
  const holder = el('l5WoodCanvas');
  const canvasH = () => Math.max(420, Math.min(520, Math.round(holder.clientWidth * 0.4)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    if (wood.auto) {
      wood.T = Math.min(10, wood.T + d * 1.1);
      slider('l5FWT').value = String(wood.T);
      el('l5FWTVal').textContent = `${fmt(wood.T, 1)} °C`;
      if (wood.T >= 10) wood.auto = false;
    }
    wood.shown = ease(wood.shown, wood.T, 6, d);
    woodReadouts();
    p.textFont('DM Sans');

    const rho = rhoWater(wood.shown);
    const above = 1 - RHO_WOOD / rho;                  // ~0.4000 ± 2e-4
    /* exaggerate the CHANGE about the 0 °C value */
    const above0 = 1 - RHO_WOOD / rhoWater(0);
    const AMAG = 900;
    const aShown = above0 + (above - above0) * AMAG;

    wood.trail.push([wood.shown, above]);
    if (wood.trail.length > 700) wood.trail.shift();

    /* ── the tank ── */
    const tankW = Math.min(p.width * 0.3, 280);
    const surfY = p.height * 0.44, tankB = p.height - 70;
    const cx = p.width * 0.22;
    const [wr, wg, wb] = waterRGB(wood.shown);
    p.noStroke();
    p.fill(wr, wg, wb, 200);
    p.rect(cx - tankW / 2, surfY, tankW, tankB - surfY);
    p.stroke(C.navy);
    p.strokeWeight(2.6);
    p.noFill();
    p.line(cx - tankW / 2, surfY - 66, cx - tankW / 2, tankB);
    p.line(cx + tankW / 2, surfY - 66, cx + tankW / 2, tankB);
    p.line(cx - tankW / 2, tankB, cx + tankW / 2, tankB);

    const H = (tankB - surfY) * 0.6, Wd = tankW * 0.46;
    const top = surfY - H * Math.max(0.02, Math.min(0.9, aShown));
    p.noStroke();
    p.fill(196, 154, 96);
    p.rect(cx - Wd / 2, top, Wd, H, 6);
    p.stroke(C.navy);
    p.strokeWeight(2.2);
    p.noFill();
    p.rect(cx - Wd / 2, top, Wd, H, 6);
    p.stroke(C.red);
    p.strokeWeight(2.2);
    dashed(p, true, [4, 4]);
    p.line(cx - tankW / 2 - 10, surfY, cx + tankW / 2 + 10, surfY);
    dashed(p, false);
    chip(p, `water at ${fmt(wood.shown, 1)} °C`, cx, tankB + 12, 'center', 13.5, C.navy);
    chip(p, 'freeboard change drawn 900× oversize', cx, surfY - 88, 'center', 12, C.grey);

    /* ── fraction-above vs temperature, drawn by the block itself ── */
    const gx = p.width * 0.46, gw = p.width - gx - 56, gy = 66, gh = p.height - 170;
    const X = (T: number) => gx + (T / 10) * gw;
    const AA = above0 - 1.2e-4, AB = above0 + 2.6e-4;
    const Y = (a: number) => gy + gh - ((a - AA) / (AB - AA)) * gh;

    p.noStroke();
    p.fill(255);
    p.rect(gx - 46, gy - 26, gw + 72, gh + 72, 14);
    p.stroke(C.navy);
    p.strokeWeight(2.2);
    p.line(gx, gy + gh, gx + gw, gy + gh);
    p.line(gx, gy, gx, gy + gh);
    p.noStroke();
    p.fill(C.dark);
    p.textSize(12);
    p.textAlign(p.CENTER, p.TOP);
    for (let T = 0; T <= 10; T += 2) p.text(`${T}`, X(T), gy + gh + 6);
    p.text('water temperature (°C)', gx + gw / 2, gy + gh + 26);
    p.push();
    p.translate(gx - 34, gy + gh / 2);
    p.rotate(-Math.PI / 2);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('fraction ABOVE water', 0, 0);
    p.pop();

    /* the 4 °C peak line */
    p.stroke(C.green);
    p.strokeWeight(2);
    dashed(p, true, [5, 4]);
    p.line(X(4), gy, X(4), gy + gh);
    dashed(p, false);
    chip(p, 'peak at 4 °C', X(4), gy - 2, 'center', 12.5, C.green);

    /* the full curve, faint, and the trail the block has actually drawn */
    p.stroke(41, 89, 144, 60);
    p.strokeWeight(2);
    p.noFill();
    p.beginShape();
    for (let T = 0; T <= 10; T += 0.1) p.vertex(X(T), Y(1 - RHO_WOOD / rhoWater(T)));
    p.endShape();
    p.stroke(C.accent);
    p.strokeWeight(3.4);
    p.noFill();
    p.beginShape();
    wood.trail.forEach(([T, a]) => p.vertex(X(T), Y(a)));
    p.endShape();
    p.noStroke();
    p.fill(C.navy);
    p.circle(X(wood.shown), Y(above), 14);
    p.fill(C.amber);
    p.circle(X(wood.shown), Y(above), 8);

    chip(p, wood.shown < 3.8
      ? 'warming → water denser → block RISES'
      : wood.shown <= 4.2 ? 'maximum density → block at its highest'
        : 'warming → water thinner → block SETTLES',
      gx + gw / 2, 16, 'center', 14.5,
      wood.shown < 3.8 ? C.accent : wood.shown <= 4.2 ? C.green : C.red);
  };
};

let woodInst: p5 | null = null;

function woodWire() {
  const s = slider('l5FWT');
  s.addEventListener('input', () => {
    wood.auto = false;
    wood.T = +s.value;
    el('l5FWTVal').textContent = `${fmt(wood.T, 1)} °C`;
    woodReadouts();
  });
  el('l5FWRun').addEventListener('click', () => {
    wood.T = 0;
    wood.trail = [];
    wood.shown = 0;
    wood.auto = true;
  });
  woodReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   registry + boot
   ══════════════════════════════════════════════════════════════════════ */

function mount(inst: p5 | null, sk: (p: p5) => void, holderId: string): p5 {
  if (inst) { inst.windowResized?.(); return inst; }
  return new p5(sk, el(holderId));
}

let waterPane = 'l5WA', floatPane = 'l5FA';

function waterMount() {
  if (waterPane === 'l5WA') wcvInst = mount(wcvInst, wcvSketch, 'l5CurveCanvas');
  else lakeInst = mount(lakeInst, lakeSketch, 'l5LakeCanvas');
}
function floatMount() {
  if (floatPane === 'l5FA') fltInst = mount(fltInst, fltSketch, 'l5FloatCanvas');
  else woodInst = mount(woodInst, woodSketch, 'l5WoodCanvas');
}

(window as any).SCREEN_INIT = {
  density: () => { denInst = mount(denInst, denSketch, 'l5DenCanvas'); },
  water: waterMount,
  flask: () => { flaskInst = mount(flaskInst, flaskSketch, 'l5FlaskCanvas'); },
  weigh: () => { wghInst = mount(wghInst, wghSketch, 'l5WeighCanvas'); },
  float: floatMount,
};

denWire();
wcvWire();
lakeWire();
flaskWire();
wghWire();
fltWire();
woodWire();
wireTabs('l5WTabs', (id) => { waterPane = id; waterMount(); });
wireTabs('l5FTabs', (id) => { floatPane = id; floatMount(); });
