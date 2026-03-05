# STEP12: Full Release Handoff (최종 배포본)

이 문서는 "서버에 구버전 코드가 남아 빌드 실패"하는 상황까지 포함해,
ReadingTown Staff 앱을 **최신 완성본으로 강제 동기화 + 재배포**하는 최종 절차입니다.

## 1) 한 줄 복구/배포

아래 한 줄은 다음을 모두 수행합니다.
- 최신 코드 강제 동기화
- `docker compose`/`docker-compose` 자동 호환
- 이미지 재빌드 + 컨테이너 재기동

```bash
cd /opt/staff-app && git fetch --all --prune && git checkout main && git reset --hard origin/main && bash scripts/recover_server.sh
```

## 2) 빌드 실패 원인 체크 포인트

최신 코드라면 아래 조건을 만족해야 합니다.

- `.eslintrc.json`에 `next/typescript`가 없어야 함
- `app/(auth)/login/page.tsx`의 server action이 `return { error: ... }`를 반환하지 않아야 함
- `app/api/students/[id]/history/route.ts` 관계명이 `attendance`, `evaluations`, `aiFeedback` 이어야 함

확인 명령:

```bash
cd /opt/staff-app
sed -n '1,20p' .eslintrc.json
sed -n '1,80p' 'app/(auth)/login/page.tsx'
sed -n '1,80p' 'app/api/students/[id]/history/route.ts'
```

## 3) 운영 확인

```bash
cd /opt/staff-app
( docker compose -f docker-compose.yml ps || docker-compose -f docker-compose.yml ps )
( docker compose -f docker-compose.yml logs --tail=200 web db || docker-compose -f docker-compose.yml logs --tail=200 web db )
curl -I http://127.0.0.1:3001/login
```

## 4) 참고

- bcrypt/edge runtime 관련 메시지는 대개 **경고**이며, 실제 실패 원인은 빌드 타입/ESLint 오류인 경우가 대부분입니다.
- `npm install`이 오래 걸리는 서버는 네트워크/레지스트리 상황에 따라 10분 이상 소요될 수 있습니다.
