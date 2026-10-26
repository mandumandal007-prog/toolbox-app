/* ==========================================================
   PHOTO TOOLS — all canvas based (works offline)
   ========================================================== */

(function () {

  var range = function (key, label, min, max, value, step) {
    return { key: key, label: label, type: 'range', min: min, max: max, value: value, step: step || 1 };
  };

  /* ---------------- generic single-image tool ---------------- */
  function imageTool(def) {
    tool({
      id: def.id, name: def.name, desc: def.desc, cat: 'photo', icon: def.icon || '🖼️',
      render: function (host) {
        var state = { img: null, small: null, file: null, vals: {} };

        var preview = h('div', { class: 'preview' }, h('div', { class: 'ph' }, '🖼️ Image select karein'));
        var out = h('div', { class: 'out' });
        var fileIn = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' } });

        var fmtParam = {
          key: 'fmt', label: 'Output format', type: 'select',
          options: [
            { value: 'image/jpeg', label: 'JPG' },
            { value: 'image/png', label: 'PNG' },
            { value: 'image/webp', label: 'WEBP' }
          ],
          value: def.defaultFmt || 'image/jpeg'
        };
        var qParam = range('q', 'Quality', 40, 100, 92);

        var controls = paramControls((def.params || []).concat([fmtParam, qParam]), function (v) {
          state.vals = v; schedule();
        });
        state.vals = controls.vals;

        var timer;
        function schedule(now) {
          clearTimeout(timer);
          timer = setTimeout(draw, now ? 0 : 130);
        }

        function draw() {
          if (!state.img) return;
          try {
            var src = downscale(state.img, 900);
            var res = def.apply(src, state.vals, { preview: true });
            if (res && res.then) res.then(show); else show(res);
          } catch (e) { console.error(e); }
        }
        function show(c) {
          if (!c) return;
          preview.innerHTML = '';
          preview.appendChild(c);
        }

        fileIn.addEventListener('change', function () {
          var f = fileIn.files[0];
          if (!f) return;
          state.file = f;
          loadImage(f).then(function (img) {
            state.img = img;
            out.innerHTML = '';
            schedule(true);
          }).catch(function (e) { toast(e.message); });
        });

        var saveBtn = h('button', {
          class: 'btn-filled',
          onclick: function () {
            if (!state.img) return toast('Pehle image select karein');
            saveBtn.disabled = true;
            var old = saveBtn.textContent;
            saveBtn.textContent = 'Processing…';
            Promise.resolve(def.apply(state.img, state.vals, { preview: false })).then(function (c) {
              var fmt = state.vals.fmt || 'image/jpeg';
              var q = state.vals.q != null ? state.vals.q / 100 : 0.92;
              return toBlob(c, fmt, q).then(function (blob) {
                var base = (state.file.name || 'image').replace(/\.[^.]+$/, '');
                var ext = fmt === 'image/png' ? 'png' : (fmt === 'image/webp' ? 'webp' : 'jpg');
                var name = base + '-' + def.id + '.' + ext;
                out.innerHTML = '';
                out.appendChild(h('div', { class: 'ok' }, '✅ Ready: ' + c.width + '×' + c.height + ' · ' + fmtSize(blob.size)));
                download(blob, name);
              });
            }).catch(function (e) {
              console.error(e);
              out.innerHTML = '';
              out.appendChild(h('div', { class: 'err' }, '⚠️ ' + (e && e.message || e)));
            }).then(function () {
              saveBtn.disabled = false;
              saveBtn.textContent = old;
            });
          }
        }, '💾 Process & Save');

        host.appendChild(h('div', { class: 'field' },
          h('button', { class: 'btn', onclick: function () { fileIn.click(); } }, '📁 Choose image'),
          fileIn));
        host.appendChild(preview);
        host.appendChild(controls.el);
        host.appendChild(h('div', { class: 'actions' }, saveBtn));
        host.appendChild(out);
      }
    });
  }

  /* ---------------- helpers ---------------- */
  function W(s) { return s.width || s.naturalWidth; }
  function H(s) { return s.height || s.naturalHeight; }
  function copy(src) {
    var c = canvasOf(W(src), H(src));
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  function filtered(src, filter) {
    var c = canvasOf(W(src), H(src)), x = c.getContext('2d');
    if ('filter' in x) {
      x.filter = filter;
      x.drawImage(src, 0, 0, c.width, c.height);
      x.filter = 'none';
      return c;
    }
    x.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  function clamp(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }
  function px(src, fn) { return pixelMap(copy(src), fn); }
  window.fmtSize = window.fmtSize || function (b) {
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
  };
  function boxBlur(src, r) {
    if (r <= 0) return copy(src);
    return filtered(src, 'blur(' + r + 'px)');
  }

  /* ================= FILTERS ================= */
  imageTool({ id: 'grayscale', name: 'Grayscale', desc: 'Photo ko black & white banayein', icon: '⚫',
    params: [range('amt', 'Amount %', 0, 100, 100)],
    apply: function (s, v) { return filtered(s, 'grayscale(' + v.amt + '%)'); } });
  imageTool({ id: 'sepia', name: 'Sepia', desc: 'Purana brown vintage look', icon: '🟤',
    params: [range('amt', 'Amount %', 0, 100, 100)],
    apply: function (s, v) { return filtered(s, 'sepia(' + v.amt + '%)'); } });
  imageTool({ id: 'invert', name: 'Invert Colors', desc: 'Negative effect', icon: '🔄',
    params: [range('amt', 'Amount %', 0, 100, 100)],
    apply: function (s, v) { return filtered(s, 'invert(' + v.amt + '%)'); } });
  imageTool({ id: 'blur', name: 'Blur', desc: 'Photo ko blur karein', icon: '💧',
    params: [range('r', 'Blur (% of width ×10)', 0, 50, 8)],
    apply: function (s, v) { return boxBlur(s, W(s) * v.r / 1000); } });
  imageTool({ id: 'brightness', name: 'Brightness', desc: 'Roshni kam/zyada', icon: '☀️',
    params: [range('v', 'Brightness %', 10, 250, 120)],
    apply: function (s, v) { return filtered(s, 'brightness(' + v.v + '%)'); } });
  imageTool({ id: 'contrast', name: 'Contrast', desc: 'Contrast adjust', icon: '◐',
    params: [range('v', 'Contrast %', 10, 250, 130)],
    apply: function (s, v) { return filtered(s, 'contrast(' + v.v + '%)'); } });
  imageTool({ id: 'saturation', name: 'Saturation', desc: 'Colors ko vivid ya dull', icon: '🌈',
    params: [range('v', 'Saturation %', 0, 300, 150)],
    apply: function (s, v) { return filtered(s, 'saturate(' + v.v + '%)'); } });
  imageTool({ id: 'hue', name: 'Hue Rotate', desc: 'Rang badlein', icon: '🎨',
    params: [range('v', 'Hue °', 0, 360, 90)],
    apply: function (s, v) { return filtered(s, 'hue-rotate(' + v.v + 'deg)'); } });
  imageTool({ id: 'vintage', name: 'Vintage', desc: 'Retro film look', icon: '📷',
    params: [range('amt', 'Strength %', 0, 100, 70)],
    apply: function (s, v) {
      var a = v.amt / 100;
      var c = filtered(s, 'sepia(' + (a * 60) + '%) contrast(' + (100 + a * 10) + '%) saturate(' + (100 - a * 20) + '%) brightness(' + (100 + a * 5) + '%)');
      return vignette(c, a * 0.6);
    } });
  imageTool({ id: 'warmcool', name: 'Warm / Cool', desc: 'Temperature adjust', icon: '🌡️',
    params: [range('t', 'Cool ← → Warm', -100, 100, 40)],
    apply: function (s, v) {
      var t = v.t * 0.4;
      return px(s, function (d) { for (var i = 0; i < d.length; i += 4) { d[i] = clamp(d[i] + t); d[i + 2] = clamp(d[i + 2] - t); } });
    } });
  imageTool({ id: 'sharpen', name: 'Sharpen', desc: 'Photo ko sharp karein', icon: '🔪',
    params: [range('amt', 'Amount', 1, 10, 4)],
    apply: function (s, v) {
      var a = v.amt / 4;
      return convolve(copy(s), [0, -a, 0, -a, 1 + 4 * a, -a, 0, -a, 0], 1);
    } });
  imageTool({ id: 'posterize', name: 'Posterize', desc: 'Kam colors, poster look', icon: '🖌️',
    params: [range('lv', 'Levels', 2, 16, 4)],
    apply: function (s, v) {
      var n = v.lv - 1;
      return px(s, function (d) { for (var i = 0; i < d.length; i += 4) for (var k = 0; k < 3; k++) d[i + k] = Math.round(Math.round(d[i + k] / 255 * n) / n * 255); });
    } });
  imageTool({ id: 'threshold', name: 'Threshold', desc: 'Sirf black aur white', icon: '◼️',
    params: [range('t', 'Threshold', 0, 255, 128)], defaultFmt: 'image/png',
    apply: function (s, v) {
      return px(s, function (d) { for (var i = 0; i < d.length; i += 4) { var l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; d[i] = d[i + 1] = d[i + 2] = l >= v.t ? 255 : 0; } });
    } });
  imageTool({ id: 'pixelate', name: 'Pixelate', desc: 'Pixel / mosaic effect', icon: '👾',
    params: [range('b', 'Block size (% ×10)', 5, 100, 20)],
    apply: function (s, v) {
      var bs = Math.max(2, W(s) * v.b / 1000);
      var sm = canvasOf(W(s) / bs, H(s) / bs);
      sm.getContext('2d').drawImage(s, 0, 0, sm.width, sm.height);
      var c = canvasOf(W(s), H(s)), x = c.getContext('2d');
      x.imageSmoothingEnabled = false;
      x.drawImage(sm, 0, 0, c.width, c.height);
      return c;
    } });
  imageTool({ id: 'noise', name: 'Add Noise', desc: 'Film grain effect', icon: '📺',
    params: [range('n', 'Amount', 0, 100, 25)],
    apply: function (s, v) {
      return px(s, function (d) { for (var i = 0; i < d.length; i += 4) { var r = (Math.random() - 0.5) * v.n * 2; d[i] = clamp(d[i] + r); d[i + 1] = clamp(d[i + 1] + r); d[i + 2] = clamp(d[i + 2] + r); } });
    } });
  imageTool({ id: 'emboss', name: 'Emboss', desc: '3D emboss effect', icon: '🗿',
    apply: function (s) { return convolve(copy(s), [-2, -1, 0, -1, 1, 1, 0, 1, 2], 1); } });
  imageTool({ id: 'edge', name: 'Edge Detect', desc: 'Outline / sketch', icon: '✏️',
    params: [{ key: 'inv', label: 'Pencil sketch (white bg)', type: 'toggle', value: true }],
    apply: function (s, v) {
      var c = convolve(filtered(s, 'grayscale(100%)'), [-1, -1, -1, -1, 8, -1, -1, -1, -1], 1);
      if (v.inv) pixelMap(c, function (d) { for (var i = 0; i < d.length; i += 4) { d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2]; } });
      return c;
    } });
  imageTool({ id: 'duotone', name: 'Duotone', desc: 'Do rang ka effect', icon: '🎭',
    params: [{ key: 'a', label: 'Shadow color', type: 'color', value: '#1a0b3d' }, { key: 'b', label: 'Highlight color', type: 'color', value: '#ff7a59' }],
    apply: function (s, v) {
      var A = hex2rgb(v.a), B = hex2rgb(v.b);
      return px(s, function (d) { for (var i = 0; i < d.length; i += 4) { var l = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; for (var k = 0; k < 3; k++) d[i + k] = A[k] + (B[k] - A[k]) * l; } });
    } });
  function vignette(c, amt) {
    var x = c.getContext('2d'), w = c.width, hh = c.height;
    var g = x.createRadialGradient(w / 2, hh / 2, Math.min(w, hh) * 0.25, w / 2, hh / 2, Math.max(w, hh) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,' + amt + ')');
    x.fillStyle = g; x.fillRect(0, 0, w, hh);
    return c;
  }
  imageTool({ id: 'vignette', name: 'Vignette', desc: 'Kinaron ko dark karein', icon: '🔘',
    params: [range('a', 'Strength %', 0, 100, 60)],
    apply: function (s, v) { return vignette(copy(s), v.a / 100); } });
  imageTool({ id: 'tint', name: 'Color Tint', desc: 'Photo par rang ki parat', icon: '🟣',
    params: [{ key: 'c', label: 'Tint color', type: 'color', value: '#6750a4' }, range('a', 'Strength %', 0, 100, 30)],
    apply: function (s, v) {
      var c = copy(s), x = c.getContext('2d');
      x.globalAlpha = v.a / 100; x.fillStyle = v.c; x.globalCompositeOperation = 'source-atop';
      x.fillRect(0, 0, c.width, c.height);
      return c;
    } });
  imageTool({ id: 'solarize', name: 'Solarize', desc: 'Psychedelic solarize', icon: '🌞',
    params: [range('t', 'Threshold', 0, 255, 128)],
    apply: function (s, v) {
      return px(s, function (d) { for (var i = 0; i < d.length; i += 4) for (var k = 0; k < 3; k++) if (d[i + k] > v.t) d[i + k] = 255 - d[i + k]; });
    } });
  imageTool({ id: 'noir', name: 'Noir', desc: 'High-contrast black & white', icon: '🎬',
    params: [range('c', 'Contrast %', 100, 250, 160)],
    apply: function (s, v) { return vignette(filtered(s, 'grayscale(100%) contrast(' + v.c + '%) brightness(95%)'), 0.5); } });

  /* ================= EDIT / TRANSFORM ================= */
  imageTool({ id: 'resize', name: 'Resize Image', desc: 'Width/height ya % se size badlein', icon: '📐',
    params: [
      { key: 'mode', label: 'Mode', type: 'select', options: [{ value: 'pct', label: 'Percentage' }, { value: 'px', label: 'Pixels (width/height)' }] },
      range('pct', 'Scale %', 5, 200, 50),
      { key: 'w', label: 'Width px (Pixels mode)', type: 'number', value: 1080 },
      { key: 'h', label: 'Height px (0 = auto)', type: 'number', value: 0 }
    ],
    apply: function (s, v, o) {
      var w, hh;
      if (v.mode === 'px') {
        w = Math.max(1, +v.w || W(s)); hh = +v.h > 0 ? +v.h : w * H(s) / W(s);
        if (o.preview) { var k = Math.min(1, 900 / Math.max(w, hh)); w *= k; hh *= k; }
      } else { w = W(s) * v.pct / 100; hh = H(s) * v.pct / 100; }
      return drawTo(s, w, hh, 'stretch');
    } });
  imageTool({ id: 'crop', name: 'Crop Image', desc: 'Aspect ratio ya % se crop', icon: '✂️',
    params: [
      { key: 'ar', label: 'Aspect ratio', type: 'select', options: ['free', '1:1', '4:5', '3:4', '4:3', '16:9', '9:16', '3:2', '2:3'] },
      range('l', 'Left %', 0, 90, 10), range('t', 'Top %', 0, 90, 10), range('w', 'Width %', 10, 100, 80), range('h', 'Height % (free only)', 10, 100, 80)
    ],
    apply: function (s, v) {
      var sw = W(s), sh = H(s);
      var x0 = sw * v.l / 100, y0 = sh * v.t / 100, cw = sw * v.w / 100, ch = sh * v.h / 100;
      if (v.ar !== 'free') { var p = v.ar.split(':'); ch = cw * p[1] / p[0]; }
      cw = Math.min(cw, sw - x0); ch = Math.min(ch, sh - y0);
      if (v.ar !== 'free') { var p2 = v.ar.split(':'), r = p2[0] / p2[1]; if (cw / ch > r) cw = ch * r; else ch = cw / r; }
      var c = canvasOf(cw, ch);
      c.getContext('2d').drawImage(s, x0, y0, cw, ch, 0, 0, c.width, c.height);
      return c;
    } });
  imageTool({ id: 'rotate', name: 'Rotate Image', desc: '90°/180° ya koi bhi angle', icon: '🔃',
    params: [range('a', 'Angle °', -180, 180, 90), { key: 'bg', label: 'Background', type: 'color', value: '#ffffff' }],
    apply: function (s, v) {
      var rad = v.a * Math.PI / 180, sw = W(s), sh = H(s);
      var cw = Math.abs(sw * Math.cos(rad)) + Math.abs(sh * Math.sin(rad));
      var ch = Math.abs(sw * Math.sin(rad)) + Math.abs(sh * Math.cos(rad));
      var c = canvasOf(cw, ch), x = c.getContext('2d');
      if (v.a % 90 !== 0) { x.fillStyle = v.bg; x.fillRect(0, 0, c.width, c.height); }
      x.translate(c.width / 2, c.height / 2); x.rotate(rad); x.drawImage(s, -sw / 2, -sh / 2, sw, sh);
      return c;
    } });
  imageTool({ id: 'flip', name: 'Flip Image', desc: 'Horizontal / vertical flip', icon: '↔️',
    params: [{ key: 'd', label: 'Direction', type: 'select', options: [{ value: 'h', label: 'Horizontal' }, { value: 'v', label: 'Vertical' }, { value: 'b', label: 'Both' }] }],
    apply: function (s, v) {
      var c = canvasOf(W(s), H(s)), x = c.getContext('2d');
      var fx = v.d !== 'v' ? -1 : 1, fy = v.d !== 'h' ? -1 : 1;
      x.translate(fx < 0 ? c.width : 0, fy < 0 ? c.height : 0); x.scale(fx, fy);
      x.drawImage(s, 0, 0, c.width, c.height);
      return c;
    } });
  function roundRectPath(x, X, Y, w, hh, r) {
    r = Math.min(r, w / 2, hh / 2);
    x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + hh, r); x.arcTo(X + w, Y + hh, X, Y + hh, r);
    x.arcTo(X, Y + hh, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath();
  }
  imageTool({ id: 'round', name: 'Round Corners', desc: 'Gol kinare (PNG)', icon: '▢', defaultFmt: 'image/png',
    params: [range('r', 'Radius %', 0, 50, 12)],
    apply: function (s, v) {
      var c = canvasOf(W(s), H(s)), x = c.getContext('2d');
      roundRectPath(x, 0, 0, c.width, c.height, Math.min(c.width, c.height) * v.r / 100);
      x.clip(); x.drawImage(s, 0, 0, c.width, c.height);
      return c;
    } });
  imageTool({ id: 'circle', name: 'Circle Crop', desc: 'Gol DP photo (PNG)', icon: '⭕', defaultFmt: 'image/png',
    params: [{ key: 'ring', label: 'Ring color', type: 'color', value: '#ffffff' }, range('rw', 'Ring width %', 0, 10, 0)],
    apply: function (s, v) {
      var d = Math.min(W(s), H(s)), c = canvasOf(d, d), x = c.getContext('2d');
      x.beginPath(); x.arc(d / 2, d / 2, d / 2, 0, Math.PI * 2); x.save(); x.clip();
      x.drawImage(s, (W(s) - d) / 2, (H(s) - d) / 2, d, d, 0, 0, d, d); x.restore();
      if (v.rw > 0) { var lw = d * v.rw / 100; x.lineWidth = lw; x.strokeStyle = v.ring; x.beginPath(); x.arc(d / 2, d / 2, d / 2 - lw / 2, 0, Math.PI * 2); x.stroke(); }
      return c;
    } });
  imageTool({ id: 'border', name: 'Add Border', desc: 'Photo ke charo taraf border', icon: '🖼️',
    params: [range('b', 'Border %', 1, 20, 4), { key: 'c', label: 'Color', type: 'color', value: '#ffffff' }],
    apply: function (s, v) {
      var b = Math.round(Math.max(W(s), H(s)) * v.b / 100), c = canvasOf(W(s) + 2 * b, H(s) + 2 * b), x = c.getContext('2d');
      x.fillStyle = v.c; x.fillRect(0, 0, c.width, c.height); x.drawImage(s, b, b, W(s), H(s));
      return c;
    } });
  imageTool({ id: 'padding', name: 'Square Padding', desc: 'Instagram ke liye square/4:5 canvas', icon: '⬜',
    params: [{ key: 'ar', label: 'Canvas ratio', type: 'select', options: ['1:1', '4:5', '9:16', '16:9'] },
      { key: 'blur', label: 'Blurred photo background', type: 'toggle', value: true }, { key: 'c', label: 'Color (if not blur)', type: 'color', value: '#ffffff' }],
    apply: function (s, v) {
      var p = v.ar.split(':'), r = p[0] / p[1], sw = W(s), sh = H(s), cw, ch;
      if (sw / sh > r) { cw = sw; ch = sw / r; } else { ch = sh; cw = sh * r; }
      var c = canvasOf(cw, ch), x = c.getContext('2d');
      if (v.blur) { var bg = drawTo(s, cw, ch, 'cover'); x.drawImage(boxBlur(bg, cw / 30), 0, 0); x.fillStyle = 'rgba(0,0,0,.15)'; x.fillRect(0, 0, cw, ch); }
      else { x.fillStyle = v.c; x.fillRect(0, 0, cw, ch); }
      x.drawImage(s, (cw - sw) / 2, (ch - sh) / 2, sw, sh);
      return c;
    } });
  imageTool({ id: 'compress', name: 'Compress Image', desc: 'File size kam karein (quality slider)', icon: '🗜️',
    params: [range('max', 'Max side px (0 = original)', 0, 4000, 1600, 100)],
    apply: function (s, v, o) { if (!v.max || o.preview) return copy(s); return copy(downscale(s, v.max)); } });
  imageTool({ id: 'convert', name: 'Convert Format', desc: 'JPG ⇄ PNG ⇄ WEBP', icon: '🔁', defaultFmt: 'image/png',
    params: [{ key: 'bg', label: 'Background for JPG (transparent areas)', type: 'color', value: '#ffffff' }],
    apply: function (s, v) {
      var c = canvasOf(W(s), H(s)), x = c.getContext('2d');
      if (v.fmt === 'image/jpeg') { x.fillStyle = v.bg; x.fillRect(0, 0, c.width, c.height); }
      x.drawImage(s, 0, 0, c.width, c.height); return c;
    } });
  imageTool({ id: 'thumbnail', name: 'Thumbnail Maker', desc: 'YouTube 1280×720 / square thumbs', icon: '🎞️',
    params: [{ key: 'sz', label: 'Size', type: 'select', options: ['1280x720', '1080x1080', '1080x1350', '1080x1920', '320x180', '150x150'] }],
    apply: function (s, v, o) { var p = v.sz.split('x'), w = +p[0], hh = +p[1]; if (o.preview) { var k = Math.min(1, 700 / w); w *= k; hh *= k; } return drawTo(s, w, hh, 'cover'); } });
  imageTool({ id: 'passport', name: 'Passport Photo', desc: '35×45mm photo + 4×6 print sheet', icon: '🪪',
    params: [{ key: 'sheet', label: 'Print sheet (8 photos on 4×6 in)', type: 'toggle', value: true }, { key: 'bg', label: 'Sheet color', type: 'color', value: '#ffffff' }],
    apply: function (s, v, o) {
      var dpi = o.preview ? 100 : 300, pw = 35 / 25.4 * dpi, ph = 45 / 25.4 * dpi;
      var one = drawTo(s, pw, ph, 'cover');
      if (!v.sheet) return one;
      var c = canvasOf(6 * dpi, 4 * dpi), x = c.getContext('2d'); x.fillStyle = v.bg; x.fillRect(0, 0, c.width, c.height);
      var gap = 0.1 * dpi, cols = 4, rows = 2, ox = (c.width - cols * pw - (cols - 1) * gap) / 2, oy = (c.height - rows * ph - (rows - 1) * gap) / 2;
      x.strokeStyle = '#999'; x.lineWidth = 1;
      for (var r = 0; r < rows; r++) for (var k = 0; k < cols; k++) { var X = ox + k * (pw + gap), Y = oy + r * (ph + gap); x.drawImage(one, X, Y); x.strokeRect(X, Y, pw, ph); }
      return c;
    } });
  function drawText(x, txt, X, Y, size, color, opt) {
    opt = opt || {};
    x.font = (opt.bold === false ? '' : 'bold ') + size + 'px ' + (opt.font || 'sans-serif');
    x.textAlign = opt.align || 'center'; x.textBaseline = opt.base || 'middle';
    if (opt.stroke) { x.lineWidth = size / 8; x.strokeStyle = opt.stroke; x.lineJoin = 'round'; x.strokeText(txt, X, Y); }
    if (opt.shadow) { x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = size / 6; }
    x.fillStyle = color; x.fillText(txt, X, Y); x.shadowBlur = 0; x.shadowColor = 'transparent';
  }
  function wrapLines(x, text, maxW) {
    var out = [];
    String(text).split('\n').forEach(function (para) {
      var words = para.split(' '), line = '';
      words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
      out.push(line);
    });
    return out;
  }
  var posOpts = [{ value: 'br', label: 'Bottom right' }, { value: 'bl', label: 'Bottom left' }, { value: 'c', label: 'Center' }, { value: 'tr', label: 'Top right' }, { value: 'tl', label: 'Top left' }, { value: 'tile', label: 'Tiled' }];
  imageTool({ id: 'watermark', name: 'Watermark', desc: 'Photo par apna naam/logo text', icon: '©️',
    params: [{ key: 't', label: 'Watermark text', type: 'text', value: '© ToolBox' }, { key: 'pos', label: 'Position', type: 'select', options: posOpts },
      range('sz', 'Size %', 2, 20, 5), range('op', 'Opacity %', 5, 100, 50), { key: 'c', label: 'Color', type: 'color', value: '#ffffff' }],
    apply: function (s, v) {
      var c = copy(s), x = c.getContext('2d'), size = Math.max(8, c.width * v.sz / 100), m = size;
      x.globalAlpha = v.op / 100;
      if (v.pos === 'tile') {
        x.save(); x.translate(c.width / 2, c.height / 2); x.rotate(-Math.PI / 6);
        var diag = Math.hypot(c.width, c.height);
        x.font = 'bold ' + size + 'px sans-serif'; var tw = x.measureText(v.t).width + size * 2;
        for (var yy = -diag / 2; yy < diag / 2; yy += size * 3) for (var xx = -diag / 2; xx < diag / 2; xx += tw) drawText(x, v.t, xx, yy, size, v.c, { align: 'left' });
        x.restore();
      } else {
        var X = v.pos[1] === 'r' ? c.width - m : v.pos[1] === 'l' ? m : c.width / 2;
        var Y = v.pos[0] === 'b' ? c.height - m : v.pos[0] === 't' ? m : c.height / 2;
        drawText(x, v.t, X, Y, size, v.c, { align: v.pos === 'c' ? 'center' : (v.pos[1] === 'r' ? 'right' : 'left'), shadow: true });
      }
      x.globalAlpha = 1; return c;
    } });
  imageTool({ id: 'addtext', name: 'Add Text', desc: 'Photo par text likhein', icon: '🔤',
    params: [{ key: 't', label: 'Text', type: 'text', value: 'Har Har Mahadev' }, range('y', 'Vertical position %', 0, 100, 85), range('sz', 'Size %', 2, 25, 8),
      { key: 'c', label: 'Text color', type: 'color', value: '#ffffff' }, { key: 'st', label: 'Outline', type: 'toggle', value: true },
      { key: 'font', label: 'Font', type: 'select', options: ['sans-serif', 'serif', 'monospace', 'cursive', 'Impact'] }],
    apply: function (s, v) {
      var c = copy(s), x = c.getContext('2d'), size = c.width * v.sz / 100;
      x.font = 'bold ' + size + 'px ' + v.font;
      var lines = wrapLines(x, v.t, c.width * 0.9), y0 = c.height * v.y / 100 - (lines.length - 1) * size * 0.6;
      lines.forEach(function (l, i) { drawText(x, l, c.width / 2, y0 + i * size * 1.2, size, v.c, { font: v.font, stroke: v.st ? '#000' : null, shadow: !v.st }); });
      return c;
    } });
  imageTool({ id: 'meme', name: 'Meme Generator', desc: 'Top & bottom meme text', icon: '😂',
    params: [{ key: 'top', label: 'Top text', type: 'text', value: 'JAB CODE' }, { key: 'bot', label: 'Bottom text', type: 'text', value: 'PEHLI BAAR CHAL JAYE' }, range('sz', 'Size %', 4, 16, 9)],
    apply: function (s, v) {
      var c = copy(s), x = c.getContext('2d'), size = c.width * v.sz / 100, f = 'Impact, "Arial Black", sans-serif';
      x.font = 'bold ' + size + 'px ' + f;
      wrapLines(x, String(v.top).toUpperCase(), c.width * 0.94).forEach(function (l, i) { drawText(x, l, c.width / 2, size * 0.7 + i * size * 1.1, size, '#fff', { font: f, stroke: '#000' }); });
      var bl = wrapLines(x, String(v.bot).toUpperCase(), c.width * 0.94);
      bl.forEach(function (l, i) { drawText(x, l, c.width / 2, c.height - size * 0.7 - (bl.length - 1 - i) * size * 1.1, size, '#fff', { font: f, stroke: '#000' }); });
      return c;
    } });
  imageTool({ id: 'polaroid', name: 'Polaroid Frame', desc: 'Polaroid style frame + caption', icon: '🖼', 
    params: [{ key: 't', label: 'Caption', type: 'text', value: 'Yaadein ❤️' }, range('rot', 'Tilt °', -10, 10, -3)],
    apply: function (s, v) {
      var d = Math.min(W(s), H(s)), pad = d * 0.06, fw = d + 2 * pad, fh = d + pad + d * 0.22;
      var f = canvasOf(fw, fh), fx = f.getContext('2d');
      fx.fillStyle = '#fbfaf6'; fx.fillRect(0, 0, fw, fh);
      fx.drawImage(s, (W(s) - d) / 2, (H(s) - d) / 2, d, d, pad, pad, d, d);
      drawText(fx, v.t, fw / 2, d + pad + d * 0.11, d * 0.07, '#333', { font: 'cursive', bold: false });
      var rad = v.rot * Math.PI / 180, cw = Math.abs(fw * Math.cos(rad)) + Math.abs(fh * Math.sin(rad)) + pad, ch = Math.abs(fw * Math.sin(rad)) + Math.abs(fh * Math.cos(rad)) + pad;
      var c = canvasOf(cw, ch), x = c.getContext('2d'); x.fillStyle = '#e9e4ef'; x.fillRect(0, 0, cw, ch);
      x.translate(cw / 2, ch / 2); x.rotate(rad); x.shadowColor = 'rgba(0,0,0,.3)'; x.shadowBlur = pad / 2; x.drawImage(f, -fw / 2, -fh / 2);
      return c;
    } });
  imageTool({ id: 'mirror', name: 'Mirror Effect', desc: 'Aadha photo mirror (symmetry)', icon: '🪞',
    params: [{ key: 'side', label: 'Mode', type: 'select', options: [{ value: 'l', label: 'Left → Right' }, { value: 'r', label: 'Right → Left' }, { value: 't', label: 'Top → Bottom' }, { value: 'b', label: 'Bottom → Top' }] }],
    apply: function (s, v) {
      var c = copy(s), x = c.getContext('2d'), w = c.width, hh = c.height;
      x.save();
      if (v.side === 'l' || v.side === 'r') {
        var hw = Math.floor(w / 2);
        x.translate(w, 0); x.scale(-1, 1);
        if (v.side === 'l') x.drawImage(s, 0, 0, hw, hh, 0, 0, hw, hh); else x.drawImage(s, w - hw, 0, hw, hh, w - hw, 0, hw, hh);
      } else {
        var hh2 = Math.floor(hh / 2);
        x.translate(0, hh); x.scale(1, -1);
        if (v.side === 't') x.drawImage(s, 0, 0, w, hh2, 0, 0, w, hh2); else x.drawImage(s, 0, hh - hh2, w, hh2, 0, hh - hh2, w, hh2);
      }
      x.restore(); return c;
    } });
  imageTool({ id: 'bgfill', name: 'Background Fill', desc: 'Transparent PNG ka background bharein', icon: '🪣',
    params: [{ key: 'c', label: 'Background color', type: 'color', value: '#ffffff' }],
    apply: function (s, v) { var c = canvasOf(W(s), H(s)), x = c.getContext('2d'); x.fillStyle = v.c; x.fillRect(0, 0, c.width, c.height); x.drawImage(s, 0, 0, c.width, c.height); return c; } });

  /* ================= CUSTOM IMAGE TOOLS ================= */
  function fileButton(label, accept, multiple, onFiles) {
    var inp = h('input', { type: 'file', accept: accept, multiple: multiple || null, style: { display: 'none' } });
    inp.addEventListener('change', function () { var fs = Array.prototype.slice.call(inp.files || []); if (fs.length) onFiles(fs); inp.value = ''; });
    return h('div', { class: 'field' }, h('button', { class: 'btn', onclick: function () { inp.click(); } }, label), inp);
  }
  window.fileButton = fileButton;
  function errBox(out, e) { console.error(e); out.innerHTML = ''; out.appendChild(h('div', { class: 'err' }, '⚠️ ' + (e && e.message || e))); }
  window.errBox = errBox;

  function custom(def) { def.cat = 'photo'; tool(def); }

  custom({ id: 'imginfo', name: 'Image Info', desc: 'Size, resolution, type, megapixels', icon: 'ℹ️',
    render: function (host) {
      var out = h('div', { class: 'calc-out' });
      host.appendChild(fileButton('📁 Choose image', 'image/*', false, function (fs) {
        var f = fs[0];
        loadImage(f).then(function (img) {
          var g = function (a, b) { return b ? g(b, a % b) : a; }, d = g(img.naturalWidth, img.naturalHeight);
          out.innerHTML = '';
          [['Name', f.name], ['Type', f.type || '?'], ['File size', fmtSize(f.size)], ['Resolution', img.naturalWidth + ' × ' + img.naturalHeight],
            ['Megapixels', (img.naturalWidth * img.naturalHeight / 1e6).toFixed(2) + ' MP'], ['Aspect ratio', (img.naturalWidth / d) + ':' + (img.naturalHeight / d)],
            ['Last modified', f.lastModified ? new Date(f.lastModified).toLocaleString() : '-']].forEach(function (r) { out.appendChild(h('div', { class: 'stat' }, h('span', {}, r[0]), h('strong', {}, String(r[1])))); });
          out.appendChild(h('div', { class: 'preview' }, img));
        }).catch(function (e) { errBox(out, e); });
      }));
      host.appendChild(out);
    } });

  custom({ id: 'img2b64', name: 'Image → Base64', desc: 'Data URI code banayein', icon: '🧬',
    render: function (host) {
      var out = h('div', { class: 'out' });
      host.appendChild(fileButton('📁 Choose image', 'image/*', false, function (fs) {
        var r = new FileReader();
        r.onload = function () {
          out.innerHTML = '';
          var pre = h('textarea', { class: 'ta', readonly: true }); pre.value = r.result;
          out.appendChild(h('div', { class: 'out-head' }, h('span', {}, fmtSize(r.result.length) + ' characters'),
            h('button', { class: 'btn-sm', onclick: function () { copyText(r.result); } }, 'Copy')));
          out.appendChild(pre);
        };
        r.readAsDataURL(fs[0]);
      }));
      host.appendChild(out);
    } });

  custom({ id: 'colorpick', name: 'Color Picker', desc: 'Photo par tap karke HEX/RGB color', icon: '🎯',
    render: function (host) {
      var out = h('div', { class: 'calc-out' }), prev = h('div', { class: 'preview' }, h('div', { class: 'ph' }, 'Image choose karein, phir uspar tap karein'));
      var palette = h('div', { class: 'thumbs' });
      host.appendChild(fileButton('📁 Choose image', 'image/*', false, function (fs) {
        loadImage(fs[0]).then(function (img) {
          var c = copy(downscale(img, 1200)); prev.innerHTML = ''; prev.appendChild(c); c.style.cursor = 'crosshair';
          c.addEventListener('click', function (e) {
            var rc = c.getBoundingClientRect(), X = (e.clientX - rc.left) * c.width / rc.width, Y = (e.clientY - rc.top) * c.height / rc.height;
            var d = c.getContext('2d').getImageData(X, Y, 1, 1).data, hex = '#' + [d[0], d[1], d[2]].map(function (n) { return ('0' + n.toString(16)).slice(-2); }).join('').toUpperCase();
            showColor(hex, d);
          });
          // dominant palette
          var sm = drawTo(img, 60, 60, 'stretch'), dd = sm.getContext('2d').getImageData(0, 0, 60, 60).data, bins = {};
          for (var i = 0; i < dd.length; i += 4) { var k = (dd[i] >> 5) + ',' + (dd[i + 1] >> 5) + ',' + (dd[i + 2] >> 5); bins[k] = bins[k] || [0, 0, 0, 0]; bins[k][0]++; bins[k][1] += dd[i]; bins[k][2] += dd[i + 1]; bins[k][3] += dd[i + 2]; }
          palette.innerHTML = '';
          Object.keys(bins).map(function (k) { return bins[k]; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, 8).forEach(function (b) {
            var rgb = [b[1] / b[0], b[2] / b[0], b[3] / b[0]].map(Math.round), hex = '#' + rgb.map(function (n) { return ('0' + n.toString(16)).slice(-2); }).join('').toUpperCase();
            palette.appendChild(h('button', { class: 'btn-sm', style: { background: hex, color: (rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114) > 140 ? '#000' : '#fff' }, onclick: function () { showColor(hex, rgb); } }, hex));
          });
        }).catch(function (e) { errBox(out, e); });
      }));
      function showColor(hex, d) {
        out.innerHTML = '';
        out.appendChild(h('div', { class: 'stat', style: { background: hex } }, h('span', {}, ' '), h('strong', {}, ' ')));
        out.appendChild(h('div', { class: 'stat' }, h('span', {}, 'HEX'), h('strong', {}, hex), h('button', { class: 'btn-sm', onclick: function () { copyText(hex); } }, 'Copy')));
        out.appendChild(h('div', { class: 'stat' }, h('span', {}, 'RGB'), h('strong', {}, 'rgb(' + d[0] + ', ' + d[1] + ', ' + d[2] + ')')));
      }
      host.appendChild(prev); host.appendChild(h('div', { class: 'out-head' }, h('span', {}, 'Main colors'))); host.appendChild(palette); host.appendChild(out);
    } });

  custom({ id: 'favicon', name: 'Favicon / Icon Pack', desc: 'Sab sizes ke PNG icons (ZIP)', icon: '⭐',
    render: function (host) {
      var out = h('div', { class: 'out' });
      host.appendChild(fileButton('📁 Choose square logo', 'image/*', false, function (fs) {
        loadImage(fs[0]).then(function (img) {
          var sizes = [16, 32, 48, 64, 128, 180, 192, 256, 512, 1024];
          return Promise.all(sizes.map(function (sz) { return toBlob(drawTo(img, sz, sz, 'contain'), 'image/png').then(function (b) { return { name: 'icon-' + sz + 'x' + sz + '.png', blob: b }; }); }))
            .then(function (files) { out.innerHTML = ''; out.appendChild(h('div', { class: 'ok' }, '✅ ' + files.length + ' icons ban gaye')); return zipFiles(files, 'icon-pack.zip'); });
        }).catch(function (e) { errBox(out, e); });
      }));
      host.appendChild(out);
    } });

  function multiImageTool(def) {
    custom({ id: def.id, name: def.name, desc: def.desc, icon: def.icon,
      render: function (host) {
        var imgs = [], list = h('div', { class: 'thumbs' }), prev = h('div', { class: 'preview' }, h('div', { class: 'ph' }, 'Kai images select karein')), out = h('div', { class: 'out' });
        var controls = paramControls(def.params || [], function () { draw(); });
        function draw() { if (!imgs.length) return; try { var c = def.apply(imgs.map(function (i) { return downscale(i, 600); }), controls.vals, { preview: true }); prev.innerHTML = ''; prev.appendChild(c); } catch (e) { errBox(out, e); } }
        host.appendChild(fileButton('📁 Add images', 'image/*', true, function (fs) {
          Promise.all(fs.map(loadImage)).then(function (arr) { arr.forEach(function (im) { imgs.push(im); list.appendChild(h('img', { src: im.src })); }); draw(); }).catch(function (e) { errBox(out, e); });
        }));
        host.appendChild(list);
        host.appendChild(h('button', { class: 'btn-sm', onclick: function () { imgs = []; list.innerHTML = ''; prev.innerHTML = ''; } }, 'Clear'));
        host.appendChild(prev); host.appendChild(controls.el);
        var btn = h('button', { class: 'btn-filled', onclick: function () {
          if (imgs.length < (def.min || 1)) return toast('Kam se kam ' + (def.min || 1) + ' images chahiye');
          try {
            var c = def.apply(imgs.map(function (i) { return downscale(i, def.maxSide || 2000); }), controls.vals, { preview: false });
            toBlob(c, 'image/jpeg', 0.92).then(function (b) { out.innerHTML = ''; out.appendChild(h('div', { class: 'ok' }, '✅ ' + c.width + '×' + c.height + ' · ' + fmtSize(b.size))); download(b, def.id + '.jpg'); });
          } catch (e) { errBox(out, e); }
        } }, '💾 Create & Save');
        host.appendChild(h('div', { class: 'actions' }, btn)); host.appendChild(out);
      } });
  }
  multiImageTool({ id: 'collage', name: 'Photo Collage', desc: 'Grid collage banayein', icon: '🧩', min: 2, maxSide: 1200,
    params: [range('cols', 'Columns', 1, 5, 2), range('gap', 'Gap px', 0, 40, 8), { key: 'bg', label: 'Background', type: 'color', value: '#ffffff' }, range('cell', 'Cell size px', 200, 1200, 600, 50)],
    apply: function (arr, v, o) {
      var cols = Math.min(v.cols, arr.length), rows = Math.ceil(arr.length / cols), cell = o.preview ? Math.min(v.cell, 300) : v.cell, gap = o.preview ? v.gap / 2 : v.gap;
      var c = canvasOf(cols * cell + (cols + 1) * gap, rows * cell + (rows + 1) * gap), x = c.getContext('2d');
      x.fillStyle = v.bg; x.fillRect(0, 0, c.width, c.height);
      arr.forEach(function (im, i) { x.drawImage(drawTo(im, cell, cell, 'cover'), gap + (i % cols) * (cell + gap), gap + Math.floor(i / cols) * (cell + gap)); });
      return c;
    } });
  multiImageTool({ id: 'merge', name: 'Merge Images', desc: 'Images ko side-by-side ya upar-niche jodein', icon: '➕', min: 2,
    params: [{ key: 'dir', label: 'Direction', type: 'select', options: [{ value: 'v', label: 'Vertical (stack)' }, { value: 'h', label: 'Horizontal' }] }, range('gap', 'Gap px', 0, 50, 0), { key: 'bg', label: 'Background', type: 'color', value: '#ffffff' }],
    apply: function (arr, v) {
      var vert = v.dir === 'v', base = vert ? Math.min.apply(null, arr.map(W)) : Math.min.apply(null, arr.map(H));
      var sized = arr.map(function (im) { return vert ? [base, H(im) * base / W(im)] : [W(im) * base / H(im), base]; });
      var tot = sized.reduce(function (a, s) { return a + (vert ? s[1] : s[0]); }, 0) + v.gap * (arr.length - 1);
      var c = vert ? canvasOf(base, tot) : canvasOf(tot, base), x = c.getContext('2d'), p = 0;
      x.fillStyle = v.bg; x.fillRect(0, 0, c.width, c.height);
      arr.forEach(function (im, i) { var s = sized[i]; if (vert) { x.drawImage(im, 0, p, s[0], s[1]); p += s[1] + v.gap; } else { x.drawImage(im, p, 0, s[0], s[1]); p += s[0] + v.gap; } });
      return c;
    } });
  multiImageTool({ id: 'contactsheet', name: 'Contact Sheet', desc: 'Sab photos ek sheet par numbered', icon: '📋', min: 1, maxSide: 800,
    params: [range('cols', 'Columns', 2, 8, 4), { key: 'num', label: 'Show numbers', type: 'toggle', value: true }],
    apply: function (arr, v, o) {
      var cell = o.preview ? 150 : 400, gap = cell / 20, lab = v.num ? cell / 8 : 0, cols = Math.min(v.cols, arr.length), rows = Math.ceil(arr.length / cols);
      var c = canvasOf(cols * (cell + gap) + gap, rows * (cell + gap + lab) + gap), x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      arr.forEach(function (im, i) { var X = gap + (i % cols) * (cell + gap), Y = gap + Math.floor(i / cols) * (cell + gap + lab); x.drawImage(drawTo(im, cell, cell, 'contain'), X, Y); if (v.num) drawText(x, '#' + (i + 1), X + cell / 2, Y + cell + lab / 2, lab * 0.7, '#333', { bold: false }); });
      return c;
    } });

  custom({ id: 'splitgrid', name: 'Split Grid', desc: 'Instagram grid ke liye tukde (ZIP)', icon: '🔲',
    render: function (host) {
      var img = null, prev = h('div', { class: 'preview' }, h('div', { class: 'ph' }, 'Image choose karein')), out = h('div', { class: 'out' });
      var controls = paramControls([range('cols', 'Columns', 1, 6, 3), range('rows', 'Rows', 1, 6, 3)], function () { draw(); });
      function draw() {
        if (!img) return; var c = copy(downscale(img, 800)), x = c.getContext('2d'), v = controls.vals; x.strokeStyle = '#fff'; x.lineWidth = 3;
        for (var i = 1; i < v.cols; i++) { x.beginPath(); x.moveTo(c.width * i / v.cols, 0); x.lineTo(c.width * i / v.cols, c.height); x.stroke(); }
        for (var j = 1; j < v.rows; j++) { x.beginPath(); x.moveTo(0, c.height * j / v.rows); x.lineTo(c.width, c.height * j / v.rows); x.stroke(); }
        prev.innerHTML = ''; prev.appendChild(c);
      }
      host.appendChild(fileButton('📁 Choose image', 'image/*', false, function (fs) { loadImage(fs[0]).then(function (i) { img = i; draw(); }); }));
      host.appendChild(prev); host.appendChild(controls.el);
      host.appendChild(h('div', { class: 'actions' }, h('button', { class: 'btn-filled', onclick: function () {
        if (!img) return toast('Pehle image select karein');
        var v = controls.vals, tw = img.naturalWidth / v.cols, th = img.naturalHeight / v.rows, jobs = [], n = 0;
        for (var r = 0; r < v.rows; r++) for (var k = 0; k < v.cols; k++) (function (r, k, idx) {
          var c = canvasOf(tw, th); c.getContext('2d').drawImage(img, k * tw, r * th, tw, th, 0, 0, c.width, c.height);
          jobs.push(toBlob(c, 'image/jpeg', 0.93).then(function (b) { return { name: 'part-' + idx + '-r' + (r + 1) + 'c' + (k + 1) + '.jpg', blob: b }; }));
        })(r, k, ++n);
        Promise.all(jobs).then(function (files) { out.innerHTML = ''; out.appendChild(h('div', { class: 'ok' }, '✅ ' + files.length + ' tukde (Instagram par last se pehle post karein)')); return zipFiles(files, 'grid-split.zip'); }).catch(function (e) { errBox(out, e); });
      } }, '✂️ Split & Save ZIP')));
      host.appendChild(out);
    } });

  custom({ id: 'qrcode', name: 'QR Code Generator', desc: 'Text/link/UPI ka QR code', icon: '🔳',
    render: function (host) {
      var prev = h('div', { class: 'preview' }, h('div', { class: 'ph' }, 'Text likhein'));
      var canvas = null;
      var controls = paramControls([{ key: 't', label: 'Text / URL / UPI', type: 'text', value: 'https://instagram.com/' },
        range('sz', 'Size px', 200, 1200, 600, 50), { key: 'fg', label: 'Color', type: 'color', value: '#000000' }, { key: 'bg', label: 'Background', type: 'color', value: '#ffffff' },
        { key: 'ec', label: 'Error correction', type: 'select', options: ['M', 'L', 'Q', 'H'] }], function () { draw(); });
      function draw() {
        var v = controls.vals; if (!v.t) { prev.innerHTML = ''; return; }
        try { canvas = makeQR(v.t, v.sz, v.fg, v.bg, v.ec); prev.innerHTML = ''; prev.appendChild(canvas); } catch (e) { prev.innerHTML = ''; prev.appendChild(h('div', { class: 'err' }, '⚠️ ' + e.message)); }
      }
      host.appendChild(controls.el); host.appendChild(prev);
      host.appendChild(h('div', { class: 'actions' }, h('button', { class: 'btn-filled', onclick: function () { if (!canvas) return toast('Text likhein'); toBlob(canvas, 'image/png').then(function (b) { download(b, 'qrcode.png'); }); } }, '💾 Save PNG')));
      setTimeout(draw, 0);
    } });

  window.makeQR = function (text, size, fg, bg, ec) {
    if (!window.qrcode) throw new Error('QR engine load nahi hua');
    var q = qrcode(0, ec || 'M'); q.addData(unescape(encodeURIComponent(text)), 'Byte'); q.make();
    var n = q.getModuleCount(), quiet = 4, cell = Math.max(1, Math.floor(size / (n + quiet * 2))), dim = cell * (n + quiet * 2);
    var c = canvasOf(dim, dim), x = c.getContext('2d'); x.fillStyle = bg || '#fff'; x.fillRect(0, 0, dim, dim); x.fillStyle = fg || '#000';
    for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect((k + quiet) * cell, (r + quiet) * cell, cell, cell);
    return c;
  };

})();
