# Issue 구현 결과 기록 템플릿

`documenting-issue-work` Skill에서 참조하는 AI 전용 참고 자료다. GitHub
Issue Template(`.github/ISSUE_TEMPLATE/`)과는 목적이 다르다 — 이건 개발
완료 "이후" Issue에 덧붙이는 섹션 골격이다.

구현이 끝나고 검증까지 마쳤다면, 아래 골격을 Issue 본문(또는 댓글)에
추가/갱신한다. 실제로 확인한 내용만 채운다 — 아직 검증하지 않은 내용을
완료된 것처럼 쓰지 않는다.

```markdown
## 구현 결과

### 주요 변경 사항
-

### 실제 구현 구조
-

### 설계 대비 변경 사항
<!-- 설계와 동일하면 "설계와 동일하게 구현" 이라고 명시. 다르면 무엇이·왜 바뀌었는지 작성 -->

### 테스트 / 검증 결과
<!-- 실행한 명령과 실제 결과(pass/fail 수, 커버리지 등)를 구체적으로 기록 -->
```

`## 작업 항목`의 checkbox도 실제 완료 상태에 맞게 함께 갱신한다.

이 Issue 기록과 별개로, `docs/<github-id>/<domain>.md`에도 코드 관점의
짧은 구현 요약을 남기고 커밋한다(`GROUND-RULE.md` §13, `documenting-issue-work`
Skill 참고). 둘 중 하나가 다른 하나를 대체하지 않는다.
