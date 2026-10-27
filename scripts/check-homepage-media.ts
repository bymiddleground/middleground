import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import manifest from "../src/data/homepage-media.json";
import artemisManifest from "../src/data/artemis-media.json";
import { tiles, flowTiles, galleryOnlyMedia, TITLE_BAND } from "../src/data/projects";
import { mixGalleryMedia } from "../src/lib/media-order";
import { mobileGalleryImage } from "../src/lib/gallery-images";

const selected = tiles.filter(tile => tile.title === manifest.project);
assert.equal(selected.length, manifest.grid.length, "Homepage must contain exactly the Grid selection");
assert.deepEqual(new Set(selected.map(tile => tile.media?.src)), new Set(manifest.grid.map(item => item.media.src)), "No previous or gallery-only Maison tiles may remain on the homepage");
assert.equal(galleryOnlyMedia.filter(item => item.title === manifest.project).length, manifest.gallery.length);
const all = [...manifest.grid, ...manifest.gallery];
assert.equal(new Set(all.map(item => item.media.src)).size, all.length, "Project gallery must not contain duplicate media");
for (const item of all) {
  assert(item.width > 0 && item.height > 0 && Math.abs(item.ratio - item.width / item.height) < 1e-9);
  assert(existsSync(join(process.cwd(), "public", item.media.src)), `Missing media: ${item.media.src}`);
  if (item.media.kind === "video") {
    assert(item.media.poster && existsSync(join(process.cwd(), "public", item.media.poster)), `Missing poster: ${item.media.src}`);
  } else {
    for (const width of [640, 1280] as const) assert(existsSync(join(process.cwd(), "public", mobileGalleryImage(item.media.src, width))), `Missing mobile image: ${item.media.src} (${width})`);
  }
}
for (const tile of selected) {
  const source = manifest.grid.find(item => item.media.src === tile.media?.src)!;
  assert(Math.abs(tile.rect.width / (tile.rect.height - TITLE_BAND) - source.ratio) < 1e-9, "Tile must preserve native media proportions");
}
for (const item of galleryOnlyMedia) assert(!selected.some(tile => tile.media?.src === item.media.src), "Gallery-only media leaked onto homepage");
assert.deepEqual(new Set(flowTiles.map(tile => tile.id)), new Set(tiles.map(tile => tile.id)), "Shuffling must preserve every tile exactly once");
assert.equal(flowTiles.length, tiles.length);
if (selected.length <= (tiles.length + 1) / 2) {
  for (let index = 1; index < flowTiles.length; index++) assert(!(flowTiles[index].title === manifest.project && flowTiles[index - 1].title === manifest.project), "Maison tiles must not appear consecutively in homepage column flow");
}
const mixed = mixGalleryMedia(all, `${manifest.project}:gallery-v2`);
assert.deepEqual(new Set(mixed.map(item => item.media.src)), new Set(all.map(item => item.media.src)));
const category = (item: typeof mixed[number]) => item.media.kind === "video" ? "video" : item.ratio >= 1 ? "landscape" : "portrait";
const categories = new Set(all.map(category));
assert.deepEqual(new Set(mixed.slice(0, categories.size).map(category)), categories, "Gallery should mix available media types from the start");
console.log(`Verified ${selected.length} Grid items, ${galleryOnlyMedia.length} gallery-only items, ${all.length} unique carousel items and all mobile assets.`);
assert.deepEqual(new Set(tiles.filter(tile => tile.title === artemisManifest.project).map(tile => tile.media?.src)), new Set(artemisManifest.grid.map(item => item.media.src)), "Only the curated Artemis selection may remain on the site");
for (const item of artemisManifest.grid) {
  const tile = flowTiles.find(tile => tile.media?.src === item.media.src);
  assert(tile && tile.title === artemisManifest.project, `New Artemis photo missing from homepage: ${item.sourceName}`);
  assert(existsSync(join(process.cwd(), "public", item.media.src)));
  assert(Math.abs(tile.rect.width / (tile.rect.height - TITLE_BAND) - item.ratio) < 1e-9);
  for (const width of [640, 1280] as const) assert(existsSync(join(process.cwd(), "public", mobileGalleryImage(item.media.src, width))));
}
console.log(`Verified ${artemisManifest.grid.length} imported Artemis photos and their mobile variants.`);
