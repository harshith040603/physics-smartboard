/* ═══════════ Thermometry Studio · Lecture 2 - The Absolute Scale ═══════════
   Animation-only lecture: no notes cards, every screen is a canvas you drive.

     gas     - the constant volume gas thermometer, twice over:
               a stand-alone walkthrough of the apparatus, and a rig you
               operate yourself (chase the mercury back to the mark)
     zero    - three gases extrapolated backwards to one shared intercept
     kelvin  - the Kelvin axis sliding its zero to -273.15 with the tick
               spacing untouched, plus the triple point on a phase diagram
     convert - four scales side by side, one bar dragged across all of them
     same    - "when do two scales read the same" as one moving crossing
     delta   - a temperature interval bracketed on C, K and F at once
     heat    - heat flows by temperature, not by energy, + the rain analogy

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
  hg: '#8a94a6',
};

const KO = { throwOnError: false, displayMode: false };

/* ───────── shared drawing helpers ───────── */
function arrow(p: p5, x1: number, y1: number, x2: number, y2: number, head = 9) {
  p.line(x1, y1, x2, y2);
  const a = Math.atan2(y2 - y1, x2 - x1);
  p.line(x2, y2, x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45));
  p.line(x2, y2, x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45));
}

/* a two-headed dimension line with the label sitting on it */
function dim(p: p5, x: number, y1: number, y2: number, label: string, col: string) {
  p.stroke(col);
  p.strokeWeight(2);
  arrow(p, x, y1, x, y2, 8);
  arrow(p, x, y2, x, y1, 8);
  p.strokeWeight(1.4);
  p.line(x - 9, y1, x + 9, y1);
  p.line(x - 9, y2, x + 9, y2);
  chip(p, label, x, Math.min(y1, y2) - 30, 'center', 15, col);
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

/* seconds since the last frame, clamped so a stalled tab cannot jump the
   animation to its end state */
function dt(p: p5) {
  return Math.min(p.deltaTime || 16.7, 120) / 1000;
}

function dashed(p: p5, on: boolean, pattern: number[] = [6, 6]) {
  (p.drawingContext as CanvasRenderingContext2D).setLineDash(on ? pattern : []);
}

/* exponential ease toward a target, frame-rate independent */
function ease(cur: number, target: number, rate: number, d: number) {
  return cur + (target - cur) * (1 - Math.exp(-rate * d));
}

/* temperature → colour, deep blue (cold) through cyan, amber, red (hot) */
const HEAT_STOPS: Array<[number, [number, number, number]]> = [
  [-150, [23, 37, 84]],
  [-40, [56, 130, 246]],
  [0, [144, 205, 244]],
  [24, [223, 236, 246]],
  [45, [253, 232, 186]],
  [110, [250, 188, 92]],
  [220, [238, 116, 58]],
  [500, [186, 24, 24]],
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
      onPick(b.dataset.rel!);
    });
  });
}

function slider(id: string) { return document.getElementById(id) as HTMLInputElement; }
function el(id: string) { return document.getElementById(id)!; }

/* ══════════════════════════════════════════════════════════════════════
   THE CONSTANT VOLUME GAS THERMOMETER - shared physics + shared drawing
   ══════════════════════════════════════════════════════════════════════

   The bulb holds a fixed mass of gas. Mercury in the left limb marks where
   that gas ends; a movable reservoir sets the level R in the right limb.

     gas pressure  p = p_atm + (R - L)          [everything in cm of Hg]
     gas volume    V = V0 - L                   [L measured from the mark]

   Impose pV = p_atm·V0·(T / 273.15) and the level L is the smaller root of

     L² - (p_atm + R + V0)·L + (p_atm + R)·V0 - K = 0                     */

const P_ATM = 76;        // cm Hg, the datum pressure at the mark
const V0 = 100;          // volume units in the bulb when mercury is on the mark
const T0K = 273.15;

function gasLevel(tC: number, R: number) {
  const K = P_ATM * V0 * ((tC + T0K) / T0K);
  const b = P_ATM + R + V0;
  const c = (P_ATM + R) * V0 - K;
  const disc = Math.max(0, b * b - 4 * c);
  return (b - Math.sqrt(disc)) / 2;
}

/* the reservoir height that puts the mercury exactly back on the mark */
function gasIdealR(tC: number) {
  return P_ATM * ((tC + T0K) / T0K) - P_ATM;
}

interface RigOpts {
  x0: number; w: number; h: number;
  tC: number;            // bath temperature
  R: number;             // reservoir / right-limb mercury level, cm above mark
  L: number;             // left-limb mercury level, cm above mark
  labels: boolean;       // draw the part names
  showH: boolean;        // draw the h dimension line
  flagVolume: boolean;   // call out a wrong volume in red
}

/* one drawing routine, used by both the walkthrough and the interactive rig
   so the two screens are literally the same instrument */
function drawRig(p: p5, o: RigOpts) {
  const { x0, w, h, tC } = o;
  /* the slice of the mercury scale the canvas shows, in cm */
  const CM_LO = -72, CM_HI = 128;
  const pxPerCm = (h - 56) / (CM_HI - CM_LO);
  const yBase = (h - 28) + CM_LO * pxPerCm;   // y of the constant-volume mark
  const Y = (cm: number) => yBase - cm * pxPerCm;
  const L = Math.max(CM_LO + 6, Math.min(70, o.L));
  const R = Math.max(CM_LO + 6, Math.min(CM_HI - 4, o.R));

  const xL = x0 + w * 0.42, xR = x0 + w * 0.68, tw = 19;
  const yBot = Y(-70), yTopL = Y(74), yTopR = Y(126);
  const [r, g, b] = heatRGB(tC);

  p.textFont('DM Sans');

  /* ── bath + bulb, sitting clear above the mark ── */
  const bx = x0 + w * 0.17, by = Y(104);
  const bathW = Math.min(w * 0.3, 146), bathH = 118;
  p.noStroke();
  p.fill(r, g, b, 70);
  p.rect(bx - bathW / 2, by - bathH * 0.46, bathW, bathH, 12);
  p.stroke(r, g, b);
  p.strokeWeight(3);
  p.noFill();
  p.rect(bx - bathW / 2, by - bathH * 0.46, bathW, bathH, 12);

  /* shimmer over a hot bath, frost on a cold one */
  p.strokeWeight(2);
  if (tC > 60) {
    p.stroke(220, 38, 38, Math.min(170, (tC - 60) * 1.1));
    for (let i = -1; i <= 1; i++) {
      p.noFill();
      p.beginShape();
      for (let k = 0; k <= 15; k++) {
        p.vertex(bx + i * 38 + 6 * Math.sin(k * 0.55 + p.frameCount * 0.07 + i),
          by - bathH * 0.46 - 6 - k * 1.7);
      }
      p.endShape();
    }
  } else if (tC < -5) {
    p.stroke(190, 230, 255, 210);
    for (let i = -1; i <= 1; i++) {
      const fx = bx + i * 42, fy = by - bathH * 0.28;
      for (let k = 0; k < 3; k++) {
        const a = (k * Math.PI) / 3;
        p.line(fx - 7 * Math.cos(a), fy - 7 * Math.sin(a), fx + 7 * Math.cos(a), fy + 7 * Math.sin(a));
      }
    }
  }

  /* the gas bulb itself */
  p.noStroke();
  p.fill(255, 255, 255, 235);
  p.circle(bx, by, 74);
  p.stroke(C.dark);
  p.strokeWeight(3);
  p.noFill();
  p.circle(bx, by, 74);
  /* gas molecules, faster when hot */
  const speed = 0.4 + Math.max(0, (tC + 150) / 260);
  p.noStroke();
  p.fill(0, 160, 227, 210);
  for (let i = 0; i < 11; i++) {
    const ph = i * 1.9;
    const rr = 12 + (i % 3) * 8;
    p.circle(bx + rr * Math.cos(p.frameCount * 0.035 * speed + ph),
      by + rr * Math.sin(p.frameCount * 0.047 * speed + ph * 1.7), 6.5);
  }

  /* capillary: bulb → top of the left limb */
  p.stroke(C.dark);
  p.strokeWeight(6);
  p.noFill();
  p.line(bx + 37, by, xL - 26, by);
  p.line(xL - 26, by, xL - 26, yTopL + 14);
  p.line(xL - 26, yTopL + 14, xL, yTopL + 14);

  /* ── the two limbs ── */
  const limb = (x: number, yTop: number) => {
    p.fill(255);
    p.stroke(41, 89, 144, 95);
    p.strokeWeight(2.4);
    p.rect(x - tw / 2, yTop, tw, yBot - yTop + 10, 6);
  };
  limb(xL, yTopL);
  limb(xR, yTopR);
  p.fill(255);
  p.stroke(41, 89, 144, 95);
  p.strokeWeight(2.4);
  p.rect(xL - tw / 2, yBot, xR - xL + tw, 16, 6);

  /* ── mercury ── */
  const yL = Math.max(yTopL + 4, Math.min(Y(L), yBot - 2));
  const yR = Math.max(yTopR + 4, Math.min(Y(R), yBot - 2));
  p.noStroke();
  p.fill(C.hg);
  p.rect(xL - tw / 2 + 2, yL, tw - 4, yBot - yL + 14, 3);
  p.rect(xR - tw / 2 + 2, yR, tw - 4, yBot - yR + 14, 3);
  p.rect(xL - tw / 2 + 2, yBot + 2, xR - xL + tw - 4, 12, 3);
  /* meniscus highlights */
  p.fill(255, 255, 255, 120);
  p.ellipse(xL, yL + 2, tw - 6, 5);
  p.ellipse(xR, yR + 2, tw - 6, 5);

  /* gas column above the mercury in the left limb */
  p.noStroke();
  p.fill(0, 160, 227, 40);
  p.rect(xL - tw / 2 + 2, yTopL + 2, tw - 4, yL - yTopL - 2, 4);

  /* ── the movable reservoir, hanging off the right limb ── */
  p.push();
  p.translate(xR + tw / 2 + 4, yR);
  p.noStroke();
  p.fill(C.dark);
  p.rect(0, -4, 16, 8, 3);
  p.fill(255);
  p.stroke(C.dark);
  p.strokeWeight(2.6);
  p.rect(16, -26, 46, 52, 8);
  p.noStroke();
  p.fill(C.hg);
  p.rect(19, -8, 40, 31, 5);
  p.fill(C.dark);
  p.textSize(11.5);
  p.textAlign(p.CENTER, p.TOP);
  p.text('reservoir', 39, 29);
  /* grab handle arrows so it reads as movable */
  p.stroke(C.accent);
  p.strokeWeight(2.2);
  arrow(p, 39, -32, 39, -46, 7);
  arrow(p, 39, 34 + 14, 39, 34 + 28, 7);
  p.pop();

  /* ── the constant-volume mark ── */
  const onMark = Math.abs(L) < 0.4;
  p.stroke(onMark ? C.green : C.red);
  p.strokeWeight(3);
  dashed(p, !onMark, [5, 4]);
  p.line(xL - tw / 2 - 54, yBase, xL + tw / 2 + 6, yBase);
  dashed(p, false);
  p.noStroke();
  p.fill(onMark ? C.green : C.red);
  p.textSize(12.5);
  p.textAlign(p.RIGHT, p.CENTER);
  p.text('constant', xL - tw / 2 - 58, yBase - 8);
  p.text('volume mark', xL - tw / 2 - 58, yBase + 7);

  /* ── the height difference h ── */
  if (o.showH) {
    const hx = (xL + xR) / 2;
    p.stroke(41, 89, 144, 90);
    p.strokeWeight(1.5);
    dashed(p, true, [4, 4]);
    p.line(xL + tw / 2, yL, xR - tw / 2, yL);
    p.line(xL + tw / 2, yR, xR - tw / 2, yR);
    dashed(p, false);
    dim(p, hx, yL, yR, `h = ${fmt(o.R - o.L, 1)} cm`, C.violet);
  }

  /* ── labels + status ── */
  if (o.labels) {
    chip(p, 'bulb of gas\n(fixed mass)', bx, by - 74, 'center', 13, C.dark);
    chip(p, 'mercury', xR + 4, yBot - 34, 'left', 12.5, C.navy);
  }

  p.noStroke();
  p.fill(C.navy);
  p.textSize(15);
  p.textAlign(p.CENTER, p.TOP);
  p.text(`bath at ${fmt(tC, 0)} °C`, bx, by + bathH * 0.6);

  if (o.flagVolume && !onMark) {
    const pct = (-L / V0) * 100;
    chip(p,
      pct > 0 ? `volume is ${fmt(pct, 1)}% TOO LARGE\nlevel the mercury before reading`
        : `volume is ${fmt(-pct, 1)}% TOO SMALL\nlevel the mercury before reading`,
      x0 + 12, 12, 'left', 14, C.red);
  } else if (o.flagVolume) {
    chip(p, 'volume constant - the reading is valid', x0 + 12, 12, 'left', 14, C.green);
  }

  return { Y, xL, xR, yBase };
}

/* ══════════════════════════════════════════════════════════════════════
   1a · THE APPARATUS, WALKED THROUGH
   A stand-alone five-step animation of one measuring cycle. Nothing to
   operate - the point is to see what each part is for.
   ══════════════════════════════════════════════════════════════════════ */

const GW_STEPS = [
  {
    tC: 0, R: 0, showH: false,
    title: 'The instrument',
    what: 'Gas sealed in the bulb, mercury sitting exactly on the mark.',
    caption: 'A fixed mass of gas in the bulb. The mercury surface in the left limb is the end of that gas - '
      + 'so as long as it sits on the mark, the gas volume is the same every time.',
  },
  {
    tC: 100, R: 0, showH: false,
    title: 'Warm the bulb',
    what: 'Gas expands and shoves the mercury down. Volume is wrong now.',
    caption: 'Hot gas pushes the mercury down the left limb - which means the gas has just been given MORE room. '
      + 'Measure the pressure now and you have changed two things at once.',
  },
  {
    tC: 100, R: gasIdealR(100), showH: false,
    title: 'Raise the reservoir',
    what: 'Mercury climbs back to the mark. Volume restored.',
    caption: 'Lift the reservoir. Extra mercury is pushed round until the left limb is back on the mark - '
      + 'the gas is squeezed back into exactly the volume it started with.',
  },
  {
    tC: 100, R: gasIdealR(100), showH: true,
    title: 'Read the difference h',
    what: 'The mercury in the right limb now stands h above the left.',
    caption: 'That height difference is what the extra pressure of the hot gas has to hold up. Read h off the scale.',
  },
  {
    tC: 100, R: gasIdealR(100), showH: true,
    title: 'p = p₀ + h',
    what: 'Pressure at constant volume IS the thermometric property.',
    caption: 'Atmospheric pressure plus h gives the gas pressure. Repeat at another temperature and you have '
      + 'a second point - the pressure is the thing that tells you the temperature.',
  },
];

const gw = { step: 0, tC: 0, R: 0, play: false, dwell: 0 };

function gwSetStep(n: number) {
  gw.step = (n + GW_STEPS.length) % GW_STEPS.length;
  gw.dwell = 0;
  const S = GW_STEPS[gw.step];
  el('l2GwStep')!.textContent = `${gw.step + 1} / ${GW_STEPS.length} · ${S.title}`;
  el('l2GwWhat')!.textContent = S.what;
}

const gwSketch = (p: p5) => {
  const holder = el('l2GwCanvas');
  const canvasH = () => Math.max(430, Math.min(560, Math.round(holder.clientWidth * 0.46)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    const S = GW_STEPS[gw.step];

    gw.tC = ease(gw.tC, S.tC, 2.2, d);
    gw.R = ease(gw.R, S.R, 2.6, d);
    const settled = Math.abs(gw.tC - S.tC) < 1.2 && Math.abs(gw.R - S.R) < 0.6;

    if (gw.play) {
      if (settled) gw.dwell += d;
      if (gw.dwell > 2.4) gwSetStep(gw.step + 1);
    }

    const L = gasLevel(gw.tC, gw.R);
    const rigW = Math.min(p.width * 0.68, 620);
    drawRig(p, {
      x0: 4, w: rigW, h: p.height, tC: gw.tC, R: gw.R, L,
      labels: gw.step === 0, showH: S.showH, flagVolume: false,
    });

    /* the mercury being off the mark is the whole point of step 2 */
    if (gw.step === 1 && settled) {
      chip(p, '✗ gas volume has increased', 14, 12, 'left', 15, C.red);
    } else if (gw.step >= 2 && settled) {
      chip(p, '✓ back to the original volume', 14, 12, 'left', 15, C.green);
    }

    /* ── the running commentary panel ── */
    const px = rigW + 14, pw = p.width - px - 14;
    if (pw > 190) {
      p.noStroke();
      p.fill(255);
      p.rect(px, 46, pw, p.height - 92, 16);
      p.fill(C.accent);
      p.rect(px, 46, pw, 6, 16);

      p.fill(C.dark);
      p.textFont('DM Sans');
      p.textSize(12.5);
      p.textAlign(p.LEFT, p.TOP);
      p.text(`STEP ${gw.step + 1} OF ${GW_STEPS.length}`, px + 20, 72);
      p.fill(C.navy);
      p.textFont('DM Sans');
      p.textSize(23);
      p.text(S.title, px + 20, 92);
      p.textSize(16);
      p.fill(60, 80, 105);
      p.text(S.caption, px + 20, 132, pw - 40, 200);

      /* step pips */
      GW_STEPS.forEach((_, i) => {
        p.noStroke();
        p.fill(i === gw.step ? C.accent : p.color(41, 89, 144, 55));
        p.rect(px + 20 + i * 26, p.height - 82, i === gw.step ? 20 : 14, 6, 3);
      });

      /* the running result, once there is one */
      if (gw.step >= 3) {
        const pr = P_ATM + (gw.R - gasLevel(gw.tC, gw.R));
        p.noStroke();
        p.fill(124, 58, 237, 26);
        p.rect(px + 16, p.height - 168, pw - 32, 68, 12);
        p.fill(C.violet);
        p.textSize(15);
        p.text(`h = ${fmt(gw.R - gasLevel(gw.tC, gw.R), 1)} cm`, px + 30, p.height - 156);
        p.textSize(20);
        p.fill(C.navy);
        p.text(`p = 76 + h = ${fmt(pr, 1)} cm Hg`, px + 30, p.height - 134);
      }
    }
  };
};

let gwInst: p5 | null = null;

function gwWire() {
  const playBtn = el('l2GwPlay') as HTMLButtonElement;
  playBtn.addEventListener('click', () => {
    gw.play = !gw.play;
    playBtn.textContent = gw.play ? '⏸ Pause' : '▶ Play the whole cycle';
    playBtn.classList.toggle('primary', !gw.play);
  });
  el('l2GwNext').addEventListener('click', () => gwSetStep(gw.step + 1));
  el('l2GwPrev').addEventListener('click', () => gwSetStep(gw.step - 1));
  el('l2GwRst').addEventListener('click', () => {
    gw.play = false;
    playBtn.textContent = '▶ Play the whole cycle';
    playBtn.classList.add('primary');
    gw.tC = 0; gw.R = 0;
    gwSetStep(0);
  });
  gwSetStep(0);
}

/* ══════════════════════════════════════════════════════════════════════
   1b · THE RIG YOU OPERATE
   Same instrument, now with the reservoir under your control - and a
   p-t graph that fills up with the points you certify as valid.
   ══════════════════════════════════════════════════════════════════════ */

const rig = { tC: 0, R: 0, Rshown: 0, auto: false, pts: [] as Array<{ t: number; p: number }>, warn: 0 };

function rigReadouts() {
  const L = gasLevel(rig.tC, rig.Rshown);
  const pr = P_ATM + (rig.Rshown - L);
  el('l2GasRoT').textContent = `${rig.tC} °C`;
  el('l2GasRoH').textContent = `${fmt(rig.Rshown - L, 1)} cm Hg`;
  el('l2GasRoP').textContent = `${fmt(pr, 1)} cm Hg`;
  const v = el('l2GasRoV');
  if (Math.abs(L) < 0.4) {
    v.textContent = 'on the mark ✓';
    v.style.color = C.green;
  } else {
    v.textContent = `${L < 0 ? '+' : '−'}${fmt(Math.abs(L), 1)}% off`;
    v.style.color = C.red;
  }
}

const rigSketch = (p: p5) => {
  const holder = el('l2GasCanvas');
  const canvasH = () => Math.max(430, Math.min(560, Math.round(holder.clientWidth * 0.44)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  const drawGraph = (x0: number, w: number) => {
    const gx = x0 + 58, gy = 40, gw2 = w - 84, gh = p.height - 116;
    const TA = -300, TB = 330, PA = 0, PB = 180;
    const X = (t: number) => gx + ((t - TA) / (TB - TA)) * gw2;
    const Y = (v: number) => gy + gh - ((v - PA) / (PB - PA)) * gh;

    p.noStroke();
    p.fill(255);
    p.rect(gx - 44, gy - 24, gw2 + 66, gh + 66, 14);

    /* grid */
    p.stroke(41, 89, 144, 26);
    p.strokeWeight(1);
    for (let t = -300; t <= 300; t += 100) p.line(X(t), gy, X(t), gy + gh);
    for (let v = 0; v <= 180; v += 30) p.line(gx, Y(v), gx + gw2, Y(v));

    /* axes */
    p.stroke(C.navy);
    p.strokeWeight(2.4);
    p.line(gx, gy + gh, gx + gw2, gy + gh);
    p.line(gx, gy, gx, gy + gh);
    p.noStroke();
    p.fill(C.dark);
    p.textFont('DM Sans');
    p.textSize(12);
    p.textAlign(p.CENTER, p.TOP);
    for (let t = -300; t <= 300; t += 100) p.text(`${t}`, X(t), gy + gh + 6);
    p.text('temperature t (°C)', gx + gw2 / 2, gy + gh + 26);
    p.textAlign(p.RIGHT, p.CENTER);
    for (let v = 0; v <= 180; v += 30) p.text(`${v}`, gx - 7, Y(v));
    p.push();
    p.translate(gx - 40, gy + gh / 2);
    p.rotate(-Math.PI / 2);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('pressure p (cm Hg)', 0, 0);
    p.pop();

    /* the line your points are lying on, once there are two of them */
    if (rig.pts.length >= 2) {
      p.stroke(0, 160, 227, 150);
      p.strokeWeight(2.2);
      dashed(p, true, [7, 6]);
      p.line(X(-T0K), Y(0), X(330), Y(P_ATM * (330 + T0K) / T0K));
      dashed(p, false);
      chip(p, 'your points make a straight line', X(120), Y(P_ATM * (120 + T0K) / T0K) - 34,
        'center', 13.5, C.accent);
      p.noStroke();
      p.fill(C.grey);
      p.textSize(12.5);
      p.textAlign(p.CENTER, p.TOP);
      p.text('...and it is heading somewhere. Screen 02.', X(-215), Y(0) + 8);
      p.stroke(C.grey);
      p.strokeWeight(1.6);
      p.circle(X(-T0K), Y(0), 11);
    }

    /* recorded points */
    rig.pts.forEach((q) => {
      p.noStroke();
      p.fill(C.navy);
      p.circle(X(q.t), Y(q.p), 13);
      p.fill(C.accent);
      p.circle(X(q.t), Y(q.p), 7);
    });

    /* the live point */
    const L = gasLevel(rig.tC, rig.Rshown);
    const pr = P_ATM + (rig.Rshown - L);
    const valid = Math.abs(L) < 0.4;
    p.stroke(valid ? C.green : C.red);
    p.strokeWeight(1.6);
    dashed(p, true, [4, 4]);
    p.line(gx, Y(pr), X(rig.tC), Y(pr));
    p.line(X(rig.tC), gy + gh, X(rig.tC), Y(pr));
    dashed(p, false);
    p.noStroke();
    p.fill(valid ? C.green : C.red);
    p.circle(X(rig.tC), Y(pr), 19);
    p.fill(255);
    p.circle(X(rig.tC), Y(pr), 8);

    if (!valid) {
      const right = X(rig.tC) > gx + gw2 * 0.66;
      chip(p, 'level the mercury first', X(rig.tC) + (right ? -12 : 12), Y(pr) - 30,
        right ? 'right' : 'left', 13, C.red);
    }
    if (rig.warn > 0) {
      chip(p, 'Mercury is off the mark - that point would be wrong.',
        gx + gw2 / 2, gy + 8, 'center', 14.5, C.red);
    }
  };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    if (rig.warn > 0) rig.warn -= d;

    if (rig.auto) {
      const target = gasIdealR(rig.tC);
      rig.R = ease(rig.R, target, 3.4, d);
      slider('l2GasR').value = String(rig.R);
      el('l2GasRVal').textContent = `${fmt(rig.R, 1)} cm`;
    }
    rig.Rshown = ease(rig.Rshown, rig.R, 9, d);
    rigReadouts();

    const rigW = Math.min(p.width * 0.5, 500);
    const L = gasLevel(rig.tC, rig.Rshown);
    drawRig(p, {
      x0: 0, w: rigW, h: p.height, tC: rig.tC, R: rig.Rshown, L,
      labels: false, showH: true, flagVolume: true,
    });
    drawGraph(rigW, p.width - rigW);
  };
};

let rigInst: p5 | null = null;

function rigWire() {
  const st = slider('l2GasT'), sr = slider('l2GasR');
  st.addEventListener('input', () => {
    rig.tC = +st.value;
    el('l2GasTVal').textContent = `${rig.tC} °C`;
  });
  sr.addEventListener('input', () => {
    rig.auto = false;
    (el('l2GasAuto') as HTMLButtonElement).textContent = '⚙ Auto-level: OFF';
    el('l2GasAuto').classList.remove('on');
    rig.R = +sr.value;
    el('l2GasRVal').textContent = `${fmt(rig.R, 1)} cm`;
  });
  el('l2GasAuto').addEventListener('click', () => {
    rig.auto = !rig.auto;
    (el('l2GasAuto') as HTMLButtonElement).textContent = `⚙ Auto-level: ${rig.auto ? 'ON' : 'OFF'}`;
    el('l2GasAuto').classList.toggle('on', rig.auto);
  });
  el('l2GasRec').addEventListener('click', () => {
    const L = gasLevel(rig.tC, rig.Rshown);
    if (Math.abs(L) > 0.4) { rig.warn = 2.2; return; }
    const pr = P_ATM + (rig.Rshown - L);
    if (!rig.pts.some((q) => Math.abs(q.t - rig.tC) < 6)) rig.pts.push({ t: rig.tC, p: pr });
  });
  el('l2GasClr').addEventListener('click', () => { rig.pts = []; });
  rigReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   2 · EXTRAPOLATING TO ABSOLUTE ZERO
   Three gases with three slopes. Run every line backwards and they all
   die at the same temperature - and the slider cannot move it.
   ══════════════════════════════════════════════════════════════════════ */

const ABS0 = -273.15;

const zero = {
  stage: 0,          // 0 empty · 1 measured · 2 extended · 3 zero named · 4 caveat
  a1: 0, a2: 0, a3: 0, a4: 0,
  p3: 40,
};

const ZGASES = [
  { name: 'Gas 1 · hydrogen', p0: 88, col: C.accent },
  { name: 'Gas 2 · helium', p0: 62, col: C.violet },
  { name: 'Gas 3 · oxygen', p0: 40, col: C.amber },
];

function zP0(i: number) { return i === 2 ? zero.p3 : ZGASES[i].p0; }
function zPress(i: number, t: number) { return zP0(i) * (1 + t / T0K); }

function zeroSetStage(n: number) {
  zero.stage = n;
  if (n === 0) { zero.a1 = 0; zero.a2 = 0; zero.a3 = 0; zero.a4 = 0; }
  [['l2ZS1', 0], ['l2ZS2', 1], ['l2ZS3', 2], ['l2ZS4', 3]].forEach(([id, need]) => {
    (el(id as string) as HTMLButtonElement).disabled = n < (need as number);
  });
  zeroReadouts();
}

function zeroReadouts() {
  const shown = zero.stage >= 3;
  ['l2ZI1', 'l2ZI2', 'l2ZI3'].forEach((id) => {
    el(id).textContent = shown ? '−273.15 °C' : 'run the lines back';
    el(id).style.color = shown ? C.green : C.grey;
  });
  el('l2ZSl').textContent = `${fmt(zero.p3 / T0K, 4)} cm Hg per °C`;
}

const zeroSketch = (p: p5) => {
  const holder = el('l2ZeroCanvas');
  const canvasH = () => Math.max(420, Math.min(560, Math.round(holder.clientWidth * 0.46)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    if (zero.stage >= 1) zero.a1 = Math.min(1, zero.a1 + d * 0.9);
    if (zero.stage >= 2 && zero.a1 >= 1) zero.a2 = Math.min(1, zero.a2 + d * 0.62);
    if (zero.stage >= 3 && zero.a2 >= 1) zero.a3 = Math.min(1, zero.a3 + d * 1.5);
    if (zero.stage >= 4) zero.a4 = Math.min(1, zero.a4 + d * 1.4);

    const gx = 74, gy = 46, gw = p.width - 116, gh = p.height - 110;
    const TA = -320, TB = 200, PA = 0, PB = 150;
    const X = (t: number) => gx + ((t - TA) / (TB - TA)) * gw;
    const Y = (v: number) => gy + gh - ((v - PA) / (PB - PA)) * gh;

    /* grid + axes */
    p.stroke(41, 89, 144, 24);
    p.strokeWeight(1);
    for (let t = -300; t <= 200; t += 50) p.line(X(t), gy, X(t), gy + gh);
    for (let v = 0; v <= 150; v += 25) p.line(gx, Y(v), gx + gw, Y(v));

    /* the liquefaction caveat band */
    if (zero.a4 > 0) {
      p.noStroke();
      p.fill(225, 29, 72, 16 * zero.a4);
      p.rect(X(-320), gy, X(-183) - X(-320), gh);
      p.stroke(225, 29, 72, 90 * zero.a4);
      p.strokeWeight(1.4);
      for (let x = X(-320); x < X(-183); x += 11) p.line(x, gy, x + 16, gy + gh);
      dashed(p, true, [5, 5]);
      p.stroke(C.red);
      p.strokeWeight(2);
      p.line(X(-183), gy, X(-183), gy + gh);
      dashed(p, false);
    }

    p.stroke(C.navy);
    p.strokeWeight(2.4);
    p.line(gx, Y(0), gx + gw, Y(0));
    p.line(X(0), gy, X(0), gy + gh);

    p.noStroke();
    p.fill(C.dark);
    p.textFont('DM Sans');
    p.textSize(12.5);
    p.textAlign(p.CENTER, p.TOP);
    for (let t = -300; t <= 200; t += 100) if (t !== 0) p.text(`${t}`, X(t), Y(0) + 7);
    p.text('temperature t (°C)', gx + gw / 2, gy + gh + 30);
    p.textAlign(p.RIGHT, p.CENTER);
    for (let v = 25; v <= 150; v += 25) p.text(`${v}`, X(0) - 7, Y(v));
    p.push();
    p.translate(26, gy + gh / 2);
    p.rotate(-Math.PI / 2);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('pressure of the gas (cm Hg)', 0, 0);
    p.pop();

    /* ── the three gases ── */
    ZGASES.forEach((G, i) => {
      const col = p.color(G.col);

      /* the measured stretch, 0 → 120 °C, revealed left to right */
      if (zero.a1 > 0) {
        const tEnd = 120 * zero.a1;
        p.stroke(col);
        p.strokeWeight(4);
        p.noFill();
        p.line(X(0), Y(zPress(i, 0)), X(tEnd), Y(zPress(i, tEnd)));
        for (let t = 0; t <= 120; t += 20) {
          if (t > tEnd) break;
          p.noStroke();
          p.fill(col);
          p.circle(X(t), Y(zPress(i, t)), 9);
        }
        if (zero.a1 >= 1) {
          chip(p, G.name, X(124), Y(zPress(i, 124)) - 11, 'left', 13.5, G.col);
        }
      }

      /* the extrapolation, running backwards to the intercept */
      if (zero.a2 > 0) {
        const tBack = -zero.a2 * (0 - ABS0);
        p.stroke(p.red(col), p.green(col), p.blue(col), 210);
        p.strokeWeight(3);
        dashed(p, true, [8, 7]);
        p.line(X(0), Y(zPress(i, 0)), X(tBack), Y(zPress(i, tBack)));
        dashed(p, false);
      }
    });

    /* ── naming the intercept ── */
    if (zero.a3 > 0) {
      const puls = 1 + 0.16 * Math.sin(p.frameCount * 0.11);
      p.stroke(C.green);
      p.strokeWeight(2.4 * zero.a3);
      dashed(p, true, [6, 5]);
      p.line(X(ABS0), gy, X(ABS0), Y(0) + 26);
      dashed(p, false);
      p.noStroke();
      p.fill(22, 163, 74, 60 * zero.a3);
      p.circle(X(ABS0), Y(0), 34 * puls * zero.a3);
      p.fill(C.green);
      p.circle(X(ABS0), Y(0), 15 * zero.a3);
      chip(p, 'ABSOLUTE ZERO\n−273.15 °C\nevery gas, same point',
        X(ABS0) + 16, gy + 8, 'left', 15, C.green);
    }

    /* ── caption strip ── */
    const caps = [
      'Three bulbs, three different gases. Nothing measured yet.',
      'Measured between 0 and 120 °C. Three straight lines, three different slopes - as expected.',
      'Now run every line backwards, past any temperature anyone measured. Watch where they go.',
      'They do not just get close. They all reach zero pressure at the same temperature.',
      'Honest caveat: real gases liquefy long before this (hatched). The line is not followed down there - '
        + 'but the intercept comes out the same every single time.',
    ];
    p.noStroke();
    p.fill(C.navy);
    p.textSize(15.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text(caps[zero.stage], 74, 14, gw - 20, 40);

    if (zero.a4 > 0) {
      chip(p, 'real gases liquefy\nsomewhere in here', X(-300) + 6, gy + gh * 0.36, 'left', 13, C.red);
    }
  };
};

let zeroInst: p5 | null = null;

function zeroWire() {
  el('l2ZS1').addEventListener('click', () => zeroSetStage(1));
  el('l2ZS2').addEventListener('click', () => zeroSetStage(2));
  el('l2ZS3').addEventListener('click', () => zeroSetStage(3));
  el('l2ZS4').addEventListener('click', () => zeroSetStage(4));
  el('l2ZRst').addEventListener('click', () => zeroSetStage(0));
  const s = slider('l2ZP0');
  s.addEventListener('input', () => {
    zero.p3 = +s.value;
    el('l2ZP0Val').textContent = `${zero.p3} cm Hg`;
    zeroReadouts();
  });
  zeroSetStage(0);
}

/* ══════════════════════════════════════════════════════════════════════
   3a · SLIDE THE ZERO, KEEP THE STEP
   The Kelvin axis is the same ruler as the Celsius one. Play the slide
   and watch the tick spacing refuse to change.
   ══════════════════════════════════════════════════════════════════════ */

const kel = { off: 0, target: 0, tC: 27 };

function kelReadouts() {
  el('l2KRoC').textContent = `${kel.tC} °C`;
  el('l2KRoK').textContent = `${fmt(kel.tC + T0K, 2)} K`;
  el('l2KRoStep').textContent = '1 °C = 1 K exactly';
}

const kelSketch = (p: p5) => {
  const holder = el('l2KCanvas');
  const canvasH = () => Math.max(360, Math.min(430, Math.round(holder.clientWidth * 0.3)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    kel.off = ease(kel.off, kel.target, 1.9, dt(p));

    const TA = -320, TB = 360;
    const gx = 56, gw = p.width - 92;
    const X = (t: number) => gx + ((t - TA) / (TB - TA)) * gw;
    const yC = p.height * 0.38, yK = p.height * 0.78;

    p.textFont('DM Sans');

    /* ── the Celsius ruler (never moves) ── */
    const ruler = (y: number, label: string, col: string) => {
      p.stroke(col);
      p.strokeWeight(3);
      p.line(gx, y, gx + gw, y);
      p.noStroke();
      p.fill(col);
      p.textSize(13);
      p.textAlign(p.RIGHT, p.CENTER);
      p.text(label, gx - 8, y);
    };
    ruler(yC, 'Celsius', C.dark);
    ruler(yK, 'Kelvin', C.violet);

    const tick = (x: number, y: number, major: boolean, col: any, txt?: string) => {
      if (x < gx - 1 || x > gx + gw + 1) return;
      p.stroke(col);
      p.strokeWeight(major ? 2.4 : 1.3);
      p.line(x, y, x, y - (major ? 15 : 8));
      if (txt) {
        p.noStroke();
        p.fill(col);
        p.textSize(13);
        p.textAlign(p.CENTER, p.TOP);
        p.text(txt, x, y + 6);
      }
    };

    for (let t = -350; t <= 400; t += 10) {
      tick(X(t), yC, t % 50 === 0, t % 50 === 0 ? C.dark : p.color(41, 89, 144, 110) as any,
        t % 100 === 0 ? `${t}` : undefined);
    }
    for (let K = 0; K <= 700; K += 10) {
      const x = X(K - kel.off);
      tick(x, yK, K % 50 === 0, K % 50 === 0 ? C.violet : p.color(124, 58, 237, 110) as any,
        K % 100 === 0 ? `${K}` : undefined);
    }

    /* the sliding zero flag */
    const zx = X(-kel.off);
    if (zx > gx - 40 && zx < gx + gw + 40) {
      p.stroke(C.violet);
      p.strokeWeight(2);
      dashed(p, true, [5, 4]);
      p.line(zx, yK - 20, zx, yK - 66);
      dashed(p, false);
      chip(p, kel.off > 270 ? '0 K sits here\n= −273.15 °C' : '0 K sits here', zx, yK - 96, 'center', 14, C.violet);
    }

    /* ── one division, measured on both rulers ── */
    const cal = (y: number, t0: number, t1: number, txt: string, col: string) => {
      const x1 = X(t0), x2 = X(t1);
      p.stroke(col);
      p.strokeWeight(2.2);
      p.line(x1, y - 40, x1, y - 22);
      p.line(x2, y - 40, x2, y - 22);
      arrow(p, x1, y - 31, x2, y - 31, 7);
      arrow(p, x2, y - 31, x1, y - 31, 7);
      chip(p, txt, (x1 + x2) / 2, y - 62, 'center', 13.5, col);
    };
    cal(yC, 100, 150, '50 °C wide', C.dark);
    cal(yK, 100 - kel.off, 150 - kel.off, '50 K wide - the same width', C.violet);

    /* ── the live pointer through both rulers ── */
    const px = X(kel.tC);
    p.stroke(C.accent);
    p.strokeWeight(2.4);
    dashed(p, true, [7, 5]);
    p.line(px, yC - 84, px, yK + 34);
    dashed(p, false);
    p.noStroke();
    p.fill(C.accent);
    p.circle(px, yC, 12);
    p.circle(px, yK, 12);
    chip(p, `${kel.tC} °C`, px, yC - 108, 'center', 16, C.accent);
    chip(p, `${fmt(kel.tC + T0K, 2)} K`, px, yK + 40, 'center', 16, C.accent);

    /* ── the two rules ── */
    p.noStroke();
    p.fill(C.navy);
    p.textSize(16);
    p.textAlign(p.LEFT, p.TOP);
    p.text(kel.off > 270
      ? 'Zero has moved. Tick spacing has not. T = t + 273.15'
      : 'Same ruler, same tick spacing. Now slide where zero is called.', gx, 14);

    const cardW = 210, cx0 = p.width - cardW - 14;
    p.fill(255);
    p.rect(cx0, 8, cardW, 62, 12);
    p.fill(C.green);
    p.textSize(19);
    p.textAlign(p.LEFT, p.TOP);
    p.text('300 K   ✓', cx0 + 16, 16);
    p.fill(C.red);
    p.text('300 °K  ✗', cx0 + 16, 40);
  };
};

let kelInst: p5 | null = null;

function kelWire() {
  el('l2KGo').addEventListener('click', () => { kel.target = T0K; });
  el('l2KRst').addEventListener('click', () => { kel.target = 0; });
  const s = slider('l2KT');
  s.addEventListener('input', () => {
    kel.tC = +s.value;
    el('l2KTVal').textContent = `${kel.tC} °C`;
    kelReadouts();
  });
  kelReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   3b · THE TRIPLE POINT
   A phase diagram with a dot you steer, and a cell showing what is
   actually in the tube. One dot on the whole page gives all three.
   ══════════════════════════════════════════════════════════════════════ */

const TP_T = 273.16, TP_P = 4.58;     // K, mm of Hg

/* Clausius-Clapeyron fits, both pinned to the triple point */
const pVap = (T: number) => Math.exp(20.595 - 5210 / T);
const pSub = (T: number) => Math.exp(24.036 - 6150 / T);
/* the melting line leans left for water - exaggerated here so it is visible */
const tMelt = (pr: number) => TP_T - 0.55 * (Math.log10(pr) - Math.log10(TP_P));

const tp = { T: TP_T, p: TP_P };

function tpPhase(T: number, pr: number): 'solid' | 'liquid' | 'vapour' | 'triple' {
  if (Math.abs(T - TP_T) < 0.07 && Math.abs(Math.log10(pr / TP_P)) < 0.035) return 'triple';
  if (T < TP_T) return pr < pSub(T) ? 'vapour' : 'solid';
  if (pr < pVap(T)) return 'vapour';
  return T < tMelt(pr) ? 'solid' : 'liquid';
}

const TP_NAMES: Record<string, string> = {
  solid: 'ice only',
  liquid: 'liquid water only',
  vapour: 'water vapour only',
  triple: 'ice + water + vapour ✓',
};

function tpReadouts() {
  const ph = tpPhase(tp.T, tp.p);
  const r = el('l2TpPhase');
  r.textContent = TP_NAMES[ph];
  r.style.color = ph === 'triple' ? C.green : C.navy;
  el('l2TpTVal').textContent = `${fmt(tp.T, 2)} K`;
  el('l2TpPVal').textContent = `${fmt(tp.p, 2)} mm Hg`;
}

const tpSketch = (p: p5) => {
  const holder = el('l2TpCanvas');
  const canvasH = () => Math.max(400, Math.min(520, Math.round(holder.clientWidth * 0.42)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  /* ── the sealed cell ── */
  const drawCell = (x0: number, w: number) => {
    const ph = tpPhase(tp.T, tp.p);
    const cw = Math.min(w - 40, 170), cx = x0 + w / 2;
    const ct = 74, cb = p.height - 74;

    if (ph === 'triple') {
      p.noStroke();
      p.fill(22, 163, 74, 40 + 26 * Math.sin(p.frameCount * 0.09));
      p.rect(cx - cw / 2 - 14, ct - 14, cw + 28, cb - ct + 28, 20);
    }

    p.noStroke();
    p.fill(255);
    p.rect(cx - cw / 2, ct, cw, cb - ct, 14);

    const liqTop = ph === 'liquid' ? cb - (cb - ct) * 0.55
      : ph === 'triple' ? cb - (cb - ct) * 0.42 : cb;
    if (ph === 'liquid' || ph === 'triple') {
      p.fill(56, 130, 246, 120);
      p.rect(cx - cw / 2 + 2, liqTop, cw - 4, cb - liqTop - 2, 8);
      chip(p, 'liquid', cx - cw / 2 + 8, (liqTop + cb) / 2 - 10, 'left', 12.5, C.dark);
    }
    if (ph === 'solid') {
      p.fill(214, 240, 255, 235);
      p.stroke(125, 211, 252);
      p.strokeWeight(2);
      p.rect(cx - cw / 2 + 6, cb - (cb - ct) * 0.6, cw - 12, (cb - ct) * 0.6 - 6, 10);
      p.noStroke();
      chip(p, 'ice', cx - cw / 2 + 12, cb - (cb - ct) * 0.34, 'left', 12.5, C.dark);
    }
    if (ph === 'triple') {
      /* ice chunks bobbing on the surface */
      p.noStroke();
      p.fill(224, 245, 255, 245);
      [-38, 2, 36].forEach((dx, i) => {
        const bob = 3 * Math.sin(p.frameCount * 0.05 + i);
        p.push();
        p.translate(cx + dx, liqTop - 6 + bob);
        p.rotate(Math.sin(i * 2.1) * 0.3);
        p.rect(-16, -12, 32, 24, 6);
        p.pop();
      });
      chip(p, 'ice', cx - cw / 2 + 8, liqTop - 40, 'left', 12.5, C.dark);
    }
    /* vapour, always present above the liquid unless the cell is solid-packed */
    const vTop = ct + 6, vBot = Math.min(liqTop - 6, cb - 6);
    p.noStroke();
    p.fill(0, 160, 227, 190);
    for (let i = 0; i < 18; i++) {
      const seed = Math.sin(i * 12.9898) * 43758.5453;
      const fx = seed - Math.floor(seed);
      const fy = (Math.sin(i * 78.233) * 43758.5453) % 1;
      const sx = cx - cw / 2 + 12 + ((fx * (cw - 24) + p.frameCount * (0.5 + (i % 4) * 0.22)) % (cw - 24));
      const sy = vTop + ((Math.abs(fy) * (vBot - vTop) + p.frameCount * (0.3 + (i % 3) * 0.26))
        % Math.max(20, vBot - vTop));
      p.circle(sx, sy, 5.5);
    }
    if (ph !== 'solid') chip(p, 'vapour', cx - cw / 2 + 8, vTop + 4, 'left', 12.5, C.accent);

    p.noFill();
    p.stroke(C.navy);
    p.strokeWeight(3);
    p.rect(cx - cw / 2, ct, cw, cb - ct, 14);

    p.noStroke();
    p.fill(ph === 'triple' ? C.green : C.navy);
    p.textFont('DM Sans');
    p.textSize(16);
    p.textAlign(p.CENTER, p.TOP);
    p.text(TP_NAMES[tpPhase(tp.T, tp.p)], cx, cb + 12);
    p.fill(C.dark);
    p.textSize(13);
    p.text('sealed cell of pure water', cx, ct - 26);
  };

  /* ── the phase diagram ── */
  const drawPD = (x0: number, w: number) => {
    const gx = x0 + 58, gy = 46, gw = w - 92, gh = p.height - 116;
    const TA = 258, TB = 300;
    const LA = Math.log10(0.6), LB = Math.log10(2200);
    const X = (T: number) => gx + ((T - TA) / (TB - TA)) * gw;
    const Y = (pr: number) => gy + gh - ((Math.log10(pr) - LA) / (LB - LA)) * gh;

    p.noStroke();
    p.fill(255);
    p.rect(gx - 46, gy - 26, gw + 66, gh + 70, 14);

    /* regions, tinted */
    p.noStroke();
    for (let x = gx; x < gx + gw; x += 5) {
      for (let y = gy; y < gy + gh; y += 5) {
        const T = TA + ((x - gx) / gw) * (TB - TA);
        const pr = Math.pow(10, LA + ((gy + gh - y) / gh) * (LB - LA));
        const ph = tpPhase(T, pr);
        if (ph === 'vapour') p.fill(255, 236, 190, 70);
        else if (ph === 'solid') p.fill(186, 230, 253, 120);
        else p.fill(59, 130, 246, 60);
        p.rect(x, y, 5, 5);
      }
    }

    /* the three boundary curves */
    p.noFill();
    p.strokeWeight(3);
    p.stroke(C.dark);
    p.beginShape();
    for (let T = TP_T; T <= TB; T += 0.4) p.vertex(X(T), Y(pVap(T)));
    p.endShape();
    p.stroke(C.accent);
    p.beginShape();
    for (let T = TA; T <= TP_T; T += 0.4) p.vertex(X(T), Y(pSub(T)));
    p.endShape();
    p.stroke(C.violet);
    p.beginShape();
    for (let l = Math.log10(TP_P); l <= LB; l += 0.05) {
      const pr = Math.pow(10, l);
      p.vertex(X(tMelt(pr)), Y(pr));
    }
    p.endShape();

    /* axes */
    p.stroke(C.navy);
    p.strokeWeight(2.2);
    p.line(gx, gy + gh, gx + gw, gy + gh);
    p.line(gx, gy, gx, gy + gh);
    p.noStroke();
    p.fill(C.dark);
    p.textFont('DM Sans');
    p.textSize(12);
    p.textAlign(p.CENTER, p.TOP);
    for (let T = 260; T <= 300; T += 10) p.text(`${T}`, X(T), gy + gh + 6);
    p.text('temperature (K)   ·   schematic, axes not to scale', gx + gw / 2, gy + gh + 26);
    p.textAlign(p.RIGHT, p.CENTER);
    [1, 10, 100, 1000].forEach((v) => p.text(`${v}`, gx - 7, Y(v)));
    p.push();
    p.translate(gx - 42, gy + gh / 2);
    p.rotate(-Math.PI / 2);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('pressure (mm Hg)', 0, 0);
    p.pop();

    /* region names */
    p.noStroke();
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(14);
    p.fill(41, 89, 144, 160);
    p.text('SOLID', X(264), Y(400));
    p.text('LIQUID', X(288), Y(500));
    p.text('VAPOUR', X(285), Y(1.6));

    /* the triple point itself */
    const tx = X(TP_T), ty = Y(TP_P);
    const puls = 1 + 0.2 * Math.sin(p.frameCount * 0.1);
    p.noStroke();
    p.fill(22, 163, 74, 55);
    p.circle(tx, ty, 26 * puls);
    p.fill(C.green);
    p.circle(tx, ty, 11);
    chip(p, 'triple point\n273.16 K · 4.58 mm Hg', tx - 16, ty - 58, 'right', 13, C.green);

    /* the dot you steer */
    const dx = X(tp.T), dy = Y(tp.p);
    p.stroke(C.navy);
    p.strokeWeight(1.5);
    dashed(p, true, [4, 4]);
    p.line(gx, dy, dx, dy);
    p.line(dx, gy + gh, dx, dy);
    dashed(p, false);
    p.noStroke();
    p.fill(C.navy);
    p.circle(dx, dy, 16);
    p.fill(C.amber);
    p.circle(dx, dy, 9);
  };

  p.draw = () => {
    p.background(C.paper);
    const cellW = Math.min(p.width * 0.36, 300);
    drawCell(0, cellW);
    drawPD(cellW, p.width - cellW);

    /* the 0.01 K trap, spelled out where it cannot be missed */
    p.noStroke();
    p.fill(C.navy);
    p.textFont('DM Sans');
    p.textSize(14.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text('273.16 K = triple point      273.15 K = ice point      they differ by 0.01 K', 12, 12);
  };
};

let tpInst: p5 | null = null;

function tpWire() {
  const st = slider('l2TpT'), sp = slider('l2TpP');
  const push = () => {
    st.value = String(Math.round(tp.T * 100));
    sp.value = String(Math.round((Math.log10(tp.p) - Math.log10(0.8)) / (Math.log10(2000) - Math.log10(0.8)) * 1000));
    tpReadouts();
  };
  st.addEventListener('input', () => { tp.T = +st.value / 100; tpReadouts(); });
  sp.addEventListener('input', () => {
    const f = +sp.value / 1000;
    tp.p = Math.pow(10, Math.log10(0.8) + f * (Math.log10(2000) - Math.log10(0.8)));
    tpReadouts();
  });
  el('l2TpSnap').addEventListener('click', () => { tp.T = TP_T; tp.p = TP_P; push(); });
  push();
}

/* ══════════════════════════════════════════════════════════════════════
   4 · THE CONVERSION LADDER
   Four scales drawn against the same physical temperature axis, so the
   filled part of every bar is forced to the same height.
   ══════════════════════════════════════════════════════════════════════ */

interface Scale {
  name: string; unit: string; ice: number; steam: number;
  step: number;              // tick spacing in that scale's own degrees
  col: string; dp: number;
}
const SCALES: Scale[] = [
  { name: 'Celsius', unit: '°C', ice: 0, steam: 100, step: 10, col: '#00A0E3', dp: 1 },
  { name: 'Fahrenheit', unit: '°F', ice: 32, steam: 212, step: 20, col: '#e11d48', dp: 1 },
  { name: 'Kelvin', unit: 'K', ice: 273.15, steam: 373.15, step: 10, col: '#7c3aed', dp: 2 },
  { name: 'Reaumur', unit: '°R', ice: 0, steam: 80, step: 10, col: '#f59e0b', dp: 1 },
];
/* a scale's reading at a physical temperature given in °C */
const readOn = (S: Scale, tC: number) => S.ice + (tC / 100) * (S.steam - S.ice);
/* and back again */
const toC = (S: Scale, v: number) => ((v - S.ice) / (S.steam - S.ice)) * 100;

const CV_MIN = -60, CV_MAX = 160;
const cv = { t: 40 };

function cvReadouts() {
  el('l2CvC').textContent = `${fmt(cv.t, 1)} °C`;
  el('l2CvF').textContent = `${fmt(readOn(SCALES[1], cv.t), 1)} °F`;
  el('l2CvK').textContent = `${fmt(cv.t + T0K, 2)} K`;
  el('l2CvR').textContent = `${fmt(readOn(SCALES[3], cv.t), 1)} °R`;
  el('l2CvTVal').textContent = `${fmt(cv.t, 1)} °C`;
  const f = cv.t / 100;
  katex.render(
    String.raw`\dfrac{${fmt(cv.t, 1)}-0}{100}=\dfrac{${fmt(readOn(SCALES[1], cv.t), 1)}-32}{180}
      =\dfrac{${fmt(cv.t + T0K, 2)}-273.15}{100}=\dfrac{${fmt(readOn(SCALES[3], cv.t), 1)}-0}{80}
      =\mathbf{${fmt(f, 3)}}`,
    el('l2CvWork'), KO
  );
}

const cvSketch = (p: p5) => {
  const holder = el('l2CvCanvas');
  const canvasH = () => Math.max(440, Math.min(580, Math.round(holder.clientWidth * 0.44)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  const yTop = () => 84;
  const yBot = () => p.height - 46;
  const Y = (tC: number) => yBot() - ((tC - CV_MIN) / (CV_MAX - CV_MIN)) * (yBot() - yTop());

  p.mouseDragged = () => {
    if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;
    const t = CV_MIN + ((yBot() - p.mouseY) / (yBot() - yTop())) * (CV_MAX - CV_MIN);
    cv.t = Math.round(Math.max(CV_MIN, Math.min(CV_MAX, t)) * 2) / 2;
    slider('l2CvT').value = String(cv.t);
    cvReadouts();
    return false;
  };

  p.draw = () => {
    p.background(C.paper);
    p.textFont('DM Sans');

    const pad = 26;
    const colW = (p.width - pad * 2) / SCALES.length;
    const tubeW = Math.min(52, colW * 0.34);
    const yl = Y(cv.t);

    SCALES.forEach((S, i) => {
      const cx = pad + colW * i + colW / 2;

      /* the tube */
      p.noStroke();
      p.fill(255);
      p.rect(cx - tubeW / 2, yTop(), tubeW, yBot() - yTop(), tubeW / 2);

      /* fill between the ice point and the current level */
      const y0 = Y(0);
      const above = cv.t >= 0;
      const c1 = p.color(S.col);
      c1.setAlpha(80);
      p.fill(above ? c1 : p.color(41, 89, 144, 55));
      p.rect(cx - tubeW / 2 + 3, Math.min(y0, yl), tubeW - 6, Math.abs(yl - y0), 6);

      /* ticks in this scale's own degrees */
      const vLo = readOn(S, CV_MIN), vHi = readOn(S, CV_MAX);
      const first = Math.ceil(vLo / S.step) * S.step;
      for (let v = first; v <= vHi; v += S.step) {
        const y = Y(toC(S, v));
        const major = Math.abs(v / (S.step * 5) - Math.round(v / (S.step * 5))) < 1e-6;
        p.stroke(41, 89, 144, major ? 150 : 70);
        p.strokeWeight(major ? 2 : 1.1);
        p.line(cx - tubeW / 2 - (major ? 9 : 4), y, cx - tubeW / 2 - 1, y);
        if (major) {
          p.noStroke();
          p.fill(C.dark);
          p.textSize(11.5);
          p.textAlign(p.RIGHT, p.CENTER);
          p.text(`${fmt(v, 0)}`, cx - tubeW / 2 - 12, y);
        }
      }

      /* fixed points */
      const fp = (tC: number, txt: string, col: string) => {
        const y = Y(tC);
        p.stroke(col);
        p.strokeWeight(2);
        dashed(p, true, [4, 4]);
        p.line(cx - tubeW / 2 - 2, y, cx + tubeW / 2 + 26, y);
        dashed(p, false);
        p.noStroke();
        p.fill(col);
        p.textSize(11.5);
        p.textAlign(p.LEFT, p.CENTER);
        p.text(txt, cx + tubeW / 2 + 30, y);
      };
      fp(0, `${fmt(S.ice, S.ice % 1 ? 2 : 0)} ice`, C.dark);
      fp(100, `${fmt(S.steam, S.steam % 1 ? 2 : 0)} steam`, C.red);

      p.noFill();
      p.stroke(41, 89, 144, 110);
      p.strokeWeight(2.2);
      p.rect(cx - tubeW / 2, yTop(), tubeW, yBot() - yTop(), tubeW / 2);

      /* name */
      p.noStroke();
      p.fill(S.col);
      p.textSize(17);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.text(S.name, cx, yTop() - 18);

    });

    /* the bar that ties them together, drawn under the value chips */
    p.stroke(C.navy);
    p.strokeWeight(2.4);
    dashed(p, true, [9, 6]);
    p.line(12, yl, p.width - 12, yl);
    dashed(p, false);

    SCALES.forEach((S, i) => {
      const cx = pad + colW * i + colW / 2;
      const v = i === 2 ? cv.t + T0K : readOn(S, cv.t);
      chip(p, `${fmt(v, S.dp)} ${S.unit}`, cx, yl - 34, 'center', 16, S.col);
    });

    /* the fraction, stated where the fill ends */
    const f = cv.t / 100;
    p.noStroke();
    p.fill(C.navy);
    p.textSize(15.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`fraction of the way from ice point to steam point:  ${fmt(f, 3)}`, 14, 14);

    if (Math.abs(cv.t + 40) < 0.6) {
      chip(p, '−40 °C = −40 °F   the one place the two scales agree',
        p.width / 2, yl + 12, 'center', 15, C.green);
    }
    p.fill(C.grey);
    p.textSize(12.5);
    p.textAlign(p.RIGHT, p.BOTTOM);
    p.text('drag anywhere on the canvas', p.width - 14, p.height - 12);
  };
};

let cvInst: p5 | null = null;

function cvWire() {
  const s = slider('l2CvT');
  s.addEventListener('input', () => { cv.t = +s.value; cvReadouts(); });
  const jump = (v: number) => { cv.t = v; s.value = String(v); cvReadouts(); };
  el('l2CvIce').addEventListener('click', () => jump(0));
  el('l2CvSteam').addEventListener('click', () => jump(100));
  el('l2CvM40').addEventListener('click', () => jump(-40));
  el('l2CvBody').addEventListener('click', () => jump(37));
  cvReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   5 · WHEN TWO SCALES AGREE
   Every version of the question is the Fahrenheit line meeting a second
   straight line. Only the second line changes.
   ══════════════════════════════════════════════════════════════════════ */

interface Rel {
  label: string; m: number; c: number;
  say: string; rel: string; xLo: number; xHi: number; col: string;
}
const RELS: Record<string, Rel> = {
  eq: { label: 'T_F = T_C', m: 1, c: 0, say: 'the two scales read the SAME number', rel: String.raw`T_F=T_C`, xLo: -90, xHi: 60, col: C.green },
  twice: { label: 'T_F = 2 T_C', m: 2, c: 0, say: 'Fahrenheit reads TWICE Celsius', rel: String.raw`T_F=2T_C`, xLo: -40, xHi: 220, col: C.violet },
  half: { label: 'T_F = ½ T_C', m: 0.5, c: 0, say: 'Fahrenheit reads HALF Celsius', rel: String.raw`T_F=\tfrac12 T_C`, xLo: -80, xHi: 60, col: C.amber },
  neg: { label: 'T_F = − T_C', m: -1, c: 0, say: 'the two readings are equal and opposite', rel: String.raw`T_F=-T_C`, xLo: -70, xHi: 60, col: C.red },
  kelvin: { label: 'T_F = T_K', m: 1, c: T0K, say: 'Fahrenheit and Kelvin read the same number', rel: String.raw`T_F=T_K`, xLo: -40, xHi: 420, col: C.dark },
};

const same = { key: 'eq', a: 0 };
const sameX = (R: Rel) => (R.c - 32) / (1.8 - R.m);

function sameWork() {
  const R = RELS[same.key];
  const x = sameX(R);
  katex.render(
    String.raw`\text{1. both scales in terms of }T_C:\quad T_F=\tfrac95 T_C+32
      ${same.key === 'kelvin' ? String.raw`\quad\text{and}\quad T_K=T_C+273.15`
      : String.raw`\quad(\text{Celsius is already }T_C)`}`,
    el('l2SmW1'), KO
  );
  const coef = R.m === 1 ? '' : R.m === -1 ? '-' : fmt(R.m, 2).replace(/0+$/, '').replace(/\.$/, '');
  katex.render(
    String.raw`\text{2. impose }${R.rel}:\quad \tfrac95 T_C+32=${coef}\,T_C
      ${R.c ? `+${fmt(R.c, 2)}` : ''}`,
    el('l2SmW2'), KO
  );
  katex.render(
    String.raw`\text{3. solve: }\;${fmt(1.8 - R.m, 2)}\,T_C=${fmt(R.c - 32, 2)}
      \;\Rightarrow\; T_C=\mathbf{${fmt(x, 2)}}\,^\circ\mathrm{C},\quad
      T_F=\mathbf{${fmt(1.8 * x + 32, 2)}}\,^\circ\mathrm{F}`,
    el('l2SmW3'), KO
  );
  el('l2SmW3').scrollLeft = 0;
}

const sameSketch = (p: p5) => {
  const holder = el('l2SameCanvas');
  const canvasH = () => Math.max(400, Math.min(520, Math.round(holder.clientWidth * 0.42)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    same.a = Math.min(1, same.a + dt(p) * 1.1);
    const R = RELS[same.key];

    const gx = 66, gy = 34, gw = p.width - 104, gh = p.height - 92;
    const xa = R.xLo, xb = R.xHi;
    const fVals = [1.8 * xa + 32, 1.8 * xb + 32, R.m * xa + R.c, R.m * xb + R.c];
    const ya = Math.min(...fVals) - 20, yb = Math.max(...fVals) + 20;
    const X = (v: number) => gx + ((v - xa) / (xb - xa)) * gw;
    const Y = (v: number) => gy + gh - ((v - ya) / (yb - ya)) * gh;

    /* grid */
    p.stroke(41, 89, 144, 24);
    p.strokeWeight(1);
    const gstep = (xb - xa) > 300 ? 100 : (xb - xa) > 150 ? 50 : 25;
    for (let v = Math.ceil(xa / gstep) * gstep; v <= xb; v += gstep) p.line(X(v), gy, X(v), gy + gh);

    /* axes through the origin where it is on screen */
    p.stroke(C.navy);
    p.strokeWeight(2.2);
    p.line(gx, Y(Math.max(ya, Math.min(yb, 0))), gx + gw, Y(Math.max(ya, Math.min(yb, 0))));
    p.line(X(Math.max(xa, Math.min(xb, 0))), gy, X(Math.max(xa, Math.min(xb, 0))), gy + gh);

    p.noStroke();
    p.fill(C.dark);
    p.textFont('DM Sans');
    p.textSize(12);
    p.textAlign(p.CENTER, p.TOP);
    for (let v = Math.ceil(xa / gstep) * gstep; v <= xb; v += gstep) {
      p.text(`${v}`, X(v), Y(Math.max(ya, Math.min(yb, 0))) + 6);
    }
    p.text('T_C  (°C)', gx + gw / 2, gy + gh + 28);
    p.textAlign(p.RIGHT, p.CENTER);
    const ystep = (yb - ya) > 400 ? 100 : (yb - ya) > 200 ? 50 : 25;
    for (let v = Math.ceil(ya / ystep) * ystep; v <= yb; v += ystep) p.text(`${v}`, gx - 7, Y(v));
    p.push();
    p.translate(26, gy + gh / 2);
    p.rotate(-Math.PI / 2);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('reading on the other scale', 0, 0);
    p.pop();

    /* the Fahrenheit line - always there */
    p.stroke(C.accent);
    p.strokeWeight(4);
    p.line(X(xa), Y(1.8 * xa + 32), X(xb), Y(1.8 * xb + 32));
    chip(p, 'T_F = (9/5)T_C + 32', X(xa) + 14, Y(1.8 * xa + 32) - 34, 'left', 14, C.accent);

    /* the line the question asks for - drawn in as it appears */
    const xe = xa + (xb - xa) * same.a;
    p.stroke(R.col);
    p.strokeWeight(4);
    p.line(X(xa), Y(R.m * xa + R.c), X(xe), Y(R.m * xe + R.c));
    if (same.a >= 1) {
      chip(p, R.label, X(xb) - 10, Y(R.m * xb + R.c) + 8, 'right', 14, R.col);
    }

    /* the crossing */
    const x0 = sameX(R), y0 = 1.8 * x0 + 32;
    if (same.a >= 1) {
      const puls = 1 + 0.18 * Math.sin(p.frameCount * 0.11);
      p.stroke(C.navy);
      p.strokeWeight(1.6);
      dashed(p, true, [5, 4]);
      p.line(X(x0), Y(y0), X(x0), Y(Math.max(ya, Math.min(yb, 0))));
      p.line(X(x0), Y(y0), gx, Y(y0));
      dashed(p, false);
      p.noStroke();
      p.fill(15, 38, 71, 45);
      p.circle(X(x0), Y(y0), 34 * puls);
      p.fill(C.navy);
      p.circle(X(x0), Y(y0), 15);
      chip(p, `T_C = ${fmt(x0, 2)} °C\nT_F = ${fmt(y0, 2)} °F`,
        X(x0) + 16, Y(y0) - 52, 'left', 15, C.navy);
    }

    p.noStroke();
    p.fill(C.navy);
    p.textSize(15.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`Find the temperature at which ${R.say}.`, gx, 8);
  };
};

let sameInst: p5 | null = null;

function sameWire() {
  wireSegmented('l2SameRel', (k) => { same.key = k; same.a = 0; sameWork(); });
  sameWork();
}

/* ══════════════════════════════════════════════════════════════════════
   6 · A DIFFERENCE IS NOT A TEMPERATURE
   One physical interval bracketed on three scales at once. The bracket
   is the same height on all three - only the division count differs.
   ══════════════════════════════════════════════════════════════════════ */

const DL_MIN = -60, DL_MAX = 210;
const del = { t1: 30, t2: 90, bad: false, badA: 0 };

function delReadouts() {
  const d = del.t2 - del.t1;
  el('l2DdC').textContent = `${fmt(d, 0)} °C`;
  el('l2DdK').textContent = `${fmt(d, 0)} K`;
  el('l2DdF').textContent = `${fmt(d * 9 / 5, 1)} °F`;
  el('l2DdBad').textContent = `${fmt(d + T0K, 2)} K ✗`;
}

const DSCALES: Array<{ name: string; unit: string; per: number; step: number; col: string }> = [
  { name: 'Celsius', unit: '°C', per: 1, step: 10, col: '#00A0E3' },
  { name: 'Kelvin', unit: 'K', per: 1, step: 10, col: '#7c3aed' },
  { name: 'Fahrenheit', unit: '°F', per: 9 / 5, step: 10, col: '#e11d48' },
];

const delSketch = (p: p5) => {
  const holder = el('l2DCanvas');
  const canvasH = () => Math.max(440, Math.min(580, Math.round(holder.clientWidth * 0.44)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    del.badA = ease(del.badA, del.bad ? 1 : 0, 5, dt(p));
    p.textFont('DM Sans');

    const yTop = 116, yBot = p.height - 46;
    const Y = (tC: number) => yBot - ((tC - DL_MIN) / (DL_MAX - DL_MIN)) * (yBot - yTop);

    const lo = Math.min(del.t1, del.t2), hi = Math.max(del.t1, del.t2);
    const dC = hi - lo;

    const pad = 30;
    const colW = (p.width - pad * 2) / DSCALES.length;
    const tubeW = Math.min(46, colW * 0.24);

    DSCALES.forEach((S, i) => {
      const cx = pad + colW * i + colW * 0.42;

      p.noStroke();
      p.fill(255);
      p.rect(cx - tubeW / 2, yTop, tubeW, yBot - yTop, tubeW / 2);

      /* ticks in this scale's own degrees - Fahrenheit ones sit closer */
      const stepC = S.step / S.per;                 // one tick step, in °C of height
      for (let t = Math.ceil(DL_MIN / stepC) * stepC; t <= DL_MAX; t += stepC) {
        const y = Y(t);
        p.stroke(41, 89, 144, 130);
        p.strokeWeight(1.5);
        p.line(cx - tubeW / 2 - 11, y, cx - tubeW / 2 - 1, y);
      }

      /* the interval, bracketed */
      const y1 = Y(lo), y2 = Y(hi);
      p.noStroke();
      p.fill(22, 163, 74, 55);
      p.rect(cx - tubeW / 2 + 3, y2, tubeW - 6, y1 - y2, 5);
      p.stroke(C.green);
      p.strokeWeight(2.6);
      const bx = cx + tubeW / 2 + 16;
      p.line(bx, y1, bx, y2);
      p.line(bx - 8, y1, bx + 8, y1);
      p.line(bx - 8, y2, bx + 8, y2);
      arrow(p, bx, y1, bx, y2, 8);
      arrow(p, bx, y2, bx, y1, 8);
      chip(p, `Δ = ${fmt(dC * S.per, S.per === 1 ? 0 : 1)} ${S.unit}`, bx + 12, (y1 + y2) / 2 - 11,
        'left', 16, C.green);

      p.noFill();
      p.stroke(41, 89, 144, 110);
      p.strokeWeight(2.2);
      p.rect(cx - tubeW / 2, yTop, tubeW, yBot - yTop, tubeW / 2);

      p.noStroke();
      p.fill(S.col);
      p.textSize(16);
      p.textAlign(p.LEFT, p.BOTTOM);
      p.text(S.name, cx - tubeW / 2, yTop - 30);
      p.fill(C.grey);
      p.textSize(12.5);
      p.textAlign(p.LEFT, p.BOTTOM);
      p.text(`one tick = ${S.step} ${S.unit}`, cx - tubeW / 2, yTop - 12);

      /* the two levels, labelled in this scale's numbers */
      const lab = (tC: number, y: number) => {
        const v = i === 1 ? tC + T0K : i === 2 ? tC * 9 / 5 + 32 : tC;
        p.stroke(41, 89, 144, 90);
        p.strokeWeight(1.4);
        dashed(p, true, [4, 4]);
        p.line(cx - tubeW / 2 - 34, y, cx - tubeW / 2 - 6, y);
        dashed(p, false);
        p.noStroke();
        p.fill(C.dark);
        p.textSize(12.5);
        p.textAlign(p.RIGHT, p.CENTER);
        p.text(fmt(v, i === 1 ? 2 : 0), cx - tubeW / 2 - 38, y);
      };
      lab(lo, y1);
      lab(hi, y2);

      /* the wrong method, only on the Kelvin column */
      if (i === 1 && del.badA > 0.02) {
        const yBad = Y(lo + (dC + T0K));
        const yClip = Math.max(yTop - 30, yBad);
        p.stroke(225, 29, 72, 255 * del.badA);
        p.strokeWeight(3);
        dashed(p, true, [7, 5]);
        p.line(bx + 132, y1, bx + 132, yClip);
        dashed(p, false);
        arrow(p, bx + 132, y1, bx + 132, yClip, 10);
        chip(p, `adding 273 gives ${fmt(dC + T0K, 2)} K\n✗ off the top of the scale`,
          bx + 142, yTop - 4, 'left', 14, C.red);
      }
    });

    /* caption + the arithmetic */
    p.noStroke();
    p.fill(C.navy);
    p.textSize(16);
    p.textAlign(p.LEFT, p.TOP);
    p.text('Same physical change, three scales. The Celsius and Kelvin brackets are identical.', 16, 14);
    p.fill(C.dark);
    p.textSize(14.5);
    p.text(`ΔT_C = ${fmt(hi, 0)} − ${fmt(lo, 0)} = ${fmt(dC, 0)} °C      `
      + `ΔT_K = ${fmt(hi + T0K, 2)} − ${fmt(lo + T0K, 2)} = ${fmt(dC, 0)} K      `
      + `ΔT_F = (9/5)(${fmt(dC, 0)}) = ${fmt(dC * 9 / 5, 1)} °F`, 16, 40);
  };
};

let delInst: p5 | null = null;

function delWire() {
  const s1 = slider('l2D1'), s2 = slider('l2D2');
  s1.addEventListener('input', () => { del.t1 = +s1.value; el('l2D1Val').textContent = `${del.t1} °C`; delReadouts(); });
  s2.addEventListener('input', () => { del.t2 = +s2.value; el('l2D2Val').textContent = `${del.t2} °C`; delReadouts(); });
  const b = el('l2DBad') as HTMLButtonElement;
  b.addEventListener('click', () => {
    del.bad = !del.bad;
    b.classList.toggle('on', del.bad);
    b.textContent = del.bad ? '⚠ Hide the wrong method' : '⚠ Show the wrong method';
  });
  delReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   7a · WHICH WAY DOES IT FLOW?
   Two blocks with independent mass and temperature. Energy bars beside
   them; make the cold one huge and watch heat still go the other way.
   ══════════════════════════════════════════════════════════════════════ */

const hb = {
  mA: 10, tA0: 90, mB: 60, tB0: 20,
  tA: 90, tB: 20,
  contact: false,
  gap: 1,                                     // 1 apart · 0 touching
  packets: [] as Array<{ x: number; y: number; v: number }>,
};

const hbU = (m: number, t: number) => m * (t + T0K) / 10;   // arbitrary energy units
const hbEq = () => (hb.mA * hb.tA0 + hb.mB * hb.tB0) / (hb.mA + hb.mB);

function hbReadouts() {
  el('l2HUA').textContent = `${fmt(hbU(hb.mA, hb.tA), 0)} units`;
  el('l2HUB').textContent = `${fmt(hbU(hb.mB, hb.tB), 0)} units`;
  const d = el('l2HDir');
  if (Math.abs(hb.tA0 - hb.tB0) < 0.5) { d.textContent = 'nowhere - equal temperature'; d.style.color = C.grey; }
  else if (hb.tA0 > hb.tB0) { d.textContent = 'A → B'; d.style.color = C.red; }
  else { d.textContent = 'B → A'; d.style.color = C.red; }
  el('l2HEq').textContent = `${fmt(hbEq(), 1)} °C`;
}

const hbSketch = (p: p5) => {
  const holder = el('l2HCanvas');
  const canvasH = () => Math.max(400, Math.min(520, Math.round(holder.clientWidth * 0.4)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    p.textFont('DM Sans');

    const eq = hbEq();
    if (hb.contact) {
      hb.gap = ease(hb.gap, 0, 4, d);
      if (hb.gap < 0.25) {
        hb.tA = ease(hb.tA, eq, 0.5, d);
        hb.tB = ease(hb.tB, eq, 0.5, d);
      }
    } else {
      hb.gap = ease(hb.gap, 1, 4, d);
      hb.tA = ease(hb.tA, hb.tA0, 6, d);
      hb.tB = ease(hb.tB, hb.tB0, 6, d);
    }
    hbReadouts();

    const cy = p.height * 0.5;
    const sA = 60 + Math.sqrt(hb.mA) * 16, sB = 60 + Math.sqrt(hb.mB) * 16;
    const gapPx = 12 + hb.gap * 110;
    const totalW = sA + sB + gapPx;
    const leftX = p.width * 0.42 - totalW / 2;
    const ax = leftX + sA / 2, bxc = leftX + sA + gapPx + sB / 2;

    const block = (cx: number, s: number, t: number, name: string, m: number) => {
      const [r, g, b] = heatRGB(t);
      p.noStroke();
      p.fill(r, g, b, 210);
      p.rect(cx - s / 2, cy - s / 2, s, s, 14);
      p.stroke(C.navy);
      p.strokeWeight(3);
      p.noFill();
      p.rect(cx - s / 2, cy - s / 2, s, s, 14);
      p.noStroke();
      p.fill(255);
      p.textSize(Math.min(28, s * 0.3));
      p.textAlign(p.CENTER, p.CENTER);
      p.text(name, cx, cy - s * 0.12);
      p.textSize(Math.min(17, s * 0.17));
      p.text(`${fmt(t, 1)} °C`, cx, cy + s * 0.18);
      p.fill(C.dark);
      p.textSize(13.5);
      p.textAlign(p.CENTER, p.TOP);
      p.text(`mass ${fmt(m / 10, 1)} kg`, cx, cy + s / 2 + 10);
    };
    block(ax, sA, hb.tA, 'A', hb.mA);
    block(bxc, sB, hb.tB, 'B', hb.mB);

    /* energy packets in flight - the "heat" itself */
    const hot = hb.tA > hb.tB;
    const dTn = Math.abs(hb.tA - hb.tB);
    if (hb.contact && hb.gap < 0.25 && dTn > 0.6) {
      if (p.frameCount % Math.max(3, Math.round(26 - dTn * 0.16)) === 0) {
        hb.packets.push({ x: hot ? ax : bxc, y: cy + p.random(-sA * 0.3, sA * 0.3), v: hot ? 1 : -1 });
      }
    }
    hb.packets = hb.packets.filter((q) => {
      q.x += q.v * 150 * d;
      const done = q.v > 0 ? q.x > bxc : q.x < ax;
      p.noStroke();
      p.fill(245, 158, 11, 210);
      p.circle(q.x, q.y, 11);
      p.fill(255, 255, 255, 170);
      p.circle(q.x - q.v * 3, q.y - 2, 4);
      return !done;
    });

    if (hb.contact && hb.gap < 0.25) {
      if (dTn > 0.6) {
        chip(p, `HEAT in transit  ${hot ? 'A → B' : 'B → A'}`,
          (ax + bxc) / 2, cy - Math.max(sA, sB) / 2 - 34, 'center', 15, C.amber);
      } else {
        chip(p, 'thermal equilibrium - the flow stops\nneither body "contains heat" any more',
          (ax + bxc) / 2, cy - Math.max(sA, sB) / 2 - 46, 'center', 15, C.green);
      }
    }

    /* ── internal energy bars ── */
    const px = p.width - 176, pw = 150;
    const uA = hbU(hb.mA, hb.tA), uB = hbU(hb.mB, hb.tB);
    const uMax = Math.max(hbU(80, 200), 1);
    p.noStroke();
    p.fill(255);
    p.rect(px - 12, 40, pw + 22, p.height - 92, 14);
    p.fill(C.dark);
    p.textSize(12.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text('INTERNAL ENERGY', px, 54);
    p.text('(what the body HAS)', px, 70);
    const bTop = 96, bBot = p.height - 76;
    [[uA, 'A', C.red], [uB, 'B', C.dark]].forEach((row, i) => {
      const [u, nm, col] = row as [number, string, string];
      const bx2 = px + 14 + i * 68;
      const h2 = ((bBot - bTop) * u) / uMax;
      p.noStroke();
      p.fill(41, 89, 144, 26);
      p.rect(bx2, bTop, 42, bBot - bTop, 7);
      p.fill(col);
      p.rect(bx2, bBot - h2, 42, h2, 7);
      p.fill(C.navy);
      p.textSize(14);
      p.textAlign(p.CENTER, p.TOP);
      p.text(nm, bx2 + 21, bBot + 6);
    });

    if (hb.tA0 > hb.tB0 && hbU(hb.mB, hb.tB) > hbU(hb.mA, hb.tA)) {
      chip(p, 'B holds MORE energy than A - and heat still runs A → B.\nDirection is set by temperature, not by energy.',
        14, p.height - 62, 'left', 14.5, C.violet);
    }

    p.noStroke();
    p.fill(C.navy);
    p.textSize(15.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text('A body possesses temperature and internal energy. It never possesses heat.', 14, 12);
  };
};

let hbInst: p5 | null = null;

function hbWire() {
  const bind = (id: string, valId: string, set: (v: number) => void, fmtv: (v: number) => string) => {
    const s = slider(id);
    s.addEventListener('input', () => {
      set(+s.value);
      el(valId).textContent = fmtv(+s.value);
      hb.contact = false;
      hb.packets = [];
      hbReadouts();
    });
    el(valId).textContent = fmtv(+s.value);
  };
  bind('l2HmA', 'l2HmAVal', (v) => { hb.mA = v; }, (v) => `${fmt(v / 10, 1)} kg`);
  bind('l2HtA', 'l2HtAVal', (v) => { hb.tA0 = v; }, (v) => `${v} °C`);
  bind('l2HmB', 'l2HmBVal', (v) => { hb.mB = v; }, (v) => `${fmt(v / 10, 1)} kg`);
  bind('l2HtB', 'l2HtBVal', (v) => { hb.tB0 = v; }, (v) => `${v} °C`);
  el('l2HGo').addEventListener('click', () => { hb.contact = true; });
  el('l2HRst').addEventListener('click', () => {
    hb.contact = false;
    hb.packets = [];
    hb.tA = hb.tA0; hb.tB = hb.tB0;
  });
  hbReadouts();
}

/* ══════════════════════════════════════════════════════════════════════
   7b · RAIN AND WETNESS
   Pure loop, no controls. A cloud holds water, not rain. A body holds
   internal energy, not heat.
   ══════════════════════════════════════════════════════════════════════ */

const rainDrops: Array<{ x: number; y: number; v: number; len: number }> = [];
const splashes: Array<{ x: number; y: number; a: number }> = [];
const rain = { wet: 0.12 };

const rainSketch = (p: p5) => {
  const holder = el('l2RainCanvas');
  const canvasH = () => Math.max(400, Math.min(500, Math.round(holder.clientWidth * 0.36)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const d = dt(p);
    p.textFont('DM Sans');

    const cx = p.width * 0.34, cyc = p.height * 0.23;
    const groundY = p.height - 92;
    const cloudW = Math.min(p.width * 0.34, 300);

    /* ── the cloud ── */
    p.noStroke();
    const puffs: Array<[number, number, number]> = [
      [-0.34, 0.10, 0.46], [-0.13, -0.16, 0.60], [0.11, -0.09, 0.54],
      [0.33, 0.10, 0.44], [0.00, 0.16, 0.50], [-0.22, 0.17, 0.42], [0.22, 0.17, 0.42],
    ];
    p.fill(180, 196, 214, 210);
    puffs.forEach(([fx, fy, fs]) => p.circle(cx + fx * cloudW, cyc + fy * cloudW * 0.5 + 6, fs * cloudW));
    p.fill(238, 244, 250);
    puffs.forEach(([fx, fy, fs]) => p.circle(cx + fx * cloudW, cyc + fy * cloudW * 0.5, fs * cloudW));

    /* the water it is holding - the thing the cloud actually HAS */
    p.fill(0, 160, 227, 225);
    for (let i = 0; i < 26; i++) {
      const a = i * 2.399;
      const rr = Math.sqrt((i + 0.5) / 26);
      const drift = 5 * Math.sin(p.frameCount * 0.02 + i);
      p.circle(cx + Math.cos(a) * rr * cloudW * 0.40 + drift,
        cyc + Math.sin(a) * rr * cloudW * 0.15, 8);
    }
    chip(p, 'CLOUD holds WATER\n= the body holds\nINTERNAL ENERGY',
      cx - cloudW * 0.5 - 14, cyc - 26, 'right', 15, C.dark);

    /* ── the rain ── */
    for (let k = 0; k < 3; k++) {
      rainDrops.push({
        x: cx + p.random(-cloudW * 0.42, cloudW * 0.42),
        y: cyc + cloudW * 0.2,
        v: p.random(320, 520),
        len: p.random(11, 20),
      });
    }
    for (let i = rainDrops.length - 1; i >= 0; i--) {
      const q = rainDrops[i];
      q.y += q.v * d;
      if (q.y > groundY) {
        if (splashes.length < 14) splashes.push({ x: q.x, y: groundY, a: 1 });
        rain.wet = Math.min(0.94, rain.wet + 0.0016);
        rainDrops.splice(i, 1);
        continue;
      }
      p.stroke(0, 160, 227, 225);
      p.strokeWeight(3);
      p.line(q.x, q.y, q.x + 2, q.y + q.len);
    }
    rain.wet = Math.max(0.12, rain.wet - 0.26 * d);

    p.noStroke();
    chip(p, 'RAIN only exists while it FALLS\n= HEAT, energy in transit',
      cx + cloudW * 0.56, p.height * 0.46, 'left', 15, C.accent);

    /* ── the ground, and how wet it is ── */
    p.noStroke();
    const wetMix = rain.wet;
    p.fill(166 - 76 * wetMix, 124 - 62 * wetMix, 78 - 42 * wetMix);
    p.rect(0, groundY, p.width, p.height - groundY);
    p.fill(96 - 34 * wetMix, 68 - 24 * wetMix, 40 - 14 * wetMix);
    p.rect(0, groundY, p.width, 14);

    for (let i = splashes.length - 1; i >= 0; i--) {
      const sp = splashes[i];
      sp.a -= d * 2.2;
      if (sp.a <= 0) { splashes.splice(i, 1); continue; }
      p.noFill();
      p.stroke(255, 255, 255, 200 * sp.a);
      p.strokeWeight(2);
      p.ellipse(sp.x, sp.y + 7, (1 - sp.a) * 22, (1 - sp.a) * 7);
    }

    /* the wetness meter - a state of the ground, exactly like temperature */
    const mw = Math.min(260, p.width * 0.3), mx = p.width - mw - 26, my = groundY + 34;
    p.noStroke();
    p.fill(255, 255, 255, 220);
    p.rect(mx - 12, my - 24, mw + 24, 54, 12);
    p.fill(C.navy);
    p.textSize(13);
    p.textAlign(p.LEFT, p.BOTTOM);
    p.text('WETNESS = TEMPERATURE, a state', mx, my - 6);
    p.fill(41, 89, 144, 40);
    p.rect(mx, my, mw, 16, 8);
    p.fill(C.accent);
    p.rect(mx, my, mw * wetMix, 16, 8);

    chip(p, 'the ground gets WET.  It never "contains rain".',
      16, groundY + 30, 'left', 15, C.navy);

    /* ── the wording that has to survive into thermodynamics ── */
    const bw = Math.min(320, p.width * 0.34), bx = p.width - bw - 16;
    p.noStroke();
    p.fill(255);
    p.rect(bx, 20, bw, 128, 14);
    p.fill(C.red);
    p.textSize(15.5);
    p.textAlign(p.LEFT, p.TOP);
    p.text('✗  "the cloud contains rain"', bx + 16, 36);
    p.text('✗  "this body contains heat"', bx + 16, 60);
    p.fill(C.green);
    p.text('✓  "the cloud contains water"', bx + 16, 94);
    p.text('✓  "this body is at a high temperature"', bx + 16, 118);
  };
};

let rainInst: p5 | null = null;

/* ══════════════════════════════════════════════════════════════════════
   registry + boot
   ══════════════════════════════════════════════════════════════════════ */

function mount(inst: p5 | null, sk: (p: p5) => void, holderId: string): p5 {
  if (inst) { inst.windowResized?.(); return inst; }
  return new p5(sk, el(holderId));
}

let gasPane = 'l2GA', kelPane = 'l2KA', heatPane = 'l2HA';

function gasMount() {
  if (gasPane === 'l2GA') gwInst = mount(gwInst, gwSketch, 'l2GwCanvas');
  else rigInst = mount(rigInst, rigSketch, 'l2GasCanvas');
}
function kelMount() {
  if (kelPane === 'l2KA') kelInst = mount(kelInst, kelSketch, 'l2KCanvas');
  else tpInst = mount(tpInst, tpSketch, 'l2TpCanvas');
}
function heatMount() {
  if (heatPane === 'l2HA') hbInst = mount(hbInst, hbSketch, 'l2HCanvas');
  else rainInst = mount(rainInst, rainSketch, 'l2RainCanvas');
}

(window as any).SCREEN_INIT = {
  gas: gasMount,
  zero: () => { zeroInst = mount(zeroInst, zeroSketch, 'l2ZeroCanvas'); },
  kelvin: kelMount,
  convert: () => { cvInst = mount(cvInst, cvSketch, 'l2CvCanvas'); },
  same: () => { sameInst = mount(sameInst, sameSketch, 'l2SameCanvas'); },
  delta: () => { delInst = mount(delInst, delSketch, 'l2DCanvas'); },
  heat: heatMount,
};

gwWire();
rigWire();
zeroWire();
kelWire();
tpWire();
cvWire();
sameWire();
delWire();
hbWire();
wireTabs('l2GTabs', (id) => { gasPane = id; gasMount(); });
wireTabs('l2KTabs', (id) => { kelPane = id; kelMount(); });
wireTabs('l2HTabs', (id) => { heatPane = id; heatMount(); });
