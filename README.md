# 🎵 Music Playlist Quiz

YouTube 플레이리스트로 즐기는 음악 맞추기 게임

## 시작하기

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정
```bash
cp .env.example .env
# .env 파일에 DATABASE_URL 입력
```

### 3. DB 마이그레이션
```bash
npm run db:push
```

### 4. 개발 서버 실행
```bash
npm run dev
```

→ http://localhost:5000

## 배포 (Replit / Railway / Render)

```bash
npm run build
npm run start
```

## 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` | ✅ | PostgreSQL 연결 문자열 |
| `YOUTUBE_API_KEY` | ❌ | 있으면 공식 API 사용 (없으면 scraping) |
| `PORT` | ❌ | 포트 번호 (기본값: 5000) |

## 기술 스택

- **Frontend**: React + Vite + TailwindCSS + Framer Motion
- **Backend**: Express.js + TypeScript
- **DB**: PostgreSQL + Drizzle ORM
- **YouTube**: react-youtube + ytpl (scraping fallback)
