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
const SITE_NAME = "Trivia Nest";                 // <-- change to your brand
const SITE_DOMAIN = "https://example.com";        // <-- change to your domain (no trailing slash)
const QUESTIONS_PER_QUIZ = 20;
// AdSense publisher id, e.g. "ca-pub-1234567890123456". Leave "" until approved.
const ADSENSE_CLIENT = "";
// ---------------------------------------------------------------------------

const ROOT = __dirname;
const themes = JSON.parse(fs.readFileSync(path.join(ROOT, "data/themes.json"), "utf8"));

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function adsenseHead() {
  if (!ADSENSE_CLIENT) return "";
  return `  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>\n`;
}

function head(title, description, canonical) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:type" content="website" />
${adsenseHead()}  <link rel="stylesheet" href="assets/style.css" />
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a class="brand" href="index.html">${esc(SITE_NAME)}</a>
      <nav class="nav">
        <a href="index.html">Quizzes</a>
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

// Pick the first N questions that have valid options + a matchable answer.
function pickQuestions(file) {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
  const valid = raw.filter(
    (q) => q && q.question && Array.isArray(q.options) && q.options.length >= 2 && q.options.includes(q.answer)
  );
  return valid.slice(0, QUESTIONS_PER_QUIZ);
}

function quizHTML(questions) {
  const blocks = questions
    .map((q, i) => {
      const correct = q.options.indexOf(q.answer);
      const opts = q.options
        .map(
          (o, j) =>
            `        <button class="opt" type="button" data-idx="${j}">${esc(o)}</button>`
        )
        .join("\n");
      return `    <div class="q" data-answer="${correct}" data-i="${i}">
      <p class="q-text"><span class="q-num">Q${i + 1}.</span> ${esc(q.question)}</p>
      <div class="opts">
${opts}
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

function themePage(t) {
  const questions = pickQuestions(t.questionFile);
  const title = `${t.title} Trivia Quiz – ${questions.length} Questions | ${SITE_NAME}`;
  const desc =
    t.seoIntro ||
    t.description ||
    `Test your knowledge with this ${t.title} trivia quiz.`;
  const canonical = `${SITE_DOMAIN}/${t.slug}.html`;

  const intro = [t.seoIntro, t.seoDetail].filter(Boolean).map((p) => `      <p>${esc(p)}</p>`).join("\n");

  // FAQ-ish supporting block adds original text + a JSON-LD Quiz hint.
  return `${head(title, desc, canonical)}
  <main class="container">
    <article>
      <p class="crumb"><a href="index.html">Quizzes</a> &rsaquo; ${esc(t.title)}</p>
      <h1>${esc(t.title)} Trivia Quiz</h1>
      <div class="intro">
${intro}
      </div>

${quizHTML(questions)}

      <section class="about-quiz">
        <h2>About this ${esc(t.title)} quiz</h2>
        <p>This quiz includes ${questions.length} multiple-choice questions covering a range of difficulty. Pick an answer for each question to see if you got it right, then get your final score at the end. There is no time limit, so take it at your own pace and replay it as many times as you like.</p>
      </section>
    </article>
  </main>
  <script src="assets/quiz.js"></script>
${footer()}`;
}

function indexPage() {
  const cards = themes
    .map((t) => {
      const blurb = t.seoIntro || t.description || "";
      return `      <a class="card" href="${t.slug}.html">
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
      <p>${SITE_NAME} is a trivia website built for people who enjoy testing their knowledge of the shows, films, and games they love. Each quiz is themed around a specific topic and made up of multiple-choice questions, so you can jump in, play, and get a score in just a few minutes.</p>
      <h2>What the site focuses on</h2>
      <p>The site is built around themed quizzes with a strong focus on entertainment and fandom topics. The aim is to create quizzes that are enjoyable for casual players but still rewarding for people who know a topic well and want something more detailed.</p>
      <h2>How quizzes are created</h2>
      <p>Quiz sets are organised around specific themes, franchises, and categories. Depending on the topic, questions may cover characters, storylines, locations, facts, cultural moments, or other recognisable details connected to the subject. Short descriptions are added to help visitors understand what each quiz covers before they start playing.</p>
      <h2>Ongoing updates</h2>
      <p>The site grows over time with new quizzes and additional supporting content. New themes are added regularly and existing quizzes are reviewed and improved.</p>
      <h2>Contact</h2>
      <p>If you want to get in touch about the site, feedback, or corrections, visit the <a href="contact.html">contact page</a>.</p>`;

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
      <p>Last updated: ${new Date().toISOString().slice(0, 10)}</p>
      <p>${SITE_NAME} respects your privacy. This page explains what information may be collected when you use this site, how that information is used, and what choices you have.</p>
      <h2>Information We May Collect</h2>
      <p>When you use this site, certain information may be collected automatically, including browser type, device information, pages visited, approximate location, referral source, and general usage activity. If you contact the site by email or through a contact form, the information you provide may also be collected.</p>
      <h2>Analytics</h2>
      <p>This site may use analytics tools such as Google Analytics to understand how visitors use the site and how it can be improved. These tools may use cookies or similar technologies to collect usage data.</p>
      <h2>Advertising and Cookies</h2>
      <p>This site may display advertisements through Google AdSense or other advertising partners. Third-party vendors, including Google, may use cookies to serve ads based on a user's prior visits to this website or other websites.</p>
      <p>Google's use of advertising cookies enables it and its partners to serve ads based on your visit to this site and/or other sites on the internet. Users may be able to manage ad personalisation and cookie preferences through Google's ad settings and through the consent options shown on this site where required.</p>
      <p>In regions where consent is required, this site uses a consent message to give users choices about cookies and advertising-related data processing.</p>
      <h2>How Information Is Used</h2>
      <p>Information collected through the site may be used to operate the site, improve performance, understand which quizzes and pages are most useful, respond to messages, prevent abuse, and support advertising or analytics functions.</p>
      <h2>Your Choices</h2>
      <p>You can control cookies through your browser settings. Where applicable, you may also manage your consent choices through the consent banner or privacy settings presented on the site.</p>
      <h2>Children's Privacy</h2>
      <p>This site is not directed to children under the age required by applicable law, and it is not intended to knowingly collect personal information from children.</p>
      <h2>Changes to This Policy</h2>
      <p>This privacy policy may be updated from time to time to reflect changes to the site, legal requirements, or the services used. The updated version will be posted on this page with a revised effective date.</p>
      <h2>Contact</h2>
      <p>If you have privacy-related questions, please use the <a href="contact.html">contact page</a>.</p>`;

const termsBody = `      <h1>Terms of Use</h1>
      <p>Last updated: ${new Date().toISOString().slice(0, 10)}</p>
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

function sitemap() {
  const urls = ["", ...themes.map((t) => `${t.slug}.html`), "about.html", "contact.html", "privacy.html", "terms.html"];
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

themes.forEach((t) => w(`${t.slug}.html`, themePage(t)));
w("index.html", indexPage());
w("about.html", infoPage("about", "About", aboutBody));
w("contact.html", infoPage("contact", "Contact", contactBody));
w("privacy.html", infoPage("privacy", "Privacy Policy", privacyBody));
w("terms.html", infoPage("terms", "Terms of Use", termsBody));
w("sitemap.xml", sitemap());
w("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE_DOMAIN}/sitemap.xml\n`);

console.log(`Generated ${count} files for ${themes.length} themes.`);
