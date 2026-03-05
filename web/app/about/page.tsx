"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const coreFeatures = [
  {
    tag: "01",
    title: "DEPLOYER COLLATERAL",
    description:
      "Every token launch requires SOL collateral locked in escrow. Deployers have skin in the game — no more zero-cost rug pulls.",
  },
  {
    tag: "02",
    title: "CROSS-WALLET REPUTATION",
    description:
      "On-chain reputation follows deployers across wallets. Past rugs, successful launches, and behavior are all tracked and scored A through F.",
  },
  {
    tag: "03",
    title: "AUTO-REFUND ON RUG",
    description:
      "If a deployer abandons their token before the deadline, collateral is distributed back to holders. If the token graduates successfully, the deployer can reclaim their escrow SOL from the token page.",
  },
];

const journeySteps = [
  {
    phase: "LAUNCH",
    label: "Token Created",
    detail: "Deployer locks SOL collateral and mints token on the bonding curve.",
  },
  {
    phase: "TRADE",
    label: "Bonding Curve",
    detail:
      "Buyers and sellers trade on a deterministic price curve. Price rises with demand.",
  },
  {
    phase: "GRADUATE",
    label: "DEX Listing",
    detail:
      "At 85 SOL market cap, token auto-graduates to Raydium CPMM with permanently locked LP.",
  },
  {
    phase: "LIVE",
    label: "Open Market",
    detail:
      "Token trades freely on Raydium. Deployer can reclaim their escrow collateral from the token page after graduation.",
  },
];

const comparisons = [
  { feature: "Deployer Cost", pump: "0 SOL", fyrst: "Collateral required" },
  { feature: "Rug Protection", pump: "None", fyrst: "Auto-refund" },
  { feature: "Reputation", pump: "Anonymous", fyrst: "Cross-wallet tracking" },
  { feature: "LP After Grad", pump: "Unlocked", fyrst: "Permanently locked" },
  { feature: "Transparency", pump: "Partial", fyrst: "Fully on-chain" },
];

const roadmap = [
  {
    status: "LIVE",
    title: "Token Dashboard",
    detail: "Real-time browsing of launches with deployer reputation scores.",
  },
  {
    status: "DEVNET",
    title: "Launchpad + Graduation",
    detail:
      "Bonding curve trading, auto-graduation to Raydium CPMM, LP lock.",
  },
  {
    status: "NEXT",
    title: "$FYRST Governance Token",
    detail: "Community governance over protocol parameters and treasury.",
  },
  {
    status: "NEXT",
    title: "Telegram Trading Bot",
    detail: "Snipe launches, check reputation, and trade — all from Telegram.",
  },
  {
    status: "NEXT",
    title: "Auto-Graduation Cranker",
    detail: "Permissionless cranker network for instant DEX graduation.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen pt-20 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="mb-12 text-center">
          <h1 className="text-sm md:text-base font-display text-text-primary mb-4 leading-relaxed">
            ABOUT FYRST
          </h1>
          <p className="text-sm text-text-secondary font-mono max-w-xl mx-auto leading-relaxed">
            <span className="text-primary">&gt; </span>
            The first responsible token launchpad on Solana.
            <br />
            Launch safe. Buy confident.
          </p>
        </div>

        {/* What is FYRST */}
        <section className="mb-12">
          <Card padding="lg">
            <h2 className="text-[10px] font-display text-primary mb-4 neon-text-subtle">
              WHAT IS FYRST?
            </h2>
            <div className="space-y-3 text-xs text-text-secondary font-mono leading-relaxed">
              <p>
                FYRST is a Solana token launchpad built for traders who are tired
                of getting rugged. Every launch on FYRST requires deployer
                collateral, tracks cross-wallet reputation, and offers automatic
                refunds when things go wrong.
              </p>
              <p>
                Think of it as pump.fun — but with accountability. Deployers
                can&apos;t just create a token for free, dump on buyers, and
                disappear. On FYRST, they have skin in the game.
              </p>
              <p>
                Tokens launch on a bonding curve, and once they hit the
                graduation threshold, they auto-migrate to Raydium CPMM with
                permanently locked liquidity. No manual listing, no unlocked LP
                — just a fair transition to the open market.
              </p>
            </div>
          </Card>
        </section>

        {/* Core Features */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-xs font-display text-text-primary mb-2 leading-relaxed">
              CORE MECHANICS
            </h2>
            <p className="text-sm text-text-secondary font-mono">
              <span className="text-primary">&gt; </span>
              Three layers of protection for every trade.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {coreFeatures.map((f) => (
              <div
                key={f.tag}
                className="arcade-border bg-bg-card p-5 relative group hover:border-primary hover:shadow-[0_0_20px_rgba(167,139,250,0.15)] transition-all"
              >
                <div className="absolute -top-3 left-4 bg-bg-card px-2">
                  <span className="text-[8px] font-display text-primary neon-text-subtle tracking-wider">
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-[9px] font-display text-text-primary mb-3 leading-relaxed mt-1">
                  {f.title}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Token Journey */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-xs font-display text-text-primary mb-2 leading-relaxed">
              TOKEN JOURNEY
            </h2>
            <p className="text-sm text-text-secondary font-mono">
              <span className="text-primary">&gt; </span>
              From launch to open market in four stages.
            </p>
          </div>

          <div className="space-y-2">
            {journeySteps.map((step, i) => (
              <Card key={step.phase} padding="sm">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-16 text-center">
                    <span className="text-[8px] font-display text-primary neon-text-subtle">
                      {step.phase}
                    </span>
                  </div>
                  <div className="w-px bg-border self-stretch" />
                  <div className="flex-1 py-0.5">
                    <h3 className="text-[10px] font-display text-text-primary mb-1">
                      {step.label}
                    </h3>
                    <p className="text-xs text-text-secondary font-mono leading-relaxed">
                      {step.detail}
                    </p>
                  </div>
                  {i < journeySteps.length - 1 && (
                    <span className="text-[10px] font-display text-text-muted self-center">
                      &rarr;
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* VS pump.fun */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-xs font-display text-text-primary mb-2 leading-relaxed">
              FYRST VS PUMP.FUN
            </h2>
            <p className="text-sm text-text-secondary font-mono">
              <span className="text-primary">&gt; </span>
              Same concept, different philosophy.
            </p>
          </div>

          <div className="arcade-border bg-bg-card overflow-hidden">
            <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b-2 border-border bg-bg-elevated/40">
              <div className="text-[8px] font-display text-text-muted">
                FEATURE
              </div>
              <div className="text-[8px] font-display text-text-muted text-center">
                PUMP.FUN
              </div>
              <div className="text-[8px] font-display text-primary text-center neon-text-subtle">
                FYRST
              </div>
            </div>
            {comparisons.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 gap-2 px-4 py-3 items-center ${
                  i < comparisons.length - 1
                    ? "border-b border-border/40"
                    : ""
                } hover:bg-bg-elevated/20 transition-colors`}
              >
                <div className="text-xs font-medium text-text-primary">
                  {row.feature}
                </div>
                <div className="text-xs text-text-muted text-center font-mono">
                  {row.pump}
                </div>
                <div className="text-xs text-primary text-center font-medium font-mono neon-text-subtle">
                  {row.fyrst}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Roadmap */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-xs font-display text-text-primary mb-2 leading-relaxed">
              ROADMAP
            </h2>
            <p className="text-sm text-text-secondary font-mono">
              <span className="text-primary">&gt; </span>
              What we&apos;ve built and what&apos;s next.
            </p>
          </div>

          <div className="space-y-2">
            {roadmap.map((item) => (
              <Card key={item.title} padding="sm">
                <div className="flex items-center gap-4">
                  <span
                    className={`shrink-0 text-[8px] font-display px-2 py-0.5 ${
                      item.status === "LIVE"
                        ? "bg-success/20 text-success"
                        : item.status === "DEVNET"
                          ? "bg-primary/20 text-primary"
                          : "bg-border text-text-muted"
                    }`}
                  >
                    {item.status}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-[10px] font-display text-text-primary">
                      {item.title}
                    </h3>
                    <p className="text-xs text-text-secondary font-mono mt-0.5">
                      {item.detail}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Buster */}
        <section className="mb-12">
          <Card padding="lg">
            <div className="text-center">
              <h2 className="text-[10px] font-display text-primary mb-4 neon-text-subtle">
                MEET BUSTER
              </h2>
              <img
                src="/images/favicon-buster-face-512.png"
                alt="Buster the Border Collie"
                width={128}
                height={128}
                className="mx-auto mb-4 rounded-lg"
              />
              <p className="text-xs text-text-secondary font-mono leading-relaxed max-w-md mx-auto">
                Buster is a Border Collie — the smartest herding dog breed. He
                sniffs out rugs, herds bad actors, and protects the flock.
                He&apos;s the FYRST mascot and the spirit of the protocol: loyal,
                vigilant, and always working.
              </p>
            </div>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="arcade-border bg-bg-card p-8">
            <h2 className="text-[10px] font-display text-text-primary mb-3">
              READY TO PLAY?
            </h2>
            <p className="text-xs text-text-secondary font-mono mb-6">
              <span className="text-primary">&gt; </span>
              Browse live launches or create your own.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/dashboard">
                <Button variant="primary" size="md">
                  DASHBOARD
                </Button>
              </Link>
              <Link href="/launch">
                <Button variant="outline" size="md">
                  LAUNCH TOKEN
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
