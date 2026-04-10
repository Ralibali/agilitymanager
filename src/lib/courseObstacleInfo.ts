// Obstacle info data for tooltips and course validation

export const OBSTACLE_INFO: Record<string, {
  description: string;
  dimensions: string;
  classes: string;
}> = {
  jump: {
    description: 'Hopphinder med bom',
    dimensions: '1,2m bred',
    classes: 'Alla klasser',
  },
  long_jump: {
    description: 'Längdhopp med flera brädor',
    dimensions: '1,2m × 0,6m',
    classes: 'Ej i Nollklass',
  },
  oxer: {
    description: 'Dubbelhopp med två bommar',
    dimensions: '1,2m × 0,5m',
    classes: 'K2, K3',
  },
  wall: {
    description: 'Murhopp med utbytbara skivor',
    dimensions: '1,2m × 0,5m',
    classes: 'Alla klasser',
  },
  tunnel: {
    description: 'Böjbar tunnel',
    dimensions: '4m eller 6m, Ø 0,6m',
    classes: 'Alla klasser',
  },
  a_frame: {
    description: 'A-hinder med kontaktzoner',
    dimensions: '1,9m × 2,7m',
    classes: 'Ej i hoppklass',
  },
  dog_walk: {
    description: 'Brygga med kontaktzoner',
    dimensions: '3,6m × 0,3m',
    classes: 'Ej i hoppklass',
  },
  seesaw: {
    description: 'Vippbräda med kontaktzoner',
    dimensions: '3,6m × 0,3m',
    classes: 'Ej i hoppklass',
  },
  balance: {
    description: 'Balansbom',
    dimensions: '4m × 0,3m',
    classes: 'Ej i hoppklass',
  },
  weave: {
    description: 'Slalom med 12 pinnar',
    dimensions: '6,6m | 12 pinnar',
    classes: 'Alla klasser',
  },
  tire: {
    description: 'Däckhinder',
    dimensions: 'Ø 0,6m',
    classes: 'Alla klasser',
  },
  start: {
    description: 'Startlinje',
    dimensions: '1,2m',
    classes: 'Alla klasser',
  },
  finish: {
    description: 'Mållinje',
    dimensions: '1,2m',
    classes: 'Alla klasser',
  },
  // ═══ Hoopers obstacles ═══
  hoop: {
    description: 'Båge – hunden springer igenom',
    dimensions: '88 cm bred, ~80 cm genomlopp',
    classes: 'Alla klasser (Hoopers)',
  },
  hoopers_tunnel: {
    description: 'Bottenlös tunnel – hunden springer igenom',
    dimensions: 'Ø 80 cm, 100 cm lång',
    classes: 'Alla klasser (Hoopers)',
  },
  barrel: {
    description: 'Tunna – hunden springer runt',
    dimensions: 'Ø ~60 cm, ~90 cm hög',
    classes: 'Alla klasser (Hoopers)',
  },
  gate: {
    description: 'Staket – hunden passerar bakom',
    dimensions: '100–120 cm bred, 60–80 cm hög',
    classes: 'Alla klasser (Hoopers)',
  },
  handler_zone: {
    description: 'Dirigeringsområde – förarens zon',
    dimensions: 'Variabel storlek',
    classes: 'Alla klasser (Hoopers)',
  },
};

// Contact obstacles - used for counting
export const CONTACT_TYPES = ['a_frame', 'dog_walk', 'seesaw', 'balance'];

// Minimum distances between certain obstacle types (in meters)
export const MIN_DISTANCES: { types: [string, string]; minMeters: number; label: string }[] = [
  { types: ['a_frame', 'seesaw'], minMeters: 5, label: 'A-hinder och Vipp' },
  { types: ['a_frame', 'dog_walk'], minMeters: 5, label: 'A-hinder och Brygga' },
  { types: ['dog_walk', 'seesaw'], minMeters: 5, label: 'Brygga och Vipp' },
  { types: ['a_frame', 'a_frame'], minMeters: 5, label: 'Två A-hinder' },
];

// Hoopers minimum distances
export const HOOPERS_MIN_DISTANCES: { types: [string, string]; minMeters: number; label: string }[] = [
  { types: ['hoop', 'hoop'], minMeters: 5, label: 'Två hoops' },
  { types: ['hoop', 'hoopers_tunnel'], minMeters: 5, label: 'Hoop och Tunnel' },
  { types: ['hoop', 'barrel'], minMeters: 5, label: 'Hoop och Tunna' },
  { types: ['barrel', 'barrel'], minMeters: 5, label: 'Två tunnor' },
];
