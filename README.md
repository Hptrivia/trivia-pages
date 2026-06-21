# Trivia Nest (static trivia site)

Barebones, content-first trivia site built for AdSense approval.
Interactive quizzes with questions + options pre-rendered into static HTML
(answers hidden in a data-attribute, revealed by JS on click).

## Edit branding/domain
Open `build.js` and edit the CONFIG block at the top:
- `SITE_NAME`  – your brand
- `SITE_DOMAIN` – your domain, e.g. https://yourdomain.com (no trailing slash)
- `ADSENSE_CLIENT` – leave "" until AdSense approves, then paste ca-pub-XXXX

## Build
```
node build.js
```
Regenerates all .html pages, sitemap.xml and robots.txt from `data/`.

## Add a theme
1. Drop a `data/<name>.txt` file (JSON array of {question, options[], answer, difficulty}).
2. Add an entry to `data/themes.json` (slug, title, seoIntro, seoDetail, questionFile).
3. Run `node build.js`.

## Hosting
Served as static files (GitHub Pages from repo root). Point your domain via a
`CNAME` file + DNS records.
