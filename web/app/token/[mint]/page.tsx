"use client";

import { use, useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import BondingCurveChart from "@/components/charts/BondingCurveChart";
import { fetchToken, fetchDeployer, fetchTrades, recordTrade, fetchComments, postComment, type ApiToken, type ApiDeployer, type ApiComment } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useTokenSubscription } from "@/hooks/useSocket";
import {
  useAnchorProgram,
  fetchBondingCurve,
  getCurvePDA,
  buyTokens,
  sellTokens,
  claimFees,
  TOKEN_DECIMALS,
  type BondingCurveData,
} from "@/lib/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import {
  formatSol,
  formatCompact,
  formatAddress,
  formatTimeAgo,
  formatPrice,
  getReputationGrade,
} from "@/lib/utils";
import { Loader2, Globe, ExternalLink, Copy, Check } from "lucide-react";

type TxStatus = "idle" | "loading" | "success" | "error";

/** Parse social links encoded in description as <!--social:{...}--> */
function parseSocial(desc: string): {
  clean: string;
  social: { website?: string; twitter?: string; telegram?: string } | null;
} {
  const match = desc?.match(/<!--social:(.*?)-->/);
  if (!match) return { clean: desc || "", social: null };
  try {
    const social = JSON.parse(match[1]);
    const clean = desc.replace(/\n?<!--social:.*?-->/, "").trim();
    return { clean, social };
  } catch {
    return { clean: desc || "", social: null };
  }
}

export default function TokenDetailPage({
  params,
}: {
  params: Promise<{ mint: string }>;
}) {
  const { mint } = use(params);
  const { publicKey, connected, signMessage } = useWallet();
  const { program, connection } = useAnchorProgram();

  // Subscribe to real-time trade events for this token
  useTokenSubscription(mint);

  const [token, setToken] = useState<ApiToken | null>(null);
  const [deployer, setDeployer] = useState<ApiDeployer | null>(null);
  const [curveData, setCurveData] = useState<BondingCurveData | null>(null);
  const [splBalance, setSplBalance] = useState(0); // whole tokens (ui amount)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [buyStatus, setBuyStatus] = useState<TxStatus>("idle");
  const [sellStatus, setSellStatus] = useState<TxStatus>("idle");
  const [txError, setTxError] = useState<string | null>(null);
  const [slippageBps, setSlippageBps] = useState(100); // 1% default
  const [showSlippage, setShowSlippage] = useState(false);

  // Comments
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentStatus, setCommentStatus] = useState<TxStatus>("idle");

  // Claim fees
  const [claimStatus, setClaimStatus] = useState<TxStatus>("idle");

  // Tabs & copy
  const [activeTab, setActiveTab] = useState<"trades" | "comments">("trades");
  const [copied, setCopied] = useState<string | null>(null);

  // Zustand stores
  const storeTrades = useAppStore((s) => s.trades);
  const setTrades = useAppStore((s) => s.setTrades);
  const priceSnapshot = useAppStore((s) => s.prices.get(mint));
  const solPrice = useAppStore((s) => s.solPrice);
  const setSolPrice = useAppStore((s) => s.setSolPrice);

  // Fallback: fetch SOL price from Jupiter if WebSocket hasn't provided it
  useEffect(() => {
    if (solPrice > 0) return;
    const SOL_MINT = "So11111111111111111111111111111111111111112";
    fetch(`https://api.jup.ag/price/v2?ids=${SOL_MINT}`)
      .then((r) => r.json())
      .then((json: { data?: Record<string, { price?: string }> }) => {
        const p = json?.data?.[SOL_MINT]?.price;
        if (p) setSolPrice(parseFloat(p));
      })
      .catch(() => { /* silent */ });
  }, [solPrice, setSolPrice]);

  // Derive pool (bonding curve) PDA
  const poolAddress = useMemo(() => {
    try {
      const [pda] = getCurvePDA(new PublicKey(mint));
      return pda.toBase58();
    } catch { return null; }
  }, [mint]);

  // Explorer URL helper — Solana Explorer for devnet, Solscan for mainnet
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
  const isMainnet = network === "mainnet";
  const explorerUrl = (type: "tx" | "address" | "token", value: string) =>
    isMainnet
      ? `https://solscan.io/${type}/${value}`
      : `https://explorer.solana.com/${type === "token" ? "address" : type}/${value}?cluster=devnet`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([fetchToken(mint), fetchTrades(mint), fetchComments(mint)])
      .then(async ([t, tradeData, commentData]) => {
        if (cancelled) return;
        setToken(t);
        setTrades(tradeData);
        setComments(commentData);
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
    } catch {
      // On-chain data might not exist yet
    }
  }, [program, mint]);

  useEffect(() => {
    refreshOnChainData();
  }, [refreshOnChainData]);

  // Fetch actual SPL token balance from ATA
  useEffect(() => {
    if (!publicKey || !connection) return;
    try {
      const mintPubkey = new PublicKey(mint);
      const ata = getAssociatedTokenAddressSync(mintPubkey, publicKey);
      connection
        .getTokenAccountBalance(ata)
        .then((res) => setSplBalance(res.value.uiAmount || 0))
        .catch(() => setSplBalance(0));
    } catch {
      setSplBalance(0);
    }
  }, [publicKey, connection, mint, buyStatus, sellStatus]);

  // Price calculation (normalized to match on-chain)
  const onChainPrice = curveData
    ? curveData.basePrice
        .add(curveData.slope.mul(curveData.currentSupply.div(new BN(10 ** TOKEN_DECIMALS))))
        .toNumber() / 1e9
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

  const handleComment = async () => {
    if (!publicKey || !signMessage || !commentText.trim()) return;
    setCommentStatus("loading");
    try {
      const message = `FYRST comment on ${mint}: ${commentText.trim()}`;
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);

      const newComment = await postComment({
        tokenMint: mint,
        walletAddress: publicKey.toBase58(),
        content: commentText.trim(),
        signature,
      });
      setComments((prev) => [newComment, ...prev]);
      setCommentText("");
      setCommentStatus("success");
      setTimeout(() => setCommentStatus("idle"), 2000);
    } catch (err: unknown) {
      setCommentStatus("error");
      setTxError(err instanceof Error ? err.message : "Failed to post comment");
      setTimeout(() => setCommentStatus("idle"), 3000);
    }
  };

  const handleBuy = async () => {
    if (!program || !publicKey || !buyAmount) return;

    const solAmount = parseFloat(buyAmount);
    if (!solAmount || solAmount <= 0) {
      setTxError("Enter a valid SOL amount");
      return;
    }

    // Confirm large trades (> 1 SOL)
    if (solAmount >= 1 && !window.confirm(
      `You are about to buy ${solAmount} SOL worth of $${token?.symbol}.\n\nFee: ${(solAmount * 0.01).toFixed(4)} SOL (1%)\nSlippage: ${(slippageBps / 100).toFixed(1)}%\n\nContinue?`
    )) return;

    setBuyStatus("loading");
    setTxError(null);

    try {
      const lamports = new BN(Math.floor(solAmount * 1e9));
      const mintPubkey = new PublicKey(mint);

      const txSig = await buyTokens(program, publicKey, mintPubkey, lamports, slippageBps);

      // On-chain succeeded — clear input immediately
      setBuyAmount("");

      // Refresh on-chain data to get post-buy price
      const freshCurve = await fetchBondingCurve(program, mintPubkey);
      const postBuyPrice = freshCurve
        ? freshCurve.basePrice.add(freshCurve.slope.mul(freshCurve.currentSupply.div(new BN(10 ** TOKEN_DECIMALS)))).toNumber() / 1e9
        : displayPrice;

      // Record trade — don't fail the whole flow if API is down
      try {
        await recordTrade({
          tokenMint: mint,
          traderAddress: publicKey.toBase58(),
          side: "buy",
          amount: solAmount,
          txSignature: txSig,
          solAmount,
          price: postBuyPrice,
        });
      } catch {
        // API recording failed but on-chain trade succeeded — continue
      }

      if (freshCurve) setCurveData(freshCurve);
      setBuyStatus("success");
      await refreshTrades();
      setTimeout(() => setBuyStatus("idle"), 3000);
    } catch (err: unknown) {
      setBuyStatus("error");
      setTxError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  const handleSell = async () => {
    if (!program || !publicKey || !sellAmount) return;

    const wholeTokens = parseFloat(sellAmount);
    if (!wholeTokens || wholeTokens <= 0) {
      setTxError("Enter a valid token amount");
      return;
    }

    // Confirm large sells (> 50% of balance or > 1 SOL equivalent)
    const estimatedSolValue = wholeTokens * displayPrice;
    if (estimatedSolValue >= 1 && !window.confirm(
      `You are about to sell ${wholeTokens.toLocaleString()} $${token?.symbol} (~${estimatedSolValue.toFixed(4)} SOL).\n\nFee: ${(estimatedSolValue * 0.01).toFixed(4)} SOL (1%)\nSlippage: ${(slippageBps / 100).toFixed(1)}%\n\nContinue?`
    )) return;

    setSellStatus("loading");
    setTxError(null);

    try {
      // Convert whole tokens → atomic units (6 decimals)
      const atomicAmount = Math.floor(wholeTokens * 10 ** TOKEN_DECIMALS);
      const mintPubkey = new PublicKey(mint);

      const txSig = await sellTokens(program, publicKey, mintPubkey, new BN(atomicAmount), slippageBps);

      // On-chain succeeded — clear input immediately
      setSellAmount("");

      // Refresh on-chain data BEFORE recording trade so we get the post-sell price
      const freshCurve = await fetchBondingCurve(program, mintPubkey);
      const postSellPrice = freshCurve
        ? freshCurve.basePrice.add(freshCurve.slope.mul(freshCurve.currentSupply.div(new BN(10 ** TOKEN_DECIMALS)))).toNumber() / 1e9
        : displayPrice;

      // Estimate SOL received for display
      const estimatedSol = wholeTokens * displayPrice * 0.99; // 1% fee

      // Record trade — don't fail the whole flow if API is down
      try {
        await recordTrade({
          tokenMint: mint,
          traderAddress: publicKey.toBase58(),
          side: "sell",
          amount: wholeTokens,
          txSignature: txSig,
          solAmount: estimatedSol,
          price: postSellPrice,
        });
      } catch {
        // API recording failed but on-chain trade succeeded — continue
      }

      setCurveData(freshCurve);
      setSellStatus("success");
      await refreshTrades();
      setTimeout(() => setSellStatus("idle"), 3000);
    } catch (err: unknown) {
      setSellStatus("error");
      setTxError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  const handleClaimFees = async () => {
    if (!program || !publicKey || !curveData) return;
    setClaimStatus("loading");
    setTxError(null);
    try {
      await claimFees(program, publicKey, new PublicKey(mint));
      setClaimStatus("success");
      await refreshOnChainData();
      setTimeout(() => setClaimStatus("idle"), 3000);
    } catch (err: unknown) {
      setClaimStatus("error");
      setTxError(err instanceof Error ? err.message : "Claim failed");
      setTimeout(() => setClaimStatus("idle"), 3000);
    }
  };

  // Is current wallet the deployer of this token?
  const isDeployer = publicKey && curveData && publicKey.toBase58() === curveData.deployer.toBase58();
  // Progressive fee unlock: unlocked = (totalDeployerFees * maxReserveReached) / GRADUATION_THRESHOLD
  const GRADUATION_THRESHOLD_LAMPORTS = 85_000_000_000;
  const claimableFeesLamports = (() => {
    if (!curveData) return 0;
    const total = curveData.totalDeployerFees?.toNumber() ?? 0;
    const maxReserve = curveData.maxReserveReached?.toNumber() ?? 0;
    const claimed = curveData.claimedDeployerFees?.toNumber() ?? 0;
    if (total === 0 || maxReserve === 0) return 0;
    const unlocked = Math.floor((total * maxReserve) / GRADUATION_THRESHOLD_LAMPORTS);
    return Math.max(unlocked - claimed, 0);
  })();

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
  const collateralSol = tier === "Diamond" ? 25 : tier === "Gold" ? 10 : tier === "Silver" ? 5 : 0.01;
  const progress = priceSnapshot?.bondingCurveProgress
    ?? (curveData
      ? Math.min(100, Math.floor((curveData.reserveBalance.toNumber() / (69_000 * 1e9)) * 100))
      : token.bondingCurveProgress);

  const { clean: cleanDescription, social: socialLinks } = parseSocial(token.description);

  const sellPctClass = "text-[8px] font-display px-2 py-1 border border-border text-text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-50";

  return (
    <main className="min-h-screen pt-20 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Token header */}
        <div className="mb-8">
          <div className="flex gap-4 mb-4">
            {/* Left: info */}
            <div className="flex-1 min-w-0">
              <div className="flex gap-2 mb-2">
                <Badge label={grade} variant="reputation" />
                <Badge label={tier} variant="collateral" />
              </div>
              {cleanDescription && (
                <p className="text-xs text-text-secondary mb-3">{cleanDescription}</p>
              )}
              {/* Social links */}
              {socialLinks && (socialLinks.website || socialLinks.twitter || socialLinks.telegram) && (
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  {socialLinks.website && (
                    <a href={socialLinks.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-mono transition-colors">
                      <Globe className="w-3 h-3" /> Website <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {socialLinks.twitter && (
                    <a href={socialLinks.twitter.startsWith("http") ? socialLinks.twitter : `https://x.com/${socialLinks.twitter.replace("@", "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-mono transition-colors">
                      𝕏 {socialLinks.twitter.startsWith("http") ? "Twitter" : socialLinks.twitter} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {socialLinks.telegram && (
                    <a href={socialLinks.telegram.startsWith("http") ? socialLinks.telegram : `https://t.me/${socialLinks.telegram.replace("@", "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-mono transition-colors">
                      TG {socialLinks.telegram.startsWith("http") ? "Telegram" : socialLinks.telegram} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 text-[10px] text-text-muted font-mono mb-3">
                <span>Deployer:</span>
                <Link href={`/deployer/${token.deployerAddress}`}
                  className="text-primary hover:text-primary/80 transition-colors neon-text-subtle">
                  {formatAddress(token.deployerAddress)}
                </Link>
                <span className="mx-1">|</span>
                <span>{formatTimeAgo(token.createdAt)}</span>
              </div>
              {/* Copy buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(mint, "ca")}
                  className="flex items-center gap-1.5 text-[9px] font-display px-3 py-1.5 border border-border text-text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  {copied === "ca" ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                  {copied === "ca" ? "COPIED!" : "COPY CA"}
                </button>
                {poolAddress && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(poolAddress, "pool")}
                    className="flex items-center gap-1.5 text-[9px] font-display px-3 py-1.5 border border-border text-text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer"
                  >
                    {copied === "pool" ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                    {copied === "pool" ? "COPIED!" : "COPY POOL"}
                  </button>
                )}
                <a
                  href={explorerUrl("token", mint)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[9px] font-display px-3 py-1.5 border border-border text-text-muted hover:border-primary hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> {isMainnet ? "SOLSCAN" : "EXPLORER"}
                </a>
              </div>
            </div>
            {/* Right: image + name */}
            <div className="flex-shrink-0 text-right">
              {token.imageUrl && (
                <img
                  src={token.imageUrl}
                  alt={token.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 object-cover arcade-border ml-auto mb-2"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <h1 className="text-sm md:text-base font-display text-text-primary leading-relaxed">
                {token.name}
              </h1>
              <p className="text-xs font-mono text-text-muted">
                ${token.symbol}
              </p>
            </div>
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
                totalSupply={displaySupply}
                solPrice={solPrice}
              />
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card padding="sm">
                <p className="text-[8px] font-display text-text-muted mb-1 tracking-wider">PRICE (SOL)</p>
                <p className="text-sm font-score text-text-primary neon-text-subtle">
                  {formatPrice(displayPrice)}
                </p>
              </Card>
              <Card padding="sm">
                <p className="text-[8px] font-display text-text-muted mb-1 tracking-wider">MCAP (USD)</p>
                <p className="text-sm font-score text-text-primary neon-text-subtle">
                  {solPrice > 0
                    ? `$${formatCompact(displayPrice * (displaySupply / 1e6) * solPrice)}`
                    : `${formatCompact(displayPrice * (displaySupply / 1e6))} SOL`}
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

            {/* Trades / Comments tabs */}
            <Card padding="lg">
              <div className="flex gap-4 mb-4 border-b border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab("trades")}
                  className={`text-[9px] font-display pb-2 transition-colors cursor-pointer ${
                    activeTab === "trades"
                      ? "text-primary border-b-2 border-primary"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  TRADES ({storeTrades.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("comments")}
                  className={`text-[9px] font-display pb-2 transition-colors cursor-pointer ${
                    activeTab === "comments"
                      ? "text-primary border-b-2 border-primary"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  COMMENTS ({comments.length})
                </button>
              </div>

              {activeTab === "trades" ? (
                <div className="max-h-96 overflow-y-auto">
                  {storeTrades.length > 0 ? (
                    <table className="w-full text-[9px] font-mono">
                      <thead>
                        <tr className="text-text-muted text-left border-b border-border">
                          <th className="pb-2 font-display tracking-wider">TYPE</th>
                          <th className="pb-2 font-display tracking-wider">WALLET</th>
                          <th className="pb-2 font-display tracking-wider text-right">AMOUNT</th>
                          <th className="pb-2 font-display tracking-wider text-right">TIME</th>
                          <th className="pb-2 font-display tracking-wider text-right">TX</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...storeTrades].reverse().map((t) => (
                          <tr key={t.id || t.txSignature} className="border-b border-border/30 hover:bg-primary/5">
                            <td className="py-2">
                              <span className={`font-display ${t.side === "buy" ? "text-success" : "text-error"}`}>
                                {t.side === "buy" ? "BUY" : "SELL"}
                              </span>
                            </td>
                            <td className="py-2">
                              <a
                                href={explorerUrl("address", t.traderAddress)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80 transition-colors"
                              >
                                {formatAddress(t.traderAddress)}
                              </a>
                            </td>
                            <td className="py-2 text-right text-text-primary">
                              {t.side === "buy"
                                ? `${(t.amount || t.totalSol || 0).toFixed(4)} SOL`
                                : `${formatCompact(t.amount || 0)} tokens`}
                            </td>
                            <td className="py-2 text-right text-text-muted">
                              {formatTimeAgo(t.createdAt)}
                            </td>
                            <td className="py-2 text-right">
                              {t.txSignature && (
                                <a
                                  href={explorerUrl("tx", t.txSignature)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:text-primary/80 transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3 inline" />
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-[10px] text-text-muted font-display text-center py-4">
                      NO TRADES YET
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {connected && signMessage && (
                    <div className="mb-4 space-y-2">
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Say something... (wallet-signed)"
                        maxLength={500}
                        rows={2}
                        disabled={commentStatus === "loading"}
                        className={`${inputClass} resize-none`}
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] text-text-muted font-mono">
                          {commentText.length}/500
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleComment}
                          disabled={commentStatus === "loading" || !commentText.trim()}
                        >
                          {commentStatus === "loading" ? "SIGNING..." : commentStatus === "success" ? "POSTED!" : "[ POST ]"}
                        </Button>
                      </div>
                    </div>
                  )}
                  {comments.length > 0 ? (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {comments.map((c) => (
                        <div key={c.id} className="arcade-border p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-mono text-primary neon-text-subtle">
                              {formatAddress(c.walletAddress)}
                            </span>
                            <span className="text-[8px] text-text-muted font-mono">
                              {formatTimeAgo(c.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary font-mono">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-text-muted font-display text-center py-4">
                      NO COMMENTS YET
                    </p>
                  )}
                </>
              )}
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {connected && splBalance > 0 && (
              <Card padding="sm">
                <p className="text-[8px] font-display text-text-muted mb-1 tracking-wider">YOUR BAG</p>
                <p className="text-lg font-score text-text-primary neon-text-subtle">
                  {splBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens
                </p>
                <p className="text-[9px] text-text-muted font-mono mt-1">
                  ~{formatSol(splBalance * displayPrice)} SOL
                </p>
              </Card>
            )}

            {/* Slippage settings */}
            <Card padding="sm">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-display text-text-muted tracking-wider">SLIPPAGE</span>
                <button
                  type="button"
                  onClick={() => setShowSlippage(!showSlippage)}
                  className="text-[9px] font-mono text-primary hover:text-primary/80 transition-colors cursor-pointer"
                >
                  {(slippageBps / 100).toFixed(1)}% {showSlippage ? "[-]" : "[+]"}
                </button>
              </div>
              {showSlippage && (
                <div className="mt-2 flex gap-2">
                  {[50, 100, 300, 500].map((bps) => (
                    <button
                      key={bps}
                      type="button"
                      onClick={() => setSlippageBps(bps)}
                      className={`text-[8px] font-display px-2 py-1 border transition-colors cursor-pointer ${
                        slippageBps === bps
                          ? "text-primary border-primary bg-primary/10"
                          : "text-text-muted border-border hover:border-border-hover"
                      }`}
                    >
                      {(bps / 100).toFixed(1)}%
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    step={1}
                    value={slippageBps}
                    onChange={(e) => setSlippageBps(Math.max(1, Math.min(5000, Number(e.target.value))))}
                    className="w-16 bg-bg arcade-border px-2 py-1 text-[8px] text-text-primary font-mono focus:outline-none focus:border-primary"
                  />
                  <span className="text-[8px] text-text-muted font-mono self-center">bps</span>
                </div>
              )}
            </Card>

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
                    step={0.001}
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
                {connected && splBalance > 0 && (
                  <p className="text-[9px] text-text-muted font-mono">
                    Balance: {splBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} tokens
                  </p>
                )}
                <div>
                  <label className="text-[8px] font-display text-text-secondary mb-2 block tracking-wider">
                    AMOUNT (TOKENS)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    placeholder="0"
                    disabled={sellStatus === "loading"}
                    className={inputClass}
                  />
                </div>
                {/* Sell percentage buttons */}
                {connected && splBalance > 0 && (
                  <div className="flex gap-2">
                    {[25, 50, 75, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        disabled={sellStatus === "loading"}
                        onClick={() => {
                          const amount = pct === 100
                            ? splBalance
                            : Math.floor(splBalance * pct / 100 * 1e6) / 1e6;
                          setSellAmount(String(amount));
                        }}
                        className={sellPctClass}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                )}
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
                  {/* Deployer fee claiming */}
                  {isDeployer && claimableFeesLamports > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-text-muted">Claimable Fees</span>
                        <span className="font-score text-sm text-success neon-text-subtle">
                          {formatSol(claimableFeesLamports / 1e9)} SOL
                        </span>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        onClick={handleClaimFees}
                        disabled={claimStatus === "loading"}
                      >
                        {claimStatus === "loading" ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" /> CLAIMING...
                          </span>
                        ) : claimStatus === "success" ? (
                          "CLAIMED!"
                        ) : (
                          "[ CLAIM FEES ]"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
