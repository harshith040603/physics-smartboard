/* ═══════════ Relative Motion (1D) - five-pane teaching lab ═══════════
   Pane 1: The Rule - v_AB = v_A − v_B, live subscript grammar with two
           cars on a looping road and velocity arrows.
   Pane 2: Same vs Opposite - closing speed adds or subtracts, two cars
           approach with a live gap bracket.
   Pane 3: Frame Switch - the marquee. Toggle between the ground frame and
           B's frame; watch B freeze and the two-body chase collapse into a
           one-body problem, with the catch-up time computed live.
   Pane 4: Worked Problems - DOM stepper over the three lecture problems.
   Pane 5: Rapid Fire - ten quick relative-velocity readings.
   p5 instances are created lazily per pane - hidden panes have zero width,
   same constraint as every other studio canvas.                          */

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

/* ═════════ shared drawing helpers ═════════ */
function arrow(p: p5, x1: number, y1: number, x2: number, y2: number) {
  p.line(x1, y1, x2, y2);
  const a = Math.atan2(y2 - y1, x2 - x1);
  const s = 9;
  p.line(x2, y2, x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45));
  p.line(x2, y2, x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45));
}

/* text on a white chip - always readable over the road */
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

/* dashed two-lane road with scrolling centre markers.
   phase (in px) scrolls the dashes to convey ground motion. */
function road(p: p5, top: number, bottom: number, ml: number, mr: number, phase: number) {
  p.noStroke();
  p.fill(41, 89, 144, 22);
  p.rect(ml, top, p.width - ml - mr, bottom - top, 10);
  /* edges */
  p.stroke(C.navy);
  p.strokeWeight(2.5);
  p.line(ml, top, p.width - mr, top);
  p.line(ml, bottom, p.width - mr, bottom);
  /* scrolling centre line */
  const midY = (top + bottom) / 2;
  const dash = 26, gap = 22, period = dash + gap;
  p.stroke(255, 255, 255, 210);
  p.strokeWeight(3);
  let off = -(((phase % period) + period) % period);
  for (let x = ml + off; x < p.width - mr; x += period) {
    const x1 = Math.max(x, ml);
    const x2 = Math.min(x + dash, p.width - mr);
    if (x2 > x1) p.line(x1, midY, x2, midY);
  }
}

/* a little car: body + cabin + two wheels + a nose in the facing direction.
   cx = centre x, baseY = road surface the wheels sit on, dir = +1 / −1.   */
function car(p: p5, cx: number, baseY: number, col: string, label: string, dir: number, dim = false) {
  const w = 62, h = 24;
  const a = dim ? 150 : 255;
  const cc = p.color(col);
  cc.setAlpha(a);
  const bodyY = baseY - h - 7;
  /* wheels */
  p.noStroke();
  p.fill(15, 38, 71, a);
  p.circle(cx - w * 0.28, baseY - 6, 15);
  p.circle(cx + w * 0.28, baseY - 6, 15);
  p.fill(255, 255, 255, a);
  p.circle(cx - w * 0.28, baseY - 6, 6);
  p.circle(cx + w * 0.28, baseY - 6, 6);
  /* body */
  p.fill(cc);
  p.rect(cx - w / 2, bodyY, w, h, 7);
  /* cabin, offset toward the facing direction */
  p.fill(255, 255, 255, a * 0.85);
  p.rect(cx - 11 + dir * 7, bodyY - 12, 22, 15, 5, 5, 2, 2);
  /* nose */
  p.fill(cc);
  p.triangle(
    cx + dir * (w / 2), bodyY + 3,
    cx + dir * (w / 2 + 9), bodyY + h / 2,
    cx + dir * (w / 2), bodyY + h - 3
  );
  /* label */
  p.fill(dim ? p.color(120, 120, 120) : p.color(C.navy));
  p.textFont('Bricolage Grotesque');
  p.textSize(15);
  p.textAlign(p.CENTER, p.CENTER);
  p.text(label, cx, bodyY + h / 2 + 1);
}

/* velocity arrow floating above a car, length ∝ speed, colour by sign */
function velArrow(p: p5, cx: number, y: number, v: number, label: string) {
  if (Math.abs(v) < 0.5) {
    chip(p, `${label} = 0`, cx, y - 20, 'center', 13, C.dark);
    return;
  }
  const len = Math.min(Math.abs(v) * 1.5, 120);
  const dir = Math.sign(v);
  const col = dir > 0 ? C.green : C.red;
  p.stroke(col);
  p.strokeWeight(3);
  arrow(p, cx, y, cx + dir * len, y);
  chip(p, `${label} = ${v > 0 ? '+' : ''}${v} m/s`, cx + dir * len + dir * 6, y - 9, dir > 0 ? 'left' : 'right', 13, col);
}

/* ══════════════════════════════════════════════════════════════════════
   Pane 1 · The Rule and Its Grammar
   ══════════════════════════════════════════════════════════════════════ */
const rule = {
  vA: 60,
  vB: 40,
  running: true,
  xA: 30,      // metres along a looping 160 m road
  xB: 10,
};
const RULE_L = 160;

function ruleReadout() {
  const vab = rule.vA - rule.vB;
  const opts = { throwOnError: false, displayMode: false };
  katex.render(
    String.raw`v_{AB}=v_A-v_B=(${rule.vA})-(${rule.vB})=\mathbf{${vab >= 0 ? '+' : ''}${vab}}\ \text{m/s}`,
    document.getElementById('relRuleEq')!, opts
  );
  katex.render(
    String.raw`v_{BA}=v_B-v_A=\mathbf{${-vab >= 0 ? '+' : ''}${-vab}}\ \text{m/s}=-v_{AB}`,
    document.getElementById('relRuleEq2')!, opts
  );
  const say = document.getElementById('relRuleSay')!;
  const sense = vab === 0 ? 'A and B hold formation - B sees A frozen alongside.'
    : vab > 0 ? `B sees A pulling AWAY to the right at ${vab} m/s.`
      : `B sees A moving to the LEFT (toward/behind) at ${Math.abs(vab)} m/s.`;
  say.innerHTML = `Read aloud: <b>"velocity of A relative to B"</b> = v<sub>AB</sub>. ${sense}`;
}

const ruleSketch = (p: p5) => {
  const holder = document.getElementById('relRuleCanvas')!;
  const M = { l: 20, r: 20, t: 70, b: 24 };
  const canvasH = () => Math.max(260, Math.min(320, Math.round(holder.clientWidth * 0.34)));
  const SX = (m: number) => M.l + (((m % RULE_L) + RULE_L) % RULE_L) / RULE_L * (p.width - M.l - M.r);

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const top = M.t, bottom = p.height - M.b;
    road(p, top, bottom, M.l, M.r, 0);
    const baseY = bottom - 6;

    if (rule.running) {
      const dt = p.deltaTime / 1000;
      rule.xA += rule.vA * dt * 0.55;
      rule.xB += rule.vB * dt * 0.55;
    }

    const xa = SX(rule.xA);
    const xb = SX(rule.xB);
    velArrow(p, xa, top - 26, rule.vA, 'v_A');
    velArrow(p, xb, bottom + 2, rule.vB, 'v_B');
    car(p, xb, baseY, C.amber, 'B', Math.sign(rule.vB) || 1);
    car(p, xa, baseY - 0, C.accent, 'A', Math.sign(rule.vA) || 1);

    chip(p, 'Both speeds are read against the GROUND. Subtract them to get what B sees.',
      p.width / 2, 8, 'center', 13.5, C.dark);
  };
};

function ruleWire() {
  const a = document.getElementById('relVA') as HTMLInputElement;
  const b = document.getElementById('relVB') as HTMLInputElement;
  a.addEventListener('input', () => {
    rule.vA = +a.value;
    document.getElementById('relVAVal')!.textContent = `${rule.vA >= 0 ? '+' : ''}${rule.vA} m/s`;
    ruleReadout();
  });
  b.addEventListener('input', () => {
    rule.vB = +b.value;
    document.getElementById('relVBVal')!.textContent = `${rule.vB >= 0 ? '+' : ''}${rule.vB} m/s`;
    ruleReadout();
  });
  const play = document.getElementById('relPlay')!;
  play.addEventListener('click', () => {
    rule.running = !rule.running;
    play.textContent = rule.running ? '⏸ Pause' : '▶ Play';
  });
  document.getElementById('relReset')!.addEventListener('click', () => {
    rule.xA = 30; rule.xB = 10;
  });
  ruleReadout();
}

/* ══════════════════════════════════════════════════════════════════════
   Pane 2 · Same Direction vs Opposite Direction
   ══════════════════════════════════════════════════════════════════════ */
const dir = {
  mode: 'opposite' as 'same' | 'opposite',
  sA: 60,
  sB: 40,
  phase: 'run' as 'run' | 'met',
  hold: 0,
  xA: 0,       // metres, laid out on a 200 m stretch
  xB: 200,
};
const DIR_L = 200;

function dirReset() {
  dir.phase = 'run';
  dir.hold = 0;
  if (dir.mode === 'opposite') { dir.xA = 6; dir.xB = 194; }
  else { dir.xA = 6; dir.xB = 90; }   // same direction: A behind, B ahead
}

function dirClosing() {
  return dir.mode === 'opposite' ? dir.sA + dir.sB : Math.abs(dir.sA - dir.sB);
}

function dirReadout() {
  const eq = document.getElementById('relDirEq')!;
  const opts = { throwOnError: false, displayMode: false };
  if (dir.mode === 'opposite') {
    katex.render(
      String.raw`v_{AB}=(+${dir.sA})-(-${dir.sB})=+${dir.sA + dir.sB}\ \text{m/s}`,
      eq, opts
    );
  } else {
    katex.render(
      String.raw`v_{AB}=(+${dir.sA})-(+${dir.sB})=${dir.sA - dir.sB >= 0 ? '+' : ''}${dir.sA - dir.sB}\ \text{m/s}`,
      eq, opts
    );
  }
  const note = document.getElementById('relDirNote')!;
  note.innerHTML = dir.mode === 'opposite'
    ? `Opposite directions - the signs make the speeds <b>ADD</b>. Closing speed = ${dir.sA + dir.sB} m/s.`
    : `Same direction - the subtraction makes the speeds <b>SUBTRACT</b>. Closing speed = ${Math.abs(dir.sA - dir.sB)} m/s.`;
}

const dirSketch = (p: p5) => {
  const holder = document.getElementById('relDirCanvas')!;
  const M = { l: 20, r: 20, t: 58, b: 24 };
  const canvasH = () => Math.max(260, Math.min(320, Math.round(holder.clientWidth * 0.34)));
  const SX = (m: number) => M.l + (m / DIR_L) * (p.width - M.l - M.r);

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const top = M.t, bottom = p.height - M.b;
    road(p, top, bottom, M.l, M.r, 0);
    const baseY = bottom - 6;
    const dt = p.deltaTime / 1000;
    const vA = dir.sA;                              // A always moves right (+)
    const vB = dir.mode === 'opposite' ? -dir.sB : dir.sB;

    if (dir.phase === 'run') {
      dir.xA += vA * dt * 0.5;
      dir.xB += vB * dt * 0.5;
      const gapM = Math.abs(dir.xB - dir.xA);
      const passed = dir.mode === 'opposite' ? dir.xA >= dir.xB : dir.xA >= dir.xB;
      if (passed || gapM < 4) { dir.phase = 'met'; dir.hold = 1.4; }
    } else {
      dir.hold -= dt;
      if (dir.hold <= 0) dirReset();
    }

    const xa = SX(Math.min(Math.max(dir.xA, 0), DIR_L));
    const xb = SX(Math.min(Math.max(dir.xB, 0), DIR_L));

    /* gap bracket while approaching */
    if (dir.phase === 'run' && Math.abs(xb - xa) > 40) {
      const y = top - 20;
      p.stroke(C.amber);
      p.strokeWeight(2);
      p.line(xa, y, xb, y);
      p.line(xa, y - 6, xa, y + 6);
      p.line(xb, y - 6, xb, y + 6);
      chip(p, `closing at ${dirClosing()} m/s`, (xa + xb) / 2, y - 22, 'center', 13.5, C.amber);
    }

    velArrow(p, xb, bottom + 2, vB, 'v_B');
    car(p, xb, baseY, C.amber, 'B', Math.sign(vB) || 1);
    car(p, xa, baseY, C.accent, 'A', 1);
    velArrow(p, xa, top - 6, vA, 'v_A');

    if (dir.phase === 'met') {
      chip(p, dir.mode === 'opposite' ? 'They meet - closing speed was the SUM.' : 'A catches B - closing speed was the DIFFERENCE.',
        p.width / 2, 8, 'center', 15, C.green);
    } else {
      chip(p, dir.mode === 'opposite' ? 'Head-on: speeds ADD' : 'Same way: speeds SUBTRACT',
        p.width / 2, 8, 'center', 14, C.dark);
    }
  };
};

function dirWire() {
  const mode = document.getElementById('relDirMode') as HTMLSelectElement;
  const a = document.getElementById('relDirA') as HTMLInputElement;
  const b = document.getElementById('relDirB') as HTMLInputElement;
  mode.addEventListener('change', () => {
    dir.mode = mode.value as 'same' | 'opposite';
    dirReset(); dirReadout();
  });
  a.addEventListener('input', () => {
    dir.sA = +a.value;
    document.getElementById('relDirAVal')!.textContent = `${dir.sA} m/s`;
    dirReadout();
  });
  b.addEventListener('input', () => {
    dir.sB = +b.value;
    document.getElementById('relDirBVal')!.textContent = `${dir.sB} m/s`;
    dirReadout();
  });
  document.getElementById('relDirReset')!.addEventListener('click', dirReset);
  dirReset();
  dirReadout();
}

/* ══════════════════════════════════════════════════════════════════════
   Pane 3 · The Frame-Switch Method  (the marquee)
   ══════════════════════════════════════════════════════════════════════ */
const frame = {
  view: 'ground' as 'ground' | 'B',
  vA: 30,
  vB: 20,
  gap0: 100,     // A starts this far BEHIND B (metres)
  phase: 'ready' as 'ready' | 'run' | 'caught',
  t: 0,
  paused: false,
};

function frameCatchTime(): number | null {
  const rel = frame.vA - frame.vB;
  return rel > 0 ? frame.gap0 / rel : null;
}

function frameStats() {
  const tc = frameCatchTime();
  const el = document.getElementById('relFCatch')!;
  const rel = frame.vA - frame.vB;
  if (tc === null) {
    el.innerHTML = rel === 0
      ? `v<sub>AB</sub> = 0 - A never gains on B. The gap stays ${frame.gap0} m forever.`
      : `v<sub>AB</sub> < 0 - A falls further behind. No catch-up.`;
  } else {
    el.innerHTML = `In B's frame: A approaches at v<sub>AB</sub> = ${frame.vA} − ${frame.vB} = <b>${rel} m/s</b> from ${frame.gap0} m back &nbsp;→&nbsp; t = gap / v<sub>AB</sub> = ${frame.gap0}/${rel} = <b>${tc.toFixed(1)} s</b>.`;
  }
}

function frameReset() {
  frame.phase = 'ready';
  frame.t = 0;
  frame.paused = false;
  document.getElementById('relFPause')!.textContent = '⏸ Pause';
}

/* positions on the ground at time t (metres); B ahead of A by gap0 at t=0 */
const frameXA = (t: number) => frame.vA * t;
const frameXB = (t: number) => frame.gap0 + frame.vB * t;

const frameSketch = (p: p5) => {
  const holder = document.getElementById('relFrameCanvas')!;
  const M = { l: 20, r: 20, t: 66, b: 26 };
  const canvasH = () => Math.max(300, Math.min(360, Math.round(holder.clientWidth * 0.4)));

  p.setup = () => { p.createCanvas(holder.clientWidth, canvasH()); };
  p.windowResized = () => { p.resizeCanvas(holder.clientWidth, canvasH()); };

  p.draw = () => {
    p.background(C.paper);
    const top = M.t, bottom = p.height - M.b;
    const baseY = bottom - 6;
    const tc = frameCatchTime();

    /* advance */
    if (frame.phase === 'run' && !frame.paused) {
      frame.t += (p.deltaTime / 1000) * 0.9;
      if (tc !== null && frame.t >= tc) { frame.t = tc; frame.phase = 'caught'; }
      if (tc === null && frame.t > 8) frame.t = 8;
    }

    const xa = frameXA(frame.t);
    const xb = frameXB(frame.t);

    /* camera: ground frame follows the pair's centre; B frame pins B */
    const span = Math.max(frame.gap0 * 1.5, 60);
    const pxPerM = (p.width - M.l - M.r) / span;
    const camX = frame.view === 'B' ? xb : (xa + xb) / 2;
    const SX = (m: number) => p.width / 2 + (m - camX) * pxPerM;
    const roadPhase = camX * pxPerM;    // dashes scroll opposite to camera travel

    road(p, top, bottom, M.l, M.r, roadPhase);

    const relV = frame.vA - frame.vB;
    const vAshown = frame.view === 'B' ? relV : frame.vA;
    const vBshown = frame.view === 'B' ? 0 : frame.vB;

    /* gap bracket */
    const gapNow = xb - xa;
    if (gapNow > 1) {
      const y = top - 22;
      p.stroke(C.amber);
      p.strokeWeight(2);
      p.line(SX(xa), y, SX(xb), y);
      p.line(SX(xa), y - 6, SX(xa), y + 6);
      p.line(SX(xb), y - 6, SX(xb), y + 6);
      chip(p, `gap = ${gapNow.toFixed(0)} m`, (SX(xa) + SX(xb)) / 2, y - 22, 'center', 13.5, C.amber);
    }

    /* cars - in B frame, B is drawn pinned & greyed to read as "at rest" */
    velArrow(p, SX(xb), bottom + 2, vBshown, 'v_B');
    car(p, SX(xb), baseY, C.amber, 'B', 1, frame.view === 'B');
    velArrow(p, SX(xa), top - 4, vAshown, frame.view === 'B' ? 'v_AB' : 'v_A');
    car(p, SX(xa), baseY, C.accent, 'A', 1);

    /* HUD */
    const label = frame.view === 'B'
      ? "B'S FRAME - B sits still, A closes in at v_AB"
      : 'GROUND FRAME - both cars move; A slowly reels B in';
    chip(p, label, p.width / 2, 8, 'center', 14.5, frame.view === 'B' ? C.accent : C.dark);

    if (frame.phase === 'ready') {
      chip(p, 'Press Run - then flip the frame mid-chase', SX(xa), top + 6, 'left', 13.5, C.dark);
    }
    if (frame.phase !== 'ready') {
      chip(p, `t = ${frame.t.toFixed(1)} s`, p.width - M.r - 4, top - 2, 'right', 14, C.navy);
    }
    if (frame.phase === 'run' && frame.paused) {
      chip(p, '⏸ PAUSED', p.width / 2, top + 30, 'center', 16, C.amber);
    }
    if (frame.phase === 'caught') {
      chip(p, `Caught at t = ${tc!.toFixed(1)} s - one subtraction, one division.`,
        p.width / 2, top + 30, 'center', 15.5, C.green);
    }
  };
};

function frameSetToggleLabel() {
  document.getElementById('relFrameToggle')!.textContent =
    frame.view === 'B' ? "View: B's frame ⇄ Ground" : 'View: Ground ⇄ B\'s frame';
}

function frameWire() {
  const va = document.getElementById('relFVA') as HTMLInputElement;
  const vb = document.getElementById('relFVB') as HTMLInputElement;
  const gap = document.getElementById('relFGap') as HTMLInputElement;
  va.addEventListener('input', () => {
    frame.vA = +va.value;
    document.getElementById('relFVAVal')!.textContent = `${frame.vA} m/s`;
    frameReset(); frameStats();
  });
  vb.addEventListener('input', () => {
    frame.vB = +vb.value;
    document.getElementById('relFVBVal')!.textContent = `${frame.vB} m/s`;
    frameReset(); frameStats();
  });
  gap.addEventListener('input', () => {
    frame.gap0 = +gap.value;
    document.getElementById('relFGapVal')!.textContent = `${frame.gap0} m`;
    frameReset(); frameStats();
  });
  document.getElementById('relFrameToggle')!.addEventListener('click', () => {
    frame.view = frame.view === 'B' ? 'ground' : 'B';
    frameSetToggleLabel();
  });
  document.getElementById('relFPlay')!.addEventListener('click', () => {
    if (frame.phase !== 'run') { frame.t = 0; frame.phase = 'run'; }
    frame.paused = false;
    document.getElementById('relFPause')!.textContent = '⏸ Pause';
  });
  document.getElementById('relFPause')!.addEventListener('click', () => {
    frame.paused = !frame.paused;
    document.getElementById('relFPause')!.textContent = frame.paused ? '▶ Resume' : '⏸ Pause';
  });
  document.getElementById('relFReset')!.addEventListener('click', frameReset);
  frameSetToggleLabel();
  frameStats();
}

/* ══════════════════════════════════════════════════════════════════════
   Pane 4 · Worked Problems  (DOM stepper)
   ══════════════════════════════════════════════════════════════════════ */
interface Worked { tag: string; problem: string; steps: string[]; }

const worked: Record<string, Worked> = {
  trains: {
    tag: 'Approaching · opposite directions',
    problem: 'Two trains approach on parallel tracks at 72 km/h and 54 km/h. At what relative speed do they close?',
    steps: [
      'Opposite directions, so the speeds ADD (the subtraction of a negative).',
      'Closing speed = 72 + 54 = <b>126 km/h</b>.',
      'In m/s: 126 × 5/18 = <b>35 m/s</b>. That is how fast the gap shrinks.',
    ],
  },
  chase: {
    tag: 'Overtaking · same direction',
    problem: 'A police car at 30 m/s chases a thief at 25 m/s, 50 m ahead. Both have zero acceleration. Catch-up time?',
    steps: [
      'Same direction, so relative speed = difference = 30 − 25 = <b>5 m/s</b>.',
      "Jump into the thief's frame: he sits still, the police car approaches at 5 m/s from 50 m back.",
      't = gap / relative speed = 50 / 5 = <b>10 s</b>. One subtraction, one division.',
    ],
  },
  river: {
    tag: 'River preview · the 1D seed of the boat problem',
    problem: 'A swimmer swims at 3 m/s relative to the water; the river flows at 4 m/s. Ground speed downstream? Upstream?',
    steps: [
      'v(swimmer, ground) = v(swimmer, water) + v(water, ground) - relative velocities add.',
      'Downstream: 3 + 4 = <b>7 m/s</b> (river helps).',
      'Upstream: 3 − 4 = <b>−1 m/s</b> - negative, so the swimmer is swept backward!',
      'In 2D this same rule becomes vector addition - the river-boat problem (Lecture 14).',
    ],
  },
};

let workedKey = 'trains';
let workedStep = 0;

function workedRender() {
  const w = worked[workedKey];
  document.getElementById('relwTag')!.textContent = w.tag;
  document.getElementById('relwProblem')!.textContent = w.problem;
  const box = document.getElementById('relwSteps')!;
  box.innerHTML = '';
  for (let i = 0; i <= workedStep && i < w.steps.length; i++) {
    const d = document.createElement('div');
    d.className = 'rev-step shown mgw-step';
    d.innerHTML = w.steps[i];
    box.appendChild(d);
  }
  const next = document.getElementById('relwNext')!;
  next.textContent = workedStep >= w.steps.length - 1 ? 'Done ✓' : 'Next step ›';
}

function workedWire() {
  const pick = document.getElementById('relwPick') as HTMLSelectElement;
  pick.addEventListener('change', () => { workedKey = pick.value; workedStep = 0; workedRender(); });
  document.getElementById('relwNext')!.addEventListener('click', () => {
    if (workedStep < worked[workedKey].steps.length - 1) { workedStep++; workedRender(); }
  });
  document.getElementById('relwPrev')!.addEventListener('click', () => {
    if (workedStep > 0) { workedStep--; workedRender(); }
  });
  document.getElementById('relwReset')!.addEventListener('click', () => { workedStep = 0; workedRender(); });
  workedRender();
}

/* ══════════════════════════════════════════════════════════════════════
   Pane 5 · Rapid Fire quiz
   ══════════════════════════════════════════════════════════════════════ */
interface Rq { q: string; opts: string[]; correct: number; fb: string; }

const rqs: Rq[] = [
  {
    q: 'Two cars both do 60 km/h in the SAME direction. How fast does one approach the other?',
    opts: ['120 km/h', '60 km/h', '0'],
    correct: 2,
    fb: 'v_AB = 60 − 60 = 0. Same speed, same way - they hold formation forever.',
  },
  {
    q: 'v_AB = +12 m/s. What is v_BA?',
    opts: ['+12 m/s', '−12 m/s', '0'],
    correct: 1,
    fb: 'Swap the subscripts, flip the sign: v_BA = −v_AB = −12 m/s.',
  },
  {
    q: 'A moves +50 m/s, B moves −30 m/s (opposite way). Closing speed?',
    opts: ['20 m/s', '80 m/s', '50 m/s'],
    correct: 1,
    fb: 'v_AB = 50 − (−30) = +80 m/s. Opposite directions → speeds add.',
  },
  {
    q: 'A at +40, B at +40 m/s. What does B measure for A?',
    opts: ['A at rest (0)', 'A at 80 m/s', 'A at 40 m/s'],
    correct: 0,
    fb: 'v_AB = 40 − 40 = 0. In B\'s frame, A hangs motionless beside it.',
  },
  {
    q: 'Car A (30 m/s) is 90 m behind car B (20 m/s), same direction. Catch-up time?',
    opts: ['3 s', '9 s', '4.5 s'],
    correct: 1,
    fb: 'Relative speed 30 − 20 = 10 m/s. t = 90 / 10 = 9 s.',
  },
  {
    q: 'Best first move for any two-body chase problem?',
    opts: ['Write both position equations and solve simultaneously',
      'Switch into one object\'s frame so it sits still',
      'Add the two speeds'],
    correct: 1,
    fb: 'Frame-switch: make one body the observer, and a two-body chase becomes a one-body problem solvable in a line.',
  },
  {
    q: 'Swimmer 3 m/s vs still water, river flows 4 m/s. Upstream ground speed?',
    opts: ['+7 m/s', '−1 m/s', '+1 m/s'],
    correct: 1,
    fb: '3 − 4 = −1 m/s. The current wins - the swimmer is carried backward.',
  },
  {
    q: 'Both objects accelerate. What is the relative acceleration a_AB?',
    opts: ['a_A + a_B', 'a_A − a_B', 'Always 0'],
    correct: 1,
    fb: 'Acceleration is relative too: a_AB = a_A − a_B. Subtract, exactly like velocities.',
  },
];

let rqIdx = 0;
const rqDone: boolean[] = new Array(rqs.length).fill(false);

function rqRender() {
  const item = rqs[rqIdx];
  document.getElementById('relqTag')!.textContent = `Relative-motion rapid fire · Question ${rqIdx + 1} / ${rqs.length}`;
  document.getElementById('relqQ')!.textContent = item.q;
  const fb = document.getElementById('relqFb')!;
  fb.classList.remove('shown');
  fb.textContent = item.fb;
  const holder = document.getElementById('relqOpts')!;
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
  document.getElementById('relqPrev')!.addEventListener('click', () => {
    if (rqIdx > 0) { rqIdx--; rqRender(); }
  });
  document.getElementById('relqNext')!.addEventListener('click', () => {
    if (rqIdx < rqs.length - 1) { rqIdx++; rqRender(); }
  });
  rqRender();
}

/* ══════════════════════════════════════════════════════════════════════
   pane switching + init  (mirrors the gravity/graphs pattern)
   ══════════════════════════════════════════════════════════════════════ */
const paneIds = ['relRule', 'relDir', 'relFrame', 'relWork', 'relQuiz'] as const;
type PaneId = (typeof paneIds)[number];
let currentPane: PaneId = 'relRule';
const sketches: Partial<Record<PaneId, p5>> = {};

function activatePane(id: PaneId) {
  currentPane = id;
  document.querySelectorAll<HTMLElement>('#relative .grav-pane').forEach((el) => {
    el.classList.toggle('active', el.id === id);
  });
  document.querySelectorAll<HTMLButtonElement>('#relTabs .rev-chip').forEach((b) => {
    b.classList.toggle('active', b.dataset.pane === id);
  });
  if (id === 'relRule' && !sketches.relRule) {
    sketches.relRule = new p5(ruleSketch, document.getElementById('relRuleCanvas')!);
  } else if (id === 'relDir' && !sketches.relDir) {
    sketches.relDir = new p5(dirSketch, document.getElementById('relDirCanvas')!);
  } else if (id === 'relFrame' && !sketches.relFrame) {
    sketches.relFrame = new p5(frameSketch, document.getElementById('relFrameCanvas')!);
  } else {
    sketches[id]?.windowResized?.();
  }
}

let inited = false;

export function relativeScreenInit() {
  if (!inited) {
    inited = true;
    ruleWire();
    dirWire();
    frameWire();
    workedWire();
    rqWire();
    document.querySelectorAll<HTMLButtonElement>('#relTabs .rev-chip').forEach((b) => {
      b.addEventListener('click', () => activatePane(b.dataset.pane as PaneId));
    });
  }
  activatePane(currentPane);
}
