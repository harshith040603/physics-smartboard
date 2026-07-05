/* ═══════════ "Race Day" — Kinematics L1–4 Revision Story ═══════════
   One connected story, ten chapters — each chapter revises one topic
   cluster of the revision notes, in order:
   1 Warm-Up Lap (distance/displacement) · 2 Bus Ride (speed/velocity)
   3 Which Average? (averaging trap) · 4 Speedometer (instantaneous v)
   5 Shuttle Drill (turning points) · 6 The Race (sign duel)
   7 Coach's Clipboard (equations) · 8 Winning Second (nth second)
   9 Team Quiz (rapid fire) · 10 Trophy Wall (formula sheet)            */

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

const $ = (id: string) => document.getElementById(id)!;

/* ───────────────────────── station framework ───────────────────────── */

const STATIONS = [
  { id: 'revS1', chip: '1 · The Warm-Up Lap' },
  { id: 'revS2', chip: '2 · The Bus Ride' },
  { id: 'revS3', chip: '3 · Which Average?' },
  { id: 'revS4', chip: '4 · The Speedometer' },
  { id: 'revS5', chip: '5 · The Shuttle Drill' },
  { id: 'revS6', chip: '6 · The Race' },
  { id: 'revS7', chip: "7 · Coach's Clipboard" },
  { id: 'revS8', chip: '8 · The Winning Second' },
  { id: 'revS9', chip: '9 · The Team Quiz' },
  { id: 'revS10', chip: '10 · The Trophy Wall' },
];

let current = 0;
const visited = new Set<number>();
const lazyInits: Record<number, () => void> = {};
const lazyDone = new Set<number>();

function showStation(i: number) {
  current = Math.max(0, Math.min(STATIONS.length - 1, i));
  visited.add(current);
  STATIONS.forEach((s, k) => {
    $(s.id).classList.toggle('active', k === current);
    const chip = $(`revChip${k}`);
    chip.classList.toggle('active', k === current);
    chip.classList.toggle('done', visited.has(k) && k !== current);
  });
  $('revStation').textContent = `${current + 1}/${STATIONS.length}`;
  ($('revPrev') as HTMLButtonElement).disabled = current === 0;
  $('revNext').textContent =
    current === STATIONS.length - 1 ? 'The End 🏆' : 'Next chapter ›';
  if (lazyInits[current] && !lazyDone.has(current)) {
    lazyDone.add(current);
    lazyInits[current]();
  }
  $('revision').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildChips() {
  const holder = $('revChips');
  holder.innerHTML = '';
  STATIONS.forEach((s, k) => {
    const b = document.createElement('button');
    b.className = 'rev-chip';
    b.id = `revChip${k}`;
    b.textContent = s.chip;
    b.onclick = () => showStation(k);
    holder.appendChild(b);
  });
}

/* ───────────────────── generic quiz option helper ─────────────────────
   Wire every .rev-opt inside a container: data-ok="1" marks the right
   answer; the sibling .rev-feedback gets the explanation revealed.      */
function wireQuiz(containerId: string) {
  const box = $(containerId);
  const opts = Array.from(box.querySelectorAll<HTMLButtonElement>('.rev-opt'));
  opts.forEach((opt) => {
    opt.addEventListener('click', () => {
      if (box.dataset.answered) return;
      box.dataset.answered = '1';
      opts.forEach((o) => {
        if (o.dataset.ok === '1') o.classList.add('correct');
        else if (o === opt) o.classList.add('wrong');
        o.disabled = true;
      });
      const fb = box.querySelector<HTMLElement>('.rev-feedback');
      if (fb) fb.classList.add('shown');
    });
  });
}

function resetQuiz(containerId: string) {
  const box = $(containerId);
  delete box.dataset.answered;
  box.querySelectorAll<HTMLButtonElement>('.rev-opt').forEach((o) => {
    o.classList.remove('correct', 'wrong');
    o.disabled = false;
  });
  box.querySelector<HTMLElement>('.rev-feedback')?.classList.remove('shown');
}

/* ───────────────────── stepped reveal helper (S2) ───────────────────── */
function wireSteps(btnId: string, stepClass: string) {
  const btn = $(btnId) as HTMLButtonElement;
  const steps = Array.from(document.querySelectorAll<HTMLElement>(`.${stepClass}`));
  let i = 0;
  const update = () => {
    btn.textContent = i >= steps.length ? 'All revealed ✓' : `Reveal step ${i + 1} of ${steps.length} →`;
    btn.disabled = i >= steps.length;
  };
  btn.addEventListener('click', () => {
    if (i < steps.length) steps[i++].classList.add('shown');
    update();
  });
  update();
}

/* ═══════════════ Station 1 — The Lap (p5) ═══════════════ */

const LAP_LEN = 300; // school track, metres (deliberately NOT the notes' 400 m)
const lap = { d: 0 }; // metres run, 0..LAP_LEN
const R_REAL = LAP_LEN / (2 * Math.PI); // ≈ 47.7 m

function lapChord(): number {
  const th = (lap.d / LAP_LEN) * 2 * Math.PI;
  return 2 * R_REAL * Math.sin(th / 2);
}

function lapUpdateReadouts() {
  $('lapDist').textContent = `${lap.d.toFixed(0)} m`;
  $('lapDistRo').textContent = `${lap.d.toFixed(0)} m`;
  $('lapDisp').textContent = `${lapChord().toFixed(1)} m`;
  $('lapMsg').textContent =
    lap.d >= LAP_LEN
      ? `Full lap: distance ${LAP_LEN} m, displacement 0 — back where you started!`
      : lap.d === 0
        ? 'Drag the slider to send the runner around the track.'
        : 'Distance keeps growing… the straight arrow is the displacement.';
}

const lapSketch = (p: p5) => {
  const holder = $('revLapCanvas');
  const h = () => Math.max(340, Math.min(430, Math.round(holder.clientWidth * 0.42)));
  p.setup = () => p.createCanvas(holder.clientWidth, h());
  p.windowResized = () => p.resizeCanvas(holder.clientWidth, h());
  p.draw = () => {
    p.background(C.paper);
    const cx = p.width / 2;
    const cy = p.height / 2 + 8;
    const R = Math.min(p.width, p.height) / 2 - 46;

    // track
    p.noFill();
    p.stroke(41, 89, 144, 60);
    p.strokeWeight(14);
    p.circle(cx, cy, R * 2);
    p.stroke(255);
    p.strokeWeight(2);
    p.drawingContext.setLineDash([8, 10]);
    p.circle(cx, cy, R * 2);
    p.drawingContext.setLineDash([]);

    const a0 = -Math.PI / 2; // start at top
    const th = a0 + (lap.d / LAP_LEN) * 2 * Math.PI;
    const sx = cx + R * Math.cos(a0), sy = cy + R * Math.sin(a0);
    const rx = cx + R * Math.cos(th), ry = cy + R * Math.sin(th);

    // path covered (arc), distance = red-ish arc
    p.noFill();
    p.stroke(C.dark);
    p.strokeWeight(5);
    p.arc(cx, cy, R * 2, R * 2, a0, th);

    // displacement chord
    if (lap.d > 0 && lap.d < 400) {
      p.stroke(C.accent);
      p.strokeWeight(3.5);
      p.line(sx, sy, rx, ry);
      const ang = Math.atan2(ry - sy, rx - sx);
      p.push();
      p.translate(rx, ry);
      p.rotate(ang);
      p.fill(C.accent);
      p.noStroke();
      p.triangle(0, 0, -12, -5, -12, 5);
      p.pop();
    }

    // start flag
    p.noStroke();
    p.fill(C.green);
    p.circle(sx, sy, 13);
    p.fill(C.navy);
    p.textFont('DM Sans');
    p.textSize(13);
    p.textAlign(p.CENTER, p.BOTTOM);
    p.text('START', sx, sy - 12);

    // runner
    p.fill(C.navy);
    p.circle(rx, ry, 18);
    p.fill(C.accent);
    p.circle(rx, ry, 11);
  };
};

function initLap() {
  new p5(lapSketch, $('revLapCanvas'));
  const slider = $('lapSlider') as HTMLInputElement;
  slider.addEventListener('input', () => {
    lap.d = +slider.value;
    lapUpdateReadouts();
  });
  lapUpdateReadouts();
}

/* ═══════════════ Station 4 — Secant → Tangent (p5) ═══════════════ */

const tan = { t0: 1.5, dt: 2 };
const xOf = (t: number) => 2 * t * t + 3 * t; // x = 2t² + 3t (fresh numbers, not the notes')

function tanUpdateReadouts() {
  const t1 = Math.min(tan.t0 + tan.dt, 4);
  const avg = (xOf(t1) - xOf(tan.t0)) / (t1 - tan.t0 || 1e-9);
  const inst = 4 * tan.t0 + 3; // dx/dt of 2t² + 3t
  $('tanT0Val').textContent = `${tan.t0.toFixed(1)} s`;
  $('tanDtVal').textContent = `${tan.dt.toFixed(2)} s`;
  $('tanAvg').textContent = `${avg.toFixed(2)} m/s`;
  $('tanInst').textContent = `${inst.toFixed(2)} m/s`;
  $('tanMsg').textContent =
    tan.dt <= 0.05
      ? 'Δt ≈ 0 — the secant has become the tangent. Average → instantaneous!'
      : 'Shrink Δt and watch the average velocity approach dx/dt.';
}

const tanSketch = (p: p5) => {
  const holder = $('revTanCanvas');
  const h = () => Math.max(340, Math.min(430, Math.round(holder.clientWidth * 0.42)));
  const M = { l: 54, r: 20, t: 22, b: 40 };
  p.setup = () => p.createCanvas(holder.clientWidth, h());
  p.windowResized = () => p.resizeCanvas(holder.clientWidth, h());
  p.draw = () => {
    p.background(C.paper);
    const TMAX = 4, XMAX = xOf(TMAX);
    const X = (t: number) => M.l + (t / TMAX) * (p.width - M.l - M.r);
    const Y = (x: number) => p.height - M.b - (x / XMAX) * (p.height - M.t - M.b);

    // axes
    p.stroke(C.navy); p.strokeWeight(2);
    p.line(M.l, p.height - M.b, p.width - M.r, p.height - M.b);
    p.line(M.l, M.t, M.l, p.height - M.b);
    p.noStroke(); p.fill(C.dark); p.textFont('DM Sans'); p.textSize(13);
    p.textAlign(p.CENTER, p.TOP); p.text('t (s)', p.width - M.r - 16, p.height - M.b + 8);
    p.textAlign(p.LEFT, p.BOTTOM); p.text('x (m)   x = 2t² + 3t', M.l + 8, M.t + 16);
    p.textAlign(p.CENTER, p.TOP);
    for (let t = 0; t <= 4; t++) p.text(`${t}`, X(t), p.height - M.b + 8);

    // curve
    p.noFill(); p.stroke(C.dark); p.strokeWeight(3);
    p.beginShape();
    for (let t = 0; t <= TMAX; t += 0.04) p.vertex(X(t), Y(xOf(t)));
    p.endShape();

    const t1 = Math.min(tan.t0 + tan.dt, TMAX);
    const ax = X(tan.t0), ay = Y(xOf(tan.t0));
    const bx = X(t1), by = Y(xOf(t1));
    const slope = (by - ay) / (bx - ax || 1e-9); // px slope

    // secant line extended across the plot
    p.stroke(tan.dt <= 0.05 ? C.green : C.amber);
    p.strokeWeight(2.5);
    const x0 = M.l, x1 = p.width - M.r;
    p.line(x0, ay + slope * (x0 - ax), x1, ay + slope * (x1 - ax));

    // points
    p.noStroke();
    p.fill(C.red); p.circle(ax, ay, 12);
    p.fill(C.navy); p.textSize(13); p.textAlign(p.LEFT, p.BOTTOM);
    p.text('A (t₀)', ax + 8, ay - 6);
    if (t1 - tan.t0 > 0.001) {
      p.fill(C.amber); p.circle(bx, by, 12);
      p.fill(C.navy); p.text('B (t₀+Δt)', bx + 8, by - 6);
    }
  };
};

function initTan() {
  new p5(tanSketch, $('revTanCanvas'));
  const sT = $('tanT0') as HTMLInputElement;
  const sD = $('tanDt') as HTMLInputElement;
  sT.addEventListener('input', () => { tan.t0 = +sT.value; tanUpdateReadouts(); });
  sD.addEventListener('input', () => { tan.dt = +sD.value; tanUpdateReadouts(); });
  tanUpdateReadouts();
}

/* ═══════════════ Station 5 — Turning Points (p5) ═══════════════ */

/* x = t³ − 9t² + 24t → v = 3t² − 18t + 24 = 3(t−2)(t−4)
   turns at t = 2 s (x = 20 m) and t = 4 s (x = 16 m)  (fresh numbers,
   different turning times from the notes' example)                    */
const turn = { t: 0, playing: false };
const turnX = (t: number) => t ** 3 - 9 * t * t + 24 * t;
const turnV = (t: number) => 3 * t * t - 18 * t + 24;

function turnUpdateReadouts() {
  $('turnTVal').textContent = `${turn.t.toFixed(2)} s`;
  const v = turnV(turn.t);
  $('turnVVal').textContent = `${v.toFixed(2)} m/s`;
  $('turnVVal').style.color = Math.abs(v) < 0.15 ? C.red : C.navy;
}

const turnSketch = (p: p5) => {
  const holder = $('revTurnCanvas');
  const h = () => 240;
  const M = { l: 50, r: 30 };
  p.setup = () => p.createCanvas(holder.clientWidth, h());
  p.windowResized = () => p.resizeCanvas(holder.clientWidth, h());
  p.draw = () => {
    p.background(C.paper);
    const XMAX = 21;
    const X = (x: number) => M.l + (x / XMAX) * (p.width - M.l - M.r);
    const ly = p.height - 60;

    if (turn.playing) {
      turn.t += (p.deltaTime / 1000) * 0.7; // slow motion
      if (turn.t >= 5) { turn.t = 5; turn.playing = false; $('turnPlay').textContent = '↺ Replay'; }
      ($('turnT') as HTMLInputElement).value = String(turn.t);
      turnUpdateReadouts();
    }

    // number line
    p.stroke(C.navy); p.strokeWeight(3);
    p.line(X(0), ly, X(XMAX), ly);
    p.textFont('DM Sans'); p.textSize(13); p.fill(C.dark); p.noStroke();
    p.textAlign(p.CENTER, p.TOP);
    for (let x = 0; x <= XMAX; x += 3) {
      p.stroke(C.navy); p.strokeWeight(2); p.line(X(x), ly - 6, X(x), ly + 6);
      p.noStroke(); p.text(`${x} m`, X(x), ly + 12);
    }

    // turning point flags: t=2 → x=20 · t=4 → x=16 (staggered so labels don't collide)
    p.textSize(12.5);
    p.fill(C.red);
    p.text('turns here (t = 2 s)', X(20), ly - 72);
    p.text('turns here (t = 4 s)', X(16), ly - 46);

    // particle + velocity arrow
    const px = X(turnX(turn.t));
    const v = turnV(turn.t);
    p.stroke(Math.abs(v) < 0.15 ? C.red : C.green);
    p.strokeWeight(3.5);
    const alen = Math.max(-90, Math.min(90, v * 4));
    p.line(px, ly - 34, px + alen, ly - 34);
    if (Math.abs(alen) > 3) {
      const dir = Math.sign(alen);
      p.line(px + alen, ly - 34, px + alen - dir * 9, ly - 39);
      p.line(px + alen, ly - 34, px + alen - dir * 9, ly - 29);
    }
    p.noStroke();
    p.fill(C.navy); p.circle(px, ly, 20);
    p.fill(C.accent); p.circle(px, ly, 12);

    if (Math.abs(v) < 0.15) {
      p.fill(C.red);
      p.textSize(16);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.text('v = 0 — momentarily at rest, TURNING AROUND', p.width / 2, 30);
    }
  };
};

function initTurn() {
  new p5(turnSketch, $('revTurnCanvas'));
  const slider = $('turnT') as HTMLInputElement;
  slider.addEventListener('input', () => {
    turn.t = +slider.value;
    turn.playing = false;
    $('turnPlay').textContent = '▶ Play';
    turnUpdateReadouts();
  });
  $('turnPlay').addEventListener('click', () => {
    if (turn.t >= 5) turn.t = 0;
    turn.playing = !turn.playing;
    $('turnPlay').textContent = turn.playing ? '⏸ Pause' : '▶ Play';
  });
  wireQuiz('turnQuiz');
  turnUpdateReadouts();
}

/* ═══════════════ Station 6 — Sign Duel ═══════════════ */

const DUEL_ROUNDS = [
  { v: 15, a: 4, up: true },
  { v: 18, a: -6, up: false },
  { v: -9, a: -3, up: true },
  { v: -12, a: 3, up: false },
  { v: -20, a: -4, up: true },
  { v: 7, a: -2, up: false },
];
let duelI = 0, duelScore = 0, duelLock = false;

function duelShow() {
  const r = DUEL_ROUNDS[duelI];
  const arrow = (x: number) => (x > 0 ? '→' : '←');
  $('duelPrompt').innerHTML =
    `v = ${r.v > 0 ? '+' : ''}${r.v} m/s <span class="duel-arrow">${arrow(r.v)}</span>` +
    ` &nbsp;·&nbsp; a = ${r.a > 0 ? '+' : ''}${r.a} m/s² <span class="duel-arrow">${arrow(r.a)}</span>`;
  $('duelRound').textContent = `${duelI + 1}/${DUEL_ROUNDS.length}`;
  $('duelScore').textContent = String(duelScore);
  $('duelFb').textContent = '';
  duelLock = false;
}

function duelAnswer(saysUp: boolean) {
  if (duelLock) return;
  duelLock = true;
  const r = DUEL_ROUNDS[duelI];
  const right = saysUp === r.up;
  if (right) duelScore++;
  $('duelScore').textContent = String(duelScore);
  $('duelFb').innerHTML = right
    ? `<span style="color:${C.green};font-weight:800;">Correct!</span> ${r.up ? 'Same signs → speeding up.' : 'Opposite signs → slowing down.'}`
    : `<span style="color:${C.red};font-weight:800;">Not quite.</span> ${r.up ? 'v and a have the SAME sign → speeding up.' : 'v and a have OPPOSITE signs → slowing down.'}`;
  setTimeout(() => {
    duelI++;
    if (duelI >= DUEL_ROUNDS.length) {
      $('duelGame').style.display = 'none';
      $('duelEnd').style.display = 'block';
      $('duelFinal').textContent = `${duelScore} / ${DUEL_ROUNDS.length}`;
    } else duelShow();
  }, 1600);
}

function duelRestart() {
  duelI = 0; duelScore = 0;
  $('duelGame').style.display = 'block';
  $('duelEnd').style.display = 'none';
  duelShow();
}

function initDuel() {
  $('duelUp').addEventListener('click', () => duelAnswer(true));
  $('duelDown').addEventListener('click', () => duelAnswer(false));
  $('duelRestart').addEventListener('click', duelRestart);
  duelShow();
}

/* ═══════════════ Station 7 — The Toolbox ═══════════════ */

function initToolbox() {
  const k = (tex: string, id: string) =>
    katex.render(tex, $(id), { throwOnError: false, displayMode: true });
  k(String.raw`v = u + at`, 'tbEq1');
  k(String.raw`s = ut + \tfrac{1}{2}at^{2}`, 'tbEq2');
  k(String.raw`v^{2} = u^{2} + 2as`, 'tbEq3');
  ['tbUse1', 'tbUse2', 'tbUse3', 'tbUse4', 'tbUse5'].forEach(wireQuiz);
  ['tbPick1', 'tbPick2', 'tbPick3'].forEach(wireQuiz);
}

/* ═══════════════ Station 8 — The nth Second ═══════════════ */

let nthSec = 0;
const NTH_SLICES = [2, 6, 10, 14, 18]; // from rest, a = 4 (same 1:3:5:7:9 ratio, fresh numbers)

function nthStep() {
  if (nthSec >= 5) return;
  nthSec++;
  const bar = $(`nthBar${nthSec}`);
  bar.classList.add('grown');
  $('nthCounter').textContent = `after ${nthSec} s`;
  const total = NTH_SLICES.slice(0, nthSec).reduce((a, b) => a + b, 0);
  $('nthTotal').textContent = `total so far: ${total} m`;
  if (nthSec >= 5) {
    ($('nthStepBtn') as HTMLButtonElement).textContent = 'Pattern complete: 1 : 3 : 5 : 7 : 9 ✓';
    ($('nthStepBtn') as HTMLButtonElement).disabled = true;
  }
}

function nthReset() {
  nthSec = 0;
  NTH_SLICES.forEach((_, i) => $(`nthBar${i + 1}`).classList.remove('grown'));
  $('nthCounter').textContent = 'press to advance one second';
  $('nthTotal').textContent = '';
  const btn = $('nthStepBtn') as HTMLButtonElement;
  btn.textContent = 'Advance 1 second →';
  btn.disabled = false;
  resetQuiz('nthQuiz');
}

function initNth() {
  $('nthStepBtn').addEventListener('click', nthStep);
  $('nthResetBtn').addEventListener('click', nthReset);
  wireQuiz('nthQuiz');
  katex.render(String.raw`s_{n\text{th}} = u + \tfrac{a}{2}(2n-1)`, $('nthFormula'), {
    throwOnError: false, displayMode: true,
  });
}

/* ═══════════════ Station 9 — Rapid Fire ═══════════════ */

const RF: Array<{ q: string; a: string }> = [
  { q: 'A cyclist travels 80 km north in 2 h, then 30 km south in 2 h. Find the average speed and average velocity for the whole trip.',
    a: 'Distance 110 km, displacement 50 km north, time 4 h → avg speed = 27.5 km/h, avg velocity = 12.5 km/h north.' },
  { q: 'A car covers the first half of a journey (by DISTANCE) at 20 km/h and the second half at 60 km/h. Find the average speed.',
    a: 'Equal distances → harmonic mean: 2(20)(60)/(20+60) = 30 km/h. NOT 40!' },
  { q: 'A car covers the first half of the TIME at 30 km/h and the second half at 50 km/h. Find the average speed.',
    a: 'Equal times → simple average: (30+50)/2 = 40 km/h.' },
  { q: 'x = t³ + 2t² (SI). Find the instantaneous velocity at t = 2 s.',
    a: 'v = dx/dt = 3t² + 4t → at t = 2: 12 + 8 = 20 m/s.' },
  { q: 'x = t³ − 27t (SI). Find the time(s) when the particle is momentarily at rest.',
    a: 'v = 3t² − 27 = 0 → t² = 9 → t = 3 s (positive root only).' },
  { q: 'A particle has u = +8 m/s and a = −3 m/s². Speeding up or slowing down?',
    a: 'Opposite signs → SLOWING DOWN. It will stop momentarily, then reverse.' },
  { q: 'A bike accelerates uniformly from 5 m/s to 25 m/s in 5 s. Find a and the distance covered.',
    a: 'a = (25−5)/5 = 4 m/s² ; s = 5(5) + ½(4)(25) = 25 + 50 = 75 m.' },
  { q: 'u = 3 m/s, a = 2 m/s² (uniform). Find the displacement in the 6th second.',
    a: 's₆th = u + (a/2)(2·6−1) = 3 + 1(11) = 14 m. (Units: metres!)' },
  { q: 'A car moving at 30 m/s brakes uniformly and stops in 90 m. Find the deceleration and time to stop.',
    a: 'v² = u² + 2as → 0 = 900 + 180a → a = −5 m/s² ; t = 30/5 = 6 s.' },
  { q: 'Uniform acceleration: 10 m in the 2nd second and 22 m in the 5th second. Find u and a.',
    a: 'u + (a/2)(3) = 10 and u + (a/2)(9) = 22 → subtract: 3a = 12 → a = 4 ; u = 4 m/s.' },
];
let rfI = 0;

function rfShow() {
  $('rfTag').textContent = `Problem ${rfI + 1} of ${RF.length}`;
  $('rfText').textContent = RF[rfI].q;
  $('rfAns').textContent = RF[rfI].a;
  $('rfAns').classList.remove('shown');
  $('rfReveal').textContent = 'Show answer';
  ($('rfPrev') as HTMLButtonElement).disabled = rfI === 0;
  $('rfNext').textContent = rfI === RF.length - 1 ? '↺ Restart' : 'Next problem ›';
}

function initRapidFire() {
  $('rfReveal').addEventListener('click', () => {
    const ans = $('rfAns');
    ans.classList.toggle('shown');
    $('rfReveal').textContent = ans.classList.contains('shown') ? 'Hide answer' : 'Show answer';
  });
  $('rfPrev').addEventListener('click', () => { if (rfI > 0) { rfI--; rfShow(); } });
  $('rfNext').addEventListener('click', () => {
    rfI = rfI === RF.length - 1 ? 0 : rfI + 1;
    rfShow();
  });
  rfShow();
}

/* ═══════════════ Station 10 — Formula Wall ═══════════════ */

const WALL: Array<{ front: string; tex?: string; text?: string }> = [
  { front: 'Distance vs Displacement',
    text: 'Distance ≥ |Displacement| — equal only for straight-line motion with no reversal.' },
  { front: 'Average speed & velocity',
    text: 'avg speed = total distance / total time · avg velocity = displacement / time · avg speed ≥ |avg velocity|' },
  { front: 'The Averaging Trap',
    tex: String.raw`\text{equal }d:\ \frac{2v_1 v_2}{v_1+v_2}\quad\text{equal }t:\ \frac{v_1+v_2}{2}` },
  { front: 'Instantaneous velocity',
    tex: String.raw`v=\frac{dx}{dt}\qquad \text{inst. speed}=|v|` },
  { front: 'Speeding up or slowing down?',
    text: 'SAME signs of v and a → speeding up · OPPOSITE signs → slowing down.' },
  { front: 'Equations of motion (a const!)',
    tex: String.raw`v=u+at\quad s=ut+\tfrac{1}{2}at^{2}\quad v^{2}=u^{2}+2as` },
  { front: 'Displacement in the nth second',
    tex: String.raw`s_{n\text{th}}=u+\tfrac{a}{2}(2n-1)\ \ [\text{metres}]` },
];

function initWall() {
  const grid = $('wallGrid');
  grid.innerHTML = '';
  let flipped = 0;
  WALL.forEach((card) => {
    const el = document.createElement('div');
    el.className = 'wall-card';
    const front = document.createElement('div');
    front.className = 'wall-front';
    front.textContent = card.front;
    const back = document.createElement('div');
    back.className = 'wall-back';
    if (card.tex) katex.render(card.tex, back, { throwOnError: false });
    else back.textContent = card.text!;
    el.appendChild(front);
    el.appendChild(back);
    el.addEventListener('click', () => {
      if (el.classList.contains('flipped')) return;
      el.classList.add('flipped');
      flipped++;
      if (flipped === WALL.length)
        $('wallDone').classList.add('shown');
    });
    grid.appendChild(el);
  });
}

/* ═══════════════ boot & registration ═══════════════ */

let revBuilt = false;

export function revisionScreenInit() {
  if (!revBuilt) {
    revBuilt = true;
    buildChips();
    $('revPrev').addEventListener('click', () => showStation(current - 1));
    $('revNext').addEventListener('click', () => showStation(current + 1));

    /* always-on stations (cheap DOM wiring) */
    wireSteps('s2RevealBtn', 's2-step');
    wireQuiz('s2Quiz');
    wireQuiz('avgQuiz1');
    wireQuiz('avgQuiz2');

    /* lazy stations (p5 / KaTeX) — created on first visit */
    lazyInits[0] = initLap;
    lazyInits[3] = initTan;
    lazyInits[4] = initTurn;
    lazyInits[5] = initDuel;
    lazyInits[6] = initToolbox;
    lazyInits[7] = initNth;
    lazyInits[8] = initRapidFire;
    lazyInits[9] = initWall;
  }
  showStation(current);
}
