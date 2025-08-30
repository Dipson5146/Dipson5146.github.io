/* Global helpers & DOM ready (deferred script) */
(() => {
  // Short helpers
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Meta: current year
  document.getElementById('year').textContent = new Date().getFullYear();

  /* -------------------- THEME TOGGLE -------------------- */
  const themeToggle = $('#theme-toggle');
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  function applyTheme(theme) {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }

  const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  applyTheme(initialTheme);

  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('theme', next);
    themeToggle.setAttribute('aria-pressed', String(next === 'dark'));
  });

  /* -------------------- NAV TOGGLER (MOBILE) -------------------- */
  const navToggle = $('#nav-toggle');
  const navList = $('#nav-list');

  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    navList.classList.toggle('open');
  });

  // Close mobile nav on link click
  navList.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' && navList.classList.contains('open')) {
      navList.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });

  /* -------------------- TYPING EFFECT (respect reduced-motion) -------------------- */
  const typingEl = $('#typing');
  const typingWords = ["Coder", "Web Developer", "Learner"];
  if (!prefersReduced) {
    let iWord = 0, iChar = 0, deleting = false;
    const typeSpeed = 120, pauseSpeed = 1000, deleteSpeed = 60;

    function tick() {
      const word = typingWords[iWord];
      if (!deleting) {
        iChar++;
        typingEl.textContent = word.slice(0, iChar);
        if (iChar === word.length) { deleting = true; setTimeout(tick, pauseSpeed); return; }
        setTimeout(tick, typeSpeed);
      } else {
        iChar--;
        typingEl.textContent = word.slice(0, iChar);
        if (iChar === 0) { deleting = false; iWord = (iWord + 1) % typingWords.length; setTimeout(tick, 300); return; }
        setTimeout(tick, deleteSpeed);
      }
    }
    tick();
  } else {
    typingEl.textContent = typingWords[0];
  }

  /* -------------------- SECTION OBSERVER: reveal + nav highlight -------------------- */
  const sections = $$('main section.panel');
  const navLinks = $$('nav a');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.id;
      const link = document.querySelector(`nav a[href="#${id}"]`);
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        if (link) {
          navLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
        }
      } else {
        entry.target.classList.remove('active');
      }
    });
  }, { threshold: 0.55 });

  sections.forEach(s => sectionObserver.observe(s));

  /* -------------------- MODAL SYSTEM with focus-trap & scroll-lock -------------------- */
  const projectCards = $$('.project-card');
  const modals = $$('.modal');

  // Utilities: get focusable elements inside an element
  function getFocusable(container) {
    const selectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.from(container.querySelectorAll(selectors)).filter(el => el.offsetParent !== null);
  }

  // Open & close modal with focus management
  function openModal(modal, opener) {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // lock background scroll
    modal.classList.add('is-open');
    // focus first focusable element (close button)
    const focusables = getFocusable(modal);
    const first = focusables[0] || modal;
    first.focus();

    // trap
    function trap(e) {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable(modal);
      if (focusable.length === 0) { e.preventDefault(); return; }
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault(); lastEl.focus(); return;
      }
      if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault(); firstEl.focus(); return;
      }
    }

    modal._trap = trap;
    window.addEventListener('keydown', trap);
  }

  function closeModal(modal, opener) {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    modal.classList.remove('is-open');
    if (modal._trap) {
      window.removeEventListener('keydown', modal._trap);
      delete modal._trap;
    }
    if (opener && typeof opener.focus === 'function') opener.focus();
  }

  // Wire up project cards: click and keyboard (enter/space)
  projectCards.forEach(card => {
    const modalId = card.dataset.modal;
    const modal = document.getElementById(modalId);

    function openerClick() { openModal(modal, card); }

    card.addEventListener('click', openerClick);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openerClick();
      }
    });

    // close buttons & background click
    if (modal) {
      const closeBtn = modal.querySelector('.close-btn');
      closeBtn.addEventListener('click', () => closeModal(modal, card));
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal, card);
      });
      // ESC closes
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
          closeModal(modal, card);
        }
      });
    }
  });

  /* -------------------- Accessibility: return to content on hash nav (improve focus) -------------------- */
  // When clicking a nav link, focus the section heading for screen reader users
  $$('nav a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href.startsWith('#')) return;
      const target = document.querySelector(href);
      if (target) {
        // small timeout because browser scrolls after click
        setTimeout(() => target.focus({preventScroll: true}), 300);
      }
    });
  });

  /* -------------------- OPTIONAL: register basic service worker for offline (if available) -------------------- */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      // ignore failures silently; no crash
      console.info('SW registration failed:', err);
    });
  }

})();
