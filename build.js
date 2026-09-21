#!/usr/bin/env node
/*
 * Static trivia site generator.
 * Reads data/themes.json + data/*.txt and emits crawlable, interactive
 * quiz pages (questions + options baked into HTML; correct answer hidden
 * in a data-attribute and only revealed by JS when the user picks).
 *
 * Output: index.html, <slug>.html, about/contact/privacy/terms.html,
 *         sitemap.xml, robots.txt  (all at repo root, for GitHub Pages)
 */

const fs = require("fs");
const path = require("path");

// ---- CONFIG (edit these once you've settled the brand/domain) -------------
const SITE_NAME = "Trivia Gauntlet";              // <-- change to your brand
const SITE_DOMAIN = "https://triviagauntletapp.com"; // <-- your domain (no trailing slash)
const QUESTIONS_PER_QUIZ = 20;
// AdSense publisher id, e.g. "ca-pub-1234567890123456". Leave "" until approved.
const ADSENSE_CLIENT = "ca-pub-9506123851374920";
// ---------------------------------------------------------------------------

const ROOT = __dirname;
// Dates shown on the legal pages. Change these only when the text actually changes.
const PRIVACY_UPDATED = "2026-09-21";
const TERMS_UPDATED = "2026-07-03";
const themes = JSON.parse(fs.readFileSync(path.join(ROOT, "data/themes.json"), "utf8"));
// Per-theme original editorial (whyTrivia / covers / show-specific faqs).
// Keyed by theme slug. This is the unique, value-adding prose on each quiz page.
const editorial = JSON.parse(fs.readFileSync(path.join(ROOT, "data/editorial.json"), "utf8"));

// Questions and explanations for each quiz are written for this site and live in
// data/new-questions/<slug>.json (20 per theme: 5 easy, 5 medium, 5 hard, 5 expert).
function loadQuestions(slug) {
  const file = path.join(ROOT, "data/new-questions", `${slug}.json`);
  const qs = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const q of qs) {
    if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || !q.options.includes(q.answer) || !q.explanation) {
      throw new Error(`Invalid question in ${slug}: ${q.question}`);
    }
  }
  return qs;
}
const explanationFor = (slug, q) => q.explanation.trim();

// Public URL slug for a theme: data slug + "-trivia" (better keyword match in URL).
// t.slug stays the data identity (used for question files + dedup); only URLs change.
const urlSlug = (t) => `${t.slug}-trivia`;

// Blog posts: each file in posts/ is the inner HTML of one article (starts <h1>).
const POSTS_DIR = path.join(ROOT, "posts");
const POSTS = (fs.existsSync(POSTS_DIR) ? fs.readdirSync(POSTS_DIR) : [])
  .filter((f) => f.endsWith(".html"))
  .map((f) => {
    const html = fs.readFileSync(path.join(POSTS_DIR, f), "utf8");
    const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || f;
    const firstP = (html.match(/<p[^>]*>([\s\S]*?)<\/p>/) || [])[1] || "";
    return {
      file: f,
      html,
      title: h1.replace(/<[^>]*>/g, "").trim(),
      snippet: firstP.replace(/<[^>]*>/g, "").trim(),
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title));

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// BreadcrumbList structured data. items = [{name, url}] in order.
function breadcrumbLd(items) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  });
}

function adsenseHead() {
  if (!ADSENSE_CLIENT) return "";
  return `  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>\n`;
}

function head(title, description, canonical) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-BXNZDMC57R"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-BXNZDMC57R');
  </script>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="theme-color" content="#4f46e5" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:site_name" content="${esc(SITE_NAME)}" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
${adsenseHead()}  <link rel="stylesheet" href="assets/style.css" />
  <script defer src="assets/search.js"></script>
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a class="brand" href="index.html">${esc(SITE_NAME)}</a>
      <nav class="nav">
        <a href="index.html">Quizzes</a>
        <a href="blog.html">Blog</a>
        <a href="about.html">About</a>
        <a href="contact.html">Contact</a>
      </nav>
    </div>
  </header>
`;
}

function footer() {
  const year = new Date().getFullYear();
  return `  <footer class="site-footer">
    <div class="container">
      <div class="footer-links">
        <a href="index.html">Quizzes</a>
        <a href="about.html">About</a>
        <a href="contact.html">Contact</a>
        <a href="privacy.html">Privacy Policy</a>
        <a href="terms.html">Terms</a>
      </div>
      <p class="copyright">&copy; ${year} ${esc(SITE_NAME)}. Trivia for fun &mdash; all franchise names belong to their respective owners.</p>
    </div>
  </footer>
</body>
</html>`;
}

function quizHTML(questions, slug) {
  const blocks = questions
    .map((q, i) => {
      const correct = q.options.indexOf(q.answer);
      const opts = q.options
        .map(
          (o, j) =>
            `        <button class="opt" type="button" data-idx="${j}">${esc(o)}</button>`
        )
        .join("\n");
      const why = explanationFor(slug, q);
      return `    <div class="q" data-answer="${correct}" data-i="${i}">
      <p class="q-text"><span class="q-num">Q${i + 1}.</span> ${esc(q.question)}</p>
      <div class="opts">
${opts}
      </div>
      <div class="q-explain" hidden>
        <p><strong>Answer: ${esc(q.answer)}.</strong>${why ? " " + esc(why) : ""}</p>
      </div>
    </div>`;
    })
    .join("\n");

  return `  <div class="quiz" data-total="${questions.length}">
${blocks}
    <div class="quiz-results" hidden>
      <h2>Your Score</h2>
      <p class="score-line"><span class="score-num">0</span> / ${questions.length}</p>
      <p class="score-msg"></p>
      <button class="btn restart" type="button">Play Again</button>
      <a class="btn ghost" href="index.html">More Quizzes</a>
    </div>
  </div>`;
}

// Visible answer key under the quiz: every question with its correct answer and
// a short explanation. Real, crawlable page content (not hidden behind a click).
function answerKeyHTML(t, questions) {
  const items = questions
    .map((q, i) => {
      const why = explanationFor(t.slug, q);
      return `        <li>
          <p class="ak-q">${esc(q.question)}</p>
          <p class="ak-a"><strong>Answer: ${esc(q.answer)}.</strong>${why ? " " + esc(why) : ""}</p>
        </li>`;
    })
    .join("\n");
  return `      <section class="answer-key">
        <h2>${esc(t.title)} quiz answers and explanations</h2>
        <p>Here is every question from the quiz above with its correct answer and a short note on why it is right.</p>
        <ol>
${items}
        </ol>
      </section>`;
}

// Reusable quick-search block (one instance per page; wired by assets/search.js).
function searchBarHTML(variant, heading) {
  return `      <section class="search-section ${variant}">
${heading ? `        <h2>${esc(heading)}</h2>\n` : ""}        <div class="search-wrap">
          <input id="themeSearch" class="theme-search-input" type="text" placeholder="Search quizzes…" autocomplete="off" aria-label="Search quizzes" />
          <div id="themeSearchResults" class="search-results"></div>
        </div>
      </section>`;
}

function themePage(t) {
  const questions = loadQuestions(t.slug);
  const ed = editorial[t.slug] || {};
  const title = `${t.title} Trivia Quiz – ${questions.length} Questions | ${SITE_NAME}`;
  const desc =
    t.description ||
    t.seoIntro ||
    `Test your knowledge with this ${t.title} trivia quiz.`;
  const canonical = `${SITE_DOMAIN}/${urlSlug(t)}.html`;

  // Intro (above the quiz): the strongest, unique per-theme paragraph.
  const intro = t.seoIntro
    ? `      <p>${esc(t.seoIntro)}</p>`
    : `      <p>Test your knowledge of ${esc(t.title)} with this free trivia quiz.</p>`;

  // "About" block below the quiz: original per-theme editorial (unique prose).
  // whyTrivia = what makes the show good trivia; falls back to seoDetail.
  const aboutParas = [ed.whyTrivia, t.seoDetail]
    .filter(Boolean)
    .map((p) => `        <p>${esc(p)}</p>`)
    .join("\n");

  // "What this quiz covers" — the coverage write-up (unique per theme).
  const coversText = ed.covers || t.seoDetail || "";

  // How-to-play block — short, practical, non-boilerplate framing of the quiz.
  const howToPlay = `Tap an answer to see the right one straight away with a short explanation, and check your score at the end. Play Again resets the quiz.`;

  // A short FAQ — show-specific (from editorial.json) so it is NOT duplicated
  // across pages. Falls back to a couple of generic entries only if missing.
  const faqs = Array.isArray(ed.faqs) && ed.faqs.length
    ? ed.faqs
    : [
        [`Is the ${t.title} quiz free to play?`,
         `Yes. Every quiz on ${SITE_NAME} is completely free to play, with no sign-up or download required.`],
        [`Can I retake the quiz?`,
         `Yes. Use the Play Again button to reset your score and start over as many times as you like.`],
      ];
  const faqHTML = faqs
    .map(([q, a]) => `        <div class="faq-item">\n          <h3>${esc(q)}</h3>\n          <p>${esc(a)}</p>\n        </div>`)
    .join("\n");
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return `${head(title, desc, canonical)}
  <main class="container">
    <article>
      <p class="crumb"><a href="index.html">Quizzes</a> &rsaquo; ${esc(t.title)}</p>
      <h1>${esc(t.title)} Trivia Quiz</h1>
      <div class="intro">
${intro}
      </div>

${quizHTML(questions, t.slug)}

${answerKeyHTML(t, questions)}

      <section class="about-quiz">
        <h2>About the ${esc(t.title)} quiz</h2>
${aboutParas}
      </section>

      <section class="about-quiz covers">
        <h2>What this ${esc(t.title)} quiz covers</h2>
        <p>${esc(coversText)}</p>
      </section>

      <section class="about-quiz how-to-play">
        <h2>How to play</h2>
        <p>${howToPlay}</p>
      </section>

      <section class="faq">
        <h2>${esc(t.title)} quiz — frequently asked questions</h2>
${faqHTML}
      </section>
${searchBarHTML("quiz-search", "Search for another quiz")}
${relatedQuizzesHTML(t)}
    </article>
  </main>
  <script type="application/ld+json">${breadcrumbLd([
    { name: "Quizzes", url: SITE_DOMAIN + "/" },
    { name: `${t.title} Trivia Quiz`, url: canonical },
  ])}</script>
  <script type="application/ld+json">${JSON.stringify(faqJsonLd)}</script>
  <script src="assets/quiz.js"></script>
${footer()}`;
}

// "More quizzes like this" — prefer same category, then fill with others.
function relatedQuizzesHTML(t) {
  const sameCat = themes.filter((x) => x.slug !== t.slug && x.category === t.category);
  const others = themes.filter((x) => x.slug !== t.slug && x.category !== t.category);
  const related = [...sameCat, ...others].slice(0, 4);
  if (!related.length) return "";
  const cards = related
    .map(
      (r) => `        <a class="card" href="${urlSlug(r)}.html">
          <h3>${esc(r.title)}</h3>
          <span class="card-cta">Play quiz →</span>
        </a>`
    )
    .join("\n");
  return `
      <section class="related">
        <h2>More quizzes like this</h2>
        <div class="grid related-grid">
${cards}
        </div>
      </section>`;
}

// "More articles" — the next few posts in the list (wraps around).
function relatedArticlesHTML(post) {
  if (POSTS.length < 2) return "";
  const idx = POSTS.findIndex((p) => p.file === post.file);
  const related = [];
  for (let i = 1; i <= 3 && related.length < POSTS.length - 1; i++) {
    related.push(POSTS[(idx + i) % POSTS.length]);
  }
  const cards = related
    .map(
      (r) => `        <a class="card" href="${r.file}">
          <h3>${esc(r.title)}</h3>
          <span class="card-cta">Read article →</span>
        </a>`
    )
    .join("\n");
  return `
      <section class="related">
        <h2>More articles</h2>
        <div class="grid related-grid">
${cards}
        </div>
      </section>`;
}

function indexPage() {
  const cards = themes
    .map((t) => {
      const blurb = t.seoIntro || t.description || "";
      return `      <a class="card" href="${urlSlug(t)}.html">
        <h2>${esc(t.title)}</h2>
        <p>${esc(blurb.slice(0, 140))}${blurb.length > 140 ? "…" : ""}</p>
        <span class="card-cta">Start quiz →</span>
      </a>`;
    })
    .join("\n");

  const title = `${SITE_NAME} – Free Themed Trivia Quizzes`;
  const desc = `Play free themed trivia quizzes across TV, movies, and games. Multiple-choice questions, instant scoring, no sign-up needed.`;
  return `${head(title, desc, SITE_DOMAIN + "/")}
  <main class="container">
    <section class="hero">
      <h1>${esc(SITE_NAME)}</h1>
      <p>Free, fast, themed trivia quizzes. Pick a topic, answer the questions, and get your score &mdash; no sign-up required.</p>
    </section>
${searchBarHTML("home-search")}
    <section class="grid">
${cards}
    </section>
  </main>
${footer()}`;
}

// ---- static info pages (text adapted from existing site) ------------------
function infoPage(slug, title, bodyHTML) {
  const canonical = `${SITE_DOMAIN}/${slug}.html`;
  return `${head(`${title} | ${SITE_NAME}`, title, canonical)}
  <main class="container narrow">
    <article class="panel">
${bodyHTML}
    </article>
  </main>
${footer()}`;
}

const aboutBody = `      <h1>About ${SITE_NAME}</h1>
      <p>${SITE_NAME} is a free collection of themed trivia quizzes for fans who like putting their knowledge to the test. Pick a show, anime or game you love, answer 20 multiple-choice questions, and see how much you really remember. There is nothing to install and no account to make.</p>
      <h2>Who runs this site</h2>
      <p>${SITE_NAME} is run by one independent trivia fan, who signs off as the Trivia Gauntlet editor. It started as a hobby: I like rewatching shows and testing how much of them sticks. The quizzes here cover the series and games I know well or have researched. You can read more in the article <a href="how-i-create-trivia-questions.html">How the Quizzes on Trivia Gauntlet Are Made</a>.</p>
      <h2>How the quizzes work</h2>
      <p>Every quiz has 20 questions, split into five easy, five medium, five hard and five expert. After you pick an answer, the quiz shows the correct one with a short explanation, and the full answer key is printed under each quiz. You can replay any quiz as many times as you like. The article <a href="how-quiz-difficulty-works.html">Easy, Medium, Hard, Expert</a> explains the levels.</p>
      <h2>Our editorial standards</h2>
      <p>Questions are drafted with the help of AI tools and then read through by the editor. Anything unclear, unfair or impossible to confirm is rewritten or removed, and wrong answer options are adjusted so that they sound believable. The quizzes stick to main characters, big plot points and well-known details, because a question is only worth asking if it has one clear, checkable answer.</p>
      <h2>Corrections</h2>
      <p>Mistakes can still happen. If you think an answer is wrong, or a question is badly worded, use the <a href="contact.html">contact page</a> and choose "Wrong Question / Answer". Confirmed mistakes are corrected or the question is removed.</p>
      <h2>Independence and advertising</h2>
      <p>${SITE_NAME} is an independent fan project. It is not affiliated with, endorsed by or sponsored by the makers of any show, film or game covered here. All names, titles and trademarks belong to their respective owners and are used only to identify the subject of each quiz. The site is free to use and may show advertising in the future to help cover its running costs.</p>
      <h2>Get in touch</h2>
      <p>For feedback, corrections or quiz requests, head to the <a href="contact.html">contact page</a>.</p>`;

const contactBody = `      <h1>Contact / Feedback</h1>
      <p>Found a wrong question, want to request a quiz that isn't here yet, spotted a bug, or just want to share feedback? Send it here.</p>
      <p>Or email directly: <a href="mailto:triviaking2025@gmail.com">triviaking2025@gmail.com</a></p>
      <form class="contact-form" action="https://formspree.io/f/mpqybwea" method="POST">
        <label class="form-label" for="ftype">Type</label>
        <select id="ftype" name="type" class="form-input">
          <option value="general">General Feedback</option>
          <option value="request">Request a Quiz Topic</option>
          <option value="question">Wrong Question / Answer</option>
          <option value="bug">Bug / Technical Issue</option>
        </select>
        <label class="form-label" for="message">Message</label>
        <textarea id="message" name="message" class="form-input form-textarea" placeholder="Type your feedback here..." required></textarea>
        <label class="form-label" for="email">Email (optional)</label>
        <input id="email" name="email" type="email" class="form-input" placeholder="you@example.com" />
        <button type="submit" class="btn">Send Feedback</button>
      </form>`;

const privacyBody = `      <h1>Privacy Policy</h1>
      <p>Last updated: ${PRIVACY_UPDATED}</p>
      <p>${SITE_NAME} respects your privacy. This page explains what information may be collected when you use this site, how that information is used, and what choices you have.</p>
      <h2>Information We May Collect</h2>
      <p>When you use this site, certain information may be collected automatically, including browser type, device information, pages visited, approximate location, referral source, and general usage activity. If you contact the site by email or through a contact form, the information you provide may also be collected.</p>
      <h2>Analytics</h2>
      <p>This site uses Google Analytics to understand how visitors use the site and how it can be improved. Google Analytics uses cookies or similar technologies to collect usage data such as pages viewed, device type and approximate location.</p>
      <h2>Advertising and Cookies</h2>
      <p>This site does not currently show advertisements. In the future it may display advertisements through Google AdSense. Third-party vendors, including Google, may use cookies to serve ads based on a user's prior visits to this website or other websites.</p>
      <p>Google's use of advertising cookies enables it and its partners to serve ads based on your visit to this site and/or other sites on the internet. Users may be able to manage ad personalisation and cookie preferences through Google's ad settings and through the consent options shown on this site where required.</p>
      <p>Before advertising is shown to visitors in regions where consent is required, such as the European Economic Area and the United Kingdom, this site will present a consent message that lets you choose whether cookies are used for advertising.</p>
      <h2>Contact Form</h2>
      <p>Messages sent through the contact form are handled by Formspree, a third-party form service, and are delivered to the site owner's email inbox. The information you provide, such as your message and your optional email address, is used only to read and reply to your feedback.</p>
      <h2>How Information Is Used</h2>
      <p>Information collected through the site may be used to operate the site, improve performance, understand which quizzes and pages are most useful, respond to messages, prevent abuse, and support advertising or analytics functions.</p>
      <h2>Your Choices</h2>
      <p>You can control cookies through your browser settings. Where a consent message is shown, you can change your choices there at any time.</p>
      <h2>Children's Privacy</h2>
      <p>This site is not directed to children under the age required by applicable law, and it is not intended to knowingly collect personal information from children.</p>
      <h2>Changes to This Policy</h2>
      <p>This privacy policy may be updated from time to time to reflect changes to the site, legal requirements, or the services used. The updated version will be posted on this page with a revised effective date.</p>
      <h2>Contact</h2>
      <p>If you have privacy-related questions, please use the <a href="contact.html">contact page</a>.</p>`;

const termsBody = `      <h1>Terms of Use</h1>
      <p>Last updated: ${TERMS_UPDATED}</p>
      <p>By using this site, you agree to these terms. If you do not agree, please do not use the site.</p>
      <h2>Use of the Site</h2>
      <p>${SITE_NAME} is provided for general entertainment, informational, and personal-use purposes. You agree to use the site in a lawful way and not to interfere with its normal operation.</p>
      <h2>Content and Availability</h2>
      <p>The site includes quizzes, written content, descriptions, and other materials. Content may be updated, changed, removed, or expanded at any time without notice. The site does not guarantee that all pages or quizzes will always be available or error-free.</p>
      <h2>Intellectual Property</h2>
      <p>The original site content, including site text, page structure, written descriptions, and quiz formatting, may not be copied or republished without permission. All third-party names, titles, franchises, and trademarks remain the property of their respective owners and are used for identification and informational purposes only.</p>
      <h2>No Warranties</h2>
      <p>The site is provided on an "as is" and "as available" basis, without warranty of any kind.</p>
      <h2>Limitation of Liability</h2>
      <p>To the fullest extent permitted by law, ${SITE_NAME} will not be liable for any indirect, incidental, or consequential damages arising from use of the site.</p>
      <h2>Changes to These Terms</h2>
      <p>These terms may be updated from time to time. Continued use of the site after changes are posted means you accept the updated terms.</p>
      <h2>Contact</h2>
      <p>If you have questions about these terms, please visit the <a href="contact.html">contact page</a>.</p>`;

function blogPostPage(post) {
  const desc = post.snippet.slice(0, 160);
  const canonical = `${SITE_DOMAIN}/${post.file}`;
  return `${head(`${post.title} | ${SITE_NAME}`, desc, canonical)}
  <main class="container narrow">
    <p class="crumb"><a href="blog.html">Blog</a> &rsaquo; ${esc(post.title)}</p>
    <article class="panel blog-post">
${post.html}
    </article>
${relatedArticlesHTML(post)}
  </main>
  <script type="application/ld+json">${breadcrumbLd([
    { name: "Blog", url: SITE_DOMAIN + "/blog.html" },
    { name: post.title, url: canonical },
  ])}</script>
${footer()}`;
}

function blogIndexPage() {
  const cards = POSTS.map(
    (p) => `      <a class="card" href="${p.file}">
        <h2>${esc(p.title)}</h2>
        <p>${esc(p.snippet.slice(0, 150))}${p.snippet.length > 150 ? "…" : ""}</p>
        <span class="card-cta">Read article →</span>
      </a>`
  ).join("\n");
  const title = `Trivia Articles &amp; Blog | ${SITE_NAME}`;
  const desc = `Articles on what makes great trivia — the best topics, why certain shows, games and sports work so well, and how good quiz questions are written.`;
  return `${head(`Trivia Articles & Blog | ${SITE_NAME}`, desc, SITE_DOMAIN + "/blog.html")}
  <main class="container">
    <section class="hero">
      <h1>Trivia Articles &amp; Blog</h1>
      <p>A growing collection of articles on what makes a great trivia topic, why fans love it, and how good quiz questions come together.</p>
    </section>
    <section class="grid">
${cards}
    </section>
  </main>
${footer()}`;
}

// Client-side quick-search over all themes (matches the main app UX: focus
// shows every theme, typing filters by title, clicking a result opens the quiz).
// Theme list is baked in so it works on every static page with no fetch.
function searchScript() {
  const data = themes.map((t) => ({ title: t.title, url: `${urlSlug(t)}.html` }));
  return `/* GENERATED by build.js — do not edit by hand. */
(function () {
  var THEMES = ${JSON.stringify(data)};
  var input = document.getElementById("themeSearch");
  var results = document.getElementById("themeSearchResults");
  if (!input || !results) return;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function render(items) {
    if (!items.length) {
      results.innerHTML = '<div class="search-item search-empty">No results found</div>';
      return;
    }
    results.innerHTML = items.map(function (t) {
      return '<a class="search-item" href="' + t.url + '">' + esc(t.title) + "</a>";
    }).join("");
  }
  function open(items) { render(items); results.style.display = "block"; }
  function close() { results.style.display = "none"; }

  input.addEventListener("focus", function () { open(THEMES); });
  input.addEventListener("input", function () {
    var v = input.value.trim().toLowerCase();
    open(v ? THEMES.filter(function (t) { return t.title.toLowerCase().indexOf(v) > -1; }) : THEMES);
  });
  input.addEventListener("keydown", function (e) { if (e.key === "Escape") { input.blur(); close(); } });
  document.addEventListener("click", function (e) {
    if (!input.contains(e.target) && !results.contains(e.target)) close();
  });
})();
`;
}

function sitemap() {
  const urls = [
    "",
    ...themes.map((t) => `${urlSlug(t)}.html`),
    "blog.html",
    ...POSTS.map((p) => p.file),
    "about.html",
    "contact.html",
    "privacy.html",
    "terms.html",
  ];
  const today = new Date().toISOString().slice(0, 10);
  const body = urls
    .map((u) => `  <url><loc>${SITE_DOMAIN}/${u}</loc><lastmod>${today}</lastmod></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

// ---- write everything ------------------------------------------------------
let count = 0;
function w(file, content) {
  fs.writeFileSync(path.join(ROOT, file), content);
  count++;
}

themes.forEach((t) => {
  w(`${urlSlug(t)}.html`, themePage(t));
});
POSTS.forEach((p) => w(p.file, blogPostPage(p)));
w("blog.html", blogIndexPage());
w("index.html", indexPage());
w("about.html", infoPage("about", "About", aboutBody));
w("contact.html", infoPage("contact", "Contact", contactBody));
w("privacy.html", infoPage("privacy", "Privacy Policy", privacyBody));
w("terms.html", infoPage("terms", "Terms of Use", termsBody));
w("assets/search.js", searchScript());
w("sitemap.xml", sitemap());
w("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE_DOMAIN}/sitemap.xml\n`);
w("CNAME", `${SITE_DOMAIN.replace(/^https?:\/\//, "")}\n`); // GitHub Pages custom domain
w("ads.txt", `google.com, ${ADSENSE_CLIENT.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`); // AdSense authorized sellers

console.log(`Generated ${count} files for ${themes.length} themes.`);
