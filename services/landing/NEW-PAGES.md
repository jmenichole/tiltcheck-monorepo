# New Landing Pages — November 22, 2025

## Overview
Added 6 new content pages to complete the TiltCheck landing site, providing comprehensive information about the platform, legal compliance, and user support.

## New Pages Created

### Content Pages
1. **`/about`** — About TiltCheck page
   - Mission statement & core values
   - How we help degens avoid tilt
   - Non-custodial principles
   - Creator info (jmenichole)
   - Open source contribution guide

2. **`/how-it-works`** — Product explainer
   - Discord integration details
   - Tilt detection algorithm breakdown
   - Casino trust scoring methodology
   - Link protection (SusLink/LinkGuard)
   - Behavioral nudges system
   - Non-custodial crypto flows
   - Data privacy practices

3. **`/trust-explained`** — Trust system deep-dive
   - Why casino trust scores matter
   - Trust calculation methodology (5 factors)
   - Trust score ranges (0-100 with color coding)
   - Real-time warning system
   - Scam reporting process

4. **`/contact`** — Contact & support
   - Discord community (coming soon)
   - GitHub issues link
   - Email contact (jmenichole@tiltcheck.gg)
   - Scam casino reporting instructions
   - Bot invite link (private beta)
   - Contributor inquiries
4. **`/faq`** — Frequently Asked Questions
   - General questions (What is TiltCheck? Is it free? Who built it?)
   - Tilt detection (How it works, privacy, opt-out)
   - Casino trust scores (Calculation, accuracy, reporting)
   - Discord bot (Setup, permissions, DM support, customization)
   - Cryptocurrency & tipping (Solana, non-custodial, fees)
   - Privacy & security (GDPR/CCPA, data deletion, encryption)
   - Scam protection (Link scanning, false positives, reporting)
   - Open source & contributing (GitHub, forking, licensing)
   - Troubleshooting (Bot offline, tilt warnings, permissions)


### Legal Pages
6. **`/privacy`** — Privacy Policy
   - Data collection disclosure (minimal)
   - Usage explanation (tilt detection, trust scoring)
   - Storage & security (AES-256, TLS 1.3)
   - Third-party services (Discord, Solana, VirusTotal)
   - User privacy rights (GDPR/CCPA compliant)
   - 90-day data retention policy
   - No data selling commitment

7. **`/terms`** — Terms of Service
   - Service description & limitations
   - Eligibility (18+, legal jurisdictions)
   - User responsibilities & prohibited uses
   - Non-custodial tipping terms (0.07 SOL fee)
   - Casino trust score disclaimers
   - Liability limitations
   - Dispute resolution & arbitration

## Technical Implementation

### Server Routes (`server.js`)
```javascript
app.get('/about', (_req, res) => { ... });
app.get('/how-it-works', (_req, res) => { ... });
app.get('/trust-explained', (_req, res) => { ... });
app.get('/contact', (_req, res) => { ... });
app.get('/faq', (_req, res) => { ... });
app.get('/privacy', (_req, res) => { ... });
app.get('/terms', (_req, res) => { ... });
```

### Sitemap Updates (`lib/meta.js`)
Added all 7 pages to `buildSiteMap()` with live status + mtime-based lastmod timestamps.

### CSS Additions (`styles/main.css`)
Added ~320 lines of new styles:
- `.site-header` + `.nav-links` (sticky navigation)
- `.content-page` layout (65ch max-width, semantic spacing)
- `.legal-doc` specific styles (section numbering)
- `.trust-table` with color-coded rows (trust-high, trust-danger, trust-scam)
- `.site-footer` grid layout (4 columns: branding, product, company, legal)
- `.cta-button` with hover effects
- Responsive adjustments for mobile

### Footer Redesign (`index-v2.html`)
Replaced simple link list with structured 4-column grid:
- **TiltCheck branding** + tagline
- **Product links** (Home, How It Works, Trust System, Dashboard)
- **Company links** (About, Contact, GitHub, Discord)
- **Legal links** (Privacy, Terms)

## Accessibility & SEO

### Accessibility
- Semantic HTML (`<nav>`, `<article>`, `<section>`, `<footer>`)
- `aria-current="page"` for active nav links
- Proper heading hierarchy (h1 → h2 → h3)
- Link underlines with `text-underline-offset`
- Focus states on all interactive elements
- Responsive design (mobile-first)

### SEO Optimizations
- Canonical URLs for all pages
- Unique meta descriptions (120-150 chars)
- Open Graph tags for social sharing
- Sitemap.xml includes all 6 new pages
- File mtime-based `<lastmod>` timestamps
- Structured internal linking (footer grid)

## Design Principles Followed

1. **Non-judgmental language** — "protecting degens" vs. "gambling addicts"
2. **Flat-fee transparency** — 0.07 SOL fee disclosed prominently
3. **Non-custodial emphasis** — "we never hold your crypto" repeated
4. **Scrappy authenticity** — "built by jmenichole, not VC-funded"
5. **Legal compliance** — GDPR/CCPA disclaimers, 18+ age gate
6. **Anti-scam focus** — Casino trust scores + scam reporting CTA

## Testing Results

All pages verified:
```bash
✅ /about          — <h1>About TiltCheck</h1>
✅ /how-it-works   — <h1>How TiltCheck Works</h1>
✅ /trust-explained — <h1>Trust System Explained</h1>
✅ /contact        — <h1>Contact TiltCheck</h1>
✅ /faq            — <h1>Frequently Asked Questions</h1>
✅ /privacy        — <h1>Privacy Policy</h1>
✅ /terms          — <h1>Terms of Service</h1>
```

Sitemap.xml includes all pages with correct mtime:
```xml
<url><loc>https://tiltcheck.example/about</loc>...</url>
<url><loc>https://tiltcheck.example/how-it-works</loc>...</url>
<url><loc>https://tiltcheck.example/trust-explained</loc>...</url>
<url><loc>https://tiltcheck.example/contact</loc>...</url>
<url><loc>https://tiltcheck.example/faq</loc>...</url>
<url><loc>https://tiltcheck.example/privacy</loc>...</url>
<url><loc>https://tiltcheck.example/terms</loc>...</url>
```

## Next Steps (Optional Enhancements)

1. **Add newsletter signup** to footer
2. **Build case studies page** (user success stories)
3. **Add testimonials section** to about page
4. **Create press kit page** with logos + brand assets
5. **Implement search** across all content pages
6. **Add breadcrumbs** for better navigation
7. **Create sitemap HTML** (human-readable version)
8. **Add accordion UI to FAQ** for better UX

## Files Modified

```
services/landing/server.js                  (7 new routes)
services/landing/lib/meta.js                (sitemap updated)
services/landing/public/index-v2.html       (footer redesign)
services/landing/public/styles/main.css     (+320 lines CSS)
services/landing/public/about.html          (NEW)
services/landing/public/how-it-works.html   (NEW)
services/landing/public/trust-explained.html (NEW)
services/landing/public/contact.html        (NEW)
services/landing/public/faq.html             (NEW)
services/landing/public/privacy.html        (NEW)
services/landing/public/terms.html          (NEW)
```

## Deployment Checklist

- [x] Routes added to server.js
- [x] Sitemap.xml updated
- [x] CSS styles for content pages
- [x] Footer redesigned with proper navigation
- [x] All pages tested locally
- [x] Accessibility validated (semantic HTML)
- [x] SEO optimized (canonical, meta, OG tags)
- [ ] Update PUBLIC_BASE_URL in production config
- [ ] Deploy to Railway/Render
- [ ] Test all pages in production
- [ ] Submit sitemap to Google Search Console

---

**Created:** November 22, 2025  
**Author:** GitHub Copilot (TiltCheck Agent)  
**Status:** Complete, ready for deployment
