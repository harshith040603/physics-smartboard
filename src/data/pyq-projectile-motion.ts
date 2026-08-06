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
  '3': 'Projectile From / Onto a Height',
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

  /* ─── 3 · Projectile From / Onto a Height ─── */
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


  {
    id: '3.2', sec: '3', source: 'JEE Main 2026 (24 January Shift 1)',
    q: 'A boy throws a ball into the air at 45° from the horizontal to land it on the roof of a building of height H. If the ball attains maximum height in 2 s and lands on the building 3 s after launch, then the value of H is ____ m. (g = 10 m/s²)',
    options: ['(1) 15', '(2) 20', '(3) 25', '(4) 10'],
    answer: '(1) 15',
    solution: `The whole question is decided by the VERTICAL motion - the 45° is never actually needed.

At the highest point v_y = 0, and the time to get there is given as 2 s:
u_y = g × t_top = 10 × 2 = 20 m/s

The roof is where the ball is at t = 3 s, measured from the launch point:
H = u_y t − ½gt² = 20(3) − ½(10)(3)² = 60 − 45 = 15 m

Sanity check: the maximum height is u_y²/2g = 400/20 = 20 m, reached at 2 s. At 3 s the ball has been falling for 1 s and has dropped ½(10)(1)² = 5 m from the peak, so it is at 20 − 5 = 15 m. It lands on the roof on the way DOWN.`,
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

  {
    id: '5.2', sec: '5', source: 'JEE Main 2026 (23 January Shift 1)',
    q: 'An object is projected with kinetic energy K from a point A at an angle of 60° with the horizontal. B is the highest point of its path and C is the landing point, at the same level as A. The ratio of the difference in kinetic energies at points B and C to that at point A, in the absence of air friction, is:',
    options: ['(1) 1 : 4', '(2) 2 : 3', '(3) 3 : 4', '(4) 1 : 2'],
    answer: '(3) 3 : 4',
    solution: `Let the launch speed be u, so the kinetic energy at A is K = ½mu².

At B, the highest point, only the horizontal component of the velocity survives:
v_B = u cos60° = u/2
KE_B = ½m(u/2)² = ¼ × ½mu² = K/4

C is at the same height as A and there is no air friction, so the speed there is u again:
KE_C = K

Difference in the kinetic energies at B and C:
KE_C − KE_B = K − K/4 = 3K/4

Ratio of that difference to the kinetic energy at A:
(3K/4) : K = 3 : 4`,
  },

  {
    id: '5.3', sec: '5', source: 'JEE Main 2026 (22 January Shift 1)',
    q: 'A projectile is thrown upward at an angle of 60° with the horizontal. The speed of the projectile is 20 m/s when its direction of motion is 45° with the horizontal. The initial speed of the projectile is ____ m/s.',
    options: ['(1) 20√2', '(2) 40', '(3) 40√2', '(4) 20√3'],
    answer: '(1) 20√2',
    solution: `The horizontal component of velocity never changes during a projectile's flight - that is the only fact needed here.

At launch:   v_x = u cos60° = u/2
Later, where the velocity makes 45° with the horizontal and the speed is 20 m/s:
v_x = 20 cos45° = 20/√2 = 10√2 m/s

Set the two equal, because they are the same horizontal component:
u/2 = 10√2
u = 20√2 m/s ≈ 28.3 m/s

The direction of motion has turned from 60° to 45° because v_y has been shrinking under gravity while v_x stayed put.`,
  },
];
