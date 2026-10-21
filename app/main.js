(function () {
  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, OK: 13, BACK: 461 };
  var HOLD_MS = 600;
  var STORE = 'home.dock.v2';
  var ADD = '__add';
  var ROW_PAD = 112;

  var byId = {};
  CATALOG.forEach(function (a) { byId[a.id] = a; });

  var dock = loadDock();
  var rowEls = [document.getElementById('dock'), document.getElementById('tv')];
  var row = 0, col = [0, 0], shift = [0, 0];
  var moving = false;
  var picker = { open: false, col: 0, ids: [] };
  var okDown = false, holdTimer = null, holdFired = false;
  var pointerQuietUntil = 0;
  var fills = {};   // tile background per app id, computed once
  var tints = {};   // ambient colour per app id

  function loadDock() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORE));
      if (saved) {
        saved = saved.filter(function (id) { return byId[id]; });
        if (saved.length) return saved;
      }
    } catch (e) {}
    return DEFAULT_DOCK.slice();
  }
  function saveDock() { try { localStorage.setItem(STORE, JSON.stringify(dock)); } catch (e) {} }

  // ---- items per row ------------------------------------------------------------
  function items(r) { return r === 0 ? dock.concat([ADD]) : CHANNELS; }
  function current() { return items(row)[col[row]]; }
  function info(r, item) {
    if (r === 1) return { title: item.name, hint: 'Channel ' + item.num + '  •  OK to watch', tint: item.color };
    if (item === ADD) return { title: 'Add an app', hint: 'OK to choose from all your apps', tint: '#1c1c1e' };
    return { title: byId[item].title, hint: moving ? '◀ ▶ move   •   ▼ remove   •   OK done' : 'Hold OK to move or remove', tint: tints[item] };
  }

  // ---- tiles --------------------------------------------------------------------
  function appTile(id) {
    var a = byId[id], el = document.createElement('div'), clip = document.createElement('div');
    el.className = 'tile';
    clip.className = 'clip';
    el.appendChild(clip);
    if (a.icon) {
      var img = new Image();
      if (fills[id]) clip.style.background = fills[id];
      else if (a.color) { clip.style.background = fills[id] = tints[id] = a.color; }
      else img.onload = function () { tintFrom(img, id, clip); };
      img.src = a.icon;
      clip.appendChild(img);
    } else {
      clip.insertAdjacentHTML('beforeend', a.glyph);
      clip.style.background = fills[id] = tints[id] = a.color;
    }
    clip.insertAdjacentHTML('beforeend', '<div class="shine"></div>');
    return el;
  }

  function addTile() {
    var el = document.createElement('div');
    el.className = 'tile';
    el.innerHTML = '<div class="clip" style="background:#1c1c1e">' + PLUS + '</div>';
    return el;
  }

  function chanTile(c) {
    var el = document.createElement('div');
    el.className = 'tile chan';
    el.innerHTML = '<div class="clip" style="background:' + c.color + '"><div class="num"></div><div class="name"></div><div class="shine"></div></div>';
    el.querySelector('.num').textContent = c.num;
    el.querySelector('.name').textContent = c.name;
    return el;
  }

  // Tile fill = icon's average colour. Line-art icons (mostly transparent) stay graphite.
  function tintFrom(img, id, clip) {
    try {
      var c = document.createElement('canvas');
      c.width = c.height = 8;
      var ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 8, 8);
      var d = ctx.getImageData(0, 0, 8, 8).data, r = 0, g = 0, b = 0, n = 0, clear = 0;
      for (var i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) { clear++; continue; }
        r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
      }
      if (!n) return;
      var k = 0.8 / n, col = 'rgb(' + (r * k | 0) + ',' + (g * k | 0) + ',' + (b * k | 0) + ')';
      tints[id] = col;
      if (clear <= 16) clip.style.background = fills[id] = col;
      else fills[id] = '#2c2c2e';
      if (current() === id) paint();
    } catch (e) { /* canvas tainted: keep default grey */ }
  }

  function buildRow(r) {
    var track = rowEls[r].firstElementChild;
    track.innerHTML = '';
    items(r).forEach(function (item) {
      var el = r === 1 ? chanTile(item) : item === ADD ? addTile() : appTile(item);
      bindPointer(el, r);
      track.appendChild(el);
    });
    if (col[r] >= items(r).length) col[r] = items(r).length - 1;
  }

  // Magic Remote: hovering focuses without scrolling the row, so a tile sliding under a
  // still pointer can't trigger another move.
  function bindPointer(el, r) {
    function index() { return Array.prototype.indexOf.call(el.parentNode.children, el); }
    el.onmouseenter = function () {
      if (moving || picker.open || Date.now() < pointerQuietUntil) return;
      focus(r, index(), true);
    };
    el.onclick = function () {
      if (moving || picker.open) return;
      focus(r, index(), true);
      activate();
    };
  }

  // ---- focus & scrolling --------------------------------------------------------
  function tileAt(r, c) { return rowEls[r].firstElementChild.children[c]; }

  function focus(r, c, fromPointer) {
    var prev = document.querySelector('.row .tile.focus');
    if (prev) prev.classList.remove('focus', 'moving', 'press');
    row = r; col[r] = c;
    var el = tileAt(r, c);
    el.classList.add('focus');
    if (moving) el.classList.add('moving');
    if (!fromPointer) scrollTo(r, el);
    if (r === 1) Ssap.warm();  // pair and fetch the channel list before OK is pressed
    paint();
  }

  // Moving between rows lands on the tile visually closest to the current one.
  function nearest(r) {
    var from = tileAt(row, col[row]).getBoundingClientRect(), x = from.left + from.width / 2;
    var tiles = rowEls[r].firstElementChild.children, best = 0, bestD = Infinity;
    for (var i = 0; i < tiles.length; i++) {
      var b = tiles[i].getBoundingClientRect(), d = Math.abs(b.left + b.width / 2 - x);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function scrollTo(r, el) {
    var view = 1920 - 2 * ROW_PAD, pad = el.offsetWidth * 0.1;
    var left = el.offsetLeft - ROW_PAD, right = left + el.offsetWidth;
    var s = shift[r];
    if (right + pad - s > view) s = right + pad - view;
    if (left - pad < s) s = Math.max(0, left - pad);
    if (s !== shift[r]) {
      shift[r] = s;
      rowEls[r].firstElementChild.style.transform = 'translateX(' + (-s) + 'px)';
      pointerQuietUntil = Date.now() + 500;
    }
  }

  var ambient = [document.getElementById('ambA'), document.getElementById('ambB')], ambOn = 0, ambColor = '', ambTimer;
  var titleEl = document.getElementById('title'), hintEl = document.getElementById('hint');
  function paint() {
    var it = info(row, current());
    if (titleEl.textContent !== it.title) titleEl.textContent = it.title;
    if (hintEl.textContent !== it.hint) hintEl.textContent = it.hint;
    var colr = it.tint || '#1c1c1e';
    if (colr !== ambColor) {
      // crossfade: paint the hidden layer, then swap opacities (compositor-only)
      // fade the new layer in on top of the old one, so the wash never dims mid-move
      ambColor = colr;
      var next = ambient[1 - ambOn], prev = ambient[ambOn];
      next.classList.remove('on');
      next.style.backgroundColor = colr;
      next.style.zIndex = 1;
      prev.style.zIndex = 0;
      void next.offsetWidth;
      next.classList.add('on');
      clearTimeout(ambTimer);
      ambTimer = setTimeout(function () { prev.classList.remove('on'); }, 550);
      ambOn = 1 - ambOn;
    }
  }

  function nudge(dir) {
    var el = tileAt(row, col[row]), cls = dir < 0 ? 'nudgeL' : 'nudgeR';
    el.classList.remove('nudgeL', 'nudgeR');
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, 160);
  }

  // ---- actions ------------------------------------------------------------------
  var toastEl = document.getElementById('toast'), toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2500);
  }

  var bridges = [];
  function luna(uri, params, cb) {
    // PalmServiceBridge is the luna bus the webOS JS library wraps. Keep a reference
    // until the reply arrives or it can be garbage-collected mid-call.
    try {
      var b = new PalmServiceBridge();
      bridges.push(b);
      b.onservicecallback = function (msg) {
        bridges.splice(bridges.indexOf(b), 1);
        var res = {};
        try { res = JSON.parse(msg); } catch (e) {}
        if (cb) cb(res);
      };
      b.call(uri, JSON.stringify(params));
    } catch (e) { if (cb) cb({ returnValue: false, errorText: String(e) }); }
  }

  function launch(id) {
    luna('luna://com.webos.applicationManager/launch', { id: id }, function (res) {
      if (res.returnValue === false) toast('Couldn\'t open ' + (byId[id] ? byId[id].title : id));
    });
  }

  function watch(c) {
    Ssap.openChannel(c.num).catch(function () {
      // no pairing key or channel missing after a rescan: open Live TV on its last channel
      toast('Opening Live TV (couldn\'t tune ' + c.num + ')');
      launch('com.webos.app.livetv');
    });
  }

  var lastActivate = 0;
  function activate() {
    // the Magic Remote can deliver both a click and an OK key for one press
    if (Date.now() - lastActivate < 300) return;
    lastActivate = Date.now();
    var it = current();
    if (row === 1) watch(it);
    else if (it === ADD) openPicker();
    else launch(it);
  }

  function moveDock(dir) {
    var c = col[0], n = c + dir;
    if (n < 0 || n >= dock.length) return nudge(dir);
    var t = dock[c]; dock[c] = dock[n]; dock[n] = t;
    // swap the DOM nodes instead of rebuilding, so nothing flashes
    var track = rowEls[0].firstElementChild, a = track.children[c], b = track.children[n];
    if (dir > 0) track.insertBefore(b, a); else track.insertBefore(a, b);
    saveDock();
    focus(0, n);
  }

  function removeFromDock() {
    if (dock.length <= 1) return;
    toast('Removed ' + byId[dock[col[0]]].title + ' from the dock');
    dock.splice(col[0], 1);
    moving = false;
    saveDock();
    buildRow(0);
    focus(0, Math.min(col[0], dock.length - 1));
  }

  function onHold() {
    // only dock apps have a hold action; a long press anywhere else still activates on release
    if (row === 0 && current() !== ADD && !picker.open && !moving) { holdFired = true; moving = true; focus(0, col[0]); }
  }

  // ---- picker -------------------------------------------------------------------
  var pickerEl = document.getElementById('picker'), grid = document.getElementById('grid');
  var PER_ROW = 6;
  function openPicker() {
    picker.ids = CATALOG.map(function (a) { return a.id; }).filter(function (id) { return dock.indexOf(id) < 0; });
    if (!picker.ids.length) return toast('Every app is already in the dock');
    grid.innerHTML = '';
    picker.ids.forEach(function (id, i) {
      var el = appTile(id), cap = document.createElement('div');
      cap.className = 'cap';
      cap.textContent = byId[id].title;
      el.appendChild(cap);
      el.onmouseenter = function () { pickerFocus(i); };
      el.onclick = function () {
        if (Date.now() - lastActivate < 300) return;
        lastActivate = Date.now();
        pickerFocus(i); pickerAdd();
      };
      grid.appendChild(el);
    });
    picker.open = true;
    pickerEl.hidden = false;
    pickerFocus(0);
  }
  function closePicker() { picker.open = false; pickerEl.hidden = true; }
  function pickerFocus(i) {
    var prev = grid.querySelector('.tile.focus');
    if (prev) prev.classList.remove('focus');
    picker.col = i;
    grid.children[i].classList.add('focus');
    // keep the focused row on screen: three rows fit, scroll past that
    var line = Math.floor(i / PER_ROW);
    grid.style.transform = 'translateY(' + (-Math.max(0, line - 2) * 220) + 'px)';
  }
  function pickerAdd() {
    dock.push(picker.ids[picker.col]);
    saveDock();
    closePicker();
    buildRow(0);
    focus(0, dock.length - 1);
  }
  function pickerKey(k) {
    var i = picker.col, n = picker.ids.length;
    if (k === KEY.LEFT && i % PER_ROW) pickerFocus(i - 1);
    else if (k === KEY.RIGHT && i % PER_ROW < PER_ROW - 1 && i + 1 < n) pickerFocus(i + 1);
    else if (k === KEY.UP && i >= PER_ROW) pickerFocus(i - PER_ROW);
    else if (k === KEY.DOWN && i + PER_ROW < n) pickerFocus(i + PER_ROW);
    else if (k === KEY.BACK) closePicker();
  }

  // ---- keys ---------------------------------------------------------------------
  document.addEventListener('keydown', function (e) {
    var k = e.keyCode;
    e.preventDefault();
    if (k === KEY.OK) {
      if (!okDown) {
        okDown = true; holdFired = false;
        holdTimer = setTimeout(onHold, HOLD_MS);
        var f = (picker.open ? grid : rowEls[row]).querySelector('.tile.focus');
        if (f && !moving) f.classList.add('press');
      }
      return;
    }
    if (picker.open) return pickerKey(k);
    if (moving) {
      if (k === KEY.LEFT) moveDock(-1);
      else if (k === KEY.RIGHT) moveDock(1);
      else if (k === KEY.DOWN) removeFromDock();
      else if (k === KEY.BACK) { moving = false; focus(0, col[0]); }
      return;
    }
    var n = items(row).length;
    if (k === KEY.LEFT) { if (col[row] > 0) focus(row, col[row] - 1); else nudge(-1); }
    else if (k === KEY.RIGHT) { if (col[row] < n - 1) focus(row, col[row] + 1); else nudge(1); }
    else if (k === KEY.DOWN && row === 0) focus(1, nearest(1));
    else if (k === KEY.UP && row === 1) focus(0, nearest(0));
  });

  document.addEventListener('keyup', function (e) {
    if (e.keyCode !== KEY.OK || !okDown) return;
    okDown = false;
    clearTimeout(holdTimer);
    var f = document.querySelector('.tile.press');
    if (f) f.classList.remove('press');
    if (holdFired) return;
    if (picker.open) {
      if (Date.now() - lastActivate < 300) return;
      lastActivate = Date.now();
      pickerAdd();
    }
    else if (moving) { moving = false; focus(0, col[0]); }
    else activate();
  });

  // A lost keyup (app hidden mid-press) must not leave OK stuck down.
  function resetKeys() { okDown = false; clearTimeout(holdTimer); }
  window.addEventListener('blur', resetKeys);
  document.addEventListener('visibilitychange', resetKeys);

  // ---- clock --------------------------------------------------------------------
  function tick() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    document.getElementById('time').textContent = ((h + 11) % 12 + 1) + ':' + (m < 10 ? '0' : '') + m;
    document.getElementById('date').textContent = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  }
  tick(); setInterval(tick, 10000);

  buildRow(0);
  buildRow(1);
  focus(0, 0);
  requestAnimationFrame(function () { document.body.classList.remove('enter'); });
})();
