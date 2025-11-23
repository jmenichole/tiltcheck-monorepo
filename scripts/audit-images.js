#!/usr/bin/env node
/** Simple image & alt audit for landing page */
const fs = require('fs');
const path = require('path');
const htmlPath = path.resolve(__dirname, '../services/landing/public/index-v2.html');
const MAX_SIZE = 300 * 1024; // 300KB

function extractImageSources(html) {
  const srcRegex = /<img[^>]+src="([^"]+)"/g;
  const altRegex = /<img[^>]+alt="([^"]*)"/g;
  const sources = [];
  let m;
  while ((m = srcRegex.exec(html))) sources.push(m[1]);
  const alts = [];
  while ((m = altRegex.exec(html))) alts.push(m[1]);
  return { sources, alts };
}

function main() {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const { sources, alts } = extractImageSources(html);
  const failures = [];
  // Alt text & attribute checks
  const imgTagRegex = /<img[^>]+>/g;
  const imgTags = html.match(imgTagRegex) || [];
  imgTags.forEach(tag => {
    const srcMatch = tag.match(/src="([^"]+)"/);
    const altMatch = tag.match(/alt="([^"]*)"/);
    if (!srcMatch) return;
    const src = srcMatch[1];
    const alt = altMatch ? altMatch[1] : undefined;
    const isHero = /hero-bg-img/.test(tag);
    if (alt === undefined) failures.push(`Missing alt for ${src}`);
    else if (alt === '' && !isHero) failures.push(`Empty alt unexpected for ${src}`);
    if (/fetchpriority="high"/.test(tag) && !isHero) failures.push(`fetchpriority=high used on non-hero image: ${src}`);
  });
  // File size checks (only check local /assets references)
  sources.filter(s => s.startsWith('/assets/')).forEach(src => {
    const physical = path.resolve(__dirname, '..', src.startsWith('/assets/') ? `../assets/${src.substring('/assets/'.length)}` : src);
    if (fs.existsSync(physical)) {
      const { size } = fs.statSync(physical);
      if (size > MAX_SIZE) failures.push(`Oversized image (>300KB): ${src} size=${size}`);
    }
  });
  if (failures.length) {
    console.error('Image audit failures:\n' + failures.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(`Image audit passed. Checked ${sources.length} images.`);
  }
}
main();
