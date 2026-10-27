import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const source = path.resolve('../Homepage Media/Photos/Artemis Labs');
const manifest = { project: 'Artemis', grid: [], gallery: [] };
// Keep these supplied originals locally, but exclude them from the site.
const excluded = new Set(["Artemis Socials.png", "Atermis Socials v2.png"]);
const descriptions = {
  'Artemis Logo Grid.png': 'construction grid for the blue Artemis symbol',
  'Artemis Logo Tray.png': 'Artemis app icon in a desktop application dock',
  'Artemis Socials.png': 'Artemis wordmark with natural textures and fossil imagery',
  'Atermis Socials v2.png': 'Artemis social graphics with fossils and layered paper',
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
    const target = path.resolve('public/images/homepage/artemis', scope, filename);
    await fs.mkdir(path.dirname(target), { recursive: true });
    if (!(await fs.stat(target).catch(() => null))?.size) await sharp(data).rotate().resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 90, effort: 6 }).toFile(target);
    const { width, height } = await sharp(target).metadata();
    if (!width || !height) throw new Error(`Missing dimensions: ${entry.name}`);
    manifest[scope].push({ id: `artemis-${scope}-${slug}`, sourceName: entry.name, media: { kind: 'image', src: `/images/homepage/artemis/${scope}/${filename}` }, title: 'Artemis', note: 'Brand Identity', alt: `Artemis — ${descriptions[entry.name] || entry.name.replace(/\.[^.]+$/, '')}`, width, height, ratio: width / height });
    console.log(`${scope}: ${entry.name} → ${Math.round((await fs.stat(target)).size / 1000)} KB (${width} × ${height})`);
  }
}
await fs.writeFile('src/data/artemis-media.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Imported ${manifest.grid.length} homepage photos and ${manifest.gallery.length} gallery-only photos.`);
