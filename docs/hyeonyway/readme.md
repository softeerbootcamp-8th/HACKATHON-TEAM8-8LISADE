# README / 서비스 문서 구현 기록

## Repository 루트 README 작성 (#99)

- 서비스 설명, Tech Stack(Frontend/Backend/Infra), 서비스 아키텍처, ERD, 팀 구성 섹션으로 `README.md`를 새로 작성했다.
- 서비스 아키텍처는 `asset/service-architecture.drawio`(draw.io, AWS4 스텐실 + Nginx/Spring/MySQL 실제 로고 아이콘)로 그리고 `asset/service-architecture.png`로 export해 README에 임베드했다. 다이어그램 원본을 수정하면 PNG도 재-export해서 교체해야 한다(README에 명시).
- 아키텍처 흐름 설명 중 미션 제출 사진 업로드 단계는 "Backend가 presigned URL을 발급하고 클라이언트가 S3에 직접 업로드한다(Backend가 파일을 릴레이하지 않는다)"로 정정했다 — `mission.md`에 이미 기록된 실제 구현(`StoragePresigner`, 클라이언트 직접 업로드)과 일치시킴. 기존 초안은 "EC2 IAM instance profile로 업로드"로 잘못 적혀 있었다.
- ERD는 ERDCloud 스키마 기준 mermaid `erDiagram`으로 채웠다.
- 팀 구성원 역할은 GitHub PR 이력(`gh pr list --author`) 기준으로 요약해 채웠다.
- Known Issues: iOS는 Capacitor iOS 빌드/배포에 Apple Developer Program(유료) 가입이 필요해 이번 범위에서 미지원, 웹은 브라우저 Geolocation API의 백그라운드 제약·기기별 정확도 편차로 안전 구역 이탈 판정이 앱 대비 불안정할 수 있음을 명시했다.

검증: README 이미지 참조(`asset/service-architecture.png`) 파일 존재 확인, `asset/service-architecture.drawio` XML well-formed 확인(`xml.etree.ElementTree`), mermaid 코드펜스 짝 확인.
