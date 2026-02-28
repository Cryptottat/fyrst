"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { COLLATERAL_TIERS, MIN_COLLATERAL } from "@/lib/constants";
import { getCollateralTier } from "@/lib/utils";
import { useAnchorProgram, launchToken } from "@/lib/anchor";
import { createLaunch } from "@/lib/api";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { BN } from "@coral-xyz/anchor";
import { processImage } from "@/lib/image";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

type LaunchStatus = "idle" | "signing" | "confirming" | "recording" | "success" | "error";

export default function LaunchPage() {
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { program } = useAnchorProgram();

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [collateral, setCollateral] = useState(MIN_COLLATERAL);

  const [status, setStatus] = useState<LaunchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txSigs, setTxSigs] = useState<{ escrow: string; curve: string } | null>(null);

  const currentTier = getCollateralTier(collateral);
  const isProcessing = status !== "idle" && status !== "success" && status !== "error";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }

    if (!name.trim() || !symbol.trim()) {
      setError("Name and symbol are required.");
      return;
    }

    setStatus("signing");
    setError(null);
    setTxSigs(null);

    try {
      if (!program) {
        setStatus("error");
        setError("Wallet not ready. Disconnect and reconnect your wallet.");
        return;
      }

      const lamports = new BN(Math.floor(collateral * 1e9));
      // On-chain URI max 200 chars — data URLs are too large, use empty string
      const onChainUri = imageUrl.startsWith("data:") ? "" : imageUrl.trim();
      setStatus("confirming");
      const result = await launchToken(
        program,
        publicKey,
        lamports,
        name.trim(),
        symbol.trim().toUpperCase(),
        onChainUri,
      );
      const mintAddress = result.tokenMintKeypair.publicKey.toBase58();
      const escrowSig = result.escrowTxSig;
      const curveSig = result.curveTxSig;
      setTxSigs({ escrow: escrowSig, curve: curveSig });

      setStatus("recording");

      await createLaunch({
        mint: mintAddress,
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        deployerAddress: publicKey.toBase58(),
        collateralAmount: collateral,
        escrowTxSignature: escrowSig,
        curveTxSignature: curveSig,
      });

      setStatus("success");
      setTimeout(() => router.push(`/token/${mintAddress}`), 2000);
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  const inputClass = "w-full bg-bg arcade-border px-4 py-3 text-xs text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors disabled:opacity-50";

  return (
    <main className="min-h-screen pt-20 pb-16 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xs md:text-sm font-display text-text-primary mb-3 leading-relaxed">
            INSERT COIN
          </h1>
          <p className="text-sm text-text-secondary font-mono">
            <span className="text-primary">&gt; </span>
            Deploy a new token. Stake collateral to prove you&apos;re legit.
          </p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-[8px] font-display text-text-secondary mb-2 tracking-wider">
                TOKEN NAME
              </label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SolGuard" disabled={isProcessing} className={inputClass} />
            </div>

            <div>
              <label htmlFor="symbol" className="block text-[8px] font-display text-text-secondary mb-2 tracking-wider">
                SYMBOL
              </label>
              <input id="symbol" type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. GUARD" maxLength={10} disabled={isProcessing} className={`${inputClass} font-mono`} />
            </div>

            <div>
              <label htmlFor="description" className="block text-[8px] font-display text-text-secondary mb-2 tracking-wider">
                DESCRIPTION
              </label>
              <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="What does your token do?" rows={3} disabled={isProcessing}
                className={`${inputClass} resize-none`} />
            </div>

            <div>
              <label className="block text-[8px] font-display text-text-secondary mb-2 tracking-wider">
                TOKEN IMAGE
              </label>
              <div className="flex gap-3 items-start">
                <label className="flex-1 cursor-pointer">
                  <div className={`${inputClass} text-center py-4 hover:border-primary transition-colors ${imageUrl ? "border-success" : ""}`}>
                    {imageUrl ? (
                      <span className="text-success text-[10px]">IMAGE SET</span>
                    ) : (
                      <span className="text-text-muted text-[10px]">DROP FILE OR CLICK TO UPLOAD</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isProcessing}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const dataUrl = await processImage(file);
                        setImageUrl(dataUrl);
                        setError(null);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Image processing failed");
                      }
                    }}
                  />
                </label>
                <span className="text-text-muted text-[9px] mt-1">OR</span>
                <input
                  type="url"
                  value={imageUrl.startsWith("data:") ? "" : imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="URL..."
                  disabled={isProcessing}
                  className={`flex-1 ${inputClass}`}
                />
              </div>
              {imageUrl && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-10 h-10 object-cover arcade-border"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="text-[9px] text-error hover:text-error/80 font-display"
                  >
                    REMOVE
                  </button>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="collateral" className="block text-[8px] font-display text-text-secondary mb-2 tracking-wider">
                COINS TO INSERT (SOL)
              </label>
              <div className="flex items-center gap-4">
                <input id="collateral" type="number" min={MIN_COLLATERAL} step="any"
                  value={collateral} onChange={(e) => setCollateral(Math.max(MIN_COLLATERAL, Number(e.target.value)))}
                  disabled={isProcessing} className={`flex-1 ${inputClass}`} />
                <Badge label={currentTier} variant="collateral" />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {COLLATERAL_TIERS.map((tier) => (
                  <button key={tier.name} type="button" onClick={() => setCollateral(tier.amount)}
                    disabled={isProcessing}
                    className={`text-[8px] font-display px-3 py-1.5 border-2 transition-colors cursor-pointer disabled:opacity-50 ${
                      currentTier === tier.name
                        ? "border-primary text-primary bg-primary/10 neon-text-subtle"
                        : "border-border text-text-muted hover:border-border-hover"
                    }`}>
                    {tier.name} ({tier.label})
                  </button>
                ))}
              </div>
            </div>

            {/* TX Status */}
            {status !== "idle" && (
              <div className={`arcade-border p-4 ${
                status === "error" ? "border-error" : status === "success" ? "border-success" : "border-primary"
              }`}>
                <div className="flex items-center gap-3">
                  {(status === "signing" || status === "confirming" || status === "recording") && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-[10px] font-display text-text-primary">
                        {status === "signing" ? "WAITING FOR WALLET..." :
                         status === "confirming" ? "CREATING ON-CHAIN..." : "RECORDING..."}
                      </span>
                    </>
                  )}
                  {status === "success" && (
                    <>
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-[10px] font-display text-success neon-text-subtle">
                        TOKEN LAUNCHED! +1UP
                      </span>
                    </>
                  )}
                  {status === "error" && (
                    <>
                      <AlertCircle className="w-4 h-4 text-error" />
                      <span className="text-xs text-error font-mono">{error}</span>
                    </>
                  )}
                </div>
                {txSigs && (
                  <div className="mt-2 text-[10px] text-text-muted font-mono">
                    <p>Escrow: {txSigs.escrow.slice(0, 20)}...</p>
                    <p>Curve: {txSigs.curve.slice(0, 20)}...</p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2">
              <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isProcessing}>
                {isProcessing ? "PROCESSING..." : !connected ? "CONNECT WALLET" : `[ INSERT ${collateral} SOL ]`}
              </Button>
              <p className="text-[9px] text-text-muted text-center mt-3 font-mono">
                <span className="text-primary">&gt; </span>
                {connected ? `Creates escrow + bonding curve on ${process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet"}.` : "Connect wallet first."}
              </p>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
