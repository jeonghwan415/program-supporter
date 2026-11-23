// 06 와이어프레임 화면 캡처를 다시 찍는 스크립트 (v2.9)
// 사용: node tools/capture_wireframes.js index.html docs/images/06_wireframe
// 예시 데이터만 씀: AI 교육, 초3~초5, 10명, ○○지역아동센터. 실제 아동 정보 없음.
// 26_byeol_v25.png(예전 별이 비교)는 기록용이라 다시 찍지 않음.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const [, , htmlPath, out] = process.argv;
const url = 'file://' + path.resolve(htmlPath);
const START = '2026-12-07';

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const shot = async (loc, name) => { await loc.page().mouse.move(0, 0); await loc.screenshot({ path: path.join(out, name) }); console.log('✓', name); };
  const view = async (p, name) => { await p.mouse.move(0, 0); await p.screenshot({ path: path.join(out, name) }); console.log('✓', name); };
  async function open(w, h) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.dismiss());
    await p.goto(url); return p;
  }
  async function fillStep1(p, kw = 'AI 교육', grades = ['초3', '초4', '초5'], start = START) {
    await p.fill('#center', '○○지역아동센터'); await p.dispatchEvent('#center', 'input');
    await p.fill('#teacher', '담당 교사'); await p.dispatchEvent('#teacher', 'input');
    await p.click('[data-kw="' + kw + '"]');
    for (const g of grades) await p.click('[data-grade="' + g + '"]');
    await p.fill('#startDate', start); await p.dispatchEvent('#startDate', 'change');
  }
  const answers = async p => { for (const s of ['[data-trait="0"]', '[data-why="0"]', '[data-with="0"]', '[data-show="0"]']) await p.click(s); };
  const make = async p => { await p.click('#makeBtn'); await p.waitForSelector('#secNav'); };
  const card = (p, sel) => p.locator('.card', { has: p.locator(sel) }).first();

  // ── PC 1180: 1단계 → 2단계 → 3단계 ──
  const p = await open(1180, 900);
  await p.fill('#center', '○○지역아동센터'); await p.dispatchEvent('#center', 'input');
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200);
  await view(p, '01_choose_top.png');
  await fillStep1(p);
  await shot(card(p, '#kwGroups'), '02_choose_keywords.png');
  await answers(p);
  await shot(card(p, '#offDays'), '27_time_offdays.png');
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(200);
  await view(p, '03_choose_bottom.png');
  await make(p);
  await p.evaluate(() => window.scrollTo(0, 0));
  await view(p, '04_plan_top.png');
  await p.click('#step2 details.phr >> nth=0 >> summary');
  await p.locator('[data-phr="need"]').first().click();
  await shot(p.locator('#sec-need'), '05_plan_need_helper.png');
  await shot(p.locator('#sec-goals'), '06_plan_goals.png');
  await shot(p.locator('#sec-content'), '07_plan_schedule.png');
  await p.evaluate(() => { document.getElementById('indCard').open = true; }); await p.waitForTimeout(150);
  await shot(p.locator('#indCard'), '17_plan_indicator.png');
  await p.click('#sec-need details.tip > summary');
  await shot(p.locator('#sec-need'), '18_plan_tip.png');
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.evaluate(() => window.scrollTo(0, 0)); await view(p, '25_check_orange.png');
  await p.setViewportSize({ width: 1280, height: 600 });
  await p.evaluate(() => document.getElementById('sec-need').scrollIntoView()); await p.evaluate(() => window.scrollBy(0, -120)); await p.waitForTimeout(200);
  await view(p, '21_plan_nav.png');
  await p.setViewportSize({ width: 1180, height: 900 });

  // 3단계
  await p.click('[data-act="next"]'); await p.evaluate(() => window.scrollTo(0, 0));
  await view(p, '08_docs_tabs.png');
  await shot(p.locator('#paperArea .paper').first(), '09_paper_plan.png');
  await shot(p.locator('#paperArea .paper', { hasText: '만족도 조사' }).last(), '14_paper_survey.png');
  await p.click('[data-tab="log"]');
  await p.click('[data-log="0"]'); await p.click('#docOpts details.phr summary');
  await p.locator('[data-phr="log.opinion"]').first().click();
  await p.evaluate(() => { plan.logs[0].participants = '10명'; saveDraft(); renderStep3(); });
  await shot(p.locator('#docOpts'), '10_docs_log_helper.png');
  await shot(p.locator('#paperArea .paper').first(), '11_paper_log.png');
  await p.click('[data-tab="eval"]');
  await p.evaluate(() => {
    plan.evalr.counts = plan.survey.map((q, i) => [0, 0, 1, 3 + (i % 2), 6 - (i % 2)].map(String));
    saveDraft(); renderStep3();
  });
  for (let i = 0; i < 3; i++) { const b2 = p.locator('[data-st="' + i + '"][data-sv="달성"]'); if (await b2.count()) await b2.click(); }
  await p.locator('#docOpts details.phr').nth(0).locator('summary').click();
  await p.locator('[data-phr="eval.opinion"]').nth(1).click();
  await shot(p.locator('#docOpts'), '12_docs_eval.png');
  await shot(p.locator('#paperArea .paper').first(), '13_paper_eval.png');
  await p.click('[data-tab="notice"]');
  for (const [k, v] of [['date', '2026-12-01'], ['fee', '없음'], ['contact', '041-000-0000'], ['gather', '센터 프로그램실']]) {
    const f = p.locator('[data-nt="' + k + '"]'); if (await f.count()) { await f.fill(v); await f.dispatchEvent('input'); }
  }
  await shot(p.locator('#docOpts'), '19_docs_notice.png');
  await shot(p.locator('#paperArea .paper').first(), '20_paper_notice.png');
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.click('[data-tab="proof"]'); await p.evaluate(() => window.scrollTo(0, 0));
  await view(p, '30_proof.png');
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.click('[data-tab="log"]'); await p.evaluate(() => window.scrollTo(0, 0));
  await view(p, '23_step3_wide.png');
  // 별이 확인 창: 일지를 쓴 프로그램을 다시 만들 때
  await p.setViewportSize({ width: 1280, height: 900 });
  await p.click('#back2'); await p.click('[data-act="back"]');
  await p.click('#makeBtn'); await p.waitForSelector('#askDlg[open]'); await p.waitForTimeout(300);
  await view(p, '28_ask_dialog.png');
  await p.click('#askNo');

  // 평가 안내 자료 (가짜 PDF 첨부)
  await p.setViewportSize({ width: 940, height: 900 });
  const g = path.join(out, '2027_평가사업_안내.pdf'); fs.writeFileSync(g, '%PDF-1.4\n%sample\n');
  await p.click('#guideCard > summary'); await p.setInputFiles('#guideIn', g); await p.waitForTimeout(800); fs.unlinkSync(g);
  await shot(p.locator('#guideCard'), '31_guides.png');

  // 내 프로그램 목록 3개 → 22, 4개 → 24
  for (const [kw, gr] of [['독서', ['초1', '초2']], ['요리', ['초4']]]) {
    await p.click('#newPlanBtn'); await fillStep1(p, kw, gr); await make(p); await p.click('[data-act="back"]');
  }
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot(p.locator('#plansCard'), '22_plans.png');
  await p.click('#newPlanBtn'); await fillStep1(p, '세계문화·다문화', ['초5', '초6']); await make(p); await p.click('[data-act="back"]');
  await p.evaluate(() => window.scrollTo(0, 0));
  await shot(p.locator('#plansCard'), '24_plans_more.png');

  // 작년 평가 반영(환류): 작년 AI 교육 평가서 → 올해 계획서에서 불러오기
  {
    const q = await open(940, 900);
    await fillStep1(q, 'AI 교육', ['초3'], '2025-03-03'); await make(q);
    await q.click('[data-act="next"]'); await q.click('[data-tab="eval"]');
    await q.fill('[data-e="childVoice"]', "'AI로 그림 만드는 시간이 더 길었으면 좋겠다'(10명 중 7명)");
    await q.fill('[data-e="change"]', '그림·이야기 만들기 회기를 2회로 늘림'); await q.click('[data-fb]');
    await q.click('#back2'); await q.click('[data-act="back"]'); await q.click('#newPlanBtn');
    await fillStep1(q, 'AI 교육', ['초3']); await make(q);
    await q.click('[data-pv="on"]'); await q.click('[data-act="prevLoad"]'); await q.waitForTimeout(200);
    await shot(q.locator('#prevRow'), '29_prev_feedback.png');
    await q.context().close();
  }

  // 만들기 줄 (PC 1440, 휴대폰 390): 형태만 고른 상태
  { const q = await open(1440, 900); await view(q, '32_makebar.png'); await q.context().close(); }
  { const q = await open(390, 844); await q.evaluate(() => document.getElementById('kwGroups').scrollIntoView()); await q.waitForTimeout(200); await view(q, '33_mobile_makebar.png'); await q.context().close(); }
  // 휴대폰 1단계·2단계
  {
    const q = await open(390, 844); await fillStep1(q); await answers(q);
    await q.evaluate(() => document.getElementById('gradeChips').scrollIntoView()); await q.evaluate(() => window.scrollBy(0, -160)); await q.waitForTimeout(200);
    await view(q, '15_mobile_choose.png');
    await make(q); await q.evaluate(() => window.scrollTo(0, 0)); await q.waitForTimeout(200);
    await view(q, '16_mobile_plan.png'); await q.context().close();
  }

  console.log('ERRORS:', errs.length ? errs : 'none'); if (errs.length) process.exitCode = 1;
  await b.close();
})();
