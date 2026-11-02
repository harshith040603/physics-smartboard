import { pistonState, type Process } from './piston-physics';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const progressInput = $<HTMLInputElement>('#pw-progress');
const targetInput = $<HTMLInputElement>('#pw-target');
const play = $<HTMLButtonElement>('#pw-play');
const colors: Record<Process, string> = { isobaric: '#009bd8', isochoric: '#7c3aed', isothermal: '#0e9483' };
const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-process]')).map(el => ({
  el, process: el.dataset.process as Process, canvas: el.querySelector('canvas')!, phase: 0,
  progress: 0, running: false, button: el.querySelector<HTMLButtonElement>('[data-card-play]')!,
}));
let progress = 0, target = 2, synchronized = true, lastTime = 0, frame = 0;
const energy = (v: number) => `${Math.abs(v) < 0.5 ? '0' : (v > 0 ? '+' : '−') + Math.abs(v).toFixed(0)} J`;

function draw(card: typeof cards[number]) {
  if (card.el.hidden) return;
  const { canvas, process, progress, running } = card;
  const ctx = canvas.getContext('2d')!;
  const width = canvas.getBoundingClientRect().width;
  if (!width) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(width * dpr), pixelHeight = Math.round(width * 570 / 440 * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth; canvas.height = pixelHeight;
  }
  ctx.setTransform(canvas.width / 440, 0, 0, canvas.height / 570, 0, 0);
  ctx.clearRect(0, 0, 440, 570);
  const s = pistonState(process, progress, target), col = colors[process];
  const pistonY = 270 - s.volume * 8, initialY = 190;
  const text = (value: string, x: number, y: number, size = 13, color = '#526783', align: CanvasTextAlign = 'left', weight = 500) => {
    ctx.fillStyle = color; ctx.font = `${weight} ${size}px "DM Sans", sans-serif`; ctx.textAlign = align; ctx.fillText(value, x, y);
  };
  const line = (x1: number, y1: number, x2: number, y2: number, color: string, weight = 2) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = weight; ctx.stroke();
  };
  const rect = (x: number, y: number, w: number, h: number, color: string, radius = 0) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill();
  };
  const arrow = (x1: number, y1: number, x2: number, y2: number, color: string, weight = 3) => {
    line(x1, y1, x2, y2, color, weight);
    const a = Math.atan2(y2 - y1, x2 - x1);
    line(x2, y2, x2 - 9 * Math.cos(a - .5), y2 - 9 * Math.sin(a - .5), color, weight);
    line(x2, y2, x2 - 9 * Math.cos(a + .5), y2 - 9 * Math.sin(a + .5), color, weight);
  };

  // A conducting water jacket makes the constant-temperature constraint visible.
  if (process === 'isothermal') {
    rect(83, 82, 250, 207, '#e0f6f2', 16);
    ctx.save(); ctx.setLineDash([5, 4]); line(91, 94, 326, 94, '#64baac'); ctx.restore();
    text('300 K water bath', 208, 310, 13, col, 'center', 700);
  }
  text(process === 'isochoric' ? 'LOCKED PISTON' : process === 'isobaric' ? 'CONSTANT EXTERNAL LOAD' : 'ADJUSTABLE EXTERNAL LOAD', 220, 28, 12, col, 'center', 800);

  // Transparent cylinder; molecules keep the same count at every volume.
  const hot = Math.max(0, (s.temperature - 300) / 300);
  const cold = Math.max(0, (300 - s.temperature) / 150);
  const gasColor = `rgb(${Math.round(42 + hot * 190)}, ${Math.round(149 - hot * 55)}, ${Math.round(210 - hot * 140 + cold * 30)})`;
  rect(130, pistonY + 9, 176, 270 - pistonY - 9, '#f0f8fc');
  ctx.save(); ctx.globalAlpha = .12; rect(130, pistonY + 9, 176, 270 - pistonY - 9, gasColor); ctx.restore();
  const bounce = (x: number) => 1 - Math.abs(((x % 2) + 2) % 2 - 1);
  for (let i = 0; i < 34; i++) {
    const x = 139 + bounce(i * .618 + card.phase * (.17 + i % 4 * .03)) * 158;
    const y = pistonY + 20 + bounce(i * .414 + card.phase * (.23 + i % 3 * .04)) * Math.max(4, 238 - pistonY);
    ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fillStyle = gasColor; ctx.fill();
  }
  line(126, 68, 126, 274, '#a5b7cb', 7); line(310, 68, 310, 274, '#a5b7cb', 7);
  rect(121, 270, 194, 12, '#536a85', 4);
  // Ghost of the starting position links piston travel to swept volume.
  ctx.save(); ctx.setLineDash([5, 5]); line(113, initialY, 325, initialY, '#9aacbf', 1.5); ctx.restore();
  text('start', 109, initialY + 4, 11, '#7689a0', 'right');
  rect(126, pistonY, 184, 12, '#233e5d', 3); rect(132, pistonY + 2, 172, 3, '#89a5c0', 2);

  if (process === 'isochoric') {
    rect(111, pistonY - 4, 29, 23, col, 4); rect(296, pistonY - 4, 29, 23, col, 4);
    text('clamps', 220, pistonY - 15, 13, col, 'center', 700);
    text('PUSH, BUT NO TRAVEL', 220, 61, 12, col, 'center', 700);
  } else {
    // A taller load represents greater total external pressure.
    const loadHeight = 25 * s.pressure / 100;
    rect(166, pistonY - loadHeight, 104, loadHeight, '#d9e3ed', 4);
    for (let y = pistonY - 8; y > pistonY - loadHeight; y -= 9) line(170, y, 266, y, '#a5b7cb', 1);
    text(`${s.pressure.toFixed(0)} kPa load`, 218, pistonY - loadHeight - 10, 12, '#526783', 'center', 700);
    if (progress > 0) {
      arrow(363, initialY + 6, 363, pistonY + 6, col);
      text(target > 1 ? 'rises' : 'falls', 363, Math.min(pistonY, initialY) - 13, 12, col, 'center', 700);
      text(`ΔV ${s.volume >= 10 ? '+' : '−'}${Math.abs(s.volume - 10).toFixed(1)} L`, 363, Math.max(pistonY, initialY) + 25, 11, col, 'center');
    }
  }
  // The gas always pushes up, even during compression and while clamped.
  arrow(218, Math.min(257, pistonY + 65), 218, pistonY + 20, '#dd7b20', 4);
  text('gas pushes', 218, Math.min(263, pistonY + 83), 11, '#b26117', 'center', 700);

  if (progress > 0) {
    const incoming = s.heat > 0;
    const pulse = running ? .6 + .4 * Math.sin(card.phase * 5) ** 2 : 1;
    ctx.save(); ctx.globalAlpha = pulse;
    const y = Math.max(pistonY + 30, 242);
    arrow(incoming ? 61 : 122, y, incoming ? 122 : 61, y, '#e77a29', 3);
    ctx.restore(); text(incoming ? 'heat in' : 'heat out', 52, y + 22, 11, '#bd5e1a', 'center', 700);
  }
  if (process !== 'isothermal') text(process === 'isochoric' ? 'Same space. Temperature changes.' : 'Same load. Temperature changes.', 220, 310, 12, '#526783', 'center');

  // P-V trace and signed area. Axes remain identical across all three cards.
  line(24, 333, 416, 333, '#e0e8f1', 1);
  text('THE WORK TRAIL', 32, 359, 11, col, 'left', 800);
  text('P / kPa', 34, 383, 11, '#526783');
  const gx = (v: number) => 66 + v * 13, gy = (p: number) => 513 - p * .55;
  const originY = gy(0);
  [100, 200].forEach(p => {
    line(66, gy(p), 380, gy(p), '#e8eef5', 1); text(String(p), 55, gy(p) + 4, 10, '#7689a0', 'right');
  });
  [5, 10, 20].forEach(v => {
    line(gx(v), 391, gx(v), originY, '#e8eef5', 1); text(String(v), gx(v), 531, 10, '#7689a0', 'center');
  });
  arrow(66, originY, 391, originY, '#7389a1', 1.5); arrow(66, originY, 66, 389, '#7389a1', 1.5);
  text('V / L', 397, 532, 11, '#526783', 'right'); text('0', 56, 517, 10, '#7689a0', 'right');
  const trace = (fraction: number, move = false) => {
    for (let i = 0; i <= 80; i++) {
      const v = pistonState(process, fraction * i / 80, target);
      if (i === 0 && move) ctx.moveTo(gx(v.volume), gy(v.pressure));
      else ctx.lineTo(gx(v.volume), gy(v.pressure));
    }
  };
  // Dashed line is the future path; colored line is the part already travelled.
  ctx.save(); ctx.setLineDash([4, 5]); ctx.beginPath(); trace(1, true); ctx.strokeStyle = '#b9c9d8'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  if (process !== 'isochoric' && progress > 0) {
    ctx.beginPath(); ctx.moveTo(gx(10), originY); trace(progress); ctx.lineTo(gx(s.volume), originY); ctx.closePath();
    ctx.fillStyle = target > 1 ? `${col}30` : '#f5a62335'; ctx.fill();
  }
  ctx.beginPath(); trace(progress, true); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(gx(10), gy(100), 4, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.arc(gx(s.volume), gy(s.pressure), 5, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
  text(process === 'isochoric' ? 'Vertical path. No width. Zero work.' : target > 1 ? 'Shaded area = positive work by gas' : 'Leftward path = negative work by gas', 220, 557, 12, col, 'center', 700);

  const values: Record<string, string> = { pressure: `${s.pressure.toFixed(0)} kPa`, volume: `${s.volume.toFixed(1)} L`, temperature: `${s.temperature.toFixed(0)} K`, work: energy(s.work), internal: energy(s.internal), heat: energy(s.heat) };
  card.el.querySelectorAll<HTMLElement>('[data-value]').forEach(el => { el.textContent = values[el.dataset.value!]; });
}

function render() {
  cards.forEach(draw);
  cards.forEach(card => {
    const action = card.running ? 'Pause' : card.progress >= 1 ? 'Replay' : card.progress > 0 ? 'Continue' : 'Start';
    card.button.textContent = `${card.running ? 'Ⅱ' : card.progress >= 1 ? '↻' : '▶'} ${action}`;
    card.button.setAttribute('aria-label', `${action} ${card.process} animation`);
  });
  play.textContent = cards.some(card => card.running) ? 'Ⅱ Pause all' : !synchronized ? '▶ Run all together' : progress >= 1 ? '↻ Replay experiment' : progress > 0 ? '▶ Continue' : '▶ Run experiment';
  progressInput.value = String(Math.round(progress * 1000));
  $('#pw-progress-label').textContent = synchronized ? `${Math.round(progress * 100)}%` : 'Individual playback';
  const story = !synchronized ? 'Each heading button controls its own piston. Scrub the timeline to bring all three to the same progress.'
    : progress === 0 ? 'Predict first: which pistons will move? Which gas will do the most work?'
    : target > 1 ? 'Two pistons rise. One stays locked. Isobaric work grows faster; isothermal heat becomes work without raising temperature.'
    : 'Two pistons fall: work by the gas is negative. Cooling the locked gas lowers pressure, but its work stays zero.';
  if ($('#pw-story').textContent !== story) $('#pw-story').textContent = story;
}
function pause() {
  cards.forEach(card => card.running = false); cancelAnimationFrame(frame); frame = 0; render();
}
function tick(time: number) {
  frame = 0;
  if (!cards.some(card => card.running)) return;
  const dt = Math.min((time - lastTime) / 1000, .05); lastTime = time;
  cards.forEach(card => {
    if (!card.running) return;
    card.progress = Math.min(1, card.progress + dt / 12);
    card.phase += dt * Math.sqrt(pistonState(card.process, card.progress, target).temperature / 300);
    if (card.progress >= 1) card.running = false;
  });
  if (synchronized) progress = cards[0].progress;
  render();
  if (cards.some(card => card.running)) frame = requestAnimationFrame(tick);
}
function schedule() {
  if (!frame && cards.some(card => card.running)) { lastTime = performance.now(); frame = requestAnimationFrame(tick); }
}
function reset() { progress = 0; synchronized = true; cards.forEach(card => { card.phase = 0; card.progress = 0; }); pause(); }
play.addEventListener('click', () => {
  if (cards.some(card => card.running)) { pause(); return; }
  if (!synchronized || progress >= 1) reset();
  synchronized = true; cards.forEach(card => card.running = true); render(); schedule();
});
cards.forEach(card => card.button.addEventListener('click', () => {
  synchronized = false;
  if (card.progress >= 1) { card.progress = 0; card.phase = 0; }
  card.running = !card.running;
  if (!cards.some(card => card.running)) { cancelAnimationFrame(frame); frame = 0; }
  render(); schedule();
}));
$('#pw-reset').addEventListener('click', reset);
progressInput.addEventListener('input', () => {
  // Read first: pause() renders the old slider position.
  const nextProgress = Number(progressInput.value) / 1000;
  pause(); progress = nextProgress; synchronized = true;
  cards.forEach(card => { card.progress = progress; card.phase = progress * 12 * Math.sqrt(pistonState(card.process, progress, target).temperature / 300); });
  render();
});
targetInput.addEventListener('input', () => { target = Number(targetInput.value); $('#pw-target-label').textContent = `${target.toFixed(2)}×`; reset(); });
document.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(button => button.addEventListener('click', () => {
  const expand = button.dataset.direction === 'expand';
  document.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  targetInput.min = expand ? '1.2' : '0.5'; targetInput.max = expand ? '2' : '0.9'; targetInput.step = '0.1'; target = expand ? 2 : .5;
  targetInput.value = String(target); $('#pw-target-label').textContent = `${target.toFixed(2)}×`; reset();
}));
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => {
  const view = button.dataset.view;
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  cards.forEach(card => card.el.hidden = view !== 'all' && card.process !== view);
  $('#pw-grid').classList.toggle('focused', view !== 'all'); render();
}));
new ResizeObserver(() => render()).observe($('#pw-grid'));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
render();
