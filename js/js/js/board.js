/* املاخوان — تخته‌ی آموزشی
   طراح: منوچهر کریمی */
(function (root) {
  'use strict';
  var FONT = "'Vazirmatn','Vazir',Tahoma,'Segoe UI','Noto Naskh Arabic','Noto Sans Arabic',system-ui,sans-serif";

  function Board(wrap) {
    this.wrap = wrap;
    this.cv = { bg: wrap.querySelector('.c-bg'), tx: wrap.querySelector('.c-tx'), dr: wrap.querySelector('.c-dr'), fx: wrap.querySelector('.c-fx') };
    this.ctx = {};
    for (var k in this.cv) this.ctx[k] = this.cv[k].getContext('2d');
    this.ratio = 0.6;
    this.W = 0; this.H = 0;
    this.items = []; this.redoStack = [];
    this.tool = 'pen'; this.color = '#f5f5f0'; this.size = 4;
    this.bgName = 'green';
    this.studentText = ''; this.result = null; this.textScale = 1;
    this.cur = null; this.laser = []; this.laserRun = false;
    this.onchange = null;
    this._bind();
  }
  var P = Board.prototype;

  P.dark = function () { return this.bgName === 'green' || this.bgName === 'black'; };
  P.ink = function () { return this.dark() ? '#f4f4ec' : '#1b2a41'; };

  P.resize = function () {
    var W = this.wrap.clientWidth;
    if (!W) return;
    var H = Math.round(W * this.ratio);
    this.wrap.style.height = H + 'px';
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    for (var k in this.cv) {
      var c = this.cv[k];
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      c.style.width = W + 'px'; c.style.height = H + 'px';
      this.ctx[k].setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.W = W; this.H = H;
    this.drawBg(); this.drawText(); this.drawItems();
  };

  /* ---------- پس‌زمینه ---------- */
  P.setBg = function (name) {
    var wasAuto = (this.color === '#f5f5f0' || this.color === '#111827');
    this.bgName = name;
    if (wasAuto) this.color = this.dark() ? '#f5f5f0' : '#111827';
    this.drawBg(); this.drawText();
    if (this.onchange) this.onchange('bg');
  };
  P.drawBg = function () {
    var c = this.ctx.bg, W = this.W, H = this.H, i;
    if (!W) return;
    c.clearRect(0, 0, W, H);
    if (this.bgName === 'green') {
      var g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#2d6a50'); g.addColorStop(1, '#1b4332');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,0.025)';
      for (i = 0; i < 40; i++) { c.beginPath(); c.ellipse((i * 137.5) % W, (i * 89.3) % H, W * 0.06, W * 0.012, 0.4, 0, 7); c.fill(); }
    } else if (this.bgName === 'black') {
      c.fillStyle = '#141414'; c.fillRect(0, 0, W, H);
    } else if (this.bgName === 'ruled') {
      c.fillStyle = '#fffdf3'; c.fillRect(0, 0, W, H);
      c.strokeStyle = '#9fc3e6'; c.lineWidth = 1;
      var step = W * 0.058;
      for (var y = step * 1.6; y < H; y += step) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      c.strokeStyle = '#e07a7a'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(W * 0.93, 0); c.lineTo(W * 0.93, H); c.stroke();
    } else if (this.bgName === 'grid') {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
      c.strokeStyle = '#d3e2f0'; c.lineWidth = 1;
      var s2 = W * 0.04;
      for (var x = 0; x < W; x += s2) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
      for (var y2 = 0; y2 < H; y2 += s2) { c.beginPath(); c.moveTo(0, y2); c.lineTo(W, y2); c.stroke(); }
    } else {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
    }
  };

  /* ---------- متن دانش‌آموز و نتیجه ---------- */
  P.setStudentText = function (t) { this.studentText = t || ''; this.drawText(); };
  P.setResult = function (res) { this.result = res || null; this.drawText(); };
  P.setTextScale = function (s) { this.textScale = Math.max(0.6, Math.min(1.8, s)); this.drawText(); };

  function wrapText(c, text, maxW) {
    var out = [];
    String(text).split('\n').forEach(function (para) {
      var words = para.split(/ +/), line = '';
      words.forEach(function (w) {
        var test = line ? line + ' ' + w : w;
        if (line && c.measureText(test).width > maxW) { out.push(line); line = w; } else line = test;
      });
      out.push(line);
    });
    return out;
  }

  P.drawText = function () {
    var c = this.ctx.tx, W = this.W, H = this.H;
    if (!W) return;
    c.clearRect(0, 0, W, H);
    if (this.result) return this._drawResult();
    var txt = this.studentText;
    if (!txt.trim()) return;
    var fs = 0.045 * W * this.textScale, min = 0.02 * W, mx = 0.05 * W, top = 0.03 * W, lines;
    c.direction = 'rtl'; c.textAlign = 'right'; c.textBaseline = 'alphabetic';
    for (;;) {
      c.font = fs + 'px ' + FONT;
      lines = wrapText(c, txt, W - 2 * mx);
      if (top + fs * 1.3 + (lines.length - 1) * fs * 1.75 + fs * 0.6 <= H || fs <= min) break;
      fs *= 0.93;
    }
    c.fillStyle = this.ink();
    lines.forEach(function (ln, i) { c.fillText(ln, W - mx, top + fs * 1.3 + i * fs * 1.75); });
  };

  var COL = { ok: null, half: '#f59e0b', wrong: '#ef4444', joined: '#ef4444', missing: '#3b82f6', extra: '#9ca3af', fix: '#22c55e' };

  P._drawResult = function () {
    var c = this.ctx.tx, W = this.W, H = this.H, res = this.result, self = this;
    var mxR = 0.05 * W, mxL = 0.05 * W + 0.14 * W, top = 0.03 * W;
    var fs = 0.04 * W * this.textScale, min = 0.018 * W, lines;
    c.direction = 'rtl'; c.textBaseline = 'alphabetic';
    function layout() {
      c.font = fs + 'px ' + FONT;
      var space = c.measureText(' ').width * 1.1;
      var cells = res.items.map(function (it) {
        var txt = it.type === 'missing' ? '▢▢▢' : it.student;
        var fixTxt = (it.type === 'ok' || it.type === 'extra') ? '' : it.fix;
        c.font = fs + 'px ' + FONT;
        var tw = c.measureText(txt).width;
        c.font = (fs * 0.62) + 'px ' + FONT;
        var fw = fixTxt ? c.measureText(fixTxt).width : 0;
        return { it: it, txt: txt, fix: fixTxt, w: Math.max(tw, fw) + 2 };
      });
      var rows = [[]], x = W - mxR;
      cells.forEach(function (cell) {
        if (x - cell.w < mxL && rows[rows.length - 1].length) { rows.push([]); x = W - mxR; }
        cell.x = x - cell.w / 2; x -= cell.w + space;
        rows[rows.length - 1].push(cell);
      });
      return rows;
    }
    var rows;
    for (;;) {
      rows = layout();
      if (top + fs * 0.9 + rows.length * fs * 2.25 <= H || fs <= min) break;
      fs *= 0.93;
    }
    rows.forEach(function (row, ri) {
      var y = top + fs * 1.55 + ri * fs * 2.25;
      row.forEach(function (cell) {
        var t = cell.it.type;
        c.textAlign = 'center';
        c.font = fs + 'px ' + FONT;
        c.fillStyle = COL[t] || self.ink();
        c.fillText(cell.txt, cell.x, y);
        if (t === 'extra') {
          var w = c.measureText(cell.txt).width;
          c.strokeStyle = '#9ca3af'; c.lineWidth = Math.max(1.5, fs * 0.07);
          c.beginPath(); c.moveTo(cell.x - w / 2, y - fs * 0.3); c.lineTo(cell.x + w / 2, y - fs * 0.3); c.stroke();
        }
        if (t === 'wrong' || t === 'joined') {
          var w2 = c.measureText(cell.txt).width;
          c.strokeStyle = '#ef4444'; c.lineWidth = Math.max(1.5, fs * 0.06);
          c.beginPath(); c.moveTo(cell.x - w2 / 2, y + fs * 0.18); c.lineTo(cell.x + w2 / 2, y + fs * 0.18); c.stroke();
        }
        if (cell.fix) {
          c.font = (fs * 0.62) + 'px ' + FONT;
          c.fillStyle = COL.fix;
          c.fillText(cell.fix, cell.x, y - fs * 0.95);
        }
      });
    });
    // مهر نمره
    var r = 0.062 * W, cx = 0.05 * W + r, cy = 0.03 * W + r + 0.01 * W;
    c.save();
    c.translate(cx, cy); c.rotate(-0.18);
    c.strokeStyle = '#ef4444'; c.fillStyle = '#ef4444'; c.lineWidth = Math.max(2, W * 0.005);
    c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.direction = 'rtl';
    c.font = 'bold ' + (r * 0.62) + 'px ' + FONT;
    c.fillText(root.Emla.faNum(res.score), 0, -r * 0.12);
    c.font = (r * 0.36) + 'px ' + FONT;
    c.fillText('از ۲۰', 0, r * 0.46);
    c.restore();
  };

  /* ---------- رسم ---------- */
  function drawItem(c, it, W) {
    var i, p;
    if (it.t === 'pen' || it.t === 'hl' || it.t === 'erase') {
      c.save();
      c.lineCap = 'round'; c.lineJoin = 'round';
      c.lineWidth = it.w * W * (it.t === 'hl' ? 3.2 : (it.t === 'erase' ? 3 : 1));
      if (it.t === 'erase') { c.globalCompositeOperation = 'destination-out'; c.strokeStyle = '#000'; }
      else { c.strokeStyle = it.c; if (it.t === 'hl') c.globalAlpha = 0.38; }
      var pts = it.pts;
      c.beginPath();
      if (pts.length === 1) { c.moveTo(pts[0][0] * W, pts[0][1] * W); c.lineTo(pts[0][0] * W + 0.01, pts[0][1] * W); }
      else {
        c.moveTo(pts[0][0] * W, pts[0][1] * W);
        for (i = 1; i < pts.length - 1; i++) {
          var mx = (pts[i][0] + pts[i + 1][0]) / 2 * W, my = (pts[i][1] + pts[i + 1][1]) / 2 * W;
          c.quadraticCurveTo(pts[i][0] * W, pts[i][1] * W, mx, my);
        }
        var l = pts[pts.length - 1]; c.lineTo(l[0] * W, l[1] * W);
      }
      c.stroke(); c.restore();
    } else if (it.t === 'line' || it.t === 'arrow') {
      var a = it.pts[0], b = it.pts[1];
      c.save(); c.strokeStyle = it.c; c.fillStyle = it.c; c.lineWidth = it.w * W; c.lineCap = 'round';
      c.beginPath(); c.moveTo(a[0] * W, a[1] * W); c.lineTo(b[0] * W, b[1] * W); c.stroke();
      if (it.t === 'arrow') {
        var ang = Math.atan2(b[1] - a[1], b[0] - a[0]), hl = Math.max(it.w * W * 4, 0.025 * W);
        c.beginPath(); c.moveTo(b[0] * W, b[1] * W);
        c.lineTo(b[0] * W - hl * Math.cos(ang - 0.45), b[1] * W - hl * Math.sin(ang - 0.45));
        c.lineTo(b[0] * W - hl * Math.cos(ang + 0.45), b[1] * W - hl * Math.sin(ang + 0.45));
        c.closePath(); c.fill();
      }
      c.restore();
    } else if (it.t === 'rect' || it.t === 'ellipse') {
      var p1 = it.pts[0], p2 = it.pts[1];
      c.save(); c.strokeStyle = it.c; c.lineWidth = it.w * W; c.lineJoin = 'round';
      if (it.t === 'rect') c.strokeRect(p1[0] * W, p1[1] * W, (p2[0] - p1[0]) * W, (p2[1] - p1[1]) * W);
      else {
        c.beginPath();
        c.ellipse((p1[0] + p2[0]) / 2 * W, (p1[1] + p2[1]) / 2 * W, Math.abs(p2[0] - p1[0]) / 2 * W, Math.abs(p2[1] - p1[1]) / 2 * W, 0, 0, 7);
        c.stroke();
      }
      c.restore();
    } else if (it.t === 'text') {
      c.save(); c.fillStyle = it.c; c.direction = 'rtl'; c.textAlign = 'right'; c.textBaseline = 'alphabetic';
      var fs = it.s * W; c.font = fs + 'px ' + FONT;
      String(it.text).split('\n').forEach(function (ln, k) { c.fillText(ln, it.x * W, it.y * W + k * fs * 1.5); });
      c.restore();
    }
  }

  P.drawItems = function () {
    var c = this.ctx.dr, W = this.W, H = this.H;
    if (!W) return;
    c.clearRect(0, 0, W, H);
    for (var i = 0; i < this.items.length; i++) {
      var it = this.items[i];
      if (it.t === 'clear') c.clearRect(0, 0, W, H); else drawItem(c, it, W);
    }
  };

  /* ---------- رویدادهای نشانگر ---------- */
  P._pt = function (e) {
    var r = this.cv.fx.getBoundingClientRect();
    return [(e.clientX - r.left) / this.W, (e.clientY - r.top) / this.W];
  };
  P._bind = function () {
    var self = this, el = this.cv.fx;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', function (e) { self._down(e); });
    el.addEventListener('pointermove', function (e) { self._move(e); });
    el.addEventListener('pointerup', function (e) { self._up(e); });
    el.addEventListener('pointercancel', function (e) { self._up(e); });
    el.addEventListener('pointerleave', function () { if (self.tool === 'erase') self.ctx.fx.clearRect(0, 0, self.W, self.H); });
    if (window.ResizeObserver) new ResizeObserver(function () { self.resize(); }).observe(this.wrap);
    window.addEventListener('resize', function () { self.resize(); });
  };
  P._down = function (e) {
    if (!this.W) return;
    e.preventDefault();
    var p = this._pt(e);
    if (this.tool === 'laser') { this.laser.push({ x: p[0], y: p[1], t: Date.now() }); this._laserLoop(); this.cur = { t: 'laser' }; this.cv.fx.setPointerCapture(e.pointerId); return; }
    if (this.tool === 'text') {
      var txt = window.prompt('متن را بنویسید:');
      if (txt && txt.trim()) {
        this._commit({ t: 'text', text: txt, x: p[0], y: p[1], s: Math.max(0.02, this.size * 0.0075), c: this.color });
      }
      return;
    }
    var t = this.tool;
    this.cv.fx.setPointerCapture(e.pointerId);
    this.cur = { t: t, c: this.color, w: this.size / this.W, pts: (t === 'pen' || t === 'hl' || t === 'erase') ? [p] : [p, p] };
    if (t === 'erase') this._eraseSeg();
    else this._preview();
  };
  P._move = function (e) {
    var p = this._pt(e);
    if (this.tool === 'erase') this._eraserCursor(p);
    if (!this.cur) return;
    if (this.cur.t === 'laser') { this.laser.push({ x: p[0], y: p[1], t: Date.now() }); return; }
    var t = this.cur.t;
    if (t === 'pen' || t === 'hl' || t === 'erase') {
      this.cur.pts.push(p);
      if (t === 'erase') this._eraseSeg(); else this._preview();
    } else { this.cur.pts[1] = p; this._preview(); }
  };
  P._up = function () {
    if (!this.cur) return;
    var it = this.cur; this.cur = null;
    this.ctx.fx.clearRect(0, 0, this.W, this.H);
    if (it.t === 'laser') return;
    this._commit(it);
  };
  P._preview = function () {
    var c = this.ctx.fx; c.clearRect(0, 0, this.W, this.H);
    drawItem(c, this.cur, this.W);
  };
  P._eraseSeg = function () {
    var pts = this.cur.pts, n = pts.length, c = this.ctx.dr, W = this.W;
    c.save(); c.globalCompositeOperation = 'destination-out'; c.lineCap = 'round'; c.lineJoin = 'round';
    c.lineWidth = this.cur.w * W * 3; c.strokeStyle = '#000'; c.beginPath();
    var a = pts[Math.max(0, n - 2)], b = pts[n - 1];
    c.moveTo(a[0] * W, a[1] * W); c.lineTo(b[0] * W + 0.01, b[1] * W); c.stroke(); c.restore();
    this._eraserCursor(b);
  };
  P._eraserCursor = function (p) {
    var c = this.ctx.fx, W = this.W; c.clearRect(0, 0, W, this.H);
    c.save(); c.strokeStyle = this.dark() ? '#ffffff' : '#334155'; c.lineWidth = 1;
    c.beginPath(); c.arc(p[0] * W, p[1] * W, this.size * 1.5, 0, 7); c.stroke(); c.restore();
  };
  P._laserLoop = function () {
    var self = this;
    if (this.laserRun) return;
    this.laserRun = true;
    (function frame() {
      var c = self.ctx.fx, now = Date.now(), W = self.W;
      c.clearRect(0, 0, W, self.H);
      self.laser = self.laser.filter(function (q) { return now - q.t < 700; });
      self.laser.forEach(function (q) {
        var a = 1 - (now - q.t) / 700;
        c.fillStyle = 'rgba(255,40,40,' + (a * 0.9) + ')';
        c.shadowColor = 'rgba(255,60,60,' + a + ')'; c.shadowBlur = 14;
        c.beginPath(); c.arc(q.x * W, q.y * W, 0.007 * W + a * 0.006 * W, 0, 7); c.fill();
      });
      if (self.laser.length || self.cur) requestAnimationFrame(frame); else { self.laserRun = false; c.clearRect(0, 0, W, self.H); }
    })();
  };
  P._commit = function (it) {
    this.items.push(it); this.redoStack = [];
    this.drawItems();
    if (this.onchange) this.onchange('items');
  };

  /* ---------- دستورها ---------- */
  P.setTool = function (t) { this.tool = t; this.ctx.fx.clearRect(0, 0, this.W, this.H); this.cv.fx.style.cursor = t === 'text' ? 'text' : 'crosshair'; };
  P.setColor = function (c) { this.color = c; if (this.tool === 'erase') this.tool = 'pen'; };
  P.setSize = function (s) { this.size = s; };
  P.undo = function () { if (!this.items.length) return; this.redoStack.push(this.items.pop()); this.drawItems(); if (this.onchange) this.onchange('items'); };
  P.redo = function () { if (!this.redoStack.length) return; this.items.push(this.redoStack.pop()); this.drawItems(); if (this.onchange) this.onchange('items'); };
  P.clearDrawing = function () { this.items.push({ t: 'clear' }); this.redoStack = []; this.drawItems(); if (this.onchange) this.onchange('items'); };
  P.canUndo = function () { return this.items.length > 0; };
  P.canRedo = function () { return this.redoStack.length > 0; };
  P.toBlob = function (cb) {
    var out = document.createElement('canvas');
    out.width = this.cv.bg.width; out.height = this.cv.bg.height;
    var c = out.getContext('2d');
    c.drawImage(this.cv.bg, 0, 0); c.drawImage(this.cv.tx, 0, 0); c.drawImage(this.cv.dr, 0, 0);
    out.toBlob(cb, 'image/png');
  };

  root.Board = Board;
})(window);
