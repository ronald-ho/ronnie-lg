(function () {
  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, OK: 13, BACK: 461 };
  var HOLD_MS = 600;
  var STORE = 'home.dock.v1';

  var byId = {};
  CATALOG.forEach(function (a) { byId[a.id] = a; });

  var dock = loadDock();
  var rows = [document.querySelector('#dock'), document.querySelector('#more')];
  var row = 0, col = [0, 0], shift = [0, 0];
  var moving = false;          // dock reorder mode
  var okDownAt = 0, holdTimer = null, holdFired = false;
  var tints = {};

  function loadDock() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORE));
      if (saved && saved.length) return saved.filter(function (id) { return byId[id]; });
    } catch (e) {}
    return DEFAULT_DOCK.slice();
  }
  function saveDock() { try { localStorage.setItem(STORE, JSON.stringify(dock)); } catch (e) {} }

  function items(r) {
    if (r === 0) return dock;
    return CATALOG.map(function (a) { return a.id; }).filter(function (id) { return dock.indexOf(id) < 0; });
  }

  function tile(id) {
    var a = byId[id], el = document.createElement('div');
    el.className = 'tile';
    if (a.icon) {
      if (a.color) { el.style.background = a.color; tints[id] = a.color; }
      var img = new Image();
      img.onload = function () { if (!a.color) tintFrom(img, id, el); };
      img.src = a.icon;
      el.appendChild(img);
    } else {
      el.insertAdjacentHTML('beforeend', a.glyph);
      el.style.background = a.color;
      tints[id] = a.color;
    }
    var shine = document.createElement('div');
    shine.className = 'shine';
    el.appendChild(shine);
    return el;
  }

  // Tile background = icon's average colour, darkened slightly, so every tile looks native.
  function tintFrom(img, id, el) {
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
      // line-art icons (mostly transparent) vanish on their own colour: keep them on graphite
      if (clear <= 16) el.style.background = col;
      tints[id] = col;
      if (current() === id) paintHero();
    } catch (e) { /* canvas tainted: keep default grey */ }
  }

  function render() {
    rows.forEach(function (rowEl, r) {
      var track = rowEl.firstElementChild, list = items(r);
      track.innerHTML = '';
      list.forEach(function (id, i) {
        var el = tile(id);
        el.onmouseenter = function () { if (!moving) focus(r, i); };
        el.onclick = function () { if (!moving) launch(id); };
        track.appendChild(el);
      });
      if (col[r] >= list.length) col[r] = Math.max(0, list.length - 1);
    });
    document.querySelector('#moreLabel').style.display = items(1).length ? '' : 'none';
    focus(row, col[row]);
  }

  function current() { return items(row)[col[row]]; }

  function focus(r, c) {
    if (!items(r).length) return;
    row = r; col[r] = c;
    var prev = document.querySelectorAll('.tile.focus');
    for (var i = 0; i < prev.length; i++) prev[i].classList.remove('focus', 'moving');
    var track = rows[r].firstElementChild, el = track.children[c];
    el.classList.add('focus');
    if (moving) el.classList.add('moving');
    rows[0].classList.toggle('dim', r !== 0);
    rows[1].classList.toggle('dim', r !== 1);
    // keep the focused tile on screen
    // scroll only when the focused tile would leave the row, Apple TV style
    var view = 1920 - 2 * 112, pad = el.offsetWidth * 0.1;
    var s = shift[r];
    if (el.offsetLeft + el.offsetWidth + pad - s > view) s = el.offsetLeft + el.offsetWidth + pad - view;
    if (el.offsetLeft - pad < s) s = Math.max(0, el.offsetLeft - pad);
    shift[r] = s;
    track.style.transform = 'translateX(' + (-s) + 'px)';
    paintHero();
  }

  var shownTitle = '';
  function paintHero() {
    var id = current(), title = document.querySelector('#title');
    if (byId[id].title !== shownTitle) {
      // re-trigger the rise: jump to the "out" pose with no transition, then let it ease back
      shownTitle = byId[id].title;
      title.textContent = shownTitle;
      title.classList.add('out');
      void title.offsetWidth;
      title.classList.remove('out');
    }
    document.querySelector('#hint').textContent = moving
      ? '◀ ▶ move   •   ▼ remove from dock   •   OK done'
      : (row === 0 ? 'Hold OK to rearrange' : 'Hold OK to add to dock');
    document.querySelector('#ambient').style.backgroundColor = tints[id] || '#1c1c1e';
  }

  var bridge = null;
  function launch(id) {
    // PalmServiceBridge is the low-level luna bus the webOS JS library wraps.
    try {
      bridge = new PalmServiceBridge();
      bridge.onservicecallback = function () {};
      bridge.call('luna://com.webos.applicationManager/launch', JSON.stringify({ id: id }));
    } catch (e) { console.log('launch failed', id, e); }
  }

  function move(dir) {
    var c = col[0], n = c + dir;
    if (n < 0 || n >= dock.length) return;
    var t = dock[c]; dock[c] = dock[n]; dock[n] = t;
    col[0] = n;
    saveDock(); render();
  }

  function onHold() {
    holdFired = true;
    if (row === 0) { moving = true; focus(0, col[0]); }
    else { dock.push(current()); saveDock(); row = 0; col[0] = dock.length - 1; render(); }
  }

  document.addEventListener('keydown', function (e) {
    var k = e.keyCode;
    if (k === KEY.OK) {
      if (!okDownAt) { okDownAt = Date.now(); holdFired = false; holdTimer = setTimeout(onHold, HOLD_MS); }
      e.preventDefault(); return;
    }
    if (moving) {
      if (k === KEY.LEFT) move(-1);
      else if (k === KEY.RIGHT) move(1);
      else if (k === KEY.DOWN && dock.length > 1) { dock.splice(col[0], 1); moving = false; saveDock(); render(); }
      else if (k === KEY.BACK) { moving = false; focus(0, col[0]); }
      e.preventDefault(); return;
    }
    if (k === KEY.LEFT && col[row] > 0) focus(row, col[row] - 1);
    else if (k === KEY.RIGHT && col[row] < items(row).length - 1) focus(row, col[row] + 1);
    else if (k === KEY.DOWN && row === 0 && items(1).length) focus(1, Math.min(col[1], items(1).length - 1));
    else if (k === KEY.UP && row === 1) focus(0, col[0]);
    e.preventDefault();
  });

  document.addEventListener('keyup', function (e) {
    if (e.keyCode !== KEY.OK) return;
    clearTimeout(holdTimer);
    okDownAt = 0;
    if (holdFired) return;
    if (moving) { moving = false; focus(0, col[0]); }
    else launch(current());
  });

  function tick() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    document.querySelector('#time').textContent = ((h + 11) % 12 + 1) + ':' + (m < 10 ? '0' : '') + m;
    document.querySelector('#date').textContent = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  }
  tick(); setInterval(tick, 10000);

  render();
  // stagger the first-paint rise, then drop the class so re-renders don't replay it
  var all = document.querySelectorAll('.tile');
  for (var i = 0; i < all.length; i++) all[i].style.animationDelay = Math.min(i, 10) * 45 + 'ms';
  setTimeout(function () {
    document.body.classList.remove('enter');
    for (var i = 0; i < all.length; i++) all[i].style.animationDelay = '';
  }, 1200);
})();
