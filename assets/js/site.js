/* BuzzBaazaar site script. Minimal, progressive enhancement only. */
(function () {
  var d = document;
  d.documentElement.classList.remove('no-js');

  // Mobile menu
  var btn = d.querySelector('.nav-toggle');
  var panel = d.getElementById('nav-panel');
  if (btn && panel) {
    var close = function () { panel.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); };
    var open = function () { panel.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); var f = panel.querySelector('a'); if (f) f.focus(); };
    btn.addEventListener('click', function () { panel.classList.contains('is-open') ? close() : open(); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) close();
      if (e.key === 'Tab' && panel.classList.contains('is-open') && window.innerWidth < 1024) {
        var f = Array.prototype.slice.call(panel.querySelectorAll('a,button')).concat([btn]);
        var first = btn, last = f[f.length - 2];
        if (e.shiftKey && d.activeElement === btn) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); btn.focus(); }
      }
    });
    panel.addEventListener('click', function (e) { if (e.target.tagName === 'A') panel.classList.remove('is-open'); });
  }

  // Sticky CTA hides when a CTA band or the form is in view
  var sticky = d.querySelector('.sticky-cta');
  if (sticky && 'IntersectionObserver' in window) {
    var targets = d.querySelectorAll('.cta-band, #brief, .site-footer');
    var vis = 0;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { vis += en.isIntersecting ? 1 : -1; });
      sticky.classList.toggle('is-hidden', vis > 0);
    });
    targets.forEach(function (t) { io.observe(t); });
  }

  // Brief form
  var form = d.getElementById('brief-form');
  if (form) {
    var msg = d.getElementById('form-msg');
    var required = ['name', 'email', 'company', 'promote', 'goal', 'market', 'budget', 'timeline'];
    var show = function (kind, text) { msg.className = 'form-msg ' + kind; msg.textContent = text; msg.setAttribute('tabindex', '-1'); msg.focus(); };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = false, firstBad = null;
      required.forEach(function (n) {
        var el = form.elements[n]; var wrap = el.closest('.field');
        var ok = el.value.trim() !== '' && (n !== 'email' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value.trim()));
        wrap.classList.toggle('has-error', !ok);
        el.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (!ok) { bad = true; firstBad = firstBad || el; }
      });
      var consent = form.elements['consent'];
      var cw = consent.closest('.field'); cw.classList.toggle('has-error', !consent.checked);
      if (!consent.checked) { bad = true; firstBad = firstBad || consent; }
      if (bad) { show('is-bad', 'Please complete the highlighted fields.'); firstBad.focus(); return; }
      var data = {}; new FormData(form).forEach(function (v, k) { data[k] = v; });
      var submit = form.querySelector('button[type=submit]'); submit.disabled = true; submit.textContent = 'Sending…';
      fetch(form.getAttribute('action'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { if (!r.ok) throw new Error('fail'); return r.json(); })
        .then(function () { form.reset(); show('is-ok', 'Thank you. Our team has your brief and will reply by email within 24 hours.'); if (window.gtag) window.gtag('event', 'generate_lead', { form: 'brief' }); })
        .catch(function () { show('is-bad', 'We could not send your brief just now. Please email hello@buzzbaazaar.com or book a call using the link above.'); })
        .then(function () { submit.disabled = false; submit.textContent = 'Send your brief'; });
    });
    form.addEventListener('focusin', function () { if (window.gtag && !form.dataset.started) { form.dataset.started = '1'; window.gtag('event', 'form_start', { form: 'brief' }); } });
    // Prefill from query string (?goal=, ?market=)
    var q = new URLSearchParams(location.search);
    ['goal', 'market', 'promote'].forEach(function (k) { if (q.get(k) && form.elements[k]) form.elements[k].value = q.get(k); });
  }

  // CTA click events
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-evt]');
    if (a && window.gtag) window.gtag('event', a.getAttribute('data-evt'), { link_url: a.href });
  });
})();
