/* املاخوان — برنامه‌ی اصلی
   طراح: منوچهر کریمی */
(function () {
  'use strict';
  var E = window.Emla, LESSONS = window.LESSONS, CHAPTERS = window.CHAPTERS, FREE = window.FREE_LESSONS;
  var fa = E.faNum;
  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- ذخیره‌سازی ---------- */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('emla.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('emla.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };
  var settings = Object.assign({ rate: 0.85, pause: 1, intro: true, twice: false, showText: false, bg: 'green' }, store.get('settings', {}));
  function saveSettings() { store.set('settings', settings); }
  var custom = store.get('custom', {});
  var history = store.get('history', []);

  function lessonText(l) { var c = custom[l.n]; return (c && c.trim()) ? c : l.text; }

  var toastTimer;
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* ---------- صفحه‌ی درس‌ها ---------- */
  function bestScore(n) {
    var b = null;
    history.forEach(function (h) { if (h.n === n && (b === null || h.score > b)) b = h.score; });
    return b;
  }
  function renderHome() {
    var box = $('#lessonList'); box.innerHTML = '';
    CHAPTERS.forEach(function (ch) {
      var items = LESSONS.filter(function (l) { return l.chapter === ch.id; }).map(function (l) { return { l: l, free: false }; })
        .concat(FREE.filter(function (f) { return f.chapter === ch.id; }).map(function (f) { return { l: f, free: true }; }));
      items.sort(function (a, b) { return a.l.n - b.l.n; });
      var h = document.createElement('h3'); h.className = 'chapter'; h.textContent = ch.title; box.appendChild(h);
      var g = document.createElement('div'); g.className = 'grid'; box.appendChild(g);
      items.forEach(function (it) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'lesson' + (it.free ? ' free' : '');
        var sub = it.free ? 'درس آزاد؛ املا ندارد' : (it.l.kind === 'poem' ? 'شعر' + (it.l.author ? ' — ' + it.l.author : '') : 'نثر');
        var best = it.free ? null : bestScore(it.l.n);
        b.innerHTML = '<span class="num">' + fa(it.l.n) + '</span><span><div class="t">' + esc(it.l.title) + '</div><div class="s">' + esc(sub) + '</div></span>' +
          (best !== null ? '<span class="best">بهترین: ' + fa(best) + '</span>' : '');
        if (it.free) b.disabled = true; else b.addEventListener('click', function () { openLesson(it.l); });
        g.appendChild(b);
      });
    });
  }

  /* ---------- تخته ---------- */
  var board = new window.Board($('#boardWrap'));
  var TOOLS = [['pen', '✏️', 'قلم'], ['hl', '🖍️', 'ماژیک'], ['erase', '🧽', 'پاک‌کن'], ['line', '📏', 'خط'], ['arrow', '➡️', 'پیکان'],
    ['rect', '▭', 'مستطیل'], ['ellipse', '⭕', 'بیضی'], ['text', '🔤', 'نوشتن'], ['laser', '🔴', 'لیزر']];
  var COLORS = ['#f5f5f0', '#111827', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

  function buildTools() {
    var t = $('#tools'); t.innerHTML = '';
    function grp() { var d = document.createElement('div'); d.className = 'grp'; t.appendChild(d); return d; }
    function btn(parent, label, title, fn, cls) {
      var b = document.createElement('button'); b.type = 'button'; b.innerHTML = label; b.title = title || '';
      if (cls) b.className = cls; b.addEventListener('click', fn); parent.appendChild(b); return b;
    }
    var g1 = grp();
    TOOLS.forEach(function (x) {
      var b = btn(g1, x[1] + ' ' + x[2], x[2], function () { board.setTool(x[0]); refreshTools(); });
      b.dataset.tool = x[0];
    });
    var g2 = grp();
    COLORS.forEach(function (c) {
      var b = btn(g2, '', 'رنگ', function () { board.setColor(c); refreshTools(); }, 'sw');
      b.style.background = c; b.dataset.color = c;
    });
    var g3 = grp();
    var rng = document.createElement('input'); rng.type = 'range'; rng.min = 1; rng.max = 30; rng.value = board.size; rng.title = 'ضخامت';
    rng.addEventListener('input', function () { board.setSize(+rng.value); });
    g3.appendChild(rng);
    var g4 = grp();
    var sel = document.createElement('select'); sel.title = 'پس‌زمینه';
    [['green', 'تخته‌ی سبز'], ['white', 'سفید'], ['black', 'سیاه'], ['ruled', 'دفتر خط‌دار'], ['grid', 'شطرنجی']].forEach(function (o) {
      var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op);
    });
    sel.value = settings.bg;
    sel.addEventListener('change', function () { settings.bg = sel.value; saveSettings(); board.setBg(sel.value); refreshTools(); });
    g4.appendChild(sel);
    var g5 = grp();
    var bu = btn(g5, '↩️ برگردان', 'برگرداندن', function () { board.undo(); });
    var br = btn(g5, '↪️ جلو', 'جلو', function () { board.redo(); });
    btn(g5, '🗑️ پاک تخته', 'پاک کردن نوشته‌های روی تخته', function () { if (confirm('همه‌ی نقاشی‌ها و نوشته‌های روی تخته پاک شود؟ (متن املا پاک نمی‌شود)')) board.clearDrawing(); });
    var g6 = grp();
    btn(g6, 'A−', 'کوچک‌تر کردن نوشته‌ی املا', function () { board.setTextScale(board.textScale - 0.1); });
    btn(g6, 'A+', 'بزرگ‌تر کردن نوشته‌ی املا', function () { board.setTextScale(board.textScale + 0.1); });
    var g7 = grp();
    btn(g7, '🖼️ ذخیره', 'ذخیره‌ی تخته به‌صورت عکس', function () {
      board.toBlob(function (b) {
        if (!b) return;
        var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'emla-board.png';
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      });
    });
    var box = $('#boardBox');
    if (box.requestFullscreen || box.webkitRequestFullscreen) {
      btn(g7, '⛶ تمام‌صفحه', 'تمام‌صفحه', function () {
        var fs = document.fullscreenElement || document.webkitFullscreenElement;
        if (fs) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
        else { (box.requestFullscreen || box.webkitRequestFullscreen).call(box); }
      });
    }
    board.onchange = function () { bu.disabled = !board.canUndo(); br.disabled = !board.canRedo(); };
    board.onchange();
    refreshTools();
  }
  function refreshTools() {
    document.querySelectorAll('#tools [data-tool]').forEach(function (b) { b.classList.toggle('on', b.dataset.tool === board.tool); });
    document.querySelectorAll('#tools [data-color]').forEach(function (b) { b.classList.toggle('on', b.dataset.color === board.color && board.tool !== 'erase'); });
  }
  document.addEventListener('fullscreenchange', function () { setTimeout(function () { board.resize(); }, 120); });

  /* ---------- شکستن متن به جمله‌های املا ---------- */
  function wc(s) { return s.split(/\s+/).filter(Boolean).length; }
  function speakText(s) { return s.replace(/[«»"\/]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function makeChunks(text) {
    var pieces = [];
    text.split(/[\/\n]+/).forEach(function (line) {
      var parts = (line.match(/[^.!?؟؛:،]+[.!?؟؛:،»"]*/g) || []).map(function (p) { return p.trim(); }).filter(Boolean);
      parts.forEach(function (p) { pieces.push(p); });
    });
    var merged = [], i;
    for (i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      if (wc(p) < 3 && i + 1 < pieces.length) pieces[i + 1] = p + ' ' + pieces[i + 1];
      else if (wc(p) < 3 && merged.length) merged[merged.length - 1] += ' ' + p;
      else merged.push(p);
    }
    var out = [];
    merged.forEach(function (p) {
      var w = p.split(/\s+/).filter(Boolean), n = w.length;
      if (n <= 7) { out.push(w.join(' ')); return; }
      var k = Math.ceil(n / 6), size = Math.ceil(n / k);
      for (var s = 0; s < n; s += size) out.push(w.slice(s, s + size).join(' '));
    });
    return out.map(function (c) { return { show: c.replace(/[«»"]/g, ''), speak: speakText(c), words: wc(c) }; });
  }

  /* ---------- صدا ---------- */
  var synth = window.speechSynthesis, voices = [];
  function loadVoices() { if (!synth) return; voices = synth.getVoices() || []; updateVoiceInfo(); }
  function faVoice() {
    var v = voices.filter(function (x) { return /^fa/i.test(x.lang); });
    if (v.length) return v.find(function (x) { return /fa[-_]IR/i.test(x.lang); }) || v[0];
    return voices.find(function (x) { return /persian|farsi|فارسی/i.test(x.name); }) || null;
  }
  function updateVoiceInfo() {
    var v = faVoice(), info = $('#voiceInfo'), warn = $('#voiceWarn');
    if (!synth) {
      info.textContent = 'این مرورگر صدا ندارد.';
      warn.hidden = false; warn.textContent = 'این مرورگر قابلیت خواندن صوتی ندارد. در «تنظیمات» نمایش متن را روشن کن تا معلم یا والدین بخوانند، یا از مرورگر Chrome استفاده کن.';
      return;
    }
    if (v) { info.textContent = 'صدای فارسی پیدا شد: ' + v.name; warn.hidden = true; }
    else if (voices.length) {
      info.textContent = 'صدای فارسی پیدا نشد.';
      warn.hidden = false;
      warn.textContent = 'صدای فارسی روی این دستگاه پیدا نشد. در تنظیمات دستگاه (متن به گفتار) صدای فارسی را نصب کن؛ یا در «تنظیمات» نمایش متن را روشن کن تا معلم یا والدین جمله‌ها را بخوانند.';
    }
  }
  if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; setTimeout(loadVoices, 1500); }

  function say(text) {
    return new Promise(function (res) {
      if (!synth) { res(false); return; }
      var u = new SpeechSynthesisUtterance(text), done = false, guard;
      u.lang = 'fa-IR';
      var v = faVoice(); if (v) { u.voice = v; u.lang = v.lang; }
      u.rate = settings.rate; u.pitch = 1;
      function fin(ok) { if (done) return; done = true; clearTimeout(guard); res(ok); }
      u.onend = function () { fin(true); };
      u.onerror = function () { fin(false); };
      guard = setTimeout(function () { try { synth.cancel(); } catch (e) { /* ignore */ } fin(false); }, 4000 + text.length * 260 / settings.rate);
      try { synth.speak(u); } catch (e) { fin(false); }
    });
  }
  function cancelSpeech() { if (synth) { try { synth.cancel(); } catch (e) { /* ignore */ } } }

  /* ---------- روند املا ---------- */
  var cur = null, chunks = [];
  var D = { run: 0, i: 0, state: 'idle', paused: false, wake: null, resume: null, introDone: false };

  function sleep(ms) {
    return new Promise(function (res) {
      var t = setTimeout(done, ms);
      function done() { clearTimeout(t); if (D.wake === done) D.wake = null; res(); }
      D.wake = done;
    });
  }
  function waitResume() { return new Promise(function (res) { D.resume = res; }); }
  function stopLoop() {
    D.run++; cancelSpeech();
    if (D.wake) { var w = D.wake; D.wake = null; w(); }
    if (D.resume) { var r = D.resume; D.resume = null; r(); }
  }
  function status(t) { $('#dictStatus').textContent = t; }
  function gap(c) { return (1500 + c.words * 1500) * settings.pause; }

  function setDictUI() {
    var st = D.state;
    $('#btnStart').disabled = (st === 'playing' || st === 'paused');
    $('#btnStart').textContent = st === 'done' ? '🔊 دوباره از اول' : '🔊 شروع املا';
    $('#btnPause').disabled = !(st === 'playing' || st === 'paused');
    $('#btnPause').textContent = st === 'paused' ? '▶ ادامه' : '⏸ توقف';
    var on = (st === 'playing' || st === 'paused');
    $('#btnPrev').disabled = !on; $('#btnNext').disabled = !on; $('#btnRepeat').disabled = !on;
  }
  function showChunk(c) {
    status('جمله‌ی ' + fa(D.i + 1) + ' از ' + fa(chunks.length) + ' — گوش کن و بنویس');
    $('#progBar').style.width = Math.round(D.i / chunks.length * 100) + '%';
    var tl = $('#teacherLine');
    if (settings.showText) { tl.hidden = false; tl.textContent = c.show; } else tl.hidden = true;
  }
  function resetDictation() {
    stopLoop(); D.i = 0; D.state = 'idle'; D.paused = false; D.introDone = false;
    $('#progBar').style.width = '0%'; $('#teacherLine').hidden = true;
    status('آماده‌ای؟ دکمه‌ی «شروع املا» را بزن.'); setDictUI();
  }

  async function dictate() {
    var my = ++D.run;
    D.state = 'playing'; D.paused = false; setDictUI();
    if (D.i === 0 && settings.intro && !D.introDone) {
      status('گوش کن؛ متن را یک بار کامل می‌خوانم...');
      if (settings.showText) { var tl = $('#teacherLine'); tl.hidden = false; tl.textContent = 'خواندن کامل متن'; }
      await say('گوش کن. متن را یک بار کامل می‌خوانم.'); if (my !== D.run) return;
      await say(speakText(lessonText(cur).replace(/[\n\/]+/g, '، '))); if (my !== D.run) return;
      await sleep(1200); if (my !== D.run) return;
      await say('حالا جمله به جمله می‌گویم. بنویس.'); if (my !== D.run) return;
      D.introDone = true;
    }
    while (D.i < chunks.length) {
      if (my !== D.run) return;
      var c = chunks[D.i]; showChunk(c);
      await say(c.speak); if (my !== D.run) return;
      if (D.paused) { await waitResume(); if (my !== D.run) return; continue; }
      if (settings.twice) {
        await sleep(900); if (my !== D.run) return;
        if (D.paused) { await waitResume(); if (my !== D.run) return; continue; }
        await say(c.speak); if (my !== D.run) return;
      }
      await sleep(gap(c)); if (my !== D.run) return;
      if (D.paused) { await waitResume(); if (my !== D.run) return; continue; }
      D.i++;
    }
    D.state = 'done'; $('#progBar').style.width = '100%'; setDictUI();
    status('املا تمام شد ✔ نوشته‌ات را یک بار بخوان و بعد «تصحیح کن» را بزن.');
    $('#teacherLine').hidden = true;
    await say('املا تمام شد. نوشته‌ات را یک بار بخوان و بعد دکمه‌ی تصحیح را بزن.');
  }
  function jump(i) {
    stopLoop();
    D.i = Math.max(0, Math.min(chunks.length - 1, i)); D.introDone = true; dictate();
  }
  $('#btnStart').addEventListener('click', function () { stopLoop(); D.i = 0; D.introDone = false; dictate(); });
  $('#btnPause').addEventListener('click', function () {
    if (D.state === 'playing') {
      D.paused = true; D.state = 'paused'; setDictUI(); cancelSpeech(); if (D.wake) { var w = D.wake; D.wake = null; w(); }
      status('متوقف شد. هر وقت آماده بودی «ادامه» را بزن.');
    } else if (D.state === 'paused') {
      D.paused = false; D.state = 'playing'; setDictUI();
      if (D.resume) { var r = D.resume; D.resume = null; r(); }
    }
  });
  $('#btnPrev').addEventListener('click', function () { jump(D.i - 1); });
  $('#btnRepeat').addEventListener('click', function () { jump(D.i); });
  $('#btnNext').addEventListener('click', function () {
    if (D.i + 1 >= chunks.length) { stopLoop(); D.i = chunks.length; D.state = 'playing'; dictate(); }
    else jump(D.i + 1);
  });

  /* ---------- نوشتن و فرستادن خودکار به تخته ---------- */
  var ans = $('#answer'), raf = 0;
  ans.addEventListener('input', function () {
    if (board.result) { board.setResult(null); }
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; board.setStudentText(ans.value); });
  });
  $('#btnZwnj').addEventListener('click', function () {
    var s = ans.selectionStart, e = ans.selectionEnd, v = ans.value;
    ans.value = v.slice(0, s) + '\u200c' + v.slice(e);
    ans.selectionStart = ans.selectionEnd = s + 1; ans.focus();
    ans.dispatchEvent(new Event('input'));
  });
  $('#btnClearAns').addEventListener('click', function () {
    ans.value = ''; board.setResult(null); board.setStudentText(''); $('#resultPanel').hidden = true; ans.focus();
  });

  /* ---------- تصحیح ---------- */
  var lastResult = null;
  var TYPE_FA = { wrong: 'غلط', half: 'نیم‌فاصله یا فاصله', missing: 'افتاده', extra: 'اضافه', joined: 'سرهم‌نویسی' };

  $('#btnCheck').addEventListener('click', function () {
    var text = ans.value;
    if (!E.tokenize(text).length) { toast('هنوز چیزی ننوشته‌ای 🙂'); return; }
    stopLoop(); D.state = D.state === 'idle' ? 'idle' : 'done'; setDictUI();
    var res = E.correct(lessonText(cur), text);
    lastResult = res;
    board.setResult({ items: res.items, score: res.score });
    renderResult(res);
    addHistory(res);
    $('#teacherLine').hidden = true;
    status('تصحیح شد.');
    say('نمره‌ی تو ' + E.scoreWords(res.score) + ' از بیست. ' + res.level.say);
    setTimeout(function () { $('#boardBox').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
  });

  function renderResult(res) {
    var c = res.counts, bad = c.wrong + c.joined;
    var html = '<div class="head"><div class="score-circle"><div><b>' + fa(res.score) + '</b><small>از ۲۰</small></div></div><div>' +
      '<h3>سطح: ' + esc(res.level.name) + ' ' + res.level.emoji + '</h3><div class="chips">' +
      '<span class="chip">کل کلمه‌ها: ' + fa(res.total) + '</span>' +
      '<span class="chip ok">درست: ' + fa(c.ok) + '</span>' +
      (c.half ? '<span class="chip half">نیم‌فاصله/فاصله: ' + fa(c.half) + '</span>' : '') +
      (bad ? '<span class="chip bad">غلط: ' + fa(bad) + '</span>' : '') +
      (c.missing ? '<span class="chip miss">افتاده: ' + fa(c.missing) + '</span>' : '') +
      (c.extra ? '<span class="chip">اضافه: ' + fa(c.extra) + '</span>' : '') +
      '</div></div></div><div class="words">';
    res.items.forEach(function (it) {
      var show = it.type === 'missing' ? '▢▢▢' : it.student;
      var cls = { ok: 'ok', half: 'half', wrong: 'bad', joined: 'bad', missing: 'miss', extra: 'extra' }[it.type];
      var small = (it.type === 'ok' || it.type === 'extra') ? '' : '<small>' + esc(it.fix) + '</small>';
      html += '<span class="w ' + cls + '">' + small + esc(show) + '</span> ';
    });
    html += '</div>';
    var rows = res.items.filter(function (it) { return it.type !== 'ok'; });
    if (rows.length) {
      html += '<table class="mist"><tr><th>نوع</th><th>نوشته‌ی تو</th><th>درست</th></tr>';
      rows.forEach(function (it) {
        html += '<tr><td>' + TYPE_FA[it.type] + '</td><td>' + (it.type === 'missing' ? '—' : esc(it.student)) + '</td><td>' + (it.type === 'extra' ? '—' : esc(it.fix)) + '</td></tr>';
      });
      html += '</table>';
    } else html += '<p><b>هیچ غلطی نداشتی! 🎉</b></p>';
    html += '<p class="hint">راهنما: سبز = درست، نارنجی = نیم‌فاصله یا فاصله، قرمز = غلط، آبی = افتاده، خاکستری = اضافه. نمره: هر غلط یا افتادگی یک خطا و هر خطای نیم‌فاصله نیم خطا حساب می‌شود.</p>' +
      '<div class="btns"><button id="btnRetry" type="button" class="primary">🔄 دوباره بنویس</button>' +
      '<button id="btnAgain" type="button">🔊 املا را دوباره از اول بگو</button>' +
      '<button id="btnPng" type="button">🖼️ ذخیره‌ی تخته</button></div>';
    var p = $('#resultPanel'); p.innerHTML = html; p.hidden = false;
    $('#btnRetry').onclick = function () { ans.value = ''; board.setResult(null); board.setStudentText(''); p.hidden = true; ans.focus(); };
    $('#btnAgain').onclick = function () { ans.value = ''; board.setResult(null); board.setStudentText(''); p.hidden = true; resetDictation(); D.introDone = true; dictate(); };
    $('#btnPng').onclick = function () { board.toBlob(function (b) { if (!b) return; var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'emla-result.png'; document.body.appendChild(a); a.click(); a.remove(); }); };
  }

  function addHistory(res) {
    history.unshift({ d: Date.now(), n: cur.n, title: cur.title, name: ($('#studentName').value || '').trim(), score: res.score, total: res.total, level: res.level.name });
    history = history.slice(0, 200); store.set('history', history); renderHome();
  }

  /* ---------- باز کردن درس ---------- */
  function openLesson(l) {
    var text = lessonText(l);
    if (!text.trim()) { openEdit(l, true); return; }
    cur = l; chunks = makeChunks(text);
    $('#home').hidden = true; $('#work').hidden = false;
    $('#workTitle').textContent = 'درس ' + fa(l.n) + ': ' + l.title;
    ans.value = ''; board.setResult(null); board.setStudentText(''); $('#resultPanel').hidden = true;
    resetDictation();
    window.scrollTo(0, 0);
    requestAnimationFrame(function () { board.resize(); });
  }
  $('#btnBack').addEventListener('click', function () {
    stopLoop(); D.state = 'idle'; $('#work').hidden = true; $('#home').hidden = false; window.scrollTo(0, 0);
  });
  $('#studentName').value = store.get('name', '');
  $('#studentName').addEventListener('input', function () { store.set('name', this.value); });

  /* ---------- ویرایش متن درس ---------- */
  var editLesson = null, editForced = false;
  function openEdit(l, forced) {
    editLesson = l; editForced = !!forced;
    $('#editTitle').textContent = 'متن املای درس ' + fa(l.n) + ': ' + l.title;
    $('#editText').value = lessonText(l);
    $('#dlgEdit').showModal();
    if (forced) toast('متن این درس را خودت وارد کن (شعر معاصر در برنامه نیست).');
  }
  $('#btnEditText').addEventListener('click', function () { if (cur) openEdit(cur, false); });
  $('#btnEditSave').addEventListener('click', function () {
    var v = $('#editText').value;
    if (!editLesson) return;
    if (v.trim()) custom[editLesson.n] = v; else delete custom[editLesson.n];
    store.set('custom', custom);
    $('#dlgEdit').close();
    if (editForced || (cur && cur.n === editLesson.n)) openLesson(editLesson);
  });
  $('#btnEditReset').addEventListener('click', function () {
    if (!editLesson) return;
    delete custom[editLesson.n]; store.set('custom', custom); $('#editText').value = editLesson.text;
    toast('متن اصلی برگردانده شد.');
  });

  /* ---------- تنظیمات ---------- */
  function syncSettingsUI() {
    $('#setRate').value = settings.rate; $('#rateVal').textContent = fa(settings.rate);
    $('#setPause').value = String(settings.pause);
    $('#setIntro').checked = settings.intro; $('#setTwice').checked = settings.twice; $('#setShowText').checked = settings.showText;
    updateVoiceInfo();
  }
  $('#btnSettings').addEventListener('click', function () { syncSettingsUI(); $('#dlgSettings').showModal(); });
  $('#setRate').addEventListener('input', function () { settings.rate = +this.value; $('#rateVal').textContent = fa(settings.rate); saveSettings(); });
  $('#setPause').addEventListener('change', function () { settings.pause = +this.value; saveSettings(); });
  $('#setIntro').addEventListener('change', function () { settings.intro = this.checked; saveSettings(); });
  $('#setTwice').addEventListener('change', function () { settings.twice = this.checked; saveSettings(); });
  $('#setShowText').addEventListener('change', function () { settings.showText = this.checked; saveSettings(); });
  $('#btnTestVoice').addEventListener('click', function () { cancelSpeech(); say('سلام. من املاخوان هستم. آماده‌ای؟'); });

  /* ---------- کارنامه و درباره ---------- */
  $('#btnReport').addEventListener('click', function () {
    var b = $('#reportBody');
    if (!history.length) b.innerHTML = '<p class="hint">هنوز املایی تصحیح نشده است.</p>';
    else {
      var sum = 0; history.forEach(function (h) { sum += h.score; });
      var avg = Math.round(sum / history.length * 100) / 100;
      var html = '<p>تعداد املاها: <b>' + fa(history.length) + '</b> — میانگین نمره: <b>' + fa(avg) + '</b> از ۲۰</p><table><tr><th>تاریخ</th><th>درس</th><th>نام</th><th>نمره</th><th>سطح</th></tr>';
      history.slice(0, 60).forEach(function (h) {
        var d = new Date(h.d), ds = d.toLocaleDateString('fa-IR');
        html += '<tr><td>' + esc(ds) + '</td><td>' + fa(h.n) + ' — ' + esc(h.title) + '</td><td>' + esc(h.name || '—') + '</td><td>' + fa(h.score) + '</td><td>' + esc(h.level || '') + '</td></tr>';
      });
      b.innerHTML = html + '</table>';
    }
    $('#dlgReport').showModal();
  });
  $('#btnClearHistory').addEventListener('click', function () {
    if (confirm('کارنامه کامل پاک شود؟')) { history = []; store.set('history', history); $('#reportBody').innerHTML = '<p class="hint">کارنامه پاک شد.</p>'; renderHome(); }
  });
  $('#btnAbout').addEventListener('click', function () { $('#dlgAbout').showModal(); });

  /* ---------- شروع ---------- */
  buildTools();
  board.setBg(settings.bg);
  renderHome();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* ignore */ });
  }
})();
