# Gate Breaker - Repository & 이름 추천

## 게임 이름 추천

| 순위 | 이름 | 영문 | 설명 |
|------|------|------|------|
| 1 | **Gate Breaker** | Gate Breaker | 게이트를 부수는 자, 나혼렙 컨셉에 딱 맞음 |
| 2 | **던전 브레이커** | Dungeon Breaker | 직관적, 던전 파밍 게임임을 바로 알 수 있음 |
| 3 | **각성자** | Awakener | 나혼렙/S급 세계관 핵심 키워드 |
| 4 | **게이트 헌터** | Gate Hunter | 게이트 + 헌터 조합, 캐주얼한 느낌 |
| 5 | **레이드 마스터** | Raid Master | 레이드/던전 공략 중심 |
| 6 | **그림자 군주** | Shadow Monarch | 나혼렙 오마주, 다크 판타지 느낌 |
| 7 | **로어 브레이커** | Lore Breaker | 세계의 법칙을 깨는 자 |

### 추천 1순위: Gate Breaker

- 영문이라 글로벌 확장 가능
- 짧고 임팩트 있음
- 나혼렙 "게이트" 컨셉과 일치
- 도메인/SNS 이름 확보 용이

## Repository 이름 추천

### 옵션 1: 분리형 (추천)

| Repository | 설명 |
|------------|------|
| `gate-breaker-web` | Frontend (Next.js) |
| `gate-breaker-server` | Backend (NestJS) |

### 옵션 2: 모노레포

| Repository | 설명 |
|------------|------|
| `gate-breaker` | 전체 프로젝트 (apps/web, apps/server) |

### 모노레포 구조 예시

```
gate-breaker/
├── apps/
│   ├── web/            # Next.js Frontend
│   └── server/         # NestJS Backend
├── packages/
│   └── shared/         # 공유 타입, 상수
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### 추천: 분리형

- 각각 독립 배포 가능 (Vercel / Render)
- 관심사 분리 명확
- 초기 셋업 간단
- 나중에 모노레포 전환 가능

## GitHub Organization

### 옵션 A: 개인 계정

```
github.com/kevin/gate-breaker-web
github.com/kevin/gate-breaker-server
```

### 옵션 B: Organization 생성

```
github.com/gate-breaker/web
github.com/gate-breaker/server
```

게임이 커지면 Organization으로 전환 추천
