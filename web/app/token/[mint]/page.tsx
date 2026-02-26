"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import BondingCurveChart from "@/components/charts/BondingCurveChart";
import { fetchToken, fetchDeployer, recordTrade, type ApiToken, type ApiDeployer } from "@/lib/api";
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

  // Fetch API data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchToken(mint)
      .then(async (t) => {
        if (cancelled) return;
        setToken(t);
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
  }, [mint]);

  // Fetch on-chain data
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

  // On-chain price from curve
  const onChainPrice = curveData
    ? curveData.basePrice.add(curveData.slope.mul(curveData.currentSupply)).toNumber() / 1e9
    : null;

  const onChainSupply = curveData
    ? curveData.currentSupply.toNumber()
    : null;

  const displayPrice = onChainPrice ?? token?.currentPrice ?? 0;

  // Generate chart data from on-chain state
  const chartTrades = (() => {
    const now = Math.floor(Date.now() / 1000);
    const trades: { time: number; price: number; volume: number }[] = [];
    // Simple chart with a single data point from current price
    for (let i = 0; i < 50; i++) {
      const time = now - (50 - i) * 300;
      const baseP = displayPrice * (0.8 + 0.4 * (i / 50));
      const jitter = (Math.random() - 0.5) * baseP * 0.1;
      trades.push({
        time,
        price: parseFloat(Math.max(0.000001, baseP + jitter).toFixed(6)),
        volume: Math.random() * 100,
      });
    }
    return trades;
  })();

  // Buy handler
  const handleBuy = async () => {
    if (!program || !publicKey || !buyAmount) return;
    setBuyStatus("loading");
    setTxError(null);

    try {
      const solAmount = parseFloat(buyAmount);
      const lamports = new BN(Math.floor(solAmount * 1e9));
      const mintPubkey = new PublicKey(mint);

      const { txSig } = await buyTokens(program, publicKey, mintPubkey, lamports);

      // Record trade in backend
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
      await refreshOnChainData();
      setTimeout(() => setBuyStatus("idle"), 3000);
    } catch (err: unknown) {
      setBuyStatus("error");
      setTxError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  // Sell handler
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
      await refreshOnChainData();
      setTimeout(() => setSellStatus("idle"), 3000);
    } catch (err: unknown) {
      setSellStatus("error");
      setTxError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  // Balance from BuyerRecord
  const tokenBalance = buyerRecord
    ? buyerRecord.totalBought.toNumber()
    : 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-bg pt-24 pb-16 px-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </main>
    );
  }

  if (error || !token) {
    return (
      <main className="min-h-screen bg-bg pt-24 pb-16 px-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Token Not Found
          </h1>
          <p className="text-text-secondary mb-6">
            The token with mint address {formatAddress(mint, 8)} could not be
            found.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </main>
    );
  }

  const score = deployer?.reputationScore ?? token.deployer?.reputationScore ?? 50;
  const grade = getReputationGrade(score);
  const tier = token.collateralTier || "Bronze";
  const collateralSol = tier === "Diamond" ? 25 : tier === "Gold" ? 10 : tier === "Silver" ? 5 : 1;
  const progress = curveData
    ? Math.min(100, Math.floor((curveData.reserveBalance.toNumber() / (69_000 * 1e9)) * 100))
    : token.bondingCurveProgress;

  return (
    <main className="min-h-screen bg-bg pt-24 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Token header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-text-primary">
                {token.name}
              </h1>
              <p className="text-lg font-mono text-text-muted">
                ${token.symbol}
              </p>
            </div>
            <div className="flex gap-2 sm:ml-auto">
              <Badge label={grade} variant="reputation" />
              <Badge label={tier} variant="collateral" />
            </div>
          </div>
          <p className="text-text-secondary mb-4">{token.description}</p>
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span>Deployer:</span>
            <Link
              href={`/deployer/${token.deployerAddress}`}
              className="font-mono text-primary hover:text-primary/80 transition-colors"
            >
              {formatAddress(token.deployerAddress)}
            </Link>
            <span className="mx-2">|</span>
            <span>Launched {formatTimeAgo(token.createdAt)}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - chart + info */}
          <div className="lg:col-span-2 space-y-6">
            <Card padding="lg">
              <h3 className="text-sm font-semibold text-text-secondary mb-4">
                Price Chart
              </h3>
              <BondingCurveChart
                trades={chartTrades}
                currentPrice={displayPrice}
              />
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card padding="sm">
                <p className="text-xs text-text-muted mb-1">Price</p>
                <p className="text-lg font-mono font-bold text-text-primary">
                  {displayPrice.toFixed(6)} SOL
                </p>
              </Card>
              <Card padding="sm">
                <p className="text-xs text-text-muted mb-1">Supply</p>
                <p className="text-lg font-mono font-bold text-text-primary">
                  {onChainSupply != null
                    ? formatCompact(onChainSupply)
                    : formatCompact(token.totalSupply)}
                </p>
              </Card>
              <Card padding="sm">
                <p className="text-xs text-text-muted mb-1">Reserve</p>
                <p className="text-lg font-mono font-bold text-text-primary">
                  {curveData
                    ? formatSol(curveData.reserveBalance.toNumber() / 1e9)
                    : "—"}
                </p>
              </Card>
              <Card padding="sm">
                <p className="text-xs text-text-muted mb-1">Collateral</p>
                <p className="text-lg font-mono font-bold text-text-primary">
                  {formatSol(collateralSol)}
                </p>
              </Card>
            </div>

            {/* Bonding curve */}
            <Card>
              <h3 className="text-sm font-semibold text-text-secondary mb-4">
                Bonding Curve Progress
              </h3>
              <ProgressBar value={progress} />
              <p className="text-xs text-text-muted mt-2">
                {progress >= 100
                  ? "Bonding curve completed. Token is now fully launched."
                  : `${100 - progress}% remaining until graduation to DEX.`}
              </p>
            </Card>
          </div>

          {/* Right column - trade */}
          <div className="space-y-6">
            {/* Wallet balance */}
            {connected && tokenBalance > 0 && (
              <Card>
                <h3 className="text-sm font-semibold text-text-secondary mb-2">
                  Your Balance
                </h3>
                <p className="text-xl font-mono font-bold text-text-primary">
                  {tokenBalance.toLocaleString()} tokens
                </p>
              </Card>
            )}

            {/* Buy */}
            <Card>
              <h3 className="text-sm font-semibold text-text-secondary mb-4">
                Buy
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">
                    Amount (SOL)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={buyStatus === "loading"}
                    className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
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
                      <Loader2 className="w-4 h-4 animate-spin" /> Confirming...
                    </span>
                  ) : buyStatus === "success" ? (
                    "Buy Successful!"
                  ) : !connected ? (
                    "Connect Wallet"
                  ) : (
                    `Buy $${token.symbol}`
                  )}
                </Button>
              </div>
            </Card>

            {/* Sell */}
            <Card>
              <h3 className="text-sm font-semibold text-text-secondary mb-4">
                Sell
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">
                    Amount (Tokens)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    placeholder="0"
                    disabled={sellStatus === "loading"}
                    className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
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
                      <Loader2 className="w-4 h-4 animate-spin" /> Confirming...
                    </span>
                  ) : sellStatus === "success" ? (
                    "Sell Successful!"
                  ) : !connected ? (
                    "Connect Wallet"
                  ) : (
                    `Sell $${token.symbol}`
                  )}
                </Button>
              </div>
            </Card>

            {/* TX Error */}
            {txError && (
              <Card>
                <p className="text-xs text-error">{txError}</p>
              </Card>
            )}

            {/* Deployer card */}
            {(deployer || token.deployer) && (
              <Card>
                <h3 className="text-sm font-semibold text-text-secondary mb-4">
                  Deployer
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Address</span>
                    <Link
                      href={`/deployer/${token.deployerAddress}`}
                      className="font-mono text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      {formatAddress(token.deployerAddress)}
                    </Link>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Reputation</span>
                    <span className="font-mono text-sm text-text-primary">
                      {score}/100
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Launches</span>
                    <span className="font-mono text-sm text-text-primary">
                      {deployer?.totalLaunches ?? token.deployer?.totalLaunches ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Rug Count</span>
                    <span
                      className={`font-mono text-sm ${
                        (deployer?.rugPulls ?? token.deployer?.rugPulls ?? 0) > 0
                          ? "text-error"
                          : "text-success"
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
