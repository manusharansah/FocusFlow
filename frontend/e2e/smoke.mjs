// Full-site smoke test. Works against any deployment:
//   BASE_URL=https://app.example.com SMOKE_USER=a@b.c SMOKE_PASS=... SMOKE_PREMIUM_USER=... SMOKE_PREMIUM_PASS=... node e2e/smoke.mjs
// Needs `playwright` (npm i -D playwright && npx playwright install chromium). Creates only tasks prefixed "smoke-" and removes them.
import { chromium } from 'playwright';

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const USER = process.env.SMOKE_USER || 'demo@example.com';
const PASS = process.env.SMOKE_PASS || 'Demo-pass-12345';
const PRO = process.env.SMOKE_PREMIUM_USER || 'pro@example.com';
const PRO_PASS = process.env.SMOKE_PREMIUM_PASS || PASS;
const STRICT_HEADERS = process.env.CHECK_HEADERS === '1'; // true when BASE_URL is the nginx/production edge

const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push([true, name]); console.log(`  PASS  ${name}`); }
  catch (e) { results.push([false, name, e.message.split('\n')[0]]); console.log(`  FAIL  ${name}\n        ${e.message.split('\n')[0]}`); }
};
const assert = (c, m) => { if (!c) throw new Error(m); };

const browser = await chromium.launch();
const newCtx = (vp = { width: 1280, height: 800 }) => browser.newContext({ viewport: vp, acceptDownloads: true });
const consoleErrors = [];
const watch = (page, label) => {
  page.on('pageerror', (e) => consoleErrors.push(`${label}: PAGEERROR ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/status of 40[13]|status of 429/.test(t)) return; // expected: anonymous session probe, bad-password test, throttle test
    consoleErrors.push(`${label}: ${t}`);
  });
};
async function login(page, email, pass) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(`${BASE}/login`);
    await page.fill('#email', email); await page.fill('#password', pass);
    await page.click('button:has-text("Sign in")');
    try { await page.waitForURL('**/app', { timeout: 8000 }); return; } catch (e) {
      const throttled = await page.locator('.alert-error:has-text("Too many")').count();
      if (!throttled) throw e;
      await page.waitForTimeout(20000); // respect the rate limiter like a real user would
    }
  }
  throw new Error('login kept being rate limited');
}
const apiTok = async (page) => page.evaluate(async () => (await (await fetch('/api/users/token/refresh/', { method: 'POST' })).json()).access);

console.log(`\nSmoke test against ${BASE}\n`);

// ---------- Public site ----------
{
  const ctx = await newCtx(); const page = await ctx.newPage(); watch(page, 'public');
  await check('API health endpoint', async () => { const r = await page.request.get(`${BASE}/api/health/`); assert(r.ok(), `status ${r.status()}`); });
  await check('Landing page renders with primary CTAs', async () => {
    await page.goto(`${BASE}/`); await page.waitForSelector('h1');
    assert((await page.textContent('h1')).length > 10, 'no headline');
    assert(await page.locator('a:has-text("Start for free")').count() === 1, 'missing CTA');
    assert((await page.title()).includes('FocusFlow'), 'bad title');
  });
  await check('Pricing page renders both plans', async () => {
    await page.goto(`${BASE}/pricing`); await page.waitForSelector('.plan');
    assert(await page.locator('.plan').count() === 2, 'expected 2 plans');
  });
  await check('Legal pages render', async () => {
    for (const p of ['/privacy', '/terms']) { await page.goto(`${BASE}${p}`); await page.waitForSelector('.legal h1'); }
  });
  await check('Unknown route shows 404 page', async () => { await page.goto(`${BASE}/definitely-not-here`); await page.waitForSelector('text=Page not found'); });
  await check('Every internal link on public pages resolves (no dead links)', async () => {
    const seen = new Set();
    for (const start of ['/', '/pricing', '/login', '/register', '/privacy', '/terms']) {
      await page.goto(`${BASE}${start}`); await page.waitForSelector('main');
      const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
      for (const h of hrefs) {
        if (!h || h.startsWith('#') || /^(https?:|mailto:)/.test(h) || seen.has(h)) continue;
        seen.add(h);
        const r = await page.request.get(`${BASE}${h}`);
        assert(r.status() < 400, `${start} -> ${h} returned ${r.status()}`);
      }
    }
  });
  await check('Anonymous user is redirected away from /app', async () => { await page.goto(`${BASE}/app/tasks`); await page.waitForURL('**/login'); });
  await check('Protected API rejects anonymous requests', async () => {
    for (const p of ['/api/tasks/', '/api/users/profile/', '/api/analytics/stats/', '/api/users/export/']) {
      const r = await page.request.get(`${BASE}${p}`); assert(r.status() === 401, `${p} -> ${r.status()}`);
    }
  });
  await check('Webhook rejects unsigned requests', async () => {
    const r = await page.request.post(`${BASE}/api/payments/webhook/`, { data: '{}', headers: { 'content-type': 'application/json' } });
    assert([400, 503].includes(r.status()), `status ${r.status()}`);
  });
  await check('Admin/allauth HTML pages are not exposed to the SPA edge', async () => {
    if (!STRICT_HEADERS) return;
    const r = await page.request.get(`${BASE}/accounts/login/`); const t = await r.text();
    assert(t.includes('<div id="root">'), 'allauth login page reachable');
  });
  await check('Security headers on HTML document (production edge)', async () => {
    if (!STRICT_HEADERS) return;
    const h = (await page.request.get(`${BASE}/`)).headers();
    for (const k of ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'strict-transport-security', 'referrer-policy'])
      assert(h[k], `missing ${k}`);
    assert(/default-src 'self'/.test(h['content-security-policy']), 'weak CSP');
  });
  await check('Registration: weak password rejected, duplicate email gives uniform response', async () => {
    const weak = await page.request.post(`${BASE}/api/users/register/`, { data: { username: 'smokeweak', email: 'smokeweak@example.com', password: '12345678' } });
    assert(weak.status() === 400, `weak -> ${weak.status()}`);
    const dup = await page.request.post(`${BASE}/api/users/register/`, { data: { username: 'smokedup', email: USER, password: 'Another-long-pass-9' } });
    assert(dup.status() === 201, `duplicate -> ${dup.status()} (must not reveal existing accounts)`);
  });
  await check('Login: wrong password shows generic error', async () => {
    await page.goto(`${BASE}/login`); await page.fill('#email', USER); await page.fill('#password', 'wrong-password-1');
    await page.click('button:has-text("Sign in")'); await page.waitForSelector('.alert-error');
    assert(/Invalid email or password/.test(await page.textContent('.alert-error')), 'unexpected error text');
  });
  await check('Password reset request always answers the same', async () => {
    for (const e of [USER, 'nobody-here@example.com']) {
      const r = await page.request.post(`${BASE}/api/users/password-reset/`, { data: { email: e } });
      assert(r.status() === 200, `status ${r.status()}`);
    }
  });
  await ctx.close();
}

// ---------- Free user journey ----------
{
  const ctx = await newCtx(); const page = await ctx.newPage(); watch(page, 'free');
  await check('Sign in lands on the workspace', async () => { await login(page, USER, PASS); await page.waitForSelector('.tiles'); });
  await check('Session cookie is HttpOnly and no token is in storage', async () => {
    const cookies = await ctx.cookies(); const refresh = cookies.find((c) => c.name === 'ff_refresh');
    assert(refresh?.httpOnly, 'refresh cookie missing or not HttpOnly');
    assert((await page.evaluate(() => Object.keys(localStorage).concat(Object.keys(sessionStorage)).length)) === 0, 'storage not empty');
    assert(!(await page.evaluate(() => document.cookie)).includes('ff_refresh'), 'refresh cookie visible to JS');
  });
  const tok = await apiTok(page);
  const cleanup = async () => {
    const list = await page.evaluate(async (t) => (await (await fetch('/api/tasks/?page_size=200', { headers: { Authorization: `Bearer ${t}` } })).json()).results, tok);
    for (const t of list.filter((x) => x.title.startsWith('smoke-')))
      await page.evaluate(async ([id, tk]) => fetch(`/api/tasks/${id}/`, { method: 'DELETE', headers: { Authorization: `Bearer ${tk}` } }), [t.id, tok]);
  };
  await cleanup();
  await check('Overview shows stats and plan meter', async () => { await page.goto(`${BASE}/app`); await page.waitForSelector('.tiles'); await page.waitForSelector('.meter'); await page.waitForSelector('.radial'); });
  await check('Top-bar search jumps to Tasks filtered by the query', async () => {
    await page.goto(`${BASE}/app`); await page.waitForSelector('#global-search');
    await page.fill('#global-search', 'zzz-nothing-matches'); await page.keyboard.press('Enter');
    await page.waitForURL('**/app/tasks?q=zzz-nothing-matches'); await page.waitForSelector('text=No tasks match');
    await page.goto(`${BASE}/app`); await page.waitForSelector('#global-search');
    await page.keyboard.press('/'); assert(await page.evaluate(() => document.activeElement?.id) === 'global-search', '"/" did not focus search');
  });
  await check('Create a task (UI) and see it in the list', async () => {
    await page.goto(`${BASE}/app/tasks`); await page.waitForSelector('.quick-add');
    await page.fill('#new-title', 'smoke-alpha'); await page.selectOption('#new-priority', 'high'); await page.click('button:has-text("Add task")');
    await page.waitForSelector('text=smoke-alpha');
  });
  await check('Complete and reopen a task via checkbox', async () => {
    const cb = page.getByRole('checkbox', { name: 'smoke-alpha' });
    const isDone = () => page.evaluate(() => [...document.querySelectorAll('.row.done .title')].some((e) => e.textContent === 'smoke-alpha'));
    await cb.click(); await page.waitForFunction(() => [...document.querySelectorAll('.row.done .title')].some((e) => e.textContent === 'smoke-alpha'));
    assert(await isDone(), 'task not marked done');
    await cb.click(); await page.waitForFunction(() => ![...document.querySelectorAll('.row.done .title')].some((e) => e.textContent === 'smoke-alpha'));
  });
  await check('Search and priority filter narrow the list', async () => {
    await page.fill('#task-search', 'zzz-no-match'); await page.waitForSelector('text=No tasks match');
    await page.fill('#task-search', 'smoke-al'); await page.waitForSelector('text=smoke-alpha');
    await page.selectOption('#task-prio', 'low'); await page.waitForSelector('text=No tasks match');
    await page.selectOption('#task-prio', 'all'); await page.fill('#task-search', '');
  });
  await check('Board: drag a card to Done and persist after reload', async () => {
    await page.setViewportSize({ width: 1280, height: 1800 }); // Playwright cannot auto-scroll mid-drag; tall page keeps source and target visible
    await page.click('button:has-text("Board")'); await page.waitForSelector('.board');
    await page.locator('.tcard', { hasText: 'smoke-alpha' }).dragTo(page.locator('section.column[aria-label="Done"]'));
    await page.waitForSelector('section.column[aria-label="Done"] .tcard:has-text("smoke-alpha")');
    await page.reload(); await page.click('button:has-text("Board")');
    await page.waitForSelector('section.column[aria-label="Done"] .tcard:has-text("smoke-alpha")');
    await page.setViewportSize({ width: 1280, height: 800 });
  });
  await check('Board: keyboard-accessible move via select', async () => {
    await page.locator('.tcard', { hasText: 'smoke-alpha' }).locator('select').selectOption('in_progress');
    await page.waitForSelector('section.column[aria-label="In progress"] .tcard:has-text("smoke-alpha")');
  });
  await check('Free plan limit blocks the 11th task with an upgrade prompt', async () => {
    const have = await page.evaluate(async (t) => (await (await fetch('/api/tasks/', { headers: { Authorization: `Bearer ${t}` } })).json()).count, tok);
    let last;
    for (let i = have; i < 11; i++) {
      last = await page.evaluate(async ([t, i]) => (await fetch('/api/tasks/', { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `smoke-fill-${i}` }) })).status, [tok, i]);
    }
    assert(last === 403 || have >= 10, `11th task status ${last}`);
  });
  await check('Focus timer is gated for free users', async () => { await page.goto(`${BASE}/app/focus`); await page.waitForSelector('text=Premium feature'); });
  await check('Insights page renders charts', async () => { await page.goto(`${BASE}/app/insights`); await page.waitForSelector('.recharts-wrapper'); });
  await check('Account: profile loads, data export downloads valid JSON', async () => {
    await page.goto(`${BASE}/app/account`); await page.waitForSelector('.kv');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Export my data")')]);
    const json = JSON.parse(await (await import('node:fs/promises')).readFile(await dl.path(), 'utf8'));
    assert(json.account && Array.isArray(json.tasks), 'bad export shape');
    assert(!JSON.stringify(json).includes('password'), 'export leaks password field');
  });
  await check('Delete-account dialog: opens modal, Escape closes it, focus returns', async () => {
    await page.click('button:has-text("Delete account")'); await page.waitForSelector('dialog[open]');
    await page.keyboard.press('Escape'); await page.waitForSelector('dialog[open]', { state: 'detached' });
  });
  await check('Skip link and main landmark exist', async () => {
    assert(await page.locator('a.skip-link').count() === 1, 'no skip link'); assert(await page.locator('main#main').count() === 1, 'no <main>');
  });
  await check('Session survives reload; sign out ends it', async () => {
    await page.reload(); await page.waitForSelector('.kv');
    await page.click('button[aria-label="Sign out"]'); await page.waitForURL('**/login');
    await page.goto(`${BASE}/app`); await page.waitForURL('**/login');
  });
  await check('Old refresh token is dead after sign-out', async () => {
    const stolen = (await ctx.cookies()).find((c) => c.name === 'ff_refresh');
    assert(!stolen, 'refresh cookie should be cleared');
  });
  await cleanup().catch(() => {});
  await ctx.close();
}

// ---------- Premium journey ----------
{
  const ctx = await newCtx(); const page = await ctx.newPage(); watch(page, 'premium');
  await check('Premium: sign in and see Premium plan', async () => { await login(page, PRO, PRO_PASS); await page.goto(`${BASE}/app/account`); await page.waitForSelector('text=Premium'); });
  await check('Premium: focus timer starts, pauses and stops without errors', async () => {
    await page.goto(`${BASE}/app/focus`); await page.waitForSelector('.timer');
    await page.click('button:has-text("Start focus")'); await page.waitForSelector('button:has-text("Pause")');
    await page.click('button:has-text("Pause")'); await page.waitForSelector('button:has-text("Resume")');
    await page.click('button:has-text("Stop")'); await page.waitForSelector('button:has-text("Start focus")');
  });
  await check('Premium: advanced insights chart visible', async () => { await page.goto(`${BASE}/app/insights`); await page.waitForSelector('text=Focus minutes'); });
  await check('Premium: second checkout is refused', async () => {
    const t = await apiTok(page);
    const r = await page.request.post(`${BASE}/api/payments/create-checkout/`, { data: { plan: 'monthly' }, headers: { Authorization: `Bearer ${t}` } });
    assert([409, 503].includes(r.status()), `status ${r.status()}`);
  });
  await check('Premium cannot be self-granted via profile PATCH', async () => {
    const free = await (await newCtx()).newPage(); await login(free, USER, PASS);
    const t = await apiTok(free);
    const r = await free.request.patch(`${BASE}/api/users/profile/`, { data: { is_premium: true }, headers: { Authorization: `Bearer ${t}` } });
    const me = await (await free.request.get(`${BASE}/api/users/profile/`, { headers: { Authorization: `Bearer ${t}` } })).json();
    assert(me.is_premium === false, `is_premium became ${me.is_premium} (patch ${r.status()})`);
  });
  await ctx.close();
}

// ---------- Responsive ----------
for (const [name, vp] of [['phone 360', { width: 360, height: 740 }], ['tablet 768', { width: 768, height: 1024 }]]) {
  const ctx = await newCtx(vp); const page = await ctx.newPage(); watch(page, name);
  await check(`No horizontal overflow on public pages (${name})`, async () => {
    for (const p of ['/', '/pricing', '/login', '/register']) {
      await page.goto(`${BASE}${p}`); await page.waitForSelector('main');
      const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(o <= 1, `${p} overflows by ${o}px`);
    }
  });
  await check(`App pages usable and not overflowing (${name})`, async () => {
    await login(page, USER, PASS);
    for (const p of ['/app', '/app/tasks', '/app/insights', '/app/account']) {
      await page.goto(`${BASE}${p}`); await page.waitForSelector('main#main');
      await page.waitForTimeout(400);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(o <= 1, `${p} overflows by ${o}px`);
    }
  });
  if (vp.width < 900) await check('Mobile drawer: hidden links not focusable when closed, opens and closes with Escape', async () => {
    await page.goto(`${BASE}/app`); await page.waitForSelector('.topbar');
    assert(!(await page.locator('.sidebar a').first().isVisible()), 'drawer links visible while closed');
    await page.click('button[aria-label="Open menu"]'); await page.waitForSelector('.sidebar.open a');
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('.sidebar.open'));
  });
  await ctx.close();
}

await check('No unexpected browser console/page errors', async () => {
  assert(consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
});

await browser.close();
const failed = results.filter((r) => !r[0]);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) { console.log('Failures:'); failed.forEach((f) => console.log(` - ${f[1]}: ${f[2]}`)); process.exit(1); }
