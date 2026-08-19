/* Отчёты группы — интерактив. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- лестница: раскрытие ступеней ---------- */
  $$('.step').forEach(function (step) {
    var head = $('.step-head', step);
    if (!head) return;
    head.setAttribute('role', 'button');
    head.setAttribute('tabindex', '0');
    head.setAttribute('aria-expanded', step.classList.contains('open') ? 'true' : 'false');
    var toggle = function (ev) {
      if (ev) ev.preventDefault();
      var open = step.classList.toggle('open');
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') toggle(ev);
    });
  });

  /* ---------- слайдер сна ---------- */
  var P = window.__P__;
  var slider = $('#sleep-slider');
  if (!P || !slider) return;

  var eff = P.sleep || {};
  var base = P.base || {};

  function fmt(x) {
    return x === null || x === undefined ? '—' : (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
  }

  /* Эффект измерен как разница средних «дни с 7+ часами» против «дни с меньшим сном».
     Личное среднее — смесь тех и других, поэтому переход в один режим сдвигает
     ожидаемое значение на долю дней противоположного режима. */
  function forecast(metric, enough) {
    var b = base[metric];
    if (b === null || b === undefined) return null;
    var e = eff[metric];
    if (!e) return b;
    var tot = e.n_on + e.n_off;
    if (!tot) return b;
    var v = enough ? b + e.delta * (e.n_off / tot) : b - e.delta * (e.n_on / tot);
    return Math.max(0, Math.min(10, v));
  }

  function paint() {
    var h = parseFloat(slider.value);
    var enough = h >= 7;
    $('#sleep-val').textContent = fmt(h) + ' ч';

    ['E', 'T', 'S'].forEach(function (m) {
      var el = $('#fc-' + m);
      if (!el) return;
      var v = forecast(m, enough);
      $('.n', el).textContent = fmt(v);
      var d = $('.d', el);
      var b = base[m];
      if (v === null || b === null || b === undefined) { d.textContent = ''; return; }
      var diff = v - b;
      if (Math.abs(diff) < 0.05) {
        d.textContent = 'как обычно';
        d.style.color = 'var(--faint)';
      } else {
        d.textContent = (diff > 0 ? '+' : '−') + fmt(Math.abs(diff));
        var good = (m === 'T') ? (diff < 0) : (diff > 0);
        d.style.color = good ? 'var(--calm)' : 'var(--tension)';
      }
    });

    var note = $('#sleep-note');
    if (!note) return;
    if (enough) {
      note.textContent = 'В дни, когда ты спал 7 часов и больше, состояние в среднем было такое. '
        + 'Разница небольшая — примерно треть пункта. Но это единственный фактор, '
        + 'который двигает все три шкалы сразу, и он полностью в твоих руках.';
    } else {
      note.textContent = 'Меньше 7 часов — и все три шкалы сдвигаются в худшую сторону. '
        + 'Это не катастрофа за одну ночь, но за неделю накапливается.';
    }
  }

  slider.addEventListener('input', paint);
  paint();
})();
