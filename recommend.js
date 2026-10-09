/*
 * 推荐逻辑（纯函数：同样的输入永远得到同样的输出，方便测试）。
 *
 * 用法：
 *   recommend(foods, questions, answers, { random, exclude })
 *     foods     data/foods.json 里的数组
 *     questions questions.js 里的 QUESTIONS
 *     answers   用户的选择，比如 { protein: "牛肉", flavor: "__any" }
 *     random    （可选）返回 0~1 的函数，测试时可以传固定值
 *     exclude   （可选）不想再看到的菜 id 列表，“换一个”时用
 *
 * 返回：{ food, matched, relaxed } 或 null（清单为空时）
 *   matched  这道菜命中了哪些题
 *   relaxed  为了找到菜，放宽了哪些题
 */
(function (root) {
  var SKIP = ["__any", "__other"];

  function findOption(question, value) {
    for (var i = 0; i < question.options.length; i++) {
      if (question.options[i].value === value) return question.options[i];
    }
    return null;
  }

  function matches(food, question, value) {
    var option = findOption(question, value);
    var actual = food[question.field];
    var rule = option && option.match;
    if (rule && "not" in rule) return actual !== undefined && actual !== rule.not;
    if (rule && "min" in rule) {
      return typeof actual === "number" && actual >= rule.min && actual < rule.max;
    }
    if (Array.isArray(actual)) return actual.indexOf(value) !== -1;
    return actual === value;
  }

  function activeQuestions(questions, answers) {
    return questions.filter(function (q) {
      var v = answers[q.id];
      return v !== undefined && v !== null && SKIP.indexOf(v) === -1;
    });
  }

  function pickWeighted(list, random) {
    var total = 0;
    list.forEach(function (f) { total += f.mentions || 1; });
    var r = random() * total;
    for (var i = 0; i < list.length; i++) {
      r -= list[i].mentions || 1;
      if (r < 0) return list[i];
    }
    return list[list.length - 1];
  }

  function recommend(foods, questions, answers, opts) {
    opts = opts || {};
    var random = opts.random || Math.random;
    var exclude = opts.exclude || [];
    var pool = foods.filter(function (f) { return exclude.indexOf(f.id) === -1; });
    if (pool.length === 0) pool = foods.slice();
    if (pool.length === 0) return null;

    var active = activeQuestions(questions, answers);
    var relaxOrder = active.slice().sort(function (a, b) {
      return (b.relaxRank || 0) - (a.relaxRank || 0);
    });

    // 逐步放宽：先要求全部命中，不行就按 relaxRank 依次去掉一个条件
    for (var dropped = 0; dropped <= relaxOrder.length; dropped++) {
      var required = relaxOrder.slice(dropped);
      var candidates = pool.filter(function (f) {
        return required.every(function (q) { return matches(f, q, answers[q.id]); });
      });
      if (candidates.length === 0) continue;

      // 被放宽的条件里如果碰巧也命中，就更优先
      var scored = candidates.map(function (f) {
        var score = active.filter(function (q) { return matches(f, q, answers[q.id]); }).length;
        return { food: f, score: score };
      });
      var best = Math.max.apply(null, scored.map(function (s) { return s.score; }));
      var top = scored.filter(function (s) { return s.score === best; })
        .map(function (s) { return s.food; });
      var food = pickWeighted(top, random);

      var matched = [];
      var relaxed = [];
      active.forEach(function (q) {
        (matches(food, q, answers[q.id]) ? matched : relaxed).push(q.id);
      });
      return { food: food, matched: matched, relaxed: relaxed };
    }
    return null;
  }

  var api = { recommend: recommend, matches: matches, activeQuestions: activeQuestions };
  if (typeof module !== "undefined") module.exports = api;
  else root.Recommend = api;
})(this);
