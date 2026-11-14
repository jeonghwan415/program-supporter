// v2.5 한글(.hwpx) 저장: 파일이 만들어지고, zip 구조(mimetype 첫 칸)와 칸 내용이 맞는지
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const [, , htmlPath, out] = process.argv;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const L = (...a) => console.log(...a);
  await p.goto('file://' + path.resolve(htmlPath));
  await p.fill('#center', '○○지역아동센터'); await p.fill('#teacher', '김○○');
  await p.click('[data-type="event"]'); await p.click('[data-kw="나들이·체험"]'); await p.click('[data-grade="ALL"]');
  await p.click('#makeBtn'); await p.waitForSelector('#secNav');
  await p.fill('[data-f="place"]', '덕산 워터파크 <테스트 & 특수문자>'); await p.dispatchEvent('[data-f="place"]', 'input');
  await p.click('[data-act="next"]'); await p.click('[data-tab="log"]');
  await p.evaluate(() => { plan.logs[0].opinion = '아동들이 안전수칙을 잘 지켰다.\n두 번째 줄.'; plan.logs[0].participants = '12명'; saveDraft(); renderStep3(); });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#hwpxBtn')]);
  const f = path.join(out, 'v25_test.hwpx'); await dl.saveAs(f);
  L('파일 이름:', dl.suggestedFilename());
  L('말풍선:', (await p.textContent('#bubble')).slice(0, 30));
  fs.writeFileSync(path.join(out, 'v25_hwpx_path.txt'), f);
  L('ERRORS:', errs.length ? errs : 'none'); if (errs.length) process.exitCode = 1; await b.close();
})();
