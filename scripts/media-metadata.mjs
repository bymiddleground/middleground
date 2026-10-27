import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";

// MP4 track headers store display dimensions as 16.16 fixed-point numbers.
function videoSize(data, start = 0, end = data.length) {
  for (let offset = start; offset + 8 <= end;) {
    let size = data.readUInt32BE(offset);
    const type = data.toString("ascii", offset + 4, offset + 8);
    let header = 8;
    if (size === 1) { size = Number(data.readBigUInt64BE(offset + 8)); header = 16; }
    if (size === 0) size = end - offset;
    if (size < header || offset + size > end) throw new Error("Invalid MP4 box");
    const next = offset + size;
    if (type === "tkhd" && size >= 92) {
      const width = data.readUInt32BE(next - 8) / 65536;
      const height = data.readUInt32BE(next - 4) / 65536;
      if (width && height) {
        const rotated = data.readInt32BE(next - 40) !== 0 && data.readInt32BE(next - 32) !== 0;
        return rotated ? { width: height, height: width } : { width, height };
      }
    }
    if (type === "moov" || type === "trak") {
      const found = videoSize(data, offset + header, next);
      if (found) return found;
    }
    offset = next;
  }
}

const directory = new URL("../public/images/homepage/", import.meta.url);
const dimensions = {};
for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
  if (!entry.isFile()) continue;
  const file = entry.name;
  const url = new URL(file, directory);
  const data = await readFile(url);
  let size;
  if (file.endsWith(".mp4")) size = videoSize(data);
  else if (/\.(webp|png|jpe?g|avif)$/i.test(file)) size = await sharp(data).metadata();
  else continue;
  if (!size?.width || !size?.height) throw new Error(`Missing dimensions: ${file}`);
  dimensions[file] = {
    width: size.width,
    height: size.height,
    version: createHash("sha256").update(data).digest("hex").slice(0, 12),
  };
}
const output = new URL("../src/data/media-dimensions.json", import.meta.url);
await writeFile(output, JSON.stringify(dimensions, null, 2) + "\n");
console.log(`Read native dimensions for ${Object.keys(dimensions).length} media files.`);
