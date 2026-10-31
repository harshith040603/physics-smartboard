/* ═══════════ Thermodynamics Studio · Zeroth and First Law ═══════════
   Three screens on window.SCREEN_INIT, one p5 sketch each:

     systems  - an isolated, a closed and an open system side by side in
                the same surroundings. Heat crosses the thin metal walls
                and stops at the thick insulating ones; only the cup with
                no lid swaps molecules with the air. The table fills in.
     zeroth   - A and B sit on C. A-C and B-C share a diathermic floor,
                A-B an adiabatic wall, so heat only flows through C - yet
                A and B end at the same temperature. Then let A touch B:
                nothing flows.
     firstlaw - two identical gases, identical heaters, heated to the same
                ΔT. A's piston is free (constant pressure), B's is held by
                stoppers. B gets there first: same ΔU, but A also pays
                W = PΔV. Energy bars split Q into ΔU + W, and the P-V
                graph shades W as the area under A's line.

   Every p5 instance is built lazily: hidden .screen sections are
   display:none, so a canvas created early would have zero width. Each
   draw() returns early while its canvas is hidden.                      */

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

function arrowHead(p: p5, x: number, y: number, ang: number, head = 11) {
  p.line(x, y, x - head * Math.cos(ang - 0.45), y - head * Math.sin(ang - 0.45));
  p.line(x, y, x - head * Math.cos(ang + 0.45), y - head * Math.sin(ang + 0.45));
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

/* temperature colour: 200 K blue → 500 K purple → 800 K red (same as Kinetic Theory) */
function tempRGB(T: number): RGB {
  const f = clamp((T - 200) / 600, 0, 1);
  if (f < 0.5) return mix([37, 99, 235], [147, 51, 234], f / 0.5);
  return mix([147, 51, 234], [220, 38, 38], (f - 0.5) / 0.5);
}

/* a wall band: everything between the outer and the inner rect.
   Adiabatic = thick and hatched, diathermic = thin metal, copper = the
   conducting floor of the zeroth-law box.                              */
type WallKind = 'adiabatic' | 'metal' | 'copper';
function wallBand(
  p: p5, ox: number, oy: number, ow: number, oh: number,
  ix: number, iy: number, iw: number, ih: number, kind: WallKind
) {
  const ctx = p.drawingContext as CanvasRenderingContext2D;
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, ow, oh);
  ctx.rect(ix, iy, iw, ih);
  ctx.clip('evenodd');
  p.noStroke();
  if (kind === 'adiabatic') {
    p.fill(207, 216, 232);
    p.rect(ox, oy, ow, oh);
    p.stroke(41, 89, 144, 150);
    p.strokeWeight(1.5);
    for (let s = -oh; s < ow + oh; s += 10) p.line(ox + s, oy + oh, ox + s + oh, oy);
  } else if (kind === 'metal') {
    p.fill(148, 163, 184);
    p.rect(ox, oy, ow, oh);
  } else {
    p.fill(184, 115, 51);
    p.rect(ox, oy, ow, oh);
  }
  ctx.restore();
}

/* a wavy orange heat arrow from (x1, y1) to (x2, y2) */
function heatArrow(p: p5, x1: number, y1: number, x2: number, y2: number, phase: number, a: number) {
  if (a <= 0.03) return;
  const L = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / L, uy = (y2 - y1) / L;
  p.stroke(234, 88, 12, 255 * Math.min(1, a));
  p.strokeWeight(3);
  p.noFill();
  p.beginShape();
  for (let i = 0; i <= 20; i++) {
    const s = (i / 20) * L;
    const off = 4 * Math.sin(s / 6 - phase * 9) * (i < 19 ? 1 : 0);
    p.vertex(x1 + ux * s - uy * off, y1 + uy * s + ux * off);
  }
  p.endShape();
  arrowHead(p, x2, y2, Math.atan2(uy, ux));
}

/* molecules: position as a fraction of their box, direction as a unit
   vector, k a personal speed factor so they don't all move alike */
interface Dot { u: number; w: number; vx: number; vy: number; k: number }
function makeDots(n: number): Dot[] {
  return Array.from({ length: n }, () => {
    const a = Math.random() * Math.PI * 2;
    return { u: Math.random(), w: Math.random(), vx: Math.cos(a), vy: Math.sin(a), k: 0.55 + Math.random() * 0.9 };
  });
}
const speedFor = (T: number, scale: number) => scale * 0.55 * Math.sqrt(T / 300);

/* move and draw the dots inside a box. escapeTop, if given, is asked about
   every dot that reaches the top edge; returning true removes it. */
function moveDots(
  p: p5, dots: Dot[], x0: number, y0: number, x1: number, y1: number,
  vt: number, d: number, r: number,
  escapeTop?: (m: Dot, px: number, py: number) => boolean
) {
  const X0 = x0 + r, X1 = x1 - r, Y0 = y0 + r, Y1 = y1 - r;
  for (let i = dots.length - 1; i >= 0; i--) {
    const m = dots[i];
    let px = X0 + m.u * (X1 - X0), py = Y0 + m.w * (Y1 - Y0);
    px += m.vx * m.k * vt * d;
    py += m.vy * m.k * vt * d;
    if (px < X0) { px = X0 + (X0 - px); m.vx = Math.abs(m.vx); }
    if (px > X1) { px = X1 - (px - X1); m.vx = -Math.abs(m.vx); }
    if (py < Y0) {
      if (escapeTop && escapeTop(m, px, py)) { dots.splice(i, 1); continue; }
      py = Y0 + (Y0 - py);
      m.vy = Math.abs(m.vy);
    }
    if (py > Y1) { py = Y1 - (py - Y1); m.vy = -Math.abs(m.vy); }
    px = clamp(px, X0, X1);
    py = clamp(py, Y0, Y1);
    m.u = X1 > X0 ? (px - X0) / (X1 - X0) : 0.5;
    m.w = Y1 > Y0 ? (py - Y0) / (Y1 - Y0) : 0.5;
    p.circle(px, py, r * 2);
  }
}

interface Box { x: number; y: number; w: number; h: number }

/* a time graph: hist rows are [t, v1, v2, ...]; series pick a column each */
function timePlot(
  p: p5, g: Box, title: string, unit: string, hist: number[][],
  series: { i: number; col: string; lab: string }[],
  yHi: number, tMax: number, tag: [string, string], fs: number
) {
  const L = g.x + 58, R = g.x + g.w - 40, T = g.y + 34, B = g.y + g.h - 28;
  const gx = (t: number) => L + (t / tMax) * (R - L);
  const gy = (v: number) => B - (v / yHi) * (B - T);
  p.noStroke();
  p.fill(C.paper);
  p.rect(g.x, g.y, g.w, g.h, 12);
  p.textFont('DM Sans');
  p.textStyle(p.BOLD);
  p.textSize(fs);
  p.fill(C.navy);
  p.textAlign(p.LEFT, p.TOP);
  p.text(title, g.x + 14, g.y + 10);
  if (tag[0]) {
    p.fill(tag[1]);
    p.textAlign(p.RIGHT, p.TOP);
    p.text(tag[0], g.x + g.w - 14, g.y + 10);
  }
  p.textStyle(p.NORMAL);
  p.stroke(41, 89, 144, 110);
  p.strokeWeight(1.2);
  p.line(L, B, R, B);
  p.line(L, T, L, B);
  p.noStroke();
  p.fill(C.dark);
  p.textSize(fs - 3);
  p.textAlign(p.RIGHT, p.CENTER);
  p.text(`${yHi} ${unit}`, L - 6, T);
  p.text(`${yHi / 2}`, L - 6, (T + B) / 2);
  p.text('0', L - 6, B);
  p.textAlign(p.CENTER, p.TOP);
  p.text('0', L, B + 5);
  p.text(`${tMax} s`, R, B + 5);
  p.text('time', (L + R) / 2, B + 5);
  for (const s of series) {
    p.stroke(s.col);
    p.strokeWeight(3);
    p.noFill();
    p.beginShape();
    for (const h of hist) p.vertex(gx(h[0]), gy(h[s.i]));
    p.endShape();
  }
  /* end labels, spread out when lines meet */
  const end = hist[hist.length - 1];
  const ys = series.map((s) => ({ s, y: gy(end[s.i]) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ys.length; i++) if (ys[i].y - ys[i - 1].y < 15) ys[i].y = ys[i - 1].y + 15;
  const lx = Math.min(R + 5, gx(end[0]) + 6);
  p.noStroke();
  p.textStyle(p.BOLD);
  p.textSize(fs - 2);
  p.textAlign(p.LEFT, p.CENTER);
  for (const { s, y } of ys) { p.fill(s.col); p.text(s.lab, lx, y); }
  p.textStyle(p.NORMAL);
}

function goLabel(id: string, started: boolean, idle: string, again: string) {
  setText(id, started ? again : idle);
}

/* ══════════════════════════════════════════════════════════════════════
   1 · THREE KINDS OF SYSTEM
   Each gas relaxes towards the surroundings, dT/dt = (Ts − T)/τ, unless
   its walls are adiabatic. Heat in = C·dT summed up, for 1 mol of a
   monatomic gas. Only the open cup swaps molecules with the air.
   ══════════════════════════════════════════════════════════════════════ */

const SYS_T0 = 400;
const SYS_TAU = 4;                       // s
const SYS_DOTS = 30;
const CV_MOL = 1.5 * 8.314;              // J/K for 1 mol, monatomic

interface SysItem {
  name: string; walls: string; adiabatic: boolean; lid: boolean;
  T: number; Q: number; dots: Dot[]; out: number; inn: number;
}
interface Free { x: number; y: number; vx: number; vy: number; life: number; target: number }

const sys = {
  Ts: 600,
  started: false,
  t: 0,
  phase: 0,
  items: [] as SysItem[],
  free: [] as Free[],               // molecules flying out of, or into, the open cup
  spawn: 0,
  revealed: false,
};

function sysBuild(start: boolean) {
  const mk = (name: string, walls: string, adiabatic: boolean, lid: boolean): SysItem =>
    ({ name, walls, adiabatic, lid, T: SYS_T0, Q: 0, dots: makeDots(SYS_DOTS), out: 0, inn: 0 });
  sys.items = [
    mk('Isolated system', 'adiabatic walls, lid on', true, true),
    mk('Closed system', 'metal walls, lid on', false, true),
    mk('Open system', 'metal walls, no lid', false, false),
  ];
  sys.free = [];
  sys.t = 0;
  sys.spawn = 0;
  sys.started = start;
  goLabel('tdSysGo', start, '▶ Start', '↻ Run again');
}

/* where system i sits: its panel, and the outer box of its container */
function sysGeom(i: number, W: number, H: number, wide: boolean) {
  const panel: Box = wide
    ? { x: (i * W) / 3, y: 0, w: W / 3, h: H }
    : { x: 0, y: 10 + i * 330, w: W, h: 330 };
  const cw = Math.min(panel.w * 0.56, 250), ch = Math.min(panel.h * 0.5, 240);
  const cx = panel.x + panel.w / 2;
  return { panel, cw, ch, cx, ox: cx - cw / 2, oy: panel.y + (wide ? panel.h * 0.24 : 78) };
}

function sysReveal(show: boolean) {
  sys.revealed = show;
  document.querySelectorAll('#tdSysTable tbody tr').forEach((r) => r.classList.toggle('shown', show));
}

const sysSketch = (p: p5) => {
  const holder = el('tdSysCanvas');
  const wideAt = (W: number) => W >= 900;
  const canvasH = () => {
    const W = holder.clientWidth;
    return wideAt(W) ? Math.max(460, Math.min(560, Math.round(W * 0.36))) : 3 * 330 + 20;
  };
  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    if (!holder.offsetParent) return;
    const d = dt(p);
    sys.phase += d;
    const W = p.width, H = p.height;
    const wide = wideAt(W);
    const fs = wide ? 16 : 14;

    /* ── model ── */
    if (sys.started) {
      sys.t += d;
      for (const it of sys.items) {
        if (it.adiabatic) continue;
        const dT = ((sys.Ts - it.T) / SYS_TAU) * d;
        it.T += dT;
        it.Q += CV_MOL * (it.dots.length / SYS_DOTS) * dT;
      }
      if (sys.t > 5 && !sys.revealed) sysReveal(true);
    }

    /* ── the surroundings, tinted by their temperature ── */
    const sc = tempRGB(sys.Ts);
    p.background(255);
    p.noStroke();
    p.fill(sc[0], sc[1], sc[2], 26);
    p.rect(0, 0, W, H);

    sys.items.forEach((it, i) => {
      const { panel, cw, ch, cx, ox, oy } = sysGeom(i, W, H, wide);
      const tw = it.adiabatic ? 16 : 6;
      const ix = ox + tw, iw = cw - 2 * tw;
      const iy = it.lid ? oy + tw : oy, ih = ch - (it.lid ? 2 * tw : tw);

      /* gas */
      const gc = tempRGB(it.T);
      p.noStroke();
      p.fill(255);
      p.rect(ix, iy, iw, ih);
      p.fill(gc[0], gc[1], gc[2], 36);
      p.rect(ix, iy, iw, ih);

      /* heat: through metal walls, or stopped at the insulation */
      const gap = sys.Ts - it.T;
      if (sys.started && Math.abs(gap) > 2) {
        const a = Math.pow(Math.min(1, Math.abs(gap) / 200), 0.6);
        const inward = gap > 0;
        for (const side of [-1, 1]) {
          const wx = side < 0 ? ox : ox + cw;
          for (const fy of [0.38, 0.72]) {
            const y = oy + ch * fy;
            const outX = wx + side * 54, inX = wx - side * (tw + 18);
            if (it.adiabatic) {
              /* heading for the insulation and stopped at its face - from
                 outside when the room is hotter, from inside when the gas is */
              const face = inward ? wx + side * 4 : wx - side * (tw + 4);
              const from = inward ? outX : wx - side * (tw + 48);
              heatArrow(p, from, y, face + side * (inward ? 4 : -4), y, sys.phase, a * 0.8);
              p.stroke(C.red);
              p.strokeWeight(3);
              p.line(face, y - 9, face, y + 9);
            } else if (inward) heatArrow(p, outX, y, inX, y, sys.phase, a);
            else heatArrow(p, inX, y, outX, y, sys.phase, a);
          }
        }
      }

      /* molecules, and the open cup's traffic with the air */
      const r = clamp(ih / 46, 3.2, 5);
      p.noStroke();
      p.fill(gc[0], gc[1], gc[2]);
      const vt = speedFor(it.T, ih);
      moveDots(p, it.dots, ix, iy, ix + iw, iy + ih, vt, d, r, it.lid ? undefined : (m, px, py) => {
        if (!sys.started || Math.random() > 0.08 * Math.sqrt(it.T / 300)) return false;
        const sp = m.k * vt;
        sys.free.push({ x: px, y: py, vx: m.vx * sp * 0.6, vy: -Math.abs(m.vy) * sp, life: 1, target: -1 });
        it.out++;
        return true;
      });
      if (!it.lid && sys.started) {
        sys.spawn += d * 0.35;
        while (sys.spawn > 1) {
          sys.spawn -= 1;
          sys.free.push({ x: ix + iw * (0.15 + Math.random() * 0.7), y: oy - 70, vx: (Math.random() - 0.5) * 20, vy: speedFor(sys.Ts, ih) * 0.7, life: 1, target: i });
        }
      }

      /* walls drawn over the gas edge */
      wallBand(p, ox, oy, cw, ch, ix, iy, iw, ih, it.adiabatic ? 'adiabatic' : 'metal');
      p.noFill();
      p.stroke(C.dark);
      p.strokeWeight(1.6);
      if (it.lid) p.rect(ox, oy, cw, ch, 6);
      else {
        p.beginShape();
        p.vertex(ox, oy); p.vertex(ox, oy + ch); p.vertex(ox + cw, oy + ch); p.vertex(ox + cw, oy);
        p.endShape();
      }

      /* labels */
      p.noStroke();
      p.textFont('DM Sans');
      p.textStyle(p.BOLD);
      p.textSize(fs + 3);
      p.fill(C.navy);
      p.textAlign(p.CENTER, p.TOP);
      p.text(it.name, cx, panel.y + (wide ? 18 : 8));
      p.textStyle(p.NORMAL);
      p.textSize(fs - 1);
      p.fill(C.dark);
      p.text(it.walls, cx, panel.y + (wide ? 44 : 32));
      const heat = Math.abs(it.Q) < 0.5 ? 'no heat in or out' : `heat ${it.Q > 0 ? 'in' : 'out'}: ${Math.abs(it.Q).toFixed(0)} J`;
      const mol = it.lid ? `${it.dots.length} molecules` : `${it.dots.length} molecules (${it.out} out, ${it.inn} in)`;
      chip(p, `T = ${it.T.toFixed(0)} K\n${heat}\n${mol}`, cx, oy + ch + 14, 'center', fs - 1, C.navy);
    });

    /* free molecules: out of the cup and away, or in from the air */
    const openIdx = 2;
    const cup = sys.items[openIdx];
    for (let k = sys.free.length - 1; k >= 0; k--) {
      const f = sys.free[k];
      f.x += f.vx * d;
      f.y += f.vy * d;
      f.life -= d / (f.target < 0 ? 2.2 : 4);
      /* an incoming molecule that drops into the cup joins its gas */
      if (f.target === openIdx && cup) {
        const { cw, ox, oy } = sysGeom(openIdx, W, H, wide);
        if (f.y > oy + 6 && f.x > ox + 6 && f.x < ox + cw - 6) {
          const a = Math.random() * Math.PI;
          cup.dots.push({ u: (f.x - ox - 6) / (cw - 12), w: 0.02, vx: Math.cos(a), vy: Math.abs(Math.sin(a)), k: 0.55 + Math.random() * 0.9 });
          cup.inn++;
          sys.free.splice(k, 1);
          continue;
        }
      }
      if (f.life <= 0) { sys.free.splice(k, 1); continue; }
      const c = f.target < 0 && cup ? tempRGB(cup.T) : sc;
      p.noStroke();
      p.fill(c[0], c[1], c[2], 255 * Math.min(1, f.life * 1.4));
      p.circle(f.x, f.y, 8);
    }

    /* readouts */
    sys.items.forEach((it, i) => setText(`tdSysRo${i}`, `${it.T.toFixed(0)} K · ${it.dots.length} molecules`));
    let status = 'Ready - press Start';
    if (sys.started) {
      if (Math.abs(sys.Ts - SYS_T0) < 1) status = 'Surroundings at 400 K too - no heat flows anywhere. Move the slider.';
      else if (sys.Ts > SYS_T0) status = 'Heat flows in through the metal walls, not through the insulation';
      else status = 'Heat flows out through the metal walls, not through the insulation';
    }
    setText('tdSysRoS', status);
  };
};

function sysWire() {
  const inp = el('tdSurr') as HTMLInputElement;
  const show = () => setText('tdSurrV', `${inp.value} K`);
  inp.addEventListener('input', () => { sys.Ts = Number(inp.value); show(); });
  sys.Ts = Number(inp.value);
  show();
  el('tdSysGo').addEventListener('click', (e) => { (e.currentTarget as HTMLElement).blur(); sysBuild(true); });
  el('tdSysReset').addEventListener('click', () => { sysBuild(false); sysReveal(false); });
  sysBuild(false);
}

/* ══════════════════════════════════════════════════════════════════════
   2 · THE ZEROTH LAW
   Three bodies, heat capacities 1 : 1 : 2 (C is twice the size).
   q = h·ΔT through each diathermic wall; the A-B wall passes nothing
   until "Let A touch B" turns it to metal.
   ══════════════════════════════════════════════════════════════════════ */

const Z_CAP = { A: 1, B: 1, C: 2 };
const Z_H = 0.8;                         // conductance per second (capacity units): settles in ~8 s
const Z_COL = { A: C.navy, B: '#15803d', C: C.violet };

const zl = {
  TA0: 700, TB0: 250, TC0: 450,
  TA: 700, TB: 250, TC: 450,
  started: false,
  touch: false,
  touchAfterSettle: false,       // only then is "no heat flows" the zeroth law at work
  settled: false,
  hold: 0,
  t: 0,
  phase: 0,
  qAC: 0, qBC: 0, qAB: 0, qRef: 1,
  hist: [] as number[][],
  nextSample: 0,
  dots: { A: [] as Dot[], B: [] as Dot[], C: [] as Dot[] },
};

function zBuild(start: boolean) {
  zl.TA = zl.TA0; zl.TB = zl.TB0; zl.TC = zl.TC0;
  zl.started = start;
  zl.touch = false;
  zl.touchAfterSettle = false;
  zl.settled = false;
  zl.hold = 0;
  zl.t = 0;
  zl.qAC = zl.qBC = zl.qAB = 0;
  zl.qRef = Z_H * 150;                   // a 150 K gap draws a full-strength arrow
  zl.hist = [[0, zl.TA, zl.TB, zl.TC]];
  zl.nextSample = 0.05;
  zl.dots = { A: makeDots(14), B: makeDots(14), C: makeDots(28) };
  goLabel('tdZGo', start, '▶ Start', '↻ Run again');
  setText('tdZTouch', 'Let A touch B');
  el('tdZTouch').classList.remove('on');
  el('tdZRule').classList.remove('shown');
  el('tdZRule2').classList.remove('shown');
}

function zStep(d: number) {
  if (!zl.started) return;
  for (let left = d; left > 1e-9; left -= 0.01) {
    const h = Math.min(0.01, left);
    zl.qAC = Z_H * (zl.TA - zl.TC);
    zl.qBC = Z_H * (zl.TB - zl.TC);
    zl.qAB = zl.touch ? Z_H * (zl.TA - zl.TB) : 0;
    zl.TA += ((-zl.qAC - zl.qAB) / Z_CAP.A) * h;
    zl.TB += ((-zl.qBC + zl.qAB) / Z_CAP.B) * h;
    zl.TC += ((zl.qAC + zl.qBC) / Z_CAP.C) * h;
    zl.t += h;
  }
  const spread = Math.max(zl.TA, zl.TB, zl.TC) - Math.min(zl.TA, zl.TB, zl.TC);
  zl.hold = spread < 0.5 ? zl.hold + d : 0;       // tight enough that the readouts agree
  if (!zl.settled && zl.hold > 0.5) {
    zl.settled = true;
    el('tdZRule').classList.add('shown');
  }
  while (zl.t >= zl.nextSample && zl.t < 40) {
    zl.hist.push([zl.t, zl.TA, zl.TB, zl.TC]);
    zl.nextSample += 0.05;
  }
}

const zeroSketch = (p: p5) => {
  const holder = el('tdZeroCanvas');
  const wideAt = (W: number) => W >= 900;
  const canvasH = () => {
    const W = holder.clientWidth;
    return wideAt(W) ? Math.max(500, Math.min(620, Math.round(W * 0.4))) : 40 + Math.round(W * 0.85) + 270;
  };
  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    if (!holder.offsetParent) return;
    const d = dt(p);
    zl.phase += d;
    zStep(d);
    const W = p.width, H = p.height;
    const wide = wideAt(W);
    const fs = wide ? 16 : 14;

    const box: Box = wide
      ? { x: 28, y: 50, w: W * 0.56 - 28, h: H - 80 }
      : { x: 14, y: 44, w: W - 28, h: Math.round(W * 0.85) };
    const graph: Box = wide
      ? { x: W * 0.56 + 26, y: 30, w: W * 0.44 - 46, h: H - 60 }
      : { x: 14, y: box.y + box.h + 24, w: W - 28, h: 230 };

    const OW = wide ? 20 : 14;                       // outer adiabatic walls
    const ix = box.x + OW, iy = box.y + OW, iw = box.w - 2 * OW, ih = box.h - 2 * OW;
    const topH = ih * 0.48;
    const FLOOR = 8;                                 // the copper floor under A and B
    const SEP = zl.touch ? 8 : 18;                   // the A-B wall
    const aW = (iw - SEP) / 2;
    const A: Box = { x: ix, y: iy, w: aW, h: topH };
    const B: Box = { x: ix + aW + SEP, y: iy, w: aW, h: topH };
    const Cb: Box = { x: ix, y: iy + topH + FLOOR, w: iw, h: ih - topH - FLOOR };

    p.background(255);

    /* bodies: tint, then molecules */
    const bodies: [keyof typeof Z_CAP, Box, number][] = [['A', A, zl.TA], ['B', B, zl.TB], ['C', Cb, zl.TC]];
    for (const [k, b, T] of bodies) {
      const c = tempRGB(T);
      p.noStroke();
      p.fill(255);
      p.rect(b.x, b.y, b.w, b.h);
      p.fill(c[0], c[1], c[2], 36);
      p.rect(b.x, b.y, b.w, b.h);
      p.fill(c[0], c[1], c[2]);
      moveDots(p, zl.dots[k], b.x, b.y, b.x + b.w, b.y + b.h, speedFor(T, Math.min(b.h, 240)), d, clamp(b.h / 40, 3.2, 5));
    }

    /* walls: outer adiabatic box, copper floor, the A-B wall */
    wallBand(p, box.x, box.y, box.w, box.h, ix, iy, iw, ih, 'adiabatic');
    p.noStroke();
    p.fill(184, 115, 51);
    p.rect(ix, iy + topH, iw, FLOOR);
    if (zl.touch) {
      p.fill(184, 115, 51);
      p.rect(ix + aW, iy, SEP, topH);
    } else {
      wallBand(p, ix + aW, iy, SEP, topH, ix + aW, iy, 0, 0, 'adiabatic');
      p.stroke(C.dark);
      p.strokeWeight(1.2);
      p.noFill();
      p.rect(ix + aW, iy, SEP, topH);
    }
    p.noFill();
    p.stroke(C.dark);
    p.strokeWeight(2);
    p.rect(box.x, box.y, box.w, box.h, 8);

    /* heat arrows across the diathermic walls */
    if (zl.started) {
      const fy = iy + topH + FLOOR / 2;
      const span = Math.min(34, topH * 0.3);
      const vArrow = (x: number, q: number) => {
        const a = Math.pow(Math.min(1, Math.abs(q) / zl.qRef), 0.6);
        if (q > 0) heatArrow(p, x, fy - span, x, fy + span, zl.phase, a);     // down into C
        else heatArrow(p, x, fy + span, x, fy - span, zl.phase, a);           // up out of C
      };
      vArrow(A.x + A.w / 2, zl.qAC);
      vArrow(B.x + B.w / 2, zl.qBC);
      if (zl.touch) {
        const y = iy + topH * 0.5, mx = ix + aW + SEP / 2;
        const a = Math.pow(Math.min(1, Math.abs(zl.qAB) / zl.qRef), 0.6);
        if (zl.qAB > 0) heatArrow(p, mx - 34, y, mx + 34, y, zl.phase, a);
        else heatArrow(p, mx + 34, y, mx - 34, y, zl.phase, a);
        if (a < 0.05) chip(p, 'no heat flows', mx, y - 12, 'center', fs - 1, C.green);
      }
    }

    /* labels */
    const big = (k: string, b: Box, T: number) => {
      p.noStroke();
      p.textFont('DM Sans');
      p.textStyle(p.BOLD);
      p.textSize(fs + 10);
      p.fill(Z_COL[k as keyof typeof Z_COL]);
      p.textAlign(p.LEFT, p.TOP);
      p.text(k, b.x + 12, b.y + 8);
      p.textStyle(p.NORMAL);
      chip(p, `T = ${T.toFixed(0)} K`, b.x + b.w - 12, b.y + 12, 'right', fs, Z_COL[k as keyof typeof Z_COL]);
    };
    big('A', A, zl.TA);
    big('B', B, zl.TB);
    big('C', Cb, zl.TC);
    chip(p, 'Outer walls: adiabatic', box.x, box.y - 36, 'left', fs - 1, C.dark);
    chip(p, zl.touch ? 'A-B wall: diathermic now' : 'A-B wall: adiabatic', box.x + box.w, box.y - 36, 'right', fs - 1, zl.touch ? '#9a3412' : C.dark);

    /* graph */
    const last = zl.hist[zl.hist.length - 1];
    const tMax = Math.max(10, Math.ceil(last[0] * 1.05));
    const tag: [string, string] = zl.settled ? ['all three equal', C.green] : ['', ''];
    timePlot(p, graph, 'Temperature', 'K', zl.hist, [
      { i: 1, col: Z_COL.A, lab: 'A' },
      { i: 2, col: Z_COL.B, lab: 'B' },
      { i: 3, col: Z_COL.C, lab: 'C' },
    ], 900, tMax, tag, fs);

    /* readouts */
    setText('tdZRoA', `${zl.TA.toFixed(0)} K`);
    setText('tdZRoB', `${zl.TB.toFixed(0)} K`);
    setText('tdZRoC', `${zl.TC.toFixed(0)} K`);
    let status = 'Ready - press Start';
    if (zl.started) {
      if (zl.touch && zl.touchAfterSettle) status = 'A touches B - and no heat flows between them';
      else if (zl.settled) status = 'Settled: A matches C and B matches C - so A matches B';
      else if (zl.touch) status = 'A and B touched before settling, so heat flows between them too';
      else status = 'Heat flows A ↔ C and B ↔ C only - never straight from A to B';
    }
    setText('tdZRoS', status);
    if (zl.touch && zl.touchAfterSettle) el('tdZRule2').classList.add('shown');
  };
};

function zWire() {
  const slider = (id: string, key: 'TA0' | 'TB0' | 'TC0') => {
    const inp = el(id) as HTMLInputElement;
    const show = () => setText(`${id}v`, `${inp.value} K`);
    inp.addEventListener('input', () => { zl[key] = Number(inp.value); show(); zBuild(false); });
    zl[key] = Number(inp.value);
    show();
  };
  slider('tdTA', 'TA0');
  slider('tdTB', 'TB0');
  slider('tdTC', 'TC0');
  el('tdZGo').addEventListener('click', (e) => { (e.currentTarget as HTMLElement).blur(); zBuild(true); });
  el('tdZReset').addEventListener('click', () => zBuild(false));
  el('tdZTouch').addEventListener('click', (e) => {
    const b = e.currentTarget as HTMLElement;
    b.blur();
    if (!zl.started) zBuild(true);
    zl.touch = !zl.touch;
    zl.touchAfterSettle = zl.touch && zl.settled;
    b.classList.toggle('on', zl.touch);
    setText('tdZTouch', zl.touch ? 'Separate A and B again' : 'Let A touch B');
    if (!zl.touch) el('tdZRule2').classList.remove('shown');
  });
  zBuild(false);
}

/* ══════════════════════════════════════════════════════════════════════
   3 · FIRST LAW - piston free vs piston fixed
   1 mol of ideal gas in each, 300 K and 100 kPa to start. Both heaters
   give the same power. A at constant P:  dQ = (f/2 + 1) nR dT,
   W = nR ΔT. B at constant V:  dQ = (f/2) nR dT, W = 0.
   The power is picked so A takes 7 s; B, needing less, finishes first.
   ══════════════════════════════════════════════════════════════════════ */

const R_GAS = 8.314;
const F_T0 = 300;
const F_P0 = 100;                         // kPa
const F_V0 = (R_GAS * F_T0) / F_P0;       // L (with P in kPa): 24.9 L
const F_TIME_A = 7;                       // s for A to finish

interface Cyl { T: number; Q: number; W: number; on: boolean; doneAt: number; dots: Dot[] }

const fl = {
  f: 3,
  dT: 100,
  started: false,
  t: 0,
  phase: 0,
  power: 1,
  A: null as unknown as Cyl,
  B: null as unknown as Cyl,
};

const fdU = (T: number) => (fl.f / 2) * R_GAS * (T - F_T0);
const fVA = () => (R_GAS * fl.A.T) / F_P0;
const fPB = () => (R_GAS * fl.B.T) / F_V0;

function fBuild(start: boolean) {
  const mk = (): Cyl => ({ T: F_T0, Q: 0, W: 0, on: start, doneAt: 0, dots: makeDots(26) });
  fl.A = mk();
  fl.B = mk();
  fl.t = 0;
  fl.started = start;
  fl.power = ((fl.f / 2 + 1) * R_GAS * fl.dT) / F_TIME_A;
  setText('tdFGo', start ? '↻ Run again' : '🔥 Switch both heaters on');
  el('tdFRule').classList.remove('shown');
}

function fStep(d: number) {
  if (!fl.started) return;
  fl.t += d;
  const target = F_T0 + fl.dT;
  const heat = (c: Cyl, cap: number, free: boolean) => {
    if (!c.on) return;
    let dQ = fl.power * d;
    const need = cap * (target - c.T);
    if (dQ >= need) { dQ = need; c.on = false; c.doneAt = fl.t; }
    const dT = dQ / cap;
    c.T += dT;
    c.Q += dQ;
    if (free) c.W += R_GAS * dT;            // P dV = nR dT at constant P
  };
  heat(fl.A, (fl.f / 2 + 1) * R_GAS, true);
  heat(fl.B, (fl.f / 2) * R_GAS, false);
  if (!fl.A.on && !fl.B.on) el('tdFRule').classList.add('shown');
}

const firstSketch = (p: p5) => {
  const holder = el('tdFirstCanvas');
  const wideAt = (W: number) => W >= 900;
  const canvasH = () => {
    const W = holder.clientWidth;
    return wideAt(W) ? Math.max(560, Math.min(680, Math.round(W * 0.44))) : 470 + 2 * 250 + 30;
  };
  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    if (!holder.offsetParent) return;
    const d = dt(p);
    fl.phase += d;
    fStep(d);
    const W = p.width, H = p.height;
    const wide = wideAt(W);
    const fs = wide ? 16 : 14;

    const area: Box = wide ? { x: 0, y: 0, w: W * 0.54, h: H } : { x: 0, y: 0, w: W, h: 470 };
    const pv: Box = wide
      ? { x: W * 0.54 + 16, y: 20, w: W * 0.46 - 36, h: (H - 56) * 0.56 }
      : { x: 14, y: 480, w: W - 28, h: 250 };
    const bars: Box = wide
      ? { x: pv.x, y: pv.y + pv.h + 16, w: pv.w, h: H - 56 - pv.h - 16 + 20 }
      : { x: 14, y: 745, w: W - 28, h: 230 };

    p.background(255);

    /* ── the two cylinders ── */
    const cylW = Math.min(area.w * 0.3, 210);
    const cylTop = area.y + 92, cylBot = area.y + area.h - (wide ? 120 : 112);
    const cylH = cylBot - cylTop;
    const vMax = F_V0 * (F_T0 + 300) / F_T0 * 1.08;
    const gasH = (V: number) => (V / vMax) * (cylH - 40);
    const PIST = 14;

    const drawCyl = (c: Cyl, cx: number, free: boolean, label: string) => {
      const x0 = cx - cylW / 2, x1 = cx + cylW / 2;
      const V = free ? fVA() : F_V0;
      const P = free ? F_P0 : fPB();
      const gTop = cylBot - gasH(V);
      const gc = tempRGB(c.T);
      /* gas */
      p.noStroke();
      p.fill(255);
      p.rect(x0, gTop, cylW, cylBot - gTop);
      p.fill(gc[0], gc[1], gc[2], 36);
      p.rect(x0, gTop, cylW, cylBot - gTop);
      p.fill(gc[0], gc[1], gc[2]);
      moveDots(p, c.dots, x0, gTop, x1, cylBot - 20, speedFor(c.T, 200), d, 4.2);

      /* heater coil and its heat */
      const coilY = cylBot - 11;
      const hot = c.on ? 0.6 + 0.4 * Math.sin(fl.phase * 10) : 0;
      p.noFill();
      p.stroke(c.on ? p.color(234, 88, 12) : p.color(148, 163, 184));
      p.strokeWeight(3.5);
      p.beginShape();
      for (let i = 0; i <= 12; i++) p.vertex(x0 + 16 + (i / 12) * (cylW - 32), coilY + (i % 2 ? -6 : 6));
      p.endShape();
      if (c.on) {
        for (const fx of [0.3, 0.5, 0.7]) {
          const x = x0 + cylW * fx;
          heatArrow(p, x, coilY - 12, x, coilY - 52, fl.phase, 0.5 + 0.5 * hot);
        }
      }

      /* cylinder walls */
      p.stroke(C.dark);
      p.strokeWeight(5);
      p.line(x0 - 2, cylTop - 30, x0 - 2, cylBot + 2);
      p.line(x1 + 2, cylTop - 30, x1 + 2, cylBot + 2);
      p.line(x0 - 2, cylBot + 2, x1 + 2, cylBot + 2);

      /* piston */
      p.noStroke();
      p.fill(100, 116, 139);
      p.rect(x0, gTop - PIST, cylW, PIST, 2);
      if (free) {
        /* a weight on top: the outside pressure stays P₀ */
        p.fill(C.navy);
        p.rect(cx - cylW * 0.24, gTop - PIST - 30, cylW * 0.48, 30, 4);
        p.fill(255);
        p.textFont('DM Sans');
        p.textStyle(p.BOLD);
        p.textSize(fs - 2);
        p.textAlign(p.CENTER, p.CENTER);
        p.text('P₀', cx, gTop - PIST - 15);
        p.textStyle(p.NORMAL);
      } else {
        /* stoppers just above the piston */
        p.fill(C.red);
        p.rect(x0, gTop - PIST - 12, 16, 10, 2);
        p.rect(x1 - 16, gTop - PIST - 12, 16, 10, 2);
      }

      /* labels */
      p.noStroke();
      p.textFont('DM Sans');
      p.textStyle(p.BOLD);
      p.textSize(fs + 4);
      p.fill(C.navy);
      p.textAlign(p.CENTER, p.TOP);
      p.text(label, cx, area.y + 14);
      p.textStyle(p.NORMAL);
      p.textSize(fs - 1);
      p.fill(C.dark);
      p.text(free ? 'piston free to move' : 'piston held by stoppers', cx, area.y + 42);
      if (fl.started && !c.on) chip(p, `reached +${fl.dT} K at ${c.doneAt.toFixed(1)} s`, cx, area.y + 64, 'center', fs - 2, C.green);
      chip(p, `T = ${c.T.toFixed(0)} K\nP = ${P.toFixed(0)} kPa\nV = ${V.toFixed(1)} L`, cx, cylBot + 14, 'center', fs - 1, C.navy);
    };
    drawCyl(fl.A, area.x + area.w * 0.27, true, 'A');
    drawCyl(fl.B, area.x + area.w * 0.73, false, 'B');
    if (fl.started) chip(p, `t = ${fl.t.toFixed(1)} s`, area.x + area.w / 2, area.y + 14, 'center', fs - 1, C.navy);

    /* ── P-V graph ── */
    {
      const L = pv.x + 62, R = pv.x + pv.w - 22, T = pv.y + 36, B = pv.y + pv.h - 30;
      /* axes sized to where this run will end, so A's area is never a sliver */
      const tEnd = F_T0 + fl.dT;
      const vHi = Math.ceil(((R_GAS * tEnd) / F_P0) * 1.2 / 10) * 10;
      const pHi = Math.ceil(((R_GAS * tEnd) / F_V0) * 1.3 / 50) * 50;
      const gx = (v: number) => L + (v / vHi) * (R - L);
      const gy = (P: number) => B - (P / pHi) * (B - T);
      p.noStroke();
      p.fill(C.paper);
      p.rect(pv.x, pv.y, pv.w, pv.h, 12);
      p.textFont('DM Sans');
      p.textStyle(p.BOLD);
      p.textSize(fs);
      p.fill(C.navy);
      p.textAlign(p.LEFT, p.TOP);
      p.text('P-V graph', pv.x + 14, pv.y + 10);
      p.textStyle(p.NORMAL);
      p.stroke(41, 89, 144, 110);
      p.strokeWeight(1.2);
      p.line(L, B, R, B);
      p.line(L, T, L, B);
      p.noStroke();
      p.fill(C.dark);
      p.textSize(fs - 3);
      p.textAlign(p.RIGHT, p.CENTER);
      p.text(`${pHi} kPa`, L - 6, T);
      p.text(`${F_P0}`, L - 6, gy(F_P0));
      p.text('0', L - 6, B);
      p.textAlign(p.CENTER, p.TOP);
      p.text('0', L, B + 5);
      p.text(`${vHi} L`, R, B + 5);
      p.text('V', (L + R) / 2, B + 5);
      p.textAlign(p.LEFT, p.CENTER);

      /* A: sideways at P₀, with the work shaded underneath */
      const vA = fVA();
      p.fill(0, 160, 227, 60);
      p.rect(gx(F_V0), gy(F_P0), gx(vA) - gx(F_V0), B - gy(F_P0));
      p.stroke(C.navy);
      p.strokeWeight(3.5);
      p.line(gx(F_V0), gy(F_P0), gx(vA), gy(F_P0));
      /* B: straight up at V₀ */
      const pB = fPB();
      p.stroke(C.red);
      p.line(gx(F_V0), gy(F_P0), gx(F_V0), gy(pB));
      p.noStroke();
      p.fill(C.navy);
      p.circle(gx(F_V0), gy(F_P0), 9);
      p.textStyle(p.BOLD);
      p.textSize(fs - 1);
      p.fill(C.navy);
      p.textAlign(p.LEFT, p.BOTTOM);
      p.text('A', gx(vA) + 6, gy(F_P0) - 2);
      p.fill(C.red);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.text('B', gx(F_V0), gy(pB) - 6);
      p.textStyle(p.NORMAL);
      if (vA - F_V0 > 2) {
        p.fill(0, 110, 160);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(fs - 1);
        p.text('W = area', (gx(F_V0) + gx(vA)) / 2, (gy(F_P0) + B) / 2);
      }
      if (pB - F_P0 > 25) {
        /* left of B's line - A's line runs off to the right */
        p.fill(C.red);
        p.textAlign(p.RIGHT, p.CENTER);
        p.textSize(fs - 1);
        p.text('W = 0 (no area)', gx(F_V0) - 10, (gy(F_P0) + gy(pB)) / 2);
      }
    }

    /* ── energy bars: Q = ΔU + W ── */
    {
      p.noStroke();
      p.fill(C.paper);
      p.rect(bars.x, bars.y, bars.w, bars.h, 12);
      p.textFont('DM Sans');
      p.textStyle(p.BOLD);
      p.textSize(fs);
      p.fill(C.navy);
      p.textAlign(p.LEFT, p.TOP);
      p.text('Where the heat goes:  Q = ΔU + W', bars.x + 14, bars.y + 10);
      p.textStyle(p.NORMAL);
      const qMax = (fl.f / 2 + 1) * R_GAS * fl.dT;
      const L = bars.x + 44, Rr = bars.x + bars.w - 20;
      const scale = (Rr - L) / qMax;
      const bh = Math.min(30, (bars.h - 70) / 4);
      const row = (k: string, c: Cyl, y: number) => {
        const dU = fdU(c.T);
        p.fill(C.navy);
        p.textStyle(p.BOLD);
        p.textSize(fs + 2);
        p.textAlign(p.LEFT, p.CENTER);
        p.text(k, bars.x + 16, y + bh / 2);
        p.textStyle(p.NORMAL);
        p.fill(226, 232, 240);
        p.rect(L, y, Rr - L, bh, 6);
        p.fill(225, 29, 72);
        p.rect(L, y, Math.max(0, dU * scale), bh, 6, 0, 0, 6);
        p.fill(0, 160, 227);
        p.rect(L + dU * scale, y, Math.max(0, c.W * scale), bh, 0, 6, 6, 0);
        p.fill(C.dark);
        p.textSize(fs - 2);
        p.textAlign(p.LEFT, p.TOP);
        p.text(`Q = ${c.Q.toFixed(0)} J   =   ΔU ${dU.toFixed(0)} J  +  W ${c.W.toFixed(0)} J`, L, y + bh + 5);
      };
      const y0 = bars.y + 46;
      row('A', fl.A, y0);
      row('B', fl.B, y0 + bh + 44);
      /* key */
      const ky = bars.y + bars.h - 24;
      p.textSize(fs - 2);
      p.textAlign(p.LEFT, p.CENTER);
      p.fill(225, 29, 72);
      p.rect(L, ky - 7, 14, 14, 3);
      p.fill(C.dark);
      p.text('ΔU - stays in the gas', L + 20, ky);
      const kx = L + 20 + p.textWidth('ΔU - stays in the gas') + 26;
      p.fill(0, 160, 227);
      p.rect(kx, ky - 7, 14, 14, 3);
      p.fill(C.dark);
      p.text('W - spent pushing the piston', kx + 20, ky);
    }

    /* readouts */
    setText('tdFRoA', `${fl.A.Q.toFixed(0)} J`);
    setText('tdFRoB', `${fl.B.Q.toFixed(0)} J`);
    setText('tdFRoW', `${fl.A.W.toFixed(0)} J`);
    let status = 'Ready - switch the heaters on';
    if (fl.started) {
      if (fl.A.on && fl.B.on) status = 'Same heat into both every second. A\'s piston rises, B\'s pressure rises';
      else if (fl.A.on) status = `B is done - it needed only ${fl.B.Q.toFixed(0)} J. A is still heating`;
      else status = `Both done: B needed ${(100 * fl.B.Q / fl.A.Q).toFixed(0)} % of A's heat`;
    }
    setText('tdFRoS', status);
  };
};

function fWire() {
  const grp = el('tdFf');
  grp.querySelectorAll<HTMLButtonElement>('.th-btn').forEach((b) => {
    b.addEventListener('click', () => {
      grp.querySelectorAll('.th-btn').forEach((x) => x.classList.toggle('on', x === b));
      fl.f = Number(b.dataset.f);
      fBuild(false);
    });
  });
  const inp = el('tdFdT') as HTMLInputElement;
  const show = () => setText('tdFdTv', `${inp.value} K`);
  inp.addEventListener('input', () => { fl.dT = Number(inp.value); show(); fBuild(false); });
  fl.dT = Number(inp.value);
  show();
  el('tdFGo').addEventListener('click', (e) => { (e.currentTarget as HTMLElement).blur(); fBuild(true); });
  el('tdFReset').addEventListener('click', () => fBuild(false));
  fBuild(false);
}

/* ══════════════════════════════════════════════════════════════════════
   wiring
   ══════════════════════════════════════════════════════════════════════ */

const insts: Record<string, p5 | null> = { systems: null, zeroth: null, firstlaw: null };
function mount(id: string, sk: (p: p5) => void, holderId: string) {
  return () => {
    const inst = insts[id];
    if (inst) { inst.windowResized?.(); return; }
    insts[id] = new p5(sk, el(holderId));
  };
}

(window as any).SCREEN_INIT = {
  systems: mount('systems', sysSketch, 'tdSysCanvas'),
  zeroth: mount('zeroth', zeroSketch, 'tdZeroCanvas'),
  firstlaw: mount('firstlaw', firstSketch, 'tdFirstCanvas'),
};

sysWire();
zWire();
fWire();

/* tap-to-reveal examples */
document.querySelectorAll<HTMLElement>('.th-eg').forEach((eg) => {
  const open = () => eg.classList.add('revealed');
  eg.addEventListener('click', open);
  eg.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') open(); });
});

/* /thermodynamics#zeroth etc. open straight on that animation */
const hash = location.hash.slice(1);
if (hash in insts) (window as any).go(hash);
