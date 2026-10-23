const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
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

async function testAllRoutes() {
  const routes = [
    '/',
    '/jobs',
    '/resume-builder',
    '/ats-checker',
    '/automation',
    '/saved-jobs',
    '/auth/login',
    '/auth/register'
  ];

  const port = await getFreePort();
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = path.join('C:\\Users\\mridu\\AppData\\Local\\Temp', 'chrome-multi-test-' + Date.now());

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
  let currentHttpErrors = [];
  let currentConsoleErrors = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg);
      callbacks.delete(msg.id);
    }
    if (msg.method === 'Console.messageAdded') {
      const { level, text } = msg.params.message;
      if (level === 'error') {
        currentConsoleErrors.push(text);
      }
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const desc = msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text;
      currentConsoleErrors.push(desc || 'Exception');
    }
    if (msg.method === 'Network.responseReceived') {
      const resp = msg.params.response;
      if (resp.status >= 400 && !resp.url.includes('favicon')) {
        currentHttpErrors.push({ status: resp.status, url: resp.url });
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

  const results = [];

  for (const route of routes) {
    currentHttpErrors = [];
    currentConsoleErrors = [];
    const url = `https://rozgar-radar-lemon.vercel.app${route}`;
    console.log(`\nTesting ${url} ...`);
    await send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, 3500));

    const evalTitle = await send('Runtime.evaluate', { expression: 'document.title' });
    const evalH1 = await send('Runtime.evaluate', { expression: 'document.querySelector("h1, h2")?.innerText' });

    results.push({
      route,
      title: evalTitle.result?.result?.value,
      heading: evalH1.result?.result?.value,
      httpErrors: [...currentHttpErrors],
      consoleErrors: [...currentConsoleErrors]
    });
  }

  console.log('\n========================================');
  console.log('COMPLETE APPLICATION TEST REPORT');
  console.log('========================================');
  for (const r of results) {
    const status = (r.httpErrors.length === 0 && r.consoleErrors.length === 0) ? 'PASS ✓' : 'FAIL ✗';
    console.log(`${r.route.padEnd(20)} [${status}]`);
    console.log(`  Title: ${r.title}`);
    console.log(`  Heading: ${r.heading}`);
    if (r.httpErrors.length) console.log(`  HTTP Errors:`, r.httpErrors);
    if (r.consoleErrors.length) console.log(`  Console Errors:`, r.consoleErrors);
  }
  console.log('========================================');

  ws.close();
  chrome.kill();
}

testAllRoutes().catch(console.error);
