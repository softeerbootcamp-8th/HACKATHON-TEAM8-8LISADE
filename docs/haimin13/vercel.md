# Vercel 배포 관련 파일 gitignore 처리 (#64)

- 로컬 Vercel 배포 설정(`.vercel/`)과 배포 스크립트(`deploy.sh`, `.vercelignore`)가 untracked 상태로 남아 있어 `.gitignore`에 `.vercel/`, `.vercelignore`, `deploy.sh`를 추가했다. 세 파일 모두 개인 배포 환경에 종속적이거나 로컬 자동화 스크립트라 저장소에 커밋할 필요가 없다.
- 파일 자체는 삭제하지 않고 추적 대상에서만 제외했다.

검증: `git status`에서 `.vercel/`, `.vercelignore`, `deploy.sh`가 더 이상 표시되지 않음을 확인.

# Vercel CD 배포 시 커밋 author 불일치 문제 해결 (#69)

- `develop → main` 머지 시 자동 배포하는 [`.github/workflows/vercel-deploy.yml`](../../.github/workflows/vercel-deploy.yml)이, 머지 커밋의 author(머지를 실행한 팀원의 GitHub noreply 이메일)가 Vercel Team에 연결된 계정과 매칭되지 않으면 `The deployment was blocked because the commit email ... could not be matched to a GitHub account.` 에러로 차단되는 문제가 있었다.
- Vercel이 Hobby(무료) 플랜이라 팀원 초대로 계정을 매칭시킬 수 없고, 대시보드에도 관련 배포 보호 설정이 노출되지 않아 근본 해결(설정 변경)이 불가능했다.
- 로컬 `deploy.sh`가 쓰던 우회 방법(배포 직전 `git commit --amend --author`로 신뢰된 계정으로 바꿨다가 `git reset --hard`로 원상복구)을 CI에 맞게 재현했다. `actions/checkout` 직후 `vercel build`/`vercel deploy` 이전에 `git commit --amend --no-edit --author=...`로 author를 신뢰된 계정(`haimin13`)으로 바꾸는 단계를 추가했다.
- GitHub Actions 러너는 매 실행마다 새로 생성되고 끝나면 버려지는 일회성 환경이라, 로컬처럼 이력을 복구(`reset --hard`)할 필요가 없다 — amend는 러너의 워킹 카피에만 적용되고 push하지 않으므로 원격 브랜치/이력에는 전혀 영향이 없다.
- CI에서 더 이상 필요 없어진 로컬 `deploy.sh`는 삭제했다(원래 `.gitignore` 처리되어 있던 untracked 파일이라 git 이력에는 영향 없음).
- `main` push 없이도 즉시 검증할 수 있도록 `workflow_dispatch` 트리거를 추가했다. 검증 완료 후에도 긴급 재배포/수동 확인 용도로 그대로 유지한다.

검증: `gh workflow run vercel-deploy.yml --ref fix/#69-vercel-cd-author-mismatch`로 수동 실행 → [run #32870254807](https://github.com/softeerbootcamp-8th/HACKATHON-TEAM8-8LISADE/actions/runs/32870254807) 전 단계(author amend 포함) 성공, author 불일치 에러 없이 `https://8lisade.vercel.app`로 정상 배포됨을 확인.
