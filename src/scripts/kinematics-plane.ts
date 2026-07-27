/* ═══════════ Motion in a Plane (2D kinematics) - five-pane lab ═══════════
   Pane 1: Vector Recap - resolve a vector into components, recombine with
           Pythagoras + angle; drag magnitude and angle.
   Pane 2: Vectors in Motion - a particle runs a parabola; position vector r
           from the origin, velocity v drawn tangent, split into vx and vy.
   Pane 3: Independence Principle (the marquee) - one ball thrown horizontally,
           one dropped, same instant. Strobe connectors show equal heights at
           every tick; they land together.
   Pane 4: 2D Equations per axis - scrub time, watch the two 1D problems run
           in parallel with live substituted numbers, apex where v_y = 0.
   Pane 5: Rapid Fire quiz.
   p5 instances are created lazily per pane - hidden panes have zero width.  */

import p5 from 'p5';
import katex from 'katex';

const C = {
  navy: '#0f2647',
  dark: '#295990',
  accent: '#00A0E3',
  red: '#e11d48',
  green: '#16a34a',
  amber: '#f59e0b',
  paper: '#f4f8fc',
};
const G = 10;

/* ═════════ shared drawing helpers ═════════ */
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
  p.fill(255, 255, 255, 230);
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

function ghost(p: p5, x: number, y: number, col: string) {
  const c = p.color(col);
  c.setAlpha(90);
  p.noStroke();
  p.fill(15, 38, 71, 45);
  p.circle(x, y, 13);
  p.fill(c);
  p.circle(x, y, 8);
}

/* ══════════════════════════════════════════════════════════════════════
   Pane 1 · Vector Recap
   ══════════════════════════════════════════════════════════════════════ */
const vec = { mag: 25, ang: 37 };

function vecReadout() {
  const th = (vec.ang * Math.PI) / 180;
  const ax = vec.mag * Math.cos(th);
  const ay = vec.mag * Math.sin(th);
  const opts = { throwOnError: false, displayMode: false };
  katex.render(
    String.raw`A_x=A\cos\theta=${vec.mag}\cos ${vec.ang}^\circ=\mathbf{${ax.toFixed(1)}}\quad\quad A_y=A\sin\theta=${vec.mag}\sin ${vec.ang}^\circ=\mathbf{${ay.toFixed(1)}}`,
    document.getElementById('plVecResolve')!, opts
  );
  katex.render(
    String.raw`|A|=\sqrt{A_x^{2}+A_y^{2}}=\mathbf{${Math.hypot(ax, ay).toFixed(1)}}\quad\quad \theta=\tan^{-1}\!\dfrac{A_y}{A_x}=\mathbf{${(Math.atan2(ay, ax) * 180 / Math.PI).toFixed(1)}^\circ}`,
    document.getElementById('plVecRecombine')!, opts
  );
}

const vecSketch = (p: p5) => {
  const holder = document.getElementById('plVecCanvas')!;
  const M = { l: 60, r: 24, t: 30, b: 48 };
  const canvasH = () => Math.max(300, Math.min(380, Math.round(holder.clientWidth * 0.46)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const ox = M.l, oy = p.height - M.b;                    // origin
    const span = 44;                                         // world units across
    const s = Math.min((p.width - M.l - M.r) / span, (p.height - M.t - M.b) / span);
    const X = (wx: number) => ox + wx * s;
    const Y = (wy: number) => oy - wy * s;

    /* grid */
    p.stroke(41, 89, 144, 22);
    p.strokeWeight(1);
    for (let g = 0; g <= span; g += 10) {
      p.line(X(g), Y(0), X(g), Y(span));
      p.line(X(0), Y(g), X(span), Y(g));
    }
    /* axes */
    p.stroke(C.navy);
    p.strokeWeight(2);
    arrow(p, X(0), Y(0), X(span), Y(0));
    arrow(p, X(0), Y(0), X(0), Y(span));
    p.noStroke();
    p.fill(C.dark);
    p.textFont('DM Sans');
    p.textSize(13);
    p.textAlign(p.CENTER, p.TOP);
    p.text('x', X(span) - 6, Y(0) + 8);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text('y', X(0) - 8, Y(span) + 6);

    const th = (vec.ang * Math.PI) / 180;
    const ax = vec.mag * Math.cos(th);
    const ay = vec.mag * Math.sin(th);

    /* component rectangle (dashed) */
    p.stroke(41, 89, 144, 120);
    p.strokeWeight(1.4);
    p.drawingContext.setLineDash([5, 5]);
    p.line(X(ax), Y(0), X(ax), Y(ay));
    p.line(X(0), Y(ay), X(ax), Y(ay));
    p.drawingContext.setLineDash([]);

    /* component arrows */
    p.stroke(C.green);
    p.strokeWeight(3);
    arrow(p, X(0), Y(0), X(ax), Y(0));
    chip(p, `Aₓ = ${ax.toFixed(1)}`, X(ax / 2), Y(0) + 10, 'center', 13, C.green);
    p.stroke(C.red);
    p.strokeWeight(3);
    arrow(p, X(ax), Y(0), X(ax), Y(ay));
    chip(p, `A_y = ${ay.toFixed(1)}`, X(ax) + 8, Y(ay / 2) - 8, 'left', 13, C.red);

    /* the vector itself */
    p.stroke(C.accent);
    p.strokeWeight(4);
    arrow(p, X(0), Y(0), X(ax), Y(ay), 12);

    /* angle arc */
    p.noFill();
    p.stroke(C.amber);
    p.strokeWeight(2);
    p.arc(X(0), Y(0), 66, 66, -th, 0);
    chip(p, `θ = ${vec.ang}°`, X(0) + 40, Y(0) - 20, 'left', 13, C.amber);
    chip(p, `A = ${vec.mag}`, X(ax) + 6, Y(ay) - 22, 'left', 14, C.accent);

    chip(p, 'Resolve first: work along the axes, never along the slant.',
      p.width - M.r - 4, M.t - 6, 'right', 13.5, C.dark);
  };
};

function vecWire() {
  const m = document.getElementById('plVecMag') as HTMLInputElement;
  const a = document.getElementById('plVecAng') as HTMLInputElement;
  m.addEventListener('input', () => {
    vec.mag = +m.value;
    document.getElementById('plVecMagVal')!.textContent = `${vec.mag}`;
    vecReadout();
  });
  a.addEventListener('input', () => {
    vec.ang = +a.value;
    document.getElementById('plVecAngVal')!.textContent = `${vec.ang}°`;
    vecReadout();
  });
  vecReadout();
}

/* ══════════════════════════════════════════════════════════════════════
   Pane 2 · Vectors in Motion
   ══════════════════════════════════════════════════════════════════════ */
const kin = { running: true, t: 0 };
const KIN_UX = 4, KIN_UY = 12;                     // path: parabola
const kinTland = (2 * KIN_UY) / G;                  // 2.4 s
const kinX = (t: number) => KIN_UX * t;
const kinY = (t: number) => KIN_UY * t - 0.5 * G * t * t;

function kinReadout(t: number) {
  const vx = KIN_UX, vy = KIN_UY - G * t;
  const opts = { throwOnError: false, displayMode: false };
  katex.render(
    String.raw`\mathbf{r}=x\,\hat{\imath}+y\,\hat{\jmath}=${kinX(t).toFixed(1)}\,\hat{\imath}+${kinY(t).toFixed(1)}\,\hat{\jmath}`,
    document.getElementById('plKinR')!, opts
  );
  katex.render(
    String.raw`\mathbf{v}=v_x\,\hat{\imath}+v_y\,\hat{\jmath}=${vx.toFixed(1)}\,\hat{\imath}+${vy.toFixed(1)}\,\hat{\jmath}\quad(|\mathbf{v}|=${Math.hypot(vx, vy).toFixed(1)}\text{ m/s})`,
    document.getElementById('plKinV')!, opts
  );
}

const kinSketch = (p: p5) => {
  const holder = document.getElementById('plKinCanvas')!;
  const M = { l: 54, r: 24, t: 30, b: 46 };
  const canvasH = () => Math.max(320, Math.min(400, Math.round(holder.clientWidth * 0.5)));
  const worldW = kinX(kinTland) * 1.12;
  const worldH = (KIN_UY * KIN_UY) / (2 * G) * 1.2;

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const ox = M.l, oy = p.height - M.b;
    const s = Math.min((p.width - M.l - M.r) / worldW, (p.height - M.t - M.b) / worldH);
    const X = (wx: number) => ox + wx * s;
    const Y = (wy: number) => oy - wy * s;

    /* axes */
    p.stroke(C.navy);
    p.strokeWeight(2);
    arrow(p, X(0), Y(0), X(worldW), Y(0));
    arrow(p, X(0), Y(0), X(0), Y(worldH));
    p.noStroke();
    p.fill(C.dark);
    p.textFont('DM Sans');
    p.textSize(13);
    p.text('x', X(worldW) - 8, Y(0) + 8);
    p.text('y', X(0) + 6, Y(worldH) - 4);

    /* full path (faint) */
    p.noFill();
    p.stroke(41, 89, 144, 70);
    p.strokeWeight(1.5);
    p.drawingContext.setLineDash([4, 5]);
    p.beginShape();
    for (let t = 0; t <= kinTland; t += kinTland / 80) p.vertex(X(kinX(t)), Y(kinY(t)));
    p.drawingContext.setLineDash([]);
    p.endShape();

    if (kin.running) {
      kin.t += (p.deltaTime / 1000) * 0.7;
      if (kin.t > kinTland) kin.t = 0;
    }
    const t = kin.t;
    const bx = kinX(t), by = kinY(t);
    const vx = KIN_UX, vy = KIN_UY - G * t;

    /* traced path so far */
    p.noFill();
    p.stroke(C.accent);
    p.strokeWeight(3);
    p.beginShape();
    for (let tt = 0; tt <= t; tt += kinTland / 120) p.vertex(X(kinX(tt)), Y(kinY(tt)));
    p.endShape();

    /* position vector r */
    p.stroke(C.dark);
    p.strokeWeight(2.4);
    arrow(p, X(0), Y(0), X(bx), Y(by), 10);
    chip(p, 'r', X(bx / 2) - 4, Y(by / 2) - 8, 'right', 14, C.dark);

    /* velocity vector (tangent) + components */
    const vs = 8;                                    // px per m/s
    p.stroke(C.green);
    p.strokeWeight(2.6);
    arrow(p, X(bx), Y(by), X(bx) + vx * vs, Y(by));                 // vx →
    p.stroke(C.red);
    arrow(p, X(bx), Y(by), X(bx), Y(by) - vy * vs);                 // vy ↑ (may flip)
    p.stroke(C.navy);
    p.strokeWeight(3.2);
    arrow(p, X(bx), Y(by), X(bx) + vx * vs, Y(by) - vy * vs, 11);   // v tangent
    chip(p, 'v (tangent)', X(bx) + vx * vs + 4, Y(by) - vy * vs - 8, 'left', 12.5, C.navy);

    ball(p, X(bx), Y(by), C.accent, 15);
    kinReadout(t);

    chip(p, 'v is ALWAYS tangent to the path. Its shadow on each axis = vₓ, v_y.',
      p.width - M.r - 4, M.t - 6, 'right', 13, C.dark);
  };
};

function kinWire() {
  const play = document.getElementById('plKinPlay')!;
  play.addEventListener('click', () => {
    kin.running = !kin.running;
    play.textContent = kin.running ? '⏸ Pause' : '▶ Play';
  });
  document.getElementById('plKinReset')!.addEventListener('click', () => { kin.t = 0; });
}

/* ══════════════════════════════════════════════════════════════════════
   Pane 3 · The Independence Principle  (the marquee)
   ══════════════════════════════════════════════════════════════════════ */
const ind = {
  vx: 12,
  phase: 'ready' as 'ready' | 'run' | 'landed',
  t: 0,
  paused: false,
  ghosts: [] as Array<{ x: number; y: number }>,
};
const IND_H = 45;
const indTland = Math.sqrt((2 * IND_H) / G);         // 3 s
const indY = (t: number) => Math.max(IND_H - 0.5 * G * t * t, 0);

function indClear() {
  ind.t = 0;
  ind.ghosts.length = 0;
  ind.paused = false;
  document.getElementById('plIndPause')!.textContent = '⏸ Pause';
}

const indSketch = (p: p5) => {
  const holder = document.getElementById('plIndCanvas')!;
  const M = { l: 56, r: 24, t: 40, b: 44 };
  const canvasH = () => Math.max(340, Math.min(430, Math.round(holder.clientWidth * 0.52)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const worldW = Math.max(ind.vx * indTland * 1.12, 12);
    const worldH = IND_H * 1.12;
    const ox = M.l, oy = p.height - M.b;
    const s = Math.min((p.width - M.l - M.r) / worldW, (p.height - M.t - M.b) / worldH);
    const X = (wx: number) => ox + wx * s;
    const Y = (wy: number) => oy - wy * s;

    /* ground + start platform */
    p.stroke(C.navy);
    p.strokeWeight(3);
    p.line(X(0), Y(0), X(worldW), Y(0));
    p.noStroke();
    p.fill(41, 89, 144, 30);
    p.rect(X(0) - 14, Y(IND_H) - 6, 30, 6);

    /* height ruler */
    p.stroke(41, 89, 144, 30);
    p.strokeWeight(1);
    p.fill(C.dark);
    p.textFont('DM Sans');
    p.textSize(12);
    for (let h = 0; h <= IND_H; h += 15) {
      p.stroke(41, 89, 144, 30);
      p.line(X(0), Y(h), X(worldW), Y(h));
      p.noStroke();
      p.textAlign(p.RIGHT, p.CENTER);
      p.text(`${h} m`, X(0) - 8, Y(h));
    }

    /* advance + strobe snapshots every 0.3 s */
    if (ind.phase === 'run' && !ind.paused) {
      const tPrev = ind.t;
      ind.t += (p.deltaTime / 1000) * 0.8;
      const iv = 0.3;
      for (let k = Math.floor(tPrev / iv) + 1; k * iv <= Math.min(ind.t, indTland); k++) {
        const tg = k * iv;
        ind.ghosts.push({ x: ind.vx * tg, y: indY(tg) });
      }
      if (ind.t >= indTland) { ind.t = indTland; ind.phase = 'landed'; }
    }

    /* strobe: horizontal connectors prove equal heights at every instant */
    for (const gh of ind.ghosts) {
      const yy = Y(gh.y);
      p.stroke(C.amber);
      p.strokeWeight(1.3);
      p.drawingContext.setLineDash([6, 5]);
      p.line(X(0), yy, X(gh.x), yy);
      p.drawingContext.setLineDash([]);
      ghost(p, X(0), yy, C.dark);          // dropped ball ghost
      ghost(p, X(gh.x), yy, C.accent);     // thrown ball ghost
    }

    const yNow = indY(ind.t);
    const xNow = ind.vx * ind.t;

    /* live connector between the two balls */
    if (ind.phase !== 'ready') {
      p.stroke(C.amber);
      p.strokeWeight(2.4);
      p.line(X(0), Y(yNow), X(xNow), Y(yNow));
      chip(p, 'same height', X(xNow / 2), Y(yNow) - 26, 'center', 12.5, C.amber);
    }

    /* dropped ball D (navy) and thrown ball H (accent) */
    ball(p, X(0), Y(yNow), C.navy, 17);
    chip(p, 'dropped', X(0) - 10, Y(yNow) - 30, 'right', 12.5, C.navy);
    ball(p, X(xNow), Y(yNow), C.accent, 17);
    chip(p, 'thrown →', X(xNow) + 12, Y(yNow) - 8, 'left', 12.5, C.accent);

    /* horizontal velocity arrow on the thrown ball */
    if (ind.phase !== 'ready') {
      p.stroke(C.green);
      p.strokeWeight(2.4);
      arrow(p, X(xNow), Y(yNow), X(xNow) + Math.min(ind.vx * 3, 70), Y(yNow));
    }

    /* HUD */
    chip(p, `t = ${ind.t.toFixed(2)} s   ·   both at y = ${yNow.toFixed(1)} m`,
      p.width - M.r - 4, M.t - 8, 'right', 14, C.navy);
    if (ind.phase === 'ready') {
      chip(p, 'Press Drop & Throw - watch the vertical motions stay locked together', X(0) + 8, M.t + 4, 'left', 13.5, C.dark);
    } else if (ind.phase === 'landed') {
      chip(p, `LANDED TOGETHER at t = ${indTland.toFixed(1)} s. Horizontal speed never delayed the fall.`,
        p.width / 2, M.t + 4, 'center', 15, C.green);
    }
  };
};

function indWire() {
  const vx = document.getElementById('plIndVx') as HTMLInputElement;
  vx.addEventListener('input', () => {
    ind.vx = +vx.value;
    document.getElementById('plIndVxVal')!.textContent = `${ind.vx} m/s`;
    ind.phase = 'ready';
    indClear();
  });
  document.getElementById('plIndGo')!.addEventListener('click', () => {
    indClear();
    ind.phase = 'run';
  });
  document.getElementById('plIndPause')!.addEventListener('click', () => {
    ind.paused = !ind.paused;
    document.getElementById('plIndPause')!.textContent = ind.paused ? '▶ Resume' : '⏸ Pause';
  });
  document.getElementById('plIndReset')!.addEventListener('click', () => {
    indClear();
    ind.phase = 'ready';
  });
}

/* ══════════════════════════════════════════════════════════════════════
   Pane 4 · The Equations of Motion, Per Axis
   ══════════════════════════════════════════════════════════════════════ */
const eqn = { ux: 3, uy: 4, ay: -2, t: 0 };
const eqnAX = 0;                                     // aₓ = 0 (constant vx)

function eqnTland(): number {
  return eqn.ay < 0 && eqn.uy > 0 ? (2 * eqn.uy) / -eqn.ay : 4;
}
const eqnX = (t: number) => eqn.ux * t + 0.5 * eqnAX * t * t;
const eqnY = (t: number) => eqn.uy * t + 0.5 * eqn.ay * t * t;

function eqnTable() {
  const t = eqn.t;
  const vx = eqn.ux + eqnAX * t;
  const vy = eqn.uy + eqn.ay * t;
  const x = eqnX(t), y = eqnY(t);
  const apex = eqn.ay < 0 ? eqn.uy / -eqn.ay : null;
  const atApex = apex !== null && Math.abs(t - apex) < 0.06;
  const el = document.getElementById('plEqTable')!;
  el.innerHTML = `
    <div class="pl-eqcol">
      <div class="pl-eqhead" style="color:${C.green}">x-axis&nbsp;&nbsp;(aₓ = 0)</div>
      <div class="pl-eqrow">vₓ = uₓ + aₓt = ${eqn.ux} + 0 = <b>${vx.toFixed(1)} m/s</b></div>
      <div class="pl-eqrow">x = uₓt + ½aₓt² = ${eqn.ux}·${t.toFixed(2)} = <b>${x.toFixed(2)} m</b></div>
    </div>
    <div class="pl-eqcol">
      <div class="pl-eqhead" style="color:${C.red}">y-axis&nbsp;&nbsp;(a_y = ${eqn.ay})</div>
      <div class="pl-eqrow">v_y = u_y + a_yt = ${eqn.uy} + (${eqn.ay})·${t.toFixed(2)} = <b>${vy.toFixed(1)} m/s</b></div>
      <div class="pl-eqrow">y = u_yt + ½a_yt² = <b>${y.toFixed(2)} m</b></div>
    </div>`;
  const note = document.getElementById('plEqNote')!;
  note.innerHTML = atApex
    ? `At t = ${t.toFixed(2)} s, v_y = 0 - the <b>top of the trajectory</b>. You just solved a projectile without naming it.`
    : `Same clock t = <b>${t.toFixed(2)} s</b> feeds both columns. Time is the only bridge between the two axes.`;
  note.style.color = atApex ? C.green : '';
}

const eqnSketch = (p: p5) => {
  const holder = document.getElementById('plEqCanvas')!;
  const M = { l: 54, r: 24, t: 30, b: 44 };
  const canvasH = () => Math.max(300, Math.min(380, Math.round(holder.clientWidth * 0.44)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const tmax = eqnTland();
    /* world bounds from samples */
    let xmin = 0, xmax = 0.001, ymin = 0, ymax = 0.001;
    for (let t = 0; t <= tmax; t += tmax / 60) {
      xmax = Math.max(xmax, eqnX(t)); xmin = Math.min(xmin, eqnX(t));
      ymax = Math.max(ymax, eqnY(t)); ymin = Math.min(ymin, eqnY(t));
    }
    const padX = (xmax - xmin) * 0.12 + 1, padY = (ymax - ymin) * 0.16 + 1;
    xmin -= 0; xmax += padX; ymin -= padY; ymax += padY;
    const ox = M.l, oy0 = p.height - M.b;
    const sx = (p.width - M.l - M.r) / (xmax - xmin);
    const sy = (p.height - M.t - M.b) / (ymax - ymin);
    const X = (wx: number) => ox + (wx - xmin) * sx;
    const Y = (wy: number) => oy0 - (wy - ymin) * sy;

    /* axes through origin */
    p.stroke(41, 89, 144, 110);
    p.strokeWeight(1.5);
    p.line(X(xmin), Y(0), X(xmax), Y(0));
    p.line(X(0), Y(ymin), X(0), Y(ymax));
    p.noStroke();
    p.fill(C.dark);
    p.textFont('DM Sans');
    p.textSize(12);
    p.text('x', X(xmax) - 8, Y(0) + 8);
    p.text('y', X(0) + 6, Y(ymax) - 2);

    /* full trajectory */
    p.noFill();
    p.stroke(41, 89, 144, 80);
    p.strokeWeight(1.6);
    p.drawingContext.setLineDash([4, 5]);
    p.beginShape();
    for (let t = 0; t <= tmax; t += tmax / 90) p.vertex(X(eqnX(t)), Y(eqnY(t)));
    p.drawingContext.setLineDash([]);
    p.endShape();

    /* apex marker */
    if (eqn.ay < 0) {
      const ta = eqn.uy / -eqn.ay;
      p.noStroke();
      p.fill(C.amber);
      p.circle(X(eqnX(ta)), Y(eqnY(ta)), 8);
      chip(p, 'v_y = 0', X(eqnX(ta)), Y(eqnY(ta)) - 26, 'center', 12, C.amber);
    }

    /* current point + r components */
    const bx = eqnX(eqn.t), by = eqnY(eqn.t);
    p.stroke(C.green);
    p.strokeWeight(1.4);
    p.drawingContext.setLineDash([4, 4]);
    p.line(X(bx), Y(0), X(bx), Y(by));
    p.line(X(0), Y(by), X(bx), Y(by));
    p.drawingContext.setLineDash([]);
    p.stroke(C.dark);
    p.strokeWeight(2.2);
    arrow(p, X(0), Y(0), X(bx), Y(by), 9);
    ball(p, X(bx), Y(by), C.accent, 14);
    chip(p, `(${bx.toFixed(1)}, ${by.toFixed(1)})`, X(bx) + 10, Y(by) - 6, 'left', 12.5, C.navy);
  };
};

function eqnSyncSlider() {
  const t = document.getElementById('plEqT') as HTMLInputElement;
  const tmax = eqnTland();
  t.max = tmax.toFixed(2);
  if (eqn.t > tmax) eqn.t = tmax;
  t.value = String(eqn.t);
  document.getElementById('plEqTVal')!.textContent = `${eqn.t.toFixed(2)} s`;
}

function eqnWire() {
  const ux = document.getElementById('plEqUx') as HTMLInputElement;
  const uy = document.getElementById('plEqUy') as HTMLInputElement;
  const ay = document.getElementById('plEqAy') as HTMLInputElement;
  const t = document.getElementById('plEqT') as HTMLInputElement;
  const refresh = () => { eqnSyncSlider(); eqnTable(); };
  ux.addEventListener('input', () => {
    eqn.ux = +ux.value;
    document.getElementById('plEqUxVal')!.textContent = `${eqn.ux} m/s`;
    refresh();
  });
  uy.addEventListener('input', () => {
    eqn.uy = +uy.value;
    document.getElementById('plEqUyVal')!.textContent = `${eqn.uy} m/s`;
    refresh();
  });
  ay.addEventListener('input', () => {
    eqn.ay = +ay.value;
    document.getElementById('plEqAyVal')!.textContent = `${eqn.ay} m/s²`;
    refresh();
  });
  t.addEventListener('input', () => {
    eqn.t = +t.value;
    document.getElementById('plEqTVal')!.textContent = `${eqn.t.toFixed(2)} s`;
    eqnTable();
  });
  eqnSyncSlider();
  eqnTable();
}

/* ══════════════════════════════════════════════════════════════════════
   Pane 5 · Rapid Fire quiz
   ══════════════════════════════════════════════════════════════════════ */
interface Rq { q: string; opts: string[]; correct: number; fb: string; }

const rqs: Rq[] = [
  {
    q: 'A bullet is fired horizontally and another is dropped from the same height, same instant. Which lands first?',
    opts: ['The fired bullet', 'The dropped bullet', 'They land together'],
    correct: 2,
    fb: 'Independence: horizontal velocity has no effect on the vertical fall. Same g, same height, same time.',
  },
  {
    q: 'What is the ONE thing the x-motion and y-motion share?',
    opts: ['The acceleration', 'The clock (time t)', 'The velocity'],
    correct: 1,
    fb: 'They evolve separately but share the same t. Time is the only bridge between the two axes.',
  },
  {
    q: 'Resolve 20 m/s at 37° above the horizontal (sin37≈0.6, cos37≈0.8). Components?',
    opts: ['vₓ = 16, v_y = 12', 'vₓ = 12, v_y = 16', 'vₓ = 20, v_y = 20'],
    correct: 0,
    fb: 'vₓ = 20cos37 = 20·0.8 = 16 m/s; v_y = 20sin37 = 20·0.6 = 12 m/s.',
  },
  {
    q: 'v = vₓ î + v_y ĵ with vₓ = 3, v_y = 4. What is the speed?',
    opts: ['7 m/s', '5 m/s', '1 m/s'],
    correct: 1,
    fb: '|v| = √(3² + 4²) = √25 = 5 m/s. Recombine components with Pythagoras.',
  },
  {
    q: 'Along a curved path, the velocity vector always points...',
    opts: ['toward the origin', 'straight up', 'tangent to the path'],
    correct: 2,
    fb: 'v = dr/dt is always tangent to the trajectory. Its components are the shadows on each axis.',
  },
  {
    q: 'To differentiate a vector r = x î + y ĵ, you...',
    opts: ['differentiate each component separately', 'multiply the components', 'add the components first'],
    correct: 0,
    fb: 'Vector differentiation is componentwise: dr/dt = (dx/dt) î + (dy/dt) ĵ. Nothing new.',
  },
  {
    q: 'A projectile at the TOP of its flight has which component zero?',
    opts: ['vₓ', 'v_y', 'both'],
    correct: 1,
    fb: 'At the top v_y = 0 (momentarily), but vₓ is unchanged - the horizontal motion never stopped.',
  },
  {
    q: 'The master strategy for ANY 2D kinematics problem is:',
    opts: ['work along the slanted direction directly',
      'resolve → solve each axis as 1D → recombine via shared t',
      'always use vectors, never components'],
    correct: 1,
    fb: 'Resolve into components, solve x and y as separate 1D problems, recombine through the common time t.',
  },
];

let rqIdx = 0;
const rqDone: boolean[] = new Array(rqs.length).fill(false);

function rqRender() {
  const item = rqs[rqIdx];
  document.getElementById('plqTag')!.textContent = `2D kinematics rapid fire · Question ${rqIdx + 1} / ${rqs.length}`;
  document.getElementById('plqQ')!.textContent = item.q;
  const fb = document.getElementById('plqFb')!;
  fb.classList.remove('shown');
  fb.textContent = item.fb;
  const holder = document.getElementById('plqOpts')!;
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
  document.getElementById('plqPrev')!.addEventListener('click', () => {
    if (rqIdx > 0) { rqIdx--; rqRender(); }
  });
  document.getElementById('plqNext')!.addEventListener('click', () => {
    if (rqIdx < rqs.length - 1) { rqIdx++; rqRender(); }
  });
  rqRender();
}

/* ══════════════════════════════════════════════════════════════════════
   pane switching + init
   ══════════════════════════════════════════════════════════════════════ */
const paneIds = ['plVec', 'plKin', 'plInd', 'plEqn', 'plQuiz'] as const;
type PaneId = (typeof paneIds)[number];
let currentPane: PaneId = 'plVec';
const sketches: Partial<Record<PaneId, p5>> = {};

function activatePane(id: PaneId) {
  currentPane = id;
  document.querySelectorAll<HTMLElement>('#plane .grav-pane').forEach((el) => {
    el.classList.toggle('active', el.id === id);
  });
  document.querySelectorAll<HTMLButtonElement>('#plTabs .rev-chip').forEach((b) => {
    b.classList.toggle('active', b.dataset.pane === id);
  });
  if (id === 'plVec' && !sketches.plVec) {
    sketches.plVec = new p5(vecSketch, document.getElementById('plVecCanvas')!);
  } else if (id === 'plKin' && !sketches.plKin) {
    sketches.plKin = new p5(kinSketch, document.getElementById('plKinCanvas')!);
  } else if (id === 'plInd' && !sketches.plInd) {
    sketches.plInd = new p5(indSketch, document.getElementById('plIndCanvas')!);
  } else if (id === 'plEqn' && !sketches.plEqn) {
    sketches.plEqn = new p5(eqnSketch, document.getElementById('plEqCanvas')!);
  } else {
    sketches[id]?.windowResized?.();
  }
}

let inited = false;

export function planeScreenInit() {
  if (!inited) {
    inited = true;
    vecWire();
    kinWire();
    indWire();
    eqnWire();
    rqWire();
    document.querySelectorAll<HTMLButtonElement>('#plTabs .rev-chip').forEach((b) => {
      b.addEventListener('click', () => activatePane(b.dataset.pane as PaneId));
    });
  }
  activatePane(currentPane);
}
