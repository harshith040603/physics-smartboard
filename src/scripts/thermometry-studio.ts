/* ═══════════ Thermometry Studio · Lecture 1 ═══════════
   Six screens, each registered on window.SCREEN_INIT:

     why       - thermometric property: heat a body, watch a property move,
                 and watch the graph leave the straight line out of range
     calibrate - the ice-point / steam-point / 100-divisions recipe, then
                 mercury vs alcohol disagreeing between the fixed points
     master    - the master formula as a double number line: the fraction of
                 the property travelled IS the fraction of temperature
     types     - five instruments drawn on one real temperature axis
     faulty    - a broken scale beside the true one, with the "just subtract
                 the error" shortcut drawn in red so the trap is visible
     homework  - five problems with worked solutions + a rapid-fire recap

   Every p5 instance is built lazily: hidden .screen sections are
   display:none, so a canvas created early would have zero width.        */

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
  p.fill(255, 255, 255, 232);
  p.rect(bx - 8, y - 5, w + 16, lh * lines.length + 9, 8);
  p.fill(col);
  p.textAlign(p.LEFT, p.TOP);
  lines.forEach((l, i) => p.text(l, bx, y + i * lh));
}

/* seconds since the last frame, clamped so a stalled tab cannot jump the
   animation to its end state */
function dt(p: p5) {
  return Math.min(p.deltaTime || 16.7, 120) / 1000;
}

function dashed(p: p5, on: boolean, pattern: number[] = [6, 6]) {
  (p.drawingContext as CanvasRenderingContext2D).setLineDash(on ? pattern : []);
}

/* temperature → colour, deep blue (cold) through cyan, amber, red (hot) */
const HEAT_STOPS: Array<[number, [number, number, number]]> = [
  [-100, [30, 58, 138]],
  [-40, [56, 130, 246]],
  [0, [125, 211, 252]],
  [60, [253, 224, 138]],
  [140, [245, 158, 11]],
  [400, [220, 38, 38]],
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

function fmt(v: number, dp: number) {
  return v.toFixed(dp);
}

/* tap-to-reveal wiring, shared by the .th-eg example boxes and .th-hw cards */
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

/* sub-pane tabs inside one screen */
function wireTabs(tabsId: string, onSwitch: (paneId: string) => void) {
  const tabs = document.getElementById(tabsId)!;
  tabs.querySelectorAll<HTMLButtonElement>('.th-chip').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.pane!;
      tabs.querySelectorAll('.th-chip').forEach((x) => x.classList.toggle('active', x === b));
      const scope = tabs.closest('.screen')!;
      scope.querySelectorAll<HTMLElement>('.th-pane').forEach((el) => {
        el.classList.toggle('active', el.id === id);
      });
      onSwitch(id);
    });
  });
}

/* segmented button group (.th-btn.on) */
function wireSegmented(groupId: string, onPick: (key: string) => void) {
  const grp = document.getElementById(groupId)!;
  grp.querySelectorAll<HTMLButtonElement>('.th-btn').forEach((b) => {
    b.addEventListener('click', () => {
      grp.querySelectorAll('.th-btn').forEach((x) => x.classList.toggle('on', x === b));
      onPick(b.dataset.prop!);
    });
  });
}

/* ══════════════════════════════════════════════════════════════════════
   1 · HOW DOES MERCURY KNOW?
   A body is heated; the chosen thermometric property responds. The graph
   on the right shows the linear law inside the working range and what
   really happens outside it.
   ══════════════════════════════════════════════════════════════════════ */

interface WhyProp {
  label: string;          // readout label
  sym: string;            // symbol drawn on the graph
  unit: string;
  dp: number;
  lo: number;             // stated working range, °C
  hi: number;
  ideal: (t: number) => number;
  real: (t: number) => number;
  status: (t: number) => [string, string];
  device: 'liquid' | 'gas' | 'res';
  caption: string;
}

const T_MIN = -80, T_MAX = 360;      // slider domain

const WHY_PROPS: Record<string, WhyProp> = {
  liquid: {
    label: 'Length l of the column',
    sym: 'l',
    unit: 'cm',
    dp: 2,
    lo: -30,
    hi: 300,
    ideal: (t) => 5 + 0.1 * t,
    real: (t) => {
      if (t <= -39) return 5 + 0.1 * -39;                    // frozen solid: stuck
      if (t > 300) return 5 + 0.1 * t + 0.0009 * (t - 300) ** 2; // expansion bends
      return 5 + 0.1 * t;
    },
    status: (t) => {
      if (t <= -39) return ['Mercury is frozen - useless', C.red];
      if (t < -30) return ['Below the stated range', C.amber];
      if (t > 300) return ['Past the range - not a straight line', C.red];
      return ['Inside the range - straight line', C.green];
    },
    device: 'liquid',
    caption: 'Mercury in a thin glass tube. The property we measure is the LENGTH of the column.',
  },
  gas: {
    label: 'Pressure p of the gas',
    sym: 'p',
    unit: 'cm Hg',
    dp: 1,
    lo: -268,
    hi: 1500,
    ideal: (t) => 76 * (1 + t / 273),
    real: (t) => 76 * (1 + t / 273),
    status: () => ['Inside the range - straight line', C.green],
    device: 'gas',
    caption: 'A gas kept at a fixed volume. The property we measure is its PRESSURE.',
  },
  res: {
    label: 'Resistance R of the wire',
    sym: 'R',
    unit: 'Ω',
    dp: 2,
    lo: -200,
    hi: 1200,
    ideal: (t) => 5 * (1 + 0.00392 * t),
    real: (t) => 5 * (1 + 0.00392 * t),
    status: () => ['Inside the range - straight line', C.green],
    device: 'res',
    caption: 'A platinum wire. The property we measure is its RESISTANCE.',
  },
};

const why = { t: 25, key: 'liquid' };

function whyReadouts() {
  const P = WHY_PROPS[why.key];
  const x = P.real(why.t);
  const [txt, col] = P.status(why.t);
  document.getElementById('thWhyRoT')!.textContent = `${why.t} °C`;
  document.getElementById('thWhyRoXlab')!.textContent = P.label;
  document.getElementById('thWhyRoX')!.textContent = `${fmt(x, P.dp)} ${P.unit}`;
  document.getElementById('thWhyRoRange')!.textContent = `${P.lo} to ${P.hi} °C`;
  const st = document.getElementById('thWhyRoStat')!;
  st.textContent = txt;
  st.style.color = col;
}

const whySketch = (p: p5) => {
  const holder = document.getElementById('thWhyCanvas')!;
  const canvasH = () => Math.max(360, Math.min(470, Math.round(holder.clientWidth * 0.42)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  /* ── the instrument sitting in the bath ── */
  const drawDevice = (P: WhyProp, x0: number, w: number) => {
    const t = why.t;
    const [r, g, b] = heatRGB(t);
    const cx = x0 + w / 2;
    const bathT = p.height * 0.46, bathB = p.height - 46, bathW = Math.min(w - 40, 230);

    /* bath */
    p.noStroke();
    p.fill(r, g, b, 70);
    p.rect(cx - bathW / 2, bathT, bathW, bathB - bathT, 14);
    p.stroke(r, g, b);
    p.strokeWeight(3);
    p.noFill();
    p.rect(cx - bathW / 2, bathT, bathW, bathB - bathT, 14);

    /* heat shimmer above a hot bath, frost crystals on a cold one */
    p.strokeWeight(2);
    if (t > 60) {
      p.stroke(220, 38, 38, Math.min(180, (t - 60) * 1.4));
      for (let i = -1; i <= 1; i++) {
        const bx = cx + i * 46;
        p.noFill();
        p.beginShape();
        for (let k = 0; k <= 16; k++) {
          const yy = bathT - 8 - k * 1.6;
          p.vertex(bx + 7 * Math.sin(k * 0.55 + p.frameCount * 0.07 + i), yy);
        }
        p.endShape();
      }
    } else if (t < -5) {
      p.stroke(125, 211, 252, 200);
      for (let i = -1; i <= 1; i++) {
        const bx = cx + i * 52, by = bathT + 26;
        for (let k = 0; k < 3; k++) {
          const a = (k * Math.PI) / 3;
          p.line(bx - 7 * Math.cos(a), by - 7 * Math.sin(a), bx + 7 * Math.cos(a), by + 7 * Math.sin(a));
        }
      }
    }

    p.noStroke();
    p.fill(C.navy);
    p.textFont('DM Sans');
    p.textSize(15);
    p.textAlign(p.CENTER, p.TOP);
    p.text(`body at ${t} °C`, cx, bathB + 10);

    const val = P.real(t);

    if (P.device === 'liquid') {
      /* tube runs from inside the bath up above it */
      const tubeB = bathB - 24, tubeT = 34, tubeW = 15;
      p.fill(255);
      p.stroke(41, 89, 144, 90);
      p.strokeWeight(2);
      p.rect(cx - tubeW / 2, tubeT, tubeW, tubeB - tubeT, 7);
      p.noStroke();
      /* full-scale mapping: column length over the whole slider domain */
      const lMin = P.real(T_MIN), lMax = P.real(T_MAX);
      const f = Math.max(0, Math.min(1, (val - lMin) / (lMax - lMin)));
      const colTop = tubeB - f * (tubeB - tubeT - 10);
      const frozen = t <= -39;
      p.fill(frozen ? p.color(148, 163, 184) : p.color(C.red));
      p.rect(cx - tubeW / 2 + 3, colTop, tubeW - 6, tubeB - colTop, 4);
      p.circle(cx, tubeB + 10, 30);
      chip(p, frozen ? `l = ${fmt(val, 2)} cm (frozen)` : `l = ${fmt(val, 2)} cm`,
        cx + 16, colTop - 10, 'left', 14, frozen ? C.grey : C.red);
    } else if (P.device === 'gas') {
      /* bulb in the bath, dial above it */
      p.noStroke();
      p.fill(C.dark);
      p.circle(cx, bathB - 34, 40);
      p.stroke(C.dark);
      p.strokeWeight(5);
      p.line(cx, bathB - 54, cx, bathT - 18);
      const gy = bathT - 66, gr = 46;
      p.noStroke();
      p.fill(255);
      p.circle(cx, gy, gr * 2);
      p.stroke(C.navy);
      p.strokeWeight(3);
      p.noFill();
      p.circle(cx, gy, gr * 2);
      /* needle: sweeps 240° across the pressure span of the slider domain */
      const pMin = P.real(T_MIN), pMax = P.real(T_MAX);
      const f = Math.max(0, Math.min(1, (val - pMin) / (pMax - pMin)));
      const a = (-210 + f * 240) * (Math.PI / 180);
      p.stroke(41, 89, 144, 70);
      p.strokeWeight(2);
      for (let k = 0; k <= 8; k++) {
        const ta = (-210 + (k / 8) * 240) * (Math.PI / 180);
        p.line(cx + (gr - 10) * Math.cos(ta), gy + (gr - 10) * Math.sin(ta),
          cx + (gr - 3) * Math.cos(ta), gy + (gr - 3) * Math.sin(ta));
      }
      p.stroke(C.red);
      p.strokeWeight(3.5);
      p.line(cx, gy, cx + (gr - 12) * Math.cos(a), gy + (gr - 12) * Math.sin(a));
      p.noStroke();
      p.fill(C.navy);
      p.circle(cx, gy, 9);
      chip(p, `p = ${fmt(val, 1)} cm Hg`, cx, gy + gr + 8, 'center', 14, C.dark);
    } else {
      /* glowing coil in the bath, ohmmeter above it */
      p.stroke(r, g, b);
      p.strokeWeight(4);
      p.noFill();
      p.beginShape();
      for (let k = 0; k <= 40; k++) {
        const yy = bathB - 22 - (k / 40) * 66;
        p.vertex(cx + (k % 2 === 0 ? -16 : 16), yy);
      }
      p.endShape();
      p.stroke(C.dark);
      p.strokeWeight(3);
      p.line(cx - 16, bathB - 88, cx - 16, bathT - 40);
      p.line(cx + 16, bathB - 88, cx + 16, bathT - 40);
      const bw = 128, bh = 50, by = bathT - 96;
      p.noStroke();
      p.fill(C.navy);
      p.rect(cx - bw / 2, by, bw, bh, 10);
      p.fill('#4ade80');
      p.textFont('DM Sans');
      p.textSize(21);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(`${fmt(val, 2)} Ω`, cx, by + bh / 2 + 1);
    }
  };

  /* ── X-vs-t graph ── */
  const drawGraph = (P: WhyProp, x0: number, w: number) => {
    const M = { l: 58, r: 22, t: 40, b: 52 };
    const gx = x0 + M.l, gw = w - M.l - M.r;
    const gy = M.t, gh = p.height - M.t - M.b;

    /* y-domain from the real curve over the whole slider domain */
    let yLo = Infinity, yHi = -Infinity;
    for (let t = T_MIN; t <= T_MAX; t += 4) {
      const v = P.real(t);
      yLo = Math.min(yLo, v);
      yHi = Math.max(yHi, v);
    }
    const pad = (yHi - yLo) * 0.12;
    yLo -= pad; yHi += pad;

    const X = (t: number) => gx + ((t - T_MIN) / (T_MAX - T_MIN)) * gw;
    const Y = (v: number) => gy + gh - ((v - yLo) / (yHi - yLo)) * gh;

    /* working-range band */
    const bandL = X(Math.max(T_MIN, P.lo)), bandR = X(Math.min(T_MAX, P.hi));
    p.noStroke();
    p.fill(22, 163, 74, 22);
    p.rect(bandL, gy, bandR - bandL, gh);

    /* grid */
    p.stroke(41, 89, 144, 26);
    p.strokeWeight(1);
    for (let t = -50; t <= T_MAX; t += 50) p.line(X(t), gy, X(t), gy + gh);

    /* axes */
    p.stroke(C.navy);
    p.strokeWeight(2.5);
    p.line(gx, gy + gh, gx + gw, gy + gh);
    p.line(gx, gy, gx, gy + gh);
    p.noStroke();
    p.fill(C.dark);
    p.textFont('DM Sans');
    p.textSize(12.5);
    p.textAlign(p.CENTER, p.TOP);
    for (let t = -50; t <= T_MAX; t += 50) p.text(`${t}`, X(t), gy + gh + 7);
    p.textAlign(p.CENTER, p.TOP);
    p.text('temperature t (°C)', gx + gw / 2, gy + gh + 28);
    p.push();
    p.translate(x0 + 16, gy + gh / 2);
    p.rotate(-Math.PI / 2);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(`property ${P.sym} (${P.unit})`, 0, 0);
    p.pop();

    /* the ideal straight line, right across the domain */
    p.stroke(41, 89, 144, 120);
    p.strokeWeight(2);
    dashed(p, true, [5, 5]);
    p.line(X(T_MIN), Y(P.ideal(T_MIN)), X(T_MAX), Y(P.ideal(T_MAX)));
    dashed(p, false);

    /* what really happens: solid inside the range, red outside */
    p.noFill();
    p.strokeWeight(4);
    let seg: 'in' | 'out' | null = null;
    const flush = () => { if (seg) p.endShape(); };
    for (let t = T_MIN; t <= T_MAX; t += 2) {
      const inRange = t >= P.lo && t <= P.hi;
      const want: 'in' | 'out' = inRange ? 'in' : 'out';
      if (want !== seg) {
        flush();
        seg = want;
        p.stroke(inRange ? C.accent : C.red);
        p.beginShape();
        if (t > T_MIN) p.vertex(X(t - 2), Y(P.real(t - 2)));
      }
      p.vertex(X(t), Y(P.real(t)));
    }
    flush();

    /* the live point */
    const v = P.real(why.t);
    p.stroke(C.amber);
    p.strokeWeight(1.6);
    dashed(p, true);
    p.line(gx, Y(v), X(why.t), Y(v));
    p.line(X(why.t), gy + gh, X(why.t), Y(v));
    dashed(p, false);
    p.noStroke();
    p.fill(C.navy);
    p.circle(X(why.t), Y(v), 16);
    p.fill(C.amber);
    p.circle(X(why.t), Y(v), 9);

    /* range endpoint flags */
    p.fill(22, 163, 74);
    p.textSize(12.5);
    p.textAlign(p.CENTER, p.BOTTOM);
    if (P.lo > T_MIN) p.text(`${P.lo}°C`, bandL, gy - 3);
    if (P.hi < T_MAX) p.text(`${P.hi}°C`, bandR, gy - 3);
    p.textAlign(p.CENTER, p.TOP);
    p.fill(22, 163, 74);
    p.textSize(13);
    p.text('WORKING RANGE - the property changes in a straight line here', (bandL + bandR) / 2, gy + 6);

    const [stat, col] = P.status(why.t);
    chip(p, stat, p.width - 16, 10, 'right', 14, col);
  };

  p.draw = () => {
    p.background(C.paper);
    const P = WHY_PROPS[why.key];
    const split = Math.min(330, p.width * 0.34);
    drawDevice(P, 0, split);
    drawGraph(P, split, p.width - split);

    p.noStroke();
    p.fill(C.dark);
    p.textFont('DM Sans');
    p.textSize(14);
    p.textAlign(p.LEFT, p.TOP);
    p.text(P.caption, 16, 12);
  };
};

let whySketchInst: p5 | null = null;

function whyWire() {
  const s = document.getElementById('thWhyT') as HTMLInputElement;
  s.addEventListener('input', () => {
    why.t = +s.value;
    document.getElementById('thWhyTVal')!.textContent = `${why.t} °C`;
    whyReadouts();
  });
  wireSegmented('thWhyProps', (k) => { why.key = k; whyReadouts(); });
  whyReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   2a · CALIBRATING THE CELSIUS SCALE
   Three tapped steps: ice point, steam point, one hundred divisions.
   ══════════════════════════════════════════════════════════════════════ */

const ICE_F = 0.16, STEAM_F = 0.78, ROOM_F = 0.30;   // column fractions

const cal = {
  step: 0,            // 0 nothing · 1 in ice · 2 in steam · 3 divided
  frac: ROOM_F,       // current column fraction (animated)
  target: ROOM_F,
  iceMark: 0,         // 0 → 1 fade-in of each mark
  steamMark: 0,
  ticks: 0,           // 0 → 1 growth of the 100 divisions
};

function calSetStep(n: number) {
  cal.step = n;
  if (n === 0) {
    cal.target = ROOM_F; cal.iceMark = 0; cal.steamMark = 0; cal.ticks = 0;
  } else if (n === 1) {
    cal.target = ICE_F;
  } else if (n === 2) {
    cal.target = STEAM_F;
  }
  (document.getElementById('thCalS2') as HTMLButtonElement).disabled = n < 1;
  (document.getElementById('thCalS3') as HTMLButtonElement).disabled = n < 2;
}

const calSketch = (p: p5) => {
  const holder = document.getElementById('thCalCanvas')!;
  const canvasH = () => Math.max(380, Math.min(460, Math.round(holder.clientWidth * 0.34)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    p.textFont('DM Sans');

    /* ease the column and the fades */
    const d = dt(p);
    cal.frac += (cal.target - cal.frac) * (1 - Math.exp(-3.7 * d));
    const settled = Math.abs(cal.target - cal.frac) < 0.004;
    /* a mark fades in once its own step's column has settled - and stays put
       once we have moved past that step, even if the steps were tapped fast */
    if (cal.step >= 1 && (cal.step > 1 || settled)) cal.iceMark = Math.min(1, cal.iceMark + d * 3);
    if (cal.step >= 2 && (cal.step > 2 || settled)) cal.steamMark = Math.min(1, cal.steamMark + d * 3);
    if (cal.step >= 3) cal.ticks = Math.min(1, cal.ticks + d * 0.85);

    const cx = p.width * 0.5;
    const tubeT = 46, tubeB = p.height - 92, tubeW = 26;
    const colBase = tubeB - 6;
    const span = colBase - tubeT - 14;
    const yOf = (f: number) => colBase - f * span;

    /* ── the vessel currently around the bulb ── */
    const vesselY = tubeB - 6, vw = 190, vh = 118;
    if (cal.step === 1) {
      p.noStroke();
      p.fill(125, 211, 252, 70);
      p.rect(cx - vw / 2, vesselY - vh + 40, vw, vh, 12);
      p.stroke(56, 130, 246);
      p.strokeWeight(3);
      p.noFill();
      p.rect(cx - vw / 2, vesselY - vh + 40, vw, vh, 12);
      /* ice cubes */
      p.noStroke();
      p.fill(255, 255, 255, 220);
      const cubes = [[-58, -46], [-18, -22], [30, -50], [56, -18], [4, -60]];
      cubes.forEach(([dx, dy], i) => {
        p.push();
        p.translate(cx + dx, vesselY + dy + 6);
        p.rotate(Math.sin(i * 2.3) * 0.4);
        p.rect(-13, -11, 26, 22, 5);
        p.pop();
      });
      p.fill(C.dark);
      p.textSize(15);
      p.textAlign(p.CENTER, p.TOP);
      p.text('melting ice - ice and water together', cx, vesselY + 50);
    } else if (cal.step >= 2) {
      p.noStroke();
      p.fill(245, 158, 11, 45);
      p.rect(cx - vw / 2, vesselY - vh + 40, vw, vh, 12);
      p.stroke(C.amber);
      p.strokeWeight(3);
      p.noFill();
      p.rect(cx - vw / 2, vesselY - vh + 40, vw, vh, 12);
      /* boiling water + steam wisps */
      p.noStroke();
      p.fill(56, 130, 246, 120);
      p.rect(cx - vw / 2 + 6, vesselY - 24, vw - 12, 30, 8);
      p.stroke(148, 163, 184, 190);
      p.strokeWeight(2.4);
      p.noFill();
      for (let i = -1; i <= 1; i++) {
        p.beginShape();
        for (let k = 0; k <= 14; k++) {
          p.vertex(cx + i * 52 + 8 * Math.sin(k * 0.5 + p.frameCount * 0.06 + i),
            vesselY - 30 - k * 3.4);
        }
        p.endShape();
      }
      p.noStroke();
      p.fill(C.dark);
      p.textSize(15);
      p.textAlign(p.CENTER, p.TOP);
      p.text('steam above boiling water, at normal air pressure', cx, vesselY + 50);
    } else {
      p.noStroke();
      p.fill(C.grey);
      p.textSize(15);
      p.textAlign(p.CENTER, p.TOP);
      p.text('no marks yet - this height tells you nothing', cx, vesselY + 50);
    }

    /* ── the thermometer ── */
    p.fill(255);
    p.stroke(41, 89, 144, 100);
    p.strokeWeight(2.5);
    p.rect(cx - tubeW / 2, tubeT, tubeW, tubeB - tubeT, 12);
    p.noStroke();
    p.fill(C.red);
    const ytop = yOf(cal.frac);
    p.rect(cx - tubeW / 2 + 5, ytop, tubeW - 10, colBase - ytop, 5);
    p.circle(cx, tubeB + 4, 44);

    /* ── the two fixed-point marks ── */
    const mark = (f: number, label: string, col: string, alpha: number) => {
      if (alpha <= 0.01) return;
      const y = yOf(f);
      const a = Math.min(1, alpha) * 255;
      p.stroke(p.color(col));
      p.strokeWeight(3);
      const c = p.color(col);
      c.setAlpha(a);
      p.stroke(c);
      p.line(cx - tubeW / 2 - 26, y, cx + tubeW / 2 + 26, y);
      p.noStroke();
      p.fill(c);
      p.textSize(19);
      p.textAlign(p.LEFT, p.CENTER);
      p.text(label, cx + tubeW / 2 + 34, y);
    };
    mark(ICE_F, '0 °C   ice point', C.accent, cal.iceMark);
    mark(STEAM_F, '100 °C   steam point', C.red, cal.steamMark);

    /* ── step 3: one hundred equal divisions ── */
    if (cal.ticks > 0) {
      const n = Math.round(100 * cal.ticks);
      for (let k = 1; k < n; k++) {
        const f = ICE_F + (k / 100) * (STEAM_F - ICE_F);
        const y = yOf(f);
        const major = k % 10 === 0;
        p.stroke(major ? C.navy : p.color(41, 89, 144, 110));
        p.strokeWeight(major ? 2.4 : 1.2);
        p.line(cx - tubeW / 2 - (major ? 20 : 11), y, cx - tubeW / 2 - 2, y);
        if (major) {
          p.noStroke();
          p.fill(C.navy);
          p.textSize(13);
          p.textAlign(p.RIGHT, p.CENTER);
          p.text(`${k}`, cx - tubeW / 2 - 25, y);
        }
      }
      if (cal.ticks >= 1) {
        chip(p, 'each division = 1 °C', cx - tubeW / 2 - 46, yOf((ICE_F + STEAM_F) / 2) - 10,
          'right', 15, C.navy);
      }
    }

    /* ── running caption ── */
    const captions = [
      'Step 0 · The tube has mercury in it, but no numbers. A length is not a temperature yet.',
      'Step 1 · In melting ice the mercury settles. Mark that level and CALL it 0 °C.',
      'Step 2 · In steam the mercury settles higher. Mark that level and CALL it 100 °C.',
      'Step 3 · Cut the gap into 100 equal parts. Each part is 1 °C - that is the Celsius scale.',
    ];
    p.noStroke();
    p.fill(C.navy);
    p.textSize(16);
    p.textAlign(p.CENTER, p.TOP);
    p.text(captions[cal.step], p.width / 2, 12);
  };
};

/* ══════════════════════════════════════════════════════════════════════
   2b · TWO THERMOMETERS, ONE BATH
   Both are calibrated at 0 and 100, so they must agree there - and they
   are free to disagree everywhere in between.
   ══════════════════════════════════════════════════════════════════════ */

const cmp = { t: 40 };

/* alcohol's reading: pinned at 0 and 100, bowed in between.
   The bow is exaggerated so it is visible from the back of the room. */
const alcoholReads = (t: number) => {
  const u = t / 100;
  return 100 * (u + 0.18 * u * (1 - u));
};

function cmpReadouts() {
  const hg = cmp.t;
  const al = alcoholReads(cmp.t);
  document.getElementById('thCmpHg')!.textContent = `${fmt(hg, 1)} °C`;
  document.getElementById('thCmpAl')!.textContent = `${fmt(al, 1)} °C`;
  document.getElementById('thCmpGap')!.textContent = `${fmt(al - hg, 1)} °C`;
}

const cmpSketch = (p: p5) => {
  const holder = document.getElementById('thCmpCanvas')!;
  const canvasH = () => Math.max(380, Math.min(500, Math.round(holder.clientWidth * 0.38)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    p.textFont('DM Sans');

    const [r, g, b] = heatRGB(cmp.t);
    const tubeT = 60, tubeB = p.height - 96, tubeW = 30;
    const colBase = tubeB - 8;
    const span = colBase - tubeT - 10;
    const yOf = (readingC: number) => colBase - (readingC / 100) * span;

    /* the shared bath */
    const bathT = tubeB - 34, bathB = p.height - 44;
    p.noStroke();
    p.fill(r, g, b, 70);
    p.rect(p.width * 0.5 - 260, bathT, 520, bathB - bathT, 14);
    p.stroke(r, g, b);
    p.strokeWeight(3);
    p.noFill();
    p.rect(p.width * 0.5 - 260, bathT, 520, bathB - bathT, 14);
    p.noStroke();
    p.fill(C.navy);
    p.textSize(16);
    p.textAlign(p.CENTER, p.TOP);
    p.text(`one bath, true temperature ${cmp.t} °C`, p.width / 2, bathB + 8);

    const draw1 = (cx: number, reading: number, col: string, name: string, side: 1 | -1) => {
      /* scale ticks, identical on both instruments */
      for (let k = 0; k <= 100; k += 5) {
        const y = yOf(k);
        const major = k % 20 === 0;
        p.stroke(major ? C.navy : p.color(41, 89, 144, 100));
        p.strokeWeight(major ? 2.2 : 1.1);
        p.line(cx - tubeW / 2 - (major ? 18 : 10), y, cx - tubeW / 2 - 2, y);
        if (major) {
          p.noStroke();
          p.fill(C.navy);
          p.textSize(12.5);
          p.textAlign(p.RIGHT, p.CENTER);
          p.text(`${k}`, cx - tubeW / 2 - 22, y);
        }
      }
      p.fill(255);
      p.stroke(41, 89, 144, 100);
      p.strokeWeight(2.5);
      p.rect(cx - tubeW / 2, tubeT, tubeW, tubeB - tubeT, 13);
      p.noStroke();
      p.fill(col);
      const y = yOf(reading);
      p.rect(cx - tubeW / 2 + 5, y, tubeW - 10, colBase - y, 5);
      p.circle(cx, tubeB + 6, 46);
      if (side < 0) chip(p, `${fmt(reading, 1)} °C`, cx - tubeW / 2 - 12, y - 11, 'right', 16, col);
      else chip(p, `${fmt(reading, 1)} °C`, cx + tubeW / 2 + 12, y - 11, 'left', 16, col);
      p.noStroke();
      p.fill(C.navy);
      p.textSize(15.5);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.text(name, cx, tubeT - 12);
      return y;
    };

    const xL = p.width * 0.5 - 150, xR = p.width * 0.5 + 150;
    const yHg = draw1(xL, cmp.t, C.red, 'mercury', -1);
    const yAl = draw1(xR, alcoholReads(cmp.t), '#2563eb', 'alcohol', 1);

    /* the disagreement */
    p.stroke(C.violet);
    p.strokeWeight(2);
    dashed(p, true, [5, 5]);
    p.line(xL + tubeW / 2, yHg, xR - tubeW / 2, yHg);
    dashed(p, false);
    if (Math.abs(yAl - yHg) > 2) {
      p.stroke(C.violet);
      p.strokeWeight(3);
      const xm = (xL + xR) / 2;
      arrow(p, xm, yHg, xm, yAl, 8);
      chip(p, `they differ by ${fmt(alcoholReads(cmp.t) - cmp.t, 1)} °C`,
        xm, Math.min(yHg, yAl) - 38, 'center', 15, C.violet);
    } else {
      chip(p, 'they must agree here', (xL + xR) / 2, yHg - 30, 'center', 15, C.green);
    }

    p.noStroke();
    p.fill(C.grey);
    p.textSize(13.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text('Both were set up by the same three steps. The gap is drawn bigger than real life so you can see it.', 16, 12);
  };
};

let calSketchInst: p5 | null = null;
let cmpSketchInst: p5 | null = null;

function calWire() {
  document.getElementById('thCalS1')!.addEventListener('click', () => calSetStep(1));
  document.getElementById('thCalS2')!.addEventListener('click', () => calSetStep(2));
  document.getElementById('thCalS3')!.addEventListener('click', () => calSetStep(3));
  document.getElementById('thCalReset')!.addEventListener('click', () => calSetStep(0));
  calSetStep(0);

  const s = document.getElementById('thCmpT') as HTMLInputElement;
  s.addEventListener('input', () => {
    cmp.t = +s.value;
    document.getElementById('thCmpTVal')!.textContent = `${cmp.t} °C`;
    cmpReadouts();
  });
  cmpReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   3 · THE MASTER FORMULA
   A double number line. Property on top, temperature underneath, drawn on
   exactly the same pixel mapping - so the two shaded fractions are always
   the same length. That identity IS the formula.
   ══════════════════════════════════════════════════════════════════════ */

interface MProp {
  sym: string; unit: string; dp: number;
  min: number; max: number; step: number;
  name: string;
  x0: number; x100: number; xt: number;
}

const MPROPS: Record<string, MProp> = {
  R: { sym: 'R', unit: 'Ω', dp: 2, min: 4, max: 7, step: 0.05, name: 'Platinum resistance thermometer', x0: 5.0, x100: 5.4, xt: 5.3 },
  p: { sym: 'p', unit: 'cm Hg', dp: 1, min: 50, max: 130, step: 1, name: 'Constant volume gas thermometer', x0: 76, x100: 104, xt: 90 },
  l: { sym: 'l', unit: 'cm', dp: 1, min: 2, max: 30, step: 0.5, name: 'Mercury-in-glass thermometer', x0: 5, x100: 15, xt: 10 },
  X: { sym: 'X', unit: 'units', dp: 0, min: 0, max: 200, step: 1, name: 'Some property you have never seen before', x0: 20, x100: 170, xt: 95 },
};

const mst = { key: 'R' };
const M = () => MPROPS[mst.key];
const mstT = () => ((M().xt - M().x0) / (M().x100 - M().x0)) * 100;

function mstSyncSliders() {
  const P = M();
  const cfg: Array<[string, number]> = [['thMX0', P.x0], ['thMX100', P.x100], ['thMXt', P.xt]];
  cfg.forEach(([id, v]) => {
    const el = document.getElementById(id) as HTMLInputElement;
    el.min = `${P.min}`; el.max = `${P.max}`; el.step = `${P.step}`;
    el.value = `${v}`;
  });
}

function mstReadouts() {
  const P = M();
  const u = P.unit;
  document.getElementById('thMX0Lab')!.innerHTML = `${P.sym}<sub>0</sub> at the ice point`;
  document.getElementById('thMX100Lab')!.innerHTML = `${P.sym}<sub>100</sub> at the steam point`;
  document.getElementById('thMXtLab')!.innerHTML = `${P.sym}<sub>t</sub> measured now`;
  document.getElementById('thMX0Val')!.textContent = `${fmt(P.x0, P.dp)} ${u}`;
  document.getElementById('thMX100Val')!.textContent = `${fmt(P.x100, P.dp)} ${u}`;
  document.getElementById('thMXtVal')!.textContent = `${fmt(P.xt, P.dp)} ${u}`;

  const s = P.sym;
  const num = P.xt - P.x0, den = P.x100 - P.x0;
  katex.render(
    String.raw`t=\dfrac{${s}_t-${s}_0}{${s}_{100}-${s}_0}\times 100
      =\dfrac{${fmt(P.xt, P.dp)}-${fmt(P.x0, P.dp)}}{${fmt(P.x100, P.dp)}-${fmt(P.x0, P.dp)}}\times 100`,
    document.getElementById('thMLine1')!, KO
  );
  katex.render(
    String.raw`=\dfrac{${fmt(num, P.dp)}}{${fmt(den, P.dp)}}\times 100=\mathbf{${fmt(mstT(), 1)}}\ ^\circ\mathrm{C}`,
    document.getElementById('thMLine2')!, KO
  );
}

const mstSketch = (p: p5) => {
  const holder = document.getElementById('thMasterCanvas')!;
  const canvasH = () => Math.max(330, Math.min(420, Math.round(holder.clientWidth * 0.30)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    p.textFont('DM Sans');
    const P = M();
    const span = P.x100 - P.x0;

    /* window: the two fixed points plus room, widened if Xt sits outside */
    let wLo = P.x0 - 0.32 * span, wHi = P.x100 + 0.32 * span;
    if (P.xt < wLo) wLo = P.xt - 0.12 * span;
    if (P.xt > wHi) wHi = P.xt + 0.12 * span;

    const gl = 64, gr = p.width - 44, gw = gr - gl;
    const px = (x: number) => gl + ((x - wLo) / (wHi - wLo)) * gw;
    const tOf = (x: number) => ((x - P.x0) / span) * 100;

    const yTop = p.height * 0.30, yBot = p.height * 0.74;
    const t = mstT();

    /* ── property axis ── */
    p.stroke(C.navy);
    p.strokeWeight(3);
    p.line(gl, yTop, gr, yTop);
    p.noStroke();
    p.fill(C.dark);
    p.textSize(14);
    p.textAlign(p.LEFT, p.BOTTOM);
    p.text(`PROPERTY  ${P.sym}  (${P.unit})`, gl, yTop - 44);

    /* fraction bar on the property axis */
    const a = px(P.x0), bXt = px(P.xt), bFull = px(P.x100);
    p.noStroke();
    p.fill(0, 160, 227, 60);
    p.rect(Math.min(a, bXt), yTop - 17, Math.abs(bXt - a), 34, 6);
    p.stroke(C.accent);
    p.strokeWeight(3);
    p.line(a, yTop, bXt, yTop);

    /* fixed points + the live point */
    const stake = (x: number, lab: string, sub: string, col: string) => {
      const X = px(x);
      p.stroke(col);
      p.strokeWeight(3);
      p.line(X, yTop - 20, X, yTop + 20);
      p.noStroke();
      p.fill(col);
      p.textSize(15);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.text(lab, X, yTop - 24);
      p.textSize(12.5);
      p.fill(C.grey);
      p.textAlign(p.CENTER, p.TOP);
      p.text(sub, X, yTop + 23);
    };
    stake(P.x0, `${P.sym}₀ = ${fmt(P.x0, P.dp)}`, 'ice point', C.dark);
    stake(P.x100, `${P.sym}₁₀₀ = ${fmt(P.x100, P.dp)}`, 'steam point', C.dark);
    p.noStroke();
    p.fill(C.navy);
    p.circle(bXt, yTop, 19);
    p.fill(C.accent);
    p.circle(bXt, yTop, 12);
    chip(p, `${P.sym}ₜ = ${fmt(P.xt, P.dp)} ${P.unit}`, bXt, yTop - 58, 'center', 16, C.accent);

    /* ── connector ── */
    p.stroke(C.violet);
    p.strokeWeight(2);
    dashed(p, true, [6, 6]);
    p.line(bXt, yTop + 12, bXt, yBot - 12);
    dashed(p, false);

    /* ── temperature axis, same pixel mapping ── */
    p.stroke(C.navy);
    p.strokeWeight(3);
    p.line(gl, yBot, gr, yBot);
    p.noStroke();
    p.fill(C.dark);
    p.textSize(14);
    p.textAlign(p.LEFT, p.TOP);
    p.text('TEMPERATURE  t  (°C)', gl, yBot + 44);

    const tLo = tOf(wLo), tHi = tOf(wHi);
    const start = Math.ceil(tLo / 10) * 10;
    for (let tt = start; tt <= tHi; tt += 10) {
      const X = px(P.x0 + (tt / 100) * span);
      const major = tt === 0 || tt === 100;
      p.stroke(major ? C.dark : p.color(41, 89, 144, 90));
      p.strokeWeight(major ? 3 : 1.3);
      p.line(X, yBot, X, yBot + (major ? 20 : 10));
      p.noStroke();
      p.fill(major ? C.dark : C.grey);
      p.textSize(major ? 15 : 12);
      p.textAlign(p.CENTER, p.TOP);
      p.text(`${tt}`, X, yBot + (major ? 23 : 12));
    }

    /* fraction bar on the temperature axis - same pixels, so same length */
    p.noStroke();
    p.fill(245, 158, 11, 70);
    p.rect(Math.min(a, bXt), yBot - 17, Math.abs(bXt - a), 34, 6);
    p.stroke(C.amber);
    p.strokeWeight(3);
    p.line(a, yBot, bXt, yBot);
    p.noStroke();
    p.fill(C.navy);
    p.circle(bXt, yBot, 19);
    p.fill(C.amber);
    p.circle(bXt, yBot, 12);
    chip(p, `t = ${fmt(t, 1)} °C`, bXt, yBot + 30, 'center', 17, '#b45309');

    /* the fraction, spelled out on both sides */
    const frac = (P.xt - P.x0) / span;
    const mid = (a + bXt) / 2;
    chip(p, `${(frac * 100).toFixed(1)}% of the way along the property`, mid, yTop + 44, 'center', 14, C.accent);
    chip(p, `${(frac * 100).toFixed(1)}% of the way from 0 to 100`, mid, yBot - 60, 'center', 14, '#b45309');

    /* span brackets */
    p.stroke(C.grey);
    p.strokeWeight(1.5);
    dashed(p, true, [4, 4]);
    p.line(a, yTop - 20, a, yBot + 20);
    p.line(bFull, yTop - 20, bFull, yBot + 20);
    dashed(p, false);

    p.noStroke();
    p.fill(C.grey);
    p.textSize(13.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text(P.name, 16, 12);
    p.textAlign(p.RIGHT, p.TOP);
    p.text('the two shaded bars are always the same length', p.width - 16, 12);
  };
};

let mstSketchInst: p5 | null = null;

function mstWire() {
  const gap = () => Math.max(M().step * 2, (M().max - M().min) * 0.05);
  const s0 = document.getElementById('thMX0') as HTMLInputElement;
  const s100 = document.getElementById('thMX100') as HTMLInputElement;
  const st = document.getElementById('thMXt') as HTMLInputElement;

  s0.addEventListener('input', () => {
    const P = M();
    P.x0 = Math.min(+s0.value, P.x100 - gap());
    s0.value = `${P.x0}`;
    mstReadouts();
  });
  s100.addEventListener('input', () => {
    const P = M();
    P.x100 = Math.max(+s100.value, P.x0 + gap());
    s100.value = `${P.x100}`;
    mstReadouts();
  });
  st.addEventListener('input', () => {
    M().xt = +st.value;
    mstReadouts();
  });
  wireSegmented('thMasterProps', (k) => {
    mst.key = k;
    mstSyncSliders();
    mstReadouts();
  });
  mstSyncSliders();
  mstReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   4 · THERMOMETERS AND THEIR RANGES
   Five instruments drawn on one real temperature axis. Every endpoint is
   a piece of physics, not a marketing spec - tap a bar to see which.
   ══════════════════════════════════════════════════════════════════════ */

interface TType {
  name: string; prop: string; lo: number; hi: number; open: boolean; col: string;
  why: string;
}

const TTYPES: TType[] = [
  {
    name: 'Mercury', prop: 'length of the mercury column', lo: -30, hi: 300, open: false, col: '#e11d48',
    why: 'Mercury freezes at −39 °C. Once it is solid it cannot expand any more, so the low end stops around −30 °C - below that, use alcohol, which freezes only at −115 °C. The top end is set by mercury boiling at 357 °C.',
  },
  {
    name: 'Constant volume gas', prop: 'pressure of a gas at fixed volume', lo: -268, hi: 1500, open: false, col: '#295990',
    why: 'This one goes lowest, and it is the thermometer every other thermometer is checked against. It works so far down because a gas stays a gas long after liquids have frozen solid. Remember it - the next lecture starts here.',
  },
  {
    name: 'Platinum resistance', prop: 'electrical resistance of platinum', lo: -200, hi: 1200, open: false, col: '#7c3aed',
    why: 'The resistance of platinum rises in an almost perfect straight line with temperature, so labs use it when they need an accurate answer. Above about 1200 °C the platinum gets spoiled and the readings drift.',
  },
  {
    name: 'Thermocouple', prop: 'thermo-emf across a junction of two metals', lo: -200, hi: 1600, open: false, col: '#0d9488',
    why: 'Join two different metals and heat the joint: a small voltage appears, and it grows with temperature. Cheap, tiny, reacts fast, and it survives up to about 1600 °C.',
  },
  {
    name: 'Radiation pyrometer', prop: 'radiation emitted by the body', lo: 800, hi: 1700, open: true, col: '#f59e0b',
    why: 'It NEVER TOUCHES the hot body - it just reads the radiation coming off it, which grows as T⁴ (Stefan\'s law, which comes back in Heat Transfer). Since nothing has to touch anything, there is NO UPPER LIMIT: furnaces, molten steel, even stars. It fails below 800 °C, because a cool body gives off too little radiation to pick up.',
  },
];

const typ = { sel: -1, grow: 0 };

function typInfo() {
  const lab = document.getElementById('thTypeLab')!;
  const info = document.getElementById('thTypeInfo')!;
  if (typ.sel < 0) {
    lab.textContent = 'Tap a bar above';
    info.textContent = 'Each bar is one instrument drawn on a real temperature axis. Tap any of them to see its thermometric property and the physical reason its range stops where it stops.';
    return;
  }
  const T = TTYPES[typ.sel];
  lab.textContent = `${T.name}  ·  ${T.lo} to ${T.open ? 'no upper limit' : `${T.hi} °C`}`;
  info.innerHTML = `<b>Thermometric property:</b> ${T.prop}.<br>${T.why}`;
}

const typSketch = (p: p5) => {
  const holder = document.getElementById('thTypesCanvas')!;
  const canvasH = () => Math.max(400, Math.min(500, Math.round(holder.clientWidth * 0.36)));
  const AX_LO = -300, AX_HI = 1700;
  const gl = () => Math.min(200, p.width * 0.22);
  const gr = () => p.width - 40;
  const barY = (i: number) => 78 + i * ((p.height - 150) / TTYPES.length) + 16;
  const barH = 30;

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  const X = (t: number) => gl() + ((t - AX_LO) / (AX_HI - AX_LO)) * (gr() - gl());

  p.mousePressed = () => {
    if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;
    for (let i = 0; i < TTYPES.length; i++) {
      const y = barY(i);
      if (p.mouseY >= y - barH / 2 - 6 && p.mouseY <= y + barH / 2 + 6) {
        typ.sel = typ.sel === i ? -1 : i;
        typInfo();
        return;
      }
    }
  };

  p.draw = () => {
    p.background(C.paper);
    p.textFont('DM Sans');
    typ.grow = Math.min(1, typ.grow + dt(p) * 1.2);
    const e = 1 - Math.pow(1 - typ.grow, 3);      // ease-out

    /* axis */
    const yAx = p.height - 52;
    p.stroke(C.navy);
    p.strokeWeight(2.5);
    p.line(gl(), yAx, gr(), yAx);
    p.noStroke();
    p.fill(C.dark);
    p.textSize(12.5);
    p.textAlign(p.CENTER, p.TOP);
    for (let t = -200; t <= 1600; t += 200) {
      p.stroke(41, 89, 144, 26);
      p.strokeWeight(1);
      p.line(X(t), 62, X(t), yAx);
      p.noStroke();
      p.fill(C.dark);
      p.text(`${t}`, X(t), yAx + 7);
    }
    p.textAlign(p.CENTER, p.TOP);
    p.text('temperature (°C)', (gl() + gr()) / 2, yAx + 28);

    /* mercury-freezes marker */
    p.stroke(C.red);
    p.strokeWeight(2);
    dashed(p, true, [6, 5]);
    p.line(X(-39), 62, X(-39), yAx);
    dashed(p, false);
    p.noStroke();
    p.fill(C.red);
    p.textSize(12.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text('mercury freezes, −39 °C', X(-39) + 6, 40);

    /* bars */
    TTYPES.forEach((T, i) => {
      const y = barY(i);
      const x1 = X(T.lo);
      const x2raw = T.open ? gr() - 22 : X(T.hi);
      const x2 = x1 + (x2raw - x1) * e;
      const on = typ.sel === i;

      p.noStroke();
      p.fill(C.navy);
      p.textSize(on ? 15.5 : 14.5);
      p.textAlign(p.RIGHT, p.CENTER);
      p.text(T.name, gl() - 12, y);

      const c = p.color(T.col);
      c.setAlpha(typ.sel < 0 || on ? 255 : 90);
      p.fill(c);
      p.rect(x1, y - barH / 2, Math.max(2, x2 - x1), barH, 9);
      if (on) {
        p.noFill();
        p.stroke(C.navy);
        p.strokeWeight(3);
        p.rect(x1 - 3, y - barH / 2 - 3, Math.max(2, x2 - x1) + 6, barH + 6, 11);
        p.noStroke();
      }
      if (T.open && e > 0.98) {
        p.stroke(c);
        p.strokeWeight(4);
        arrow(p, x2, y, x2 + 20, y, 11);
        p.noStroke();
        p.fill(T.col);
        p.textSize(12.5);
        p.textAlign(p.RIGHT, p.BOTTOM);
        p.text('no upper limit', x2 + 18, y - barH / 2 - 4);
      }
      /* endpoint numbers */
      p.noStroke();
      p.fill(255);
      p.textSize(12.5);
      p.textAlign(p.LEFT, p.CENTER);
      if (x2 - x1 > 120) {
        p.text(`${T.lo}`, x1 + 8, y);
        if (!T.open) {
          p.textAlign(p.RIGHT, p.CENTER);
          p.text(`${T.hi}`, x2 - 8, y);
        }
      }
    });

    p.noStroke();
    p.fill(C.grey);
    p.textSize(13.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text('Tap any bar to see what it measures and why its range stops there.', 16, 12);
  };
};

let typSketchInst: p5 | null = null;

/* ══════════════════════════════════════════════════════════════════════
   5 · FAULTY THERMOMETERS
   The faulty ruler is drawn beside the true one, sharing the pixel axis
   through the calibration link. Both errors - shifted zero and wrong
   division size - become visible at once.
   ══════════════════════════════════════════════════════════════════════ */

const flt = { ice: 5, steam: 99, read: 52 };
const fltTrue = () => ((flt.read - flt.ice) / (flt.steam - flt.ice)) * 100;
const fltNaive = () => flt.read - flt.ice;

function fltReadouts() {
  const t = fltTrue(), n = fltNaive();
  document.getElementById('thFTrue')!.textContent = `${fmt(t, 2)} °C`;
  document.getElementById('thFNaive')!.textContent = `${fmt(n, 2)} °C`;
  document.getElementById('thFErr')!.textContent = `${n - t >= 0 ? '+' : ''}${fmt(n - t, 2)} °C`;
  document.getElementById('thFF')!.textContent = `${fmt(t * 9 / 5 + 32, 1)} °F`;
  katex.render(
    String.raw`t=\dfrac{${flt.read}-(${flt.ice})}{${flt.steam}-(${flt.ice})}\times 100
      =\dfrac{${fmt(flt.read - flt.ice, 0)}}{${fmt(flt.steam - flt.ice, 0)}}\times 100=\mathbf{${fmt(fltTrue(), 2)}}\ ^\circ\mathrm{C}`,
    document.getElementById('thFLine')!, KO
  );
}

const fltSketch = (p: p5) => {
  const holder = document.getElementById('thFaultyCanvas')!;
  const canvasH = () => Math.max(420, Math.min(560, Math.round(holder.clientWidth * 0.42)));
  const T_LO = -25, T_HI = 130;                     // true-scale window

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    p.textFont('DM Sans');

    const top = 92, bot = p.height - 46;
    const Y = (T: number) => bot - ((T - T_LO) / (T_HI - T_LO)) * (bot - top);
    /* a faulty reading f corresponds to this true temperature */
    const trueOf = (f: number) => ((f - flt.ice) / (flt.steam - flt.ice)) * 100;

    const xF = p.width * 0.5 - 190;    // faulty ruler
    const xT = p.width * 0.5 + 150;    // true ruler
    const rw = 34;

    /* ── true Celsius ruler ── */
    p.fill(255);
    p.stroke(41, 89, 144, 90);
    p.strokeWeight(2);
    p.rect(xT - rw / 2, top, rw, bot - top, 10);
    for (let T = -20; T <= 130; T += 5) {
      const y = Y(T);
      if (y < top || y > bot) continue;
      const major = T % 20 === 0;
      p.stroke(major ? C.navy : p.color(41, 89, 144, 90));
      p.strokeWeight(major ? 2 : 1);
      p.line(xT + rw / 2 + 2, y, xT + rw / 2 + (major ? 18 : 9), y);
      if (major) {
        p.noStroke();
        p.fill(C.navy);
        p.textSize(12.5);
        p.textAlign(p.LEFT, p.CENTER);
        p.text(`${T}`, xT + rw / 2 + 22, y);
      }
    }
    /* ice + steam anchors on the true scale */
    [[0, 'ICE POINT', C.accent], [100, 'STEAM POINT', C.red]].forEach(([T, lab, col]) => {
      const y = Y(T as number);
      p.stroke(col as string);
      p.strokeWeight(3);
      p.line(xF - rw / 2 - 20, y, xT + rw / 2 + 18, y);
      p.noStroke();
      p.fill(col as string);
      p.textSize(13);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.text(`${lab}  ·  true ${T} °C`, (xF + xT) / 2, y - 5);
    });

    /* ── faulty ruler: its own numbers, placed where they really are ── */
    p.fill(255);
    p.stroke(225, 29, 72, 110);
    p.strokeWeight(2);
    p.rect(xF - rw / 2, top, rw, bot - top, 10);
    const fLo = flt.ice + ((T_LO / 100) * (flt.steam - flt.ice));
    const fHi = flt.ice + ((T_HI / 100) * (flt.steam - flt.ice));
    const fStart = Math.ceil(fLo / 5) * 5;
    for (let f = fStart; f <= fHi; f += 5) {
      const y = Y(trueOf(f));
      if (y < top || y > bot) continue;
      const major = f % 20 === 0;
      p.stroke(major ? C.red : p.color(225, 29, 72, 95));
      p.strokeWeight(major ? 2 : 1);
      p.line(xF - rw / 2 - (major ? 18 : 9), y, xF - rw / 2 - 2, y);
      if (major) {
        p.noStroke();
        p.fill(C.red);
        p.textSize(12.5);
        p.textAlign(p.RIGHT, p.CENTER);
        p.text(`${f}`, xF - rw / 2 - 22, y);
      }
    }

    /* mercury columns, both up to the same physical level */
    const yRead = Y(fltTrue());
    p.noStroke();
    p.fill(C.red);
    p.rect(xF - rw / 2 + 5, yRead, rw - 10, bot - 6 - yRead, 5);
    p.circle(xF, bot + 2, 40);
    p.fill(C.accent);
    p.rect(xT - rw / 2 + 5, yRead, rw - 10, bot - 6 - yRead, 5);
    p.circle(xT, bot + 2, 40);

    /* the reading line across both */
    p.stroke(C.navy);
    p.strokeWeight(2.5);
    dashed(p, true, [7, 5]);
    p.line(xF - rw / 2 - 40, yRead, xT + rw / 2 + 60, yRead);
    dashed(p, false);
    chip(p, `faulty says ${flt.read}`, xF - rw / 2 - 44, yRead - 12, 'right', 16, C.red);
    chip(p, `truth is ${fmt(fltTrue(), 2)} °C`, xT + rw / 2 + 64, yRead - 12, 'left', 16, C.green);

    /* where the "just subtract the error" shortcut lands - always shown,
       since the gap is usually only a few degrees and that is the point */
    const yN = Y(fltNaive());
    if (yN > top && yN < bot) {
      const err = fltNaive() - fltTrue();
      p.stroke(C.amber);
      p.strokeWeight(2);
      dashed(p, true, [4, 4]);
      p.line(xT - rw / 2 - 10, yN, xT + rw / 2 + 60, yN);
      dashed(p, false);
      if (Math.abs(yN - yRead) > 4) {
        p.stroke(C.amber);
        p.strokeWeight(3);
        arrow(p, xT + rw / 2 + 42, yN, xT + rw / 2 + 42, yRead, 9);
      }
      const near = Math.abs(yN - yRead) < 34;
      const chipY = near ? yRead + 26 : (yN < yRead ? yN - 46 : yN + 10);
      chip(p, `shortcut says ${fmt(fltNaive(), 2)} °C  ✗\nwrong by ${err >= 0 ? '+' : ''}${fmt(err, 2)} °C`,
        xT + rw / 2 + 66, chipY, 'left', 15, '#b45309');
    }

    /* headers */
    p.noStroke();
    p.fill(C.red);
    p.textSize(16);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text('FAULTY SCALE', xF, top - 24);
    p.fill(C.green);
    p.text('TRUE CELSIUS', xT, top - 24);
    p.fill(C.grey);
    p.textSize(13);
    p.text(`ice reads ${flt.ice}, steam reads ${flt.steam}`, xF, top - 6);
    p.text('ice 0, steam 100', xT, top - 6);

    /* division-size comparison */
    const divSize = (flt.steam - flt.ice) / 100;
    p.fill(C.navy);
    p.textSize(13.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`Two things are wrong at once: the zero is off by ${flt.ice}, and one division here is only ${fmt(divSize, 3)} of a real degree.`, 16, 12);
  };
};

let fltSketchInst: p5 | null = null;

function fltWire() {
  const bind = (id: string, valId: string, set: (v: number) => void) => {
    const el = document.getElementById(id) as HTMLInputElement;
    el.addEventListener('input', () => {
      set(+el.value);
      document.getElementById(valId)!.textContent = el.value;
      fltReadouts();
    });
  };
  bind('thFIce', 'thFIceVal', (v) => { flt.ice = v; });
  bind('thFStm', 'thFStmVal', (v) => { flt.steam = v; });
  bind('thFRd', 'thFRdVal', (v) => { flt.read = v; });
  fltReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   6 · RAPID FIRE RECAP
   ══════════════════════════════════════════════════════════════════════ */

const QS = [
  {
    q: 'Why can nothing measure temperature directly?',
    opts: ['Because thermometers are not accurate enough yet',
      'Because nothing can feel temperature - we always measure something else that changes with it',
      'Because temperature is not a real quantity'],
    correct: 1,
    fb: 'Every thermometer measures a thermometric property - a length, a pressure, a resistance - and then converts it. Nothing senses temperature itself.',
  },
  {
    q: 'A thermometric property is only usable if it...',
    opts: ['is easy to see', 'changes in a straight line with temperature over the range you use', 'belongs to a liquid'],
    correct: 1,
    fb: 'A straight line is what turns the reading into a simple proportion. Where the line bends, the thermometer is out of range - that is why ranges exist.',
  },
  {
    q: 'A gas thermometer reads p₀ = 80 cm, p₁₀₀ = 110 cm, and 95 cm in a bath. The temperature is:',
    opts: ['15 °C', '50 °C', '95 °C'],
    correct: 1,
    fb: 't = [(95 − 80)/(110 − 80)] × 100 = (15/30) × 100 = 50 °C. Same master formula - X is just called p here.',
  },
  {
    q: 'A faulty thermometer reads 5 in ice and 99 in steam. To correct a reading you should:',
    opts: ['subtract 5 from the reading',
      'use the proportion formula with 5 and 99 as the fixed points',
      'add 1 to the reading'],
    correct: 1,
    fb: 'Subtracting only fixes the wrong zero. The divisions are the wrong size too, and only the proportion fixes both at once.',
  },
  {
    q: 'Which thermometer has no upper limit at all, and why?',
    opts: ['Mercury, because glass can take heat',
      'The radiation pyrometer, because it never touches the hot body',
      'The thermocouple, because metals conduct well'],
    correct: 1,
    fb: 'It reads the radiation coming off the body, so nothing has to touch the hot thing. It fails at the LOW end instead - below 800 °C a body gives off too little radiation to pick up.',
  },
];

let qIdx = 0;
const qDone: boolean[] = new Array(QS.length).fill(false);

function qRender() {
  const item = QS[qIdx];
  document.getElementById('thQTag')!.textContent = `Rapid fire · Question ${qIdx + 1} / ${QS.length}`;
  document.getElementById('thQQ')!.textContent = item.q;
  const fb = document.getElementById('thQFb')!;
  fb.classList.remove('shown');
  fb.textContent = item.fb;
  const holder = document.getElementById('thQOpts')!;
  holder.innerHTML = '';
  item.opts.forEach((opt, i) => {
    const b = document.createElement('button');
    b.className = 'th-opt';
    b.textContent = opt;
    b.addEventListener('click', () => {
      if (qDone[qIdx]) return;
      qDone[qIdx] = true;
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

function qWire() {
  document.getElementById('thQPrev')!.addEventListener('click', () => {
    if (qIdx > 0) { qIdx--; qRender(); }
  });
  document.getElementById('thQNext')!.addEventListener('click', () => {
    if (qIdx < QS.length - 1) { qIdx++; qRender(); }
  });
  qRender();
}

/* ══════════════════════════════════════════════════════════════════════
   screen-init registry (consumed by go() in studio-core.js)
   ══════════════════════════════════════════════════════════════════════ */

let calPane = 'thCalA';

function mount(inst: p5 | null, sk: (p: p5) => void, holderId: string): p5 {
  if (inst) { inst.windowResized?.(); return inst; }
  return new p5(sk, document.getElementById(holderId)!);
}

function calMount() {
  if (calPane === 'thCalA') calSketchInst = mount(calSketchInst, calSketch, 'thCalCanvas');
  else cmpSketchInst = mount(cmpSketchInst, cmpSketch, 'thCmpCanvas');
}

(window as any).SCREEN_INIT = {
  why: () => { whySketchInst = mount(whySketchInst, whySketch, 'thWhyCanvas'); },
  calibrate: calMount,
  master: () => { mstSketchInst = mount(mstSketchInst, mstSketch, 'thMasterCanvas'); },
  types: () => { typSketchInst = mount(typSketchInst, typSketch, 'thTypesCanvas'); },
  faulty: () => { fltSketchInst = mount(fltSketchInst, fltSketch, 'thFaultyCanvas'); },
  homework: () => { /* no canvas - the cards and quiz are plain DOM */ },
};

/* ══════════════════════════════════════════════════════════════════════
   boot
   ══════════════════════════════════════════════════════════════════════ */
whyWire();
calWire();
mstWire();
fltWire();
qWire();
typInfo();
wireReveal('.th-eg', 'revealed');
wireReveal('.th-hw', 'open');
wireTabs('thCalTabs', (id) => { calPane = id; calMount(); });
wireTabs('thHwTabs', () => { /* both homework panes are plain DOM */ });
