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
  '5': 'Velocity, Angle & Energy During Flight',
};

export const PYQS: PYQ[] = [
  /* ─── 1 · Time of Flight, Height & Range ─── */
  {
    id: '1.1', sec: '1', source: 'JEE Main 2025 (3 April Evening Shift)',
    q: 'A particle is projected with velocity u such that its horizontal range is 3 times the maximum height reached. If the range is nu²/25g, find the value of n.',
    options: ['A) 6', 'B) 12', 'C) 18', 'D) 24'],
    answer: 'D) 24',
    solution: `Range and maximum height for a ground-to-ground projectile:
R = u² sin2θ / g   and   H = u² sin²θ / 2g

Divide one by the other:
R / H = (2 sinθ cosθ) ÷ (sin²θ / 2) = 4 cotθ     (i.e. R = 4H cotθ)

The question gives R = 3H, so:
4 cotθ = 3  →  tanθ = 4/3  →  sinθ = 4/5, cosθ = 3/5

Now put those back into the range:
R = u² (2 sinθ cosθ) / g = u² × 2 × (4/5) × (3/5) / g = 24u² / 25g

Comparing with R = nu²/25g gives n = 24.`,
  },

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

  /* ─── 3 · Projectile from a Height ─── */
  {
    id: '3.1', sec: '3', source: 'JEE Main 2025 (7 April Evening Shift)',
    q: 'A helicopter flying horizontally with a speed of 360 km/h at an altitude of 2 km drops an object, which reaches the ground at point O, 20 s after it is released. Find the displacement of O from the point of release. (g = 10 m/s²)',
    options: ['A) 7.2 km', 'B) 2√5 km', 'C) 2√2 km', 'D) 4 km'],
    answer: 'C) 2√2 km',
    solution: `Convert the speed: 360 km/h = 360 × 5/18 = 100 m/s, horizontal.

The object is released, not thrown, so vertically it starts from rest and falls freely:
vertical drop = ½gt² = ½(10)(20)² = 2000 m = 2 km
That matches the stated 2 km altitude, which confirms t = 20 s.

Horizontally the velocity never changes (no horizontal force):
horizontal distance = u t = 100 × 20 = 2000 m = 2 km

The displacement is the straight line from the release point to O, and those two legs are perpendicular:
displacement = √(2² + 2²) = 2√2 km ≈ 2.83 km

Careful: the question asks for the DISPLACEMENT of O from the release point, not the horizontal distance covered (2 km) - the object also ended up 2 km lower than where it started.`,
  },

  /* ─── 5 · Velocity, Angle & Energy During Flight ─── */
  {
    id: '5.1', sec: '5', source: 'JEE Main 2025 (22 January Evening Shift)',
    q: 'A ball of mass 100 g is projected with a velocity of 20 m/s at 60° with the horizontal. The decrease in kinetic energy of the ball from the point of projection to the highest point of its path is:',
    options: ['A) 20 J', 'B) 5 J', 'C) 15 J', 'D) zero'],
    answer: 'C) 15 J',
    solution: `m = 100 g = 0.1 kg, u = 20 m/s, θ = 60°.

At the point of projection:
KE = ½mu² = ½ × 0.1 × 20² = 20 J

At the highest point the vertical component has momentarily dropped to zero, but the horizontal component is untouched:
v_top = u cosθ = 20 × cos60° = 10 m/s
KE = ½ × 0.1 × 10² = 5 J

Decrease in kinetic energy = 20 − 5 = 15 J

In one step: ΔKE = ½m(u sinθ)² = ½ × 0.1 × (20 sin60°)² = 15 J - only the vertical part of the kinetic energy is lost.

The trap is option D (zero) and option A (20 J): the ball is NOT at rest at the top. Only v_y = 0 there; it still moves horizontally at u cosθ, so it keeps 5 J of kinetic energy.`,
  },
];
