/*
 * Progressive-enhancement quiz.
 * Without JS: every question + its options is visible plain text (good for
 * crawlers; the correct answer is never shown, it lives in data-answer).
 * With JS: one question at a time, click to answer, score at the end.
 */
(function () {
  var quiz = document.querySelector(".quiz");
  if (!quiz) return;

  var questions = Array.prototype.slice.call(quiz.querySelectorAll(".q"));
  var results = quiz.querySelector(".quiz-results");
  var total = questions.length;
  if (!total) return;

  var current = 0;
  var score = 0;

  // progress bar
  var bar = document.createElement("div");
  bar.className = "quiz-bar";
  bar.innerHTML = '<span class="quiz-progress"></span><span class="quiz-score"></span>';
  quiz.insertBefore(bar, quiz.firstChild);
  var progressEl = bar.querySelector(".quiz-progress");
  var scoreEl = bar.querySelector(".quiz-score");

  // next button (shared)
  var nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "btn quiz-next";
  nextBtn.textContent = "Next question";
  nextBtn.hidden = true;

  function updateBar() {
    progressEl.textContent = "Question " + (current + 1) + " of " + total;
    scoreEl.textContent = "Score: " + score;
  }

  function show(i) {
    questions.forEach(function (q, idx) {
      q.classList.toggle("is-hidden", idx !== i);
    });
    nextBtn.hidden = true;
    nextBtn.textContent = i === total - 1 ? "See results" : "Next question";
    updateBar();
  }

  function finish() {
    questions.forEach(function (q) { q.classList.add("is-hidden"); });
    bar.style.display = "none";
    nextBtn.remove();
    results.querySelector(".score-num").textContent = score;
    var pct = Math.round((score / total) * 100);
    var msg =
      pct === 100 ? "Perfect score! You really know this one." :
      pct >= 70 ? "Great job — strong knowledge." :
      pct >= 40 ? "Not bad! Give it another go to beat your score." :
      "Plenty of room to improve — try again!";
    results.querySelector(".score-msg").textContent = msg;
    results.hidden = false;
  }

  nextBtn.addEventListener("click", function () {
    current++;
    if (current >= total) { finish(); return; }
    show(current);
  });

  questions.forEach(function (q) {
    var answer = parseInt(q.getAttribute("data-answer"), 10);
    var opts = Array.prototype.slice.call(q.querySelectorAll(".opt"));
    opts.forEach(function (opt) {
      opt.addEventListener("click", function () {
        if (q.dataset.done) return;
        q.dataset.done = "1";
        var chosen = parseInt(opt.getAttribute("data-idx"), 10);
        if (chosen === answer) { score++; }
        opts.forEach(function (o, idx) {
          o.disabled = true;
          if (idx === answer) o.classList.add("correct");
          else if (idx === chosen) o.classList.add("wrong");
        });
        updateBar();
        q.appendChild(nextBtn);
        nextBtn.hidden = false;
      });
    });
  });

  // restart
  results.querySelector(".restart").addEventListener("click", function () {
    current = 0; score = 0;
    questions.forEach(function (q) {
      delete q.dataset.done;
      q.querySelectorAll(".opt").forEach(function (o) {
        o.disabled = false;
        o.classList.remove("correct", "wrong");
      });
    });
    results.hidden = true;
    bar.style.display = "";
    show(0);
  });

  show(0);
})();
