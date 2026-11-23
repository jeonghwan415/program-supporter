// v2.9 AI 교육 키워드 · 우리 센터 질문 (같은 분야·학년이어도 센터마다 계획서가 달라지는지)
const { chromium } = require('playwright'); const path = require('path');
const [, , htmlPath, out] = process.argv;
(async () => {
  const b = await chromium.launch();
  const errs = [], fails = [];
  const L = (...a) => console.log(...a);
  const ok = (cond, msg) => { L((cond ? '✓ ' : '✗ ') + msg); if (!cond) fails.push(msg); };

  // 센터 한 곳: 새 브라우저(저장 공간 따로)에서 계획서를 만들고 plan을 돌려줌
  async function makePlan(center, answers) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + path.resolve(htmlPath));
    await p.fill('#center', center);
    await p.click('[data-kw="독서"]'); await p.click('[data-grade="초1"]'); await p.click('[data-grade="초2"]');
    await p.click('[data-trait="0"]');
    for (const sel of answers) await p.click(sel);
    if (out && answers.length) await p.screenshot({ path: out + '/v29_center_q.png', fullPage: false });
    await p.click('#makeBtn'); await p.waitForSelector('#checkCard');
    const plan = await p.evaluate(() => JSON.parse(JSON.stringify(plan)));
    return { p, ctx, plan };
  }

  // 1) 키워드: 환경·기후·미디어 빠지고 AI 교육 하나
  {
    const ctx = await b.newContext(); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.resolve(htmlPath));
    const kws = await p.$$eval('#kwGroups .chip', els => els.map(e => e.dataset.kw));
    ok(kws.length === 22, '키워드 22개 (지금 ' + kws.length + ')');
    ok(kws.includes('AI 교육') && !kws.includes('환경·기후') && !kws.includes('미디어·AI 리터러시'), "'AI 교육'만 있고 환경·기후·미디어는 없음");
    await p.click('[data-kw="AI 교육"]'); await p.click('[data-grade="초4"]'); await p.click('#makeBtn'); await p.waitForSelector('#checkCard');
    const pl = await p.evaluate(() => ({ kw: plan.kw, n: plan.schedule.length, cat: plan.category, m: plan.methods }));
    ok(pl.kw === 'AI 교육' && pl.cat === '교육' && pl.n === 10 && pl.m.includes('교사 계정'), 'AI 교육 계획서: 교육 영역 10회기, 안전 수칙 들어감');
    await ctx.close();
  }

  // 2) 같은 입력 · 질문 안 함 → 제목 말고는 같음 (예전 동작 그대로)
  const A = await makePlan('가나지역아동센터', []);
  const B0 = await makePlan('다라지역아동센터', []);
  ok(A.plan.need === B0.plan.need && JSON.stringify(A.plan.schedule.map(s => s.topic)) === JSON.stringify(B0.plan.schedule.map(s => s.topic)), '질문을 안 하면 필요성·회기는 같음');
  await B0.ctx.close();

  // 3) 같은 입력 + 우리 센터 질문 → 필요성·운영 방법·목표·마지막 회기·기대효과가 달라짐
  const B = await makePlan('다라지역아동센터', ['[data-why="0"]', '[data-why="3"]', '[data-with="2"]', '[data-with="3"]', '[data-show="0"]']);
  const pb = B.plan, pa = A.plan;
  ok(pb.need !== pa.need && pb.need.includes('아동자치회의') && pb.need.includes('지역 자원'), '필요성에 고른 이유 2개가 들어감');
  ok(pb.methods.includes('지역 도서관·기관과 연계') && pb.methods.includes('보호자를 초대'), '운영 방법에 함께하는 사람 2개가 들어감');
  ok(pb.goals.length === pa.goals.length + 1 && pb.goals.some(g => /\d+명\(80%\) 이상이 마무리 발표회/.test(g.text)), '발표회 목표가 숫자와 함께 하나 더 생김');
  ok(pb.schedule[pb.schedule.length - 1].topic === '마무리: 우리들의 발표회', '마지막 회기가 발표회로 바뀜');
  ok(pb.effects.split('\n').length === pa.effects.split('\n').length + 1, '기대효과에 한 줄 더');
  ok(pb.show === 0, 'plan에 고른 마무리 저장');

  // 4) 회기 수만 바꿔도 마지막 발표회 유지 (2단계 '10회기로 맞추기'와 같은 함수)
  const last = await B.p.evaluate(() => { resizeSessions(6); return plan.schedule[plan.schedule.length - 1].topic; });
  ok(last === '마무리: 우리들의 발표회', '회기 수를 바꿔도 마지막 발표회 유지');

  // 5) 다시 누르면 취소 · 새로고침해도 답이 남음
  await B.p.click('[data-act="back"]').catch(() => {});
  await B.p.reload(); await B.p.waitForSelector('#whyChips .chip');
  const kept = await B.p.evaluate(() => ({ whys: input.whys, withs: input.withs, show: input.show }));
  ok(JSON.stringify(kept) === JSON.stringify({ whys: [0, 3], withs: [2, 3], show: 0 }), '새로고침해도 답 유지 ' + JSON.stringify(kept));
  if (await B.p.isVisible('[data-show="0"]')) {
    await B.p.click('[data-show="0"]');
    ok(await B.p.evaluate(() => input.show) === -1, '같은 마무리를 다시 누르면 취소');
  }
  await B.ctx.close(); await A.ctx.close();

  L('ERRORS:', errs.length || fails.length ? [...errs, ...fails.map(f => 'FAIL ' + f)] : 'none');
  if (errs.length || fails.length) process.exitCode = 1; await b.close();
})();
