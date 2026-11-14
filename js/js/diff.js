/* املاخوان — موتور تصحیح و نمره‌دهی
   طراح: منوچهر کریمی */
(function (root) {
  'use strict';
  var ZW = '\u200c';
  var PUNCT = /[\.\,\u060C\u061B\;\:\!\?\u061F"“”«»\(\)\[\]\{\}\-–—_…\/\\\u066B\u066C]/g;

  /* یکسان‌سازی حرف‌ها: ي ك عربی، حرکت‌ها، کشیده، «هٔ» و ... */
  function norm(s) {
    s = String(s == null ? '' : s);
    s = s.replace(/\u0647\u0654/g, 'ه' + ZW + 'ی').replace(/\u06C0/g, 'ه' + ZW + 'ی');
    s = s.replace(/[\u064A\u0649]/g, 'ی').replace(/\u0643/g, 'ک').replace(/\u0629/g, 'ه');
    s = s.replace(/[\u0640\u064B-\u065F\u0670]/g, '');
    s = s.replace(/[\u200d\u200e\u200f\u202a-\u202e\u00a0]/g, function (c) { return c === '\u00a0' ? ' ' : ''; });
    s = s.replace(PUNCT, ' ');
    return s;
  }
  function tokenize(s) {
    return norm(s).split(/\s+/).map(function (t) {
      return t.replace(/^\u200c+|\u200c+$/g, '');
    }).filter(Boolean);
  }
  function loose(t) { return t.replace(/\u200c/g, ''); }

  /* کلمه‌های متن اصلی (هم شکل زیبا برای نمایش، هم شکل یکسان‌شده) */
  function originalTokens(text) {
    var plain = String(text).replace(/[\/\n]+/g, ' ').replace(PUNCT, ' ').replace(/[\u200d\u200e\u200f]/g, '');
    var pretty = plain.split(/\s+/).filter(Boolean);
    var out = [];
    pretty.forEach(function (p) {
      var n = tokenize(p);
      if (n.length === 1) out.push({ show: p.replace(/^\u200c+|\u200c+$/g, ''), key: n[0] });
    });
    return out;
  }

  /* هم‌ترازی کلمه‌به‌کلمه و محاسبه‌ی خطا
     انواع: ok درست | half نیم‌فاصله/فاصله | wrong غلط | missing افتاده | extra اضافه | joined سرهم‌نویسی */
  function align(O, S) {
    var n = O.length, m = S.length, i, j;
    var D = [], P = [];
    for (i = 0; i <= n; i++) { D.push(new Array(m + 1).fill(Infinity)); P.push(new Array(m + 1).fill(null)); }
    D[0][0] = 0;
    for (i = 0; i <= n; i++) {
      for (j = 0; j <= m; j++) {
        if (i === 0 && j === 0) continue;
        var best = Infinity, mv = null, c;
        if (i > 0 && j > 0) {
          if (O[i - 1] === S[j - 1]) c = 0;
          else if (loose(O[i - 1]) === loose(S[j - 1])) c = 0.5;
          else c = 1;
          if (D[i - 1][j - 1] + c < best) { best = D[i - 1][j - 1] + c; mv = c === 0 ? 'ok' : (c === 0.5 ? 'half' : 'wrong'); }
        }
        if (i > 0 && D[i - 1][j] + 1 < best) { best = D[i - 1][j] + 1; mv = 'missing'; }
        if (j > 0 && D[i][j - 1] + 1 < best) { best = D[i][j - 1] + 1; mv = 'extra'; }
        if (i > 0 && j > 1 && loose(O[i - 1]) === loose(S[j - 2] + S[j - 1]) && D[i - 1][j - 2] + 0.5 < best) {
          best = D[i - 1][j - 2] + 0.5; mv = 'spaced';
        }
        if (i > 1 && j > 0 && loose(O[i - 2] + O[i - 1]) === loose(S[j - 1]) && D[i - 2][j - 1] + 1 < best) {
          best = D[i - 2][j - 1] + 1; mv = 'joined';
        }
        D[i][j] = best; P[i][j] = mv;
      }
    }
    var ops = [];
    i = n; j = m;
    while (i > 0 || j > 0) {
      var t = P[i][j];
      if (t === 'ok' || t === 'half' || t === 'wrong') { ops.push({ type: t, oi: [i - 1], s: S[j - 1] }); i--; j--; }
      else if (t === 'missing') { ops.push({ type: 'missing', oi: [i - 1] }); i--; }
      else if (t === 'extra') { ops.push({ type: 'extra', s: S[j - 1] }); j--; }
      else if (t === 'spaced') { ops.push({ type: 'half', oi: [i - 1], s: S[j - 2] + ' ' + S[j - 1] }); i--; j -= 2; }
      else if (t === 'joined') { ops.push({ type: 'joined', oi: [i - 2, i - 1], s: S[j - 1] }); i -= 2; j--; }
      else break;
    }
    ops.reverse();
    return { ops: ops, cost: D[n][m] };
  }

  function levelOf(score) {
    if (score >= 19) return { name: 'عالی', emoji: '🌟', say: 'آفرین! عالی بود.' };
    if (score >= 17) return { name: 'خیلی خوب', emoji: '😃', say: 'خیلی خوب بود. آفرین.' };
    if (score >= 14) return { name: 'خوب', emoji: '🙂', say: 'خوب بود. کمی بیشتر دقت کن.' };
    if (score >= 10) return { name: 'قابل قبول', emoji: '🙂', say: 'قابل قبول بود. با تمرین بهتر می‌شود.' };
    return { name: 'نیازمند تلاش بیشتر', emoji: '💪', say: 'نگران نباش. دوباره تمرین کنیم.' };
  }

  /* نمره از ۲۰ — هر غلط یا افتادگی یک خطا؛ خطای نیم‌فاصله نیم خطا */
  function correct(originalText, studentText) {
    var Ow = originalTokens(originalText);
    var S = tokenize(studentText);
    var O = Ow.map(function (w) { return w.key; });
    var r = align(O, S);
    var total = O.length;
    var counts = { ok: 0, half: 0, wrong: 0, missing: 0, extra: 0, joined: 0 };
    var items = r.ops.map(function (op) {
      counts[op.type]++;
      var fix = op.oi ? op.oi.map(function (k) { return Ow[k].show; }).join(' ') : '';
      return { type: op.type, student: op.s || '', fix: fix };
    });
    var raw = total ? 20 * (1 - r.cost / total) : 0;
    var score = Math.max(0, Math.round(raw * 4) / 4);
    return { score: score, total: total, cost: r.cost, counts: counts, items: items, level: levelOf(score) };
  }

  var WORDS = ['صفر', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه', 'ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده', 'بیست'];
  function scoreWords(score) {
    var whole = Math.floor(score), f = Math.round((score - whole) * 100);
    var s = WORDS[whole];
    if (f === 50) s += ' و نیم';
    else if (f === 25) s += ' و یک‌چهارم';
    else if (f === 75) s += ' و سه‌چهارم';
    return s;
  }
  function faNum(x) {
    return String(x).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }).replace('.', '٫');
  }

  var API = { norm: norm, tokenize: tokenize, originalTokens: originalTokens, correct: correct, scoreWords: scoreWords, faNum: faNum, levelOf: levelOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.Emla = API;
})(typeof window !== 'undefined' ? window : globalThis);
