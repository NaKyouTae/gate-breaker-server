# Gate Breaker - 기술 스택 문서

## 1. 기술 스택 요약

```
Next.js (Frontend)
       │
       │ REST API / WebSocket
       │
NestJS (Backend)
       │
       ├── PostgreSQL (메인 DB)
       └── Redis (캐시)
```

## 2. Frontend

| 기술 | 버전 | 역할 | 선택 이유 |
|------|------|------|-----------|
| **Next.js** | 14+ | 웹 앱 프레임워크 | SSR/SSG, App Router, Vercel 배포 최적화 |
| **TypeScript** | 5+ | 타입 시스템 | 게임 아이템/스탯 등 복잡한 데이터 구조 안정성 |
| **TailwindCSS** | 3+ | 스타일링 | 빠른 UI 개발, 반응형 쉬움 |
| **Zustand** | 4+ | 클라이언트 상태 | 전투 상태, 인벤토리 UI 상태 관리 (가벼움) |
| **TanStack Query** | 5+ | 서버 상태 | API 캐싱, 낙관적 업데이트, 자동 리페치 |
| **Framer Motion** | 10+ | UI 애니메이션 | 아이템 드랍 이펙트, 강화 연출, 화면 전환 |
| **Phaser** | 3+ | 전투 연출 (2단계) | 2D 게임 엔진, 스프라이트 전투 |
| **Socket.io Client** | 4+ | 실시간 통신 | 전투 이벤트, 실시간 알림 |

### 역할 분리

- **UI 애니메이션** → Framer Motion (화면 전환, 아이템 이펙트, 강화 연출)
- **전투 연출** → Phaser (2D 전투 씬, 스프라이트 애니메이션) - 2단계 이후
- **전투 로직** → 서버 (NestJS)에서 처리, 클라이언트는 결과만 표시

## 3. Backend

| 기술 | 버전 | 역할 | 선택 이유 |
|------|------|------|-----------|
| **NestJS** | 10+ | API 서버 | 모듈 구조, TypeScript 네이티브, 낮은 메모리 사용 |
| **Socket.io** | 4+ | 실시간 통신 | 전투 실시간 이벤트, 알림, WebSocket 구조 좋음 |
| **Prisma** | 5+ | ORM | 타입 안전 쿼리, 자동 마이그레이션, 직관적 스키마 |
| **JWT** | - | 인증 | 무상태 인증, Access + Refresh Token |
| **class-validator** | - | 요청 검증 | DTO 기반 데이터 검증 |
| **class-transformer** | - | 데이터 변환 | 직렬화/역직렬화 |

### NestJS 선택 이유

- 메모리 사용량 낮음 (Render 무료 티어에서 운영 가능)
- TypeScript 네이티브 지원
- 모듈 기반 구조로 게임 시스템별 분리 용이
- WebSocket (Socket.io) 통합 쉬움
- Guard, Interceptor 등 게임 로직에 유용한 패턴

## 4. Database

| 기술 | 역할 | 선택 이유 |
|------|------|-----------|
| **PostgreSQL** | 메인 DB | 관계형 데이터 (유저-아이템-인벤토리), JSON 지원 |
| **Redis** | 캐시 | 인메모리 고속 처리 |

### Redis 사용 용도

| 용도 | 설명 |
|------|------|
| 전투 상태 | 진행 중인 전투 데이터 임시 저장 |
| 던전 쿨타임 | 던전 입장 쿨타임 관리 |
| 랭킹 | Sorted Set으로 실시간 랭킹 |
| 세션 캐시 | 자주 조회되는 유저 정보 캐싱 |
| Rate Limiting | API 요청 제한 (어뷰징 방지) |

## 5. Infrastructure & 배포

| 서비스 | 역할 | 요금제 | 비용 |
|--------|------|--------|------|
| **Vercel** | Frontend 배포 | Hobby | 무료 |
| **Render** | Backend 배포 | Free / Starter | 무료 ~ $7/월 |
| **Supabase** | PostgreSQL | Free | 무료 (500MB) |
| **Upstash** | Redis | Free | 무료 (10K req/day) |

### 월 예상 비용

| 단계 | 비용 |
|------|------|
| MVP (개발/테스트) | **$0** |
| 베타 (소규모 유저) | **$0 ~ $7** |
| 정식 (유저 증가 시) | **$20 ~ $50** |

## 6. API 설계

### 인증

```
POST   /auth/register          회원가입
POST   /auth/login             로그인
POST   /auth/refresh           토큰 갱신
POST   /auth/logout            로그아웃
```

### 유저

```
GET    /user/me                내 정보
PATCH  /user/me                정보 수정
GET    /user/me/stats          전체 스탯 (장비 포함)
```

### 인벤토리

```
GET    /inventory              인벤토리 조회
POST   /inventory/equip        장비 장착
POST   /inventory/unequip      장비 해제
POST   /inventory/sell         아이템 판매
DELETE /inventory/:id          아이템 버리기
```

### 던전

```
GET    /dungeon                던전 목록
GET    /dungeon/:id            던전 상세 (몬스터, 보상 정보)
POST   /dungeon/:id/enter      던전 입장
```

### 전투

```
POST   /battle/attack           일반 공격
POST   /battle/skill            스킬 사용
POST   /battle/item             아이템 사용
POST   /battle/escape           도망
GET    /battle/status           현재 전투 상태
```

### 강화

```
POST   /enhance                장비 강화
GET    /enhance/info/:id       강화 정보 (확률, 비용)
```

### 상점

```
GET    /shop                   상점 아이템 목록
POST   /shop/buy               아이템 구매
```

### 랭킹 (향후)

```
GET    /ranking/level          레벨 랭킹
GET    /ranking/power          전투력 랭킹
```

## 7. 프로젝트 구조

### Frontend (gate-breaker-web)

```
gate-breaker-web/
├── public/
│   └── assets/              # 이미지, 아이콘
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx         # 랜딩
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   └── (game)/
│   │       ├── layout.tsx   # 게임 레이아웃
│   │       ├── main/        # 메인 화면
│   │       ├── inventory/   # 인벤토리
│   │       ├── dungeon/     # 던전 목록
│   │       ├── battle/      # 전투 화면
│   │       ├── enhance/     # 강화
│   │       └── shop/        # 상점
│   ├── components/
│   │   ├── ui/              # 공통 UI (Button, Card, Modal)
│   │   ├── battle/          # 전투 관련 컴포넌트
│   │   ├── inventory/       # 인벤토리 관련
│   │   └── dungeon/         # 던전 관련
│   ├── stores/              # Zustand 스토어
│   │   ├── useBattleStore.ts
│   │   └── useUIStore.ts
│   ├── hooks/               # React Query 훅
│   │   ├── useUser.ts
│   │   ├── useInventory.ts
│   │   ├── useDungeon.ts
│   │   └── useBattle.ts
│   ├── lib/
│   │   ├── api.ts           # Axios 인스턴스
│   │   └── socket.ts        # Socket.io 클라이언트
│   └── types/
│       ├── user.ts
│       ├── item.ts
│       ├── dungeon.ts
│       └── battle.ts
├── tailwind.config.ts
├── next.config.js
├── tsconfig.json
└── package.json
```

### Backend (gate-breaker-server)

```
gate-breaker-server/
├── prisma/
│   ├── schema.prisma        # DB 스키마
│   ├── seed.ts              # 시드 데이터
│   └── migrations/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   └── dto/
│   ├── user/
│   │   ├── user.module.ts
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   └── dto/
│   ├── inventory/
│   │   ├── inventory.module.ts
│   │   ├── inventory.controller.ts
│   │   ├── inventory.service.ts
│   │   └── dto/
│   ├── dungeon/
│   │   ├── dungeon.module.ts
│   │   ├── dungeon.controller.ts
│   │   ├── dungeon.service.ts
│   │   └── dto/
│   ├── battle/
│   │   ├── battle.module.ts
│   │   ├── battle.controller.ts
│   │   ├── battle.service.ts
│   │   ├── battle.gateway.ts   # WebSocket
│   │   ├── battle.engine.ts    # 전투 로직
│   │   └── dto/
│   ├── enhance/
│   │   ├── enhance.module.ts
│   │   ├── enhance.controller.ts
│   │   ├── enhance.service.ts
│   │   └── dto/
│   ├── shop/
│   │   ├── shop.module.ts
│   │   ├── shop.controller.ts
│   │   ├── shop.service.ts
│   │   └── dto/
│   ├── common/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── filters/
│   │   └── decorators/
│   └── prisma/
│       ├── prisma.module.ts
│       └── prisma.service.ts
├── test/
├── nest-cli.json
├── tsconfig.json
└── package.json
```

## 8. 핵심 패키지

### Frontend

```json
{
  "dependencies": {
    "next": "^14",
    "react": "^18",
    "typescript": "^5",
    "tailwindcss": "^3",
    "zustand": "^4",
    "@tanstack/react-query": "^5",
    "framer-motion": "^10",
    "axios": "^1",
    "socket.io-client": "^4"
  }
}
```

### Backend

```json
{
  "dependencies": {
    "@nestjs/core": "^10",
    "@nestjs/platform-express": "^10",
    "@nestjs/websockets": "^10",
    "@nestjs/platform-socket.io": "^10",
    "@nestjs/jwt": "^10",
    "@nestjs/passport": "^10",
    "@prisma/client": "^5",
    "class-validator": "^0.14",
    "class-transformer": "^0.5",
    "bcrypt": "^5",
    "ioredis": "^5"
  }
}
```

## 9. 개발 환경 설정

### 필수 도구

| 도구 | 용도 |
|------|------|
| Node.js 18+ | 런타임 |
| pnpm | 패키지 매니저 |
| Docker | 로컬 DB (PostgreSQL, Redis) |
| VSCode | 에디터 |

### 로컬 개발 환경

```bash
# Frontend
cd gate-breaker-web
pnpm install
pnpm dev          # http://localhost:3000

# Backend
cd gate-breaker-server
pnpm install
docker-compose up -d    # PostgreSQL + Redis
pnpm prisma migrate dev
pnpm prisma db seed
pnpm start:dev          # http://localhost:4000
```

### 환경 변수

```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000

# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/gatebreaker
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

## 10. 개발 전략

### 1단계: 텍스트 RPG (MVP)

- 채팅형 텍스트 기반 전투
- 기본 CRUD (인벤토리, 던전, 강화)
- JWT 인증
- Tailwind 기본 UI

### 2단계: UI 개선

- Framer Motion 애니메이션 추가
- 아이템 드랍 이펙트
- 강화 성공/실패 연출
- 반응형 모바일 UI

### 3단계: Phaser 전투

- Phaser 3 통합
- 2D 스프라이트 전투 씬
- 몬스터/캐릭터 애니메이션
- 이펙트 (데미지, 회복)

### 4단계: 실시간 + 소셜

- Socket.io 실시간 전투
- 랭킹 시스템 (Redis Sorted Set)
- 길드 시스템
- PVP
