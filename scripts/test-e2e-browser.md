# FYRST E2E 브라우저 테스트 스크립트

> Claude 크롬 확장 프로그램으로 실행하는 자동 테스트
> 사이트: https://fyrst.fun (devnet)
> 최종 업데이트: 2026-03-05

---

## 사전 준비

- [ ] Phantom 지갑 devnet 모드 활성화 (Settings → Developer Settings → Testnet Mode)
- [ ] devnet SOL 충전 (https://faucet.solana.com 에서 2 SOL 이상)
- [ ] fyrst.fun 접속 확인

---

## TEST 1: 페이지 로딩 & 네비게이션

### 1-1. 랜딩 페이지
1. https://fyrst.fun 접속
2. **확인**: 히어로 섹션 표시 (FYRST 로고, CTA 버튼)
3. **확인**: 헤더 네비게이션 링크: ABOUT, $FYRST, PLAYER, LAUNCH, BOUNTY, PORTFOLIO

### 1-2. 각 페이지 로딩
1. 헤더의 "PLAYER" 클릭 → `/floor` 이동
2. **확인**: "PLAYER SELECT" 타이틀 표시
3. 헤더의 "LAUNCH" 클릭 → `/launch` 이동
4. **확인**: 폼 필드 표시 (TOKEN NAME, SYMBOL 등)
5. 헤더의 "BOUNTY" 클릭 → `/bounty` 이동
6. **확인**: "BOUNTY BOARD" 타이틀 표시
7. 헤더의 "ABOUT" 클릭 → `/about` 이동
8. **확인**: 프로젝트 소개 표시
9. 헤더의 "$FYRST" 클릭 → `/fyrst-token` 이동
10. **확인**: 토크노믹스 섹션 표시

---

## TEST 2: 지갑 연결

1. 헤더의 "Select Wallet" 또는 "Connect Wallet" 버튼 클릭
2. Phantom 선택
3. Phantom 팝업에서 승인
4. **확인**: 헤더에 지갑 주소 일부 표시 (예: "2MVU...Ek8S")
5. **확인**: 잔고 표시 확인

---

## TEST 3: 토큰 런칭 (핵심 테스트)

### 3-1. 폼 입력
1. https://fyrst.fun/launch 이동
2. 지갑 연결 상태 확인
3. TOKEN NAME 입력: `Test Token E2E`
4. SYMBOL 입력: `TTE2E`
5. DESCRIPTION 입력: `E2E test token for automated browser testing`
6. 이미지: 스킵 (선택사항)

### 3-2. 담보 설정
7. COINS TO INSERT 필드에 `0.01` 입력
8. **확인**: Iron 티어 뱃지 표시
9. 값을 `0.5`로 변경
10. **확인**: Bronze 티어 뱃지 표시
11. "Iron" 버튼 클릭 → 값이 `0.01`로 설정되는지 확인
12. 값을 `0.005`로 수동 입력 시도
13. **확인**: 0.01 미만 값이 허용되지 않음 (최소 0.01 SOL)

### 3-3. 데드라인 설정
14. "3 MIN" 프리셋 버튼 클릭
15. **확인**: 데드라인이 3분으로 설정됨

### 3-4. 초기 매수 (옵션)
16. INITIAL BUY 필드에 `0.01` 입력

### 3-5. 런칭 실행
17. "INSERT 0.01 SOL" 버튼 클릭
18. Phantom 팝업에서 트랜잭션 승인
19. **확인**: 상태 변화 순서:
    - "WAITING FOR WALLET..."
    - "LAUNCHING ON-CHAIN..."
    - "RECORDING..."
    - "TOKEN LAUNCHED! +1UP" (성공)
20. **확인**: 성공 후 토큰 상세 페이지로 자동 이동
21. **기록**: 새 토큰의 mint 주소 (URL에서 복사: `/token/{mint}`)

> **이후 테스트에서 이 mint 주소를 사용**

---

## TEST 4: 토큰 상세 페이지

### 4-1. 기본 정보 확인
1. 토큰 상세 페이지 (TEST 3에서 이동된 페이지)
2. **확인**: 토큰 이름 "Test Token E2E" 표시
3. **확인**: 심볼 "$TTE2E" 표시
4. **확인**: 설명 표시
5. **확인**: 배포자 주소 = 내 지갑 주소
6. **확인**: 평판 뱃지 표시 (A/B/C/D/F)

### 4-2. 가격 & 마켓캡 표시
7. **확인**: PRICE (SOL) 값 표시 (0이 아닌 값)
8. **확인**: MCAP (USD) 값 표시
9. **확인**: P-MCAP (USD) 값 표시 (있다면)

### 4-3. 에스크로 & 데드라인 표시
10. **확인**: COLLATERAL 표시 = "0.01 SOL"
11. **확인**: DEADLINE 카운트다운 표시 (약 3분 남음)
12. **확인**: 카운트다운이 초 단위로 갱신 (예: "2m 45s")

### 4-4. 프로그레스 바
13. **확인**: 본딩 커브 프로그레스 바 표시
14. **확인**: graduated = "NO"

---

## TEST 5: 매수 (BUY)

### 5-1. 기본 매수
1. 토큰 상세 페이지에서 BUY 탭 선택
2. **확인**: SOL 잔고가 입력 필드 위에 표시
3. SOL 입력: `0.05`
4. **확인**: 예상 토큰 수량 표시 ("You will get X tokens")
5. "BUY 0.05 SOL" 버튼 클릭
6. Phantom 트랜잭션 승인
7. **확인**: 성공 메시지 또는 토스트 표시
8. **확인**: 잔고 감소
9. **확인**: 거래내역(Trades) 탭에 BUY 기록 추가

### 5-2. 슬리피지 설정
10. 슬리피지 버튼 확인 (기본 1%)
11. 슬리피지 변경 가능 여부 확인

---

## TEST 6: 매도 (SELL)

### 6-1. 기본 매도
1. SELL 탭 클릭
2. **확인**: 보유 토큰 수량 표시
3. 토큰 수량의 절반 입력
4. **확인**: 예상 SOL 수량 표시
5. "SELL" 버튼 클릭
6. Phantom 트랜잭션 승인
7. **확인**: 성공 메시지
8. **확인**: 거래내역 탭에 SELL 기록 추가

### 6-2. MAX 매도
9. SELL 탭에서 "MAX" 버튼 클릭
10. **확인**: 전체 보유량이 입력됨
11. (실행은 선택 — 전량 매도하면 이후 테스트 불가)

---

## TEST 7: 수수료 클레임 (배포자)

> 배포자(내 지갑)로 런칭한 토큰에서만 가능

1. 내가 런칭한 토큰 상세 페이지 이동
2. **확인**: "CLAIM FEES" 버튼 표시 (거래가 있었으면 claimable > 0)
3. TEST 5에서 매수했으므로 수수료가 누적되어 있어야 함
4. "CLAIM FEES" 클릭
5. Phantom 트랜잭션 승인
6. **확인**: 수수료 클레임 성공 메시지
7. **확인**: 클레임 후 버튼 비활성화 또는 잔액 0 표시

---

## TEST 8: Floor 페이지 (대시보드)

### 8-1. 토큰 리스트
1. https://fyrst.fun/floor 이동
2. **확인**: 방금 런칭한 "Test Token E2E" 카드 표시
3. **확인**: 카드에 MCap 값 표시 (P-MCap 또는 MCap)
4. **확인**: 데드라인 카운트다운 초 단위 표시

### 8-2. 정렬
5. "LAST TRADE" 버튼 클릭
6. **확인**: 가장 최근 거래 토큰이 첫번째
7. "NEW" 버튼 클릭
8. **확인**: 가장 최근 생성 토큰이 첫번째
9. "MCAP" 버튼 클릭
10. **확인**: 마켓캡 높은 순
11. "DEADLINE" 버튼 클릭
12. **확인**: 데드라인 임박 순
13. "ESCROW" 버튼 클릭
14. **확인**: 담보금 높은 순

### 8-3. 검색
15. 검색창에 "TTE2E" 입력
16. **확인**: 해당 토큰만 필터링되어 표시
17. 검색창 비우기
18. **확인**: 전체 리스트 복원

### 8-4. 카드 클릭
19. "Test Token E2E" 카드 클릭
20. **확인**: `/token/{mint}` 페이지로 이동

---

## TEST 9: 데드라인 만료 & 에스크로 처리

> 3분 데드라인 토큰이므로 약 3분 대기 필요

### 9-1. 만료 대기
1. 토큰 상세 페이지에서 데드라인 카운트다운 관찰
2. **확인**: 카운트다운이 0에 도달하면 "EXPIRED" 표시

### 9-2A. Expire Escrow (홀더 없을 때)
> 만약 토큰 전량 매도 완료 상태라면:
3. "EXPIRE ESCROW" 버튼 표시 확인
4. 클릭 → Phantom 승인
5. **확인**: 에스크로 분배 완료 (50% 배포자 + 50% 프로토콜)

### 9-2B. Process Refund (홀더 있을 때)
> 만약 토큰을 일부 보유 중이라면:
3. "REFUND" 또는 "PROCESS REFUND" 버튼 표시 확인
4. 클릭 → Phantom 승인
5. **확인**: 토큰 소각 + SOL 프로라타 환불

---

## TEST 10: 포트폴리오

1. https://fyrst.fun/portfolio 이동
2. **확인**: 지갑 연결 상태
3. **확인**: "INVENTORY" 타이틀
4. **확인**: TOTAL VALUE, HOLDINGS 카드 표시
5. **확인**: 보유 토큰 리스트에 "Test Token E2E" 표시 (매도 안 했다면)
6. **확인**: 각 토큰별 PnL % 표시

### 10-1. 클레임 가능 보상
7. **확인**: CLAIMABLE REWARDS 섹션
8. 내가 배포한 토큰의 에스크로/수수료 표시 확인

---

## TEST 11: 배포자 프로필

1. 토큰 상세 페이지에서 배포자 주소 클릭
2. **확인**: `/deployer/{address}` 페이지 이동
3. **확인**: "PLAYER PROFILE" 타이틀
4. **확인**: 평판 점수 표시 (XX/100)
5. **확인**: 등급 뱃지 (A/B/C/D/F)
6. **확인**: LAUNCHES 카운트 ≥ 1
7. **확인**: 런칭 히스토리에 "Test Token E2E" 표시

---

## TEST 12: Bounty Board

1. https://fyrst.fun/bounty 이동
2. **확인**: "BOUNTY BOARD" 타이틀
3. **확인**: 활성 토큰 리스트 (데드라인 남은 토큰)
4. **확인**: 각 항목: SYMBOL, COLLATERAL, REMAINING, PRESSURE, TIER 표시
5. 데드라인 1시간 미만 토큰이 있으면 빨간 하이라이트 확인

---

## TEST 13: 댓글

1. 토큰 상세 페이지 이동
2. Comments 탭 또는 댓글 섹션 찾기
3. 댓글 입력: `Automated E2E test comment`
4. POST 버튼 클릭
5. Phantom 서명 승인 (댓글 서명)
6. **확인**: 댓글 목록에 새 댓글 표시
7. **확인**: 내 지갑 주소 + 댓글 내용 + 시간 표시

---

## TEST 14: 실시간 업데이트 (WebSocket)

> 두 번째 브라우저 탭/다른 지갑 필요

1. 탭 A: 토큰 상세 페이지 열기
2. 탭 B: 같은 토큰 페이지 열기 (다른 지갑 또는 같은 지갑)
3. 탭 B에서 매수 실행
4. **확인** (탭 A): 가격 실시간 업데이트
5. **확인** (탭 A): 거래내역에 새 거래 즉시 추가
6. **확인** (탭 A): 차트 업데이트

---

## TEST 15: 졸업 테스트 (선택 — 큰 SOL 필요)

> 데브넷 기준 5 SOL reserve로 졸업 트리거

### 15-1. 대량 매수
1. 토큰 상세 페이지에서 BUY
2. SOL 입력: `5` (또는 졸업 기준에 도달할 만큼)
3. 트랜잭션 승인
4. **확인**: graduated 플래그 변경 또는 크랭커가 자동 졸업 처리

### 15-2. 졸업 확인
5. **확인**: graduated = "YES" 표시
6. **확인**: 매수/매도 비활성화 (본딩 커브 종료)
7. **확인**: Raydium 풀 생성 완료 (크랭커 봇이 자동 처리)
8. **확인**: "TRADE ON RAYDIUM" 또는 DEX 링크 표시

### 15-3. 졸업 후 에스크로
9. "RELEASE ESCROW" 버튼 표시 확인
10. 클릭 → Phantom 승인
11. **확인**: 에스크로 100% 배포자 반환

---

## 결과 기록 템플릿

| # | 테스트 | 결과 | 비고 |
|---|--------|------|------|
| 1 | 페이지 로딩 | ⬜ PASS / ⬜ FAIL | |
| 2 | 지갑 연결 | ⬜ PASS / ⬜ FAIL | |
| 3 | 토큰 런칭 | ⬜ PASS / ⬜ FAIL | mint: |
| 4 | 토큰 상세 | ⬜ PASS / ⬜ FAIL | |
| 5 | 매수 (BUY) | ⬜ PASS / ⬜ FAIL | |
| 6 | 매도 (SELL) | ⬜ PASS / ⬜ FAIL | |
| 7 | 수수료 클레임 | ⬜ PASS / ⬜ FAIL | |
| 8 | Floor 페이지 | ⬜ PASS / ⬜ FAIL | |
| 9 | 에스크로 만료/환불 | ⬜ PASS / ⬜ FAIL | |
| 10 | 포트폴리오 | ⬜ PASS / ⬜ FAIL | |
| 11 | 배포자 프로필 | ⬜ PASS / ⬜ FAIL | |
| 12 | Bounty Board | ⬜ PASS / ⬜ FAIL | |
| 13 | 댓글 | ⬜ PASS / ⬜ FAIL | |
| 14 | 실시간 (WS) | ⬜ PASS / ⬜ FAIL | |
| 15 | 졸업 | ⬜ PASS / ⬜ FAIL | |

---

## 수수료 분배 검증 (수동)

TEST 5 매수 후, Solscan에서 트랜잭션 확인:

```
매수 금액: 0.05 SOL
├── 수수료 1%: 0.0005 SOL
│   ├── 배포자 몫 (50%): 0.00025 SOL → BondingCurve PDA에 기록
│   └── 프로토콜 몫 (50%): 0.00025 SOL
│       ├── Treasury (60%): 0.00015 SOL → Treasury 지갑으로 전송
│       └── Ops Wallet (40%): 0.0001 SOL → Ops Wallet으로 전송
└── 실 매수분: 0.0495 SOL → Reserve에 추가
```

Solscan에서 확인할 것:
1. 트랜잭션의 SOL 이동 내역
2. Treasury 지갑 잔고 변화
3. Ops Wallet 잔고 변화
4. BondingCurve PDA의 total_deployer_fees 증가
