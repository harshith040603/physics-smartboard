/* ═══════════ Motion Under Gravity - four-pane teaching lab ═══════════
   Pane 1: sign-ritual quiz (convention drill)
   Pane 2: drop / throw-down sim with per-second marks (1:3:5 slices)
   Pane 3: throw-up sim with an apex freeze (v = 0 but a = -g)
   Pane 4: two-ball chase (gap keeps growing)
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

/* ═════════ Pane 2 · Drop It ═════════ */
const drop = {
  h: 45,          // tower height (m)
  ud: 0,          // throw-down speed, magnitude (m/s); 0 = dropped
  phase: 'ready' as 'ready' | 'falling' | 'landed',
  t: 0,
};

const dropLandTime = () => (-drop.ud + Math.sqrt(drop.ud * drop.ud + 20 * drop.h)) / G;
const dropImpactSpeed = () => Math.sqrt(drop.ud * drop.ud + 20 * drop.h);

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

    p.background(C.paper);
    ruler(p, worldH, Y, M.l);
    ground(p, Y, M.l);

    /* tower */
    p.noStroke();
    p.fill(41, 89, 144, 30);
    p.rect(lane - 70, Y(drop.h), 44, Y(0) - Y(drop.h));
    p.fill(C.dark);
    p.textSize(13);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text(`h = ${drop.h} m`, lane - 48, Y(drop.h) - 6);

    /* per-second marks + slice labels */
    const tl = dropLandTime();
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

    /* advance */
    if (drop.phase === 'falling') {
      drop.t += p.deltaTime / 1000;
      if (drop.t >= tl) { drop.t = tl; drop.phase = 'landed'; }
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
      if (v > 0.5) arrow(p, lane, by + 12, lane, by + 12 + Math.min(v * 2.4, 110));
      p.noStroke();
      p.fill(C.red);
      p.textSize(13);
      p.textAlign(p.LEFT, p.TOP);
      p.text(`v = −${v.toFixed(1)} m/s`, lane + 14, by + 16);
    }
    /* g arrow - always there, always the same */
    p.stroke(C.navy);
    p.strokeWeight(2.4);
    arrow(p, lane - 44, by - 20, lane - 44, by + 26);
    p.noStroke();
    p.fill(C.navy);
    p.textSize(12.5);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text('a = −g', lane - 52, by + 4);

    ball(p, lane, by);

    /* HUD */
    p.fill(C.navy);
    p.textAlign(p.RIGHT, p.TOP);
    p.textSize(15);
    p.text(
      `t = ${drop.t.toFixed(2)} s   fallen = ${Math.min(fallenNow, drop.h).toFixed(1)} m`,
      p.width - M.r - 6, M.t + 2
    );
    if (drop.phase === 'landed') {
      p.textAlign(p.CENTER, p.TOP);
      p.textSize(17);
      p.fill(C.green);
      p.text(
        `Landed: t = ${tl.toFixed(2)} s, speed = ${dropImpactSpeed().toFixed(1)} m/s`,
        p.width / 2, M.t + 26
      );
    } else if (drop.phase === 'ready') {
      p.fill(C.dark);
      p.textAlign(p.LEFT, p.TOP);
      p.textSize(15);
      p.text('Press Release', M.l + 10, M.t + 2);
    }
  };
};

function dropWire() {
  const h = document.getElementById('gdH') as HTMLInputElement;
  const u = document.getElementById('gdU') as HTMLInputElement;
  h.addEventListener('input', () => {
    drop.h = +h.value;
    document.getElementById('gdHVal')!.textContent = `${h.value} m`;
    drop.phase = 'ready'; drop.t = 0;
    dropStats();
  });
  u.addEventListener('input', () => {
    drop.ud = +u.value;
    document.getElementById('gdUVal')!.textContent =
      drop.ud === 0 ? '0 m/s (dropped)' : `${u.value} m/s down (u = −${u.value})`;
    drop.phase = 'ready'; drop.t = 0;
    dropStats();
  });
  document.getElementById('gdGo')!.addEventListener('click', () => {
    drop.t = 0; drop.phase = 'falling';
  });
  document.getElementById('gdReset')!.addEventListener('click', () => {
    drop.t = 0; drop.phase = 'ready';
  });
  dropStats();
}

/* ═════════ Pane 3 · Throw It Up ═════════ */
const up = {
  u: 20,
  phase: 'ready' as 'ready' | 'flying' | 'frozen' | 'landed',
  t: 0,
  froze: false,       // apex freeze already happened this flight
  freezeLeft: 0,
};

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
    p.noStroke();
    p.fill(C.amber);
    p.textSize(13);
    p.textAlign(p.LEFT, p.BOTTOM);
    p.text(`H = ${H.toFixed(1)} m`, M.l + 8, Y(H) - 5);

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

    /* advance */
    if (up.phase === 'flying') {
      const v = up.u - G * up.t;
      const slow = Math.abs(v) < 4 ? 0.3 : 1;
      up.t += (p.deltaTime / 1000) * slow;
      const vNew = up.u - G * up.t;
      if (!up.froze && vNew <= 0) {
        up.t = tUp;
        up.phase = 'frozen';
        up.froze = true;
        up.freezeLeft = 1.8;
      }
      if (up.t >= T) { up.t = T; up.phase = 'landed'; }
    } else if (up.phase === 'frozen') {
      up.freezeLeft -= p.deltaTime / 1000;
      if (up.freezeLeft <= 0) up.phase = 'flying';
    }

    /* ball + vectors */
    const yNow = Math.max(up.u * up.t - 5 * up.t * up.t, 0);
    const v = up.u - G * up.t;
    const by = Y(yNow);

    if (up.phase !== 'ready') {
      if (Math.abs(v) > 0.5) {
        p.strokeWeight(2.6);
        if (v > 0) {
          p.stroke(C.green);
          arrow(p, lane, by - 12, lane, by - 12 - Math.min(v * 3, 110));
        } else {
          p.stroke(C.red);
          arrow(p, lane, by + 12, lane, by + 12 + Math.min(-v * 3, 110));
        }
        p.noStroke();
        p.fill(v > 0 ? C.green : C.red);
        p.textSize(13);
        p.textAlign(p.LEFT, p.CENTER);
        p.text(`v = ${v >= 0 ? '+' : ''}${v.toFixed(1)} m/s`, lane + 16, by);
      }
    }
    /* g arrow - never switches off */
    p.stroke(C.navy);
    p.strokeWeight(2.4);
    arrow(p, lane - 44, by - 20, lane - 44, by + 26);
    p.noStroke();
    p.fill(C.navy);
    p.textSize(12.5);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text('a = −g', lane - 52, by + 4);

    ball(p, lane, by);

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

    /* HUD */
    p.fill(C.navy);
    p.textAlign(p.RIGHT, p.TOP);
    p.textSize(15);
    p.text(`t = ${up.t.toFixed(2)} s   y = ${yNow.toFixed(1)} m`, p.width - M.r - 6, M.t + 2);
    if (Math.abs(v) < 4 && (up.phase === 'flying' || up.phase === 'frozen')) {
      p.fill(C.amber);
      p.textAlign(p.RIGHT, p.TOP);
      p.text('SLOW MOTION', p.width - M.r - 6, M.t + 24);
    }
    if (up.phase === 'landed') {
      p.textAlign(p.CENTER, p.TOP);
      p.textSize(17);
      p.fill(C.green);
      p.text(
        `Back at launch level: speed = ${up.u} m/s = launch speed. Time up = time down.`,
        p.width / 2, M.t + 26
      );
    } else if (up.phase === 'ready') {
      p.fill(C.dark);
      p.textAlign(p.LEFT, p.TOP);
      p.textSize(15);
      p.text('Press Throw', M.l + 10, M.t + 2);
    }
  };
};

function upWire() {
  const u = document.getElementById('guU') as HTMLInputElement;
  u.addEventListener('input', () => {
    up.u = +u.value;
    document.getElementById('guUVal')!.textContent = `${u.value} m/s`;
    up.phase = 'ready'; up.t = 0; up.froze = false;
    upStats();
  });
  document.getElementById('guGo')!.addEventListener('click', () => {
    up.t = 0; up.froze = false; up.phase = 'flying';
  });
  document.getElementById('guReset')!.addEventListener('click', () => {
    up.t = 0; up.froze = false; up.phase = 'ready';
  });
  upStats();
}

/* ═════════ Pane 4 · Two-Ball Chase ═════════ */
const chase = {
  gap: 1,
  phase: 'ready' as 'ready' | 'running' | 'done',
  t: 0,
};
const CHASE_H = 125;                       // tall tower: A lands at t = 5 s
const chaseYA = (t: number) => Math.max(CHASE_H - 5 * t * t, 0);
const chaseYB = (t: number) => (t <= chase.gap ? CHASE_H : Math.max(CHASE_H - 5 * (t - chase.gap) ** 2, 0));

function chaseLog() {
  const el = document.getElementById('gcLog')!;
  const parts: string[] = [];
  for (let k = 1; k * 1 <= 5; k++) {
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
    p.fill(C.dark);
    p.textSize(13);
    p.textAlign(p.LEFT, p.BOTTOM);
    p.text(`both released here, ${chase.gap} s apart`, laneA - 40, Y(CHASE_H) - 14);

    /* advance */
    if (chase.phase === 'running') {
      chase.t += p.deltaTime / 1000;
      if (chase.t >= 5) { chase.t = 5; chase.phase = 'done'; chaseLog(); }
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
      p.noStroke();
      p.fill(C.amber);
      p.textSize(14.5);
      p.textAlign(p.LEFT, p.CENTER);
      p.text(`gap = ${(yB - yA).toFixed(1)} m`, bx + 12, (Y(yA) + Y(yB)) / 2);
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

    /* HUD */
    p.fill(C.navy);
    p.textAlign(p.RIGHT, p.TOP);
    p.textSize(15);
    p.text(
      `t = ${chase.t.toFixed(2)} s   vA = ${vA.toFixed(0)}   vB = ${vB.toFixed(0)} m/s`,
      p.width - M.r - 6, M.t + 2
    );
    if (chase.phase === 'done') {
      p.textAlign(p.CENTER, p.TOP);
      p.textSize(17);
      p.fill(C.green);
      p.text('A landed - and the gap only ever GREW. A was always the faster one.', p.width / 2, M.t + 26);
    } else if (chase.phase === 'ready') {
      p.fill(C.dark);
      p.textAlign(p.LEFT, p.TOP);
      p.textSize(15);
      p.text('Make your prediction, then press Drop Both', M.l + 10, M.t + 2);
    }
  };
};

function chaseWire() {
  const g = document.getElementById('gcGap') as HTMLInputElement;
  g.addEventListener('input', () => {
    chase.gap = +g.value;
    document.getElementById('gcGapVal')!.textContent = `${g.value} s`;
    chase.phase = 'ready'; chase.t = 0;
  });
  document.getElementById('gcGo')!.addEventListener('click', () => {
    chase.t = 0; chase.phase = 'running';
  });
  document.getElementById('gcReset')!.addEventListener('click', () => {
    chase.t = 0; chase.phase = 'ready';
  });

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
