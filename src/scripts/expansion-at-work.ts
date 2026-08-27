/* ═══════════ Thermometry Studio · Expansion at Work ═══════════
   Animation-only lecture. Five screens on window.SCREEN_INIT:

     ruler  - a scale whose divisions grew, so the READING falls while the
              ruler itself gets longer: the two questions pulled apart
     clock  - a pendulum clock drifting against a correct one, and a second
              pane where two different periods drift by the same amount
     strip  - a bimetallic strip, with an unglue button that makes the
              argument obvious, then the same strip wired as a thermostat
     ball   - iron ball vs brass hole: only (α₁ − α₂) matters
     stress - a clamped rod, where the length cancels out of the answer

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

function dt(p: p5) { return Math.min(p.deltaTime || 16.7, 120) / 1000; }

function dashed(p: p5, on: boolean, pattern: number[] = [6, 6]) {
  (p.drawingContext as CanvasRenderingContext2D).setLineDash(on ? pattern : []);
}

function ease(cur: number, target: number, rate: number, d: number) {
  return cur + (target - cur) * (1 - Math.exp(-rate * d));
}

const HEAT_STOPS: Array<[number, [number, number, number]]> = [
  [-100, [30, 64, 140]],
  [-30, [96, 165, 250]],
  [20, [186, 210, 232]],
  [90, [250, 204, 120]],
  [200, [242, 130, 60]],
  [400, [186, 24, 24]],
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

/* ───────── materials ───────── */
interface Mat { name: string; alpha: number; Y: number; col: string; }
const MATS: Record<string, Mat> = {
  steel: { name: 'Steel', alpha: 1.2e-5, Y: 2.0e11, col: '#295990' },
  copper: { name: 'Copper', alpha: 1.7e-5, Y: 1.2e11, col: '#b45309' },
  brass: { name: 'Brass', alpha: 2.0e-5, Y: 1.0e11, col: '#a16207' },
  alu: { name: 'Aluminium', alpha: 2.4e-5, Y: 0.7e11, col: '#7c3aed' },
  invar: { name: 'Invar', alpha: 1.2e-6, Y: 1.4e11, col: '#0f766e' },
};

/* ══════════════════════════════════════════════════════════════════════
   1 · THE LYING RULER
   Divisions grow by (1 + αΔT), so an object of true length L spans
   L/(1 + αΔT) of them. The reading falls; the ruler got longer. Both
   statements are true at once and they point opposite ways.
   ══════════════════════════════════════════════════════════════════════ */

const CAL_T = 20;                                  // calibration temperature
const ruler = { t: 40, L: 60, mat: 'steel', shown: 40 };

function rulerReadouts() {
  const M = MATS[ruler.mat];
  const f = 1 + M.alpha * (ruler.shown - CAL_T);
  const read = ruler.L / f;
  el('l4RRead').textContent = `${fmt(read, 4)} cm`;
  el('l4RTrue').textContent = `${fmt(ruler.L, 2)} cm`;
  el('l4RErr').textContent = `${fmt(Math.abs(ruler.L - read) * 10, 4)} mm`;
  const d = el('l4RDir');
  if (Math.abs(ruler.shown - CAL_T) < 0.5) {
    d.textContent = 'at calibration - honest'; d.style.color = C.green;
  } else if (ruler.shown > CAL_T) {
    d.textContent = 'reads TOO SMALL'; d.style.color = C.red;
  } else {
    d.textContent = 'reads TOO LARGE'; d.style.color = C.accent;
  }
  katex.render(
    String.raw`\text{true} = \text{reading}\,(1+\alpha\,\Delta T)
      = ${fmt(read, 4)}\bigl(1 + ${fmt(M.alpha * 1e5, 1)}\times10^{-5}\times(${fmt(ruler.shown - CAL_T, 0)})\bigr)
      = \mathbf{${fmt(ruler.L, 3)}}\ \mathrm{cm}`,
    el('l4RWork'), KO
  );
}

const rulerSketch = (p: p5) => {
  const holder = el('l4RulerCanvas');
  const canvasH = () => Math.max(400, Math.min(500, Math.round(holder.clientWidth * 0.36)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    ruler.shown = ease(ruler.shown, ruler.t, 4, dt(p));
    p.textFont('DM Sans');

    const M = MATS[ruler.mat];
    const dT = ruler.shown - CAL_T;
    /* The true drift is ~10⁻⁴ of a division, invisible. The picture
       exaggerates it enough to see the divisions disagree; the numbers on
       the readouts stay real, so the drawing is never labelled with a
       magnified value that would contradict them. */
    const MAG = 70;
    const f = 1 + M.alpha * dT * MAG;

    const x0 = 70, span = p.width - 330;
    const pxPerCm = span / 100;                       // 100 cm of true scale
    const objW = ruler.L * pxPerCm;
    const objY = 92, calY = 176, hotY = 268;

    /* ── the object being measured: it never changes ── */
    p.noStroke();
    p.fill(41, 89, 144, 40);
    p.rect(x0, objY, objW, 34, 6);
    p.stroke(C.navy);
    p.strokeWeight(2.4);
    p.noFill();
    p.rect(x0, objY, objW, 34, 6);
    chip(p, `the object · truly ${fmt(ruler.L, 1)} cm, and it never changes`,
      x0, objY - 30, 'left', 14, C.navy);

    /* ── a scale drawn at some division width ── */
    const drawScale = (y: number, divW: number, col: string, label: string, upto: number) => {
      p.noStroke();
      p.fill(255);
      p.rect(x0, y, span, 46, 5);
      p.stroke(41, 89, 144, 70);
      p.strokeWeight(1.6);
      p.noFill();
      p.rect(x0, y, span, 46, 5);
      for (let k = 0; k * divW <= span + 0.5; k++) {
        const x = x0 + k * divW;
        if (x > x0 + span) break;
        const major = k % 10 === 0;
        p.stroke(major ? C.navy : p.color(41, 89, 144, 110));
        p.strokeWeight(major ? 2 : 1);
        p.line(x, y, x, y + (major ? 20 : 11));
        if (major && k % 20 === 0 && x < x0 + span - 14) {
          p.noStroke();
          p.fill(C.dark);
          p.textSize(11.5);
          p.textAlign(p.CENTER, p.TOP);
          p.text(`${k}`, x, y + 23);
        }
      }
      /* how far the object reaches across this scale */
      p.noStroke();
      p.fill(p.color(col));
      p.rect(x0, y + 38, Math.min(upto * divW, span), 6, 3);
      chip(p, label, x0 + span + 14, y + 6, 'left', 13, col);
    };

    /* the scale as it was when it was made, and as it is now */
    drawScale(calY, pxPerCm, C.grey, `made at ${CAL_T} °C\nevery division a true cm`, ruler.L);
    drawScale(hotY, pxPerCm * f, C.red, `now at ${fmt(ruler.shown, 0)} °C\nevery division ${dT >= 0 ? 'wider' : 'narrower'}`,
      ruler.L / (1 + M.alpha * dT * MAG));

    /* drop lines from the end of the object onto both scales */
    const reading = ruler.L / (1 + M.alpha * dT * MAG);
    p.stroke(C.navy);
    p.strokeWeight(1.6);
    dashed(p, true, [5, 4]);
    p.line(x0 + objW, objY + 34, x0 + objW, hotY + 46);
    dashed(p, false);

    p.noStroke();
    p.fill(C.grey);
    p.circle(x0 + ruler.L * pxPerCm, calY + 41, 12);
    p.fill(C.red);
    p.circle(x0 + reading * pxPerCm * f, hotY + 41, 12);

    chip(p, `lands on ${fmt(ruler.L, 1)} — correct`,
      x0 + ruler.L * pxPerCm, calY + 52, 'center', 13, C.grey);
    chip(p, Math.abs(dT) < 0.5 ? 'lands in the same place'
      : dT > 0 ? 'lands SHORT of the mark' : 'lands PAST the mark',
      x0 + reading * pxPerCm * f, hotY + 52, 'center', 13.5, C.red);

    /* the chain of reasoning, spelled out */
    const cy = hotY + 96;
    const steps = dT >= 0
      ? ['divisions are WIDER', 'FEWER fit across it', 'the reading is SMALLER', 'true length is MORE']
      : ['divisions are NARROWER', 'MORE fit across it', 'the reading is BIGGER', 'true length is LESS'];
    if (Math.abs(dT) > 0.5) {
      let x = x0;
      steps.forEach((s, i) => {
        p.textSize(13.5);
        const w = p.textWidth(s) + 22;
        p.noStroke();
        p.fill(dT >= 0 ? p.color(225, 29, 72, 26) : p.color(0, 160, 227, 30));
        p.rect(x, cy, w, 30, 8);
        p.fill(dT >= 0 ? C.red : C.accent);
        p.textAlign(p.LEFT, p.CENTER);
        p.text(s, x + 11, cy + 16);
        if (i < steps.length - 1) {
          p.stroke(C.grey);
          p.strokeWeight(1.8);
          arrow(p, x + w + 6, cy + 15, x + w + 22, cy + 15, 6);
        }
        x += w + 30;
      });
    }

    chip(p, `division width exaggerated ${MAG}× so the two scales visibly disagree — `
      + 'the readouts below carry the real numbers',
      x0, p.height - 34, 'left', 13, C.grey);
  };
};

let rulerInst: p5 | null = null;

function rulerWire() {
  const st = slider('l4RT'), sl = slider('l4RL');
  st.addEventListener('input', () => {
    ruler.t = +st.value;
    el('l4RTVal').textContent = `${ruler.t} °C`;
    rulerReadouts();
  });
  sl.addEventListener('input', () => {
    ruler.L = +sl.value / 10;
    el('l4RLVal').textContent = `${fmt(ruler.L, 1)} cm`;
    rulerReadouts();
  });
  wireSegmented('l4RMat', 'mat', (k) => { ruler.mat = k; rulerReadouts(); });
  rulerReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   2a · CLOCK RUNS SLOW
   Δt = ½ α Δθ · t. The drift over a week is tens of seconds, so the two
   clock faces are run in fast-forward and the lag is shown on a dial of
   its own rather than hoping anyone can see a 36 s gap on an hour hand.
   ══════════════════════════════════════════════════════════════════════ */

const DAY = 86400;
const clock = { dTh: 10, mat: 'steel', days: 0, run: false, swing: 0 };

const driftPerDay = (m: string, dTh: number) => 0.5 * MATS[m].alpha * dTh * DAY;

function clockReadouts() {
  const M = MATS[clock.mat];
  const per = driftPerDay(clock.mat, clock.dTh);
  const lag = per * clock.days;
  el('l4CDays').textContent = fmt(clock.days, 2);
  el('l4CPer').textContent = `${fmt(Math.abs(per), 2)} s`;
  el('l4CLag').textContent = `${fmt(Math.abs(lag), 1)} s`;
  const d = el('l4CDir');
  if (Math.abs(clock.dTh) < 0.5) { d.textContent = 'keeping time'; d.style.color = C.green; }
  else if (clock.dTh > 0) { d.textContent = 'LOSING - runs slow'; d.style.color = C.red; }
  else { d.textContent = 'GAINING - runs fast'; d.style.color = C.accent; }

  katex.render(
    String.raw`\Delta t = \tfrac12\,\alpha\,\Delta\theta\;t
      = \tfrac12(${fmt(M.alpha * 1e5, 2)}\times10^{-5})(${fmt(clock.dTh, 0)})(${fmt(clock.days, 2)}\times86400)
      = \mathbf{${fmt(Math.abs(lag), 1)}}\ \mathrm{s}\ \text{${clock.dTh >= 0 ? 'behind' : 'ahead'}}`,
    el('l4CWork'), KO
  );
}

const clockSketch = (p: p5) => {
  const holder = el('l4ClockCanvas');
  const canvasH = () => Math.max(420, Math.min(520, Math.round(holder.clientWidth * 0.4)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  /* a clock face showing a time in seconds since midnight */
  const face = (cx: number, cy: number, r: number, secs: number, col: string, label: string) => {
    p.noStroke();
    p.fill(255);
    p.circle(cx, cy, r * 2);
    p.stroke(col);
    p.strokeWeight(3.4);
    p.noFill();
    p.circle(cx, cy, r * 2);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 - Math.PI / 2;
      p.stroke(41, 89, 144, k % 3 === 0 ? 190 : 90);
      p.strokeWeight(k % 3 === 0 ? 2.6 : 1.4);
      p.line(cx + (r - 12) * Math.cos(a), cy + (r - 12) * Math.sin(a),
        cx + (r - 4) * Math.cos(a), cy + (r - 4) * Math.sin(a));
    }
    const hour = (secs / 3600) % 12, minute = (secs / 60) % 60;
    const ha = (hour / 12) * Math.PI * 2 - Math.PI / 2;
    const ma = (minute / 60) * Math.PI * 2 - Math.PI / 2;
    p.stroke(C.navy);
    p.strokeWeight(4.6);
    p.line(cx, cy, cx + r * 0.5 * Math.cos(ha), cy + r * 0.5 * Math.sin(ha));
    p.strokeWeight(3);
    p.line(cx, cy, cx + r * 0.74 * Math.cos(ma), cy + r * 0.74 * Math.sin(ma));
    p.noStroke();
    p.fill(col);
    p.circle(cx, cy, 10);
    p.textSize(14.5);
    p.textAlign(p.CENTER, p.TOP);
    p.fill(col);
    p.text(label, cx, cy + r + 14);
  };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    p.textFont('DM Sans');

    if (clock.run && clock.days < 7) {
      clock.days = Math.min(7, clock.days + d * 1.4);        // a week in ~5 s
      clockReadouts();
    }
    clock.swing += d * 2.4;

    const M = MATS[clock.mat];
    const lag = driftPerDay(clock.mat, clock.dTh) * clock.days;
    const trueSecs = clock.days * DAY;

    /* ── the pendulum, for flavour, with its length change exaggerated ── */
    const px = Math.min(p.width * 0.22, 210);
    const pivotX = px, pivotY = 66;
    const baseL = p.height - 258;
    const LEN_MAG = 220;
    const L = baseL * (1 + M.alpha * clock.dTh * LEN_MAG);
    const ang = 0.34 * Math.sin(clock.swing);
    const bx = pivotX + L * Math.sin(ang), by = pivotY + L * Math.cos(ang);

    p.noStroke();
    p.fill(41, 89, 144, 20);
    p.rect(16, 40, px * 1.5, p.height - 80, 16);

    /* the length it started at, ghosted */
    p.stroke(41, 89, 144, 80);
    p.strokeWeight(1.6);
    dashed(p, true, [5, 4]);
    p.line(pivotX - 40, pivotY + baseL, pivotX + 40, pivotY + baseL);
    dashed(p, false);

    const [r, g, b] = heatRGB(20 + clock.dTh);
    p.stroke(C.dark);
    p.strokeWeight(3);
    p.line(pivotX, pivotY, bx, by);
    p.noStroke();
    p.fill(C.navy);
    p.circle(pivotX, pivotY, 12);
    p.fill(r, g, b);
    p.circle(bx, by, 34);
    p.stroke(C.navy);
    p.strokeWeight(2.4);
    p.noFill();
    p.circle(bx, by, 34);

    chip(p, `${M.name} rod\nα = ${(M.alpha * 1e5).toFixed(2)} × 10⁻⁵`, 28, 52, 'left', 13, C.dark);
    if (Math.abs(clock.dTh) > 0.5) {
      chip(p, clock.dTh > 0 ? 'longer → slower' : 'shorter → faster',
        pivotX, pivotY + baseL + 26, 'center', 13.5, clock.dTh > 0 ? C.red : C.accent);
    }

    /* ── the two clock faces ── */
    const r0 = Math.min(96, (p.height - 190) * 0.42);
    const cy = p.height * 0.42;
    face(p.width * 0.52, cy, r0, trueSecs, C.green, 'the real time');
    face(p.width * 0.79, cy, r0, trueSecs - lag, C.red, 'this clock');

    /* ── the lag, on a scale of its own ── */
    const bx0 = p.width * 0.42, bw = p.width * 0.5, by0 = cy + r0 + 62;
    p.noStroke();
    p.fill(41, 89, 144, 22);
    p.rect(bx0, by0, bw, 20, 10);
    const maxLag = Math.max(1, Math.abs(driftPerDay(clock.mat, clock.dTh) * 7));
    p.fill(clock.dTh >= 0 ? C.red : C.accent);
    p.rect(bx0, by0, bw * Math.min(1, Math.abs(lag) / maxLag), 20, 10);
    p.fill(C.navy);
    p.textSize(15);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`${clock.dTh >= 0 ? 'behind' : 'ahead'} by ${fmt(Math.abs(lag), 1)} s `
      + `after ${fmt(clock.days, 2)} days`, bx0, by0 + 28);

    chip(p, `pendulum length change drawn ${LEN_MAG}× oversize`,
      16, p.height - 32, 'left', 12.5, C.grey);
  };
};

let clockInst: p5 | null = null;

function clockWire() {
  const st = slider('l4CT');
  st.addEventListener('input', () => {
    clock.dTh = +st.value;
    el('l4CTVal').textContent = `${clock.dTh >= 0 ? '+' : ''}${clock.dTh} °C`;
    clockReadouts();
  });
  wireSegmented('l4CMat', 'mat', (k) => { clock.mat = k; clockReadouts(); });
  el('l4CRun').addEventListener('click', () => { clock.run = true; });
  el('l4CRst').addEventListener('click', () => {
    clock.run = false; clock.days = 0; clockReadouts();
  });
  clockReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   2b · THE PERIOD CANCELS
   A 1 s pendulum and a 4 s one, side by side. One swings four times as
   often; both lose exactly the same seconds per day.
   ══════════════════════════════════════════════════════════════════════ */

const per = { dTh: 10, run: false, t: 0 };

function perReadouts() {
  const lose = driftPerDay('steel', per.dTh);
  el('l4C2A').textContent = 'T = 1.0 s  ·  0.25 m';
  el('l4C2B').textContent = 'T = 4.0 s  ·  3.97 m';
  el('l4C2Lag').textContent = `${fmt(Math.abs(lose), 2)} s — both`;
}

const perSketch = (p: p5) => {
  const holder = el('l4Clock2Canvas');
  const canvasH = () => Math.max(400, Math.min(500, Math.round(holder.clientWidth * 0.36)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    if (per.run) per.t += d;
    p.textFont('DM Sans');

    const lose = driftPerDay('steel', per.dTh);
    const top = 62, maxL = p.height - 190;

    /* two pendulums whose lengths are in the ratio 1 : 16, so the periods
       are 1 s and 4 s - and both drift by the same number of seconds */
    const bobs: Array<[number, number, number, string]> = [
      [p.width * 0.28, maxL * 0.25, 1.0, 'short  ·  T = 1 s'],
      [p.width * 0.7, maxL, 4.0, 'long  ·  T = 4 s'],
    ];

    bobs.forEach(([cx, L, T, label]) => {
      const ang = 0.3 * Math.sin((per.t * Math.PI * 2) / T);
      const bx = cx + L * Math.sin(ang), by = top + L * Math.cos(ang);
      p.stroke(41, 89, 144, 50);
      p.strokeWeight(1.4);
      dashed(p, true, [4, 4]);
      p.line(cx, top, cx, top + L + 24);
      dashed(p, false);
      p.stroke(C.dark);
      p.strokeWeight(3);
      p.line(cx, top, bx, by);
      p.noStroke();
      p.fill(C.navy);
      p.circle(cx, top, 12);
      p.fill(C.accent);
      p.circle(bx, by, 32);
      p.stroke(C.navy);
      p.strokeWeight(2.4);
      p.noFill();
      p.circle(bx, by, 32);
      p.noStroke();
      p.fill(C.dark);
      p.textSize(15);
      p.textAlign(p.CENTER, p.TOP);
      p.text(label, cx, top + L + 34);
      chip(p, `loses ${fmt(Math.abs(lose), 2)} s a day`, cx, top + L + 60, 'center', 15,
        per.dTh >= 0 ? C.red : C.accent);
    });

    chip(p, `Both steel, both heated by ${per.dTh >= 0 ? '+' : ''}${per.dTh} °C. `
      + 'Count the swings - one is four times busier than the other.',
      20, 18, 'left', 15, C.navy);
    chip(p, 'Δt = ½ α Δθ t   —   no T anywhere in it',
      p.width / 2, p.height - 46, 'center', 17, C.green);
  };
};

let perInst: p5 | null = null;

function perWire() {
  const st = slider('l4C2T');
  st.addEventListener('input', () => {
    per.dTh = +st.value;
    el('l4C2TVal').textContent = `${per.dTh >= 0 ? '+' : ''}${per.dTh} °C`;
    perReadouts();
  });
  el('l4C2Run').addEventListener('click', () => { per.run = true; });
  el('l4C2Rst').addEventListener('click', () => { per.run = false; });
  perReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   3a · THE BENDING STRIP
   Free, the two layers reach different lengths. Bonded, the only way both
   can share one length is to curl, and the greedier metal takes the outer
   arc. Curvature from the equal-thickness result R ≈ 2t / (3 Δα ΔT).
   ══════════════════════════════════════════════════════════════════════ */

const STRIP_L = 0.10, STRIP_T = 0.0012;            // 10 cm long, 1.2 mm thick
const strip = { t: 20, shown: 20, split: false, splitA: 0 };

function stripReadouts() {
  const dT = strip.shown - CAL_T;
  const br = STRIP_L * (1 + MATS.brass.alpha * dT);
  const st = STRIP_L * (1 + MATS.steel.alpha * dT);
  el('l4SBrass').textContent = `${fmt(br * 1000, 4)} mm`;
  el('l4SSteel').textContent = `${fmt(st * 1000, 4)} mm`;
  el('l4SGap').textContent = `${fmt(Math.abs(br - st) * 1e6, 1)} µm`;
  const b = el('l4SBend');
  if (Math.abs(dT) < 0.5) { b.textContent = 'stays flat'; b.style.color = C.green; }
  else if (dT > 0) { b.textContent = 'curls STEEL side in'; b.style.color = C.red; }
  else { b.textContent = 'curls BRASS side in'; b.style.color = C.accent; }
}

const stripSketch = (p: p5) => {
  const holder = el('l4StripCanvas');
  const canvasH = () => Math.max(420, Math.min(520, Math.round(holder.clientWidth * 0.38)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    strip.shown = ease(strip.shown, strip.t, 3.4, d);
    strip.splitA = ease(strip.splitA, strip.split ? 1 : 0, 4, d);
    stripReadouts();
    p.textFont('DM Sans');

    const dT = strip.shown - CAL_T;
    const dA = MATS.brass.alpha - MATS.steel.alpha;

    /* Curvature of a bonded equal-thickness pair, exaggerated for the board.
       Brass is drawn on top; heating must therefore bend the free end DOWN,
       so that the brass - which wanted the extra length - ends up on the
       convex, longer side of the arc. */
    /* chosen so the biggest ΔT on the slider bends about 30°, not 70° */
    const CURVE_MAG = 3.2;
    const kappa = (3 * dA * dT) / (2 * STRIP_T) * CURVE_MAG;   // 1/R, per metre

    const px = Math.min((p.width - 300) * 0.9, 520);           // drawn length
    const mPerPx = STRIP_L / px;
    const cx = p.width * 0.11, cy = p.height * 0.36;
    const th = 15;                                             // layer thickness

    const Rpx = Math.abs(kappa) > 1e-9 ? 1 / (kappa * mPerPx) : 1e12;
    const arc = (sPx: number) => ({
      x: cx + Rpx * Math.sin(sPx / Rpx),
      y: cy + Rpx * (1 - Math.cos(sPx / Rpx)),
    });

    /* ── bonded: draw the strip as an arc clamped at its left end ── */
    const layer = (off: number, col: string) => {
      p.noFill();
      p.stroke(col);
      p.strokeWeight(th);
      p.beginShape();
      for (let sPx = 0; sPx <= px; sPx += 4) {
        const a = sPx / Rpx;
        const q = arc(sPx);
        p.vertex(q.x + off * Math.sin(a), q.y + off * Math.cos(a));
      }
      p.endShape();
    };

    if (strip.splitA < 0.5) {
      layer(-th / 2 - 1, MATS.brass.col);
      layer(th / 2 + 1, MATS.steel.col);
      const e = arc(px);
      chip(p, 'brass', e.x + 18, e.y - 30, 'left', 14, MATS.brass.col);
      chip(p, 'steel', e.x + 18, e.y + 2, 'left', 14, MATS.steel.col);
      if (Math.abs(dT) > 2) {
        chip(p, dT > 0 ? 'brass on the OUTSIDE of the curve'
          : 'brass on the INSIDE now', e.x + 18, e.y + 34, 'left', 13.5,
          dT > 0 ? C.red : C.accent);
      }
    }

    /* ── ungued: two free bars of different lengths ── */
    if (strip.splitA > 0.02) {
      const a = strip.splitA;
      p.noStroke();
      const FREE_MAG = 2200;
      const brW = px * (1 + MATS.brass.alpha * dT * FREE_MAG);
      const stW = px * (1 + MATS.steel.alpha * dT * FREE_MAG);
      p.fill(p.color(MATS.brass.col));
      p.rect(cx, cy - 46 * a - th, brW, th, 4);
      p.fill(p.color(MATS.steel.col));
      p.rect(cx, cy + 46 * a, stW, th, 4);
      p.stroke(41, 89, 144, 120);
      p.strokeWeight(1.6);
      dashed(p, true, [5, 4]);
      p.line(cx + Math.min(brW, stW), cy - 70 * a, cx + Math.min(brW, stW), cy + 70 * a);
      p.line(cx + Math.max(brW, stW), cy - 70 * a, cx + Math.max(brW, stW), cy + 70 * a);
      dashed(p, false);
      if (a > 0.7 && Math.abs(dT) > 1) {
        dimH(p, cx + Math.min(brW, stW), cx + Math.max(brW, stW), cy + 104,
          dT > 0 ? 'brass ends up longer' : 'brass ends up shorter', C.red);
      }
      chip(p, 'brass, free', cx, cy - 46 * a - th - 26, 'left', 13.5, MATS.brass.col);
      chip(p, 'steel, free', cx, cy + 46 * a + th + 6, 'left', 13.5, MATS.steel.col);
      chip(p, `free lengths drawn ${FREE_MAG}× apart`, cx, cy + 130, 'left', 12.5, C.grey);
    }

    /* the flat shape it started as */
    p.stroke(41, 89, 144, 70);
    p.strokeWeight(1.6);
    dashed(p, true, [5, 4]);
    p.line(cx, cy, cx + px, cy);
    dashed(p, false);

    /* the clamped end */
    p.noStroke();
    p.fill(C.navy);
    p.rect(cx - 20, cy - 42, 18, 84, 4);

    chip(p, strip.splitA > 0.5
      ? 'Unglued, each metal simply reaches its own length. Brass gets there first.'
      : Math.abs(dT) < 0.5
        ? 'At the temperature it was made, the strip is flat.'
        : dT > 0
          ? 'Heated: brass wants more length, so it takes the OUTSIDE of the curve.'
          : 'Cooled: brass shrinks more, so now it takes the INSIDE.',
      20, 20, 'left', 15.5, C.navy);

    /* the two coefficients, on the canvas where the argument is */
    const kx = p.width - 206;
    p.noStroke();
    p.fill(255);
    p.rect(kx - 14, 62, 196, 110, 12);
    p.fill(MATS.brass.col);
    p.textSize(14);
    p.textAlign(p.LEFT, p.TOP);
    p.text('Brass  α = 2.0 × 10⁻⁵', kx, 78);
    p.fill(MATS.steel.col);
    p.text('Steel  α = 1.2 × 10⁻⁵', kx, 102);
    p.fill(C.navy);
    p.textSize(13.5);
    p.text(`at ${fmt(strip.shown, 0)} °C they differ\nby ${fmt(Math.abs(dA * dT) * 1e6, 1)} parts per million`,
      kx, 128, 180, 40);

    chip(p, `curvature exaggerated ${CURVE_MAG}× — a real strip bends far less than this`,
      20, p.height - 32, 'left', 12.5, C.grey);
  };
};

let stripInst: p5 | null = null;

function stripWire() {
  const st = slider('l4ST');
  st.addEventListener('input', () => {
    strip.t = +st.value;
    el('l4STVal').textContent = `${strip.t} °C`;
    stripReadouts();
  });
  const b = el('l4SSplit') as HTMLButtonElement;
  b.addEventListener('click', () => {
    strip.split = !strip.split;
    b.classList.toggle('on', strip.split);
    b.textContent = strip.split ? '✂ Glue them back together' : '✂ Unglue them for a second';
  });
  stripReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   3b · WIRED AS A THERMOSTAT
   A closed loop with no electronics in it. Deliberately slow: one full
   cycle takes about fifteen seconds, which is long enough to narrate each
   phase while it happens. The contact state is derived from the room
   temperature alone, so the picture and the labels can never disagree -
   including before anyone presses play.

   AMBIENT is what the room drifts back to with the heater off; DRIVE is
   set so the heater alone would settle it at 30 °C. DEAD is the snap in
   the switch, wide enough that each half of the cycle lasts seconds.
   ══════════════════════════════════════════════════════════════════════ */

const AMBIENT = 18, HEAT_TARGET = 30, DEAD = 1.5;
const COOL_RATE = 0.08;
const DRIVE = (HEAT_TARGET - AMBIENT) * COOL_RATE;

const PHASES: Array<[string, string, string]> = [
  ['1 · room is COLD', 'strip lies straight, contact CLOSED', C.green],
  ['2 · heater ON', 'the room is warming up', C.red],
  ['3 · room is WARM', 'strip curls up, contact OPEN', C.red],
  ['4 · heater off', 'the room is cooling again', C.accent],
];

const thermo = {
  set: 25, room: AMBIENT, on: true, run: false,
  cycles: 0, trace: [] as number[], nudge: 0, phase: 0,
};

/* the switch, decided by temperature alone - it snaps at set ± DEAD */
function thermoSwitch() {
  if (thermo.room > thermo.set + DEAD) thermo.on = false;
  if (thermo.room < thermo.set - DEAD) thermo.on = true;
}

function thermoPhase() {
  if (thermo.on) return thermo.room < thermo.set - DEAD * 0.4 ? 0 : 1;
  return thermo.room > thermo.set + DEAD * 0.4 ? 2 : 3;
}

function thermoReadouts() {
  el('l4TRoom').textContent = `${fmt(thermo.room, 1)} °C`;
  const h = el('l4THeat');
  h.textContent = thermo.on ? 'ON' : 'off';
  h.style.color = thermo.on ? C.red : C.grey;
  const c = el('l4TCont');
  c.textContent = thermo.on ? 'closed' : 'open';
  c.style.color = thermo.on ? C.green : C.red;
  const ph = el('l4TPhase');
  ph.textContent = PHASES[thermo.phase][0];
  ph.style.color = PHASES[thermo.phase][2];
  el('l4TCyc').textContent = `${thermo.cycles}`;
}

const thermoSketch = (p: p5) => {
  const holder = el('l4ThermoCanvas');
  const canvasH = () => Math.max(440, Math.min(540, Math.round(holder.clientWidth * 0.4)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    p.textFont('DM Sans');

    /* advance the room, either continuously or one nudge at a time */
    let step = 0;
    if (thermo.run) step = d;
    else if (thermo.nudge > 0) { step = Math.min(d, thermo.nudge); thermo.nudge -= step; }

    if (step > 0) {
      const wasOn = thermo.on;
      thermo.room += ((thermo.on ? DRIVE : 0) - (thermo.room - AMBIENT) * COOL_RATE) * step;
      thermoSwitch();
      if (wasOn && !thermo.on) thermo.cycles++;
      thermo.trace.push(thermo.room);
      if (thermo.trace.length > 520) thermo.trace.shift();
    }
    thermo.phase = thermoPhase();
    thermoReadouts();

    /* ── the strip as a switch ── */
    const cx = p.width * 0.08, cy = p.height * 0.26;
    const len = Math.min(p.width * 0.28, 200);
    const contactY = cy;
    const lift = Math.max(0, Math.min(54, (thermo.room - (thermo.set - DEAD)) * 18));
    const tipY = contactY - lift;

    p.noStroke();
    p.fill(C.navy);
    p.rect(cx - 20, cy - 30, 18, 66, 4);

    const layerCurve = (off: number, col: string) => {
      p.noFill();
      p.stroke(col);
      p.strokeWeight(9);
      p.beginShape();
      for (let k = 0; k <= 24; k++) {
        const f = k / 24;
        p.vertex(cx + f * len, cy + (tipY - cy) * f * f + off);
      }
      p.endShape();
    };
    layerCurve(-5, MATS.brass.col);
    layerCurve(5, MATS.steel.col);

    p.noStroke();
    p.fill(C.dark);
    p.rect(cx + len + 2, contactY + 8, 16, 46, 3);
    p.circle(cx + len + 10, contactY + 8, 17);
    p.fill(thermo.on ? C.green : C.red);
    p.circle(cx + len + 10, tipY + 5, 16);

    if (!thermo.on) {
      p.stroke(C.red);
      p.strokeWeight(1.8);
      dashed(p, true, [4, 4]);
      p.line(cx + len + 10, tipY + 13, cx + len + 10, contactY);
      dashed(p, false);
    }
    chip(p, thermo.on ? 'contact CLOSED\ncurrent flows' : 'contact OPEN\npower cut',
      cx + len + 28, tipY - 18, 'left', 13.5, thermo.on ? C.green : C.red);
    chip(p, 'brass', cx + 8, cy - 38, 'left', 12.5, MATS.brass.col);
    chip(p, 'steel', cx + 8, cy + 20, 'left', 12.5, MATS.steel.col);

    /* ── the heater it is switching ── */
    const hx = cx + len * 0.5, hy = p.height * 0.54;
    p.noStroke();
    p.fill(thermo.on ? p.color(225, 29, 72, 46) : p.color(41, 89, 144, 16));
    p.rect(hx - 96, hy - 28, 192, 58, 12);
    p.stroke(thermo.on ? C.red : C.grey);
    p.strokeWeight(3);
    p.noFill();
    for (let k = 0; k < 3; k++) {
      p.beginShape();
      for (let x = -76; x <= 76; x += 6) {
        p.vertex(hx + x, hy - 14 + k * 15 + 4 * Math.sin(x * 0.28));
      }
      p.endShape();
    }
    p.noStroke();
    p.fill(thermo.on ? C.red : C.grey);
    p.textSize(14);
    p.textAlign(p.CENTER, p.TOP);
    p.text(thermo.on ? 'HEATER ON' : 'heater off', hx, hy + 34);

    /* ── the four phases, with the live one lit ── */
    const py = p.height - 132;
    p.noStroke();
    p.fill(C.dark);
    p.textSize(12.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text('THE CYCLE, STEP BY STEP', 20, py - 19);
    PHASES.forEach(([title, sub, col], i) => {
      const live = i === thermo.phase;
      const yy = py + i * 30;
      p.noStroke();
      p.fill(live ? p.color(col) : p.color(41, 89, 144, 16));
      p.rect(20, yy, live ? 8 : 4, 24, 2);
      p.fill(live ? p.color(col) : p.color(120, 137, 160));
      p.textSize(live ? 14.5 : 13);
      p.text(`${title}  —  ${sub}`, 36, yy + (live ? 3 : 4));
    });

    /* ── the room temperature against time ── */
    const gx = p.width * 0.52, gw = p.width - gx - 40, gy = 72, gh = p.height - 168;
    p.noStroke();
    p.fill(255);
    p.rect(gx - 40, gy - 26, gw + 62, gh + 66, 14);
    const TA = 14, TB = 34;
    const Y = (v: number) => gy + gh - ((v - TA) / (TB - TA)) * gh;

    /* shade the stretches where the heater was actually running */
    let runStart = -1;
    thermo.trace.forEach((v, i) => {
      const heating = i > 0 && v > thermo.trace[i - 1];
      if (heating && runStart < 0) runStart = i;
      if ((!heating || i === thermo.trace.length - 1) && runStart >= 0) {
        p.noStroke();
        p.fill(225, 29, 72, 22);
        p.rect(gx + (runStart / 520) * gw, gy, ((i - runStart) / 520) * gw, gh);
        runStart = -1;
      }
    });

    p.stroke(41, 89, 144, 24);
    p.strokeWeight(1);
    for (let v = 16; v <= 32; v += 4) p.line(gx, Y(v), gx + gw, Y(v));
    p.stroke(C.navy);
    p.strokeWeight(2.2);
    p.line(gx, gy + gh, gx + gw, gy + gh);
    p.line(gx, gy, gx, gy + gh);
    p.noStroke();
    p.fill(C.dark);
    p.textSize(12);
    p.textAlign(p.RIGHT, p.CENTER);
    for (let v = 16; v <= 32; v += 4) p.text(`${v}`, gx - 7, Y(v));
    p.textAlign(p.CENTER, p.TOP);
    p.text('time  →', gx + gw / 2, gy + gh + 24);

    /* the setpoint and the snap band the switch actually uses */
    p.noStroke();
    p.fill(22, 163, 74, 24);
    p.rect(gx, Y(thermo.set + DEAD), gw, Y(thermo.set - DEAD) - Y(thermo.set + DEAD));
    p.stroke(C.green);
    p.strokeWeight(2);
    dashed(p, true, [6, 5]);
    p.line(gx, Y(thermo.set), gx + gw, Y(thermo.set));
    dashed(p, false);
    chip(p, `set to ${thermo.set} °C`, gx + gw - 8, Y(thermo.set) - 32, 'right', 13, C.green);
    chip(p, 'switches off up here', gx + 8, Y(thermo.set + DEAD) - 26, 'left', 12.5, C.red);
    chip(p, 'switches on down here', gx + 8, Y(thermo.set - DEAD) + 6, 'left', 12.5, C.green);

    p.noFill();
    p.stroke(C.red);
    p.strokeWeight(2.8);
    p.beginShape();
    thermo.trace.forEach((v, i) => {
      p.vertex(gx + (i / 520) * gw, Y(Math.max(TA, Math.min(TB, v))));
    });
    p.endShape();
    if (thermo.trace.length) {
      const lastX = gx + ((thermo.trace.length - 1) / 520) * gw;
      p.noStroke();
      p.fill(C.red);
      p.circle(lastX, Y(Math.max(TA, Math.min(TB, thermo.room))), 12);
    }

    chip(p, thermo.run ? 'the room hunts around the setpoint, on its own'
      : thermo.nudge > 0 ? 'nudging…' : 'paused — press start, or nudge it a step at a time',
      gx, 18, 'left', 14.5, C.navy);
  };
};

let thermoInst: p5 | null = null;

function thermoWire() {
  const s = slider('l4TSet');
  s.addEventListener('input', () => {
    thermo.set = +s.value;
    el('l4TSetVal').textContent = `${thermo.set} °C`;
    thermoSwitch();
    thermo.phase = thermoPhase();
    thermoReadouts();
  });
  const run = el('l4TRun') as HTMLButtonElement;
  run.addEventListener('click', () => {
    thermo.run = !thermo.run;
    run.textContent = thermo.run ? '⏸ Pause' : '▶ Start the cycle';
    run.classList.toggle('primary', !thermo.run);
  });
  el('l4TStep').addEventListener('click', () => { thermo.nudge += 1.5; });
  el('l4TRst').addEventListener('click', () => {
    thermo.run = false;
    run.textContent = '▶ Start the cycle';
    run.classList.add('primary');
    thermo.room = AMBIENT;
    thermo.on = true;                       /* cold room: the contact IS closed */
    thermo.cycles = 0;
    thermo.trace = [];
    thermo.nudge = 0;
    thermo.phase = thermoPhase();
    thermoReadouts();
  });
  thermoSwitch();
  thermo.phase = thermoPhase();
  thermoReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   4 · BALL THROUGH THE HOLE
   d_ball = 60.000 mm of iron, d_hole = 59.990 mm in brass, both at 30 °C.
   Brass runs away faster, so the gap closes at d(α_br − α_Fe) per degree.
   ══════════════════════════════════════════════════════════════════════ */

const D_BALL = 60.0, D_HOLE = 59.99, BASE_T = 30;
const ballD = (t: number) => D_BALL * (1 + MATS.steel.alpha * (t - BASE_T));
const holeD = (t: number) => D_HOLE * (1 + MATS.brass.alpha * (t - BASE_T));
const CLOSE_RATE = D_BALL * (MATS.brass.alpha - MATS.steel.alpha);   // mm per °C
const FIT_T = BASE_T + (D_BALL - D_HOLE) / CLOSE_RATE;

const ball = { t: BASE_T, shown: BASE_T, drop: false, y: 0 };

function ballReadouts() {
  const b = ballD(ball.shown), h = holeD(ball.shown);
  el('l4BBall').textContent = `${fmt(b, 5)} mm`;
  el('l4BHole').textContent = `${fmt(h, 5)} mm`;
  const g = el('l4BGap');
  if (h >= b) { g.textContent = 'it fits ✓'; g.style.color = C.green; }
  else { g.textContent = `${fmt((b - h) * 1000, 1)} µm`; g.style.color = C.red; }
  el('l4BRate').textContent = `${(CLOSE_RATE * 1000).toFixed(2)} µm per °C`;

  katex.render(
    String.raw`\Delta T=\dfrac{d_{\text{ball}}-d_{\text{hole}}}{d(\alpha_{\text{brass}}-\alpha_{\text{Fe}})}
      =\dfrac{0.010}{(60)(2.0-1.2)\times10^{-5}}
      =\mathbf{${fmt(FIT_T - BASE_T, 1)}}\ ^\circ\mathrm{C}
      \quad\Rightarrow\quad T=\mathbf{${fmt(FIT_T, 1)}}\ ^\circ\mathrm{C}`,
    el('l4BWork'), KO
  );
}

const ballSketch = (p: p5) => {
  const holder = el('l4BallCanvas');
  const canvasH = () => Math.max(430, Math.min(540, Math.round(holder.clientWidth * 0.4)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    ball.shown = ease(ball.shown, ball.t, 3.2, d);
    ballReadouts();
    p.textFont('DM Sans');

    const bD = ballD(ball.shown), hD = holeD(ball.shown);
    const fits = hD >= bD;

    /* the difference is 1 part in 6000 - draw the hole to size and magnify
       only the ball's excess, exactly as with the ring in lecture 3 */
    const MAG = 900;
    const holeR = Math.min(96, p.height * 0.2);
    const pxPerMm = holeR / (D_HOLE / 2);
    const ballR = holeR + ((bD - hD) / 2) * pxPerMm * MAG;

    /* the ball falls through once it fits and you press drop */
    if (ball.drop && fits) ball.y = Math.min(1, ball.y + d * 0.9);
    else if (!ball.drop) ball.y = ease(ball.y, 0, 6, d);

    const cx = p.width * 0.42;
    const plateY = p.height * 0.55;
    const restY = plateY - holeR - 66;
    const by = restY + ball.y * (p.height * 0.42);

    /* ── the brass plate, seen edge on with the hole cut through ── */
    const [pr, pg, pb] = heatRGB(ball.shown);
    const plateW = Math.min(p.width * 0.56, 420), plateH = 40;
    p.noStroke();
    p.fill(pr * 0.9, pg * 0.85, pb * 0.6);
    p.rect(cx - plateW / 2, plateY, (plateW / 2) - holeR, plateH, 4);
    p.rect(cx + holeR, plateY, (plateW / 2) - holeR, plateH, 4);
    p.stroke(C.navy);
    p.strokeWeight(2.4);
    p.line(cx - plateW / 2, plateY, cx - holeR, plateY);
    p.line(cx + holeR, plateY, cx + plateW / 2, plateY);
    p.line(cx - plateW / 2, plateY + plateH, cx - holeR, plateY + plateH);
    p.line(cx + holeR, plateY + plateH, cx + plateW / 2, plateY + plateH);
    /* the bore walls */
    p.stroke(C.amber);
    p.strokeWeight(3);
    p.line(cx - holeR, plateY, cx - holeR, plateY + plateH);
    p.line(cx + holeR, plateY, cx + holeR, plateY + plateH);
    chip(p, 'brass plate', cx - plateW / 2, plateY + plateH + 12, 'left', 13.5, MATS.brass.col);

    /* ── the iron ball ── */
    p.noStroke();
    p.fill(90, 106, 128);
    p.circle(cx, by, ballR * 2);
    p.fill(255, 255, 255, 60);
    p.circle(cx - ballR * 0.3, by - ballR * 0.34, ballR * 0.62);
    p.stroke(fits ? C.green : C.red);
    p.strokeWeight(3);
    p.noFill();
    p.circle(cx, by, ballR * 2);

    /* both diameters, called out */
    p.stroke(fits ? C.green : C.red);
    p.strokeWeight(2);
    arrow(p, cx - ballR, by, cx + ballR, by, 8);
    arrow(p, cx + ballR, by, cx - ballR, by, 8);
    chip(p, `ball ${fmt(bD, 4)} mm`, cx, by - 26, 'center', 14, fits ? C.green : C.red);

    if (ball.y < 0.25) {
      p.stroke(C.amber);
      p.strokeWeight(2);
      dashed(p, true, [5, 4]);
      p.line(cx - holeR, by, cx - holeR, plateY);
      p.line(cx + holeR, by, cx + holeR, plateY);
      dashed(p, false);
      chip(p, `hole ${fmt(hD, 4)} mm`, cx + holeR + 18, plateY - 42, 'left', 14, MATS.brass.col);
    }

    /* ── how far the two have come ── */
    const gx = p.width - 268, gw = 220, gy = 92, gh = p.height - 210;
    if (gx > cx + plateW / 2 - 40) {
      p.noStroke();
      p.fill(255);
      p.rect(gx - 16, gy - 30, gw + 34, gh + 76, 14);
      p.fill(C.dark);
      p.textSize(12.5);
      p.textAlign(p.LEFT, p.TOP);
      p.text('HOW FAR EACH HAS GROWN', gx, gy - 16);

      const maxGrow = Math.max(
        D_BALL * MATS.steel.alpha * 60, D_HOLE * MATS.brass.alpha * 60);
      const rows: Array<[string, number, string]> = [
        ['iron ball', bD - D_BALL, '#5a6a80'],
        ['brass hole', hD - D_HOLE, MATS.brass.col],
      ];
      rows.forEach(([nm, v, col], i) => {
        const yy = gy + 18 + i * 46;
        p.noStroke();
        p.fill(41, 89, 144, 20);
        p.rect(gx, yy, gw, 18, 9);
        p.fill(col);
        p.rect(gx, yy, gw * Math.min(1, v / maxGrow), 18, 9);
        p.fill(C.navy);
        p.textSize(12.5);
        p.text(`${nm}  +${fmt(v * 1000, 1)} µm`, gx, yy + 22);
      });

      p.fill(C.navy);
      p.textSize(14);
      p.text('The hole is chasing the ball down,\nand it is gaining '
        + `${(CLOSE_RATE * 1000).toFixed(2)} µm every degree.`, gx, gy + 122, gw, 60);
      p.fill(fits ? C.green : C.red);
      p.textSize(17);
      p.text(fits ? 'it fits now' : `needs ${fmt(FIT_T - ball.shown, 1)} °C more`, gx, gy + 190);
    }

    chip(p, `both at ${fmt(ball.shown, 0)} °C   ·   the 10 µm difference is drawn ${MAG}× oversize`,
      20, p.height - 34, 'left', 13, C.grey);
    chip(p, fits
      ? '✓ the brass hole has caught up - the ball drops through'
      : '✗ the ball is still fatter than the hole',
      20, 18, 'left', 15.5, fits ? C.green : C.red);
  };
};

let ballInst: p5 | null = null;

function ballWire() {
  const s = slider('l4BT');
  const set = (v: number) => {
    ball.t = v;
    s.value = String(v);
    el('l4BTVal').textContent = `${fmt(v, 0)} °C`;
    ballReadouts();
  };
  s.addEventListener('input', () => set(+s.value));
  el('l4BDrop').addEventListener('click', () => { ball.drop = true; });
  el('l4BFind').addEventListener('click', () => { set(Math.ceil(FIT_T)); });
  el('l4BRst').addEventListener('click', () => { ball.drop = false; ball.y = 0; set(BASE_T); });
  ballReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   5 · ROD THAT CAN'T GROW
   strain = Δl/l = αΔT, so the length cancels before Y ever appears:
   stress = Y α ΔT and F = Y A α ΔT. The length slider is there purely so
   students can watch the answer refuse to move.
   ══════════════════════════════════════════════════════════════════════ */

const stress = { mat: 'steel', dT: 50, A: 2.0, L: 1.0, shown: 50 };

function stressReadouts() {
  const M = MATS[stress.mat];
  const sig = M.Y * M.alpha * stress.dT;                  // Pa
  const F = sig * (stress.A * 1e-4);                      // N
  el('l4XWant').textContent = `${fmt(stress.L * M.alpha * stress.dT * 1000, 3)} mm`;
  el('l4XStress').textContent = `${fmt(Math.abs(sig) / 1e6, 1)} MPa`;
  el('l4XForce').textContent = `${fmt(Math.abs(F) / 1000, 1)} kN`;
  el('l4XMass').textContent = `${fmt(Math.abs(F) / 9.81 / 1000, 2)} tonnes`;

  katex.render(
    String.raw`\text{strain}=\dfrac{\Delta l}{l}=\dfrac{l\,\alpha\,\Delta T}{l}=\alpha\,\Delta T
      \;\Rightarrow\; \text{stress}=Y\alpha\,\Delta T
      =(${fmt(M.Y / 1e11, 1)}\times10^{11})(${fmt(M.alpha * 1e5, 1)}\times10^{-5})(${fmt(stress.dT, 0)})
      =\mathbf{${fmt(Math.abs(sig) / 1e6, 1)}}\ \mathrm{MPa}`,
    el('l4XWork'), KO
  );
}

const stressSketch = (p: p5) => {
  const holder = el('l4StressCanvas');
  const canvasH = () => Math.max(360, Math.min(430, Math.round(holder.clientWidth * 0.3)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    stress.shown = ease(stress.shown, stress.dT, 4, dt(p));
    p.textFont('DM Sans');

    const M = MATS[stress.mat];
    const sig = M.Y * M.alpha * stress.shown;
    const F = sig * (stress.A * 1e-4);
    const hot = stress.shown >= 0;

    /* how far it wanted to go, magnified just enough to see - the factor is
       set from the worst case on these sliders so it always stays on canvas */
    const MAXX = MATS.alu.alpha * 200;
    const MAG = Math.round(0.15 / MAXX);

    const wallW = 26;
    const headroom = (p.width - 168) * MAXX * MAG;      // room for the ghost
    const x0 = 84, x1 = p.width - 84 - headroom;
    const rodY = p.height * 0.40;
    const h = 20 + Math.sqrt(stress.A) * 12;

    const want = (x1 - x0) * M.alpha * stress.shown * MAG;

    /* the rod as it actually is: exactly the gap between the walls */
    const [r, g, b] = heatRGB(20 + stress.shown);
    p.noStroke();
    p.fill(r, g, b);
    p.rect(x0, rodY - h / 2, x1 - x0, h, 5);
    p.stroke(C.navy);
    p.strokeWeight(2.6);
    p.noFill();
    p.rect(x0, rodY - h / 2, x1 - x0, h, 5);

    /* the walls, bowing very slightly under the load */
    const bow = Math.min(8, Math.abs(F) / 5000) * (hot ? 1 : -1);
    [[x0, -1], [x1, 1]].forEach(([wx, dir]) => {
      p.noStroke();
      p.fill(C.navy);
      p.beginShape();
      p.vertex(wx as number, rodY - 78);
      p.vertex((wx as number) + (dir as number) * (wallW + bow), rodY - 78);
      p.vertex((wx as number) + (dir as number) * (wallW + bow), rodY + 78);
      p.vertex(wx as number, rodY + 78);
      p.endShape(p.CLOSE);
      for (let k = 0; k < 7; k++) {
        p.stroke(C.navy);
        p.strokeWeight(2);
        const yy = rodY - 72 + k * 24;
        p.line((wx as number) + (dir as number) * (wallW + bow), yy,
          (wx as number) + (dir as number) * (wallW + bow + 14), yy + 8);
      }
    });

    /* where the rod would have reached if the walls were not there - drawn
       over the wall on purpose, because that is exactly the conflict */
    if (Math.abs(want) > 10) {
      p.noStroke();
      p.fill(hot ? p.color(225, 29, 72, 40) : p.color(0, 160, 227, 40));
      p.rect(hot ? x1 : x1 + want, rodY - h / 2, Math.abs(want), h);
      p.stroke(41, 89, 144, 150);
      p.strokeWeight(1.8);
      dashed(p, true, [6, 5]);
      p.noFill();
      p.rect(x0, rodY - h / 2, (x1 - x0) + want, h, 5);
      dashed(p, false);
      dimH(p, hot ? x1 : x1 + want, hot ? x1 + want : x1, rodY - h / 2 - 40,
        `wanted ${hot ? '+' : '−'}${fmt(Math.abs(stress.L * M.alpha * stress.shown) * 1000, 2)} mm`,
        hot ? C.red : C.accent);
    }

    /* the push (or pull) on each wall */
    if (Math.abs(stress.shown) > 1) {
      p.stroke(hot ? C.red : C.accent);
      p.strokeWeight(4);
      const L = 46;
      arrow(p, x0 + 30, rodY, x0 - 6, rodY, 12);
      arrow(p, x1 - 30, rodY, x1 + 6, rodY, 12);
      if (!hot) {
        p.stroke(C.accent);
        arrow(p, x0 - 6, rodY, x0 + 30, rodY, 12);
        arrow(p, x1 + 6, rodY, x1 - 30, rodY, 12);
      }
      chip(p, `${fmt(Math.abs(F) / 1000, 1)} kN`, x0 + 40, rodY - 12, 'left', 15,
        hot ? C.red : C.accent);
      chip(p, `${fmt(Math.abs(F) / 1000, 1)} kN`, x1 - 40, rodY - 12, 'right', 15,
        hot ? C.red : C.accent);
    }

    chip(p, Math.abs(stress.shown) < 1
      ? 'At the temperature it was clamped, the rod is under no stress at all.'
      : hot
        ? 'Heated and held: the rod is squeezed back to the gap it started in - COMPRESSION.'
        : 'Cooled and held: the rod is stretched to reach the walls - TENSION. Cool it enough and it snaps.',
      20, 18, 'left', 15.5, Math.abs(stress.shown) < 1 ? C.green : (hot ? C.red : C.accent));

    /* the length that is not in the answer */
    const bx = p.width / 2 - 190;
    p.noStroke();
    p.fill(255);
    p.rect(bx, p.height - 108, 380, 76, 14);
    p.fill(C.dark);
    p.textSize(12.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`ROD IS ${fmt(stress.L, 2)} m LONG`, bx + 18, p.height - 96);
    p.fill(C.navy);
    p.textSize(18);
    p.text(`stress ${fmt(Math.abs(sig) / 1e6, 1)} MPa   ·   force ${fmt(Math.abs(F) / 1000, 1)} kN`,
      bx + 18, p.height - 78);
    p.fill(C.green);
    p.textSize(13);
    p.text('change the length and neither number moves', bx + 18, p.height - 54);

    chip(p, `the wanted expansion is drawn ${MAG}× oversize`,
      20, p.height - 32, 'left', 12.5, C.grey);
  };
};

let stressInst: p5 | null = null;

function stressWire() {
  wireSegmented('l4XMat', 'mat', (k) => { stress.mat = k; stressReadouts(); });
  const st = slider('l4XT'), sa = slider('l4XA'), sl = slider('l4XL');
  st.addEventListener('input', () => {
    stress.dT = +st.value;
    el('l4XTVal').textContent = `${stress.dT >= 0 ? '+' : ''}${stress.dT} °C`;
    stressReadouts();
  });
  sa.addEventListener('input', () => {
    stress.A = +sa.value / 10;
    el('l4XAVal').textContent = `${fmt(stress.A, 1)} cm²`;
    stressReadouts();
  });
  sl.addEventListener('input', () => {
    stress.L = +sl.value / 10;
    el('l4XLVal').textContent = `${fmt(stress.L, 1)} m`;
    stressReadouts();
  });
  stressReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   registry + boot
   ══════════════════════════════════════════════════════════════════════ */

function mount(inst: p5 | null, sk: (p: p5) => void, holderId: string): p5 {
  if (inst) { inst.windowResized?.(); return inst; }
  return new p5(sk, el(holderId));
}

let clockPane = 'l4CA', stripPane = 'l4SA';

function clockMount() {
  if (clockPane === 'l4CA') clockInst = mount(clockInst, clockSketch, 'l4ClockCanvas');
  else perInst = mount(perInst, perSketch, 'l4Clock2Canvas');
}
function stripMount() {
  if (stripPane === 'l4SA') stripInst = mount(stripInst, stripSketch, 'l4StripCanvas');
  else thermoInst = mount(thermoInst, thermoSketch, 'l4ThermoCanvas');
}

(window as any).SCREEN_INIT = {
  ruler: () => { rulerInst = mount(rulerInst, rulerSketch, 'l4RulerCanvas'); },
  clock: clockMount,
  strip: stripMount,
  ball: () => { ballInst = mount(ballInst, ballSketch, 'l4BallCanvas'); },
  stress: () => { stressInst = mount(stressInst, stressSketch, 'l4StressCanvas'); },
};

rulerWire();
clockWire();
perWire();
stripWire();
thermoWire();
ballWire();
stressWire();
wireTabs('l4CTabs', (id) => { clockPane = id; clockMount(); });
wireTabs('l4STabs', (id) => { stripPane = id; stripMount(); });
