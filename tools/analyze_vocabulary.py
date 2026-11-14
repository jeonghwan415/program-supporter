"""수집 자료 빈도 분석 + 워드클라우드 (docs/08_vocabulary.md 참고)
사용: python tools/analyze_vocabulary.py data/vocabulary/corpus index.html data/vocabulary/out
준비: pip install kiwipiepy wordcloud
corpus 폴더에 plan.txt / log_eval.txt / trend.txt 를 넣는다 (수집 발췌문, 저장소에는 올리지 않음)
- 명사(NNG/NNP)와 동사·형용사 어간(VV/VA) 빈도를 자료 묶음별로 셈
- 기존 프로그램 HTML 안의 문장과 비교해 '새로 들어온 어휘'를 따로 표시
"""
import sys, re, json, collections, pathlib
from kiwipiepy import Kiwi
from wordcloud import WordCloud

corpus_dir, html_path, out_dir = map(pathlib.Path, sys.argv[1:4])
out_dir.mkdir(parents=True, exist_ok=True)
kiwi = Kiwi()
STOP = set("것 수 등 및 통해 위해 때 중 때문 경우 이 그 저 더 좀 한 두 번 명 개 회 일 시 분 년 월 차 차시 내용 활동 프로그램 아동 아동들 우리 나 자신 본인 S1 S2 S3 S4 S5 S6 S7 하 있 되 않 없 같 보 주 오".split())
# 한글 글꼴: 있는 것 중 첫 번째를 씀 (Windows 맑은 고딕 → 리눅스 Noto)
FONT = next((f for f in ["C:/Windows/Fonts/malgunbd.ttf", "C:/Windows/Fonts/malgun.ttf",
                          "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
                          "/System/Library/Fonts/AppleSDGothicNeo.ttc"] if pathlib.Path(f).exists()), None)

def nouns(text):
    out = []
    for t in kiwi.tokenize(text):
        if t.tag in ("NNG", "NNP") and len(t.form) > 1 and t.form not in STOP:
            out.append(t.form)
    return out

def preds(text):
    out = []
    for t in kiwi.tokenize(text):
        if t.tag in ("VV", "VA") and t.form not in STOP and len(t.form) > 1:
            out.append(t.form + "다")
    return out

groups = {"plan": "plan.txt", "log_eval": "log_eval.txt", "trend": "trend.txt"}
html = html_path.read_text(encoding="utf-8")
script = html[html.find("<script>"):]
existing = set(nouns(re.sub(r"[A-Za-z_{}()\[\]<>=;:+\"'.,]", " ", script)))

report = {}
all_counter = collections.Counter()
for name, fn in groups.items():
    text = (corpus_dir / fn).read_text(encoding="utf-8")
    text = re.sub(r"^##.*$", "", text, flags=re.M)
    c = collections.Counter(nouns(text))
    p = collections.Counter(preds(text))
    all_counter.update(c)
    report[name] = {
        "chars": len(text),
        "top_nouns": c.most_common(40),
        "top_predicates": p.most_common(20),
        "new_nouns": [(w, n) for w, n in c.most_common() if w not in existing][:40],
    }
    WordCloud(font_path=FONT, width=1000, height=560, background_color="white",
              colormap="viridis", max_words=80, prefer_horizontal=0.95, random_state=7
              ).generate_from_frequencies(c).to_file(str(out_dir / f"wordcloud_{name}.png"))

WordCloud(font_path=FONT, width=1400, height=760, background_color="white",
          colormap="viridis", max_words=120, prefer_horizontal=0.95, random_state=7
          ).generate_from_frequencies(all_counter).to_file(str(out_dir / "wordcloud_all.png"))
report["all"] = {"top_nouns": all_counter.most_common(60),
                 "new_nouns": [(w, n) for w, n in all_counter.most_common() if w not in existing][:60],
                 "existing_vocab_size": len(existing)}
(out_dir / "freq.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
for k, v in report.items():
    print("==", k, "| top:", ", ".join(f"{w}{n}" for w, n in v["top_nouns"][:30]))
    print("   new:", ", ".join(f"{w}{n}" for w, n in v["new_nouns"][:30]))
    if "top_predicates" in v: print("   pred:", ", ".join(f"{w}{n}" for w, n in v["top_predicates"][:15]))
