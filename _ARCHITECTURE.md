# FYRST -- 기술 아키텍처

## 전체 구조

```
fyrst/
  web/                    # Next.js 15 프론트엔드 (Vercel 배포)
  service/                # Node.js + Express API 서버 (Railway 배포)
  programs/               # Anchor 스마트 컨트랙트 (Solana)
  shared/                 # 공유 타입/상수
  github/                 # 퍼블릭 오픈소스 repo (별도 .git)
  산출물/                  # 마케팅 에셋
  new_project_guide/      # 빌드 가이드 (작업 후 삭제)
```

## 프론트엔드 (web/)

### 기술스택
- Next.js 15 (App Router, Turbopack)
- TypeScript (strict mode)
- Tailwind CSS v4
- Three.js + React Three Fiber v9 (3D 금고 히어로)
- zustand (상태 관리 -- 본딩커브 실시간 상태)
- @solana/wallet-adapter-react (지갑 연결)
- Lightweight Charts (TradingView -- 본딩커브 차트)
- framer-motion (마이크로 애니메이션)
- Socket.io-client (실시간 업데이트)

### 주요 페이지
- / -- 랜딩 (히어로 3D + Live Launches + How it Works + Why $FYRST)
- /launch -- 토큰 런칭 폼 (배포자용)
- /token/[mint] -- 토큰 상세 (바이어용 -- 차트, 안전지표, 매수/매도)
- /dashboard -- 포트폴리오 (내 포지션, 환불 이력)
- /deployer/[address] -- 배포자 프로필 (평판, 런칭 이력)

### 디자인 시스템
- 배경: #0F172A (차콜 네이비)
- 메인 강조: #2563EB (스틸 블루)
- 보조 강조: #D97706 (앰버 골드)
- 성공: #10B981 (에메랄드)
- 에러: #DC2626 (크림슨)
- 텍스트: #F8FAFC (밝) / #94A3B8 (중간)
- 텍스처: brushed metal, blueprint grid, subtle grain
- 커서: 금고 열쇠 모양

## 백엔드 (service/)

### 기술스택
- Node.js + Express + TypeScript
- Socket.io (실시간 런칭/가격)
- BullMQ (환불 처리 비동기 큐)
- PostgreSQL (Sequelize 또는 Prisma)
- Redis (캐시 + 큐 + 실시간 상태)
- @solana/web3.js (온체인 인터랙션)
- Helius SDK (DAS API)

### 주요 엔드포인트
- GET /health
- GET /api/launches -- 활성 런칭 목록
- GET /api/launches/:mint -- 토큰 상세
- POST /api/launches -- 토큰 런칭 (배포자)
- GET /api/deployer/:address -- 배포자 프로필 + 평판
- GET /api/deployer/:address/score -- Reputation Score
- POST /api/trade -- 매수/매도
- GET /api/portfolio/:wallet -- 포트폴리오
- GET /api/refunds/:wallet -- 환불 이력
- WS /realtime -- Socket.io (런칭 이벤트, 가격 업데이트)

### 환불 처리 플로우
1. Geyser WebSocket으로 유동성 제거 이벤트 감지
2. BullMQ에 환불 작업 enqueue
3. Worker가 구매자 목록 조회 + pro-rata 계산
4. Jito Bundle로 원자적 환불 TX 실행
5. DB 업데이트 + Socket.io 알림

## 온체인 (programs/)

### Anchor 프로그램
- Escrow Vault (배포자 담보 에스크로)
- Bonding Curve (pump.fun 호환 본딩커브)
- Refund Engine (자동 환불 분배)
- Token Launch (메타데이터 + 민트)

### PDA 구조
- escrow_vault: [deployer, token_mint, "escrow"]
- bonding_curve: [token_mint, "curve"]
- buyer_record: [buyer, token_mint, "record"]

## 외부 서비스 연동

| 서비스 | 용도 | 엔드포인트 |
|--------|------|-----------|
| Helius | DAS API, 지갑 히스토리 | mainnet.helius-rpc.com |
| QuickNode | RPC + Geyser WebSocket | flashy-autumn-gas.solana-mainnet.quiknode.pro |
| Jupiter | 가격 피드 | public.jupiterapi.com |
| Jito | 번들 TX (환불) | block-engine |
| Metaplex | 토큰 메타데이터 | SDK |

## 배포

### Vercel (프론트엔드)
- GitHub repo: Cryptottat/fyrst-web
- Root Directory: web/
- 환경변수: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL, NEXT_PUBLIC_SOLANA_RPC

### Railway (백엔드)
- GitHub repo: Cryptottat/fyrst-api
- Root Directory: service/
- Addons: PostgreSQL, Redis
- 환경변수: DATABASE_URL, REDIS_URL, HELIUS_API_KEY, 등

### 도메인
- 1순위: fyrst.fun
- 2순위: fyrst.xyz
- 3순위: fyrst.so
