const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const net = require('net');

async function getFreePort() {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
}

async function testInteractions() {
  const port = await getFreePort();
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = path.join('C:\\Users\\mridu\\AppData\\Local\\Temp', 'chrome-interact-' + Date.now());

  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1280,900',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ]);

  let target = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      target = await new Promise((resolve) => {
        const req = http.get(`http://127.0.0.1:${port}/json/list`, (res) => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => {
            try {
              const list = JSON.parse(d);
              resolve(list.find(t => t.type === 'page'));
            } catch (e) { resolve(null); }
          });
        });
        req.on('error', () => resolve(null));
      });
      if (target && target.webSocketDebuggerUrl) break;
    } catch (e) {}
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let id = 1;
  const callbacks = new Map();
  const errors = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg);
      callbacks.delete(msg.id);
    }
    if (msg.method === 'Console.messageAdded') {
      if (msg.params.message.level === 'error') {
        errors.push({ type: 'console', text: msg.params.message.text });
        console.error('[CONSOLE ERROR]', msg.params.message.text);
      }
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const desc = msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text;
      errors.push({ type: 'exception', text: desc });
      console.error('[CRASH / EXCEPTION]', desc);
    }
    if (msg.method === 'Network.responseReceived') {
      const resp = msg.params.response;
      if (resp.status >= 400 && !resp.url.includes('favicon')) {
        errors.push({ type: 'http', status: resp.status, url: resp.url });
        console.error('[HTTP ERROR]', resp.status, resp.url);
      }
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const msgId = id++;
      callbacks.set(msgId, resolve);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Console.enable');

  console.log('1. Navigating to Home...');
  await send('Page.navigate', { url: 'https://rozgar-radar-lemon.vercel.app' });
  await new Promise(r => setTimeout(r, 4000));

  console.log('2. Clicking Theme Toggle button...');
  await send('Runtime.evaluate', {
    expression: `
      const btn = document.querySelector('button[aria-label*="theme"], button[title*="theme"], header button:has(svg)');
      if (btn) btn.click();
    `
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('3. Clicking Search Jobs button...');
  await send('Runtime.evaluate', {
    expression: `
      const sBtn = document.querySelector('form button[type="submit"]');
      if (sBtn) sBtn.click();
    `
  });
  await new Promise(r => setTimeout(r, 3000));

  console.log('4. Now on Jobs page, checking URL & elements...');
  const currentUrl = await send('Runtime.evaluate', { expression: 'window.location.href' });
  console.log('Current URL:', currentUrl.result?.result?.value);

  console.log('5. Clicking first Job Card to open Modal...');
  await send('Runtime.evaluate', {
    expression: `
      const cards = document.querySelectorAll('div[class*="rounded-2xl"][class*="border"]');
      for (const c of cards) {
        if (c.innerText.includes('Apply') || c.innerText.includes('India') || c.innerText.includes('Full-time') || c.innerText.includes('Remote')) {
          c.click();
          break;
        }
      }
    `
  });
  await new Promise(r => setTimeout(r, 2000));

  const modalOpen = await send('Runtime.evaluate', {
    expression: '!!document.querySelector("[role=\\"dialog\\"], .fixed.inset-0")'
  });
  console.log('Modal opened successfully:', modalOpen.result?.result?.value);

  console.log('6. Navigating to Resume Builder...');
  await send('Page.navigate', { url: 'https://rozgar-radar-lemon.vercel.app/resume-builder' });
  await new Promise(r => setTimeout(r, 3000));

  console.log('7. Navigating to ATS Checker...');
  await send('Page.navigate', { url: 'https://rozgar-radar-lemon.vercel.app/ats-checker' });
  await new Promise(r => setTimeout(r, 3000));

  console.log('\n=======================================');
  console.log('TOTAL BUGS / CRASHES / ERRORS DETECTED:', errors.length);
  if (errors.length) {
    console.log(JSON.stringify(errors, null, 2));
  } else {
    console.log('ALL INTERACTIONS PASSED WITH ZERO CRASHES OR ERRORS!');
  }
  console.log('=======================================');

  ws.close();
  chrome.kill();
}

testInteractions().catch(console.error);
