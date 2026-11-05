import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const source = path.resolve('../Homepage Media/Photos/Other Practice');
const manifest = { project: 'Other Practice', grid: [], gallery: [] };
const excluded = new Set();
const descriptions = {
  'Other Practice 39.png': 'red textured 3D lettering on blue',
  'Other Practice 40.png': 'circular logo variations in orange and blue',
  'Other Practice 43.png': 'orange watch with an expressive typographic face',
  'Other Practice 48.png': 'social profile logo on a phone with a pastel background',
  'Other Practice 49.png': 'flowing red and orange typographic textures',
};
const entries = await fs.readdir(source, { withFileTypes: true });
const grouped = entries.some(entry => entry.isDirectory() && entry.name === 'Grid');
for (const scope of ['grid', 'gallery']) {
  const directory = grouped || scope === 'gallery' ? path.join(source, scope === 'grid' ? 'Grid' : 'Gallery') : source;
  const files = await fs.readdir(directory, { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT' && scope === 'gallery') return [];
    throw error;
  });
  for (const entry of files.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || entry.name.startsWith('.') || excluded.has(entry.name)) continue;
    if (!/\.(png|jpe?g|webp|avif)$/i.test(entry.name)) throw new Error(`Unsupported photo: ${entry.name}`);
    const data = await fs.readFile(path.join(directory, entry.name));
    const hash = createHash('sha256').update(data).digest('hex').slice(0, 10);
    const slug = entry.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `${slug}-${hash}.webp`;
    const target = path.resolve('public/images/homepage/other-practice', scope, filename);
    await fs.mkdir(path.dirname(target), { recursive: true });
    if (!(await fs.stat(target).catch(() => null))?.size) await sharp(data).rotate().resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 90, effort: 6 }).toFile(target);
    const { width, height } = await sharp(target).metadata();
    if (!width || !height) throw new Error(`Missing dimensions: ${entry.name}`);
    manifest[scope].push({ id: `other-practice-${scope}-${slug}`, sourceName: entry.name, media: { kind: 'image', src: `/images/homepage/other-practice/${scope}/${filename}` }, title: 'Other Practice', note: 'Brand Identity', alt: `Other Practice — ${descriptions[entry.name] || entry.name.replace(/\.[^.]+$/, '')}`, width, height, ratio: width / height });
    console.log(`${scope}: ${entry.name} → ${Math.round((await fs.stat(target)).size / 1000)} KB (${width} × ${height})`);
  }
}
await fs.writeFile('src/data/other-practice-media.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Imported ${manifest.grid.length} homepage photos and ${manifest.gallery.length} gallery-only photos.`);

// Remove generated assets for photos no longer selected in the source folder.
const selected = new Set([...manifest.grid, ...manifest.gallery].map(item => item.media.src));
for (const scope of ['grid', 'gallery']) {
  const directory = path.resolve('public/images/homepage/other-practice', scope);
  for (const name of await fs.readdir(directory).catch(() => [])) {
    if (!name.endsWith('.webp') || selected.has(`/images/homepage/other-practice/${scope}/${name}`)) continue;
    await fs.unlink(path.join(directory, name));
    for (const width of [640, 1280]) {
      await fs.rm(path.resolve('public/images/gallery/homepage/other-practice', scope, name.replace('.webp', `-${width}.webp`)), { force: true });
    }
  }
}
