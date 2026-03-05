# 1단계: 서버 준비 + 도메인 + Nginx/SSL

> 목적: `staff.readingtown.cn` 을 현재 서버로 연결하고 HTTPS 적용
> 
> 보장: 기존 `lms.readingtown.cn` 서비스는 **절대 수정하지 않고 공존**

## A. 서버 상태 점검 명령어

```bash
# 1) OS/커널/시간
uname -a
lsb_release -a || cat /etc/os-release
timedatectl

# 2) 웹서버/도커 설치 여부
nginx -v || echo "nginx not installed"
docker --version || echo "docker not installed"
docker compose version || docker-compose --version || echo "docker compose not installed"

# 3) 현재 리스닝 포트/프로세스 확인
sudo ss -tulpn | grep -E ':22|:80|:443|:3000|:3001|:5432' || true

# 4) nginx 활성 사이트 확인 (lms 유지 확인용)
sudo ls -al /etc/nginx/sites-enabled
sudo nginx -T | sed -n '1,220p'
```

## B. DNS 설정

DNS 관리 콘솔(도메인 등록기관 또는 DNS 서비스)에서 아래 레코드를 추가:

- 타입: `A`
- 호스트: `staff`
- 값: `서버 공인 IP`
- TTL: `600`(또는 기본)

검증:

```bash
dig +short staff.readingtown.cn
nslookup staff.readingtown.cn 1.1.1.1
```

## C. Nginx 설치 + staff 서버블록 생성

```bash
# Ubuntu 기준
sudo apt update
sudo apt install -y nginx

# staff 전용 nginx 설정 파일 생성
sudo tee /etc/nginx/sites-available/staff.readingtown.cn.conf > /dev/null <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name staff.readingtown.cn;

    # certbot HTTP-01 인증 경로
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # 앱 reverse proxy (Next.js는 127.0.0.1:3001에서 동작)
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
NGINX

# 활성화 (lms 설정은 건드리지 않음)
sudo ln -sfn /etc/nginx/sites-available/staff.readingtown.cn.conf /etc/nginx/sites-enabled/staff.readingtown.cn.conf

# nginx 문법검사/재시작
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx --no-pager
```

## D. Let's Encrypt SSL 발급 + 자동갱신

```bash
sudo apt install -y certbot python3-certbot-nginx

# staff 서브도메인만 발급/적용
sudo certbot --nginx \
  -d staff.readingtown.cn \
  --redirect \
  -m admin@readingtown.cn \
  --agree-tos \
  --no-eff-email

# 자동갱신 타이머 확인
systemctl list-timers | grep certbot || true

# 갱신 리허설 테스트
sudo certbot renew --dry-run
```

## E. UFW 방화벽 최소 오픈(22,80,443)

```bash
sudo apt install -y ufw
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status verbose
```

## F. 최종 점검 체크리스트

```bash
# DNS가 서버 IP를 가리키는지
 dig +short staff.readingtown.cn

# HTTP 응답(최초에는 200/301이면 정상)
 curl -I http://staff.readingtown.cn

# HTTPS 응답(인증서 적용 후 200/301 확인)
 curl -I https://staff.readingtown.cn

# 인증서 체인 확인
 echo | openssl s_client -connect staff.readingtown.cn:443 -servername staff.readingtown.cn 2>/dev/null | openssl x509 -noout -issuer -subject -dates

# lms가 여전히 정상인지 (공존 확인)
 curl -I https://lms.readingtown.cn
```
