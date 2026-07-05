const pptr = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const mime = {
  '.js': 'application/javascript', '.html': 'text/html', '.ico': 'image/x-icon',
  '.png': 'image/png', '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  let filePath = path.join('/home/jhpy/FinanceTracker/dist', req.url === '/' ? 'index.html' : decodeURIComponent(req.url));
  try {
    res.writeHead(200, { 'Content-Type': mime[path.extname(filePath)] || 'text/plain' });
    res.end(fs.readFileSync(filePath));
  } catch(e) {
    res.writeHead(404);
    res.end('');
  }
});

server.listen(3456, async () => {
  try {
    const browser = await pptr.launch({
      executablePath: '/usr/bin/google-chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-gpu'],
    });
    
    // Test both scenarios
    for (const scenario of ['new_user', 'returning_user']) {
      console.log('\n========= SCENARIO: ' + scenario + ' =========');
      const page = await browser.newPage();
      
      if (scenario === 'returning_user') {
        await page.evaluateOnNewDocument(() => {
          localStorage.setItem('@oraned_onboarding_seen', 'true');
          console.log('[SETUP] localStorage set');
        });
      }
      
      const logs = [];
      page.on('console', msg => logs.push('[' + msg.type() + '] ' + msg.text()));
      page.on('pageerror', err => logs.push('[PAGE_ERROR] ' + err.message));
      
      await page.goto('http://localhost:3456', { waitUntil: 'networkidle0', timeout: 30000 });
      
      await new Promise(r => setTimeout(r, 8000));
      
      const debugLogs = logs.filter(l => l.includes('[Debug]') || l.includes('[SETUP]') || l.includes('PAGE_ERROR'));
      console.log('Debug logs (' + debugLogs.length + '):');
      debugLogs.forEach(l => console.log('  ' + l));
      
      const otherLogs = logs.filter(l => !l.includes('[Debug]') && !l.includes('[SETUP]') && l.includes('warn'));
      otherLogs.forEach(l => console.log('  ' + l));
      
      const finalState = await page.evaluate(() => {
        const r = document.getElementById('root');
        return {
          hasSpinner: r?.innerHTML?.includes('progressbar') ?? false,
          hasOnboarding: r?.innerHTML?.includes('Bienvenue') ?? false,
          hasLogin: r?.innerHTML?.includes('Se connecter') ?? false,
          length: r?.innerHTML?.length ?? 0,
        };
      });
      console.log('Final state:', JSON.stringify(finalState));
      
      await page.close();
    }
    
    await browser.close();
  } catch(e) {
    console.error('Error:', e.message);
  }
  
  server.close();
});
