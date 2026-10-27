import manifest from "./homepage-media.json";
import type { TileMedia } from "./projects";

const artwork = (item: (typeof manifest.grid)[number]) => ({
  media: item.media as TileMedia,
  title: item.title,
  note: item.note,
  alt: item.alt,
  ratio: item.ratio,
});

/** Grid appears on the homepage and in the carousel. Gallery stays inside it. */
export const maisonGrid = manifest.grid.map(artwork);
export const maisonGallery = manifest.gallery.map(artwork);
