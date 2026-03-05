"use client";

import { use, useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ProgressBar from "@/components/ui/ProgressBar";
import ConfirmModal from "@/components/ui/ConfirmModal";
import BondingCurveChart from "@/components/charts/BondingCurveChart";
import type { Candle } from "@/components/charts/BondingCurveChart";
import { fetchToken, fetchDeployer, fetchTrades, fetchComments, postComment, type ApiToken, type ApiDeployer, type ApiComment } from "@/lib/api";
import { useRaydiumPrice } from "@/hooks/useRaydiumPrice";
import { fetchGeckoOHLCV, fetchGeckoTrades, type DexCandle, type DexTrade } from "@/lib/raydium-data";
import { useAppStore } from "@/lib/store";
import { useTokenSubscription } from "@/hooks/useSocket";
import { getSocket } from "@/lib/socket";
import {
  useAnchorProgram,
  fetchBondingCurve,
  getCurvePDA,
  buyTokens,
  sellTokens,
  raydiumBuy,
  raydiumSell,
  claimFees,
  graduateToDex,
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
  fetchSolPrice,
} from "@/lib/utils";
import { Loader2, Globe, ExternalLink, Copy, Check, ChevronDown, TrendingUp, Shield, GraduationCap, Percent, ShieldAlert, Star } from "lucide-react";

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
  const [solBalance, setSolBalance] = useState<number | null>(null);
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

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    rows: { label: string; value: string }[];
    onConfirm: () => void;
  } | null>(null);

  // Tabs & copy
  const [activeTab, setActiveTab] = useState<"trades" | "comments">("trades");
  const [copied, setCopied] = useState<string | null>(null);

  // Zustand stores
  const storeTrades = useAppStore((s) => s.trades);
  const setTrades = useAppStore((s) => s.setTrades);
  const priceSnapshot = useAppStore((s) => s.prices.get(mint));
  const solPrice = useAppStore((s) => s.solPrice);
  const setSolPrice = useAppStore((s) => s.setSolPrice);

  // Fetch SOL price: Jupiter → CoinGecko → Binance → Helius fallback chain
  useEffect(() => {
    if (solPrice > 0) return;
    fetchSolPrice().then((p) => { if (p) setSolPrice(p); });
  }, [solPrice, setSolPrice]);

  // ---------------------------------------------------------------------------
  // DEX mode: Raydium price polling + GeckoTerminal data
  // ---------------------------------------------------------------------------
  const isDexMode = curveData?.dexMigrated === true;
  const isDevnet = process.env.NEXT_PUBLIC_DEVNET !== "false";

  const { raydiumPrice, wsolReserve, priceHistory } = useRaydiumPrice({
    connection,
    tokenMint: mint,
    enabled: isDexMode,
    intervalMs: 5_000,
  });

  // GeckoTerminal candles + trades (mainnet only, 30s polling)
  const [dexCandles, setDexCandles] = useState<DexCandle[]>([]);
  const [dexTrades, setDexTrades] = useState<DexTrade[]>([]);

  // Raydium pool address for GeckoTerminal queries
  const raydiumPoolAddress = useMemo(() => {
    if (!isDexMode || !curveData?.raydiumPool) return null;
    try {
      return curveData.raydiumPool.toBase58();
    } catch { return null; }
  }, [isDexMode, curveData?.raydiumPool]);

  useEffect(() => {
    if (!isDexMode || isDevnet || !raydiumPoolAddress) return;
    let cancelled = false;

    const fetchDex = async () => {
      const [candles, trades] = await Promise.all([
        fetchGeckoOHLCV(raydiumPoolAddress, "1m", 100),
        fetchGeckoTrades(raydiumPoolAddress),
      ]);
      if (!cancelled) {
        setDexCandles(candles);
        setDexTrades(trades);
      }
    };

    fetchDex();
    const timer = setInterval(fetchDex, 30_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [isDexMode, isDevnet, raydiumPoolAddress]);

  // Build external candles for chart: mainnet = GeckoTerminal, devnet = polling history
  const externalCandles = useMemo<Candle[] | undefined>(() => {
    if (!isDexMode) return undefined;

    // Mainnet: GeckoTerminal OHLCV
    if (!isDevnet && dexCandles.length > 0) {
      return dexCandles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
    }

    // Devnet: aggregate polling priceHistory into 5-second candles
    if (priceHistory.length > 0) {
      const bucketMs = 5_000;
      const candles: Candle[] = [];
      let bucket = Math.floor(priceHistory[0].time / (bucketMs / 1000)) * (bucketMs / 1000);
      let o = priceHistory[0].close, h = o, l = o, c = o;

      for (const p of priceHistory) {
        const b = Math.floor(p.time / (bucketMs / 1000)) * (bucketMs / 1000);
        if (b !== bucket) {
          candles.push({ time: bucket, open: o, high: h, low: l, close: c });
          bucket = b;
          o = c;
          h = Math.max(o, p.close);
          l = Math.min(o, p.close);
          c = p.close;
        } else {
          h = Math.max(h, p.close);
          l = Math.min(l, p.close);
          c = p.close;
        }
      }
      candles.push({ time: bucket, open: o, high: h, low: l, close: c });
      return candles;
    }

    return undefined;
  }, [isDexMode, isDevnet, dexCandles, priceHistory]);

  // Merge store trades + DEX trades (deduplicated by txSignature)
  const allTrades = useMemo(() => {
    if (!isDexMode || dexTrades.length === 0) return storeTrades;

    const seen = new Set(storeTrades.map((t) => t.txSignature).filter(Boolean));
    const merged = [...storeTrades];
    for (const dt of dexTrades) {
      if (dt.txSignature && seen.has(dt.txSignature)) continue;
      merged.push({
        id: dt.id,
        tokenMint: mint,
        traderAddress: dt.traderAddress,
        side: dt.side,
        amount: dt.amount,
        price: dt.price,
        totalSol: dt.totalSol,
        txSignature: dt.txSignature,
        createdAt: dt.createdAt,
      });
    }
    return merged;
  }, [isDexMode, storeTrades, dexTrades, mint]);

  // Derive pool (bonding curve) PDA
  const poolAddress = useMemo(() => {
    try {
      const [pda] = getCurvePDA(new PublicKey(mint));
      return pda.toBase58();
    } catch { return null; }
  }, [mint]);
  const explorerUrl = (type: "tx" | "address" | "token", value: string) =>
    isDevnet
      ? `https://explorer.solana.com/${type === "token" ? "address" : type}/${value}?cluster=devnet`
      : `https://solscan.io/${type}/${value}`;

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

  // Auto-refresh on-chain data when trades happen or DEX migration completes
  useEffect(() => {
    const socket = getSocket();
    const handleRefresh = (data: { tokenMint: string }) => {
      if (data.tokenMint === mint) {
        refreshOnChainData();
      }
    };
    socket.on("trade:executed", handleRefresh);
    socket.on("token:dex_migrated", handleRefresh);
    return () => {
      socket.off("trade:executed", handleRefresh);
      socket.off("token:dex_migrated", handleRefresh);
    };
  }, [mint, refreshOnChainData]);

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

  // Fetch SOL balance
  useEffect(() => {
    if (!publicKey || !connection) { setSolBalance(null); return; }
    connection.getBalance(publicKey)
      .then((lamports) => setSolBalance(lamports / 1e9))
      .catch(() => setSolBalance(null));
  }, [publicKey, connection, buyStatus, sellStatus]);

  // Price calculation: constant product AMM spot price = virtualSol / virtualToken
  // Convert from lamports/atomic to SOL/whole-token: (lamports / 1e9) / (atomic / 1e6)
  const onChainPrice = curveData
    ? (curveData.virtualSolReserves.toNumber() / 1e9) / (curveData.virtualTokenReserves.toNumber() / 1e6)
    : null;

  // On-chain supply is in atomic units (6 decimals) — convert to whole tokens
  const onChainSupply = curveData
    ? curveData.currentSupply.toNumber() / 1e6
    : null;

  // Total supply for MCAP calculation (1B fixed, not circulating supply)
  const totalSupplyForMcap = curveData
    ? curveData.tokenTotalSupply.toNumber() / 1e6
    : 1_000_000_000;

  // Priority: DEX mode → raydium pool price, else socket > on-chain > API
  const displayPrice = isDexMode
    ? (raydiumPrice ?? onChainPrice ?? token?.currentPrice ?? 0)
    : (priceSnapshot?.price ?? onChainPrice ?? token?.currentPrice ?? 0);
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

  const executeBuy = useCallback(async (solAmount: number) => {
    if (!program || !publicKey) return;
    setBuyStatus("loading");
    setTxError(null);

    try {
      const lamports = new BN(Math.floor(solAmount * 1e9));
      const mintPubkey = new PublicKey(mint);

      if (curveData?.dexMigrated) {
        await raydiumBuy(program, publicKey, mintPubkey, lamports, slippageBps);
      } else {
        await buyTokens(program, publicKey, mintPubkey, lamports, slippageBps);
      }

      setBuyAmount("");
      const freshCurve = await fetchBondingCurve(program, mintPubkey);
      if (freshCurve) setCurveData(freshCurve);
      setBuyStatus("success");
      setTimeout(async () => { await refreshTrades(); }, 2000);
      setTimeout(() => setBuyStatus("idle"), 3000);
    } catch (err: unknown) {
      setBuyStatus("error");
      setTxError(err instanceof Error ? err.message : "Transaction failed");
    }
  }, [program, publicKey, mint, curveData?.dexMigrated, slippageBps, refreshTrades]);

  const handleBuy = async () => {
    if (!program || !publicKey || !buyAmount) return;

    const solAmount = parseFloat(buyAmount);
    if (!solAmount || solAmount <= 0) {
      setTxError("Enter a valid SOL amount");
      return;
    }

    if (solAmount >= 1) {
      setConfirmModal({
        title: "CONFIRM BUY",
        rows: [
          { label: "TOKEN", value: `$${token?.symbol}` },
          { label: "AMOUNT", value: `${solAmount} SOL` },
          { label: "FEE (1%)", value: `${(solAmount * 0.01).toFixed(4)} SOL` },
          { label: "SLIPPAGE", value: `${(slippageBps / 100).toFixed(1)}%` },
        ],
        onConfirm: () => { setConfirmModal(null); executeBuy(solAmount); },
      });
      return;
    }

    executeBuy(solAmount);
  };

  const executeSell = useCallback(async (wholeTokens: number) => {
    if (!program || !publicKey) return;
    setSellStatus("loading");
    setTxError(null);

    try {
      const atomicAmount = Math.floor(wholeTokens * 10 ** TOKEN_DECIMALS);
      const mintPubkey = new PublicKey(mint);

      if (curveData?.dexMigrated) {
        await raydiumSell(program, publicKey, mintPubkey, new BN(atomicAmount), slippageBps);
      } else {
        await sellTokens(program, publicKey, mintPubkey, new BN(atomicAmount), slippageBps);
      }

      setSellAmount("");
      const freshCurve = await fetchBondingCurve(program, mintPubkey);
      setCurveData(freshCurve);
      setSellStatus("success");
      setTimeout(async () => { await refreshTrades(); }, 2000);
      setTimeout(() => setSellStatus("idle"), 3000);
    } catch (err: unknown) {
      setSellStatus("error");
      setTxError(err instanceof Error ? err.message : "Transaction failed");
    }
  }, [program, publicKey, mint, curveData?.dexMigrated, slippageBps, refreshTrades]);

  const handleSell = async () => {
    if (!program || !publicKey || !sellAmount) return;

    const wholeTokens = parseFloat(sellAmount);
    if (!wholeTokens || wholeTokens <= 0) {
      setTxError("Enter a valid token amount");
      return;
    }

    const estimatedSolValue = wholeTokens * displayPrice;
    if (estimatedSolValue >= 1) {
      setConfirmModal({
        title: "CONFIRM SELL",
        rows: [
          { label: "TOKEN", value: `$${token?.symbol}` },
          { label: "AMOUNT", value: `${wholeTokens.toLocaleString()} tokens` },
          { label: "EST. VALUE", value: `~${estimatedSolValue.toFixed(4)} SOL` },
          { label: "FEE (1%)", value: `${(estimatedSolValue * 0.01).toFixed(4)} SOL` },
          { label: "SLIPPAGE", value: `${(slippageBps / 100).toFixed(1)}%` },
        ],
        onConfirm: () => { setConfirmModal(null); executeSell(wholeTokens); },
      });
      return;
    }

    executeSell(wholeTokens);
  };

  const handleClaimFees = async () => {
    if (!program || !publicKey || !curveData) return;
    setClaimStatus("loading");
    setTxError(null);
    try {
      await claimFees(program, publicKey, new PublicKey(mint));
      setClaimStatus("success");
      // Wait for blockchain state propagation before refreshing
      await new Promise((r) => setTimeout(r, 1500));
      await refreshOnChainData();
      setTimeout(() => setClaimStatus("idle"), 3000);
    } catch (err: unknown) {
      setClaimStatus("error");
      setTxError(err instanceof Error ? err.message : "Claim failed");
      setTimeout(() => setClaimStatus("idle"), 3000);
    }
  };

  // DEX migration
  const [migrateStatus, setMigrateStatus] = useState<TxStatus>("idle");

  const handleGraduateToDex = async () => {
    if (!program || !publicKey) return;
    setMigrateStatus("loading");
    setTxError(null);
    try {
      await graduateToDex(program, publicKey, new PublicKey(mint), curveData!.reserveBalance);
      setMigrateStatus("success");
      await refreshOnChainData();
      setTimeout(() => setMigrateStatus("idle"), 3000);
    } catch (err: unknown) {
      setMigrateStatus("error");
      setTxError(err instanceof Error ? err.message : "Migration failed");
      setTimeout(() => setMigrateStatus("idle"), 3000);
    }
  };

  // Is current wallet the deployer of this token?
  const isDeployer = publicKey && curveData && publicKey.toBase58() === curveData.deployer.toBase58();
  // Graduated but not yet migrated → disable trading
  const isMigrating = curveData?.graduated && !curveData?.dexMigrated;
  // Progressive fee unlock: unlocked = (totalDeployerFees * maxReserveReached) / GRADUATION_THRESHOLD
  const GRADUATION_THRESHOLD_LAMPORTS = 5_000_000_000;
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
  // Use actual collateral from API, fallback to tier lookup from constants
  const collateralSol = token.collateralAmount || (() => {
    const tierMap: Record<string, number> = { Diamond: 10, Platinum: 5, Gold: 3, Silver: 1, Bronze: 0.5, Iron: 0.1 };
    return tierMap[tier] ?? 0.1;
  })();
  // Progress based on reserve vs on-chain graduation threshold (5 SOL = 5_000_000_000 lamports, devnet testing)
  const progress = priceSnapshot?.bondingCurveProgress
    ?? (curveData
      ? Math.min(100, Math.floor((curveData.reserveBalance.toNumber() / GRADUATION_THRESHOLD_LAMPORTS) * 100))
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
                  <ExternalLink className="w-3 h-3" /> {isDevnet ? "EXPLORER" : "SOLSCAN"}
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
                trades={allTrades}
                currentPrice={displayPrice}
                totalSupply={totalSupplyForMcap}
                solPrice={solPrice}
                externalCandles={externalCandles}
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
                <p className="text-[8px] font-display text-text-muted mb-1 tracking-wider">
                  {solPrice > 0 ? "MCAP (USD)" : "MCAP (SOL)"}
                </p>
                <p className="text-sm font-score text-text-primary neon-text-subtle">
                  {solPrice > 0
                    ? `$${formatCompact(displayPrice * totalSupplyForMcap * solPrice)}`
                    : `${formatCompact(displayPrice * totalSupplyForMcap)} SOL`}
                </p>
              </Card>
              <Card padding="sm">
                <p className="text-[8px] font-display text-text-muted mb-1 tracking-wider">
                  {isDexMode ? "LIQUIDITY" : "RESERVE"}
                </p>
                <p className="text-sm font-score text-text-primary neon-text-subtle">
                  {isDexMode && wsolReserve !== null
                    ? formatSol(wsolReserve)
                    : curveData
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
                {curveData?.dexMigrated
                  ? "Graduated & migrated to Raydium DEX."
                  : progress >= 100
                    ? "Curve complete. Ready for DEX migration."
                    : `${100 - progress}% until graduation.`}
              </p>
            </Card>

            {/* Graduated + DEX migrated banner */}
            {curveData?.dexMigrated && (
              <Card padding="lg">
                <div className="text-center space-y-3">
                  <Badge label="GRADUATED" variant="reputation" />
                  <p className="text-xs text-text-secondary font-mono">
                    This token has graduated and is now trading on Raydium DEX.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <a
                      href={`https://raydium.io/swap/?inputMint=sol&outputMint=${mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[10px] font-display px-4 py-2 border border-primary text-primary hover:bg-primary/10 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> TRADE ON RAYDIUM
                    </a>
                    {curveData.raydiumPool && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(curveData.raydiumPool.toBase58(), "raydium")}
                        className="inline-flex items-center gap-1.5 text-[10px] font-display px-4 py-2 border border-border text-text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer"
                      >
                        {copied === "raydium" ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                        {copied === "raydium" ? "COPIED!" : "COPY POOL ADDRESS"}
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Graduated but not yet migrated — auto-migration in progress */}
            {curveData?.graduated && !curveData?.dexMigrated && (
              <Card padding="lg">
                <div className="text-center space-y-3">
                  <span className="flex items-center justify-center gap-2 text-[10px] font-display text-primary tracking-wider">
                    <Loader2 className="w-3 h-3 animate-spin" /> MIGRATING TO RAYDIUM...
                  </span>
                  <p className="text-xs text-text-secondary font-mono">
                    Auto-migration in progress. Trading will resume shortly on Raydium DEX.
                  </p>
                </div>
              </Card>
            )}

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
                  TRADES ({allTrades.length})
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
                  {allTrades.length > 0 ? (
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
                        {[...allTrades].reverse().map((t) => (
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
                                ? `${(t.totalSol || 0).toFixed(4)} SOL`
                                : `${formatCompact(t.totalSol || 0)} SOL`}
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
              {curveData?.dexMigrated && (
                <p className="text-[8px] text-accent font-mono mb-2">Trading via Raydium DEX</p>
              )}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[8px] font-display text-text-muted tracking-wider">BUY</h3>
                {connected && solBalance !== null && (
                  <span className="text-[9px] font-mono text-text-muted">
                    Balance: <span className="text-text-primary">{solBalance.toFixed(4)}</span> SOL
                  </span>
                )}
              </div>
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
                  disabled={!connected || buyStatus === "loading" || !buyAmount || !!isMigrating}
                >
                  {isMigrating ? (
                    "MIGRATING..."
                  ) : buyStatus === "loading" ? (
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
              {curveData?.dexMigrated && (
                <p className="text-[8px] text-accent font-mono mb-2">Trading via Raydium DEX</p>
              )}
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
                  disabled={!connected || sellStatus === "loading" || !sellAmount || !!isMigrating}
                >
                  {isMigrating ? (
                    "MIGRATING..."
                  ) : sellStatus === "loading" ? (
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
                  {isDeployer && (claimableFeesLamports > 0 || claimStatus === "success") && (
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
                        disabled={claimStatus === "loading" || claimStatus === "success"}
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

      {/* How it Works — collapsible */}
      <details className="group mt-6">
        <summary className="flex items-center justify-between cursor-pointer list-none px-4 py-3 bg-bg-card arcade-border hover:border-primary transition-colors">
          <span className="text-[10px] font-display tracking-wider text-text-muted group-open:text-primary transition-colors">
            HOW IT WORKS
          </span>
          <ChevronDown className="w-4 h-4 text-text-muted group-open:rotate-180 transition-transform duration-200" />
        </summary>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {[
            {
              icon: TrendingUp,
              title: "BONDING CURVE",
              desc: "Price rises on buy, drops on sell. Fair and transparent price discovery for every token.",
              color: "text-primary",
            },
            {
              icon: Shield,
              title: "COLLATERAL",
              desc: "Deployers must lock collateral. Bronze / Silver / Gold tiers signal commitment level.",
              color: "text-accent",
            },
            {
              icon: GraduationCap,
              title: "GRADUATION",
              desc: "When reserve hits threshold, token auto-lists on Raydium CPMM DEX. LP locked forever.",
              color: "text-success",
            },
            {
              icon: Percent,
              title: "FEES",
              desc: "1% fee on every buy & sell. A portion is distributed back to the deployer.",
              color: "text-primary",
            },
            {
              icon: ShieldAlert,
              title: "RUG PROTECTION",
              desc: "If a deployer rug-pulls, collateral is auto-refunded to investors.",
              color: "text-error",
            },
            {
              icon: Star,
              title: "REPUTATION",
              desc: "Cross-wallet history tracking for deployers. Trust grades at a glance.",
              color: "text-accent",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-bg-card arcade-border p-4 flex gap-3 items-start hover:border-primary/50 transition-colors"
            >
              <item.icon className={`w-4 h-4 mt-0.5 shrink-0 ${item.color}`} />
              <div>
                <h4 className="text-[9px] font-display tracking-wider text-text-primary mb-1">
                  {item.title}
                </h4>
                <p className="text-[10px] text-text-muted leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </details>

      <ConfirmModal
        open={confirmModal !== null}
        title={confirmModal?.title ?? ""}
        rows={confirmModal?.rows ?? []}
        onConfirm={() => confirmModal?.onConfirm()}
        onCancel={() => setConfirmModal(null)}
      />
    </main>
  );
}
