/* 아인소닉 홈페이지 — 화면 동작 전체. DOM은 createElement/textContent로만 만든다(innerHTML 미사용). */
(function () {
  'use strict';

  var NOTICE_JSON = '/notices.json';
  var BANNER_JSON = '/banners.json';
  var CLIENTS_JSON = '/data/clients.json';
  var NEWS_RSS = 'https://news.ainsonic.com/rss.xml';
  var NEWS_JSON = 'https://news.ainsonic.com/news.json';
  var NEWS_HOME = 'https://news.ainsonic.com/';
  var MIN_BANNER_WIDTH = 1000; // 이보다 작은 배너 이미지는 전체화면에서 흐려지므로 건너뛴다

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function el(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function emptyBox(msg, linkText, linkHref) {
    var d = el('div', { class: 'empty' }, msg);
    if (linkText) { d.appendChild(document.createTextNode(' ')); d.appendChild(el('a', { href: linkHref, target: '_blank', rel: 'noopener', text: linkText })); }
    return d;
  }
  function safeUrl(u, fallback) { return /^https?:\/\//i.test(u || '') ? u : fallback; }
  function ymd(d) { var p = function (n) { return String(n).padStart(2, '0'); }; return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()); }
  function fetchJSON(url) {
    return fetch(url + (url.indexOf('?') < 0 ? '?_=' : '&_=') + Date.now()).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }

  /* ---------- 상단 메뉴 · 테마 ---------- */
  (function () {
    var nav = $('#nav'), btn = $('#menuBtn');
    function set(o) { nav.classList.toggle('open', o); btn.setAttribute('aria-expanded', String(o)); btn.setAttribute('aria-label', o ? '메뉴 닫기' : '메뉴 열기'); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); set(!nav.classList.contains('open')); });
    $$('#menu a').forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
    document.addEventListener('click', function (e) { if (nav.classList.contains('open') && !nav.contains(e.target)) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { set(false); btn.focus(); } });

    $('#themeBtn').addEventListener('click', function () {
      var r = document.documentElement;
      var cur = r.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = cur === 'dark' ? 'light' : 'dark';
      r.setAttribute('data-theme', next);
      try { localStorage.setItem('ains_theme', next); } catch (e) { /* 저장 불가 환경은 무시 */ }
    });

    // 현재 위치 메뉴 표시 + 문의 영역에서는 하단 고정 버튼 숨김
    if ('IntersectionObserver' in window) {
      var links = {};
      $$('#menu a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
      var spy = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var a = links[e.target.id]; if (!a) return;
          if (e.isIntersecting) { $$('#menu a').forEach(function (x) { x.removeAttribute('aria-current'); }); a.setAttribute('aria-current', 'true'); }
        });
      }, { rootMargin: '-40% 0px -55% 0px' });
      Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
      var dock = $('#dock'), contact = $('#contact');
      if (dock && contact) new IntersectionObserver(function (es) { dock.classList.toggle('gone', es[0].isIntersecting); }, { threshold: 0.15 }).observe(contact);
      /* 디자인 전용: 첫 화면(히어로) 위에서는 헤더를 히어로와 같은 어두운 톤으로 이어 붙인다 */
      var navEl = $('#nav'), heroEl = $('.hero');
      if (navEl && heroEl) new IntersectionObserver(function (es) { navEl.classList.toggle('on-hero', es[0].isIntersecting); }, { rootMargin: '-68px 0px 0px 0px', threshold: 0 }).observe(heroEl);
    }
  })();

  /* ---------- 복사 버튼 ---------- */
  $$('.copy[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var done = function (t) { b.textContent = t; setTimeout(function () { b.textContent = '복사'; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(b.dataset.copy).then(function () { done('복사됨'); }, function () { done('실패'); });
      else done('실패');
    });
  });

  /* ---------- 공지사항 ---------- */
  (function () {
    var box = $('#noticeList');
    fetchJSON(NOTICE_JSON).then(function (data) {
      var items = (Array.isArray(data) ? data : []).slice(0, 5);
      clear(box);
      if (!items.length) { box.appendChild(emptyBox('등록된 공지사항이 없습니다.')); return; }
      items.forEach(function (n) {
        var title = el('span', { class: 't' });
        if (n.pinned) { title.appendChild(el('span', { class: 'pin', text: '공지' })); title.appendChild(document.createTextNode(' ')); }
        title.appendChild(document.createTextNode(String(n.title || '')));
        var sum = el('summary', null, title, el('span', { class: 'd', text: String(n.date || '').replace(/-/g, '.') }));
        var d = el('details', null, sum);
        if (n.content) d.appendChild(el('div', { class: 'body', text: String(n.content) }));
        box.appendChild(d);
      });
    }).catch(function () { clear(box); box.appendChild(emptyBox('공지사항을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.')); });
  })();

  /* ---------- 업계 소식(RSS) ---------- */
  (function () {
    var box = $('#newsList');
    fetch(NEWS_RSS).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (txt) {
      var x = new DOMParser().parseFromString(txt, 'text/xml');
      var all = $$('item', x).slice(0, 5);
      if (!all.length) throw new Error('empty');
      clear(box);
      all.forEach(function (it) {
        var g = function (t) { var n = it.querySelector(t); return n ? n.textContent.trim() : ''; };
        var cat = g('category'), title = g('title');
        if (cat && title.indexOf('[' + cat + ']') === 0) title = title.slice(cat.length + 2).trim();
        var d = new Date(g('pubDate'));
        var a = el('a', { class: 'row', href: safeUrl(g('link'), NEWS_HOME), target: '_blank', rel: 'noopener' },
          el('span', { class: 't' }, (cat ? el('span', { class: 'pin', text: cat }) : null), cat ? ' ' : null, title),
          el('span', { class: 'd', text: isNaN(d) ? '' : ymd(d) }));
        box.appendChild(a);
      });
    }).catch(function () { clear(box); box.appendChild(emptyBox('업계 소식을 불러오지 못했습니다.', 'PRO AUDIO WIRE에서 보기', NEWS_HOME)); });
  })();

  /* ---------- 주요 신제품 6선: news.ainsonic.com과 같은 날짜 시드 추첨 ---------- */
  (function () {
    var box = $('#newsTopList');
    function seeded(seed) {
      var h = 1779033703 ^ seed.length;
      for (var i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
      return function () { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
    }
    function todayKST() { var d = new Date(Date.now() + 9 * 3600e3), p = function (n) { return String(n).padStart(2, '0'); }; return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()); }
    function pick(data) {
      var pool = data.filter(function (i) { return (i.category || '프로오디오') === '프로오디오'; }).slice(0, 40);
      if (pool.length <= 6) return pool;
      var rand = seeded('featured-' + todayKST());
      var rem = pool.map(function (item) { return { item: item, w: (item.imageUrl ? 2 : 0) + (item.isDomestic ? 4 : 0) + 1 }; });
      var out = [];
      for (var k = 0; k < 6 && rem.length; k++) {
        var total = rem.reduce(function (s, x) { return s + x.w; }, 0), r = rand() * total, idx = 0;
        for (; idx < rem.length - 1; idx++) { r -= rem[idx].w; if (r <= 0) break; }
        out.push(rem[idx].item); rem.splice(idx, 1);
      }
      return out;
    }
    fetchJSON(NEWS_JSON).then(function (data) {
      if (!Array.isArray(data) || !data.length) throw new Error('empty');
      clear(box);
      pick(data).forEach(function (n) {
        var brand = String(n.brand || n.company || ''), name = String(n.productName || brand);
        var th = el('div', { class: 'nb-th' });
        if (n.isDomestic) th.appendChild(el('span', { class: 'nb-flag', text: '🇰🇷 국내' }));
        var fb = function () { return el('span', { class: 'fb', text: brand }); };
        if (/^https:\/\//i.test(n.imageUrl || '')) {
          var img = el('img', { src: n.imageUrl, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' });
          img.addEventListener('error', function () { img.replaceWith(fb()); });
          th.appendChild(img);
        } else th.appendChild(fb());
        box.appendChild(el('a', { class: 'nb-card', href: safeUrl(n.link, NEWS_HOME), target: '_blank', rel: 'noopener' }, th,
          el('div', { class: 'nb-b' }, el('span', { class: 'c', text: String(n.type || '소식') }), el('h3', { text: name }), el('span', { class: 'b', text: brand }))));
      });
    }).catch(function () { clear(box); box.appendChild(emptyBox('업계 소식을 불러오지 못했습니다.', 'PRO AUDIO WIRE에서 보기', NEWS_HOME)); });
  })();

  /* ---------- 히어로 배너: 해상도 기준 통과분만 사용 ---------- */
  (function () {
    var bg = $('#heroBg'), dots = $('#heroDots'), prev = $('#heroPrev'), next = $('#heroNext'), hero = $('#top');
    function probe(src) {
      return new Promise(function (res) {
        var i = new Image();
        i.onload = function () { res(i.naturalWidth >= MIN_BANNER_WIDTH ? src : null); };
        i.onerror = function () { res(null); };
        i.src = src;
      });
    }
    fetchJSON(BANNER_JSON).then(function (data) {
      var interval = Math.min(20, Math.max(3, Number(data.interval) || 5));
      var imgs = (Array.isArray(data.items) ? data.items : []).map(function (b) { return b && b.image; }).filter(function (s) { return /^(\/|https:\/\/)/.test(s || ''); });
      return Promise.all(imgs.map(probe)).then(function (ok) { return { ok: ok.filter(Boolean), interval: interval }; });
    }).then(function (r) {
      if (!r.ok.length) return; // 기본 이미지를 그대로 둔다
      clear(bg);
      var slides = r.ok.map(function (src, i) {
        var s = el('div', { class: 'sl' + (i === 0 ? ' on' : '') });
        s.style.backgroundImage = 'url("' + encodeURI(src) + '")';
        bg.appendChild(s); return s;
      });
      if (slides.length < 2) return;
      var idx = 0, timer = null, held = false;
      var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      function show(n) {
        idx = (n + slides.length) % slides.length;
        slides.forEach(function (s, i) { s.classList.toggle('on', i === idx); });
        $$('button', dots).forEach(function (d, i) { d.classList.toggle('on', i === idx); d.setAttribute('aria-current', String(i === idx)); });
      }
      function stop() { if (timer) { clearInterval(timer); timer = null; } }
      function start() { stop(); if (!held && !reduce && !document.hidden) timer = setInterval(function () { show(idx + 1); }, r.interval * 1000); }
      clear(dots);
      slides.forEach(function (_, i) { var b = el('button', { type: 'button', 'aria-label': (i + 1) + '번째 배너' }); b.addEventListener('click', function () { show(i); start(); }); dots.appendChild(b); });
      dots.hidden = false; prev.hidden = false; next.hidden = false;
      prev.addEventListener('click', function () { show(idx - 1); start(); });
      next.addEventListener('click', function () { show(idx + 1); start(); });
      hero.addEventListener('mouseenter', function () { held = true; stop(); });
      hero.addEventListener('mouseleave', function () { held = false; start(); });
      hero.addEventListener('focusin', function () { held = true; stop(); });
      hero.addEventListener('focusout', function () { held = false; start(); });
      document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
      var x0 = null;
      hero.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      hero.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) { show(idx + (dx < 0 ? 1 : -1)); start(); } x0 = null; }, { passive: true });
      show(0); start();
    }).catch(function () { /* 배너 설정을 못 읽으면 기본 이미지 유지 */ });
  })();

  /* ---------- 고객사 ---------- */
  (function () {
    var box = $('#clientGroups'); if (!box) return;
    fetchJSON(CLIENTS_JSON).then(function (data) {
      var groups = (Array.isArray(data) ? data : []).filter(function (g) { return g && g.group && Array.isArray(g.names) && g.names.length; });
      clear(box);
      if (!groups.length) { box.appendChild(emptyBox('고객사 정보를 준비 중입니다.')); return; }
      groups.forEach(function (g) {
        var ul = el('ul');
        g.names.forEach(function (n) { ul.appendChild(el('li', { text: String(n) })); });
        box.appendChild(el('div', { class: 'client-group' }, el('h3', { text: String(g.group) }), ul));
      });
    }).catch(function () { clear(box); box.appendChild(emptyBox('고객사를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.')); });
  })();
  /* ---------- 문의 폼 ---------- */
  (function () {
    var form = $('#inq'); if (!form) return;
    var endpoint = form.getAttribute('data-endpoint') || '';
    var msg = $('#msg'), btn = $('#send'), sending = false;

    function phoneFmt(v) {
      var d = v.replace(/\D/g, '');
      if (d.length === 11) return d.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
      if (d.length === 10) return d.replace(/(\d{2,3})(\d{3,4})(\d{4})/, '$1-$2-$3');
      return v.trim();
    }
    function setErr(id, text, input) {
      var p = $('#' + id); if (!p) return;
      p.hidden = !text; p.textContent = text || '';
      if (input) { if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
      var wrap = p.closest('.fld'); if (wrap) wrap.classList.toggle('bad', !!text);
    }
    function validate(d) {
      var first = null, bad = function (el0) { if (!first) first = el0; };
      setErr('e-org', d.org ? '' : '기관·상호명을 입력해 주세요.', $('#org')); if (!d.org) bad($('#org'));
      var digits = d.phone.replace(/\D/g, '');
      var phoneOk = digits.length >= 9 && digits.length <= 11;
      setErr('e-phone', phoneOk ? '' : '연락처를 확인해 주세요. 숫자 9~11자리입니다.', $('#phone')); if (!phoneOk) bad($('#phone'));
      setErr('e-types', d.types.length ? '' : '필요한 것을 하나 이상 골라 주세요.'); if (!d.types.length) bad($('#types input'));
      setErr('e-agree', $('#agree').checked ? '' : '개인정보 수집에 동의해 주세요.'); if (!$('#agree').checked) bad($('#agree'));
      return first;
    }
    form.addEventListener('input', function (e) { var t = e.target; if (t.id === 'org') setErr('e-org', '', t); if (t.id === 'phone') setErr('e-phone', '', t); if (t.name === 'types') setErr('e-types', ''); if (t.id === 'agree') setErr('e-agree', ''); });

    function done(phone) {
      clear(form);
      form.appendChild(el('div', { class: 'done', role: 'status' }, el('b', { text: '문의가 접수되었습니다.' }), '확인 후 ' + phone + '로 직접 연락드리겠습니다. 급한 일은 010-3599-6733으로 전화 주세요.'));
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      msg.className = 'msg err'; msg.textContent = '';
      var types = $$('input[name=types]:checked', form).map(function (i) { return i.value; });
      var data = {
        org: $('#org').value.trim(), contact_name: $('#cname').value.trim(), phone: phoneFmt($('#phone').value), email: $('#email').value.trim(),
        space: $('#space').value, region: $('#region').value.trim(), types: types.join(','), message: $('#message').value.trim(),
        website: $('#website').value, submitted_at: new Date().toISOString()
      };
      var firstBad = validate({ org: data.org, phone: data.phone, types: types });
      if (firstBad) { firstBad.focus(); return; }
      if (data.website) { done(data.phone); return; } // 스팸 봇: 보낸 척만 한다
      if (!endpoint) { msg.textContent = '지금은 온라인 접수를 준비 중입니다. 010-3599-6733으로 전화 주시거나 ainsonicav@gmail.com으로 메일 주세요.'; return; }
      sending = true; btn.disabled = true; btn.textContent = '보내는 중…';
      var ctl = ('AbortController' in window) ? new AbortController() : null;
      var t = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
      fetch(endpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data), signal: ctl ? ctl.signal : undefined })
        .then(function () { done(data.phone); })
        .catch(function () { msg.textContent = '보내지 못했습니다. 잠시 후 다시 시도하시거나 010-3599-6733으로 전화 주세요.'; })
        .then(function () { clearTimeout(t); sending = false; if (btn.isConnected) { btn.disabled = false; btn.textContent = '문의 보내기'; } });
    });
  })();
})();
