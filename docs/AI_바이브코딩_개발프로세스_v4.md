# AI Vibe Coding 기반 소프트웨어 개발 프로세스 (v4)

> 원본: `ai_vibe_coding_dev_process_20260516234333_v4.pdf` (41p, 2026-05-16)
> 핵심 구호: **Plan First, Code with AI, Verify Always** (+ v2 보강: **Evidence Before Approval**)

---

## 0. 전체 구조

4개 Phase / 14개 Step / 3개 Gate + 2개 보조 Gate.

```
Phase 1. Plan          Phase 2. Design & Prep       Phase 3. Build       Phase 4. Deploy
1 목적조사              4 보안·NFR                   9  바이브코딩        12 배포·운영
2 1차설계               5 UI/UX                      10 반복·튜닝         13 결과보고서
3 SRS 작성              6 AI 브리프 정리              11 검증(QA)          14 유지보수
                       7 TDD 계획
       ─G1─            8 환경 세팅        ─G2─            ─G3─
    요건동결                            설계동결        출시승인
                    ← DevOps Feedback Loop 전체를 관통 →
```

**산출물 체인 (Deliverable Chain)**

```
Vision → SRS → Arch/NFR → UI Kit → Test Plan → Dev Env → Increments → Reports → Runbook
```

---

## Phase 1. 기획 & 조사 (Planning & Research)

**목표**: 문제-해결 적합성 검증, MVP 스코프 확정, 초기 아키텍처 방향성 수립, 비즈니스 목표 얼라인먼트
**입력**: 비즈니스 핵심 목표, 이해관계자 인터뷰 결과, 시장/경쟁사 분석, 가용 예산·일정 제약
**출력**: 제품 비전, 사용자 페르소나/JTBD, SRS 초안, 리스크 레지스터
**성공 기준**: 문제 정의 명확화 / 범위·제약 합의 완수 / 측정 가능한 성공 목표(OKR) 설정 / 이해관계자 Sign-off

### Step 1. 개발 목적 정의 & 시장 조사

| 구분 | 내용 |
|---|---|
| 핵심 활동 | 문제 정의(Problem Statement), 타깃 세그먼트·페르소나 도출, JTBD 분석, 경쟁사/대체재 분석 및 핵심 가치제안 확립 |
| 추천 도구 | Lean Canvas / BMC, SWOT(Miro·FigJam), 설문·인터뷰(Typeform), Market Analytics(GA·Mixpanel) |
| 산출물 | 제품 비전 선언문, 핵심 목표 지표(North Star Metric), 초기 스코프 및 비즈니스 가설 목록 |
| 체크포인트 | 명확하고 측정 가능한 성공 지표가 정의되었는가? / 금지 요건 및 법적·규제 제약을 파악했는가? / 초기 ROI 가설이 합리적인가? |

### Step 2. 1차 개발 설계

| 구분 | 내용 |
|---|---|
| 핵심 활동 | 도메인 모델링, 아키텍처 후보 검토(C4 / Hexagonal), 기술스택 옵션 비교·선정, 인터페이스 식별 |
| 추천 도구 | Miro, Draw.io, C4 Model, ADR 템플릿 |
| 산출물 | 아키텍처 스케치, **ADR (Architecture Decision Record)**, 인터페이스 리스트 |
| 체크포인트 | 아키텍처의 변경 용이성이 고려되었는가? / 리스크가 높은 영역이 명확히 표시되었는가? / PoC가 필요한 기술 요소가 있는가? |

### Step 3. 설계 보강 & 문제점 체크 (SRS 작성)

| 구분 | 내용 |
|---|---|
| 핵심 활동 | 요구사항 명세(기능/비기능/제약사항 통합), 프로젝트 리스크 및 잠재적 가정 명시, 수용 기준(AC) 명확화 |
| 추천 도구 | Confluence/Notion, RFC 문서 포맷, IEEE 830 / 29148 표준 SRS 템플릿 |
| 산출물 | **[추가 권장 핵심] SRS v1**, 리스크 레지스터, MoSCoW 우선순위 맵(Must/Should/Could/Won't) |
| 체크포인트 | 요구사항의 모호성이 완벽히 제거되었는가? / 모든 요구사항에 테스트 가능성(Testability)이 확보되었는가? / 설계·범위에 대한 이해관계자 서명·합의가 완료되었는가? |

---

## Phase 2. 설계 & 준비 (Design & Preparation)

**목표**: 보안/성능/확장성 종합 설계, AI 기반 개발 환경 셋업, TDD 기반 테스트 준비 완비, UI/UX 확정
**입력**: SRS v1, 초기 아키텍처 스케치, 기능 우선순위 백로그, 제품 비전 및 제약 사항
**출력**: 보안/NFR 설계 문서, UI/UX 산출물, 테스트 전략 및 환경, 코드 생성 AI 핸드오프 자료
**성공 기준**: 품질속성 달성전략 수립 완료 / AI 핸드오프용 자료 100% 준비 / 보안 요구사항 아키텍처 반영 / 테스트 파이프라인 작동 확인

### Step 4. 2차 보안 & 비기능 요구사항 설계

| 구분 | 내용 |
|---|---|
| 핵심 활동 | 위협모델링(STRIDE), 인증·인가 체계 설계, Secrets/키 관리 전략, 성능 예산·확장성·가용성 설계 |
| 추천 도구 | OWASP ASVS, OWASP Threat Dragon, Data Flow Diagram Tools |
| 산출물 | 보안 설계 문서, NFR 스펙(SLO/SLI 정의), 데이터 보호 및 암호화 정책 |
| 체크포인트 | 민감 데이터 흐름·저장 경로가 파악되었는가? / 최소 권한 원칙이 설계에 반영되었는가? / 장애 및 데이터 유실 시나리오 대비책이 마련되었는가? |

### Step 5. UI/UX 디자인 & 화면 설계

| 구분 | 내용 |
|---|---|
| 핵심 활동 | 정보구조(IA) 및 사용자 흐름 정의, 화면 와이어프레임 설계·시각화, 디자인 시스템 및 재사용 컴포넌트 구축, 웹 접근성(WCAG AA) 고려 |
| 추천 도구 | Figma/FigJam, Storybook, Axe/Lighthouse, Adobe XD/Sketch |
| 산출물 | 화면 흐름도(Screen Flow Map), 컴포넌트 라이브러리·디자인 토큰 가이드, 클릭 가능한 인터랙션 프로토타입 |
| 체크포인트 | 핵심 태스크 완료 시 '3클릭 규칙'을 만족하는가? / 반응형 및 국제화가 고려되었는가? / 개발자 핸드오프 규칙과 명세가 명확한가? |

### Step 6. AI 전달용 자료 정리 (Context Engineering)

| 구분 | 내용 |
|---|---|
| 핵심 활동 | 문제 컨텍스트 패키징 및 API 스펙(OpenAPI) 정의, 샘플 데이터 및 에지 케이스 도출, AI 프롬프트 스타일가이드 작성, 기술 스택 확정 및 디자인 패턴 결정 |
| 추천 도구 | OpenAPI/Swagger, Postman, Mermaid, Markdown 에디터 |
| 산출물 | **AI 개발용 브리프(Context Package)**, 시스템·시퀀스 다이어그램, 데이터 계약서(Data Contract) |
| 체크포인트 | 문서의 최신성·일관성이 유지되는가? / 민감 개인정보 및 기밀이 마스킹되었는가? / AI가 재현 가능한 명확한 예제가 포함되어 있는가? |

### Step 7. TDD — 개발 전 테스트 케이스

| 구분 | 내용 |
|---|---|
| 핵심 활동 | 테스트 전략 수립(Unit/Integration/E2E), Gherkin 문법 기반 인수 조건(AC) 작성, 경계값 분석 및 에러 시나리오 도출, Red → Green → Refactor 준수, 목표 커버리지 설정 |
| 추천 도구 | Jest/PyTest/JUnit, Cypress/Playwright, Pact(Contract), Cucumber/Behave |
| 산출물 | 종합 테스트 계획서, 테스트 스펙·피처 파일, Mock 객체 및 테스트용 샘플 데이터 |
| 체크포인트 | 개발 전 실패하는 테스트를 먼저 작성했는가? / 테스트가 외부 의존성 없이 독립적·재현 가능한가? / CI에서 빠르고 병렬 실행 가능하도록 설계되었는가? |

### Step 8. 개발 환경 세팅

| 구분 | 내용 |
|---|---|
| 핵심 활동 | 레포 초기화 및 브랜치 전략 수립(GitFlow/Trunk), Dev Container 및 Docker 환경 구성, CI 파이프라인 템플릿 작성·시크릿 관리, AI 코딩 도구 셋업 |
| 추천 도구 | GitHub Actions/GitLab CI, Docker/Compose, pre-commit·Makefile·Renovate, Cursor·Claude Code |
| 산출물 | 부트스트랩된 저장소, 초기 베이스 스캐폴딩 코드, 첫 CI 빌드 성공(Green) 상태 |
| 체크포인트 | 어디서든 동일하게 재현 가능한 빌드 환경인가? / 린터·포매터 자동화가 적용되어 있는가? / 코드 스멜 방지 및 커버리지 유지를 위한 품질 게이트가 있는가? |

---

## Phase 3. 개발 & 검증 (Build & Validate)

**목표**: AI 기반 페어 프로그래밍, 기능 증분(Increment) 개발, 품질 검증 프로세스 통과, 배포 가능 상태 확보
**입력**: 작성된 테스트 케이스(TDD), 아키텍처·화면 설계 산출물, 세팅 완료된 개발 환경, 프롬프트 스타일가이드
**출력**: 동작하는 소프트웨어 증분, PR/코드리뷰 기록, 테스트 결과 리포트, 프롬프트 튜닝 라이브러리
**성공 기준**: 스프린트 목표 달성 / 결함 밀도 기준 만족 / 리드타임 목표치 달성 / 모든 테스트·품질 게이트 통과

### Step 9. AI 바이브 코딩 시작

| 구분 | 내용 |
|---|---|
| 핵심 활동 | 작업 슬라이싱(티켓/태스크 단위 세분화), 프롬프트 루프(초안→실행→리뷰→수정), AI 코드리뷰 및 적절한 커밋 단위 유지, Vibe Coding 사이클(프롬프트→생성→검토→수정) |
| 추천 도구 | Cursor·Windsurf, VS Code + Copilot, Claude Code·Aider, GitHub PR 템플릿 |
| 산출물 | 동작하는 기능 증분, PR 및 AI 페어 프로그래밍 코드리뷰 기록, 재사용 가능한 프롬프트·스니펫 라이브러리 |
| 체크포인트 | TDD 흐름을 올바르게 유지하고 있는가? / 보안 린트 검증 및 취약점 검사를 통과했는가? / 주요 구조 변경 시 ADR을 작성했는가? |

### Step 9+ (Deep Dive). CLEAR 프레임워크로 프롬프트 최적화

| 글자 | 의미 | 설명 |
|---|---|---|
| **C** | Context (맥락) | 배경, 목적, 아키텍처 및 도메인 정보 제공 |
| **L** | Language (언어/제약) | 프로그래밍 언어, 프레임워크, 라이브러리 명시 |
| **E** | Examples (입출력 샘플) | 정확한 입력 데이터 구조와 기대 출력 형태 |
| **A** | Ask (행동/제약) | 수행할 명확한 작업 지시, 성능·보안 요구사항 |
| **R** | Review (평가/개선) | 에지 케이스, 테스트 기준 확인 및 스스로 점검 유도 |

**나쁜 프롬프트**: "이 로그 데이터를 파싱해서 필터링하는 함수 만들어줘."

**좋은 프롬프트 (CLEAR 적용)**:
```
[Context] 사용자 로그 데이터를 분석하는 모듈입니다.
[Language] TypeScript, Node.js 환경, date-fns 필수 사용
[Examples]
  Input:  [{ "date": "2026-05-16", "action": "click" }]
  Output: [{ date: Date, isWeekend: true }]
[Ask] 배열에서 주말에 발생한 click 이벤트만 필터링하는 순수 함수 작성.
      성능 최적화(O(n)) 및 타입 정의 포함.
[Review] 작성 완료 후 에지 케이스(빈 배열, 잘못된 날짜 형식) 처리 방안을 주석으로 요약해줘.
```

체크포인트: 모호성 제거(명확한 제약) / 토큰 예산 관리(간결성) / 스타일가이드 준수

### Step 10. 반복 개발 & 프롬프트 튜닝

| 구분 | 내용 |
|---|---|
| 핵심 활동 | 작은 배치 크기(Small Batch Size) 유지, 회귀 테스트 자동화 및 신속한 검증, 프롬프트 버저닝 및 실험 결과 로깅, LLM 평가(Eval) 및 AI와의 페어 프로그래밍 |
| 추천 도구 | LangSmith/Langfuse, W&B, OpenAI Evals, DVC |
| 산출물 | 체인지로그, 프롬프트 라이브러리, 실험 리포트 및 평가 지표 |
| 체크포인트 | 개발 속도와 코드 품질의 균형을 유지하고 있는가? / 데이터 누락이나 편향 문제가 점검되었는가? / 정기적인 회고 루프로 개발 과정을 최적화하는가? |

### Step 11. 개발 검증 (QA)

| 구분 | 내용 |
|---|---|
| 핵심 활동 | 정적분석(SAST) 및 코드 품질 점검, Unit/Integration/E2E 테스트 자동 실행, 계약(Contract)·회귀·성능·보안 테스트 수행, 테스트 커버리지 측정 및 품질 게이트 통과 검증 |
| 추천 도구 | SonarQube·Snyk, Cypress·Playwright, k6·Lighthouse, OWASP ZAP |
| 산출물 | 자동화된 테스트 실행 결과 및 분석 리포트, 식별된 결함 티켓 및 대응 상태, CI/CD 품질 게이트 통과 증빙 문서 |
| 체크포인트 | 릴리스 전 치명적(P0/P1) 결함이 모두 0건인가? / 정의된 성능 예산을 충족하는가? / 보안 취약점 스캔 결과가 허용 임계치 이하인가? |

---

## Phase 4. 배포 & 운영 (Deploy & Operate)

**목표**: 안정적 프로덕션 출시, 관측 가능성 확보, 신속한 롤백 경로 보장, 배포 자동화 완성
**입력**: 릴리스 후보(RC) 패키지, 테스트·보안 통과 결과, 런북 초안, 품질 게이트 승인 내역
**출력**: 운영환경(Production), 모니터링 대시보드 및 알람, 릴리스 노트, 업데이트된 런북/롤백 가이드
**성공 기준**: 무중단(또는 제한적 중단) 배포 / MTTR 단축 / 사용자 영향·오류 최소화 / SLO/SLI 기반 관측 지표 도달

### Step 12. 배포 & 운영 환경 구축

| 구분 | 내용 |
|---|---|
| 핵심 활동 | IaC(Terraform) 및 환경 구성(Dev/Stg/Prod), 컨테이너화(Docker/K8s), 릴리스 전략(Blue-Green/Canary/Rolling), 관측 가능성 확보(Logs/Metrics/Traces, SLO/SLI) |
| 추천 도구 | Terraform·Helm·ArgoCD, Vercel·AWS·GCP, Prometheus·Grafana, Datadog·Sentry |
| 산출물 | IaC 리포지토리 및 구성 스크립트, CD 파이프라인, 모니터링 대시보드·알람 설정, 롤백 런북 |
| 체크포인트 | 시크릿과 구성이 분리되었는가? / 헬스체크 및 오토스케일링이 적절히 설정되었는가? / 신속한 롤백 경로가 검증되었는가? |

### Step 13. 최종 결과 보고서 작성

| 구분 | 내용 |
|---|---|
| 핵심 활동 | 개발 성과 정리 및 KPI/목표지표 측정, 프로젝트 문서화(README, API Docs), 회고(Retrospective) 진행, 이해관계자 최종 보고·리뷰 |
| 추천 도구 | Notion/Confluence, Swagger/OpenAPI, GitBook, Mermaid |
| 산출물 | 프로젝트 완료 보고서, 기술 문서(API 스펙 및 Architecture), 릴리스 노트, KPI 성과 대시보드 |
| 체크포인트 | 측정 가능한 구체적 성과가 명시되었는가? / 미해결 이슈 및 기술부채가 정확히 기록되었는가? / 다음 스프린트 또는 운영 백로그와 잘 연결되었는가? |

### Step 14. 유지보수 & 피드백 사이클

| 구분 | 내용 |
|---|---|
| 핵심 활동 | 사용자 피드백 수집(설문/인터뷰), 버그 트래킹 및 이슈 관리, 지속적 개선(CI) 및 버전 관리(SemVer), DevOps Infinity Loop 실천 |
| 추천 도구 | Sentry·PagerDuty, GitHub Issues·Linear·Jira, Hotjar·Amplitude |
| 산출물 | 피드백 대시보드, 백로그 업데이트 리스트, 핫픽스/패치 릴리스 및 Postmortem 문서 |
| 체크포인트 | SLO/SLA 모니터링이 원활하게 이루어지는가? / 사용자 NPS 추적 및 회고 주기가 정착되었는가? / 지속 가능한 기술부채 상환 계획이 수립되었는가? |

---

## 핵심 산출물 정리표 (Input → Process → Output)

| Step | Input | Process | Output |
|---|---|---|---|
| 1. 목적 & 조사 | 이해관계자 목표, 시장 데이터 | 문제 정의, 가치 제안 분석 | Product Vision, 초기 가설 |
| 2. 1차 개발 설계 | Product Vision, 도메인 지식 | 아키텍처 스케치, 기술 옵션 비교 | 1차 아키텍처, ADR, 인터페이스 |
| 3. SRS 명세 작성 | 1차 설계안, 비즈니스 룰 | 기능/비기능 요구사항, 리스크 분석 | SRS v1, MoSCoW 백로그 |
| 4. 보안 & NFR | SRS v1, 아키텍처 후보 | 위협모델링, 성능예산, 확장성 설계 | 보안 설계 문서, NFR 스펙 |
| 5. UI/UX 화면 | SRS v1, 페르소나 | IA 설계, 와이어프레임, 컴포넌트 | 화면흐름도, 디자인 시스템 |
| 6. AI 자료 정리 | NFR 스펙, UI/UX 디자인 | AI 컨텍스트 패키징, API 스펙 정리 | AI 브리프, 데이터 계약서 |
| 7. TDD 계획 | AI 브리프, 기능 요구사항 | 테스트 전략 수립, Gherkin AC 작성 | 테스트 계획, 스펙/피처 파일 |
| 8. 환경 세팅 | 아키텍처, 툴 스택 옵션 | 레포 초기화, CI/CD 스캐폴딩 | 부트스트랩 레포, CI 인프라 |
| 9. 바이브 코딩 | 테스트 케이스, AI 브리프 | 프롬프트 루프, AI 페어 프로그래밍 | 기능 증분, 스니펫, PR 리뷰 |
| 10. 반복 & 튜닝 | 기능 증분, 실행 결과 | 프롬프트 최적화, 배치 단위 개발 | Prompt 라이브러리, 체인지로그 |
| 11. 개발 검증 | 통합 코드베이스, 테스트 스펙 | 정적분석(SAST), E2E/보안 테스트 | 테스트 리포트, 게이트 패스 증빙 |
| 12. 환경 구축 | 릴리스 후보(RC) 패키지 | IaC 구성, 릴리스/관측 전략 셋업 | 운영환경(Prod), 런북, 대시보드 |
| 13. 결과 보고서 | 배포 결과, KPI 모니터링 수치 | 성과 정리, API/아키텍처 문서화 | 완료 보고서, 릴리스 노트 |
| 14. 유지보수 | 운영 서비스, 사용자 로그 | 사용자 피드백 수집, 버그 핫픽스 | 피드백 대시보드, 백로그 갱신 |

---

## 추천 도구 스택 (검수 보강판)

| 영역 | 도구 |
|---|---|
| 기획/리서치 | Lean Canvas, Miro/FigJam, Google Trends, GA4/Mixpanel, Typeform, User Interviews |
| 설계/문서/UI | Figma, Storybook, diagrams.net, Notion/Confluence, OpenAPI/Swagger, v0 (UI 프로토타입) |
| AI 코딩/에이전트 | Cursor, GitHub Copilot, Claude Code, OpenAI Codex, Gemini Code Assist, Gemini CLI |
| 테스트/QA/보안 | Jest/Vitest, pytest, Playwright, Cypress, Pact, k6, SonarQube, OWASP ZAP, Snyk/Trivy |
| 배포/운영 | Docker, Kubernetes, Vercel, AWS/GCP/Azure, Terraform/OpenTofu, GitHub Actions, Argo CD |
| 모니터링/인시던트 | OpenTelemetry, Datadog, Sentry, Prometheus, Grafana, PagerDuty, Jira Service Management |

> 검수 메모: v0은 범용 코딩 에이전트가 아니라 UI/프론트엔드 프로토타이핑 성격이 강하므로 AI 코딩 칸에서 분리. Codex·Gemini 계열은 범용 AI 코딩/에이전트 도구로 보강.

---

## AI 바이브 코딩 장점 & 주의사항

| 장점 (Pros) | 주의사항 (Cons) |
|---|---|
| 개발 속도 10배 향상 | 코드 품질 검증 필수 (QA/테스트 누락 시 위험) |
| 진입장벽 대폭 낮춤 (비개발자도 로직 구현·수정 가능) | 보안 취약점 발생 위험 (Hallucination으로 인한 잘못된 코드 생성) |
| 빠른 프로토타이핑 / MVP 검증 | AI 의존성 증가 및 개발자 디버깅 역량 저하 |
| 반복적·단순 코드 자동화 | AI 생성 코드의 라이선스 및 저작권 이슈 |
| 최신 라이브러리·디자인 패턴 활용 | 비즈니스 개인정보 및 기밀 유출 위험 |
| 문서화(주석, README 등) 자동 생성 | 전체 시스템 아키텍처의 일관성 부족 |

## 전통적 개발 vs AI 바이브 코딩

| 항목 | 전통적 개발 | AI 바이브 코딩 | 우위 |
|---|---|---|---|
| 개발 속도 | 보통 | 매우 빠름 | AI |
| 초기 학습 곡선 | 가파름 | 완만함 | AI |
| 코드 품질 일관성 | 높음 (팀 컨벤션·룰 준수) | 검증 필요 (Hallucination) | 전통 |
| 프로토타이핑 | 느림 | 매우 빠름 | AI |
| 디버깅 난이도 | 보통 | 어려움 (블랙박스형 생성 코드) | 전통 |
| 보안/검증 부담 | 낮음 (사전 보안 설계 반영) | 높음 (취약점 검토 필수) | 전통 |
| 비용 효율성 | 높은 인건비·시간 소요 | 저비용 빠른 산출 | AI |
| 팀 구성 | 다수의 시니어/주니어 분업 필요 | 소수 정예 + AI (1인 다역 가능) | AI |

> 결론: 속도와 진입장벽은 AI 우세, 안정성과 일관성은 전통 우세 → **하이브리드(People + AI + Process) 접근이 최적**

---

## 성공을 위한 Best Practices

1. **Plan First, Code Later (계획 우선)** — 바이브 코딩 전 명확한 아키텍처와 요구사항 설계가 필수
2. **AI는 도구, 판단은 사람 (Human-in-the-loop)** — 최종 검토와 기술적 의사결정은 항상 개발자가 주도
3. **작은 단위로 반복 (Small Iterations)** — 한 번에 큰 기능을 요청하지 말고, 작은 단위로 쪼개어 검증
4. **테스트가 곧 명세 (TDD First)** — 테스트 코드를 먼저 작성하여 AI가 목표로 삼을 명확한 기준을 제시
5. **ADR로 결정 기록 (Document Decisions)** — AI와의 문맥 공유를 위해 주요 아키텍처 결정을 문서로 남김
6. **보안은 시작부터 (Shift-Left Security)** — 설계 단계부터 취약점을 점검하고, 프롬프트에 제약사항 포함
7. **회고와 측정 (Retrospective + Metrics)** — 품질 지표와 리드타임을 측정하여 AI 프롬프트와 프로세스를 개선

## Common Pitfalls Top 5

| # | 실수 | 해결 |
|---|---|---|
| 1 | AI에게 통째로 맡기기 | 작업을 작게 쪼개고 단계별 검증 |
| 2 | 프롬프트에 컨텍스트 부족 | CLEAR 프레임워크 + 기존 코드 컨벤션 명시 |
| 3 | 테스트 없이 다음 기능으로 | TDD + CI 자동화 게이트 도입 |
| 4 | 보안/성능 검증 생략 | 정적분석 + SAST를 PR 필수 단계로 추가 |
| 5 | 코드 리뷰 패스 | AI 생성 코드도 휴먼 리뷰 의무화 |

---

## 케이스 스터디 — To-Do SaaS MVP

- **[P1]** 목적/1차설계: 개인용 할일 관리 MVP 정의 / SRS: 기본 CRUD 및 인증 요건 문서화
- **[P2]** 보안/UI: Supabase RLS 규칙, Figma 화면 / AI·TDD 준비: API 스펙 브리프, Jest 케이스 / 환경: Next.js + Cursor IDE 스캐폴딩
- **[P3]** 바이브 코딩: 컴포넌트 15개 2일만에 생성 / 반복·튜닝: 상태관리 버그 프롬프트로 해결 / QA: Cypress E2E 100% 통과
- **[P4]** 배포: Vercel 원클릭 / 보고·유지보수: 사용자 피드백 백로그 등록 (v1.1)

**결과**: 개발 기간 70% 단축 | 테스트 커버리지 85% | P0 버그 0건 (2주 완료, 전통 방식 예상 6주)

---

# v2 보강 부록 — Gate, Security, AI Governance, Ops

> 원본 33페이지는 그대로 유지하고, 실제 팀 적용에 필요한 판정 기준과 증빙 체계를 추가.
> 각 단계의 산출물을 **Owner / Entry Criteria / Exit Criteria / Evidence / Approver / Metric**으로 닫는 것이 핵심.
> 적용 원칙: **Plan First, Code with AI, Verify Always + Evidence Before Approval**
> — 모든 AI 산출물은 테스트, 보안 검증, 휴먼 리뷰, 릴리스 승인 증빙 없이는 운영 배포하지 않는다.

## Gate 강화 기준

G1/G2/G3를 "이름 있는 마일스톤"에서 **"증빙 기반 승인 절차"**로 전환.

| Gate | 위치 | 필수 증빙 | 승인 기준 |
|---|---|---|---|
| **G1 Requirements Freeze** | Step 03 이후 | PRD/SRS, AC, RTM, 리스크 레지스터, 개인정보/규제 체크, 변경관리 규칙 | 핵심 요구사항 모호성 제거, 테스트 가능성 확보, 이해관계자 승인 |
| **G2 Design Readiness** | Step 08 이후 | C4, ADR, 데이터 모델, API 계약, 위협모델, NFR 시나리오, CI Green | 개발 착수 전 구조/보안/테스트/환경 준비 완료 |
| **AI Governance Gate** | Step 09 전 | 승인 모델/도구 목록, 입력 금지정보, 프롬프트 로그 정책, AI 리뷰 체크리스트 | 민감정보 유출 및 무검증 AI 코드 반입 방지 |
| **G3 Release Approval** | Step 11 이후 | P0/P1 0건, 테스트 리포트, SAST/DAST/SCA, SBOM, 성능/접근성, UAT | 운영 배포 가능한 품질·보안·성능 기준 충족 |
| **Operational Readiness** | Step 12 전후 | 런북, 알람, 온콜, 백업/복구 테스트, 마이그레이션/롤백, Feature Flag | 장애 대응과 되돌리기 경로가 실제로 검증됨 |

## 각 Step 실행 템플릿

모든 단계에 동일한 운영 필드를 추가해 누락과 해석 차이를 줄임.

**Step Template**
- Owner: 산출물 작성 책임자
- Reviewer: 기술/보안/제품 검토자
- Approver: 다음 단계 진입 승인자
- Entry Criteria: 시작 전 필요한 입력물
- Exit Criteria: 단계 완료 조건
- Required Evidence: 저장해야 할 증빙 링크/파일
- Metric: 단계 성공을 측정할 수치
- Rollback/Change Rule: 변경 발생 시 되돌림/재승인 규칙

**예시: Step 11 개발 검증**
- Owner: Tech Lead / QA Lead
- Entry: RC 빌드, 테스트 스펙, 위협모델, 릴리스 노트 초안
- Exit: P0/P1 0건, 필수 테스트 통과, 보안 임계치 통과
- Evidence: CI URL, 커버리지, SAST/DAST/SCA 결과, ZAP 리포트
- Approver: Product Owner + Security Reviewer + Tech Lead
- Metric: defect density, coverage, p95 latency, vulnerability threshold

## 보안 보강 체크리스트

| 영역 | 필수 점검 항목 | 권장 증빙 |
|---|---|---|
| AI 특화 보안 | prompt injection, tool misuse, 코드/시크릿 유출 abuse case 테스트 | AI threat model, red-team prompt 결과 |
| 공급망 보안 | SCA, SBOM, lockfile 고정, typosquatting, 라이선스, 컨테이너 이미지 스캔 | Snyk/Dependabot/Trivy/CycloneDX 리포트 |
| 인증/인가 | 역할/권한 매트릭스, 테넌트 격리, RLS 테스트, JWT/session 만료·회전, MFA 기준 | AuthZ 테스트 결과, RLS 정책 테스트 |
| API/Input | schema validation, XSS, SQLi/NoSQLi, SSRF, CSRF, CORS, file upload, rate limit | E2E/DAST/API 보안 테스트 결과 |
| Secrets/Data | secrets scan, KMS/키 회전, 암호화, 개인정보 마스킹, 보존/삭제 정책 | secret scan 결과, 데이터 분류표 |
| 운영 보안 | 감사 로그, 보안 이벤트 알림, 침해 대응 런북, 패치 SLA, 백업 복구 훈련 | IR runbook, 복구 리허설 기록 |

## AI 사용 정책

AI Vibe Coding의 속도는 유지하되 **입력 · 도구 · 산출물** 경계를 명확히 함.

**입력 통제**
- 개인정보, 고객 데이터, 비밀키, 계약서, 미공개 재무정보 입력 금지
- 필요 시 샘플/마스킹 데이터만 사용
- 프롬프트 로그 보관 범위와 삭제 주기 명시
- 외부 모델 전송 가능 데이터 등급 정의

**도구 통제**
- 승인된 모델, IDE, MCP/플러그인, CLI 목록 관리
- 파일 쓰기, 네트워크, 배포, 결제 등 외부 영향 작업은 승인 필요
- 에이전트 작업 로그와 변경 파일 추적
- AI 도구별 데이터 보존/학습 사용 정책 확인

**산출물 통제**
- AI 생성 코드는 휴먼 리뷰 필수
- 라이선스/SBOM/SCA 통과 전 병합 금지
- 중요 로직은 테스트와 ADR로 근거 기록
- 보안·성능 제약은 프롬프트와 PR 템플릿 모두에 반영

## 요구사항 추적성 매트릭스 (RTM)

요구사항이 테스트와 릴리스 증빙까지 끊기지 않도록 연결.

| Req ID | 요구사항/AC | 테스트 | PR/Commit | 릴리스 증빙 |
|---|---|---|---|---|
| REQ-AUTH-001 | 사용자는 이메일/OAuth로 로그인할 수 있다. 실패/잠금/만료 케이스 포함 | unit: auth service, e2e: login flow, security: brute force | PR-123, commit abc123 | CI green, UAT sign-off, release note |
| REQ-AUTHZ-002 | 사용자는 본인 리소스만 조회/수정할 수 있다 | RLS/AuthZ matrix, tenant isolation test | PR-127 | 권한 테스트 리포트, DAST 결과 |
| NFR-PERF-001 | 주요 API p95 latency 300ms 이하 | k6 load test, APM baseline | PR-140 | 성능 리포트, SLO 대시보드 |
| SEC-DATA-001 | 개인정보는 저장/전송 시 암호화하고 로그에 남기지 않는다 | secret scan, log inspection, data masking test | PR-145 | 보안 리뷰 승인, 데이터 분류표 |

> **운영 규칙**: 새 요구사항이나 AC가 추가되면 테스트 ID와 릴리스 증빙이 함께 추가되어야 한다. 추적 링크가 없는 요구사항은 G3 Release Approval을 통과할 수 없다.

## 운영 준비도 보강

배포 자동화뿐 아니라 장애 대응과 복구 가능성을 검증.

| 영역 | Ready 기준 | 증빙 |
|---|---|---|
| 배포/롤백 | Blue-Green/Canary/Rolling 전략, 즉시 롤백 절차, Feature Flag 준비 | 배포 리허설, 롤백 리허설 기록 |
| 데이터 변경 | DB migration/rollback, 백필 전략, 데이터 정합성 검증 | 마이그레이션 계획서, dry-run 결과 |
| 관측성 | Logs/Metrics/Traces, SLO/SLI, 알람 임계치, 대시보드 | Grafana/Datadog/Sentry 링크 |
| 인시던트 대응 | 등급 체계, 온콜, 에스컬레이션, 커뮤니케이션 템플릿 | IR runbook, 모의훈련 기록 |
| 복구/연속성 | backup/restore, DR, RPO/RTO, 키 회전, 비상 권한 회수 | 복구 테스트 결과, 접근권한 점검표 |

## 적용 로드맵

**1주차: 기준 확정**
- G1/G2/G3 체크리스트 확정
- Step 템플릿에 Owner/Approver 추가
- AI 입력 금지정보와 승인 도구 목록 공지
- PR 템플릿에 테스트/보안 증빙 필드 추가

**2-3주차: 자동화**
- SAST/SCA/secrets scan CI 필수화
- SBOM 생성과 라이선스 검증 추가
- RTM 표준 양식 도입
- 릴리스 체크리스트와 롤백 템플릿 적용

**4주차 이후: 운영화**
- Operational Readiness Review 정례화
- 백업/복구 및 롤백 리허설 수행
- 보안 이벤트 알림과 패치 SLA 운영
- 회고에서 defect density, lead time, SLO를 개선 지표로 사용

> **v2 결론**: 빠른 AI 개발 흐름은 유지하되, 승인 게이트는 반드시 증빙 기반으로 닫는다.

---

## 결론 & 핵심 메시지

### Plan First, Code with AI, Verify Always

| Plan First | Code with AI | Verify Always |
|---|---|---|
| 명확한 계획과 SRS 없이 무작정 코드 작성을 시작하지 않는다 | AI는 강력한 페어 프로그래머일 뿐, 시스템의 최종 자율 의사결정자가 아니다 | 모든 AI 산출물은 철저한 테스트, 휴먼 리뷰, 보안 검증을 반드시 거쳐야 한다 |

| 개발 속도 | 진입장벽 | 품질 검증 필수도 |
|---|---|---|
| 10x ↑ | 70% ↓ | 100% |

> "AI 바이브 코딩은 도구일 뿐, 소프트웨어 공학의 원칙은 변하지 않습니다."
