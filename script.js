// script.js — final, self-contained. Works reliably without fuss.
//
// Features: typing animation, theme toggle (persist), project entrance (safe fallback),
// accessible modals (focus trap + ESC), Weather (Open-Meteo), Tasks (localStorage),
// Mini Blog (localStorage), Snake (canvas), Calculator, contact demo.

(function () {
  'use strict';

  // helpers
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const escapeHtml = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const nl2br = s => String(s).replace(/\n/g, '<br>');

  // set year
  document.getElementById('year')?.textContent = new Date().getFullYear();

  // THEME TOGGLE (persist)
  (function theme() {
    const btn = document.getElementById('themeToggle');
    const saved = localStorage.getItem('site-theme');
    if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light'), btn && (btn.textContent = '☀️', btn.setAttribute('aria-pressed','true'));
    else btn && (btn.textContent = '🌙', btn.setAttribute('aria-pressed','false'));
    btn && btn.addEventListener('click', () => {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (isLight) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('site-theme', 'dark');
        btn.textContent = '🌙'; btn.setAttribute('aria-pressed','false');
      } else {
        document.documentElement.setAttribute('data-theme','light');
        localStorage.setItem('site-theme','light');
        btn.textContent = '☀️'; btn.setAttribute('aria-pressed','true');
      }
    });
  })();

  // MOBILE MENU (simple)
  (function menu() {
    const menuBtn = document.getElementById('menuToggle');
    const nav = document.querySelector('.nav-list');
    if (!menuBtn || !nav) return;
    menuBtn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
  })();

  // TYPING animation (reliable)
  (function typing() {
    const el = document.getElementById('typing');
    if (!el) return;
    const words = ['Learner', 'Web Developer', 'Designer'];
    let wi = 0, ci = 0, deleting = false;
    function tick() {
      const w = words[wi];
      el.textContent = w.slice(0, ci);
      if (!deleting) {
        if (ci < w.length) { ci++; setTimeout(tick, 140); }
        else { deleting = true; setTimeout(tick, 900); }
      } else {
        if (ci > 0) { ci--; setTimeout(tick, 80); }
        else { deleting = false; wi = (wi + 1) % words.length; setTimeout(tick, 200); }
      }
    }
    tick();
  })();

  // PROJECT entrance animation (IntersectionObserver with fallback)
  (function projectEntrance() {
    const projects = $$('.project');
    if (!projects.length) return;
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const idx = projects.indexOf(el) || 0;
            el.style.setProperty('--delay', `${idx * 80}ms`);
            el.classList.add('in');
            observer.unobserve(el);
          }
        });
      }, { threshold: 0.15 });
      projects.forEach(p => obs.observe(p));
    } else {
      // fallback
      projects.forEach((p, i) => {
        p.style.setProperty('--delay', `${i * 80}ms`);
        p.classList.add('in');
      });
    }
  })();

  // ACCESSIBLE MODALS (generic)
  (function modals() {
    const projects = $$('.project');
    const modalEls = $$('.modal');

    function focusables(root) {
      return Array.from(root.querySelectorAll('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'))
        .filter(n => n.offsetParent !== null);
    }

    function open(modal, opener) {
      if (!modal) return;
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      const f = focusables(modal);
      if (f.length) f[0].focus();
      const trap = function (e) {
        if (e.key !== 'Tab') return;
        const list = focusables(modal);
        if (!list.length) { e.preventDefault(); return; }
        const idx = list.indexOf(document.activeElement);
        if (e.shiftKey && idx === 0) { e.preventDefault(); list[list.length - 1].focus(); }
        else if (!e.shiftKey && idx === list.length - 1) { e.preventDefault(); list[0].focus(); }
      };
      modal._trap = trap;
      window.addEventListener('keydown', trap);
      modal._opener = opener;
    }

    function close(modal) {
      if (!modal) return;
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (modal._trap) { window.removeEventListener('keydown', modal._trap); delete modal._trap; }
      if (modal._opener) modal._opener.focus();
      delete modal._opener;
    }

    projects.forEach(p => {
      const id = p.getAttribute('data-modal');
      const modal = document.getElementById(id);
      p.addEventListener('click', () => open(modal, p));
      p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(modal, p); } });
    });

    modalEls.forEach(m => {
      const closeBtn = m.querySelector('.modal-close');
      if (closeBtn) closeBtn.addEventListener('click', () => close(m));
      m.addEventListener('click', e => { if (e.target === m) close(m); });
      window.addEventListener('keydown', e => { if (e.key === 'Escape' && m.getAttribute('aria-hidden') === 'false') close(m); });
    });
  })();

  // WEATHER (Open-Meteo)
  (function weather() {
    const form = document.getElementById('weather-form');
    const input = document.getElementById('weather-input');
    const out = document.getElementById('weather-output');
    if (!form || !input || !out) return;

    async function lookup(city) {
      out.textContent = 'Looking up…';
      try {
        const geo = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(city) + '&count=5').then(r => r.json());
        if (!geo.results || !geo.results.length) { out.textContent = 'City not found.'; return; }
        const loc = geo.results[0];
        const lat = loc.latitude, lon = loc.longitude;
        const w = await fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current_weather=true&timezone=auto').then(r => r.json());
        if (!w || !w.current_weather) { out.textContent = 'Weather unavailable.'; return; }
        const cw = w.current_weather;
        out.innerHTML = '<strong>' + escapeHtml(loc.name) + ', ' + escapeHtml(loc.country) + '</strong>' +
          '<div style="margin-top:8px">Temperature: <strong>' + cw.temperature + '°C</strong></div>' +
          '<div>Wind: ' + cw.windspeed + ' km/h • Direction: ' + cw.winddirection + '°</div>' +
          '<div class="muted small">source: Open-Meteo</div>';
      } catch (err) {
        console.error(err);
        out.textContent = 'Network error.';
      }
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = input.value.trim();
      if (!v) return;
      lookup(v);
    });
  })();

  // TASKS (localStorage)
  (function tasks() {
    const form = document.getElementById('task-form');
    const input = document.getElementById('task-input');
    const due = document.getElementById('task-due');
    const list = document.getElementById('task-list');
    if (!form || !input || !list) return;
    const KEY = 'dipson_tasks_v2';

    function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
    function save(a) { localStorage.setItem(KEY, JSON.stringify(a)); }

    function render() {
      const arr = load();
      list.innerHTML = '';
      if (!arr.length) { list.innerHTML = '<li class="muted">No tasks yet</li>'; return; }
      arr.forEach((t, i) => {
        const li = document.createElement('li');
        li.innerHTML = '<div><strong>' + escapeHtml(t.title) + '</strong><div class="muted small">' + (t.due || '') + '</div></div>' +
          '<div class="actions"><button class="btn small edit" data-i="' + i + '">Edit</button> <button class="btn ghost small del" data-i="' + i + '">Delete</button></div>';
        list.appendChild(li);
      });
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      const t = input.value.trim(); if (!t) return;
      const arr = load(); arr.push({ title: t, due: due.value || '' }); save(arr); input.value = ''; due.value = ''; render();
    });

    list.addEventListener('click', e => {
      const i = e.target.getAttribute('data-i');
      if (i === null) return;
      const arr = load();
      if (e.target.classList.contains('del')) { arr.splice(i, 1); save(arr); render(); }
      if (e.target.classList.contains('edit')) {
        const val = prompt('Edit task', arr[i].title);
        if (val !== null) { arr[i].title = val; save(arr); render(); }
      }
    });

    render();
  })();

  // MINI BLOG (localStorage)
  (function blog() {
    const form = document.getElementById('post-form');
    const title = document.getElementById('post-title');
    const cat = document.getElementById('post-cat');
    const body = document.getElementById('post-body');
    const out = document.getElementById('posts');
    if (!form || !title || !body || !out) return;
    const KEY = 'dipson_posts_v2';

    function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
    function save(a) { localStorage.setItem(KEY, JSON.stringify(a)); }

    function render() {
      const posts = load();
      out.innerHTML = '';
      if (!posts.length) { out.innerHTML = '<div class="muted">No posts yet</div>'; return; }
      posts.slice().reverse().forEach(p => {
        const d = new Date(p.created).toLocaleString();
        const div = document.createElement('div');
        div.className = 'post';
        div.innerHTML = '<h4>' + escapeHtml(p.title) + ' <small class="muted">— ' + escapeHtml(p.category) + '</small></h4>' +
          '<div class="muted small">' + escapeHtml(d) + '</div>' +
          '<div style="margin-top:8px">' + nl2br(escapeHtml(p.body)) + '</div>' +
          '<div style="margin-top:8px"><button class="btn ghost del" data-id="' + p.created + '">Delete</button></div>';
        out.appendChild(div);
      });
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      const t = title.value.trim(), b = body.value.trim();
      if (!t || !b) return alert('Please add title and body.');
      const arr = load(); arr.push({ title: t, body: b, category: cat.value, created: Date.now() }); save(arr); title.value = ''; body.value = ''; render();
    });

    out.addEventListener('click', e => {
      if (!e.target.classList.contains('del')) return;
      const id = Number(e.target.getAttribute('data-id'));
      if (!confirm('Delete post?')) return;
      const arr = load().filter(p => p.created !== id); save(arr); render();
    });

    render();
  })();

  // SNAKE (canvas)
  (function snake() {
    const canvas = document.getElementById('snake-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const speedEl = document.getElementById('snake-speed');
    const startBtn = document.getElementById('snake-start');
    const resetBtn = document.getElementById('snake-reset');
    const scoreEl = document.getElementById('snake-score');

    let grid = 18;
    let snake = [];
    let dir = { x: 1, y: 0 };
    let food = null;
    let score = 0;
    let running = false;
    let tick = 0;
    let speed = Number(speedEl.value) || 10;

    function init() {
      snake = [];
      const cols = Math.floor(canvas.width / grid);
      for (let i = 0; i < 5; i++) snake.push({ x: Math.floor(cols / 2) - i, y: Math.floor(cols / 2) });
      spawn();
      score = 0;
      if (scoreEl) scoreEl.textContent = score;
      dir = { x: 1, y: 0 };
      draw();
    }

    function spawn() {
      const cols = Math.floor(canvas.width / grid);
      food = { x: Math.floor(Math.random() * cols), y: Math.floor(Math.random() * cols) };
    }

    function draw() {
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ff4d6d';
      ctx.fillRect(food.x * grid, food.y * grid, grid - 1, grid - 1);
      ctx.fillStyle = '#22c55e';
      snake.forEach(s => ctx.fillRect(s.x * grid, s.y * grid, grid - 1, grid - 1));
    }

    function step() {
      if (!running) return;
      tick++;
      if (tick % Math.max(1, Math.floor(20 - speed)) !== 0) { requestAnimationFrame(step); return; }
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      const cols = Math.floor(canvas.width / grid);
      head.x = (head.x + cols) % cols; head.y = (head.y + cols) % cols;
      if (snake.some(s => s.x === head.x && s.y === head.y)) { running = false; alert('Game over — score: ' + score); return; }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) { score++; if (scoreEl) scoreEl.textContent = score; spawn(); } else snake.pop();
      draw(); requestAnimationFrame(step);
    }

    startBtn && startBtn.addEventListener('click', () => {
      speed = Number(speedEl.value) || 10;
      if (!running) { running = true; init(); step(); }
    });
    resetBtn && resetBtn.addEventListener('click', () => { running = false; init(); });

    window.addEventListener('keydown', e => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      if (e.key === 'ArrowUp' && dir.y !== 1) dir = { x: 0, y: -1 };
      if (e.key === 'ArrowDown' && dir.y !== -1) dir = { x: 0, y: 1 };
      if (e.key === 'ArrowLeft' && dir.x !== 1) dir = { x: -1, y: 0 };
      if (e.key === 'ArrowRight' && dir.x !== -1) dir = { x: 1, y: 0 };
    });

    canvas.width = 360; canvas.height = 360; grid = 18; init();
  })();

  // CALCULATOR
  (function calc() {
    const grid = document.getElementById('calc-grid');
    const display = document.getElementById('calc-display');
    if (!grid || !display) return;
    const buttons = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+'];
    let expr = '';

    function update() { display.value = expr || '0'; }
    function safeEval(s) { if (!/^[0-9+\-*/().\s%]*$/.test(s)) throw new Error('Invalid'); return Function('"use strict";return(' + s + ')')(); }

    buttons.forEach(b => {
      const btn = document.createElement('button'); btn.className = 'calc-btn'; btn.textContent = b; btn.dataset.val = b;
      if ('+-*/'.includes(b)) btn.classList.add('op');
      btn.addEventListener('click', () => {
        if (b === '=') { try { expr = String(safeEval(expr)); } catch { expr = 'ERR'; } update(); return; }
        expr += b; update();
      });
      grid.appendChild(btn);
    });

    const clear = document.createElement('button'); clear.className = 'calc-btn ghost'; clear.textContent = 'C'; clear.addEventListener('click', () => { expr = ''; update(); });
    const del = document.createElement('button'); del.className = 'calc-btn ghost'; del.textContent = '⌫'; del.addEventListener('click', () => { expr = expr.slice(0, -1); update(); });
    grid.appendChild(clear); grid.appendChild(del);
    update();
  })();

  // CONTACT form example
  document.getElementById('contact-form')?.addEventListener('submit', function (e) {
    e.preventDefault();
    alert('Thanks — message captured locally (demo).');
    this.reset();
  });

})();
