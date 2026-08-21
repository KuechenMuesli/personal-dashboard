/** Ein SVG-Kindelement eines Lucide-Icons: [Tag, Attribute]. */
export type IconNodeChild = [string, Record<string, string | number>];

/** Die vollstaendige Pfadbeschreibung eines Icons. */
export type IconNode = IconNodeChild[];
