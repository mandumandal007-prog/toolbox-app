/* ==========================================================
   ToolBox App — grid, categories, search, tool sheet, theme,
   native save/share on Android (Capacitor)
   ========================================================== */
(function () {
  var CATS = [
    { id: 'all', name: 'All', icon: '✨' },
    { id: 'pdf', name: 'PDF', icon: '📄' },
    { id: 'photo', name: 'Photo', icon: '🖼️' },
    { id: 'text', name: 'Text', icon: '🔤' },
    { id: 'util', name: 'Utility', icon: '🛠️' },
    { id: 'calc', name: 'Calculator', icon: '🧮' }
  ];
  var state = { cat: 'all', q: '', open: null };
  var grid = document.getElementById('grid'), chips = document.getElementById('chips'), empty = document.getElementById('empty');
  var sheet = document.getElementById('sheet'), sheetBody = document.getElementById('sheetBody');
  var Cap = window.Capacitor, isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  var P = (Cap && Cap.Plugins) || {};

  /* ---------- clipboard ---------- */
  window.copyText = function (t) {
    function fallback() { var ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); toast('📋 Copied'); }
    if (P.Clipboard) return P.Clipboard.write({ string: String(t) }).then(function () { toast('📋 Copied'); }, fallback);
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(String(t)).then(function () { toast('📋 Copied'); }, fallback);
    fallback();
  };

  /* ---------- native save (WebView can't follow <a download>) ---------- */
  function blobToB64(blob) {
    return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1] || ''); }; r.onerror = rej; r.readAsDataURL(blob); });
  }
  var webDownload = window.download;
  window.download = function (blob, name) {
    if (!isNative || !P.Filesystem) return webDownload(blob, name);
    var FS = P.Filesystem, safeName = String(name || 'file').replace(/[\\/:*?"<>|]+/g, '_');
    var stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
    var file = safeName.replace(/(\.[^.]+)?$/, function (ext) { return '-' + stamp + (ext || ''); });
    return blobToB64(blob).then(function (data) {
      return FS.writeFile({ path: 'ToolBox/' + file, data: data, directory: 'DOCUMENTS', recursive: true })
        .then(function (r) { saved(r.uri, 'Documents/ToolBox/' + file); return r; })
        .catch(function () {
          return FS.writeFile({ path: file, data: data, directory: 'CACHE', recursive: true }).then(function (r) { share(r.uri, file); return r; });
        });
    }).catch(function (e) { toast('Save fail: ' + (e && e.message || e), 4000); });
  };
  function share(uri, title) {
    if (!P.Share) return toast('Saved');
    return P.Share.share({ title: title, files: [uri], dialogTitle: 'Save / Share' }).catch(function () {});
  }
  function saved(uri, label) {
    var t = document.getElementById('toast');
    t.innerHTML = '';
    t.appendChild(h('div', {}, '✅ Saved: ' + label));
    t.appendChild(h('button', { class: 'btn-sm', style: { marginTop: '8px' }, onclick: function () { share(uri, label); } }, '📤 Share / Open'));
    t.hidden = false; clearTimeout(t._timer); t._timer = setTimeout(function () { t.hidden = true; }, 6000);
  }

  /* ---------- theme ---------- */
  var themeBtn = document.getElementById('themeBtn');
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    themeBtn.textContent = t === 'dark' ? '☀️' : '🌙';
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === 'dark' ? '#141218' : '#6750A4';
    try { localStorage.setItem('tb-theme', t); } catch (e) {}
    if (P.StatusBar) { try { P.StatusBar.setStyle({ style: t === 'dark' ? 'DARK' : 'LIGHT' }); P.StatusBar.setBackgroundColor({ color: t === 'dark' ? '#141218' : '#FEF7FF' }); } catch (e) {} }
  }
  var saved0 = null; try { saved0 = localStorage.getItem('tb-theme'); } catch (e) {}
  setTheme(saved0 || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  themeBtn.addEventListener('click', function () { setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); });

  /* ---------- chips ---------- */
  function count(cat) { return cat === 'all' ? Tools.length : Tools.filter(function (t) { return t.cat === cat; }).length; }
  function renderChips() {
    chips.innerHTML = '';
    CATS.forEach(function (c) {
      chips.appendChild(h('button', { class: 'chip' + (state.cat === c.id ? ' active' : ''), onclick: function () { state.cat = c.id; renderChips(); renderGrid(); } },
        c.icon + ' ' + c.name + ' ', h('span', { class: 'chip-n' }, String(count(c.id)))));
    });
  }

  /* ---------- grid ---------- */
  function norm(s) { return String(s || '').toLowerCase(); }
  function renderGrid() {
    var q = norm(state.q).trim();
    var list = Tools.filter(function (t) {
      if (state.cat !== 'all' && t.cat !== state.cat) return false;
      if (!q) return true;
      var hay = norm(t.name + ' ' + t.desc + ' ' + t.cat + ' ' + t.id);
      return q.split(/\s+/).every(function (w) { return hay.indexOf(w) >= 0; });
    });
    grid.innerHTML = '';
    list.forEach(function (t) {
      grid.appendChild(h('button', { class: 'card', onclick: function () { openTool(t); } },
        h('div', { class: 'card-icon' }, t.icon || '🔧'), h('div', { class: 'card-name' }, t.name), h('div', { class: 'card-desc' }, t.desc || '')));
    });
    empty.hidden = list.length > 0;
  }
  document.getElementById('search').addEventListener('input', function (e) { state.q = e.target.value; renderGrid(); });

  /* ---------- sheet ---------- */
  function openTool(t, fromHash) {
    state.open = t;
    document.getElementById('sheetTitle').textContent = (t.icon ? t.icon + ' ' : '') + t.name;
    document.getElementById('sheetDesc').textContent = t.desc || '';
    sheetBody.innerHTML = '';
    var host = h('div', {});
    sheetBody.appendChild(host);
    try { t.render(host); } catch (e) { console.error(e); host.appendChild(h('div', { class: 'err' }, '⚠️ Tool load nahi hua: ' + e.message)); }
    sheet.hidden = false; document.body.classList.add('sheet-open'); sheetBody.scrollTop = 0;
    if (!fromHash) { try { history.pushState({ tool: t.id }, '', '#' + t.id); } catch (e) {} }
  }
  function closeTool(fromPop) {
    if (!state.open) return;
    state.open = null; sheet.hidden = true; document.body.classList.remove('sheet-open'); sheetBody.innerHTML = '';
    if (!fromPop) { try { if (history.state && history.state.tool) history.back(); } catch (e) {} }
  }
  document.getElementById('sheetBack').addEventListener('click', function () { closeTool(false); });
  window.addEventListener('popstate', function () { if (state.open) closeTool(true); });
  window.openTool = function (id) { var t = Tools.find(function (x) { return x.id === id; }); if (t) openTool(t); return !!t; };
  window.closeTool = closeTool;

  /* Android hardware back button */
  if (isNative && P.App && P.App.addListener) {
    P.App.addListener('backButton', function () {
      if (state.open) closeTool(false);
      else if (state.q) { state.q = ''; document.getElementById('search').value = ''; renderGrid(); }
      else P.App.exitApp();
    });
  }

  /* ---------- boot ---------- */
  document.getElementById('count').textContent = Tools.length;
  renderChips(); renderGrid();
  try { history.replaceState({}, '', location.pathname); } catch (e) {}
  window.addEventListener('error', function (e) { console.error(e.error || e.message); });
  window.addEventListener('unhandledrejection', function (e) { console.error(e.reason); toast('⚠️ ' + ((e.reason && e.reason.message) || 'Kuch galat hua'), 3500); });
})();
