(function() {
  'use strict';

  /* ────────────────────────────────────────────────────────────────── */
  /* MODULE 0: PRELOADER                                                */
  /* ────────────────────────────────────────────────────────────────── */

  function initPreloader() {
    const preloader = document.querySelector('.preloader');
    const body = document.body;

    if (!preloader) {
      body.classList.remove('is-loading');
      body.classList.add('is-loaded');
      return;
    }

    // Preloader nur beim Erstaufruf pro Browser-Session zeigen.
    // Folge-Navigation (Leistungen, Projekte, Termin) springt direkt zum Inhalt.
    let hasSeenPreloader = false;
    try {
      hasSeenPreloader = sessionStorage.getItem('glanz-preloader-shown') === '1';
    } catch (_) { /* sessionStorage blockiert (Privacy-Mode) → wie Erstaufruf behandeln */ }

    if (hasSeenPreloader) {
      preloader.parentNode && preloader.parentNode.removeChild(preloader);
      body.classList.remove('is-loading');
      body.classList.add('is-loaded');
      return;
    }

    try { sessionStorage.setItem('glanz-preloader-shown', '1'); } catch (_) {}

    const MIN_DURATION_MS = 2200;
    const FADE_OUT_MS = 900;
    const startTime = performance.now();
    let dismissed = false;

    function dismiss() {
      if (dismissed) return;
      dismissed = true;

      const elapsed = performance.now() - startTime;
      const remaining = Math.max(0, MIN_DURATION_MS - elapsed);

      setTimeout(() => {
        body.classList.remove('is-loading');
        body.classList.add('is-loaded');

        setTimeout(() => {
          if (preloader.parentNode) {
            preloader.parentNode.removeChild(preloader);
          }
        }, FADE_OUT_MS);
      }, remaining);
    }

    if (document.readyState === 'complete') {
      dismiss();
    } else {
      window.addEventListener('load', dismiss, { once: true });
      // Safety net: never let the loader stick if `load` never fires
      setTimeout(dismiss, MIN_DURATION_MS + 4000);
    }
  }

  /* ────────────────────────────────────────────────────────────────── */
  /* MODULE 1: NAVIGATION (Mobile Menu)                                 */
  /* ────────────────────────────────────────────────────────────────── */

  function initNav() {
    const header = document.getElementById('site-header');
    const hamburger = document.querySelector('.site-header__hamburger');
    const mobileNav = document.getElementById('mobile-nav');

    if (!hamburger || !mobileNav) return;

    const mobileLinks = mobileNav.querySelectorAll('.mobile-nav__link, .mobile-nav__cta');

    function toggleNav() {
      const isOpen = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', String(!isOpen));
      mobileNav.classList.toggle('mobile-nav--open', !isOpen);
      mobileNav.setAttribute('aria-hidden', String(isOpen));
      hamburger.setAttribute('aria-label', isOpen ? 'Menü öffnen' : 'Menü schließen');
    }

    function closeNav() {
      hamburger.setAttribute('aria-expanded', 'false');
      mobileNav.classList.remove('mobile-nav--open');
      mobileNav.setAttribute('aria-hidden', 'true');
      hamburger.setAttribute('aria-label', 'Menü öffnen');
    }

    hamburger.addEventListener('click', toggleNav);

    mobileLinks.forEach(link => {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeNav();
    });

    document.addEventListener('click', e => {
      if (!header.contains(e.target) && !mobileNav.contains(e.target) && mobileNav.classList.contains('mobile-nav--open')) {
        closeNav();
      }
    });
  }

  /* ────────────────────────────────────────────────────────────────── */
  /* MODULE 2: HEADER SCROLL SHADOW                                     */
  /* ────────────────────────────────────────────────────────────────── */

  function initHeaderScroll() {
    const header = document.getElementById('site-header');
    if (!header) return;

    let ticking = false;

    function update() {
      header.classList.toggle('site-header--scrolled', window.scrollY > 8);
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  }

  /* ────────────────────────────────────────────────────────────────── */
  /* MODULE 3: COUNT-UP ANIMATION                                       */
  /* ────────────────────────────────────────────────────────────────── */

  function animateCountUp(el, duration, easing) {
    const target = parseInt(el.dataset.target, 10);
    const suffix = el.dataset.suffix || '';
    const start = performance.now();
    let lastValue = -1;

    function step(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Easing-Funktion wird von außen reingereicht. Auf Mobile nutzen wir
      // easeOutQuad (1-(1-p)^2) statt easeOutCubic — quad verteilt die
      // letzten Increments gleichmäßiger, sodass kleine Targets (20, 48)
      // im Endbereich nicht sichtbar "ticken". Desktop bleibt bei cubic.
      const eased = easing(progress);
      const current = Math.round(eased * target);
      // Nur schreiben, wenn der Wert sich tatsächlich geändert hat.
      // Spart Reflow-Frames, besonders bei kleinen Targets.
      if (current !== lastValue) {
        el.textContent = current + suffix;
        lastValue = current;
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Sicherheits-Netz: am Ende exakt den Zielwert setzen — Math.round
        // landet bei progress=1 zwar bereits dort, aber explizit ist
        // explizit, falls die rAF-Loop einen Frame früher abbricht.
        if (lastValue !== target) {
          el.textContent = target + suffix;
        }
      }
    }

    requestAnimationFrame(step);
  }

  function initCountUp() {
    const statsSection = document.getElementById('stats');
    if (!statsSection) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      statsSection.querySelectorAll('[data-count-up]').forEach(el => {
        el.textContent = el.dataset.target + (el.dataset.suffix || '');
      });
      return;
    }

    // Mobile: leicht kürzere Count-Up-Dauer (1100ms vs 1800ms), früherer
    // Trigger und FLACHERE Easing-Kurve (easeOutQuad statt easeOutCubic).
    // Cubic verteilt 80% des Counts auf die ersten 50% Zeit — bei kleinen
    // Targets wie 20 oder 48 entstehen am Ende sichtbare Ticks mit
    // 100-150ms Abstand zwischen Werten, die auf dem Handy klar als
    // "abgehakt" wahrgenommen werden. easeOutQuad ist gleichmäßiger und
    // landet trotzdem noch sanft beim Endwert.
    const isMobile = window.matchMedia('(max-width: 640px)').matches;
    const duration = isMobile ? 1100 : 1800;
    const easing = isMobile
      ? function easeOutQuad(p) { return 1 - (1 - p) * (1 - p); }
      : function easeOutCubic(p) { return 1 - Math.pow(1 - p, 3); };

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            statsSection.querySelectorAll('[data-count-up]').forEach(el => {
              animateCountUp(el, duration, easing);
            });
            observer.unobserve(statsSection);
          }
        });
      },
      {
        threshold: isMobile ? 0.1 : 0.3,
        rootMargin: isMobile ? '0px 0px 20% 0px' : '0px'
      }
    );

    observer.observe(statsSection);
  }

  /* ────────────────────────────────────────────────────────────────── */
  /* MODULE 4: SCROLL REVEAL                                            */
  /* ────────────────────────────────────────────────────────────────── */

  function initScrollReveal() {
    const targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      targets.forEach(el => el.classList.add('reveal--visible'));
      return;
    }

    // Mobile: leicht NACH unten verschobener rootMargin (-8%), damit
    // die Reveal-Animation erst startet, wenn das Element wirklich im
    // sichtbaren Bereich erscheint. Vorher triggerte sie 15% vor dem
    // Viewport — beim normalen Scrolltempo war die Animation deshalb
    // fertig, bevor das Element überhaupt sichtbar wurde (wirkte
    // statisch). Threshold 0.05 reicht aus, damit auch flache
    // Elemente am Rand zuverlässig auslösen.
    const isMobile = window.matchMedia('(max-width: 640px)').matches;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: isMobile ? 0.05 : 0.12,
        rootMargin: isMobile ? '0px 0px -8% 0px' : '0px 0px -40px 0px'
      }
    );

    targets.forEach(el => observer.observe(el));
  }

  /* ────────────────────────────────────────────────────────────────── */
  /* MODULE 6: CONTACT FORM                                             */
  /* ────────────────────────────────────────────────────────────────── */

  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const status = form.querySelector('.contact-form__status');
    const submitBtn = form.querySelector('.contact-form__submit');
    const originalLabel = submitBtn ? submitBtn.innerHTML : '';

    function showError(input, msg) {
      input.classList.add('form-field__input--invalid');
      const errorEl = input.closest('.form-field').querySelector('.form-field__error');
      if (errorEl) errorEl.textContent = msg;
    }

    function clearError(input) {
      input.classList.remove('form-field__input--invalid');
      const errorEl = input.closest('.form-field').querySelector('.form-field__error');
      if (errorEl) errorEl.textContent = '';
    }

    function validateField(input) {
      clearError(input);

      if (input.required && !input.value.trim()) {
        showError(input, 'Dieses Feld ist erforderlich.');
        return false;
      }

      if (input.type === 'email' && input.value.trim()) {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(input.value.trim())) {
          showError(input, 'Bitte geben Sie eine gültige E-Mail-Adresse ein.');
          return false;
        }
      }

      return true;
    }

    form.querySelectorAll('.form-field__input').forEach(input => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => {
        if (input.classList.contains('form-field__input--invalid')) {
          validateField(input);
        }
      });
    });

    const consentBox = form.querySelector('#f-consent');
    if (consentBox) {
      consentBox.addEventListener('change', () => {
        if (consentBox.checked) {
          const wrap = consentBox.closest('.form-field--consent');
          if (wrap) {
            wrap.classList.remove('form-field--invalid');
            const errorEl = wrap.querySelector('.form-field__error');
            if (errorEl) errorEl.textContent = '';
          }
        }
      });
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();

      let valid = true;
      form.querySelectorAll('.form-field__input').forEach(input => {
        if (!validateField(input)) valid = false;
      });

      const consent = form.querySelector('#f-consent');
      const consentWrap = consent ? consent.closest('.form-field--consent') : null;
      if (consent && consentWrap) {
        const errorEl = consentWrap.querySelector('.form-field__error');
        if (!consent.checked) {
          consentWrap.classList.add('form-field--invalid');
          if (errorEl) errorEl.innerHTML = 'Bitte stimmen Sie der <a href="legal/datenschutz.html" target="_blank" rel="noopener" class="form-field__error-link">Datenschutzerklärung</a> zu.';
          valid = false;
        } else {
          consentWrap.classList.remove('form-field--invalid');
          if (errorEl) errorEl.textContent = '';
        }
      }

      if (!valid) {
        const firstInvalid = form.querySelector('.form-field__input--invalid, .form-field--invalid .form-consent__checkbox');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Wird gesendet…';
      status.textContent = '';
      status.className = 'contact-form__status';

      try {
        const formData = new FormData(form);
        const response = await fetch(form.action || 'api/kontakt.php', {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });

        let data = null;
        try { data = await response.json(); } catch (_) { /* ignore */ }

        if (response.ok && data && data.ok) {
          status.textContent = 'Vielen Dank! Wir melden uns innerhalb von 48 Stunden bei Ihnen.';
          status.className = 'contact-form__status contact-form__status--success';
          form.reset();
        } else {
          status.textContent = (data && data.error)
            ? data.error
            : 'Es gab einen Fehler. Bitte versuchen Sie es später erneut oder schreiben Sie direkt an kontakt@glanzdesign.eu.';
          status.className = 'contact-form__status contact-form__status--error';
        }
      } catch (err) {
        status.textContent = 'Verbindungsfehler. Bitte versuchen Sie es später erneut oder schreiben Sie direkt an kontakt@glanzdesign.eu.';
        status.className = 'contact-form__status contact-form__status--error';
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalLabel;
      }
    });
  }

  /* ────────────────────────────────────────────────────────────────── */
  /* MODULE 7: FOOTER YEAR                                              */
  /* ────────────────────────────────────────────────────────────────── */

  function initFooterYear() {
    const el = document.getElementById('footer-year');
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ────────────────────────────────────────────────────────────────── */
  /* MODULE 8: SMOOTH ANCHOR FOCUS                                      */
  /* ────────────────────────────────────────────────────────────────── */

  function initAnchorFocus() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const href = link.getAttribute('href');
        if (href === '#' || href.length < 2) return;
        const target = document.querySelector(href);
        if (target) {
          target.setAttribute('tabindex', '-1');
          setTimeout(() => target.focus({ preventScroll: true }), 600);
        }
      });
    });
  }

  /* ────────────────────────────────────────────────────────────────── */
  /* MODULE 9: HERO VISUAL TILT                                         */
  /* Folgt der Maus mit max ±6°. Nur Desktop (hover-fähig + ≥901px).    */
  /* Reduced-Motion deaktiviert das Modul vollständig.                  */
  /* ────────────────────────────────────────────────────────────────── */

  function initHeroTilt() {
    const visual = document.querySelector('.hero__visual');
    if (!visual) return;

    const stage = visual.querySelector('.hero__visual-stage');
    if (!stage) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const desktopHover = window.matchMedia('(hover: hover) and (min-width: 901px)');

    if (reduceMotion.matches || !desktopHover.matches) return;

    const MAX_TILT = 6;
    let pendingFrame = null;
    let targetX = 0;
    let targetY = 0;
    let active = false;

    function applyTransform() {
      pendingFrame = null;
      stage.style.setProperty('--tilt-x', targetX.toFixed(2) + 'deg');
      stage.style.setProperty('--tilt-y', targetY.toFixed(2) + 'deg');
    }

    function schedule() {
      if (pendingFrame === null) {
        pendingFrame = requestAnimationFrame(applyTransform);
      }
    }

    function onMouseMove(e) {
      const rect = visual.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;

      // Center = 0, Ränder = ±MAX_TILT, geclamped für Card-Überstände.
      const tx =  (px - 0.5) * 2 * MAX_TILT;
      const ty = -(py - 0.5) * 2 * MAX_TILT;
      targetX = Math.max(-MAX_TILT, Math.min(MAX_TILT, tx));
      targetY = Math.max(-MAX_TILT, Math.min(MAX_TILT, ty));

      if (!active) {
        visual.classList.add('hero__visual--active');
        active = true;
      }
      schedule();
    }

    function onMouseLeave() {
      targetX = 0;
      targetY = 0;
      visual.classList.remove('hero__visual--active');
      active = false;
      schedule();
    }

    visual.addEventListener('mousemove', onMouseMove);
    visual.addEventListener('mouseleave', onMouseLeave);
  }

  /* ────────────────────────────────────────────────────────────────── */
  /* MODULE 10: FAQ ACCORDION                                           */
  /* Smooth open/close via grid-template-rows 0fr → 1fr.                */
  /* JS toggles only the .faq__item--open class + aria-expanded.        */
  /* ────────────────────────────────────────────────────────────────── */

  function initFaq() {
    const items = document.querySelectorAll('.faq__item');
    if (!items.length) return;

    items.forEach(item => {
      const btn = item.querySelector('.faq__question');
      if (!btn) return;

      btn.addEventListener('click', () => {
        const isOpen = item.classList.toggle('faq__item--open');
        btn.setAttribute('aria-expanded', String(isOpen));
      });
    });
  }

  /* ────────────────────────────────────────────────────────────────── */
  /* MODULE 11: VIEW TRANSITIONS CLEANUP                                */
  /* Räumt Overlays vor cross-document View-Transitions auf, damit der  */
  /* Snapshot der alten Seite sauber bleibt (kein offenes Mobile-Menü   */
  /* im Übergang).                                                      */
  /* ────────────────────────────────────────────────────────────────── */

  function initViewTransitionCleanup() {
    if (!('onpageswap' in window)) return; // alte Browser → kein Cross-Doc-VT

    window.addEventListener('pageswap', () => {
      const mobileNav = document.getElementById('mobile-nav');
      const hamburger = document.querySelector('.site-header__hamburger');
      if (mobileNav && mobileNav.classList.contains('mobile-nav--open')) {
        mobileNav.classList.remove('mobile-nav--open');
        mobileNav.setAttribute('aria-hidden', 'true');
        if (hamburger) {
          hamburger.setAttribute('aria-expanded', 'false');
          hamburger.setAttribute('aria-label', 'Menü öffnen');
        }
      }
    });
  }

  /* ────────────────────────────────────────────────────────────────── */
  /* MODULE: SMOOTH SCROLL (Lenis)                                      */
  /* ────────────────────────────────────────────────────────────────── */

  function initSmoothScroll() {
    // Reduced-Motion: kein Lenis — nativer Scroll bleibt.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Lenis nicht geladen? Silent fail — nativer Scroll funktioniert weiterhin.
    if (typeof window.Lenis !== 'function') return;

    const lenis = new window.Lenis({
      lerp: 0.09,
      wheelMultiplier: 0.9,
      // syncTouch:false → Touch bleibt nativ (iOS-Momentum, Pull-to-Refresh).
      // Smoothing nur fürs Wheel/Trackpad.
      syncTouch: false,
      smoothWheel: true
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Globaler Hook für andere Module (Theme-Observer subscribed sich hier).
    window.__glanzLenis = lenis;
  }

  /* ────────────────────────────────────────────────────────────────── */
  /* MODULE: THEME-TRANSITION (Background-Color pro Sektion)            */
  /* ────────────────────────────────────────────────────────────────── */

  function initThemeTransition() {
    const scope = document.querySelector('[data-theme-scope]');
    const darkTargets = document.querySelectorAll('[data-theme-target="dark"]');
    if (!scope || darkTargets.length === 0) return;

    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    // Mobile: kleinerer Threshold weil Sektionen oft 100vh hoch sind.
    const thresholdRatio = isMobile ? 0.30 : 0.45;

    let rafId = 0;
    let active = true;

    function check() {
      rafId = 0;
      if (!active) return;
      const H = window.innerHeight || document.documentElement.clientHeight;
      const edge = H * thresholdRatio;

      // Wenn IRGENDEINE dark-target Sektion den mittleren Viewport dominiert → dark.
      let isDark = false;
      for (const el of darkTargets) {
        const r = el.getBoundingClientRect();
        if (r.top <= H - edge && r.bottom >= edge) {
          isDark = true;
          break;
        }
      }

      const wanted = isDark ? 'dark' : 'light';
      if (scope.getAttribute('data-theme-mode') !== wanted) {
        scope.setAttribute('data-theme-mode', wanted);
      }
    }

    function schedule() {
      if (rafId === 0) rafId = requestAnimationFrame(check);
    }

    // Auf Lenis subscriben wenn vorhanden, sonst nativer Scroll.
    if (window.__glanzLenis && typeof window.__glanzLenis.on === 'function') {
      window.__glanzLenis.on('scroll', schedule);
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);

    // Initial-Check.
    check();
  }

  /* ────────────────────────────────────────────────────────────────── */
  /* MODULE 12: SCROLL-FILL HEADLINES                                   */
  /* Zerlegt Section-Titles in <span class="char">, die sich beim       */
  /* Scrollen Zeichen für Zeichen mit Farbe füllen.                     */
  /* Technik dokumentiert in docs/referenz-publitec-flexline.md (1).    */
  /* ────────────────────────────────────────────────────────────────── */

  function initScrollFillHeadlines() {
    // Nur echte Section-Headlines füllen sich — bewusst NICHT die FAQ-Fragen
    // (auf Wunsch: der Effekt wirkt nur bei den großen Überschriften).
    const els = Array.from(document.querySelectorAll(
      '.section__title, .contact__title'
    ));
    if (!els.length) return;

    // Text rekursiv in einzelne <span class="char"> wickeln.
    // <br> und etwaige Akzent-Spans bleiben erhalten, Leerzeichen bleiben echt.
    function wrap(node) {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent;
          if (!text || !text.trim()) return;
          const frag = document.createDocumentFragment();
          for (const ch of text) {
            if (ch === ' ') {
              frag.appendChild(document.createTextNode(' '));
            } else {
              const span = document.createElement('span');
              span.className = 'char';
              span.textContent = ch;
              frag.appendChild(span);
            }
          }
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains('char')) {
          wrap(child);
        }
      });
    }

    els.forEach(el => {
      if (el.dataset.fillPrepared === '1') return;
      wrap(el);
      el.dataset.fillPrepared = '1';
    });

    // Reduced-Motion: sofort alle Zeichen sichtbar, keine Scroll-Logik.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach(el => el.querySelectorAll('.char').forEach(c => c.classList.add('is-visible')));
      return;
    }

    // Nur Headlines nahe/im Viewport berechnen (Performance).
    const active = new Set();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { e.isIntersecting ? active.add(e.target) : active.delete(e.target); });
      schedule();
    }, { threshold: 0, rootMargin: '12% 0px 12% 0px' });
    els.forEach(el => io.observe(el));

    let ticking = false;
    function schedule() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }

    function update() {
      ticking = false;
      const vh = window.innerHeight;
      const start = vh * 0.92;   // Headline kommt von unten rein
      const end   = vh * 0.30;   // Headline oben fast durch → voll gefüllt
      const list = active.size ? active : els;
      list.forEach(el => {
        const chars = el.querySelectorAll('.char');
        if (!chars.length) return;
        const top = el.getBoundingClientRect().top;
        let p = (start - top) / (start - end);
        p = Math.max(0, Math.min(1, p));
        const reveal = Math.floor(p * chars.length);
        chars.forEach((c, i) => c.classList.toggle('is-visible', i < reveal));
      });
    }

    if (window.__glanzLenis && typeof window.__glanzLenis.on === 'function') {
      window.__glanzLenis.on('scroll', schedule);
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('load', schedule);
    update();
  }

  /* ────────────────────────────────────────────────────────────────── */
  /* MODULE 13: STICKY SCROLL-SWITCH (kontinuierlich)                   */
  /* Gepinnte Sektion (Prozess): die Schritte drehen sich beim Scrollen */
  /* flüssig herein und wieder heraus — kein hartes Umschalten, sondern */
  /* pro Frame direkt an den Scroll-Fortschritt gekoppelt (Opacity +    */
  /* Y-Versatz + leichte X-Rotation = „Drum"-Gefühl). Mit Verweil-Phase */
  /* je Schritt, damit jeder Schritt kurz im Fokus „ruht". Funktioniert */
  /* auf ALLEN Breiten (auch mobil); nur reduced-motion entstapelt.     */
  /* Technik dokumentiert in docs/referenz-publitec-flexline.md (§3).   */
  /* ────────────────────────────────────────────────────────────────── */

  function initStickyScrollSwitch() {
    const sections = document.querySelectorAll('[data-switch]');
    if (!sections.length) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const smooth = t => t * t * (3 - 2 * t); // smoothstep

    sections.forEach(section => {
      const items = Array.from(section.querySelectorAll('[data-switch-item]'));
      // Optional: Überschrift scrollt im normalen Fluss weg, nur dieser Block pinnt.
      const sticky = section.querySelector('.process-switch__sticky');
      const head = section.querySelector('.process-switch__head');
      const panel = section.querySelector('.process-switch__panel');
      const count = items.length;
      if (count < 2) return;

      section.style.setProperty('--switch-count', count);
      const total = count - 1;       // Anzahl Übergänge
      const HOLD = 0.20;            // kurze Verweil-Phase je Schritt (vorher 0.42)
      const FADE = 0.58;           // Sicht-Fenster je Schritt: <0.5 = strikt nacheinander,
                                   // 0.58 = winziger Crossfade ohne sichtbares Überlappen
      const SHIFT = 40;            // px vertikaler Versatz (trennt aus-/eingehenden Text)
      const ROT = 5;               // Grad X-Rotation je Schritt (dezentes Drum-Gefühl)

      // Reduced-Motion: nichts animieren — CSS zeigt alle Schritte gestapelt.
      if (reduce) {
        items.forEach(it => it.setAttribute('aria-hidden', 'false'));
        return;
      }

      const LEAD_SHIFT = 0.26;        // Desktop: Anteil der Viewport-Höhe, um den Schritt 1
                                      // anfangs höher (nah unter der Überschrift) starten zu lassen.
      const LEAD_SHIFT_MOBILE = 0.10; // Mobil kleiner: sonst wird die große Nummer oben
                                      // beim Start abgeschnitten. Startet damit etwas tiefer.

      function render() {
        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight;
        const scrolled = -rect.top; // wie weit der Sektions-Anfang über dem Viewport-Top liegt
        let progress;
        let leadT = 1;
        if (sticky) {
          // Pin beginnt erst, nachdem die Überschrift (headH) weggescrollt ist;
          // er endet, wenn der gepinnte Block (stickyH) das Sektionsende erreicht.
          const headH = head ? head.offsetHeight : 0;
          const stickyH = sticky.offsetHeight || vh;
          const denom = Math.max(rect.height - stickyH - headH, 1);
          progress = Math.min(Math.max((scrolled - headH) / denom, 0), 1);
          // Lead-in (0 → 1) während die Überschrift wegscrollt.
          leadT = headH > 0 ? Math.min(Math.max(scrolled / headH, 0), 1) : 1;
        } else {
          const scrollable = Math.max(rect.height - vh, 1);
          progress = Math.min(Math.max(scrolled, 0), scrollable) / scrollable;
        }

        // Panel startet nah unter der Überschrift (nach oben verschoben) und
        // gleitet in die vertikale Mitte, während die Überschrift rausscrollt.
        if (panel) {
          const shiftFrac = window.innerWidth <= 768 ? LEAD_SHIFT_MOBILE : LEAD_SHIFT;
          const introY = -(1 - leadT) * vh * shiftFrac;
          panel.style.transform = 'translate3d(0,' + introY.toFixed(1) + 'px,0)';
        }

        // Rohposition 0..total, mit Verweil-Phase: jeder Schritt ruht erst,
        // dann gleitet er smooth zum nächsten (kein Snap).
        const raw = progress * total;
        let i = Math.floor(raw);
        if (i > total) i = total;
        if (i < 0) i = 0;
        const f = raw - i;                                  // 0..1 innerhalb des Schritts
        let tf = f <= HOLD ? 0 : (f - HOLD) / (1 - HOLD);
        tf = smooth(Math.min(Math.max(tf, 0), 1));
        const pos = i + tf;                                 // verweilt, dann gleitet

        const nearest = Math.round(pos);

        items.forEach((item, j) => {
          const d = pos - j;             // signierter Abstand in Schritten
          const ad = Math.abs(d);
          // Sequenzielles Aus-/Einblenden: ein Schritt ist nur innerhalb FADE
          // sichtbar → der alte Text ist quasi weg, bevor der neue erscheint.
          let op = 1 - ad / FADE;
          if (op < 0) op = 0;
          const ty = -d * SHIFT;         // d<0 (Schritt liegt vor uns) → kommt von unten
          const rx = -d * ROT;           // leichte Drehung = Drum-Gefühl
          const sc = 1 - Math.min(ad, 1) * 0.04;
          item.style.opacity = op.toFixed(3);
          item.style.transform =
            'translate3d(0,' + ty.toFixed(1) + 'px,0) rotateX(' + rx.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
          item.style.zIndex = String(100 - Math.round(ad * 100));
          item.style.pointerEvents = (j === nearest) ? 'auto' : 'none';
          item.setAttribute('aria-hidden', j === nearest ? 'false' : 'true');
        });
      }

      // Kontinuierlicher rAF-Loop, aber nur solange die Sektion sichtbar ist.
      let running = false;
      let rafId = 0;
      function loop() {
        render();
        if (running) rafId = requestAnimationFrame(loop);
      }
      function start() {
        if (!running) { running = true; rafId = requestAnimationFrame(loop); }
      }
      function stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
      }

      const io = new IntersectionObserver(entries => {
        entries.forEach(e => (e.isIntersecting ? start() : stop()));
      }, { threshold: 0 });
      io.observe(section);

      window.addEventListener('resize', render);
      render(); // Startzustand sofort setzen (kein FOUC).
    });
  }

  /* ────────────────────────────────────────────────────────────────── */
  /* INIT                                                               */
  /* ────────────────────────────────────────────────────────────────── */

  function init() {
    initSmoothScroll();
    initPreloader();
    initNav();
    initHeaderScroll();
    initCountUp();
    initScrollReveal();
    initContactForm();
    initFooterYear();
    initAnchorFocus();
    initHeroTilt();
    initFaq();
    initViewTransitionCleanup();
    initThemeTransition();
    initScrollFillHeadlines();
    initStickyScrollSwitch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
