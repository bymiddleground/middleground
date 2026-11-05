import manifest from "./homepage-media.json";
import artemisManifest from "./artemis-media.json";
import otherPracticeManifest from "./other-practice-media.json";
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
export const artemisGrid = artemisManifest.grid.map(artwork);
export const artemisGallery = artemisManifest.gallery.map(artwork);

export const otherPracticeGrid = otherPracticeManifest.grid.map(artwork);
export const otherPracticeGallery = otherPracticeManifest.gallery.map(artwork);
