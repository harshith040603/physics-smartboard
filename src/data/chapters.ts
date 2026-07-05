export interface Chapter {
  slug: string;
  num: string;
  title: string;
  titleAccent: string;   // part of the title rendered in accent colour
  blurb: string;
  status: 'ready' | 'soon';
  activities?: number;
}

export const chapters: Chapter[] = [
  {
    slug: 'units-and-dimensions',
    num: '01',
    title: 'Units &',
    titleAccent: 'Dimensions',
    blurb: 'Sort quantities, build dimensional formulas, check equations, master vernier & screw gauge.',
    status: 'ready',
    activities: 19,
  },
  {
    slug: 'kinematics',
    num: '02',
    title: 'Kine',
    titleAccent: 'matics',
    blurb: 'Projectiles, motion graphs, relative motion — watch motion happen, then control it.',
    status: 'ready',
    activities: 7,
  },
  {
    slug: 'vectors',
    num: '03',
    title: 'Vec',
    titleAccent: 'tors',
    blurb: 'Resolve, add, and rotate vectors with your fingers.',
    status: 'soon',
  },
  {
    slug: 'laws-of-motion',
    num: '04',
    title: 'Laws of',
    titleAccent: 'Motion',
    blurb: 'Forces, friction, and real physics-engine collisions.',
    status: 'soon',
  },
];
