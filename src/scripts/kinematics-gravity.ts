/* ═══════════ Motion Under Gravity - four-pane teaching lab ═══════════
   Pane 1: sign-ritual quiz (convention drill)
   Pane 2: drop / throw-down sim with strobe ghosts, 1:3:5 slices and
           a live v-t inset graph
   Pane 3: throw-up sim with apex freeze (v = 0 but a = -g), mirrored
           up/down strobe columns and a v-t line crossing zero
   Pane 4: two-ball chase with ghost-pair ladder and gap-vs-t graph
   p5 instances are created lazily per pane - hidden panes have zero
   width, same constraint as the projectile canvas.                    */

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

/* ═════════ Pane 1 · Sign Ritual quiz ═════════ */
interface GsQ { q: string; opts: string[]; correct: number; fb: string; }

const gsQs: GsQ[] = [
  {
    q: 'We choose UP as positive for the whole class. A ball is DROPPED from a tower. What is u?',
    opts: ['u = +10 m/s', 'u = 0', 'u = −10 m/s'],
    correct: 1,
    fb: '"Dropped" means released with no push - u = 0, always. Reading the verb is half the problem.',
  },
  {
    q: 'Same convention. What is the acceleration a of ANY ball in flight?',
    opts: ['Depends on which way the ball is moving', 'a = +10 m/s²', 'a = −10 m/s²'],
    correct: 2,
    fb: 'Gravity pulls down, and down is negative in our convention. It does NOT care which way the ball happens to be moving.',
  },
  {
    q: 'The ball lands 45 m BELOW the start point. What is s?',
    opts: ['s = −45 m', 's = +45 m', 's = 45 m, sign does not matter'],
    correct: 0,
    fb: 'Below the start means negative in our convention. The sign always matters - it carries the direction.',
  },
  {
    q: 'A ball is THROWN DOWN at 5 m/s. What is u?',
    opts: ['u = 0', 'u = +5 m/s', 'u = −5 m/s'],
    correct: 2,
    fb: '"Thrown down" means u is NOT zero, and it points down - so it takes a minus sign.',
  },
  {
    q: 'A ball is THROWN UP at 20 m/s. What is u?',
    opts: ['u = +20 m/s', 'u = −20 m/s', 'u = 0'],
    correct: 0,
    fb: 'Up is our positive direction, so a throw upward is positive: u = +20 m/s.',
  },
  {
    q: 'That ball reaches the very TOP of its flight. What is v there?',
    opts: ['v = +20 m/s', 'v = 0', 'v = −20 m/s'],
    correct: 1,
    fb: 'At the top the ball is momentarily at rest - a turning point, exactly like the shuttle drill.',
  },
  {
    q: 'Same instant, at the very top. What is a?',
    opts: ['a = 0, the ball is at rest', 'a = −10 m/s², gravity never switches off', 'a = +10 m/s²'],
    correct: 1,
    fb: 'If a were zero at the top, the ball would hang in the air forever. It comes back down precisely BECAUSE gravity keeps pulling. Stopped does not mean no acceleration.',
  },
  {
    q: 'The ball goes up and returns to the SAME level it was thrown from. For the whole trip, s = ?',
    opts: ['s = 2H', 's = −2H', 's = 0'],
    correct: 2,
    fb: 'Displacement is start to end. Same point, so s = 0 - even though the distance travelled is 2H.',
  },
];

let gsIdx = 0;
const gsAnswered: boolean[] = new Array(gsQs.length).fill(false);

function gsRender() {
  const item = gsQs[gsIdx];
  document.getElementById('gsTag')!.textContent = `Sign ritual · Question ${gsIdx + 1} / ${gsQs.length}`;
  document.getElementById('gsQ')!.textContent = item.q;
  const fb = document.getElementById('gsFb')!;
  fb.classList.remove('shown');
  fb.textContent = item.fb;

  const holder = document.getElementById('gsOpts')!;
  holder.innerHTML = '';
  item.opts.forEach((opt, i) => {
    const b = document.createElement('button');
    b.className = 'rev-opt';
    b.textContent = opt;
    b.addEventListener('click', () => {
      if (gsAnswered[gsIdx]) return;
      gsAnswered[gsIdx] = true;
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

function gsWire() {
  document.getElementById('gsPrev')!.addEventListener('click', () => {
    if (gsIdx > 0) { gsIdx--; gsRender(); }
  });
  document.getElementById('gsNext')!.addEventListener('click', () => {
    if (gsIdx < gsQs.length - 1) { gsIdx++; gsRender(); }
  });
  gsRender();
}

/* ═════════ shared drawing helpers ═════════ */
function arrow(p: p5, x1: number, y1: number, x2: number, y2: number) {
  p.line(x1, y1, x2, y2);
  const a = Math.atan2(y2 - y1, x2 - x1);
  const s = 9;
  p.line(x2, y2, x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45));
  p.line(x2, y2, x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45));
}

function niceStep(world: number): number {
  for (const s of [1, 2, 5, 10, 20, 25, 50]) {
    if (world / s <= 10) return s;
  }
  return 100;
}

function ruler(p: p5, worldH: number, Y: (wy: number) => number, ml: number) {
  const step = niceStep(worldH);
  p.stroke(41, 89, 144, 40);
  p.strokeWeight(1);
  for (let gy = 0; gy <= worldH; gy += step) {
    p.line(ml, Y(gy), p.width - 20, Y(gy));
  }
  p.noStroke();
  p.fill(C.dark);
  p.textFont('DM Sans');
  p.textSize(12);
  p.textAlign(p.RIGHT, p.CENTER);
  for (let gy = 0; gy <= worldH; gy += step) {
    p.text(`${gy}`, ml - 8, Y(gy));
  }
  p.textAlign(p.LEFT, p.TOP);
  p.text('metres', ml + 4, 6);
}

function ground(p: p5, Y: (wy: number) => number, ml: number) {
  p.stroke(C.navy);
  p.strokeWeight(3);
  p.line(ml, Y(0), p.width - 20, Y(0));
}

function ball(p: p5, x: number, y: number) {
  p.noStroke();
  p.fill(C.navy);
  p.circle(x, y, 18);
  p.fill(C.accent);
  p.circle(x, y, 11);
}

/* faded multiple-exposure snapshot */
function ghostBall(p: p5, x: number, y: number) {
  p.noStroke();
  p.fill(15, 38, 71, 55);
  p.circle(x, y, 15);
  p.fill(0, 160, 227, 85);
  p.circle(x, y, 9);
}

/* landing squash, k goes 1 → 0 */
function squashBall(p: p5, x: number, y: number, k: number) {
  p.noStroke();
  p.fill(C.navy);
  p.ellipse(x, y + 4, 18 + 14 * k, 18 - 11 * k);
  p.fill(C.accent);
  p.ellipse(x, y + 4, 11 + 9 * k, 11 - 7 * k);
}

/* impact dust burst */
interface Spark { x: number; y: number; vx: number; vy: number; life: number; }

function spawnBurst(arr: Spark[], x: number, y: number) {
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI * Math.random();
    const sp = 70 + Math.random() * 160;
    arr.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + Math.random() * 0.3 });
  }
}

function drawBurst(p: p5, arr: Spark[]) {
  const dt = p.deltaTime / 1000;
  for (let i = arr.length - 1; i >= 0; i--) {
    const b = arr[i];
    b.life -= dt;
    if (b.life <= 0) { arr.splice(i, 1); continue; }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.vy += 520 * dt;
    p.noStroke();
    p.fill(41, 89, 144, Math.min(255, b.life * 420));
    p.circle(b.x, b.y, 5);
  }
}

/* inset graph frame */
function insetFrame(p: p5, gx: number, gy: number, gw: number, gh: number, title: string) {
  p.fill(255);
  p.stroke(41, 89, 144, 70);
  p.strokeWeight(1.5);
  p.rect(gx, gy, gw, gh, 12);
  p.noStroke();
  p.fill(C.dark);
  p.textSize(11.5);
  p.textAlign(p.LEFT, p.TOP);
  p.text(title, gx + 10, gy + 7);
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

function pausedBadge(p: p5) {
  chip(p, '⏸ PAUSED - read the vectors', p.width / 2, 8, 'center', 17, C.amber);
}

/* pause toggle wiring, shared by all three sims */
function wirePause(btnId: string, st: { paused: boolean }) {
  const btn = document.getElementById(btnId)!;
  btn.addEventListener('click', () => {
    st.paused = !st.paused;
    btn.textContent = st.paused ? '▶ Resume' : '⏸ Pause';
  });
}

function clearPause(btnId: string, st: { paused: boolean }) {
  st.paused = false;
  document.getElementById(btnId)!.textContent = '⏸ Pause';
}

/* ═════════ Pane 2 · Drop It ═════════ */
const drop = {
  h: 45,          // tower height (m)
  ud: 0,          // throw-down speed, magnitude (m/s); 0 = dropped
  phase: 'ready' as 'ready' | 'falling' | 'landed',
  t: 0,
  paused: false,
  ghosts: [] as Array<{ y: number }>,
  burst: [] as Spark[],
  squash: 0,
};

const dropLandTime = () => (-drop.ud + Math.sqrt(drop.ud * drop.ud + 20 * drop.h)) / G;
const dropImpactSpeed = () => Math.sqrt(drop.ud * drop.ud + 20 * drop.h);

function dropClear() {
  drop.t = 0;
  drop.ghosts.length = 0;
  drop.burst.length = 0;
  drop.squash = 0;
  clearPause('gdPause', drop);
}

function dropStats() {
  document.getElementById('gdVT')!.textContent = `${dropLandTime().toFixed(2)} s`;
  document.getElementById('gdVV')!.textContent = `${dropImpactSpeed().toFixed(1)} m/s`;
}

const dropSketch = (p: p5) => {
  const holder = document.getElementById('gdCanvas')!;
  const M = { l: 64, r: 20, t: 26, b: 40 };
  const canvasH = () => Math.max(420, Math.min(560, Math.round(holder.clientWidth * 0.55)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    const worldH = drop.h * 1.08;
    const Y = (wy: number) => p.height - M.b - (wy / worldH) * (p.height - M.t - M.b);
    const lane = M.l + (p.width - M.l - M.r) * 0.32;
    const tl = dropLandTime();

    p.background(C.paper);
    ruler(p, worldH, Y, M.l);
    ground(p, Y, M.l);

    /* tower */
    p.noStroke();
    p.fill(41, 89, 144, 30);
    p.rect(lane - 70, Y(drop.h), 44, Y(0) - Y(drop.h));
    chip(p, `h = ${drop.h} m`, lane - 48, Y(drop.h) - 26, 'center', 13, C.dark);

    /* per-second marks + slice labels */
    let prevFallen = 0;
    for (let k = 1; k <= Math.floor(tl); k++) {
      const fallen = drop.ud * k + 5 * k * k;
      if (fallen > drop.h) break;
      const yk = Y(drop.h - fallen);
      p.stroke(C.dark);
      p.strokeWeight(1.4);
      p.drawingContext.setLineDash([5, 5]);
      p.line(lane - 26, yk, lane + 26, yk);
      p.drawingContext.setLineDash([]);
      p.noStroke();
      p.fill(C.dark);
      p.textSize(12.5);
      p.textAlign(p.LEFT, p.CENTER);
      p.text(`t = ${k} s`, lane + 34, yk);
      /* slice: distance covered in THIS second */
      const slice = fallen - prevFallen;
      const midY = (Y(drop.h - prevFallen) + yk) / 2;
      p.fill(C.amber);
      p.textAlign(p.LEFT, p.CENTER);
      p.text(`+${slice} m`, lane + 96, midY);
      prevFallen = fallen;
    }

    /* advance + strobe snapshots every 0.25 s */
    if (drop.phase === 'falling' && !drop.paused) {
      const tPrev = drop.t;
      drop.t += p.deltaTime / 1000;
      const iv = 0.25;
      for (let k = Math.floor(tPrev / iv) + 1; k * iv <= Math.min(drop.t, tl); k++) {
        const tg = k * iv;
        drop.ghosts.push({ y: Math.max(drop.h - (drop.ud * tg + 5 * tg * tg), 0) });
      }
      if (drop.t >= tl) {
        drop.t = tl;
        drop.phase = 'landed';
        drop.squash = 0.4;
        spawnBurst(drop.burst, lane, Y(0));
      }
    }

    /* strobe ghosts (multiple-exposure photo) */
    for (const gh of drop.ghosts) ghostBall(p, lane, Y(gh.y));
    if (drop.ghosts.length > 2) {
      chip(p, 'strobe photo: equal time steps,\ngrowing gaps = acceleration', M.l + 10, M.t + 26, 'left', 12.5, C.dark);
    }

    /* ball + vectors */
    const fallenNow = drop.ud * drop.t + 5 * drop.t * drop.t;
    const yNow = Math.max(drop.h - fallenNow, 0);
    const v = drop.ud + G * drop.t;      // speed, downward
    const by = Y(yNow);

    if (drop.phase !== 'ready') {
      /* velocity arrow (down = red) */
      p.stroke(C.red);
      p.strokeWeight(2.6);
      if (v > 0.5 && drop.phase === 'falling') {
        arrow(p, lane, by + 12, lane, by + 12 + Math.min(v * 2.4, 110));
      }
      chip(p, `v = −${v.toFixed(1)} m/s`, lane + 14, by + 16, 'left', 13, C.red);
    }
    /* g arrow - always there, always the same */
    p.stroke(C.navy);
    p.strokeWeight(2.4);
    arrow(p, lane - 44, by - 20, lane - 44, by + 26);
    chip(p, 'a = −g', lane - 52, by - 5, 'right', 12.5, C.navy);

    if (drop.squash > 0 && drop.phase === 'landed') {
      drop.squash = Math.max(0, drop.squash - p.deltaTime / 1000);
      squashBall(p, lane, by, drop.squash / 0.4);
    } else {
      ball(p, lane, by);
    }
    drawBurst(p, drop.burst);

    /* v-t inset graph - the bridge to motion graphs */
    if (p.width > 780) {
      const gw = 224, gh = 132;
      const gx = p.width - gw - 16;
      const gy = p.height - M.b - gh - 12;
      insetFrame(p, gx, gy, gw, gh, 'v-t graph: straight line, slope = −10');
      const x0 = gx + 34, x1 = gx + gw - 14;
      const y0 = gy + 32, y1 = gy + gh - 16;
      const vEnd = dropImpactSpeed();
      const IX = (tt: number) => x0 + (tt / tl) * (x1 - x0);
      const IY = (spd: number) => y0 + (spd / vEnd) * (y1 - y0);
      p.stroke(41, 89, 144, 90);
      p.strokeWeight(1);
      p.line(x0, y0, x0, y1);
      p.line(x0, y0, x1, y0);
      /* predicted line, dashed */
      p.stroke(C.dark);
      p.strokeWeight(1.6);
      p.drawingContext.setLineDash([4, 4]);
      p.line(IX(0), IY(drop.ud), IX(tl), IY(vEnd));
      p.drawingContext.setLineDash([]);
      /* progress */
      const spdNow = Math.min(drop.ud + G * drop.t, vEnd);
      p.stroke(C.red);
      p.strokeWeight(2.5);
      p.line(IX(0), IY(drop.ud), IX(Math.min(drop.t, tl)), IY(spdNow));
      p.noStroke();
      p.fill(C.red);
      p.circle(IX(Math.min(drop.t, tl)), IY(spdNow), 7);
      p.fill(C.dark);
      p.textSize(11);
      p.textAlign(p.RIGHT, p.CENTER);
      p.text('0', x0 - 5, y0);
      p.text(`−${vEnd.toFixed(0)}`, x0 - 5, y1);
      p.textAlign(p.RIGHT, p.TOP);
      p.text('t →', x1, y0 + 4);
    }

    /* HUD */
    chip(
      p,
      `t = ${drop.t.toFixed(2)} s   fallen = ${Math.min(fallenNow, drop.h).toFixed(1)} m`,
      p.width - M.r - 6, 6, 'right', 15, C.navy
    );
    if (drop.phase === 'falling' && drop.paused) pausedBadge(p);
    if (drop.phase === 'landed') {
      chip(
        p,
        `Landed: t = ${tl.toFixed(2)} s, speed = ${dropImpactSpeed().toFixed(1)} m/s`,
        p.width / 2, M.t + 26, 'center', 17, C.green
      );
    } else if (drop.phase === 'ready') {
      chip(p, 'Press Release', M.l + 10, M.t + 2, 'left', 15, C.dark);
    }
  };
};

function dropWire() {
  const h = document.getElementById('gdH') as HTMLInputElement;
  const u = document.getElementById('gdU') as HTMLInputElement;
  h.addEventListener('input', () => {
    drop.h = +h.value;
    document.getElementById('gdHVal')!.textContent = `${h.value} m`;
    drop.phase = 'ready';
    dropClear();
    dropStats();
  });
  u.addEventListener('input', () => {
    drop.ud = +u.value;
    document.getElementById('gdUVal')!.textContent =
      drop.ud === 0 ? '0 m/s (dropped)' : `${u.value} m/s down (u = −${u.value})`;
    drop.phase = 'ready';
    dropClear();
    dropStats();
  });
  document.getElementById('gdGo')!.addEventListener('click', () => {
    dropClear();
    drop.phase = 'falling';
  });
  document.getElementById('gdReset')!.addEventListener('click', () => {
    dropClear();
    drop.phase = 'ready';
  });
  wirePause('gdPause', drop);
  dropStats();
}

/* ═════════ Pane 3 · Throw It Up ═════════ */
const up = {
  u: 20,
  phase: 'ready' as 'ready' | 'flying' | 'frozen' | 'landed',
  t: 0,
  froze: false,       // apex freeze already happened this flight
  freezeLeft: 0,
  paused: false,
  ghosts: [] as Array<{ y: number; side: number }>,
  burst: [] as Spark[],
  squash: 0,
};

function upClear() {
  up.t = 0;
  up.froze = false;
  up.ghosts.length = 0;
  up.burst.length = 0;
  up.squash = 0;
  clearPause('guPause', up);
}

function upStats() {
  const tUp = up.u / G;
  document.getElementById('guVT')!.textContent = `${tUp.toFixed(1)} s`;
  document.getElementById('guVH')!.textContent = `${(up.u * up.u / (2 * G)).toFixed(1)} m`;
  document.getElementById('guVTT')!.textContent = `${(2 * tUp).toFixed(1)} s`;
}

const upSketch = (p: p5) => {
  const holder = document.getElementById('guCanvas')!;
  const M = { l: 64, r: 20, t: 26, b: 62 };
  const canvasH = () => Math.max(420, Math.min(560, Math.round(holder.clientWidth * 0.55)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    const H = (up.u * up.u) / (2 * G);
    const tUp = up.u / G;
    const T = 2 * tUp;
    const worldH = Math.max(H * 1.22, 6);
    const Y = (wy: number) => p.height - M.b - (wy / worldH) * (p.height - M.t - M.b);
    const lane = M.l + (p.width - M.l - M.r) * 0.36;

    p.background(C.paper);
    ruler(p, worldH, Y, M.l);
    ground(p, Y, M.l);

    /* predicted max height */
    p.stroke(C.amber);
    p.strokeWeight(1.6);
    p.drawingContext.setLineDash([6, 6]);
    p.line(M.l, Y(H), p.width - M.r, Y(H));
    p.drawingContext.setLineDash([]);
    chip(p, `H = ${H.toFixed(1)} m`, M.l + 8, Y(H) - 25, 'left', 13, C.amber);

    /* symmetry timeline */
    const tx1 = M.l, tx2 = p.width - M.r;
    const ty = p.height - 24;
    const TX = (tt: number) => tx1 + (tt / T) * (tx2 - tx1);
    p.stroke(C.dark);
    p.strokeWeight(2);
    p.line(tx1, ty, tx2, ty);
    p.line(TX(tUp), ty - 6, TX(tUp), ty + 6);
    p.noStroke();
    p.fill(C.dark);
    p.textSize(12.5);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text(`up: ${tUp.toFixed(1)} s`, (tx1 + TX(tUp)) / 2, ty - 6);
    p.text(`down: ${tUp.toFixed(1)} s`, (TX(tUp) + tx2) / 2, ty - 6);
    /* progress marker on the timeline */
    if (up.phase !== 'ready') {
      p.noStroke();
      p.fill(C.accent);
      p.circle(TX(Math.min(up.t, T)), ty, 9);
    }

    /* advance + mirrored strobe snapshots every 0.3 s */
    if (up.phase === 'flying' && !up.paused) {
      const tPrev = up.t;
      const v = up.u - G * up.t;
      const slow = Math.abs(v) < 4 ? 0.3 : 1;
      up.t += (p.deltaTime / 1000) * slow;
      const iv = 0.3;
      for (let k = Math.floor(tPrev / iv) + 1; k * iv <= Math.min(up.t, T); k++) {
        const tg = k * iv;
        up.ghosts.push({
          y: Math.max(up.u * tg - 5 * tg * tg, 0),
          side: tg <= tUp ? -1 : 1,
        });
      }
      const vNew = up.u - G * up.t;
      if (!up.froze && vNew <= 0) {
        up.t = tUp;
        up.phase = 'frozen';
        up.froze = true;
        up.freezeLeft = 1.8;
      }
      if (up.t >= T) {
        up.t = T;
        up.phase = 'landed';
        up.squash = 0.4;
        spawnBurst(up.burst, lane, Y(0));
      }
    } else if (up.phase === 'frozen' && !up.paused) {
      up.freezeLeft -= p.deltaTime / 1000;
      if (up.freezeLeft <= 0) up.phase = 'flying';
    }

    /* strobe ghosts: way up on the left column, way down on the right */
    for (const gh of up.ghosts) ghostBall(p, lane + gh.side * 32, Y(gh.y));
    if (up.ghosts.some((g) => g.side === 1)) {
      chip(p, 'mirror images: same heights\non the way up and down', M.l + 10, M.t + 26, 'left', 12.5, C.dark);
    }

    /* ball + vectors */
    const yNow = Math.max(up.u * up.t - 5 * up.t * up.t, 0);
    const v = up.u - G * up.t;
    const by = Y(yNow);

    if (up.phase !== 'ready') {
      if (Math.abs(v) > 0.5 && up.phase !== 'landed') {
        p.strokeWeight(2.6);
        if (v > 0) {
          p.stroke(C.green);
          arrow(p, lane, by - 12, lane, by - 12 - Math.min(v * 3, 110));
        } else {
          p.stroke(C.red);
          arrow(p, lane, by + 12, lane, by + 12 + Math.min(-v * 3, 110));
        }
        chip(p, `v = ${v >= 0 ? '+' : ''}${v.toFixed(1)} m/s`, lane + 16, by - 9, 'left', 13, v > 0 ? C.green : C.red);
      }
    }
    /* g arrow - never switches off */
    p.stroke(C.navy);
    p.strokeWeight(2.4);
    arrow(p, lane - 44, by - 20, lane - 44, by + 26);
    chip(p, 'a = −g', lane - 52, by - 5, 'right', 12.5, C.navy);

    /* pulsing rings at the apex while frozen */
    if (up.phase === 'frozen') {
      const ph = (p.millis() % 1100) / 1100;
      p.noFill();
      p.stroke(0, 160, 227, 210 * (1 - ph));
      p.strokeWeight(2.5);
      p.circle(lane, by, 26 + ph * 52);
      p.stroke(0, 160, 227, 120 * (1 - ph));
      p.circle(lane, by, 26 + ph * 84);
    }

    if (up.squash > 0 && up.phase === 'landed') {
      up.squash = Math.max(0, up.squash - p.deltaTime / 1000);
      squashBall(p, lane, by, up.squash / 0.4);
    } else {
      ball(p, lane, by);
    }
    drawBurst(p, up.burst);

    /* apex freeze callout */
    if (up.phase === 'frozen') {
      const cw = Math.min(330, p.width - lane - 40);
      const cx = lane + 26, cy = Math.max(by - 30, M.t + 8);
      p.fill(255);
      p.stroke(C.accent);
      p.strokeWeight(2.5);
      p.rect(cx, cy, cw, 74, 14);
      p.noStroke();
      p.fill(C.navy);
      p.textAlign(p.LEFT, p.TOP);
      p.textSize(16);
      p.text('AT THE TOP:  v = 0', cx + 14, cy + 12);
      p.fill(C.red);
      p.text('but a = −10 m/s², still!', cx + 14, cy + 36);
      p.fill(C.dark);
      p.textSize(12.5);
      p.text('Gravity never switches off.', cx + 14, cy + 57);
    }

    /* v-t inset: one straight line, right through zero */
    if (p.width > 780) {
      const gw = 224, gh = 138;
      const gx = p.width - gw - 16;
      const gy = p.height - M.b - gh - 14;
      insetFrame(p, gx, gy, gw, gh, 'v-t graph: one line through zero');
      const x0 = gx + 38, x1 = gx + gw - 14;
      const y0 = gy + 30, y1 = gy + gh - 16;
      const ymid = (y0 + y1) / 2;
      const IX = (tt: number) => x0 + (tt / T) * (x1 - x0);
      const IY = (vv: number) => ymid - (vv / up.u) * (ymid - y0);
      p.stroke(41, 89, 144, 90);
      p.strokeWeight(1);
      p.line(x0, y0, x0, y1);
      p.drawingContext.setLineDash([3, 4]);
      p.line(x0, ymid, x1, ymid);                     // v = 0 line
      p.drawingContext.setLineDash([]);
      /* predicted line, dashed */
      p.stroke(C.dark);
      p.strokeWeight(1.6);
      p.drawingContext.setLineDash([4, 4]);
      p.line(IX(0), IY(up.u), IX(T), IY(-up.u));
      p.drawingContext.setLineDash([]);
      /* apex marker */
      p.noStroke();
      p.fill(C.amber);
      p.circle(IX(tUp), ymid, 7);
      p.textSize(11);
      p.textAlign(p.LEFT, p.BOTTOM);
      p.text('v = 0 at the top', IX(tUp) + 6, ymid - 4);
      /* progress */
      const tNow = Math.min(up.t, T);
      const vNow = up.u - G * tNow;
      p.stroke(C.red);
      p.strokeWeight(2.5);
      p.line(IX(0), IY(up.u), IX(tNow), IY(vNow));
      p.noStroke();
      p.fill(C.red);
      p.circle(IX(tNow), IY(vNow), 7);
      p.fill(C.dark);
      p.textSize(11);
      p.textAlign(p.RIGHT, p.CENTER);
      p.text(`+${up.u}`, x0 - 5, y0);
      p.text('0', x0 - 5, ymid);
      p.text(`−${up.u}`, x0 - 5, y1);
    }

    /* HUD */
    chip(p, `t = ${up.t.toFixed(2)} s   y = ${yNow.toFixed(1)} m`, p.width - M.r - 6, 6, 'right', 15, C.navy);
    if (Math.abs(v) < 4 && (up.phase === 'flying' || up.phase === 'frozen')) {
      chip(p, 'SLOW MOTION', p.width - M.r - 6, 32, 'right', 14, C.amber);
    }
    if ((up.phase === 'flying' || up.phase === 'frozen') && up.paused) pausedBadge(p);
    if (up.phase === 'landed') {
      chip(
        p,
        `Back at launch level: speed = ${up.u} m/s = launch speed. Time up = time down.`,
        p.width / 2, M.t + 26, 'center', 16, C.green
      );
    } else if (up.phase === 'ready') {
      chip(p, 'Press Throw', M.l + 10, M.t + 2, 'left', 15, C.dark);
    }
  };
};

function upWire() {
  const u = document.getElementById('guU') as HTMLInputElement;
  u.addEventListener('input', () => {
    up.u = +u.value;
    document.getElementById('guUVal')!.textContent = `${u.value} m/s`;
    up.phase = 'ready';
    upClear();
    upStats();
  });
  document.getElementById('guGo')!.addEventListener('click', () => {
    upClear();
    up.phase = 'flying';
  });
  document.getElementById('guReset')!.addEventListener('click', () => {
    upClear();
    up.phase = 'ready';
  });
  wirePause('guPause', up);
  upStats();
}

/* ═════════ Pane 4 · Two-Ball Chase ═════════ */
const chase = {
  gap: 1,
  phase: 'ready' as 'ready' | 'running' | 'done',
  t: 0,
  paused: false,
  ghosts: [] as Array<{ yA: number; yB: number }>,
  burst: [] as Spark[],
};
const CHASE_H = 125;                       // tall tower: A lands at t = 5 s
const chaseYA = (t: number) => Math.max(CHASE_H - 5 * t * t, 0);
const chaseYB = (t: number) => (t <= chase.gap ? CHASE_H : Math.max(CHASE_H - 5 * (t - chase.gap) ** 2, 0));

function chaseClear() {
  chase.t = 0;
  chase.ghosts.length = 0;
  chase.burst.length = 0;
  clearPause('gcPause', chase);
}

function chaseLog() {
  const el = document.getElementById('gcLog')!;
  const parts: string[] = [];
  for (let k = 1; k <= 5; k++) {
    if (k <= chase.gap) continue;
    const gapM = chaseYB(k) - chaseYA(k);
    parts.push(`t = ${k} s → gap ${gapM.toFixed(1)} m`);
  }
  el.innerHTML = `<b>Gap over time:</b> ${parts.join(' · ')} - it grows every second. Same a, but A is always faster.`;
}

const chaseSketch = (p: p5) => {
  const holder = document.getElementById('gcCanvas')!;
  const M = { l: 64, r: 20, t: 26, b: 40 };
  const canvasH = () => Math.max(420, Math.min(560, Math.round(holder.clientWidth * 0.55)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    const worldH = CHASE_H * 1.06;
    const Y = (wy: number) => p.height - M.b - (wy / worldH) * (p.height - M.t - M.b);
    const laneA = M.l + (p.width - M.l - M.r) * 0.30;
    const laneB = laneA + 54;

    p.background(C.paper);
    ruler(p, worldH, Y, M.l);
    ground(p, Y, M.l);

    /* start platform */
    p.noStroke();
    p.fill(41, 89, 144, 30);
    p.rect(laneA - 40, Y(CHASE_H) - 8, laneB - laneA + 80, 8);
    chip(p, `both released here, ${chase.gap} s apart`, laneA - 40, Y(CHASE_H) - 34, 'left', 13, C.dark);

    /* advance + ghost pairs every 0.5 s */
    if (chase.phase === 'running' && !chase.paused) {
      const tPrev = chase.t;
      chase.t += p.deltaTime / 1000;
      const iv = 0.5;
      for (let k = Math.floor(tPrev / iv) + 1; k * iv <= Math.min(chase.t, 5); k++) {
        const tg = k * iv;
        chase.ghosts.push({ yA: chaseYA(tg), yB: chaseYB(tg) });
      }
      if (chase.t >= 5) {
        chase.t = 5;
        chase.phase = 'done';
        spawnBurst(chase.burst, laneA, Y(0));
        chaseLog();
      }
    }

    /* ghost-pair ladder: each rung is one instant - watch it tilt open */
    for (const gh of chase.ghosts) {
      p.stroke(41, 89, 144, 55);
      p.strokeWeight(1.6);
      p.line(laneA, Y(gh.yA), laneB, Y(gh.yB));
      ghostBall(p, laneA, Y(gh.yA));
      p.noStroke();
      p.fill(245, 158, 11, 80);
      p.circle(laneB, Y(gh.yB), 15);
    }

    const yA = chaseYA(chase.t);
    const yB = chaseYB(chase.t);
    const vA = G * chase.t;
    const vB = chase.t > chase.gap ? G * (chase.t - chase.gap) : 0;

    /* gap bracket */
    if (chase.phase !== 'ready' && chase.t > chase.gap) {
      const bx = laneB + 44;
      p.stroke(C.amber);
      p.strokeWeight(2.2);
      p.line(bx, Y(yB), bx, Y(yA));
      p.line(bx - 7, Y(yB), bx + 7, Y(yB));
      p.line(bx - 7, Y(yA), bx + 7, Y(yA));
      chip(p, `gap = ${(yB - yA).toFixed(1)} m`, bx + 12, (Y(yA) + Y(yB)) / 2 - 10, 'left', 14.5, C.amber);
    }

    /* balls */
    ball(p, laneA, Y(yA));
    p.noStroke();
    p.fill(C.navy);
    p.textSize(13);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text('A', laneA, Y(yA) - 12);

    p.noStroke();
    p.fill(C.amber);
    p.circle(laneB, Y(yB), 18);
    p.fill('#fff');
    p.circle(laneB, Y(yB), 8);
    p.fill(C.navy);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text('B', laneB, Y(yB) - 12);

    drawBurst(p, chase.burst);

    /* gap-vs-t inset: a straight line after B lets go */
    if (p.width > 780) {
      const gw = 224, gh = 132;
      const gx = p.width - gw - 16;
      const gy = p.height - M.b - gh - 12;
      insetFrame(p, gx, gy, gw, gh, 'gap-t graph: grows every second');
      const x0 = gx + 34, x1 = gx + gw - 14;
      const y0 = gy + 30, y1 = gy + gh - 16;
      const gapMax = 5 * 25 - 5 * (5 - chase.gap) ** 2;
      const IX = (tt: number) => x0 + (tt / 5) * (x1 - x0);
      const IY = (gm: number) => y1 - (gm / gapMax) * (y1 - y0);
      p.stroke(41, 89, 144, 90);
      p.strokeWeight(1);
      p.line(x0, y0, x0, y1);
      p.line(x0, y1, x1, y1);
      /* predicted, dashed: flat 0 until the gap, then straight up */
      p.stroke(C.dark);
      p.strokeWeight(1.6);
      p.drawingContext.setLineDash([4, 4]);
      p.line(IX(0), IY(0), IX(chase.gap), IY(0));
      p.line(IX(chase.gap), IY(0), IX(5), IY(gapMax));
      p.drawingContext.setLineDash([]);
      /* progress */
      const tNow = Math.min(chase.t, 5);
      const gapNow = chaseYB(tNow) - chaseYA(tNow);
      p.stroke(C.amber);
      p.strokeWeight(2.5);
      if (tNow > chase.gap) {
        p.line(IX(0), IY(0), IX(chase.gap), IY(0));
        p.line(IX(chase.gap), IY(0), IX(tNow), IY(gapNow));
      } else {
        p.line(IX(0), IY(0), IX(tNow), IY(0));
      }
      p.noStroke();
      p.fill(C.amber);
      p.circle(IX(tNow), IY(Math.max(gapNow, 0)), 7);
      p.fill(C.dark);
      p.textSize(11);
      p.textAlign(p.RIGHT, p.CENTER);
      p.text('0', x0 - 5, y1);
      p.text(`${gapMax.toFixed(0)}`, x0 - 5, y0);
      p.textAlign(p.RIGHT, p.BOTTOM);
      p.text('t →', x1, y1 - 3);
    }

    /* HUD */
    chip(
      p,
      `t = ${chase.t.toFixed(2)} s   vA = ${vA.toFixed(0)}   vB = ${vB.toFixed(0)} m/s`,
      p.width - M.r - 6, 6, 'right', 15, C.navy
    );
    if (chase.phase === 'running' && chase.paused) pausedBadge(p);
    if (chase.phase === 'done') {
      chip(p, 'A landed - and the gap only ever GREW. A was always the faster one.', p.width / 2, M.t + 26, 'center', 16, C.green);
    } else if (chase.phase === 'ready') {
      chip(p, 'Make your prediction, then press Drop Both', M.l + 10, M.t + 2, 'left', 15, C.dark);
    }
  };
};

function chaseWire() {
  const g = document.getElementById('gcGap') as HTMLInputElement;
  g.addEventListener('input', () => {
    chase.gap = +g.value;
    document.getElementById('gcGapVal')!.textContent = `${g.value} s`;
    chase.phase = 'ready';
    chaseClear();
  });
  document.getElementById('gcGo')!.addEventListener('click', () => {
    chaseClear();
    chase.phase = 'running';
  });
  document.getElementById('gcReset')!.addEventListener('click', () => {
    chaseClear();
    chase.phase = 'ready';
  });
  wirePause('gcPause', chase);

  /* prediction buttons */
  const fb = document.getElementById('gcFb')!;
  document.querySelectorAll<HTMLButtonElement>('#gcOpts .rev-opt').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll<HTMLButtonElement>('#gcOpts .rev-opt').forEach((x) => {
        x.disabled = true;
        if (x.dataset.ans === 'grow') x.classList.add('correct');
      });
      if (b.dataset.ans !== 'grow') b.classList.add('wrong');
      fb.classList.add('shown');
    });
  });
}

/* ═════════ formulas (KaTeX) ═════════ */
function gravFormulas() {
  const opts = { throwOnError: false, displayMode: true };
  katex.render(String.raw`s = ut + \tfrac{1}{2}at^{2}`, document.getElementById('gdFT')!, opts);
  katex.render(String.raw`v^{2} = u^{2} + 2as`, document.getElementById('gdFV')!, opts);
  katex.render(String.raw`t_{\text{up}} = \dfrac{u}{g}`, document.getElementById('guFT')!, opts);
  katex.render(String.raw`H = \dfrac{u^{2}}{2g}`, document.getElementById('guFH')!, opts);
  katex.render(String.raw`T = \dfrac{2u}{g}`, document.getElementById('guFTT')!, opts);
}

/* ═════════ pane switching + init ═════════ */
const paneIds = ['gravSign', 'gravDrop', 'gravUp', 'gravChase'] as const;
type PaneId = (typeof paneIds)[number];
let currentPane: PaneId = 'gravSign';
const sketches: Partial<Record<PaneId, p5>> = {};

function activatePane(id: PaneId) {
  currentPane = id;
  document.querySelectorAll<HTMLElement>('#gravity .grav-pane').forEach((el) => {
    el.classList.toggle('active', el.id === id);
  });
  document.querySelectorAll<HTMLButtonElement>('#gravTabs .rev-chip').forEach((b) => {
    b.classList.toggle('active', b.dataset.pane === id);
  });
  /* lazy p5 creation - pane is visible now, so the canvas has real width */
  if (id === 'gravDrop' && !sketches.gravDrop) {
    sketches.gravDrop = new p5(dropSketch, document.getElementById('gdCanvas')!);
  } else if (id === 'gravUp' && !sketches.gravUp) {
    sketches.gravUp = new p5(upSketch, document.getElementById('guCanvas')!);
  } else if (id === 'gravChase' && !sketches.gravChase) {
    sketches.gravChase = new p5(chaseSketch, document.getElementById('gcCanvas')!);
  } else {
    sketches[id]?.windowResized?.();
  }
}

let gravInited = false;

export function gravityScreenInit() {
  if (!gravInited) {
    gravInited = true;
    gsWire();
    dropWire();
    upWire();
    chaseWire();
    gravFormulas();
    document.querySelectorAll<HTMLButtonElement>('#gravTabs .rev-chip').forEach((b) => {
      b.addEventListener('click', () => activatePane(b.dataset.pane as PaneId));
    });
  }
  activatePane(currentPane);
}
