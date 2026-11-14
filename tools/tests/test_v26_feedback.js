// v2.6 환류: 평가서 아동 의견 · 다음에 바꿀 점 · 환류 문장 만들기 → 다음 해 계획서 '작년 평가 반영'으로 불러오기
const { chromium } = require('playwright'); const path = require('path');
const [, , htmlPath, out] = process.argv;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const L = (...a) => console.log(...a);
  await p.goto('file://' + path.resolve(htmlPath));
  // 작년 프로그램 (요리) — 평가서 쓰기
  await p.click('[data-kw="요리"]'); await p.click('[data-grade="초3"]'); await p.fill('#startDate', '2025-03-03'); await p.dispatchEvent('#startDate', 'change');
  await p.click('#makeBtn'); await p.waitForSelector('#secNav'); await p.click('[data-act="next"]'); await p.click('[data-tab="eval"]');
  await p.click('[data-st="1"][data-sv="일부 달성"]'); await p.fill('[data-r="1"]', '12명 중 7명');
  await p.fill('[data-e="childVoice"]', "'요리 시간이 더 길었으면 좋겠다'(12명 중 8명)");
  L('환류 점검(빈칸):', await p.textContent('#fbCheck'));
  await p.fill('[data-e="change"]', '회기를 10회로 늘리고 아동이 메뉴를 정하는 회기를 넣음');
  await p.click('[data-fb]'); await p.waitForTimeout(150);
  const next = await p.inputValue('[data-e="next"]');
  L('환류 문장:', next);
  L('환류 점검(후):', await p.textContent('#fbCheck'));
  await p.evaluate(() => { plan.logs.forEach((l, i) => l.participants = (i % 2 ? '9명' : '11명')); saveDraft(); renderStep3(); });
  L('출석률 계산:', await p.evaluate(() => attendStats(plan).text));
  L('평가서 종이에 아동 의견:', (await p.textContent('#paperArea')).includes('아동 의견(아동 평가회'));
  await p.locator('#docOpts').screenshot({ path: out + '/v26_eval_feedback.png' });
  // 올해 프로그램 — 작년 평가 반영
  await p.click('#back2'); await p.click('[data-act="back"]'); await p.click('#newPlanBtn');
  await p.click('[data-kw="요리"]'); await p.click('[data-grade="초3"]'); await p.click('#makeBtn'); await p.waitForSelector('#indCard');
  await p.click('[data-pv="on"]');
  L('점검 경고:', (await p.textContent('#checkCard')).includes('작년 평가'));
  L('불러올 목록:', await p.$$eval('#prevSel option', x => x.map(o => o.textContent)));
  await p.click('[data-act="prevLoad"]'); await p.waitForTimeout(150);
  L('불러온 의견:', await p.inputValue('[data-pvf="voice"]'));
  L('불러온 바꾼 점:', await p.inputValue('[data-pvf="change"]'));
  L('점검 통과:', !(await p.textContent('#checkCard')).includes('[평가 ⑥ 환류]'));
  L('의견 수렴 주의 문구:', (await p.textContent('#prevRow')).includes('③ 의견 수렴'));
  await p.locator('#prevRow').screenshot({ path: out + '/v26_prev_row.png' });
  await p.click('[data-act="next"]');
  const paper = await p.textContent('#paperArea');
  L('계획서 필요성:', paper.match(/※ 전년도 평가 반영\(환류\)[^※]*/)?.[0].slice(0, 160));
  L('ERRORS:', errs.length ? errs : 'none'); if (errs.length) process.exitCode = 1; await b.close();
})();
