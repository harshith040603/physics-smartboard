export interface Chapter {
  slug: string;
  num: string;
  title: string;          // rendered directly before titleAccent - include any needed trailing space
  titleAccent: string;    // part of the title rendered in accent colour
  blurb: string;
  status: 'ready' | 'soon';
  activities?: number;
}

export const chapters: Chapter[] = [
  {
    slug: 'units-and-dimensions',
    num: '01',
    title: 'Units & ',
    titleAccent: 'Dimensions',
    blurb: 'Sort quantities, build dimensional formulas, check equations, master vernier & screw gauge.',
    status: 'ready',
    activities: 18,
  },
  {
    slug: 'kinematics',
    num: '02',
    title: 'Kine',
    titleAccent: 'matics',
    blurb: 'Projectiles, motion graphs, relative motion - watch motion happen, then control it.',
    status: 'ready',
    activities: 5,
  },
  {
    slug: 'chemistry',
    num: '03',
    title: 'Chem',
    titleAccent: 'istry',
    blurb: 'Classification of elements - from how the periodic table was built to effective nuclear charge, shielding and atomic & ionic size trends.',
    status: 'ready',
    activities: 16,
  },
  {
    slug: 'thermometry',
    num: '04',
    title: 'Thermo',
    titleAccent: 'metry',
    blurb: 'There is no temperature sensor - only properties that change. Calibrate a scale, learn the one master formula, fix a faulty thermometer, then follow the gas thermometer down to absolute zero.',
    status: 'ready',
    activities: 13,
  },
];
