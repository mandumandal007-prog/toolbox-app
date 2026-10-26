/* ==========================================================
   ToolBox Core — registry, DOM helper, UI kit, file utils
   ========================================================== */

var Tools = [];
function tool(def) { Tools.push(def); }

/* ---------- tiny hyperscript ---------- */
function h(tag, props) {
  var e = document.createElement(tag);
  if (props) for (var k in props) {
    var v = props[k];
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.indexOf('on') === 0 && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (var i = 2; i < arguments.length; i++) {
    var kids = arguments[i];
    (Array.isArray(kids) ? kids : [kids]).forEach(function (kid) {
      if (kid === null || kid === undefined || kid === false) return;
      e.appendChild(kid.nodeType ? kid : document.createTextNode(String(kid)));
    });
  }
  return e;
}

/* ---------- toast ---------- */
function toast(msg, ms) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(function () { t.hidden = true; }, ms || 2400);
}

/* ---------- download ---------- */
function download(blob, name) {
  var url = URL.createObjectURL(blob);
  var a = h('a', { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
}

function zipFiles(files, name) {
  if (!window.JSZip) return Promise.reject(new Error('ZIP engine load nahi hua'));
  var z = new JSZip();
  files.forEach(function (f) { z.file(f.name, f.blob); });
  return z.generateAsync({ type: 'blob' }).then(function (b) { download(b, name); });
}

/* ---------- parameter controls ---------- */
function paramControls(params, onChange) {
  onChange = onChange || function () {};
  var wrap = h('div', { class: 'params' });
  var vals = {};

  (params || []).forEach(function (p) {
    var id = 'p_' + p.key + '_' + Math.random().toString(36).slice(2, 7);
    var input, row, valTag;

    if (p.type === 'range') {
      vals[p.key] = Number(p.value != null ? p.value : p.min);
      valTag = h('span', { class: 'val' }, String(vals[p.key]));
      input = h('input', { type: 'range', id: id, min: p.min, max: p.max, step: p.step || 1, value: vals[p.key] });
      input.addEventListener('input', function () {
        vals[p.key] = Number(input.value);
        valTag.textContent = input.value;
        onChange(vals, p.key);
      });
      row = h('div', { class: 'param' },
        h('div', { class: 'param-head' }, h('label', { for: id }, p.label), valTag), input);

    } else if (p.type === 'select') {
      var opts = (p.options || []).map(function (o) {
        return typeof o === 'string' ? { value: o, label: o } : o;
      });
      vals[p.key] = p.value != null ? p.value : opts[0].value;
      input = h('select', { id: id });
      opts.forEach(function (o) { input.appendChild(h('option', { value: o.value }, o.label)); });
      input.value = vals[p.key];
      input.addEventListener('change', function () { vals[p.key] = input.value; onChange(vals, p.key); });
      row = h('div', { class: 'param' }, h('label', { for: id }, p.label), input);

    } else if (p.type === 'toggle') {
      vals[p.key] = !!p.value;
      input = h('input', { type: 'checkbox', id: id });
      input.checked = vals[p.key];
      input.addEventListener('change', function () { vals[p.key] = input.checked; onChange(vals, p.key); });
      row = h('label', { class: 'switch', for: id }, input, h('span', { class: 'track' }), h('span', {}, p.label));

    } else if (p.type === 'color') {
      vals[p.key] = p.value || '#ffffff';
      input = h('input', { type: 'color', id: id, value: vals[p.key] });
      input.addEventListener('input', function () { vals[p.key] = input.value; onChange(vals, p.key); });
      row = h('div', { class: 'param rowline' }, h('label', { for: id }, p.label), input);

    } else {
      vals[p.key] = p.value != null ? p.value : '';
      input = h('input', {
        type: p.type === 'number' ? 'number' : (p.type === 'date' ? 'date' : 'text'),
        id: id, value: vals[p.key], placeholder: p.placeholder || '',
        min: p.min, max: p.max, step: p.step
      });
      input.addEventListener('input', function () {
        vals[p.key] = p.type === 'number' ? Number(input.value) : input.value;
        onChange(vals, p.key);
      });
      row = h('div', { class: 'param' }, h('label', { for: id }, p.label), input);
    }
    wrap.appendChild(row);
  });

  return { el: wrap, vals: vals };
}

/* ==========================================================
   Image helpers
   ========================================================== */
function canvasOf(w, h) {
  var c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function loadImage(file) {
  return new Promise(function (res, rej) {
    var img = new Image();
    img.onload = function () { res(img); };
    img.onerror = function () { rej(new Error('Image read nahi hui')); };
    img.src = URL.createObjectURL(file);
  });
}

function toBlob(canvas, type, quality) {
  return new Promise(function (res) {
    canvas.toBlob(function (b) {
      if (b) return res(b);
      canvas.toBlob(function (b2) { res(b2); }, 'image/png');
    }, type || 'image/png', quality == null ? 0.92 : quality);
  });
}

function downscale(src, max) {
  var w = src.width || src.naturalWidth;
  var hh = src.height || src.naturalHeight;
  var s = Math.min(1, max / Math.max(w, hh));
  if (s >= 1) return src;
  var c = canvasOf(w * s, hh * s);
  var x = c.getContext('2d');
  x.imageSmoothingQuality = 'high';
  x.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

function drawTo(src, w, h, mode) {
  var c = canvasOf(w, h), x = c.getContext('2d');
  x.imageSmoothingQuality = 'high';
  if (mode === 'stretch') {
    x.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  var sw = src.width || src.naturalWidth;
  var sh = src.height || src.naturalHeight;
  var scale = mode === 'contain' ? Math.min(w / sw, h / sh) : Math.max(w / sw, h / sh);
  var dw = sw * scale, dh = sh * scale;
  x.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
  return c;
}

function pixelMap(canvas, fn) {
  var x = canvas.getContext('2d');
  var img = x.getImageData(0, 0, canvas.width, canvas.height);
  fn(img.data, canvas.width, canvas.height);
  x.putImageData(img, 0, 0);
  return canvas;
}

function convolve(canvas, kernel, divisor, offset) {
  var w = canvas.width, hh = canvas.height;
  var x = canvas.getContext('2d');
  var src = x.getImageData(0, 0, w, hh);
  var dst = x.createImageData(w, hh);
  var s = src.data, d = dst.data;
  var side = Math.round(Math.sqrt(kernel.length));
  var half = Math.floor(side / 2);
  var div = divisor || kernel.reduce(function (a, b) { return a + b; }, 0) || 1;
  var off = offset || 0;
  for (var y = 0; y < hh; y++) {
    for (var xx = 0; xx < w; xx++) {
      var r = 0, g = 0, b = 0;
      for (var ky = 0; ky < side; ky++) {
        for (var kx = 0; kx < side; kx++) {
          var sy = Math.min(hh - 1, Math.max(0, y + ky - half));
          var sx = Math.min(w - 1, Math.max(0, xx + kx - half));
          var si = (sy * w + sx) * 4;
          var kv = kernel[ky * side + kx];
          r += s[si] * kv; g += s[si + 1] * kv; b += s[si + 2] * kv;
        }
      }
      var di = (y * w + xx) * 4;
      d[di] = Math.min(255, Math.max(0, r / div + off));
      d[di + 1] = Math.min(255, Math.max(0, g / div + off));
      d[di + 2] = Math.min(255, Math.max(0, b / div + off));
      d[di + 3] = s[di + 3];
    }
  }
  x.putImageData(dst, 0, 0);
  return canvas;
}

/* hex -> [r,g,b] */
function hex2rgb(hex) {
  hex = (hex || '#ffffff').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}

/* ==========================================================
   PDF helpers
   ========================================================== */
function PDF() {
  if (!window.PDFLib) throw new Error('PDF engine load nahi hua');
  return window.PDFLib;
}

function parseRanges(str, max) {
  var out = [];
  String(str || '').split(',').forEach(function (seg) {
    seg = seg.trim();
    if (!seg) return;
    var m = seg.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      var a = +m[1], b = +m[2];
      if (a > b) { var t = a; a = b; b = t; }
      for (var i = a; i <= b; i++) if (i >= 1 && i <= max) out.push(i - 1);
    } else {
      var n = parseInt(seg, 10);
      if (n >= 1 && n <= max) out.push(n - 1);
    }
  });
  var seen = {};
  return out.filter(function (v) { return seen[v] ? false : (seen[v] = true); });
}

function bytesToBlob(bytes, type) {
  return new Blob([bytes], { type: type || 'application/pdf' });
}
