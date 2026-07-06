/* ═══════════ Kinematics Studio - chapter script ═══════════
   Projectile Playground: p5.js canvas + KaTeX formulas.
   The p5 instance is created lazily on first open, because .screen
   sections are display:none and the canvas needs a real width.      */

import p5 from 'p5';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { revisionScreenInit } from './kinematics-revision';

/* ───────── brand palette (matches global.css tokens) ───────── */
const C = {
  navy: '#0f2647',
  dark: '#295990',
  accent: '#00A0E3',
  red: '#e11d48',
  green: '#16a34a',
  amber: '#f59e0b',
  paper: '#f4f8fc',
};

/* ───────── state ───────── */
const state = {
  u: 25,          // launch speed  (m/s)
  theta: 45,      // launch angle  (deg)
  g: 10,          // gravity       (m/s²)
  phase: 'ready' as 'ready' | 'flying' | 'landed',
  t: 0,           // flight time   (s)
  trail: [] as Array<{ x: number; y: number }>,
};

function calc() {
  const th = (state.theta * Math.PI) / 180;
  const T = (2 * state.u * Math.sin(th)) / state.g;
  const H = (state.u ** 2 * Math.sin(th) ** 2) / (2 * state.g);
  const R = (state.u ** 2 * Math.sin(2 * th)) / state.g;
  return { th, T, H, R };
}

/* ───────── stats + formulas ───────── */
function renderFormulas() {
  const opts = { throwOnError: false, displayMode: true };
  katex.render(String.raw`T=\dfrac{2u\sin\theta}{g}`, document.getElementById('fT')!, opts);
  katex.render(String.raw`H=\dfrac{u^{2}\sin^{2}\theta}{2g}`, document.getElementById('fH')!, opts);
  katex.render(String.raw`R=\dfrac{u^{2}\sin 2\theta}{g}`, document.getElementById('fR')!, opts);
}

function updateStats() {
  const { T, H, R } = calc();
  (document.getElementById('vT')!).textContent = `${T.toFixed(2)} s`;
  (document.getElementById('vH')!).textContent = `${H.toFixed(1)} m`;
  (document.getElementById('vR')!).textContent = `${R.toFixed(1)} m`;
}

/* ───────── p5 sketch ───────── */
let sketchInstance: p5 | null = null;

function niceStep(world: number): number {
  for (const s of [1, 2, 5, 10, 20, 25, 50, 100, 200]) {
    if (world / s <= 12) return s;
  }
  return 500;
}

const sketch = (p: p5) => {
  const holder = document.getElementById('projCanvas')!;
  const M = { l: 56, r: 24, t: 24, b: 46 };

  const canvasH = () =>
    Math.max(380, Math.min(560, Math.round(holder.clientWidth * 0.5)));

  p.setup = () => {
    p.createCanvas(holder.clientWidth, canvasH());
  };

  p.windowResized = () => {
    p.resizeCanvas(holder.clientWidth, canvasH());
  };

  p.draw = () => {
    const { th, T, H, R } = calc();
    const pw = p.width - M.l - M.r;
    const ph = p.height - M.t - M.b;
    const worldR = Math.max(R * 1.08, 15);
    const worldH = Math.max(H * 1.3, 8);
    const s = Math.min(pw / worldR, ph / worldH);
    const X = (wx: number) => M.l + wx * s;
    const Y = (wy: number) => p.height - M.b - wy * s;

    p.background(C.paper);

    /* grid + ticks */
    const step = niceStep(worldR);
    p.stroke(41, 89, 144, 26);
    p.strokeWeight(1);
    p.textFont('DM Sans');
    for (let gx = 0; gx <= worldR; gx += step) {
      p.line(X(gx), M.t, X(gx), p.height - M.b);
    }
    for (let gy = 0; gy <= worldH; gy += step) {
      p.line(M.l, Y(gy), p.width - M.r, Y(gy));
    }
    p.noStroke();
    p.fill(C.dark);
    p.textSize(12);
    p.textAlign(p.CENTER, p.TOP);
    for (let gx = 0; gx <= worldR; gx += step) {
      p.text(`${gx}`, X(gx), p.height - M.b + 8);
    }
    p.textAlign(p.RIGHT, p.CENTER);
    for (let gy = step; gy <= worldH; gy += step) {
      p.text(`${gy}`, M.l - 8, Y(gy));
    }
    p.textAlign(p.LEFT, p.TOP);
    p.text('metres', M.l + 4, M.t - 18);

    /* ground */
    p.stroke(C.navy);
    p.strokeWeight(3);
    p.line(M.l, Y(0), p.width - M.r, Y(0));

    /* predicted path (dotted) */
    p.stroke(C.dark);
    p.strokeWeight(2);
    for (let i = 0; i <= 60; i += 2) {
      const tt = (i / 60) * T;
      const x = state.u * Math.cos(th) * tt;
      const y = state.u * Math.sin(th) * tt - 0.5 * state.g * tt * tt;
      p.point(X(x), Y(Math.max(y, 0)));
    }

    /* apex + range markers */
    p.stroke(C.amber);
    p.strokeWeight(1.6);
    p.drawingContext.setLineDash([6, 6]);
    p.line(X(R / 2), Y(0), X(R / 2), Y(H));
    p.drawingContext.setLineDash([]);
    p.noStroke();
    p.fill(C.amber);
    p.circle(X(R / 2), Y(H), 7);
    p.textAlign(p.LEFT, p.BOTTOM);
    p.textSize(13);
    p.text(`H = ${H.toFixed(1)} m`, X(R / 2) + 9, Y(H) - 4);
    p.fill(C.red);
    p.circle(X(R), Y(0), 8);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text(`R = ${R.toFixed(1)} m`, X(R), Y(0) - 10);

    /* advance flight */
    if (state.phase === 'flying') {
      const timeScale = Math.max(1, T / 3.2); // whole flight ≈ 3.2 s on screen
      state.t += (p.deltaTime / 1000) * timeScale;
      if (state.t >= T) {
        state.t = T;
        state.phase = 'landed';
      }
    }

    /* ball + trail + velocity vector */
    if (state.phase !== 'ready') {
      const bx = state.u * Math.cos(th) * state.t;
      const by = Math.max(
        state.u * Math.sin(th) * state.t - 0.5 * state.g * state.t * state.t,
        0
      );
      state.trail.push({ x: bx, y: by });
      if (state.trail.length > 400) state.trail.shift();

      p.noFill();
      p.stroke(C.accent);
      p.strokeWeight(3);
      p.beginShape();
      for (const pt of state.trail) p.vertex(X(pt.x), Y(pt.y));
      p.endShape();

      /* velocity components */
      const vx = state.u * Math.cos(th);
      const vy = state.u * Math.sin(th) - state.g * state.t;
      const vs = 2.2; // px per m/s
      p.strokeWeight(2.4);
      p.stroke(C.green);
      p.line(X(bx), Y(by), X(bx) + vx * vs, Y(by));           // vx →
      p.stroke(C.red);
      p.line(X(bx), Y(by), X(bx), Y(by) - vy * vs);           // vy ↑
      p.stroke(C.navy);
      p.line(X(bx), Y(by), X(bx) + vx * vs, Y(by) - vy * vs); // v resultant

      p.noStroke();
      p.fill(C.navy);
      p.circle(X(bx), Y(by), 16);
      p.fill(C.accent);
      p.circle(X(bx), Y(by), 10);

      /* HUD */
      p.fill(C.navy);
      p.textAlign(p.RIGHT, p.TOP);
      p.textSize(15);
      p.text(
        `t = ${state.t.toFixed(2)} s   vₓ = ${vx.toFixed(1)}   v_y = ${vy.toFixed(1)} m/s`,
        p.width - M.r - 6,
        M.t + 2
      );
      if (state.phase === 'landed') {
        p.textAlign(p.CENTER, p.TOP);
        p.textSize(17);
        p.fill(C.green);
        p.text('Landed! Same u - try a complementary angle.', p.width / 2, M.t + 26);
      }
    } else {
      /* launcher hint */
      p.noStroke();
      p.fill(C.navy);
      p.circle(X(0), Y(0), 16);
      p.fill(C.dark);
      p.textAlign(p.LEFT, p.TOP);
      p.textSize(15);
      p.text('Press Launch 🚀', M.l + 10, M.t + 2);
    }
  };
};

/* ───────── controls wiring ───────── */
function resetFlight() {
  state.phase = 'ready';
  state.t = 0;
  state.trail = [];
}

function wireControls() {
  const u = document.getElementById('uSlider') as HTMLInputElement;
  const th = document.getElementById('thetaSlider') as HTMLInputElement;
  const g = document.getElementById('gSelect') as HTMLSelectElement;

  u.addEventListener('input', () => {
    state.u = +u.value;
    (document.getElementById('uVal')!).textContent = `${u.value} m/s`;
    resetFlight();
    updateStats();
  });
  th.addEventListener('input', () => {
    state.theta = +th.value;
    (document.getElementById('thetaVal')!).textContent = `${th.value}°`;
    resetFlight();
    updateStats();
  });
  g.addEventListener('change', () => {
    state.g = +g.value;
    (document.getElementById('gVal')!).textContent = `${g.value} m/s²`;
    resetFlight();
    updateStats();
  });
  document.getElementById('launchBtn')!.addEventListener('click', () => {
    resetFlight();
    state.phase = 'flying';
  });
  document.getElementById('resetBtn')!.addEventListener('click', resetFlight);
}

/* ───────── screen-init registry (consumed by studio-core go()) ───────── */
(window as any).SCREEN_INIT = {
  projectile: () => {
    if (!sketchInstance) {
      sketchInstance = new p5(sketch, document.getElementById('projCanvas')!);
    } else {
      sketchInstance.windowResized?.();
    }
    resetFlight();
  },
  revision: revisionScreenInit,
};

/* ───────── boot ───────── */
renderFormulas();
updateStats();
wireControls();
