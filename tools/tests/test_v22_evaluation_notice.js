const { chromium } = require('playwright'); const path = require('path');
const [, , htmlPath, out] = process.argv;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(htmlPath));
  const L = (...a) => console.log(...a);
  L('placeholders:', await p.getAttribute('#center', 'placeholder'), await p.getAttribute('#teacher', 'placeholder'));
  await p.fill('#center', '테스트센터'); await p.click('#infoClear'); L('infoClear:', JSON.stringify(await p.inputValue('#center')));
  // 하루 행사 나들이
  await p.click('[data-kw="나들이·체험"]'); await p.click('[data-grade="초3"]'); await p.click('#makeBtn'); await p.waitForSelector('#indCard');
  L('기본 지표:', await p.textContent('#indCard [data-ind][aria-pressed="true"]'));
  L('점검 경고:', await p.$$eval('#checkCard li.warn span', x => x.map(e => e.textContent.slice(0, 40))));
  await p.click('#indCard [data-ib="inAnnual"]'); await p.click('#indCard [data-op="아동자치회"]');
  await p.fill('[data-opn]', '10월 아동자치회에서 9명 중 7명이 나들이를 원함');
  await p.click('#indCard [data-ib="childEval"]');
  L('점검 후:', await p.textContent('#checkCard .check-sum'));
  await p.click('[data-ind="edu"]'); L('교육 지표 경고:', (await p.$$eval('#checkCard li.warn span', x => x.map(e => e.textContent))).find(t => t.includes('10회기')) || 'none');
  await p.click('[data-ind="culture"]');
  L('팁 상자 수:', await p.$$eval('#step2 details.tip', x => x.length));
  await p.fill('[data-f="place"]', '천안 ○○공원');
  await p.click('[data-act="next"]');
  const plan = await p.textContent('#paperArea');
  L('계획서에 의견 수렴:', plan.includes('※ 의견 수렴: 아동자치회'), '| 아동 평가회:', plan.includes('아동 평가회'));
  await p.click('[data-tab="notice"]');
  await p.fill('[data-nt="fee"]', '5,000원'); await p.fill('[data-nt="gather"]', '09:30 센터 앞 집결');
  await p.fill('[data-nt="date"]', '2026-11-20');
  const n = await p.textContent('#paperArea');
  L('통신문:', n.includes('가 정 통 신 문'), n.includes('5,000원'), n.includes('09:30 센터 앞 집결'), n.includes('참가 회신서'), n.includes('건강 상태'), n.includes('2026.11.20'));
  await p.click('[data-nb="reply"]'); L('회신서 끄기:', !(await p.textContent('#paperArea')).includes('참가 회신서'));
  await p.click('[data-nb="reply"]');
  await p.locator('#paperArea .paper').screenshot({ path: out + '/notice.png' });
  await p.locator('#docOpts').screenshot({ path: out + '/notice_opts.png' });
  // 워드 저장
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#wordBtn')]);
  L('워드 파일:', dl.suggestedFilename());
  await p.click('[data-tab="eval"]'); L('평가 칸 참여:', (await p.textContent('#paperArea')).includes('아동 평가회'));
  // 저장 복원
  await p.reload(); await p.click('#plansList [data-popen]'); L('복원 지표 선택:', await p.isChecked?.call ? 'n/a' : '', await p.textContent('#indCard [data-ind][aria-pressed="true"]'), '| note:', await p.inputValue('[data-opn]'));
  await p.click('#step2 details.tip >> nth=0 >> summary');
  await p.locator('#indCard').screenshot({ path: out + '/indcard.png' });
  await p.locator('#step2 .card:has([data-f="need"])').screenshot({ path: out + '/need_tip.png' });
  // 지우고 새로 쓰기
  await p.click('[data-act="back"]'); await p.reload();
  const del = p.locator('#plansList [data-pdel]').first(); await del.click(); await del.click();
  L('지운 뒤 목록 숨김:', await p.$eval('#plansCard', e => e.hidden), '| 키워드 선택:', await p.$$eval('#kwGroups [aria-pressed="true"]', x => x.length));
  // 예전 저장 형식 호환 (ind 등 없는 plan)
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('ps.draft') || '{}'); });
  // 캠프 통신문
  await p.click('[data-type="camp"]'); await p.click('[data-kw="체육·놀이"]'); await p.click('[data-grade="ALL"]'); await p.click('#makeBtn');
  await p.fill('[data-f="place"]', '○○수련원'); await p.click('[data-act="next"]'); await p.click('[data-act="next"]').catch(()=>{});
  await p.click('[data-tab="notice"]'); const c = await p.textContent('#paperArea');
  L('캠프 통신문 숙소 안내:', c.includes('숙소 안전 점검'), '| 기본 지표 문화:', true);
  await p.setViewportSize({ width: 390, height: 844 }); await p.screenshot({ path: out + '/mobile_tabs.png' });
  L('ERRORS:', errs.length ? errs : 'none'); await b.close();
})();
