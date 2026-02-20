# 🚀 Railway 배포 가이드

## 준비물
- GitHub 계정
- Railway 계정 (railway.app — GitHub로 가입 가능)

---

## STEP 1. GitHub에 올리기

터미널(또는 명령 프롬프트)에서 프로젝트 폴더로 이동 후 아래 명령어를 **순서대로** 복붙하세요.

```bash
git init
git add .
git commit -m "init: melody-quest"
```

그다음 GitHub에서 새 repository를 만드세요.
- github.com 접속 → 우상단 `+` → `New repository`
- 이름: `melody-quest`
- Private or Public 선택 후 `Create repository`

GitHub가 알려주는 명령어 중 아래 두 줄 복붙:
```bash
git remote add origin https://github.com/[내아이디]/melody-quest.git
git push -u origin main
```

---

## STEP 2. Railway 프로젝트 생성

1. [railway.app](https://railway.app) 접속 → `Start a New Project`
2. `Deploy from GitHub repo` 클릭
3. GitHub 연동 허용 → `melody-quest` repo 선택
4. `Deploy Now` 클릭

---

## STEP 3. PostgreSQL DB 추가

Railway 대시보드에서:
1. 좌측 `+ New` 버튼 클릭
2. `Database` → `Add PostgreSQL` 선택
3. 생성 완료되면 PostgreSQL 서비스 클릭 → `Variables` 탭
4. `DATABASE_URL` 값 복사해두기

---

## STEP 4. 환경변수 설정

Railway 대시보드에서 melody-quest **서비스** 클릭 → `Variables` 탭:

| 변수명 | 값 |
|---|---|
| `DATABASE_URL` | (위에서 복사한 값) |
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `YOUTUBE_API_KEY` | (선택사항, 없어도 됨) |

입력 후 `Deploy` 버튼 클릭.

---

## STEP 5. DB 초기화

배포가 완료되면 Railway 대시보드 → melody-quest 서비스 → `Settings` → `Deploy` 탭 아래 `Shell` 버튼(또는 상단 탭의 `Terminal`) 클릭 후:

```bash
npm run db:push
```

---

## 완료!

잠시 후 Railway가 자동으로 URL을 생성해줍니다.
예: `https://melody-quest-production-xxxx.up.railway.app`

대시보드 상단에서 확인 가능합니다. 🎉

---

## 막히는 경우

- **빌드 실패**: Railway 대시보드 → `Deployments` → 실패한 배포 클릭 → 로그 확인
- **DB 연결 오류**: `DATABASE_URL` 환경변수가 제대로 설정됐는지 확인
- **포트 오류**: `PORT` 환경변수가 `5000`으로 설정됐는지 확인
