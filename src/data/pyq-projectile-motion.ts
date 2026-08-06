/* Projectile Motion - JEE Main PYQ Bank (topic-wise).
   Same shape as pyq-units-dimensions.ts, rendered by
   src/pages/jee-pyqs/projectile-motion.astro via src/scripts/pyq-viewer.ts.
   Answers + solutions live here but stay hidden in the UI until the student
   clicks "Check answer" so they solve first, then verify.

   `source` carries the paper: "JEE Main 2025 (29 January Shift 1)". Leave it
   as an empty string when the paper is not known - the card then shows no
   provenance rather than a guessed one.                                     */

export interface MatchTable {
  left: string[];
  right: string[];
}

export interface PYQ {
  id: string;          // "1.1"
  sec: string;         // section key "1".."5"
  source: string;      // original paper / shift, or '' if unknown
  q: string;           // question stem
  table?: MatchTable;  // optional match-the-list table
  options?: string[];  // MCQ options; omit for integer/numeric answers
  answer: string;      // "(1)", "0.8 m", ...
  solution: string;    // worked solution (line breaks preserved in UI)
}

export const SECTIONS: Record<string, string> = {
  '1': 'Time of Flight, Height & Range',
  '2': 'Trajectory Equation & Position at a Point',
  '3': 'Projectile from a Height',
  '4': 'Projectile on an Inclined Plane',
  '5': 'Velocity & Angle During Flight',
};

export const PYQS: PYQ[] = [
  /* ─── 2 · Trajectory Equation & Position at a Point ─── */
  {
    id: '2.1', sec: '2',
    source: '',   // TODO: year + shift
    q: 'A particle is projected with a velocity of 10 m/s at an angle of 30° with the horizontal. A wall is present at a horizontal distance of √3 m from the point of projection. Find the height of the wall such that the particle just grazes the wall.',
    answer: '0.8 m',
    solution: `Take g = 10 m/s².

Resolve the launch velocity into components:
uₓ = 10 cos30° = 10 × (√3/2) = 5√3 m/s
u_y = 10 sin30° = 10 × 0.5 = 5 m/s

The horizontal motion is uniform, so the wall is reached at:
t = x / uₓ = √3 / (5√3) = 0.2 s

"Just grazes" means the particle passes exactly over the top of the wall, so the height of the wall is the projectile's height at that instant:
y = u_y t − ½gt² = 5(0.2) − ½(10)(0.2)² = 1 − 0.2 = 0.8 m

The same result straight from the trajectory equation:
y = x tanθ − gx² / (2u²cos²θ)
y = √3 × (1/√3) − 10(3) / (2 × 100 × ¾) = 1 − 0.2 = 0.8 m

Height of the wall = 0.8 m.`,
  },
];
