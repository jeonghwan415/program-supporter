// 프로그램 서포터 — 센터 계정(B) 두 컴퓨터 시험 (가짜 Supabase: mock/server.js + 실제 PostgreSQL)
const { chromium } = require('playwright');
const { Client } = require('pg');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:8090';
const URL = BASE + '/chajikimi/%ED%94%84%EB%A1%9C%EA%B7%B8%EB%9E%A8/%EC%86%8C%EC%8A%A4/build/%EC%B0%A8%EB%9F%89%EC%A7%80%ED%82%B4%EC%9D%B4.html';
const KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.testanonkeytestanonkey';
const shots = '/tmp/shots/cc'; fs.mkdirSync(shots, { recursive: true });
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const db = new Client({ host: '/tmp', port: 5433, user: 'postgres', database: 't' }); await db.connect();
  const b = await chromium.launch();
  const errs = [];
  async function ctx(name) {
    const c = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    const p = await c.newPage(); p.on('pageerror', e => errs.push(name + ' ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errs.push(name + ' console ' + m.text()); });
    p.on('dialog', d => d.dismiss());
    return p;
  }
  async function makePlan(p, kw) {
    await p.click(`[data-kw="${kw}"]`); await p.click('[data-grade="초3"]'); await p.click('#makeBtn'); await p.waitForSelector('#checkCard');
    await p.waitForTimeout(300); await p.evaluate(() => go(1)); await p.waitForTimeout(300);
  }
  async function signup(p, email, shot) {
    await p.click('#ccChip'); await p.waitForSelector('.cc-dlg[open]'); await p.click('[data-a="setup"]');
    if (shot) await p.screenshot({ path: shots + '/1_setup.png' });
    await p.fill('#ccUrl', 'http://localhost:54321'); await p.fill('#ccKey', KEY); await p.click('[data-a="save"]');
    await p.click('[data-tab="up"]'); await p.fill('#ccEmail', email); await p.fill('#ccPw', 'abcd1234'); await p.fill('#ccPw2', 'abcd1234');
    if (shot) await p.screenshot({ path: shots + '/2_signup.png' });
    await p.click('[data-a="go"]'); await p.waitForTimeout(800); try { await p.waitForSelector('.cc-card[data-a="new"]', { timeout: 8000 }); } catch (e) { await p.screenshot({ path: '/tmp/fail.png' }); console.error('FAIL DLG', await p.textContent('.cc-dlg'), await p.evaluate(() => JSON.stringify([localStorage.getItem('cc.session') && 'sess', localStorage.getItem('cc.config')]))); throw e; }
    if (shot) await p.screenshot({ path: shots + '/3_centers.png' });
  }
  const A = await ctx('A'); await A.goto(URL); await A.waitForTimeout(600);
  ok(await A.isVisible('#ccChip') && !(await A.isVisible('#sync')), '파일판: 센터 계정 단추가 저장 상태를 보여 줌');
  await A.click('text=예시로 먼저 살펴보기'); await A.waitForTimeout(600);
  const nLocal = await A.evaluate(() => { const S = CJ.state(); return Object.keys(S.trips).length + Object.keys(S.vehicles).length; });
  await A.screenshot({ path: shots + '/c0_home.png' });
  await signup(A, 'owner@x.kr');
  await A.click('[data-a="new"]'); await A.fill('#ccName', '해솔지역아동센터'); await A.fill('#ccMe', '박정환'); await A.check('#ccAck'); await A.click('[data-a="go"]');
  await A.waitForSelector('.cc-dlg [data-v="merge"]'); await Promise.all([A.waitForNavigation(), A.click('[data-v="merge"]')]); await A.waitForTimeout(1500);
  let r = await db.query("select count(*) n from center_data where app='chajikimi' and value is not null");
  ok(+r.rows[0].n >= nLocal, '이 기기 기록을 센터에 합침 (' + r.rows[0].n + '줄, 이 기기 ' + nLocal + ')');
  ok((await A.textContent('#ccChip')).includes('함께 저장'), 'A: 센터 계정판으로 열림: ' + await A.textContent('#ccChip'));
  ok(await A.evaluate(() => Object.keys(CJ.state().vehicles).length) >= 1, 'A: 센터 기록에서 차량이 보임');
  const code = (await db.query('select invite_code from centers')).rows[0].invite_code;
  const B = await ctx('B'); await B.goto(URL); await B.waitForTimeout(500);
  await signup(B, 'teacher@x.kr'); await B.click('[data-a="join"]'); await B.fill('#ccCode', code); await B.fill('#ccMe', '김선생');
  await Promise.all([B.waitForNavigation(), B.click('[data-a="go"]')]); await B.waitForTimeout(1500);
  ok(await B.evaluate(() => Object.keys(CJ.state().trips).length) === await A.evaluate(() => Object.keys(CJ.state().trips).length), 'B: A와 같은 운행 기록 수');
  await B.evaluate(() => { const v = Object.keys(CJ.state().vehicles)[0]; put('trips', 'tB1', { vid: v, date: '2026-11-24', start: '15:00', end: '15:30', purpose: '하원', km0: 1, km1: 9, driver: '김선생', ts: Date.now() }); });
  await B.waitForTimeout(1200);
  r = await db.query("select updated_name from center_data where key='trips/tB1'");
  ok(r.rows[0] && r.rows[0].updated_name === '김선생', 'B가 적은 운행이 서버에 (적은 사람: 김선생)');
  await A.evaluate(() => window.dispatchEvent(new Event('focus'))); await A.waitForTimeout(1500);
  ok(await A.evaluate(() => !!CJ.state().trips.tB1), 'A: B가 적은 운행을 받음');
  // 끊김 → 보관 → 다시 보냄
  require('fs').writeFileSync('/tmp/mock_down', '1');
  await A.evaluate(() => { const v = Object.keys(CJ.state().vehicles)[0]; put('trips', 'tA9', { vid: v, date: '2026-11-24', start: '16:00', end: '16:30', purpose: '등원', km0: 1, km1: 5, driver: '박정환', ts: Date.now() }); });
  await A.waitForTimeout(800);
  ok((await A.evaluate(() => CJ.outbox().length)) === 1, '끊겼을 때 보관함에 1건');
  require('fs').unlinkSync('/tmp/mock_down');
  await A.evaluate(() => flush()); await A.waitForTimeout(1200);
  r = await db.query("select count(*) n from center_data where key='trips/tA9'");
  ok(+r.rows[0].n === 1 && (await A.evaluate(() => CJ.outbox().length)) === 0, '다시 연결되면 보냄');
  await A.screenshot({ path: shots + '/c1_center.png' });
  // 로그아웃: 센터 기록 보관본 지움, 이 기기 기록(예시)은 다시 보임
  await A.click('#ccChip'); await A.waitForTimeout(500); await Promise.all([A.waitForNavigation(), A.click('[data-a="out"]')]); await A.waitForTimeout(800);
  ok(await A.evaluate(() => localStorage.getItem('cj.center')) === null, '로그아웃하면 센터 기록 보관본을 지움');
  ok(!(await A.evaluate(() => !!CJ.state().trips.tB1)), '로그아웃 뒤에는 센터 기록이 안 보임');
  const M = await b.newPage({ viewport: { width: 390, height: 844 } }); await M.goto(URL); await M.waitForTimeout(500); await M.screenshot({ path: shots + '/c2_mobile.png' });
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
  await b.close(); await db.end();
})();
