/** Import the local project folders. Generated media + manifest are committed;
 * originals stay in Homepage Media. Run this explicitly when files change. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
const run = promisify(execFile);
const sourceRoot = path.resolve('../Homepage Media');
const outputRoot = path.resolve('public/images/homepage/maison-music-fest');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobe = process.env.FFPROBE_PATH || 'ffprobe';
const hash = data => createHash('sha256').update(data).digest('hex');
const slug = name => name.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const descriptions = {
  "Final Case Study 09.png": "festival identity, typography and graphic applications",
  "Final Case Study 10.png": "colourful festival banners",
  "Final Case Study 11.png": "festival stage and screen graphics",
  "Final Case Study 13.png": "chrome festival wordmark on a pink gradient",
  "Final IG Post 01.png": "festival T-shirt with iridescent artwork",
  "Final IG Post 06.png": "vertical festival street banner",
  "Final IG Post 10.png": "artist poster in an outdoor display",
  "MMF-brand-01.png": "blue and lilac festival poster",
  "Final IG Post 14.mp4": "animated artist poster",
  "Final Post IG 15.mp4": "animated portrait poster",
  "Final Post IG 16.mp4": "animated artist poster carousel",
  "MMF-brand-01.mp4": "animated coloured orbs",
  "Final Case Study 12.png": "colourful artist and attendee wristbands",
  "Final IG Post 03.png": "printed festival tickets and sleeves",
  "Final IG Post 05.png": "iridescent festival poster",
  "Final IG Post 08.png": "festival artist lineup portraits",
  "IG 2.png": "festival logo colour variations",
  "IG 5.png": "festival lineup poster",
  "Maison Music Logo Animation with Sound.mov": "festival logo animation with sound",
  "Chrome Logo v2.mp4": "chrome festival symbol animation",
  "MMF-brand-02.mp4": "animated festival lineup typography"
};
const files = [];
// Grid wins when the same file is also present in Gallery.
for (const scope of ['Grid', 'Gallery']) {
  for (const folder of ['Photos', 'Videos']) {
    const directory = path.join(sourceRoot, folder, 'Maison Music Fest', scope);
    for (const name of (await fs.readdir(directory)).sort((a,b) => a.localeCompare(b,undefined,{numeric:true}))) {
      if (name.startsWith('.')) continue;
      if (!/\.(png|jpe?g|webp|avif|mp4|mov)$/i.test(name)) throw new Error(`Unsupported file: ${name}`);
      const source = path.join(directory, name);
      const data = await fs.readFile(source);
      const video = /\.(mp4|mov)$/i.test(name);
      let metadata;
      if (video) {
        const { stdout } = await run(ffprobe, ['-v','error','-show_streams','-show_format','-of','json',source]);
        const probe = JSON.parse(stdout);
        const stream = probe.streams.find(item => item.codec_type === 'video');
        if (!stream) throw new Error(`No video stream: ${source}`);
        metadata = {width:stream.width,height:stream.height,duration:Number(probe.format.duration),audio:probe.streams.some(item => item.codec_type==='audio'),codec:stream.codec_name};
      } else metadata = await sharp(data).metadata();
      if (!metadata.width || !metadata.height) throw new Error(`Invalid media: ${source}`);
      files.push({scope:scope.toLowerCase(), source, name, video, metadata, hash:hash(data)});
    }
  }
}
const unique = [];
const skipped = [];
for (const file of files) {
  const exact = unique.find(other => other.hash === file.hash);
  if (exact) { skipped.push(`${file.name} (${file.scope}): duplicate of ${exact.scope}`); continue; }
  const alternate = unique.find(other => file.video && other.video && slug(other.name)===slug(file.name) && Math.abs(other.metadata.duration-file.metadata.duration)<.15 && other.metadata.width===file.metadata.width && other.metadata.height===file.metadata.height);
  if (alternate) {
    skipped.push(`${file.name}: alternate export of ${alternate.name}`);
    // Prefer the high-quality MOV master when both exports are gallery-only.
    if (/\.mov$/i.test(file.name) && alternate.scope === file.scope) Object.assign(alternate,file);
    continue;
  }
  unique.push(file);
}
const manifest = {project:'Maison Music Fest',grid:[],gallery:[]};
const report = [];
for (const file of unique) {
  const directory = path.join(outputRoot,file.scope);
  await fs.mkdir(directory,{recursive:true});
  const base = `${slug(file.name)}-${file.hash.slice(0,10)}`;
  const target = path.join(directory,base+(file.video?'.mp4':'.webp'));
  const original = await fs.stat(file.source);
  // Moving between Grid and Gallery should reuse the same optimized master.
  const previous = path.join(outputRoot,file.scope==='grid'?'gallery':'grid',path.basename(target));
  if (!(await fs.stat(target).catch(()=>null))?.size && (await fs.stat(previous).catch(()=>null))?.size) {
    await fs.copyFile(previous,target);
    if(file.video) {
      const oldPoster=previous.replace(/\.mp4$/,'-poster.webp');
      if((await fs.stat(oldPoster).catch(()=>null))?.size) await fs.copyFile(oldPoster,target.replace(/\.mp4$/,'-poster.webp'));
    }
  }
  if (!(await fs.stat(target).catch(()=>null))?.size) {
    if (!file.video) {
      await sharp(file.source).rotate().resize({width:2200,height:2200,fit:'inside',withoutEnlargement:true}).webp({quality:90,effort:6}).toFile(target);
    } else if (original.size<=5e6 && file.metadata.codec==='h264' && Math.max(file.metadata.width,file.metadata.height)<=2400) {
      await run(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',file.source,'-map','0:v:0','-map','0:a:0?','-c','copy','-movflags','+faststart',target]);
    } else {
      const audio = file.metadata.audio ? 128 : 0;
      const bitrate = Math.min(12000,Math.max(900,Math.floor(4.1e6*8/file.metadata.duration/1000)-audio));
      const filter = "scale=w='min(iw,1920)':h='min(ih,1920)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1";
      const log = path.join(directory,`${base}-pass`);
      const common = ['-hide_banner','-loglevel','error','-y','-i',file.source,'-map','0:v:0','-vf',filter,'-c:v','libx264','-preset','slow','-b:v',`${bitrate}k`,'-pix_fmt','yuv420p','-passlogfile',log];
      await run(ffmpeg,[...common,'-pass','1','-an','-f','null','/dev/null']);
      await run(ffmpeg,[...common,'-pass','2','-map','0:a:0?','-c:a','aac','-b:a','128k','-movflags','+faststart',target]);
      for(const name of await fs.readdir(directory)) if(name.startsWith(`${base}-pass`)) await fs.unlink(path.join(directory,name));
    }
  }
  let width,height,poster;
  const url = '/'+path.relative(path.resolve('public'),target).split(path.sep).join('/');
  if(file.video) {
    const {stdout}=await run(ffprobe,['-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','json',target]);
    ({width,height}=JSON.parse(stdout).streams[0]);
    const posterPath=target.replace(/\.mp4$/,'-poster.webp');
    if(!(await fs.stat(posterPath).catch(()=>null))?.size) await run(ffmpeg,['-hide_banner','-loglevel','error','-y','-ss','0.1','-i',target,'-frames:v','1','-vf',"scale=w='min(iw,1280)':h='min(ih,1280)':force_original_aspect_ratio=decrease",'-quality','88',posterPath]);
    poster=url.replace(/\.mp4$/,'-poster.webp');
  } else ({width,height}=await sharp(target).metadata());
  const entry={id:`maison-${file.scope}-${slug(file.name)}`,sourceName:file.name,media:file.video?{kind:'video',src:url,poster}:{kind:'image',src:url},alt:`Maison Music Fest — ${descriptions[file.name] || file.name.replace(/\.[^.]+$/,'')}`,title:'Maison Music Fest',note:file.video?'Motion':'Visual Identity',ratio:width/height,width,height};
  manifest[file.scope].push(entry);
  report.push({scope:file.scope,file:file.name,originalMB:+(original.size/1e6).toFixed(2),optimizedMB:+((await fs.stat(target)).size/1e6).toFixed(2),width,height});
}
await fs.writeFile('src/data/homepage-media.json',JSON.stringify(manifest,null,2)+'\n');
// Only remove obsolete generated files from this import's managed directories.
// The originals in Homepage Media and every other project's assets stay intact.
const retained = new Set();
for (const item of [...manifest.grid,...manifest.gallery]) {
  retained.add(path.resolve('public'+item.media.src));
  if(item.media.poster) retained.add(path.resolve('public'+item.media.poster));
  if(item.media.kind==='image') {
    const relative=item.media.src.replace(/^\/images\//,'').replace(/\.[^.]+$/,'');
    for(const width of [640,1280]) retained.add(path.resolve(`public/images/gallery/${relative}-${width}.webp`));
  }
}
async function cleanGenerated(directory) {
  for(const entry of await fs.readdir(directory,{withFileTypes:true}).catch(()=>[])) {
    const file=path.join(directory,entry.name);
    if(entry.isDirectory()) { await cleanGenerated(file); continue; }
    if(/-[0-9a-f]{10}(?:-poster|-640|-1280)?\.(webp|mp4)$/.test(entry.name) && !retained.has(file)) await fs.unlink(file);
  }
}
await cleanGenerated(outputRoot);
await cleanGenerated(path.resolve('public/images/gallery/homepage/maison-music-fest'));
await fs.writeFile('../Homepage Media/Review/maison-import-report.json',JSON.stringify({skipped,files:report},null,2)+'\n');
console.log(JSON.stringify({grid:manifest.grid.length,galleryOnly:manifest.gallery.length,skipped,files:report},null,2));
