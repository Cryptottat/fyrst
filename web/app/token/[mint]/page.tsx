"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import BondingCurveChart from "@/components/charts/BondingCurveChart";
import { fetchToken, fetchDeployer, fetchTrades, recordTrade, type ApiToken, type ApiDeployer } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useTokenSubscription } from "@/hooks/useSocket";
import {
  useAnchorProgram,
  fetchBondingCurve,
  fetchBuyerRecord,
  buyTokens,
  sellTokens,
  type BondingCurveData,
  type BuyerRecordData,
} from "@/lib/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  formatSol,
  formatCompact,
  formatAddress,
  formatTimeAgo,
  getReputationGrade,
} from "@/lib/utils";
import { Loader2 } from "lucide-react";

type TxStatus = "idle" | "loading" | "success" | "error";

export default function TokenDetailPage({
  params,
}: {
  params: Promise<{ mint: string }>;
}) {
  const { mint } = use(params);
  const { publicKey, connected } = useWallet();
  const { program } = useAnchorProgram();

  // Subscribe to real-time trade events for this token
  useTokenSubscription(mint);

  const [token, setToken] = useState<ApiToken | null>(null);
  const [deployer, setDeployer] = useState<ApiDeployer | null>(null);
  const [curveData, setCurveData] = useState<BondingCurveData | null>(null);
  const [buyerRecord, setBuyerRecord] = useState<BuyerRecordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [buyStatus, setBuyStatus] = useState<TxStatus>("idle");
  const [sellStatus, setSellStatus] = useState<TxStatus>("idle");
  const [txError, setTxError] = useState<string | null>(null);

  // Zustand stores
  const storeTrades = useAppStore((s) => s.trades);
  const setTrades = useAppStore((s) => s.setTrades);
  const priceSnapshot = useAppStore((s) => s.prices.get(mint));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchToken(mint), fetchTrades(mint)])
      .then(async ([t, tradeData]) => {
        if (cancelled) return;
        setToken(t);
        setTrades(tradeData);
        if (t.deployerAddress) {
          try {
            const d = await fetchDeployer(t.deployerAddress);
            if (!cancelled) setDeployer(d);
          } catch {
            // Deployer not found in DB is OK
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [mint, setTrades]);

  const refreshOnChainData = useCallback(async () => {
    if (!program) return;
    try {
      const mintPubkey = new PublicKey(mint);
      const curve = await fetchBondingCurve(program, mintPubkey);
      setCurveData(curve);

      if (publicKey) {
        const record = await fetchBuyerRecord(program, publicKey, mintPubkey);
        setBuyerRecord(record);
      }
    } catch {
      // On-chain data might not exist yet
    }
  }, [program, mint, publicKey]);

  useEffect(() => {
    refreshOnChainData();
  }, [refreshOnChainData]);

  const onChainPrice = curveData
    ? curveData.basePrice.add(curveData.slope.mul(curveData.currentSupply)).toNumber() / 1e9
    : null;

  const onChainSupply = curveData
    ? curveData.currentSupply.toNumber()
    : null;

  // Priority: live socket price > on-chain > API
  const displayPrice = priceSnapshot?.price ?? onChainPrice ?? token?.currentPrice ?? 0;
  const displaySupply = priceSnapshot?.supply ?? onChainSupply ?? token?.totalSupply ?? 0;

  const refreshTrades = useCallback(async () => {
    const fresh = await fetchTrades(mint);
    setTrades(fresh);
  }, [mint, setTrades]);

  const handleBuy = async () => {
    if (!program || !publicKey || !buyAmount) return;
    setBuyStatus("loading");
    setTxError(null);

    try {
      const solAmount = parseFloat(buyAmount);
      const lamports = new BN(Math.floor(solAmount * 1e9));
      const mintPubkey = new PublicKey(mint);

      const { txSig } = await buyTokens(program, publicKey, mintPubkey, lamports);

      await recordTrade({
        tokenMint: mint,
        traderAddress: publicKey.toBase58(),
        side: "buy",
        amount: solAmount,
        txSignature: txSig,
        solAmount,
        price: displayPrice,
      });

      setBuyStatus("success");
      setBuyAmount("");
      await Promise.all([refreshOnChainData(), refreshTrades()]);
      setTimeout(() => setBuyStatus("idle"), 3000);
    } catch (err: unknown) {
      setBuyStatus("error");
      setTxError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  const handleSell = async () => {
    if (!program || !publicKey || !sellAmount) return;
    setSellStatus("loading");
    setTxError(null);

    try {
      const tokenAmount = parseInt(sellAmount, 10);
      const mintPubkey = new PublicKey(mint);

      const txSig = await sellTokens(program, publicKey, mintPubkey, new BN(tokenAmount));

      await recordTrade({
        tokenMint: mint,
        traderAddress: publicKey.toBase58(),
        side: "sell",
        amount: tokenAmount,
        txSignature: txSig,
        price: displayPrice,
      });

      setSellStatus("success");
      setSellAmount("");
      await Promise.all([refreshOnChainData(), refreshTrades()]);
      setTimeout(() => setSellStatus("idle"), 3000);
    } catch (err: unknown) {
      setSellStatus("error");
      setTxError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  const tokenBalance = buyerRecord
    ? buyerRecord.totalBought.toNumber()
    : 0;

  const inputClass = "w-full bg-bg arcade-border px-4 py-3 text-xs text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors disabled:opacity-50";

  if (loading) {
    return (
      <main className="min-h-screen pt-20 pb-16 px-6 flex items-center justify-center">
        <p className="text-[10px] font-display text-text-muted animate-blink">LOADING...</p>
      </main>
    );
  }

  if (error || !token) {
    return (
      <main className="min-h-screen pt-20 pb-16 px-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xs font-display text-error neon-text-subtle mb-3 leading-relaxed">
            TOKEN NOT FOUND
          </h1>
          <p className="text-xs text-text-muted font-mono mb-6">
            <span className="text-primary">&gt; </span>
            No data for {formatAddress(mint, 8)}.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">[ BACK TO DASHBOARD ]</Button>
          </Link>
        </div>
      </main>
    );
  }

  const score = deployer?.reputationScore ?? token.deployer?.reputationScore ?? 50;
  const grade = getReputationGrade(score);
  const tier = token.collateralTier || "Bronze";
  const collateralSol = tier === "Diamond" ? 25 : tier === "Gold" ? 10 : tier === "Silver" ? 5 : 1;
  const progress = priceSnapshot?.bondingCurveProgress
    ?? (curveData
      ? Math.min(100, Math.floor((curveData.reserveBalance.toNumber() / (69_000 * 1e9)) * 100))
      : token.bondingCurveProgress);

  return (
    <main className="min-h-screen pt-20 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Token header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div>
              <h1 className="text-sm md:text-base font-display text-text-primary leading-relaxed">
                {token.name}
              </h1>
              <p className="text-xs font-mono text-text-muted">
                ${token.symbol}
              </p>
            </div>
            <div className="flex gap-2 sm:ml-auto">
              <Badge label={grade} variant="reputation" />
              <Badge label={tier} variant="collateral" />
            </div>
          </div>
          <p className="text-xs text-text-secondary mb-4">{token.description}</p>
          <div className="flex items-center gap-2 text-[10px] text-text-muted font-mono">
            <span>Deployer:</span>
            <Link
              href={`/deployer/${token.deployerAddress}`}
              className="text-primary hover:text-primary/80 transition-colors neon-text-subtle"
            >
              {formatAddress(token.deployerAddress)}
            </Link>
            <span className="mx-1">|</span>
            <span>{formatTimeAgo(token.createdAt)}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-4">
            <Card padding="lg">
              <h3 className="text-[8px] font-display text-text-muted mb-3 tracking-wider">PRICE CHART</h3>
              <BondingCurveChart
                trades={storeTrades}
                currentPrice={displayPrice}
              />
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card padding="sm">
                <p className="text-[8px] font-display text-text-muted mb-1 tracking-wider">PRICE</p>
                <p className="text-sm font-score text-text-primary neon-text-subtle">
                  {displayPrice.toFixed(6)}
                </p>
              </Card>
              <Card padding="sm">
                <p className="text-[8px] font-display text-text-muted mb-1 tracking-wider">SUPPLY</p>
                <p className="text-sm font-score text-text-primary neon-text-subtle">
                  {formatCompact(displaySupply)}
                </p>
              </Card>
              <Card padding="sm">
                <p className="text-[8px] font-display text-text-muted mb-1 tracking-wider">RESERVE</p>
                <p className="text-sm font-score text-text-primary neon-text-subtle">
                  {curveData
                    ? formatSol(curveData.reserveBalance.toNumber() / 1e9)
                    : "\u2014"}
                </p>
              </Card>
              <Card padding="sm">
                <p className="text-[8px] font-display text-text-muted mb-1 tracking-wider">COLLATERAL</p>
                <p className="text-sm font-score text-text-primary neon-text-subtle">
                  {formatSol(collateralSol)}
                </p>
              </Card>
            </div>

            <Card>
              <h3 className="text-[8px] font-display text-text-muted mb-3 tracking-wider">BONDING CURVE</h3>
              <ProgressBar value={progress} />
              <p className="text-[10px] text-text-muted mt-2 font-mono">
                <span className="text-primary">&gt; </span>
                {progress >= 100
                  ? "Curve complete. Token graduated to DEX."
                  : `${100 - progress}% until graduation.`}
              </p>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {connected && tokenBalance > 0 && (
              <Card padding="sm">
                <p className="text-[8px] font-display text-text-muted mb-1 tracking-wider">YOUR BAG</p>
                <p className="text-lg font-score text-text-primary neon-text-subtle">
                  {tokenBalance.toLocaleString()} tokens
                </p>
              </Card>
            )}

            <Card>
              <h3 className="text-[8px] font-display text-text-muted mb-3 tracking-wider">BUY</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[8px] font-display text-text-secondary mb-2 block tracking-wider">
                    AMOUNT (SOL)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={buyStatus === "loading"}
                    className={inputClass}
                  />
                </div>
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleBuy}
                  disabled={!connected || buyStatus === "loading" || !buyAmount}
                >
                  {buyStatus === "loading" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> CONFIRMING...
                    </span>
                  ) : buyStatus === "success" ? (
                    "+1UP!"
                  ) : !connected ? (
                    "CONNECT WALLET"
                  ) : (
                    `[ BUY $${token.symbol} ]`
                  )}
                </Button>
              </div>
            </Card>

            <Card>
              <h3 className="text-[8px] font-display text-text-muted mb-3 tracking-wider">SELL</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[8px] font-display text-text-secondary mb-2 block tracking-wider">
                    AMOUNT (TOKENS)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    placeholder="0"
                    disabled={sellStatus === "loading"}
                    className={inputClass}
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSell}
                  disabled={!connected || sellStatus === "loading" || !sellAmount}
                >
                  {sellStatus === "loading" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> CONFIRMING...
                    </span>
                  ) : sellStatus === "success" ? (
                    "SOLD!"
                  ) : !connected ? (
                    "CONNECT WALLET"
                  ) : (
                    `[ SELL $${token.symbol} ]`
                  )}
                </Button>
              </div>
            </Card>

            {txError && (
              <Card>
                <p className="text-[10px] text-error font-mono neon-text-subtle">
                  <span className="text-error">&gt; </span>{txError}
                </p>
              </Card>
            )}

            {(deployer || token.deployer) && (
              <Card>
                <h3 className="text-[8px] font-display text-text-muted mb-3 tracking-wider">DEPLOYER</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-muted">Address</span>
                    <Link
                      href={`/deployer/${token.deployerAddress}`}
                      className="font-mono text-[10px] text-primary hover:text-primary/80 transition-colors neon-text-subtle"
                    >
                      {formatAddress(token.deployerAddress)}
                    </Link>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-muted">Reputation</span>
                    <span className="font-score text-sm text-text-primary neon-text-subtle">
                      {score}/100
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-muted">Launches</span>
                    <span className="font-score text-sm text-text-primary">
                      {deployer?.totalLaunches ?? token.deployer?.totalLaunches ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-text-muted">Rug Count</span>
                    <span
                      className={`font-score text-sm ${
                        (deployer?.rugPulls ?? token.deployer?.rugPulls ?? 0) > 0
                          ? "text-error neon-text-subtle"
                          : "text-success neon-text-subtle"
                      }`}
                    >
                      {deployer?.rugPulls ?? token.deployer?.rugPulls ?? 0}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
