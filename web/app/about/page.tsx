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
  { feature: "Deployer Cost", pump: "0 SOL", hedg: "Collateral required" },
  { feature: "Rug Protection", pump: "None", hedg: "Auto-refund" },
  { feature: "Reputation", pump: "Anonymous", hedg: "Cross-wallet tracking" },
  { feature: "LP After Grad", pump: "Unlocked", hedg: "Permanently locked" },
  { feature: "Transparency", pump: "Partial", hedg: "Fully on-chain" },
];

const roadmap = [
  {
    status: "LIVE",
    title: "Token Dashboard",
    detail: "Real-time browsing of launches with deployer reputation scores.",
  },
  {
    status: "LIVE",
    title: "Launchpad + Graduation",
    detail:
      "Bonding curve trading, auto-graduation to Raydium CPMM, LP lock.",
  },
  {
    status: "LIVE",
    title: "Auto-Graduation Cranker",
    detail: "Permissionless cranker for instant DEX graduation — anyone can trigger it.",
  },
  {
    status: "NEXT",
    title: "$HEDG Governance Token",
    detail: "Community governance over protocol parameters and treasury.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen pt-20 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="mb-12 text-center">
          <h1 className="text-2xl md:text-4xl font-display text-text-primary mb-4 leading-relaxed neon-text-subtle">
            ABOUT HEDG
          </h1>
          <p className="text-sm md:text-base text-text-secondary font-mono max-w-xl mx-auto leading-relaxed">
            <span className="text-primary">&gt; </span>
            The first responsible token launchpad on Solana.
            <br />
            Launch safe. Buy confident.
          </p>
        </div>

        {/* What is HEDG */}
        <section className="mb-12">
          <Card padding="lg">
            <h2 className="text-sm md:text-base font-display text-primary mb-4 neon-text-subtle">
              WHAT IS HEDG?
            </h2>
            <div className="space-y-4 text-sm text-text-secondary font-mono leading-relaxed">
              <p>
                The memecoin ecosystem is broken. An estimated 89% of tokens die
                within 24 hours of launch. Deployers face zero consequences —
                they create a token for free, pump it, dump on buyers, and
                vanish. Buyers absorb all the risk while deployers walk away
                with the profits. This cycle repeats thousands of times a day.
              </p>
              <p>
                HEDG is the first launchpad that flips this dynamic. Every
                launch on HEDG requires the deployer to lock SOL collateral in
                escrow before a single token is minted. Think of it as a
                memecoin launchpad — but with real accountability. If the token
                fails and the deployer abandons it, that collateral flows back
                to the buyers who got burned.
              </p>
              <p>
                But collateral alone isn&apos;t enough. Bad actors just create
                new wallets. That&apos;s why HEDG tracks deployer reputation
                across wallets — past rugs, successful launches, and behavioral
                patterns are all scored and surfaced so buyers can make informed
                decisions before they ape in.
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
            <h2 className="text-lg md:text-xl font-display text-text-primary mb-2 leading-relaxed">
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
                className="arcade-border bg-bg-card p-6 relative group hover:border-primary hover:shadow-[0_0_20px_rgba(212,168,83,0.15)] transition-all"
              >
                <div className="absolute -top-3 left-4 bg-bg-card px-2">
                  <span className="text-xs font-display text-primary neon-text-subtle tracking-wider">
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-sm font-display text-text-primary mb-3 leading-relaxed mt-2">
                  {f.title}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Token Journey */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-lg md:text-xl font-display text-text-primary mb-2 leading-relaxed">
              TOKEN JOURNEY
            </h2>
            <p className="text-sm text-text-secondary font-mono">
              <span className="text-primary">&gt; </span>
              From launch to open market in four stages.
            </p>
          </div>

          <div className="space-y-3">
            {journeySteps.map((step, i) => (
              <Card key={step.phase} padding="lg">
                <div className="flex items-start gap-6">
                  <div className="shrink-0 w-24 text-center">
                    <span className="text-xs md:text-sm font-display text-primary neon-text-subtle">
                      {step.phase}
                    </span>
                  </div>
                  <div className="w-px bg-border self-stretch" />
                  <div className="flex-1 py-1">
                    <h3 className="text-sm md:text-base font-display text-text-primary mb-2">
                      {step.label}
                    </h3>
                    <p className="text-sm text-text-secondary font-mono leading-relaxed">
                      {step.detail}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* VS pump.fun */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-lg md:text-xl font-display text-text-primary mb-2 leading-relaxed">
              HEDG VS PUMP.FUN
            </h2>
            <p className="text-sm text-text-secondary font-mono">
              <span className="text-primary">&gt; </span>
              Same concept, different philosophy.
            </p>
          </div>

          <div className="arcade-border bg-bg-card overflow-hidden">
            <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b-2 border-border bg-bg-elevated/40">
              <div className="text-xs font-display text-text-muted">
                FEATURE
              </div>
              <div className="text-xs font-display text-text-muted text-center">
                PUMP.FUN
              </div>
              <div className="text-xs font-display text-primary text-center neon-text-subtle">
                HEDG
              </div>
            </div>
            {comparisons.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-3 gap-4 px-6 py-4 items-center ${
                  i < comparisons.length - 1
                    ? "border-b border-border/40"
                    : ""
                } hover:bg-bg-elevated/20 transition-colors`}
              >
                <div className="text-sm font-medium text-text-primary">
                  {row.feature}
                </div>
                <div className="text-sm text-error text-center font-mono opacity-80">
                  {row.pump}
                </div>
                <div className="text-sm text-success text-center font-medium font-mono neon-text-subtle">
                  {row.hedg}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Roadmap */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-lg md:text-xl font-display text-text-primary mb-2 leading-relaxed">
              ROADMAP
            </h2>
            <p className="text-sm text-text-secondary font-mono">
              <span className="text-primary">&gt; </span>
              What we&apos;ve built and what&apos;s next.
            </p>
          </div>

          <div className="space-y-3">
            {roadmap.map((item) => (
              <Card key={item.title} padding="lg">
                <div className="flex items-center gap-6">
                  <span
                    className={`shrink-0 text-xs font-display px-3 py-1 ${
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
                    <h3 className="text-sm font-display text-text-primary mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-text-secondary font-mono">
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
              <h2 className="text-sm md:text-base font-display text-primary mb-6 neon-text-subtle">
                MEET HEDGI
              </h2>
              <img
                src="/images/hedgi-hero.png"
                alt="Hedgi the Hedgehog"
                width={200}
                height={200}
                className="mx-auto mb-6 rounded-lg"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="text-sm text-text-secondary font-mono leading-relaxed max-w-lg mx-auto space-y-4">
                <p>
                  Hedgi is a hedgehog — small but covered in spines that protect
                  against predators. In the wild, hedgehogs don&apos;t chase
                  threats or start fights. When danger approaches, they curl
                  into a tight defensive ball, turning their own body into an
                  impenetrable fortress. The predator walks away empty-handed.
                </p>
                <p>
                  That&apos;s exactly how the HEDG protocol works. When a token
                  fails and a deployer tries to walk away, the escrow system
                  curls around the collateral and redirects it back to the
                  buyers who got hurt. Hedgi isn&apos;t aggressive — just
                  prepared. Always watching, always guarding.
                </p>
                <p>
                  You&apos;ll spot Hedgi wandering the forest floor of our
                  landing page, nose twitching, spines raised, keeping a quiet
                  eye on every launch. He&apos;s the spirit of the protocol:
                  cute on the outside, ruthlessly defensive when it matters.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="arcade-border bg-bg-card p-10">
            <h2 className="text-lg font-display text-text-primary mb-4">
              READY TO PLAY?
            </h2>
            <p className="text-sm text-text-secondary font-mono mb-8">
              <span className="text-primary">&gt; </span>
              Browse live launches or create your own.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/floor">
                <Button variant="primary" size="lg">
                  [ FLOOR ]
                </Button>
              </Link>
              <Link href="/launch">
                <Button variant="outline" size="lg">
                  [ LAUNCH TOKEN ]
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
