# CLAUDE.md — 프로그램 서포터

이 파일은 VS Code에서 AI(Claude Code, Copilot 등)가 이 프로젝트를 이해하고 이어서 작업하도록 쓴 안내서예요.
기획은 `PRD.md`, 사용법은 `README.md`와 `docs/사용설명서.md`에 있어요. 작업 전에 이 파일과 PRD를 먼저 읽어 주세요.

## 프로젝트 한 줄 요약

지역아동센터 선생님(주로 40~50대, 컴퓨터가 익숙하지 않음)이 **형태 → 분야 → 학년·인원 → 일정 → 아동 특성**만 고르면,
숫자 목표와 근거가 들어간 **프로그램 계획서**를 규칙으로 만들고, 같은 내용으로 **일지·평가서**를 채워 센터 양식 그대로 A4 인쇄·워드 저장을 하는 웹 프로그램.
기준 양식: 센터 실제 서류 「8월 워터파크 프로그램」 계획서·일지·평가서 (결재란 담당자·시설장)

## 작업자(사용자) 정보

- 개발 비전공자. 지역아동센터 생활복지사. VS Code + GitHub로 AX 액션러닝 개인과제 진행 중. 같은 방식의 다른 저장소: `jeonghwan415/edu-safety-helper`
- **모든 답변·보고·요약은 항상 한국어로 써 주세요.** 명령어·파일 이름·코드만 원래대로 둬요.
- 설명은 **쉬운 한국어**로, 바꾼 내용은 "무엇을 왜 바꿨는지" 짧게 알려 주세요.
- 큰 변경(파일 구조, 저장 형식) 전에는 먼저 계획을 말하고 확인받아 주세요. GitHub에 올리기 전에도 확인받아요.

## 폴더 구조

```
index.html              ★ 프로그램 전체 (HTML+CSS+JS 한 파일, 빌드 없음, 외부 라이브러리 없음). 문장 데이터도 이 안에 있음
PRD.md                  01 PRD (기획, 진행 상황)
docs/사용설명서.md       선생님용 사용 설명서
docs/02~10_*.md         개인과제 문서: 02 벤치마킹 · 03 인터뷰 · 04 아키텍처 · 05 handoff · 06 와이어프레임(캡처 images/06_wireframe/) · 07 프롬프트 · 08 어휘 보강(images/08_vocabulary/) · 09 현장 테스트 · 10 평가 지표
docs/작업기록.md         사람이 할 일, 버전별 기록
docs/과제문서_원본/      처음 제출한 docx 6종 (고치지 않음)
data/vocabulary/        어휘 분석 결과 (수집 목록, 빈도 JSON). corpus/는 올리지 않음
tools/analyze_vocabulary.py   형태소 빈도 + 워드클라우드 (개발할 때만)
.github/workflows/pages.yml   main에 올리면 GitHub Pages 배포 (index.html, .nojekyll만 올림)
.vscode/                Live Server 추천·설정
```

## 실행

- 확인: VS Code 오른쪽 아래 **Go Live** → `http://127.0.0.1:5500` (또는 `index.html` 더블클릭)
- 브라우저 테스트: `tools/tests/README.md` (고친 뒤 세 개 모두 `ERRORS: none`인지 확인)
- 문법 검사: `<script>` 안을 꺼내 `node --check`로 확인 (외부 라이브러리가 없어서 이것만으로 충분)
- 배포: main에 push → GitHub Actions → https://jeonghwan415.github.io/program-supporter/

## index.html 안의 구역 (주석 번호와 같음)

| 구역 | 이름 | 내용 |
|---|---|---|
| 1) 기준 정보 | `CATS`, `TYPES` | 5대 영역 대분류·중분류, 형태 3종(regular·event·camp) |
| 2) 키워드 문장 | `KEYWORDS`, `genericKeyword()`, `eventTable()`, `campTable()` | 키워드 23개, 목록에 없는 키워드의 기본 틀, 하루 행사·캠프 시간표 |
| 2) 그 밖의 목록 | `TRAITS`, `GRADES`, `FREQS`, `MINUTES`, `NIGHTS`, `COMMON_SURVEY`, `OPEN_Q`, `APPROVE_SETS`, `STATUS`, `SCALE` | 아동 특성 9개, 학년, 주기, 결재란 등 |
| 2-1) 문장 도우미 | `NEED_MORE`, `PURPOSE_MORE`, `EFFECT_MORE`, `LOG_PHRASES`, `EVAL_PHRASES`, `NEXT_PHRASES`, `TITLE_MORE` | v2.1. 영역별·묶음별 문장 80개 |
| 2-2) 평가 지표·팁 | `IND`, `OPINION_FROM`, `SHARE_WAYS`, `TIPS`, `tipBox()`, `defaultIndicator()` | v2.2. 평가 지표 2-1·2-2·2-3, 칸별 평가위원 팁 (`docs/10_evaluation.md`) |
| 3) 상태와 저장 | `store`, `input`, `plan`, `ui` | localStorage `ps.*` |
| 4) 별이·공통 | `say()`, `esc()`, `chipHTML()`, `fillK()`, `applyPhrase()`, `phraseBox()`, `syncPhraseChips()` | 말풍선, 칩, 문장 넣기·빼기 |
| 5) 1단계 | `renderStep1()`, `renderReady()` | 고르기 화면, 준비 상태 |
| 6) 규칙 생성 | `computeDates()`, `pickSessions()`, `targetText()`, `buildPlan()`, `ensurePlan()` | 계획서 만들기, 일지·평가서 칸 준비 |
| 7) 만족도 | `surveyStats()` | 평균·4점 이상 비율 |
| 8) 2단계 | `renderStep2()`, `indicatorCard()`, `planChecks()`, `checksHTML()`, `refreshChecks()` | 계획서 확인, 평가 지표 맞추기, 서류 점검 |
| 9) 3단계 | `planDoc()`, `logDoc()`, `evalDoc()`, `noticeDoc()`(가정통신문), `surveyDoc()`, `opinionLine()`, `participateLines()`, `renderDocOpts()`, 모자이크, 워드 저장 | 서류와 출력 |
| 10) 이동·저장 | `go()`, `saveDraft()`, `saveUi()`, `getPlans()`, `renderPlans()`, `resizeSessions()`, `navHTML()`, `foldOpen()` | 여러 프로그램·백업, 회기 수만 바꾸기, 2단계 목차·접기 (v2.3) |
| 11) AI (선택) | `polishWithAI()`, `AI_SCHEMA` | Claude API, 키가 있을 때만 |

## 데이터 형식

### 키워드 (`KEYWORDS["이름"]`)
```
{ cat: "교육", sub: "특기적성",          // CATS의 대분류·중분류
  isNew: true,                          // (선택) 화면에 '새' 표시
  prefer: "event",                      // (선택) 고르면 하루 행사로 바꿈
  titles: ["제목1", "제목2"],
  need: "필요성 1문장", purpose: "목적 1문장",
  goals: [{ t: "참여 아동 {k}명({p}%) 이상이 ~한다.", m: "평가 방법", p: 80 }, …2개],
  sessions: [["주제", "활동 내용"], …8개],   // 첫 = 오리엔테이션, 끝 = 마무리
  timeTable: [["13:00", "내용"], …],     // (선택) 하루 행사 시간표
  campAct: "자연 체험",                  // (선택) 캠프 활동 이름
  materials: "준비물", effects: ["…", "…", "…"], survey: ["아동용 질문", "…"],
  extraMethod: "운영 방법에 꼭 들어갈 안전 문장" }  // (선택)
```
치환: `{k}` 목표 인원(올림), `{p}` 비율, `{n}` 인원, `{c}` 회기 수, 문장 도우미의 `{K}` 키워드

### 문장 도우미
- `NEED_MORE[영역]`, `EFFECT_MORE[영역]`: 문자열 배열. `NEED_MORE["공통"]`은 근거 더하기
- `PURPOSE_MORE[영역]`: `{K}`가 들어간 문장 (목적은 '바꾸기')
- `LOG_PHRASES`, `EVAL_PHRASES`, `NEXT_PHRASES`: `[{ g: "묶음 이름", items: [문장…] }]`
- 넣기·빼기는 `applyPhrase(text, 문장, mode)` — mode "line"이면 새 줄로 더하고 있으면 그 문장만 뺌, "replace"면 바꿈

### 저장 (localStorage)
`ps.plans` = `{ id: { input, plan, updated } }` (v2.3, 여러 프로그램), `ps.cur` = 지금 작성 중인 id, `ps.draft` = 계획서를 만들기 전 1단계 입력만 (`{ input, plan: null }`, 예전 버전은 여기에 계획서를 두었고 `init()`이 `ps.plans`로 옮김). plan 안에는 logs[], evalr, 사진 dataURL, v2.2: `ind`·`inAnnual`·`opinion{from,note}`·`childPlan`·`childEval`·`share[]`·`notice{date,fee,gather,bring,deadline,contact,extra,reply,photo}`) · `ps.info` = 센터·담당자 · `ps.ui` = 탭·조사지·결재란 · `ps.aiKey`
**저장 형식을 바꾸면 예전에 쓰던 내용이 안 열릴 수 있어요.** `ensurePlan()`에서 빠진 칸을 채우는 방식으로만 늘려 주세요.

## 꼭 지킬 규칙

1. **숫자는 규칙으로.** 목표 인원·출석·날짜·만족도·예산은 코드로 계산하고, AI가 바꾸지 못하게 해요.
2. **선생님 문장을 지우지 않기.** 문장 도우미는 넣기·빼기만. 점검은 알려만 주고 막지 않아요.
3. **한 파일 유지.** `index.html`에 외부 라이브러리·외부 글꼴을 넣지 않아요. 인터넷 없이도 열려야 해요.
4. **큰 글씨·큰 버튼·쉬운 말.** 칩 최소 높이 42~52px, "프롬프트·템플릿" 같은 말 대신 "문장 도우미·부탁하기".
5. **인쇄 양식 지키기.** 센터 양식 칸 순서와 A4(여백 12mm) 크기를 바꾸면 PDF로 꼭 확인해요. 화면 전용 요소에는 `no-print`.
6. **개인정보.** 아동 이름 대신 '○○ 아동'. 저장소에 아동 이름·사진을 올리지 않아요.
7. **평가 지표는 해마다 확인.** `IND`·`TIPS`는 아동권리보장원 「평가사업 안내」 기준이에요. 새 안내가 나오면 원문을 보고 사람이 고쳐요. 지표를 지어내지 않아요.
8. **새 문장은 검토 필요.** AI가 쓴 키워드·문장은 PRD·작업기록에 "검토 필요"로 적어요.
9. **외부 자료는 빈도만.** 크롤링한 원문을 그대로 옮기지 않아요. 발췌문(`data/vocabulary/corpus/`)은 올리지 않아요.
10. **바꾸면 문서도.** 기능을 바꾸면 `PRD.md` 0장, `docs/05_handoff.md`, `docs/사용설명서.md`, 필요하면 `docs/06_wireframe.md` 캡처도 고쳐요.
