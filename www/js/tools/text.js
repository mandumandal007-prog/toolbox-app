/* ==========================================================
   TEXT, UTILITY & CALCULATOR TOOLS — 100% offline
   ========================================================== */
(function () {
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  window.escHtml = esc;

  /* ---------- live text tool: input textarea -> output ---------- */
  function textTool(def) {
    tool({ id: def.id, name: def.name, desc: def.desc, cat: def.cat || 'text', icon: def.icon || '🔤',
      render: function (host) {
        var input = def.noInput ? null : h('textarea', { class: 'ta', placeholder: def.placeholder || 'Yahan text likhein ya paste karein…' });
        var outBox = h('div', { class: 'out' });
        var outTa = h('textarea', { class: 'ta', readonly: true });
        var lastText = '';
        var controls = paramControls(def.params || [], function () { run(); });
        function run() {
          var r;
          try { r = def.fn(input ? input.value : '', controls.vals); } catch (e) { r = { error: e.message || String(e) }; }
          Promise.resolve(r).then(function (r) {
            outBox.innerHTML = '';
            if (r == null) return;
            if (r.error) { outBox.appendChild(h('div', { class: 'err' }, '⚠️ ' + r.error)); return; }
            if (r.stats) { var w = h('div', { class: 'calc-out' }); r.stats.forEach(function (s) { w.appendChild(h('div', { class: 'stat' }, h('span', {}, s[0]), h('strong', {}, String(s[1])))); }); outBox.appendChild(w); }
            if (r.html != null) { outBox.appendChild(h('div', { class: r.cls || 'md', html: r.html })); }
            if (r.node) outBox.appendChild(r.node);
            var text = typeof r === 'string' ? r : r.text;
            if (text != null) {
              lastText = text; outTa.value = text;
              outBox.appendChild(h('div', { class: 'out-head' }, h('span', {}, 'Result · ' + text.length + ' chars'),
                h('button', { class: 'btn-sm', onclick: function () { copyText(lastText); } }, 'Copy'),
                input ? h('button', { class: 'btn-sm', onclick: function () { input.value = lastText; run(); } }, 'Use as input') : null));
              outBox.appendChild(outTa);
            }
          }).catch(function (e) { outBox.innerHTML = ''; outBox.appendChild(h('div', { class: 'err' }, '⚠️ ' + (e.message || e))); });
        }
        if (input) { input.addEventListener('input', debounce(run, 150)); if (def.sample) input.value = def.sample; host.appendChild(h('div', { class: 'field' }, input)); }
        host.appendChild(controls.el);
        if (def.button) host.appendChild(h('div', { class: 'actions' }, h('button', { class: 'btn-filled', onclick: run }, def.button)));
        host.appendChild(outBox);
        if (!def.button || def.sample || def.noInput) run();
      } });
  }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  function lines(t) { return t.split(/\r?\n/); }

  textTool({ id: 'wordcount', name: 'Word Counter', desc: 'Words, characters, lines, reading time', icon: '🔢',
    fn: function (t) {
      var words = (t.match(/\S+/g) || []).length;
      return { stats: [['Words', words], ['Characters', t.length], ['Characters (no spaces)', t.replace(/\s/g, '').length], ['Lines', t ? lines(t).length : 0],
        ['Sentences', (t.match(/[^.!?।]+[.!?।]+/g) || []).length], ['Paragraphs', t.split(/\n\s*\n/).filter(function (p) { return p.trim(); }).length], ['Reading time', Math.max(0, Math.ceil(words / 200)) + ' min']] };
    } });
  textTool({ id: 'case', name: 'Case Converter', desc: 'UPPER, lower, Title, camelCase…', icon: '🔠',
    params: [{ key: 'm', label: 'Convert to', type: 'select', options: ['UPPER CASE', 'lower case', 'Title Case', 'Sentence case', 'camelCase', 'PascalCase', 'snake_case', 'kebab-case', 'CONSTANT_CASE', 'aLtErNaTe', 'iNVERSE']}],
    fn: function (t, v) {
      var words = function () { return t.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9\u0900-\u097F]+/).filter(Boolean); };
      switch (v.m) {
        case 'UPPER CASE': return t.toUpperCase();
        case 'lower case': return t.toLowerCase();
        case 'Title Case': return t.toLowerCase().replace(/(^|\s)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); });
        case 'Sentence case': return t.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, function (m) { return m.toUpperCase(); });
        case 'camelCase': return words().map(function (w, i) { w = w.toLowerCase(); return i ? w[0].toUpperCase() + w.slice(1) : w; }).join('');
        case 'PascalCase': return words().map(function (w) { w = w.toLowerCase(); return w[0].toUpperCase() + w.slice(1); }).join('');
        case 'snake_case': return words().join('_').toLowerCase();
        case 'kebab-case': return words().join('-').toLowerCase();
        case 'CONSTANT_CASE': return words().join('_').toUpperCase();
        case 'aLtErNaTe': return t.split('').map(function (c, i) { return i % 2 ? c.toUpperCase() : c.toLowerCase(); }).join('');
        default: return t.split('').map(function (c) { return c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase(); }).join('');
      }
    } });
  textTool({ id: 'findreplace', name: 'Find & Replace', desc: 'Text mein dhoondo aur badlo', icon: '🔍',
    params: [{ key: 'f', label: 'Find', type: 'text' }, { key: 'r', label: 'Replace with', type: 'text' }, { key: 'cs', label: 'Case sensitive', type: 'toggle' }, { key: 'rx', label: 'Regex', type: 'toggle' }],
    fn: function (t, v) {
      if (!v.f) return t;
      var re = new RegExp(v.rx ? v.f : v.f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g' + (v.cs ? '' : 'i'));
      var n = (t.match(re) || []).length;
      return { stats: [['Matches replaced', n]], text: t.replace(re, v.r || '') };
    } });
  textTool({ id: 'dedupe', name: 'Remove Duplicate Lines', desc: 'Same lines hatayein', icon: '🧹',
    params: [{ key: 'ci', label: 'Ignore case', type: 'toggle' }, { key: 'em', label: 'Remove empty lines', type: 'toggle', value: true }],
    fn: function (t, v) { var seen = {}, out = lines(t).filter(function (l) { if (v.em && !l.trim()) return false; var k = v.ci ? l.toLowerCase() : l; if (seen[k]) return false; seen[k] = 1; return true; }); return out.join('\n'); } });
  textTool({ id: 'sortlines', name: 'Sort Lines', desc: 'A-Z, Z-A, number, length, shuffle', icon: '↕️',
    params: [{ key: 'm', label: 'Sort', type: 'select', options: ['A → Z', 'Z → A', 'Numeric', 'By length', 'Shuffle'] }],
    fn: function (t, v) {
      var L = lines(t);
      if (v.m === 'A → Z') L.sort(function (a, b) { return a.localeCompare(b); });
      else if (v.m === 'Z → A') L.sort(function (a, b) { return b.localeCompare(a); });
      else if (v.m === 'Numeric') L.sort(function (a, b) { return (parseFloat(a) || 0) - (parseFloat(b) || 0); });
      else if (v.m === 'By length') L.sort(function (a, b) { return a.length - b.length; });
      else for (var i = L.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = L[i]; L[i] = L[j]; L[j] = x; }
      return L.join('\n');
    } });
  textTool({ id: 'trim', name: 'Trim Lines', desc: 'Har line ke aage-peeche ke spaces hatayein', icon: '✂️',
    params: [{ key: 'em', label: 'Remove empty lines', type: 'toggle', value: true }],
    fn: function (t, v) { return lines(t).map(function (l) { return l.trim(); }).filter(function (l) { return !v.em || l; }).join('\n'); } });
  textTool({ id: 'reverse', name: 'Reverse Text', desc: 'Text ulta karein', icon: '🔄',
    params: [{ key: 'm', label: 'Reverse', type: 'select', options: ['Characters', 'Words', 'Lines'] }],
    fn: function (t, v) { if (v.m === 'Words') return t.split(/(\s+)/).reverse().join(''); if (v.m === 'Lines') return lines(t).reverse().join('\n'); return Array.from(t).reverse().join(''); } });
  textTool({ id: 'slugify', name: 'Slugify', desc: 'URL-friendly slug banayein', icon: '🔗',
    fn: function (t) { return t.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9\u0900-\u097F]+/g, '-').replace(/^-+|-+$/g, ''); } });
  textTool({ id: 'base64', name: 'Base64 Encode/Decode', desc: 'Text ⇄ Base64', icon: '🧬',
    params: [{ key: 'm', label: 'Mode', type: 'select', options: ['Encode', 'Decode'] }],
    fn: function (t, v) {
      if (v.m === 'Encode') return btoa(unescape(encodeURIComponent(t)));
      try { return decodeURIComponent(escape(atob(t.replace(/\s/g, '')))); } catch (e) { return { error: 'Valid Base64 nahi hai' }; }
    } });
  textTool({ id: 'urlencode', name: 'URL Encode/Decode', desc: 'Percent-encoding', icon: '🌐',
    params: [{ key: 'm', label: 'Mode', type: 'select', options: ['Encode', 'Decode'] }],
    fn: function (t, v) { try { return v.m === 'Encode' ? encodeURIComponent(t) : decodeURIComponent(t.replace(/\+/g, ' ')); } catch (e) { return { error: 'Invalid encoded text' }; } } });
  textTool({ id: 'json', name: 'JSON Formatter', desc: 'Beautify / minify / validate JSON', icon: '{ }',
    params: [{ key: 'm', label: 'Mode', type: 'select', options: ['Beautify (2 spaces)', 'Beautify (4 spaces)', 'Minify'] }],
    sample: '{"name":"ToolBox","tools":110,"offline":true}',
    fn: function (t, v) { if (!t.trim()) return null; try { var o = JSON.parse(t); return v.m === 'Minify' ? JSON.stringify(o) : JSON.stringify(o, null, v.m.indexOf('4') >= 0 ? 4 : 2); } catch (e) { return { error: 'Invalid JSON: ' + e.message }; } } });

  function parseCSV(t) {
    var rows = [], row = [], f = '', q = false;
    for (var i = 0; i < t.length; i++) {
      var c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; } else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows.filter(function (r) { return r.length > 1 || r[0] !== ''; });
  }
  textTool({ id: 'csvjson', name: 'CSV ⇄ JSON', desc: 'CSV ko JSON aur JSON ko CSV', icon: '📊',
    params: [{ key: 'm', label: 'Mode', type: 'select', options: ['CSV → JSON', 'JSON → CSV'] }],
    sample: 'name,age,city\nRam,25,Delhi\nShyam,30,Mumbai',
    fn: function (t, v) {
      if (!t.trim()) return null;
      if (v.m === 'CSV → JSON') { var rows = parseCSV(t), hd = rows.shift() || []; return JSON.stringify(rows.map(function (r) { var o = {}; hd.forEach(function (k, i) { o[k] = r[i] != null ? r[i] : ''; }); return o; }), null, 2); }
      var arr; try { arr = JSON.parse(t); } catch (e) { return { error: 'Invalid JSON' }; }
      if (!Array.isArray(arr)) arr = [arr];
      var keys = []; arr.forEach(function (o) { Object.keys(o || {}).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); }); });
      var cell = function (x) { x = x == null ? '' : typeof x === 'object' ? JSON.stringify(x) : String(x); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
      return [keys.map(cell).join(',')].concat(arr.map(function (o) { return keys.map(function (k) { return cell(o[k]); }).join(','); })).join('\n');
    } });

  function md2html(src) {
    var codeBlocks = [];
    src = src.replace(/```([\s\S]*?)```/g, function (m, c) { codeBlocks.push(c.replace(/^\w*\n/, '')); return '\u0000' + (codeBlocks.length - 1) + '\u0000'; });
    var inl = function (s) {
      return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/~~([^~]+)~~/g, '<del>$1</del>').replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width:100%">').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    };
    var out = [], list = null;
    src.split('\n').forEach(function (l) {
      var m;
      if (list && !/^\s*([-*+]|\d+\.)\s+/.test(l)) { out.push('</' + list + '>'); list = null; }
      if ((m = l.match(/^\u0000(\d+)\u0000$/))) out.push('<pre><code>' + esc(codeBlocks[+m[1]]) + '</code></pre>');
      else if ((m = l.match(/^(#{1,6})\s+(.*)/))) out.push('<h' + Math.min(3, m[1].length) + '>' + inl(m[2]) + '</h' + Math.min(3, m[1].length) + '>');
      else if (/^\s*(---|\*\*\*)\s*$/.test(l)) out.push('<hr>');
      else if ((m = l.match(/^>\s?(.*)/))) out.push('<blockquote>' + inl(m[1]) + '</blockquote>');
      else if ((m = l.match(/^\s*([-*+]|\d+\.)\s+(.*)/))) { var tg = /\d/.test(m[1]) ? 'ol' : 'ul'; if (!list) { list = tg; out.push('<' + tg + '>'); } out.push('<li>' + inl(m[2]) + '</li>'); }
      else if (l.trim()) out.push('<p>' + inl(l) + '</p>');
    });
    if (list) out.push('</' + list + '>');
    return out.join('\n');
  }
  textTool({ id: 'markdown', name: 'Markdown Preview', desc: 'Markdown likho, preview + HTML', icon: '📄',
    sample: '# Hello\n\n**Bold**, *italic* aur `code`\n\n- Item 1\n- Item 2\n\n> Har Har Mahadev',
    fn: function (t) { var html = md2html(t); return { html: html, text: html }; } });

  textTool({ id: 'hash', name: 'Hash Generator', desc: 'SHA-1, SHA-256, SHA-384, SHA-512', icon: '#️⃣',
    sample: 'hello',
    fn: function (t) {
      if (!window.crypto || !crypto.subtle) return { error: 'Hashing is device par available nahi' };
      var data = new TextEncoder().encode(t), algs = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
      return Promise.all(algs.map(function (a) { return crypto.subtle.digest(a, data).then(function (b) { return Array.from(new Uint8Array(b)).map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }); }))
        .then(function (hs) { return { text: algs.map(function (a, i) { return a + ':\n' + hs[i]; }).join('\n\n') }; });
    } });
  function uuid4() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var hx = Array.from(b).map(function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    return hx.slice(0, 8) + '-' + hx.slice(8, 12) + '-' + hx.slice(12, 16) + '-' + hx.slice(16, 20) + '-' + hx.slice(20);
  }
  textTool({ id: 'uuid', name: 'UUID Generator', desc: 'Random unique IDs (v4)', icon: '🆔', noInput: true, cat: 'util', button: '🔄 Generate',
    params: [{ key: 'n', label: 'How many', type: 'number', value: 5, min: 1, max: 500 }, { key: 'up', label: 'UPPERCASE', type: 'toggle' }],
    fn: function (t, v) { var a = []; for (var i = 0; i < Math.min(500, Math.max(1, +v.n || 1)); i++) a.push(uuid4()); var s = a.join('\n'); return v.up ? s.toUpperCase() : s; } });
  textTool({ id: 'password', name: 'Password Generator', desc: 'Strong random password', icon: '🔐', noInput: true, cat: 'util', button: '🔄 Generate',
    params: [{ key: 'len', label: 'Length', type: 'range', min: 6, max: 64, value: 16 }, { key: 'up', label: 'A-Z', type: 'toggle', value: true }, { key: 'lo', label: 'a-z', type: 'toggle', value: true },
      { key: 'nu', label: '0-9', type: 'toggle', value: true }, { key: 'sy', label: 'Symbols !@#', type: 'toggle', value: true }, { key: 'n', label: 'How many', type: 'number', value: 5 }],
    fn: function (t, v) {
      var set = (v.up ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : '') + (v.lo ? 'abcdefghijkmnopqrstuvwxyz' : '') + (v.nu ? '23456789' : '') + (v.sy ? '!@#$%^&*-_=+?' : '');
      if (!set) return { error: 'Kam se kam ek option chunein' };
      var out = [];
      for (var k = 0; k < Math.min(50, Math.max(1, +v.n || 1)); k++) { var r = new Uint32Array(v.len); crypto.getRandomValues(r); out.push(Array.from(r).map(function (x) { return set[x % set.length]; }).join('')); }
      var bits = Math.round(v.len * Math.log2(set.length));
      return { stats: [['Strength', bits >= 80 ? 'Very strong 💪' : bits >= 60 ? 'Strong' : bits >= 40 ? 'Medium' : 'Weak'], ['Entropy', bits + ' bits']], text: out.join('\n') };
    } });
  var LOREM = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum'.split(' ');
  textTool({ id: 'lorem', name: 'Lorem Ipsum', desc: 'Dummy text generator', icon: '📜', noInput: true, cat: 'util',
    params: [{ key: 'n', label: 'Paragraphs', type: 'range', min: 1, max: 20, value: 3 }, { key: 'w', label: 'Words per paragraph', type: 'range', min: 10, max: 200, value: 60 }],
    fn: function (t, v) {
      var ps = [];
      for (var p = 0; p < v.n; p++) { var ws = []; for (var i = 0; i < v.w; i++) ws.push(p === 0 && i < LOREM.length && i < 8 ? LOREM[i] : LOREM[Math.floor(Math.random() * LOREM.length)]); var s = ws.join(' '); ps.push(s[0].toUpperCase() + s.slice(1) + '.'); }
      return ps.join('\n\n');
    } });

  /* number to words (Indian + international) */
  var ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function w99(n) { return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : ''); }
  function w999(n) { return (n >= 100 ? ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' : '') : '') + (n % 100 ? w99(n % 100) : ''); }
  function wordsIndian(n) {
    if (n === 0) return 'zero';
    var parts = [], units = [[1e7, 'crore'], [1e5, 'lakh'], [1e3, 'thousand']];
    if (n >= 1e7) { parts.push(wordsIndian(Math.floor(n / 1e7)) + ' crore'); n %= 1e7; }
    units.slice(1).forEach(function (u) { if (n >= u[0]) { parts.push(w99(Math.floor(n / u[0])) + ' ' + u[1]); n %= u[0]; } });
    if (n) parts.push(w999(n));
    return parts.join(' ');
  }
  function wordsIntl(n) {
    if (n === 0) return 'zero';
    var sc = ['', ' thousand', ' million', ' billion', ' trillion'], parts = [], i = 0;
    while (n > 0 && i < sc.length) { var c = n % 1000; if (c) parts.unshift(w999(c) + sc[i]); n = Math.floor(n / 1000); i++; }
    return parts.join(' ');
  }
  window.numWords = wordsIndian;
  textTool({ id: 'num2words', name: 'Number → Words', desc: 'Amount ko shabdon mein (Lakh/Crore)', icon: '💬', cat: 'util', placeholder: 'Number likhein, e.g. 125000.50',
    params: [{ key: 's', label: 'System', type: 'select', options: ['Indian (lakh, crore)', 'International (million)'] }, { key: 'r', label: 'Rupees format', type: 'toggle', value: true }],
    sample: '125050',
    fn: function (t, v) {
      var s = t.replace(/[, ₹]/g, '').trim(); if (!s) return null; if (!/^\d+(\.\d+)?$/.test(s)) return { error: 'Sirf number likhein' };
      var p = s.split('.'), n = parseInt(p[0], 10); if (n > 999999999999999) return { error: 'Number bahut bada hai' };
      var f = v.s.indexOf('Indian') === 0 ? wordsIndian : wordsIntl, w = f(n), dec = p[1] ? parseInt((p[1] + '0').slice(0, 2), 10) : 0;
      var out = v.r ? 'Rupees ' + w + (dec ? ' and ' + w99(dec) + ' paise' : '') + ' only' : w + (p[1] ? ' point ' + p[1].split('').map(function (d) { return ONES[+d] || 'zero'; }).join(' ') : '');
      return out.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    } });
  textTool({ id: 'roman', name: 'Roman Numerals', desc: 'Number ⇄ Roman (I, V, X…)', icon: '🏛️', cat: 'util', sample: '2026',
    fn: function (t) {
      t = t.trim().toUpperCase(); if (!t) return null;
      var map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
      if (/^\d+$/.test(t)) { var n = +t; if (n < 1 || n > 3999) return { error: '1 se 3999 tak' }; var r = ''; map.forEach(function (m) { while (n >= m[0]) { r += m[1]; n -= m[0]; } }); return r; }
      if (/^[MDCLXVI]+$/.test(t)) { var val = { M: 1000, D: 500, C: 100, L: 50, X: 10, V: 5, I: 1 }, s = 0; for (var i = 0; i < t.length; i++) { var a = val[t[i]], b = val[t[i + 1]] || 0; s += a < b ? -a : a; } return String(s); }
      return { error: 'Number ya Roman numeral likhein' };
    } });
  textTool({ id: 'baseconv', name: 'Number Base Converter', desc: 'Decimal, binary, octal, hex', icon: '🔟', cat: 'util', sample: '255',
    params: [{ key: 'from', label: 'Input base', type: 'select', options: [{ value: '10', label: 'Decimal (10)' }, { value: '2', label: 'Binary (2)' }, { value: '8', label: 'Octal (8)' }, { value: '16', label: 'Hex (16)' }] }],
    fn: function (t, v) {
      t = t.trim().replace(/^0[xbo]/i, ''); if (!t) return null;
      var n; try { n = BigInt.asUintN ? parseBig(t, +v.from) : parseInt(t, +v.from); } catch (e) { return { error: 'Is base mein valid number nahi' }; }
      return { stats: [['Decimal', n.toString(10)], ['Binary', n.toString(2)], ['Octal', n.toString(8)], ['Hex', n.toString(16).toUpperCase()]] };
    } });
  function parseBig(s, base) { var digits = '0123456789abcdef', n = BigInt(0), B = BigInt(base); s.toLowerCase().split('').forEach(function (c) { var d = digits.indexOf(c); if (d < 0 || d >= base) throw new Error('bad'); n = n * B + BigInt(d); }); return n; }
  var MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.', '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', '/': '-..-.', '@': '.--.-.', '&': '.-...', ':': '---...', '=': '-...-', '+': '.-.-.', '-': '-....-', "'": '.----.', '"': '.-..-.', '(': '-.--.', ')': '-.--.-' };
  textTool({ id: 'morse', name: 'Morse Code', desc: 'Text ⇄ Morse code', icon: '📡', sample: 'SOS',
    params: [{ key: 'm', label: 'Mode', type: 'select', options: ['Text → Morse', 'Morse → Text'] }],
    fn: function (t, v) {
      if (v.m === 'Text → Morse') return t.toUpperCase().split(/\s+/).filter(Boolean).map(function (w) { return w.split('').map(function (c) { return MORSE[c] || ''; }).filter(Boolean).join(' '); }).join(' / ');
      var rev = {}; Object.keys(MORSE).forEach(function (k) { rev[MORSE[k]] = k; });
      return t.trim().split(/\s*\/\s*|\s{3,}/).map(function (w) { return w.split(/\s+/).map(function (c) { return rev[c] || ''; }).join(''); }).join(' ');
    } });

  /* Diff (two inputs) */
  tool({ id: 'diff', name: 'Text Compare (Diff)', desc: 'Do texts ka fark dekhein', cat: 'text', icon: '⚖️',
    render: function (host) {
      var a = h('textarea', { class: 'ta', placeholder: 'Original text' }), b = h('textarea', { class: 'ta', placeholder: 'Changed text' }), out = h('div', { class: 'out' });
      host.appendChild(h('div', { class: 'field' }, a, b));
      host.appendChild(h('div', { class: 'actions' }, h('button', { class: 'btn-filled', onclick: function () {
        var A = lines(a.value), B = lines(b.value), n = A.length, m = B.length;
        if (n * m > 4e6) { out.innerHTML = ''; out.appendChild(h('div', { class: 'err' }, 'Text bahut lamba hai')); return; }
        var dp = []; for (var i = 0; i <= n; i++) { dp.push(new Uint32Array(m + 1)); }
        for (i = n - 1; i >= 0; i--) for (var j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
        var res = [], add = 0, del = 0; i = 0; j = 0;
        while (i < n && j < m) { if (A[i] === B[j]) { res.push(['  ', A[i]]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) { res.push(['- ', A[i++]]); del++; } else { res.push(['+ ', B[j++]]); add++; } }
        while (i < n) { res.push(['- ', A[i++]]); del++; } while (j < m) { res.push(['+ ', B[j++]]); add++; }
        out.innerHTML = '';
        out.appendChild(h('div', { class: 'out-head' }, h('span', {}, '+' + add + ' added · −' + del + ' removed')));
        var pre = h('div', { class: 'pre' });
        res.forEach(function (r) { pre.appendChild(h('div', { style: { background: r[0] === '+ ' ? 'rgba(46,125,50,.15)' : r[0] === '- ' ? 'rgba(179,38,30,.15)' : 'transparent' } }, r[0] + r[1])); });
        out.appendChild(pre);
      } }, '⚖️ Compare')));
      host.appendChild(out);
    } });

  textTool({ id: 'emails', name: 'Extract Emails', desc: 'Text se email addresses nikaalein', icon: '📧',
    fn: function (t) { var m = t.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [], u = Array.from(new Set(m)); return { stats: [['Emails found', u.length]], text: u.join('\n') }; } });
  textTool({ id: 'urls', name: 'Extract URLs', desc: 'Text se links nikaalein', icon: '🔗',
    fn: function (t) { var m = t.match(/https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+/gi) || [], u = Array.from(new Set(m)); return { stats: [['Links found', u.length]], text: u.join('\n') }; } });
  textTool({ id: 'spaces', name: 'Remove Extra Spaces', desc: 'Double spaces, tabs, blank lines saaf', icon: '␣',
    params: [{ key: 'nl', label: 'Also remove line breaks', type: 'toggle' }],
    fn: function (t, v) { var s = t.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim(); return v.nl ? s.replace(/\s*\n\s*/g, ' ') : s; } });
  textTool({ id: 'htmlesc', name: 'HTML Escape', desc: 'HTML entities encode/decode', icon: '🏷️',
    params: [{ key: 'm', label: 'Mode', type: 'select', options: ['Escape', 'Unescape'] }],
    fn: function (t, v) { if (v.m === 'Escape') return esc(t); var d = document.createElement('textarea'); d.innerHTML = t; return d.value; } });
  textTool({ id: 'binary', name: 'Text ⇄ Binary', desc: 'Text ko 0101 mein badlein', icon: '💾', sample: 'Hi',
    params: [{ key: 'm', label: 'Mode', type: 'select', options: ['Text → Binary', 'Binary → Text', 'Text → Hex', 'Hex → Text'] }],
    fn: function (t, v) {
      var enc = new TextEncoder(), dec = new TextDecoder();
      if (v.m === 'Text → Binary') return Array.from(enc.encode(t)).map(function (b) { return ('00000000' + b.toString(2)).slice(-8); }).join(' ');
      if (v.m === 'Text → Hex') return Array.from(enc.encode(t)).map(function (b) { return ('0' + b.toString(16)).slice(-2); }).join(' ');
      var parts = t.trim().split(/\s+/).filter(Boolean), base = v.m === 'Binary → Text' ? 2 : 16;
      var bytes = parts.map(function (p) { return parseInt(p, base); });
      if (bytes.some(isNaN)) return { error: 'Invalid input' };
      return dec.decode(new Uint8Array(bytes));
    } });
  textTool({ id: 'linenum', name: 'Add Line Numbers', desc: 'Har line ke aage number', icon: '📋',
    params: [{ key: 's', label: 'Separator', type: 'select', options: ['. ', ') ', ' - ', ': ', '\t'] }],
    fn: function (t, v) { return lines(t).map(function (l, i) { return (i + 1) + v.s + l; }).join('\n'); } });
  textTool({ id: 'repeat', name: 'Repeat Text', desc: 'Text ko N baar repeat karein', icon: '🔁',
    params: [{ key: 'n', label: 'Times', type: 'number', value: 10 }, { key: 'nl', label: 'New line each time', type: 'toggle', value: true }],
    fn: function (t, v) { var n = Math.min(10000, Math.max(1, +v.n || 1)); return new Array(n).fill(t).join(v.nl ? '\n' : ' '); } });
  var FANCY = {
    'Bold': [0x1D400, 0x1D41A, 0x1D7CE], 'Italic': [0x1D434, 0x1D44E, null], 'Bold Italic': [0x1D468, 0x1D482, null], 'Script': [0x1D49C, 0x1D4B6, null], 'Bold Script': [0x1D4D0, 0x1D4EA, null],
    'Fraktur': [0x1D504, 0x1D51E, null], 'Double-struck': [0x1D538, 0x1D552, 0x1D7D8], 'Sans Bold': [0x1D5D4, 0x1D5EE, 0x1D7EC], 'Monospace': [0x1D670, 0x1D68A, 0x1D7F6]
  };
  var HOLES = { 0x1D455: 0x210E, 0x1D49D: 0x212C, 0x1D4A0: 0x2130, 0x1D4A1: 0x2131, 0x1D4A3: 0x210B, 0x1D4A4: 0x2110, 0x1D4A7: 0x2112, 0x1D4A8: 0x2133, 0x1D4AD: 0x211B, 0x1D4BA: 0x212F, 0x1D4BC: 0x210A, 0x1D4C4: 0x2134,
    0x1D506: 0x212D, 0x1D50B: 0x210C, 0x1D50C: 0x2111, 0x1D515: 0x211C, 0x1D51D: 0x2128, 0x1D53A: 0x2102, 0x1D53F: 0x210D, 0x1D545: 0x2115, 0x1D547: 0x2119, 0x1D548: 0x211A, 0x1D549: 0x211D, 0x1D551: 0x2124 };
  function fancy(t, st) {
    var b = FANCY[st];
    return Array.from(t).map(function (c) {
      var k = c.charCodeAt(0), cp = null;
      if (k >= 65 && k <= 90) cp = b[0] + k - 65; else if (k >= 97 && k <= 122) cp = b[1] + k - 97; else if (k >= 48 && k <= 57 && b[2]) cp = b[2] + k - 48;
      if (cp === null) return c; cp = HOLES[cp] || cp; return String.fromCodePoint(cp);
    }).join('');
  }
  textTool({ id: 'fancytext', name: 'Fancy Text', desc: 'Instagram bio ke liye stylish fonts', icon: '✨', sample: 'Har Har Mahadev',
    fn: function (t) {
      if (!t) return null;
      var wrap = h('div', { class: 'calc-out' });
      Object.keys(FANCY).concat(['Bubble', 'Small caps', 'Upside down']).forEach(function (st) {
        var s;
        if (st === 'Bubble') s = Array.from(t).map(function (c) { var k = c.charCodeAt(0); return k >= 65 && k <= 90 ? String.fromCodePoint(0x24B6 + k - 65) : k >= 97 && k <= 122 ? String.fromCodePoint(0x24D0 + k - 97) : c; }).join('');
        else if (st === 'Small caps') { var sc = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ'; s = Array.from(t.toLowerCase()).map(function (c) { var k = c.charCodeAt(0) - 97; return k >= 0 && k < 26 ? sc[k] : c; }).join(''); }
        else if (st === 'Upside down') { var f = 'ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz'; s = Array.from(t.toLowerCase()).reverse().map(function (c) { var k = c.charCodeAt(0) - 97; return k >= 0 && k < 26 ? f[k] : c; }).join(''); }
        else s = fancy(t, st);
        wrap.appendChild(h('div', { class: 'stat' }, h('span', { style: { fontSize: '16px' } }, s), h('button', { class: 'btn-sm', onclick: function () { copyText(s); } }, 'Copy')));
      });
      return { node: wrap };
    } });

  /* ---------- Utility (non-text) ---------- */
  tool({ id: 'barcode', name: 'Barcode Generator', desc: 'CODE128, EAN-13, UPC barcodes', cat: 'util', icon: '▥',
    render: function (host) {
      var prev = h('div', { class: 'preview' }), cv = canvasOf(10, 10);
      var controls = paramControls([{ key: 't', label: 'Value', type: 'text', value: 'TOOLBOX-123' }, { key: 'f', label: 'Format', type: 'select', options: ['CODE128', 'EAN13', 'UPC', 'CODE39', 'ITF14', 'EAN8'] },
        { key: 'txt', label: 'Show text', type: 'toggle', value: true }], draw);
      function draw() {
        var v = controls.vals; prev.innerHTML = '';
        if (!window.JsBarcode) { prev.appendChild(h('div', { class: 'err' }, 'Barcode engine load nahi hua')); return; }
        try { JsBarcode(cv, v.t || ' ', { format: v.f, displayValue: v.txt, width: 3, height: 120, margin: 16, background: '#ffffff' }); prev.appendChild(cv); }
        catch (e) { prev.appendChild(h('div', { class: 'err' }, '⚠️ Is format ke liye value sahi nahi (EAN13 = 12/13 digits, UPC = 11/12 digits)')); }
      }
      host.appendChild(controls.el); host.appendChild(prev);
      host.appendChild(h('div', { class: 'actions' }, h('button', { class: 'btn-filled', onclick: function () { toBlob(cv, 'image/png').then(function (b) { download(b, 'barcode.png'); }); } }, '💾 Save PNG')));
      draw();
    } });
  textTool({ id: 'timestamp', name: 'Timestamp Converter', desc: 'Unix time ⇄ date', icon: '🕒', cat: 'util', placeholder: 'Unix timestamp (seconds/ms) ya date (2026-10-26 10:30)',
    fn: function (t) {
      t = t.trim(); var d;
      if (!t) d = new Date(); else if (/^-?\d+$/.test(t)) d = new Date(t.length > 11 ? +t : +t * 1000); else d = new Date(t.replace(' ', 'T'));
      if (isNaN(d)) return { error: 'Samajh nahi aaya' };
      return { stats: [['Local', d.toLocaleString()], ['UTC', d.toUTCString()], ['ISO', d.toISOString()], ['Unix (s)', Math.floor(d / 1000)], ['Unix (ms)', +d]] };
    } });
  tool({ id: 'colorconv', name: 'Color Converter', desc: 'HEX ⇄ RGB ⇄ HSL', cat: 'util', icon: '🎨',
    render: function (host) {
      var out = h('div', { class: 'calc-out' });
      var c = paramControls([{ key: 'c', label: 'Pick color', type: 'color', value: '#6750a4' }, { key: 't', label: 'Or type HEX / rgb()', type: 'text', value: '' }], draw);
      function draw() {
        var v = c.vals, s = (v.t || v.c).trim(), rgb;
        var m = s.match(/rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);
        if (m) rgb = [+m[1], +m[2], +m[3]]; else if (/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(s)) rgb = hex2rgb(s.replace('#', '')); else { out.innerHTML = ''; out.appendChild(h('div', { class: 'err' }, 'Invalid color')); return; }
        var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, hh = 0, sa = 0;
        if (mx !== mn) { var d = mx - mn; sa = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; }
        var hex = '#' + rgb.map(function (n) { return ('0' + n.toString(16)).slice(-2); }).join('').toUpperCase();
        var k = 1 - Math.max(r, g, b), cmyk = k === 1 ? [0, 0, 0, 100] : [(1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k].map(function (x) { return Math.round(x * 100); });
        out.innerHTML = '';
        out.appendChild(h('div', { class: 'stat', style: { background: hex, minHeight: '50px' } }));
        [['HEX', hex], ['RGB', 'rgb(' + rgb.join(', ') + ')'], ['HSL', 'hsl(' + Math.round(hh) + ', ' + Math.round(sa * 100) + '%, ' + Math.round(l * 100) + '%)'], ['CMYK', cmyk.join('%, ') + '%']]
          .forEach(function (row) { out.appendChild(h('div', { class: 'stat' }, h('span', {}, row[0]), h('strong', {}, row[1]), h('button', { class: 'btn-sm', onclick: function () { copyText(row[1]); } }, 'Copy'))); });
      }
      host.appendChild(c.el); host.appendChild(out); draw();
    } });
  tool({ id: 'stopwatch', name: 'Stopwatch & Timer', desc: 'Stopwatch with laps + countdown', cat: 'util', icon: '⏱️',
    render: function (host) {
      var disp = h('div', { class: 'stat', style: { justifyContent: 'center' } }, h('strong', { style: { fontSize: '40px' } }, '00:00.00'));
      var laps = h('div', { class: 'calc-out' }), start = 0, acc = 0, raf = null, mode = 'sw', cdEnd = 0;
      var cd = paramControls([{ key: 'm', label: 'Countdown minutes (Timer mode)', type: 'number', value: 5 }]);
      function fmt(ms) { ms = Math.max(0, ms); var m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, c = Math.floor(ms / 10) % 100; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s + '.' + (c < 10 ? '0' : '') + c; }
      function tick() {
        if (!host.isConnected) { raf = null; return; }
        if (mode === 'sw') disp.firstChild.textContent = fmt(acc + (Date.now() - start));
        else { var left = cdEnd - Date.now(); disp.firstChild.textContent = fmt(left); if (left <= 0) { stop(); toast('⏰ Time up!', 4000); if (navigator.vibrate) navigator.vibrate([400, 200, 400]); return; } }
        raf = requestAnimationFrame(tick);
      }
      function stop() { if (raf) cancelAnimationFrame(raf); if (mode === 'sw' && raf) acc += Date.now() - start; raf = null; }
      var bStart = h('button', { class: 'btn-filled', onclick: function () { if (raf) { stop(); bStart.textContent = '▶ Start'; return; } if (mode === 'cd' && !cdEnd) cdEnd = Date.now() + (+cd.vals.m || 1) * 60000; start = Date.now(); bStart.textContent = '⏸ Pause'; if (mode === 'cd' && cdEnd < Date.now()) cdEnd = Date.now() + (+cd.vals.m || 1) * 60000; tick(); } }, '▶ Start');
      var bLap = h('button', { class: 'btn-tonal', onclick: function () { if (mode === 'sw') laps.insertBefore(h('div', { class: 'stat' }, h('span', {}, 'Lap ' + (laps.children.length + 1)), h('strong', {}, disp.firstChild.textContent)), laps.firstChild); } }, '🏁 Lap');
      var bReset = h('button', { class: 'btn-tonal', onclick: function () { stop(); acc = 0; cdEnd = 0; laps.innerHTML = ''; bStart.textContent = '▶ Start'; disp.firstChild.textContent = mode === 'sw' ? '00:00.00' : fmt((+cd.vals.m || 1) * 60000); } }, '↺ Reset');
      var modeSel = paramControls([{ key: 'mode', label: 'Mode', type: 'select', options: [{ value: 'sw', label: 'Stopwatch' }, { value: 'cd', label: 'Countdown timer' }] }], function (v) { mode = v.mode; bReset.click(); });
      host.appendChild(modeSel.el); host.appendChild(cd.el); host.appendChild(disp);
      host.appendChild(h('div', { class: 'actions' }, bStart, bLap, bReset)); host.appendChild(laps);
    } });

  /* ==========================================================
     CALCULATORS
     ========================================================== */
  function inr(n, d) { if (!isFinite(n)) return '-'; return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: d == null ? 2 : d }); }
  function num(n, d) { if (!isFinite(n)) return '-'; return Number(n).toLocaleString('en-IN', { maximumFractionDigits: d == null ? 2 : d }); }
  function calcTool(def) {
    tool({ id: def.id, name: def.name, desc: def.desc, cat: 'calc', icon: def.icon || '🧮',
      render: function (host) {
        var out = h('div', { class: 'calc-out' });
        var c = paramControls(def.params, run);
        function run() {
          out.innerHTML = '';
          var r; try { r = def.calc(c.vals); } catch (e) { r = [['Error', e.message]]; }
          (r || []).forEach(function (row) { out.appendChild(h('div', { class: 'stat' }, h('span', {}, row[0]), h('strong', {}, String(row[1])))); });
        }
        host.appendChild(c.el); host.appendChild(out); run();
      } });
  }

  tool({ id: 'calculator', name: 'Calculator', desc: 'Scientific calculator', cat: 'calc', icon: '🧮',
    render: function (host) {
      var expr = '', disp = h('input', { type: 'text', value: '', placeholder: '0', style: { fontSize: '26px', textAlign: 'right' } }), res = h('div', { class: 'stat' }, h('span', {}, '='), h('strong', { style: { fontSize: '22px' } }, '0'));
      disp.addEventListener('input', function () { expr = disp.value; live(); });
      function evaluate(s) {
        s = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, '(PI)').replace(/√/g, 'sqrt').replace(/\^/g, '**').replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
        if (/[^0-9+\-*/().,\s a-zPI]/.test(s)) throw new Error('bad');
        var ok = s.replace(/sqrt|sin|cos|tan|log|ln|abs|PI|e(?![a-z])/g, '');
        if (/[a-zA-Z]/.test(ok)) throw new Error('bad');
        var f = new Function('sqrt,sin,cos,tan,log,ln,abs,PI,e', 'return (' + s + ')');
        var deg = function (fn) { return function (x) { return fn(x * Math.PI / 180); }; };
        return f(Math.sqrt, deg(Math.sin), deg(Math.cos), deg(Math.tan), Math.log10, Math.log, Math.abs, Math.PI, Math.E);
      }
      function live() { try { var v = evaluate(expr); if (isFinite(v)) res.lastChild.textContent = String(+v.toPrecision(12)); } catch (e) {} }
      var keys = ['C', '⌫', '(', ')', 'sin(', 'cos(', 'tan(', '√(', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', '%', '+', 'π', '^', 'ln(', '='];
      var grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginTop: '12px' } });
      keys.forEach(function (k) {
        grid.appendChild(h('button', { class: k === '=' ? 'btn-filled' : (/[0-9.]/.test(k) ? 'btn' : 'btn-tonal'), style: { padding: '16px 0', fontSize: '18px' }, onclick: function () {
          if (k === 'C') expr = ''; else if (k === '⌫') expr = expr.slice(0, -1);
          else if (k === '=') { try { var v = evaluate(expr); expr = String(+v.toPrecision(12)); } catch (e) { toast('Galat expression'); } }
          else expr += k;
          disp.value = expr; live(); if (!expr) res.lastChild.textContent = '0';
        } }, k));
      });
      host.appendChild(disp); host.appendChild(res); host.appendChild(grid);
      host.appendChild(h('p', { style: { fontSize: '12px', opacity: .7 } }, 'Trig functions degrees mein hain.'));
    } });

  calcTool({ id: 'emi', name: 'EMI Calculator', desc: 'Loan ki monthly EMI', icon: '🏦',
    params: [{ key: 'p', label: 'Loan amount (₹)', type: 'number', value: 500000 }, { key: 'r', label: 'Interest rate (% per year)', type: 'number', value: 9.5, step: 0.1 }, { key: 'n', label: 'Tenure (years)', type: 'number', value: 5 }],
    calc: function (v) {
      var P = +v.p, r = +v.r / 1200, n = +v.n * 12; if (!P || !n) return [];
      var emi = r ? P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : P / n;
      return [['Monthly EMI', inr(emi, 0)], ['Total interest', inr(emi * n - P, 0)], ['Total payment', inr(emi * n, 0)], ['Months', n]];
    } });
  calcTool({ id: 'sip', name: 'SIP Calculator', desc: 'Mutual fund SIP returns', icon: '📈',
    params: [{ key: 'm', label: 'Monthly investment (₹)', type: 'number', value: 5000 }, { key: 'r', label: 'Expected return (% per year)', type: 'number', value: 12, step: 0.1 }, { key: 'y', label: 'Years', type: 'number', value: 10 }],
    calc: function (v) {
      var M = +v.m, i = +v.r / 1200, n = +v.y * 12; if (!M || !n) return [];
      var fv = i ? M * ((Math.pow(1 + i, n) - 1) / i) * (1 + i) : M * n;
      return [['Invested', inr(M * n, 0)], ['Est. returns', inr(fv - M * n, 0)], ['Total value', inr(fv, 0)]];
    } });
  calcTool({ id: 'gst', name: 'GST Calculator', desc: 'GST add / remove karein', icon: '🧾',
    params: [{ key: 'a', label: 'Amount (₹)', type: 'number', value: 1000 }, { key: 'r', label: 'GST rate', type: 'select', options: ['5', '12', '18', '28', '3', '0.25'], value: '18' },
      { key: 'm', label: 'Mode', type: 'select', options: [{ value: 'add', label: 'Add GST (exclusive)' }, { value: 'rem', label: 'Remove GST (inclusive)' }] }],
    calc: function (v) {
      var a = +v.a, r = +v.r; var base = v.m === 'add' ? a : a * 100 / (100 + r), g = base * r / 100;
      return [['Base amount', inr(base)], ['GST (' + r + '%)', inr(g)], ['CGST', inr(g / 2)], ['SGST', inr(g / 2)], ['Total', inr(base + g)]];
    } });
  calcTool({ id: 'percent', name: 'Percentage Calculator', desc: 'X ka Y%, % change, etc.', icon: '％',
    params: [{ key: 'a', label: 'Value A', type: 'number', value: 20 }, { key: 'b', label: 'Value B', type: 'number', value: 250 }],
    calc: function (v) {
      var a = +v.a, b = +v.b;
      return [[a + '% of ' + b, num(a * b / 100, 4)], [a + ' is what % of ' + b, num(a / b * 100, 4) + '%'], ['% change ' + a + ' → ' + b, num((b - a) / a * 100, 4) + '%'], [b + ' + ' + a + '%', num(b * (1 + a / 100), 4)], [b + ' − ' + a + '%', num(b * (1 - a / 100), 4)]];
    } });
  function ymd(a, b) {
    if (b < a) { var t = a; a = b; b = t; }
    var y = b.getFullYear() - a.getFullYear(), m = b.getMonth() - a.getMonth(), d = b.getDate() - a.getDate();
    if (d < 0) { m--; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    return [y, m, d];
  }
  var today = new Date().toISOString().slice(0, 10);
  calcTool({ id: 'age', name: 'Age Calculator', desc: 'Exact umar saal-mahine-din mein', icon: '🎂',
    params: [{ key: 'dob', label: 'Date of birth', type: 'date', value: '2000-01-01' }, { key: 'on', label: 'Age on date', type: 'date', value: today }],
    calc: function (v) {
      var a = new Date(v.dob), b = new Date(v.on); if (isNaN(a) || isNaN(b)) return [];
      var r = ymd(a, b), days = Math.round((b - a) / 864e5), nb = new Date(b.getFullYear(), a.getMonth(), a.getDate()); if (nb < b) nb.setFullYear(b.getFullYear() + 1);
      return [['Age', r[0] + ' years ' + r[1] + ' months ' + r[2] + ' days'], ['Total months', num(r[0] * 12 + r[1], 0)], ['Total weeks', num(Math.floor(days / 7), 0)], ['Total days', num(days, 0)],
        ['Next birthday in', Math.round((nb - b) / 864e5) + ' days'], ['Born on', a.toLocaleDateString('en-IN', { weekday: 'long' })]];
    } });
  calcTool({ id: 'bmi', name: 'BMI Calculator', desc: 'Body Mass Index', icon: '⚖️',
    params: [{ key: 'w', label: 'Weight (kg)', type: 'number', value: 70 }, { key: 'h', label: 'Height (cm)', type: 'number', value: 170 }],
    calc: function (v) {
      var m = +v.h / 100, b = +v.w / (m * m); if (!isFinite(b)) return [];
      var cat = b < 18.5 ? 'Underweight' : b < 25 ? 'Normal ✅' : b < 30 ? 'Overweight' : 'Obese';
      return [['BMI', num(b, 1)], ['Category', cat], ['Healthy weight', num(18.5 * m * m, 1) + ' – ' + num(24.9 * m * m, 1) + ' kg']];
    } });
  calcTool({ id: 'datediff', name: 'Date Difference', desc: 'Do dates ke beech din', icon: '📅',
    params: [{ key: 'a', label: 'From', type: 'date', value: today }, { key: 'b', label: 'To', type: 'date', value: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10) }, { key: 'add', label: 'Add / subtract days from "From"', type: 'number', value: 0 }],
    calc: function (v) {
      var a = new Date(v.a), b = new Date(v.b); if (isNaN(a) || isNaN(b)) return [];
      var days = Math.round((b - a) / 864e5), r = ymd(a, b), wd = 0;
      for (var d = new Date(Math.min(a, b)); d < new Date(Math.max(a, b)); d.setDate(d.getDate() + 1)) if (d.getDay() % 6) wd++;
      var out = [['Difference', num(days, 0) + ' days'], ['As Y/M/D', r[0] + 'y ' + r[1] + 'm ' + r[2] + 'd'], ['Weeks', num(days / 7, 1)], ['Working days (Mon–Fri)', wd]];
      if (+v.add) { var x = new Date(a); x.setDate(x.getDate() + +v.add); out.push(['From + ' + v.add + ' days', x.toDateString()]); }
      return out;
    } });
  function unitTool(id, name, desc, icon, units, def) {
    calcTool({ id: id, name: name, desc: desc, icon: icon,
      params: [{ key: 'v', label: 'Value', type: 'number', value: 1 }, { key: 'u', label: 'From unit', type: 'select', options: Object.keys(units), value: def }],
      calc: function (v) { var base = +v.v * units[v.u]; return Object.keys(units).map(function (k) { return [k, num(base / units[k], 6)]; }); } });
  }
  unitTool('length', 'Length Converter', 'm, km, cm, inch, feet, mile…', '📏', { 'Meter (m)': 1, 'Kilometer (km)': 1000, 'Centimeter (cm)': 0.01, 'Millimeter (mm)': 0.001, 'Inch (in)': 0.0254, 'Foot (ft)': 0.3048, 'Yard (yd)': 0.9144, 'Mile (mi)': 1609.344, 'Nautical mile': 1852 }, 'Foot (ft)');
  unitTool('weight', 'Weight Converter', 'kg, g, pound, ounce, tola…', '🏋️', { 'Kilogram (kg)': 1, 'Gram (g)': 0.001, 'Milligram (mg)': 1e-6, 'Tonne (t)': 1000, 'Quintal': 100, 'Pound (lb)': 0.45359237, 'Ounce (oz)': 0.028349523, 'Tola': 0.0116638, 'Carat': 0.0002 }, 'Kilogram (kg)');
  calcTool({ id: 'temp', name: 'Temperature Converter', desc: '°C, °F, K', icon: '🌡️',
    params: [{ key: 'v', label: 'Value', type: 'number', value: 37 }, { key: 'u', label: 'From', type: 'select', options: ['Celsius', 'Fahrenheit', 'Kelvin'] }],
    calc: function (v) { var x = +v.v, c = v.u === 'Celsius' ? x : v.u === 'Fahrenheit' ? (x - 32) * 5 / 9 : x - 273.15; return [['Celsius', num(c, 2) + ' °C'], ['Fahrenheit', num(c * 9 / 5 + 32, 2) + ' °F'], ['Kelvin', num(c + 273.15, 2) + ' K']]; } });
  tool({ id: 'random', name: 'Random Number', desc: 'Random number, dice, coin toss', cat: 'calc', icon: '🎲',
    render: function (host) {
      var out = h('div', { class: 'calc-out' });
      var c = paramControls([{ key: 'min', label: 'Min', type: 'number', value: 1 }, { key: 'max', label: 'Max', type: 'number', value: 100 }, { key: 'n', label: 'How many', type: 'number', value: 1 }, { key: 'u', label: 'No repeats', type: 'toggle' }]);
      function rnd(a, b) { var r = new Uint32Array(1); crypto.getRandomValues(r); return a + (r[0] % (b - a + 1)); }
      function show(label, val) { out.innerHTML = ''; out.appendChild(h('div', { class: 'stat', style: { justifyContent: 'center' } }, h('strong', { style: { fontSize: '32px' } }, val))); out.appendChild(h('div', { class: 'stat' }, h('span', {}, label))); }
      host.appendChild(c.el);
      host.appendChild(h('div', { class: 'actions' },
        h('button', { class: 'btn-filled', onclick: function () {
          var a = Math.ceil(+c.vals.min), b = Math.floor(+c.vals.max), n = Math.min(1000, Math.max(1, +c.vals.n || 1)); if (b < a) { var t = a; a = b; b = t; }
          if (c.vals.u && n > b - a + 1) return toast('Range chhota hai');
          var arr = [], set = {}; while (arr.length < n) { var x = rnd(a, b); if (c.vals.u && set[x]) continue; set[x] = 1; arr.push(x); }
          show(a + ' – ' + b, arr.join(', '));
        } }, '🎲 Generate'),
        h('button', { class: 'btn-tonal', onclick: function () { show('Dice', ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][rnd(0, 5)]); } }, 'Roll dice'),
        h('button', { class: 'btn-tonal', onclick: function () { show('Coin toss', rnd(0, 1) ? 'Heads 🪙' : 'Tails 🪙'); } }, 'Toss coin')));
      host.appendChild(out);
    } });
  calcTool({ id: 'tip', name: 'Tip / Bill Split', desc: 'Tip aur bill baantna', icon: '🍽️',
    params: [{ key: 'b', label: 'Bill amount (₹)', type: 'number', value: 1200 }, { key: 't', label: 'Tip %', type: 'range', min: 0, max: 30, value: 10 }, { key: 'p', label: 'People', type: 'number', value: 3 }],
    calc: function (v) { var b = +v.b, tip = b * v.t / 100, p = Math.max(1, +v.p || 1); return [['Tip', inr(tip)], ['Total', inr(b + tip)], ['Per person', inr((b + tip) / p)]]; } });
  calcTool({ id: 'discount', name: 'Discount Calculator', desc: 'Sale price aur bachat', icon: '🏷️',
    params: [{ key: 'p', label: 'Original price (₹)', type: 'number', value: 2000 }, { key: 'd', label: 'Discount %', type: 'number', value: 25 }, { key: 'x', label: 'Extra discount %', type: 'number', value: 0 }],
    calc: function (v) { var p = +v.p, f = p * (1 - v.d / 100) * (1 - v.x / 100); return [['Final price', inr(f)], ['You save', inr(p - f)], ['Effective discount', num((1 - f / p) * 100, 2) + '%']]; } });
  calcTool({ id: 'ci', name: 'Compound Interest / FD', desc: 'FD / compound interest maturity', icon: '💰',
    params: [{ key: 'p', label: 'Principal (₹)', type: 'number', value: 100000 }, { key: 'r', label: 'Rate (% per year)', type: 'number', value: 7, step: 0.1 }, { key: 'y', label: 'Years', type: 'number', value: 5 },
      { key: 'f', label: 'Compounding', type: 'select', options: [{ value: '4', label: 'Quarterly' }, { value: '12', label: 'Monthly' }, { value: '1', label: 'Yearly' }, { value: '2', label: 'Half-yearly' }] }],
    calc: function (v) { var P = +v.p, n = +v.f, A = P * Math.pow(1 + v.r / 100 / n, n * v.y); return [['Maturity amount', inr(A, 0)], ['Interest earned', inr(A - P, 0)], ['Simple interest (compare)', inr(P * v.r * v.y / 100, 0)]]; } });
})();
