const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const [, , htmlPath, out] = process.argv;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const L = (...a) => console.log(...a);
  // 예전 저장 형식(ps.draft) 옮기기 확인
  await p.goto('file://' + path.resolve(htmlPath) + '?full');
  await p.click('[data-kw="요리"]'); await p.click('[data-grade="초2"]'); await p.click('#makeBtn'); await p.waitForSelector('#secNav');
  const old = await p.evaluate(() => { const all = JSON.parse(localStorage.getItem('ps.plans')); const id = localStorage.getItem('ps.cur'); return JSON.stringify({ input: all[JSON.parse(id)].input, plan: all[JSON.parse(id)].plan }); });
  await p.evaluate(o => { localStorage.clear(); localStorage.setItem('ps.draft', o); }, old);
  await p.reload();
  L('옛 저장 옮김:', await p.$$eval('#plansList li:not(.new)', x => x.length), (await p.textContent('#plansList')).includes('지금 작성 중'));
  // 1) 교육 키워드 10회기
  await p.click('#newPlanBtn');
  await p.click('[data-kw="독서"]'); L('독서 회기:', await p.textContent('[data-key="sessions"] output'));
  await p.click('[data-grade="초4"]'); await p.click('#makeBtn'); await p.waitForSelector('#secNav');
  const topics = await p.$$eval('[data-sk="topic"]', x => x.map(e => e.value));
  L('10회기:', topics.length, '| 심화 없음:', !topics.some(t => t.includes('(심화)')), '| 지표:', await p.textContent('#indCard [data-ind][aria-pressed="true"]'));
  L('목차:', await p.textContent('#secNav'));
  // 8회기 → 10회기로 맞추기 버튼
  await p.click('[data-act="back"]'); await p.click('[data-key="sessions"] [data-d="-1"]'); await p.click('[data-key="sessions"] [data-d="-1"]'); await p.click('#makeBtn');
  await p.fill('[data-f="need"]', '직접 고친 필요성 문장이다.\n두 번째 문장이다.');
  L('8회기 경고:', (await p.textContent('#checkCard')).includes('10회기'), '| 버튼:', await p.$$eval('[data-act="to10"]', x => x.length));
  await p.click('[data-act="to10"]');
  L('맞춘 뒤:', await p.$$eval('[data-sk="topic"]', x => x.length), '| 필요성 유지:', (await p.inputValue('[data-f="need"]')).startsWith('직접 고친'), '| 1단계 회기:', await p.evaluate(() => input.sessions));
  // 3) 접기 · 목차 이동
  L('예산 접힘:', !(await p.$eval('#sec-budget', d => d.open)));
  await p.click('#secNav [data-go="sec-budget"]'); await p.waitForTimeout(400);
  L('목차로 열림:', await p.$eval('#sec-budget', d => d.open));
  await p.click('#secNav [data-go="sec-need"]'); await p.waitForTimeout(500);
  const navTop = await p.$eval('#secNav', n => n.getBoundingClientRect().top); L('목차 고정(top):', Math.round(navTop));
  await p.screenshot({ path: out + '/step2_nav.png' });
  await p.click('[data-act="addBudget"]'); L('다시 그려도 열림 유지:', await p.$eval('#sec-budget', d => d.open));
  // 점검 고치러 가기 → 접힌 카드 열기
  await p.click('#secNav [data-go="sec-budget"]');
  await p.evaluate(() => { document.getElementById('sec-budget').open = false; });
  await p.click('#checkCard [data-jump*="data-b"]'); await p.waitForTimeout(400);
  L('고치러 가기로 열림:', await p.$eval('#sec-budget', d => d.open));
  // 2) 여러 프로그램
  await p.click('[data-act="back"]');
  L('목록:', await p.$$eval('#plansList li:not(.new) b', x => x.map(e => e.textContent)));
  await p.click('#newPlanBtn'); await p.click('[data-kw="세계문화·다문화"]'); await p.click('[data-grade="초1"]'); await p.click('#makeBtn'); await p.waitForSelector('#secNav');
  await p.click('[data-act="back"]');
  const titles = await p.$$eval('#plansList li:not(.new) b', x => x.map(e => e.textContent)); L('3개:', titles.length, titles);
  // 열기 → 독서 계획 필요성 유지
  const kws = await p.$$eval('#plansList li:not(.new) small', x => x.map(e => e.textContent)); const idx = kws.findIndex(t => t.includes('독서')); // v2.7: 제목은 센터마다 달라져서 키워드로 찾음 await p.waitForTimeout(600); // 1단계로 돌아오며 부드럽게 스크롤하는 동안 누르지 않게
  await p.click(`#plansList li:nth-child(${idx + 1}) [data-popen]`);
  L('다른 프로그램 열기:', (await p.inputValue('[data-f="need"]')).startsWith('직접 고친'));
  await p.click('[data-act="back"]');
  // 백업
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#backupBtn')]);
  const f = out + '/backup.json'; await dl.saveAs(f); const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  L('백업:', data.app, Object.keys(data.plans).length);
  // 지우기 (두 번)
  const delBtn = p.locator('#plansList [data-pdel]').last(); await delBtn.click(); await delBtn.click();
  L('지운 뒤:', await p.$$eval('#plansList li:not(.new)', x => x.length));
  // 복원
  await p.setInputFiles('#restoreIn', f); await p.waitForTimeout(500);
  L('복원 뒤:', await p.$$eval('#plansList li:not(.new)', x => x.length));
  L('저장 안내:', await p.textContent('#storageHint'));
  await p.locator('#plansCard').screenshot({ path: out + '/plans.png' });
  // 엉뚱한 파일
  fs.writeFileSync(out + '/bad.json', '{"x":1}'); await p.setInputFiles('#restoreIn', out + '/bad.json'); await p.waitForTimeout(300);
  L('잘못된 파일 안내:', (await p.textContent('#bubble')).includes('백업 파일이 아니에요'));
  // 휴대폰
  await p.setViewportSize({ width: 390, height: 844 }); await p.click('#plansList [data-popen]'); await p.waitForTimeout(500); await p.screenshot({ path: out + '/mobile_nav.png' });
  L('ERRORS:', errs.length ? errs : 'none'); if (errs.length) process.exitCode = 1; await b.close();
})();
