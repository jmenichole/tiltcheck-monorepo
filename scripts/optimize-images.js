#!/usr/bin/env node
/* Image optimization pipeline: converts JPEG/PNG to WebP & AVIF slugified names */
const fs = require('fs');
const path = require('path');
let sharp;
try { sharp = require('sharp'); } catch { console.warn('sharp not installed; skipping optimization'); process.exit(0); }
const SRC_DIR = path.resolve(__dirname, '../assets/images');
const OUT_DIR = SRC_DIR; // write alongside originals
function slugify(name){return name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');}
function optimizeFile(file){
  const full = path.join(SRC_DIR,file);
  const ext = path.extname(file).toLowerCase();
  if(!['.jpg','.jpeg','.png'].includes(ext)) return;
  const base = slugify(file.replace(ext,''));
  const webpOut = path.join(OUT_DIR, base + '.webp');
  const avifOut = path.join(OUT_DIR, base + '.avif');
  return sharp(full).resize({width:1200, withoutEnlargement:true}).webp({quality:70}).toFile(webpOut)
    .then(()=>sharp(full).resize({width:1200, withoutEnlargement:true}).avif({quality:55}).toFile(avifOut))
    .then(()=>({file, webp:webpOut, avif:avifOut}))
    .catch(e=>{console.error('Failed optimizing', file, e.message);});
}
(async()=>{
  const files = fs.readdirSync(SRC_DIR);
  const results = [];
  for(const f of files){ const r = await optimizeFile(f); if(r) results.push(r); }
  console.log('Optimization complete', results.length,'files processed');
})();
