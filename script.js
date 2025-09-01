// Save as script.js and referenced by your HTML (defer already added)
(function(){
  // Utils
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  function qsAll(sel){ return Array.from(document.querySelectorAll(sel)); }

  // Year
  const yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  // Theme toggle persisted
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  function applyTheme(t){
    if(t === 'light') root.setAttribute('data-theme','light');
    else root.removeAttribute('data-theme');
    if(themeToggle) themeToggle.setAttribute('aria-pressed', t==='light' ? 'true' : 'false');
  }
  const saved = localStorage.getItem('dn_theme') || 'dark';
  applyTheme(saved);
  if(themeToggle){
    themeToggle.addEventListener('click', ()=>{
      const now = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(now);
      localStorage.setItem('dn_theme', now);
      themeToggle.textContent = now==='light' ? '🌙' : '☀️';
    });
    // initial label
    themeToggle.textContent = root.getAttribute('data-theme') === 'light' ? '🌙' : '☀️';
  }

  // Mobile menu toggle
  const menuToggle = document.getElementById('menuToggle');
  if(menuToggle){
    menuToggle.addEventListener('click', ()=>{
      const nav = document.querySelector('.nav-list');
      const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!expanded));
      if(!expanded){ nav.style.display = 'flex'; } else { nav.style.display = ''; }
    });
  }

  // Hero typing animations: micro H1 "tag" + longer typing
  const h1Anim = document.querySelector('.h1-anim');
  const typingEl = document.getElementById('typing');
  const h1Words = ['Frontend Engineer','UI tinkerer','Performance fan'];
  const typingPhrases = [
    'I ship readable code.',
    'Small apps. Big clarity.',
    'Accessible by default.'
  ];
  // H1 small cycling
  if(h1Anim){
    let i = 0;
    function cycleH1(){
      h1Anim.textContent = h1Words[i];
      h1Anim.classList.add('visible');
      setTimeout(()=>{ h1Anim.classList.remove('visible'); i = (i+1)%h1Words.length; setTimeout(cycleH1, 600); }, 1800);
    }
    cycleH1();
  }

  // full typing (type + erase)
  if(typingEl){
    let pIdx = 0, charIdx = 0, deleting = false;
    function tick(){
      const txt = typingPhrases[pIdx];
      if(!deleting){
        charIdx++;
        typingEl.textContent = txt.slice(0,charIdx) + (charIdx%2? '':'');
        if(charIdx === txt.length){ deleting = true; setTimeout(tick, 1200); return; }
      } else {
        charIdx--;
        typingEl.textContent = txt.slice(0,charIdx);
        if(charIdx === 0){ deleting = false; pIdx = (pIdx+1)%typingPhrases.length; setTimeout(tick, 400); return; }
      }
      setTimeout(tick, deleting? 40 : 70);
    }
    tick();
  }

  // Reveal on scroll for projects & cards
  const revealEls = qsAll('.project, .card');
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver(entries=>{
      entries.forEach(en=>{
        if(en.isIntersecting) en.target.classList.add('visible');
      });
    }, {threshold:.12});
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(e => e.classList.add('visible'));
  }

  // Modal system: open by clicking project with data-modal attribute
  const openModal = id => {
    const modal = document.getElementById(id);
    if(!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    // focus first focusable
    setTimeout(()=> {
      const focusable = modal.querySelector('button, a, input, textarea, select');
      if(focusable) focusable.focus();
    }, 80);
    // trap simple
    lastActive = document.activeElement;
    trapFocus(modal);
  };
  const closeModalEl = el => {
    el.classList.remove('open');
    el.setAttribute('aria-hidden','true');
    if(lastActive) lastActive.focus();
  };
  let lastActive = null;
  // attach project click handlers
  qsAll('.project').forEach(p=>{
    p.addEventListener('click', ()=> openModal(p.dataset.modal));
    p.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(p.dataset.modal); }});
  });
  // modal close buttons
  qsAll('.modal').forEach(mod => {
    const close = mod.querySelector('.modal-close');
    if(close) close.addEventListener('click', ()=> closeModalEl(mod));
    // click outside to close
    mod.addEventListener('click', e => { if(e.target === mod) closeModalEl(mod); });
  });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape') qsAll('.modal.open').forEach(m => closeModalEl(m));
  });

  // Focus trap (basic): keep Tab inside modal
  function trapFocus(modal){
    const focusable = modal.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
    if(!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length -1];
    function handler(e){
      if(e.key !== 'Tab') return;
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
    modal.addEventListener('keydown', handler);
    modal._trapHandler = handler;
  }

  // Remove trap when closed
  const observer = new MutationObserver(muts=>{
    muts.forEach(m=>{
      if(m.type === 'attributes' && m.target.classList && !m.target.classList.contains('open')){
        if(m.target._trapHandler) { m.target.removeEventListener('keydown', m.target._trapHandler); m.target._trapHandler = null; }
      }
    });
  });
  qsAll('.modal').forEach(m => observer.observe(m, {attributes:true}));

  /***********************
   * DEMO: Weather App
   * Uses Open-Meteo geocoding + forecast (no key)
   ************************/
  const weatherForm = document.getElementById('weather-form');
  const weatherOutput = document.getElementById('weather-output');
  if(weatherForm){
    weatherForm.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      const q = document.getElementById('weather-input').value.trim();
      if(!q) return;
      weatherOutput.textContent = 'Searching…';
      try{
        // geocode via Open-Meteo geocoding
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`);
        const geo = await geoRes.json();
        if(!geo.results || geo.results.length === 0){ weatherOutput.textContent = 'Location not found.'; return; }
        const {latitude, longitude, name, country} = geo.results[0];
        const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`);
        const w = await wRes.json();
        if(!w.current_weather){ weatherOutput.textContent = 'Weather unavailable.'; return; }
        const cw = w.current_weather;
        weatherOutput.innerHTML = `<strong>${name}, ${country}</strong><div style="margin-top:.4rem">Temperature: ${cw.temperature}°C · Wind: ${cw.windspeed} km/h · Weather code: ${cw.weathercode}</div>`;
      }catch(err){
        weatherOutput.textContent = 'Error fetching weather.';
        console.error(err);
      }
    });
  }

  /***********************
   * DEMO: Task Manager (localStorage)
   ************************/
  const TASK_KEY = 'dn_tasks_v1';
  const taskForm = document.getElementById('task-form');
  const taskListEl = document.getElementById('task-list');
  if(taskForm && taskListEl){
    function loadTasks(){ return JSON.parse(localStorage.getItem(TASK_KEY) || '[]'); }
    function saveTasks(a){ localStorage.setItem(TASK_KEY, JSON.stringify(a)); }
    function renderTasks(){
      const tasks = loadTasks();
      taskListEl.innerHTML = '';
      tasks.forEach((t,i)=>{
        const li = document.createElement('li');
        li.className = 'task-item';
        li.style.padding = '.45rem 0';
        li.innerHTML = `<label style="display:flex;align-items:center;gap:.6rem">
          <input type="checkbox" ${t.done ? 'checked' : ''} data-i="${i}">
          <span style="flex:1">${escapeHtml(t.title)} ${t.due ? '<small style="color:var(--muted);margin-left:.5rem">• ' + escapeHtml(t.due) + '</small>' : ''}</span>
          <button data-del="${i}" style="margin-left:.5rem;padding:.25rem .45rem;border-radius:6px;background:#ff7b7b;color:#02121d;border:0">Del</button>
        </label>`;
        taskListEl.appendChild(li);
      });
      // events
      taskListEl.querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener('change', ()=>{
        const i = +cb.dataset.i; const tasks = loadTasks(); tasks[i].done = cb.checked; saveTasks(tasks); renderTasks();
      }));
      taskListEl.querySelectorAll('button[data-del]').forEach(btn => btn.addEventListener('click', ()=>{
        const i = +btn.dataset.del; const tasks = loadTasks(); tasks.splice(i,1); saveTasks(tasks); renderTasks();
      }));
    }
    taskForm.addEventListener('submit', e => {
      e.preventDefault();
      const title = document.getElementById('task-input').value.trim();
      const due = document.getElementById('task-due').value || '';
      if(!title) return;
      const tasks = loadTasks();
      tasks.unshift({title, due, done:false});
      saveTasks(tasks);
      taskForm.reset();
      renderTasks();
    });
    renderTasks();
  }

  /***********************
   * DEMO: Mini Blog (localStorage)
   ************************/
  const POSTS_KEY = 'dn_posts_v1';
  const postForm = document.getElementById('post-form');
  const postsEl = document.getElementById('posts');
  if(postForm && postsEl){
    function loadPosts(){ return JSON.parse(localStorage.getItem(POSTS_KEY) || '[]'); }
    function savePosts(a){ localStorage.setItem(POSTS_KEY, JSON.stringify(a)); }
    function renderPosts(){
      const posts = loadPosts();
      postsEl.innerHTML = posts.map((p, i)=> `
        <article style="padding:.6rem;border-bottom:1px solid rgba(255,255,255,0.02);margin-bottom:.4rem">
          <strong>${escapeHtml(p.title)}</strong> <small style="color:var(--muted)">• ${escapeHtml(p.cat)}</small>
          <div style="margin-top:.4rem">${escapeHtml(p.body)}</div>
          <div style="margin-top:.4rem"><button data-del="${i}" style="padding:.3rem .45rem;border-radius:6px;background:#ff7b7b;border:0;color:#02121d">Delete</button></div>
        </article>
      `).join('') || '<div class="muted">No posts yet.</div>';
      postsEl.querySelectorAll('button[data-del]').forEach(b => b.addEventListener('click', ()=>{
        const i = +b.dataset.del; const posts = loadPosts(); posts.splice(i,1); savePosts(posts); renderPosts();
      }));
    }
    postForm.addEventListener('submit', e => {
      e.preventDefault();
      const title = document.getElementById('post-title').value.trim();
      const cat = document.getElementById('post-cat').value || 'General';
      const body = document.getElementById('post-body').value.trim();
      if(!title || !body) return;
      const posts = loadPosts();
      posts.unshift({title, cat, body, created: Date.now()});
      savePosts(posts);
      postForm.reset();
      renderPosts();
    });
    renderPosts();
  }

  /***********************
   * DEMO: Snake (canvas)
   ************************/
  const snakeCanvas = document.getElementById('snake-canvas');
  const snakeStart = document.getElementById('snake-start');
  const snakeReset = document.getElementById('snake-reset');
  const snakeSpeedControl = document.getElementById('snake-speed');
  const snakeScore = document.getElementById('snake-score');

  if(snakeCanvas && snakeStart){
    const ctx = snakeCanvas.getContext('2d');
    const size = 18; // cells
    let gridSize = 18;
    const cell = Math.floor(snakeCanvas.width / gridSize);
    let snake = [{x:8,y:8}];
    let dir = {x:1,y:0};
    let food = {x:3,y:3};
    let running = false;
    let score = 0;
    let tickId = null;

    function draw(){
      ctx.clearRect(0,0,snakeCanvas.width,snakeCanvas.height);
      // bg
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(0,0,snakeCanvas.width,snakeCanvas.height);
      // food
      ctx.fillStyle = '#ffb703';
      ctx.fillRect(food.x*cell, food.y*cell, cell-1, cell-1);
      // snake
      ctx.fillStyle = '#7c83ff';
      snake.forEach(s=> ctx.fillRect(s.x*cell, s.y*cell, cell-1, cell-1));
    }

    function placeFood(){
      food = { x: Math.floor(Math.random()*gridSize), y: Math.floor(Math.random()*gridSize) };
    }

    function step(){
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      // wrap
      head.x = (head.x + gridSize) % gridSize;
      head.y = (head.y + gridSize) % gridSize;
      // collision with self
      if(snake.some(seg => seg.x === head.x && seg.y === head.y)){
        running = false;
        clearInterval(tickId);
        return;
      }
      snake.unshift(head);
      if(head.x === food.x && head.y === food.y){
        score++; snakeScore.textContent = score; placeFood();
      } else {
        snake.pop();
      }
      draw();
    }

    function startSnake(){
      if(running) return;
      running = true; score = 0; snakeScore.textContent = 0;
      snake = [{x:8,y:8},{x:7,y:8}]; dir = {x:1,y:0}; placeFood();
      const speed = +snakeSpeedControl.value;
      clearInterval(tickId);
      tickId = setInterval(step, Math.round(1400 / speed));
    }

    snakeStart.addEventListener('click', startSnake);
    snakeReset.addEventListener('click', ()=>{ running=false; clearInterval(tickId); snake = [{x:8,y:8}]; score=0; snakeScore.textContent = '0'; draw(); });

    document.addEventListener('keydown', e=>{
      if(['ArrowUp','KeyW'].includes(e.code)) dir = {x:0,y:-1};
      if(['ArrowDown','KeyS'].includes(e.code)) dir = {x:0,y:1};
      if(['ArrowLeft','KeyA'].includes(e.code)) dir = {x:-1,y:0};
      if(['ArrowRight','KeyD'].includes(e.code)) dir = {x:1,y:0};
    });

    // initial draw
    draw();
  }

  /***********************
   * DEMO: Calculator
   ************************/
  const calcGrid = document.getElementById('calc-grid');
  const calcDisplay = document.getElementById('calc-display');
  if(calcGrid && calcDisplay){
    const keys = [
      '7','8','9','/',
      '4','5','6','*',
      '1','2','3','-',
      '0','.','=','+'
    ];
    keys.forEach(k=>{
      const b = document.createElement('button');
      b.type='button';
      b.textContent = k;
      b.addEventListener('click', ()=> handleKey(k));
      calcGrid.appendChild(b);
    });
    function handleKey(k){
      if(k === '='){
        try{
          const val = safeEval(calcDisplay.value || '0');
          calcDisplay.value = String(val);
        }catch(err){
          calcDisplay.value = 'err';
        }
      } else {
        calcDisplay.value = (calcDisplay.value || '') + k;
      }
    }
    document.addEventListener('keydown', e=>{
      if(/^[0-9+\-*/.=]$/.test(e.key)) handleKey(e.key === '=' ? '=' : e.key);
      if(e.key === 'Enter') handleKey('=');
      if(e.key === 'Backspace') calcDisplay.value = calcDisplay.value.slice(0,-1);
    });
  }
  // safe evaluator: only digits, operators, parentheses, dot
  function safeEval(expr){
    if(!/^[0-9+\-*/().\s]+$/.test(expr)) throw new Error('Invalid chars');
    // eslint-disable-next-line no-new-func
    return Function('"use strict";return (' + expr + ')')();
  }

  // small helper
  function escapeHtml(s){ return (s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // Accessibility: ensure modal close returns to previous focus (handled in open/close)

  // Final: ensure images lazy loaded
  qsAll('img.thumb').forEach(img => { img.loading = 'lazy'; });

})();
