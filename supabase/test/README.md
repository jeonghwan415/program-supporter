# 센터 계정(B) 두 컴퓨터 시험 (개발용)

진짜 Supabase 없이, 실제 PostgreSQL에 `../schema.sql`을 올리고 가짜 Supabase(`server.js`: 로그인·REST 일부)를 띄워 세 프로그램을 시험해요. RLS(같은 센터만 보기)는 진짜 PostgreSQL이 검사해요.

```
# 1) PostgreSQL 16 (포트 5433, 소켓 /tmp) 에 데이터베이스 t 만들기
psql -h /tmp -p 5433 -U postgres -c "create database t"
psql -h /tmp -p 5433 -U postgres -d t -f stub.sql          # auth.uid() · anon/authenticated 역할 흉내
psql -h /tmp -p 5433 -U postgres -d t -f ../schema.sql
# 2) 가짜 Supabase (npm i pg) 와 세 저장소를 담은 상위 폴더를 웹으로 열기
PORT=54321 node server.js &                                 # http://localhost:54321 (PORT를 꼭 적기: 컴퓨터에 PORT 값이 따로 있으면 다른 번호로 열려요)
(cd ../../.. && python3 -m http.server 8090 &)              # program-supporter · edu-safety-helper · chajikimi 가 나란히 있어야 함
# 3) 시험 (npm i playwright pg). 시험마다 ./reset.sh 로 비우기
./reset.sh && node e2e_ps.js    # 24개: 가입·센터 만들기·합치기·두 컴퓨터 맞추기·지우기 전달·사진 안 보냄·끊김 보관·로그아웃 지움·잠금·토큰 갱신·사용 안내·글자 크기
./reset.sh && node e2e_edu.js   # 5개
./reset.sh && node e2e_cj.js    # 11개 (차량 지킴이 build/차량지킴이.html)
./reset.sh && node e2e_id.js    # 24개: 센터 개설 코드(없음·틀림·이미 씀)·센터 멈추기, 아이디로 가입·센터 고유(다른 센터 기록 안 보임)·같은 아이디 막기·비밀번호 바꾸기·세 프로그램 같은 아이디 (v1.2)
```

2026-11-27 결과: 64개(24·5·11·24) 모두 통과 (Supabase처럼 pgcrypto를 extensions 스키마에 둔 DB, 예전 schema 위에 새 schema를 다시 실행한 상태), 콘솔 오류 없음. 메일 확인이 켜진 서버(CONFIRM=1)에서는 아이디 가입 때 관리자 안내가 나오는 것도 확인.
