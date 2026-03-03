# FYRST 프로젝트 현황 보고서

**작성일:** 2026-02-28
**상태:** 실시간 WebSocket 연동 완료 + 프로덕션 배포 확인

---

## 1. 프로젝트 한 줄 요약

pump.fun에 보험을 붙인 솔라나 토큰 런치패드.
배포자 담보 의무화 + 크로스월렛 평판 추적 + 러그 시 자동 환불.

---

## 2. 현재 상태

### 돌아가는 것

| 항목 | 상태 | 비고 |
|------|------|------|
| 랜딩 페이지 (/) | 작동 | 아케이드 테마, Buster 마스코트, ScrambleText |
| 대시보드 (/dashboard) | 작동 | 실시간 가격/mcap 변동 + 변동% flash (초록/빨강) |
| 토큰 상세 (/token/[mint]) | 작동 | 실시간 캔들차트 + 라이브 통계 + 매수/매도 |
| 배포자 프로필 (/deployer/[address]) | 작동 | 평판 게이지, 런치 히스토리 |
| 런치 페이지 (/launch) | 작동 | 지갑 연결 → 토큰 생성 → API 기록 + 이미지 리사이즈 |
| 포트폴리오 (/portfolio) | 작동 | 지갑 연결 필요, 빈 상태 표시 |
| 백엔드 API (port 8000) | 작동 | 프로덕션 Railway 배포됨 (PostgreSQL 연결) |
| 지갑 연결 | 작동 | Phantom, Solflare, Coinbase 지원 |
| **실시간 WebSocket** | **작동** | Socket.io — 라이브 가격, 매매, 신규 토큰 이벤트 |
| **실시간 대시보드** | **작동** | 다른 유저 매매 시 가격/mcap 즉시 갱신 |
| **실시간 차트** | **작동** | room 기반 — 토큰별 매매 이벤트만 수신, 캔들 증분 업데이트 |
| **멀티탭 동기화** | **작동** | 같은 토큰 여러 탭 → 전부 실시간 갱신 |
| **WS 연결 상태** | **작동** | 헤더 FYRST 옆 초록 dot(연결)/빨강 dot(끊김) |
| **이미지 업로드** | **작동** | 3.5MB 제한 + 512x512 자동 리사이즈 (JPEG 85%) |

### 아직 안 되는 것

| 항목 | 이유 | 필요한 작업 |
|------|------|-------------|
| 실제 온체인 트랜잭션 | Anchor 프로그램 미배포 | `anchor deploy`로 devnet 배포 필요 |
| Redis 연동 | Railway Redis 미연결 | BullMQ 작업 큐 연결 |
| 실제 환불 처리 | Phase 6 | 에스크로 스마트 컨트랙트 연동 |
| 메인넷 배포 | 아직 devnet | 감사 후 메인넷 전환 |
| fyrst.fun 도메인 | Hostinger API 에러 | 수동 구매 필요 |

---

## 3. 실행 방법

### 백엔드 (WSL에서)
```bash
cd /mnt/c/Users/ttat/Cursor\ Projects/fyrst/service
npx tsx src/index.ts
# → http://localhost:8000 에서 실행
# DB 없으면 자동으로 Mock 모드
```

### 프론트엔드 (PowerShell에서)
```powershell
cd "C:\Users\ttat\Cursor Projects\fyrst\web"
npm install   # 최초 1회
npx next dev -p 3002
# → http://localhost:3002 에서 실행
```

### 프로덕션
- **백엔드**: https://fyrst-api-production.up.railway.app (GitHub push로 자동 배포)
- **프론트**: Vercel 배포 예정

### 환경변수
- 백엔드: `service/.env` (PORT=8000, CORS에 3002 포함)
- 프론트: `web/.env.local` (API_URL=localhost:8000)

---

## 4. 실시간 데이터 흐름 (WebSocket)

```
[유저 매매] → POST /api/trade → 본딩커브 계산
  ├── io.to("token:xxx").emit("trade:executed")  → 해당 토큰 구독자만
  │     → 토큰 상세 페이지: 캔들차트 갱신 + 거래 내역 추가
  └── io.emit("price:update")                    → 전체 클라이언트
        → 대시보드/LiveLaunches: 가격·MCap·진행률 실시간 갱신

[신규 런치] → POST /api/launches
  └── io.emit("launch:new")                      → 전체 클라이언트
        → 대시보드 리스트 맨 위에 즉시 등장
```

### 주요 파일
| 파일 | 역할 |
|------|------|
| `web/lib/socket.ts` | Socket.io 싱글턴 + 이벤트 타입 + room 헬퍼 |
| `web/hooks/useSocket.ts` | `useSocketInit()` (전역) + `useTokenSubscription(mint)` |
| `web/components/providers/SocketProvider.tsx` | 앱 루트에서 소켓 초기화 |
| `web/lib/store.ts` | Zustand — PriceSnapshot(변동% 계산), tokens[], trades[] |
| `web/lib/image.ts` | 이미지 3.5MB 검증 + 512x512 canvas 리사이즈 |

---

## 5. 디자인 컨셉: "Anti-Casino Arcade"

- **테마:** 80-90년대 레트로 아케이드 CRT 모니터
- **마스코트:** Buster (보더콜리, 보라 반다나, 픽셀아트)
- **컬러:** 라벤더(#A78BFA) + 코랄(#FB923C) + 다크배경(#0A0A0C)
- **폰트:** Press Start 2P (디스플레이), DM Sans (본문), JetBrains Mono (코드), VT323 (스코어)
- **특수효과:** CRT 스캔라인 오버레이, 스크린 쉐이크, 네온 글로우, steps() 애니메이션

---

## 6. 기술 스택

### 프론트엔드 (`web/`)
- Next.js 16.1.6 (App Router, Turbopack)
- TypeScript + Tailwind CSS v4
- Zustand 5 (상태 관리 — 토큰, 거래, 실시간 가격)
- socket.io-client (실시간 WebSocket)
- @solana/wallet-adapter-react (지갑)
- @coral-xyz/anchor 0.32.1 (온체인)
- Lightweight Charts 5 (본딩커브 캔들차트)

### 백엔드 (`service/`)
- Express 4.22 + TypeScript
- Prisma 5.22 (PostgreSQL ORM)
- Socket.io 4.8 (실시간 — room 기반 이벤트)
- BullMQ + ioredis (작업 큐)
- Zod (입력 검증)

### API 엔드포인트
```
GET  /health                      → 서버 상태
GET  /api/launches                → 토큰 목록 (sort, limit, offset)
GET  /api/launches/:mint          → 토큰 상세
POST /api/launches                → 토큰 생성 → launch:new 소켓 이벤트
GET  /api/deployer/:address       → 배포자 프로필
POST /api/trade                   → 매매 기록 → trade:executed + price:update 소켓 이벤트
GET  /api/trade/:mint             → 토큰 거래 내역
GET  /api/portfolio/:wallet       → 포트폴리오
GET  /api/refunds/:wallet         → 환불 목록
```

### 소켓 이벤트
```
서버 → 클라이언트:
  launch:new        (글로벌)     — 신규 토큰 런칭
  price:update      (글로벌)     — 가격/MCap/진행률 변동
  trade:executed    (room 기반)  — 특정 토큰 매매 발생
  heartbeat         (글로벌)     — 10초 간격 연결 확인

클라이언트 → 서버:
  subscribe:token   (mint)       — 토큰 room 입장
  unsubscribe:token (mint)       — 토큰 room 퇴장
```

---

## 7. 폴더 구조 (핵심만)

```
fyrst/
├── web/                          # 프론트엔드
│   ├── app/
│   │   ├── page.tsx              # 랜딩
│   │   ├── dashboard/page.tsx    # 대시보드 (실시간 가격)
│   │   ├── launch/page.tsx       # 토큰 런치 (이미지 리사이즈)
│   │   ├── portfolio/page.tsx    # 포트폴리오
│   │   ├── token/[mint]/page.tsx # 토큰 상세 (실시간 차트)
│   │   └── deployer/[address]/page.tsx # 배포자 프로필
│   ├── components/
│   │   ├── ui/                   # Button, Card, Badge, ProgressBar
│   │   ├── sections/             # Hero, StatsBar, HowItWorks, WhyFyrst, LiveLaunches
│   │   ├── common/               # Header (WS 상태 dot), Footer
│   │   ├── charts/               # BondingCurveChart (증분 업데이트)
│   │   └── providers/            # WalletProvider, SocketProvider
│   ├── hooks/
│   │   ├── useSocket.ts          # useSocketInit, useTokenSubscription
│   │   └── useScreenShake.ts     # 스크린 쉐이크 훅
│   ├── lib/
│   │   ├── socket.ts             # Socket.io 싱글턴 + 타입
│   │   ├── store.ts              # Zustand (PriceSnapshot, tokens, trades)
│   │   ├── image.ts              # 이미지 검증 + 리사이즈
│   │   ├── anchor.ts             # Solana/Anchor 연동
│   │   ├── api.ts                # 백엔드 API 클라이언트
│   │   ├── mock-data.ts          # 목 데이터 (API 폴백)
│   │   ├── constants.ts          # 상수 (담보 티어 등)
│   │   ├── utils.ts              # 유틸 함수
│   │   └── idl/fyrst.json        # Anchor IDL
│   └── public/images/            # 마스코트 + 아이콘 이미지
│
├── service/                      # 백엔드
│   ├── src/
│   │   ├── index.ts              # 서버 엔트리 (HTTP + Socket.io + room 핸들링)
│   │   ├── app.ts                # Express 앱 (body limit 10MB)
│   │   ├── socketManager.ts      # Socket.io 인스턴스 글로벌 접근
│   │   ├── routes/               # API 라우트 (launches, trade, deployer, portfolio)
│   │   ├── services/             # 비즈니스 로직 (평판, 본딩커브, 에스크로, 환불)
│   │   ├── middleware/            # errorHandler (413, 409, 500 분리)
│   │   ├── schemas/              # Zod 입력 검증
│   │   └── lib/prisma.ts         # DB 연결 (Mock 모드 지원)
│   └── prisma/schema.prisma      # DB 스키마
│
├── FULL_CONCEPT_FYRST.md         # 풀 컨셉 문서
├── STATUS.md                     # ← 이 문서
└── 내가 읽을 문서.md              # 문서 가이드
```

---

## 8. 읽어야 할 문서 목록

| 문서 | 경로 | 내용 |
|------|------|------|
| **이 문서** | `fyrst/STATUS.md` | 현재 상태 총정리 |
| **풀 컨셉** | `fyrst/FULL_CONCEPT_FYRST.md` | 문제 정의, 솔루션, 토크노믹스, 로드맵 전부 |
| **마케팅 전략** | `fyrst/web/MARKETING.md` | 후킹 전략, 트위터 카피, 텔레그램 메시지, 4주 캘린더 |
| **크레덴셜** | `fyrst/new_project_guide/CREDENTIALS.md` | API 키, 봇 토큰 등 (비공개) |
| **백엔드 .env** | `fyrst/service/.env` | 백엔드 환경변수 |
| **프론트 .env** | `fyrst/web/.env.local` | 프론트엔드 환경변수 |
| **Prisma 스키마** | `fyrst/service/prisma/schema.prisma` | DB 모델 |

### 구버전 주의 문서
- `_ARCHITECTURE.md` — Three.js/R3F 언급은 현재 안 쓰임 (아케이드 리팩 후 제거됨)
- `_CHARACTER.md` — Sentry(도베르만) 설명은 구버전. 현재 마스코트는 Buster(보더콜리)

---

## 9. 다음 스텝 (우선순위)

### 즉시 (이번 주)
1. ~~프론트 에러 수정 (Hydration, _bn)~~ → 완료
2. ~~백엔드 Mock 모드 데이터 풍부하게~~ → 완료
3. ~~마케팅 카피 준비~~ → 완료
4. ~~실시간 WebSocket 연동~~ → 완료
5. ~~이미지 업로드 에러 수정~~ → 완료
6. fyrst.fun 도메인 수동 구매 (Hostinger API 에러)
7. ~~GitHub 퍼블릭 repo 정리~~ → 완료 (fyrst-fun/fyrst)

### 단기 (1-2주)
8. Anchor 프로그램 devnet 배포 (`anchor build && anchor deploy`)
9. Vercel 프론트엔드 배포
10. OG 이미지 + 파비콘 최신화
11. 이미지 외부 스토리지 전환 (Cloudflare R2 또는 IPFS)

### 중기 (2-4주)
12. 트위터 런치 쓰레드 발행
13. 텔레그램 그룹 오픈
14. Helius Geyser 연동 (온체인 가격 피드)
15. 메인넷 전환 + 보안 감사

---

## 10. 주의사항

- **Railway**: `railway up` 절대 금지. GitHub push로만 배포
- **WSL push**: `powershell.exe` 경유해서 git push
- **Next.js**: 16.1.6 사용. 16.x 일부 버전 WSL 빌드 에러 있음
- **npm install**: PowerShell에서 하면 Windows 바이너리 설치됨. WSL에서 쓸 거면 WSL에서 install
- **환경변수**: `NEXT_PUBLIC_` 접두사는 빌드타임에 인라인됨. 배포 시 주의
- **GitHub 듀얼 구조**: 퍼블릭(fyrst-fun) + 디플로이(Cryptottat) 분리
- **이미지 업로드**: 프론트에서 3.5MB + 512x512 리사이즈 처리. 백엔드 body limit 10MB
