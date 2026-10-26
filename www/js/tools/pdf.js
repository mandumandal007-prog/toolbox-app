/* ==========================================================
   PDF TOOLS — pdf-lib (edit) + pdf.js (render/read), bundled offline
   ========================================================== */
(function () {
  if (window.pdfjsLib) { try { pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; } catch (e) {} }

  function readBuf(f) { return f.arrayBuffer ? f.arrayBuffer() : new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsArrayBuffer(f); }); }
  function baseName(f) { return (f && f.name || 'file').replace(/\.[^.]+$/, ''); }
  function loadPdf(buf) { return PDF().PDFDocument.load(buf, { ignoreEncryption: true }); }
  function pdfjs(buf) {
    if (!window.pdfjsLib) return Promise.reject(new Error('PDF reader load nahi hua'));
    return pdfjsLib.getDocument({ data: new Uint8Array(buf.slice ? buf.slice(0) : buf) }).promise;
  }
  function renderPage(doc, n, scale) {
    return doc.getPage(n).then(function (page) {
      var vp = page.getViewport({ scale: scale }), c = canvasOf(vp.width, vp.height), x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      return page.render({ canvasContext: x, viewport: vp }).promise.then(function () { return c; });
    });
  }
  window.pdfRender = renderPage; window.pdfjsOpen = pdfjs;
  function save(doc) { return doc.save({ useObjectStreams: true }).then(function (b) { return bytesToBlob(b); }); }
  function safe(font, s) {
    s = String(s == null ? '' : s); var o = '';
    for (var i = 0; i < s.length; i++) { var ch = s[i]; try { font.encodeText(ch); o += ch; } catch (e) { o += '?'; } }
    return o;
  }
  function rgb(hex) { var a = hex2rgb(hex); return PDF().rgb(a[0] / 255, a[1] / 255, a[2] / 255); }

  /* generic PDF tool */
  function pdfTool(def) {
    tool({ id: def.id, name: def.name, desc: def.desc, cat: 'pdf', icon: def.icon || '📄',
      render: function (host) {
        var files = [], list = h('div', { class: 'filelist' }), out = h('div', { class: 'out' });
        var controls = paramControls(def.params || []);
        function refresh() {
          list.innerHTML = '';
          files.forEach(function (f, i) {
            list.appendChild(h('div', { class: 'fileitem' }, h('span', {}, (i + 1) + '. ' + f.name),
              h('small', {}, fmtSize(f.size) + ' ', h('button', { class: 'btn-sm', onclick: function () { files.splice(i, 1); refresh(); } }, '✕'))));
          });
          if (def.onFiles && files.length) def.onFiles(files, out);
        }
        if (def.accept !== false) {
          host.appendChild(fileButton(def.multiple ? '📁 Add files' : '📁 Choose ' + (def.acceptLabel || 'PDF'), def.accept || 'application/pdf,.pdf', !!def.multiple, function (fs) {
            if (def.multiple) files = files.concat(fs); else files = [fs[0]];
            refresh();
          }));
          host.appendChild(list);
        }
        host.appendChild(controls.el);
        var btn = h('button', { class: 'btn-filled', onclick: function () {
          if (def.accept !== false && files.length < (def.min || 1)) return toast(def.min > 1 ? 'Kam se kam ' + def.min + ' files chahiye' : 'Pehle file select karein');
          btn.disabled = true; var old = btn.textContent; btn.textContent = 'Processing…';
          out.innerHTML = '';
          Promise.resolve().then(function () { return def.run(files, controls.vals, out); }).then(function (res) {
            if (!res) return;
            var arr = Array.isArray(res) ? res : [res];
            if (arr.length === 1) {
              out.appendChild(h('div', { class: 'ok' }, '✅ Ready: ' + arr[0].name + ' · ' + fmtSize(arr[0].blob.size) + (arr[0].note ? ' · ' + arr[0].note : '')));
              return download(arr[0].blob, arr[0].name);
            }
            out.appendChild(h('div', { class: 'ok' }, '✅ ' + arr.length + ' files ready (ZIP)'));
            return zipFiles(arr, (def.zipName || def.id) + '.zip');
          }).catch(function (e) { errBox(out, e && e.message && /encrypt/i.test(e.message) ? new Error('Ye PDF password-protected hai') : e); })
            .then(function () { btn.disabled = false; btn.textContent = old; });
        } }, def.button || '⚡ Process & Save');
        host.appendChild(h('div', { class: 'actions' }, btn));
        host.appendChild(out);
      } });
  }

  pdfTool({ id: 'pdfmerge', name: 'Merge PDF', desc: 'Kai PDFs ko ek mein jodein', icon: '📚', multiple: true, min: 2,
    run: function (files) {
      return PDF().PDFDocument.create().then(function (outDoc) {
        return files.reduce(function (p, f) {
          return p.then(function () { return readBuf(f); }).then(loadPdf).then(function (src) { return outDoc.copyPages(src, src.getPageIndices()); }).then(function (pages) { pages.forEach(function (pg) { outDoc.addPage(pg); }); });
        }, Promise.resolve()).then(function () { return save(outDoc); }).then(function (b) { return { name: 'merged.pdf', blob: b }; });
      });
    } });

  pdfTool({ id: 'pdfsplit', name: 'Split PDF', desc: 'Har page alag ya N pages ke group', icon: '✂️', zipName: 'split-pdf',
    params: [{ key: 'n', label: 'Pages per file', type: 'number', value: 1, min: 1 }],
    run: function (files, v) {
      var f = files[0];
      return readBuf(f).then(loadPdf).then(function (src) {
        var total = src.getPageCount(), n = Math.max(1, +v.n || 1), jobs = [];
        for (var s = 0; s < total; s += n) (function (s) {
          jobs.push(PDF().PDFDocument.create().then(function (d) {
            var idx = []; for (var i = s; i < Math.min(total, s + n); i++) idx.push(i);
            return d.copyPages(src, idx).then(function (pgs) { pgs.forEach(function (p) { d.addPage(p); }); return save(d); })
              .then(function (b) { return { name: baseName(f) + '-p' + (s + 1) + (n > 1 ? '-' + Math.min(total, s + n) : '') + '.pdf', blob: b }; });
          }));
        })(s);
        return Promise.all(jobs);
      });
    } });

  function subsetTool(id, name, desc, icon, keep) {
    pdfTool({ id: id, name: name, desc: desc, icon: icon,
      params: [{ key: 'r', label: 'Pages (e.g. 1-3, 5, 8)', type: 'text', value: '1' }],
      run: function (files, v) {
        var f = files[0];
        return readBuf(f).then(loadPdf).then(function (src) {
          var total = src.getPageCount(), sel = parseRanges(v.r, total), idx = [];
          if (!sel.length) throw new Error('Sahi page numbers likhein (1-' + total + ')');
          if (keep) idx = sel; else for (var i = 0; i < total; i++) if (sel.indexOf(i) < 0) idx.push(i);
          if (!idx.length) throw new Error('Saare pages delete nahi kar sakte');
          return PDF().PDFDocument.create().then(function (d) { return d.copyPages(src, idx).then(function (pgs) { pgs.forEach(function (p) { d.addPage(p); }); return save(d); }); })
            .then(function (b) { return { name: baseName(f) + '-' + id.replace('pdf', '') + '.pdf', blob: b, note: idx.length + ' pages' }; });
        });
      } });
  }
  subsetTool('pdfextract', 'Extract Pages', 'Chune hue pages nayi PDF mein', '📑', true);
  subsetTool('pdfdelete', 'Delete Pages', 'PDF se pages hatayein', '🗑️', false);

  pdfTool({ id: 'pdfrotate', name: 'Rotate PDF', desc: 'Pages ghumayein', icon: '🔃',
    params: [{ key: 'a', label: 'Rotate by', type: 'select', options: [{ value: '90', label: '90° clockwise' }, { value: '180', label: '180°' }, { value: '270', label: '90° anti-clockwise' }] },
      { key: 'r', label: 'Pages (blank = all)', type: 'text', value: '' }],
    run: function (files, v) {
      return readBuf(files[0]).then(loadPdf).then(function (d) {
        var pages = d.getPages(), sel = v.r ? parseRanges(v.r, pages.length) : pages.map(function (_, i) { return i; });
        sel.forEach(function (i) { var p = pages[i]; p.setRotation(PDF().degrees(((p.getRotation().angle || 0) + (+v.a)) % 360)); });
        return save(d);
      }).then(function (b) { return { name: baseName(files[0]) + '-rotated.pdf', blob: b }; });
    } });

  pdfTool({ id: 'pdfreorder', name: 'Reorder Pages', desc: 'Pages ka order badlein', icon: '🔀',
    params: [{ key: 'o', label: 'New order (e.g. 3,1,2,4)', type: 'text', value: '' }],
    onFiles: function (files, out) { readBuf(files[0]).then(loadPdf).then(function (d) { out.innerHTML = ''; out.appendChild(h('div', { class: 'stat' }, h('span', {}, 'Total pages'), h('strong', {}, String(d.getPageCount())))); }).catch(function () {}); },
    run: function (files, v) {
      return readBuf(files[0]).then(loadPdf).then(function (src) {
        var total = src.getPageCount(), order = String(v.o || '').split(/[ ,]+/).filter(Boolean).map(function (n) { return parseInt(n, 10) - 1; }).filter(function (n) { return n >= 0 && n < total; });
        if (!order.length) throw new Error('Naya order likhein, jaise 2,1,3');
        return PDF().PDFDocument.create().then(function (d) { return d.copyPages(src, order).then(function (pgs) { pgs.forEach(function (p) { d.addPage(p); }); return save(d); }); });
      }).then(function (b) { return { name: baseName(files[0]) + '-reordered.pdf', blob: b }; });
    } });

  pdfTool({ id: 'pdfreverse', name: 'Reverse PDF', desc: 'Pages ulte order mein', icon: '⏪',
    run: function (files) {
      return readBuf(files[0]).then(loadPdf).then(function (src) {
        var idx = src.getPageIndices().reverse();
        return PDF().PDFDocument.create().then(function (d) { return d.copyPages(src, idx).then(function (pgs) { pgs.forEach(function (p) { d.addPage(p); }); return save(d); }); });
      }).then(function (b) { return { name: baseName(files[0]) + '-reversed.pdf', blob: b }; });
    } });

  var pageSizes = { a4: [595.28, 841.89], letter: [612, 792], a5: [419.53, 595.28] };
  pdfTool({ id: 'img2pdf', name: 'Images → PDF', desc: 'Photos se PDF banayein', icon: '🖼️', multiple: true, accept: 'image/*', acceptLabel: 'images',
    params: [{ key: 'ps', label: 'Page size', type: 'select', options: [{ value: 'fit', label: 'Same as image' }, { value: 'a4', label: 'A4' }, { value: 'letter', label: 'Letter' }, { value: 'a5', label: 'A5' }] },
      { key: 'm', label: 'Margin (pt)', type: 'number', value: 20 }, { key: 'q', label: 'JPEG quality', type: 'range', min: 40, max: 100, value: 85 }],
    run: function (files, v) {
      return PDF().PDFDocument.create().then(function (d) {
        return files.reduce(function (p, f) {
          return p.then(function () { return loadImage(f); }).then(function (img) {
            var c = copy2(downscale(img, 2400));
            return toBlob(c, 'image/jpeg', v.q / 100).then(readBuf).then(function (buf) { return d.embedJpg(buf); }).then(function (em) {
              var m = v.ps === 'fit' ? 0 : (+v.m || 0), size = v.ps === 'fit' ? [em.width * 0.75, em.height * 0.75] : pageSizes[v.ps].slice();
              if (v.ps !== 'fit' && em.width > em.height) size.reverse();
              var page = d.addPage(size), aw = size[0] - 2 * m, ah = size[1] - 2 * m, s = Math.min(aw / em.width, ah / em.height);
              page.drawImage(em, { x: (size[0] - em.width * s) / 2, y: (size[1] - em.height * s) / 2, width: em.width * s, height: em.height * s });
            });
          });
        }, Promise.resolve()).then(function () { return save(d); });
      }).then(function (b) { return { name: 'images.pdf', blob: b, note: files.length + ' pages' }; });
    } });
  function copy2(src) { var c = canvasOf(src.width || src.naturalWidth, src.height || src.naturalHeight), x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0, c.width, c.height); return c; }

  pdfTool({ id: 'pdf2img', name: 'PDF → Images', desc: 'Har page JPG/PNG mein', icon: '🏞️', zipName: 'pdf-images',
    params: [{ key: 'sc', label: 'Quality (scale)', type: 'select', options: [{ value: '2', label: 'High (2x)' }, { value: '1.5', label: 'Medium' }, { value: '1', label: 'Low' }, { value: '3', label: 'Very high (3x)' }] },
      { key: 'fmt', label: 'Format', type: 'select', options: [{ value: 'image/jpeg', label: 'JPG' }, { value: 'image/png', label: 'PNG' }] },
      { key: 'r', label: 'Pages (blank = all)', type: 'text', value: '' }],
    run: function (files, v, out) {
      return readBuf(files[0]).then(pdfjs).then(function (doc) {
        var sel = v.r ? parseRanges(v.r, doc.numPages) : Array.from({ length: doc.numPages }, function (_, i) { return i; }), res = [], thumbs = h('div', { class: 'thumbs' });
        out.appendChild(thumbs);
        return sel.reduce(function (p, i) {
          return p.then(function () { return renderPage(doc, i + 1, +v.sc); }).then(function (c) {
            return toBlob(c, v.fmt, 0.9).then(function (b) { res.push({ name: baseName(files[0]) + '-page' + (i + 1) + (v.fmt === 'image/png' ? '.png' : '.jpg'), blob: b }); thumbs.appendChild(h('img', { src: URL.createObjectURL(b) })); });
          });
        }, Promise.resolve()).then(function () { return res; });
      });
    } });

  pdfTool({ id: 'pdf2text', name: 'PDF → Text', desc: 'PDF se text nikaalein', icon: '📝', button: '📝 Extract Text',
    run: function (files, v, out) {
      return readBuf(files[0]).then(pdfjs).then(function (doc) {
        var txt = [];
        var p = Promise.resolve();
        for (var i = 1; i <= doc.numPages; i++) (function (i) {
          p = p.then(function () { return doc.getPage(i); }).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
            var lines = [], last = null;
            tc.items.forEach(function (it) { var y = it.transform ? Math.round(it.transform[5]) : 0; if (last !== null && Math.abs(y - last) > 2) lines.push('\n'); lines.push(it.str); last = y; });
            txt.push('--- Page ' + i + ' ---\n' + lines.join('').replace(/[ \t]+\n/g, '\n'));
          });
        })(i);
        return p.then(function () {
          var all = txt.join('\n\n'), ta = h('textarea', { class: 'ta', readonly: true }); ta.value = all.trim() ? all : '(Is PDF mein text nahi mila — shayad scanned image hai)';
          out.appendChild(h('div', { class: 'out-head' }, h('span', {}, doc.numPages + ' pages · ' + all.length + ' chars'),
            h('button', { class: 'btn-sm', onclick: function () { copyText(ta.value); } }, 'Copy'),
            h('button', { class: 'btn-sm', onclick: function () { download(new Blob([ta.value], { type: 'text/plain' }), baseName(files[0]) + '.txt'); } }, 'Save .txt')));
          out.appendChild(ta);
        });
      });
    } });

  pdfTool({ id: 'pdfwatermark', name: 'Watermark PDF', desc: 'Har page par text watermark', icon: '©️',
    params: [{ key: 't', label: 'Watermark text', type: 'text', value: 'CONFIDENTIAL' }, { key: 'sz', label: 'Font size', type: 'number', value: 60 },
      { key: 'op', label: 'Opacity %', type: 'range', min: 5, max: 100, value: 25 }, { key: 'c', label: 'Color', type: 'color', value: '#ff0000' }, { key: 'rot', label: 'Diagonal', type: 'toggle', value: true }],
    run: function (files, v) {
      return readBuf(files[0]).then(loadPdf).then(function (d) {
        return d.embedFont(PDF().StandardFonts.HelveticaBold).then(function (font) {
          var t = safe(font, v.t), sz = +v.sz || 50;
          d.getPages().forEach(function (pg) {
            var w = pg.getWidth(), hh = pg.getHeight(), tw = font.widthOfTextAtSize(t, sz), ang = v.rot ? 45 : 0, r = ang * Math.PI / 180;
            pg.drawText(t, { x: w / 2 - (tw / 2) * Math.cos(r) + (sz / 3) * Math.sin(r), y: hh / 2 - (tw / 2) * Math.sin(r) - (sz / 3) * Math.cos(r), size: sz, font: font, color: rgb(v.c), opacity: v.op / 100, rotate: PDF().degrees(ang) });
          });
          return save(d);
        });
      }).then(function (b) { return { name: baseName(files[0]) + '-watermarked.pdf', blob: b }; });
    } });

  pdfTool({ id: 'pdfpagenum', name: 'Page Numbers', desc: 'Pages par number lagayein', icon: '🔢',
    params: [{ key: 'pos', label: 'Position', type: 'select', options: [{ value: 'bc', label: 'Bottom center' }, { value: 'br', label: 'Bottom right' }, { value: 'bl', label: 'Bottom left' }, { value: 'tc', label: 'Top center' }, { value: 'tr', label: 'Top right' }] },
      { key: 'fmt', label: 'Format', type: 'select', options: [{ value: 'n', label: '1, 2, 3' }, { value: 'nt', label: '1 / 10' }, { value: 'pn', label: 'Page 1 of 10' }] },
      { key: 'st', label: 'Start number', type: 'number', value: 1 }, { key: 'sz', label: 'Font size', type: 'number', value: 11 }],
    run: function (files, v) {
      return readBuf(files[0]).then(loadPdf).then(function (d) {
        return d.embedFont(PDF().StandardFonts.Helvetica).then(function (font) {
          var pages = d.getPages(), N = pages.length, sz = +v.sz || 11;
          pages.forEach(function (pg, i) {
            var n = i + (+v.st || 1), last = N + (+v.st || 1) - 1, t = v.fmt === 'nt' ? n + ' / ' + last : v.fmt === 'pn' ? 'Page ' + n + ' of ' + last : String(n);
            var tw = font.widthOfTextAtSize(t, sz), w = pg.getWidth(), hh = pg.getHeight(), m = 24;
            var x = v.pos[1] === 'c' ? (w - tw) / 2 : v.pos[1] === 'r' ? w - m - tw : m, y = v.pos[0] === 'b' ? m : hh - m - sz;
            pg.drawText(t, { x: x, y: y, size: sz, font: font, color: PDF().rgb(0.2, 0.2, 0.2) });
          });
          return save(d);
        });
      }).then(function (b) { return { name: baseName(files[0]) + '-numbered.pdf', blob: b }; });
    } });

  pdfTool({ id: 'pdfheader', name: 'Header / Footer', desc: 'Har page par header aur footer text', icon: '📰',
    params: [{ key: 'hd', label: 'Header text', type: 'text', value: '' }, { key: 'ft', label: 'Footer text', type: 'text', value: '' }, { key: 'sz', label: 'Font size', type: 'number', value: 10 },
      { key: 'al', label: 'Align', type: 'select', options: [{ value: 'c', label: 'Center' }, { value: 'l', label: 'Left' }, { value: 'r', label: 'Right' }] }],
    run: function (files, v) {
      if (!v.hd && !v.ft) throw new Error('Header ya footer text likhein');
      return readBuf(files[0]).then(loadPdf).then(function (d) {
        return d.embedFont(PDF().StandardFonts.Helvetica).then(function (font) {
          var sz = +v.sz || 10;
          d.getPages().forEach(function (pg) {
            var w = pg.getWidth(), hh = pg.getHeight(), m = 22;
            [[v.hd, hh - m - sz], [v.ft, m]].forEach(function (a) {
              if (!a[0]) return; var t = safe(font, a[0]), tw = font.widthOfTextAtSize(t, sz);
              pg.drawText(t, { x: v.al === 'c' ? (w - tw) / 2 : v.al === 'r' ? w - m - tw : m, y: a[1], size: sz, font: font, color: PDF().rgb(0.25, 0.25, 0.25) });
            });
          });
          return save(d);
        });
      }).then(function (b) { return { name: baseName(files[0]) + '-header-footer.pdf', blob: b }; });
    } });

  pdfTool({ id: 'pdfmeta', name: 'Edit Metadata', desc: 'Title, author, subject badlein', icon: '🏷️',
    params: [{ key: 't', label: 'Title', type: 'text', value: '' }, { key: 'a', label: 'Author', type: 'text', value: '' }, { key: 's', label: 'Subject', type: 'text', value: '' }, { key: 'k', label: 'Keywords (comma)', type: 'text', value: '' }],
    run: function (files, v) {
      return readBuf(files[0]).then(loadPdf).then(function (d) {
        if (v.t) d.setTitle(v.t); if (v.a) d.setAuthor(v.a); if (v.s) d.setSubject(v.s);
        if (v.k) d.setKeywords(v.k.split(',').map(function (s) { return s.trim(); })); d.setProducer('ToolBox'); d.setModificationDate(new Date());
        return save(d);
      }).then(function (b) { return { name: baseName(files[0]) + '-meta.pdf', blob: b }; });
    } });

  pdfTool({ id: 'pdfinfo', name: 'PDF Info', desc: 'Pages, size, metadata dekhein', icon: 'ℹ️', button: 'ℹ️ Show Info',
    run: function (files, v, out) {
      var f = files[0];
      return readBuf(f).then(loadPdf).then(function (d) {
        var pg = d.getPages(), p0 = pg[0], wrap = h('div', { class: 'calc-out' });
        var mm = function (pt) { return Math.round(pt / 72 * 25.4); };
        [['File', f.name], ['File size', fmtSize(f.size)], ['Pages', pg.length], ['Page 1 size', p0 ? Math.round(p0.getWidth()) + '×' + Math.round(p0.getHeight()) + ' pt (' + mm(p0.getWidth()) + '×' + mm(p0.getHeight()) + ' mm)' : '-'],
          ['Title', d.getTitle() || '-'], ['Author', d.getAuthor() || '-'], ['Subject', d.getSubject() || '-'], ['Creator', d.getCreator() || '-'], ['Producer', d.getProducer() || '-'],
          ['Created', d.getCreationDate() ? d.getCreationDate().toLocaleString() : '-'], ['Modified', d.getModificationDate() ? d.getModificationDate().toLocaleString() : '-']]
          .forEach(function (r) { wrap.appendChild(h('div', { class: 'stat' }, h('span', {}, r[0]), h('strong', {}, String(r[1])))); });
        out.appendChild(wrap);
      });
    } });

  pdfTool({ id: 'pdfblank', name: 'Add Blank Page', desc: 'Blank page jodein ya nayi blank PDF', icon: '📃', accept: false,
    params: [{ key: 'after', label: 'Insert after page (0 = start)', type: 'number', value: 0 }, { key: 'cnt', label: 'How many blank pages', type: 'number', value: 1 },
      { key: 'ps', label: 'Size (new PDF)', type: 'select', options: [{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'Letter' }, { value: 'a5', label: 'A5' }] }],
    render2: true,
    run: function (files, v) {
      var f = blankFile;
      var cnt = Math.max(1, Math.min(500, +v.cnt || 1));
      var p = f ? readBuf(f).then(loadPdf) : PDF().PDFDocument.create();
      return p.then(function (d) {
        var at = Math.max(0, Math.min(d.getPageCount(), +v.after || 0)), size = d.getPageCount() ? [d.getPage(Math.max(0, at - 1)).getWidth(), d.getPage(Math.max(0, at - 1)).getHeight()] : pageSizes[v.ps];
        for (var i = 0; i < cnt; i++) d.insertPage(at + i, size);
        return save(d);
      }).then(function (b) { return { name: (f ? baseName(f) + '-with-blank' : 'blank') + '.pdf', blob: b }; });
    } });
  var blankFile = null;
  // attach optional-file picker to the blank page tool
  (function () {
    var t = Tools[Tools.length - 1], r = t.render;
    t.render = function (host) {
      blankFile = null;
      var lab = h('div', { class: 'fileitem' }, h('span', {}, 'Koi PDF nahi — nayi blank PDF banegi'));
      host.appendChild(fileButton('📁 Choose PDF (optional)', 'application/pdf,.pdf', false, function (fs) { blankFile = fs[0]; lab.firstChild.textContent = blankFile.name; }));
      host.appendChild(h('div', { class: 'filelist' }, lab));
      r(host);
    };
  })();

  pdfTool({ id: 'pdfcrop', name: 'Crop PDF', desc: 'Pages ke margins kaatein', icon: '✂️',
    params: [{ key: 't', label: 'Top %', type: 'range', min: 0, max: 40, value: 5 }, { key: 'b', label: 'Bottom %', type: 'range', min: 0, max: 40, value: 5 },
      { key: 'l', label: 'Left %', type: 'range', min: 0, max: 40, value: 5 }, { key: 'r', label: 'Right %', type: 'range', min: 0, max: 40, value: 5 }],
    run: function (files, v) {
      return readBuf(files[0]).then(loadPdf).then(function (d) {
        d.getPages().forEach(function (pg) {
          var mb = pg.getMediaBox(), w = mb.width, hh = mb.height;
          var x = mb.x + w * v.l / 100, y = mb.y + hh * v.b / 100, cw = w * (1 - (v.l + v.r) / 100), ch = hh * (1 - (v.t + v.b) / 100);
          pg.setCropBox(x, y, Math.max(10, cw), Math.max(10, ch)); pg.setMediaBox(x, y, Math.max(10, cw), Math.max(10, ch));
        });
        return save(d);
      }).then(function (b) { return { name: baseName(files[0]) + '-cropped.pdf', blob: b }; });
    } });

  pdfTool({ id: 'pdfa4', name: 'Resize to A4', desc: 'Sab pages ko A4/Letter size mein', icon: '📏',
    params: [{ key: 'ps', label: 'Target size', type: 'select', options: [{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'Letter' }, { value: 'a5', label: 'A5' }] }],
    run: function (files, v) {
      return readBuf(files[0]).then(loadPdf).then(function (src) {
        return PDF().PDFDocument.create().then(function (d) {
          return d.embedPages(src.getPages()).then(function (emb) {
            emb.forEach(function (e) {
              var size = pageSizes[v.ps].slice(); if (e.width > e.height) size.reverse();
              var pg = d.addPage(size), s = Math.min(size[0] / e.width, size[1] / e.height);
              pg.drawPage(e, { x: (size[0] - e.width * s) / 2, y: (size[1] - e.height * s) / 2, xScale: s, yScale: s });
            });
            return save(d);
          });
        });
      }).then(function (b) { return { name: baseName(files[0]) + '-' + v.ps + '.pdf', blob: b }; });
    } });

  pdfTool({ id: 'pdfcompress', name: 'Compress PDF', desc: 'PDF ka size kam karein', icon: '🗜️',
    params: [{ key: 'm', label: 'Mode', type: 'select', options: [{ value: 'strong', label: 'Strong (pages → images, smallest)' }, { value: 'light', label: 'Light (lossless re-save, text stays)' }] },
      { key: 'q', label: 'Image quality % (strong)', type: 'range', min: 20, max: 95, value: 60 }, { key: 'sc', label: 'Resolution (strong)', type: 'select', options: [{ value: '1.5', label: 'Medium (~108 dpi)' }, { value: '1', label: 'Low (72 dpi)' }, { value: '2', label: 'High (144 dpi)' }] }],
    run: function (files, v, out) {
      var f = files[0];
      return readBuf(f).then(function (buf) {
        if (v.m === 'light') return loadPdf(buf).then(save);
        return pdfjs(buf).then(function (doc) {
          return PDF().PDFDocument.create().then(function (d) {
            var p = Promise.resolve(), prog = h('div', { class: 'out-head' }, h('span', {}, 'Compressing…')); out.appendChild(prog);
            for (var i = 1; i <= doc.numPages; i++) (function (i) {
              p = p.then(function () { return doc.getPage(i); }).then(function (page) {
                var vp1 = page.getViewport({ scale: 1 });
                return renderPage(doc, i, +v.sc).then(function (c) { return toBlob(c, 'image/jpeg', v.q / 100); }).then(readBuf).then(function (b) { return d.embedJpg(b); }).then(function (em) {
                  var pg = d.addPage([vp1.width, vp1.height]); pg.drawImage(em, { x: 0, y: 0, width: vp1.width, height: vp1.height }); prog.firstChild.textContent = 'Page ' + i + ' / ' + doc.numPages;
                });
              });
            })(i);
            return p.then(function () { prog.remove(); return save(d); });
          });
        });
      }).then(function (b) {
        if (b.size >= f.size && v.m !== 'light') return readBuf(f).then(loadPdf).then(save).then(function (b2) { return b2.size < b.size ? b2 : b; });
        return b;
      }).then(function (b) {
        var pct = Math.round((1 - b.size / f.size) * 100);
        return { name: baseName(f) + '-compressed.pdf', blob: b, note: fmtSize(f.size) + ' → ' + fmtSize(b.size) + (pct > 0 ? ' (−' + pct + '%)' : ' (size kam nahi hua)') };
      });
    } });

  pdfTool({ id: 'text2pdf', name: 'Text → PDF', desc: 'Likha hua text PDF mein', icon: '🧾', accept: false,
    params: [{ key: 't', label: 'Text', type: 'text', value: '' }, { key: 'sz', label: 'Font size', type: 'number', value: 12 }],
    run: function (files, v) {
      var text = taVal || v.t;
      if (!text) throw new Error('Text likhein');
      return PDF().PDFDocument.create().then(function (d) {
        return d.embedFont(PDF().StandardFonts.Helvetica).then(function (font) {
          var sz = +v.sz || 12, m = 50, size = pageSizes.a4, maxW = size[0] - 2 * m, lh = sz * 1.4, lines = [];
          safe(font, text).split('\n').forEach(function (para) {
            var line = '';
            para.split(' ').forEach(function (w) { var t = line ? line + ' ' + w : w; if (font.widthOfTextAtSize(t, sz) > maxW && line) { lines.push(line); line = w; } else line = t; });
            lines.push(line);
          });
          var pg = null, y = 0;
          lines.forEach(function (l) { if (!pg || y < m) { pg = d.addPage(size); y = size[1] - m - sz; } pg.drawText(l, { x: m, y: y, size: sz, font: font }); y -= lh; });
          return save(d);
        });
      }).then(function (b) { return { name: 'text.pdf', blob: b }; });
    } });
  var taVal = '';
  (function () {
    var t = Tools[Tools.length - 1], r = t.render;
    t.render = function (host) {
      taVal = '';
      var ta = h('textarea', { class: 'ta', placeholder: 'Yahan text likhein ya paste karein… (English letters best)' });
      ta.addEventListener('input', function () { taVal = ta.value; });
      host.appendChild(h('div', { class: 'field' }, ta));
      r(host);
      var p = host.querySelector('.params'); if (p && p.firstChild) p.firstChild.style.display = 'none';
    };
  })();
})();
