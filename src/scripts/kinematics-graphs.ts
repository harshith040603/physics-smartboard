/* ═══════════ Motion Graphs - five-pane teaching lab ═══════════
   Lectures 6+7: slope going DOWN the chain, area going UP.
   Pane 1: slope reader - drag a cursor along a piecewise x-t curve,
           read the tangent (steepest = fastest, flat = rest)
   Pane 2: "x-t is not the path" - a car on a flat road next to the
           curving graph it produces
   Pane 3: area builder - v-t area fills live; displacement vs
           distance split when the graph dips below the axis
   Pane 4: shape ladder - x-t, v-t, a-t drawn side by side in sync
   Pane 5: rapid quiz on both keys
   Same lazy-p5-per-pane pattern as the gravity lab.                  */

import p5 from 'p5';

const C = {
  navy: '#0f2647',
  dark: '#295990',
  accent: '#00A0E3',
  red: '#e11d48',
  green: '#16a34a',
  amber: '#f59e0b',
  paper: '#f4f8fc',
};

/* ═════════ shared helpers ═════════ */
function arrow(p: p5, x1: number, y1: number, x2: number, y2: number) {
  p.line(x1, y1, x2, y2);
  const a = Math.atan2(y2 - y1, x2 - x1);
  const s = 8;
  p.line(x2, y2, x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45));
  p.line(x2, y2, x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45));
}

function playBtnLabel(id: string, playing: boolean) {
  document.getElementById(id)!.textContent = playing ? '⏸ Pause' : '▶ Play';
}

/* text on a white chip - always readable over grid lines */
function chip(
  p: p5, txt: string, x: number, y: number,
  align: 'left' | 'right' | 'center' = 'left', size = 14, col = C.navy
) {
  p.textSize(size);
  const lines = txt.split('\n');
  const w = Math.max(...lines.map((l) => p.textWidth(l)));
  const lh = size * 1.32;
  let bx = x;
  if (align === 'right') bx = x - w;
  if (align === 'center') bx = x - w / 2;
  p.noStroke();
  p.fill(255, 255, 255, 228);
  p.rect(bx - 7, y - 4, w + 14, lh * lines.length + 8, 8);
  p.fill(col);
  p.textAlign(p.LEFT, p.TOP);
  lines.forEach((l, i) => p.text(l, bx, y + i * lh));
}

/* ═════════ Pane 1 · Slope Reader ═════════
   Piecewise x-t over 10 s:
   A 0-3 s  speed up      x = t²            v = 2t
   B 3-5 s  cruise        x = 9 + 6(t-3)    v = 6
   C 5-7 s  rest (highest!) x = 21          v = 0
   D 7-10 s reverse       x = 21 - 5(t-7)   v = -5                    */
const SL_T = 10;
const SL_XMAX = 24;

function slX(t: number): number {
  if (t < 3) return t * t;
  if (t < 5) return 9 + 6 * (t - 3);
  if (t < 7) return 21;
  return 21 - 5 * (t - 7);
}

function slV(t: number): number {
  if (t < 3) return 2 * t;
  if (t < 5) return 6;
  if (t < 7) return 0;
  return -5;
}

function slStatus(t: number): { msg: string; col: string } {
  if (t < 3) return { msg: 'slope growing - moving forward, SPEEDING UP', col: C.green };
  if (t < 5) return { msg: 'straight line - uniform velocity, v = +6 m/s', col: C.green };
  if (t < 7) return { msg: 'flat - AT REST. Highest point, yet zero speed!', col: C.amber };
  return { msg: 'negative slope - moving BACKWARD, v = −5 m/s', col: C.red };
}

const slope = { t: 0, playing: false };

const slopeSketch = (p: p5) => {
  const holder = document.getElementById('mgsCanvas')!;
  const M = { l: 60, r: 24, t: 66, b: 46 };
  const canvasH = () => Math.max(400, Math.min(540, Math.round(holder.clientWidth * 0.48)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    if (slope.playing) {
      slope.t += p.deltaTime / 1000;
      if (slope.t >= SL_T) {
        slope.t = SL_T;
        slope.playing = false;
        playBtnLabel('mgsPlay', false);
      }
      (document.getElementById('mgsT') as HTMLInputElement).value = String(slope.t);
    }

    const GX = (t: number) => M.l + (t / SL_T) * (p.width - M.l - M.r);
    const GY = (x: number) => p.height - M.b - (x / SL_XMAX) * (p.height - M.t - M.b);
    const Sx = (p.width - M.l - M.r) / SL_T;    // px per s
    const Sy = (p.height - M.t - M.b) / SL_XMAX; // px per m

    p.background(C.paper);

    /* grid + axes */
    p.stroke(41, 89, 144, 30);
    p.strokeWeight(1);
    for (let t = 0; t <= SL_T; t += 1) p.line(GX(t), M.t, GX(t), p.height - M.b);
    for (let x = 0; x <= SL_XMAX; x += 4) p.line(M.l, GY(x), p.width - M.r, GY(x));
    p.stroke(C.navy);
    p.strokeWeight(2);
    p.line(M.l, p.height - M.b, p.width - M.r, p.height - M.b);
    p.line(M.l, M.t, M.l, p.height - M.b);
    p.noStroke();
    p.fill(C.dark);
    p.textFont('DM Sans');
    p.textSize(12);
    p.textAlign(p.CENTER, p.TOP);
    for (let t = 0; t <= SL_T; t += 2) p.text(`${t}`, GX(t), p.height - M.b + 8);
    p.textAlign(p.RIGHT, p.CENTER);
    for (let x = 0; x <= SL_XMAX; x += 8) p.text(`${x}`, M.l - 8, GY(x));
    chip(p, 'x (m)', M.l + 6, M.t - 24, 'left', 12.5, C.dark);
    chip(p, 't (s)', p.width - M.r - 4, p.height - M.b - 28, 'right', 12.5, C.dark);

    /* the x-t curve */
    p.noFill();
    p.stroke(C.dark);
    p.strokeWeight(3);
    p.beginShape();
    for (let i = 0; i <= 300; i++) {
      const t = (i / 300) * SL_T;
      p.vertex(GX(t), GY(slX(t)));
    }
    p.endShape();

    /* segment captions */
    chip(p, 'speeding up', GX(1.5), GY(slX(1.5)) - 30, 'center', 12, C.dark);
    chip(p, 'cruise', GX(4), GY(slX(4)) - 30, 'center', 12, C.dark);
    chip(p, 'rest', GX(6), GY(21) - 30, 'center', 12, C.dark);
    chip(p, 'reversing', GX(8.5), GY(slX(8.5)) - 30, 'center', 12, C.dark);

    /* tangent + cursor */
    const t = slope.t;
    const cx = GX(t), cy = GY(slX(t));
    const v = slV(t);
    const slopePix = -v * (Sy / Sx);           // screen-space dy/dx
    const dx = 70;
    p.stroke(C.red);
    p.strokeWeight(2.6);
    p.line(cx - dx, cy - slopePix * dx, cx + dx, cy + slopePix * dx);
    p.noStroke();
    p.fill(C.navy);
    p.circle(cx, cy, 15);
    p.fill(C.accent);
    p.circle(cx, cy, 9);

    /* readouts */
    const st = slStatus(t);
    chip(p, `t = ${t.toFixed(1)} s   x = ${slX(t).toFixed(1)} m`, p.width - M.r - 4, 6, 'right', 14, C.navy);
    chip(p, `slope = v = ${v >= 0 ? '+' : ''}${v.toFixed(1)} m/s`, p.width - M.r - 4, 32, 'right', 18, C.red);
    chip(p, st.msg, M.l + 8, 6, 'left', 14.5, st.col);
  };
};

function slopeWire() {
  const sl = document.getElementById('mgsT') as HTMLInputElement;
  sl.addEventListener('input', () => {
    slope.t = +sl.value;
    slope.playing = false;
    playBtnLabel('mgsPlay', false);
  });
  document.getElementById('mgsPlay')!.addEventListener('click', () => {
    if (slope.t >= SL_T) slope.t = 0;
    slope.playing = !slope.playing;
    playBtnLabel('mgsPlay', slope.playing);
  });
  document.getElementById('mgsReset')!.addEventListener('click', () => {
    slope.t = 0;
    slope.playing = false;
    playBtnLabel('mgsPlay', false);
    sl.value = '0';
  });
}

/* ═════════ Pane 2 · x-t is NOT the path ═════════ */
type PathMode = 'uniform' | 'accel' | 'return';
const PATH_T = 10;

const path = { mode: 'accel' as PathMode, t: 0, playing: false };

function pathX(t: number): number {
  if (path.mode === 'uniform') return 3 * t;
  if (path.mode === 'accel') return 0.3 * t * t;
  return 6 * t - 0.6 * t * t;   // out to 15 m at t = 5, back to 0
}

const pathSketch = (p: p5) => {
  const holder = document.getElementById('mgpCanvas')!;
  const canvasH = () => Math.max(430, Math.min(560, Math.round(holder.clientWidth * 0.52)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    if (path.playing) {
      path.t += p.deltaTime / 1000;
      if (path.t >= PATH_T) {
        path.t = PATH_T;
        path.playing = false;
        playBtnLabel('mgpPlay', false);
      }
    }

    p.background(C.paper);
    p.textFont('DM Sans');

    /* ── top strip: the real world, a flat road ── */
    const roadY = 86;
    const RL = 70, RR = p.width - 30;
    const RX = (x: number) => RL + (x / 30) * (RR - RL);

    p.noStroke();
    p.fill(C.dark);
    p.textSize(13.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text('THE REAL WORLD: a car on a flat, straight road', RL, 12);

    p.stroke(C.navy);
    p.strokeWeight(3);
    p.line(RL, roadY, RR, roadY);
    p.stroke(41, 89, 144, 70);
    p.strokeWeight(1);
    p.noStroke();
    p.fill(C.dark);
    p.textSize(11.5);
    p.textAlign(p.CENTER, p.TOP);
    for (let x = 0; x <= 30; x += 5) {
      p.stroke(41, 89, 144, 90);
      p.line(RX(x), roadY - 4, RX(x), roadY + 4);
      p.noStroke();
      p.text(`${x}`, RX(x), roadY + 8);
    }
    p.text('position x (m)', (RL + RR) / 2, roadY + 24);

    /* the car */
    const xNow = Math.max(pathX(path.t), 0);
    const carX = RX(xNow);
    p.noStroke();
    p.fill(C.accent);
    p.rect(carX - 16, roadY - 22, 32, 14, 5);
    p.fill(C.navy);
    p.circle(carX - 8, roadY - 6, 9);
    p.circle(carX + 8, roadY - 6, 9);

    /* ── bottom: the graph it produces ── */
    const M = { l: 70, r: 30, t: roadY + 56, b: 40 };
    const GX = (t: number) => M.l + (t / PATH_T) * (p.width - M.l - M.r);
    const GY = (x: number) => p.height - M.b - (x / 32) * (p.height - M.t - M.b);

    p.noStroke();
    p.fill(C.dark);
    p.textSize(13.5);
    p.textAlign(p.LEFT, p.BOTTOM);
    p.text('THE GRAPH: x-t, drawn from the same motion', M.l, M.t - 8);

    p.stroke(41, 89, 144, 30);
    p.strokeWeight(1);
    for (let t = 0; t <= PATH_T; t += 1) p.line(GX(t), M.t, GX(t), p.height - M.b);
    for (let x = 0; x <= 32; x += 8) p.line(M.l, GY(x), p.width - M.r, GY(x));
    p.stroke(C.navy);
    p.strokeWeight(2);
    p.line(M.l, p.height - M.b, p.width - M.r, p.height - M.b);
    p.line(M.l, M.t, M.l, p.height - M.b);
    p.noStroke();
    p.fill(C.dark);
    p.textSize(11.5);
    p.textAlign(p.CENTER, p.TOP);
    for (let t = 0; t <= PATH_T; t += 2) p.text(`${t}`, GX(t), p.height - M.b + 6);
    p.textAlign(p.RIGHT, p.CENTER);
    for (let x = 0; x <= 32; x += 8) p.text(`${x}`, M.l - 6, GY(x));
    p.textAlign(p.RIGHT, p.BOTTOM);
    p.text('t (s)', p.width - M.r, p.height - M.b - 4);

    /* trace so far */
    p.noFill();
    p.stroke(C.red);
    p.strokeWeight(3);
    p.beginShape();
    const steps = Math.max(2, Math.floor(path.t * 30));
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * path.t;
      p.vertex(GX(t), GY(Math.max(pathX(t), 0)));
    }
    p.endShape();
    p.noStroke();
    p.fill(C.red);
    p.circle(GX(path.t), GY(xNow), 9);

    /* connector: same instant, two views */
    p.stroke(C.amber);
    p.strokeWeight(1.4);
    p.drawingContext.setLineDash([4, 5]);
    p.line(carX, roadY - 26, GX(path.t), GY(xNow));
    p.drawingContext.setLineDash([]);

    /* the message */
    if (path.t > PATH_T * 0.45) {
      const msg = path.mode === 'accel'
        ? 'The road is FLAT. The graph CURVES.\nThe graph is not a picture of the path.'
        : path.mode === 'return'
          ? 'The car never leaves the road,\nyet the graph rises and falls.'
          : 'Straight line: equal metres\nin equal seconds.';
      chip(p, msg, p.width - M.r - 4, M.t + 8, 'right', 14.5, C.navy);
    }
    if (path.t === 0) {
      chip(p, 'Press Play', p.width - 34, 12, 'right', 14, C.dark);
    }
  };
};

function pathWire() {
  const sel = document.getElementById('mgpMode') as HTMLSelectElement;
  sel.addEventListener('change', () => {
    path.mode = sel.value as PathMode;
    path.t = 0;
    path.playing = false;
    playBtnLabel('mgpPlay', false);
  });
  document.getElementById('mgpPlay')!.addEventListener('click', () => {
    if (path.t >= PATH_T) path.t = 0;
    path.playing = !path.playing;
    playBtnLabel('mgpPlay', path.playing);
  });
  document.getElementById('mgpReset')!.addEventListener('click', () => {
    path.t = 0;
    path.playing = false;
    playBtnLabel('mgpPlay', false);
  });
}

/* ═════════ Pane 3 · Area Builder ═════════ */
type AreaPreset = 'ramp' | 'tri' | 'rev';

interface AreaDef {
  T: number;
  vMin: number;
  vMax: number;
  v: (t: number) => number;
  summary: string;
}

const AREAS: Record<AreaPreset, AreaDef> = {
  ramp: {
    T: 10, vMin: 0, vMax: 22,
    v: (t) => (t < 4 ? 5 * t : 20),
    summary: 'Triangle ½·4·20 = 40 m, then rectangle 6·20 = 120 m. Total 160 m.',
  },
  tri: {
    T: 9, vMin: 0, vMax: 32,
    v: (t) => (t < 3 ? 10 * t : 30 - 5 * (t - 3)),
    summary: 'One big triangle: ½ × base 9 s × height 30 = 135 m.',
  },
  rev: {
    T: 6, vMin: -7, vMax: 7,
    v: (t) => (t < 4 ? 5 : -5),
    summary: 'Above: +20 m. Below: −10 m. Displacement 20 − 10 = 10 m, distance 20 + 10 = 30 m.',
  },
};

const area = {
  preset: 'ramp' as AreaPreset,
  t: 0,
  playing: false,
  disp: 0,
  dist: 0,
};

function areaReset() {
  area.t = 0;
  area.disp = 0;
  area.dist = 0;
  area.playing = false;
  playBtnLabel('mgaPlay', false);
}

const areaSketch = (p: p5) => {
  const holder = document.getElementById('mgaCanvas')!;
  const M = { l: 64, r: 24, t: 84, b: 46 };
  const canvasH = () => Math.max(400, Math.min(540, Math.round(holder.clientWidth * 0.48)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    const D = AREAS[area.preset];

    if (area.playing) {
      const dt = (p.deltaTime / 1000) * (D.T / 8);   // full sweep ≈ 8 s on screen
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        if (area.t >= D.T) break;
        const h = Math.min(dt / steps, D.T - area.t);
        const vv = D.v(area.t + h / 2);
        area.disp += vv * h;
        area.dist += Math.abs(vv) * h;
        area.t += h;
      }
      if (area.t >= D.T) {
        area.t = D.T;
        area.playing = false;
        playBtnLabel('mgaPlay', false);
      }
    }

    const GX = (t: number) => M.l + (t / D.T) * (p.width - M.l - M.r);
    const GY = (v: number) => {
      const span = D.vMax - D.vMin;
      return p.height - M.b - ((v - D.vMin) / span) * (p.height - M.t - M.b);
    };

    p.background(C.paper);
    p.textFont('DM Sans');

    /* grid + axes */
    p.stroke(41, 89, 144, 30);
    p.strokeWeight(1);
    for (let t = 0; t <= D.T; t += 1) p.line(GX(t), M.t, GX(t), p.height - M.b);
    p.stroke(C.navy);
    p.strokeWeight(2);
    p.line(M.l, GY(0), p.width - M.r, GY(0));    // time axis at v = 0
    p.line(M.l, M.t, M.l, p.height - M.b);
    p.noStroke();
    p.fill(C.dark);
    p.textSize(12);
    p.textAlign(p.CENTER, p.TOP);
    for (let t = 0; t <= D.T; t += 1) p.text(`${t}`, GX(t), p.height - M.b + 8);
    chip(p, 'v (m/s)', M.l + 6, M.t - 24, 'left', 12.5, C.dark);
    chip(p, 't (s)', p.width - M.r - 4, GY(0) + 8, 'right', 12.5, C.dark);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text(`${D.vMax - 2}`, M.l - 6, GY(D.vMax - 2));
    if (D.vMin < 0) p.text(`${D.vMin + 2}`, M.l - 6, GY(D.vMin + 2));

    /* filled area up to tNow, green above the axis, red below */
    p.noStroke();
    const n = Math.max(2, Math.floor(area.t * 40));
    for (let i = 0; i < n; i++) {
      const t1 = (i / n) * area.t;
      const t2 = ((i + 1) / n) * area.t;
      const vv = D.v((t1 + t2) / 2);
      p.fill(vv >= 0 ? p.color(22, 163, 74, 70) : p.color(225, 29, 72, 70));
      p.rect(GX(t1), Math.min(GY(0), GY(vv)), GX(t2) - GX(t1) + 0.7, Math.abs(GY(vv) - GY(0)));
    }

    /* the full v-t curve */
    p.noFill();
    p.stroke(C.dark);
    p.strokeWeight(3);
    p.beginShape();
    for (let i = 0; i <= 300; i++) {
      const t = (i / 300) * D.T;
      p.vertex(GX(t), GY(D.v(t)));
    }
    p.endShape();

    /* decomposition helper for the ramp */
    if (area.preset === 'ramp') {
      p.stroke(C.amber);
      p.strokeWeight(1.6);
      p.drawingContext.setLineDash([5, 5]);
      p.line(GX(4), GY(0), GX(4), GY(20));
      p.drawingContext.setLineDash([]);
    }

    /* cursor */
    if (area.t > 0) {
      p.stroke(C.navy);
      p.strokeWeight(1.6);
      p.line(GX(area.t), M.t, GX(area.t), p.height - M.b);
    }

    /* counters */
    chip(p, `displacement = ${area.disp.toFixed(1)} m`, M.l + 8, 6, 'left', 16, C.green);
    chip(p, `distance = ${area.dist.toFixed(1)} m`, M.l + 8, 34, 'left', 16, C.red);
    chip(
      p,
      area.preset === 'rev'
        ? 'below the axis: displacement falls,\ndistance keeps rising'
        : 'all above the axis:\ndisplacement = distance',
      p.width - M.r - 4, 6, 'right', 13, C.dark
    );

    if (area.t >= AREAS[area.preset].T) {
      chip(p, AREAS[area.preset].summary, p.width / 2, p.height - M.b - 34, 'center', 14.5, C.navy);
    }
  };
};

function areaWire() {
  const sel = document.getElementById('mgaPreset') as HTMLSelectElement;
  sel.addEventListener('change', () => {
    area.preset = sel.value as AreaPreset;
    areaReset();
  });
  document.getElementById('mgaPlay')!.addEventListener('click', () => {
    if (area.t >= AREAS[area.preset].T) { area.t = 0; area.disp = 0; area.dist = 0; }
    area.playing = !area.playing;
    playBtnLabel('mgaPlay', area.playing);
  });
  document.getElementById('mgaReset')!.addEventListener('click', areaReset);
}

/* ═════════ Pane 4 · Shape Ladder ═════════ */
type LadderMode = 'rest' | 'uniform' | 'accel' | 'slow';

interface LadderDef {
  x: (t: number) => number;
  v: (t: number) => number;
  a: number;
  shapes: [string, string, string];   // x-t, v-t, a-t
}

const LADDERS: Record<LadderMode, LadderDef> = {
  rest:    { x: () => 12,               v: () => 0,           a: 0,  shapes: ['horizontal', 'on the axis', 'on the axis'] },
  uniform: { x: (t) => 4 * t,           v: () => 4,           a: 0,  shapes: ['straight slope', 'horizontal', 'on the axis'] },
  accel:   { x: (t) => t * t,           v: (t) => 2 * t,      a: 2,  shapes: ['parabola', 'straight slope', 'horizontal'] },
  slow:    { x: (t) => 12 * t - t * t,  v: (t) => 12 - 2 * t, a: -2, shapes: ['parabola (flattening)', 'falling line', 'horizontal (below axis)'] },
};

const LAD_T = 6;
const ladder = { mode: 'accel' as LadderMode, t: 0, playing: false };

const ladderSketch = (p: p5) => {
  const holder = document.getElementById('mglCanvas')!;
  const canvasH = () => Math.max(380, Math.min(500, Math.round(holder.clientWidth * 0.4)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    if (ladder.playing) {
      ladder.t += (p.deltaTime / 1000) * (LAD_T / 6);
      if (ladder.t >= LAD_T) {
        ladder.t = LAD_T;
        ladder.playing = false;
        playBtnLabel('mglPlay', false);
      }
    }

    const D = LADDERS[ladder.mode];
    p.background(C.paper);
    p.textFont('DM Sans');

    /* three panels: x-t | v-t | a-t */
    const gapW = 64;
    const outer = 18;
    const pw = (p.width - outer * 2 - gapW * 2) / 3;
    const top = 46, bot = p.height - 52;

    const panels: Array<{
      x0: number;
      title: string;
      fn: (t: number) => number;
      min: number;
      max: number;
      shape: string;
    }> = [
      { x0: outer,                   title: 'x-t', fn: D.x,       min: 0,   max: 40, shape: D.shapes[0] },
      { x0: outer + pw + gapW,       title: 'v-t', fn: D.v,       min: -6,  max: 14, shape: D.shapes[1] },
      { x0: outer + 2 * (pw + gapW), title: 'a-t', fn: () => D.a, min: -4,  max: 4,  shape: D.shapes[2] },
    ];

    for (const pn of panels) {
      const GX = (t: number) => pn.x0 + (t / LAD_T) * pw;
      const GY = (val: number) => bot - ((val - pn.min) / (pn.max - pn.min)) * (bot - top);

      /* frame + zero line */
      p.noFill();
      p.stroke(41, 89, 144, 60);
      p.strokeWeight(1.4);
      p.rect(pn.x0, top, pw, bot - top, 10);
      p.stroke(C.navy);
      p.strokeWeight(1.8);
      p.line(pn.x0, GY(0), pn.x0 + pw, GY(0));
      p.noStroke();
      p.fill(C.navy);
      p.textSize(16);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.text(pn.title, pn.x0 + pw / 2, top - 8);
      p.fill(C.dark);
      p.textSize(10.5);
      p.textAlign(p.LEFT, p.CENTER);
      p.text('0', pn.x0 + 3, GY(0) - 7);

      /* curve up to tNow */
      p.noFill();
      p.stroke(C.red);
      p.strokeWeight(3);
      p.beginShape();
      const n = Math.max(2, Math.floor(ladder.t * 40));
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * ladder.t;
        p.vertex(GX(t), GY(pn.fn(t)));
      }
      p.endShape();
      if (ladder.t > 0) {
        p.noStroke();
        p.fill(C.red);
        p.circle(GX(ladder.t), GY(pn.fn(ladder.t)), 8);
      }

      /* shape label once finished */
      if (ladder.t >= LAD_T) {
        p.noStroke();
        p.fill(C.green);
        p.textSize(13.5);
        p.textAlign(p.CENTER, p.TOP);
        p.text(pn.shape, pn.x0 + pw / 2, bot + 8);
      }
    }

    /* chain arrows between panels */
    const midY = (top + bot) / 2;
    for (const gx of [outer + pw, outer + 2 * pw + gapW]) {
      p.stroke(C.accent);
      p.strokeWeight(2.2);
      arrow(p, gx + 10, midY - 16, gx + gapW - 10, midY - 16);
      arrow(p, gx + gapW - 10, midY + 24, gx + 10, midY + 24);
      p.noStroke();
      p.fill(C.accent);
      p.textSize(11);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.text('slope', gx + gapW / 2, midY - 20);
      p.textAlign(p.CENTER, p.TOP);
      p.text('area', gx + gapW / 2, midY + 28);
    }

    /* footer key */
    p.noStroke();
    p.fill(C.dark);
    p.textSize(12.5);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text(
      'slope (differentiate) lowers the degree →   |   ← area (integrate) raises it',
      p.width / 2, p.height - 6
    );

    if (ladder.t === 0) {
      chip(p, 'Press Play', outer + 4, 6, 'left', 14, C.dark);
    }
  };
};

function ladderWire() {
  const sel = document.getElementById('mglMode') as HTMLSelectElement;
  sel.addEventListener('change', () => {
    ladder.mode = sel.value as LadderMode;
    ladder.t = 0;
    ladder.playing = false;
    playBtnLabel('mglPlay', false);
  });
  document.getElementById('mglPlay')!.addEventListener('click', () => {
    if (ladder.t >= LAD_T) ladder.t = 0;
    ladder.playing = !ladder.playing;
    playBtnLabel('mglPlay', ladder.playing);
  });
  document.getElementById('mglReset')!.addEventListener('click', () => {
    ladder.t = 0;
    ladder.playing = false;
    playBtnLabel('mglPlay', false);
  });
}

/* ═════════ Pane 5 · Rapid Quiz ═════════ */
interface MgQ { q: string; opts: string[]; correct: number; fb: string; }

const mgQs: MgQ[] = [
  {
    q: 'Going DOWN the chain x → v → a, what do you take from the graph?',
    opts: ['The area under it', 'The slope', 'The height of the curve'],
    correct: 1,
    fb: 'Down the chain = differentiate = slope. Slope of x-t is v, slope of v-t is a.',
  },
  {
    q: 'An x-t graph is a steep, straight, rising line. The object is...',
    opts: ['Moving fast at constant velocity', 'High above the ground', 'Accelerating'],
    correct: 0,
    fb: 'Steep = fast. Straight = uniform velocity. And the graph says nothing about height - it plots coordinate vs time.',
  },
  {
    q: 'An x-t graph is horizontal. The object is...',
    opts: ['Moving at constant velocity', 'At rest', 'Lying flat on the ground'],
    correct: 1,
    fb: 'Position is not changing, so it is at rest. Never read the graph as a picture of the object.',
  },
  {
    q: 'A v-t line is falling, but still ABOVE the time axis. The object is...',
    opts: ['Moving backward', 'At rest', 'Moving forward and slowing down'],
    correct: 2,
    fb: 'Above the axis: v is positive, so it moves forward. Falling line: a is negative, so it slows. Slope sign is not velocity sign.',
  },
  {
    q: 'The area under a v-t graph gives...',
    opts: ['Displacement', 'Acceleration', 'Distance, always'],
    correct: 0,
    fb: 'Area under v-t = displacement (it carries sign). It equals distance only while the graph stays above the axis.',
  },
  {
    q: 'The area under an a-t graph gives...',
    opts: ['Displacement', 'The change in velocity Δv', 'The final velocity, always'],
    correct: 1,
    fb: 'Area under a-t = Δv. It equals the final velocity only if the object started from rest.',
  },
  {
    q: 'A v-t graph spends time above AND below the axis. Distance = ?',
    opts: ['Area above − area below', 'Area above + area below (magnitudes)', 'The same as displacement'],
    correct: 1,
    fb: 'Distance adds magnitudes; displacement subtracts. This is Lecture 1 distance vs displacement, drawn as regions.',
  },
  {
    q: 'On a curved x-t graph, speed is greatest where the curve is...',
    opts: ['Highest', 'Flattest', 'Steepest'],
    correct: 2,
    fb: 'Speed is the slope, not the height. Highest with a flat top actually means at rest.',
  },
  {
    q: 'For uniform acceleration, the x-t graph is a...',
    opts: ['Parabola', 'Straight slanted line', 'Horizontal line'],
    correct: 0,
    fb: 'The shape ladder: constant a gives a flat a-t, a straight-line v-t and a parabolic x-t.',
  },
  {
    q: 'Going UP the chain a → v → x, taking the area does what to the shape?',
    opts: ['Keeps the shape the same', 'Lowers the degree: parabola → line', 'Raises the degree: flat → line → parabola'],
    correct: 2,
    fb: 'Integration raises the degree. A flat a-t builds a sloped v-t, which builds a parabolic x-t.',
  },
];

let mgqIdx = 0;
const mgqAnswered: boolean[] = new Array(mgQs.length).fill(false);

function mgqRender() {
  const item = mgQs[mgqIdx];
  document.getElementById('mgqTag')!.textContent = `Graph rapid fire · Question ${mgqIdx + 1} / ${mgQs.length}`;
  document.getElementById('mgqQ')!.textContent = item.q;
  const fb = document.getElementById('mgqFb')!;
  fb.classList.remove('shown');
  fb.textContent = item.fb;

  const holder = document.getElementById('mgqOpts')!;
  holder.innerHTML = '';
  item.opts.forEach((opt, i) => {
    const b = document.createElement('button');
    b.className = 'rev-opt';
    b.textContent = opt;
    b.addEventListener('click', () => {
      if (mgqAnswered[mgqIdx]) return;
      mgqAnswered[mgqIdx] = true;
      holder.querySelectorAll('button').forEach((x, j) => {
        (x as HTMLButtonElement).disabled = true;
        if (j === item.correct) x.classList.add('correct');
      });
      if (i !== item.correct) b.classList.add('wrong');
      fb.classList.add('shown');
    });
    holder.appendChild(b);
  });
}

function mgqWire() {
  document.getElementById('mgqPrev')!.addEventListener('click', () => {
    if (mgqIdx > 0) { mgqIdx--; mgqRender(); }
  });
  document.getElementById('mgqNext')!.addEventListener('click', () => {
    if (mgqIdx < mgQs.length - 1) { mgqIdx++; mgqRender(); }
  });
  mgqRender();
}

/* ═════════ Pane 6 · Worked Examples ═════════
   A step-through solver. Each example is a v-t graph plus an ordered
   list of solution steps; each step can reveal a slope triangle, grow
   the shaded area, or drop a final answer. The canvas animates the
   newest area fill so the "area = displacement" idea is felt, not told. */
interface WStep {
  text: string;
  fillTo?: number;             // grow signed area fill from 0 to this t
  slopeTri?: [number, number]; // draw a rise/run slope triangle t=a..b
  flatSeg?: [number, number];  // highlight a flat (zero-slope) segment
  answer?: string;             // big answer chip on the canvas
}
interface WEx {
  tag: string;
  problem: string;
  T: number;
  vMin: number;
  vMax: number;
  v: (t: number) => number;
  steps: WStep[];
}

const WORKED: Record<string, WEx> = {
  slope: {
    tag: 'Lecture 6 · Slope of a v-t graph',
    problem: 'A v-t graph rises straight from 0 to 20 m/s in the first 4 s, then stays flat at 20 m/s. Find the acceleration in each phase.',
    T: 10, vMin: 0, vMax: 24,
    v: (t) => (t < 4 ? 5 * t : 20),
    steps: [
      { text: 'Going DOWN the chain (v → a), acceleration is the SLOPE of the v-t graph. Read each phase separately.' },
      { text: 'Phase 1 (0-4 s): a = slope = rise / run = (20 − 0) / (4 − 0) = 5 m/s².', slopeTri: [0, 4] },
      { text: 'Phase 2 (4-10 s): the line is flat, so slope = 0 and a = 0. Uniform velocity at 20 m/s.', flatSeg: [4, 10] },
      { text: 'Trap: zero acceleration does not mean zero velocity - the body keeps cruising at 20 m/s.', answer: 'a = 5 m/s², then 0' },
    ],
  },
  tri: {
    tag: 'Lecture 7 · Displacement from a triangle',
    problem: 'A v-t graph rises 0 → 30 m/s over 3 s, then falls 30 → 0 m/s over 6 s. How far does the body travel?',
    T: 9, vMin: 0, vMax: 32,
    v: (t) => (t < 3 ? 10 * t : 30 - 5 * (t - 3)),
    steps: [
      { text: 'Going UP the chain (v → x), displacement is the AREA under the v-t graph.' },
      { text: 'The whole shape is one triangle: base = 3 + 6 = 9 s, height = 30 m/s.', fillTo: 9 },
      { text: 'Displacement = area = ½ · base · height = ½ · 9 · 30 = 135 m.', answer: '135 m' },
      { text: 'The graph never dips below the axis, so distance = displacement = 135 m.' },
    ],
  },
  sign: {
    tag: 'Lecture 7 · The sign of area',
    problem: 'A v-t graph is +5 m/s for 4 s, then −5 m/s for 2 s. Find the displacement and the distance.',
    T: 6, vMin: -7, vMax: 7,
    v: (t) => (t < 4 ? 5 : -5),
    steps: [
      { text: 'Area under v-t is displacement - and the area carries a sign.' },
      { text: 'Above the axis (green): 5 × 4 = +20 m.', fillTo: 4 },
      { text: 'Below the axis (red): 5 × 2 = −10 m.', fillTo: 6 },
      { text: 'Displacement = +20 − 10 = 10 m. The signs subtract.', answer: 'disp 10 m · dist 30 m' },
      { text: 'Distance = 20 + 10 = 30 m. Magnitudes add. This is distance vs displacement, drawn as regions.' },
    ],
  },
  ramp: {
    tag: 'Lecture 7 · Mixed problem',
    problem: 'A v-t graph rises 0 → 20 m/s over 4 s, then holds 20 m/s for 6 s. Find the acceleration in the first phase and the total displacement.',
    T: 10, vMin: 0, vMax: 24,
    v: (t) => (t < 4 ? 5 * t : 20),
    steps: [
      { text: 'One problem, both keys: acceleration is the slope of the ramp, displacement is the area under the whole graph.' },
      { text: 'Phase 1: a = slope = 20 / 4 = 5 m/s².', slopeTri: [0, 4] },
      { text: 'Triangle (0-4 s): area = ½ · 4 · 20 = 40 m.', fillTo: 4 },
      { text: 'Rectangle (4-10 s): area = 6 · 20 = 120 m.', fillTo: 10 },
      { text: 'Total displacement = 40 + 120 = 160 m.', answer: 'a = 5 m/s² · s = 160 m' },
    ],
  },
  conv: {
    tag: 'Lecture 7 · Convert one graph to the others',
    problem: 'A v-t graph is a straight line from (0, 0) to (5 s, 10 m/s). Find the a-t and x-t graphs.',
    T: 5, vMin: 0, vMax: 12,
    v: (t) => 2 * t,
    steps: [
      { text: 'Slope going down gives a; area going up gives x. One motion, three graphs.' },
      { text: 'a = slope = 10 / 5 = 2 m/s². Constant, so the a-t graph is a flat line at 2.', slopeTri: [0, 5] },
      { text: 'Area up to time t = ½ · t · (2t) = t². So x = t².', fillTo: 5 },
      { text: 'x-t is a parabola opening upward. Flat a → sloped v → parabolic x: the shape ladder, climbed.', answer: 'a = 2 m/s² · x = t²' },
    ],
  },
};

const worked = { key: 'slope', idx: 0, fill: 0 };

function workedRevealedSteps(): WStep[] {
  return WORKED[worked.key].steps.slice(0, worked.idx + 1);
}

function workedFillTarget(): number {
  let target = 0;
  for (const s of workedRevealedSteps()) if (s.fillTo !== undefined) target = Math.max(target, s.fillTo);
  return target;
}

function workedRenderSteps() {
  const D = WORKED[worked.key];
  document.getElementById('mgwTag')!.textContent = D.tag;
  document.getElementById('mgwProblem')!.textContent = D.problem;
  const holder = document.getElementById('mgwSteps')!;
  holder.innerHTML = '';
  workedRevealedSteps().forEach((s, i) => {
    const el = document.createElement('div');
    el.className = 'mgw-step';
    if (s.answer) el.classList.add('answer');
    else if (i === worked.idx) el.classList.add('latest');
    el.innerHTML = s.answer ? `<b>${s.text}</b>` : s.text;
    holder.appendChild(el);
  });
  const next = document.getElementById('mgwNext') as HTMLButtonElement;
  next.disabled = worked.idx >= D.steps.length - 1;
  next.textContent = worked.idx >= D.steps.length - 1 ? 'Solved ✓' : 'Next step ›';
  (document.getElementById('mgwPrev') as HTMLButtonElement).disabled = worked.idx <= 0;
}

const workedSketch = (p: p5) => {
  const holder = document.getElementById('mgwCanvas')!;
  const M = { l: 64, r: 24, t: 60, b: 46 };
  const canvasH = () => Math.max(400, Math.min(540, Math.round(holder.clientWidth * 0.48)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    const D = WORKED[worked.key];

    /* ease the shaded area toward the revealed target */
    const target = workedFillTarget();
    worked.fill += (target - worked.fill) * Math.min(1, (p.deltaTime / 1000) * 5);
    if (Math.abs(target - worked.fill) < 0.02) worked.fill = target;

    const GX = (t: number) => M.l + (t / D.T) * (p.width - M.l - M.r);
    const GY = (v: number) => {
      const span = D.vMax - D.vMin;
      return p.height - M.b - ((v - D.vMin) / span) * (p.height - M.t - M.b);
    };

    p.background(C.paper);
    p.textFont('DM Sans');

    /* grid + axes (time axis sits at v = 0) */
    p.stroke(41, 89, 144, 30);
    p.strokeWeight(1);
    for (let t = 0; t <= D.T; t += 1) p.line(GX(t), M.t, GX(t), p.height - M.b);
    p.stroke(C.navy);
    p.strokeWeight(2);
    p.line(M.l, GY(0), p.width - M.r, GY(0));
    p.line(M.l, M.t, M.l, p.height - M.b);
    p.noStroke();
    p.fill(C.dark);
    p.textSize(12);
    p.textAlign(p.CENTER, p.TOP);
    for (let t = 0; t <= D.T; t += 1) p.text(`${t}`, GX(t), p.height - M.b + 8);
    chip(p, 'v (m/s)', M.l + 6, M.t - 24, 'left', 12.5, C.dark);
    chip(p, 't (s)', p.width - M.r - 4, GY(0) + 8, 'right', 12.5, C.dark);

    /* shaded signed area up to the eased fill boundary */
    if (worked.fill > 0.001) {
      p.noStroke();
      const n = Math.max(2, Math.floor(worked.fill * 40));
      for (let i = 0; i < n; i++) {
        const t1 = (i / n) * worked.fill;
        const t2 = ((i + 1) / n) * worked.fill;
        const vv = D.v((t1 + t2) / 2);
        p.fill(vv >= 0 ? p.color(22, 163, 74, 70) : p.color(225, 29, 72, 70));
        p.rect(GX(t1), Math.min(GY(0), GY(vv)), GX(t2) - GX(t1) + 0.7, Math.abs(GY(vv) - GY(0)));
      }
    }

    /* the full v-t curve */
    p.noFill();
    p.stroke(C.dark);
    p.strokeWeight(3);
    p.beginShape();
    for (let i = 0; i <= 300; i++) {
      const t = (i / 300) * D.T;
      p.vertex(GX(t), GY(D.v(t)));
    }
    p.endShape();

    /* revealed slope triangles + flat-segment highlights */
    let answer = '';
    for (const s of workedRevealedSteps()) {
      if (s.answer) answer = s.answer;
      if (s.flatSeg) {
        const [a, b] = s.flatSeg;
        p.stroke(C.amber);
        p.strokeWeight(5);
        p.line(GX(a), GY(D.v((a + b) / 2)), GX(b), GY(D.v((a + b) / 2)));
        chip(p, 'slope 0', GX((a + b) / 2), GY(D.v((a + b) / 2)) - 30, 'center', 12.5, C.amber);
      }
      if (s.slopeTri) {
        const [a, b] = s.slopeTri;
        const va = D.v(a), vb = D.v(b);
        p.stroke(C.red);
        p.strokeWeight(2);
        p.drawingContext.setLineDash([5, 5]);
        p.line(GX(a), GY(va), GX(b), GY(va));   // run
        p.line(GX(b), GY(va), GX(b), GY(vb));   // rise
        p.drawingContext.setLineDash([]);
        chip(p, `run ${b - a} s`, GX((a + b) / 2), GY(va) + 6, 'center', 12, C.red);
        const nearRight = b > D.T * 0.7;
        chip(
          p, `rise ${vb - va} m/s`,
          nearRight ? GX(b) - 8 : GX(b) + 8, GY((va + vb) / 2),
          nearRight ? 'right' : 'left', 12, C.red
        );
      }
    }

    /* answer chip */
    if (answer) chip(p, answer, p.width - M.r - 4, 8, 'right', 17, C.green);
    chip(p, `step ${worked.idx + 1} / ${D.steps.length}`, M.l + 8, 8, 'left', 13, C.dark);
  };
};

function workedResetFill() {
  worked.fill = workedFillTarget();
}

function workedWire() {
  const sel = document.getElementById('mgwPick') as HTMLSelectElement;
  sel.addEventListener('change', () => {
    worked.key = sel.value;
    worked.idx = 0;
    worked.fill = 0;
    workedRenderSteps();
  });
  document.getElementById('mgwNext')!.addEventListener('click', () => {
    if (worked.idx < WORKED[worked.key].steps.length - 1) {
      worked.idx++;
      workedRenderSteps();
    }
  });
  document.getElementById('mgwPrev')!.addEventListener('click', () => {
    if (worked.idx > 0) {
      worked.idx--;
      workedResetFill();
      workedRenderSteps();
    }
  });
  document.getElementById('mgwReset')!.addEventListener('click', () => {
    worked.idx = 0;
    worked.fill = 0;
    workedRenderSteps();
  });
  workedRenderSteps();
}

/* ═════════ Pane 7 · Homework (reveal toggles) ═════════ */
function homeworkWire() {
  document.querySelectorAll<HTMLButtonElement>('#mgHwk .hw-reveal').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ans = btn.nextElementSibling as HTMLElement | null;
      if (!ans) return;
      const shown = ans.classList.toggle('shown');
      btn.textContent = shown ? 'Hide solution' : 'Show solution';
    });
  });
}

/* ═════════ pane switching + init ═════════ */
const paneIds = ['mgSlope', 'mgPath', 'mgArea', 'mgLadder', 'mgQuiz', 'mgWorked', 'mgHwk'] as const;
type PaneId = (typeof paneIds)[number];
let currentPane: PaneId = 'mgSlope';
const sketches: Partial<Record<PaneId, p5>> = {};

const paneSketch: Partial<Record<PaneId, { sketch: (p: p5) => void; holder: string }>> = {
  mgSlope: { sketch: slopeSketch, holder: 'mgsCanvas' },
  mgPath: { sketch: pathSketch, holder: 'mgpCanvas' },
  mgArea: { sketch: areaSketch, holder: 'mgaCanvas' },
  mgLadder: { sketch: ladderSketch, holder: 'mglCanvas' },
  mgWorked: { sketch: workedSketch, holder: 'mgwCanvas' },
};

function activatePane(id: PaneId) {
  currentPane = id;
  document.querySelectorAll<HTMLElement>('#graphs .grav-pane').forEach((el) => {
    el.classList.toggle('active', el.id === id);
  });
  document.querySelectorAll<HTMLButtonElement>('#mgTabs .rev-chip').forEach((b) => {
    b.classList.toggle('active', b.dataset.pane === id);
  });
  const def = paneSketch[id];
  if (def && !sketches[id]) {
    sketches[id] = new p5(def.sketch, document.getElementById(def.holder)!);
  } else {
    sketches[id]?.windowResized?.();
  }
}

let graphsInited = false;

export function graphsScreenInit() {
  if (!graphsInited) {
    graphsInited = true;
    slopeWire();
    pathWire();
    areaWire();
    ladderWire();
    mgqWire();
    workedWire();
    homeworkWire();
    document.querySelectorAll<HTMLButtonElement>('#mgTabs .rev-chip').forEach((b) => {
      b.addEventListener('click', () => activatePane(b.dataset.pane as PaneId));
    });
  }
  activatePane(currentPane);
}
