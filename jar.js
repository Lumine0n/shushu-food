/*
 * 口味罐：用 Matter.js 做的物理小球容器。
 *
 *   var jar = Jar.create(canvas, { onBallTap: function (id) {} });
 *   jar.addBall({ id, label, color, kind, from: { x, y } })  // kind: "normal" | "any" | "other"
 *   jar.removeBall(id)   // 小球弹出罐子
 *   jar.clear()
 *   jar.shake({ light })  // 返回 Promise，摇完后 resolve
 *
 * 如果 Matter.js 没加载成功（比如 CDN 被墙），会自动退化成普通的彩色标签。
 */
(function (root) {
  var reduceMotion = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FONT = '"Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif';

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function shade(hex, amount) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.min(255, Math.max(0, (n >> 16) + amount));
    var g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amount));
    var b = Math.min(255, Math.max(0, (n & 255) + amount));
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function splitLabel(text) {
    var chars = Array.from(text);
    if (chars.length <= 3) return [text];
    var half = Math.ceil(chars.length / 2);
    return [chars.slice(0, half).join(""), chars.slice(half).join("")];
  }

  // Font tracks radius linearly so a CSS scale() on the ghost matches canvas text.
  function fontSizeFor(r, label) {
    var lines = splitLabel(label);
    var longest = Math.max.apply(null, lines.map(function (l) { return Array.from(l).length; }));
    var size = Math.min(r * 0.52, (r * 1.45) / Math.max(longest, 1.6));
    if (lines.length > 1) size = Math.min(size, r * 0.42);
    return size;
  }

  // cubic-bezier(0.77, 0, 0.175, 1) — on-screen move, from --ease-in-out
  function easeInOut(t) {
    return cubicBezierY(0.77, 0, 0.175, 1, t);
  }

  function cubicBezierY(p1x, p1y, p2x, p2y, t) {
    var ax = 3 * p1x - 3 * p2x + 1;
    var bx = 3 * p2x - 6 * p1x;
    var cx = 3 * p1x;
    var ay = 3 * p1y - 3 * p2y + 1;
    var by = 3 * p2y - 6 * p1y;
    var cy = 3 * p1y;
    function xOf(u) { return ((ax * u + bx) * u + cx) * u; }
    function dxOf(u) { return (3 * ax * u + 2 * bx) * u + cx; }
    function yOf(u) { return ((ay * u + by) * u + cy) * u; }
    var u = t;
    for (var i = 0; i < 8; i++) {
      var x = xOf(u) - t;
      var d = dxOf(u);
      if (Math.abs(x) < 1e-5 || Math.abs(d) < 1e-6) break;
      u = Math.max(0, Math.min(1, u - x / d));
    }
    return yOf(u);
  }

  function paintGhost(el, ball, r0) {
    el.className = "flying-ball flying-" + ball.kind;
    el.style.width = el.style.height = r0 * 2 + "px";
    el.style.fontSize = fontSizeFor(r0, ball.label) + "px";
    el.style.backgroundColor = ball.kind === "any" ? "#d8d3ca" : shade(ball.color, 36);
    el.style.backgroundImage = "radial-gradient(ellipse 28% 16% at 36% 32%, rgba(255,255,255,0.22), transparent 70%)";
    el.innerHTML = "";
    splitLabel(ball.label).forEach(function (line) {
      var s = document.createElement("span");
      s.textContent = line;
      el.appendChild(s);
    });
  }

  // One object: radius (via scale) and type grow on the same ease-in-out.
  // Handoff only happens after overshoot settles at rEnd / fontSizeFor(rEnd).
  function flyDom(from, to, ball, rStart, rEnd) {
    var el = document.createElement("div");
    paintGhost(el, ball, rStart);
    document.body.appendChild(el);
    var sEnd = rEnd / rStart;
    var lift = Math.min(132, Math.max(64, Math.abs(to.y - from.y) * 0.42 + 48));
    var peak = Math.min(from.y, to.y) - lift;
    var frames = [];
    var steps = 32;
    for (var i = 0; i <= steps; i++) {
      var raw = i / steps;
      var t = easeInOut(raw);
      var x = from.x + (to.x - from.x) * t;
      var y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * peak + t * t * to.y;
      var s = 1 + (sEnd - 1) * t;
      frames.push({
        transform: "translate(" + (x - rStart) + "px," + (y - rStart) + "px) scale(" + s + ")",
        opacity: "1"
      });
    }
    function at(s, dy) {
      return "translate(" + (to.x - rStart) + "px," + (to.y - rStart + (dy || 0)) + "px) scale(" + s + ")";
    }
    return el.animate(frames, {
      duration: 520,
      easing: "linear",
      fill: "forwards"
    }).finished.then(function () {
      return el.animate(
        [
          { transform: at(sEnd, 0) },
          { transform: at(sEnd * 1.07, 3) },
          { transform: at(sEnd * 0.98, 0) },
          { transform: at(sEnd, 0) }
        ],
        { duration: 200, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" }
      ).finished;
    }).then(function () { return el; }, function () {
      if (el.parentNode) el.remove();
      return null;
    });
  }

  function createFallback(canvas, opts) {
    var box = document.getElementById("jarFallback");
    canvas.hidden = true;
    box.hidden = false;
    function chip(id) { return box.querySelector('[data-id="' + id + '"]'); }
    return {
      addBall: function (b) {
        var el = document.createElement("button");
        el.type = "button";
        el.className = "fallback-ball flying-" + b.kind;
        el.style.setProperty("--ball", b.color);
        el.dataset.id = b.id;
        el.textContent = b.label;
        el.onclick = function () { opts.onBallTap && opts.onBallTap(b.id); };
        box.appendChild(el);
        return Promise.resolve();
      },
      removeBall: function (id) { var el = chip(id); if (el) el.remove(); },
      clear: function () { box.innerHTML = ""; },
      shake: function (o) {
        box.classList.remove("wobble"); void box.offsetWidth; box.classList.add("wobble");
        return wait(o && o.light ? 450 : 900);
      }
    };
  }

  function create(canvas, opts) {
    opts = opts || {};
    if (!root.Matter) return createFallback(canvas, opts);

    var M = root.Matter;
    var engine = M.Engine.create({ gravity: { y: 1.1 }, enableSleeping: false });
    var world = engine.world;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(root.devicePixelRatio || 1, 2);
    var W = 0, H = 0, jar = null, walls = [];
    var balls = new Map();
    var cancelled = {};
    var shaking = 0;

    function layout() {
      var rect = canvas.parentElement.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var jw = Math.min(W * 0.84, 360);
      var jh = H - 26;
      jar = { x: (W - jw) / 2, y: 18, w: jw, h: jh, r: Math.min(46, jw * 0.18) };
      jar.scale = Math.max(0.72, Math.min(1, jw / 340));

      walls.forEach(function (w) { M.Composite.remove(world, w); });
      var t = 60;
      var opt = { isStatic: true, friction: 0.3, restitution: 0.4 };
      // Inset past the drawn stroke so a ball cannot rest half-outside the rim.
      walls = [
        M.Bodies.rectangle(jar.x - t / 2 + 10, jar.y + jh / 2 - 40, t, jh + 80, opt),
        M.Bodies.rectangle(jar.x + jw + t / 2 - 10, jar.y + jh / 2 - 40, t, jh + 80, opt),
        M.Bodies.rectangle(W / 2, jar.y + jh + t / 2 - 4, jw + t * 2, t, opt),
        M.Bodies.rectangle(jar.x + 14, jar.y + jh - 10, 40, 40, Object.assign({ angle: Math.PI / 4 }, opt)),
        M.Bodies.rectangle(jar.x + jw - 14, jar.y + jh - 10, 40, 40, Object.assign({ angle: Math.PI / 4 }, opt))
      ];
      M.Composite.add(world, walls);

      balls.forEach(function (b) {
        var p = b.body.position;
        if (p.x < jar.x || p.x > jar.x + jar.w || p.y > jar.y + jar.h) {
          M.Body.setPosition(b.body, { x: W / 2, y: jar.y + 20 });
        }
      });
    }

    function drawJarBack() {
      var j = jar;
      ctx.save();
      roundJar(j);
      ctx.fillStyle = "rgba(250, 248, 245, 0.32)";
      ctx.fill();
      ctx.restore();
    }

    function drawJarFront() {
      var j = jar;
      ctx.save();
      roundJar(j);
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = "rgba(26, 25, 22, 0.28)";
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(j.x - 6, j.y - 5, j.w + 12, 8, 2);
      ctx.strokeStyle = "rgba(26, 25, 22, 0.4)";
      ctx.lineWidth = 1.25;
      ctx.stroke();
      ctx.restore();
    }

    function roundJar(j) {
      ctx.beginPath();
      ctx.moveTo(j.x, j.y);
      ctx.lineTo(j.x, j.y + j.h - j.r);
      ctx.quadraticCurveTo(j.x, j.y + j.h, j.x + j.r, j.y + j.h);
      ctx.lineTo(j.x + j.w - j.r, j.y + j.h);
      ctx.quadraticCurveTo(j.x + j.w, j.y + j.h, j.x + j.w, j.y + j.h - j.r);
      ctx.lineTo(j.x + j.w, j.y);
    }

    function drawBall(b) {
      var p = b.body.position, r = b.r;
      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(b.body.angle);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      if (b.kind === "any") {
        ctx.fillStyle = "#d8d3ca";
      } else {
        ctx.fillStyle = shade(b.color, 36);
      }
      ctx.fill();
      ctx.globalAlpha = b.alpha;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(28, 25, 23, 0.18)";
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.ellipse(-r * 0.28, -r * 0.34, r * 0.14, r * 0.08, -0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.rotate(-b.body.angle);
      var lines = splitLabel(b.label);
      var size = fontSizeFor(r, b.label);
      ctx.font = "600 " + size + "px " + FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(28, 25, 23, 0.88)";
      lines.forEach(function (l, i) {
        var y = (i - (lines.length - 1) / 2) * size * 1.05;
        ctx.fillText(l, 0, y);
      });
      ctx.restore();
    }

    var last = performance.now();
    function frame(now) {
      var dt = Math.min(now - last, 1000 / 30);
      last = now;
      M.Engine.update(engine, dt);
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      if (shaking > 0) {
        var a = Math.sin(now / 45) * 0.035 * shaking;
        ctx.translate(W / 2, H);
        ctx.rotate(a);
        ctx.translate(-W / 2, -H);
      }
      drawJarBack();
      balls.forEach(drawBall);
      drawJarFront();
      ctx.restore();
      requestAnimationFrame(frame);
    }

    function toLocal(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    canvas.addEventListener("pointerdown", function (e) {
      var p = toLocal(e.clientX, e.clientY);
      var bodies = [];
      balls.forEach(function (b) { if (!b.leaving) bodies.push(b.body); });
      var hit = M.Query.point(bodies, p)[0];
      if (hit && opts.onBallTap) opts.onBallTap(hit.plugin.ballId);
    });

    var resizeTimer;
    function relayout() {
      var rect = canvas.parentElement.getBoundingClientRect();
      if (Math.abs(rect.width - W) < 1 && Math.abs(rect.height - H) < 1) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layout, 120);
    }
    if (root.ResizeObserver) new ResizeObserver(relayout).observe(canvas.parentElement);
    else root.addEventListener("resize", relayout);

    layout();
    requestAnimationFrame(frame);

    function ballRadius(label) {
      var n = Array.from(label).length;
      return Math.round((n <= 1 ? 30 : n <= 2 ? 34 : n <= 4 ? 40 : 44) * jar.scale);
    }

    return {
      addBall: function (spec) {
        var r = ballRadius(spec.label);
        var rStart = Math.max(20, Math.round(r * 0.62));
        var ball = { id: spec.id, label: spec.label, color: spec.color, kind: spec.kind || "normal", r: r, alpha: 1 };
        var rect = canvas.getBoundingClientRect();
        var pad = r + 14;
        var innerL = jar.x + pad;
        var innerR = jar.x + jar.w - pad;
        var targetX = Math.max(innerL, Math.min(innerR, jar.x + jar.w / 2 + (Math.random() - 0.5) * (innerR - innerL) * 0.6));
        // Whole sphere below the rim — never spawn sitting on the lip.
        var targetY = jar.y + r + 16;
        var fly = (!reduceMotion && spec.from)
          ? flyDom(spec.from, { x: rect.left + targetX, y: rect.top + targetY }, ball, rStart, r)
          : Promise.resolve(null);
        return fly.then(function (ghost) {
          if (cancelled[spec.id]) {
            delete cancelled[spec.id];
            if (ghost) ghost.remove();
            return;
          }
          ball.body = M.Bodies.circle(targetX, reduceMotion ? jar.y + jar.h - r * 2 : targetY, r, {
            restitution: reduceMotion ? 0.04 : 0.12,
            friction: 0.16,
            frictionAir: 0.03,
            density: 0.002,
            plugin: { ballId: spec.id }
          });
          M.Body.setVelocity(ball.body, { x: (Math.random() - 0.5) * 0.5, y: reduceMotion ? 0 : 2.8 });
          M.Body.setAngularVelocity(ball.body, (Math.random() - 0.5) * 0.04);
          if (reduceMotion) ball.alpha = 0;
          var old = balls.get(spec.id);
          if (old) removeNow(old);
          balls.set(spec.id, ball);
          M.Composite.add(world, ball.body);
          if (ghost) {
            requestAnimationFrame(function () { ghost.remove(); });
          }
          if (reduceMotion) fadeTo(ball, 1, 220);
        });
      },
      removeBall: function (id) {
        var b = balls.get(id);
        if (!b) { cancelled[id] = true; return; }
        if (b.leaving) return;
        b.leaving = true;
        b.body.collisionFilter = { group: -1, category: 0, mask: 0 };
        if (!reduceMotion) {
          M.Body.setVelocity(b.body, { x: (b.body.position.x < W / 2 ? -1 : 1) * 6, y: -16 });
          M.Body.setAngularVelocity(b.body, 0.3);
        }
        fadeTo(b, 0, reduceMotion ? 250 : 650).then(function () { removeNow(b); });
      },
      clear: function () {
        var self = this;
        Array.from(balls.keys()).forEach(function (id) { self.removeBall(id); });
      },
      shake: function (o) {
        var light = o && o.light;
        if (reduceMotion) {
          canvas.classList.remove("fade-pulse"); void canvas.offsetWidth; canvas.classList.add("fade-pulse");
          return wait(500);
        }
        var duration = light ? 650 : 1500;
        var start = performance.now();
        var lid = M.Bodies.rectangle(W / 2, jar.y - 28, jar.w + 120, 60, { isStatic: true, restitution: 0.5 });
        M.Composite.add(world, lid);
        var kick = setInterval(function () {
          balls.forEach(function (b) {
            if (b.leaving) return;
            M.Body.setVelocity(b.body, {
              x: (Math.random() - 0.5) * (light ? 8 : 14),
              y: -(Math.random() * (light ? 5 : 9) + (light ? 3 : 5))
            });
            M.Body.setAngularVelocity(b.body, (Math.random() - 0.5) * 0.6);
          });
        }, light ? 220 : 170);
        return new Promise(function (resolve) {
          (function tick() {
            var t = (performance.now() - start) / duration;
            shaking = t < 1 ? Math.sin(Math.PI * t) * (light ? 0.6 : 1) : 0;
            if (t < 1) requestAnimationFrame(tick);
            else {
              clearInterval(kick);
              setTimeout(function () { M.Composite.remove(world, lid); resolve(); }, 250);
            }
          })();
        });
      }
    };

    function removeNow(b) {
      M.Composite.remove(world, b.body);
      if (balls.get(b.id) === b) balls.delete(b.id);
    }

    function fadeTo(b, target, ms) {
      var from = b.alpha, start = performance.now();
      return new Promise(function (resolve) {
        (function step() {
          var t = Math.min(1, (performance.now() - start) / ms);
          b.alpha = from + (target - from) * t;
          if (t < 1) requestAnimationFrame(step); else resolve();
        })();
      });
    }
  }

  root.Jar = { create: create, reduceMotion: reduceMotion };
})(window);
