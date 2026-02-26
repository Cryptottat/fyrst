"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { COLLATERAL_TIERS, MIN_COLLATERAL } from "@/lib/constants";
import { getCollateralTier } from "@/lib/utils";

export default function LaunchPage() {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [collateral, setCollateral] = useState(MIN_COLLATERAL);

  const currentTier = getCollateralTier(collateral);

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
          <form
            onSubmit={(e) => {
              e.preventDefault();
            }}
            className="space-y-6"
          >
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
                className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
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
                className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
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
                className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors resize-none"
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
                className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
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
                  className="flex-1 bg-bg border border-border rounded-lg px-4 py-3 text-sm text-text-primary font-mono focus:outline-none focus:border-primary transition-colors"
                />
                <Badge label={currentTier} variant="collateral" />
              </div>

              {/* Tier guide */}
              <div className="mt-3 flex flex-wrap gap-2">
                {COLLATERAL_TIERS.map((tier) => (
                  <button
                    key={tier.name}
                    type="button"
                    onClick={() => setCollateral(tier.amount)}
                    className={`text-xs px-3 py-1 rounded border transition-colors cursor-pointer ${
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

            {/* Submit */}
            <div className="pt-4">
              <Button type="submit" variant="primary" size="lg" className="w-full">
                Launch Token
              </Button>
              <p className="text-xs text-text-muted text-center mt-3">
                You will need to connect your wallet and approve the
                transaction.
              </p>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
