/* JEE Advanced · Practice Set II - Kinematics
   Class XI Physics, Nine Education IIT Academy, lectures 8 and 10-12.
   Transcribed from the printed paper; the PDF stays downloadable alongside
   the page. Maths is written between $...$ and rendered with KaTeX at build
   time, so the page ships as plain HTML with no client-side script.        */

export interface MatchTable {
  left: string[];    // Column I rows, already lettered (A) ... (D)
  right: string[];   // Column II rows, already lettered (P) ... (T)
}

export interface Question {
  id: number;
  sec: 'A' | 'B' | 'C';
  q: string;            // stem
  options?: string[];   // Section A, already lettered (A) ... (D)
  correct?: string[];   // Section A, the letters that are right
  table?: MatchTable;   // Section B
  answer: string;       // short answer, shown on Check answer
  solution: string;     // worked solution; newlines are preserved in the UI
}

export interface Section {
  key: 'A' | 'B' | 'C';
  name: string;
  note: string;
}

/* The printed paper carries no answer key, so the answers and the worked
   solutions below were derived for this page - worth a look before class. */

export const META = {
  title: 'JEE Advanced · Practice Set II',
  subject: 'Kinematics',
  line: 'Class XI · Physics  |  Nine Education IIT Academy  |  Lectures 8, 10-12',
  count: 15,
  minutes: 50,
  rule: 'Take $g = 10\\ \\mathrm{m/s^2}$ unless stated otherwise.',
  pdf: '/downloads/kinematics/practice-set-2.pdf',
};

export const SECTIONS: Section[] = [
  { key: 'A', name: 'Multiple Options Correct', note: 'One or more options may be correct.' },
  { key: 'B', name: 'Matrix Matching', note: 'Match each row of Column I with the entries of Column II.' },
  { key: 'C', name: 'Numerical Value Type', note: 'Give the answer correct to two decimal places.' },
];

export const MARKING = [
  { sec: 'Section A', text: '+4 all correct;  +3 / +2 / +1 partial;  −2 for any wrong option.' },
  { sec: 'Section B', text: '+2 per correct row,  −1 per wrong row.' },
  { sec: 'Section C', text: '+4 correct,  0 wrong.' },
];

export const QUESTIONS: Question[] = [
  /* ─────────── SECTION A · multiple options correct ─────────── */
  {
    id: 1, sec: 'A',
    q: 'A particle moves in the $xy$-plane with $x = 3t$ and $y = 4t - 5t^2$ (SI units). Which of the following are correct?',
    options: [
      '(A) The initial speed is $5\\ \\mathrm{m/s}$.',
      '(B) The acceleration is constant, of magnitude $10\\ \\mathrm{m/s^2}$.',
      '(C) The path is a parabola.',
      '(D) The particle returns to the $x$-axis at $t = 1.25\\ \\mathrm{s}$.',
    ],
    correct: ['A', 'B', 'C'],
    answer: '(A), (B), (C)',
    solution: `$v_x = 3$, $v_y = 4 - 10t$, so at $t = 0$ the speed is $\\sqrt{3^2+4^2} = 5$ m/s.
$a_x = 0$, $a_y = -10$: the acceleration is constant with magnitude $10$ m/s$^2$.
Eliminating $t = x/3$ gives $y = \\tfrac43 x - \\tfrac59 x^2$, a parabola.
$y = 0$ again when $4t = 5t^2$, i.e. $t = 0.8$ s - not $1.25$ s, so (D) fails.`,
  },
  {
    id: 2, sec: 'A',
    q: 'A particle moves along the $x$-axis with velocity $v = 4\\sqrt{x}$ (SI), and is at $x = 1\\ \\mathrm{m}$ at $t = 0$. Which are correct?',
    options: [
      '(A) The acceleration is constant and equal to $8\\ \\mathrm{m/s^2}$.',
      '(B) The speed at $t = 0$ is $4\\ \\mathrm{m/s}$.',
      '(C) The particle is at $x = 9\\ \\mathrm{m}$ at $t = 1\\ \\mathrm{s}$.',
      '(D) The acceleration increases with $x$.',
    ],
    correct: ['A', 'B', 'C'],
    answer: '(A), (B), (C)',
    solution: `$a = v\\dfrac{dv}{dx} = 4\\sqrt{x}\\cdot\\dfrac{4}{2\\sqrt{x}} = 8$ m/s$^2$: constant, so (A) holds and (D) fails.
At $t = 0$, $x = 1$, so $v = 4\\sqrt{1} = 4$ m/s.
$\\dfrac{dx}{\\sqrt{x}} = 4\\,dt \\Rightarrow 2\\sqrt{x} = 4t + 2 \\Rightarrow x = (2t+1)^2$.
At $t = 1$ s, $x = 9$ m.`,
  },
  {
    id: 3, sec: 'A',
    q: 'A particle with initial velocity $20\\ \\mathrm{m/s}$ decelerates as $a = -2v$ (SI). Which are correct?',
    options: [
      '(A) Its velocity is $10\\ \\mathrm{m/s}$ at $t = \\tfrac12 \\ln 2\\ \\mathrm{s}$.',
      '(B) The total distance travelled before it stops is $10\\ \\mathrm{m}$.',
      '(C) The particle comes to rest in a finite time.',
      '(D) It covers $5\\ \\mathrm{m}$ in the first $\\tfrac12 \\ln 2$ seconds.',
    ],
    correct: ['A', 'B', 'D'],
    answer: '(A), (B), (D)',
    solution: `$\\dfrac{dv}{dt} = -2v \\Rightarrow v = 20e^{-2t}$. $v = 10$ when $e^{-2t} = \\tfrac12$, i.e. $t = \\tfrac12\\ln 2$ s.
Using $v\\dfrac{dv}{dx} = -2v$: $\\dfrac{dv}{dx} = -2 \\Rightarrow v = 20 - 2x$, so $v = 0$ at $x = 10$ m - the total distance.
At $t = \\tfrac12\\ln 2$ the speed is $10$, so $x = \\dfrac{20-10}{2} = 5$ m.
The exponential never reaches zero, so it does NOT stop in finite time: (C) fails.`,
  },
  {
    id: 4, sec: 'A',
    q: 'A projectile is launched from level ground with speed $u$ at angle $\\theta$. Over the complete flight:',
    options: [
      '(A) The magnitude of the average velocity is $u\\cos\\theta$.',
      '(B) The magnitude of the change in velocity is $2u\\sin\\theta$.',
      '(C) The radius of curvature of the path at the highest point is $\\dfrac{u^2\\cos^2\\theta}{g}$.',
      '(D) The average acceleration is zero.',
    ],
    correct: ['A', 'B', 'C'],
    answer: '(A), (B), (C)',
    solution: `Average velocity $= \\dfrac{R}{T} = \\dfrac{u^2\\sin 2\\theta / g}{2u\\sin\\theta / g} = u\\cos\\theta$.
$\\Delta\\vec v = (u\\cos\\theta,\\,-u\\sin\\theta) - (u\\cos\\theta,\\,u\\sin\\theta) = (0,\\,-2u\\sin\\theta)$, magnitude $2u\\sin\\theta$.
At the top the speed is $u\\cos\\theta$ and $g$ is entirely centripetal, so $r = \\dfrac{v^2}{a} = \\dfrac{u^2\\cos^2\\theta}{g}$.
Average acceleration $= \\dfrac{\\Delta v}{T} = g \\ne 0$, so (D) fails.`,
  },
  {
    id: 5, sec: 'A',
    q: 'A stone is thrown horizontally at $15\\ \\mathrm{m/s}$ from a $45\\ \\mathrm{m}$ cliff ($g = 10\\ \\mathrm{m/s^2}$).',
    options: [
      '(A) It lands after $3\\ \\mathrm{s}$.',
      '(B) It lands $45\\ \\mathrm{m}$ from the base of the cliff.',
      '(C) Its impact speed is $15\\sqrt{5}\\ \\mathrm{m/s}$.',
      '(D) Its impact velocity makes $45^\\circ$ with the horizontal.',
    ],
    correct: ['A', 'B', 'C'],
    answer: '(A), (B), (C)',
    solution: `$t = \\sqrt{2h/g} = \\sqrt{9} = 3$ s.
Horizontal distance $= 15 \\times 3 = 45$ m.
$v_y = gt = 30$, $v_x = 15$, so $v = \\sqrt{15^2+30^2} = 15\\sqrt5$ m/s.
$\\tan\\theta = 30/15 = 2 \\Rightarrow \\theta \\approx 63.4^\\circ$, not $45^\\circ$: (D) fails.`,
  },
  {
    id: 6, sec: 'A',
    q: 'Two particles are projected simultaneously from the same point with the same speed $u$ but at different angles $\\theta_1$ and $\\theta_2$. Neglect air resistance.',
    options: [
      '(A) The velocity of one relative to the other is constant in magnitude and direction.',
      '(B) The path of one as seen from the other is a straight line.',
      '(C) Their separation increases linearly with time.',
      '(D) They will meet again in mid-air.',
    ],
    correct: ['A', 'B', 'C'],
    answer: '(A), (B), (C)',
    solution: `Both carry the same $\\vec g$, so the relative acceleration is zero and $\\vec v_{12}$ is a constant vector.
The relative displacement is $\\vec v_{12}t$: a straight line, with separation $|\\vec v_{12}|\\,t$ growing linearly.
They meet again only if $\\vec v_{12} = 0$, which needs equal angles. Different angles, so (D) fails.`,
  },

  /* ─────────── SECTION B · matrix matching ─────────── */
  {
    id: 7, sec: 'B',
    q: 'A projectile is launched from level ground with fixed speed $u$. Match the projection angle with its property.',
    table: {
      left: [
        '(A) $\\theta = 30^\\circ$',
        '(B) $\\theta = 45^\\circ$',
        '(C) $\\theta = 60^\\circ$',
        '(D) $\\theta = 90^\\circ$',
      ],
      right: [
        '(P) Range is maximum',
        '(Q) Maximum height $= \\tfrac14$ of the range',
        '(R) Range is zero',
        '(S) Time of flight is maximum',
        '(T) Another angle in Column I gives the same range',
      ],
    },
    answer: '(A) → T   (B) → P, Q   (C) → T   (D) → R, S',
    solution: `$R = \\dfrac{u^2\\sin 2\\theta}{g}$, $H = \\dfrac{u^2\\sin^2\\theta}{2g}$, $T = \\dfrac{2u\\sin\\theta}{g}$.
(A) $30^\\circ$: its complement $60^\\circ$ is also in Column I and gives the same range → (T).
(B) $45^\\circ$: range is maximum → (P). Also $\\dfrac{H}{R} = \\dfrac{\\tan\\theta}{4} = \\dfrac14$ → (Q). It is its own complement, so no OTHER angle repeats its range.
(C) $60^\\circ$: complement $30^\\circ$ is in Column I → (T).
(D) $90^\\circ$: $\\sin 2\\theta = 0$ so the range is zero → (R), and $\\sin\\theta = 1$ makes the time of flight the largest → (S).`,
  },
  {
    id: 8, sec: 'B',
    q: 'Match the given kinematic relation ($k > 0$, motion along the $x$-axis) with its consequence.',
    table: {
      left: [
        '(A) $v = k\\sqrt{x}$',
        '(B) $v = -kx$',
        '(C) $a = -kv$',
        '(D) $a = -kx$',
      ],
      right: [
        '(P) Acceleration is constant',
        '(Q) Speed decays exponentially with time',
        '(R) Motion is simple harmonic',
        '(S) The $v$–$x$ graph is a straight line',
        '(T) The $v$–$x$ graph is not a straight line',
      ],
    },
    answer: '(A) → P, T   (B) → Q, S   (C) → Q, S   (D) → R, T',
    solution: `(A) $v = k\\sqrt x$: $a = v\\dfrac{dv}{dx} = k\\sqrt x \\cdot \\dfrac{k}{2\\sqrt x} = \\dfrac{k^2}{2}$, constant → (P). The $v$-$x$ graph is a parabola → (T).
(B) $v = -kx$: $v$ is linear in $x$ → (S), and $\\dfrac{dx}{dt} = -kx$ gives $x = x_0e^{-kt}$, so the speed decays exponentially → (Q).
(C) $a = -kv$: $\\dfrac{dv}{dt} = -kv \\Rightarrow v = v_0e^{-kt}$ → (Q). Also $v\\dfrac{dv}{dx} = -kv \\Rightarrow v = v_0 - kx$, a straight line → (S).
(D) $a = -kx$: this is the SHM equation → (R), and $v^2 = v_0^2 - kx^2$ is an ellipse, not a straight line → (T).`,
  },
  {
    id: 9, sec: 'B',
    q: 'A particle is launched from the top of a $20\\ \\mathrm{m}$ tower with speed $10\\ \\mathrm{m/s}$ ($g = 10\\ \\mathrm{m/s^2}$). Match the launch direction with the correct impact data.',
    table: {
      left: [
        '(A) Horizontal',
        '(B) Vertically downward',
        '(C) Vertically upward',
        '(D) $30^\\circ$ above horizontal',
      ],
      right: [
        '(P) Time of flight $= 2\\ \\mathrm{s}$',
        '(Q) Impact speed $= 10\\sqrt{5}\\ \\mathrm{m/s}$',
        '(R) Time of flight $= (1 + \\sqrt{5})\\ \\mathrm{s}$',
        '(S) Horizontal distance covered is zero',
        '(T) Time of flight exceeds $2\\ \\mathrm{s}$',
      ],
    },
    answer: '(A) → P, Q   (B) → Q, S   (C) → Q, R, S, T   (D) → Q, T',
    solution: `The impact speed follows from energy alone: $v^2 = u^2 + 2gh = 100 + 400 = 500$, so EVERY launch direction gives $10\\sqrt5$ m/s → (Q) matches all four rows. That is the point of the question.
(A) Horizontal: $20 = 5t^2 \\Rightarrow t = 2$ s → (P).
(B) Straight down: $20 = 10t + 5t^2 \\Rightarrow t = \\sqrt5 - 1 \\approx 1.24$ s, and no horizontal motion → (S).
(C) Straight up: $20 = -10t + 5t^2 \\Rightarrow t = 1 + \\sqrt5 \\approx 3.24$ s → (R), which exceeds $2$ s → (T), and again no horizontal motion → (S).
(D) $30^\\circ$ above horizontal: $v_y = 5$ up, $20 = -5t + 5t^2 \\Rightarrow t = \\dfrac{1+\\sqrt{17}}{2} \\approx 2.56$ s → (T).`,
  },

  /* ─────────── SECTION C · numerical value type ─────────── */
  {
    id: 10, sec: 'C',
    q: 'A particle starts from rest with $a = (6 - 2t)\\ \\mathrm{m/s^2}$. Find the distance travelled (in m) until it next comes momentarily to rest.',
    answer: '36.00 m',
    solution: `$v = \\displaystyle\\int_0^t (6-2t)\\,dt = 6t - t^2$, which returns to zero at $t = 6$ s.
$v > 0$ throughout $0 < t < 6$, so distance $=$ displacement:
$s = \\displaystyle\\int_0^6 (6t - t^2)\\,dt = \\left[3t^2 - \\tfrac{t^3}{3}\\right]_0^6 = 108 - 72 = 36$ m.`,
  },
  {
    id: 11, sec: 'C',
    q: 'A particle moves with $a = 4x$ (SI) and has $v = 3\\ \\mathrm{m/s}$ at $x = 0$. Find its speed (in m/s) at $x = 2\\ \\mathrm{m}$.',
    answer: '5.00 m/s',
    solution: `$v\\dfrac{dv}{dx} = 4x \\Rightarrow \\dfrac{v^2}{2} = 2x^2 + C \\Rightarrow v^2 = 4x^2 + C$.
At $x = 0$, $v = 3$, so $C = 9$ and $v^2 = 4x^2 + 9$.
At $x = 2$: $v^2 = 16 + 9 = 25 \\Rightarrow v = 5$ m/s.`,
  },
  {
    id: 12, sec: 'C',
    q: 'A projectile is fired at $20\\ \\mathrm{m/s}$ at $60^\\circ$ to the horizontal ($g = 10\\ \\mathrm{m/s^2}$). Find the magnitude of the change in its velocity (in m/s) between launch and the highest point.',
    answer: '17.32 m/s',
    solution: `Launch $(u\\cos 60^\\circ,\\,u\\sin 60^\\circ) = (10,\\,10\\sqrt3)$; at the top $(10,\\,0)$.
$\\Delta\\vec v = (0,\\,-10\\sqrt3)$, so $|\\Delta\\vec v| = u\\sin\\theta = 10\\sqrt3 \\approx 17.32$ m/s.
Only the vertical component changes - the horizontal one never does.`,
  },
  {
    id: 13, sec: 'C',
    q: 'A ball is projected at $25\\ \\mathrm{m/s}$ at $53^\\circ$ above the horizontal ($\\sin 53^\\circ = 0.8$, $\\cos 53^\\circ = 0.6$, $g = 10\\ \\mathrm{m/s^2}$). Find the time interval (in s) between the two instants at which its velocity makes $45^\\circ$ with the horizontal.',
    answer: '3.00 s',
    solution: `$v_x = 25\\cos 53^\\circ = 15$, $v_{y0} = 25\\sin 53^\\circ = 20$.
The velocity is at $45^\\circ$ when $|v_y| = v_x = 15$.
Going up: $20 - 10t = 15 \\Rightarrow t = 0.5$ s. Coming down: $20 - 10t = -15 \\Rightarrow t = 3.5$ s.
Interval $= 3.5 - 0.5 = 3$ s.`,
  },
  {
    id: 14, sec: 'C',
    q: 'A ball is projected at $10\\ \\mathrm{m/s}$ at $30^\\circ$ above the horizontal from the top of a $10\\ \\mathrm{m}$ tower ($g = 10\\ \\mathrm{m/s^2}$). Find the horizontal distance (in m) from the foot of the tower where it strikes the ground.',
    answer: '17.32 m',
    solution: `$v_x = 10\\cos 30^\\circ = 5\\sqrt3$, $v_{y0} = 5$ upward.
Taking up as positive, $-10 = 5t - 5t^2 \\Rightarrow t^2 - t - 2 = 0 \\Rightarrow t = 2$ s.
Horizontal distance $= 5\\sqrt3 \\times 2 = 10\\sqrt3 \\approx 17.32$ m.`,
  },
  {
    id: 15, sec: 'C',
    q: 'The trajectory of a projectile is $y = \\sqrt{3}\\,x - x^2/20$ ($x$, $y$ in metres, $g = 10\\ \\mathrm{m/s^2}$). Find the speed of projection (in m/s).',
    answer: '20.00 m/s',
    solution: `Compare with $y = x\\tan\\theta - \\dfrac{gx^2}{2u^2\\cos^2\\theta}$.
$\\tan\\theta = \\sqrt3 \\Rightarrow \\theta = 60^\\circ$, so $\\cos\\theta = \\tfrac12$.
$\\dfrac{g}{2u^2\\cos^2\\theta} = \\dfrac{1}{20} \\Rightarrow \\dfrac{10}{2u^2/4} = \\dfrac{1}{20} \\Rightarrow u^2 = 400 \\Rightarrow u = 20$ m/s.`,
  },
];
