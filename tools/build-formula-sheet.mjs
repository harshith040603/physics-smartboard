/* ═══════════ Projectile Motion formula sheet → PDF ═══════════
   Builds public/downloads/kinematics/projectile-motion-formula-sheet.pdf.

     npm run formula-sheet

   The design is the pinned Nine Education report design (the one used by the
   mentorship reports): Plus Jakarta Sans, primary #295990, accent #00A0E3,
   A4 pages with a 12/14/10mm frame, and a Chromium print-to-PDF render.
   Formulas are typeset with KaTeX at build time - no JS runs in the PDF.

   Fonts live in tools/fonts/ (the Plus Jakarta Sans variable woff2, latin +
   latin-ext). Jakarta has no Greek subset, so EVERY θ and α - even in prose -
   has to go through KaTeX or it silently falls back to a system serif.        */

import { mkdtempSync, writeFileSync, copyFileSync, readFileSync, cpSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import katex from 'katex';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'public/downloads/kinematics/projectile-motion-formula-sheet.pdf');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/* ── design tokens, pinned by the report ── */
const T = {
  primary: '#295990',
  accent: '#00A0E3',
  cardBorder: '#E3EDF6',
  tagBorder: '#CFE4F3',
  wash: '#F4FAFE',
  panel: '#F8FBFE',
  track: '#E8F1F8',
  body: '#4A6C8A',
  caption: '#5B7D9C',
  muted: '#7DA3C4',
  faint: '#9BB6CE',
  rule: '#EDF4FA',
};

/* ── KaTeX helpers ── */
const k = (tex) => katex.renderToString(tex, { throwOnError: false, displayMode: false });
const G = { th: k('\\theta'), al: k('\\alpha'), perp: k('\\perp') };

/* ══════════════ the content ══════════════ */
const part1 = {
  n: '1', title: 'GROUND TO GROUND',
  sub: `Launch and landing at the SAME height. Launch u at ${G.th} above the horizontal.`,
  rows: [
    ['Components', 'u_x=u\\cos\\theta \\qquad u_y=u\\sin\\theta', k('a_x=0,\\ \\ a_y=-g')],
    ['Time of flight', 'T=\\dfrac{2u\\sin\\theta}{g}', 'from y = 0', 1],
    ['Time to the top', 't=\\dfrac{u\\sin\\theta}{g}=\\dfrac{T}{2}', 'up-time = down-time'],
    ['Maximum height', 'H=\\dfrac{u^{2}\\sin^{2}\\theta}{2g}', `at the top ${k('v_y=0')}`, 1],
    ['Range', 'R=\\dfrac{u^{2}\\sin 2\\theta}{g}', k('R=u_x\\times T'), 1],
    ['Maximum range', 'R_{\\max}=\\dfrac{u^{2}}{g}\\ \\ \\text{at}\\ \\ \\theta=45^{\\circ}', k('\\sin 2\\theta=1')],
    ['Complementary angles', '\\theta\\ \\ \\text{and}\\ \\ (90^{\\circ}-\\theta)\\ \\ \\text{give the same}\\ R', 'different H and T'],
    ['Trajectory', 'y=x\\tan\\theta-\\dfrac{gx^{2}}{2u^{2}\\cos^{2}\\theta}', 'a parabola'],
    ['Velocity at time t', 'v_x=u\\cos\\theta \\qquad v_y=u\\sin\\theta-gt', `${k('v_x')} never changes`],
    ['Speed at the top', 'v=u\\cos\\theta', 'minimum speed, NOT zero'],
    ['Useful relation', 'R=4H\\cot\\theta \\ \\Rightarrow\\ \\tan\\theta=\\dfrac{4H}{R}', ''],
  ],
};

const part2a = {
  n: '2A', title: 'FROM A HEIGHT · LAUNCHED HORIZONTALLY',
  sub: `Launched from height h with ${G.th} = 0. Part 1 formulas do NOT apply.`,
  rows: [
    ['Components', 'u_x=u \\qquad u_y=0', 'free fall vertically'],
    ['Time to land', 't=\\sqrt{\\dfrac{2h}{g}}', 'independent of u', 1],
    ['Range', 'R=u\\sqrt{\\dfrac{2h}{g}}', k('R=u\\times t'), 1],
    ['Velocity on landing', 'v_x=u \\qquad v_y=gt=\\sqrt{2gh}', ''],
    ['Impact speed', 'v=\\sqrt{u^{2}+2gh}', ''],
    ['Impact angle', '\\tan\\phi=\\dfrac{\\sqrt{2gh}}{u}', 'below the horizontal'],
  ],
};

const part2b = {
  n: '2B', title: 'FROM A HEIGHT · LAUNCHED AT AN ANGLE',
  sub: `Launched at ${G.th} above the horizontal from height h. Lands h BELOW the launch point.`,
  rows: [
    ['Sign convention', 'y_{\\text{landing}}=-h', 'UP = +, origin at the launch point'],
    ['y-equation', '-h=u\\sin\\theta\\,t-\\tfrac{1}{2}gt^{2}', 'a genuine quadratic'],
    ['Time of flight', 't=\\dfrac{u\\sin\\theta+\\sqrt{u^{2}\\sin^{2}\\theta+2gh}}{g}', 'POSITIVE root only', 1],
    ['Range', 'R=(u\\cos\\theta)\\,t', '', 1],
    ['Height above launch', 'H=\\dfrac{u^{2}\\sin^{2}\\theta}{2g}', 'above ground: h + H'],
    ['Velocity on landing', 'v_x=u\\cos\\theta \\qquad v_y=u\\sin\\theta-gt', `${k('v_x')} unchanged`],
    ['Impact speed', 'v=\\sqrt{u^{2}+2gh}', `true for ANY ${G.th}`, 1],
    ['Impact angle', '\\tan\\phi=\\dfrac{|v_y|}{v_x}', 'below the horizontal'],
  ],
};

const part3 = {
  n: '3', title: 'ON AN INCLINED PLANE',
  sub: `Rotate the axes: x′ ALONG the incline, y′ PERPENDICULAR to it. Here ${G.th} is the INCLINE angle and ${G.al} the launch angle from the incline surface.`,
  rows: [
    ['Components', "u_{x'}=u\\cos\\alpha \\qquad u_{y'}=u\\sin\\alpha", `${G.al} is from the incline`],
    [`Acceleration ${G.perp} to the slope`, "a_{y'}=-g\\cos\\theta", 'ALWAYS, both cases', 1],
    ['Acceleration along the slope', "a_{x'}=\\mp\\, g\\sin\\theta", '− up the slope, + down'],
    ['Time of flight', 'T=\\dfrac{2u\\sin\\alpha}{g\\cos\\theta}', 'SAME for both cases', 1],
    ['Max distance from the surface', 'H_{\\perp}=\\dfrac{u^{2}\\sin^{2}\\alpha}{2g\\cos\\theta}', ''],
    ['Range UP the incline', 'R=(u\\cos\\alpha)T-\\tfrac{1}{2}(g\\sin\\theta)T^{2}',
      k('=\\dfrac{2u^{2}\\sin\\alpha\\cos(\\alpha+\\theta)}{g\\cos^{2}\\theta}'), 1],
    ['Range DOWN the incline', 'R=(u\\cos\\alpha)T+\\tfrac{1}{2}(g\\sin\\theta)T^{2}',
      k('=\\dfrac{2u^{2}\\sin\\alpha\\cos(\\alpha-\\theta)}{g\\cos^{2}\\theta}'), 1],
    ['Velocity at time t', "v_{x'}=u\\cos\\alpha\\mp(g\\sin\\theta)t \\qquad v_{y'}=u\\sin\\alpha-(g\\cos\\theta)t", '− up, + down', 0, 1],
    ['Best angle UP the incline', '\\alpha_{\\text{opt}}=\\dfrac{90^{\\circ}-\\theta}{2} \\qquad R_{\\max}=\\dfrac{u^{2}}{g(1+\\sin\\theta)}', '', 1, 1],
    ['Best angle DOWN the incline', '\\alpha_{\\text{opt}}=\\dfrac{90^{\\circ}+\\theta}{2} \\qquad R_{\\max}=\\dfrac{u^{2}}{g(1-\\sin\\theta)}', '', 1, 1],
    ['Check', '\\theta=0 \\ \\Rightarrow\\ \\alpha_{\\text{opt}}=45^{\\circ},\\ \\ R_{\\max}=\\dfrac{u^{2}}{g}', 'Part 1 is the special case'],
  ],
};

const glance = {
  head: ['', 'Ground to ground', 'From a height', 'On an incline'],
  rows: [
    ['Landing condition', k('y=0'), k('y=-h'), k("y'=0")],
    ['Find t by', 'factorising', 'the quadratic formula', k("y'=0")],
    ['Time of flight', k('\\dfrac{2u\\sin\\theta}{g}'), k('\\dfrac{u\\sin\\theta+\\sqrt{u^{2}\\sin^{2}\\theta+2gh}}{g}'), k('\\dfrac{2u\\sin\\alpha}{g\\cos\\theta}')],
    ['Range', k('u_x T'), k('u_x t'), k('u\\cos\\alpha\\,T\\mp\\tfrac{1}{2}g\\sin\\theta\\,T^{2}')],
    ['Best angle', k('45^{\\circ}'), '—', k('\\dfrac{90^{\\circ}\\mp\\theta}{2}')],
  ],
};

const steps = [
  ['1', 'Sign convention', 'UP positive, origin at the launch point'],
  ['2', 'Landing value', `y = −h, signed correctly`],
  ['3', 'Solve for t', 'from the y-equation'],
  ['4', 'Keep one root', 'the positive one only'],
  ['5', 'Get the range', 'R = uₓ × t'],
];

/* ══════════════ markup ══════════════ */
const row = ([name, tex, note, star, wide]) => `
  <tr class="${star ? 'star' : ''}">
    <td class="q">${name}</td>
    ${wide
      ? `<td class="f" colspan="2">${k(tex)}${note ? `<span class="inote">${note}</span>` : ''}</td>`
      : `<td class="f">${k(tex)}</td><td class="n">${note ?? ''}</td>`}
  </tr>`;

const section = (s) => `
<section class="card sec">
  <div class="sec-head">
    <span class="sec-n">PART ${s.n}</span>
    <span class="sec-t">${s.title}</span>
  </div>
  <div class="sec-body">
    <p class="sec-sub">${s.sub}</p>
    <table class="ftab">
      <thead><tr><th>Quantity</th><th>Formula</th><th>Note</th></tr></thead>
      <tbody>${s.rows.map(row).join('')}</tbody>
    </table>
  </div>
</section>`;

const page = (n, eyebrow, body) => `
<section class="page">
  <header class="ph">
    <div>
      <img class="logo" src="nine-education.svg" alt="Nine Education">
      <div class="eyebrow">${eyebrow}</div>
    </div>
    <div class="pill">Class 11 / JEE · Physics with Harshith</div>
  </header>
  <div class="pbody">${body}</div>
  <footer class="pf">
    <span>NINE EDUCATION &nbsp;|&nbsp; Projectile Motion Formula Sheet</span>
    <span>Page ${n} of 3</span>
  </footer>
</section>`;

const page1 = page(1, 'Kinematics', `
  <div class="title-row">
    <div>
      <h1>Projectile <span class="ac">Motion</span></h1>
      <p class="lede">Every final formula from Lectures 11, 12 and 13 on one sheet.
        Copy it into your notes and keep it in front of you while you solve.</p>
    </div>
    <div class="hero">
      <div class="hero-lab">THE MASTER METHOD</div>
      <div class="hero-steps">
        <span>Resolve into two axes</span>
        <span>Solve each as a 1D problem</span>
        <span>Join them through the shared t</span>
      </div>
      <p class="hero-note">Use this whenever a formula's assumption breaks. Every result
        on this sheet is just these three steps, worked out once.</p>
    </div>
  </div>

  <div class="meta">
    <div class="meta-c"><div class="meta-l">SYMBOLS</div><div class="meta-v">u = launch speed &nbsp;·&nbsp; g = 10 m/s²</div></div>
    <div class="meta-c"><div class="meta-l">PARTS 1 AND 2</div><div class="meta-v">${G.th} = launch angle, from the horizontal</div></div>
    <div class="meta-c"><div class="meta-l">PART 3 ONLY</div><div class="meta-v">${G.th} = incline angle &nbsp;·&nbsp; ${G.al} = launch angle, from the incline</div></div>
  </div>

  <div class="quote"><b>Watch the angle names.</b> In Parts 1 and 2, ${G.th} is measured from the
    <b>horizontal</b>. In Part 3 it is the <b>incline</b> angle, and ${G.al} is the launch angle measured
    from the <b>incline surface</b>. Getting these two the wrong way round is the single most common mistake.</div>

  ${section(part1)}
`);

const page2 = page(2, 'Projectile from a height', `
  ${section(part2a)}
  ${section(part2b)}

  <div class="band">
    <div class="band-t">THE TEMPLATE FOR EVERY HEIGHT PROBLEM</div>
    <div class="band-steps">
      ${steps.map(([n, t, d]) => `<div class="step"><span class="step-n">${n}</span>
        <span class="step-t">${t}</span><span class="step-d">${d}</span></div>`).join('')}
    </div>
  </div>
`);

const page3 = page(3, 'Projectile on an inclined plane', `
  ${section(part3)}

  <section class="card sec">
    <div class="sec-head alt"><span class="sec-t">THE THREE CASES AT A GLANCE</span></div>
    <div class="sec-body">
      <table class="ftab gtab">
        <thead><tr>${glance.head.map((h, i) => `<th class="${i ? '' : 'first'}">${h}</th>`).join('')}</tr></thead>
        <tbody>${glance.rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i ? 'g' : 'q'}">${c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>
  </section>
`);

/* ══════════════ styles ══════════════ */
const css = `
@font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-weight:400 800;font-display:block;
  src:url(jakarta-var-latin.woff2) format('woff2');
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}
@font-face{font-family:'Plus Jakarta Sans';font-style:normal;font-weight:400 800;font-display:block;
  src:url(jakarta-var-latin-ext.woff2) format('woff2');
  unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF;}

/* without this Chrome prints on Letter (216x279mm) and every 297mm page spills */
@page{size:A4;margin:0;}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
html,body{background:#fff;color:#171717;font-family:'Plus Jakarta Sans',Arial,Helvetica,sans-serif;}

.page{width:210mm;height:297mm;padding:11mm 13mm 9mm;background:#fff;display:flex;flex-direction:column;
  break-after:page;page-break-after:always;overflow:hidden;}
.page:last-child{break-after:auto;page-break-after:auto;}
.pbody{flex:1;}

.ph{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;}
.logo{height:30px;width:auto;display:block;}
.eyebrow{font-size:9.5px;font-weight:600;color:${T.muted};margin-top:1px;}
.pill{border:1px solid ${T.tagBorder};border-radius:999px;background:#fff;padding:6px 14px;
  font-size:10px;font-weight:700;color:${T.primary};white-space:nowrap;}

.pf{display:flex;align-items:center;justify-content:space-between;border-top:1px solid ${T.rule};
  margin-top:10px;padding-top:8px;font-size:8.5px;color:${T.faint};}

.title-row{display:flex;gap:14px;align-items:stretch;margin-bottom:11px;}
.title-row > div:first-child{flex:1;padding-top:2px;}
h1{font-size:33px;font-weight:800;letter-spacing:-.9px;color:${T.primary};line-height:1.05;}
h1 .ac{color:${T.accent};}
.lede{margin-top:7px;font-size:11px;line-height:1.55;color:${T.body};max-width:88mm;}

.hero{width:78mm;border-radius:16px;padding:14px 16px;color:#fff;
  background:linear-gradient(135deg,#123a63 0%,${T.primary} 55%,#1b6ba8 100%);}
.hero-lab{font-size:8px;font-weight:800;letter-spacing:.14em;color:#BFE3F7;}
.hero-steps{margin-top:7px;display:flex;flex-direction:column;gap:3px;}
.hero-steps span{font-size:12.5px;font-weight:700;line-height:1.3;position:relative;padding-left:13px;}
.hero-steps span::before{content:"";position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:50%;background:${T.accent};}
.hero-note{margin-top:8px;font-size:8.5px;line-height:1.5;color:#C6DDEF;}

.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:10px;}
.meta-c{border:1px solid ${T.cardBorder};border-radius:12px;background:${T.panel};padding:8px 11px;}
.meta-l{font-size:7.5px;font-weight:800;letter-spacing:.12em;color:${T.muted};}
.meta-v{margin-top:3px;font-size:10.5px;font-weight:700;color:${T.primary};line-height:1.35;}

.quote{border-left:5px solid ${T.accent};border-radius:0 12px 12px 0;background:${T.wash};
  padding:10px 14px;font-size:10.5px;line-height:1.55;color:${T.primary};font-weight:500;margin-bottom:12px;}
.quote b{font-weight:800;}

.card{border:1px solid ${T.cardBorder};border-radius:16px;background:#fff;overflow:hidden;}
.sec{margin-bottom:10px;}
.sec-head{display:flex;align-items:center;gap:9px;padding:8px 16px;
  background:linear-gradient(135deg,${T.primary} 0%,#1b6ba8 100%);}
.sec-head.alt{background:linear-gradient(135deg,#123a63 0%,${T.primary} 100%);}
.sec-n{font-size:8.5px;font-weight:800;letter-spacing:.1em;color:#BFE3F7;
  border:1px solid rgba(255,255,255,.38);border-radius:999px;padding:2px 8px;}
.sec-t{font-size:12.5px;font-weight:800;letter-spacing:.02em;color:#fff;}
.sec-body{padding:9px 16px 12px;}
.sec-sub{font-size:9.5px;line-height:1.5;color:${T.caption};margin-bottom:6px;}

.ftab{width:100%;border-collapse:collapse;}
.ftab th{font-size:7.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:${T.muted};
  text-align:left;padding:0 8px 4px 0;border-bottom:1px solid ${T.rule};}
.ftab td{padding:4.5px 8px 4.5px 0;border-top:1px solid ${T.rule};vertical-align:middle;}
.ftab tr:first-child td{border-top:none;}
.ftab .q{width:31%;font-size:10px;font-weight:700;color:${T.primary};line-height:1.3;}
.ftab .f{width:44%;color:#12395f;}
.ftab .n{width:25%;font-size:9px;color:${T.caption};line-height:1.4;}
.inote{margin-left:14px;font-size:9px;color:${T.caption};}
.ftab .star td{background:${T.wash};}
.ftab .star .f .katex{font-size:1.12em;}
.ftab .star td:first-child{border-radius:7px 0 0 7px;padding-left:8px;}
.ftab .star td:last-child{border-radius:0 7px 7px 0;}
.katex{font-size:1.02em;}
.n .katex,.inote .katex{font-size:1.06em;color:${T.body};}
.gtab .g .katex{font-size:1.05em;}

.gtab td,.gtab th{text-align:left;}
.gtab .q{width:19%;}
.gtab .g{width:27%;font-size:9.5px;color:${T.body};}
.gtab th.first{width:19%;}

.band{border-radius:16px;padding:12px 16px;margin-bottom:10px;color:#fff;
  background:linear-gradient(135deg,#123a63 0%,${T.primary} 48%,${T.accent} 130%);}
.band-t{font-size:8.5px;font-weight:800;letter-spacing:.14em;color:#CDE8F8;margin-bottom:7px;}
.band-steps{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;}
.step{display:flex;flex-direction:column;gap:1px;}
.step-n{width:17px;height:17px;border-radius:6px;background:rgba(255,255,255,.19);
  font-size:9.5px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-bottom:3px;}
.step-t{font-size:10px;font-weight:800;line-height:1.2;}
.step-d{font-size:8px;line-height:1.35;color:#CFE6F5;}
`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Projectile Motion - Formula Sheet</title>
<link rel="stylesheet" href="katex.min.css">
<style>${css}</style></head><body>${page1}${page2}${page3}</body></html>`;

/* ══════════════ render ══════════════ */
const dir = mkdtempSync(join(tmpdir(), 'formula-sheet-'));
writeFileSync(join(dir, 'sheet.html'), html);
copyFileSync(join(ROOT, 'node_modules/katex/dist/katex.min.css'), join(dir, 'katex.min.css'));
cpSync(join(ROOT, 'node_modules/katex/dist/fonts'), join(dir, 'fonts'), { recursive: true });
for (const f of ['jakarta-var-latin.woff2', 'jakarta-var-latin-ext.woff2']) {
  copyFileSync(join(HERE, 'fonts', f), join(dir, f));
}
copyFileSync(join(ROOT, 'public/brand/nine-education.svg'), join(dir, 'nine-education.svg'));

const MIME = { '.html': 'text/html', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff': 'font/woff' };
const server = createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0].slice(1)) || 'sheet.html';
  try {
    const buf = readFileSync(join(dir, name));
    res.writeHead(200, { 'Content-Type': MIME[extname(name)] ?? 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404).end('not found');
  }
});

/* Chrome has to be spawned ASYNCHRONOUSLY: the static server above lives in this
   same process, so a blocking execFileSync would deadlock - Chrome would wait on
   a request that the blocked event loop can never answer.                      */
server.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  mkdirSync(dirname(OUT), { recursive: true });
  execFile(CHROME, [
    '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
    '--run-all-compositor-stages-before-draw', '--virtual-time-budget=12000',
    `--print-to-pdf=${OUT}`, `http://127.0.0.1:${port}/sheet.html`,
  ], (err, _stdout, stderr) => {
    server.close();
    if (err) {
      console.error(stderr || err.message);
      process.exit(1);
    }
    console.log(`wrote ${OUT}`);
    console.log(`html source: ${dir}/sheet.html`);
  });
});
