/*
 * All questions shown on one page (good for readers and crawlers).
 * Each question is answerable independently: click an option to see if it
 * was right, and a running score + final summary updates as you go.
 * Without JS every question + its options is still visible plain text
 * (the correct answer lives in data-answer and is only revealed on click).
 */
(function () {
  var quiz = document.querySelector(".quiz");
  if (!quiz) return;

  var questions = Array.prototype.slice.call(quiz.querySelectorAll(".q"));
  var results = quiz.querySelector(".quiz-results");
  var total = questions.length;
  if (!total) return;

  var answered = 0;
  var score = 0;

  // running progress bar pinned at the top of the quiz
  var bar = document.createElement("div");
  bar.className = "quiz-bar";
  bar.innerHTML = '<span class="quiz-progress"></span><span class="quiz-score"></span>';
  quiz.insertBefore(bar, quiz.firstChild);
  var progressEl = bar.querySelector(".quiz-progress");
  var scoreEl = bar.querySelector(".quiz-score");

  function updateBar() {
    progressEl.textContent = "Answered " + answered + " of " + total;
    scoreEl.textContent = "Score: " + score;
  }

  function maybeFinish() {
    if (answered < total) return;
    results.querySelector(".score-num").textContent = score;
    var pct = Math.round((score / total) * 100);
    var msg =
      pct === 100 ? "Perfect score! You really know this one." :
      pct >= 70 ? "Great job — strong knowledge." :
      pct >= 40 ? "Not bad! Give it another go to beat your score." :
      "Plenty of room to improve — try again!";
    results.querySelector(".score-msg").textContent = msg;
    results.hidden = false;
    results.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  questions.forEach(function (q) {
    var answer = parseInt(q.getAttribute("data-answer"), 10);
    var opts = Array.prototype.slice.call(q.querySelectorAll(".opt"));
    opts.forEach(function (opt) {
      opt.addEventListener("click", function () {
        if (q.dataset.done) return;
        q.dataset.done = "1";
        answered++;
        var chosen = parseInt(opt.getAttribute("data-idx"), 10);
        if (chosen === answer) score++;
        opts.forEach(function (o, idx) {
          o.disabled = true;
          if (idx === answer) o.classList.add("correct");
          else if (idx === chosen) o.classList.add("wrong");
        });
        updateBar();
        maybeFinish();
      });
    });
  });

  results.querySelector(".restart").addEventListener("click", function () {
    answered = 0; score = 0;
    questions.forEach(function (q) {
      delete q.dataset.done;
      q.querySelectorAll(".opt").forEach(function (o) {
        o.disabled = false;
        o.classList.remove("correct", "wrong");
      });
    });
    results.hidden = true;
    updateBar();
    quiz.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  updateBar();
})();
