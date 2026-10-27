import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const images = path.resolve("public/images");
async function build(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const source = path.join(directory, entry.name);
    if (source === path.join(images, "gallery")) continue;
    if (entry.isDirectory()) { await build(source); continue; }
    if (!/\.(jpe?g|png|webp|avif)$/i.test(entry.name) || /-poster\./i.test(entry.name)) continue;
    const relative = path.relative(images, source).replace(/\.[^/.]+$/, "");
    const sourceStat = await fs.stat(source);
    for (const width of [640, 1280]) {
      const target = path.join(images, "gallery", `${relative}-${width}.webp`);
      const previous = await fs.stat(target).catch(() => null);
      if (previous?.size && previous.mtimeMs >= sourceStat.mtimeMs) continue;
      await fs.mkdir(path.dirname(target), { recursive: true });
      await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 85 }).toFile(target);
    }
  }
}
await build(images);
console.log("Mobile gallery images ready.");
