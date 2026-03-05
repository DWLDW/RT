# 10단계: 배포 완료 운영 플로우 (운영 매뉴얼)

> 대상 서버: Ubuntu + Docker Compose + Nginx
> 
> 앱 경로: `/opt/staff-app`

## 0) Nginx 리버스 프록시 설정

`staff.readingtown.cn`은 Docker web 포트(예: `127.0.0.1:3001`)로 프록시합니다.

> compose에서 web를 `127.0.0.1:3001:3000`으로 열어두면 아래 설정 그대로 사용.

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name staff.readingtown.cn;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300;
    }
}
```

적용 명령어:

```bash
sudo cp /opt/staff-app/infra/nginx/staff.readingtown.cn.conf /etc/nginx/sites-available/staff.readingtown.cn.conf
sudo ln -sfn /etc/nginx/sites-available/staff.readingtown.cn.conf /etc/nginx/sites-enabled/staff.readingtown.cn.conf
sudo nginx -t
sudo systemctl reload nginx
```

---

## 1) docker compose 자동 시작(systemd)

리포지토리에 포함된 유닛 파일: `infra/systemd/staff-app.service`

설치/활성화 명령어:

```bash
sudo cp /opt/staff-app/infra/systemd/staff-app.service /etc/systemd/system/staff-app.service
sudo systemctl daemon-reload
sudo systemctl enable --now staff-app.service

# 상태 확인
systemctl status staff-app.service --no-pager
```

재부팅 후 자동 시작 확인:

```bash
sudo reboot
# 재접속 후
systemctl status staff-app.service --no-pager
docker compose -f /opt/staff-app/docker-compose.yml ps
```

---

## 2) 운영 로그 확인

```bash
# 서비스 상태
systemctl status staff-app.service --no-pager

# web/db 로그 실시간
cd /opt/staff-app
docker compose logs -f web
docker compose logs -f db

# 최근 200줄만
cd /opt/staff-app
docker compose logs --tail=200 web
docker compose logs --tail=200 db
```

---

## 3) 업데이트 절차

요구 절차: `git pull -> docker compose build -> up -d`

```bash
cd /opt/staff-app

git pull

docker compose build

docker compose up -d

# 마이그레이션/시드가 필요하면
# docker compose exec web npx prisma migrate deploy
# docker compose exec web npm run prisma:seed

# 확인
docker compose ps
curl -I http://127.0.0.1:3001
curl -I https://staff.readingtown.cn
```

---

## 4) DB 백업

```bash
cd /opt/staff-app
mkdir -p backups

# .env 환경변수 사용해서 DB dump 파일 생성
set -a
source .env
set +a

docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > backups/db_$(date +%F_%H%M%S).sql

# 압축
gzip backups/db_*.sql
ls -lh backups/
```

복구 예시:

```bash
cd /opt/staff-app
set -a
source .env
set +a

# 예: backups/db_2026-03-04_120000.sql.gz 복구
gunzip -c backups/db_2026-03-04_120000.sql.gz | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

---

## 5) 업로드 파일 백업 (/data/uploads)

```bash
sudo mkdir -p /data/backups
sudo tar -czf /data/backups/uploads_$(date +%F_%H%M%S).tar.gz /data/uploads
sudo ls -lh /data/backups
```

복구 예시:

```bash
# 주의: 기존 파일 덮어쓸 수 있음
sudo tar -xzf /data/backups/uploads_2026-03-04_120000.tar.gz -C /
```

---

## 6) 운영 체크리스트

```bash
# 앱 컨테이너 정상 여부
cd /opt/staff-app
docker compose ps

# nginx 정상
sudo nginx -t
systemctl status nginx --no-pager

# 헬스 체크(내부/외부)
curl -I http://127.0.0.1:3001
curl -I https://staff.readingtown.cn

# 기존 LMS 공존 확인
curl -I https://lms.readingtown.cn
```


## 7) 빌드 실패(ESLint/loginAction) 빠른 복구

서버 코드가 구버전일 때 아래 스크립트로 최신 코드 동기화 + 빌드/실행을 한 번에 수행합니다.

```bash
cd /opt/staff-app
bash scripts/recover_server.sh
```

포함 내용:
- `git fetch/reset --hard origin/main`으로 최신 코드 강제 동기화
- `.eslintrc.json`에 `next/typescript` 잔존 여부 점검
- `app/(auth)/login/page.tsx`에서 `return { error: ... }` 잔존 여부 점검
- `docker compose`/`docker-compose` 자동 선택 후 `build --no-cache && up -d` 실행
