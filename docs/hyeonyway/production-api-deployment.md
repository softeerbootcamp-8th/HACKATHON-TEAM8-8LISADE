# 운영 API 배포 설정 (#8)

웹 프론트는 `https://8lisade.site`이고 API는 `https://api.8lisade.site`를
사용한다.

```
Vercel (https://8lisade.site)
  └─ HTTPS / CORS + Cookie ─> Nginx (EC2 :443) ─> Spring Boot (127.0.0.1:8080)
```

## Vercel 설정

Vercel 프로젝트의 Production 환경 변수에 아래를 설정하고 재배포한다.

```text
VITE_API_BASE_URL=https://api.8lisade.site
```

로컬 개발은 이 값을 설정하지 않는다. Vite의 `/api` 프록시를 계속 사용한다.

## EC2 최초 설정

1. EC2 Security Group에서 TCP 80과 443을 인터넷에 열고, Docker가 localhost에만
   바인딩된 뒤에는 TCP 8080 공개 인바운드를 제거한다.
2. `sudo dnf install -y nginx certbot python3-certbot-nginx`로 Nginx와 Certbot을 설치한다.
3. 인증서가 생기기 전에는 `infra/nginx/8lisade-api-bootstrap.conf`를
   `/etc/nginx/conf.d/8lisade-api.conf`에 설치해 80 포트에서 ACME challenge를
   응답하게 한다. 같은 경로에 `infra/nginx/server-names.conf`도 설치한다.
   발급 후에는 `8lisade-api.conf.template`로 교체한다.
4. `sudo certbot --nginx -d api.8lisade.site`으로
   인증서를 발급한다. Certbot의 연락 이메일은 운영 담당자의 이메일을 사용한다.
5. `sudo nginx -t && sudo systemctl enable --now nginx`로 적용한다.

인증서 갱신은 `systemctl list-timers | grep certbot`으로 타이머가 등록됐는지 확인하고,
갱신 뒤 `nginx` reload가 되는지 한 번 검증한다.

### 현재 EC2 적용 상태 (2026-08-25)

Nginx, Certbot과 Certbot 갱신 타이머는 설치·활성화됐다. `api.8lisade.site` 인증서는
2026-08-26에 발급됐으며 2026-11-24에 만료된다. 현재 EC2는 final Nginx 설정으로 80에서
HTTPS로 리다이렉트하고 443에서 Spring을 프록시한다.

## 쿠키 및 CORS

`prod` 프로필은 `https://8lisade.site` origin만 허용하고 credentials를 허용한다. `JSESSIONID`는
`Secure; HttpOnly; SameSite=None`, CSRF용 `XSRF-TOKEN`은
`Secure; SameSite=None`으로 발급된다. 프론트는 요청마다 `credentials: include`를
사용한다.

웹과 API는 `8lisade.site`의 서브도메인을 사용하므로 같은 사이트로 취급된다.

## S3 업로드 설정

EC2 instance profile이 AWS 자격증명을 제공하고, Compose가 버킷 이름을 컨테이너에
전달한다. 운영 기본 버킷은
`8lisade-mission-image-upload-762794225137-ap-northeast-2-an`이며, 다른 환경은
`S3_BUCKET` 환경변수로 덮어쓸 수 있다. Access key를 Compose나 CI 환경변수에 넣지 않는다.

## 배포 후 확인

```bash
curl -I https://api.8lisade.site/api/health
curl -i -X OPTIONS https://api.8lisade.site/api/auth/csrf \
  -H 'Origin: https://8lisade.site' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: X-XSRF-TOKEN'
```

두 번째 요청은 `Access-Control-Allow-Origin: https://8lisade.site`,
`Access-Control-Allow-Credentials: true`와 `X-XSRF-TOKEN` 허용 헤더를 반환해야 한다.
