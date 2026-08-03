/* ═══════════ Projectile on an Inclined Plane (Lecture 13) - eight-pane lab ═══════════
   Pane 1: Why Rotate? - the landing condition y = x tanα couples x and y in the
           old axes; toggle the rotated axes and it collapses to y′ = 0.
   Pane 2: Rotated Axes - α from the horizontal, β from the incline, and gravity
           split into g sinα (along) + g cosα (perpendicular).
   Pane 3: Case 1 - projected UP the incline (gravity opposes along the slope).
   Pane 4: Case 2 - projected DOWN the incline (gravity assists along the slope).
   Pane 5: Side by Side - same u, α, β both ways: identical T, different R.
   Pane 6: Maximum Range - R(β) curve, β_opt = (90 − α)/2, and the α = 0 check.
   Pane 7: Rapid Fire quiz.  Pane 8: Homework.

   Drawing rules for every diagram here:
   · ONE uniform world→screen scale, so the α and β you measure off the screen are real.
   · The launch corner carries geometry only (u arrow, two arcs, y′). Every number
     lives in one auto-placed panel that hunts for empty canvas.
   · Lengths along the slope are shown as a measured band ON the surface, not as
     floating arrows.
   p5 instances are created lazily per pane - hidden panes have zero width.          */

import p5 from 'p5';
import katex from 'katex';

const C = {
  navy: '#0f2647',
  dark: '#295990',
  accent: '#00A0E3',
  red: '#e11d48',
  green: '#16a34a',
  amber: '#f59e0b',
  violet: '#7c3aed',
  paper: '#f4f8fc',
  ink: '#41556f',
};
const G = 10;
const rad = (d: number) => (d * Math.PI) / 180;

type Dir = 'up' | 'down';
interface V { x: number; y: number }
interface Mg { l: number; r: number; t: number; b: number }
interface View {
  X: (wx: number) => number;
  Y: (wy: number) => number;
  s: number;
  x0: number; x1: number; y0: number; y1: number;
}

/* ═════════ primitives ═════════ */
function arrow(p: p5, x1: number, y1: number, x2: number, y2: number, head = 9) {
  p.line(x1, y1, x2, y2);
  const a = Math.atan2(y2 - y1, x2 - x1);
  p.line(x2, y2, x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45));
  p.line(x2, y2, x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45));
}

/* centre-anchored text pill; `ang` lets a label lie along the slope */
function label(
  p: p5, txt: string, x: number, y: number,
  col: string = C.navy, size = 13, ang = 0, box = true
) {
  p.push();
  p.translate(x, y);
  if (ang) p.rotate(ang);
  p.textFont('DM Sans');
  p.textSize(size);
  const lines = txt.split('\n');
  const w = Math.max(...lines.map((l) => p.textWidth(l)));
  const lh = size * 1.35;
  const h = lh * lines.length;
  if (box) {
    p.noStroke();
    p.fill(255, 255, 255, 234);
    p.rect(-w / 2 - 7, -h / 2 - 4, w + 14, h + 8, 7);
  }
  p.noStroke();
  p.fill(col);
  p.textAlign(p.CENTER, p.CENTER);
  lines.forEach((l, i) => p.text(l, 0, -h / 2 + lh * (i + 0.5)));
  p.pop();
}

function ball(p: p5, x: number, y: number, col: string, r = 16) {
  p.noStroke();
  p.fill(C.navy);
  p.circle(x, y, r + 2);
  p.fill(col);
  p.circle(x, y, r - 4);
}

const dashOn = (p: p5, pat: number[] = [5, 5]) => p.drawingContext.setLineDash(pat);
const dashOff = (p: p5) => p.drawingContext.setLineDash([]);
const fade = (p: p5, col: string, a: number) => { const c = p.color(col); c.setAlpha(a); return c; };

/* Fit world points into the plot box with ONE scale for both axes, so a 30°
   slope is drawn at exactly 30°.                                            */
function fitView(p: p5, M: Mg, pts: V[], pad = 0.1): View {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const q of pts) {
    x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x);
    y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
  }
  const w = Math.max(x1 - x0, 1e-3), h = Math.max(y1 - y0, 1e-3);
  x0 -= w * pad; x1 += w * pad; y0 -= h * pad; y1 += h * pad;
  const pw = Math.max(p.width - M.l - M.r, 10);
  const ph = Math.max(p.height - M.t - M.b, 10);
  const s = Math.min(pw / (x1 - x0), ph / (y1 - y0));
  const ox = M.l + (pw - (x1 - x0) * s) / 2 - x0 * s;
  const oy = M.t + (ph - (y1 - y0) * s) / 2 + y1 * s;
  return { X: (wx) => ox + wx * s, Y: (wy) => oy - wy * s, s, x0, x1, y0, y1 };
}

/* arcs are drawn in SCREEN angles (y grows downward) */
function arc(p: p5, cx: number, cy: number, r: number, sa: number, sb: number, col: string) {
  p.noFill();
  p.stroke(col);
  p.strokeWeight(2);
  p.arc(cx, cy, r * 2, r * 2, Math.min(sa, sb), Math.max(sa, sb));
}

/* ═════════ the info panel ═════════ */
interface Row { text?: string; sw?: string; sep?: boolean; dim?: boolean }

function panelSize(p: p5, title: string, rows: Row[]) {
  p.textFont('Bricolage Grotesque');
  p.textSize(12.5);
  let w = p.textWidth(title);
  p.textFont('DM Sans');
  p.textSize(13.5);
  for (const r of rows) if (r.text) w = Math.max(w, p.textWidth(r.text) + (r.sw ? 20 : 0));
  const h = rows.reduce((a, r) => a + (r.sep ? 11 : 20), 0);
  return { w: w + 30, h: h + 42 };
}

function drawPanel(p: p5, x: number, y: number, title: string, rows: Row[]) {
  const m = panelSize(p, title, rows);
  p.noStroke();
  p.fill(255, 255, 255, 240);
  p.rect(x, y, m.w, m.h, 13);
  p.noFill();
  p.stroke(41, 89, 144, 46);
  p.strokeWeight(1);
  p.rect(x + 0.5, y + 0.5, m.w - 1, m.h - 1, 13);
  p.noStroke();
  p.fill(C.dark);
  p.textFont('Bricolage Grotesque');
  p.textSize(12.5);
  p.textAlign(p.LEFT, p.TOP);
  p.text(title, x + 15, y + 12);
  p.textFont('DM Sans');
  p.textSize(13.5);
  let ry = y + 34;
  for (const r of rows) {
    if (r.sep) {
      p.stroke(41, 89, 144, 34);
      p.strokeWeight(1);
      p.line(x + 15, ry + 5, x + m.w - 15, ry + 5);
      p.noStroke();
      ry += 11;
      continue;
    }
    if (r.sw) {
      p.fill(r.sw);
      p.rect(x + 15, ry + 5, 11, 5, 2.5);
    }
    p.fill(r.dim ? 'rgba(65,85,111,.68)' : C.navy);
    p.textAlign(p.LEFT, p.TOP);
    p.text(r.text ?? '', x + (r.sw ? 34 : 15), ry);
    ry += 20;
  }
  return m;
}

/* park the panel in the emptiest corner of the plot box */
function placePanel(p: p5, M: Mg, w: number, h: number, busy: V[]) {
  const pad = 10;
  const cands = [
    { x: M.l + pad, y: M.t + pad },
    { x: p.width - M.r - w - pad, y: M.t + pad },
    { x: M.l + pad, y: p.height - M.b - h - pad },
    { x: p.width - M.r - w - pad, y: p.height - M.b - h - pad },
  ];
  let best = cands[0], bestHits = Infinity;
  for (const c of cands) {
    let hits = 0;
    for (const q of busy) {
      if (q.x > c.x - 14 && q.x < c.x + w + 14 && q.y > c.y - 14 && q.y < c.y + h + 14) hits++;
    }
    if (hits < bestHits) { bestHits = hits; best = c; }
    if (hits === 0) break;
  }
  return best;
}

/* ═════════ the physics, once ═════════ */
interface Geom {
  a: number; b: number;
  gc: number; gs: number;
  sgn: number;
  T: number; R: number; Hp: number;
  ex: V; ey: V;
  xp: (t: number) => number;
  yp: (t: number) => number;
  pos: (t: number) => V;
  along: (d: number) => V;
  tApex: number;
  lineAng: number;                   // screen angle of the SURFACE (labels read left→right)
  exAng: number;                     // screen angle of the direction of travel
  perp: number;                      // sign that turns x′ into y′ in screen angles
}

/* The hill always rises to the right. "Up the incline" launches from the foot and
   travels up-right; "down the incline" launches part-way up the same hillside and
   travels down-left. Only the embedding in world coordinates differs - the rotated
   frame maths below is identical for the two cases.                              */
function geom(u: number, aDeg: number, bDeg: number, dir: Dir): Geom {
  const a = rad(aDeg), b = rad(bDeg);
  const gc = G * Math.cos(a), gs = G * Math.sin(a);
  const sgn = dir === 'up' ? -1 : 1;
  const T = (2 * u * Math.sin(b)) / gc;
  const xp = (t: number) => u * Math.cos(b) * t + 0.5 * sgn * gs * t * t;
  const yp = (t: number) => u * Math.sin(b) * t - 0.5 * gc * t * t;
  const d = dir === 'up' ? 1 : -1;                 // travel direction along the hill
  const ex: V = { x: d * Math.cos(a), y: d * Math.sin(a) };
  const ey: V = { x: -Math.sin(a), y: Math.cos(a) };
  const pos = (t: number) => ({
    x: ex.x * xp(t) + ey.x * yp(t),
    y: ex.y * xp(t) + ey.y * yp(t),
  });
  return {
    a, b, gc, gs, sgn, T, R: xp(T),
    Hp: (u * Math.sin(b)) ** 2 / (2 * gc),
    ex, ey, xp, yp, pos,
    along: (s: number) => ({ x: ex.x * s, y: ex.y * s }),
    tApex: (u * Math.sin(b)) / gc,
    lineAng: -a,
    exAng: dir === 'up' ? -a : Math.PI - a,
    perp: dir === 'up' ? -1 : 1,
  };
}

/* screen-space unit vectors of the rotated axes */
const exS = (g: Geom): V => ({ x: g.ex.x, y: -g.ex.y });
const eyS = (g: Geom): V => ({ x: g.ey.x, y: -g.ey.y });

/* ═════════ scene pieces ═════════ */
/* The drawn hillside: `lo` is its foot, `hi` its top. Up the incline the launch
   IS the foot; down the incline the launch sits part-way up, so the hill carries
   on a little above it.                                                          */
function hillEnds(g: Geom, dir: Dir, len: number, back = 0) {
  return dir === 'up'
    ? { lo: { x: 0, y: 0 } as V, hi: g.along(len) }
    : { lo: g.along(len), hi: g.along(-back) };
}

function drawGround(p: p5, v: View, lo: V, hi: V) {
  p.noStroke();
  p.fill(41, 89, 144, 22);
  p.beginShape();
  p.vertex(v.X(lo.x), v.Y(lo.y));
  p.vertex(v.X(hi.x), v.Y(hi.y));
  p.vertex(v.X(hi.x), v.Y(lo.y));
  p.endShape(p.CLOSE);
  p.stroke(C.navy);
  p.strokeWeight(3.4);
  p.line(v.X(lo.x), v.Y(lo.y), v.X(hi.x), v.Y(hi.y));
}

/* α belongs at the foot of the hill, between the horizontal and the surface */
function drawAlpha(p: p5, v: View, g: Geom, aDeg: number, lo: V, run: number) {
  const ox = v.X(lo.x), oy = v.Y(lo.y);
  p.stroke(41, 89, 144, 105);
  p.strokeWeight(1.5);
  dashOn(p, [6, 6]);
  p.line(ox, oy, ox + run, oy);
  dashOff(p);
  arc(p, ox, oy, 42, g.lineAng, 0, C.violet);
  const m = g.lineAng / 2;
  label(p, `α = ${aDeg}°`, ox + Math.cos(m) * 64, oy + Math.sin(m) * 64, C.violet, 12.5);
}

function drawLaunch(p: p5, v: View, g: Geom, bDeg: number, len = 104, col = C.accent) {
  const ua = g.exAng + g.perp * g.b;
  p.stroke(col);
  p.strokeWeight(3.4);
  arrow(p, v.X(0), v.Y(0), v.X(0) + Math.cos(ua) * len, v.Y(0) + Math.sin(ua) * len, 12);
  arc(p, v.X(0), v.Y(0), 76, g.exAng, ua, C.amber);
  const m = g.exAng + (g.perp * g.b) / 2;
  label(p, `β = ${bDeg}°`, v.X(0) + Math.cos(m) * 106, v.Y(0) + Math.sin(m) * 106, C.amber, 12.5);
}

function drawYAxis(p: p5, v: View, g: Geom) {
  const na = g.exAng + (g.perp * Math.PI) / 2;
  p.stroke(41, 89, 144, 150);
  p.strokeWeight(1.8);
  dashOn(p, [4, 4]);
  arrow(p, v.X(0), v.Y(0), v.X(0) + Math.cos(na) * 62, v.Y(0) + Math.sin(na) * 62, 8);
  dashOff(p);
  label(p, 'y′', v.X(0) + Math.cos(na) * 78, v.Y(0) + Math.sin(na) * 78, C.dark, 12);
}

/* "x′ along the incline", set on the surface past the landing point */
function drawXAxis(p: p5, v: View, g: Geom, len: number) {
  const q = g.along((g.R + len) / 2);
  const e = eyS(g);
  label(p, 'x′  along the incline', v.X(q.x) + e.x * 15, v.Y(q.y) + e.y * 15,
    C.dark, 12, g.lineAng);
}

/* a measured band lying ON the surface - no floating arrows */
function drawRangeBand(p: p5, v: View, g: Geom, txt: string, col: string) {
  const end = g.along(g.R);
  const x1 = v.X(0), y1 = v.Y(0), x2 = v.X(end.x), y2 = v.Y(end.y);
  const e = eyS(g);
  p.stroke(fade(p, col, 78));
  p.strokeWeight(11);
  p.line(x1, y1, x2, y2);
  p.stroke(col);
  p.strokeWeight(2.6);
  p.line(x1 - e.x * 10, y1 - e.y * 10, x1 + e.x * 10, y1 + e.y * 10);
  p.line(x2 - e.x * 10, y2 - e.y * 10, x2 + e.x * 10, y2 + e.y * 10);
  p.noStroke();
  p.fill(col);
  p.circle(x2, y2, 11);
  label(p, txt, (x1 + x2) / 2 - e.x * 22, (y1 + y2) / 2 - e.y * 22, col, 13, g.lineAng);
}

function pathDots(p: p5, v: View, g: Geom, col: string, wt = 2) {
  p.noFill();
  p.stroke(col);
  p.strokeWeight(wt);
  dashOn(p, [5, 6]);
  p.beginShape();
  for (let i = 0; i <= 80; i++) { const q = g.pos((g.T * i) / 80); p.vertex(v.X(q.x), v.Y(q.y)); }
  p.endShape();
  dashOff(p);
}

/* screen points the panel should avoid */
function busyPoints(v: View, g: Geom, lo: V, hi: V): V[] {
  const out: V[] = [];
  for (let i = 0; i <= 24; i++) {
    const q = g.pos((g.T * i) / 24);
    out.push({ x: v.X(q.x), y: v.Y(q.y) });
    const k = i / 24;
    out.push({ x: v.X(lo.x + (hi.x - lo.x) * k), y: v.Y(lo.y + (hi.y - lo.y) * k) });
  }
  out.push({ x: v.X(0), y: v.Y(0) });
  return out;
}

/* ══════════════════════════════════════════════════════════════════════
   Pane 1 · Why rotate the axes?
   ══════════════════════════════════════════════════════════════════════ */
const why = { a: 30, rotated: false };
const WHY_U = 20, WHY_TH = 60;                 // launch angle fixed to the HORIZONTAL

const whySketch = (p: p5) => {
  const holder = document.getElementById('inWhyCanvas')!;
  const M = { l: 58, r: 40, t: 34, b: 44 };
  const canvasH = () => Math.max(380, Math.min(560, Math.round(holder.clientWidth * 0.42)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const th = rad(WHY_TH), al = rad(why.a);
    const gx = (t: number) => WHY_U * Math.cos(th) * t;
    const gy = (t: number) => WHY_U * Math.sin(th) * t - 0.5 * G * t * t;
    const tL = (2 * WHY_U * (Math.sin(th) - Math.cos(th) * Math.tan(al))) / G;
    const xL = gx(tL), yL = gy(tL);

    const tipX = xL * 1.16, tipY = tipX * Math.tan(al);
    const pts: V[] = [{ x: 0, y: 0 }, { x: tipX, y: tipY }];
    for (let i = 0; i <= 40; i++) pts.push({ x: gx((tL * i) / 40), y: gy((tL * i) / 40) });
    const v = fitView(p, M, pts, 0.09);

    /* hill */
    p.noStroke();
    p.fill(41, 89, 144, 22);
    p.beginShape();
    p.vertex(v.X(0), v.Y(0)); p.vertex(v.X(tipX), v.Y(tipY)); p.vertex(v.X(tipX), v.Y(0));
    p.endShape(p.CLOSE);
    p.stroke(C.navy); p.strokeWeight(3.4);
    p.line(v.X(0), v.Y(0), v.X(tipX), v.Y(tipY));

    /* flight */
    p.noFill(); p.stroke(C.accent); p.strokeWeight(3.2);
    p.beginShape();
    for (let i = 0; i <= 90; i++) p.vertex(v.X(gx((tL * i) / 90)), v.Y(gy((tL * i) / 90)));
    p.endShape();

    const busy: V[] = [];
    for (let i = 0; i <= 24; i++) {
      busy.push({ x: v.X(gx((tL * i) / 24)), y: v.Y(gy((tL * i) / 24)) });
      busy.push({ x: v.X((tipX * i) / 24), y: v.Y((tipY * i) / 24) });
    }

    if (!why.rotated) {
      /* old axes: the coupled landing condition */
      p.stroke(41, 89, 144, 120);
      p.strokeWeight(1.6);
      arrow(p, v.X(0), v.Y(0), v.X(tipX), v.Y(0), 8);
      arrow(p, v.X(0), v.Y(0), v.X(0), v.Y(v.y1 * 0.92), 8);
      label(p, 'x', v.X(tipX) - 6, v.Y(0) + 16, C.dark, 12, 0, false);
      label(p, 'y', v.X(0) - 16, v.Y(v.y1 * 0.92) + 4, C.dark, 12, 0, false);

      p.stroke(C.red); p.strokeWeight(1.8); dashOn(p, [6, 5]);
      p.line(v.X(xL), v.Y(yL), v.X(xL), v.Y(0));
      p.line(v.X(xL), v.Y(yL), v.X(0), v.Y(yL));
      dashOff(p);
      label(p, `x = ${xL.toFixed(1)} m`, v.X(xL / 2), v.Y(0) + 20, C.red, 12.5);
      label(p, `y = ${yL.toFixed(1)} m`, v.X(0) + 34, v.Y(yL), C.red, 12.5);
      arc(p, v.X(0), v.Y(0), 42, 0, -al, C.violet);
      label(p, `α = ${why.a}°`, v.X(0) + Math.cos(-al / 2) * 64, v.Y(0) + Math.sin(-al / 2) * 64, C.violet, 12.5);
    } else {
      /* rotated axes: y′ is all that matters */
      const ex: V = { x: Math.cos(al), y: Math.sin(al) };
      const ey: V = { x: -Math.sin(al), y: Math.cos(al) };
      const ox = v.X(0), oy = v.Y(0);
      p.stroke(C.green); p.strokeWeight(2.4);
      arrow(p, ox, oy, ox + ey.x * 74, oy - ey.y * 74, 10);
      label(p, 'y′', ox + ey.x * 90, oy - ey.y * 90, C.green, 12.5);
      label(p, 'x′  along the incline',
        v.X(ex.x * tipX * 0.78) + ey.x * 15, v.Y(ex.y * tipX * 0.78) - ey.y * 15, C.green, 12, -al);

      for (let i = 1; i < 10; i++) {
        const t = (tL * i) / 10;
        const X = gx(t), Y = gy(t);
        const xp = X * Math.cos(al) + Y * Math.sin(al);
        p.stroke(C.amber); p.strokeWeight(1.4); dashOn(p, [4, 4]);
        p.line(v.X(X), v.Y(Y), v.X(ex.x * xp), v.Y(ex.y * xp));
        dashOff(p);
        p.noStroke(); p.fill(C.amber); p.circle(v.X(X), v.Y(Y), 6);
      }
      arc(p, v.X(0), v.Y(0), 42, 0, -al, C.violet);
      label(p, `α = ${why.a}°`, v.X(0) + Math.cos(-al / 2) * 64, v.Y(0) + Math.sin(-al / 2) * 64, C.violet, 12.5);
    }

    ball(p, v.X(0), v.Y(0), C.accent, 15);
    p.noStroke(); p.fill(C.navy); p.circle(v.X(xL), v.Y(yL), 11);

    const rows: Row[] = why.rotated
      ? [
        { text: 'x′ runs ALONG the incline, y′ across it', dim: true },
        { text: 'Landing condition:   y′ = 0', sw: C.green },
        { text: 'One coordinate, back to zero - clean again', dim: true },
        { sep: true },
        { text: 'The amber drops are y′, the height above the slope', dim: true },
      ]
      : [
        { text: 'Ordinary horizontal / vertical axes', dim: true },
        { text: `Landing condition:   y = x tanα`, sw: C.red },
        { text: `${yL.toFixed(1)} = ${xL.toFixed(1)} × tan ${why.a}°`, sw: C.red },
        { sep: true },
        { text: 'x and y are tangled - "set y = 0" is gone', dim: true },
      ];
    const title = why.rotated ? 'ROTATED AXES' : 'THE OLD AXES';
    const m = panelSize(p, title, rows);
    const at = placePanel(p, M, m.w, m.h, busy);
    drawPanel(p, at.x, at.y, title, rows);
  };
};

function whyWire() {
  const a = document.getElementById('inWhyA') as HTMLInputElement;
  a.addEventListener('input', () => {
    why.a = +a.value;
    document.getElementById('inWhyAVal')!.textContent = `${why.a}°`;
  });
  const t = document.getElementById('inWhyToggle')!;
  t.addEventListener('click', () => {
    why.rotated = !why.rotated;
    t.textContent = why.rotated ? 'View: rotated axes ⇄ old axes' : 'View: old axes ⇄ rotated axes';
    document.getElementById('inWhyNote')!.innerHTML = why.rotated
      ? 'In the rotated frame the landing test is <b>y′ = 0</b> - exactly the trick that made flat-ground projectiles easy. The price: gravity is no longer along one axis, so it splits into two components.'
      : 'In the old axes the landing test is <b>y = x tanα</b>: the two coordinates are coupled, so you cannot just "set y = 0" any more. That is the whole problem with a tilted ground.';
  });
}

/* ══════════════════════════════════════════════════════════════════════
   Pane 2 · The rotated axes + the gravity split
   ══════════════════════════════════════════════════════════════════════ */
const ax = { a: 30, b: 30 };

function axReadout() {
  const opts = { throwOnError: false, displayMode: false };
  const gc = G * Math.cos(rad(ax.a)), gs = G * Math.sin(rad(ax.a));
  katex.render(
    String.raw`a_{y'}=-g\cos\alpha=-10\cos ${ax.a}^\circ=\mathbf{-${gc.toFixed(2)}}\ \text{m/s}^2\quad\text{(always, into the surface)}`,
    document.getElementById('inAxRo1')!, opts
  );
  katex.render(
    String.raw`|a_{x'}|=g\sin\alpha=10\sin ${ax.a}^\circ=\mathbf{${gs.toFixed(2)}}\ \text{m/s}^2\quad\text{(sign set by the launch direction)}`,
    document.getElementById('inAxRo2')!, opts
  );
}

const axSketch = (p: p5) => {
  const holder = document.getElementById('inAxCanvas')!;
  const M = { l: 60, r: 44, t: 36, b: 48 };
  const canvasH = () => Math.max(400, Math.min(580, Math.round(holder.clientWidth * 0.44)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const g = geom(20, ax.a, ax.b, 'up');
    const len = g.R * 1.18;
    const pts: V[] = [{ x: 0, y: 0 }, g.along(len)];
    for (let i = 0; i <= 40; i++) pts.push(g.pos((g.T * i) / 40));
    const v = fitView(p, M, pts, 0.12);

    const { lo, hi } = hillEnds(g, 'up', len);
    drawGround(p, v, lo, hi);
    drawAlpha(p, v, g, ax.a, lo, len * 0.4 * Math.cos(g.a) * v.s);
    drawXAxis(p, v, g, len);
    pathDots(p, v, g, 'rgba(41,89,144,0.42)', 2);
    drawYAxis(p, v, g);
    drawLaunch(p, v, g, ax.b);

    /* gravity hung off the particle at its highest point (most clearance) */
    const q = g.pos(g.tApex);
    const bx = v.X(q.x), by = v.Y(q.y);
    const gpx = Math.max(74, Math.min(118, p.height - M.b - by - 30));
    const ax1 = bx - exS(g).x * gpx * Math.sin(g.a), ay1 = by - exS(g).y * gpx * Math.sin(g.a);
    const px1 = bx - eyS(g).x * gpx * Math.cos(g.a), py1 = by - eyS(g).y * gpx * Math.cos(g.a);

    /* the parallelogram that proves it is a genuine resolution */
    p.stroke(41, 89, 144, 105); p.strokeWeight(1.3); dashOn(p, [4, 4]);
    p.line(ax1, ay1, bx + (ax1 - bx) + (px1 - bx), by + (ay1 - by) + (py1 - by));
    p.line(px1, py1, bx + (ax1 - bx) + (px1 - bx), by + (ay1 - by) + (py1 - by));
    dashOff(p);

    p.stroke(C.green); p.strokeWeight(3);
    arrow(p, bx, by, ax1, ay1, 10);
    label(p, 'g sinα', (bx + ax1) / 2 - 24, (by + ay1) / 2, C.green, 12);
    p.stroke(C.red); p.strokeWeight(3);
    arrow(p, bx, by, px1, py1, 10);
    label(p, 'g cosα', (bx + px1) / 2 + 26, (by + py1) / 2, C.red, 12);
    p.stroke(C.navy); p.strokeWeight(3.2);
    arrow(p, bx, by, bx, by + gpx, 11);
    label(p, 'g', bx + 16, by + gpx - 12, C.navy, 12.5);
    ball(p, bx, by, C.accent, 15);

    const rows: Row[] = [
      { text: 'Gravity never rotates - it splits', dim: true },
      { text: `along x′ :  g sinα = ${(G * Math.sin(g.a)).toFixed(2)} m/s²`, sw: C.green },
      { text: `along y′ :  g cosα = ${(G * Math.cos(g.a)).toFixed(2)} m/s²`, sw: C.red },
      { sep: true },
      { text: `u_x′ = u cosβ = ${(20 * Math.cos(g.b)).toFixed(1)} m/s` },
      { text: `u_y′ = u sinβ = ${(20 * Math.sin(g.b)).toFixed(1)} m/s` },
      { text: 'α from the horizontal, β from the incline', dim: true },
    ];
    const title = 'THE ROTATED FRAME  ·  u = 20 m/s';
    const m = panelSize(p, title, rows);
    const busy = busyPoints(v, g, lo, hi);
    busy.push({ x: bx, y: by }, { x: ax1, y: ay1 }, { x: px1, y: py1 }, { x: bx, y: by + gpx });
    const at = placePanel(p, M, m.w, m.h, busy);
    drawPanel(p, at.x, at.y, title, rows);
  };
};

function axWire() {
  const a = document.getElementById('inAxA') as HTMLInputElement;
  const b = document.getElementById('inAxB') as HTMLInputElement;
  a.addEventListener('input', () => {
    ax.a = +a.value;
    document.getElementById('inAxAVal')!.textContent = `${ax.a}°`;
    b.max = String(Math.min(80, 85 - ax.a));
    if (ax.b > +b.max) { ax.b = +b.max; b.value = b.max; document.getElementById('inAxBVal')!.textContent = `${ax.b}°`; }
    axReadout();
  });
  b.addEventListener('input', () => {
    ax.b = +b.value;
    document.getElementById('inAxBVal')!.textContent = `${ax.b}°`;
  });
  axReadout();
}

/* ══════════════════════════════════════════════════════════════════════
   Panes 3 & 4 · Case 1 (up the incline) and Case 2 (down the incline)
   ══════════════════════════════════════════════════════════════════════ */
interface CaseState {
  u: number; a: number; b: number;
  phase: 'ready' | 'flying' | 'landed';
  t: number; paused: boolean;
}
const up: CaseState = { u: 20, a: 30, b: 30, phase: 'ready', t: 0, paused: false };
const dn: CaseState = { u: 20, a: 30, b: 30, phase: 'ready', t: 0, paused: false };

interface CaseIds {
  canvas: string; u: string; a: string; b: string;
  uVal: string; aVal: string; bVal: string;
  go: string; pause: string; reset: string;
  fT: string; vT: string; fR: string; vR: string; fH: string; vH: string;
  note: string;
}
const upIds: CaseIds = {
  canvas: 'inUpCanvas', u: 'inUpU', a: 'inUpA', b: 'inUpB',
  uVal: 'inUpUVal', aVal: 'inUpAVal', bVal: 'inUpBVal',
  go: 'inUpGo', pause: 'inUpPause', reset: 'inUpReset',
  fT: 'inUpFT', vT: 'inUpVT', fR: 'inUpFR', vR: 'inUpVR', fH: 'inUpFH', vH: 'inUpVH',
  note: 'inUpNote',
};
const dnIds: CaseIds = {
  canvas: 'inDnCanvas', u: 'inDnU', a: 'inDnA', b: 'inDnB',
  uVal: 'inDnUVal', aVal: 'inDnAVal', bVal: 'inDnBVal',
  go: 'inDnGo', pause: 'inDnPause', reset: 'inDnReset',
  fT: 'inDnFT', vT: 'inDnVT', fR: 'inDnFR', vR: 'inDnVR', fH: 'inDnFH', vH: 'inDnVH',
  note: 'inDnNote',
};

function caseFormulas(ids: CaseIds, dir: Dir) {
  const opts = { throwOnError: false, displayMode: true };
  katex.render(String.raw`T=\dfrac{2u\sin\beta}{g\cos\alpha}`, document.getElementById(ids.fT)!, opts);
  katex.render(
    dir === 'up'
      ? String.raw`R=u\cos\beta\,T-\tfrac12 g\sin\alpha\,T^{2}`
      : String.raw`R=u\cos\beta\,T+\tfrac12 g\sin\alpha\,T^{2}`,
    document.getElementById(ids.fR)!, opts
  );
  katex.render(String.raw`H_{\perp}=\dfrac{u^{2}\sin^{2}\beta}{2g\cos\alpha}`, document.getElementById(ids.fH)!, opts);
}

function caseStats(st: CaseState, ids: CaseIds, dir: Dir) {
  const g = geom(st.u, st.a, st.b, dir);
  document.getElementById(ids.vT)!.textContent = `${g.T.toFixed(2)} s`;
  document.getElementById(ids.vR)!.textContent = `${g.R.toFixed(1)} m`;
  document.getElementById(ids.vH)!.textContent = `${g.Hp.toFixed(1)} m`;
  const flat = st.u * Math.cos(rad(st.b)) * g.T;
  const kick = 0.5 * G * Math.sin(g.a) * g.T * g.T;
  document.getElementById(ids.note)!.innerHTML = dir === 'up'
    ? `g cosα = <b>${(G * Math.cos(g.a)).toFixed(2)}</b> sets the clock; g sinα = <b>${(G * Math.sin(g.a)).toFixed(2)}</b>
       <b>fights</b> the along-slope motion: R = ${flat.toFixed(1)} − ${kick.toFixed(1)} = <b>${g.R.toFixed(1)} m</b>.
       Gravity ate ${kick.toFixed(1)} m of range.`
    : `g cosα = <b>${(G * Math.cos(g.a)).toFixed(2)}</b> sets the clock; g sinα = <b>${(G * Math.sin(g.a)).toFixed(2)}</b>
       <b>helps</b> the along-slope motion: R = ${flat.toFixed(1)} + ${kick.toFixed(1)} = <b>${g.R.toFixed(1)} m</b>.
       Gravity added ${kick.toFixed(1)} m of range.`;
}

function caseSketch(st: CaseState, ids: CaseIds, dir: Dir) {
  return (p: p5) => {
    const holder = document.getElementById(ids.canvas)!;
    const M = { l: 58, r: 44, t: 36, b: 48 };
    const canvasH = () => Math.max(420, Math.min(620, Math.round(holder.clientWidth * 0.46)));

    p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
    p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

    p.draw = () => {
      p.background(C.paper);
      const g = geom(st.u, st.a, st.b, dir);
      const len = g.R * 1.22;
      const back = dir === 'up' ? 0 : g.R * 0.18;      // hillside above a down-slope launch
      const { lo, hi } = hillEnds(g, dir, len, back);
      const pts: V[] = [{ x: 0, y: 0 }, lo, hi, { x: hi.x, y: lo.y }];
      for (let i = 0; i <= 40; i++) pts.push(g.pos((g.T * i) / 40));
      const v = fitView(p, M, pts, 0.12);

      drawGround(p, v, lo, hi);
      drawAlpha(p, v, g, st.a, lo, len * 0.34 * Math.cos(g.a) * v.s);
      drawRangeBand(p, v, g, `R = ${g.R.toFixed(1)} m`, C.red);
      drawXAxis(p, v, g, len);
      pathDots(p, v, g, 'rgba(41,89,144,0.4)');

      /* greatest distance from the surface */
      const qa = g.pos(g.tApex);
      const fa = g.along(g.xp(g.tApex));
      p.stroke(C.amber); p.strokeWeight(1.7); dashOn(p, [5, 5]);
      p.line(v.X(qa.x), v.Y(qa.y), v.X(fa.x), v.Y(fa.y));
      dashOff(p);
      p.noStroke(); p.fill(C.amber); p.circle(v.X(qa.x), v.Y(qa.y), 8);
      label(p, `H⊥ = ${g.Hp.toFixed(1)} m`,
        (v.X(qa.x) + v.X(fa.x)) / 2 + exS(g).x * 34, (v.Y(qa.y) + v.Y(fa.y)) / 2 + exS(g).y * 34,
        C.amber, 12.5);

      drawYAxis(p, v, g);
      drawLaunch(p, v, g, st.b);

      if (st.phase === 'flying' && !st.paused) {
        st.t += (p.deltaTime / 1000) * Math.max(1, g.T / 3);
        if (st.t >= g.T) { st.t = g.T; st.phase = 'landed'; }
      }

      const t = st.phase === 'ready' ? 0 : st.t;
      const q = g.pos(t);
      const bx = v.X(q.x), by = v.Y(q.y);
      const vxp = st.u * Math.cos(g.b) + g.sgn * g.gs * t;
      const vyp = st.u * Math.sin(g.b) - g.gc * t;

      if (st.phase !== 'ready') {
        p.noFill(); p.stroke(C.accent); p.strokeWeight(3.6);
        p.beginShape();
        for (let i = 0; i <= 80; i++) { const w = g.pos((t * i) / 80); p.vertex(v.X(w.x), v.Y(w.y)); }
        p.endShape();

        const foot = g.along(g.xp(t));
        p.stroke(C.red); p.strokeWeight(1.8); dashOn(p, [5, 4]);
        p.line(bx, by, v.X(foot.x), v.Y(foot.y));
        dashOff(p);

        const vs = 3.4;
        p.stroke(C.green); p.strokeWeight(2.6);
        arrow(p, bx, by, bx + exS(g).x * vxp * vs, by + exS(g).y * vxp * vs, 9);
        p.stroke(C.red);
        arrow(p, bx, by, bx + eyS(g).x * vyp * vs, by + eyS(g).y * vyp * vs, 9);
        ball(p, bx, by, C.accent, 17);
      } else {
        ball(p, v.X(0), v.Y(0), C.accent, 16);
      }

      const sign = dir === 'up' ? '−' : '+';
      const flat = st.u * Math.cos(g.b) * g.T;
      const kick = 0.5 * g.gs * g.T * g.T;
      const rows: Row[] = [
        { text: `u = ${st.u} m/s   ·   α = ${st.a}°   ·   β = ${st.b}° from the incline`, dim: true },
        { text: `a_x′ = ${sign}g sinα = ${sign}${g.gs.toFixed(2)} m/s²   ${dir === 'up' ? 'opposes' : 'assists'}`, sw: C.green },
        { text: `a_y′ = −g cosα = −${g.gc.toFixed(2)} m/s²   into the surface`, sw: C.red },
        { sep: true },
        { text: `T = 2u sinβ / g cosα = ${g.T.toFixed(2)} s` },
        { text: `R = ${flat.toFixed(1)} ${sign} ${kick.toFixed(1)} = ${g.R.toFixed(1)} m` },
        { sep: true },
        { text: `t = ${t.toFixed(2)} s    x′ = ${g.xp(t).toFixed(1)} m    y′ = ${g.yp(t).toFixed(2)} m`, dim: st.phase === 'ready' },
        { text: `v_x′ = ${vxp.toFixed(1)}    v_y′ = ${vyp.toFixed(1)} m/s`, dim: st.phase === 'ready' },
      ];
      const title = dir === 'up' ? 'CASE 1 · UP THE INCLINE' : 'CASE 2 · DOWN THE INCLINE';
      const m = panelSize(p, title, rows);
      const busy = busyPoints(v, g, lo, hi);
      busy.push({ x: bx, y: by });
      const at = placePanel(p, M, m.w, m.h, busy);
      drawPanel(p, at.x, at.y, title, rows);

      if (st.phase === 'landed') {
        label(p, `LANDED  ·  T = ${g.T.toFixed(2)} s  ·  R = ${g.R.toFixed(1)} m`,
          p.width / 2, p.height - 22, C.green, 15);
      } else if (st.phase === 'ready') {
        label(p, dir === 'up'
          ? 'Press Launch - watch v_x′ shrink as g sinα drags it back'
          : 'Press Launch - watch v_x′ grow as g sinα pushes it on',
          p.width / 2, p.height - 22, C.dark, 13.5);
      }
    };
  };
}

function caseWire(st: CaseState, ids: CaseIds, dir: Dir) {
  const u = document.getElementById(ids.u) as HTMLInputElement;
  const a = document.getElementById(ids.a) as HTMLInputElement;
  const b = document.getElementById(ids.b) as HTMLInputElement;
  const reset = () => {
    st.t = 0; st.phase = 'ready'; st.paused = false;
    document.getElementById(ids.pause)!.textContent = '⏸ Pause';
  };
  const capBeta = () => {
    if (dir !== 'up') return;
    b.max = String(Math.min(80, 85 - st.a));
    if (st.b > +b.max) { st.b = +b.max; b.value = b.max; document.getElementById(ids.bVal)!.textContent = `${st.b}°`; }
  };
  u.addEventListener('input', () => {
    st.u = +u.value;
    document.getElementById(ids.uVal)!.textContent = `${st.u} m/s`;
    reset(); caseStats(st, ids, dir);
  });
  a.addEventListener('input', () => {
    st.a = +a.value;
    document.getElementById(ids.aVal)!.textContent = `${st.a}°`;
    capBeta(); reset(); caseStats(st, ids, dir);
  });
  b.addEventListener('input', () => {
    st.b = +b.value;
    document.getElementById(ids.bVal)!.textContent = `${st.b}°`;
    reset(); caseStats(st, ids, dir);
  });
  document.getElementById(ids.go)!.addEventListener('click', () => { reset(); st.phase = 'flying'; });
  document.getElementById(ids.pause)!.addEventListener('click', () => {
    st.paused = !st.paused;
    document.getElementById(ids.pause)!.textContent = st.paused ? '▶ Resume' : '⏸ Pause';
  });
  document.getElementById(ids.reset)!.addEventListener('click', reset);
  capBeta();
  caseFormulas(ids, dir);
  caseStats(st, ids, dir);
}

/* ══════════════════════════════════════════════════════════════════════
   Pane 5 · Side by side - same u, α, β, opposite directions
   ══════════════════════════════════════════════════════════════════════ */
const cmp = { u: 20, a: 30, b: 30, phase: 'ready' as 'ready' | 'flying' | 'landed', t: 0 };

function cmpTable() {
  const gu = geom(cmp.u, cmp.a, cmp.b, 'up');
  const gd = geom(cmp.u, cmp.a, cmp.b, 'down');
  const kick = 0.5 * G * Math.sin(rad(cmp.a)) * gu.T * gu.T;
  const flat = cmp.u * Math.cos(rad(cmp.b)) * gu.T;
  document.getElementById('inCmpTable')!.innerHTML = `
    <div class="pl-eqcol">
      <div class="pl-eqhead" style="color:${C.accent}">UP the incline&nbsp;&nbsp;(a_x′ = −g sinα)</div>
      <div class="pl-eqrow">T = 2u sinβ / g cosα = <b>${gu.T.toFixed(2)} s</b></div>
      <div class="pl-eqrow">R = ${flat.toFixed(1)} <b>−</b> ${kick.toFixed(1)} = <b>${gu.R.toFixed(1)} m</b></div>
    </div>
    <div class="pl-eqcol">
      <div class="pl-eqhead" style="color:${C.amber}">DOWN the incline&nbsp;&nbsp;(a_x′ = +g sinα)</div>
      <div class="pl-eqrow">T = 2u sinβ / g cosα = <b>${gd.T.toFixed(2)} s</b></div>
      <div class="pl-eqrow">R = ${flat.toFixed(1)} <b>+</b> ${kick.toFixed(1)} = <b>${gd.R.toFixed(1)} m</b></div>
    </div>`;
  document.getElementById('inCmpNote')!.innerHTML =
    `Time of flight is <b>identical</b> (${gu.T.toFixed(2)} s both ways) - it is set by the perpendicular motion, which never
     hears about the direction along the slope. Range differs by <b>${(gd.R - gu.R).toFixed(1)} m</b>
     (${gu.R.toFixed(1)} m up vs ${gd.R.toFixed(1)} m down, a ratio of <b>${(gd.R / gu.R).toFixed(2)}×</b>) - because the SIGN of
     g sinα flips: it eats ${kick.toFixed(1)} m going up and adds ${kick.toFixed(1)} m going down.`;
}

const cmpSketch = (p: p5) => {
  const holder = document.getElementById('inCmpCanvas')!;
  const M = { l: 58, r: 46, t: 36, b: 48 };
  const canvasH = () => Math.max(440, Math.min(640, Math.round(holder.clientWidth * 0.48)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const gu = geom(cmp.u, cmp.a, cmp.b, 'up');
    const gd = geom(cmp.u, cmp.a, cmp.b, 'down');
    /* ONE hillside: the launcher sits part-way up it and fires both ways */
    const lenU = gu.R * 1.16, lenD = gd.R * 1.1;
    const hi = gu.along(lenU), lo = gd.along(lenD);
    const pts: V[] = [{ x: 0, y: 0 }, hi, lo, { x: hi.x, y: lo.y }];
    for (let i = 0; i <= 30; i++) {
      pts.push(gu.pos((gu.T * i) / 30));
      pts.push(gd.pos((gd.T * i) / 30));
    }
    const v = fitView(p, M, pts, 0.1);

    drawGround(p, v, lo, hi);
    drawAlpha(p, v, gu, cmp.a, lo, (hi.x - lo.x) * 0.3 * v.s);

    drawRangeBand(p, v, gu, `R = ${gu.R.toFixed(1)} m`, C.accent);
    drawRangeBand(p, v, gd, `R = ${gd.R.toFixed(1)} m`, C.amber);
    label(p, 'up the incline →', v.X(hi.x) + eyS(gu).x * 16, v.Y(hi.y) + eyS(gu).y * 16,
      C.accent, 12, gu.lineAng);
    label(p, '← down the incline', v.X(lo.x) + eyS(gd).x * 16, v.Y(lo.y) + eyS(gd).y * 16,
      C.amber, 12, gd.lineAng);
    drawYAxis(p, v, gu);
    drawLaunch(p, v, gu, cmp.b, 88, C.accent);
    drawLaunch(p, v, gd, cmp.b, 88, C.amber);

    pathDots(p, v, gu, 'rgba(0,160,227,0.5)');
    pathDots(p, v, gd, 'rgba(245,158,11,0.6)');

    /* both launches share one clock */
    if (cmp.phase === 'flying') {
      cmp.t += (p.deltaTime / 1000) * Math.max(1, gu.T / 3);
      if (cmp.t >= gu.T) { cmp.t = gu.T; cmp.phase = 'landed'; }
    }
    const t = cmp.phase === 'ready' ? 0 : cmp.t;
    if (cmp.phase !== 'ready') {
      const trace = (g: Geom, col: string) => {
        p.noFill(); p.stroke(col); p.strokeWeight(3.6);
        p.beginShape();
        for (let i = 0; i <= 70; i++) { const q = g.pos((t * i) / 70); p.vertex(v.X(q.x), v.Y(q.y)); }
        p.endShape();
      };
      trace(gu, C.accent);
      trace(gd, C.amber);
      const qu = gu.pos(t), qd = gd.pos(t);
      ball(p, v.X(qu.x), v.Y(qu.y), C.accent, 17);
      ball(p, v.X(qd.x), v.Y(qd.y), C.amber, 17);
    } else {
      ball(p, v.X(0), v.Y(0), C.navy, 17);
    }

    const rows: Row[] = [
      { text: `u = ${cmp.u} m/s   ·   α = ${cmp.a}°   ·   β = ${cmp.b}° - both launches`, dim: true },
      { text: `up:     T = ${gu.T.toFixed(2)} s     R = ${gu.R.toFixed(1)} m`, sw: C.accent },
      { text: `down:  T = ${gd.T.toFixed(2)} s     R = ${gd.R.toFixed(1)} m`, sw: C.amber },
      { sep: true },
      { text: 'Same clock. The sign of g sinα is the only difference.', dim: true },
      { text: `t = ${t.toFixed(2)} s${cmp.phase === 'landed' ? '   ·   both landed' : ''}`, dim: cmp.phase === 'ready' },
    ];
    const title = 'SAME u, α, β  ·  OPPOSITE DIRECTIONS';
    const m = panelSize(p, title, rows);
    const busy: V[] = [];
    for (let i = 0; i <= 24; i++) {
      const a1 = gu.pos((gu.T * i) / 24), b1 = gd.pos((gd.T * i) / 24);
      const s1 = gu.along((lenU * i) / 24), s2 = gd.along((lenD * i) / 24);
      busy.push({ x: v.X(a1.x), y: v.Y(a1.y) }, { x: v.X(b1.x), y: v.Y(b1.y) },
        { x: v.X(s1.x), y: v.Y(s1.y) }, { x: v.X(s2.x), y: v.Y(s2.y) });
    }
    const at = placePanel(p, M, m.w, m.h, busy);
    drawPanel(p, at.x, at.y, title, rows);

    if (cmp.phase === 'landed') {
      label(p, `BOTH LANDED at t = ${gu.T.toFixed(2)} s   ·   ${gu.R.toFixed(1)} m up  vs  ${gd.R.toFixed(1)} m down`,
        p.width / 2, p.height - 22, C.green, 15);
    } else if (cmp.phase === 'ready') {
      label(p, 'Two scenarios from one launch point - press Launch both',
        p.width / 2, p.height - 22, C.dark, 13.5);
    }
  };
};

function cmpWire() {
  const u = document.getElementById('inCmpU') as HTMLInputElement;
  const a = document.getElementById('inCmpA') as HTMLInputElement;
  const b = document.getElementById('inCmpB') as HTMLInputElement;
  const reset = () => { cmp.t = 0; cmp.phase = 'ready'; };
  const capBeta = () => {
    b.max = String(Math.min(80, 85 - cmp.a));
    if (cmp.b > +b.max) { cmp.b = +b.max; b.value = b.max; document.getElementById('inCmpBVal')!.textContent = `${cmp.b}°`; }
  };
  u.addEventListener('input', () => {
    cmp.u = +u.value;
    document.getElementById('inCmpUVal')!.textContent = `${cmp.u} m/s`;
    reset(); cmpTable();
  });
  a.addEventListener('input', () => {
    cmp.a = +a.value;
    document.getElementById('inCmpAVal')!.textContent = `${cmp.a}°`;
    capBeta(); reset(); cmpTable();
  });
  b.addEventListener('input', () => {
    cmp.b = +b.value;
    document.getElementById('inCmpBVal')!.textContent = `${cmp.b}°`;
    reset(); cmpTable();
  });
  document.getElementById('inCmpGo')!.addEventListener('click', () => { reset(); cmp.phase = 'flying'; });
  document.getElementById('inCmpReset')!.addEventListener('click', reset);
  capBeta();
  cmpTable();
}

/* ══════════════════════════════════════════════════════════════════════
   Pane 6 · Maximum range up the incline
   ══════════════════════════════════════════════════════════════════════ */
const mx = { u: 20, a: 30, b: 30 };

const rangeUp = (u: number, a: number, b: number) =>
  (2 * u * u * Math.sin(b) * Math.cos(b + a)) / (G * Math.cos(a) ** 2);
const rangeDown = (u: number, a: number, b: number) =>
  (2 * u * u * Math.sin(b) * Math.cos(b - a)) / (G * Math.cos(a) ** 2);

function mxReadout() {
  const a = rad(mx.a);
  const bOpt = (90 - mx.a) / 2;
  const rMax = (mx.u * mx.u) / (G * (1 + Math.sin(a)));
  const opts = { throwOnError: false, displayMode: false };
  katex.render(
    String.raw`\beta_{\text{opt}}=\dfrac{90^\circ-\alpha}{2}=\dfrac{90^\circ-${mx.a}^\circ}{2}=\mathbf{${bOpt.toFixed(1)}^\circ}\ \text{from the incline}`,
    document.getElementById('inMaxRo1')!, opts
  );
  katex.render(
    String.raw`R_{\max}=\dfrac{u^{2}}{g(1+\sin\alpha)}=\dfrac{${mx.u}^{2}}{10(1+\sin ${mx.a}^\circ)}=\mathbf{${rMax.toFixed(1)}\ \text{m}}`,
    document.getElementById('inMaxRo2')!, opts
  );
  document.getElementById('inMaxNote')!.innerHTML =
    `Right now β = <b>${mx.b}°</b> gives R = <b>${rangeUp(mx.u, a, rad(mx.b)).toFixed(1)} m</b>;
     the best possible is <b>${rMax.toFixed(1)} m</b> at β = ${bOpt.toFixed(1)}°.
     Set α = 0 and the formulas collapse to β = 45° and R = u²/g - Lecture 11's flat-ground result was
     never a separate fact.`;
}

const mxTrajSketch = (p: p5) => {
  const holder = document.getElementById('inMaxTrajCanvas')!;
  const M = { l: 44, r: 36, t: 32, b: 40 };
  const canvasH = () => Math.max(320, Math.min(420, Math.round(holder.clientWidth * 0.66)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const bOpt = (90 - mx.a) / 2;
    const g = geom(mx.u, mx.a, mx.b, 'up');
    const gOpt = geom(mx.u, mx.a, bOpt, 'up');
    const len = Math.max(g.R, gOpt.R) * 1.16;
    const pts: V[] = [{ x: 0, y: 0 }, g.along(len)];
    for (let i = 0; i <= 30; i++) {
      pts.push(g.pos((g.T * i) / 30));
      pts.push(gOpt.pos((gOpt.T * i) / 30));
    }
    const v = fitView(p, M, pts, 0.12);

    const { lo, hi } = hillEnds(g, 'up', len);
    drawGround(p, v, lo, hi);
    drawAlpha(p, v, g, mx.a, lo, len * 0.4 * Math.cos(g.a) * v.s);

    /* the optimal launch, ghosted */
    p.noFill(); p.stroke(fade(p, C.green, 150)); p.strokeWeight(2.4); dashOn(p, [5, 5]);
    p.beginShape();
    for (let i = 0; i <= 70; i++) { const q = gOpt.pos((gOpt.T * i) / 70); p.vertex(v.X(q.x), v.Y(q.y)); }
    p.endShape();
    dashOff(p);
    const eo = gOpt.along(gOpt.R);
    p.noStroke(); p.fill(C.green); p.circle(v.X(eo.x), v.Y(eo.y), 10);

    /* your launch */
    p.noFill(); p.stroke(C.accent); p.strokeWeight(3.2);
    p.beginShape();
    for (let i = 0; i <= 70; i++) { const q = g.pos((g.T * i) / 70); p.vertex(v.X(q.x), v.Y(q.y)); }
    p.endShape();
    const e1 = g.along(g.R);
    p.noStroke(); p.fill(C.accent); p.circle(v.X(e1.x), v.Y(e1.y), 10);
    ball(p, v.X(0), v.Y(0), C.navy, 14);

    const rows: Row[] = [
      { text: `β = ${mx.b}°  →  R = ${g.R.toFixed(1)} m`, sw: C.accent },
      { text: `β_opt = ${bOpt.toFixed(1)}°  →  R = ${gOpt.R.toFixed(1)} m`, sw: C.green },
    ];
    const title = 'YOUR LAUNCH vs THE BEST ONE';
    const m = panelSize(p, title, rows);
    const busy = busyPoints(v, g, lo, hi);
    for (let i = 0; i <= 20; i++) {
      const q = gOpt.pos((gOpt.T * i) / 20);
      busy.push({ x: v.X(q.x), y: v.Y(q.y) });
    }
    const at = placePanel(p, M, m.w, m.h, busy);
    drawPanel(p, at.x, at.y, title, rows);
  };
};

const mxCurveSketch = (p: p5) => {
  const holder = document.getElementById('inMaxCurveCanvas')!;
  const M = { l: 58, r: 28, t: 44, b: 52 };
  const canvasH = () => Math.max(320, Math.min(420, Math.round(holder.clientWidth * 0.66)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const a = rad(mx.a);
    const bOpt = (90 - mx.a) / 2;
    const rMax = (mx.u * mx.u) / (G * (1 + Math.sin(a)));
    const rMaxDown = (mx.u * mx.u) / (G * (1 - Math.sin(a)));
    const yTop = Math.min(rMaxDown * 1.14, rMax * 3.2);
    const px = (bDeg: number) => M.l + (bDeg / 90) * (p.width - M.l - M.r);
    const py = (r: number) => p.height - M.b - (r / yTop) * (p.height - M.t - M.b);

    p.stroke(41, 89, 144, 22); p.strokeWeight(1);
    for (let bd = 0; bd <= 90; bd += 15) p.line(px(bd), M.t, px(bd), p.height - M.b);
    const rStep = yTop > 160 ? 50 : yTop > 90 ? 25 : yTop > 45 ? 10 : 5;
    for (let r = 0; r <= yTop; r += rStep) p.line(M.l, py(r), p.width - M.r, py(r));
    p.stroke(C.navy); p.strokeWeight(2);
    p.line(M.l, py(0), p.width - M.r, py(0));
    p.line(M.l, M.t, M.l, py(0));
    p.noStroke(); p.fill(C.ink); p.textFont('DM Sans'); p.textSize(12);
    p.textAlign(p.CENTER, p.TOP);
    for (let bd = 0; bd <= 90; bd += 15) p.text(`${bd}°`, px(bd), py(0) + 8);
    p.textAlign(p.RIGHT, p.CENTER);
    for (let r = rStep; r <= yTop; r += rStep) p.text(`${r}`, M.l - 8, py(r));
    p.textFont('Bricolage Grotesque'); p.textSize(12);
    p.fill(C.dark);
    p.textAlign(p.LEFT, p.BOTTOM);
    p.text('RANGE  R (m)', M.l - 2, M.t - 10);
    p.textAlign(p.RIGHT, p.TOP);
    p.text('LAUNCH ANGLE β FROM THE INCLINE', p.width - M.r, py(0) + 26);

    const curve = (fn: (b: number) => number, col: unknown, wt = 3) => {
      p.noFill(); p.stroke(col as string); p.strokeWeight(wt);
      let open = false;
      for (let bd = 0; bd <= 90; bd += 0.5) {
        const r = fn(rad(bd));
        if (r < 0 || r > yTop) { if (open) { p.endShape(); open = false; } continue; }
        if (!open) { p.beginShape(); open = true; }
        p.vertex(px(bd), py(r));
      }
      if (open) p.endShape();
    };
    curve((b) => rangeDown(mx.u, a, b), fade(p, C.amber, 205), 2.6);
    curve((b) => rangeUp(mx.u, a, b), C.accent);

    /* the up-slope peak */
    p.stroke(C.green); p.strokeWeight(1.6); dashOn(p, [5, 5]);
    p.line(px(bOpt), py(0), px(bOpt), py(rMax));
    p.line(M.l, py(rMax), px(bOpt), py(rMax));
    dashOff(p);
    p.noStroke(); p.fill(C.green); p.circle(px(bOpt), py(rMax), 11);
    label(p, `β_opt = ${bOpt.toFixed(1)}°   R_max = ${rMax.toFixed(1)} m`,
      px(bOpt) + 4, py(rMax) - 24, C.green, 12.5);

    const bOptD = (90 + mx.a) / 2;
    if (rMaxDown <= yTop) {
      p.noStroke(); p.fill(C.amber); p.circle(px(bOptD), py(rMaxDown), 10);
      label(p, `down: peak at ${bOptD.toFixed(1)}°`, px(bOptD), py(rMaxDown) - 22, C.amber, 12);
    } else {
      label(p, `down-slope peak off the chart: ${bOptD.toFixed(1)}° → ${rMaxDown.toFixed(0)} m`,
        px(Math.min(bOptD, 72)), M.t + 12, C.amber, 12);
    }

    /* where you are now */
    const rNow = Math.max(rangeUp(mx.u, a, rad(mx.b)), 0);
    p.stroke(C.accent); p.strokeWeight(1.5); dashOn(p, [4, 4]);
    p.line(px(mx.b), py(0), px(mx.b), py(rNow));
    dashOff(p);
    p.noStroke(); p.fill(C.accent); p.circle(px(mx.b), py(rNow), 12);
    label(p, `β = ${mx.b}° → ${rNow.toFixed(1)} m`, px(mx.b), py(rNow) + 26, C.accent, 12.5);
  };
};

function mxWire() {
  const u = document.getElementById('inMaxU') as HTMLInputElement;
  const a = document.getElementById('inMaxA') as HTMLInputElement;
  const b = document.getElementById('inMaxB') as HTMLInputElement;
  const cap = () => {
    b.max = String(Math.min(85, 88 - mx.a));
    if (mx.b > +b.max) { mx.b = +b.max; b.value = b.max; document.getElementById('inMaxBVal')!.textContent = `${mx.b}°`; }
  };
  u.addEventListener('input', () => {
    mx.u = +u.value;
    document.getElementById('inMaxUVal')!.textContent = `${mx.u} m/s`;
    mxReadout();
  });
  a.addEventListener('input', () => {
    mx.a = +a.value;
    document.getElementById('inMaxAVal')!.textContent = `${mx.a}°`;
    cap(); mxReadout();
  });
  b.addEventListener('input', () => {
    mx.b = +b.value;
    document.getElementById('inMaxBVal')!.textContent = `${mx.b}°`;
    mxReadout();
  });
  document.getElementById('inMaxSnap')!.addEventListener('click', () => {
    mx.b = Math.round((90 - mx.a) / 2);
    b.value = String(mx.b);
    document.getElementById('inMaxBVal')!.textContent = `${mx.b}°`;
    mxReadout();
  });
  cap();
  mxReadout();
}

/* ══════════════════════════════════════════════════════════════════════
   Pane 7 · Rapid Fire
   ══════════════════════════════════════════════════════════════════════ */
interface Rq { q: string; opts: string[]; correct: number; fb: string }

const rqs: Rq[] = [
  {
    q: 'Why do we rotate the axes for an inclined-plane projectile?',
    opts: ['Because gravity changes direction on a slope',
      'So the landing condition becomes y′ = 0 instead of y = x tanα',
      'Because the range formula only works on tilted axes'],
    correct: 1,
    fb: 'Gravity never moves. We choose axes that simplify the CONSTRAINT: with x′ along the slope, landing is just y′ back to zero.',
  },
  {
    q: 'In the rotated frame, the acceleration perpendicular to the incline is:',
    opts: ['−g cosα, always, into the surface', '−g sinα, into the surface', 'zero'],
    correct: 0,
    fb: 'a_y′ = −g cosα for BOTH cases. It is the perpendicular component of gravity and it never changes sign.',
  },
  {
    q: 'A particle is projected UP the incline. The along-slope acceleration is:',
    opts: ['+g sinα (helps the motion)', '−g sinα (opposes the motion)', '−g cosα'],
    correct: 1,
    fb: 'Going up the slope, gravity\'s along-slope component points back down the hill: a_x′ = −g sinα, and range shrinks.',
  },
  {
    q: 'Same u, same α, same β - one launched up the slope, one down. Their times of flight are:',
    opts: ['Longer for the down-slope one', 'Longer for the up-slope one', 'Exactly the same'],
    correct: 2,
    fb: 'T = 2u sinβ / (g cosα) for both. Timing is decided by the perpendicular motion, which is identical in the two cases.',
  },
  {
    q: 'Why is the time of flight the same in both cases?',
    opts: ['Because the ranges happen to be equal',
      'Because the perpendicular motion is unaffected by the direction along the slope',
      'Because g sinα cancels g cosα'],
    correct: 1,
    fb: 'The clock is set by y′: u_y′ = u sinβ and a_y′ = −g cosα in both cases. The sign flip lives only in the x′ equation.',
  },
  {
    q: 'β is measured from...',
    opts: ['the horizontal', 'the incline surface', 'the vertical'],
    correct: 1,
    fb: 'α is from the horizontal, β is from the INCLINE. Mixing them is the single most common mistake in this topic.',
  },
  {
    q: 'The launch angle for maximum range UP an incline of angle α is:',
    opts: ['45° from the incline', '(90° − α)/2 from the incline', '(90° + α)/2 from the incline'],
    correct: 1,
    fb: 'β_opt = (90° − α)/2 from the incline, giving R_max = u²/(g(1 + sinα)). (Down the slope it is (90° + α)/2.)',
  },
  {
    q: 'Put α = 0 into R_max = u²/(g(1 + sinα)). You get:',
    opts: ['u²/g, the flat-ground result', 'zero', 'u²/2g'],
    correct: 0,
    fb: 'sin0 = 0, so R_max = u²/g at β = 45°. The flat-ground formula is just the incline formula with α = 0.',
  },
];

let rqIdx = 0;
const rqDone: boolean[] = new Array(rqs.length).fill(false);

function rqRender() {
  const item = rqs[rqIdx];
  document.getElementById('inqTag')!.textContent = `Inclined-plane rapid fire · Question ${rqIdx + 1} / ${rqs.length}`;
  document.getElementById('inqQ')!.textContent = item.q;
  const fb = document.getElementById('inqFb')!;
  fb.classList.remove('shown');
  fb.textContent = item.fb;
  const holder = document.getElementById('inqOpts')!;
  holder.innerHTML = '';
  item.opts.forEach((opt, i) => {
    const b = document.createElement('button');
    b.className = 'rev-opt';
    b.textContent = opt;
    b.addEventListener('click', () => {
      if (rqDone[rqIdx]) return;
      rqDone[rqIdx] = true;
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

function rqWire() {
  document.getElementById('inqPrev')!.addEventListener('click', () => {
    if (rqIdx > 0) { rqIdx--; rqRender(); }
  });
  document.getElementById('inqNext')!.addEventListener('click', () => {
    if (rqIdx < rqs.length - 1) { rqIdx++; rqRender(); }
  });
  rqRender();
}

/* ══════════════════════════════════════════════════════════════════════
   Pane 8 · Homework
   ══════════════════════════════════════════════════════════════════════ */
function homeworkWire() {
  document.querySelectorAll<HTMLButtonElement>('#inHw .hw-reveal').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ans = btn.nextElementSibling as HTMLElement | null;
      if (!ans) return;
      const shown = ans.classList.toggle('shown');
      btn.textContent = shown ? 'Hide solution' : 'Show solution';
    });
  });
}

/* ══════════════════════════════════════════════════════════════════════
   pane switching + init
   ══════════════════════════════════════════════════════════════════════ */
const paneIds = ['inWhy', 'inAxes', 'inUp', 'inDn', 'inCmp', 'inMax', 'inQuiz', 'inHw'] as const;
type PaneId = (typeof paneIds)[number];
let currentPane: PaneId = 'inWhy';
const sketches: Partial<Record<PaneId, p5[]>> = {};

function activatePane(id: PaneId) {
  currentPane = id;
  document.querySelectorAll<HTMLElement>('#incline .grav-pane').forEach((el) => {
    el.classList.toggle('active', el.id === id);
  });
  document.querySelectorAll<HTMLButtonElement>('#inTabs .rev-chip').forEach((b) => {
    b.classList.toggle('active', b.dataset.pane === id);
  });
  if (!sketches[id]) {
    if (id === 'inWhy') {
      sketches.inWhy = [new p5(whySketch, document.getElementById('inWhyCanvas')!)];
    } else if (id === 'inAxes') {
      sketches.inAxes = [new p5(axSketch, document.getElementById('inAxCanvas')!)];
    } else if (id === 'inUp') {
      sketches.inUp = [new p5(caseSketch(up, upIds, 'up'), document.getElementById('inUpCanvas')!)];
    } else if (id === 'inDn') {
      sketches.inDn = [new p5(caseSketch(dn, dnIds, 'down'), document.getElementById('inDnCanvas')!)];
    } else if (id === 'inCmp') {
      sketches.inCmp = [new p5(cmpSketch, document.getElementById('inCmpCanvas')!)];
    } else if (id === 'inMax') {
      sketches.inMax = [
        new p5(mxTrajSketch, document.getElementById('inMaxTrajCanvas')!),
        new p5(mxCurveSketch, document.getElementById('inMaxCurveCanvas')!),
      ];
    }
  } else {
    sketches[id]!.forEach((sk) => sk.windowResized?.());
  }
}

let inited = false;

export function inclineScreenInit() {
  if (!inited) {
    inited = true;
    whyWire();
    axWire();
    caseWire(up, upIds, 'up');
    caseWire(dn, dnIds, 'down');
    cmpWire();
    mxWire();
    rqWire();
    homeworkWire();
    document.querySelectorAll<HTMLButtonElement>('#inTabs .rev-chip').forEach((b) => {
      b.addEventListener('click', () => activatePane(b.dataset.pane as PaneId));
    });
  }
  activatePane(currentPane);
}
