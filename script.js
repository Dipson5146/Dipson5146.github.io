/* Deferred script: main behavior + project implementations */
(() => {
  // Helpers
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Year
  $('#year').textContent = new Date().getFullYear();

  /* ---------- THEME ---------- */
  const themeToggle = $('#theme-toggle');
  const saved = localStorage.getItem('theme');
  const defaultTheme = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  if (defaultTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const next = isLight ? 'dark' : 'light';
    if (next === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('theme', next);
    themeToggle.setAttribute('aria-pressed', String(next === 'light'));
  });

  /* ---------- NAV TOGGLE ---------- */
  const navToggle = $('#nav-toggle');
  const navList = $('#nav-list');
  navToggle.addEventListener('click', () => {
    const isOpen = navList.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
  navList.addEventListener('click', e => {
    if (e.target.tagName === 'A' && navList.classList.contains('open')) {
      navList.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });

  /* ---------- TYPING EFFECT ---------- */
  const typingEl = $('#typing');
  const words = ['Coder', 'Web Developer', 'Learner', 'UI tinkerer'];
  if (!prefersReduced) {
    let w = 0, ch = 0, del = false;
    const speed = 100, delSpeed = 40, pause = 900;
    (function tick() {
      const word = words[w];
      if (!del) {
        ch++;
        typingEl.textContent = word.slice(0, ch);
        if (ch === word.length) { del = true; setTimeout(tick, pause); return; }
        setTimeout(tick, speed);
      } else {
        ch--;
        typingEl.textContent = word.slice(0, ch);
        if (ch === 0) { del = false; w = (w + 1) % words.length; setTimeout(tick, 300); return; }
        setTimeout(tick, delSpeed);
      }
    })();
  } else {
    typingEl.textContent = words[0];
  }

  /* ---------- SECTION OBSERVER (reveal + nav highlight) ---------- */
  const sections = $$('main section.panel');
  const navLinks = $$('nav a');

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const id = entry.target.id;
      const link = document.querySelector(`nav a[href="#${id}"]`);
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        if (link) { navLinks.forEach(l => l.classList.remove('active')); link.classList.add('active'); }
      } else entry.target.classList.remove('active');
    });
  }, { threshold: 0.55 });

  sections.forEach(s => observer.observe(s));

  /* ---------- MODALS + FOCUS TRAP ---------- */
  const projectCards = $$('.project-card');
  const modals = $$('.modal');

  function getFocusable(root) {
    const sel = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
    return Array.from(root.querySelectorAll(sel)).filter(el => el.offsetParent !== null);
  }

  function openModal(modal, opener) {
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modal.classList.add('is-open');
    const focusables = getFocusable(modal);
    const first = focusables[0] || modal;
    first.focus();

    function trap(e) {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable(modal);
      if (focusable.length === 0) { e.preventDefault(); return; }
      const firstEl = focusable[0], lastEl = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    }

    modal._trap = trap;
    window.addEventListener('keydown', trap);
  }

  function closeModal(modal, opener) {
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    modal.classList.remove('is-open');
    if (modal._trap) { window.removeEventListener('keydown', modal._trap); delete modal._trap; }
    if (opener && typeof opener.focus === 'function') opener.focus();
  }

  projectCards.forEach(card => {
    const id = card.dataset.modal;
    const modal = document.getElementById(id);
    const opener = card;
    function openHandler() { openModal(modal, opener); }
    card.addEventListener('click', openHandler);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openHandler(); } });

    if (!modal) return;
    const closeBtn = modal.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => closeModal(modal, opener));
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal, opener); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal(modal, opener); });
  });

  /* ---------- WEATHER APP (Open-Meteo) ---------- */
  // Uses: https://geocoding-api.open-meteo.com/v1/search?name={city}
  // and: https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,weathercode&current_weather=true&timezone=auto
  const weatherForm = $('#weather-form');
  const cityInput = $('#city-input');
  const weatherResult = $('#weather-result');

  async function lookupCityWeather(city) {
    weatherResult.textContent = 'Looking up...';
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5`);
      const geo = await geoRes.json();
      if (!geo || !geo.results || geo.results.length === 0) {
        weatherResult.textContent = 'City not found. Try another name.';
        return;
      }
      const place = geo.results[0];
      const lat = place.latitude, lon = place.longitude;
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`);
      const w = await weatherRes.json();
      if (!w || !w.current_weather) { weatherResult.textContent = 'Weather data unavailable.'; return; }
      const cw = w.current_weather;
      weatherResult.innerHTML = `
        <strong>${place.name}, ${place.country}</strong>
        <div style="margin-top:8px">Temperature: <strong>${cw.temperature}°C</strong></div>
        <div>Wind: ${cw.windspeed} km/h • Direction: ${cw.winddirection}°</div>
        <div style="margin-top:8px;color:var(--muted);font-size:.95rem">Data provided by Open-Meteo</div>
      `;
    } catch (err) {
      console.error(err);
      weatherResult.textContent = 'Network error. Try again later.';
    }
  }

  weatherForm.addEventListener('submit', e => {
    e.preventDefault();
    const val = cityInput.value.trim();
    if (!val) return;
    lookupCityWeather(val);
  });

  /* ---------- TASK MANAGER ---------- */
  const tasksKey = 'dipson_tasks_v1';
  const taskForm = $('#task-form');
  const taskText = $('#task-text');
  const taskDue = $('#task-due');
  const tasksList = $('#tasks-list');

  function loadTasks() {
    try {
      const raw = localStorage.getItem(tasksKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }
  function saveTasks(tasks) { localStorage.setItem(tasksKey, JSON.stringify(tasks)); }

  function renderTasks() {
    const tasks = loadTasks();
    tasksList.innerHTML = '';
    if (tasks.length === 0) { tasksList.innerHTML = '<li class="muted small">No tasks yet.</li>'; return; }
    tasks.forEach((t, i) => {
      const li = document.createElement('li');
      li.className = 'task';
      const left = document.createElement('div');
      left.innerHTML = `<strong>${escapeHtml(t.title)}</strong><div class="meta">${t.due ? 'Due: ' + t.due : ''}</div>`;
      const right = document.createElement('div');
      right.innerHTML = `<button data-i="${i}" class="btn small edit">Edit</button> <button data-i="${i}" class="btn ghost small del">Delete</button>`;
      li.appendChild(left); li.appendChild(right);
      tasksList.appendChild(li);
    });
  }

  taskForm.addEventListener('submit', e => {
    e.preventDefault();
    const title = taskText.value.trim(); if (!title) return;
    const due = taskDue.value || '';
    const tasks = loadTasks();
    tasks.push({ title, due });
    saveTasks(tasks);
    taskText.value = ''; taskDue.value = '';
    renderTasks();
  });

  tasksList.addEventListener('click', e => {
    const idx = e.target.getAttribute('data-i');
    if (e.target.classList.contains('del')) {
      const tasks = loadTasks(); tasks.splice(idx,1); saveTasks(tasks); renderTasks();
    } else if (e.target.classList.contains('edit')) {
      const tasks = loadTasks(); const t = tasks[idx];
      const newTitle = prompt('Edit task title', t.title);
      if (newTitle !== null) { t.title = newTitle.trim() || t.title; saveTasks(tasks); renderTasks(); }
    }
  });

  renderTasks();

  /* ---------- MINI BLOG ---------- */
  const blogKey = 'dipson_blog_v1';
  const postForm = $('#post-form');
  const postTitle = $('#post-title');
  const postCategory = $('#post-category');
  const postBody = $('#post-body');
  const blogList = $('#blog-list');

  function loadPosts(){ try { const r = localStorage.getItem(blogKey); return r ? JSON.parse(r) : []; } catch { return []; } }
  function savePosts(p){ localStorage.setItem(blogKey, JSON.stringify(p)); }

  function renderPosts() {
    const posts = loadPosts();
    blogList.innerHTML = '';
    if (!posts.length) { blogList.innerHTML = '<div class="muted small">No posts yet.</div>'; return; }
    posts.slice().reverse().forEach((p, idx) => {
      const wrap = document.createElement('div'); wrap.className = 'post';
      wrap.innerHTML = `<h4>${escapeHtml(p.title)} <small style="color:var(--muted);font-weight:600">— ${escapeHtml(p.category)}</small></h4>
                        <div style="color:var(--muted);font-size:.95rem;margin-bottom:8px">${new Date(p.created).toLocaleString()}</div>
                        <div>${linkify(nl2br(escapeHtml(p.body)))}</div>
                        <div style="margin-top:8px"><button class="btn ghost btn-del" data-i="${p.created}">Delete</button></div>`;
      blogList.appendChild(wrap);
    });
  }

  postForm.addEventListener('submit', e => {
    e.preventDefault();
    const title = postTitle.value.trim(); const body = postBody.value.trim();
    if (!title || !body) return alert('Please add title and body.');
    const posts = loadPosts(); posts.push({ title, body, category: postCategory.value, created: Date.now() });
    savePosts(posts); postTitle.value=''; postBody.value=''; renderPosts();
  });

  blogList.addEventListener('click', e => {
    if (e.target.classList.contains('btn-del')) {
      const key = Number(e.target.dataset.i);
      if (!confirm('Delete this post?')) return;
      const posts = loadPosts().filter(p => p.created !== key);
      savePosts(posts); renderPosts();
    }
  });

  renderPosts();

  /* ---------- SNAKE GAME ---------- */
  const canvas = $('#snake-canvas');
  const ctx = canvas.getContext('2d');
  const snakeStartSize = 6;
  let snake = [], dir = {x:1,y:0}, food = null, tile = 16, score = 0, running=false, frameInterval=100;
  const snakeScore = $('#snake-score');
  const snakeStartBtn = $('#snake-start');
  const snakeResetBtn = $('#snake-reset');
  const snakeSpeed = $('#snake-speed');

  function resetSnake() {
    snake = [];
    for (let i = 0; i < snakeStartSize; i++) snake.push({x: 10 - i, y: 10});
    dir = {x:1,y:0}; spawnFood(); score=0; snakeScore.textContent = score;
  }
  function spawnFood(){
    const max = (canvas.width / tile) - 1;
    food = {x: Math.floor(Math.random() * max), y: Math.floor(Math.random() * max)};
  }
  function draw() {
    ctx.fillStyle = '#0f1724'; ctx.fillRect(0,0,canvas.width,canvas.height);
    // draw food
    ctx.fillStyle = '#e11d48'; ctx.fillRect(food.x*tile, food.y*tile, tile, tile);
    // draw snake
    ctx.fillStyle = '#10b981';
    snake.forEach(s => ctx.fillRect(s.x*tile, s.y*tile, tile-1, tile-1));
  }
  function step() {
    if (!running) return;
    const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
    const maxTiles = canvas.width / tile;
    // wrap-around
    head.x = (head.x + maxTiles) % maxTiles; head.y = (head.y + maxTiles) % maxTiles;
    // collision with self
    if (snake.some(s => s.x === head.x && s.y === head.y)) { running=false; alert('Game over! Score: ' + score); return; }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) { score++; snakeScore.textContent = score; spawnFood(); }
    else snake.pop();
    draw();
    setTimeout(step, frameInterval);
  }

  canvas.addEventListener('keydown', e => {
    switch (e.key) {
      case 'ArrowUp': if (dir.y!==1) dir={x:0,y:-1}; break;
      case 'ArrowDown': if (dir.y!==-1) dir={x:0,y:1}; break;
      case 'ArrowLeft': if (dir.x!==1) dir={x:-1,y:0}; break;
      case 'ArrowRight': if (dir.x!==-1) dir={x:1,y:0}; break;
    }
  });
  // Desktop: also listen globally
  window.addEventListener('keydown', e => {
    if (document.activeElement === canvas || document.querySelector('.modal[aria-hidden="false"]')) {
      switch (e.key) {
        case 'ArrowUp': if (dir.y!==1) dir={x:0,y:-1}; break;
        case 'ArrowDown': if (dir.y!==-1) dir={x:0,y:1}; break;
        case 'ArrowLeft': if (dir.x!==1) dir={x:-1,y:0}; break;
        case 'ArrowRight': if (dir.x!==-1) dir={x:1,y:0}; break;
      }
    }
  });

  snakeStartBtn.addEventListener('click', () => {
    frameInterval = Math.round(300 / Number(snakeSpeed.value));
    if (!running) { running = true; resetSnake(); step(); canvas.focus(); }
  });
  snakeResetBtn.addEventListener('click', () => { running=false; resetSnake(); draw(); snakeScore.textContent = score; });

  // initialize snake canvas size & tile
  function initSnakeCanvas() {
    // set tile so canvas width divisible
    canvas.width = 400; canvas.height = 400; tile = 16;
    resetSnake(); draw();
  }
  initSnakeCanvas();

  /* ---------- CALCULATOR ---------- */
  const calcDisplay = $('#calc-display');
  let calcExpression = '';
  function updateCalcDisplay() { calcDisplay.value = calcExpression || '0'; }
  $$('.calc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.value;
      if (v === '=') {
        try { calcExpression = String(eval(calcExpression)); } catch { calcExpression = 'ERR'; }
        updateCalcDisplay(); return;
      }
      if (v === undefined) return;
      if (v === 'C') { calcExpression = ''; updateCalcDisplay(); return; }
      calcExpression += v;
      updateCalcDisplay();
    });
  });
  $('#calc-clear') && $('#calc-clear').addEventListener('click', () => { calcExpression=''; updateCalcDisplay(); });
  $('#calc-del') && $('#calc-del').addEventListener('click', () => { calcExpression = calcExpression.slice(0,-1); updateCalcDisplay(); });

  // allow keyboard input for calculator
  window.addEventListener('keydown', e => {
    if (document.activeElement.closest('.modal') && document.activeElement.closest('.modal').id === 'modal-calc') {
      if ((/^[0-9+\-*/.]$/).test(e.key)) { calcExpression += e.key; updateCalcDisplay(); }
      else if (e.key === 'Enter') { try { calcExpression = String(eval(calcExpression)); } catch { calcExpression = 'ERR'; } updateCalcDisplay(); }
      else if (e.key === 'Backspace') { calcExpression = calcExpression.slice(0,-1); updateCalcDisplay(); }
      else if (e.key === 'Escape') { /* handled globally */ }
    }
  });

  /* ---------- UTILS ---------- */
  function escapeHtml(str) { return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function nl2br(s){ return s.replace(/\n/g,'<br>'); }
  function linkify(s){ return s.replace(/\bhttps?:\/\/[^\s"]+/g, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`); }

  /* ---------- OPTIONAL: basic service worker registration ---------- */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(()=>{/* ignore */});
  }

})();
