# FYRST -- 프로젝트 방향성

## 핵심 컨셉 (1줄)
최초의 책임있는 토큰 런치패드. 배포자 담보 의무화 + 크로스월렛 평판 추적 + 러그 시 자동 환불.

## 캐릭터/정체성
- 마스코트: Sentry (강철빛 도베르만), $FYRST 태그 목걸이, 블루 발광 눈
- 컬러: 스틸 블루(#2563EB) + 앰버 골드(#D97706), 차콜 네이비(#0F172A) 배경
- 톤: Fortified, Institutional, Metallic, Blueprint
- 참조: Coinbase(신뢰), 1Password(금고/보안), Linear(미니멀 다크)

## 현재 진행 상태
- 완료: Phase 1 (프로젝트 구조) -- commit 639b3b4
- 완료: Phase 2 (캐릭터/이미지) -- 20개 브랜드 이미지, 파비콘, OG 이미지
- 완료: Phase 3 (백엔드 API) -- Prisma 5테이블, 8개 라우트, 4개 핵심 서비스
- 완료: Phase 4 (프론트엔드) -- 랜딩 + 5개 페이지, UI 컴포넌트, 반응형
- 완료: Phase 5 (DB) -- PostgreSQL + Prisma 스키마, 인덱스 최적화
- 완료: Phase 6 (외부 API) -- Helius, Jupiter, Solana RPC, Telegram 연동
- 완료: Phase 9 (배포 설정) -- Vercel/Railway config, CI/CD pipeline
- 완료: Phase 10 (마케팅) -- EN/KR 카피, 운영가이드, 위기 대응
- 미해결: Anchor 빌드 (Rust 툴체인 호환성)
- 대기: 실제 배포 (GitHub 리포 + 도메인 필요)

## 기술 결정사항
- 프론트: Next.js 15.5.12 (App Router) + Tailwind CSS v4 + zustand + Solana Wallet Adapter
- 백엔드: Node.js + Express + TypeScript + Socket.io + BullMQ
- DB: PostgreSQL (Prisma ORM) + Redis 캐시
- 온체인: Anchor (Rust) + SPL Token
- 외부 API: Helius DAS, Jupiter Price, Solana RPC (QuickNode), Telegram Bot
- 배포: Vercel (프론트) + Railway (백엔드 + DB + Redis)
- CI/CD: GitHub Actions (lint + build)
- 도메인: fyrst.fun

## 절대 변경 금지 사항
- 배포자 담보 의무화 (에스크로 최소 1 SOL)
- Deployer Reputation Score (A~F 등급)
- 24시간 안전 기간 내 러그 시 자동 환불
- pump.fun 호환 bonding curve UX
- $FYRST 토큰 티어 시스템 (Free/Basic/Pro/Elite/Whale)

## 다음 할 일 (수동 작업)
1. GitHub PAT 토큰으로 gh auth login
2. Cryptottat 계정에 fyrst 리포 생성 + push
3. Vercel/Railway에 연결 + 환경변수 설정
4. fyrst.fun 도메인 구매 + DNS 연결
5. Anchor 빌드 문제 해결 (anchor-cli 업그레이드 or 툴체인 조정)
