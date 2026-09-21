/* ═══════════ Heat Transfer Studio · Conduction, Convection, Radiation ═══════════
   One screen (#modes) on window.SCREEN_INIT with three panes, one p5
   sketch each:

     conduction - a rod heated at one end with pins stuck on by wax. The
                  rod is a real 1D heat-flow model (diffusion + loss to
                  air), so the pins fall in order and stop where the
                  steady profile drops below the wax's melting point.
                  "Race" puts Cu, Al and Fe side by side and the melted
                  lengths come out in the ratio K ∝ l² (Ingen-Hausz).
     convection - water heated from below in a beaker: two convection
                  cells, warm (red) parcels rising, cool (blue) sinking,
                  a KMnO₄ crystal whose purple dye traces the loop, and
                  the bubbles of boiling - collapsing first, then reaching
                  the top, with the temperature stuck at 100 °C.
     radiation  - a heater between a dull black can and a shiny can
                  inside a bell jar. Infrared packets fly in straight
                  lines; black absorbs, shiny reflects. Pump out the air
                  and it still works; hold up a screen and it stops at
                  once; switch off and the black can glows back fastest.

   Every p5 instance is built lazily: hidden panes are display:none, so a
   canvas created early would have zero width. Each draw() returns early
   while its canvas is hidden, so a pane you leave stays frozen.        */

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

function dt(p: p5) { return Math.min(p.deltaTime || 16.7, 120) / 1000; }

function dashed(p: p5, on: boolean, pattern: number[] = [6, 6]) {
  (p.drawingContext as CanvasRenderingContext2D).setLineDash(on ? pattern : []);
}

function ease(cur: number, target: number, rate: number, d: number) {
  return cur + (target - cur) * (1 - Math.exp(-rate * d));
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const mix = (a: RGB, b: RGB, f: number): RGB =>
  [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * f) as RGB;

function el(id: string) { return document.getElementById(id)!; }
function setText(id: string, s: string) {
  const e = el(id);
  if (e.textContent !== s) e.textContent = s;
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

/* a hot-object colour ramp: metal/base colour → red-orange → yellow */
function heatRGB(base: RGB, h: number): RGB {
  h = clamp(h, 0, 1);
  if (h < 0.5) return mix(base, [232, 78, 36], h / 0.5);
  return mix([232, 78, 36], [255, 196, 64], (h - 0.5) / 0.5);
}

/* a Bunsen flame whose tip sits at (x, tipY). Drawn on the raw 2D context:
   p5 2.x changed bezierVertex to one control point per call. */
function flame(p: p5, x: number, tipY: number, size: number, on: number) {
  if (on <= 0.02) return;
  const t = p.millis() / 1000;
  const flick = 1 + 0.08 * Math.sin(t * 23) + 0.05 * Math.sin(t * 37 + 1);
  const ctx = p.drawingContext as CanvasRenderingContext2D;
  const cone = (w: number, hgt: number, base: number, fill: string) => {
    const top = base - hgt;
    ctx.beginPath();
    ctx.moveTo(x - w, base);
    ctx.bezierCurveTo(x - w * 1.15, base - hgt * 0.5, x - 3, top + hgt * 0.1, x, top);
    ctx.bezierCurveTo(x + 3, top + hgt * 0.1, x + w * 1.15, base - hgt * 0.5, x + w, base);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const hgt = size * on * flick;
  const base = tipY + hgt;
  cone(size * 0.26, hgt, base, `rgba(96,165,250,${0.47 * on})`);
  cone(size * 0.13, hgt * 0.5, base, `rgba(37,99,235,${0.78 * on})`);
}

/* the Bunsen burner body: nozzle top at (x, topY), base on the bench at benchY */
function burner(p: p5, x: number, topY: number, benchY: number) {
  p.noStroke();
  p.fill(90, 104, 124);
  p.rect(x - 9, topY, 18, benchY - topY - 10, 3);
  p.fill(60, 72, 90);
  p.rect(x - 34, benchY - 12, 68, 12, 4);
  p.fill(120, 134, 152);
  p.rect(x - 12, topY, 24, 7, 2);
  p.fill(60, 72, 90);
  p.rect(x + 9, benchY - 34, 22, 7, 3);    // gas inlet
}

/* ══════════════════════════════════════════════════════════════════════
   1 · CONDUCTION - the rod, the wax and the pins
   ρc ∂T/∂t = K ∂²T/∂x² − H (T − T_air), hot end held by the flame, far
   end insulated. Units are scaled so copper has K = 1, ρc = 1; the other
   metals keep their real ratios to copper. With the same H for every rod
   the steady profile falls off over √(K/H), so the melted length l
   obeys K ∝ l² - the whole Ingen-Hausz result falls out of the model.
   ══════════════════════════════════════════════════════════════════════ */

type MatKey = 'Cu' | 'Al' | 'Fe' | 'Glass';
const MATS: Record<MatKey, { name: string; K: number; rc: number; rgb: RGB; line: string; kReal: number }> = {
  Cu: { name: 'Copper', K: 1, rc: 1, rgb: [196, 116, 62], line: '#c2410c', kReal: 400 },
  Al: { name: 'Aluminium', K: 0.59, rc: 0.70, rgb: [178, 186, 196], line: '#64748b', kReal: 235 },
  Fe: { name: 'Iron', K: 0.2, rc: 1.01, rgb: [104, 110, 122], line: '#0f2647', kReal: 80 },
  Glass: { name: 'Glass', K: 0.0025, rc: 0.58, rgb: [196, 222, 232], line: '#0891b2', kReal: 1 },
};
const NODES = 61;             // nodes on the rod you see
const MODEL_NODES = 85;       // the model runs 40 % past the drawn end, so the
                              // insulated tip never piles heat back into view
const LOSS = 8.6;             // H - same for every rod (same size, same air)
const T_AIR = 30, T_FLAME = 300, T_WAX = 60;
const PIN_X = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
const SIM_PER_SEC = 1 / 100;  // model time per real second at 1×
const LAB_SEC = 600;          // lab seconds per model unit - the clock readout
const ROD_CM = 40;

interface Pin {
  x: number; wax: number; state: 'stuck' | 'falling' | 'down';
  y: number; vy: number; ang: number; va: number; side: number;
}
interface Rod { mat: MatKey; T: Float64Array; pins: Pin[] }
interface Drip { rod: number; x: number; y: number; vy: number }

const cond = {
  mode: 'single' as 'single' | 'race',
  mat: 'Cu' as MatKey,
  flame: false,
  lit: false,
  speed: 1,
  t: 0,
  src: T_AIR,
  flameVis: 0,
  rods: [] as Rod[],
  drips: [] as Drip[],
};

function condBuild() {
  const mats: MatKey[] = cond.mode === 'single' ? [cond.mat] : ['Cu', 'Al', 'Fe'];
  cond.rods = mats.map((mat) => ({
    mat,
    T: new Float64Array(MODEL_NODES).fill(T_AIR),
    pins: PIN_X.map((x) => ({ x, wax: 1, state: 'stuck' as const, y: 0, vy: 0, ang: 0, va: 0, side: 1 })),
  }));
  cond.drips = [];
  cond.t = 0;
  cond.src = T_AIR;
  cond.lit = cond.flame;
}

function condStepModel(real: number) {
  const sim = real * SIM_PER_SEC * cond.speed;
  if (cond.lit) cond.t += sim;
  /* the hot end takes a couple of seconds to come up to flame temperature */
  cond.src = ease(cond.src, cond.flame ? T_FLAME : T_AIR, 1 / 0.02, sim);
  const dx = 1 / (NODES - 1);
  for (const rod of cond.rods) {
    const M = MATS[rod.mat];
    const stable = 0.4 * dx * dx * M.rc / M.K;
    const n = Math.min(400, Math.ceil(sim / stable));
    const h = sim / n;
    const T = rod.T;
    const nT = new Float64Array(MODEL_NODES);
    for (let s = 0; s < n; s++) {
      T[0] = cond.src;
      nT[0] = cond.src;
      for (let i = 1; i < MODEL_NODES; i++) {
        const right = i < MODEL_NODES - 1 ? T[i + 1] : T[i - 1];   // insulated far end
        nT[i] = T[i] + (h / M.rc) * (M.K * (T[i - 1] - 2 * T[i] + right) / (dx * dx) - LOSS * (T[i] - T_AIR));
      }
      T.set(nT);
    }
  }
}

/* temperature at fraction x along the rod */
function rodT(rod: Rod, x: number) {
  const f = clamp(x, 0, 1) * (NODES - 1);
  const i = Math.min(NODES - 2, Math.floor(f));
  return rod.T[i] + (rod.T[i + 1] - rod.T[i]) * (f - i);
}

/* how far along the rod the wax can melt right now: where T drops below 60 °C */
function meltLength(rod: Rod) {
  if (rod.T[0] <= T_WAX) return 0;
  for (let i = 1; i < NODES; i++) {
    if (rod.T[i] <= T_WAX) {
      const f = (rod.T[i - 1] - T_WAX) / (rod.T[i - 1] - rod.T[i]);
      return (i - 1 + f) / (NODES - 1);
    }
  }
  return 1;
}

function condReadouts() {
  const clock = `${Math.round(cond.t * LAB_SEC)} s`;
  setText('htCRo1', clock);
  if (cond.mode === 'single') {
    const rod = cond.rods[0];
    const down = rod.pins.filter((q) => q.state !== 'stuck').length;
    setText('htCL2', 'Pins fallen');
    setText('htCRo2', `${down} of ${PIN_X.length}`);
    setText('htCL3', 'Hot end');
    setText('htCRo3', `${Math.round(cond.src)} °C`);
    setText('htCL4', `${MATS[rod.mat].name} · K`);
    setText('htCRo4', `${MATS[rod.mat].kReal} W/m·K`);
  } else {
    const downs = cond.rods.map((r) => r.pins.filter((q) => q.state !== 'stuck').length);
    const ls = cond.rods.map(meltLength);
    setText('htCL2', 'Pins fallen · Cu / Al / Fe');
    setText('htCRo2', downs.join(' / '));
    setText('htCL3', 'Wax melted up to · l');
    setText('htCRo3', ls.map((l) => `${Math.round(l * ROD_CM)}`).join(' / ') + ' cm');
    setText('htCL4', 'l² compared with Cu');
    setText('htCRo4', ls[0] > 0.05
      ? ls.map((l) => (l * l / (ls[0] * ls[0])).toFixed(2)).join(' : ')
      : '-');
  }
  const fl = el('htCFlame');
  const want = cond.flame ? 'Turn the flame off' : '🔥 Light the flame';
  if (fl.textContent !== want) fl.textContent = want;
  fl.classList.toggle('primary', !cond.flame);
}

const condSketch = (p: p5) => {
  const holder = el('htCondCanvas');
  const canvasH = () => Math.max(540, Math.min(660, Math.round(holder.clientWidth * 0.46)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    if (!holder.offsetParent) return;
    const d = dt(p);
    condStepModel(d);
    cond.flameVis = ease(cond.flameVis, cond.flame ? 1 : 0, 6, d);

    p.background(C.paper);
    const W = p.width, H = p.height;
    const single = cond.mode === 'single';
    const x0 = W * (single ? 0.15 : 0.17);
    const x1 = W * 0.86;
    const L = x1 - x0;
    const thick = single ? 18 : 14;

    /* geometry per rod row */
    const rows = cond.rods.map((_, k) => {
      if (single) {
        const rodY = H * 0.3;
        const pinLen = Math.min(110, H * 0.17);
        return { rodY, pinLen, tray: rodY + thick / 2 + pinLen + 30 };
      }
      const top = H * 0.07, rowH = (H * 0.6 - top) / 3;
      const rodY = top + k * rowH + 10;
      const pinLen = Math.min(54, rowH - 58);
      return { rodY, pinLen, tray: rodY + thick / 2 + pinLen + 22 };
    });

    /* ── heat source ── */
    const srcH = (cond.src - T_AIR) / (T_FLAME - T_AIR);
    if (single) {
      const r = rows[0];
      const fx = x0 - 30;
      burner(p, fx, r.rodY + 70, r.tray);
      flame(p, fx, r.rodY - 6, 64, cond.flameVis);
      /* stand and clamp at the cold end */
      p.noStroke();
      p.fill(90, 104, 124);
      p.rect(x1 + 22, r.rodY - 20, 8, r.tray - r.rodY + 20);
      p.rect(x1 - 4, r.rodY - 6, 34, 12, 3);
      p.fill(60, 72, 90);
      p.rect(x1 - 20, r.tray - 10, 76, 10, 3);
    } else {
      const top = rows[0].rodY - 34, bot = rows[2].rodY + 34;
      const bx = x0 - 64;
      const blockCol = heatRGB([150, 90, 60], srcH);
      p.noStroke();
      p.fill(...blockCol);
      p.rect(bx, top, 64, bot - top, 8);
      p.stroke(C.navy);
      p.strokeWeight(2);
      p.noFill();
      p.rect(bx, top, 64, bot - top, 8);
      chip(p, 'hot\nblock', bx + 32, top + 8, 'center', 13);
      const benchY = H * 0.62;
      burner(p, bx + 32, bot + 60, benchY);
      flame(p, bx + 32, bot + 2, 56, cond.flameVis);
    }

    /* ── rods, wax, pins ── */
    cond.rods.forEach((rod, k) => {
      const M = MATS[rod.mat];
      const g = rows[k];
      const top = g.rodY - thick / 2;

      /* shelf that catches the pins */
      if (!single) {
        p.stroke(150, 164, 182);
        p.strokeWeight(3);
        p.line(x0, g.tray, x1, g.tray);
      } else {
        p.stroke(120, 134, 152);
        p.strokeWeight(4);
        p.line(W * 0.05, g.tray, W * 0.96, g.tray);
      }

      /* the stub that sits in the flame / block */
      p.noStroke();
      if (single) {
        p.fill(...heatRGB(M.rgb, srcH));
        p.rect(x0 - 56, top, 56, thick, 4, 0, 0, 4);
      }
      /* the rod itself, coloured node by node */
      const seg = L / (NODES - 1);
      for (let i = 0; i < NODES - 1; i++) {
        const tm = (rod.T[i] + rod.T[i + 1]) / 2;
        p.fill(...heatRGB(M.rgb, (tm - T_AIR) / (T_FLAME - T_AIR)));
        p.rect(x0 + i * seg - 0.5, top, seg + 1, thick);
      }
      /* a highlight so it reads as a round rod */
      p.fill(255, 255, 255, 60);
      p.rect(single ? x0 - 56 : x0, top + 3, single ? L + 56 : L, thick * 0.22);
      p.stroke(C.navy);
      p.strokeWeight(1.6);
      p.noFill();
      p.rect(single ? x0 - 56 : x0, top, single ? L + 56 : L, thick, 4);
      if (!single) chip(p, M.name, x1 + 12, g.rodY - 10, 'left', 15, M.line);

      /* wax + pins */
      for (const pin of rod.pins) {
        const px = x0 + pin.x * L;
        const Tpin = rodT(rod, pin.x);
        if (pin.state === 'stuck' && Tpin > T_WAX) {
          const was = pin.wax;
          pin.wax -= d * cond.speed * 1.4;
          if (Math.floor(was * 3) !== Math.floor(pin.wax * 3)) {
            cond.drips.push({ rod: k, x: px + (Math.random() - 0.5) * 6, y: g.rodY + thick / 2 + 6, vy: 0 });
          }
          if (pin.wax <= 0.3) {
            pin.state = 'falling';
            pin.vy = 0;
            pin.va = (Math.random() - 0.5) * 3;
            pin.side = Math.random() < 0.5 ? -1 : 1;
          }
        }
        const hangTop = g.rodY + thick / 2 + 4;
        /* wax blob */
        const wax = pin.state === 'stuck' ? pin.wax : Math.max(0, pin.wax - 0.3);
        if (wax > 0.02) {
          const melting = Tpin > T_WAX;
          p.noStroke();
          p.fill(melting ? p.color(255, 236, 170) : p.color(250, 240, 214));
          p.ellipse(px, hangTop, 20 * (0.45 + wax * 0.55), 14 * (0.45 + wax * 0.55));
          p.stroke(180, 160, 110);
          p.strokeWeight(1);
          p.noFill();
          p.ellipse(px, hangTop, 20 * (0.45 + wax * 0.55), 14 * (0.45 + wax * 0.55));
        }
        /* pin motion */
        let cx = px, cy = hangTop + g.pinLen / 2, ang = 0;
        if (pin.state === 'falling') {
          pin.vy += 1500 * d;
          pin.y += pin.vy * d;
          pin.ang += pin.va * d;
          cy = hangTop + g.pinLen / 2 + pin.y;
          ang = pin.ang;
          if (cy + (g.pinLen / 2) * Math.abs(Math.cos(ang)) >= g.tray - 2) {
            pin.state = 'down';
          }
        }
        if (pin.state === 'down') {
          pin.ang = ease(pin.ang, pin.side * Math.PI / 2, 9, d);
          ang = pin.ang;
          const halfV = (g.pinLen / 2) * Math.abs(Math.cos(ang));
          cy = g.tray - 3 - halfV;
          cx = px + pin.side * (g.pinLen / 2) * Math.abs(Math.sin(ang)) * 0.5;
        }
        p.push();
        p.translate(cx, cy);
        p.rotate(ang);
        p.stroke(70, 80, 96);
        p.strokeWeight(2.4);
        p.line(0, -g.pinLen / 2, 0, g.pinLen / 2);
        p.noStroke();
        p.fill(70, 80, 96);
        p.circle(0, -g.pinLen / 2, 7);
        p.pop();
      }
    });

    /* wax drips */
    cond.drips = cond.drips.filter((dr) => {
      dr.vy += 1200 * d;
      dr.y += dr.vy * d;
      if (dr.y > rows[dr.rod].tray - 2) return false;
      p.noStroke();
      p.fill(250, 232, 170);
      p.ellipse(dr.x, dr.y, 5, 7);
      return true;
    });

    /* ── zoom strip (single rod): atoms pass the jiggle on ── */
    if (single) {
      const rod = cond.rods[0];
      const zy = H * 0.1, zh = H * 0.1;
      p.noStroke();
      p.fill(255);
      p.rect(x0, zy - zh / 2, L, zh, 10);
      p.stroke(41, 89, 144, 70);
      p.strokeWeight(1.2);
      dashed(p, true, [4, 4]);
      p.line(x0, zy + zh / 2, x0, rows[0].rodY - thick / 2);
      p.line(x1, zy + zh / 2, x1, rows[0].rodY - thick / 2);
      dashed(p, false);
      const n = 30;
      const tt = p.millis() / 1000;
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < n; i++) {
          const fx = (i + 0.5) / n;
          const h = (rodT(rod, fx) - T_AIR) / (T_FLAME - T_AIR);
          const amp = 0.6 + 7 * Math.sqrt(clamp(h, 0, 1));
          const ax = x0 + fx * L + amp * (p.noise(i * 3.1, row * 7, tt * 4) - 0.5) * 2;
          const ay = zy + (row - 0.5) * zh * 0.44 + amp * (p.noise(i * 3.1 + 50, row * 7, tt * 4) - 0.5) * 2;
          p.noStroke();
          p.fill(...heatRGB(MATS[rod.mat].rgb, h));
          p.circle(ax, ay, Math.min(15, L / n * 0.62));
        }
      }
      chip(p, 'Zoomed in: hot atoms jiggle harder and knock their neighbours. The jiggle travels along - the atoms stay where they are.',
        x0, zy - zh / 2 - 30, 'left', 14);
    }

    /* ── T vs x graph, lined up under the rod ── */
    const gy0 = H * (single ? 0.66 : 0.7), gy1 = H * 0.93;
    const yT = (T: number) => gy1 - ((T - T_AIR) / (T_FLAME - T_AIR)) * (gy1 - gy0);
    p.noStroke();
    p.fill(255);
    p.rect(x0 - 10, gy0 - 14, L + 20, gy1 - gy0 + 28, 10);
    p.stroke(41, 89, 144, 120);
    p.strokeWeight(1.4);
    p.line(x0, gy1, x1, gy1);
    p.line(x0, gy0, x0, gy1);
    p.noStroke();
    p.fill(C.dark);
    p.textFont('DM Sans');
    p.textSize(13);
    p.textAlign(p.RIGHT, p.CENTER);
    for (const T of [30, 100, 200, 300]) p.text(`${T} °C`, x0 - 14, yT(T));
    p.textAlign(p.CENTER, p.TOP);
    p.text('distance along the rod →', (x0 + x1) / 2, gy1 + 6);
    /* pin positions */
    p.stroke(41, 89, 144, 60);
    p.strokeWeight(1);
    for (const x of PIN_X) p.line(x0 + x * L, gy1 - 5, x0 + x * L, gy1);
    /* melting line */
    p.stroke(C.amber);
    p.strokeWeight(2);
    dashed(p, true, [7, 5]);
    p.line(x0, yT(T_WAX), x1, yT(T_WAX));
    dashed(p, false);
    chip(p, 'wax melts · 60 °C', x1 - 4, yT(T_WAX) - 30, 'right', 13, '#b45309');
    /* the profiles */
    cond.rods.forEach((rod) => {
      p.stroke(single ? C.red : MATS[rod.mat].line);
      p.strokeWeight(3);
      p.noFill();
      p.beginShape();
      for (let i = 0; i < NODES; i++) p.vertex(x0 + (i / (NODES - 1)) * L, yT(rod.T[i]));
      p.endShape();
    });
    chip(p, single ? 'Temperature along the rod' : 'Temperature along each rod', x0 + 6, gy0 - 6, 'left', 13, C.dark);

    if (!cond.lit) chip(p, 'Light the flame to start', W / 2, H * 0.5, 'center', 17, C.dark);

    condReadouts();
  };
};

function condWire() {
  wireSegmented('htCMode', 'mode', (v) => {
    cond.mode = v as 'single' | 'race';
    el('htCMat').style.display = cond.mode === 'single' ? '' : 'none';
    condBuild();
  });
  wireSegmented('htCMat', 'mat', (v) => { cond.mat = v as MatKey; condBuild(); });
  el('htCFlame').addEventListener('click', () => {
    cond.flame = !cond.flame;
    if (cond.flame) cond.lit = true;
  });
  el('htCSpeed').addEventListener('click', (e) => {
    cond.speed = cond.speed === 1 ? 3 : 1;
    (e.currentTarget as HTMLElement).classList.toggle('on', cond.speed === 3);
  });
  el('htCReset').addEventListener('click', () => { cond.flame = false; condBuild(); });
  condBuild();
}

/* ══════════════════════════════════════════════════════════════════════
   2 · CONVECTION - boiling water in a beaker
   The flow is two counter-rotating cells from one stream function
     ψ = sin(2πu) sin(πv)      (u across, v up, both 0..1)
   so water rises over the flame, spreads out along the top, sinks down
   the sides and comes back in along the bottom. Its strength grows with
   the heating. Temperature climbs to 100 °C and then stays there.
   ══════════════════════════════════════════════════════════════════════ */

interface Parcel { u: number; v: number; T: number; trail: Array<[number, number]> }   // T = excess over the bulk
interface Dye { u: number; v: number; age: number; trail: Array<[number, number]> }
interface Bubble { u: number; v: number; r: number; kind: 'air' | 'vap'; cling: number }
interface Puff { x: number; y: number; r: number; a: number; vx: number }
interface Splash { x: number; y: number; r: number; a: number }

const T_ROOM = 25;
const conv = {
  flame: false,
  lit: false,
  speed: 1,
  T: T_ROOM,
  t: 0,
  str: 0,
  flameVis: 0,
  parcels: [] as Parcel[],
  dye: [] as Dye[],
  crystal: null as null | { u: number; v: number; left: number },
  bubbles: [] as Bubble[],
  puffs: [] as Puff[],
  splashes: [] as Splash[],
  hist: [] as Array<[number, number]>,
  histClock: 0,
};

function convBuild() {
  conv.T = T_ROOM;
  conv.t = 0;
  conv.str = 0;
  conv.lit = conv.flame;
  conv.parcels = Array.from({ length: 120 }, () => ({
    u: 0.03 + Math.random() * 0.94, v: 0.03 + Math.random() * 0.92, T: 0, trail: [],
  }));
  conv.dye = [];
  conv.crystal = null;
  conv.bubbles = [];
  conv.puffs = [];
  conv.splashes = [];
  conv.hist = [[0, T_ROOM]];
  conv.histClock = 0;
}

const FLOW_B = 0.0716;   // 2πB ≈ 0.45 of the depth per second, straight up the middle
function flowAt(u: number, v: number): [number, number] {
  const s = conv.str;
  return [
    s * FLOW_B * Math.PI * Math.sin(2 * Math.PI * u) * Math.cos(Math.PI * v),
    -s * 2 * FLOW_B * Math.PI * Math.cos(2 * Math.PI * u) * Math.sin(Math.PI * v),
  ];
}

const boiling = () => conv.flame && conv.T >= 99.95;

function convPhase(): string {
  if (!conv.flame) {
    if (!conv.lit) return 'Cold water. Nothing moves.';
    return conv.T > 32 ? 'Flame off - currents die out, water cools' : 'Back to room temperature';
  }
  if (conv.T < 40) return 'Water over the flame warms up, expands and rises';
  if (conv.T < 88) return 'Convection currents: hot rises, cool sinks';
  if (conv.T < 99.95) return 'Steam bubbles form, then collapse higher up';
  return 'Boiling! Stuck at 100 °C - the heat is making steam';
}

function convStep(real: number) {
  const d = real * conv.speed;
  if (conv.lit) conv.t += d;
  /* the water's temperature: heats while the flame is on, then plateaus */
  if (conv.flame) {
    conv.T = Math.min(100, conv.T + (2.2 - 0.004 * (conv.T - T_ROOM)) * d);
  } else {
    conv.T -= 0.02 * (conv.T - T_ROOM) * d;
  }
  const strTarget = conv.flame ? 0.3 + 0.7 * clamp((conv.T - T_ROOM) / 45, 0, 1) : 0;
  conv.str = ease(conv.str, strTarget, conv.flame ? 0.8 : 0.35, d);

  conv.histClock += d;
  if (conv.lit && conv.histClock > 0.25) {
    conv.histClock = 0;
    conv.hist.push([conv.t, conv.T]);
  }

  const jitter = (a: number) => (Math.random() - 0.5) * a * Math.sqrt(d);

  /* water parcels: warm over the flame, cool at the top and the walls */
  for (const q of conv.parcels) {
    const [du, dv] = flowAt(q.u, q.v);
    q.u = clamp(q.u + du * d + jitter(0.03), 0.015, 0.985);
    q.v = clamp(q.v + dv * d + jitter(0.03), 0.015, 0.985);
    /* q.T is how much warmer this parcel is than the water on average */
    const overFlame = conv.flame && q.v < 0.16 && Math.abs(q.u - 0.5) < 0.2;
    let dT = -0.45 * q.T;
    if (overFlame) dT += 22;
    if (conv.str > 0.05 && q.v > 0.84) dT -= 9 * conv.str;
    if (conv.str > 0.05 && (q.u < 0.12 || q.u > 0.88)) dT -= 6 * conv.str;
    q.T = clamp(q.T + dT * d, -6, 6);
    q.trail.push([q.u, q.v]);
    if (q.trail.length > 7) q.trail.shift();
  }

  /* the permanganate crystal: sinks, then bleeds purple for a while */
  const cr = conv.crystal;
  if (cr) {
    if (cr.v > 0.025) {
      cr.v = Math.max(0.025, cr.v - 0.55 * d);
    } else if (cr.left > 0) {
      const n = Math.random() < 34 * d % 1 ? Math.ceil(34 * d) : Math.floor(34 * d);
      for (let i = 0; i < n && conv.dye.length < 420; i++) {
        conv.dye.push({ u: cr.u + (Math.random() - 0.5) * 0.02, v: 0.03 + Math.random() * 0.02, age: 0, trail: [] });
      }
      cr.left -= d;
    }
  }
  conv.dye = conv.dye.filter((q) => {
    const [du, dv] = flowAt(q.u, q.v);
    q.u = clamp(q.u + du * d + jitter(0.045), 0.012, 0.988);
    q.v = clamp(q.v + dv * d + jitter(0.045) + (conv.str < 0.05 ? 0.004 * d : 0), 0.012, 0.988);
    q.age += d;
    q.trail.push([q.u, q.v]);
    if (q.trail.length > 16) q.trail.shift();
    return q.age < 60;
  });

  /* bubbles */
  const hot = conv.flame;
  if (hot && conv.T > 45 && conv.T < 96 && Math.random() < 3 * d) {
    conv.bubbles.push({ u: 0.05 + Math.random() * 0.9, v: 0.012, r: 1.6 + Math.random() * 1.4, kind: 'air', cling: 0.8 + Math.random() * 2.5 });
  }
  if (hot && conv.T > 86) {
    const rate = conv.T < 99.95 ? (conv.T - 86) * 1.3 : 42;
    let n = rate * d;
    while (n > 0) {
      if (Math.random() < Math.min(1, n)) {
        conv.bubbles.push({ u: 0.5 + (Math.random() - 0.5) * 0.4, v: 0.015, r: 2.5, kind: 'vap', cling: 0.15 + Math.random() * 0.4 });
      }
      n -= 1;
    }
  }
}

const convSketch = (p: p5) => {
  const holder = el('htConvCanvas');
  const canvasH = () => Math.max(540, Math.min(660, Math.round(holder.clientWidth * 0.46)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    if (!holder.offsetParent) return;
    const d = dt(p);
    convStep(d);
    conv.flameVis = ease(conv.flameVis, conv.flame ? 1 : 0, 6, d);

    p.background(C.paper);
    const W = p.width, H = p.height;
    const narrow = W < 760;
    const bw = Math.min(narrow ? W * 0.7 : W * 0.34, 460);
    const bcx = narrow ? W / 2 : W * 0.28;
    const bench = H * 0.94;
    const gauze = H * 0.7;
    const bx = bcx - bw / 2;
    const beakerTop = H * 0.16;
    const wTop = H * 0.24;           // water surface
    const wBot = gauze - 8;          // inside bottom of the beaker
    const wh = wBot - wTop;
    const X = (u: number) => bx + u * bw;
    const Y = (v: number) => wBot - v * wh;

    /* ── tripod, gauze, burner, flame ── */
    p.stroke(90, 104, 124);
    p.strokeWeight(5);
    p.line(bcx - bw * 0.46, gauze + 4, bcx - bw * 0.56, bench);
    p.line(bcx + bw * 0.46, gauze + 4, bcx + bw * 0.56, bench);
    p.noStroke();
    p.fill(120, 134, 152);
    p.rect(bcx - bw * 0.56, gauze, bw * 1.12, 8, 3);
    p.stroke(160, 170, 184);
    p.strokeWeight(1);
    for (let gx = bcx - bw * 0.52; gx < bcx + bw * 0.52; gx += 9) p.line(gx, gauze, gx + 4, gauze + 8);
    burner(p, bcx, gauze + 90, bench);
    flame(p, bcx, gauze + 10, 84, conv.flameVis);
    /* bench */
    p.stroke(120, 134, 152);
    p.strokeWeight(4);
    p.line(W * 0.03, bench, W * 0.97, bench);

    /* ── the water, tinted by its temperature ── */
    const warm = clamp((conv.T - T_ROOM) / 75, 0, 1);
    const water = mix([196, 226, 246], [222, 214, 232], warm);
    p.noStroke();
    p.fill(...water);
    const boil = boiling();
    const tt = p.millis() / 1000;
    p.beginShape();
    p.vertex(bx, wBot);
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      const wave = boil ? 3 * Math.sin(u * 22 + tt * 9) * Math.sin(u * Math.PI) : conv.str * 1.2 * Math.sin(u * 9 + tt * 2);
      p.vertex(X(u), wTop + wave);
    }
    p.vertex(bx + bw, wBot);
    p.endShape(p.CLOSE);

    /* dye trails first, so the rest draws on top */
    p.noFill();
    for (const q of conv.dye) {
      const a = 110 * clamp(1 - (q.age - 40) / 20, 0, 1);
      p.stroke(126, 34, 206, a);
      p.strokeWeight(3.2);
      p.beginShape();
      for (const [u, v] of q.trail) p.vertex(X(u), Y(v));
      p.endShape();
    }
    /* the crystal */
    const cr = conv.crystal;
    if (cr && cr.left > 0) {
      p.noStroke();
      p.fill(88, 28, 135);
      const s = 5 + 5 * clamp(cr.left / 12, 0, 1);
      p.push();
      p.translate(X(cr.u), Y(cr.v) - s / 2);
      p.rotate(0.5);
      p.rect(-s / 2, -s / 2, s, s, 1.5);
      p.pop();
    }

    /* water parcels: red = warmer than average, blue = cooler */
    for (const q of conv.parcels) {
      const rel = clamp(q.T / 4, -1, 1);
      const col: RGB = rel >= 0 ? mix([120, 140, 170], [225, 29, 72], rel) : mix([120, 140, 170], [37, 99, 235], -rel);
      p.noFill();
      p.stroke(col[0], col[1], col[2], 80);
      p.strokeWeight(2);
      p.beginShape();
      for (const [u, v] of q.trail) p.vertex(X(u), Y(v));
      p.endShape();
      p.noStroke();
      p.fill(col[0], col[1], col[2], 200);
      p.circle(X(q.u), Y(q.v), 5.5);
    }

    /* bubbles */
    const sd = d * conv.speed;
    conv.bubbles = conv.bubbles.filter((b) => {
      if (b.cling > 0) {
        b.cling -= sd;
        if (b.kind === 'vap') b.r += 6 * sd;
      } else {
        const [du] = flowAt(b.u, b.v);
        b.u = clamp(b.u + du * sd * 0.6, 0.02, 0.98);
        const rise = b.kind === 'air' ? 30 : 55 + 11 * b.r;
        b.v += (rise * sd) / wh;
        if (b.kind === 'vap') {
          if (conv.T >= 99.95) b.r = Math.min(13, b.r + 4.5 * sd);
          else if (b.v > 0.12) b.r -= (7 + (100 - conv.T) * 1.4) * sd;   // hits cooler water and collapses
        }
      }
      if (b.r < 0.8) return false;
      if (b.v >= 1 - b.r / wh) {
        if (b.kind === 'vap') {
          conv.splashes.push({ x: X(b.u), y: wTop, r: b.r, a: 1 });
          if (Math.random() < 0.35) conv.puffs.push({ x: X(b.u), y: wTop - 6, r: 5 + b.r * 0.6, a: 0.32, vx: (Math.random() - 0.5) * 24 });
        }
        return false;
      }
      p.stroke(255, 255, 255, 230);
      p.strokeWeight(1.4);
      p.fill(255, 255, 255, 90);
      p.circle(X(b.u), Y(b.v) - b.r, b.r * 2);
      return true;
    });
    conv.splashes = conv.splashes.filter((s) => {
      s.r += 30 * d;
      s.a -= 2.4 * d;
      p.noFill();
      p.stroke(255, 255, 255, 220 * Math.max(0, s.a));
      p.strokeWeight(1.6);
      p.ellipse(s.x, s.y, s.r * 2.4, s.r * 0.7);
      return s.a > 0;
    });

    /* glass */
    p.noFill();
    p.stroke(41, 89, 144, 190);
    p.strokeWeight(3);
    p.line(bx, beakerTop, bx, wBot + 4);
    p.line(bx + bw, beakerTop, bx + bw, wBot + 4);
    p.line(bx, wBot + 4, bx + bw, wBot + 4);
    p.line(bx - 8, beakerTop - 4, bx, beakerTop);
    p.stroke(255, 255, 255, 150);
    p.strokeWeight(5);
    p.line(bx + 10, beakerTop + 16, bx + 10, wBot - 20);

    /* steam: puffs from bursting bubbles, plus a haze once hot */
    if (conv.T > 70 && Math.random() < (conv.T - 70) * 0.12 * d * (conv.flame ? 1 : 0.4)) {
      conv.puffs.push({ x: X(0.15 + Math.random() * 0.7), y: wTop - 4, r: 8, a: 0.12 + 0.12 * warm, vx: (Math.random() - 0.5) * 10 });
    }
    conv.puffs = conv.puffs.filter((f) => {
      f.y -= 46 * d;
      f.x += f.vx * d;
      f.r += 12 * d;
      f.a -= 0.2 * d;
      if (f.a <= 0 || f.y < 0) return false;
      p.noStroke();
      p.fill(255, 255, 255, 255 * f.a);
      p.circle(f.x, f.y, f.r * 2);
      return true;
    });

    /* thermometer, clamped, dipping in near the right wall */
    const thx = bx + bw * 0.86;
    const thTop = H * 0.05, thBulb = wBot - 30;
    p.noStroke();
    p.fill(255, 255, 255, 230);
    p.rect(thx - 6, thTop, 12, thBulb - thTop, 6);
    p.stroke(41, 89, 144, 150);
    p.strokeWeight(1.4);
    p.noFill();
    p.rect(thx - 6, thTop, 12, thBulb - thTop, 6);
    const tLev = (T: number) => thBulb - 8 - (T / 110) * (thBulb - 8 - (thTop + 14));
    p.noStroke();
    p.fill(C.red);
    p.circle(thx, thBulb, 16);
    p.rect(thx - 2.5, tLev(conv.T), 5, thBulb - tLev(conv.T));
    p.stroke(41, 89, 144, 140);
    p.strokeWeight(1);
    for (const T of [0, 50, 100]) p.line(thx + 6, tLev(T), thx + 13, tLev(T));
    p.noStroke();
    p.fill(C.dark);
    p.textFont('DM Sans');
    p.textSize(11.5);
    p.textAlign(p.LEFT, p.CENTER);
    for (const T of [0, 50, 100]) p.text(`${T}`, thx + 15, tLev(T));
    chip(p, `${conv.T.toFixed(1)} °C`, thx + 20, thTop - 2, 'left', 16, C.red);

    /* labels on the beaker */
    if (conv.str > 0.25) {
      chip(p, '↑ hot water rises\n   up the middle', X(0.56), Y(0.62), 'left', 13, '#be123c');
      chip(p, '↓ cool water\n   sinks at the sides', X(0.13), Y(0.45), 'left', 13, '#1d4ed8');
    }
    if (!conv.lit) chip(p, 'Light the flame to start', bcx, Y(0.5), 'center', 17, C.dark);

    /* ── heating curve on the right ── */
    if (!narrow) {
      const gx0 = W * 0.6, gx1 = W * 0.96, gy0 = H * 0.14, gy1 = H * 0.64;
      const tMax = Math.max(60, conv.t * 1.1);
      const gx = (t: number) => gx0 + (t / tMax) * (gx1 - gx0);
      const gy = (T: number) => gy1 - ((T - 20) / 90) * (gy1 - gy0);
      p.noStroke();
      p.fill(255);
      p.rect(gx0 - 58, gy0 - 44, gx1 - gx0 + 76, gy1 - gy0 + 84, 12);
      chip(p, 'Temperature of the water vs time', gx0 - 44, gy0 - 34, 'left', 14, C.dark);
      p.stroke(41, 89, 144, 120);
      p.strokeWeight(1.4);
      p.line(gx0, gy1, gx1, gy1);
      p.line(gx0, gy0, gx0, gy1);
      p.stroke(C.amber);
      p.strokeWeight(1.6);
      dashed(p, true, [6, 5]);
      p.line(gx0, gy(100), gx1, gy(100));
      dashed(p, false);
      p.noStroke();
      p.fill(C.dark);
      p.textSize(12.5);
      p.textAlign(p.RIGHT, p.CENTER);
      for (const T of [25, 50, 75, 100]) p.text(`${T} °C`, gx0 - 8, gy(T));
      p.textAlign(p.CENTER, p.TOP);
      p.text('time →', (gx0 + gx1) / 2, gy1 + 8);
      p.stroke(C.red);
      p.strokeWeight(3);
      p.noFill();
      p.beginShape();
      for (const [t, T] of conv.hist) p.vertex(gx(t), gy(T));
      p.vertex(gx(conv.t), gy(conv.T));
      p.endShape();
      if (boil) chip(p, 'flat: the flame is still on, but\nthe heat goes into making steam', gx1 - 4, gy(100) + 14, 'right', 13, '#b45309');
    }

    /* readouts */
    setText('htVRoT', `${conv.T.toFixed(1)} °C`);
    setText('htVRoPh', convPhase());
    setText('htVRoStr', conv.str < 0.05 ? 'none' : conv.str < 0.45 ? 'gentle' : conv.str < 0.85 ? 'strong' : 'vigorous');
    const fl = el('htVFlame');
    const want = conv.flame ? 'Turn the flame off' : '🔥 Light the flame';
    if (fl.textContent !== want) fl.textContent = want;
    fl.classList.toggle('primary', !conv.flame);
  };
};

function convWire() {
  el('htVFlame').addEventListener('click', () => {
    conv.flame = !conv.flame;
    if (conv.flame) conv.lit = true;
  });
  el('htVDye').addEventListener('click', () => {
    conv.dye = [];
    conv.crystal = { u: 0.24, v: 0.98, left: 12 };
  });
  el('htVSpeed').addEventListener('click', (e) => {
    conv.speed = conv.speed === 1 ? 3 : 1;
    (e.currentTarget as HTMLElement).classList.toggle('on', conv.speed === 3);
  });
  el('htVReset').addEventListener('click', () => { conv.flame = false; convBuild(); });
  convBuild();
}

/* ══════════════════════════════════════════════════════════════════════
   3 · RADIATION - black can, shiny can, a heater and a bell jar
   Each can:  dT/dt = G·a·glow·(not screened) − (ε·r + c_air)(T − T_room)
   with a = ε (a good absorber is a good emitter): black 0.95, shiny 0.10.
   c_air is the bit carried off by the air - it goes to zero in a vacuum,
   the radiation term does not. The rays are drawn for the eye; the
   temperatures come from the equation, so they never jitter.
   ══════════════════════════════════════════════════════════════════════ */

interface Ray { x: number; y: number; vx: number; vy: number; ph: number; from: 'h' | 'b' | 's' }
interface Mol { x: number; y: number; vx: number; vy: number }

const RAD_G = 3.2, RAD_R = 0.06, RAD_CAIR = 0.02, RAY_SPEED = 520, N_MOL = 70;
const CANS = { b: { eps: 0.95 }, s: { eps: 0.1 } };

const rad = {
  heater: false,
  glow: 0,
  pumping: false,
  screen: false,
  speed: 1,
  Tb: T_ROOM,
  Ts: T_ROOM,
  t: 0,
  lit: false,
  rays: [] as Ray[],
  mols: [] as Mol[],
  hist: [] as Array<[number, number, number]>,
  histClock: 0,
  flashB: 0,
};

function radBuild() {
  rad.Tb = T_ROOM;
  rad.Ts = T_ROOM;
  rad.t = 0;
  rad.lit = rad.heater;
  rad.rays = [];
  rad.hist = [[0, T_ROOM, T_ROOM]];
  rad.histClock = 0;
}

function radStep(real: number) {
  const d = real * rad.speed;
  if (rad.lit) rad.t += d;
  rad.glow = ease(rad.glow, rad.heater ? 1 : 0, 1.4, d);
  const air = rad.mols.length / N_MOL;
  const cAir = RAD_CAIR * air;
  const inB = rad.glow * (rad.screen ? 0 : 1);
  rad.Tb += (RAD_G * CANS.b.eps * inB - (CANS.b.eps * RAD_R + cAir) * (rad.Tb - T_ROOM)) * d;
  rad.Ts += (RAD_G * CANS.s.eps * rad.glow - (CANS.s.eps * RAD_R + cAir) * (rad.Ts - T_ROOM)) * d;
  rad.histClock += d;
  if (rad.lit && rad.histClock > 0.25) {
    rad.histClock = 0;
    rad.hist.push([rad.t, rad.Tb, rad.Ts]);
  }
}

const radSketch = (p: p5) => {
  const holder = el('htRadCanvas');
  const canvasH = () => Math.max(560, Math.min(680, Math.round(holder.clientWidth * 0.47)));
  let lastW = 0, lastH = 0;

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    if (!holder.offsetParent) return;
    const d = dt(p);
    const sd = d * rad.speed;
    radStep(d);

    p.background(C.paper);
    const W = p.width, H = p.height;

    /* geometry */
    const jx0 = W * 0.05, jx1 = W * 0.95, jTop = H * 0.05, jBase = H * 0.66;
    const hx = W * 0.5, hy = H * 0.3, hr = Math.min(40, W * 0.035);
    const canW = Math.min(96, W * 0.08), canH = Math.min(150, H * 0.23);
    const cans = {
      b: { x: W * 0.19 - canW / 2, y: jBase - canH, w: canW, h: canH },
      s: { x: W * 0.81 - canW / 2, y: jBase - canH, w: canW, h: canH },
    };
    const scr = { x: W * 0.34 - 6, y: H * 0.1, w: 12, h: jBase - H * 0.1 };
    const outlet = { x: jx1 - W * 0.06, y: jBase - 4 };

    /* keep the molecules inside the jar (rebuild on resize / first frame) */
    if (W !== lastW || H !== lastH) {
      if (lastW === 0 && rad.mols.length === 0 && !rad.pumping) {
        rad.mols = Array.from({ length: N_MOL }, () => ({
          x: jx0 + 20 + Math.random() * (jx1 - jx0 - 40), y: jTop + 60 + Math.random() * (jBase - jTop - 80),
          vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60,
        }));
      } else {
        const sx = W / lastW, sy = H / lastH;
        rad.mols.forEach((m) => { m.x *= sx; m.y *= sy; });
      }
      lastW = W; lastH = H;
    }

    /* ── bell jar and base plate ── */
    p.noStroke();
    p.fill(255, 255, 255, 150);
    p.rect(jx0, jTop, jx1 - jx0, jBase - jTop, 160, 160, 0, 0);
    p.noFill();
    p.stroke(41, 89, 144, 110);
    p.strokeWeight(3);
    p.rect(jx0, jTop, jx1 - jx0, jBase - jTop, 160, 160, 0, 0);
    p.noStroke();
    p.fill(41, 89, 144, 110);
    p.rect(W / 2 - 22, jTop - 16, 44, 18, 6);
    p.fill(100, 114, 134);
    p.rect(jx0 - 14, jBase, jx1 - jx0 + 28, 14, 4);
    /* pump pipe */
    p.fill(120, 134, 152);
    p.rect(outlet.x - 7, jBase + 14, 14, H * 0.05);
    p.rect(outlet.x - 7, jBase + 14 + H * 0.05 - 14, W - outlet.x, 14);
    chip(p, 'to the vacuum pump →', W * 0.97, jBase + 22 + H * 0.05, 'right', 12.5, C.dark);

    /* ── air molecules ── */
    const inJar = (m: Mol) => {
      if (m.x < jx0 + 8) { m.x = jx0 + 8; m.vx = Math.abs(m.vx); }
      if (m.x > jx1 - 8) { m.x = jx1 - 8; m.vx = -Math.abs(m.vx); }
      if (m.y < jTop + 40) { m.y = jTop + 40; m.vy = Math.abs(m.vy); }
      if (m.y > jBase - 6) { m.y = jBase - 6; m.vy = -Math.abs(m.vy); }
    };
    if (rad.pumping) {
      rad.mols = rad.mols.filter((m) => {
        const ax = outlet.x - m.x, ay = outlet.y - m.y;
        const dist = Math.hypot(ax, ay) || 1;
        m.vx = ease(m.vx, (ax / dist) * 300, 4, sd);
        m.vy = ease(m.vy, (ay / dist) * 300, 4, sd);
        return dist > 28;
      });
    } else if (rad.mols.length < N_MOL && Math.random() < 30 * sd) {
      rad.mols.push({ x: outlet.x, y: outlet.y - 10, vx: -80 - Math.random() * 120, vy: -60 - Math.random() * 100 });
    }
    for (const m of rad.mols) {
      m.vx += (Math.random() - 0.5) * 200 * sd;
      m.vy += (Math.random() - 0.5) * 200 * sd;
      const sp = Math.hypot(m.vx, m.vy);
      const cap = rad.pumping ? 320 : 70;
      if (sp > cap) { m.vx *= cap / sp; m.vy *= cap / sp; }
      m.x += m.vx * sd;
      m.y += m.vy * sd;
      inJar(m);
      p.noStroke();
      p.fill(118, 137, 160, 150);
      p.circle(m.x, m.y, 5);
    }

    /* ── heater on its stand ── */
    p.stroke(90, 104, 124);
    p.strokeWeight(6);
    p.line(hx, hy + hr, hx, jBase);
    p.noStroke();
    p.fill(70, 82, 100);
    p.rect(hx - 34, jBase - 10, 68, 10, 3);
    if (rad.glow > 0.02) {
      for (let k = 4; k >= 1; k--) {
        p.fill(255, 120, 40, 22 * rad.glow);
        p.circle(hx, hy, hr * 2 + k * 22 * rad.glow);
      }
    }
    p.fill(...mix([88, 96, 110], [255, 110, 40], rad.glow));
    p.circle(hx, hy, hr * 2);
    p.noFill();
    p.stroke(...mix([60, 66, 78], [255, 214, 120], rad.glow));
    p.strokeWeight(3);
    for (let k = -2; k <= 2; k++) p.arc(hx + k * hr * 0.3, hy, hr * 0.32, hr * 1.4, p.PI * 0.1, p.PI * 1.9);
    chip(p, rad.heater ? 'heater ON' : 'heater', hx, hy - hr - 36, 'center', 13, rad.heater ? '#c2410c' : C.dark);

    /* ── the cans ── */
    const drawCan = (k: 'b' | 's') => {
      const c = cans[k];
      const T = k === 'b' ? rad.Tb : rad.Ts;
      p.noStroke();
      if (k === 'b') {
        p.fill(30, 34, 42);
        p.rect(c.x, c.y, c.w, c.h, 6);
        p.fill(255, 255, 255, 18);
        p.rect(c.x + 8, c.y + 8, 8, c.h - 16, 4);
      } else {
        const ctx = p.drawingContext as CanvasRenderingContext2D;
        const g = ctx.createLinearGradient(c.x, 0, c.x + c.w, 0);
        g.addColorStop(0, '#9aa6b4');
        g.addColorStop(0.35, '#f8fafc');
        g.addColorStop(0.55, '#cbd5e1');
        g.addColorStop(1, '#8391a2');
        ctx.fillStyle = g;
        p.rect(c.x, c.y, c.w, c.h, 6);
      }
      p.stroke(C.navy);
      p.strokeWeight(1.6);
      p.noFill();
      p.rect(c.x, c.y, c.w, c.h, 6);
      /* the thermometer standing in it */
      const tx = c.x + c.w / 2, tTop = c.y - H * 0.13, tBot = c.y + 26;
      p.noStroke();
      p.fill(255, 255, 255, 235);
      p.rect(tx - 5, tTop, 10, tBot - tTop, 5);
      const lev = (TT: number) => tBot - 6 - ((TT - 20) / 70) * (tBot - 6 - tTop - 8);
      p.fill(C.red);
      p.rect(tx - 2, lev(T), 4, tBot - lev(T));
      p.stroke(41, 89, 144, 140);
      p.strokeWeight(1.2);
      p.noFill();
      p.rect(tx - 5, tTop, 10, tBot - tTop, 5);
      chip(p, `${T.toFixed(1)} °C`, tx, tTop - 30, 'center', 15, C.red);
      chip(p, k === 'b' ? 'dull black can' : 'shiny silver can', tx, jBase + 22, 'center', 14, C.navy);
    };
    drawCan('b');
    drawCan('s');

    /* ── the screen ── */
    if (rad.screen) {
      p.noStroke();
      p.fill(176, 132, 84);
      p.rect(scr.x, scr.y, scr.w, scr.h, 3);
      p.stroke(120, 86, 50);
      p.strokeWeight(1.4);
      p.noFill();
      p.rect(scr.x, scr.y, scr.w, scr.h, 3);
      chip(p, 'screen', scr.x + scr.w / 2, scr.y - 28, 'center', 13, '#92400e');
    }

    /* ── rays ── */
    const emit = (x: number, y: number, ang: number, from: Ray['from']) => {
      rad.rays.push({ x, y, vx: Math.cos(ang) * RAY_SPEED, vy: Math.sin(ang) * RAY_SPEED, ph: Math.random() * 6, from });
    };
    const spawn = (rate: number, fn: () => void) => {
      let n = rate * sd;
      while (n > 0) { if (Math.random() < Math.min(1, n)) fn(); n -= 1; }
    };
    spawn(46 * rad.glow, () => {
      const a = Math.random() * Math.PI * 2;
      emit(hx + Math.cos(a) * (hr + 4), hy + Math.sin(a) * (hr + 4), a, 'h');
    });
    /* hot cans radiate too - a good absorber is a good emitter */
    (['b', 's'] as const).forEach((k) => {
      const c = cans[k];
      const T = k === 'b' ? rad.Tb : rad.Ts;
      spawn(CANS[k].eps * Math.max(0, T - T_ROOM) * 0.9, () => {
        const side = Math.random() < 0.5 ? -1 : 1;
        const a = (side < 0 ? Math.PI : 0) + (Math.random() - 0.5) * 1.6;
        emit(side < 0 ? c.x - 3 : c.x + c.w + 3, c.y + 10 + Math.random() * (c.h - 20), a, k);
      });
    });
    const hit = (r: Ray, b: { x: number; y: number; w: number; h: number }) =>
      r.x > b.x && r.x < b.x + b.w && r.y > b.y && r.y < b.y + b.h;
    rad.rays = rad.rays.filter((r) => {
      const px = r.x, py = r.y;
      r.x += r.vx * sd;
      r.y += r.vy * sd;
      r.ph += sd * 30;
      if (r.x < jx0 || r.x > jx1 || r.y < jTop || r.y > jBase) return false;   // out through the jar
      if (rad.screen && hit(r, scr)) return false;
      if (r.from !== 'b' && hit(r, cans.b)) {
        rad.flashB = 1;
        return false;                                   // black soaks it up
      }
      if (r.from !== 's' && hit(r, cans.s)) {
        if (Math.random() < 0.1) return false;          // the little that is absorbed
        const c = cans.s;
        const wasOutX = px <= c.x || px >= c.x + c.w;
        if (wasOutX) { r.vx = -r.vx; r.x = px; } else { r.vy = -r.vy; r.y = py; }
        r.from = 's';                                   // it can't hit the shiny can again
        return true;
      }
      /* the squiggle */
      const sp = Math.hypot(r.vx, r.vy);
      const ux = r.vx / sp, uy = r.vy / sp;
      const col = r.from === 'h' ? [234, 88, 12] : r.from === 'b' ? [190, 18, 60] : [148, 163, 184];
      p.stroke(col[0], col[1], col[2], 210);
      p.strokeWeight(2);
      p.noFill();
      p.beginShape();
      for (let i = 0; i <= 10; i++) {
        const s = -i * 2.6;
        const off = 3.5 * Math.sin(i * 1.1 + r.ph);
        p.vertex(r.x + ux * s - uy * off, r.y + uy * s + ux * off);
      }
      p.endShape();
      return true;
    });

    /* ── T vs time for both cans ── */
    const gx0 = W * 0.12, gx1 = W * 0.9, gy0 = H * 0.8, gy1 = H * 0.95;
    const tMax = Math.max(60, rad.t * 1.1);
    const gx = (t: number) => gx0 + (t / tMax) * (gx1 - gx0);
    const gy = (T: number) => gy1 - ((T - 20) / 60) * (gy1 - gy0);
    p.noStroke();
    p.fill(255);
    p.rect(gx0 - 64, gy0 - 12, gx1 - gx0 + 80, gy1 - gy0 + 22, 10);
    p.stroke(41, 89, 144, 120);
    p.strokeWeight(1.3);
    p.line(gx0, gy1, gx1, gy1);
    p.line(gx0, gy0, gx0, gy1);
    p.noStroke();
    p.fill(C.dark);
    p.textFont('DM Sans');
    p.textSize(12);
    p.textAlign(p.RIGHT, p.CENTER);
    for (const T of [25, 50, 75]) p.text(`${T} °C`, gx0 - 8, gy(T));
    const line = (idx: 1 | 2, col: string) => {
      p.stroke(col);
      p.strokeWeight(3);
      p.noFill();
      p.beginShape();
      for (const h of rad.hist) p.vertex(gx(h[0]), gy(Math.min(80, h[idx])));
      p.vertex(gx(rad.t), gy(Math.min(80, idx === 1 ? rad.Tb : rad.Ts)));
      p.endShape();
    };
    line(2, '#94a3b8');
    line(1, '#1e293b');
    /* end labels, pushed apart when the two lines meet */
    let yb = gy(Math.min(80, rad.Tb)), ys = gy(Math.min(80, rad.Ts));
    if (Math.abs(yb - ys) < 15) {
      const mid = (yb + ys) / 2, sgn = rad.Tb >= rad.Ts ? -1 : 1;
      yb = mid + sgn * 7.5;
      ys = mid - sgn * 7.5;
    }
    const lx = Math.min(gx1 + 4, gx(rad.t) + 6);
    p.noStroke();
    p.textAlign(p.LEFT, p.CENTER);
    p.textSize(13);
    p.fill('#1e293b');
    p.text('black', lx, yb);
    p.fill('#64748b');
    p.text('shiny', lx, ys);

    if (rad.mols.length === 0) chip(p, 'VACUUM - no air left inside', W / 2, jTop + 44, 'center', 15, C.violet);
    if (!rad.lit) chip(p, 'Switch the heater on to start', W / 2, H * 0.5, 'center', 17, C.dark);

    /* readouts */
    setText('htRRoB', `${rad.Tb.toFixed(1)} °C`);
    setText('htRRoS', `${rad.Ts.toFixed(1)} °C`);
    const air = rad.mols.length / N_MOL;
    setText('htRRoAir', air === 0 ? 'vacuum' : rad.pumping ? `pumping · ${Math.round(air * 100)} % left` : air < 1 ? `refilling · ${Math.round(air * 100)} %` : 'normal air');
    setText('htRRoSrc', rad.heater ? (rad.screen ? 'on · black can screened' : 'on') : (rad.lit ? 'off · cans radiating' : 'off'));
    const hb = el('htRHeat');
    const want = rad.heater ? 'Switch the heater off' : '⚡ Switch the heater on';
    if (hb.textContent !== want) hb.textContent = want;
    hb.classList.toggle('primary', !rad.heater);
  };
};

function radWire() {
  el('htRHeat').addEventListener('click', () => {
    rad.heater = !rad.heater;
    if (rad.heater) rad.lit = true;
  });
  el('htRPump').addEventListener('click', (e) => {
    rad.pumping = !rad.pumping;
    const b = e.currentTarget as HTMLElement;
    b.textContent = rad.pumping ? 'Let the air back in' : 'Pump out the air';
    b.classList.toggle('on', rad.pumping);
  });
  el('htRScreen').addEventListener('click', (e) => {
    rad.screen = !rad.screen;
    const b = e.currentTarget as HTMLElement;
    b.textContent = rad.screen ? 'Take the screen away' : 'Hold a screen in front of the black can';
    b.classList.toggle('on', rad.screen);
  });
  el('htRSpeed').addEventListener('click', (e) => {
    rad.speed = rad.speed === 1 ? 3 : 1;
    (e.currentTarget as HTMLElement).classList.toggle('on', rad.speed === 3);
  });
  el('htRReset').addEventListener('click', () => { rad.heater = false; radBuild(); });
  radBuild();
}

/* ══════════════════════════════════════════════════════════════════════
   wiring
   ══════════════════════════════════════════════════════════════════════ */

let condInst: p5 | null = null, convInst: p5 | null = null, radInst: p5 | null = null;

function mount(inst: p5 | null, sk: (p: p5) => void, holderId: string): p5 {
  if (inst) { inst.windowResized?.(); return inst; }
  return new p5(sk, el(holderId));
}

let pane = 'htCond';
function modesMount() {
  if (pane === 'htCond') condInst = mount(condInst, condSketch, 'htCondCanvas');
  else if (pane === 'htConv') convInst = mount(convInst, convSketch, 'htConvCanvas');
  else radInst = mount(radInst, radSketch, 'htRadCanvas');
}

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

(window as any).SCREEN_INIT = {
  modes: modesMount,
};

condWire();
convWire();
radWire();
wireTabs('htTabs', (id) => { pane = id; modesMount(); });

/* tap-to-reveal examples */
document.querySelectorAll<HTMLElement>('.th-eg').forEach((eg) => {
  const open = () => eg.classList.add('revealed');
  eg.addEventListener('click', open);
  eg.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') open(); });
});
