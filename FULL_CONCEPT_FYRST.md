# FYRST — FULL CONCEPT

## 1. 기본 정보

- 이름: FYRST
- 원래 단어: First (최초)
- Ticker: $FYRST
- Slogan: "Launch safe. Buy confident."
- 한 줄 컨셉: "최초의 책임있는 토큰 런치패드 — pump.fun이 카지노라면 FYRST는 규제된 거래소."
- 작성일: 2026-02-26

---

## 2. 포지셔닝

### 일반인용 비유 (1줄)
"pump.fun에 보험을 붙인 것. 배포자가 도망치면 돈이 자동으로 돌아온다."

### 개발자용 기술 설명 (2-3줄)
Anchor 기반 에스크로 스마트 컨트랙트로 배포자 담보를 강제 락업. Helius DAS API + 크로스월렛 히스토리 추적으로 배포자 평판(Deployer Reputation Score) 산출. 24시간 내 유동성 제거 시 에스크로된 SOL이 바이어에게 자동 환불(pro-rata distribution). pump.fun의 bonding curve 모델은 유지하되, 배포자 책임 레이어를 추가한 구조.

---

## 3. The Problem

### 문제 요약
pump.fun 일일 런칭 수만 건, 졸업률 1% 미만. 배포자 책임 메커니즘 제로. 디젠이 매일 러그로 돈을 잃는다.

### 구체적 수치/데이터
- pump.fun 일일 신규 토큰 런칭: 20,000~50,000건
- 졸업률(Raydium 유동성 풀 도달): 0.5~1.5%
- 24시간 내 러그/어밴던 비율: 95%+
- 디젠 평균 일일 러그 피해: $200~$500 (활성 트레이더 기준)
- pump.fun 누적 수수료 수입: $300M+ (바이백 기준)

### 기술적 원인
pump.fun bonding curve 구조는 배포자에게 어떤 의무도 부과하지 않음. 토큰 생성 비용 0.02 SOL ($3 수준). 배포자가 초기 물량 매집 후 덤프하거나, bonding curve 졸업 후 유동성 제거해도 아무런 패널티 없음. 지갑 생성 비용이 거의 0이므로 한 사람이 수백 개 지갑으로 반복 러그 가능. 크로스월렛 추적 인프라 부재로 동일인의 러그 이력 확인 불가.

### 현재 상태 (누가 이걸 해결하려 하고 있나)
- pump.fun 자체: 아무런 배포자 책임 메커니즘 없음. 의도적으로 "자유로운 런칭"을 유지
- RugCheck/KOVA 등: 토큰 안전성 "분석"은 하지만, 러그 자체를 "방지"하지는 못함 (사후 탐지 vs 사전 방지)
- Moonshot: 유사 런치패드지만 역시 배포자 책임 없음
- 현재 이 문제를 "사전에 구조적으로 방지"하는 프로토콜 = 0개

### 디젠에게 미치는 영향
평균 활성 디젠이 하루 5-10개 pump.fun 토큰에 진입. 그 중 95%가 러그/어밴던. 0.1-0.5 SOL씩 날리면 하루 0.5-5 SOL ($75-$750) 손실. 월간 $2,000-$15,000. "pump.fun은 카지노인데 카지노보다 승률이 낮다."

---

## 4. The Tech Solution (외부 표방)

### 솔루션 요약
FYRST는 배포자 담보 의무화 + 크로스월렛 평판 추적 + 자동 환불 메커니즘을 갖춘 책임있는 토큰 런치패드. 배포자가 러그하면 담보가 바이어에게 자동 분배된다.

### 작동 원리 (간략)
1. 배포자가 토큰 런칭 시 SOL 담보를 에스크로에 예치 (최소 1 SOL, 최대 무제한)
2. FYRST가 배포자의 크로스월렛 이력 분석 → Deployer Reputation Score 부여 (A~F 등급)
3. Bonding curve 진행 + 졸업 → 유동성 풀 생성
4. 24시간 내 유동성 제거/러그 발생 시 → 에스크로 SOL이 바이어에게 pro-rata 자동 환불
5. 24시간 안전 기간 경과 시 → 배포자 담보 점진적 반환 + Reputation Score 상승

### 아키텍처 다이어그램 (ASCII)

```
    Deployer                          Buyer
       |                                |
       v                                v
  [FYRST Web App] <-- Wallet Connect --> [FYRST Web App]
       |                                |
       v                                v
  [Launch Flow]                    [Buy/Sell Flow]
       |                                |
       +--------+          +-----------+
                |          |
                v          v
        [FYRST Anchor Program]
        |         |         |
        v         v         v
   [Escrow    [Bonding   [Refund
    Vault]     Curve]     Engine]
        |         |         |
        +----+----+----+----+
             |         |
             v         v
      [Solana RPC]  [Helius DAS API]
             |         |
             v         v
      [Token Mint]  [Wallet History
       + Metaplex]   Indexer]
```

### 기술적 차별점
- pump.fun 대비: 배포자 담보 의무화 → 러그 비용이 0에서 최소 1 SOL로 상승
- RugCheck 대비: 사후 "분석"이 아닌 사전 "방지" (에스크로 + 자동 환불)
- 크로스월렛 추적: 한 사람이 여러 지갑으로 러그한 이력을 연결하여 평판에 반영
- Bonding curve 호환: pump.fun과 동일한 bonding curve UX → 유저 학습 비용 제로

---

## 5. 실제 내부 구현

### 외부에 말하는 것 vs 내부에서 아는 것

| 외부 표방 | 실제 구현 |
|-----------|-----------|
| "AI 기반 크로스월렛 분석 엔진" | Helius DAS API + 트랜잭션 히스토리 인덱싱 + 규칙 기반 스코어링 |
| "자체 bonding curve 프로토콜" | pump.fun bonding curve 로직을 Anchor로 재구현 (공개 소스 참조 가능) |
| "실시간 러그 탐지 엔진" | Geyser WebSocket으로 유동성 제거 이벤트 모니터링 + 트리거 기반 환불 |
| "분산 에스크로 시스템" | 단일 Anchor 에스크로 PDA (배포자별 vault) |

### 사용할 외부 서비스
- Helius: DAS API (토큰 메타데이터 + 지갑 히스토리 인덱싱)
- QuickNode: Solana RPC 엔드포인트 + Geyser WebSocket (실시간 이벤트 감지)
- Jupiter: 가격 피드 (토큰 가격 참조)
- Metaplex: 토큰 메타데이터 생성
- Jito: 번들 트랜잭션 (환불 시 원자적 실행 보장)

### 핵심 구현 로직 (의사코드 수준)

```
// 런칭 플로우
function launchToken(deployer, tokenMetadata, collateralAmount):
    assert collateralAmount >= MIN_COLLATERAL  // 최소 1 SOL

    reputationScore = calculateReputation(deployer)
    // Helius로 deployer의 과거 토큰 배포 이력 조회
    // 러그 횟수, 평균 토큰 수명, 유동성 유지 기간 등 스코어링

    escrowVault = createEscrowPDA(deployer, tokenMint)
    transfer(deployer, escrowVault, collateralAmount)

    bondingCurve = initBondingCurve(tokenMint, initialPrice, curveParams)

    emit LaunchEvent(deployer, tokenMint, reputationScore, collateralAmount)

// 환불 플로우
function monitorAndRefund(tokenMint):
    // Geyser WebSocket으로 유동성 이벤트 모니터링
    on LiquidityRemoved(tokenMint):
        if timeSinceLaunch < SAFE_PERIOD:  // 24시간
            buyers = getBuyers(tokenMint)  // 구매자 목록
            escrowBalance = getEscrowBalance(tokenMint)

            for buyer in buyers:
                refundAmount = (buyer.investment / totalInvestment) * escrowBalance
                transfer(escrowVault, buyer, refundAmount)

            deployer.reputationScore -= PENALTY
            emit RugDetected(deployer, tokenMint)

// 평판 계산
function calculateReputation(deployer):
    history = helius.getDeployerHistory(deployer)
    // 크로스월렛 분석: 같은 IP/패턴으로 생성된 지갑 그룹 감지
    linkedWallets = findLinkedWallets(deployer)

    totalLaunches = sum(w.launches for w in linkedWallets)
    rugCount = sum(w.rugs for w in linkedWallets)
    avgTokenLifespan = mean(w.tokenLifespans for w in linkedWallets)

    score = baseScore
    score -= rugCount * RUG_PENALTY
    score += avgTokenLifespan * LONGEVITY_BONUS
    score += totalLaunches * EXPERIENCE_BONUS (if rugRate < 0.1)

    return clamp(score, 0, 100)  // A=80+, B=60+, C=40+, D=20+, F=0+
```

### MVP 범위
MVP에서 구현:
- 토큰 런칭 (bonding curve + 메타데이터)
- 배포자 담보 에스크로 (최소 1 SOL)
- 기본 Deployer Reputation Score (러그 횟수 기반)
- 자동 환불 메커니즘 (24시간 안전 기간)
- 런칭 대시보드 (활성 토큰 목록 + 배포자 등급)
- 바이어 구매 인터페이스

MVP에서 제외:
- 크로스월렛 고급 분석 (1차에서는 단일 지갑 이력만)
- 배포자 담보 점진적 반환 (MVP에서는 24시간 후 일괄 반환)
- Telegram/Discord 봇 (웹 먼저)
- 토큰 졸업 후 DEX 마이그레이션 자동화

---

## 6. UX Flow

### 6.1 메인 페이지 (Landing)

```
+----------------------------------------------------------+
|  [FYRST Logo]                         [Connect Wallet]    |
+----------------------------------------------------------+
|                                                            |
|          "Launch safe. Buy confident."                     |
|          The first accountable token launchpad.            |
|                                                            |
|     [Launch a Token]        [Browse Launches]              |
|                                                            |
+----------------------------------------------------------+
|                                                            |
|  LIVE LAUNCHES                                             |
|  +--------+  +--------+  +--------+  +--------+           |
|  | TOKEN1 |  | TOKEN2 |  | TOKEN3 |  | TOKEN4 |           |
|  | A rank |  | B rank |  | C rank |  | F rank |           |
|  | 2.5 SOL|  | 1.0 SOL|  | 5.0 SOL|  | 1.0 SOL|          |
|  | collat. |  | collat. |  | collat. |  | collat.|         |
|  | 85% fill|  | 32% fill|  | 67% fill|  | 12% fill|       |
|  +--------+  +--------+  +--------+  +--------+           |
|                                                            |
+----------------------------------------------------------+
|  HOW IT WORKS                                              |
|                                                            |
|  1. Deployer stakes     2. Reputation     3. If rug =      |
|     SOL collateral         scored            auto refund   |
|     [Shield Icon]          [Star Icon]       [Return Icon] |
|                                                            |
+----------------------------------------------------------+
|  WHY $FYRST                                                |
|                                                            |
|  Hold $FYRST = Priority access to verified launches        |
|  + Fee discounts + Reputation boost                        |
|                                                            |
|  [Buy $FYRST]                                              |
+----------------------------------------------------------+
```

### 6.2 핵심 기능 화면 (Launch App)

**배포자 화면:**
```
+----------------------------------------------------------+
|  CREATE YOUR TOKEN                                         |
+----------------------------------------------------------+
|                                                            |
|  Token Name:    [_______________]                          |
|  Symbol:        [_______________]                          |
|  Description:   [_______________]                          |
|  Image:         [Upload / AI Generate]                     |
|                                                            |
+----------------------------------------------------------+
|  COLLATERAL                                                |
|                                                            |
|  Minimum: 1 SOL    Your Stake: [___] SOL                  |
|                                                            |
|  Higher collateral = Higher reputation badge               |
|  +----------+----------+----------+----------+             |
|  | 1 SOL    | 5 SOL    | 10 SOL   | 25+ SOL  |            |
|  | Bronze   | Silver   | Gold     | Diamond  |            |
|  +----------+----------+----------+----------+             |
|                                                            |
+----------------------------------------------------------+
|  YOUR DEPLOYER SCORE                                       |
|                                                            |
|  Rank: B (67/100)                                          |
|  Past launches: 12                                         |
|  Rug history: 0                                            |
|  Avg token lifespan: 4.2 days                              |
|                                                            |
|  [Launch Token -- costs 0.02 SOL + collateral]             |
+----------------------------------------------------------+
```

**바이어 화면:**
```
+----------------------------------------------------------+
|  $MEMECOIN                        Deployer: 0x3f...a2     |
|                                   Rank: A (92/100)         |
|                                   Collateral: 10 SOL       |
+----------------------------------------------------------+
|                                                            |
|  [Bonding Curve Chart]                                     |
|  ████████████████░░░░░░░  67% to graduation               |
|                                                            |
|  Market Cap: $45,230          Holders: 342                 |
|  24h Volume: $12,500          Created: 2h ago              |
|                                                            |
+----------------------------------------------------------+
|  SAFETY INDICATORS                                         |
|                                                            |
|  Deployer Score:  A  [==========]  92/100                  |
|  Collateral:      10 SOL (refundable if rug)               |
|  Safe Period:     22h remaining                            |
|  Past Launches:   15 (0 rugs)                              |
|                                                            |
+----------------------------------------------------------+
|  BUY                                                       |
|                                                            |
|  Amount: [___] SOL      Est. tokens: 1,234,567             |
|                                                            |
|  [Buy]   [Sell]                                            |
+----------------------------------------------------------+
```

### 6.3 대시보드

```
+----------------------------------------------------------+
|  MY PORTFOLIO                                              |
+----------------------------------------------------------+
|                                                            |
|  Active Positions:                                         |
|  +--------------------------------------------------+     |
|  | Token    | Bought  | Current | P/L    | Safety   |     |
|  |----------|---------|---------|--------|----------|     |
|  | $MEME1   | 0.5 SOL | 1.2 SOL | +140%  | A (safe) |    |
|  | $MEME2   | 0.3 SOL | 0.1 SOL | -67%   | C (watch)|    |
|  | $MEME3   | 1.0 SOL | 0.0 SOL | RUGGED | Refunded |    |
|  +--------------------------------------------------+     |
|                                                            |
|  Refund History:                                           |
|  - $MEME3: 0.8 SOL refunded (80% of collateral)           |
|                                                            |
+----------------------------------------------------------+
```

---

## 7. 토큰 유틸리티 ($FYRST)

### 티어 시스템

| 티어 | 필요 수량 | 혜택 |
|------|-----------|------|
| Free | 0 | 기본 브라우징, F-D 등급 배포자 토큰만 구매 가능 |
| Basic | 10,000 $FYRST | C+ 등급 배포자 토큰 접근, 런칭 알림 |
| Pro | 50,000 $FYRST | 모든 등급 접근, 런칭 후 5초 우선 구매권 |
| Elite | 200,000 $FYRST | 프리런칭 알림 (런칭 전 30초 알림), 배포 수수료 50% 할인 |
| Whale | 500,000 $FYRST | A등급 배포자 프라이빗 런칭 초대, 배포 수수료 면제, 환불 우선 처리 |

### 토큰이 필요한 이유 (매수 동기)
1. 기능 게이팅: $FYRST 보유량에 따라 고신뢰 배포자 토큰 접근 차등
2. 우선 구매: Pro 이상 홀더는 런칭 직후 5초 우선 구매 (pump.fun과의 핵심 차별점)
3. 배포 할인: 배포자가 $FYRST를 보유하면 수수료 할인 + Reputation 부스트

### Free 티어 제한
- F~D 등급 배포자 토큰만 구매 가능 (고등급은 잠김)
- 런칭 알림 없음 (수동 브라우징만)
- 우선 구매 없음 (일반 큐)

### 수수료 모델
- 배포 수수료: 0.02 SOL (pump.fun 동일) + 프로토콜 수수료 0.5%
- 거래 수수료: 매 거래 1% (0.5% 바이백 + 0.5% 환불 풀)
- 환불 풀: 거래 수수료의 50%가 환불 보험 풀에 축적 → 에스크로 이상의 추가 보호

---

## 8. 매수 포인트

### 투자 논리

1. pump.fun 시가총액 $300M+ 기준, "안전한 pump.fun"은 최소 시총 $50M 잠재력. pump.fun이 개선하지 않는 이유 = 그들에게 러그 방지는 수익 감소 요인.
2. 솔라나 밈코인 일일 DEX 볼륨 $2B+. 이 시장의 1%만 FYRST로 이동해도 $20M/일 거래량.
3. pump.fun은 러그를 방치하고 있고, 디젠들의 불만이 폭발 중. "pump.fun 킬러" 서사 = 자연 발생적 FOMO.
4. 배포자 담보 수수료 + 거래 수수료 = 프로토콜 수익. 토큰 유틸리티가 수수료 구조에 직결.
5. 규제 강화 추세에서 "책임있는 런치패드"는 기관/VC 관심을 끌 수 있는 유일한 런치패드 서사.

### 디젠 타겟 멘트 (영어)

1. "95% of pump.fun tokens rug within 24 hours. FYRST deployers stake real SOL. If they rug, you get refunded. This changes everything."
2. "pump.fun made $300M from your losses. FYRST protects you AND rewards you. The era of accountable launches starts now. $FYRST"
3. "You've been rugged 100 times this month. What if the next launchpad actually refunded you when it happens? $FYRST is live."

### 타임라인 FOMO
- pump.fun 피로감이 2026년 최고조 — "뭔가 더 나은 게 필요하다" 디젠 정서 만연
- 첫 "안전한 런치패드"로 선점하면 후발주자는 "FYRST 카피캣" 취급
- 밈코인 시장은 주기적으로 폭발 — 다음 폭발 때 "이번에는 FYRST에서" 서사

---

## 9. 기술 스택

### 프론트엔드
- 프레임워크: Next.js 15 (App Router) — SSR + 실시간 데이터에 최적
- 스타일링: Tailwind CSS v4 — 빠른 UI 구현
- 3D/효과: Three.js + React Three Fiber — 히어로 3D 씬 (방패/금고 모티브)
- 지갑 연결: Solana Wallet Adapter (@solana/wallet-adapter-react)
- 상태 관리: zustand — 경량, bonding curve 실시간 상태 관리
- 차트: Lightweight Charts (TradingView) — bonding curve 시각화

### 백엔드
- 프레임워크: Node.js + Express — API 서버
- 언어: TypeScript
- DB: PostgreSQL — 배포자 이력, 토큰 메타데이터, 거래 기록
- 캐시: Redis — 실시간 bonding curve 상태, 가격 캐시
- 큐: BullMQ — 환불 처리 비동기 큐
- WebSocket: Socket.io — 실시간 런칭/가격 업데이트

### 온체인
- Anchor Framework (Rust) — 에스크로, bonding curve, 환불 프로그램
- Metaplex SDK — 토큰 메타데이터 생성
- SPL Token / Token-2022 — 토큰 민트

### 외부 서비스
- RPC: QuickNode (Yellowstone gRPC + WebSocket)
- 솔라나 API: Helius DAS API (지갑 히스토리 인덱싱), Jito (번들 TX)
- 데이터: Jupiter API (가격 피드)
- 이미지: fal.ai Flux Pro (토큰 이미지 AI 생성 옵션)

### 배포
- 프론트: Vercel (Next.js 최적)
- 백엔드: Railway (Node.js + PostgreSQL + Redis)
- 도메인: fyrst.xyz 또는 fyrst.so
- 프로그램: Solana Devnet → Mainnet

### 기타
- 모니터링: Sentry (에러 트래킹)
- CI/CD: GitHub Actions
- 크롬 확장: 불필요 (웹앱 중심)
- 텔레그램 봇: Phase 2 (MVP 이후)

결정 근거:
- Next.js: pump.fun과 동일한 실시간 UX 제공에 필수적인 SSR + WebSocket
- Anchor: 솔라나 스마트 컨트랙트 표준. 에스크로/bonding curve 구현에 최적.
- PostgreSQL: 배포자 이력/평판 데이터 저장에 관계형 DB 필수.
- Helius: DAS API가 지갑 히스토리 인덱싱에 가장 빠르고 안정적.

---

## 10. 비주얼/브랜딩 방향

### 컬러 팔레트

| 용도 | 색상 | HEX |
|------|------|-----|
| Primary | 스틸 블루 | #2563EB |
| Secondary | 앰버 골드 | #D97706 |
| Accent | 에메랄드 | #059669 |
| Background | 차콜 네이비 | #0F172A |
| Text Primary | 화이트 | #F8FAFC |
| Text Secondary | 슬레이트 | #94A3B8 |
| Success (Safe) | 에메랄드 | #10B981 |
| Error (Rug) | 크림슨 | #DC2626 |

### 스타일 키워드
1. Fortified — 방어적이고 견고한 느낌. 성벽, 방패, 금고 모티브.
2. Institutional — 카지노(pump.fun) 대비 "신뢰할 수 있는 거래소" 느낌. 깔끔하고 프로페셔널.
3. Metallic — 금속 텍스처 (강철, 청동). 견고함과 불변성 전달.
4. Blueprint — 설계도 느낌의 라인 아트. 투명성과 구조적 안정성 표현.

### 3D 씬 / 특수 효과 컨셉
메인 히어로: 강철 금고 문이 천천히 열리면서 안에서 빛이 새어나오는 3D 씬. 금고 문 표면에 미세한 기어와 볼트 디테일. 배경에 blueprint 그리드 패턴.
특수 효과: 금속 표면 반사 쉐이더, 미세한 파티클 (금속 입자), 금고 문 열림 애니메이션 (스크롤 트리거).
런칭 이벤트: 새 토큰 런칭 시 방패가 슬라이드인되는 마이크로 애니메이션.

### 마스코트/캐릭터
- 종류: 경비견 (도베르만)
- 이름: Sentry
- 성격: 단호하고 경계심 강함. 하지만 신뢰할 수 있는 유저에게는 꼬리를 살짝 흔듦.
- 비주얼: 강철빛 도베르만, 목에 $FYRST 태그 목걸이, 한쪽 귀가 접힌 상태, 앉아서 정면 주시, 눈동자에 은은한 블루 발광, 미니멀 벡터 스타일 (플랫 + 약간의 그림자), 크기 16cm 정도의 비율.
- 사용처: 로고 옆 아이콘, Safe/Rug 알림 시 표정 변화, 로딩 화면, 에러 페이지

### 커스텀 커서
금고 열쇠 모양 커서 (호버 시 열쇠가 회전하는 마이크로 애니메이션)

### 텍스처
- Brushed metal (브러시드 메탈) — 헤더/카드 배경
- Blueprint grid (설계도 격자) — 배경 패턴
- Subtle grain (미세 그레인) — 전체 오버레이

### 참고 레퍼런스
- Coinbase 웹사이트 (institutional trust 느낌, 깔끔한 UI)
- 1Password 랜딩 페이지 (금고/보안 모티브, 프리미엄 느낌)
- Linear.app (미니멀하면서 프로페셔널, 다크 테마)

---

## 11. 트위터 마케팅 예시

### 런칭 포스트 (영어)

"95% of tokens on pump.fun rug within 24 hours.

FYRST changes that. Deployers stake real SOL. If they rug, you get refunded automatically.

The first accountable launchpad on Solana is live.

fyrst.xyz

#Solana #FYRST"

### 혼잡시 마케팅 포스트 (영어)

"Another day, another 10,000 rugs on pump.fun.

Meanwhile, FYRST deployers have staked $500K+ in collateral.

Zero rugs. Zero losses. This is what a real launchpad looks like.

$FYRST"

### 바이럴 유도 포스트 (영어)

"How much SOL have you lost to rugs this month?

Reply with your number. Then look at FYRST -- where deployers stake collateral and you get refunded if they rug.

The pump.fun era is over. $FYRST"

---

## 12. 리스크 & 대응

### 기술 리스크

| 리스크 | 확률 | 영향도 | 대응 |
|--------|------|--------|------|
| 에스크로 스마트 컨트랙트 취약점 | 중간 | 높음 | Anchor 보안 패턴 준수 + 자체 감사 + 단계적 TVL 확대 |
| 크로스월렛 추적 우회 (배포자가 새 지갑 사용) | 높음 | 중간 | Phase 2에서 행동 패턴 분석 추가. MVP에서는 담보 금액 자체가 억제력 |
| Helius API 다운타임 | 낮음 | 중간 | 폴백 RPC (QuickNode) + 캐시된 데이터로 일시 운영 |

### 시장 리스크

| 리스크 | 확률 | 영향도 | 대응 |
|--------|------|--------|------|
| pump.fun이 담보 기능 추가 | 중간 | 높음 | pump.fun은 수수료 모델상 담보 도입 인센티브 없음. 도입하더라도 FYRST는 평판 시스템으로 차별화 |
| 밈코인 시장 침체 | 중간 | 높음 | 밈코인이 아닌 일반 토큰 런칭으로 확장 (utility token, governance token) |
| 배포자가 FYRST를 기피 (담보 부담) | 중간 | 중간 | 초기에 담보 최소화(1 SOL) + 높은 Reputation = 담보 할인. 바이어 트래픽이 모이면 배포자도 따라옴 |
| 경쟁 런치패드 등장 | 낮음 | 중간 | 선점 효과 + 평판 데이터 축적이 해자(moat). 후발주자는 평판 데이터 0에서 시작 |

### 최악의 시나리오
pump.fun이 담보 기능을 추가하고, 밈코인 시장이 동시에 침체하는 경우. 이때 FYRST는 "일반 토큰 런치패드"로 피벗하여 utility/governance 토큰 런칭 시장을 타겟. 축적된 배포자 평판 데이터와 에스크로 인프라는 어떤 토큰 런칭에도 재활용 가능.
