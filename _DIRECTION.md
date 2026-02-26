# FYRST -- 프로젝트 방향성

## 핵심 컨셉 (1줄)
최초의 책임있는 토큰 런치패드. 배포자 담보 의무화 + 크로스월렛 평판 추적 + 러그 시 자동 환불.

## 캐릭터/정체성
- 마스코트: Sentry (강철빛 도베르만), $FYRST 태그 목걸이, 블루 발광 눈
- 컬러: 스틸 블루(#2563EB) + 앰버 골드(#D97706), 차콜 네이비(#0F172A) 배경
- 톤: Fortified, Institutional, Metallic, Blueprint
- 참조: Coinbase(신뢰), 1Password(금고/보안), Linear(미니멀 다크)

## 현재 진행 상태
- 진행중: Phase 1 (프로젝트 구조 + 기본 세팅)
- 대기: Phase 2 (캐릭터/이미지), Phase 3 (백엔드), Phase 4 (프론트), Phase 5~10

## 기술 결정사항
- 프론트: Next.js 15 (App Router) + Tailwind CSS v4 + Three.js/R3F + zustand + Solana Wallet Adapter
- 백엔드: Node.js + Express + TypeScript + Socket.io + BullMQ
- DB: PostgreSQL (Railway addon)
- 캐시: Redis (Railway addon)
- 온체인: Anchor (Rust) + Metaplex + SPL Token/Token-2022
- 외부 API: Helius DAS API, QuickNode (Geyser WebSocket), Jupiter (가격), Jito (번들 TX)
- 배포: Vercel (프론트) + Railway (백엔드 + DB + Redis)
- 도메인: fyrst.fun 시도, 불가시 fyrst.xyz / fyrst.so
- 차트: Lightweight Charts (TradingView)

## 1차 후킹 (중간 임팩트)
웹 대시보드 -- 활성 런칭 브라우징, 배포자 평판 조회, 토큰 안전도 스캔

## 2차 후킹 (최대 임팩트 -- 클라이맥스)
실제 토큰 런치패드 앱 -- 에스크로 담보 런칭, 본딩커브 거래, 자동 환불 메커니즘

## 절대 변경 금지 사항
- 배포자 담보 의무화 (에스크로 최소 1 SOL)
- Deployer Reputation Score (A~F 등급)
- 24시간 안전 기간 내 러그 시 자동 환불
- pump.fun 호환 bonding curve UX
- $FYRST 토큰 티어 시스템 (Free/Basic/Pro/Elite/Whale)

## 다음 할 일
- Phase 1: Next.js 프론트 초기화 + Node.js 백엔드 초기화 + Git 설정
