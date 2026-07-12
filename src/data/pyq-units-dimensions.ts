/* Units & Dimensions - JEE Main PYQ Bank (topic-wise).
   Sources: MathonGo / ExamSIDE chapter-wise banks for JEE Main 2025 (Jan &
   April) and JEE Main 2026 (January). 32 questions across 8 sub-topics.
   Answers + solutions live here but stay hidden in the UI until the student
   clicks "Check answer" so they solve first, then verify.                  */

export interface MatchTable {
  left: string[];   // List-I rows, e.g. "A. Coefficient of viscosity"
  right: string[];  // List-II rows, e.g. "I. [ML⁻¹T⁻¹]"
}

export interface PYQ {
  id: string;          // "1.1"
  sec: string;         // section key "1".."8"
  source: string;      // original paper / shift
  q: string;           // question stem
  table?: MatchTable;  // optional match-the-list table
  options?: string[];  // MCQ options; omit for integer/numeric answers
  answer: string;      // "(1)", "1", "1.54 mm", ...
  solution: string;    // worked solution (line breaks preserved in UI)
}

export const SECTIONS: Record<string, string> = {
  '1': 'Significant Figures & Measurement Rules',
  '2': 'Dimensional Formulas · Mechanics',
  '3': 'Dimensional Formulas · Thermal Physics',
  '4': 'Dimensional Formulas · Electromagnetism',
  '5': 'Dimensional Formulas · Gravitation',
  '6': 'Equation-Based Dimensional Analysis',
  '7': 'Modern Physics · Dimensional Reasoning',
  '8': 'Screw Gauge & Vernier Callipers',
};

export const PYQS: PYQ[] = [
  /* ─── 1 · Significant Figures & Measurement Rules ─── */
  {
    id: '1.1', sec: '1', source: 'JEE Main 2026 (21 January Shift 2)',
    q: 'Keeping the significant figures in view, the sum of the physical quantities 52.01 m, 153.2 m and 0.123 m is:',
    options: ['(1) 205.3 m', '(2) 205.333 m', '(3) 205.33 m', '(4) 205 m'],
    answer: '(1)',
    solution: `When adding measurements, the result must be limited to the least number of decimal places among all quantities.

The measurements are: 52.01 m (2 decimal places), 153.2 m (1 decimal place), and 0.123 m (3 decimal places). The limiting factor is 1 decimal place.

Sum: 52.01 + 153.2 + 0.123 = 205.333 m.
Rounded to 1 decimal place → 205.3 m, option (1).`,
  },
  {
    id: '1.2', sec: '1', source: 'JEE Main 2025 (April)',
    q: 'A person measures the mass of 3 different particles as 435.42 g, 226.3 g and 0.125 g. According to the rules for arithmetic operations with significant figures, the addition of the masses of the 3 particles will be:',
    options: ['(1) 661.845 g', '(2) 662 g', '(3) 661.8 g', '(4) 661.84 g'],
    answer: '(3)',
    solution: `m₁ + m₂ + m₃ = 435.42 + 226.3 + 0.125 = 661.845 g.

The limiting decimal place is 1 (from 226.3), so the answer must be rounded to 1 decimal place → 661.8 g.`,
  },

  /* ─── 2 · Dimensional Formulas · Mechanics ─── */
  {
    id: '2.1', sec: '2', source: 'JEE Main 2026 (28 January Shift 2)',
    q: 'Match List-I with List-II and choose the correct answer.',
    table: {
      left: ['A. Coefficient of viscosity', 'B. Surface tension', 'C. Pressure', 'D. Surface energy'],
      right: ['I. [ML⁻¹T⁻¹]', 'II. [ML⁰T⁻²]', 'III. [ML⁻¹T⁻²]', 'IV. [ML²T⁻²]'],
    },
    options: ['(1) A-IV, B-III, C-I, D-II', '(2) A-IV, B-I, C-II, D-III', '(3) A-I, B-II, C-IV, D-III', '(4) A-I, B-III, C-II, D-IV'],
    answer: '(1)',
    solution: `(A) η = F·dr / (A·dv) = [MLT⁻²][L] / ([L²][LT⁻¹]) = [ML⁻¹T⁻¹] → IV
(B) S = F/L = [MLT⁻²]/[L] = [MT⁻²] = [ML⁰T⁻²] → III
(C) P = F/A = [MLT⁻²]/[L²] = [ML⁻¹T⁻²] → I
(D) E = S × A = [MT⁻²][L²] = [ML²T⁻²] → II

Hence A-IV, B-III, C-I, D-II.`,
  },
  {
    id: '2.2', sec: '2', source: 'JEE Main 2025 (January)',
    q: 'The pair of physical quantities NOT having the same dimensions is:',
    options: ["(1) Pressure and Young's modulus", '(2) Surface tension and impulse', '(3) Torque and energy', "(4) Angular momentum and Planck's constant"],
    answer: '(2)',
    solution: `[Angular momentum] = ML²T⁻¹ = [Planck's constant]
[Torque] = ML²T⁻² = [Energy]
[Pressure] = ML⁻¹T⁻² = [Young's modulus]
[Surface tension] = MT⁻², [Impulse] = MLT⁻¹

Surface tension and impulse do not match → (2).`,
  },
  {
    id: '2.3', sec: '2', source: 'JEE Main 2025 (January)',
    q: 'Match List-I with List-II. (Table reconstructed from the worked solution.)',
    table: {
      left: ['(A) Angular impulse', '(B) Latent heat', '(C) Electrical resistivity', '(D) Electromotive force'],
      right: ['(I) [M⁰L²T⁻²]', '(II) [ML²T⁻³A⁻¹]', '(III) [ML²T⁻¹]', '(IV) [ML³T⁻³A⁻²]'],
    },
    options: ['(1) A-II, B-I, C-IV, D-III', '(2) A-I, B-III, C-IV, D-II', '(3) A-III, B-I, C-II, D-IV', '(4) A-III, B-I, C-IV, D-II'],
    answer: '(4)',
    solution: `[Angular impulse] = [ML²T⁻¹] → III
[Latent heat] = [M⁰L²T⁻²] → I
[Electrical resistivity] = [ML³T⁻³A⁻²] → IV
[Electromotive force] = [ML²T⁻³A⁻¹] → II

Matching: A-III, B-I, C-IV, D-II.`,
  },
  {
    id: '2.4', sec: '2', source: 'JEE Main 2025 (January)',
    q: 'Match List-I with List-II. (Table reconstructed from the worked solution.)',
    table: {
      left: ["(A) Young's Modulus (Y)", '(B) Torque (τ)', '(C) Coefficient of Viscosity (η)', '(D) Gravitational Constant (G)'],
      right: ['(I) [ML⁻¹T⁻¹]', '(II) [ML⁻¹T⁻²]', '(III) [M⁻¹L³T⁻²]', '(IV) [ML²T⁻²]'],
    },
    options: ['(1) A-I, B-III, C-II, D-IV', '(2) A-IV, B-II, C-III, D-I', '(3) A-II, B-IV, C-I, D-III', '(4) A-II, B-I, C-IV, D-III'],
    answer: '(3)',
    solution: `(A) [Y] = F/(A·strain) = MLT⁻²/L² = ML⁻¹T⁻² → II
(B) τ = r × F = L × MLT⁻² = ML²T⁻² → IV
(C) η → Pa·s = MLT⁻²/L² × T = ML⁻¹T⁻¹ → I
(D) [G] = F·r²/(m₁m₂) = MLT⁻²·L²/M² = M⁻¹L³T⁻² → III

Matching: A-II, B-IV, C-I, D-III.`,
  },
  {
    id: '2.5', sec: '2', source: 'JEE Main 2025 (April)',
    q: 'Match List-I with List-II and choose the correct answer.',
    table: {
      left: ['(A) Coefficient of viscosity', '(B) Intensity of wave', '(C) Pressure gradient', '(D) Compressibility'],
      right: ['(I) [ML⁰T⁻³]', '(II) [ML⁻²T⁻²]', '(III) [M⁻¹LT²]', '(IV) [ML⁻¹T⁻¹]'],
    },
    options: ['(1) A-I, B-IV, C-III, D-II', '(2) A-IV, B-I, C-II, D-III', '(3) A-IV, B-II, C-I, D-III', '(4) A-II, B-III, C-IV, D-I'],
    answer: '(2)',
    solution: `(A) [η] = [ML⁻¹T⁻¹] → IV
(B) [I] = [ML⁰T⁻³] → I
(C) Pressure gradient = [ML⁻²T⁻²] → II
(D) [K] = [M⁻¹LT²] → III

Matching: A-IV, B-I, C-II, D-III.`,
  },
  {
    id: '2.6', sec: '2', source: 'JEE Main 2025 (April)',
    q: 'Match List-I with List-II and choose the correct answer.',
    table: {
      left: ['(A) Mass density', '(B) Impulse', '(C) Power', '(D) Moment of inertia'],
      right: ['(I) [ML²T⁻³]', '(II) [MLT⁻¹]', '(III) [ML²T⁰]', '(IV) [ML⁻³T⁰]'],
    },
    options: ['(1) A-IV, B-II, C-III, D-I', '(2) A-I, B-III, C-IV, D-II', '(3) A-IV, B-II, C-I, D-III', '(4) A-II, B-III, C-IV, D-I'],
    answer: '(3)',
    solution: `(A) Mass density = M/V = ML⁻³ → IV
(B) Impulse = M·u = MLT⁻¹ → II
(C) Power = F·v = ML²T⁻³ → I
(D) Moment of inertia = Mr² = ML² → III

Matching: A-IV, B-II, C-I, D-III.`,
  },

  /* ─── 3 · Dimensional Formulas · Thermal Physics ─── */
  {
    id: '3.1', sec: '3', source: 'JEE Main 2026 (22 January Shift 1)',
    q: 'Match List-I with List-II and choose the correct answer.',
    table: {
      left: ['A. Spring constant', 'B. Thermal conductivity', 'C. Boltzmann constant', 'D. Inductive reactance'],
      right: ['I. ML²T⁻²K⁻¹', 'II. ML⁰T⁻²', 'III. ML²T⁻³A⁻²', 'IV. MLT⁻³K⁻¹'],
    },
    options: ['(1) A-II, B-IV, C-I, D-III', '(2) A-I, B-IV, C-II, D-III', '(3) A-II, B-I, C-IV, D-III', '(4) A-III, B-II, C-IV, D-I'],
    answer: '(1)',
    solution: `A. F = kx ⇒ [k] = MLT⁻²/L = ML⁰T⁻² → II
B. Q/t = KA(dT/dx) ⇒ [K] = MLT⁻³K⁻¹ → IV
C. E = k_B·T ⇒ [k_B] = ML²T⁻²K⁻¹ → I
D. Inductive reactance = resistance = ML²T⁻³A⁻² → III

Matching: A-II, B-IV, C-I, D-III.`,
  },
  {
    id: '3.2', sec: '3', source: 'JEE Main 2025 (April)',
    q: 'Match List-I with List-II and choose the correct answer.',
    table: {
      left: ['(A) Heat capacity of body', '(B) Specific heat capacity', '(C) Latent heat', '(D) Thermal conductivity'],
      right: ['(I) Jkg⁻¹', '(II) JK⁻¹', '(III) Jkg⁻¹K⁻¹', '(IV) Jm⁻¹K⁻¹s⁻¹'],
    },
    options: ['(1) A-III, B-I, C-II, D-IV', '(2) A-IV, B-III, C-II, D-I', '(3) A-III, B-IV, C-I, D-II', '(4) A-II, B-III, C-I, D-IV'],
    answer: '(4)',
    solution: `Heat capacity = ΔQ/ΔT = JK⁻¹ → II
Specific heat = ΔQ/(mΔT) = Jkg⁻¹K⁻¹ → III
Latent heat = ΔQ/m = Jkg⁻¹ → I
Thermal conductivity = Jm⁻¹K⁻¹s⁻¹ → IV

Matching: A-II, B-III, C-I, D-IV.`,
  },
  {
    id: '3.3', sec: '3', source: 'JEE Main 2025 (April)',
    q: 'Match List-I with List-II. (Table reconstructed from the worked solution.)',
    table: {
      left: ['A. Gas constant (PV = NkT)', 'B. Coefficient of viscosity', "C. Planck's constant", 'D. Thermal conductivity'],
      right: ['I. [ML²T⁻¹]', 'II. [MLT⁻³K⁻¹]', 'III. [ML²T⁻²K⁻¹]', 'IV. [ML⁻¹T⁻¹]'],
    },
    options: ['(1) A-III, B-IV, C-I, D-II', '(2) A-II, B-III, C-IV, D-I', '(3) A-III, B-II, C-I, D-IV', '(4) A-III, B-IV, C-II, D-I'],
    answer: '(1)',
    solution: `A. [k] = PV/NT = ML²T⁻²K⁻¹ → III
B. [η] = F/(6πrv) = ML⁻¹T⁻¹ → IV
C. [h] = E/f = ML²T⁻¹ → I
D. [k] = MLT⁻³K⁻¹ → II

Matching: A-III, B-IV, C-I, D-II.`,
  },

  /* ─── 4 · Dimensional Formulas · Electromagnetism ─── */
  {
    id: '4.1', sec: '4', source: 'JEE Main 2026 (22 January Shift 2)',
    q: 'If ε, E and t represent the free-space permittivity, electric field and time respectively, then the unit of εE/t is:',
    options: ['(1) Am²', '(2) Am', '(3) A/m²', '(4) A/m'],
    answer: '(3)',
    solution: `εE/t has the dimensions of displacement current density J_d = ε(∂E/∂t).

Current density J = I/A → unit A/m².

Dimensionally: [ε] = M⁻¹L⁻³T⁴A², [E] = MLT⁻³A⁻¹, [t] = T.
[εE/t] = (M⁻¹L⁻³T⁴A²)(MLT⁻³A⁻¹)/T = L⁻²A → A/m².`,
  },
  {
    id: '4.2', sec: '4', source: 'JEE Main 2026 (24 January Shift 1)',
    q: 'Match List-I with List-II and choose the correct answer.',
    table: {
      left: ['A. Magnetic induction', 'B. Magnetic flux', 'C. Magnetic permeability', 'D. Self inductance'],
      right: ['I. MLT⁻²A⁻²', 'II. ML²T⁻²A⁻²', 'III. ML⁰T⁻²A⁻¹', 'IV. ML²T⁻²A⁻¹'],
    },
    options: ['(1) A-III, B-IV, C-II, D-I', '(2) A-III, B-IV, C-I, D-II', '(3) A-IV, B-III, C-I, D-II', '(4) A-I, B-III, C-IV, D-II'],
    answer: '(2)',
    solution: `A. F = qvB ⇒ [B] = MT⁻²A⁻¹ → III
B. Φ = BA ⇒ [Φ] = ML²T⁻²A⁻¹ → IV
C. B = μH ⇒ [μ] = MLT⁻²A⁻² → I
D. ε = L(dI/dt) ⇒ [L] = ML²T⁻²A⁻² → II

Matching: A-III, B-IV, C-I, D-II.`,
  },
  {
    id: '4.3', sec: '4', source: 'JEE Main 2025 (January)',
    q: 'Match List-I with List-II (physical quantity with its SI unit).',
    table: {
      left: ['(A) Magnetic induction', '(B) Magnetic intensity', '(C) Magnetic flux', '(D) Magnetic moment'],
      right: ['(I) Ampere metre²', '(II) Weber', '(III) Gauss', '(IV) Ampere/metre'],
    },
    options: ['(1) A-I, B-II, C-III, D-IV', '(2) A-III, B-IV, C-I, D-II', '(3) A-III, B-II, C-I, D-IV', '(4) A-III, B-IV, C-II, D-I'],
    answer: '(4)',
    solution: `(A) Magnetic induction → Gauss (III)
(B) Magnetic intensity H = B/μ → Ampere/metre (IV)
(C) Magnetic flux → Weber (II)
(D) Magnetic moment M = i·A → Ampere-metre² (I)

Matching: A-III, B-IV, C-II, D-I.`,
  },
  {
    id: '4.4', sec: '4', source: 'JEE Main 2025 (January)',
    q: 'If B is the magnetic field and μ₀ is the permeability of free space, then the dimensions of (B/μ₀) are:',
    options: ['(1) ML²T⁻²A⁻¹', '(2) MT⁻²A⁻¹', '(3) L⁻¹A', '(4) LT⁻²A⁻¹'],
    answer: '(3)',
    solution: `For a current-carrying loop at the centre B = μ₀i/2R.
∴ B/μ₀ ≡ i/R ≡ [AL⁻¹] = L⁻¹A.`,
  },
  {
    id: '4.5', sec: '4', source: 'JEE Main 2025 (January)',
    q: 'Match List-I with List-II and choose the correct answer.',
    table: {
      left: ['(A) Permeability of free space', '(B) Magnetic field', '(C) Magnetic moment', '(D) Torsional constant'],
      right: ['(I) [ML²T⁻²]', '(II) [MT⁻²A⁻¹]', '(III) [MLT⁻²A⁻²]', '(IV) [L²A]'],
    },
    options: ['(1) A-IV, B-III, C-I, D-II', '(2) A-III, B-II, C-IV, D-I', '(3) A-I, B-IV, C-II, D-III', '(4) A-II, B-I, C-III, D-IV'],
    answer: '(2)',
    solution: `(A) μ₀ ≡ Fr/(qvi) = MLT⁻²A⁻² → III
(B) B ≡ F/(qV) = MT⁻²A⁻¹ → II
(C) M = iA ≡ AL² → IV
(D) τ = Cθ ⇒ C ≡ ML²T⁻² → I

Matching: A-III, B-II, C-IV, D-I.`,
  },
  {
    id: '4.6', sec: '4', source: 'JEE Main 2025 (April)',
    q: 'If μ₀ and ε₀ are the permeability and permittivity of free space respectively, then the dimension of (1/μ₀ε₀) is:',
    options: ['(1) L/T²', '(2) L²/T²', '(3) T²/L', '(4) T²/L²'],
    answer: '(2)',
    solution: `c = 1/√(μ₀ε₀) ⇒ 1/(μ₀ε₀) = c² = L²T⁻² = L²/T².`,
  },
  {
    id: '4.7', sec: '4', source: 'JEE Main 2025 (April)',
    q: 'If ε₀ denotes the permittivity of free space and Φ_E is the flux of the electric field through the area bounded by a closed surface, then the dimensions of (ε₀ · dΦ_E/dt) are those of:',
    options: ['(1) Electric field', '(2) Electric potential', '(3) Electric charge', '(4) Electric current'],
    answer: '(4)',
    solution: `Displacement current i_d = ε₀ (dΦ_E/dt).
This has the dimension of electric current.`,
  },
  {
    id: '4.8', sec: '4', source: 'JEE Main 2025 (April)',
    q: 'Given a charge q, current I and permeability of vacuum μ₀. Which of the following quantities has the dimension of momentum?',
    options: ['(1) qI/μ₀', '(2) qμ₀I', '(3) q²μ₀I', '(4) qμ₀/I'],
    answer: '(2)',
    solution: `Q = AT, I = A, μ₀ = MLT⁻²A⁻².
Set P = Qˣμ₀ʸIᶻ and match to MLT⁻¹:
MLT⁻¹ = Mʸ Lʸ T^(x−2y) A^(x−2y+z).
Solving: y = 1, x − 2y = −1, x − 2y + z = 0 → x = y = z = 1.
∴ momentum ∝ qμ₀I.`,
  },
  {
    id: '4.9', sec: '4', source: 'JEE Main 2025 (April)',
    q: 'In an electromagnetic system, the ratio of electric flux to magnetic flux has dimensions of the form M^P L^Q T^R A^S. The values of Q (power of L) and R (power of T) are:',
    options: ['(1) (3, −5)', '(2) (−2, 2)', '(3) (−2, 1)', '(4) (1, −1)'],
    answer: '(4)',
    solution: `Φ_E/Φ_M = EA/BA = E/B.
Since E = cB, [E/B] = LT⁻¹ = M⁰L¹T⁻¹A⁰.
So Q (power of L) = 1 and R (power of T) = −1 → (1, −1).`,
  },
  {
    id: '4.10', sec: '4', source: 'JEE Main 2025 (April)',
    q: 'In an electromagnetic system, the ratio of electric dipole moment to magnetic dipole moment has dimensions [MᴾL⁰TᴿAˢ]. The values of P and R are:',
    options: ['(1) −1, 0', '(2) −1, 1', '(3) 1, −1', '(4) 0, −1'],
    answer: '(4)',
    solution: `Electric dipole moment p = q·2l = [LTA].
Magnetic dipole moment M = IA = [L²A].
[p/M] = [LTA]/[L²A] = L⁻¹T = M⁰L⁻¹T¹A⁰.
∴ P = 0, R = −1.`,
  },
  {
    id: '4.11', sec: '4', source: 'JEE Main 2025 (April)',
    q: 'The dimension of √(μ₀/ε₀) is equal to that of (μ₀ = vacuum permeability, ε₀ = vacuum permittivity):',
    options: ['(1) Voltage', '(2) Capacitance', '(3) Inductance', '(4) Resistance'],
    answer: '(4)',
    solution: `L ∝ μ₀ and C ∝ ε₀, so μ₀/ε₀ ∝ L/C.
L/C = (τR)/(τ/R) = R² ⇒ √(μ₀/ε₀) ∝ √(L/C) = R → Resistance.`,
  },

  /* ─── 5 · Dimensional Formulas · Gravitation ─── */
  {
    id: '5.1', sec: '5', source: 'JEE Main 2025 (April)',
    q: 'Match List-I with List-II and choose the correct answer.',
    table: {
      left: ['A. Gravitational constant', 'B. Gravitational potential energy', 'C. Gravitational potential', 'D. Acceleration due to gravity'],
      right: ['I. [LT⁻²]', 'II. [L²T⁻²]', 'III. [ML²T⁻²]', 'IV. [M⁻¹L³T⁻²]'],
    },
    options: ['(1) A-IV, B-III, C-II, D-I', '(2) A-III, B-II, C-I, D-IV', '(3) A-II, B-IV, C-III, D-I', '(4) A-I, B-III, C-IV, D-II'],
    answer: '(1)',
    solution: `A. G = Fr²/m² = M⁻¹L³T⁻² → IV
B. PE = mgh = ML²T⁻² → III
C. V = GM/r = L²T⁻² → II
D. g = LT⁻² → I

Matching: A-IV, B-III, C-II, D-I.`,
  },

  /* ─── 6 · Equation-Based Dimensional Analysis ─── */
  {
    id: '6.1', sec: '6', source: 'JEE Main 2026 (23 January Shift 2)',
    q: 'A ball of radius r and density ρ dropped through a viscous liquid of density σ and viscosity η attains its terminal velocity at time t = Aρᵃrᵇηᶜσᵈ, where A is a constant and a, b, c, d are integers. The value of (b+c)/(a+d) is ____.',
    answer: '1',
    solution: `[T] = [ML⁻³]ᵃ[L]ᵇ[ML⁻¹T⁻¹]ᶜ[ML⁻³]ᵈ.
Powers: M: a+c+d = 0; T: −c = 1 ⇒ c = −1; so a+d = 1.
L: −3a+b−c−3d = 0 ⇒ b = 3(a+d)−1 = 2.
(b+c)/(a+d) = (2−1)/1 = 1.`,
  },
  {
    id: '6.2', sec: '6', source: 'JEE Main 2026 (21 January Shift 1)',
    q: 'Consider a modified Bernoulli equation (P + A/Bt²) + ρg(h + Bt) + ½ρV² = constant. If t has the dimension of time, then the dimensions of A and B respectively are:',
    options: ['(1) [ML⁰T⁻²] and [M⁰LT⁻²]', '(2) [ML⁰T⁻²] and [M⁰LT⁻¹]', '(3) [ML⁰T⁻¹] and [M⁰LT]', '(4) [ML⁰T⁻¹] and [M⁰LT⁻¹]'],
    answer: '(4)',
    solution: `Every term has the dimension of pressure [ML⁻¹T⁻²].
From (h + Bt): [Bt] = [L] ⇒ [B] = LT⁻¹ = M⁰LT⁻¹.
From A/Bt²: [A] = [B][T²][ML⁻¹T⁻²] = (LT⁻¹)(T²)(ML⁻¹T⁻²) = ML⁰T⁻¹.
∴ [A] = ML⁰T⁻¹, [B] = M⁰LT⁻¹.`,
  },
  {
    id: '6.3', sec: '6', source: 'JEE Main 2025 (January)',
    q: 'Which one of the following is the correct dimensional formula for capacitance F? (M, L, T, C stand for mass, length, time and charge.)',
    options: ['(1) [C²M⁻¹L⁻²T²]', '(2) [C²M⁻²L²T²]', '(3) [CM⁻²L⁻²T⁻²]', '(4) [CM⁻¹L⁻²T²]'],
    answer: '(1)',
    solution: `Energy = Q²/(2C) ⇒ [C] = [Q²]/[Energy] = C²/(ML²T⁻²) = C²M⁻¹L⁻²T².`,
  },
  {
    id: '6.4', sec: '6', source: 'JEE Main 2025 (January)',
    q: 'The position of a particle on the x-axis is x(t) = A sin t + B cos²t + Ct² + D, where t is time. The dimension of ABC/D is:',
    options: ['(1) L²T⁻²', '(2) L²', '(3) L', '(4) L³T⁻²'],
    answer: '(1)',
    solution: `[x] = L, so [A] = L, [B] = L, [C] = LT⁻², [D] = L.
[ABC/D] = (L·L·LT⁻²)/L = L²T⁻².`,
  },
  {
    id: '6.5', sec: '6', source: 'JEE Main 2025 (January)',
    q: 'The electric flux is φ = ασ + βλ, where λ and σ are linear and surface charge density respectively. Then (α/β) represents:',
    options: ['(1) electric field', '(2) area', '(3) charge', '(4) displacement'],
    answer: '(4)',
    solution: `α ≡ φ/σ, β ≡ φ/λ ⇒ α/β ≡ λ/σ.
λ = charge/length, σ = charge/area ⇒ λ/σ = length = displacement.`,
  },
  {
    id: '6.6', sec: '6', source: 'JEE Main 2025 (January)',
    q: 'The modulus of elasticity per unit torque applied on a system has dimension [MᵃLᵇTᶜ]. If b = −3, the value of c is ____.',
    answer: '0',
    solution: `[Modulus of elasticity] = ML⁻¹T⁻², [Torque] = ML²T⁻².
Ratio = ML⁻¹T⁻² / ML²T⁻² = L⁻³ = M⁰L⁻³T⁰.
So a = 0, b = −3, c = 0.`,
  },
  {
    id: '6.7', sec: '6', source: 'JEE Main 2025 (January)',
    q: 'The variation of velocity v with time t is v = At² + Bt/(C+t). The dimension of ABC is:',
    options: ['(1) [M⁰L^(1/2)T⁻³]', '(2) [M⁰L²T⁻²]', '(3) [M⁰L^(1/2)T⁻²]', '(4) [M⁰L²T⁻³]'],
    answer: '(4)',
    solution: `[v] = LT⁻¹. [C] = [T].
[A] = LT⁻¹/T² = LT⁻³.
[B] = LT⁻¹ (since Bt/(C+t) has [v]).
[ABC] = (LT⁻³)(LT⁻¹)(T) = L²T⁻³.`,
  },
  {
    id: '6.8', sec: '6', source: 'JEE Main 2025 (April)',
    q: 'For a real gas (P + a/V²)(V − b) = RT, where P, V, T, R are pressure, volume, temperature and gas constant. The dimension of ab⁻² is equivalent to that of:',
    options: ["(1) Planck's constant", '(2) Compressibility', '(3) Strain', '(4) Energy density'],
    answer: '(4)',
    solution: `[a] = [P][V²] = ML⁻¹T⁻²·L⁶ = ML⁵T⁻².
[b] = [V] = L³.
[ab⁻²] = ML⁵T⁻²·L⁻⁶ = ML⁻¹T⁻² → energy density.`,
  },

  /* ─── 7 · Modern Physics · Dimensional Reasoning ─── */
  {
    id: '7.1', sec: '7', source: 'JEE Main 2025 (April)',
    q: "Statement (I): The dimensions of Planck's constant and angular momentum are the same. Statement (II): In Bohr's model electrons revolve only in orbits for which the angular momentum is an integral multiple of Planck's constant. Choose the most appropriate answer.",
    options: ['(1) Both Statement I and Statement II are correct', '(2) Statement I is incorrect but Statement II is correct', '(3) Statement I is correct but Statement II is incorrect', '(4) Both Statement I and Statement II are incorrect'],
    answer: '(3)',
    solution: `E = hf ⇒ [h] = ML²T⁻¹, and angular momentum L = mvr = ML²T⁻¹.
So Statement I is correct.
But L = nh/2π (integral multiple of h/2π, not h), so Statement II is incorrect.`,
  },

  /* ─── 8 · Screw Gauge & Vernier Callipers ─── */
  {
    id: '8.1', sec: '8', source: 'JEE Main 2026 (23 January Morning)',
    q: 'In a screw gauge, the zero of the circular scale lies 3 divisions above the horizontal pitch line when the studs are in contact. Using this instrument, if the pitch scale reading is 1 mm and the circular scale reading is 51, the correct thickness of the sheet is ____ mm. (Least count = 0.01 mm)',
    answer: '1.54 mm',
    solution: `Zero above the reference line with jaws closed → negative zero error.
Zero error = −3 × 0.01 = −0.03 mm.
Thickness = PSR + (CSR × LC) − zero error = 1 + (51 × 0.01) − (−0.03) = 1.54 mm.`,
  },
  {
    id: '8.2', sec: '8', source: 'JEE Main 2026 (24 January Evening)',
    q: 'In a vernier callipers, 50 vernier scale divisions equal 48 main scale divisions. If 1 main scale division = 0.05 mm, the least count of the vernier callipers is ____ mm.',
    answer: '0.002 mm',
    solution: `50 VSD = 48 × 0.05 = 2.4 mm ⇒ 1 VSD = 0.048 mm.
LC = 1 MSD − 1 VSD = 0.05 − 0.048 = 0.002 mm.`,
  },
  {
    id: '8.3', sec: '8', source: 'JEE Main 2026 (28 January Morning)',
    q: 'When both jaws of a vernier callipers touch, the zero of the vernier scale is to the right of the main scale zero and the 4th vernier mark coincides with a main scale mark. Measuring a cylinder, the observer reads 15 main scale divisions and the 5th vernier division coincides. The measured length is ____ mm. (LC = 0.1 mm)',
    answer: '15.1 mm',
    solution: `Vernier zero right of main zero with jaws closed → positive zero error = +4 × 0.1 = +0.4 mm.
Observed reading = 15 + (5 × 0.1) = 15.5 mm.
Corrected length = 15.5 − 0.4 = 15.1 mm.`,
  },
  {
    id: '8.4', sec: '8', source: 'JEE Main 2026 (5 April Morning)',
    q: 'In a vernier callipers, when both jaws touch, the zero of the vernier scale is shifted to the right of the main scale zero and the 7th vernier division coincides with a main scale reading. If 1 main scale division = 1 mm and there are 10 vernier scale divisions, then the callipers has:',
    answer: 'A positive zero error of 0.7 mm',
    solution: `LC = 1 MSD / 10 VSD = 1/10 = 0.1 mm.
Vernier zero shifted right of main zero → positive zero error = +7 × 0.1 = +0.7 mm.
(Subtract 0.7 mm from every reading to get the true value.)`,
  },
  {
    id: '8.5', sec: '8', source: 'JEE Main 2026 (4 April Morning)',
    q: 'In a screw gauge, five complete rotations of the circular scale move it linearly by 2.5 mm. If the circular scale has 100 divisions, the least count is ____ mm.',
    answer: '0.005 mm',
    solution: `Pitch = 2.5/5 = 0.5 mm.
LC = pitch / divisions = 0.5/100 = 0.005 mm.`,
  },
  {
    id: '8.6', sec: '8', source: 'JEE Main 2026 (2 April Evening)',
    q: 'In a screw gauge with 100 circular divisions and pitch 0.1 mm, the zero of the main scale coincides with the 5th circular division when the studs touch. Measuring a sphere, the main scale reads 5 mm and the 50th circular division coincides. The diameter is ____ mm.',
    answer: '5.045 mm',
    solution: `LC = 0.1/100 = 0.001 mm.
Circular scale reads +5 with jaws closed → positive zero error = +5 × 0.001 = +0.005 mm.
Observed = 5 + (50 × 0.001) = 5.05 mm.
Corrected diameter = 5.05 − 0.005 = 5.045 mm.`,
  },
  {
    id: '8.7', sec: '8', source: 'JEE Main 2025 (22 January Morning)',
    q: 'Statement I: In a vernier callipers, one vernier scale division is always smaller than one main scale division. Statement II: The vernier constant equals one main scale division multiplied by the number of vernier scale divisions. Choose the correct answer.',
    answer: 'Statement I is correct; Statement II is incorrect',
    solution: `Statement I is true by construction: N vernier divisions span (N−1) main divisions, so each vernier division is marginally smaller. This difference is what resolves fractions of a main division.

Statement II is false: vernier constant (least count) = 1 MSD − 1 VSD (the difference), not a product.`,
  },
  {
    id: '8.8', sec: '8', source: 'JEE Main 2025 (24 January Morning)',
    q: 'The least count of a screw gauge is 0.01 mm. If the pitch is increased by 75% and the number of divisions on the circular scale is reduced by 50%, the new least count is ____ × 10⁻³ mm.',
    answer: '35 × 10⁻³ mm',
    solution: `New LC = (1.75 × pitch)/(0.5 × divisions) = 3.5 × (pitch/divisions) = 3.5 × 0.01 = 0.035 mm = 35 × 10⁻³ mm.`,
  },
  {
    id: '8.9', sec: '8', source: 'JEE Main 2025 (4 April Evening)',
    q: 'A travelling microscope has a main scale of 300 divisions equal to 15 cm. The vernier scale has 25 divisions equal to 24 main scale divisions. The least count (in cm) is:',
    answer: '0.002 cm',
    solution: `1 MSD = 15/300 = 0.05 cm.
25 VSD = 24 MSD ⇒ 1 VSD = (24/25) × 0.05 = 0.048 cm.
LC = 1 MSD − 1 VSD = 0.05 − 0.048 = 0.002 cm.`,
  },
];
