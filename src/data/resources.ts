export interface Worksheet {
  label: string;
  url: string;
}

export interface ChapterResources {
  slug: string;
  num: string;
  title: string;          // rendered directly before titleAccent - include any needed trailing space
  titleAccent: string;    // part of the title rendered in accent colour
  notes?: { label: string; url: string };
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
    slug: 'kinematics',
    num: '02',
    title: 'Kine',
    titleAccent: 'matics',
    notes: { label: 'Class Notes', url: '/downloads/kinematics/notes.pdf' },
    worksheets: [
      { label: 'Worksheet 1', url: '/downloads/kinematics/worksheet-1.pdf' },
      { label: 'Worksheet 2', url: '/downloads/kinematics/worksheet-2.pdf' },
    ],
  },
];
