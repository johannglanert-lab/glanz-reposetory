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
  /* MODULE 5: TESTIMONIALS CAROUSEL                                    */
  /* ────────────────────────────────────────────────────────────────── */

  function initCarousel() {
    const carousel = document.querySelector('.carousel');
    const slides = document.querySelectorAll('.carousel__slide');
    const dots = document.querySelectorAll('.carousel__dot');
    const btnPrev = document.getElementById('carousel-prev');
    const btnNext = document.getElementById('carousel-next');

    if (!carousel || !slides.length) return;

    let current = 0;
    let autoplayTimer = null;
    const AUTOPLAY_MS = 7000;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setSlide(index) {
      slides[current].classList.remove('carousel__slide--active');
      slides[current].setAttribute('aria-hidden', 'true');
      dots[current].classList.remove('carousel__dot--active');
      dots[current].setAttribute('aria-selected', 'false');

      slides[index].classList.add('carousel__slide--active');
      slides[index].removeAttribute('aria-hidden');
      dots[index].classList.add('carousel__dot--active');
      dots[index].setAttribute('aria-selected', 'true');

      current = index;
    }

    function goTo(index) {
      const next = (index + slides.length) % slides.length;
      setSlide(next);
      resetAutoplay();
    }

    function resetAutoplay() {
      clearInterval(autoplayTimer);
      if (reduceMotion) return;
      autoplayTimer = setInterval(() => goTo(current + 1), AUTOPLAY_MS);
    }

    slides[0].classList.add('carousel__slide--active');
    slides.forEach((s, i) => {
      if (i !== 0) s.setAttribute('aria-hidden', 'true');
    });

    if (btnPrev) btnPrev.addEventListener('click', () => goTo(current - 1));
    if (btnNext) btnNext.addEventListener('click', () => goTo(current + 1));

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => goTo(i));
    });

    carousel.addEventListener('mouseenter', () => clearInterval(autoplayTimer));
    carousel.addEventListener('mouseleave', resetAutoplay);
    carousel.addEventListener('focusin', () => clearInterval(autoplayTimer));
    carousel.addEventListener('focusout', resetAutoplay);

    let touchStartX = 0;
    carousel.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    carousel.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 40) goTo(current + (diff > 0 ? 1 : -1));
    }, { passive: true });

    resetAutoplay();
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

    form.addEventListener('submit', async e => {
      e.preventDefault();

      let valid = true;
      form.querySelectorAll('.form-field__input').forEach(input => {
        if (!validateField(input)) valid = false;
      });

      if (!valid) {
        const firstInvalid = form.querySelector('.form-field__input--invalid');
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
  /* INIT                                                               */
  /* ────────────────────────────────────────────────────────────────── */

  function init() {
    initPreloader();
    initNav();
    initHeaderScroll();
    initCountUp();
    initScrollReveal();
    initCarousel();
    initContactForm();
    initFooterYear();
    initAnchorFocus();
    initHeroTilt();
    initFaq();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
