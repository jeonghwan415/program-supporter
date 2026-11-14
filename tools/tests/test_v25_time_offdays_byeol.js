// v2.5: 시간 4개(40분·1시간·90분·직접 입력), 센터 쉬는 날, 공휴일 정보 없는 해 안내, 별이 확인 창, 새 별이, 다크 모드
const { chromium } = require('playwright'); const path = require('path');
const [, , htmlPath, out] = process.argv;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  let nativeDlg = 0; p.on('dialog', d => { nativeDlg++; d.dismiss(); });
  const L = (...a) => console.log(...a);
  await p.goto('file://' + path.resolve(htmlPath));
  // 1) 시간 칩
  L('시간 칩:', (await p.$$eval('#minChips button', x => x.map(e => e.textContent))).join(' / '));
  await p.click('[data-kw="요리"]'); await p.click('[data-grade="초3"]');
  await p.click('[data-min="custom"]');
  L('직접 입력 칸:', await p.isVisible('#minCustom'), '| 포커스:', await p.evaluate(() => document.activeElement.id));
  await p.fill('#minCustom', '50'); await p.press('#minCustom', 'Tab');
  L('입력값:', await p.evaluate(() => input.minutes), '| 직접 입력 눌림:', await p.getAttribute('[data-min="custom"]', 'aria-pressed'));
  // 2) 쉬는 날 + 2028년 안내
  await p.fill('#startDate', '2027-12-20'); await p.dispatchEvent('#startDate', 'change');
  await p.fill('#offDays', '12/27, 1/3');
  await p.click('#makeBtn'); await p.waitForSelector('#secNav');
  const sch = await p.evaluate(() => plan.schedule.map(x => x.date)), why = await p.evaluate(() => plan.scheduleWhy), info = await p.evaluate(() => plan.sessionsInfo);
  L('회당 표기:', info);
  L('날짜:', sch.slice(0, 4).join(' / '));
  L('쉬는 날 빠짐:', !sch.some(d => /^12\/27|^1\/3\(/.test(d)), '| 근거:', why.slice(why.indexOf('공휴일·쉬는 날')));
  L('2028 안내:', why.includes('2028년 공휴일 정보는 아직 없어요'));
  // 3) 1시간 표기
  await p.click('[data-act="back"]'); await p.click('[data-min="60"]');
  L('1시간 눌림:', await p.getAttribute('[data-min="60"]', 'aria-pressed'), '| 직접 입력 칸 숨김:', !(await p.isVisible('#minCustom')));
  // 4) 별이 확인 창 (일지가 있을 때)
  await p.evaluate(() => { plan.logs[0].opinion = '좋았다.'; saveDraft(); });
  await p.click('#makeBtn'); await p.waitForSelector('#askDlg[open]');
  L('별이 확인 창:', await p.textContent('#askTitle'), '| 별이 그림:', await p.$$eval('#askByeol *', x => x.length) > 10);
  await p.screenshot({ path: out + '/v25_ask.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  L('Esc = 취소:', await p.evaluate(() => plan.logs[0].opinion === '좋았다.'));
  await p.click('#makeBtn'); await p.click('#askYes'); await p.waitForSelector('#secNav');
  L('계속 = 다시 만듦:', await p.evaluate(() => !plan.logs[0].opinion), '| 회당:', await p.evaluate(() => plan.sessionsInfo.split('회당 ')[1]));
  // 5) 새 별이: 기쁨 표정에 입·반짝이
  await p.evaluate(() => say('테스트', '기뻐요', 'happy'));
  L('기쁨 입 보임:', await p.$eval('#byeol .mouth-happy', e => getComputedStyle(e).display !== 'none'), '| 반짝이:', await p.$eval('#byeol .b-spark', e => getComputedStyle(e).display !== 'none'));
  await p.locator('.guide').screenshot({ path: out + '/v25_byeol.png' });
  // 6) 다크 모드
  await p.emulateMedia({ colorScheme: 'dark' }); await p.click('[data-act="back"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: out + '/v25_dark_step1.png' });
  const contrast = await p.evaluate(() => { const c = getComputedStyle(document.querySelector('.card')); return [c.backgroundColor, c.color]; });
  L('다크 카드 색:', contrast.join(' / '));
  // 7) 키보드만으로: Tab으로 첫 키워드 칩까지 가서 Enter
  await p.emulateMedia({ colorScheme: 'light' }); await p.click('#newPlanBtn');
  await p.focus('[data-kw="독서"]'); await p.keyboard.press('Enter');
  L('키보드 선택:', await p.evaluate(() => input.keyword), '| 포커스 테두리:', await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle));
  L('브라우저 기본 창:', nativeDlg);
  L('ERRORS:', errs.length ? errs : 'none'); if (errs.length || nativeDlg) process.exitCode = 1; await b.close();
})();
