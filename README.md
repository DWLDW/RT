# ReadingTown Staff WebApp

영어학원 내부용 웹앱 (출석/평가/엑셀 내보내기/AI 피드백/학생별 히스토리) 입니다.

- 운영 도메인: `staff.readingtown.cn`
- 기존 Moodle: `lms.readingtown.cn` (공존)
- 스택: Next.js + Tailwind + Prisma + PostgreSQL + NextAuth + Docker Compose


## 0) 먼저: 서버/도메인/HTTPS 1단계

아래 문서를 그대로 따라 실행하세요.

- `docs_STEP1_SERVER_SETUP.md`
- `docs_STEP2_DOCKER_COMPOSE.md`
- `docs_STEP10_OPERATIONS.md`
- `docs_STEP11_FULL_PROJECT_BOOTSTRAP.md`

## 1) 로컬/서버 공통 실행

```bash
cp .env.example .env
# .env 안의 비밀번호/시크릿/API키를 수정
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

브라우저: `http://localhost:3000/login`

- 기본 계정: `admin`
- 비밀번호: `.env`의 `SEED_ADMIN_PASSWORD`

## 2) Tencent Ubuntu 서버 배포 (자동화)

아래 명령만 실행:

```bash
cd /path/to/this/repo
./scripts/deploy_staff.sh
```

> 주의: 첫 실행시 `.env` 생성 후 수정하라는 메시지가 나오면,
> `/opt/staff-app/.env` 수정 후 다시 `./scripts/deploy_staff.sh` 실행하세요.

## 3) Nginx 공존 전략

- 이 프로젝트는 `/etc/nginx/sites-available/staff.readingtown.cn.conf`만 추가합니다.
- 기존 `lms.readingtown.cn` 설정 파일을 수정하지 않습니다.

## 4) AI 토큰 절약 설계

1. `lesson_shared_summary`를 수업당 1회 생성/저장.
2. 학생별 피드백 생성시 `공통요약 + 학생평가`만 사용.
3. 동일 입력 해시가 있으면 기존 피드백 재사용 (재생성 방지).

## 5) 주요 API

- `POST /api/students` 학생 등록
- `POST /api/attendance` 출석 저장
- `POST /api/evaluations` 평가 저장
- `POST /api/feedback` AI 피드백 생성/재사용
- `GET /api/students/:id/history` 학생 히스토리 JSON
- `GET /api/export` Excel 다운로드
- `POST /api/upload` 파일 업로드 (`/data/uploads`)
