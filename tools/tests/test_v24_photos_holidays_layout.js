// v2.4: 사진 IndexedDB, 공휴일 건너뛰기, AI 부탁 글 복사, 덮어쓰기 안내, 탭 두 개 경고, 넓은 화면 3단계, 아래 알림, 목록 더 보기
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const [, , htmlPath, out] = process.argv;
// 작은 PNG (2x2) — 실제 아동 사진은 쓰지 않음
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const p = await ctx.newPage(); const url = 'file://' + path.resolve(htmlPath);
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const L = (...a) => console.log(...a);
  await p.goto(url);
  L('처음 버튼:', await p.textContent('#makeBtn'));

  // 1) 공휴일: 2026-09-25(금, 추석)부터 주 1회 → 9/25·10/9 건너뜀
  await p.click('[data-kw="요리"]'); await p.click('[data-grade="초3"]');
  await p.fill('#startDate', '2026-09-25'); await p.dispatchEvent('#startDate', 'change');
  await p.click('#makeBtn'); await p.waitForSelector('#secNav');
  const dates = await p.$$eval('[data-sk="date"]', x => x.map(e => e.value || e.textContent));
  const why = await p.evaluate(() => plan.scheduleWhy);
  L('일정 첫 날짜:', dates.slice(0, 3).join(' / '));
  L('공휴일 안내:', why.includes('공휴일'), '|', why.slice(why.indexOf('공휴일')));
  L('추석·한글날 없음:', !JSON.stringify(await p.evaluate(() => plan.schedule)).match(/9\/25|10\/9\(/));

  // 2) AI 부탁 글 복사 (키 없이)
  await p.click('#aiCopyBtn'); await p.waitForTimeout(300);
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  L('복사 글:', clip.length > 300, '| 규칙 포함:', clip.includes('숫자'), '| 계획 포함:', clip.includes('"need"'), '| 말풍선:', (await p.textContent('#bubble')).includes('복사했어요'));

  // 3) 평가 지표 카드: 다 채우면 접힘
  L('지표 카드 열림(미완료):', await p.$eval('#indCard', d => d.open));
  await p.click('#indCard [data-ib="inAnnual"]'); await p.click('#indCard [data-op="아동자치회"]');
  if (await p.evaluate(() => plan.ind === 'special')) { await p.click('#indCard [data-ib="childPlan"]'); await p.click('#indCard [data-sh]'); }
  if (await p.evaluate(() => plan.ind === 'edu' && plan.schedule.length < 10)) await p.click('[data-act="to10"]');
  L('채운 직후 열린 채 유지:', await p.$eval('#indCard', d => d.open), '| 완료 표시:', (await p.textContent('#indCard summary')).includes('다 채웠어요'));
  await p.click('[data-act="back"]'); await p.click('#plansList [data-popen]'); await p.waitForSelector('#indCard');
  L('다시 열면 접힘:', !(await p.$eval('#indCard', d => d.open)));

  // 4) 사진 → IndexedDB (localStorage에는 idb: 참조만)
  await p.click('[data-act="next"]'); await p.waitForSelector('#docTabs');
  await p.click('[data-tab="log"]');
  const f = path.join(out, 'tiny.png'); fs.writeFileSync(f, PNG);
  await p.setInputFiles('#photoIn', [f, f]); await p.waitForTimeout(600);
  if (await p.$eval('#mosDlg', d => d.open)) { await p.click('#mosOk'); await p.waitForTimeout(200); if (await p.$eval('#mosDlg', d => d.open)) await p.click('#mosOk'); }
  await p.waitForTimeout(300);
  const st = await p.evaluate(() => { const all = JSON.parse(localStorage.getItem('ps.plans')); const v = all[JSON.parse(localStorage.getItem('ps.cur'))]; return v.plan.logs[0].photos; });
  L('저장된 사진 참조:', st.length, st.every(r => r.startsWith('idb:')));
  L('일지에 사진 보임:', await p.$$eval('#paperArea img', x => x.filter(i => i.src.startsWith('data:image')).length));
  await p.reload(); await p.click('#plansList [data-popen]'); await p.click('[data-act="next"]'); await p.click('[data-tab="log"]'); await p.waitForTimeout(500);
  L('새로고침 뒤 사진:', await p.$$eval('#paperArea img', x => x.filter(i => i.src.startsWith('data:image')).length));

  // 5) 넓은 화면 3단계: 왼쪽 설정 · 오른쪽 종이
  await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(300);
  const side = await p.$eval('#step3 .s3-side', e => e.getBoundingClientRect().toJSON()), paper = await p.$eval('#paperArea', e => e.getBoundingClientRect().toJSON());
  L('나란히 보기:', side.right <= paper.left + 1, '| 종이 확대:', await p.evaluate(() => getComputedStyle(document.getElementById('paperArea')).getPropertyValue('--paper-zoom')));
  await p.screenshot({ path: out + '/v24_step3_wide.png' });
  await p.mouse.wheel(0, 2500); await p.waitForTimeout(300);
  L('스크롤해도 설정 보임:', await p.$eval('#step3 .s3-side', e => e.getBoundingClientRect().top >= 0 && e.getBoundingClientRect().top < 40));

  // 6) 말풍선이 화면 밖일 때 아래 알림
  await p.evaluate(() => say('시험 알림', '아래에 떠야 해요.', 'happy'));
  L('아래 알림:', await p.isVisible('#toast'), (await p.textContent('#toast')).includes('시험 알림'));
  await p.screenshot({ path: out + '/v24_toast.png' });
  await p.setViewportSize({ width: 1280, height: 900 });

  // 7) 덮어쓰기 안내: 일지를 쓴 뒤 다시 만들기 → 확인 창 (취소하면 그대로)
  await p.click('[data-tab="log"]');
  await p.evaluate(() => { plan.logs[0].opinion = '참여가 좋았다.'; saveDraft(); });
  await p.click('#back2'); await p.click('[data-act="back"]');
  L('다시 만들기 버튼:', await p.textContent('#makeBtn'));
  await p.click('#makeBtn'); await p.waitForSelector('#askDlg[open]');
  const dlgMsg = await p.textContent('#askDlg'); await p.click('#askNo'); await p.waitForTimeout(150);
  L('확인 창:', dlgMsg.includes('일지 1개'), '| 취소 후 일지 남음:', await p.evaluate(() => plan.logs[0].opinion === '참여가 좋았다.'));

  // 8) 탭 두 개: 다른 탭에서 같은 프로그램을 고치면 경고
  const p2 = await ctx.newPage(); await p2.goto(url); await p2.click('#plansList [data-popen]'); await p2.waitForSelector('[data-f="title"]');
  await p2.fill('[data-f="title"]', '다른 탭에서 고친 제목'); await p2.dispatchEvent('[data-f="title"]', 'input'); await p2.waitForTimeout(400);
  await p.waitForTimeout(400);
  L('다른 탭 경고:', (await p.textContent('#bubble')).includes('다른 탭'), '| 다시 열기 창:', await p.$eval('#askDlg', d => d.open));
  if (await p.$eval('#askDlg', d => d.open)) await p.click('#askNo');
  await p2.close();

  // 9) 내 프로그램 3개 + 더 보기
  for (const kw of ['독서', '체육·놀이', '미술']) { await p.click('#newPlanBtn'); await p.click('[data-kw="' + kw + '"]'); await p.click('[data-grade="초2"]'); await p.click('#makeBtn'); await p.waitForSelector('#secNav'); await p.click('[data-act="back"]'); }
  L('목록 보임:', await p.$$eval('#plansList li:not(.new):not(.more)', x => x.length), '| 더 보기:', await p.textContent('#plansMore'));
  L('첫 화면 안내:', (await p.textContent('#bubble')).includes('내 프로그램'));
  await p.click('#plansMore'); L('펼친 뒤:', await p.$$eval('#plansList li:not(.new):not(.more)', x => x.length));
  await p.locator('#plansCard').screenshot({ path: out + '/v24_plans.png' });

  // 10) 글씨 14px 미만 UI 요소 수 (종이·배지 제외)
  const small = await p.evaluate(() => [...document.querySelectorAll('body *')].filter(e => e.offsetParent && !e.closest('.paper') && !e.matches('.new') && e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 14).map(e => e.className || e.tagName));
  L('14px 미만:', small.length, small.slice(0, 5).join(','));
  L('ERRORS:', errs.length ? errs : 'none'); if (errs.length) process.exitCode = 1; await b.close();
})();
