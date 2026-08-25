# 운영 API 배포 설정 (#8)

웹 프론트는 `https://8lisade.vercel.app`이고 API는 EC2의 HTTPS 공개 DNS를
사용한다.

```
Vercel (https://8lisade.vercel.app)
  └─ HTTPS / CORS + Cookie ─> Nginx (EC2 :443) ─> Spring Boot (127.0.0.1:8080)
```

## Vercel 설정

Vercel 프로젝트의 Production 환경 변수에 아래를 설정하고 재배포한다.

```text
VITE_API_BASE_URL=https://ec2-3-34-148-229.ap-northeast-2.compute.amazonaws.com
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
4. `sudo certbot --nginx -d ec2-3-34-148-229.ap-northeast-2.compute.amazonaws.com`으로
   인증서를 발급한다. Certbot의 연락 이메일은 운영 담당자의 이메일을 사용한다.
5. `sudo nginx -t && sudo systemctl enable --now nginx`로 적용한다.

인증서 갱신은 `systemctl list-timers | grep certbot`으로 타이머가 등록됐는지 확인하고,
갱신 뒤 `nginx` reload가 되는지 한 번 검증한다.

### 현재 EC2 적용 상태 (2026-08-25)

Nginx, Certbot과 Certbot 갱신 타이머는 설치·활성화됐고 bootstrap 설정은 80 포트에서
실행 중이다. 외부 `http://ec2-3-34-148-229.ap-northeast-2.compute.amazonaws.com:80`
연결은 현재 타임아웃된다. 인증서 발급 전 AWS Security Group에 TCP 80/443 인바운드를
추가해야 한다. 80이 열리고 Certbot 연락 이메일이 정해지면 인증서를 발급하고 최종
Nginx 설정으로 교체한다.

## 쿠키 및 CORS

`prod` 프로필은 Vercel origin만 허용하고 credentials를 허용한다. `JSESSIONID`는
`Secure; HttpOnly; SameSite=None`, CSRF용 `XSRF-TOKEN`은
`Secure; SameSite=None`으로 발급된다. 프론트는 요청마다 `credentials: include`를
사용한다.

Vercel과 EC2 공개 DNS는 서로 다른 사이트이므로 브라우저의 서드파티 쿠키 차단 정책에
영향받을 수 있다. MVP 이후에는 `app.<same-domain>`과 `api.<same-domain>`처럼 같은
상위 도메인으로 옮기는 것을 권장한다.

## 배포 후 확인

```bash
curl -I https://ec2-3-34-148-229.ap-northeast-2.compute.amazonaws.com/api/health
curl -i -X OPTIONS https://ec2-3-34-148-229.ap-northeast-2.compute.amazonaws.com/api/auth/csrf \
  -H 'Origin: https://8lisade.vercel.app' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: X-XSRF-TOKEN'
```

두 번째 요청은 `Access-Control-Allow-Origin: https://8lisade.vercel.app`,
`Access-Control-Allow-Credentials: true`와 `X-XSRF-TOKEN` 허용 헤더를 반환해야 한다.
