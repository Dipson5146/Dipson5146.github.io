/* Portfolio main script — apps + UI */
(() => {
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const container = (s) => document.querySelector(s);

  // Set year
  $('#year').textContent = new Date().getFullYear();

  /* ---------- THEME ---------- */
  const themeBtn = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') document.documentElement.setAttribute('data-theme','light');
  themeBtn.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('theme','dark'); themeBtn.setAttribute('aria-pressed','false'); }
    else { document.documentElement.setAttribute('data-theme','light'); localStorage.setItem('theme','light'); themeBtn.setAttribute('aria-pressed','true'); }
  });

  /* ---------- NAV ---------- */
  const navToggle = $('#navToggle'), navList = $('#navList');
  navToggle.addEventListener('click', () => {
    const open = navList.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  // Smooth focus when navigated
  $$('nav a').forEach(a => a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) setTimeout(() => target.focus({preventScroll:true}), 300);
    if (navList.classList.contains('open')) navList.classList.remove('open');
  }));

  /* ---------- TYPING ---------- */
  const typing = $('#typing');
  const words = ['Frontend engineer', 'UX tinkerer', 'Learner'];
  let wi=0, ci=0, del=false;
  function typeTick(){
    const w = words[wi];
    if (!del){ ci++; typing.textContent = w.slice(0,ci); if(ci===w.length){ del=true; setTimeout(typeTick,1000); return; } setTimeout(typeTick,120); }
    else { ci--; typing.textContent = w.slice(0,ci); if(ci===0){ del=false; wi=(wi+1)%words.length; setTimeout(typeTick,300); return;} setTimeout(typeTick,60);}
  }
  typeTick();

  /* ---------- SECTION REVEAL + NAV HIGHLIGHT ---------- */
  const panels = $$('.panel');
  const navLinks = $$('nav a');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting){
        e.target.classList.add('active');
        const link = document.querySelector(`nav a[href="#${e.target.id}"]`);
        if (link){ navLinks.forEach(n=>n.classList.remove('active')); link.classList.add('active'); }
      } else e.target.classList.remove('active');
    });
  }, {threshold:0.5});
  panels.forEach(p=>obs.observe(p));

  /* ---------- MODALS (generic) ---------- */
  const projects = $$('.project');
  const modals = $$('.modal');
  function openModal(modal, opener){
    modal.setAttribute('aria-hidden','false');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    // focus trap
    const focusables = Array.from(modal.querySelectorAll('button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])')).filter(el=>el.offsetParent !== null);
    if (focusables.length) focusables[0].focus();
    function trap(e){
      if (e.key !== 'Tab') return;
      const idx = focusables.indexOf(document.activeElement);
      if (e.shiftKey && idx === 0){ e.preventDefault(); focusables[focusables.length-1].focus(); }
      else if (!e.shiftKey && idx === focusables.length-1){ e.preventDefault(); focusables[0].focus(); }
    }
    modal._trap = trap;
    window.addEventListener('keydown', trap);
  }
  function closeModal(modal, opener){
    modal.setAttribute('aria-hidden','true');
    modal.classList.remove('open');
    document.body.style.overflow = '';
    if (modal._trap) { window.removeEventListener('keydown', modal._trap); delete modal._trap; }
    if (opener) opener.focus();
  }
  projects.forEach(proj=>{
    const id = proj.dataset.modal;
    const modal = document.getElementById(id);
    proj.addEventListener('click', ()=> openModal(modal, proj));
    proj.addEventListener('keydown', e=>{ if(e.key==='Enter' || e.key===' ') { e.preventDefault(); openModal(modal, proj); }});
  });
  modals.forEach(m=>{
    const close = m.querySelector('.modal-close');
    close.addEventListener('click', ()=> closeModal(m));
    m.addEventListener('click', e=> { if(e.target === m) closeModal(m); });
    window.addEventListener('keydown', e=> { if(e.key==='Escape' && m.getAttribute('aria-hidden')==='false') closeModal(m); });
  });

  /* ---------- WEATHER APP ---------- */
  const weatherForm = $('#weatherForm'), weatherCity = $('#weatherCity'), weatherOutput = $('#weatherOutput');
  async function fetchWeatherFor(city){
    weatherOutput.textContent = 'Looking up...';
    try {
      const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5`).then(r=>r.json());
      if (!geo.results || geo.results.length===0){ weatherOutput.textContent = 'City not found.'; return; }
      const p = geo.results[0];
      const lat = p.latitude, lon=p.longitude;
      const data = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`).then(r=>r.json());
      const cw = data.current_weather;
      if (!cw){ weatherOutput.textContent = 'Weather unavailable.'; return; }
      weatherOutput.innerHTML = `
        <strong>${escapeHtml(p.name)}, ${escapeHtml(p.country)}</strong>
        <div style="margin-top:8px">Temp: <strong>${cw.temperature}°C</strong> • Wind: ${cw.windspeed} km/h</div>
        <div class="muted small">source: Open-Meteo</div>
      `;
    } catch(err){
      console.error(err);
      weatherOutput.textContent = 'Network error.';
    }
  }
  weatherForm.addEventListener('submit', e=>{
    e.preventDefault();
    const c = weatherCity.value.trim(); if(!c) return;
    fetchWeatherFor(c);
  });

  /* ---------- TASKS ---------- */
  const taskForm = $('#taskForm'), newTask = $('#newTask'), newDue = $('#newDue'), taskList = $('#taskList');
  const TASKS_KEY = 'dipson_tasks_v2';
  function loadTasks(){ try {return JSON.parse(localStorage.getItem(TASKS_KEY))||[];}catch{return [];} }
  function saveTasks(arr){ localStorage.setItem(TASKS_KEY, JSON.stringify(arr)); }
  function renderTasks(){
    const tasks = loadTasks();
    taskList.innerHTML = '';
    if (!tasks.length) { taskList.innerHTML = '<li class="muted small">No tasks yet</li>'; return; }
    tasks.forEach((t,i)=>{
      const li = document.createElement('li'); li.className='task-item';
      li.innerHTML = `<div><strong>${escapeHtml(t.title)}</strong><div class="muted small">${t.due||''}</div></div>
        <div class="task-actions"><button class="btn small edit" data-i="${i}">Edit</button><button class="btn ghost small del" data-i="${i}">Delete</button></div>`;
      taskList.appendChild(li);
    });
  }
  taskForm.addEventListener('submit', e=>{
    e.preventDefault();
    const title = newTask.value.trim(); if (!title) return;
    const tasks = loadTasks(); tasks.push({title, due: newDue.value||''}); saveTasks(tasks); newTask.value=''; newDue.value=''; renderTasks();
  });
  taskList.addEventListener('click', e=>{
    const i = e.target.dataset.i; if (!i) return;
    const tasks = loadTasks();
    if (e.target.classList.contains('del')){ tasks.splice(i,1); saveTasks(tasks); renderTasks(); }
    if (e.target.classList.contains('edit')){ const val = prompt('Edit task', tasks[i].title); if(val!==null){ tasks[i].title = val; saveTasks(tasks); renderTasks(); } }
  });
  renderTasks();

  /* ---------- MINI BLOG ---------- */
  const postForm = $('#postForm'), postTitle = $('#postTitle'), postCategory = $('#postCategory'), postBody = $('#postBody'), postsEl = $('#posts');
  const POSTS_KEY = 'dipson_posts_v1';
  function loadPosts(){ try{return JSON.parse(localStorage.getItem(POSTS_KEY))||[];}catch{return [];} }
  function savePosts(a){ localStorage.setItem(POSTS_KEY, JSON.stringify(a)); }
  function renderPosts(){
    const posts = loadPosts();
    postsEl.innerHTML = '';
    if (!posts.length) { postsEl.innerHTML = '<div class="muted small">No posts yet</div>'; return; }
    posts.slice().reverse().forEach(p=>{
      const d = new Date(p.created).toLocaleString();
      const div = document.createElement('div'); div.className='post';
      div.innerHTML = `<h4>${escapeHtml(p.title)} <small class="muted">— ${escapeHtml(p.category)}</small></h4>
        <div class="muted small">${d}</div>
        <div style="margin-top:8px">${nl2br(escapeHtml(p.body))}</div>
        <div style="margin-top:8px"><button class="btn ghost btn-del" data-id="${p.created}">Delete</button></div>`;
      postsEl.appendChild(div);
    });
  }
  postForm.addEventListener('submit', e=>{
    e.preventDefault();
    const title = postTitle.value.trim(), body = postBody.value.trim();
    if(!title||!body) return alert('Please add title and body.');
    const arr = loadPosts(); arr.push({title,body,category:postCategory.value,created:Date.now()}); savePosts(arr);
    postTitle.value=''; postBody.value=''; renderPosts();
  });
  postsEl.addEventListener('click', e=>{
    if(e.target.classList.contains('btn-del')) {
      const id = Number(e.target.dataset.id);
      if (!confirm('Delete post?')) return;
      const arr = loadPosts().filter(p=>p.created!==id); savePosts(arr); renderPosts();
    }
  });
  renderPosts();

  /* ---------- SNAKE (canvas) ---------- */
  const canvas = $('#snakeCanvas'); const ctx = canvas.getContext('2d');
  let grid = 18, snake = [], dir = {x:1,y:0}, food = null, score = 0, running=false, rafId=null, tick=0, speed=10;
  const snakeScore = $('#snakeScore');
  function initSnake(){
    const cols = Math.floor(canvas.width / grid);
    snake = [];
    for (let i=0;i<5;i++) snake.push({x:Math.floor(cols/2)-i, y:Math.floor(cols/2)});
    spawnFood();
    score = 0; snakeScore.textContent = score;
    dir = {x:1,y:0};
  }
  function spawnFood(){
    const cols = Math.floor(canvas.width / grid);
    food = {x: Math.floor(Math.random()*cols), y: Math.floor(Math.random()*cols)};
  }
  function drawSnake(){
    ctx.fillStyle = '#072029'; ctx.fillRect(0,0,canvas.width,canvas.height);
    // food
    ctx.fillStyle = '#ff4d6d'; ctx.fillRect(food.x*grid, food.y*grid, grid-1, grid-1);
    // snake
    ctx.fillStyle = '#22c55e';
    snake.forEach(s => ctx.fillRect(s.x*grid, s.y*grid, grid-1, grid-1));
  }
  function stepSnake(){
    if(!running) return;
    tick++;
    if (tick % Math.max(1, Math.floor(20 - speed)) !== 0) { rafId = requestAnimationFrame(stepSnake); return; }
    const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
    const cols = Math.floor(canvas.width / grid);
    // wrap
    head.x = (head.x + cols) % cols; head.y = (head.y + cols) % cols;
    // collision
    if (snake.some(s=>s.x===head.x && s.y===head.y)){ running=false; alert('Game over — score: '+score); return; }
    snake.unshift(head);
    if (head.x===food.x && head.y===food.y){ score++; snakeScore.textContent = score; spawnFood(); }
    else snake.pop();
    drawSnake();
    rafId = requestAnimationFrame(stepSnake);
  }
  $('#snakeStart').addEventListener('click', ()=>{
    speed = Number($('#snakeSpeed').value);
    if (!running){ running=true; initSnake(); stepSnake(); }
  });
  $('#snakeReset').addEventListener('click', ()=>{ running=false; initSnake(); drawSnake(); });
  window.addEventListener('keydown', e=>{
    if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) return;
    if (e.key==='ArrowUp' && dir.y!==1) dir={x:0,y:-1};
    if (e.key==='ArrowDown' && dir.y!==-1) dir={x:0,y:1};
    if (e.key==='ArrowLeft' && dir.x!==1) dir={x:-1,y:0};
    if (e.key==='ArrowRight' && dir.x!==-1) dir={x:1,y:0};
  });
  // init
  canvas.width = 360; canvas.height = 360; grid = 18; initSnake(); drawSnake();

  /* ---------- CALCULATOR ---------- */
  const calcDisplay = $('#calcDisplay'); const calcGrid = document.querySelector('#m-calc .calc-grid');
  const buttons = [
    '7','8','9','/',
    '4','5','6','*',
    '1','2','3','-',
    '0','.','=','+'
  ];
  function makeCalc(){
    calcGrid.innerHTML = '';
    buttons.forEach(b=>{
      const btn = document.createElement('button'); btn.className='calc-btn';
      if ('+-*/'.includes(b)) btn.classList.add('op');
      btn.textContent = b; btn.dataset.val = b;
      calcGrid.appendChild(btn);
      btn.addEventListener('click', ()=> handleCalc(b));
    });
    // clear & del
    const clear = document.createElement('button'); clear.className='calc-btn ghost'; clear.textContent='C'; calcGrid.appendChild(clear);
    clear.addEventListener('click', ()=> { expr=''; updateCalc(); });
    const del = document.createElement('button'); del.className='calc-btn ghost'; del.textContent='⌫'; calcGrid.appendChild(del);
    del.addEventListener('click', ()=> { expr=expr.slice(0,-1); updateCalc(); });
  }
  let expr = '';
  function updateCalc(){ calcDisplay.value = expr || '0'; }
  function handleCalc(key){
    if (key==='='){ try { expr = safeEval(expr); } catch(e) { expr='ERR'; } updateCalc(); return; }
    expr += key; updateCalc();
  }
  // safe evaluator: allow digits, ., parentheses and +-*/% operators
  function safeEval(s){
    if (!/^[0-9+\-*/().\s%]*$/.test(s)) throw new Error('Invalid');
    // replace multiple dots or malformed sequences lightly handled by eval fallback
    return Function('"use strict"; return ('+s+')')();
  }
  makeCalc();

  /* ---------- Contact form (fake) ---------- */
  $('#contact-form').addEventListener('submit', e=>{
    e.preventDefault();
    alert('Thanks — message captured locally (this demo does not send email).');
    $('#cf-name').value=''; $('#cf-email').value=''; $('#cf-msg').value='';
  });
  $('#download-cv').addEventListener('click', e=>{ e.preventDefault(); alert('CV download placeholder — attach your PDF and link here.'); });

  /* ---------- Utility helpers ---------- */
  function escapeHtml(str){ return String(str).replace(/[&<>"']/g, (m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function nl2br(s){ return s.replace(/\n/g,'<br>'); }

  /* ---------- Small progressive enhancement: register SW if present ---------- */
  if ('serviceWorker' in navigator){
    navigator.serviceWorker?.register('/sw.js').catch(()=>{/* ignore */});
  }

})();
