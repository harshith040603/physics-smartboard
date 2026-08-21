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
  table?: MatchTable;   // Section B
}

export interface Section {
  key: 'A' | 'B' | 'C';
  name: string;
  note: string;
}

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
  },

  /* ─────────── SECTION C · numerical value type ─────────── */
  {
    id: 10, sec: 'C',
    q: 'A particle starts from rest with $a = (6 - 2t)\\ \\mathrm{m/s^2}$. Find the distance travelled (in m) until it next comes momentarily to rest.',
  },
  {
    id: 11, sec: 'C',
    q: 'A particle moves with $a = 4x$ (SI) and has $v = 3\\ \\mathrm{m/s}$ at $x = 0$. Find its speed (in m/s) at $x = 2\\ \\mathrm{m}$.',
  },
  {
    id: 12, sec: 'C',
    q: 'A projectile is fired at $20\\ \\mathrm{m/s}$ at $60^\\circ$ to the horizontal ($g = 10\\ \\mathrm{m/s^2}$). Find the magnitude of the change in its velocity (in m/s) between launch and the highest point.',
  },
  {
    id: 13, sec: 'C',
    q: 'A ball is projected at $25\\ \\mathrm{m/s}$ at $53^\\circ$ above the horizontal ($\\sin 53^\\circ = 0.8$, $\\cos 53^\\circ = 0.6$, $g = 10\\ \\mathrm{m/s^2}$). Find the time interval (in s) between the two instants at which its velocity makes $45^\\circ$ with the horizontal.',
  },
  {
    id: 14, sec: 'C',
    q: 'A ball is projected at $10\\ \\mathrm{m/s}$ at $30^\\circ$ above the horizontal from the top of a $10\\ \\mathrm{m}$ tower ($g = 10\\ \\mathrm{m/s^2}$). Find the horizontal distance (in m) from the foot of the tower where it strikes the ground.',
  },
  {
    id: 15, sec: 'C',
    q: 'The trajectory of a projectile is $y = \\sqrt{3}\\,x - x^2/20$ ($x$, $y$ in metres, $g = 10\\ \\mathrm{m/s^2}$). Find the speed of projection (in m/s).',
  },
];
