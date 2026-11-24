// 아이디·비밀번호 센터 계정 (center-cloud v1.2) 두 컴퓨터 시험 — 6대 의무교육 도우미 · 프로그램 서포터
// 서버 주소를 프로그램에 넣어 둔 상태(선생님에게 배포한 상태)처럼: 저장 단추 → 바로 로그인 창 (서버 입력 없음)
const { chromium } = require('playwright'); const { Client } = require('pg');
const BASE = process.env.BASE || 'http://localhost:8090';
const KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.testanonkeytestanonkey';
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const db = new Client({ host: '/tmp', port: 5433, user: 'postgres', database: process.env.DB || 't' }); await db.connect();
  const b = await chromium.launch(); const errs = [];
  async function page(url, name) {
    const c = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(name + ' ' + e.message)); p.on('dialog', d => d.dismiss());
    await p.addInitScript(([k]) => { window.CENTER_CLOUD_CONFIG_TEST = 1; Object.defineProperty(window, 'CENTER_CLOUD_CONFIG', { configurable: true, get() { return { url: 'http://localhost:54321', anonKey: k }; }, set() {} }); }, [KEY]);
    await p.goto(url); await p.waitForTimeout(600); return p;
  }
  async function signup(p, id, pw = 'abcd1234') {
    await p.click('#ccChip'); await p.waitForSelector('.cc-dlg[open]');
    await p.click('[data-tab="up"]'); await p.fill('#ccEmail', id); await p.fill('#ccPw', pw); await p.fill('#ccPw2', pw); await p.click('[data-a="go"]'); await p.waitForTimeout(800);
  }
  const SE = BASE + '/edu-safety-helper/index.html', PS = BASE + '/program-supporter/index.html';
  // ---- A: 센터장 (6대 의무교육 도우미)
  const A = await page(SE + '#home', 'A');
  await A.click('#ccChip'); await A.waitForSelector('.cc-dlg[open]');
  ok(await A.isVisible('#ccEmail') && !(await A.isVisible('#ccUrl')), '서버 주소가 들어 있으면 저장 단추 → 바로 로그인 창 (서버 입력 없음)');
  ok((await A.textContent('.cc-dlg label[for="ccEmail"], .cc-dlg')).includes('아이디'), '칸 이름이 "아이디"');
  await A.click('.cc-x');
  await signup(A, 'AB'); ok((await A.textContent('#ccErr')).includes('3~30자'), '짧은 아이디는 안내');
  await A.fill('#ccEmail', '해솔'); await A.click('[data-a="go"]'); ok((await A.textContent('#ccErr')).includes('영어 소문자'), '한글 아이디는 안내');
  await A.fill('#ccEmail', 'Haesol01'); await A.click('[data-a="go"]'); await A.waitForTimeout(800);
  ok(await A.isVisible('.cc-card[data-a="new"]'), '아이디(Haesol01)로 가입 → 센터 고르기');
  ok((await db.query("select email from auth.users")).rows.some(r => r.email === 'haesol01@example.com'), '서버에는 haesol01@example.com 으로 저장 (소문자)');
  ok((await A.textContent('.cc-dlg')).includes('haesol01') && !(await A.textContent('.cc-dlg')).includes('@example.com'), '화면에는 아이디만 보임');
  await A.click('[data-a="new"]'); await A.fill('#ccName', '해솔지역아동센터'); await A.fill('#ccMe', '박정환'); await A.check('#ccAck');
  await Promise.all([A.waitForNavigation(), A.click('[data-a="go"]')]); await A.waitForTimeout(800);
  ok((await A.textContent('#ccChip')).includes('해솔지역아동센터'), '센터 만들기 → 머리말에 센터 이름');
  ok(!(await A.getAttribute('#ccChip', 'title')).includes('@example.com'), '단추 설명에도 아이디만');
  // 교육 기록 1건
  await A.evaluate(() => { location.hash = '#write-traffic-traffic-e-02-low'; }); await A.waitForTimeout(500);
  await A.fill('[name=children]', '12'); await A.click('#recForm button[type=submit]'); await A.waitForTimeout(2500);
  const code = (await db.query('select invite_code from centers')).rows[0].invite_code;
  // ---- B: 선생님 (다른 컴퓨터, 아이디로 가입 → 초대 코드)
  const B = await page(SE + '#home', 'B');
  await signup(B, 'haesol01'); ok((await B.textContent('#ccErr')).includes('이미 있는 아이디'), '같은 아이디로는 가입 못 함');
  await B.fill('#ccEmail', 'teacher02'); await B.click('[data-a="go"]'); await B.waitForTimeout(800);
  await B.click('[data-a="join"]'); await B.fill('#ccCode', code); await B.fill('#ccMe', '김선생');
  await Promise.all([B.waitForNavigation().catch(() => {}), B.click('[data-a="go"]')]); await B.waitForTimeout(2500);
  ok(await B.evaluate(() => JSON.parse(localStorage.getItem('seh-records-v1') || '[]').length) === 1, 'B: 초대 코드로 들어오자 센터장이 적은 교육 기록이 보임');
  // ---- 다른 센터: 다른 아이디로 새 센터 → 해솔 기록은 안 보임 (센터 고유)
  const C = await page(SE + '#home', 'C');
  await signup(C, 'hanbit01'); await C.click('[data-a="new"]'); await C.fill('#ccName', '한빛지역아동센터'); await C.fill('#ccMe', '이센터장'); await C.check('#ccAck');
  await Promise.all([C.waitForNavigation(), C.click('[data-a="go"]')]); await C.waitForTimeout(2000);
  ok(await C.evaluate(() => JSON.parse(localStorage.getItem('seh-records-v1') || '[]').length) === 0, '다른 센터(한빛)에서는 해솔 기록이 안 보임');
  // ---- 비밀번호 바꾸기 → 로그아웃 → 새 비밀번호로 로그인 (프로그램 서포터에서도 같은 계정)
  await B.click('#ccChip'); await B.waitForSelector('[data-a="pw"]'); await B.click('[data-a="pw"]');
  await B.fill('#ccPw', 'newpass99'); await B.fill('#ccPw2', 'newpass99'); await B.click('[data-a="go"]'); await B.waitForTimeout(800);
  ok(await B.isVisible('.cc-dlg[open] [data-a="out"]'), '비밀번호를 바꾸면 센터 계정 창으로 돌아옴');
  await Promise.all([B.waitForNavigation(), B.click('[data-a="out"]')]); await B.waitForTimeout(800);
  const P = await page(PS, 'P');
  await P.click('#ccChip'); await P.fill('#ccEmail', 'teacher02'); await P.fill('#ccPw', 'abcd1234'); await P.click('[data-a="go"]'); await P.waitForTimeout(600);
  ok((await P.textContent('#ccErr')).includes('아이디나 비밀번호가 맞지 않아요'), '옛 비밀번호는 안 됨 (안내 문구)');
  await P.fill('#ccPw', 'newpass99'); await P.click('[data-a="go"]'); await P.waitForTimeout(800);
  ok(await P.isVisible('.cc-dlg [data-a="join"], .cc-dlg .cc-card'), '새 비밀번호로 프로그램 서포터에도 같은 아이디로 로그인');
  // ---- 아이디 계정은 메일로 비밀번호 찾기 안 됨 → 안내
  const F = await page(PS, 'F'); await F.click('#ccChip'); await F.click('[data-a="forgot"]'); await F.fill('#ccEmail', 'teacher02'); await F.click('[data-a="go"]');
  ok((await F.textContent('#ccErr')).includes('센터장'), '아이디 계정 비밀번호 찾기 → 센터장에게 말하라는 안내');
  ok(!errs.length, '콘솔 오류 없음 ' + errs.join(' | '));
  console.log('ERRORS:', errs.length || process.exitCode ? 'some' : 'none'); await b.close(); await db.end();
})();
