// Tiny SSAP client used only to tune antenna channels: developer apps can't call the
// tuner service on the luna bus, but the TV's own remote-control websocket can.
// The client key comes from ssap-key.js, which install.sh writes from tools/ssap-key.json.
window.Ssap = (function () {
  var ws = null, ready = null, id = 0, pending = {};

  function connect() {
    if (ready) return ready;
    ready = new Promise(function (resolve, reject) {
      if (!window.SSAP_KEY) return reject(new Error('no ssap key'));
      ws = new WebSocket('ws://127.0.0.1:3000');
      ws.onerror = function () { ready = null; reject(new Error('ssap socket error')); };
      ws.onclose = function () { ready = null; };
      ws.onmessage = function (e) {
        var msg = JSON.parse(e.data);
        if (msg.id === 'register') {
          if (msg.type === 'registered') resolve();
          else if (msg.type === 'error') { ready = null; reject(new Error(msg.error)); }
          return;
        }
        var p = pending[msg.id];
        if (!p) return;
        delete pending[msg.id];
        if (msg.type === 'error' || (msg.payload && msg.payload.returnValue === false)) p.reject(new Error(msg.error || 'failed'));
        else p.resolve(msg.payload);
      };
      ws.onopen = function () {
        ws.send(JSON.stringify({ id: 'register', type: 'register', payload: {
          'client-key': window.SSAP_KEY, pairingType: 'PROMPT',
          manifest: { manifestVersion: 1, permissions: ['READ_TV_CHANNEL_LIST', 'CONTROL_INPUT_TV', 'LAUNCH'] }
        } }));
      };
    });
    return ready;
  }

  function request(uri, payload) {
    return connect().then(function () {
      return new Promise(function (resolve, reject) {
        var mid = String(++id);
        pending[mid] = { resolve: resolve, reject: reject };
        ws.send(JSON.stringify({ id: mid, type: 'request', uri: uri, payload: payload || {} }));
        setTimeout(function () {
          if (pending[mid]) { delete pending[mid]; reject(new Error('timeout')); }
        }, 4000);
      });
    });
  }

  var channels = null;
  // channelNumber -> channelId, TV channels only (the list also holds radio)
  function channelMap() {
    if (channels) return Promise.resolve(channels);
    return request('ssap://tv/getChannelList').then(function (r) {
      channels = {};
      (r.channelList || []).forEach(function (c) {
        if (!c.Radio && !c.Invisible && !channels[c.channelNumber]) channels[c.channelNumber] = c.channelId;
      });
      return channels;
    });
  }

  function openChannel(num) {
    return channelMap().then(function (map) {
      if (!map[num]) throw new Error('channel ' + num + ' not found');
      return request('ssap://tv/openChannel', { channelId: map[num] });
    });
  }

  return { connect: connect, openChannel: openChannel };
})();
