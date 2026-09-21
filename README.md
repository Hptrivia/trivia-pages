# Trivia Gauntlet (static trivia site)

Content-first trivia site. Interactive quizzes with questions + options pre-rendered
into static HTML, plus a visible answer key with an explanation for every question.

## Edit branding/domain
Open `build.js` and edit the CONFIG block at the top:
- `SITE_NAME`  – brand
- `SITE_DOMAIN` – domain, e.g. https://yourdomain.com (no trailing slash)
- `ADSENSE_CLIENT` – AdSense publisher id
- `PRIVACY_UPDATED` / `TERMS_UPDATED` – dates shown on the legal pages (change only when the text changes)

## Build
```
node build.js
```
Regenerates all `.html` pages, `sitemap.xml` and `robots.txt` from `data/` and `posts/`.

## Data layout
- `data/themes.json` – one entry per quiz (slug, title, description, seoIntro, seoDetail)
- `data/editorial.json` – per-quiz original write-up and FAQs
- `data/new-questions/<slug>.json` – the 20 questions for each quiz
  (5 easy, 5 medium, 5 hard, 5 expert), each with `question`, `options[4]`, `answer`,
  `difficulty` and `explanation`. The build refuses to run if a quiz is malformed.
- `posts/*.html` – blog articles (inner HTML, each starts with an `<h1>`)
- `_old-question-banks/` – earlier question files copied from another site. Not used by
  the build. The leading underscore keeps GitHub Pages from publishing this folder.

## Add a theme
1. Add an entry to `data/themes.json` and `data/editorial.json`.
2. Write `data/new-questions/<slug>.json` (20 questions, 5 per difficulty, with explanations).
3. Run `node build.js`.

## Hosting
Served as static files (GitHub Pages from repo root). Point your domain via a
`CNAME` file + DNS records.
