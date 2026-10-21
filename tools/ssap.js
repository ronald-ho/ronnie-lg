#!/usr/bin/env node
// Minimal LG webOS SSAP client (the same websocket API the LG ThinQ remote app uses).
//   node ssap.js <ssap-uri> [json-payload]   -> prints the response JSON
//   node ssap.js shot <out.jpg>              -> saves a screenshot of the TV screen
// First run shows a pairing prompt on the TV; the client key is cached in ssap-key.json.
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const WebSocket = require('ws');

const HOST = process.env.TV_HOST || '192.168.4.103';
const KEY_FILE = path.join(__dirname, 'ssap-key.json');

const PERMISSIONS = [
  'LAUNCH', 'LAUNCH_WEBAPP', 'APP_TO_APP', 'CLOSE', 'CONTROL_AUDIO', 'CONTROL_DISPLAY',
  'CONTROL_INPUT_JOYSTICK', 'CONTROL_INPUT_MEDIA_PLAYBACK', 'CONTROL_INPUT_TV', 'CONTROL_POWER',
  'CONTROL_TV_SCREEN', 'READ_APP_STATUS', 'READ_INSTALLED_APPS', 'READ_RUNNING_APPS',
  'READ_INPUT_DEVICE_LIST', 'READ_NETWORK_STATE', 'READ_POWER_STATE', 'READ_SETTINGS',
  'READ_TV_CURRENT_TIME', 'WRITE_NOTIFICATION_TOAST', 'READ_NOTIFICATIONS',
  'READ_TV_CHANNEL_LIST', 'READ_CURRENT_CHANNEL', 'READ_TV_PROGRAM_INFO',
];

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://${HOST}:3001`, { rejectUnauthorized: false });
    let id = 0;
    const pending = new Map();
    ws.on('error', reject);
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.id === 'register') {
        if (msg.type === 'registered') {
          fs.writeFileSync(KEY_FILE, JSON.stringify({ 'client-key': msg.payload['client-key'] }));
          resolve(api);
        } else if (msg.type === 'error') {
          reject(new Error(msg.error));
        } else if (msg.payload && msg.payload.pairingType === 'PROMPT') {
          console.error('Accept the pairing prompt on the TV...');
        }
        return;
      }
      const p = pending.get(msg.id);
      if (p) { pending.delete(msg.id); msg.type === 'error' ? p.reject(new Error(msg.error)) : p.resolve(msg.payload); }
    });
    const api = {
      request(uri, payload = {}) {
        const mid = String(++id);
        return new Promise((res, rej) => {
          pending.set(mid, { resolve: res, reject: rej });
          ws.send(JSON.stringify({ id: mid, type: 'request', uri, payload }));
        });
      },
      close() { ws.close(); },
    };
    ws.on('open', () => {
      const saved = fs.existsSync(KEY_FILE) ? JSON.parse(fs.readFileSync(KEY_FILE)) : {};
      ws.send(JSON.stringify({
        id: 'register', type: 'register',
        payload: {
          forcePairing: false, pairingType: 'PROMPT', ...saved,
          manifest: { manifestVersion: 1, appVersion: '1.0', permissions: PERMISSIONS },
        },
      }));
    });
  });
}

function download(url, out) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { rejectUnauthorized: false }, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      res.pipe(fs.createWriteStream(out)).on('finish', resolve);
    }).on('error', reject);
  });
}

(async () => {
  const [cmd, arg] = process.argv.slice(2);
  const tv = await connect();
  try {
    if (cmd === 'key') {
      // Remote button presses, e.g. "RIGHT,RIGHT,ENTER" (names: LEFT RIGHT UP DOWN ENTER BACK HOME)
      const { socketPath } = await tv.request('ssap://com.webos.service.networkinput/getPointerInputSocket');
      const input = new WebSocket(socketPath, { rejectUnauthorized: false });
      await new Promise((r, j) => { input.on('open', r); input.on('error', j); });
      for (const name of arg.split(',')) {
        input.send(`type:button\nname:${name}\n\n`);
        await new Promise((r) => setTimeout(r, 350));
      }
      input.close();
      console.log('sent', arg);
    } else if (cmd === 'shot') {
      const r = await tv.request('ssap://tv/executeOneShot', { path: '/tmp/capture.jpg', method: 'DISPLAY', format: 'JPG' });
      await download(r.imageUri, arg || 'shot.jpg');
      console.log(arg || 'shot.jpg');
    } else {
      console.log(JSON.stringify(await tv.request(cmd, arg ? JSON.parse(arg) : {}), null, 2));
    }
  } finally {
    tv.close();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
