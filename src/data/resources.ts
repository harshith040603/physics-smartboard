export interface Worksheet {
  label: string;
  url: string;
}

export const satPapers: Worksheet[] = [
  { label: 'Set A - Physics Test', url: '/downloads/sat-papers/set-a.pdf' },
  { label: 'Set B - Physics Test', url: '/downloads/sat-papers/set-b.pdf' },
];

export interface ChapterResources {
  slug: string;
  num: string;
  title: string;          // rendered directly before titleAccent - include any needed trailing space
  titleAccent: string;    // part of the title rendered in accent colour
  notes?: { label: string; url: string };
  sheets?: Worksheet[];   // formula / reference sheets, shown under the notes row
  worksheets: Worksheet[];
}

export const chapterResources: ChapterResources[] = [
  {
    slug: 'units-and-dimensions',
    num: '01',
    title: 'Units & ',
    titleAccent: 'Dimensions',
    notes: { label: 'Class Notes', url: '/downloads/units-and-dimensions/notes.pdf' },
    worksheets: [
      { label: 'Vernier Advanced Problems', url: '/downloads/units-and-dimensions/worksheet-1.pdf' },
      { label: 'Vernier & Screw Gauge Problems', url: '/downloads/units-and-dimensions/worksheet-2.pdf' },
      { label: 'Units & Dimensions Worksheet', url: '/downloads/units-and-dimensions/worksheet-3.pdf' },
    ],
  },
  {
    slug: 'matrices-and-determinants',
    num: '05',
    title: 'Matrices & ',
    titleAccent: 'Determinants',
    worksheets: [
      { label: 'Determinants - 55 Questions', url: '/downloads/matrices-and-determinants/worksheet-1.pdf' },
    ],
  },
  {
    slug: 'sequence-and-series',
    num: '04',
    title: 'Sequence & ',
    titleAccent: 'Series',
    worksheets: [
      { label: 'Sequence & Series - 100 Questions', url: '/downloads/sequence-and-series/worksheet-1.pdf' },
      { label: 'Sequence & Series - 67 Problems', url: '/downloads/sequence-and-series/worksheet-2.pdf' },
    ],
  },
  {
    slug: 'vectors',
    num: '03',
    title: 'Basic ',
    titleAccent: 'Math',
    worksheets: [
      { label: 'Vector Resultant', url: '/downloads/vectors/worksheet-2.pdf' },
      { label: 'Trigonometric Ratios', url: '/downloads/vectors/worksheet-3.pdf' },
      { label: 'Differentiation Practice Sheet 2', url: '/downloads/vectors/worksheet-4.pdf' },
      { label: 'Differentiation - Chain Rule', url: '/downloads/vectors/worksheet-5.pdf' },
    ],
  },
  {
    slug: 'kinematics',
    num: '02',
    title: 'Kine',
    titleAccent: 'matics',
    notes: { label: 'Class Notes', url: '/downloads/kinematics/kinematics%20till%20relative%20motion%20in%201D.pdf' },
    sheets: [
      { label: 'Projectile Motion Formula Sheet', url: '/downloads/kinematics/projectile-motion-formula-sheet.pdf' },
    ],
    worksheets: [
      { label: 'Practice 50 Questions', url: '/downloads/kinematics/worksheet-1.pdf' },
      { label: 'Combined Practice Sheet', url: '/downloads/kinematics/worksheet-2.pdf' },
      { label: 'Motion Graphs Worksheet', url: '/downloads/kinematics/worksheet-3.pdf' },
      { label: 'Motion Under Gravity Worksheet', url: '/downloads/kinematics/worksheet-4.pdf' },
      { label: 'Non-Uniform Acceleration Worksheet', url: '/downloads/kinematics/worksheet-5.pdf' },
      { label: 'JEE Advanced Practice Set II - 15 Questions', url: '/downloads/kinematics/practice-set-2.pdf' },
    ],
  },
  {
    slug: 'thermometry',
    num: '06',
    title: 'Thermo',
    titleAccent: 'metry',
    notes: { label: 'General Temperature Scale X - Notes', url: '/downloads/thermometry/general-temperature-scale-x.pdf' },
    sheets: [
      { label: 'Scale X - 12 Practice Questions', url: '/downloads/thermometry/scale-x-practice-questions.pdf' },
    ],
    worksheets: [],
  },
];
