// v3.1 [내 기록은 어디에?] 개인정보 안내 · 백업 · 이 컴퓨터 기록 모두 지우기 (center-cloud v1.1)
// 사용: node test_v31_local_privacy.js <html경로> <스크린샷폴더>
const { chromium } = require('playwright'); const path = require('path');
const [, , htmlPath, outDir] = process.argv;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1200, height: 900 }, acceptDownloads: true });
  await ctx.addInitScript(() => { Object.defineProperty(window, 'CENTER_CLOUD_CONFIG', { configurable: true, get() { return { url: '', anonKey: '' }; }, set() {} }); });   // '서버 연결 전' 화면 시험
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('dialog', d => { errs.push('브라우저 기본 창: ' + d.message()); d.dismiss(); });
  const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) errs.push('실패: ' + m); };
  await p.goto('file://' + path.resolve(htmlPath) + '?full');
  await p.fill('#center', '테스트센터'); await p.click('[data-kw="독서"]'); await p.click('[data-grade="초3"]'); await p.click('#makeBtn'); await p.waitForSelector('#checkCard');
  await p.evaluate(() => go(1)); await p.click('#zoomBtn');
  ok(await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('ps.plans') || '{}')).length) === 1, '계획서 1개 저장됨');
  await p.click('#ccChip'); await p.waitForSelector('.cc-dlg[open]');
  const t = await p.textContent('.cc-dlg');
  ok(t.includes('개인정보 안내') && t.includes('Anthropic') && t.includes('○○ 아동'), '개인정보 안내 + AI 보내는 경우 안내');
  ok(t.includes('저장된 기록: 1개 프로그램'), '이 컴퓨터에 저장된 기록 수 (1개 프로그램)');
  if (outDir) await p.screenshot({ path: outDir + '/v31_local.png' });
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.cc-dlg [data-a="backup"]')]);
  ok(/\.json$/.test(dl.suggestedFilename()), '[백업 파일 받기] → ' + dl.suggestedFilename());
  await p.click('.cc-dlg [data-a="wipe"]');
  ok((await p.textContent('.cc-dlg')).includes('되살릴 수 없어요'), '지우기 전에 한 번 더 확인');
  await p.click('.cc-dlg [data-v=""]');
  ok(await p.isVisible('.cc-dlg[open] [data-a="wipe"]'), '[취소]면 안내 창으로 돌아감, 아무것도 안 지움');
  ok(await p.evaluate(() => !!localStorage.getItem('ps.plans')), '취소하면 기록 그대로');
  await p.click('.cc-dlg [data-a="wipe"]');
  await Promise.all([p.waitForNavigation(), p.click('.cc-dlg [data-v="wipe"]')]); await p.waitForTimeout(600);
  const left = await p.evaluate(() => Object.keys(localStorage));
  ok(!left.some(k => k.startsWith('ps.')), 'ps.* 기록 모두 지움 (남은 칸: ' + left.join(',') + ')');
  ok(left.includes('cc.zoom'), '글자 크기 설정은 남김');
  ok(await p.evaluate(() => new Promise(r => { const q = indexedDB.open('program-supporter'); q.onsuccess = () => { const n = q.result.objectStoreNames.length; q.result.close(); r(n === 0); }; q.onerror = () => r(true); })), '사진 저장소(IndexedDB)도 지움');
  ok((await p.textContent('#ccToast').catch(() => '')).includes('모두 지웠어요'), '지운 뒤 알림');
  ok(await p.evaluate(() => Object.keys(getPlans()).length) === 0, '화면에도 계획서 0개');
  console.log('ERRORS:', errs.length ? errs.join('\n') : 'none'); await b.close(); process.exit(errs.length ? 1 : 0);
})();
