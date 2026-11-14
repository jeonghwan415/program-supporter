# 브라우저 자동 테스트

프로그램을 고친 뒤 화면 흐름이 깨지지 않았는지 확인하는 스크립트예요. (Claude가 쓴 테스트)

```
npm install playwright        # 처음 한 번 (브라우저: npx playwright install chromium)
mkdir -p .cache/shots
node tools/tests/test_v21_basic.js index.html .cache/shots
node tools/tests/test_v22_evaluation_notice.js index.html .cache/shots
node tools/tests/test_v23_sessions_plans_nav.js index.html .cache/shots
```

| 파일 | 확인하는 것 |
|---|---|
| `test_v21_basic.js` | 1~3단계 전체, 문장 도우미 넣기·빼기, 점검 '고치러 가기', 새 키워드 5개, 저장 복원 |
| `test_v22_evaluation_notice.js` | 평가 지표 경고, 서류 근거 문장, 가정통신문·회신서, 워드 저장, 지우기 |
| `test_v23_sessions_plans_nav.js` | 교육 10회기, '10회기로 맞추기', 목차·접기, 여러 프로그램, 백업·복원, 옛 저장 옮기기 |

마지막 줄이 `ERRORS: none`이면 콘솔 오류가 없다는 뜻이에요. 화면 캡처는 두 번째 인자 폴더에 저장돼요.
