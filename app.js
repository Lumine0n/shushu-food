/*
 * 页面流程：一次显示一道题 → 选项变成小球掉进罐子 → 摇一摇 → 推荐卡片。
 * 推荐怎么算在 recommend.js，题目在 questions.js，小球物理在 jar.js。
 */
(function () {
  var ANY = "__any";
  var OTHER = "__other";
  var ISSUE_URL = "https://github.com/Lumine0n/shushu-food/issues/new?template=recommend-food.yml";

  var state = {
    foods: [],
    answers: {},
    balls: {},
    index: 0,
    seen: [],
    current: null,
    busy: false
  };

  var $card = document.getElementById("card");
  var $progress = document.getElementById("progress");
  var $sheet = document.getElementById("sheet");
  var $backdrop = document.getElementById("sheetBackdrop");
  var $result = document.getElementById("result");
  var $jarWrap = document.getElementById("jarWrap");

  var jar = Jar.create(document.getElementById("jarCanvas"), { onBallTap: onBallTap });

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function optionOf(q, value) {
    return q.options.filter(function (o) { return o.value === value; })[0];
  }

  function allAnswered() {
    return QUESTIONS.every(function (q) { return q.id in state.answers; });
  }

  function renderProgress() {
    $progress.innerHTML = "";
    QUESTIONS.forEach(function (q, i) {
      var li = el("li");
      li.style.setProperty("--c", q.color);
      if (q.id in state.answers) li.classList.add("done");
      if (i === state.index && !allAnswered()) li.classList.add("now");
      var b = el("button", "", q.name);
      b.type = "button";
      b.setAttribute("aria-label", "第 " + (i + 1) + " 题：" + q.name);
      b.onclick = function () { goTo(i); };
      li.appendChild(b);
      $progress.appendChild(li);
    });
  }

  function swapCard(build) {
    $card.classList.remove("enter");
    void $card.offsetWidth;
    $card.innerHTML = "";
    build($card);
    $card.classList.add("enter");
    renderProgress();
  }

  function renderQuestion() {
    var q = QUESTIONS[state.index];
    swapCard(function (card) {
      card.style.setProperty("--c", q.color);
      card.appendChild(el("p", "step", "第 " + (state.index + 1) + " / " + QUESTIONS.length + " 题"));
      card.appendChild(el("h2", "question", q.title));
      var grid = el("div", "options");
      q.options.forEach(function (o) {
        var b = el("button", "pill");
        b.type = "button";
        if (o.value === ANY) b.classList.add("pill-any");
        if (o.value === OTHER) b.classList.add("pill-other");
        if (state.answers[q.id] === o.value) b.classList.add("picked");
        b.appendChild(el("span", "pill-icon", o.icon || ""));
        b.appendChild(el("span", "", o.label));
        b.onclick = function () { pick(q, o, b); };
        grid.appendChild(b);
      });
      card.appendChild(grid);
      var nav = el("div", "card-nav");
      if (state.index > 0) {
        var back = el("button", "link-btn", "← 上一题");
        back.type = "button";
        back.onclick = function () { goTo(state.index - 1); };
        nav.appendChild(back);
      }
      if (allAnswered()) {
        var done = el("button", "link-btn", "去摇罐子 →");
        done.type = "button";
        done.onclick = renderReady;
        nav.appendChild(done);
      }
      card.appendChild(nav);
    });
  }

  function renderReady() {
    state.index = QUESTIONS.length;
    swapCard(function (card) {
      card.style.removeProperty("--c");
      card.appendChild(el("p", "step", "全部选好啦"));
      card.appendChild(el("h2", "question", "罐子装满了，摇一摇看看今天吃什么"));
      var btn = el("button", "shake-btn", "摇一摇出结果");
      btn.type = "button";
      btn.id = "shakeBtn";
      btn.onclick = reveal;
      card.appendChild(btn);
      card.appendChild(el("p", "sub", "手机上也可以直接晃一晃手机"));
      var nav = el("div", "card-nav");
      var back = el("button", "link-btn", "← 改一改");
      back.type = "button";
      back.onclick = function () { goTo(QUESTIONS.length - 1); };
      nav.appendChild(back);
      card.appendChild(nav);
    });
  }

  function goTo(i) {
    state.index = i;
    if (i >= QUESTIONS.length) renderReady(); else renderQuestion();
  }

  function nextUnanswered(from) {
    for (var k = 0; k < QUESTIONS.length; k++) {
      var i = (from + k) % QUESTIONS.length;
      if (!(QUESTIONS[i].id in state.answers)) return i;
    }
    return -1;
  }

  function pick(q, o, button) {
    askMotionPermission();
    if (state.answers[q.id] === o.value) {
      advance();
      return;
    }
    if (state.balls[q.id]) jar.removeBall(state.balls[q.id]);
    state.answers[q.id] = o.value;
    var ballId = q.id + "-" + Date.now();
    state.balls[q.id] = ballId;

    Array.prototype.forEach.call(button.parentNode.children, function (b) { b.classList.remove("picked"); });
    button.classList.add("picked");
    var r = button.getBoundingClientRect();
    jar.addBall({
      id: ballId,
      label: o.value === OTHER ? "其他" : o.value === ANY ? "都行" : (o.short || o.label),
      color: o.value === OTHER ? "#A7A3B5" : q.color,
      kind: o.value === ANY ? "any" : o.value === OTHER ? "other" : "normal",
      from: { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    });
    setTimeout(advance, Jar.reduceMotion ? 150 : 380);
  }

  function advance() {
    var n = nextUnanswered(state.index + 1);
    if (n === -1) renderReady(); else goTo(n);
  }

  function onBallTap(ballId) {
    var qid = Object.keys(state.balls).filter(function (k) { return state.balls[k] === ballId; })[0];
    if (!qid || state.busy) return;
    jar.removeBall(ballId);
    delete state.balls[qid];
    delete state.answers[qid];
    closeSheet();
    goTo(QUESTIONS.map(function (q) { return q.id; }).indexOf(qid));
  }

  function reveal() {
    if (state.busy) return;
    state.busy = true;
    var btn = document.getElementById("shakeBtn");
    if (btn) { btn.disabled = true; btn.textContent = "摇啊摇……"; }
    $jarWrap.classList.add("shaking");
    jar.shake().then(function () {
      $jarWrap.classList.remove("shaking");
      state.seen = [];
      showResult(Recommend.recommend(state.foods, QUESTIONS, state.answers));
      if (btn) { btn.disabled = false; btn.textContent = "再摇一次"; }
      state.busy = false;
    });
  }

  function another() {
    if (state.busy || !state.current) return;
    state.busy = true;
    state.seen.push(state.current.food.id);
    $result.classList.add("flip-out");
    jar.shake({ light: true }).then(function () {
      showResult(Recommend.recommend(state.foods, QUESTIONS, state.answers, { exclude: state.seen }));
      state.busy = false;
    });
  }

  function restart() {
    Object.keys(state.balls).forEach(function (k) { jar.removeBall(state.balls[k]); });
    jar.clear();
    state.answers = {};
    state.balls = {};
    state.seen = [];
    closeSheet();
    goTo(0);
  }

  function showResult(r) {
    state.current = r;
    $result.innerHTML = "";
    $result.classList.remove("flip-out");
    void $result.offsetWidth;
    $result.classList.add("pop-in");
    if (!r) {
      $result.appendChild(el("h2", "result-food", "清单还是空的"));
      $result.appendChild(el("p", "result-reason", "先去 data/foods.json 里加几道菜吧。"));
      openSheet();
      return;
    }
    var f = r.food;
    $result.appendChild(el("p", "result-kicker", "今天就吃这个"));
    var h = el("h2", "result-food", f.food);
    h.id = "resultFood";
    $result.appendChild(h);
    $result.appendChild(el("p", "result-place", f.place));

    var meta = el("dl", "result-meta");
    [["地址", f.address], ["人均", "约 " + f.price + " 元"]].forEach(function (pair) {
      meta.appendChild(el("dt", "", pair[0]));
      meta.appendChild(el("dd", "", pair[1]));
    });
    $result.appendChild(meta);
    $result.appendChild(el("p", "result-reason", f.reason));

    var chips = el("div", "chips");
    QUESTIONS.forEach(function (q) {
      var v = state.answers[q.id];
      if (v === undefined || v === ANY || v === OTHER) return;
      var hit = r.matched.indexOf(q.id) !== -1;
      var c = el("span", "chip " + (hit ? "chip-hit" : "chip-miss"), (hit ? "✓ " : "≈ ") + optionOf(q, v).label);
      c.style.setProperty("--c", q.color);
      chips.appendChild(c);
    });
    if (chips.children.length) $result.appendChild(chips);

    if (r.relaxed.length) {
      var names = r.relaxed.map(function (id) {
        return QUESTIONS.filter(function (q) { return q.id === id; })[0].name;
      });
      $result.appendChild(el("p", "relaxed", "没找到完全符合的，帮你放宽了：" + names.join("、")));
    }

    var tags = el("p", "tags", f.tags.map(function (t) { return "#" + t; }).join("  "));
    $result.appendChild(tags);

    var src = el("p", "source");
    src.appendChild(document.createTextNode("来源："));
    if (f.sourceUrl) {
      var a = el("a", "", f.source);
      a.href = f.sourceUrl; a.target = "_blank"; a.rel = "noopener";
      src.appendChild(a);
    } else {
      src.appendChild(document.createTextNode(f.source));
    }
    $result.appendChild(src);

    var actions = el("div", "actions");
    var again = el("button", "btn btn-main", "换一个");
    again.type = "button"; again.onclick = another;
    var reset = el("button", "btn btn-ghost", "重新选");
    reset.type = "button"; reset.onclick = restart;
    actions.appendChild(again);
    actions.appendChild(reset);
    $result.appendChild(actions);

    var share = el("a", "suggest", "知道一道好吃的？推荐给我们");
    share.href = ISSUE_URL; share.target = "_blank"; share.rel = "noopener";
    $result.appendChild(share);
    openSheet();
  }

  function openSheet() {
    $sheet.hidden = false;
    $backdrop.hidden = false;
    requestAnimationFrame(function () {
      $sheet.classList.add("open");
      $backdrop.classList.add("open");
    });
  }

  function closeSheet() {
    $sheet.classList.remove("open");
    $backdrop.classList.remove("open");
    setTimeout(function () {
      if (!$sheet.classList.contains("open")) { $sheet.hidden = true; $backdrop.hidden = true; }
    }, 420);
  }
  $backdrop.onclick = closeSheet;
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });

  // 真的摇手机也能出结果（iOS 需要先在点击时申请权限）
  var motionAsked = false;
  function askMotionPermission() {
    if (motionAsked) return;
    motionAsked = true;
    var D = window.DeviceMotionEvent;
    if (D && typeof D.requestPermission === "function") D.requestPermission().catch(function () {});
  }
  var lastShake = 0;
  window.addEventListener("devicemotion", function (e) {
    var a = e.accelerationIncludingGravity;
    if (!a || !allAnswered() || state.busy) return;
    var force = Math.abs(a.x || 0) + Math.abs(a.y || 0) + Math.abs(a.z || 0);
    var now = Date.now();
    if (force > 32 && now - lastShake > 2500) {
      lastShake = now;
      if ($sheet.classList.contains("open")) another(); else reveal();
    }
  });

  fetch("data/foods.json")
    .then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); })
    .then(function (foods) {
      state.foods = foods;
      goTo(0);
    })
    .catch(function () {
      swapCard(function (card) {
        card.appendChild(el("h2", "question", "菜单没加载出来"));
        card.appendChild(el("p", "sub",
          "如果你是直接双击打开的 index.html，浏览器会拦住读取 data/foods.json。" +
          "请在项目文件夹里运行  python3 -m http.server 8000 ，再打开 http://localhost:8000 。"));
      });
    });
})();
