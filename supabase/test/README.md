# 센터 계정(B) 두 컴퓨터 시험 (개발용)

진짜 Supabase 없이, 실제 PostgreSQL에 `../schema.sql`을 올리고 가짜 Supabase(`server.js`: 로그인·REST 일부)를 띄워 세 프로그램을 시험해요. RLS(같은 센터만 보기)는 진짜 PostgreSQL이 검사해요.

```
# 1) PostgreSQL 16 (포트 5433, 소켓 /tmp) 에 데이터베이스 t 만들기
psql -h /tmp -p 5433 -U postgres -c "create database t"
psql -h /tmp -p 5433 -U postgres -d t -f stub.sql          # auth.uid() · anon/authenticated 역할 흉내
psql -h /tmp -p 5433 -U postgres -d t -f ../schema.sql
# 2) 가짜 Supabase (npm i pg) 와 세 저장소를 담은 상위 폴더를 웹으로 열기
node server.js &                                            # http://localhost:54321
(cd ../../.. && python3 -m http.server 8090 &)              # program-supporter · edu-safety-helper · chajikimi 가 나란히 있어야 함
# 3) 시험 (npm i playwright pg). 시험마다 ./reset.sh 로 비우기
./reset.sh && node e2e_ps.js    # 24개: 가입·센터 만들기·합치기·두 컴퓨터 맞추기·지우기 전달·사진 안 보냄·끊김 보관·로그아웃 지움·잠금·토큰 갱신·사용 안내·글자 크기
./reset.sh && node e2e_edu.js   # 5개
./reset.sh && node e2e_cj.js    # 11개 (차량 지킴이 build/차량지킴이.html)
```

2026-11-24 결과: 40개 모두 통과, 콘솔 오류 없음.
