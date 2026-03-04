# 2단계: Docker Compose로 web+db 구성 (Next.js + Prisma + Postgres + Nginx 리버스프록시 연동)

> 대상 경로: `/opt/staff-app`

## 1) 서버에서 실행할 명령어 (복붙)

```bash
# 0. 필수 패키지 설치
sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release

# 1. Docker 엔진 + Compose 플러그인 설치 (Ubuntu 공식 저장소)
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker

# 2. 디렉토리 준비
sudo mkdir -p /opt/staff-app /data/postgres /data/uploads
sudo chown -R $USER:$USER /opt/staff-app
sudo chown -R 999:999 /data/postgres
sudo chown -R $USER:$USER /data/uploads

# 3. 소스 배치
# (현재 레포를 서버로 올린 뒤 실행)
cd /opt/staff-app
# 예시: git clone 한 경우
# git clone <repo-url> /opt/staff-app

# 4. 환경변수 파일 생성
cp .env.example .env
nano .env

# 5. 실행
cd /opt/staff-app
docker compose up -d --build
```

## 2) Nginx 리버스프록시와의 연결

- Compose는 web 컨테이너를 `127.0.0.1:3001`로 바인딩합니다.
- Nginx `staff.readingtown.cn` server block에서 `proxy_pass http://127.0.0.1:3001;` 를 사용하면 됩니다.

## 3) 최초 실행 후 확인 명령어

```bash
cd /opt/staff-app

# 컨테이너 상태 확인
docker compose ps

# 로그 확인 (오류 추적)
docker compose logs -f db
docker compose logs -f web

# healthcheck 상태 확인
docker inspect --format='{{json .State.Health}}' staff-db | jq
docker inspect --format='{{json .State.Health}}' staff-web | jq

# 웹 내부 응답 확인 (서버 로컬)
curl -I http://127.0.0.1:3001/login

# nginx 경유 확인
curl -I http://staff.readingtown.cn
curl -I https://staff.readingtown.cn

# DB 연결 확인
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\dt'
```
