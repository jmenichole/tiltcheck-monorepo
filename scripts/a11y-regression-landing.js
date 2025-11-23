#!/usr/bin/env node
const pa11y = require('pa11y');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Simple static server for the landing public dir
const publicDir = path.resolve(__dirname, '../services/landing/public');
const PORT = 9191;

const server = http.createServer((req, res) => {
  let filePath = path.join(publicDir, req.url === '/' ? 'index-v2.html' : req.url.replace(/^\//,''));
  if (!fs.existsSync(filePath)) filePath = path.join(publicDir, '404.html');
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(500); res.end('Error'); return; }
    res.writeHead(200); res.end(data);
  });
});

(async () => {
  server.listen(PORT, async () => {
    console.log('Temp server running for pa11y tests');
    try {
      const results = await pa11y(`http://localhost:${PORT}/`, { standard: 'WCAG2AA', timeout: 60000 });
      const issues = results.issues.filter(i => i.type === 'error');
      if (issues.length) {
        console.error('Accessibility errors found:', issues.map(i => `${i.code} ${i.message}`).join('\n'));
        process.exitCode = 1;
      } else {
        console.log('Accessibility regression: PASS (no errors)');
      }
    } catch (e) {
      console.error('pa11y run failed', e);
      process.exitCode = 1;
    } finally {
      server.close();
    }
  });
})();
