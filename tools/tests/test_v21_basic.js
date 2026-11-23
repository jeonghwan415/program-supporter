// 사용: node e2e.js <html경로> <스크린샷폴더>
const { chromium } = require('playwright');
const path = require('path');
const [, , htmlPath, outDir] = process.argv;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  let dlgAccept = false; page.on('dialog', d => dlgAccept ? d.accept() : d.dismiss());
  await page.goto('file://' + path.resolve(htmlPath));
  const log = (...a) => console.log(...a);

  // 1단계
  log('ready(초기):', await page.textContent('#readyBox'));
  log('새 키워드:', await page.$$eval('#kwGroups .chip .new', els => els.map(e => e.parentElement.dataset.kw)));
  log('키워드 수:', await page.$$eval('#kwGroups .chip', els => els.length));
  await page.click('[data-kw="AI 교육"]');
  await page.click('[data-grade="초3"]'); await page.click('[data-grade="초4"]');
  await page.click('[data-trait="0"]');
  log('ready(선택 후):', await page.textContent('#readyBox'));
  await page.screenshot({ path: outDir + '/s1.png', fullPage: false });
  await page.click('#makeBtn');

  // 2단계
  await page.waitForSelector('#checkCard');
  log('점검:', await page.$$eval('#checkCard li', ls => ls.map(l => (l.className ? '!' : '✓') + l.querySelector('span').textContent)));
  const needBefore = await page.inputValue('[data-f="need"]');
  await page.click('#step2 details.phr >> nth=0 >> summary');
  const firstNeed = page.locator('[data-phr="need"]').first();
  const txt = await firstNeed.getAttribute('data-txt');
  await firstNeed.click();
  const needAfter = await page.inputValue('[data-f="need"]');
  log('필요성 추가됨:', needAfter.includes(txt), '| pressed:', await firstNeed.getAttribute('aria-pressed'), '| details 열림 유지:', await page.$eval('#step2 details.phr', d => d.open));
  await firstNeed.click();
  log('다시 누르면 원래대로:', (await page.inputValue('[data-f="need"]')) === needBefore);
  await firstNeed.click(); // 다시 넣어 둠 (점검 '필요성 2문장' 확인용)
  // 목적 바꾸기
  await page.click('#step2 details.phr >> nth=1 >> summary');
  const pur = page.locator('[data-phr="purpose"]').nth(1);
  await pur.click();
  log('목적 교체:', (await page.inputValue('[data-f="purpose"]')) === (await pur.getAttribute('data-txt')));
  // 제목 추천 순환
  const titles = [];
  for (let i = 0; i < 4; i++) { await page.click('[data-act="title"]'); titles.push(await page.inputValue('[data-f="title"]')); }
  log('제목 추천:', titles);
  // 장소 비우기 → 점검 경고 → 고치러 가기
  await page.fill('[data-f="place"]', '');
  log('장소 비움 후 경고 수:', await page.textContent('#checkCard .check-sum'));
  await page.click('#checkCard [data-jump*="place"]');
  await page.waitForTimeout(500);
  log('포커스:', await page.evaluate(() => document.activeElement.dataset.f));
  await page.fill('[data-f="place"]', '센터 프로그램실');
  log('점검(최종):', await page.textContent('#checkCard .check-sum'));
  await page.screenshot({ path: outDir + '/s2.png', fullPage: true });

  // 3단계 일지
  await page.click('[data-act="next"]');
  await page.click('[data-tab="log"]');
  await page.click('[data-log="0"]');
  await page.click('#docOpts details.phr summary');
  const lp = page.locator('[data-phr="log.opinion"]').first();
  await lp.click();
  const op = await page.inputValue('[data-l="opinion"]');
  log('일지 의견 들어감:', op === await lp.getAttribute('data-txt'), '| 종이에 반영:', (await page.textContent('#paperArea')).includes(op));
  await page.click('[data-log="1"]');
  log('일지 칩:', await page.$$eval('[data-log]', b => b.slice(0, 3).map(x => x.textContent)));
  await page.click('[data-log="0"]');
  await page.click('#docOpts details.phr summary');
  await page.screenshot({ path: outDir + '/s3_log.png', fullPage: true });
  // 평가서
  await page.click('[data-tab="eval"]');
  const boxes = page.locator('#docOpts details.phr');
  log('평가 도우미 상자 수:', await boxes.count());
  await boxes.nth(0).locator('summary').click();
  const ep = page.locator('[data-phr="eval.opinion"]').nth(1);
  const et = await ep.getAttribute('data-txt');
  await ep.click();
  log('평가 의견({K} 채움):', et, '| 반영:', (await page.inputValue('[data-e="opinion"]')) === et);
  await boxes.nth(1).locator('summary').click();
  await page.locator('[data-phr="eval.next"]').first().click();
  log('추후계획:', await page.inputValue('[data-e="next"]'));
  await page.screenshot({ path: outDir + '/s3_eval.png', fullPage: true });

  // 다시 열기(저장 확인)
  await page.reload();
  log('새로고침 후 내 프로그램 보임:', !(await page.$eval('#plansCard', e => e.hidden)));
  await page.click('#plansList [data-popen]');
  log('저장된 필요성 줄 수:', (await page.inputValue('[data-f="need"]')).split('\n').length);

  // 다른 새 키워드 모두 계획서 생성 확인
  // v2.4: 일지를 쓴 프로그램을 다시 만들면 확인 창이 뜸 → 이 테스트에서는 '확인'
  dlgAccept = true;
  for (const kw of ['독서', '경제·용돈', '세계문화·다문화', '아동권리·자치']) {
    await page.click('[data-act="back"]');
    await page.click('[data-kw="' + kw + '"]');
    await page.click('#makeBtn'); await page.waitForTimeout(150);
    if (await page.$eval('#askDlg', d => d.open)) await page.click('#askYes'); // v2.5 별이 확인 창
    await page.waitForSelector('#checkCard');
    log(kw, '→', await page.inputValue('[data-f="title"]'), '|', await page.$eval('#step2', s => s.querySelectorAll('[data-sk="topic"]').length) + '회기', '| 목표1:', await page.inputValue('[data-g="0"][data-gk="text"]'));
  }
  // 하루 행사 + 새 키워드
  await page.click('[data-act="back"]');
  await page.click('[data-type="event"]'); await page.click('[data-kw="세계문화·다문화"]'); await page.click('#makeBtn');
  log('행사 점검:', await page.textContent('#checkCard .check-sum'));
  // 모바일 폭
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: outDir + '/s2_mobile.png', fullPage: false });

  log('ERRORS:', errors.length ? errors : 'none'); if (errors.length) process.exitCode = 1;
  await browser.close();
})();
