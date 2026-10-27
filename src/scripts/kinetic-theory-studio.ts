/* ═══════════ Kinetic Theory Studio ═══════════
   One screen (#piston) on window.SCREEN_INIT:

     piston - two ideal gases in a box with adiabatic outer walls, split
              by a piston that is conducting or not, fixed or free to
              slide. A real two-gas model runs underneath:
                M ẍ = (P₁ − P₂)A − bẋ            the piston
                dU₁ = −P₁dV₁ − Q,  dU₂ = −P₂dV₂ + Q   each gas
                Q = h (T₁ − T₂) dt               through a conducting piston
              Friction heat bẋ² is shared between the gases, so U₁ + U₂
              stays constant - the outer walls let nothing in or out.
              M, b and h only set how fast it happens (picked so every
              run settles in a few seconds); the end state is fixed by
              the physics. Molecules move at speeds ∝ √T, and three
              graphs track T, P and V so the table can be read off them.

   The p5 instance is built lazily: the screen is display:none until it
   opens, so a canvas created early would have zero width.              */

import p5 from 'p5';

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

/* the two gases keep these colours everywhere - chips, labels, graph lines */
const GAS1 = C.navy;
const GAS2 = '#15803d';

type RGB = [number, number, number];

/* ───────── shared helpers ───────── */
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

function arrow(p: p5, x1: number, y1: number, x2: number, y2: number, head = 10) {
  p.line(x1, y1, x2, y2);
  const a = Math.atan2(y2 - y1, x2 - x1);
  p.line(x2, y2, x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45));
  p.line(x2, y2, x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45));
}

function dt(p: p5) { return Math.min(p.deltaTime || 16.7, 60) / 1000; }

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mix = (a: RGB, b: RGB, f: number): RGB =>
  [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * f) as RGB;

function el(id: string) { return document.getElementById(id)!; }
function setText(id: string, s: string) {
  const e = el(id);
  if (e.textContent !== s) e.textContent = s;
}

/* temperature colour: 200 K blue → 500 K purple → 800 K red, saturated all the way */
function tempRGB(T: number): RGB {
  const f = clamp((T - 200) / 600, 0, 1);
  if (f < 0.5) return mix([37, 99, 235], [147, 51, 234], f / 0.5);
  return mix([147, 51, 234], [220, 38, 38], (f - 0.5) / 0.5);
}

/* ══════════════════════════════════════════════════════════════════════
   the model
   ══════════════════════════════════════════════════════════════════════ */

const R = 8.314;
const CV = 1.5 * R;            // both gases monatomic
const CP = CV + R;
const GAM = CP / CV;
const V_TOT = 0.04;            // m³ - 40 L for the two sides together
const X_MIN = 0.06, X_MAX = 0.94;
const PERIOD = 1.6;            // s - small-oscillation period of a free piston
const ZETA = 0.3;              // damping ratio: it overshoots, rocks once or twice, stops
const TAU_HEAT = 1.8;          // s - how fast T₁ − T₂ dies through a conducting piston
const H_STEP = 0.002;          // s - integration step
const SAMPLE = 0.05;           // s - graph sampling interval
const DOTS_PER_MOL = 12;

interface Case { conducting: boolean; movable: boolean }
const CASES: Case[] = [
  { conducting: false, movable: false },
  { conducting: false, movable: true },
  { conducting: true, movable: false },
  { conducting: true, movable: true },
];

const SETTLED_MSG = [
  'Settled - nothing could cross or move, so nothing changed',
  'Settled - pressures equal, temperatures still different',
  'Settled - temperatures equal, pressures still different',
  'Settled - temperatures and pressures both equal',
];

/* one graph sample: t, T₁, T₂, P₁ (kPa), P₂, V₁ (L), V₂ */
type Sample = [number, number, number, number, number, number, number];

interface Dot { side: 1 | 2; u: number; w: number; vx: number; vy: number; k: number }

const st = {
  kase: 0,
  n1: 1, T1: 800, n2: 2, T2: 200,
  started: false,
  settled: false,
  settledAt: 0,
  hold: 0,
  t: 0,
  x: 0.5,                      // V₁ / V_TOT
  v: 0,                        // dx/dt
  U1: 0, U2: 0,
  M: 1, b: 0, h: 0,
  q: 0,                        // heat flow 1 → 2 right now (W)
  qRef: 1,
  pRef: 1,
  start: [0, 0, 0, 0, 0, 0, 0] as Sample,
  hist: [] as Sample[],
  nextSample: 0,
  dots: [] as Dot[],
  phase: 0,
};

const Tof = (i: 1 | 2) => (i === 1 ? st.U1 / (st.n1 * CV) : st.U2 / (st.n2 * CV));
const Vof = (i: 1 | 2) => (i === 1 ? V_TOT * st.x : V_TOT * (1 - st.x));
const Pof = (i: 1 | 2) => ((i === 1 ? st.n1 : st.n2) * R * Tof(i)) / Vof(i);
const sample = (): Sample =>
  [st.t, Tof(1), Tof(2), Pof(1) / 1000, Pof(2) / 1000, Vof(1) * 1000, Vof(2) * 1000];

function build(start: boolean) {
  const K = CASES[st.kase];
  st.x = 0.5;
  st.v = 0;
  st.t = 0;
  st.U1 = st.n1 * CV * st.T1;
  st.U2 = st.n2 * CV * st.T2;
  st.started = start;
  st.settled = false;
  st.hold = 0;
  st.q = 0;
  const P1 = Pof(1), P2 = Pof(2);
  /* stiffness of the gas springs about the start, then M and b to give the
     chosen period and damping whatever the starting values */
  const k = V_TOT * (GAM * P1 / st.x + GAM * P2 / (1 - st.x));
  const w = (2 * Math.PI) / PERIOD;
  st.M = k / (w * w);
  st.b = 2 * ZETA * Math.sqrt(k * st.M);
  /* a free piston keeps the pressures matched while heat flows, so each
     gas then warms at constant pressure: use Cp for the time constant */
  const Cm = K.movable ? CP : CV;
  st.h = 1 / (TAU_HEAT * (1 / (st.n1 * Cm) + 1 / (st.n2 * Cm)));
  st.qRef = Math.max(1, st.h * Math.abs(st.T1 - st.T2));
  st.pRef = Math.max(P1, P2);
  st.start = sample();
  st.hist = [st.start];
  st.nextSample = SAMPLE;

  st.dots = [];
  for (const side of [1, 2] as const) {
    const n = (side === 1 ? st.n1 : st.n2) * DOTS_PER_MOL;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      st.dots.push({ side, u: Math.random(), w: Math.random(), vx: Math.cos(a), vy: Math.sin(a), k: 0.55 + Math.random() * 0.9 });
    }
  }
  refreshButtons();
}

function integrate(h: number) {
  const K = CASES[st.kase];
  const P1 = Pof(1), P2 = Pof(2);
  st.q = K.conducting ? st.h * (Tof(1) - Tof(2)) : 0;
  let dx = 0, fric = 0;
  if (K.movable) {
    st.v += (((P1 - P2) * V_TOT - st.b * st.v) / st.M) * h;
    dx = st.v * h;
    fric = st.b * st.v * st.v * h;
  }
  let nx = st.x + dx;
  if (nx < X_MIN || nx > X_MAX) {
    /* hits the end stop: its kinetic energy goes into the gases as heat */
    nx = clamp(nx, X_MIN, X_MAX);
    dx = nx - st.x;
    fric += 0.5 * st.M * st.v * st.v;
    st.v = 0;
  }
  st.U1 += -P1 * V_TOT * dx - st.q * h + fric / 2;
  st.U2 += P2 * V_TOT * dx + st.q * h + fric / 2;
  st.x = nx;
  st.t += h;
}

function stepModel(real: number) {
  if (!st.started) return;
  for (let left = real; left > 1e-9; left -= H_STEP) integrate(Math.min(H_STEP, left));

  const K = CASES[st.kase];
  const T1 = Tof(1), T2 = Tof(2), P1 = Pof(1), P2 = Pof(2);
  const ok =
    Math.abs(st.v) < 2e-3 &&
    (!K.movable || Math.abs(P1 - P2) / ((P1 + P2) / 2) < 0.006) &&
    (!K.conducting || Math.abs(T1 - T2) / ((T1 + T2) / 2) < 0.006);
  st.hold = ok ? st.hold + real : 0;
  if (!st.settled && st.hold > 0.5 && st.t > 2.5) {
    st.settled = true;
    st.settledAt = st.t;
    onSettled();
  }
  /* keep sampling a little past the settle so the flat ends show, then stop */
  while (st.t >= st.nextSample && (!st.settled || st.t < st.settledAt + 1.5)) {
    st.hist.push(sample());
    st.nextSample += SAMPLE;
  }
}

/* ══════════════════════════════════════════════════════════════════════
   the sketch
   ══════════════════════════════════════════════════════════════════════ */

interface Box { x: number; y: number; w: number; h: number }

const pistonSketch = (p: p5) => {
  const holder = el('ktPistonCanvas');
  const wideAt = (W: number) => W >= 900;
  const canvasH = () => {
    const W = holder.clientWidth;
    if (wideAt(W)) return Math.max(540, Math.min(660, Math.round(W * 0.42)));
    return 56 + Math.round(W * 0.55) + 150 + 3 * 124 + 24;
  };

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    if (!holder.offsetParent) return;
    const d = dt(p);
    stepModel(d);
    st.phase += d;

    const W = p.width, H = p.height;
    const wide = wideAt(W);
    const fs = wide ? 16 : 13;
    let box: Box;
    const panels: Box[] = [];
    if (wide) {
      box = { x: 28, y: 64, w: W * 0.58 - 28, h: H - 64 - 150 };
      const gx = W * 0.58 + 26, gy = 18, gw = W - gx - 20, gh = H - 36;
      const ph = (gh - 2 * 14) / 3;
      for (let i = 0; i < 3; i++) panels.push({ x: gx, y: gy + i * (ph + 14), w: gw, h: ph });
    } else {
      box = { x: 14, y: 56, w: W - 28, h: Math.round(W * 0.55) };
      const gy = box.y + box.h + 150;
      for (let i = 0; i < 3; i++) panels.push({ x: 14, y: gy + i * 124, w: W - 28, h: 112 });
    }

    const K = CASES[st.kase];
    const T1 = Tof(1), T2 = Tof(2), P1 = Pof(1), P2 = Pof(2);
    const TW = wide ? 20 : 14;                 // outer wall thickness
    const PW = wide ? 22 : 16;                 // piston thickness
    const ix = box.x + TW, iy = box.y + TW, iw = box.w - 2 * TW, ih = box.h - 2 * TW;
    const pl = ix + st.x * (iw - PW), pr = pl + PW;
    const ctx = p.drawingContext as CanvasRenderingContext2D;

    p.background(255);

    /* ── adiabatic outer walls: thick and hatched ── */
    p.noStroke();
    p.fill(207, 216, 232);
    p.rect(box.x, box.y, box.w, box.h, 10);
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.rect(ix, iy, iw, ih);
    ctx.clip('evenodd');                       // the wall band only, not the inside
    p.stroke(41, 89, 144, 150);
    p.strokeWeight(1.6);
    for (let s = -box.h; s < box.w + box.h; s += 11) p.line(box.x + s, box.y + box.h, box.x + s + box.h, box.y);
    ctx.restore();
    p.noFill();
    p.stroke(C.dark);
    p.strokeWeight(2.2);
    p.rect(box.x, box.y, box.w, box.h, 10);
    p.strokeWeight(1.4);
    p.rect(ix, iy, iw, ih);

    /* ── the two gases, tinted by temperature ── */
    const tint = (T: number) => { const c = tempRGB(T); p.fill(c[0], c[1], c[2], 34); };
    p.noStroke();
    p.fill(255);
    p.rect(ix, iy, iw, ih);
    tint(T1); p.rect(ix, iy, pl - ix, ih);
    tint(T2); p.rect(pr, iy, ix + iw - pr, ih);

    /* ── molecules: speed ∝ √T, colour = temperature ── */
    const r = clamp(ih / 80, 3.2, 5.5);
    const regs = { 1: [ix + r, pl - r], 2: [pr + r, ix + iw - r] } as const;
    const target = (T: number) => ih * 0.55 * Math.sqrt(T / 300);
    for (const side of [1, 2] as const) {
      const T = side === 1 ? T1 : T2;
      const [x0, x1] = regs[side];
      const vt = target(T);
      const c = tempRGB(T);
      p.fill(c[0], c[1], c[2]);
      for (const m of st.dots) {
        if (m.side !== side) continue;
        let px = x0 + m.u * (x1 - x0);
        let py = iy + r + m.w * (ih - 2 * r);
        px += m.vx * m.k * vt * d;
        py += m.vy * m.k * vt * d;
        if (px < x0) { px = x0 + (x0 - px); m.vx = Math.abs(m.vx); }
        if (px > x1) { px = x1 - (px - x1); m.vx = -Math.abs(m.vx); }
        if (py < iy + r) { py = iy + r + (iy + r - py); m.vy = Math.abs(m.vy); }
        if (py > iy + ih - r) { py = iy + ih - r - (py - (iy + ih - r)); m.vy = -Math.abs(m.vy); }
        px = clamp(px, x0, x1);
        py = clamp(py, iy + r, iy + ih - r);
        m.u = x1 > x0 ? (px - x0) / (x1 - x0) : 0.5;
        m.w = (py - iy - r) / (ih - 2 * r);
        p.circle(px, py, r * 2);
      }
    }

    /* gas names, tucked into the top corner of each side */
    p.textFont('DM Sans');
    p.textStyle(p.BOLD);
    p.textSize(fs);
    p.noStroke();
    p.textAlign(p.LEFT, p.TOP);
    if (pl - ix > 70) { p.fill(GAS1); p.text('Gas 1', ix + 10, iy + 8); }
    p.textAlign(p.RIGHT, p.TOP);
    if (ix + iw - pr > 70) { p.fill(GAS2); p.text('Gas 2', ix + iw - 10, iy + 8); }
    p.textStyle(p.NORMAL);

    /* ── heat crossing a conducting piston, hot side → cold side ── */
    if (K.conducting && st.started) {
      const a = Math.pow(clamp(Math.abs(st.q) / st.qRef, 0, 1), 0.6);
      if (a > 0.03) {
        const dir = st.q > 0 ? 1 : -1;
        const span = Math.min(56, iw * 0.08);
        const xa = dir > 0 ? pl - span : pr + span, xb = dir > 0 ? pr + span : pl - span;
        p.stroke(234, 88, 12, 255 * a);
        p.strokeWeight(3);
        p.noFill();
        for (const fy of [0.24, 0.76]) {
          const y = iy + ih * fy;
          p.beginShape();
          for (let i = 0; i <= 24; i++) {
            const f = i / 24;
            p.vertex(xa + (xb - xa) * f, y + 4 * Math.sin(f * 14 - st.phase * 9));
          }
          p.endShape();
          arrow(p, xb - dir * 2, y, xb + dir * 6, y, 11);
        }
        p.noStroke();
        p.fill(194, 65, 12, 255 * a);
        p.textSize(fs - 1);
        p.textStyle(p.BOLD);
        p.textAlign(p.CENTER, p.BOTTOM);
        p.text('heat', xa + (dir * span) / 2, iy + ih * 0.24 - 10);   // over the hot side, clear of the piston
        p.textStyle(p.NORMAL);
      }
    }

    /* ── the piston ── */
    p.noStroke();
    if (K.conducting) {
      p.fill(184, 115, 51);
      p.rect(pl, iy, PW, ih);
      p.fill(222, 160, 104);
      p.rect(pl + PW * 0.2, iy, PW * 0.18, ih);
      p.fill(150, 88, 36);
      p.rect(pl + PW * 0.7, iy, PW * 0.12, ih);
    } else {
      p.fill(240, 230, 210);
      p.rect(pl, iy, PW, ih);
      p.stroke(176, 150, 112);
      p.strokeWeight(1.3);
      for (let y = iy + 6; y < iy + ih - 4; y += 9) p.line(pl + 3, y + 4, pr - 3, y);
    }
    p.noFill();
    p.stroke(C.navy);
    p.strokeWeight(1.8);
    p.rect(pl, iy, PW, ih);

    if (K.movable) {
      /* rollers top and bottom: it can slide */
      p.noStroke();
      p.fill(100, 116, 139);
      p.circle(pl + PW / 2, iy + 5, 9);
      p.circle(pl + PW / 2, iy + ih - 5, 9);
    } else {
      /* bolted through the outer wall, top and bottom */
      p.noStroke();
      p.fill(C.navy);
      p.rect(pl - 7, box.y - 8, PW + 14, TW + 14, 3);
      p.rect(pl - 7, iy + ih - 6, PW + 14, TW + 14, 3);
      p.fill(255);
      p.circle(pl + PW / 2, box.y + TW / 2 - 1, 7);
      p.circle(pl + PW / 2, iy + ih + TW / 2 + 1, 7);
    }

    /* ── the two pushes on the piston: P₁A to the right, P₂A to the left ── */
    const fy = iy + ih / 2;
    const fLen = (P: number) => clamp((iw * 0.2 * P) / st.pRef, 10, iw * 0.34);
    p.strokeWeight(4);
    p.stroke(GAS1);
    arrow(p, pl - 4 - fLen(P1), fy, pl - 4, fy, 13);
    p.stroke(GAS2);
    arrow(p, pr + 4 + fLen(P2), fy, pr + 4, fy, 13);
    p.noStroke();
    p.textSize(fs - 1);
    p.textStyle(p.BOLD);
    p.textAlign(p.RIGHT, p.BOTTOM);
    p.fill(GAS1);
    p.text('P₁A', pl - 10, fy - 8);
    p.textAlign(p.LEFT, p.BOTTOM);
    p.fill(GAS2);
    p.text('P₂A', pr + 10, fy - 8);
    p.textStyle(p.NORMAL);

    /* ── labels around the box ── */
    chip(p, 'Outer walls: adiabatic - no heat in or out', box.x, box.y - 40, 'left', fs, C.dark);
    chip(p, st.started ? `t = ${st.t.toFixed(1)} s` : 'Press Start', box.x + box.w, box.y - 40, 'right', fs, st.started ? C.navy : C.accent);
    const pText = `${K.conducting ? 'conducting' : 'insulating'} piston\n${K.movable ? 'free to slide' : 'fixed in place'}`;
    chip(p, pText, clamp((pl + pr) / 2, box.x + 80, box.x + box.w - 80), box.y + box.h + 14, 'center', fs - 1, K.conducting ? '#9a3412' : C.dark);
    const gasText = (i: 1 | 2) => {
      const s = i === 1 ? '₁' : '₂';
      return `Gas ${i} · ${i === 1 ? st.n1 : st.n2} mol\nT${s} = ${Tof(i).toFixed(0)} K\nP${s} = ${(Pof(i) / 1000).toFixed(0)} kPa\nV${s} = ${(Vof(i) * 1000).toFixed(1)} L`;
    };
    chip(p, gasText(1), box.x + 8, box.y + box.h + 66, 'left', fs, GAS1);
    chip(p, gasText(2), box.x + box.w - 8, box.y + box.h + 66, 'right', fs, GAS2);

    /* ── the three graphs ── */
    const last = st.hist[st.hist.length - 1];
    const tMax = Math.max(10, Math.ceil(last[0] * 1.05));
    const maxOf = (i: number) => Math.max(...st.hist.map((s) => s[i]));
    const tHi = Math.max(900, Math.ceil((Math.max(maxOf(1), maxOf(2)) * 1.1) / 100) * 100);
    const pHi = Math.max(100, Math.ceil((Math.max(maxOf(3), maxOf(4)) * 1.15) / 50) * 50);
    const now: Sample = st.started ? sample() : st.start;
    const tagFor = (a: number, b: number, a0: number, b0: number, sym: string): [string, string] => {
      if (!st.started) return ['', ''];
      /* "no change" wins over "equal": a fixed piston keeps V₁ = V₂ = 20 L,
         but the lesson there is that the volumes could not move */
      const same = Math.abs(a - a0) / a0 < 0.01 && Math.abs(b - b0) / b0 < 0.01;
      if (same) return st.t > 1.5 ? ['no change', C.grey] : ['', ''];
      if (Math.abs(a - b) / ((a + b) / 2) < 0.01) return [`${sym}₁ = ${sym}₂`, C.green];
      if (st.settled) return [`${sym}₁, ${sym}₂ changed`, '#b45309'];
      return ['', ''];
    };
    const vTag: [string, string] = K.conducting && K.movable && st.settled
      ? ['V₁/n₁ = V₂/n₂', C.green]
      : tagFor(now[5], now[6], st.start[5], st.start[6], 'V');
    plot(p, panels[0], 'Temperature', 'K', 1, 2, tHi, tMax, 'T', (v) => v.toFixed(0), tagFor(now[1], now[2], st.start[1], st.start[2], 'T'), fs, false);
    plot(p, panels[1], 'Pressure', 'kPa', 3, 4, pHi, tMax, 'P', (v) => v.toFixed(0), tagFor(now[3], now[4], st.start[3], st.start[4], 'P'), fs, false);
    plot(p, panels[2], 'Volume', 'L', 5, 6, 40, tMax, 'V', (v) => v.toFixed(0), vTag, fs, true);

    /* ── readouts ── */
    setText('ktRoT', `${Math.abs(T1 - T2).toFixed(0)} K`);
    setText('ktRoP', `${(Math.abs(P1 - P2) / 1000).toFixed(0)} kPa`);
    setText('ktRoV', `${(Vof(1) * 1000).toFixed(1)} L : ${(Vof(2) * 1000).toFixed(1)} L`);
    el('ktRoT').classList.toggle('good', st.started && Math.abs(T1 - T2) < 0.01 * (T1 + T2) / 2);
    el('ktRoP').classList.toggle('good', st.started && Math.abs(P1 - P2) < 0.01 * (P1 + P2) / 2);
    let status = 'Ready - press Start';
    if (st.settled) status = SETTLED_MSG[st.kase];
    else if (st.started) {
      if (K.movable && Math.abs(st.v) > 0.01) status = 'The piston slides towards the weaker push';
      else if (K.conducting && Math.abs(st.q) > 0.03 * st.qRef) status = 'Heat leaks through the piston from hot to cold';
      else status = 'Running';
    }
    setText('ktRoS', status);
  };
};

function plot(
  p: p5, g: Box, title: string, unit: string, ia: number, ib: number,
  yHi: number, tMax: number, sym: string, fmt: (v: number) => string,
  tag: [string, string], fs: number, xAxis: boolean
) {
  const L = g.x + 54, Rr = g.x + g.w - 34, T = g.y + 30, B = g.y + g.h - (xAxis ? 26 : 12);
  const gx = (t: number) => L + (t / tMax) * (Rr - L);
  const gy = (v: number) => B - (v / yHi) * (B - T);

  p.noStroke();
  p.fill(C.paper);
  p.rect(g.x, g.y, g.w, g.h, 12);
  p.textFont('DM Sans');
  p.textStyle(p.BOLD);
  p.textSize(fs);
  p.fill(C.navy);
  p.textAlign(p.LEFT, p.TOP);
  p.text(title, g.x + 14, g.y + 9);
  p.textStyle(p.NORMAL);
  if (tag[0]) {
    p.textStyle(p.BOLD);
    p.fill(tag[1]);
    p.textAlign(p.RIGHT, p.TOP);
    p.text(tag[0], g.x + g.w - 14, g.y + 9);
    p.textStyle(p.NORMAL);
  }

  /* axes and ticks */
  p.stroke(41, 89, 144, 110);
  p.strokeWeight(1.2);
  p.line(L, B, Rr, B);
  p.line(L, T, L, B);
  p.noStroke();
  p.fill(C.dark);
  p.textSize(fs - 3);
  p.textAlign(p.RIGHT, p.CENTER);
  p.text(`${fmt(yHi)} ${unit}`, L - 6, T);
  p.text(`${fmt(yHi / 2)}`, L - 6, (T + B) / 2);
  p.text('0', L - 6, B);
  if (xAxis) {
    p.textAlign(p.CENTER, p.TOP);
    p.text('0', L, B + 5);
    p.text(`${tMax} s`, Rr, B + 5);
    p.text('time', (L + Rr) / 2, B + 5);
  }

  /* the two lines */
  const line = (i: number, col: string) => {
    p.stroke(col);
    p.strokeWeight(3);
    p.noFill();
    p.beginShape();
    for (const s of st.hist) p.vertex(gx(s[0]), gy(s[i]));
    if (st.started && !st.settled) p.vertex(gx(st.t), gy(sample()[i]));
    p.endShape();
  };
  line(ib, GAS2);
  line(ia, GAS1);

  /* end labels, pushed apart when the lines meet */
  const end = st.hist[st.hist.length - 1];
  let ya = gy(end[ia]), yb = gy(end[ib]);
  if (Math.abs(ya - yb) < 15) {
    const mid = (ya + yb) / 2, sgn = end[ia] >= end[ib] ? -1 : 1;
    ya = mid + sgn * 7.5;
    yb = mid - sgn * 7.5;
  }
  const lx = Math.min(Rr + 5, gx(end[0]) + 6);
  p.noStroke();
  p.textStyle(p.BOLD);
  p.textSize(fs - 2);
  p.textAlign(p.LEFT, p.CENTER);
  p.fill(GAS1);
  p.text(`${sym}₁`, lx, ya);
  p.fill(GAS2);
  p.text(`${sym}₂`, lx, yb);
  p.textStyle(p.NORMAL);
}

/* ══════════════════════════════════════════════════════════════════════
   wiring
   ══════════════════════════════════════════════════════════════════════ */

const rows = () => document.querySelectorAll<HTMLTableRowElement>('#ktTable tbody tr');

function refreshButtons() {
  const go = el('ktGo');
  const want = st.started ? '↻ Run again' : '▶ Start';
  if (go.textContent !== want) go.textContent = want;
  const all = [...rows()].every((r) => r.classList.contains('shown'));
  setText('ktReveal', all ? 'Hide the answers' : 'Reveal all answers');
}

function onSettled() {
  const K = CASES[st.kase];
  rows().forEach((r) => { if (Number(r.dataset.case) === st.kase) r.classList.add('shown'); });
  if (K.conducting) el('ktRuleCond').classList.add('shown');
  if (K.movable) el('ktRuleMov').classList.add('shown');
  refreshButtons();
}

function pistonWire() {
  const caseBtns = el('ktCase').querySelectorAll<HTMLButtonElement>('.th-btn');
  const pick = (k: number) => {
    st.kase = k;
    caseBtns.forEach((b) => b.classList.toggle('on', Number(b.dataset.case) === k));
    rows().forEach((r) => r.classList.toggle('cur', Number(r.dataset.case) === k));
    build(false);
  };
  caseBtns.forEach((b) => b.addEventListener('click', () => pick(Number(b.dataset.case))));
  rows().forEach((r) => r.addEventListener('click', () => pick(Number(r.dataset.case))));

  const slider = (id: string, key: 'T1' | 'T2' | 'n1' | 'n2', unit: string) => {
    const inp = el(id) as HTMLInputElement;
    const show = () => setText(`${id}v`, `${inp.value} ${unit}`);
    inp.addEventListener('input', () => {
      st[key] = Number(inp.value);
      show();
      build(false);
    });
    st[key] = Number(inp.value);
    show();
  };
  slider('ktT1', 'T1', 'K');
  slider('ktN1', 'n1', 'mol');
  slider('ktT2', 'T2', 'K');
  slider('ktN2', 'n2', 'mol');

  el('ktGo').addEventListener('click', (e) => { (e.currentTarget as HTMLElement).blur(); build(true); });
  el('ktReset').addEventListener('click', () => build(false));
  el('ktReveal').addEventListener('click', () => {
    const show = ![...rows()].every((r) => r.classList.contains('shown'));
    rows().forEach((r) => r.classList.toggle('shown', show));
    el('ktRuleCond').classList.toggle('shown', show);
    el('ktRuleMov').classList.toggle('shown', show);
    refreshButtons();
  });
  build(false);
}

let pistonInst: p5 | null = null;
function pistonMount() {
  if (pistonInst) { pistonInst.windowResized?.(); return; }
  pistonInst = new p5(pistonSketch, el('ktPistonCanvas'));
}

(window as any).SCREEN_INIT = {
  piston: pistonMount,
};

pistonWire();

/* tap-to-reveal examples */
document.querySelectorAll<HTMLElement>('.th-eg').forEach((eg) => {
  const open = () => eg.classList.add('revealed');
  eg.addEventListener('click', open);
  eg.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') open(); });
});

/* /kinetic-theory#piston opens straight on the animation (linked from the slides) */
if (location.hash === '#piston') (window as any).go('piston');
