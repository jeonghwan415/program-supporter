// v2.7: 공휴일 자동 계산(2026·2027 발표와 비교), 우리 센터 문장 점검, 증빙 기록지·보관함, 한글 저장 사진 안내, 백업 알림·달력 알림, 평가 안내 자료
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const [, , htmlPath, out] = process.argv;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const L = (...a) => console.log(...a);
  await p.goto('file://' + path.resolve(htmlPath));
  // 1) 공휴일: 자동 계산 = 인사혁신처 발표(예전 표)
  const h = await p.evaluate(() => { const g = Object.assign({}, holidaysFor(2026), holidaysFor(2027)); const V = HOLIDAYS_FALLBACK;
    return { lunar: LUNAR_OK, diff: Object.keys(V).filter(k => g[k] !== V[k]).map(k => k + ' ' + V[k] + '≠' + g[k]), extra: Object.keys(g).filter(k => !V[k]), y2028: Object.keys(holidaysFor(2028)).length, ch2028: holidaysFor(2028)['2028-10-05'], kids2025: holidaysFor(2025)['2025-05-06'] }; });
  L('음력 계산:', h.lunar, '| 2026·2027 다른 날:', h.diff.length ? h.diff : '없음', '| 더 있는 날:', h.extra);
  L('2028 공휴일 수:', h.y2028, '| 2028 추석·개천절 겹침 대체:', h.ch2028, '| 2025 어린이날·부처님 겹침 대체:', h.kids2025);
  // 2) 우리 센터 문장
  await p.fill('#center', '행복지역아동센터'); await p.dispatchEvent('#center', 'input');
  await p.click('[data-kw="요리"]'); await p.click('[data-grade="초3"]');
  await p.fill('#startDate', '2028-01-24'); await p.dispatchEvent('#startDate', 'change');
  await p.click('#makeBtn'); await p.waitForSelector('#secNav');
  L('2028 설 건너뜀:', await p.evaluate(() => plan.scheduleWhy.slice(plan.scheduleWhy.indexOf('공휴일'))));
  const title1 = await p.inputValue('[data-f="title"]');
  L('우리 센터 문장(처음):', (await p.textContent('#checkCard .orig')).replace(/\s+/g, ' ').slice(0, 30), '| 초안 표시 칸:', await p.$$eval('.draft-same', x => x.length));
  await p.fill('[data-f="need"]', '행복지역아동센터 아동 15명 중 9명이 아침을 거른다고 답했다(2028.1 설문).\n아동자치회에서 요리 프로그램을 가장 원했다.'); await p.dispatchEvent('[data-f="need"]', 'input');
  await p.fill('[data-f="purpose"]', '직접 만든 건강한 간식으로 아침 먹는 습관을 기른다.'); await p.dispatchEvent('[data-f="purpose"]', 'input');
  L('고친 뒤:', (await p.textContent('#checkCard .orig b')), '| 초안 표시 칸:', await p.$$eval('.draft-same', x => x.length));
  // 다른 센터는 제목이 다를 수 있음
  const titles = await p.evaluate(() => ['행복', '희망', '푸른', '사랑', '새싹'].map(c => { input.center = c + '지역아동센터'; return buildPlan(input, centerSeed()).title; }));
  L('센터별 제목:', [...new Set(titles)].length + '가지', titles.join(' / '));
  await p.evaluate(() => { input.center = '행복지역아동센터'; });
  // 3) 증빙 기록지
  await p.click('[data-act="next"]'); await p.click('[data-tab="proof"]');
  L('회의록 종이:', (await p.textContent('#paperArea')).includes('아동자치회 회의록'), '| 안건:', (await p.textContent('#paperArea')).includes('의견 수렴'));
  await p.click('[data-proof="childeval"]'); L('평가회 기록지:', (await p.textContent('#paperArea')).includes('아동의 말'));
  const f = path.join(out, 'minutes.png'); fs.writeFileSync(f, PNG);
  await p.setInputFiles('[data-fkind="minutes"]', f); await p.waitForTimeout(400);
  L('보관함:', await p.$$eval('.flist li', x => x.length), (await p.textContent('#docOpts')).includes('minutes.png'));
  const [dl0] = await Promise.all([p.waitForEvent('download'), p.click('[data-fopen="0"]')]); L('열기(받기):', dl0.suggestedFilename());
  await p.screenshot({ path: out + '/v27_proof.png' });
  // 4) 한글 저장 + 사진 안내
  await p.click('[data-tab="log"]'); await p.click('[data-log="0"]');
  await p.setInputFiles('#photoIn', [f]); await p.waitForTimeout(500); if (await p.$eval('#mosDlg', d => d.open)) await p.click('#mosOk');
  await p.click('#hwpxBtn'); await p.waitForSelector('#askDlg[open]');
  L('사진 안내 창:', await p.textContent('#askTitle'));
  const dls = []; p.on('download', d => dls.push(d.suggestedFilename()));
  await p.click('#askYes'); await p.waitForTimeout(800);
  L('받은 파일 수:', dls.length, '| 말풍선:', (await p.textContent('#bubble')).includes('zip'));
  // 5) 백업 알림 · 달력
  await p.evaluate(() => localStorage.setItem('ps.lastBackup', JSON.stringify(Date.now() - 40 * 86400000)));
  await p.click('#back2'); await p.click('[data-act="back"]');
  L('백업 알림:', await p.isVisible('#backupNudge'), (await p.textContent('#backupNudge')).includes('40일'), '| 별이:', (await p.textContent('#bubble')).includes('백업할 때'));
  const [ics] = await Promise.all([p.waitForEvent('download'), p.click('[data-nudge="ics"]')]);
  const icsPath = path.join(out, 'v27.ics'); await ics.saveAs(icsPath); const it = fs.readFileSync(icsPath, 'utf8');
  L('달력 파일:', it.includes('RRULE:FREQ=MONTHLY;BYMONTHDAY=1'), it.includes('BEGIN:VALARM'));
  const [bk] = await Promise.all([p.waitForEvent('download'), p.click('[data-nudge="backup"]')]);
  const bkPath = path.join(out, 'v27_backup.json'); await bk.saveAs(bkPath); const bj = JSON.parse(fs.readFileSync(bkPath, 'utf8'));
  L('백업 뒤 알림 사라짐:', !(await p.isVisible('#backupNudge')), '| 백업에 보관 파일:', Object.values(bj.plans).some(v => (v.plan.files || []).some(x => x.ref.startsWith('data:'))));
  // 6) 평가 안내 자료
  // v2.8: 상자를 자동으로 펼치지 않고 접힌 제목 줄에 '이달 확인' 표시
  L('이달 확인 알림:', await p.$eval('#guideCount', e => e.classList.contains('due') && e.textContent === '이달 확인'));
  await p.click('#guideCard > summary');
  const g = path.join(out, '2027_ncrc_guide.pdf'); fs.writeFileSync(g, '%PDF-1.4\n%test\n');
  await p.setInputFiles('#guideIn', g); await p.waitForTimeout(1000);
  L('첨부 뒤 말풍선:', await p.textContent('#bubble'), await p.evaluate(() => localStorage.getItem('ps.guides')));
  L('첨부 목록:', await p.textContent('#guideList'), '| 알림 사라짐:', !(await p.isVisible('#guideNudge')));
  await p.locator('#plansCard').screenshot({ path: out + '/v27_backup_nudge.png' });
  await p.locator('#guideCard').screenshot({ path: out + '/v27_guides.png' });
  L('ERRORS:', errs.length ? errs : 'none'); if (errs.length) process.exitCode = 1; await b.close();
})();
