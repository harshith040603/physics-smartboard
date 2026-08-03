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

   Every diagram is drawn with ONE uniform world→screen scale, so the angles you
   measure off the screen are the real α and β.
   p5 instances are created lazily per pane - hidden panes have zero width.       */

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

/* ═════════ drawing helpers ═════════ */
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

function ball(p: p5, x: number, y: number, col: string, r = 16) {
  p.noStroke();
  p.fill(C.navy);
  p.circle(x, y, r + 2);
  p.fill(col);
  p.circle(x, y, r - 4);
}

const dashOn = (p: p5, pat: number[] = [5, 5]) => p.drawingContext.setLineDash(pat);
const dashOff = (p: p5) => p.drawingContext.setLineDash([]);

/* Fit a set of world points into the plot box with ONE scale for both axes,
   so a 30° slope is drawn at exactly 30°.                                  */
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

/* Angle arc drawn in SCREEN angles (y grows downward, so an angle θ above the
   horizontal is the screen angle −θ).                                        */
function angleArc(
  p: p5, cx: number, cy: number, r: number,
  sa: number, sb: number, col: string, label: string
) {
  p.noFill();
  p.stroke(col);
  p.strokeWeight(2);
  p.arc(cx, cy, r * 2, r * 2, Math.min(sa, sb), Math.max(sa, sb));
  const am = (sa + sb) / 2;
  chip(p, label, cx + Math.cos(am) * (r + 22), cy + Math.sin(am) * (r + 22) - 9, 'center', 13, col);
}

/* ═════════ the physics, once ═════════ */
interface Geom {
  a: number; b: number;            // radians
  gc: number; gs: number;          // g cosα, g sinα
  sgn: number;                     // −1 up the slope, +1 down the slope
  T: number; R: number; Hp: number;
  ex: V; ey: V;                    // rotated basis in ground coordinates
  xp: (t: number) => number;       // along-incline coordinate
  yp: (t: number) => number;       // perpendicular coordinate
  pos: (t: number) => V;
  along: (d: number) => V;
  tApex: number;
}

function geom(u: number, aDeg: number, bDeg: number, dir: Dir): Geom {
  const a = rad(aDeg), b = rad(bDeg);
  const gc = G * Math.cos(a), gs = G * Math.sin(a);
  const sgn = dir === 'up' ? -1 : 1;
  const T = (2 * u * Math.sin(b)) / gc;
  const xp = (t: number) => u * Math.cos(b) * t + 0.5 * sgn * gs * t * t;
  const yp = (t: number) => u * Math.sin(b) * t - 0.5 * gc * t * t;
  const sa = dir === 'up' ? Math.sin(a) : -Math.sin(a);
  const ex: V = { x: Math.cos(a), y: sa };
  const ey: V = { x: -sa, y: Math.cos(a) };
  const pos = (t: number) => ({
    x: ex.x * xp(t) + ey.x * yp(t),
    y: ex.y * xp(t) + ey.y * yp(t),
  });
  const along = (d: number) => ({ x: ex.x * d, y: ex.y * d });
  return {
    a, b, gc, gs, sgn, T, R: xp(T),
    Hp: (u * Math.sin(b)) ** 2 / (2 * gc),
    ex, ey, xp, yp, pos, along, tApex: (u * Math.sin(b)) / gc,
  };
}

/* ═════════ shared scene pieces ═════════ */
function drawWedge(p: p5, v: View, g: Geom, dir: Dir, len: number) {
  const tip = g.along(len);
  p.noStroke();
  p.fill(41, 89, 144, 26);
  p.beginShape();
  p.vertex(v.X(0), v.Y(0));
  p.vertex(v.X(tip.x), v.Y(tip.y));
  if (dir === 'up') {
    p.vertex(v.X(tip.x), v.Y(0));
  } else {
    p.vertex(v.X(tip.x), v.Y(v.y0));
    p.vertex(v.X(0), v.Y(v.y0));
  }
  p.endShape(p.CLOSE);

  /* the surface itself */
  p.stroke(C.navy);
  p.strokeWeight(3);
  p.line(v.X(0), v.Y(0), v.X(tip.x), v.Y(tip.y));
}

function drawHorizontalAndAlpha(p: p5, v: View, g: Geom, dir: Dir, aDeg: number, len: number) {
  const hx = g.along(len).x;
  p.stroke(41, 89, 144, 110);
  p.strokeWeight(1.6);
  dashOn(p, [6, 6]);
  p.line(v.X(0), v.Y(0), v.X(hx), v.Y(0));
  dashOff(p);
  const inc = dir === 'up' ? -g.a : g.a;      // screen angle of the slope
  angleArc(p, v.X(0), v.Y(0), 54, Math.min(0, inc), Math.max(0, inc), C.violet, `α = ${aDeg}°`);
}

/* rotated axis arrows drawn at a fixed pixel length from the origin */
function drawRotatedAxes(p: p5, v: View, g: Geom, len = 78) {
  const exs = { x: g.ex.x, y: -g.ex.y };      // screen direction of x′
  const eys = { x: g.ey.x, y: -g.ey.y };      // screen direction of y′
  const ox = v.X(0), oy = v.Y(0);
  p.stroke(C.dark);
  p.strokeWeight(2.2);
  arrow(p, ox, oy, ox + exs.x * len, oy + exs.y * len, 9);
  arrow(p, ox, oy, ox + eys.x * len * 0.82, oy + eys.y * len * 0.82, 9);
  chip(p, "x′ (along)", ox + exs.x * (len + 12), oy + exs.y * (len + 12) - 9, 'center', 12.5, C.dark);
  chip(p, "y′ (perp)", ox + eys.x * (len + 14), oy + eys.y * (len + 14) - 9, 'center', 12.5, C.dark);
}

/* double-headed range marker, offset INTO the wedge so it never sits on the path */
function drawRange(p: p5, v: View, g: Geom, label: string, col = C.red, off = 22) {
  const eys = { x: g.ey.x, y: -g.ey.y };
  const dx = -eys.x * off, dy = -eys.y * off;
  const end = g.along(g.R);
  const x1 = v.X(0) + dx, y1 = v.Y(0) + dy;
  const x2 = v.X(end.x) + dx, y2 = v.Y(end.y) + dy;
  p.stroke(col);
  p.strokeWeight(2);
  arrow(p, x1, y1, x2, y2, 8);
  arrow(p, x2, y2, x1, y1, 8);
  chip(p, label, (x1 + x2) / 2 + dx * 0.7, (y1 + y2) / 2 + dy * 0.7 - 9, 'center', 13.5, col);
  p.noStroke();
  p.fill(col);
  p.circle(v.X(end.x), v.Y(end.y), 10);
}

/* ══════════════════════════════════════════════════════════════════════
   Pane 1 · Why rotate the axes?
   ══════════════════════════════════════════════════════════════════════ */
const why = { a: 30, rotated: false };
const WHY_U = 20, WHY_TH = 60;                 // launch angle fixed to the HORIZONTAL

const whySketch = (p: p5) => {
  const holder = document.getElementById('inWhyCanvas')!;
  const M = { l: 62, r: 30, t: 44, b: 52 };
  const canvasH = () => Math.max(340, Math.min(460, Math.round(holder.clientWidth * 0.46)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const th = rad(WHY_TH), al = rad(why.a);
    const gx = (t: number) => WHY_U * Math.cos(th) * t;
    const gy = (t: number) => WHY_U * Math.sin(th) * t - 0.5 * G * t * t;
    /* landing on the slope: y = x tanα  →  t = 2u(sinθ − cosθ tanα)/g */
    const tL = (2 * WHY_U * (Math.sin(th) - Math.cos(th) * Math.tan(al))) / G;
    const xL = gx(tL), yL = gy(tL);

    const pts: V[] = [{ x: 0, y: 0 }, { x: xL * 1.14, y: xL * 1.14 * Math.tan(al) }];
    for (let i = 0; i <= 40; i++) pts.push({ x: gx((tL * i) / 40), y: gy((tL * i) / 40) });
    const v = fitView(p, M, pts, 0.09);

    /* wedge + slope */
    const tipX = xL * 1.14, tipY = tipX * Math.tan(al);
    p.noStroke();
    p.fill(41, 89, 144, 26);
    p.beginShape();
    p.vertex(v.X(0), v.Y(0)); p.vertex(v.X(tipX), v.Y(tipY)); p.vertex(v.X(tipX), v.Y(0));
    p.endShape(p.CLOSE);
    p.stroke(C.navy); p.strokeWeight(3);
    p.line(v.X(0), v.Y(0), v.X(tipX), v.Y(tipY));

    /* old axes */
    p.stroke(41, 89, 144, 130);
    p.strokeWeight(1.6);
    arrow(p, v.X(0), v.Y(0), v.X(tipX), v.Y(0), 8);
    arrow(p, v.X(0), v.Y(0), v.X(0), v.Y(v.y1 * 0.94), 8);
    p.noStroke(); p.fill(C.dark); p.textFont('DM Sans'); p.textSize(13);
    p.textAlign(p.CENTER, p.TOP);
    p.text('x', v.X(tipX) - 4, v.Y(0) + 10);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text('y', v.X(0) - 10, v.Y(v.y1 * 0.94) + 4);

    angleArc(p, v.X(0), v.Y(0), 52, -al, 0, C.violet, `α = ${why.a}°`);

    /* trajectory */
    p.noFill(); p.stroke(C.accent); p.strokeWeight(3);
    p.beginShape();
    for (let i = 0; i <= 90; i++) p.vertex(v.X(gx((tL * i) / 90)), v.Y(gy((tL * i) / 90)));
    p.endShape();

    if (!why.rotated) {
      /* the coupling: x and y of the landing point */
      p.stroke(C.red); p.strokeWeight(1.8); dashOn(p, [6, 5]);
      p.line(v.X(xL), v.Y(yL), v.X(xL), v.Y(0));
      p.line(v.X(xL), v.Y(yL), v.X(0), v.Y(yL));
      dashOff(p);
      chip(p, `x = ${xL.toFixed(1)} m`, v.X(xL / 2), v.Y(0) + 12, 'center', 13, C.red);
      chip(p, `y = ${yL.toFixed(1)} m`, v.X(0) + 10, v.Y(yL) - 9, 'left', 13, C.red);
      chip(p, `Landing needs  y = x tanα\n${yL.toFixed(1)} = ${xL.toFixed(1)} × tan${why.a}°  ← x and y are TANGLED`,
        v.X(xL) + 16, v.Y(yL) - 30, 'left', 14, C.red);
    } else {
      /* rotated axes: the same landing point is simply y′ = 0 */
      const ex: V = { x: Math.cos(al), y: Math.sin(al) };
      const ey: V = { x: -Math.sin(al), y: Math.cos(al) };
      const ox = v.X(0), oy = v.Y(0);
      p.stroke(C.green); p.strokeWeight(2.6);
      arrow(p, ox, oy, ox + ex.x * 96, oy - ex.y * 96, 10);
      arrow(p, ox, oy, ox + ey.x * 80, oy - ey.y * 80, 10);
      chip(p, "x′ along the incline", ox + ex.x * 108, oy - ex.y * 108 - 9, 'center', 13, C.green);
      chip(p, "y′ ⊥ to the incline", ox + ey.x * 92, oy - ey.y * 92 - 9, 'center', 13, C.green);

      /* perpendicular offsets along the flight = the y′ coordinate */
      for (let i = 1; i < 10; i++) {
        const t = (tL * i) / 10;
        const X = gx(t), Y = gy(t);
        const yp = -X * Math.sin(al) + Y * Math.cos(al);
        const xp = X * Math.cos(al) + Y * Math.sin(al);
        const fx = ex.x * xp, fy = ex.y * xp;
        p.stroke(C.amber); p.strokeWeight(1.4); dashOn(p, [4, 4]);
        p.line(v.X(X), v.Y(Y), v.X(fx), v.Y(fy));
        dashOff(p);
        p.noStroke(); p.fill(C.amber); p.circle(v.X(X), v.Y(Y), 6);
        if (i === 5) chip(p, `y′ = ${yp.toFixed(1)} m`, v.X(X) + 10, v.Y(Y) - 26, 'left', 12.5, C.amber);
      }
      chip(p, "Landing condition:  y′ = 0\nOne coordinate, back to zero. Clean again.",
        v.X(xL) + 16, v.Y(yL) - 26, 'left', 14, C.green);
    }

    ball(p, v.X(0), v.Y(0), C.accent, 15);
    p.noStroke(); p.fill(C.navy); p.circle(v.X(xL), v.Y(yL), 11);
    chip(p, why.rotated
      ? 'Rotated axes: the slope IS the new ground.'
      : 'Old axes: the "ground" is tilted, so y = 0 is no longer the landing test.',
      p.width - M.r - 4, M.t - 30, 'right', 14, why.rotated ? C.green : C.red);
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
   Pane 2 · The rotated axes + gravity split
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
  const M = { l: 70, r: 40, t: 52, b: 56 };
  const canvasH = () => Math.max(360, Math.min(480, Math.round(holder.clientWidth * 0.5)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const g = geom(20, ax.a, ax.b, 'up');
    const len = g.R * 1.16;
    const pts: V[] = [{ x: 0, y: 0 }, g.along(len), { x: g.along(len).x, y: 0 }];
    for (let i = 0; i <= 40; i++) pts.push(g.pos((g.T * i) / 40));
    const v = fitView(p, M, pts, 0.1);

    drawWedge(p, v, g, 'up', len);
    drawHorizontalAndAlpha(p, v, g, 'up', ax.a, len);
    drawRotatedAxes(p, v, g, 84);

    /* the flight, faint - this pane is about the frame, not the numbers */
    p.noFill(); p.stroke(41, 89, 144, 90); p.strokeWeight(2);
    dashOn(p, [5, 6]);
    p.beginShape();
    for (let i = 0; i <= 70; i++) { const q = g.pos((g.T * i) / 70); p.vertex(v.X(q.x), v.Y(q.y)); }
    p.endShape();
    dashOff(p);

    /* launch velocity u at β FROM THE INCLINE */
    const ux = 20 * Math.cos(g.b), uy = 20 * Math.sin(g.b);
    const uw: V = { x: g.ex.x * ux + g.ey.x * uy, y: g.ex.y * ux + g.ey.y * uy };
    const uLen = 118;
    const uNorm = Math.hypot(uw.x, uw.y);
    p.stroke(C.accent); p.strokeWeight(3.4);
    arrow(p, v.X(0), v.Y(0),
      v.X(0) + (uw.x / uNorm) * uLen, v.Y(0) - (uw.y / uNorm) * uLen, 12);
    chip(p, 'u', v.X(0) + (uw.x / uNorm) * (uLen + 16), v.Y(0) - (uw.y / uNorm) * (uLen + 16) - 9,
      'center', 15, C.accent);
    angleArc(p, v.X(0), v.Y(0), 88, -(g.a + g.b), -g.a, C.amber, `β = ${ax.b}°`);

    /* gravity split, hung off the particle at its highest point (most clearance) */
    const q = g.pos(g.tApex);
    const px = v.X(q.x), py = v.Y(q.y);
    const gpx = Math.max(70, Math.min(112, p.height - M.b - py - 26));
    ball(p, px, py, C.accent, 15);
    p.stroke(C.navy); p.strokeWeight(3);
    arrow(p, px, py, px, py + gpx, 11);
    chip(p, 'g = 10 m/s²', px + 8, py + gpx - 8, 'left', 13.5, C.navy);

    /* components of g in the rotated frame */
    const alongPx = gpx * Math.sin(g.a);              // g sinα, down the slope
    const perpPx = gpx * Math.cos(g.a);               // g cosα, into the surface
    const exs = { x: g.ex.x, y: -g.ex.y };
    const eys = { x: g.ey.x, y: -g.ey.y };
    const ax1 = px - exs.x * alongPx, ay1 = py - exs.y * alongPx;   // −x′ direction
    const px1 = px - eys.x * perpPx, py1 = py - eys.y * perpPx;     // −y′ direction

    p.stroke(C.green); p.strokeWeight(3);
    arrow(p, px, py, ax1, ay1, 10);
    chip(p, `g sinα = ${(G * Math.sin(g.a)).toFixed(2)}\n(down the slope)`,
      ax1 - 12, ay1 - 34, 'right', 12.5, C.green);
    p.stroke(C.red); p.strokeWeight(3);
    arrow(p, px, py, px1, py1, 10);
    chip(p, `g cosα = ${(G * Math.cos(g.a)).toFixed(2)}\n(into the surface)`,
      px1 + 10, py1 + 6, 'left', 12.5, C.red);

    /* the rectangle that proves it is a genuine resolution */
    p.stroke(41, 89, 144, 120); p.strokeWeight(1.3); dashOn(p, [4, 4]);
    p.line(ax1, ay1, px + (ax1 - px) + (px1 - px), py + (ay1 - py) + (py1 - py));
    p.line(px1, py1, px + (ax1 - px) + (px1 - px), py + (ay1 - py) + (py1 - py));
    dashOff(p);

    chip(p, 'Gravity does not rotate with your axes - it just splits.',
      p.width - M.r - 4, M.t - 38, 'right', 14, C.dark);
    chip(p, `u_x′ = u cosβ = ${(20 * Math.cos(g.b)).toFixed(1)}    u_y′ = u sinβ = ${(20 * Math.sin(g.b)).toFixed(1)}   (u = 20 m/s)`,
      v.X(0) - 4, M.t - 38, 'left', 14, C.accent);
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
  const note = document.getElementById(ids.note)!;
  const gc = (G * Math.cos(g.a)).toFixed(2), gs = (G * Math.sin(g.a)).toFixed(2);
  note.innerHTML = dir === 'up'
    ? `g cosα = <b>${gc}</b> sets the clock, g sinα = <b>${gs}</b> <b>fights</b> the along-slope motion.
       R = ${(st.u * Math.cos(rad(st.b)) * g.T).toFixed(1)} − ${(0.5 * G * Math.sin(g.a) * g.T * g.T).toFixed(1)} = <b>${g.R.toFixed(1)} m</b>
       - gravity ate ${(0.5 * G * Math.sin(g.a) * g.T * g.T).toFixed(1)} m of range.`
    : `g cosα = <b>${gc}</b> sets the clock, g sinα = <b>${gs}</b> <b>helps</b> the along-slope motion.
       R = ${(st.u * Math.cos(rad(st.b)) * g.T).toFixed(1)} + ${(0.5 * G * Math.sin(g.a) * g.T * g.T).toFixed(1)} = <b>${g.R.toFixed(1)} m</b>
       - gravity added ${(0.5 * G * Math.sin(g.a) * g.T * g.T).toFixed(1)} m of range.`;
}

function caseSketch(st: CaseState, ids: CaseIds, dir: Dir) {
  return (p: p5) => {
    const holder = document.getElementById(ids.canvas)!;
    const M = { l: 66, r: 40, t: 52, b: 56 };
    const canvasH = () => Math.max(370, Math.min(500, Math.round(holder.clientWidth * 0.5)));

    p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
    p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

    p.draw = () => {
      p.background(C.paper);
      const g = geom(st.u, st.a, st.b, dir);
      const len = g.R * 1.18;
      const pts: V[] = [{ x: 0, y: 0 }, g.along(len), { x: g.along(len).x, y: 0 }];
      for (let i = 0; i <= 40; i++) pts.push(g.pos((g.T * i) / 40));
      const v = fitView(p, M, pts, 0.1);

      drawWedge(p, v, g, dir, len);
      drawHorizontalAndAlpha(p, v, g, dir, st.a, len);
      drawRotatedAxes(p, v, g, 74);

      /* predicted path */
      p.noFill(); p.stroke(41, 89, 144, 95); p.strokeWeight(2);
      dashOn(p, [5, 6]);
      p.beginShape();
      for (let i = 0; i <= 80; i++) { const q = g.pos((g.T * i) / 80); p.vertex(v.X(q.x), v.Y(q.y)); }
      p.endShape();
      dashOff(p);

      /* apex: greatest perpendicular distance */
      const qa = g.pos(g.tApex);
      const fa = g.along(g.xp(g.tApex));
      p.stroke(C.amber); p.strokeWeight(1.7); dashOn(p, [5, 5]);
      p.line(v.X(qa.x), v.Y(qa.y), v.X(fa.x), v.Y(fa.y));
      dashOff(p);
      p.noStroke(); p.fill(C.amber); p.circle(v.X(qa.x), v.Y(qa.y), 8);
      chip(p, `H⊥ = ${g.Hp.toFixed(1)} m`, v.X(qa.x), v.Y(qa.y) - 30, 'center', 13, C.amber);

      drawRange(p, v, g, `R = ${g.R.toFixed(1)} m`, C.red, 24);

      /* launch vector */
      const uw: V = {
        x: g.ex.x * Math.cos(g.b) + g.ey.x * Math.sin(g.b),
        y: g.ex.y * Math.cos(g.b) + g.ey.y * Math.sin(g.b),
      };
      p.stroke(C.accent); p.strokeWeight(3.2);
      arrow(p, v.X(0), v.Y(0), v.X(0) + uw.x * 96, v.Y(0) - uw.y * 96, 11);
      chip(p, `u = ${st.u} m/s`, v.X(0) + uw.x * 112, v.Y(0) - uw.y * 112 - 9, 'center', 13.5, C.accent);
      const incS = dir === 'up' ? -g.a : g.a;
      angleArc(p, v.X(0), v.Y(0), 62, incS, incS - g.b, C.amber, `β = ${st.b}°`);

      /* run the clock */
      if (st.phase === 'flying' && !st.paused) {
        st.t += (p.deltaTime / 1000) * Math.max(1, g.T / 3);
        if (st.t >= g.T) { st.t = g.T; st.phase = 'landed'; }
      }

      if (st.phase !== 'ready') {
        const t = st.t;
        const q = g.pos(t);
        const foot = g.along(g.xp(t));

        /* traced path */
        p.noFill(); p.stroke(C.accent); p.strokeWeight(3.4);
        p.beginShape();
        for (let i = 0; i <= 80; i++) {
          const tt = (t * i) / 80;
          const w = g.pos(tt);
          p.vertex(v.X(w.x), v.Y(w.y));
        }
        p.endShape();

        /* the perpendicular coordinate y′, live */
        p.stroke(C.red); p.strokeWeight(1.8); dashOn(p, [5, 4]);
        p.line(v.X(q.x), v.Y(q.y), v.X(foot.x), v.Y(foot.y));
        dashOff(p);

        /* velocity in the rotated frame */
        const vxp = st.u * Math.cos(g.b) + g.sgn * g.gs * t;
        const vyp = st.u * Math.sin(g.b) - g.gc * t;
        const vs = 3.4;
        const exs = { x: g.ex.x, y: -g.ex.y };
        const eys = { x: g.ey.x, y: -g.ey.y };
        const bx = v.X(q.x), by = v.Y(q.y);
        p.stroke(C.green); p.strokeWeight(2.6);
        arrow(p, bx, by, bx + exs.x * vxp * vs, by + exs.y * vxp * vs, 9);
        p.stroke(C.red);
        arrow(p, bx, by, bx + eys.x * vyp * vs, by + eys.y * vyp * vs, 9);
        ball(p, bx, by, C.accent, 17);

        chip(p, `t = ${t.toFixed(2)} s    x′ = ${g.xp(t).toFixed(1)} m    y′ = ${g.yp(t).toFixed(2)} m\nv_x′ = ${vxp.toFixed(1)}    v_y′ = ${vyp.toFixed(1)} m/s`,
          p.width - M.r - 4, M.t - 44, 'right', 13.5, C.navy);

        if (st.phase === 'landed') {
          chip(p, dir === 'up'
            ? `LANDED up the slope.  T = ${g.T.toFixed(2)} s,  R = ${g.R.toFixed(1)} m`
            : `LANDED down the slope.  T = ${g.T.toFixed(2)} s,  R = ${g.R.toFixed(1)} m`,
            p.width / 2, M.t - 16, 'center', 15.5, C.green);
        }
      } else {
        ball(p, v.X(0), v.Y(0), C.accent, 15);
        chip(p, dir === 'up'
          ? 'Press Launch - watch g sinα drag the along-slope motion back.'
          : 'Press Launch - watch g sinα push the along-slope motion forward.',
          p.width / 2, M.t - 16, 'center', 14.5, C.dark);
      }
    };
  };
}

function caseWire(st: CaseState, ids: CaseIds, dir: Dir) {
  const u = document.getElementById(ids.u) as HTMLInputElement;
  const a = document.getElementById(ids.a) as HTMLInputElement;
  const b = document.getElementById(ids.b) as HTMLInputElement;
  const reset = () => { st.t = 0; st.phase = 'ready'; st.paused = false; document.getElementById(ids.pause)!.textContent = '⏸ Pause'; };
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
  const drag = 0.5 * G * Math.sin(rad(cmp.a)) * gu.T * gu.T;
  const flat = cmp.u * Math.cos(rad(cmp.b)) * gu.T;
  document.getElementById('inCmpTable')!.innerHTML = `
    <div class="pl-eqcol">
      <div class="pl-eqhead" style="color:${C.accent}">UP the incline&nbsp;&nbsp;(a_x′ = −g sinα)</div>
      <div class="pl-eqrow">T = 2u sinβ / g cosα = <b>${gu.T.toFixed(2)} s</b></div>
      <div class="pl-eqrow">R = ${flat.toFixed(1)} <b>−</b> ${drag.toFixed(1)} = <b>${gu.R.toFixed(1)} m</b></div>
    </div>
    <div class="pl-eqcol">
      <div class="pl-eqhead" style="color:${C.amber}">DOWN the incline&nbsp;&nbsp;(a_x′ = +g sinα)</div>
      <div class="pl-eqrow">T = 2u sinβ / g cosα = <b>${gd.T.toFixed(2)} s</b></div>
      <div class="pl-eqrow">R = ${flat.toFixed(1)} <b>+</b> ${drag.toFixed(1)} = <b>${gd.R.toFixed(1)} m</b></div>
    </div>`;
  document.getElementById('inCmpNote')!.innerHTML =
    `Time of flight is <b>identical</b> (${gu.T.toFixed(2)} s both ways) - it is set by the perpendicular motion, which never
     hears about the direction along the slope. Range differs by <b>${(gd.R - gu.R).toFixed(1)} m</b>
     (${gu.R.toFixed(1)} m up vs ${gd.R.toFixed(1)} m down, a ratio of <b>${(gd.R / gu.R).toFixed(2)}×</b>) - because the SIGN of
     g sinα flips: it eats ${drag.toFixed(1)} m going up and adds ${drag.toFixed(1)} m going down.`;
}

const cmpSketch = (p: p5) => {
  const holder = document.getElementById('inCmpCanvas')!;
  const M = { l: 66, r: 44, t: 54, b: 56 };
  const canvasH = () => Math.max(400, Math.min(540, Math.round(holder.clientWidth * 0.52)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const gu = geom(cmp.u, cmp.a, cmp.b, 'up');
    const gd = geom(cmp.u, cmp.a, cmp.b, 'down');
    const lenU = gu.R * 1.14, lenD = gd.R * 1.10;
    const pts: V[] = [{ x: 0, y: 0 }, gu.along(lenU), gd.along(lenD)];
    for (let i = 0; i <= 30; i++) {
      pts.push(gu.pos((gu.T * i) / 30));
      pts.push(gd.pos((gd.T * i) / 30));
    }
    const v = fitView(p, M, pts, 0.08);

    /* both surfaces from the same launch point */
    const tipU = gu.along(lenU), tipD = gd.along(lenD);
    p.noStroke(); p.fill(41, 89, 144, 18);
    p.beginShape();
    p.vertex(v.X(0), v.Y(0)); p.vertex(v.X(tipU.x), v.Y(tipU.y)); p.vertex(v.X(tipU.x), v.Y(0));
    p.endShape(p.CLOSE);
    p.fill(245, 158, 11, 16);
    p.beginShape();
    p.vertex(v.X(0), v.Y(0)); p.vertex(v.X(tipD.x), v.Y(tipD.y));
    p.vertex(v.X(tipD.x), v.Y(v.y0)); p.vertex(v.X(0), v.Y(v.y0));
    p.endShape(p.CLOSE);

    p.stroke(C.navy); p.strokeWeight(3);
    p.line(v.X(0), v.Y(0), v.X(tipU.x), v.Y(tipU.y));
    p.line(v.X(0), v.Y(0), v.X(tipD.x), v.Y(tipD.y));
    chip(p, 'incline · UP case', v.X(tipU.x) - 6, v.Y(tipU.y) - 26, 'right', 13, C.accent);
    chip(p, 'incline · DOWN case', v.X(tipD.x) - 6, v.Y(tipD.y) + 8, 'right', 13, C.amber);

    /* horizontal reference + both α arcs */
    p.stroke(41, 89, 144, 110); p.strokeWeight(1.6); dashOn(p, [6, 6]);
    p.line(v.X(0), v.Y(0), v.X(Math.max(tipU.x, tipD.x)), v.Y(0));
    dashOff(p);
    angleArc(p, v.X(0), v.Y(0), 46, -gu.a, 0, C.violet, `α = ${cmp.a}°`);
    angleArc(p, v.X(0), v.Y(0), 46, 0, gd.a, C.violet, `α = ${cmp.a}°`);

    /* predicted paths */
    const path = (g: Geom, col: string) => {
      p.noFill(); p.stroke(col); p.strokeWeight(2); dashOn(p, [5, 6]);
      p.beginShape();
      for (let i = 0; i <= 70; i++) { const q = g.pos((g.T * i) / 70); p.vertex(v.X(q.x), v.Y(q.y)); }
      p.endShape();
      dashOff(p);
    };
    path(gu, 'rgba(0,160,227,0.55)');
    path(gd, 'rgba(245,158,11,0.65)');

    drawRange(p, v, gu, `R = ${gu.R.toFixed(1)} m`, C.accent, 22);
    drawRange(p, v, gd, `R = ${gd.R.toFixed(1)} m`, C.amber, 22);

    /* one shared clock - they land at the same instant */
    if (cmp.phase === 'flying') {
      cmp.t += (p.deltaTime / 1000) * Math.max(1, gu.T / 3);
      if (cmp.t >= gu.T) { cmp.t = gu.T; cmp.phase = 'landed'; }
    }
    if (cmp.phase !== 'ready') {
      const t = cmp.t;
      const trace = (g: Geom, col: string) => {
        p.noFill(); p.stroke(col); p.strokeWeight(3.4);
        p.beginShape();
        for (let i = 0; i <= 70; i++) { const q = g.pos((t * i) / 70); p.vertex(v.X(q.x), v.Y(q.y)); }
        p.endShape();
      };
      trace(gu, C.accent);
      trace(gd, C.amber);
      const qu = gu.pos(t), qd = gd.pos(t);
      ball(p, v.X(qu.x), v.Y(qu.y), C.accent, 17);
      ball(p, v.X(qd.x), v.Y(qd.y), C.amber, 17);
      chip(p, `t = ${t.toFixed(2)} s   ·   same clock, both still flying`,
        p.width - M.r - 4, M.t - 46, 'right', 14, C.navy);
      if (cmp.phase === 'landed') {
        chip(p, `BOTH LANDED at t = ${gu.T.toFixed(2)} s.   Up: ${gu.R.toFixed(1)} m    Down: ${gd.R.toFixed(1)} m`,
          p.width / 2, M.t - 20, 'center', 16, C.green);
      }
    } else {
      ball(p, v.X(0), v.Y(0), C.navy, 16);
      chip(p, 'Same u, same α, same β - only the direction along the slope differs. Press Launch both.',
        p.width / 2, M.t - 20, 'center', 14.5, C.dark);
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
  const M = { l: 52, r: 34, t: 44, b: 46 };
  const canvasH = () => Math.max(300, Math.min(400, Math.round(holder.clientWidth * 0.62)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const bOpt = (90 - mx.a) / 2;
    const g = geom(mx.u, mx.a, mx.b, 'up');
    const gOpt = geom(mx.u, mx.a, bOpt, 'up');
    const len = Math.max(g.R, gOpt.R) * 1.14;
    const pts: V[] = [{ x: 0, y: 0 }, g.along(len), { x: g.along(len).x, y: 0 }];
    for (let i = 0; i <= 30; i++) {
      pts.push(g.pos((g.T * i) / 30));
      pts.push(gOpt.pos((gOpt.T * i) / 30));
    }
    const v = fitView(p, M, pts, 0.09);

    drawWedge(p, v, g, 'up', len);
    p.stroke(41, 89, 144, 100); p.strokeWeight(1.5); dashOn(p, [6, 6]);
    p.line(v.X(0), v.Y(0), v.X(g.along(len).x), v.Y(0));
    dashOff(p);
    angleArc(p, v.X(0), v.Y(0), 40, -g.a, 0, C.violet, `α = ${mx.a}°`);

    /* optimal trajectory, ghosted */
    p.noFill(); p.stroke(22, 163, 74, 150); p.strokeWeight(2.4); dashOn(p, [5, 5]);
    p.beginShape();
    for (let i = 0; i <= 70; i++) { const q = gOpt.pos((gOpt.T * i) / 70); p.vertex(v.X(q.x), v.Y(q.y)); }
    p.endShape();
    dashOff(p);
    const eo = gOpt.along(gOpt.R);
    p.noStroke(); p.fill(C.green); p.circle(v.X(eo.x), v.Y(eo.y), 9);
    chip(p, `β_opt = ${bOpt.toFixed(1)}°  →  R_max = ${gOpt.R.toFixed(1)} m`,
      v.X(eo.x) - 8, v.Y(eo.y) - 30, 'right', 12.5, C.green);

    /* your trajectory */
    p.noFill(); p.stroke(C.accent); p.strokeWeight(3);
    p.beginShape();
    for (let i = 0; i <= 70; i++) { const q = g.pos((g.T * i) / 70); p.vertex(v.X(q.x), v.Y(q.y)); }
    p.endShape();
    const e1 = g.along(g.R);
    p.noStroke(); p.fill(C.accent); p.circle(v.X(e1.x), v.Y(e1.y), 9);
    chip(p, `β = ${mx.b}°  →  R = ${g.R.toFixed(1)} m`, v.X(e1.x) + 10, v.Y(e1.y) + 6, 'left', 12.5, C.accent);

    ball(p, v.X(0), v.Y(0), C.navy, 14);
    chip(p, 'Your launch vs the optimal launch', v.X(0) - 4, M.t - 32, 'left', 13.5, C.dark);
  };
};

const mxCurveSketch = (p: p5) => {
  const holder = document.getElementById('inMaxCurveCanvas')!;
  const M = { l: 62, r: 30, t: 44, b: 52 };
  const canvasH = () => Math.max(300, Math.min(400, Math.round(holder.clientWidth * 0.62)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const a = rad(mx.a);
    const bOpt = (90 - mx.a) / 2;
    const rMax = (mx.u * mx.u) / (G * (1 + Math.sin(a)));
    const rMaxDown = (mx.u * mx.u) / (G * (1 - Math.sin(a)));
    /* on steep inclines the down-slope range runs away; keep the up-slope curve readable */
    const yTop = Math.min(rMaxDown * 1.12, rMax * 3.2);
    const px = (bDeg: number) => M.l + (bDeg / 90) * (p.width - M.l - M.r);
    const py = (r: number) => p.height - M.b - (r / yTop) * (p.height - M.t - M.b);

    /* grid + axes */
    p.stroke(41, 89, 144, 24); p.strokeWeight(1);
    for (let bd = 0; bd <= 90; bd += 15) p.line(px(bd), M.t, px(bd), p.height - M.b);
    const rStep = yTop > 120 ? 40 : yTop > 60 ? 20 : 10;
    for (let r = 0; r <= yTop; r += rStep) p.line(M.l, py(r), p.width - M.r, py(r));
    p.stroke(C.navy); p.strokeWeight(2);
    p.line(M.l, py(0), p.width - M.r, py(0));
    p.line(M.l, M.t, M.l, py(0));
    p.noStroke(); p.fill(C.dark); p.textFont('DM Sans'); p.textSize(12);
    p.textAlign(p.CENTER, p.TOP);
    for (let bd = 0; bd <= 90; bd += 15) p.text(`${bd}°`, px(bd), py(0) + 8);
    p.textAlign(p.RIGHT, p.CENTER);
    for (let r = rStep; r <= yTop; r += rStep) p.text(`${r}`, M.l - 8, py(r));
    p.textAlign(p.LEFT, p.TOP);
    p.text('R (m)', M.l - 8, M.t - 22);
    p.textAlign(p.RIGHT, p.TOP);
    p.text('β from the incline', p.width - M.r, py(0) + 26);

    /* R(β) for both directions */
    const curve = (fn: (b: number) => number, col: string) => {
      p.noFill(); p.stroke(col); p.strokeWeight(3);
      let open = false;
      for (let bd = 0; bd <= 90; bd += 0.5) {
        const r = fn(rad(bd));
        if (r < 0 || r > yTop) {                       // leave the box, break the line
          if (open) { p.endShape(); open = false; }
          continue;
        }
        if (!open) { p.beginShape(); open = true; }
        p.vertex(px(bd), py(r));
      }
      if (open) p.endShape();
    };
    curve((b) => rangeDown(mx.u, a, b), C.amber);
    curve((b) => rangeUp(mx.u, a, b), C.accent);

    /* peaks */
    p.stroke(C.green); p.strokeWeight(1.8); dashOn(p, [5, 5]);
    p.line(px(bOpt), py(0), px(bOpt), py(rMax));
    p.line(M.l, py(rMax), px(bOpt), py(rMax));
    dashOff(p);
    p.noStroke(); p.fill(C.green); p.circle(px(bOpt), py(rMax), 10);
    chip(p, `β_opt = ${bOpt.toFixed(1)}°\nR_max = ${rMax.toFixed(1)} m`, px(bOpt) + 12, py(rMax) - 4, 'left', 13, C.green);

    const bOptD = (90 + mx.a) / 2;
    if (rMaxDown <= yTop) {
      p.noStroke(); p.fill(C.amber); p.circle(px(bOptD), py(rMaxDown), 9);
      chip(p, `down: peak at ${bOptD.toFixed(1)}°`, px(bOptD) - 10, py(rMaxDown) - 26, 'right', 12, C.amber);
    } else {
      chip(p, `down-slope peak is off the chart:\n${bOptD.toFixed(1)}° → ${rMaxDown.toFixed(0)} m`,
        px(Math.min(bOptD, 84)), M.t + 4, 'center', 12.5, C.amber);
    }

    /* live marker */
    const rNow = Math.max(rangeUp(mx.u, a, rad(mx.b)), 0);
    p.stroke(C.accent); p.strokeWeight(1.6); dashOn(p, [4, 4]);
    p.line(px(mx.b), py(0), px(mx.b), py(rNow));
    dashOff(p);
    p.noStroke(); p.fill(C.accent); p.circle(px(mx.b), py(rNow), 11);
    chip(p, `β = ${mx.b}° → ${rNow.toFixed(1)} m`, px(mx.b), py(rNow) - 34, 'center', 13, C.accent);

    chip(p, 'blue: up the incline   ·   amber: down the incline',
      p.width - M.r - 4, M.t - 32, 'right', 13, C.dark);
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
   Pane 8 · Homework + tap-to-reveal examples
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

function exampleWire() {
  document.querySelectorAll<HTMLElement>('#incline .pl-egtap').forEach((box) => {
    const toggle = () => box.classList.toggle('revealed');
    box.addEventListener('click', toggle);
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
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
    exampleWire();
    document.querySelectorAll<HTMLButtonElement>('#inTabs .rev-chip').forEach((b) => {
      b.addEventListener('click', () => activatePane(b.dataset.pane as PaneId));
    });
  }
  activatePane(currentPane);
}
