# 가계부 프로젝트 개발 규칙

개인용 가계부 풀스택 웹 앱. 학습 + 포트폴리오 목적.
상세 기능은 [가계부_기능명세서.md](가계부_기능명세서.md) 참고.

## 깃 워크플로우 — GitHub Flow

- `main`은 항상 동작하는 상태로 유지한다.
- 모든 작업은 브랜치에서 진행: `feat/기능명`, `fix/버그명`, `docs/문서명`, `refactor/대상`, `chore/작업`
- 작업 완료 → PR(Pull Request) 생성 → `main`에 병합 → 병합된 브랜치 삭제
- 명세서 7장 단계 완료 시 태그를 단다: `v0.1-기반구축`, `v0.2-분류분석` 등

## 커밋 메시지

- 형식: `<타입>: <한글 요약>`
- 타입: `feat` | `fix` | `docs` | `refactor` | `chore`
- 본문(선택): 변경한 이유를 한글로 설명
- 끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

## PR (Pull Request)

- 제목은 커밋과 동일한 형식: `<타입>: <한글 요약>`
- 본문은 [.github/pull_request_template.md](.github/pull_request_template.md) 양식을 따른다
  (변경 내용 / 변경 이유 / 확인 방법 / 관련 / 체크리스트).
- 병합 후 작업 브랜치는 삭제한다.

## 개발일지

- [docs/개발일지.md](docs/개발일지.md)에 배운 점·삽질·해결 과정을 누적 기록.
- 평소엔 파일 끝에 짧게 덧붙이기만(append) → 단계가 끝나면 한 번에 정리.

## 데이터 관리

- DB 데이터는 도커 볼륨(`db_data`)에만 존재. git/GitHub에 올리지 않는다.
- 백업·이전은 `pg_dump` / `pg_restore`로 한다 (코드와 데이터는 분리).
