# FYRST -- TODO

## Phase 1: 프로젝트 구조 + 기본 세팅 -- COMPLETE (commit 639b3b4)
- [x] Next.js 15 프론트엔드 초기화 (web/)
- [x] Node.js + Express + TypeScript 백엔드 초기화 (service/)
- [x] .gitignore, .env.example 생성
- [x] Tailwind v4 설정 (FYRST 컬러 팔레트)
- [x] TypeScript strict mode
- [x] ESLint + Prettier 설정
- [x] 폴더 구조 생성
- [x] Git 초기화 + 첫 커밋
- [x] _DIRECTION.md, _ARCHITECTURE.md, _CHARACTER.md 작성

## Phase 2: 캐릭터/이미지 -- COMPLETE
- [x] 마스코트 컨셉 이미지 생성 (fal.ai Flux Pro)
- [x] 텔레그램으로 유저에게 전송 (20 variants)
- [x] 로고(4), 트위터 프사(3)/배너(3), GitHub 배너(3), 커뮤니티 배너(3), 아티클 배너(4) 생성
- [x] 파비콘 (ICO + PNG 16/32/180px) 생성
- [x] OG 이미지 (1200x630 PNG) 생성
- [x] _CHARACTER.md 확정

## Phase 3: 백엔드 API
- [ ] Express + TypeScript 서버 구조
- [ ] CORS + 미들웨어
- [ ] /api/launches 엔드포인트
- [ ] /api/deployer/:address 엔드포인트
- [ ] /api/trade 엔드포인트
- [ ] /api/portfolio/:wallet 엔드포인트
- [ ] Socket.io 실시간 이벤트
- [ ] Deployer Reputation Score 계산 로직
- [ ] 환불 큐 (BullMQ)

## Phase 4: 프론트엔드
- [ ] 랜딩 페이지 (히어로 3D + Live Launches + How it Works)
- [ ] 토큰 런칭 페이지 (/launch)
- [ ] 토큰 상세 페이지 (/token/[mint])
- [ ] 대시보드 (/dashboard)
- [ ] 배포자 프로필 (/deployer/[address])
- [ ] Three.js 금고 히어로 씬
- [ ] Solana Wallet Adapter 연결
- [ ] Lightweight Charts 본딩커브 차트
- [ ] 반응형 대응

## Phase 5: 데이터베이스 + 캐시
- [ ] PostgreSQL 스키마 (deployers, tokens, trades, refunds)
- [ ] Prisma ORM 설정
- [ ] Redis 캐시 레이어 (본딩커브 상태, 가격)
- [ ] 인덱스 최적화

## Phase 6: 외부 API 연동
- [ ] Helius DAS API (지갑 히스토리)
- [ ] QuickNode Geyser WebSocket (유동성 이벤트 감지)
- [ ] Jupiter API (가격 피드)
- [ ] Jito Bundle (환불 TX)
- [ ] Metaplex (토큰 메타데이터)

## Phase 7: ML -- 건너뜀
(Reputation Score는 규칙 기반으로 충분. ML은 Phase 2 이후 고려)

## Phase 8: 추가 프로덕트 -- 건너뜀
(웹앱 자체가 핵심 프로덕트. 텔레그램 봇은 MVP 이후)

## Phase 9: 배포
- [ ] Vercel 프론트엔드 배포
- [ ] Railway 백엔드 배포 (PostgreSQL + Redis addon)
- [ ] 도메인 구매 (fyrst.fun)
- [ ] 도메인 연결 + SSL
- [ ] 환경변수 설정 (프로덕션)
- [ ] Health check 동작 확인

## Phase 10: 마케팅
- [ ] 마케팅 이미지 생성
- [ ] 포스팅 카피 (EN/KR)
- [ ] pump.fun 디스크립션
- [ ] 트위터 바이오
- [ ] 운영가이드.md 생성
