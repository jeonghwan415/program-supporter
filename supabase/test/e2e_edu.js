// 프로그램 서포터 — 센터 계정(B) 두 컴퓨터 시험 (가짜 Supabase: mock/server.js + 실제 PostgreSQL)
const { chromium } = require('playwright');
const { Client } = require('pg');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:8090';
const URL = BASE + '/edu-safety-helper/index.html';
const KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.testanonkeytestanonkey';
const shots = '/tmp/shots/cc'; fs.mkdirSync(shots, { recursive: true });
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const db = new Client({ host: '/tmp', port: 5433, user: 'postgres', database: process.env.DB || 't' }); await db.connect();
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
  const A = await ctx('A'); await A.goto(URL); await A.waitForTimeout(500);
  await A.screenshot({ path: shots + '/e0_home.png' });
  await signup(A, 'owner@x.kr');
  await A.click('[data-a="new"]'); await A.fill('#ccName', '해솔지역아동센터'); await A.fill('#ccMe', '박정환'); await A.check('#ccAck');
  await Promise.all([A.waitForNavigation(), A.click('[data-a="go"]')]); await A.waitForTimeout(800);
  ok((await A.textContent('#ccChip')).includes('함께 저장'), 'A 센터 계정');
  await A.evaluate(() => { localStorage.setItem('seh-records-v1', JSON.stringify([{ id: 'r1', areaId: 'traffic', topicId: 'x', level: 'low', date: '2026-11-20', note: '시험' }])); });
  await A.waitForTimeout(2500);
  let r = await db.query("select key from center_data where app='edu-safety-helper' and value is not null");
  ok(r.rows.map(x => x.key).join() === 'seh-records-v1/r1', '교육 기록이 서버에 올라감');
  const code = (await db.query('select invite_code from centers')).rows[0].invite_code;
  const B = await ctx('B'); await B.goto(URL + '#docs'); await B.waitForTimeout(400);
  await B.evaluate(() => localStorage.setItem('seh-records-v1', JSON.stringify([{ id: 'r2', areaId: 'traffic', topicId: 'x', level: 'low', date: '2026-11-21' }])));
  await signup(B, 'teacher@x.kr');
  await B.click('[data-a="join"]'); await B.fill('#ccCode', code); await B.fill('#ccMe', '김선생'); await B.click('[data-a="go"]');
  await B.waitForSelector('.cc-dlg [data-v="merge"]'); await B.click('[data-v="merge"]'); await B.waitForTimeout(2500);
  const nB = await B.evaluate(() => JSON.parse(localStorage.getItem('seh-records-v1')).map(x => x.id).sort().join());
  ok(nB === 'r1,r2', 'B 합치기 후 기록 r1,r2 (' + nB + ')');
  await A.evaluate(() => CC.syncNow()); await A.waitForTimeout(1200);
  ok((await A.evaluate(() => JSON.parse(localStorage.getItem('seh-records-v1')).length)) === 2, 'A도 2건');
  ok((await A.textContent('#ccToast')).includes('김선생'), 'A 알림에 김선생: ' + await A.textContent('#ccToast'));
  await A.goto(URL + '#docs'); await A.waitForTimeout(500); await A.screenshot({ path: shots + '/e1_docs.png' });
  const M = await b.newPage({ viewport: { width: 390, height: 844 } }); await M.goto(URL); await M.waitForTimeout(500); await M.screenshot({ path: shots + '/e2_mobile.png' });
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
  await b.close(); await db.end();
})();
