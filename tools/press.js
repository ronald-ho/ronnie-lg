#!/usr/bin/env node
// Press remote keys inside the running Home app through the webOS web inspector (CDP).
//   node press.js RIGHT,RIGHT,DOWN,OK        OK:hold = hold OK for 900ms
//   node press.js eval "<js expression>"     prints the result
// Uses `ares-inspect`, so it only works for developer-mode apps.
const { spawn } = require('child_process');
const WebSocket = require('ws');

const CODES = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, OK: 13, BACK: 461 };
const APP = process.env.APP_ID || 'com.ronald.home';

function inspector() {
  return new Promise((resolve, reject) => {
    const p = spawn('ares-inspect', ['-d', 'tv', '-a', APP]);
    p.stdout.on('data', (d) => {
      const m = String(d).match(/ws=(localhost:\d+\/devtools\/page\/\w+)/);
      if (m) resolve({ proc: p, url: 'ws://' + m[1] });
    });
    p.on('exit', () => reject(new Error('ares-inspect exited')));
  });
}

(async () => {
  const [cmd, arg] = process.argv.slice(2);
  const { proc, url } = await inspector();
  const ws = new WebSocket(url);
  await new Promise((r, j) => { ws.on('open', r); ws.on('error', j); });
  let id = 0;
  const pending = new Map();
  ws.on('message', (m) => { const msg = JSON.parse(m); pending.get(msg.id)?.(msg); });
  const send = (method, params) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const key = (type, code) => send('Input.dispatchKeyEvent', { type, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code });

  try {
    if (cmd === 'eval') {
      const r = await send('Runtime.evaluate', { expression: arg, returnByValue: true, awaitPromise: true });
      console.log(JSON.stringify(r.result.result.value));
    } else {
      for (const k of cmd.split(',')) {
        const [name, hold] = k.split(':');
        await key('rawKeyDown', CODES[name]);
        await sleep(hold ? 900 : 60);
        await key('keyUp', CODES[name]);
        await sleep(450);
      }
      console.log('pressed', cmd);
    }
  } finally {
    ws.close();
    proc.kill();
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
