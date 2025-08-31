// script.js — complete, self-contained. Typing, theme, project entrance, accessible modals,
// Weather (Open-Meteo), Tasks (localStorage), Mini Blog (localStorage), Snake (canvas), Calculator.

(() => {
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  // --- small helpers ---
  const nowYear = new Date().getFullYear();
  document.getElementById('year')?.textContent = nowYear;
  const escapeHtml = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const nl2br = s => String(s).replace(/\n/g, '<br>');

  // --- theme toggle (persist) ---
  const themeBtn = $('#themeToggle');
  const userTheme = localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme:light)').matches ? 'light' : 'dark');
  if (userTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  themeBtn && themeBtn.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme','dark'); themeBtn.textContent = '🌙'; themeBtn.setAttribute('aria-pressed','false'); }
    else { document.documentElement.setAttribute('data-theme','light'); localStorage.setItem('theme','light'); themeBtn.textContent = '☀️'; themeBtn.setAttribute('aria-pressed','true'); }
  });

  // --- mobile menu toggle ---
  const menuBtn = $('#menuToggle');
  const navList = document.querySelector('.nav-list');
  menuBtn && menuBtn.addEventListener('click', () => {
    const open = navList.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });

  // --- typing animation ---
  const typingEl = document.getElementById('typing');
  const words = ['Learner', 'Web Developer', 'Designer'];
  if (typingEl) {
    let wi=0, ci=0, deleting=false;
    (function tick(){
      const w = words[wi];
      typingEl.textContent = w.slice(0, ci);
      if (!deleting) {
        if (ci < w.length) { ci++; setTimeout(tick, 140); }
        else { deleting = true; setTimeout(tick, 900); }
      } else {
        if (ci > 0) { ci--; setTimeout(tick, 80); }
        else { deleting = false; wi = (wi+1) % words.length; setTimeout(tick, 200); }
      }
    })();
  }

  // --- project entrance animation (staggered) ---
  const projects = $$('.project');
  if ('IntersectionObserver' in window && projects.length) {
    const obs = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const idx = projects.indexOf(el);
          el.style.setProperty('--delay', `${idx * 80}ms`);
          el.classList.add('in');
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.18 });
    projects.forEach(p => obs.observe(p));
  } else {
    projects.forEach((p,i) => { p.style.setProperty('--delay', `${i*80}ms`); p.classList.add('in'); });
  }

  // --- accessible modals (generic) ---
  const modalSelector = '.modal';
  const modalEls = $$(modalSelector);
  function focusables(root){ return Array.from(root.querySelectorAll('button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])')).filter(e => e.offsetParent !== null); }
  function openModal(modal, opener){
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    const f = focusables(modal);
    if (f.length) f[0].focus();
    function trap(e){
      if (e.key !== 'Tab') return;
      const list = focusables(modal);
      if (list.length === 0) { e.preventDefault(); return; }
      const idx = list.indexOf(document.activeElement);
      if (e.shiftKey && idx === 0){ e.preventDefault(); list[list.length-1].focus(); }
      else if (!e.shiftKey && idx === list.length-1){ e.preventDefault(); list[0].focus(); }
    }
    modal._trap = trap;
    window.addEventListener('keydown', trap);
  }
  function closeModal(modal, opener){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    if (modal._trap) { window.removeEventListener('keydown', modal._trap); delete modal._trap; }
    opener && opener.focus();
  }

  // attach openers (project cards)
  projects.forEach(proj => {
    const id = proj.dataset.modal;
    const modal = document.getElementById(id);
    proj.addEventListener('click', () => openModal(modal, proj));
    proj.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(modal, proj); }});
  });

  // attach modal closes + backdrop click + ESC
  modalEls.forEach(m => {
    const closeBtn = m.querySelector('.modal-close');
    closeBtn && closeBtn.addEventListener('click', () => closeModal(m));
    m.addEventListener('click', e => { if (e.target === m) closeModal(m); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && m.getAttribute('aria-hidden') === 'false') closeModal(m); });
  });

  // --- WEATHER app (Open-Meteo) ---
  (function weatherApp(){
    const form = $('#weather-form');
    const input = $('#weather-input');
    const output = $('#weather-output');
    async function lookup(city){
      output.textContent = 'Looking up…';
      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5`).then(r=>r.json());
        if (!geoRes.results || geoRes.results.length === 0) { output.textContent = 'City not found.'; return; }
        const loc = geoRes.results[0];
        const lat = loc.latitude, lon = loc.longitude;
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`).then(r=>r.json());
        const cw = weatherRes.current_weather;
        if (!cw) { output.textContent = 'Weather unavailable.'; return; }
        output.innerHTML = `<strong>${escapeHtml(loc.name)}, ${escapeHtml(loc.country)}</strong>
          <div>Temperature: <strong>${cw.temperature}°C</strong></div>
          <div>Wind: ${cw.windspeed} km/h • Direction: ${cw.winddirection}°</div>
          <div class="muted small">source: Open-Meteo</div>`;
      } catch (err) {
        console.error(err);
        output.textContent = 'Network error.';
      }
    }
    form && form.addEventListener('submit', e => { e.preventDefault(); const v = input.value.trim(); if (!v) return; lookup(v); });
  })();

  // --- TASKS (localStorage) ---
  (function tasksApp(){
    const form = $('#task-form'), input = $('#task-input'), due = $('#task-due'), list = $('#task-list');
    const KEY = 'dipson_tasks_v1';
    function load(){ try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
    function save(a){ localStorage.setItem(KEY, JSON.stringify(a)); }
    function render(){
      if (!list) return;
      const items = load();
      list.innerHTML = items.length ? '' : '<li class="muted">No tasks</li>';
      items.forEach((t,i) => {
        const li = document.createElement('li');
        li.innerHTML = `<div>
            <strong>${escapeHtml(t.title)}</strong>
            <div class="muted small">${t.due || ''}</div>
          </div>
          <div class="actions">
            <button class="btn small edit" data-i="${i}">Edit</button>
            <button class="btn ghost small del" data-i="${i}">Delete</button>
          </div>`;
        list.appendChild(li);
      });
    }
    form && form.addEventListener('submit', e => {
      e.preventDefault();
      const title = input.value.trim(); if (!title) return;
      const arr = load(); arr.push({ title, due: due.value || '' }); save(arr); input.value=''; due.value=''; render();
    });
    list && list.addEventListener('click', e => {
      const i = e.target.dataset.i; if (i === undefined) return;
      const arr = load();
      if (e.target.classList.contains('del')) { arr.splice(i,1); save(arr); render(); }
      if (e.target.classList.contains('edit')) {
        const val = prompt('Edit task', arr[i].title);
        if (val !== null) { arr[i].title = val; save(arr); render(); }
      }
    });
    render();
  })();

  // --- MINI BLOG (localStorage) ---
  (function blogApp(){
    const form = $('#post-form'), title = $('#post-title'), cat = $('#post-cat'), body = $('#post-body'), out = $('#posts');
    const KEY = 'dipson_posts_v1';
    function load(){ try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
    function save(a){ localStorage.setItem(KEY, JSON.stringify(a)); }
    function render(){
      if (!out) return;
      const posts = load();
      out.innerHTML = posts.length ? '' : '<div class="muted">No posts yet</div>';
      posts.slice().reverse().forEach(p => {
        const d = new Date(p.created).toLocaleString();
        const div = document.createElement('div');
        div.className = 'post';
        div.innerHTML = `<h4>${escapeHtml(p.title)} <small class="muted">— ${escapeHtml(p.category)}</small></h4>
          <div class="muted small">${d}</div>
          <div style="margin-top:8px">${nl2br(escapeHtml(p.body))}</div>
          <div style="margin-top:8px"><button class="btn ghost del" data-id="${p.created}">Delete</button></div>`;
        out.appendChild(div);
      });
    }
    form && form.addEventListener('submit', e => {
      e.preventDefault();
      const t = title.value.trim(), b = body.value.trim();
      if (!t || !b) return alert('Title and body required.');
      const arr = load(); arr.push({ title: t, body: b, category: cat.value, created: Date.now() });
      save(arr); title.value=''; body.value=''; render();
    });
    out && out.addEventListener('click', e => {
      if (!e.target.classList.contains('del')) return;
      const id = Number(e.target.dataset.id); if (!confirm('Delete post?')) return;
      const arr = load().filter(p => p.created !== id); save(arr); render();
    });
    render();
  })();

  // --- SNAKE (canvas) ---
  (function snakeApp(){
    const canvas = $('#snake-canvas'); const ctx = canvas && canvas.getContext('2d');
    const speedRange = $('#snake-speed'); const startBtn = $('#snake-start'); const resetBtn = $('#snake-reset'); const scoreEl = $('#snake-score');
    if (!canvas || !ctx) return;
    let grid = 18, snake = [], dir = {x:1,y:0}, food = null, score = 0, running=false, tick=0, speed=10;
    function init(){ const cols = Math.floor(canvas.width / grid); snake = []; for (let i=0;i<5;i++) snake.push({x: Math.floor(cols/2)-i, y: Math.floor(cols/2)}); spawn(); score=0; if(scoreEl) scoreEl.textContent=score; dir={x:1,y:0}; draw(); }
    function spawn(){ const cols = Math.floor(canvas.width / grid); food = { x: Math.floor(Math.random()*cols), y: Math.floor(Math.random()*cols) }; }
    function draw(){ ctx.fillStyle = '#0b1220'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#ff4d6d'; ctx.fillRect(food.x*grid, food.y*grid, grid-1, grid-1); ctx.fillStyle='#22c55e'; snake.forEach(s=>ctx.fillRect(s.x*grid, s.y*grid, grid-1, grid-1)); }
    function step(){
      if(!running) return;
      tick++;
      if (tick % Math.max(1, Math.floor(20-speed)) !== 0) { requestAnimationFrame(step); return; }
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      const cols = Math.floor(canvas.width / grid);
      head.x = (head.x + cols) % cols; head.y = (head.y + cols) % cols;
      if (snake.some(s => s.x===head.x && s.y===head.y)) { running=false; alert('Game over — score: '+score); return; }
      snake.unshift(head);
      if (head.x===food.x && head.y===food.y) { score++; scoreEl.textContent = score; spawn(); }
      else snake.pop();
      draw(); requestAnimationFrame(step);
    }
    startBtn && startBtn.addEventListener('click', ()=> { speed = Number(speedRange.value); if(!running){ running=true; init(); step(); }});
    resetBtn && resetBtn.addEventListener('click', ()=> { running=false; init(); });
    window.addEventListener('keydown', e => {
      if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;
      if (e.key==='ArrowUp' && dir.y!==1) dir={x:0,y:-1};
      if (e.key==='ArrowDown' && dir.y!==-1) dir={x:0,y:1};
      if (e.key==='ArrowLeft' && dir.x!==1) dir={x:-1,y:0};
      if (e.key==='ArrowRight' && dir.x!==-1) dir={x:1,y:0};
    });
    canvas.width = 360; canvas.height = 360; grid = 18; init();
  })();

  // --- Calculator ---
  (function calcApp(){
    const display = $('#calc-display'); const grid = $('#calc-grid');
    if (!grid || !display) return;
    const buttons = ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'];
    let expr = '';
    function update(){ display.value = expr || '0'; }
    function safeEval(s){ if (!/^[0-9+\-*/().\s%]*$/.test(s)) throw new Error('Invalid'); return Function('"use strict";return('+s+')')(); }
    buttons.forEach(b => {
      const btn = document.createElement('button'); btn.className='calc-btn'; btn.textContent = b; btn.dataset.val = b;
      if ('+-*/'.includes(b)) btn.classList.add('op');
      btn.addEventListener('click', ()=> {
        if (b === '=') { try { expr = String(safeEval(expr)); } catch { expr = 'ERR'; } update(); return; }
        expr += b; update();
      });
      grid.appendChild(btn);
    });
    const clear = document.createElement('button'); clear.className='calc-btn ghost'; clear.textContent='C'; clear.addEventListener('click', ()=>{ expr=''; update(); });
    const del = document.createElement('button'); del.className='calc-btn ghost'; del.textContent='⌫'; del.addEventListener('click', ()=>{ expr = expr.slice(0,-1); update(); });
    grid.appendChild(clear); grid.appendChild(del);
    update();
  })();

  // --- contact demo (placeholder) ---
  $('#contact-form')?.addEventListener('submit', e => { e.preventDefault(); alert('Thanks! Message captured locally (demo).'); $('#cf-name').value=''; $('#cf-email').value=''; $('#cf-msg').value=''; });

  // ensure modals have close buttons wired (some markup uses .modal-close)
  $$('.modal').forEach(m => {
    const close = m.querySelector('.modal-close, .modal .modal-close');
    if (close) close.addEventListener('click', () => { m.setAttribute('aria-hidden','true'); });
  });

})();
