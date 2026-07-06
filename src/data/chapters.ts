export interface Chapter {
  slug: string;
  num: string;
  title: string;          // rendered directly before titleAccent — include any needed trailing space
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
    blurb: 'Projectiles, motion graphs, relative motion — watch motion happen, then control it.',
    status: 'ready',
    activities: 9,
  },
];
