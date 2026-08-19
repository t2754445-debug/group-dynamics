/* Динамика группы — интерактив личной страницы. */
(function () {
  'use strict';

  var sim = window.__SIM__;
  if (!sim) return;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------- состояние рычагов ---------- */
  var state = {
    sleep: sim.start.sleep,
    phys: sim.start.phys,
    clean_food: sim.start.clean_food,
    request: sim.start.request
  };

  /* Прогноз метрики.
     Эффект каждого рычага измерен как разница средних «в дни с рычагом»
     против «в дни без него» у этого человека. Личное среднее — это смесь
     тех и других дней, поэтому включение рычага на все дни сдвигает среднее
     на delta * (доля дней без рычага), а выключение — на -delta * (доля дней с ним). */
  function forecast(metric) {
    var base = sim.base[metric];
    if (base === null || base === undefined) return null;
    var v = base;
    ['sleep7', 'phys', 'clean_food', 'request'].forEach(function (key) {
      var eff = sim.levers[key] && sim.levers[key][metric];
      if (!eff) return;
      var on = key === 'sleep7' ? (state.sleep >= 7) : !!state[key];
      var tot = eff.n_on + eff.n_off;
      if (!tot) return;
      v += on ? eff.delta * (eff.n_off / tot) : -eff.delta * (eff.n_on / tot);
    });
    return clamp(v, 0, 10);
  }

  function fmt(x) { return x === null ? '—' : (Math.round(x * 10) / 10).toFixed(1).replace('.', ','); }

  function paint() {
    ['E', 'T', 'S'].forEach(function (m) {
      var el = $('#fc-' + m);
      if (!el) return;
      var v = forecast(m);
      var base = sim.base[m];
      $('.n', el).textContent = fmt(v);
      var d = $('.d', el);
      if (v === null || base === null) { d.textContent = ''; return; }
      var diff = v - base;
      var sign = diff > 0.05 ? '+' : '';
      d.textContent = Math.abs(diff) < 0.05 ? 'как обычно' : sign + fmt(diff).replace('0,', '0,') + ' п.';
      var good = (m === 'T') ? (diff < 0) : (diff > 0);
      d.style.color = Math.abs(diff) < 0.05 ? 'var(--faint)'
        : (good ? 'var(--calm)' : 'var(--tension)');
    });

    var sl = $('#sleep-val');
    if (sl) {
      var h = state.sleep;
      sl.textContent = fmt(h) + ' ч' + (h >= 7 ? ' · режим «выспался»' : ' · режим «недосып»');
    }
    var note = $('#sim-note');
    if (note) note.innerHTML = advice();
  }

  function advice() {
    var best = null;
    ['sleep7', 'phys', 'clean_food', 'request'].forEach(function (key) {
      var eff = sim.levers[key];
      if (!eff) return;
      var score = 0;
      if (eff.E) score += eff.E.delta;
      if (eff.S) score += eff.S.delta;
      if (eff.T) score -= eff.T.delta;
      if (best === null || score > best.score) best = { key: key, score: score };
    });
    if (!best || best.score <= 0.05) {
      return 'У тебя пока нет рычага с заметным эффектом: разброс между днями меньше, ' +
        'чем нужно, чтобы что-то уверенно выделить. Это тоже результат — значит состояние ' +
        'сейчас определяется не режимом, а чем-то, что в отчёте не фиксируется.';
    }
    var names = {
      sleep7: 'сон 7 часов и больше',
      phys: 'телесная практика в этот день',
      clean_food: 'день без вредной еды',
      request: 'запрос в группу'
    };
    var s = sim.source[best.key];
    var src = s === 'self' ? 'по твоим собственным дням'
      : (s === 'mixed' ? 'по твоим дням с поправкой на группу — своих наблюдений мало'
        : 'по данным всей группы: своих дней для сравнения не хватило');
    return '<strong>Здесь самый сильный сдвиг: ' + names[best.key] + '.</strong> Посчитано ' + src +
      '. Подвигай именно его — остальные меняют цифру слабее.';
  }

  /* ---------- слайдер сна ---------- */
  var slider = $('#sleep-slider');
  if (slider) {
    slider.value = String(state.sleep);
    slider.addEventListener('input', function () {
      state.sleep = parseFloat(slider.value);
      paint();
    });
  }

  /* ---------- тумблеры ---------- */
  $$('.tg').forEach(function (el) {
    var key = el.getAttribute('data-key');
    if (state[key]) el.classList.add('on');
    var flip = function (ev) {
      ev.preventDefault();
      state[key] = !state[key];
      el.classList.toggle('on', !!state[key]);
      paint();
    };
    el.addEventListener('click', flip);
    el.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') flip(ev);
    });
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'switch');
  });

  paint();

  /* ---------- чек-лист плана ---------- */
  var KEY = 'plan:' + (sim.id || 'x');
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { saved = {}; }

  $$('.plan li').forEach(function (li, i) {
    if (saved[i]) li.classList.add('on');
    li.setAttribute('tabindex', '0');
    var flip = function () {
      li.classList.toggle('on');
      saved[i] = li.classList.contains('on');
      try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
    };
    li.addEventListener('click', flip);
    li.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); flip(); }
    });
  });

  /* ---------- копирование плана ---------- */
  var btn = $('#copy-plan');
  if (btn) {
    btn.addEventListener('click', function () {
      var lines = $$('.plan li').map(function (li) {
        return (li.classList.contains('on') ? '☑ ' : '☐ ') + $('.tx', li).textContent.trim();
      });
      var txt = 'Мой план на завтра\n\n' + lines.join('\n');
      var ok = function () {
        btn.textContent = 'Скопировано — вставь в свой отчёт';
        btn.classList.add('done');
        setTimeout(function () {
          btn.textContent = 'Скопировать план в буфер';
          btn.classList.remove('done');
        }, 2600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(ok, fallback);
      } else fallback();

      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = txt;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); ok(); } catch (e) {
          btn.textContent = 'Не удалось скопировать';
        }
        document.body.removeChild(ta);
      }
    });
  }
})();
