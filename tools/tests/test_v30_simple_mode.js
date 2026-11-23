// v3.0 간단 모드 · 인쇄 전 확인 · 희망이음 옮겨 적기 · 내 프로그램 현황판
const { chromium } = require('playwright'); const path = require('path');
const [, , htmlPath, out] = process.argv;
(async () => {
  const b = await chromium.launch(); const errs = [], fails = [];
  const L = (...a) => console.log(...a);
  const ok = (c, m) => { L((c ? '✓ ' : '✗ ') + m); if (!c) fails.push(m); };
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(htmlPath)); // ?full 없이 = 처음 쓰는 선생님
  ok(await p.evaluate(() => document.documentElement.classList.contains('simple')), '처음 열면 간단 모드');
  ok(!(await p.isVisible('#guideCard')), '간단 모드: 평가 안내 자료 숨김');
  await p.fill('#center', '○○지역아동센터'); await p.dispatchEvent('#center', 'input');
  await p.fill('#teacher', '담당 교사'); await p.dispatchEvent('#teacher', 'input');
  await p.click('[data-kw="독서"]'); await p.click('[data-grade="초3"]'); await p.click('#makeBtn'); await p.waitForSelector('#secNav');
  ok(!(await p.isVisible('#indCard')) && !(await p.isVisible('#sec-budget')), '간단 모드: 평가 지표·예산 숨김');
  const navTxt = await p.textContent('#secNav');
  ok(!navTxt.includes('평가 지표') && !navTxt.includes('예산'), '간단 모드: 목차에도 숨긴 칸 없음');
  const chk = await p.textContent('#checkCard');
  ok(!chk.includes('[평가') && !chk.includes('예산이 비어'), '간단 모드: 점검에 숨긴 칸 경고 없음');
  // 모든 기능 보기로 바꾸기
  await p.click('#modeBtn');
  ok(await p.isVisible('#indCard') && (await p.textContent('#secNav')).includes('평가 지표'), "'모든 기능 보기'를 누르면 평가 지표가 보임");
  await p.click('#modeBtn');
  ok(!(await p.isVisible('#indCard')), "'간단히 보기'로 다시 숨김");
  // 3단계: 인쇄 전 확인 + 희망이음
  await p.click('[data-act="next"]');
  ok(!(await p.isVisible('[data-tab="notice"]')) && !(await p.isVisible('[data-tab="proof"]')), '간단 모드: 가정통신문·증빙 탭 숨김');
  const pc = await p.textContent('#printCheck');
  ok(pc.includes('인쇄 전에 확인할 곳') && pc.includes('자동 초안'), '인쇄 전 확인 상자에 자동 초안 경고: ' + pc.slice(0, 40));
  await p.click('#printCheck [data-fix]'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => step) === 2, "'고치러 가기'를 누르면 2단계로 이동");
  await p.click('[data-act="next"]');
  await p.click('#hopeCard > summary');
  const hope = await p.textContent('#hopeBody');
  ok(hope.includes('프로그램명') && hope.includes('참여 인원') && hope.includes('10명') && hope.includes('담당 교사'), '희망이음 항목 표시');
  await p.click('[data-hope="5"]'); await p.waitForTimeout(200);
  const clip = await p.evaluate(() => navigator.clipboard.readText()).catch(() => '(읽기 불가)');
  ok(clip === '10명' || clip === '(읽기 불가)', '참여 인원 복사: ' + clip);
  await p.click('[data-tab="log"]'); ok(!(await p.isVisible('#printCheck')) && !(await p.isVisible('#hopeCard')), '일지 탭에서는 두 상자 숨김');
  // 현황판
  await p.evaluate(() => { plan.logs[0].opinion = '잘 참여했습니다.'; saveDraft(); });
  await p.click('#back2'); await p.click('[data-act="back"]');
  const st = await p.textContent('#planStats');
  ok(/내 프로그램\s*1/.test(st) && /일지 작성\s*1\s*\/\s*\d+/.test(st) && /평가서 완료\s*0\s*\/\s*1/.test(st), '현황판: ' + st.replace(/\s+/g, ' '));
  if (out) await p.locator('#plansCard').screenshot({ path: out + '/v30_stats.png' });
  // 새로고침해도 모드 유지
  await p.click('#modeBtn'); await p.reload();
  ok(!(await p.evaluate(() => document.documentElement.classList.contains('simple'))), '새로고침해도 고른 모드 유지');
  L('ERRORS:', errs.length || fails.length ? [...errs, ...fails.map(f => 'FAIL ' + f)] : 'none');
  if (errs.length || fails.length) process.exitCode = 1; await b.close();
})();
