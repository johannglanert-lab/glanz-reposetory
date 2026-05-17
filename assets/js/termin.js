(function () {
  'use strict';

  const TZ = 'Europe/Berlin';
  const MIN_DAYS_AHEAD = 3;
  const MAX_DAYS_AHEAD = 60;
  const RECIPIENT = 'kontakt@glanzdesign.de';

  const MONTHS_DE = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  const WEEKDAYS_DE = [
    'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'
  ];

  function getBerlinToday() {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const [y, m, d] = fmt.format(new Date()).split('-').map(Number);
    return { year: y, month: m, day: d };
  }

  function dayDiff(a, b) {
    const A = Date.UTC(a.year, a.month - 1, a.day);
    const B = Date.UTC(b.year, b.month - 1, b.day);
    return Math.round((A - B) / 86400000);
  }

  function jsWeekdayMonFirst(date) {
    const w = date.getDay();
    return (w + 6) % 7;
  }

  const today = getBerlinToday();
  let viewYear = today.year;
  let viewMonth = today.month;
  let selectedDate = null;
  let selectedTime = null;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const grid = $('.calendar__grid');
  const titleEl = $('#calendar-title');
  const prevBtn = $('.calendar__nav--prev');
  const nextBtn = $('.calendar__nav--next');

  const slotsEl = $('#time-slots');
  const customWrap = $('#time-custom');
  const customToggle = $('#custom-time-toggle');
  const customInputWrap = $('#custom-time-wrap');
  const customInput = $('#custom-time');
  const errorEl = $('#time-picker-error');

  function showDateError() {
    errorEl.hidden = false;
  }
  function hideDateError() {
    errorEl.hidden = true;
  }

  const nextStepBtn = $('#step1-next');
  const step1 = $('.termin-step--1');
  const step2 = $('.termin-step--2');
  const stepSuccess = $('.termin-step--success');
  const summaryDateEl = $('#summary-date');
  const summaryTimeEl = $('#summary-time');
  const backBtn = $('#step2-back');
  const form = $('#termin-form');
  const stepperItems = $$('.stepper__item');

  function renderCalendar() {
    titleEl.textContent = MONTHS_DE[viewMonth - 1] + ' ' + viewYear;
    grid.innerHTML = '';

    const firstOfMonth = new Date(viewYear, viewMonth - 1, 1);
    const offset = jsWeekdayMonFirst(firstOfMonth);
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

    for (let i = 0; i < offset; i++) {
      const blank = document.createElement('span');
      blank.className = 'calendar__day calendar__day--blank';
      blank.setAttribute('aria-hidden', 'true');
      grid.appendChild(blank);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cell = { year: viewYear, month: viewMonth, day: d };
      const diff = dayDiff(cell, today);
      const js = new Date(viewYear, viewMonth - 1, d);
      const wkJs = js.getDay();
      const isWeekend = (wkJs === 0 || wkJs === 6);
      const isPast = diff < 0;
      const isToday = diff === 0;
      const isTooSoon = diff > 0 && diff < MIN_DAYS_AHEAD;
      const isTooFar = diff > MAX_DAYS_AHEAD;
      const isDisabled = isPast || isToday || isWeekend || isTooSoon || isTooFar;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'calendar__day';
      btn.textContent = String(d);
      btn.dataset.year = String(viewYear);
      btn.dataset.month = String(viewMonth);
      btn.dataset.day = String(d);
      btn.setAttribute('role', 'gridcell');

      const wdLong = WEEKDAYS_DE[jsWeekdayMonFirst(js)];
      btn.setAttribute('aria-label', `${wdLong}, ${d}. ${MONTHS_DE[viewMonth - 1]} ${viewYear}`);

      if (isToday) {
        btn.classList.add('calendar__day--today');
      }

      if (isDisabled) {
        btn.classList.add('calendar__day--disabled');
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
        if (isToday) btn.title = 'Heute nicht mehr buchbar – bitte mindestens 3 Werktage im Voraus';
        else if (isWeekend) btn.title = 'Wochenende';
        else if (isTooSoon) btn.title = 'Termine erst ab 3 Werktagen im Voraus';
        else if (isTooFar) btn.title = 'Zu weit in der Zukunft';
        else if (isPast) btn.title = 'Vergangenheit';
      } else {
        btn.classList.add('calendar__day--available');
      }

      if (selectedDate &&
          selectedDate.year === viewYear &&
          selectedDate.month === viewMonth &&
          selectedDate.day === d) {
        btn.classList.add('calendar__day--selected');
        btn.setAttribute('aria-pressed', 'true');
      }

      grid.appendChild(btn);
    }

    const viewAbs = viewYear * 12 + (viewMonth - 1);
    const todayAbs = today.year * 12 + (today.month - 1);
    const maxJs = new Date(today.year, today.month - 1, today.day + MAX_DAYS_AHEAD);
    const maxAbs = maxJs.getFullYear() * 12 + maxJs.getMonth();
    prevBtn.disabled = viewAbs <= todayAbs;
    nextBtn.disabled = viewAbs >= maxAbs;
  }

  prevBtn.addEventListener('click', () => {
    viewMonth -= 1;
    if (viewMonth < 1) { viewMonth = 12; viewYear -= 1; }
    renderCalendar();
  });

  nextBtn.addEventListener('click', () => {
    viewMonth += 1;
    if (viewMonth > 12) { viewMonth = 1; viewYear += 1; }
    renderCalendar();
  });

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.calendar__day');
    if (!btn || btn.disabled || btn.classList.contains('calendar__day--blank')) return;

    grid.querySelectorAll('.calendar__day--selected').forEach((n) => {
      n.classList.remove('calendar__day--selected');
      n.removeAttribute('aria-pressed');
    });
    btn.classList.add('calendar__day--selected');
    btn.setAttribute('aria-pressed', 'true');

    selectedDate = {
      year: parseInt(btn.dataset.year, 10),
      month: parseInt(btn.dataset.month, 10),
      day: parseInt(btn.dataset.day, 10)
    };

    hideDateError();
    updateNextButton();
  });

  function clearSlotSelection() {
    slotsEl.querySelectorAll('.time-slot').forEach((n) => {
      n.classList.remove('time-slot--selected');
      n.setAttribute('aria-checked', 'false');
    });
  }

  slotsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.time-slot');
    if (!btn) return;

    if (!selectedDate) {
      showDateError();
      return;
    }

    clearSlotSelection();
    btn.classList.add('time-slot--selected');
    btn.setAttribute('aria-checked', 'true');
    selectedTime = btn.dataset.time;

    customInput.value = '';
    customInputWrap.hidden = true;
    customToggle.setAttribute('aria-expanded', 'false');

    updateNextButton();
  });

  customToggle.addEventListener('click', () => {
    if (!selectedDate) {
      showDateError();
      return;
    }
    const willOpen = customInputWrap.hidden;
    customInputWrap.hidden = !willOpen;
    customToggle.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) {
      setTimeout(() => customInput.focus(), 50);
    }
  });

  customInput.addEventListener('input', () => {
    if (!selectedDate) {
      showDateError();
      customInput.value = '';
      selectedTime = null;
      updateNextButton();
      return;
    }
    const v = customInput.value;
    if (v) {
      selectedTime = v;
      clearSlotSelection();
    } else {
      selectedTime = null;
    }
    updateNextButton();
  });

  function updateNextButton() {
    nextStepBtn.disabled = !(selectedDate && selectedTime);
  }

  function formatSelectedDate() {
    const d = selectedDate;
    const js = new Date(d.year, d.month - 1, d.day);
    const wd = WEEKDAYS_DE[jsWeekdayMonFirst(js)];
    return `${wd}, ${d.day}. ${MONTHS_DE[d.month - 1]} ${d.year}`;
  }

  function setStepperState(activeIndex) {
    stepperItems.forEach((item, i) => {
      item.classList.toggle('stepper__item--active', i === activeIndex);
      item.classList.toggle('stepper__item--done', i < activeIndex);
    });
  }

  nextStepBtn.addEventListener('click', () => {
    if (!selectedDate || !selectedTime) return;
    summaryDateEl.textContent = formatSelectedDate();
    summaryTimeEl.textContent = selectedTime + ' Uhr';
    step1.hidden = true;
    step1.classList.remove('is-active');
    step2.hidden = false;
    step2.classList.add('is-active');
    setStepperState(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  backBtn.addEventListener('click', () => {
    step2.hidden = true;
    step2.classList.remove('is-active');
    step1.hidden = false;
    step1.classList.add('is-active');
    setStepperState(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  function validateField(input) {
    const wrap = input.closest('.form-field');
    const errEl = wrap.querySelector('.form-field__error');
    let msg = '';
    if (!input.value.trim()) {
      msg = 'Bitte ausfüllen.';
    } else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) {
      msg = 'Bitte gültige E-Mail eingeben.';
    }
    if (msg) {
      input.classList.add('form-field__input--invalid');
      if (errEl) errEl.textContent = msg;
      return false;
    }
    input.classList.remove('form-field__input--invalid');
    if (errEl) errEl.textContent = '';
    return true;
  }

  $$('#termin-form .form-field__input[required]').forEach((input) => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('form-field__input--invalid')) {
        validateField(input);
      }
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#t-name');
    const email = $('#t-email');
    const phone = $('#t-phone');
    const msgEl = $('#t-message');

    const valid = [name, email, phone].every(validateField);
    if (!valid) {
      const firstBad = form.querySelector('.form-field__input--invalid');
      if (firstBad) firstBad.focus();
      return;
    }

    const subject = `Terminanfrage – ${formatSelectedDate()} um ${selectedTime} Uhr`;
    const body = [
      'Hallo Glanz Design,',
      '',
      'ich möchte gerne einen Termin für ein kostenloses Erstgespräch vereinbaren.',
      '',
      'Wunschtermin: ' + formatSelectedDate(),
      'Wunschuhrzeit: ' + selectedTime + ' Uhr',
      '',
      'Name: ' + name.value.trim(),
      'E-Mail: ' + email.value.trim(),
      'Telefon: ' + phone.value.trim(),
      '',
      'Anliegen:',
      msgEl.value.trim() || '(keine weitere Beschreibung)',
      '',
      'Viele Grüße',
      name.value.trim()
    ].join('\r\n');

    const mailto = 'mailto:' + RECIPIENT +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);

    window.location.href = mailto;

    setTimeout(() => {
      step2.hidden = true;
      step2.classList.remove('is-active');
      stepSuccess.hidden = false;
      stepSuccess.classList.add('is-active');
      stepperItems.forEach((n) => {
        n.classList.remove('stepper__item--active');
        n.classList.add('stepper__item--done');
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 800);
  });

  renderCalendar();
})();
