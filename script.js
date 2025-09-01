(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // year
  const yearEl = $('#year'); if(yearEl) yearEl.textContent = (new Date()).getFullYear();

  // Theme
  const root = document.documentElement;
  const themeToggle = $('#themeToggle');
  const saved = localStorage.getItem('dn_theme') || 'dark';
  function applyTheme(t){
    if(t === 'light') root.setAttribute('data-theme','light'); else root.removeAttribute('data-theme');
    if(themeToggle) themeToggle.setAttribute('aria-pressed', t==='light');
    if(themeToggle) themeToggle.textContent = t==='light' ? '🌙' : '☀️';
  }
  applyTheme(saved);
  if(themeToggle) themeToggle.addEventListener('click', ()=>{
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(next); localStorage.setItem('dn_theme', next);
  });

  // Mobile menu
  const menuToggle = $('#menuToggle');
  if(menuToggle){
    menuToggle.addEventListener('click', ()=>{
      const nav = document.querySelector('.nav-list');
      const open = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!open));
      nav.style.display = open ? '' : 'flex';
    });
  }

  // Typing animation (lightweight, respects prefers-reduced-motion)
  (function typing(){
    const textEl = $('#typing-text');
    const cursor = document.querySelector('.typing .cursor');
    const phrases = [
      'Small apps · Clear code · Performance-minded',
      'Accessible by default',
      'Readable, testable, fast'
    ];
    if(!textEl) return;
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches){
      // Respect reduced motion: static first phrase
      textEl.textContent = phrases[0];
      if(cursor) cursor.style.display = 'none';
      return;
    }

    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let active = true;

    // Pause when page hidden to save CPU
    document.addEventListener('visibilitychange', () => { active = !document.hidden; });

    function tick(){
      if(!active){
        setTimeout(tick, 300);
        return;
      }
      const phrase = phrases[phraseIdx];
      if(!deleting){
        charIdx++;
        textEl.textContent = phrase.slice(0, charIdx);
        if(charIdx >= phrase.length){
          // pause at end
          setTimeout(()=> { deleting = true; setTimeout(tick, 60); }, 900);
          return;
        }
        setTimeout(tick, 70 + (Math.random()*30));
      } else {
        charIdx--;
        textEl.textContent = phrase.slice(0, charIdx);
        if(charIdx <= 0){
          deleting = false;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          setTimeout(tick, 250);
          return;
        }
        setTimeout(tick, 35 + (Math.random()*20));
      }
    }
    tick();
  })();

  // Reveal on scroll
  const revealEls = $$('.project, .card');
  if('IntersectionObserver' in window && revealEls.length){
    const io = new IntersectionObserver(entries=>{
      entries.forEach(en => { if(en.isIntersecting) en.target.classList.add('visible'); });
    }, {threshold: .12});
    revealEls.forEach(r => io.observe(r));
  } else {
    revealEls.forEach(r => r.classList.add('visible'));
  }

  // Modal handling (delegated)
  let lastActive = null;
  function openModal(id){
    const modal = document.getElementById(id); if(!modal) return;
    lastActive = document.activeElement;
    modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
    const btn = modal.querySelector('.modal-close'); if(btn) btn.focus();
    trapFocus(modal);
  }
  function closeModal(modal){
    modal.classList.remove('open'); modal.setAttribute('aria-hidden','true');
    releaseTrap(modal);
    if(lastActive) lastActive.focus();
  }
  document.addEventListener('click', e=>{
    const p = e.target.closest('.project');
    if(p) openModal(p.dataset.modal);
    const close = e.target.closest('.modal-close');
    if(close){
      const m = close.closest('.modal'); if(m) closeModal(m);
    }
    if(e.target.classList && e.target.classList.contains('modal')) closeModal(e.target);
  });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') $$('.modal.open').forEach(m => closeModal(m)); });

  // Focus trap helpers
  function trapFocus(modal){
    const focusable = modal.querySelectorAll('a[href],button,textarea,input,select,[tabindex]:not([tabindex="-1"])');
    if(!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length-1];
    function handler(e){
      if(e.key !== 'Tab') return;
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
    modal._handler = handler;
    modal.addEventListener('keydown', handler);
  }
  function releaseTrap(modal){
    if(modal._handler){ modal.removeEventListener('keydown', modal._handler); modal._handler = null; }
  }

  // WEATHER demo (Open-Meteo)
  const weatherForm = $('#weather-form'), weatherOut = $('#weather-output');
  if(weatherForm && weatherOut){
    weatherForm.addEventListener('submit', async e=>{
      e.preventDefault();
      const q = $('#weather-input').value.trim(); if(!q) return;
      weatherOut.textContent = 'Searching…';
      try{
        const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`).then(r=>r.json());
        if(!g.results || !g.results[0]) return weatherOut.textContent = 'Location not found.';
        const {latitude, longitude, name, country} = g.results[0];
        const wf = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`).then(r=>r.json());
        if(!wf.current_weather) return weatherOut.textContent = 'Weather unavailable.';
        const cw = wf.current_weather;
        weatherOut.innerHTML = `<strong>${escapeHtml(name)}, ${escapeHtml(country)}</strong><div style="margin-top:.4rem">Temperature: ${cw.temperature}°C · Wind: ${cw.windspeed} km/h · Code: ${cw.weathercode}</div>`;
      }catch(err){
        weatherOut.textContent = 'Error fetching weather.';
        console.error(err);
      }
    });
  }

  // TASKS
  const TASK_KEY = 'dn_tasks_v1';
  const taskForm = $('#task-form'), taskList = $('#task-list');
  if(taskForm && taskList){
    function loadTasks(){ return JSON.parse(localStorage.getItem(TASK_KEY) || '[]'); }
    function saveTasks(t){ localStorage.setItem(TASK_KEY, JSON.stringify(t)); }
    function renderTasks(){
      const tasks = loadTasks(); taskList.innerHTML = '';
      tasks.forEach((t,i)=>{
        const li = document.createElement('li');
        li.style.padding = '.4rem 0';
        li.innerHTML = `<label style="display:flex;align-items:center;gap:.5rem">
          <input type="checkbox" ${t.done ? 'checked':''} data-i="${i}">
          <span style="flex:1">${escapeHtml(t.title)} ${t.due?'<small style="color:var(--muted);margin-left:.5rem">• '+escapeHtml(t.due)+'</small>':''}</span>
          <button data-del="${i}" style="margin-left:.4rem;padding:.25rem .45rem;border-radius:6px;background:#ff7b7b;border:0;color:#02121d">Del</button>
        </label>`;
        taskList.appendChild(li);
      });
      taskList.querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener('change', ()=>{
        const i = +cb.dataset.i; const t = loadTasks(); t[i].done = cb.checked; saveTasks(t); renderTasks();
      }));
      taskList.querySelectorAll('button[data-del]').forEach(b => b.addEventListener('click', ()=>{
        const i = +b.dataset.del; const t = loadTasks(); t.splice(i,1); saveTasks(t); renderTasks();
      }));
    }
    taskForm.addEventListener('submit', e=>{
      e.preventDefault();
      const title = $('#task-input').value.trim(); const due = $('#task-due').value || '';
      if(!title) return;
      const t = loadTasks(); t.unshift({title,due,done:false}); saveTasks(t); taskForm.reset(); renderTasks();
    });
    renderTasks();
  }

  // MINI BLOG
  const POSTS_KEY = 'dn_posts_v1';
  const postForm = $('#post-form'), postsEl = $('#posts');
  if(postForm && postsEl){
    function loadPosts(){ return JSON.parse(localStorage.getItem(POSTS_KEY) || '[]'); }
    function savePosts(p){ localStorage.setItem(POSTS_KEY, JSON.stringify(p)); }
    function renderPosts(){
      const ps = loadPosts();
      postsEl.innerHTML = ps.map((p,i)=>`
        <article style="padding:.6rem;border-bottom:1px solid rgba(255,255,255,0.02);margin-bottom:.4rem">
          <strong>${escapeHtml(p.title)}</strong> <small style="color:var(--muted)">• ${escapeHtml(p.cat)}</small>
          <div style="margin-top:.4rem">${escapeHtml(p.body)}</div>
          <div style="margin-top:.4rem"><button data-del="${i}" style="padding:.3rem .45rem;border-radius:6px;background:#ff7b7b;border:0;color:#02121d">Delete</button></div>
        </article>`).join('') || '<div class="muted">No posts yet.</div>';
      postsEl.querySelectorAll('button[data-del]').forEach(b => b.addEventListener('click', ()=>{
        const i = +b.dataset.del; const ps = loadPosts(); ps.splice(i,1); savePosts(ps); renderPosts();
      }));
    }
    postForm.addEventListener('submit', e=>{
      e.preventDefault();
      const title = $('#post-title').value.trim(); const cat = $('#post-cat').value || 'General'; const body = $('#post-body').value.trim();
      if(!title || !body) return;
      const ps = loadPosts(); ps.unshift({title,cat,body,created:Date.now()}); savePosts(ps); postForm.reset(); renderPosts();
    });
    renderPosts();
  }

  // SNAKE
  const snakeCanvas = $('#snake-canvas'), snakeStart = $('#snake-start'), snakeReset = $('#snake-reset'), snakeSpeed = $('#snake-speed'), snakeScore = $('#snake-score');
  if(snakeCanvas && snakeStart){
    const ctx = snakeCanvas.getContext('2d'), grid = 18;
    let cell = Math.floor(snakeCanvas.width / grid);
    let snake = [{x:8,y:8}]; let dir = {x:1,y:0}; let food = {x:3,y:3}; let running=false, score=0, tickId=null;
    function draw(){ ctx.clearRect(0,0,snakeCanvas.width,snakeCanvas.height); ctx.fillStyle='rgba(255,255,255,0.02)'; ctx.fillRect(0,0,snakeCanvas.width,snakeCanvas.height); ctx.fillStyle='#00b3c6'; snake.forEach(s=> ctx.fillRect(s.x*cell,s.y*cell,cell-1,cell-1)); ctx.fillStyle='#ffb703'; ctx.fillRect(food.x*cell,food.y*cell,cell-1,cell-1); }
    function placeFood(){ food = {x:Math.floor(Math.random()*grid), y:Math.floor(Math.random()*grid)}; }
    function step(){
      const head = {x:(snake[0].x+dir.x+grid)%grid, y:(snake[0].y+dir.y+grid)%grid};
      if(snake.some(s=>s.x===head.x && s.y===head.y)){ running=false; clearInterval(tickId); return; }
      snake.unshift(head);
      if(head.x===food.x && head.y===food.y){ score++; snakeScore.textContent = score; placeFood(); } else snake.pop();
      draw();
    }
    function start(){ if(running) return; running=true; score=0; snakeScore.textContent=0; snake=[{x:8,y:8},{x:7,y:8}]; dir={x:1,y:0}; placeFood(); clearInterval(tickId); tickId=setInterval(step, Math.round(1400 / (+snakeSpeed.value))); }
    snakeStart.addEventListener('click', start);
    snakeReset.addEventListener('click', ()=>{ running=false; clearInterval(tickId); snake=[{x:8,y:8}]; score=0; snakeScore.textContent = 0; draw(); });
    document.addEventListener('keydown', e=>{
      if(['ArrowUp','KeyW'].includes(e.code)) dir={x:0,y:-1};
      if(['ArrowDown','KeyS'].includes(e.code)) dir={x:0,y:1};
      if(['ArrowLeft','KeyA'].includes(e.code)) dir={x:-1,y:0};
      if(['ArrowRight','KeyD'].includes(e.code)) dir={x:1,y:0};
    });
    draw();
  }

  // CALCULATOR
  const calcGrid = $('#calc-grid'), calcDisplay = $('#calc-display');
  if(calcGrid && calcDisplay){
    const keys = ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'];
    keys.forEach(k => { const b = document.createElement('button'); b.type='button'; b.textContent=k; b.addEventListener('click', ()=> handleKey(k)); calcGrid.appendChild(b); });
    function handleKey(k){
      if(k==='='){ try{ calcDisplay.value = String(safeEval(calcDisplay.value || '0')); }catch{ calcDisplay.value='err'; } }
      else calcDisplay.value = (calcDisplay.value || '') + k;
    }
    document.addEventListener('keydown', e=>{ if(/^[0-9+\-*/().=]$/.test(e.key)) handleKey(e.key==='='? '=' : e.key); if(e.key==='Enter') handleKey('='); if(e.key==='Backspace') calcDisplay.value = calcDisplay.value.slice(0,-1); });
  }
  function safeEval(expr){
    if(!/^[0-9+\-*/().\s]+$/.test(expr)) throw new Error('Invalid chars');
    return Function('"use strict";return ('+expr+')')();
  }

  // lazy thumbs
  $$('.thumb').forEach(i => i.loading = 'lazy');

  function escapeHtml(s){ return (s+'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
})();
