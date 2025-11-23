#!/usr/bin/env node
/**
 * Build a Lunr search index from landing public HTML pages.
 * Outputs JSON to services/landing/public/search-index.json
 */
const fs = require('fs');
const path = require('path');
const lunr = require('lunr');

const PUBLIC_DIR = path.join(__dirname, '../services/landing/public');
const OUTPUT_PATH = path.join(PUBLIC_DIR, 'search-index.json');

// Pages to index (relative file -> route)
const pages = [
  ['about.html', '/about'],
  ['how-it-works.html', '/how-it-works'],
  ['trust-explained.html', '/trust-explained'],
  ['contact.html', '/contact'],
  ['privacy.html', '/privacy'],
  ['terms.html', '/terms'],
  ['faq.html', '/faq'],
  ['site-map.html', '/site-map']
];

function extractText(html) {
  // Remove scripts/styles
  html = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');
  // Keep alt text from images
  html = html.replace(/<img[^>]*alt="([^"]+)"[^>]*>/gi, ' $1 ');
  // Replace tags with spaces then collapse whitespace
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return text;
}

const documents = [];
for (const [file, route] of pages) {
  const filePath = path.join(PUBLIC_DIR, file);
  if (!fs.existsSync(filePath)) continue;
  const html = fs.readFileSync(filePath, 'utf8');
  // Title from <title> or first <h1>
  let titleMatch = html.match(/<title>(.*?)<\/title>/i);
  let title = titleMatch ? titleMatch[1] : '';
  if (!title) {
    const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
    title = h1Match ? h1Match[1] : route.replace(/\//g, ' ').trim();
  }
  title = title.replace(/<[^>]+>/g, '').trim();
  const body = extractText(html);
  documents.push({ id: route, url: route, title, body });
}

if (!documents.length) {
  console.error('No documents found to index.');
  process.exit(1);
}

const idx = lunr(function () {
  this.ref('id');
  this.field('title');
  this.field('body');
  documents.forEach(d => this.add(d));
});

const output = {
  generatedAt: new Date().toISOString(),
  index: idx.toJSON(),
  documents: documents.map(({ id, url, title }) => ({ id, url, title }))
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
console.log(`Search index written to ${OUTPUT_PATH} (docs: ${documents.length})`);
