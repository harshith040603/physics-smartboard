/* Kinematics Practice - 50 questions, easy to medium (Lectures 1-4).
   Sections: A Distance & Displacement · B Averaging Trap · C Instantaneous
   Velocity · D Momentarily at Rest · E Acceleration & Signs · F Equations
   of Motion · G nth Second.                                              */

export interface PracticeQ {
  sec: string;      // section key A..G
  q: string;
  a: string;
}

export const SECTIONS: Record<string, string> = {
  A: 'Distance & Displacement',
  B: 'The Averaging Trap',
  C: 'Instantaneous Velocity',
  D: 'Momentarily at Rest',
  E: 'Acceleration & Signs',
  F: 'Equations of Motion',
  G: 'nth Second',
};

export const PRACTICE: PracticeQ[] = [
  /* ── A · Distance, Displacement, Speed & Velocity ── */
  { sec: 'A', q: 'A man walks 3 km east, then 4 km north. Find the total distance travelled and the displacement.',
    a: 'Distance = 7 km. Displacement = √(3² + 4²) = 5 km (at 53° north of east).' },
  { sec: 'A', q: 'A body moves along a square track of side 10 m and completes 1.5 rounds. Find the distance covered and the displacement.',
    a: 'Distance = 1.5 × 40 = 60 m. After 1.5 rounds it is at the diagonally opposite corner: displacement = 10√2 ≈ 14.1 m.' },
  { sec: 'A', q: 'A car travels 40 km in 1 hour, then 60 km in 1.5 hours, in the same direction. Find its average speed and average velocity.',
    a: 'Total 100 km in 2.5 h → average speed = 40 km/h. Same direction, so average velocity = 40 km/h too.' },
  { sec: 'A', q: 'A man walks 8 km east in 2 hours, then 6 km west in 1 hour. Find his average speed and average velocity.',
    a: 'Speed = 14/3 ≈ 4.67 km/h. Displacement = 8 − 6 = 2 km east → velocity = 2/3 ≈ 0.67 km/h east.' },
  { sec: 'A', q: 'A body travels one-third of its total distance at 10 m/s and the remaining two-thirds at 15 m/s. Find the average speed.',
    a: 't = (d/3)/10 + (2d/3)/15 = d/30 + 2d/45 = 7d/90 → average speed = 90/7 ≈ 12.86 m/s.' },
  { sec: 'A', q: 'A particle covers 5 m in the first 2 seconds and 15 m in the next 2 seconds (same direction throughout). Find its average velocity over the full 4 seconds.',
    a: 'Displacement = 20 m in 4 s → average velocity = 5 m/s.' },
  { sec: 'A', q: 'A train travels 100 km north in 2 hours, then returns 100 km south in 2 hours along the same route. Find the average speed and average velocity for the whole trip.',
    a: 'Speed = 200/4 = 50 km/h. Displacement = 0 → average velocity = 0.' },
  { sec: 'A', q: 'A swimmer covers 500 m downstream in 5 minutes, then swims back 500 m upstream in 10 minutes. Find the average speed and average velocity for the whole trip.',
    a: 'Speed = 1000 m / 900 s ≈ 1.11 m/s. Back at the start → average velocity = 0.' },

  /* ── B · The Averaging Trap ── */
  { sec: 'B', q: 'A car covers the first half of a distance at 30 km/h and the second half at 60 km/h. Find the average speed.',
    a: 'Equal distances → harmonic mean: 2(30)(60)/(30+60) = 40 km/h.' },
  { sec: 'B', q: 'A car covers the first half of the TIME of its journey at 30 km/h and the second half at 60 km/h. Find the average speed.',
    a: 'Equal times → simple average: (30+60)/2 = 45 km/h.' },
  { sec: 'B', q: 'A cyclist covers half the distance of a journey at 12 km/h and the other half at 18 km/h. Find the average speed.',
    a: 'Equal distances → 2(12)(18)/(12+18) = 432/30 = 14.4 km/h.' },
  { sec: 'B', q: 'A train travels for half the total time at 50 km/h and the other half at 70 km/h. Find the average speed.',
    a: 'Equal times → (50+70)/2 = 60 km/h.' },
  { sec: 'B', q: 'A bus covers half the distance of a trip at 20 km/h and the other half at 80 km/h. Find the average speed.',
    a: 'Equal distances → 2(20)(80)/(20+80) = 3200/100 = 32 km/h.' },
  { sec: 'B', q: 'A car travels for half the total time at 20 km/h and the other half at 80 km/h. Find the average speed.',
    a: 'Equal times → (20+80)/2 = 50 km/h.' },

  /* ── C · Instantaneous Velocity ── */
  { sec: 'C', q: 'The position of a particle is x = 5t² + 3t (SI). Find its instantaneous velocity at t = 4 s.',
    a: 'v = dx/dt = 10t + 3 → at t = 4: v = 43 m/s.' },
  { sec: 'C', q: 'x = 2t³ − 4t (SI). Find the instantaneous velocity at t = 2 s.',
    a: 'v = 6t² − 4 → at t = 2: v = 24 − 4 = 20 m/s.' },
  { sec: 'C', q: 'x = t² − 6t + 5 (SI). Find the velocity at t = 0 s and at t = 3 s. Is the particle speeding up or slowing down between these times?',
    a: 'v = 2t − 6 → v(0) = −6 m/s, v(3) = 0. Speed drops from 6 to 0 → slowing down.' },
  { sec: 'C', q: 'A particle moves according to x = 4t³ (SI). Find its instantaneous speed at t = 1 s.',
    a: 'v = 12t² → at t = 1: 12 m/s. Speed = |v| = 12 m/s.' },
  { sec: 'C', q: 'For x = 3t² + 2 (SI), find the average velocity between t = 1 s and t = 3 s, and compare it with the instantaneous velocity at t = 2 s.',
    a: 'Average = (29 − 5)/2 = 12 m/s. Instantaneous v = 6t → v(2) = 12 m/s. Equal (x is quadratic, and t = 2 is the midpoint).' },
  { sec: 'C', q: 'x = 7t − t² (SI). Find the velocity at t = 2 s and at t = 5 s. At what time is the particle momentarily at rest?',
    a: 'v = 7 − 2t → v(2) = +3 m/s, v(5) = −3 m/s. At rest when v = 0 → t = 3.5 s.' },
  { sec: 'C', q: 'x = 5t² − 2t + 1 (SI). Find the instantaneous velocity at t = 3 s.',
    a: 'v = 10t − 2 → at t = 3: v = 28 m/s.' },
  { sec: 'C', q: 'x = t³ + 2t (SI). Find the average velocity from t = 0 to t = 2 s, and the instantaneous velocity at t = 1 s. Are they equal?',
    a: 'Average = (12 − 0)/2 = 6 m/s. v = 3t² + 2 → v(1) = 5 m/s. Not equal (x is cubic).' },

  /* ── D · Momentarily at Rest ── */
  { sec: 'D', q: 'x = t³ − 3t² (SI). Find v(t) and the instant(s) when the particle is momentarily at rest.',
    a: 'v = 3t² − 6t = 3t(t − 2) → at rest at t = 0 and t = 2 s.' },
  { sec: 'D', q: 'x = t³ − 12t (SI). Find the time(s) when the particle is momentarily at rest.',
    a: 'v = 3t² − 12 = 0 → t² = 4 → t = 2 s (positive root only).' },
  { sec: 'D', q: 'x = 2t³ − 9t² + 12t (SI). Find all instants when the particle is momentarily at rest.',
    a: 'v = 6t² − 18t + 12 = 6(t − 1)(t − 2) → t = 1 s and t = 2 s.' },
  { sec: 'D', q: "A ball's height is h = 20t − 5t² (SI). Find the time at which its velocity is zero.",
    a: 'v = 20 − 10t = 0 → t = 2 s (the top of the flight).' },
  { sec: 'D', q: 'x = t³ − 6t² + 9t (SI). Find the instant(s) when momentarily at rest.',
    a: 'v = 3t² − 12t + 9 = 3(t − 1)(t − 3) → t = 1 s and t = 3 s.' },
  { sec: 'D', q: 'x = t³ − 9t² + 24t (SI). Find the instant(s) when momentarily at rest.',
    a: 'v = 3t² − 18t + 24 = 3(t − 2)(t − 4) → t = 2 s and t = 4 s.' },

  /* ── E · Acceleration & Sign Conventions ── */
  { sec: 'E', q: 'A particle has velocity v = −8 m/s and acceleration a = −3 m/s². Is it speeding up or slowing down? Explain using signs.',
    a: 'v and a have the SAME sign (both negative) → speeding up (in the −x direction).' },
  { sec: 'E', q: 'A particle has v = +6 m/s and a = −4 m/s². Is it speeding up or slowing down?',
    a: 'Opposite signs → slowing down.' },
  { sec: 'E', q: 'A car moving at 200 km/h maintains a constant speed for 10 minutes. What is its acceleration? Explain why.',
    a: 'a = 0. Acceleration is about CHANGE in velocity, not about being fast - the velocity never changes.' },
  { sec: 'E', q: 'A particle has v = −5 m/s and a = +2 m/s². Is it speeding up or slowing down? What will eventually happen to its direction of motion?',
    a: 'Opposite signs → slowing down. It will momentarily stop, then reverse and move in the +x direction.' },
  { sec: 'E', q: 'A particle has v = +10 m/s and a = +5 m/s². Is it speeding up or slowing down?',
    a: 'Same signs → speeding up.' },
  { sec: 'E', q: 'A particle has v = 0 and a = −9.8 m/s² at a given instant. Is the particle accelerating? What will happen to it in the next instant?',
    a: 'Yes - a ≠ 0 even though v = 0 (like the top of a throw). Next instant it starts moving in the −ve direction.' },

  /* ── F · The Three Equations of Motion ── */
  { sec: 'F', q: 'A scooter accelerates uniformly from rest at 3 m/s² for 5 s. Find its final velocity and the distance covered.',
    a: 'v = 0 + 3(5) = 15 m/s. s = ½(3)(25) = 37.5 m.' },
  { sec: 'F', q: 'A car moving at 18 m/s decelerates uniformly and comes to rest after covering 81 m. Find the deceleration and the time taken.',
    a: 'v² = u² + 2as → 0 = 324 + 162a → a = −2 m/s². t = 18/2 = 9 s.' },
  { sec: 'F', q: 'A ball moves along a straight track with u = 12 m/s and uniform deceleration a = −2 m/s². Find its velocity at t = 3 s and the distance covered in that time.',
    a: 'v = 12 − 2(3) = 6 m/s. s = 12(3) − ½(2)(9) = 36 − 9 = 27 m.' },
  { sec: 'F', q: 'A bike accelerates uniformly from 5 m/s to 17 m/s in 6 s. Find the acceleration and the distance covered.',
    a: 'a = (17 − 5)/6 = 2 m/s². s = ((5 + 17)/2)(6) = 66 m.' },
  { sec: 'F', q: 'A train travels at 25 m/s for 10 s, then decelerates uniformly at 5 m/s² until it stops. Find the total distance covered during the entire motion.',
    a: 'Phase 1: 25 × 10 = 250 m. Phase 2: v² = u² + 2as → 0 = 625 − 10s → 62.5 m. Total = 312.5 m.' },
  { sec: 'F', q: 'A car starts from rest and accelerates uniformly at 4 m/s² for 6 s. Find its final velocity and the distance covered.',
    a: 'v = 4(6) = 24 m/s. s = ½(4)(36) = 72 m.' },
  { sec: 'F', q: 'A body has initial velocity 20 m/s and uniform deceleration 4 m/s². Find the time it takes to stop and the distance covered before stopping.',
    a: 't = 20/4 = 5 s. s = 20(5) − ½(4)(25) = 100 − 50 = 50 m.' },
  { sec: 'F', q: 'A particle has u = 10 m/s, v = 30 m/s, and uniform acceleration 4 m/s². Find the time taken and the distance covered.',
    a: 't = (30 − 10)/4 = 5 s. s = ((10 + 30)/2)(5) = 100 m.' },
  { sec: 'F', q: 'A car decelerates uniformly from 20 m/s to 5 m/s over 15 s. Find the deceleration and the distance covered.',
    a: 'a = (5 − 20)/15 = −1 m/s². s = ((20 + 5)/2)(15) = 187.5 m.' },
  { sec: 'F', q: 'A body starts with u = 6 m/s and uniform acceleration 2 m/s². Find its velocity and displacement after 4 s.',
    a: 'v = 6 + 2(4) = 14 m/s. s = 6(4) + ½(2)(16) = 24 + 16 = 40 m.' },

  /* ── G · Displacement in the nth Second ── */
  { sec: 'G', q: 'A body starts from rest with acceleration 4 m/s². Find (a) the distance covered in 4 seconds, and (b) the distance covered in the 4th second. State the units of each answer clearly.',
    a: '(a) s = ½(4)(16) = 32 m (whole journey). (b) s₄ₜₕ = 0 + (4/2)(7) = 14 m (one-second slice). Both in metres!' },
  { sec: 'G', q: 'A particle starts from rest with uniform acceleration 6 m/s². Find the displacement in the 3rd second.',
    a: 's₃ᵣ𝒹 = 0 + (6/2)(2×3 − 1) = 3(5) = 15 m.' },
  { sec: 'G', q: 'A car moving with uniform acceleration covers 10 m in the 3rd second and 16 m in the 5th second. Find its initial velocity and acceleration.',
    a: 'u + (a/2)(5) = 10 and u + (a/2)(9) = 16 → subtract: 2a = 6 → a = 3 m/s², u = 10 − 7.5 = 2.5 m/s.' },
  { sec: 'G', q: 'A body starts from rest with uniform acceleration 5 m/s². Find the ratio of distances covered in the 1st, 2nd, and 3rd seconds.',
    a: 'Slices go as (2n − 1): ratio = 1 : 3 : 5 regardless of a.' },
  { sec: 'G', q: 'A particle has u = 2 m/s and uniform acceleration 3 m/s². Find its displacement in the 4th second.',
    a: 's₄ₜₕ = 2 + (3/2)(7) = 2 + 10.5 = 12.5 m.' },
  { sec: 'G', q: 'A body starts from rest with uniform acceleration 8 m/s². Find the distance covered in the 5th second.',
    a: 's₅ₜₕ = 0 + (8/2)(9) = 36 m.' },
];
