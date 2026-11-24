// 프로그램 서포터 — 센터 계정(B) 두 컴퓨터 시험 (가짜 Supabase: mock/server.js + 실제 PostgreSQL)
const { chromium } = require('playwright');
const { Client } = require('pg');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:8090';
const URL = BASE + '/program-supporter/index.html';
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
  // ---- A: 센터장
  const A = await ctx('A'); await A.goto(URL); await A.waitForTimeout(500);
  ok(await A.isVisible('.cc-tour') === false, '자동 테스트에서는 사용 안내가 자동으로 안 뜸');
  ok((await A.textContent('#ccChip')).includes('이 컴퓨터에만'), '처음 상태 = 이 컴퓨터에만 저장(A)');
  await A.screenshot({ path: shots + '/0_header.png', clip: { x: 0, y: 0, width: 1280, height: 200 } });
  await signup(A, 'owner@x.kr', true);
  await A.click('[data-a="new"]'); await A.fill('#ccName', '해솔지역아동센터'); await A.fill('#ccMe', '박정환');
  await A.click('[data-a="go"]'); ok((await A.textContent('#ccErr')).includes('개인정보'), '개인정보 확인 없이 센터 못 만듦');
  await A.screenshot({ path: shots + '/4_create.png' });
  await A.check('#ccAck'); await Promise.all([A.waitForNavigation(), A.click('[data-a="go"]')]); await A.waitForTimeout(800);
  ok((await A.textContent('#ccChip')).includes('해솔지역아동센터'), '센터를 만들면 머리말에 센터 이름');
  await makePlan(A, '요리'); await A.waitForTimeout(2500);
  let r = await db.query("select key, updated_name from center_data where app='program-supporter' and value is not null");
  ok(r.rows.some(x => x.key.startsWith('ps.plans/')), 'A가 만든 계획서가 서버에 올라감 (' + r.rows.map(x => x.key).join(',') + ')');
  const code = (await db.query('select invite_code from centers')).rows[0].invite_code;
  await A.evaluate(() => { const all = JSON.parse(localStorage.getItem('ps.plans')); const id = Object.keys(all)[0]; all[id].plan.testPhoto = 'data:image/png;base64,' + 'A'.repeat(5000); localStorage.setItem('ps.plans', JSON.stringify(all)); });
  await A.waitForTimeout(2500);
  r = await db.query("select value::text v from center_data where key like 'ps.plans/%'");
  ok(r.rows.every(x => !x.v.includes('data:image')), '사진(data: 주소)은 서버에 저장되지 않음');
  // ---- B: 선생님 (이미 이 컴퓨터에 계획서 1개)
  const B = await ctx('B'); await B.goto(URL); await B.waitForTimeout(400); await makePlan(B, '생활습관');
  await signup(B, 'teacher@x.kr');
  await B.click('[data-a="join"]'); await B.fill('#ccCode', 'WRONG123'); await B.fill('#ccMe', '김선생'); await B.click('[data-a="go"]'); await B.waitForTimeout(400);
  ok((await B.textContent('#ccErr')).includes('맞지 않'), '틀린 초대 코드 안내');
  await B.fill('#ccCode', code.toLowerCase()); await B.click('[data-a="go"]');
  await B.waitForSelector('.cc-dlg [data-v="merge"]'); await B.screenshot({ path: shots + '/5_merge.png' });
  await B.click('[data-v="merge"]'); await B.waitForTimeout(3000);
  let nB = await B.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ps.plans') || '{}')).length);
  ok(nB === 2, 'B: 합치기 후 계획서 2개 (' + nB + ')');
  ok((await B.textContent('#plansCount')).includes('함께 저장'), 'B: 내 프로그램에 "함께 저장" 표시');
  await A.evaluate(() => CC.syncNow()); await A.waitForTimeout(1200);
  let nA = await A.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ps.plans') || '{}')).length);
  ok(nA === 2, 'A: B의 계획서를 받아서 2개 (' + nA + ')');
  ok(await A.evaluate(() => Object.values(JSON.parse(localStorage.getItem('ps.plans'))).some(e => e.plan && e.plan.testPhoto && e.plan.testPhoto.length > 100)), 'A: 내 컴퓨터의 사진은 그대로 남음');
  await B.evaluate(() => { const all = JSON.parse(localStorage.getItem('ps.plans')); const ids = Object.keys(all); const aId = ids.find(id => all[id].input && all[id].input.keyword === '요리'); delete all[aId]; localStorage.setItem('ps.plans', JSON.stringify(all)); });
  await B.waitForTimeout(2500); await A.evaluate(() => CC.syncNow()); await A.waitForTimeout(1200);
  nA = await A.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ps.plans') || '{}')).length);
  ok(nA === 1, 'B가 지운 계획서가 A에서도 지워짐 (' + nA + ')');
  await A.click('#ccChip'); await A.waitForTimeout(800);
  ok((await A.textContent('#ccPeople')).includes('김선생'), '센터 창: 선생님 목록에 김선생');
  ok((await A.textContent('#ccRecent')).includes('삭제'), '센터 창: 최근 고친 기록에 삭제가 보임');
  await A.screenshot({ path: shots + '/6_center.png' });
  await A.click('[data-a="close"]');
  // 서버 끊김 → 보관 → 다시 연결되면 보냄
  fs.writeFileSync('/tmp/mock_down', '1');
  await A.evaluate(() => { const all = JSON.parse(localStorage.getItem('ps.plans')); const id = Object.keys(all)[0]; all[id].updated = Date.now(); all[id].offlineEdit = 1; localStorage.setItem('ps.plans', JSON.stringify(all)); });
  await A.waitForTimeout(2500);
  ok((await A.textContent('#ccChip')).includes('연결 끊김'), '서버가 끊기면 "연결 끊김" 표시: ' + await A.textContent('#ccChip'));
  fs.unlinkSync('/tmp/mock_down');
  await A.evaluate(() => CC.syncNow()); await A.waitForTimeout(1500);
  r = await db.query("select count(*) n from center_data where value->>'offlineEdit' = '1'");
  ok(+r.rows[0].n === 1, '다시 연결되면 보관한 기록을 보냄');
  ok((await A.textContent('#ccChip')).includes('함께 저장'), '다시 "함께 저장" 표시');
  // B 로그아웃 → 이 컴퓨터 기록 지움
  await B.click('#ccChip'); await B.waitForTimeout(300); await Promise.all([B.waitForNavigation(), B.click('[data-a="out"]')]); await B.waitForTimeout(800);
  ok(await B.evaluate(() => localStorage.getItem('ps.plans')) === null, 'B 로그아웃하면 이 컴퓨터에서 센터 기록을 지움 (공용 컴퓨터 보호)');
  ok((await B.textContent('#ccChip')).includes('이 컴퓨터에만'), 'B: 다시 이 컴퓨터에만 저장');
  await B.click('#ccChip'); await B.fill('#ccEmail', 'teacher@x.kr'); await B.fill('#ccPw', 'abcd1234'); await B.click('[data-a="go"]');
  await B.waitForSelector('.cc-card[data-i]'); await Promise.all([B.waitForNavigation(), B.click('.cc-card[data-i="0"]')]); await B.waitForTimeout(1200);
  nB = await B.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ps.plans') || '{}')).length);
  ok(nB === 1, 'B: 다시 로그인하면 센터 기록 1개를 받음 (' + nB + ')');
  // 로그인 잠금 안내 (실패 횟수 5회가 저장된 상태를 만들어 확인)
  const D = await ctx('D'); await D.goto(URL);
  await D.evaluate(KEY => { localStorage.setItem('cc.config', JSON.stringify({ url: 'http://localhost:54321', key: KEY })); localStorage.setItem('cc.fails', JSON.stringify({ n: 5, at: Date.now() })); }, KEY); await D.reload();
  await D.click('#ccChip'); await D.fill('#ccEmail', 'owner@x.kr'); await D.fill('#ccPw', 'abcd1234'); await D.click('[data-a="go"]'); await D.waitForTimeout(300);
  ok((await D.textContent('#ccErr')).includes('잠겼'), '로그인을 5번 틀린 뒤에는 5분 잠금 안내');
  // 로그인 시간이 지나도 자동 갱신
  await A.evaluate(() => { const s = JSON.parse(localStorage.getItem('cc.session')); s.expires_at = 0; localStorage.setItem('cc.session', JSON.stringify(s)); });
  await A.evaluate(() => CC.syncNow()); await A.waitForTimeout(1000);
  ok((await A.textContent('#ccChip')).includes('함께 저장'), '로그인 시간이 지나도 자동으로 이어짐');
  // 사용 안내 · 글자 크기
  await A.click('#tourBtn'); await A.waitForSelector('.cc-tour'); await A.screenshot({ path: shots + '/7_tour1.png' });
  await A.click('[data-t="next"]'); await A.click('[data-t="next"]'); await A.waitForTimeout(300); await A.screenshot({ path: shots + '/8_tour3.png' });
  await A.keyboard.press('Escape'); ok(!(await A.isVisible('.cc-tour')), '사용 안내 Esc로 닫힘');
  await A.click('#zoomBtn'); ok((await A.evaluate(() => document.documentElement.style.zoom)) === '1.12', '글자 크게 = 1.12배');
  await A.screenshot({ path: shots + '/9_zoom.png' }); await A.click('#zoomBtn'); await A.click('#zoomBtn');
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
  await b.close(); await db.end();
})();
