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

## Phase 2: 캐릭터/이미지 -- COMPLETE (commit 0981237)
- [x] 마스코트 컨셉 이미지 생성 (fal.ai Flux Pro)
- [x] 텔레그램으로 유저에게 전송 (20 variants)
- [x] 로고(4), 트위터 프사(3)/배너(3), GitHub 배너(3), 커뮤니티 배너(3), 아티클 배너(4) 생성
- [x] 파비콘 (ICO + PNG 16/32/180px) 생성
- [x] OG 이미지 (1200x630 PNG) 생성
- [x] _CHARACTER.md 확정

## Phase 3: 백엔드 API -- COMPLETE (commit 0981237)
- [x] Express + TypeScript 서버 구조
- [x] CORS + 미들웨어
- [x] /api/launches 엔드포인트
- [x] /api/deployer/:address 엔드포인트
- [x] /api/trade 엔드포인트
- [x] /api/portfolio/:wallet 엔드포인트
- [x] Socket.io 실시간 이벤트
- [x] Deployer Reputation Score 계산 로직
- [x] 환불 큐 (BullMQ)

## Phase 4: 프론트엔드 -- COMPLETE (commit 0981237)
- [x] 랜딩 페이지 (히어로 + Live Launches + How it Works)
- [x] 토큰 런칭 페이지 (/launch)
- [x] 토큰 상세 페이지 (/token/[mint])
- [x] 대시보드 (/dashboard)
- [x] 배포자 프로필 (/deployer/[address])
- [x] UI 컴포넌트 (Button, Card, Badge, ProgressBar)
- [x] 반응형 대응

## Phase 5: 데이터베이스 + 캐시 -- COMPLETE (commit 0981237)
- [x] PostgreSQL 스키마 (deployers, tokens, trades, refunds, buyer_records)
- [x] Prisma ORM 설정
- [x] 인덱스 최적화 (token, deployer, trade 테이블)

## Phase 6: 외부 API 연동 -- COMPLETE
- [x] Helius DAS API (지갑 히스토리 + 토큰 메타데이터 + 러그풀 감지)
- [x] Jupiter API (가격 피드 + 배치 조회 + SOL 가격 캐시)
- [x] Solana RPC (잔액 조회 + 토큰 계정 + WebSocket 구독)
- [x] Telegram Bot (알림 전송 + 에러 리포트)
- [x] config.ts 환경변수 통합

## Phase 7: ML -- 건너뜀
(Reputation Score는 규칙 기반으로 충분. ML은 Phase 2 이후 고려)

## Phase 8: 추가 프로덕트 -- 건너뜀
(웹앱 자체가 핵심 프로덕트. 텔레그램 봇은 MVP 이후)

## Phase 9: 배포 설정 -- COMPLETE
- [x] Vercel 프론트엔드 설정 (vercel.json + 보안 헤더)
- [x] Railway 백엔드 설정 (railway.json + 헬스체크)
- [x] CI/CD 파이프라인 (.github/workflows/ci.yml)
- [x] 환경변수 구성 (.env.example 업데이트)
- [ ] GitHub 리포 생성 (PAT 토큰 필요)
- [ ] 도메인 구매 (fyrst.fun -- 수동 구매 필요)
- [ ] 실제 배포 실행 (GitHub 리포 생성 후)

## Phase 10: 마케팅 -- COMPLETE
- [x] 마케팅 카피 EN (marketing-copy-en.md)
- [x] 마케팅 카피 KR (marketing-copy-kr.md)
- [x] 운영가이드 (운영가이드.md)
- [x] 트위터 바이오 (3 variants)
- [x] pump.fun 디스크립션
- [x] 10-post 트위터 시퀀스
- [x] 커뮤니티 공지문
- [x] 위기 대응 가이드

## Anchor 온체인 프로그램
- [x] Escrow 명령어 (create/release)
- [x] Bonding curve 명령어 (init/buy/sell)
- [x] Refund 명령어 (record_buyer/process_refund)
- [ ] anchor build 통과 (Rust 툴체인 호환성 문제)

## 남은 수동 작업
- [ ] GitHub PAT 토큰으로 gh auth login
- [ ] Cryptottat 계정에 리포 생성 + push
- [ ] Vercel에 연결 + 환경변수 설정
- [ ] Railway에 연결 + PostgreSQL/Redis addon + 환경변수 설정
- [ ] fyrst.fun 도메인 구매 (Hostinger)
- [ ] 도메인 DNS 연결 (Vercel + Railway)
