/* ============================================================
   Kalyanam Krafts — page behaviour (vanilla JS + Bootstrap)
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, root) {
    return (root || document).querySelector(sel);
  };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };
  var clamp = function (v, a, b) {
    return Math.max(a, Math.min(b, v));
  };

  /* ---------- smooth (inertia) scrolling ---------- */
  var Smooth = (function () {
    var target = window.scrollY,
      current = window.scrollY,
      running = false,
      ease = 0.1,
      locked = false,
      lastSet = null; // the position the glide itself last scrolled to
    var fine = window.matchMedia('(pointer: fine)').matches;

    function maxScroll() {
      return document.documentElement.scrollHeight - window.innerHeight;
    }
    function loop() {
      current += (target - current) * ease;
      if (Math.abs(target - current) < 0.5) {
        current = target;
        running = false;
      }
      window.scrollTo(0, current);
      lastSet = window.scrollY;
      if (running) requestAnimationFrame(loop);
    }
    function start() {
      if (!running) {
        running = true;
        requestAnimationFrame(loop);
      }
    }

    function onWheel(e) {
      if (locked || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.target.closest && e.target.closest('.offcanvas, .viewer')) return;
      e.preventDefault();
      if (!running) current = window.scrollY;
      var d =
        e.deltaMode === 1
          ? e.deltaY * 40
          : e.deltaMode === 2
            ? e.deltaY * window.innerHeight
            : e.deltaY;
      ease = 0.1;
      target = clamp(target + d, 0, maxScroll());
      start();
    }

    if (fine && !reduceMotion) {
      document.documentElement.classList.add('smooth-scroll');
      window.addEventListener('wheel', onWheel, { passive: false });
    }
    // keyboard, scrollbar, touch or a jump link moved the page: follow it,
    // and if that happened mid-glide, stop the glide instead of dragging the page back
    window.addEventListener(
      'scroll',
      function () {
        if (running && lastSet !== null && Math.abs(window.scrollY - lastSet) > 2) running = false;
        if (!running) {
          target = current = window.scrollY;
        }
      },
      { passive: true },
    );

    return {
      to: function (y) {
        if (reduceMotion) {
          window.scrollTo(0, y);
          return;
        }
        current = window.scrollY;
        target = clamp(y, 0, maxScroll());
        ease = 0.075;
        start();
      },
      lock: function (v) {
        locked = v;
        if (v) {
          running = false;
          target = current = window.scrollY;
        }
      },
    };
  })();

  function scrollToTarget(sel) {
    if (sel === '#top' || sel === '#') {
      Smooth.to(0);
      return;
    }
    var el = document.querySelector(sel);
    if (!el) return;
    Smooth.to(el.getBoundingClientRect().top + window.scrollY - 24);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"], [data-goto]');
    if (!a) return;
    var sel = a.getAttribute('data-goto') || a.getAttribute('href');
    if (!sel || sel === '#') {
      if (a.tagName === 'A') e.preventDefault();
      return;
    }
    e.preventDefault();
    // let an offcanvas close before scrolling
    setTimeout(
      function () {
        scrollToTarget(sel);
      },
      a.hasAttribute('data-bs-dismiss') ? 320 : 0,
    );
  });

  /* ---------- fixed-size stages scaled to their box ---------- */
  var stages = $$('.stage');
  function fitStages() {
    stages.forEach(function (st) {
      var box = st.parentElement,
        w = +st.dataset.w,
        h = +st.dataset.h;
      var s = box.clientWidth / w;
      st.style.transform = 'scale(' + s + ')';
      box.style.height = h * s + 'px';
    });
  }
  fitStages();
  window.addEventListener('resize', fitStages);

  /* ---------- hero: fan the cards out, chips float in, the dove flies in ---------- */
  var hero = $('.hero .stage');
  if (hero) {
    hero.classList.add('is-pre');
    var spot = $('[data-dove-spot="hero"]', hero);
    if (spot) spot.style.transform = 'translate3d(678px, 16px, 120px)';
    window.addEventListener('load', function () {
      setTimeout(
        function () {
          hero.classList.remove('is-pre');
        },
        reduceMotion ? 0 : 450,
      );
    });
    // gentle 3D tilt following the pointer
    var tilt = $('.stage__tilt', hero),
      tx = 0,
      ty = 0,
      cx = 0,
      cy = 0,
      tilting = false;
    function tiltLoop() {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      tilt.style.transform =
        'perspective(1800px) rotateX(' +
        (cy * -5).toFixed(3) +
        'deg) rotateY(' +
        (cx * 6).toFixed(3) +
        'deg)';
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001) requestAnimationFrame(tiltLoop);
      else tilting = false;
    }
    if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
      $('.hero').addEventListener('pointermove', function (e) {
        var r = hero.parentElement.getBoundingClientRect();
        tx = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5);
        ty = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5);
        if (!tilting) {
          tilting = true;
          requestAnimationFrame(tiltLoop);
        }
      });
      $('.hero').addEventListener('pointerleave', function () {
        tx = ty = 0;
        if (!tilting) {
          tilting = true;
          requestAnimationFrame(tiltLoop);
        }
      });
    }
    // clicking a fanned card brings it forward for a moment
    $$('.fan-card', hero).forEach(function (fan) {
      fan.addEventListener('click', function () {
        var base = fan.dataset.base || (fan.dataset.base = getComputedStyle(fan).transform);
        fan.style.transform = base + ' translate3d(0,-40px,60px) scale(1.06)';
        fan.style.zIndex = 25;
        setTimeout(function () {
          fan.style.transform = '';
          fan.style.zIndex = '';
        }, 1200);
      });
    });
  }

  /* ---------- the dove: flies in, follows the scroll, sheds feathers, lands at the contact form ---------- */
  (function () {
    var heroSpot = $('[data-dove-spot="hero"]'),
      contactSpot = $('[data-dove-spot="contact"]');
    if (!heroSpot) return;

    function doveSVG(uid) {
      var g = 'doveWing' + uid,
        gf = 'doveFar' + uid,
        gb = 'doveBody' + uid;
      return (
        '<svg class="dove__svg" viewBox="0 0 220 170" aria-hidden="true" focusable="false">' +
        '<defs>' +
        '<linearGradient id="' +
        g +
        '" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" style="stop-color:var(--dove-wing-tip)"/><stop offset="1" style="stop-color:var(--dove-wing)"/></linearGradient>' +
        '<linearGradient id="' +
        gf +
        '" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" style="stop-color:var(--dove-far-tip)"/><stop offset="1" style="stop-color:var(--dove-far)"/></linearGradient>' +
        '<linearGradient id="' +
        gb +
        '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" style="stop-color:var(--dove-body)"/><stop offset="1" style="stop-color:var(--dove-belly)"/></linearGradient>' +
        '</defs>' +
        // far wing (behind the body)
        '<g class="dove__far">' +
        '<path fill="url(#' +
        gf +
        ')" d="M132 74 C126 52 112 32 94 16 C98 30 100 38 101 44 C90 34 78 27 62 22 C70 34 77 43 82 51 C72 48 61 48 50 50 C64 60 84 70 110 78 Z"/>' +
        '</g>' +
        // tail fan
        '<path class="dove__tail" fill="url(#' +
        gb +
        ')" d="M78 96 L34 112 C30 110 30 106 33 104 L24 101 C21 98 23 94 27 94 L20 89 C19 85 23 83 27 84 L74 86 Z"/>' +
        '<path class="dove__line" d="M72 92 L34 106 M72 90 L28 96 M72 88 L30 88" />' +
        // body + head
        '<path fill="url(#' +
        gb +
        ')" d="M66 92 C82 72 108 66 128 68 C138 52 156 47 167 56 C172 60 174 64 174 67 C168 78 160 86 148 93 C128 106 96 110 66 92 Z"/>' +
        // beak
        '<path fill="var(--dove-beak)" d="M171 61 L186 66 L172 70 C173 67 173 64 171 61 Z"/>' +
        // eye
        '<circle cx="161" cy="60" r="3.4" fill="var(--dove-eye-ring)"/><circle cx="161.6" cy="60" r="1.8" fill="var(--dove-eye)"/>' +
        // envelope held in the beak
        '<g class="dove__letter" transform="translate(178 66) rotate(14)">' +
        '<rect x="0" y="0" width="38" height="26" rx="3" fill="var(--dove-paper)" stroke="var(--dove-paper-line)" stroke-width="1.6"/>' +
        '<path d="M1.5 2 L19 15 L36.5 2" fill="none" stroke="var(--dove-paper-line)" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<path d="M19 21.5 C14 18 13 14.5 15.6 13.2 C17.2 12.5 18.5 13.4 19 14.6 C19.5 13.4 20.8 12.5 22.4 13.2 C25 14.5 24 18 19 21.5 Z" fill="var(--dove-heart)"/>' +
        '</g>' +
        // near wing: layered feathers with light separation lines (like the logo)
        '<g class="dove__wing">' +
        '<path fill="url(#' +
        g +
        ')" d="M136 76 C130 50 114 26 88 6 C93 24 95 34 96 41 C84 28 68 20 46 14 C56 30 64 41 70 49 C56 45 42 45 28 48 C38 54 46 58 54 61 C46 62 38 64 30 68 C54 76 84 82 116 84 Z"/>' +
        '<path class="dove__line" d="M128 72 C120 52 108 34 92 18 M112 76 C104 60 90 44 60 24 M98 78 C86 66 70 56 40 50 M88 80 C74 74 58 70 38 68" />' +
        '</g>' +
        '</svg>'
      );
    }

    /* A single drifting feather */
    function featherSVG() {
      return (
        '<svg viewBox="0 0 24 64" aria-hidden="true" focusable="false">' +
        '<path fill="var(--dove-feather)" d="M12 2 C21 14 22 36 14 54 L12 62 L10 54 C2 36 3 14 12 2 Z"/>' +
        '<path fill="none" stroke="var(--dove-feather-line)" stroke-width="1.2" stroke-linecap="round" d="M12 6 L12 62 M12 18 L7 13 M12 26 L6 20 M12 34 L7 29 M12 22 L17 16 M12 30 L18 24 M12 38 L17 33"/>' +
        '</svg>'
      );
    }

    // reduced motion: the dove simply sits in its two spots
    if (reduceMotion) {
      heroSpot.innerHTML = '<div class="dove dove--static">' + doveSVG('Hero') + '</div>';
      if (contactSpot)
        contactSpot.innerHTML =
          '<div class="dove dove--static is-light">' + doveSVG('Contact') + '</div>';
      return;
    }

    var dove = document.createElement('div'),
      layer = document.createElement('div');
    dove.className = 'dove';
    dove.innerHTML = doveSVG('Fly');
    layer.className = 'feather-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    document.body.appendChild(dove);
    var wing = $('.dove__wing', dove),
      far = $('.dove__far', dove);

    var phone = window.matchMedia('(max-width: 640px)');
    var x = -160,
      y = window.innerHeight * 0.2,
      size = 120,
      face = 1,
      faceTarget = 1,
      phase = 0,
      tilt = 0,
      feathers = 0,
      featherBudget = 0,
      introStart = 0, // set when the entrance glide begins
      INTRO_MS = 5200,
      introDone = false,
      last = performance.now(),
      clock = 0;

    // sine ease: the softest start and landing, with no rush in the middle
    function easeInOut(t) {
      return -(Math.cos(Math.PI * t) - 1) / 2;
    }
    function mix(a, b, t) {
      return a + (b - a) * t;
    }
    function centre(el) {
      var r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
    }

    // where the dove wants to be for the current scroll position
    function target() {
      var vw = window.innerWidth,
        vh = window.innerHeight,
        max = Math.max(1, document.documentElement.scrollHeight - vh),
        p = window.scrollY / max;
      var t = {
        x: vw * (0.5 + (phone.matches ? 0.3 : 0.38) * Math.sin(p * Math.PI * 4.4 + 0.6)),
        y: vh * (0.4 + 0.16 * Math.sin(p * Math.PI * 6.2)),
        w: phone.matches ? 78 : 118,
      };
      // near the top it rests on the hero cards ...
      var hero = centre(heroSpot),
        h = clamp(1 - window.scrollY / (vh * 0.55), 0, 1);
      t = { x: mix(t.x, hero.x, h), y: mix(t.y, hero.y, h), w: mix(t.w, hero.w, h) };
      // ... and at the bottom it lands beside the enquiry form
      var c = 0;
      if (contactSpot) {
        var spot = centre(contactSpot),
          top = contactSpot.getBoundingClientRect().top;
        c = clamp((vh * 0.95 - top) / (vh * 0.25), 0, 1);
        t = { x: mix(t.x, spot.x, c), y: mix(t.y, spot.y, c), w: mix(t.w, spot.w, c) };
      }
      t.landed = h > 0.98 || c > 0.98;
      t.light = c > 0.5;
      return t;
    }

    function dropFeather(speed) {
      if (feathers >= (phone.matches ? 8 : 16)) return;
      feathers++;
      var f = document.createElement('div'),
        s = 12 + Math.random() * 12;
      f.className = 'feather' + (dove.classList.contains('is-light') ? ' is-light' : '');
      f.innerHTML = featherSVG();
      f.style.width = s + 'px';
      f.style.height = s * 2.6 + 'px';
      f.style.left = x - face * size * 0.12 + (Math.random() - 0.5) * size * 0.3 + 'px';
      f.style.top = y - size * 0.05 + (Math.random() - 0.5) * size * 0.2 + 'px';
      layer.appendChild(f);
      var drift = (Math.random() - 0.5) * 120 - face * 30,
        fall = 160 + Math.random() * 220 + speed * 40,
        spin = (Math.random() - 0.5) * 300,
        r0 = Math.random() * 360;
      // drifts down, swaying side to side, and fades
      var anim = f.animate(
        [
          { transform: 'translate(0,0) rotate(' + r0 + 'deg)', opacity: 0 },
          {
            transform:
              'translate(' +
              drift * 0.3 +
              'px,' +
              fall * 0.2 +
              'px) rotate(' +
              (r0 + spin * 0.25) +
              'deg)',
            opacity: 1,
            offset: 0.12,
          },
          {
            transform:
              'translate(' +
              -drift * 0.4 +
              'px,' +
              fall * 0.55 +
              'px) rotate(' +
              (r0 + spin * 0.6) +
              'deg)',
            opacity: 0.85,
            offset: 0.55,
          },
          {
            transform: 'translate(' + drift + 'px,' + fall + 'px) rotate(' + (r0 + spin) + 'deg)',
            opacity: 0,
          },
        ],
        { duration: 2600 + Math.random() * 1600, easing: 'cubic-bezier(.3,.6,.4,1)' },
      );
      anim.onfinish = function () {
        f.remove();
        feathers--;
      };
    }

    function frame(now) {
      var dt = Math.min(64, now - last);
      last = now;
      clock += dt / 1000;
      var t = target(),
        px = x,
        py = y;

      if (!introStart) {
        // waiting off-screen until the cards have fanned out
        t = { x: -200, y: window.innerHeight * 0.16, w: t.w, landed: false, light: false };
        x = t.x;
        y = t.y;
        size = t.w;
      } else if (!introDone) {
        // the entrance: one slow, curved glide down onto the hero cards
        var k = clamp((now - introStart) / INTRO_MS, 0, 1),
          e = easeInOut(k),
          vw = window.innerWidth,
          vh = window.innerHeight,
          u = 1 - e;
        var p0 = { x: -200, y: vh * 0.16 },
          p1 = { x: vw * 0.18, y: vh * 0.02 },
          p2 = { x: t.x - vw * 0.22, y: t.y - vh * 0.3 };
        x = u * u * u * p0.x + 3 * u * u * e * p1.x + 3 * u * e * e * p2.x + e * e * e * t.x;
        y = u * u * u * p0.y + 3 * u * u * e * p1.y + 3 * u * e * e * p2.y + e * e * e * t.y;
        size = t.w;
        if (k >= 1 || window.scrollY > 40) introDone = true;
        t.landed = k >= 1;
      } else {
        // follow the scroll: ease towards the target, with a speed limit so it never darts
        var ease = 1 - Math.pow(1 - 0.06, dt / 16.7),
          dx = (t.x - x) * ease,
          dy = (t.y - y) * ease,
          step = Math.sqrt(dx * dx + dy * dy),
          maxStep = 1.5 * dt;
        if (step > maxStep) {
          dx *= maxStep / step;
          dy *= maxStep / step;
        }
        x += dx;
        y += dy;
        size += (t.w - size) * ease;
      }
      var vx = (x - px) / dt,
        vy = (y - py) / dt,
        speed = Math.sqrt(vx * vx + vy * vy);

      // turn to face the way it's flying (flips through edge-on, like a real turn)
      if (vx > 0.12) faceTarget = 1;
      else if (vx < -0.12) faceTarget = -1;
      else if (t.landed) faceTarget = 1;
      face += (faceTarget - face) * (1 - Math.pow(1 - 0.12, dt / 16.7));

      // wings: quick strong beats when moving, slow soft glide when resting
      var effort = clamp(speed / 1.2, 0, 1);
      phase += (dt / 1000) * Math.PI * 2 * (t.landed && effort < 0.05 ? 0.9 : 1.6 + effort * 5.5);
      var amp = 10 + effort * 38,
        beat = Math.sin(phase),
        // resting: wings held up like the logo's dove; flying hard: swept back with big beats
        wingAngle = 6 - effort * 28 + beat * amp;
      wing.setAttribute('transform', 'rotate(' + wingAngle.toFixed(2) + ' 128 74)');
      far.setAttribute('transform', 'rotate(' + (wingAngle * 0.8 + 4).toFixed(2) + ' 124 72)');

      // lean into the climb or dive, bob gently when resting
      var tiltTarget = clamp(vy * 22, -20, 20) - (t.landed ? 0 : effort * 4);
      tilt += (tiltTarget - tilt) * (1 - Math.pow(1 - 0.1, dt / 16.7));
      var bob = Math.sin(clock * 2.2) * (4 + (1 - effort) * 3) - beat * effort * 3;

      dove.style.width = size + 'px';
      dove.style.height = size * (170 / 220) + 'px';
      dove.style.transform =
        'translate3d(' +
        (x - size / 2).toFixed(1) +
        'px,' +
        (y - size * 0.39 + bob).toFixed(1) +
        'px,0)' +
        ' rotate(' +
        tilt.toFixed(2) +
        'deg) scaleX(' +
        face.toFixed(3) +
        ')';
      dove.classList.toggle('is-light', t.light);

      // feathers fall while it works hard
      featherBudget += speed * dt * (phone.matches ? 0.0035 : 0.006);
      if (effort > 0.15 && featherBudget >= 1) {
        featherBudget = 0;
        dropFeather(speed);
      } else if (effort <= 0.15) featherBudget = Math.min(featherBudget, 0.6);

      requestAnimationFrame(frame);
    }

    function beginIntro() {
      if (!introStart) introStart = performance.now();
    }
    if (document.readyState === 'complete') setTimeout(beginIntro, 900);
    else
      window.addEventListener('load', function () {
        setTimeout(beginIntro, 900);
      });
    requestAnimationFrame(frame);
  })();

  /* ---------- rotating words (re-mount so the swap animation replays) ---------- */
  function swapText(el, text) {
    var n = el.cloneNode(false);
    n.textContent = text;
    el.parentNode.replaceChild(n, el);
    return n;
  }
  var occasions = [
    ['Housewarming', 'புதுமனை புகுவிழா'],
    ['Wedding', 'திருமணம்'],
    ['Engagement', 'நிச்சயதார்த்தம்'],
    ['Ear piercing', 'காதணி விழா'],
    ['Baby shower', 'வளைகாப்பு'],
    ['Reception', 'வரவேற்பு'],
    ['First birthday', 'முதல் பிறந்தநாள்'],
  ];
  var families = [
    ['Nandhini & Rahul’s family', 'approved the draft on their phone'],
    ['Santhosh & Mamtha’s family', 'approved the draft on their phone'],
    ['Kaviya & Balaji’s family', 'asked for a bigger muhurtham date'],
    ['Divya & Arun’s family', 'approved the draft on their phone'],
  ];
  var toasts = [
    'Lotus Pond · A5 is ready for print',
    'Temple Gopuram · A5 is ready for print',
    'Banana Leaf Arch · A4 is ready for print',
    'Radha Krishna · A5 is ready for print',
  ];
  var tick = 0;
  if (!reduceMotion)
    setInterval(function () {
      tick++;
      var o = occasions[tick % occasions.length];
      $$('.occasion-tag').forEach(function (tag) {
        var sw = $$('.swap', tag);
        if (sw[0]) swapText(sw[0], o[0]);
        if (sw[1]) swapText(sw[1], o[1]);
      });
      if (tick % 2 === 0) {
        var chip = $('.float-chip > div.swap');
        if (chip) {
          var f = families[(tick / 2) % families.length];
          var n = chip.cloneNode(false);
          n.innerHTML = '<b class="float-chip__h"></b><span class="float-chip__s"></span>';
          n.firstChild.textContent = f[0];
          n.lastChild.textContent = f[1];
          chip.parentNode.replaceChild(n, chip);
          var av = $('.avatar', n.parentNode);
          if (av) av.textContent = f[0].charAt(0);
        }
      } else {
        var t = $('.notice > .swap');
        if (t) swapText(t, toasts[((tick - 1) / 2) % toasts.length]);
      }
    }, 2600);

  /* ---------- nav: the ink pill follows the pointer / the section in view ---------- */
  var tabs = $('.nav-pills-glass'),
    ink = tabs && $('.nav-pills-glass__ink', tabs),
    activeTab = null;
  function inkTo(tab) {
    if (!ink) return;
    $$('.nav-pill', tabs).forEach(function (t) {
      t.classList.toggle('on-ink', t === tab);
    });
    if (!tab) {
      ink.style.opacity = 0;
      return;
    }
    ink.style.width = tab.offsetWidth + 'px';
    ink.style.transform = 'translateX(' + tab.offsetLeft + 'px)';
    ink.style.opacity = 1;
  }
  if (tabs) {
    $$('.nav-pill', tabs).forEach(function (t) {
      t.addEventListener('mouseenter', function () {
        inkTo(t);
      });
    });
    tabs.addEventListener('mouseleave', function () {
      inkTo(activeTab);
    });
    var spy = $$('.nav-pill', tabs)
      .map(function (t) {
        var h = t.getAttribute('href');
        return { tab: t, el: h.length > 1 ? $(h) : null };
      })
      .filter(function (x) {
        return x.el;
      });
    var spyTick = false;
    window.addEventListener(
      'scroll',
      function () {
        if (spyTick) return;
        spyTick = true;
        requestAnimationFrame(function () {
          spyTick = false;
          var y = window.innerHeight * 0.4,
            found = null;
          spy.forEach(function (s) {
            var r = s.el.getBoundingClientRect();
            if (r.top < y && r.bottom > y) found = s.tab;
          });
          if (found !== activeTab) {
            activeTab = found;
            if (!tabs.matches(':hover')) inkTo(activeTab);
          }
        });
      },
      { passive: true },
    );
  }

  /* ---------- designs rack: style filter, cards regrouped onto shelves ---------- */
  (function () {
    var rack = $('.rack');
    if (!rack) return;
    // the markup in index.html is the no-JS layout; it doubles as the card source here
    var source = document.createElement('div');
    source.innerHTML = rack.innerHTML;
    var cards = $$('.rack-slot:not(.rack-slot--end)', source),
      endSlot = $('.rack-slot--end', source),
      plants = $$('.rack-pslot', source),
      phone = window.matchMedia('(max-width: 760px)'),
      filter = 'all';

    function build() {
      var items = cards.filter(function (c) {
        return filter === 'all' || c.dataset.style === filter;
      });
      if (endSlot) items = items.concat(endSlot);
      var frag = document.createDocumentFragment(),
        sh = 0,
        p = 0;
      while (items.length) {
        // phones: three to a shelf, a plant on every third; desktop: four, a plant on every other
        var withPlant = phone.matches ? sh % 3 === 1 : sh % 2 === 0;
        withPlant = withPlant && plants.length > 0;
        var perShelf = (phone.matches ? 3 : 4) - (withPlant ? 1 : 0);
        var shelf = document.createElement('div'),
          row = document.createElement('div'),
          ledge = document.createElement('div');
        shelf.className = 'rack-shelf';
        shelf.style.setProperty('--sh', sh);
        row.className = 'rack-row';
        ledge.className = 'rack-ledge';
        items.splice(0, perShelf).forEach(function (item, k) {
          var c = item.cloneNode(true);
          c.style.setProperty('--i', k);
          row.appendChild(c);
        });
        if (withPlant) {
          var plant = plants[p++ % plants.length].cloneNode(true);
          var atStart = !phone.matches && (sh / 2) % 2 === 1;
          plant.style.gridColumn = atStart ? '1' : '-2 / -1';
          plant.style.gridRow = '1';
          row.appendChild(plant);
        }
        shelf.appendChild(row);
        shelf.appendChild(ledge);
        frag.appendChild(shelf);
        sh++;
      }
      rack.innerHTML = '';
      rack.appendChild(frag);
    }

    function replay() {
      if (rack.classList.contains('is-pre')) return; // first reveal still to come
      rack.classList.remove('is-in');
      void rack.offsetWidth;
      rack.classList.add('is-in');
    }

    build();
    if (phone.addEventListener)
      phone.addEventListener('change', function () {
        build();
        replay();
      });

    $$('.style-filter__btn').forEach(function (btn, _, all) {
      btn.addEventListener('click', function () {
        if (btn.dataset.filter === filter) return;
        filter = btn.dataset.filter;
        all.forEach(function (b) {
          b.classList.toggle('is-on', b === btn);
          b.setAttribute('aria-pressed', b === btn);
        });
        rack.classList.add('is-switching');
        setTimeout(
          function () {
            build();
            rack.classList.remove('is-switching');
            replay();
          },
          reduceMotion ? 0 : 260,
        );
      });
    });
  })();

  /* ---------- reveal on scroll ---------- */
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        if (el.classList.contains('rack')) {
          el.classList.remove('is-pre');
          el.classList.add('is-in');
        } else {
          var delay = +el.getAttribute('data-animate-delay') || 0;
          setTimeout(function () {
            el.classList.add('is-visible');
          }, delay);
        }
        io.unobserve(el);
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
  );
  $$('[data-animate], .rack.is-pre').forEach(function (el) {
    io.observe(el);
  });

  /* ---------- occasions rail arrows ---------- */
  var rail = $('#occasions .template-rail');
  $$('#occasions .section__ctl .btn-circle').forEach(function (b, i) {
    b.addEventListener('click', function () {
      rail.scrollBy({ left: (i === 0 ? -1 : 1) * rail.clientWidth * 0.8, behavior: 'smooth' });
    });
  });
  // drag to scroll with the mouse
  if (rail)
    (function () {
      var down = false,
        sx = 0,
        sl = 0,
        moved = false;
      rail.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse') return;
        down = true;
        moved = false;
        sx = e.clientX;
        sl = rail.scrollLeft;
        rail.style.scrollSnapType = 'none';
      });
      window.addEventListener('pointermove', function (e) {
        if (!down) return;
        var dx = e.clientX - sx;
        if (Math.abs(dx) > 4) moved = true;
        rail.scrollLeft = sl - dx;
      });
      window.addEventListener('pointerup', function () {
        if (!down) return;
        down = false;
        rail.style.scrollSnapType = '';
      });
      rail.addEventListener(
        'click',
        function (e) {
          if (moved) {
            // a drag, not a click: don't open the card viewer
            e.preventDefault();
            e.stopPropagation();
            moved = false;
          }
        },
        true,
      );
      rail.addEventListener('dragstart', function (e) {
        e.preventDefault();
      });
    })();

  /* ---------- order board: cards walk from draft to printed ---------- */
  (function () {
    var board = $('.board');
    if (!board || reduceMotion) return;
    var cols = { draft: 0, confirmed: 1, ready: 2, printed: 3 },
      order = ['draft', 'confirmed', 'ready', 'printed'];
    var colX = $$('.board-col', board).map(function (c) {
      return c.offsetLeft + 8;
    });
    var tiles = $$('.board-tile', board).map(function (el, k) {
      return { el: el, stage: el.dataset.stage, t: k };
    });
    var clock = 10;
    function layout(moving) {
      order.forEach(function (st) {
        tiles
          .filter(function (t) {
            return t.stage === st;
          })
          .sort(function (a, b) {
            return a.t - b.t;
          })
          .forEach(function (t, k) {
            var x = colX[cols[st]],
              y = 46 + k * 102;
            t.el.dataset.stage = st;
            t.el.classList.toggle('lift', t === moving);
            t.el.style.opacity = k > 1 ? 0 : 1;
            t.el.style.transform =
              'translate(' +
              x +
              'px,' +
              (t === moving ? y - 10 : y) +
              'px)' +
              (t === moving ? ' rotate(-4deg) scale(1.05)' : '');
          });
      });
      order.forEach(function (st) {
        var c = $('.board-col__c[data-c="' + st + '"]', board);
        if (c)
          c.textContent = tiles.filter(function (t) {
            return t.stage === st;
          }).length;
      });
    }
    function advance() {
      var pick = null;
      ['ready', 'confirmed', 'draft'].some(function (st) {
        var list = tiles
          .filter(function (t) {
            return t.stage === st;
          })
          .sort(function (a, b) {
            return a.t - b.t;
          });
        if (
          list.length &&
          (st !== 'draft' ||
            tiles.filter(function (t) {
              return t.stage === 'confirmed';
            }).length < 2)
        ) {
          pick = list[0];
          return true;
        }
      });
      var printed = tiles
        .filter(function (t) {
          return t.stage === 'printed';
        })
        .sort(function (a, b) {
          return a.t - b.t;
        });
      if (!pick || (printed.length > 1 && Math.random() < 0.5)) {
        pick = printed[0];
        pick.stage = 'draft'; // a new order comes in at the counter
      } else {
        pick.stage = order[cols[pick.stage] + 1];
      }
      pick.t = clock++;
      layout(pick);
      setTimeout(function () {
        layout(null);
      }, 900);
    }
    var timer = null;
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) {
        if (!timer) timer = setInterval(advance, 2400);
      } else {
        clearInterval(timer);
        timer = null;
      }
    }).observe(board);
  })();

  /* ---------- card viewer: lift a card off the rack and open it like a book ---------- */
  (function () {
    var viewer = $('#cardViewer'),
      book = $('#cardBook'),
      title = $('#cardViewerTitle'),
      count = $('#cardViewerCount');
    var prevBtn = $('[data-prev]', viewer),
      nextBtn = $('[data-next]', viewer),
      stage = $('.viewer__stage', viewer);
    var leaves = [],
      state = 0,
      pageW = 0,
      single = false,
      source = null,
      shift = null,
      total = 0;

    function cardData(btn) {
      var id = btn.dataset.fbOpen || btn.dataset.bf || btn.dataset.tf;
      var face = $('img', btn);
      var d = (window.KK_CARDS || {})[id];
      var label = $('.template-card__name', btn);
      var name = label
        ? label.textContent
        : (btn.getAttribute('aria-label') || '').replace(/^Open\s+/, '').split(',')[0];
      if (d) return { title: d.title, ratio: d.ratio, pages: d.pages };
      return {
        title: name,
        ratio: face.naturalHeight / face.naturalWidth || 1.4,
        pages: [face.currentSrc || face.src],
      };
    }

    function measure(ratio) {
      var r = stage.getBoundingClientRect();
      var navs = window.innerWidth > 640 ? 140 : 0;
      var availW = r.width - navs - 16,
        availH = r.height - 10;
      pageW = Math.min(single ? availW : availW / 2, availH / ratio, single ? 620 : 560);
      book.style.width = (single ? pageW : pageW * 2) + 'px';
      book.style.height = pageW * ratio + 'px';
    }

    function render() {
      leaves.forEach(function (lf, k) {
        var flipped = k < state;
        lf.classList.toggle('is-flipped', flipped);
        lf.style.zIndex = flipped ? k + 1 : leaves.length - k + 1;
      });
      var x = 0;
      if (!single) {
        if (state === 0) x = -pageW / 2;
        else if (state === leaves.length) x = pageW / 2;
      }
      shift.style.transform = 'translateX(' + x + 'px)';
      prevBtn.disabled = state === 0;
      nextBtn.disabled = single || state === leaves.length;
      var shownPage = single ? 1 : state === 0 ? 1 : Math.min(state * 2 + 1, total);
      count.textContent = single
        ? '1 / 1'
        : (state === 0
            ? '1'
            : state === leaves.length
              ? String(total)
              : state * 2 + '–' + shownPage) +
          ' / ' +
          total;
    }

    function flyFrom(rect, done) {
      var b = book.getBoundingClientRect();
      var s = rect.width / pageW;
      var dx = rect.left + rect.width / 2 - (b.left + b.width / 2);
      var dy = rect.top + rect.height / 2 - (b.top + b.height / 2);
      book.classList.add('is-flying');
      book.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
      book.getBoundingClientRect();
      book.classList.remove('is-flying');
      requestAnimationFrame(function () {
        book.style.transform = '';
        if (done) setTimeout(done, 900);
      });
    }

    function open(btn) {
      var d = cardData(btn);
      source = btn;
      total = d.pages.length;
      single = total === 1;
      book.innerHTML = '';
      book.className = 'book' + (single ? ' book--single' : '');
      shift = document.createElement('div');
      shift.className = 'book__shift';
      book.appendChild(shift);
      leaves = [];
      for (var k = 0; k < Math.ceil(total / 2) || (single && k < 1); k++) {
        var lf = document.createElement('div');
        lf.className = 'leaf';
        var front = document.createElement('div');
        front.className = 'leaf__side leaf__side--front';
        front.style.backgroundImage = 'url("' + d.pages[k * 2] + '")';
        lf.appendChild(front);
        if (!single) {
          var back = document.createElement('div');
          back.className = 'leaf__side leaf__side--back';
          if (d.pages[k * 2 + 1]) back.style.backgroundImage = 'url("' + d.pages[k * 2 + 1] + '")';
          else back.classList.add('leaf__side--blank');
          lf.appendChild(back);
        }
        (function (idx) {
          lf.addEventListener('click', function () {
            if (single) return;
            state = idx < state ? idx : idx + 1;
            render();
          });
        })(k);
        shift.appendChild(lf);
        leaves.push(lf);
      }
      // pre-load the inside pages
      d.pages.forEach(function (src) {
        var im = new Image();
        im.src = src;
      });
      title.textContent = d.title;
      state = 0;
      viewer.hidden = false;
      document.body.style.overflow = 'hidden';
      Smooth.lock(true);
      measure(d.ratio);
      render();
      flyFrom($('img', btn).getBoundingClientRect());
      requestAnimationFrame(function () {
        viewer.classList.add('is-open');
      });
      book._ratio = d.ratio;
      setTimeout(function () {
        nextBtn.focus({ preventScroll: true });
      }, 50);
    }

    function close() {
      if (viewer.hidden) return;
      viewer.classList.remove('is-open');
      var finish = function () {
        viewer.hidden = true;
        document.body.style.overflow = '';
        Smooth.lock(false);
        if (source) source.focus({ preventScroll: true });
      };
      if (source && !reduceMotion) {
        state = 0;
        render();
        var rect = $('img', source).getBoundingClientRect(),
          b = book.getBoundingClientRect();
        var s = rect.width / pageW;
        var dx = rect.left + rect.width / 2 - (b.left + b.width / 2),
          dy = rect.top + rect.height / 2 - (b.top + b.height / 2);
        shift.style.transform = single ? '' : 'translateX(' + -pageW / 2 + 'px)';
        book.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')';
        setTimeout(finish, 750);
      } else finish();
    }

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.rack-card, [data-view]');
      if (btn && btn.hasAttribute('data-view')) e.preventDefault();
      if (btn) open(btn);
    });
    $$('[data-close]', viewer).forEach(function (b) {
      b.addEventListener('click', close);
    });
    prevBtn.addEventListener('click', function () {
      if (state > 0) {
        state--;
        render();
      }
    });
    nextBtn.addEventListener('click', function () {
      if (state < leaves.length) {
        state++;
        render();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (viewer.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') nextBtn.click();
      else if (e.key === 'ArrowLeft') prevBtn.click();
    });
    // swipe on touch screens
    var sx = null;
    stage.addEventListener(
      'touchstart',
      function (e) {
        sx = e.touches[0].clientX;
      },
      { passive: true },
    );
    stage.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      sx = null;
      if (Math.abs(dx) > 40) (dx < 0 ? nextBtn : prevBtn).click();
    });
    window.addEventListener('resize', function () {
      if (!viewer.hidden) {
        measure(book._ratio);
        render();
      }
    });
  })();

  /* ---------- enquiry form: opens WhatsApp with the details filled in ---------- */
  (function () {
    var form = $('#enquiryForm');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.classList.add('was-validated');
      if (!form.checkValidity()) {
        $(':invalid', form).focus();
        return;
      }
      var data = new FormData(form),
        date = data.get('date');
      if (date) {
        date = new Date(date + 'T00:00').toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
      var lines = [
        'Hi Kalyanam Krafts! I would like an invitation card designed.',
        '',
        'Name: ' + data.get('name').trim(),
        'Occasion: ' + data.get('occasion'),
        'Function date: ' + (date || 'not fixed yet'),
        'Style: ' + data.get('style'),
      ];
      var note = (data.get('message') || '').trim();
      if (note) lines.push('Details: ' + note);
      var url =
        'https://wa.me/' + form.dataset.whatsapp + '?text=' + encodeURIComponent(lines.join('\n'));
      window.open(url, '_blank', 'noopener');
    });
  })();

  /* ---------- misc ---------- */
  $$('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
