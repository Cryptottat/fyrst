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

    if (!program) {
      setError("Anchor program not initialized. Please reconnect your wallet.");
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
      // Convert SOL to lamports
      const lamports = new BN(Math.floor(collateral * 1e9));

      setStatus("confirming");

      // Execute on-chain transactions
      const result = await launchToken(program, publicKey, lamports);
      const mintAddress = result.tokenMintKeypair.publicKey.toBase58();

      setTxSigs({ escrow: result.escrowTxSig, curve: result.curveTxSig });
      setStatus("recording");

      // Record in backend DB
      await createLaunch({
        mint: mintAddress,
        name: name.trim(),
        symbol: symbol.trim().toUpperCase(),
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        deployerAddress: publicKey.toBase58(),
        collateralAmount: collateral,
        escrowTxSignature: result.escrowTxSig,
        curveTxSignature: result.curveTxSig,
      });

      setStatus("success");

      // Redirect to the new token page after a brief delay
      setTimeout(() => {
        router.push(`/token/${mintAddress}`);
      }, 2000);
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  return (
    <main className="min-h-screen bg-bg pt-24 pb-16 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
            Launch Token
          </h1>
          <p className="text-text-secondary">
            Deploy a new token on the FYRST launchpad. Stake collateral to build
            trust.
          </p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Token Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Token Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SolGuard"
                disabled={isProcessing}
                className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
              />
            </div>

            {/* Symbol */}
            <div>
              <label
                htmlFor="symbol"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Symbol
              </label>
              <input
                id="symbol"
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. GUARD"
                maxLength={10}
                disabled={isProcessing}
                className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your token's purpose..."
                rows={4}
                disabled={isProcessing}
                className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors resize-none disabled:opacity-50"
              />
            </div>

            {/* Image URL */}
            <div>
              <label
                htmlFor="imageUrl"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Image URL
              </label>
              <input
                id="imageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                disabled={isProcessing}
                className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
              />
            </div>

            {/* Collateral */}
            <div>
              <label
                htmlFor="collateral"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Collateral Amount (SOL)
              </label>
              <div className="flex items-center gap-4">
                <input
                  id="collateral"
                  type="number"
                  min={MIN_COLLATERAL}
                  step={0.5}
                  value={collateral}
                  onChange={(e) =>
                    setCollateral(Math.max(MIN_COLLATERAL, Number(e.target.value)))
                  }
                  disabled={isProcessing}
                  className="flex-1 bg-bg border border-border rounded-lg px-4 py-3 text-sm text-text-primary font-mono focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
                <Badge label={currentTier} variant="collateral" />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {COLLATERAL_TIERS.map((tier) => (
                  <button
                    key={tier.name}
                    type="button"
                    onClick={() => setCollateral(tier.amount)}
                    disabled={isProcessing}
                    className={`text-xs px-3 py-1 rounded border transition-colors cursor-pointer disabled:opacity-50 ${
                      currentTier === tier.name
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-text-muted hover:border-text-muted"
                    }`}
                  >
                    {tier.name} ({tier.label})
                  </button>
                ))}
              </div>
            </div>

            {/* TX Status */}
            {status !== "idle" && (
              <div className={`rounded-lg border p-4 ${
                status === "error"
                  ? "border-error/30 bg-error/5"
                  : status === "success"
                    ? "border-success/30 bg-success/5"
                    : "border-primary/30 bg-primary/5"
              }`}>
                <div className="flex items-center gap-3">
                  {status === "signing" && (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-sm text-text-primary">Waiting for wallet approval...</span>
                    </>
                  )}
                  {status === "confirming" && (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-sm text-text-primary">Creating escrow & bonding curve on-chain...</span>
                    </>
                  )}
                  {status === "recording" && (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      <span className="text-sm text-text-primary">Recording launch in database...</span>
                    </>
                  )}
                  {status === "success" && (
                    <>
                      <CheckCircle className="w-5 h-5 text-success" />
                      <span className="text-sm text-success">Token launched successfully! Redirecting...</span>
                    </>
                  )}
                  {status === "error" && (
                    <>
                      <AlertCircle className="w-5 h-5 text-error" />
                      <span className="text-sm text-error">{error}</span>
                    </>
                  )}
                </div>
                {txSigs && (
                  <div className="mt-2 text-xs text-text-muted font-mono">
                    <p>Escrow TX: {txSigs.escrow.slice(0, 20)}...</p>
                    <p>Curve TX: {txSigs.curve.slice(0, 20)}...</p>
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <div className="pt-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </span>
                ) : !connected ? (
                  "Connect Wallet to Launch"
                ) : (
                  `Launch Token (${collateral} SOL Collateral)`
                )}
              </Button>
              <p className="text-xs text-text-muted text-center mt-3">
                {connected
                  ? "This will create an escrow vault and bonding curve on Solana devnet."
                  : "You will need to connect your wallet and approve the transaction."}
              </p>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
