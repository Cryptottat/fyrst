"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const tokenomics = [
  { label: "Total Supply", value: "1,000,000,000" },
  { label: "Launch Platform", value: "Fair Launch (Bonding Curve)" },
  { label: "Buy Pressure", value: "Continuous (Buyback)" },
  { label: "Governance", value: "Coming Soon" },
];

const feeBreakdown = [
  {
    tag: "01",
    title: "TRADING FEE (1%)",
    description:
      "Every buy and sell on the HEDG bonding curve incurs a 1% fee. This funds both deployers and the protocol treasury.",
  },
  {
    tag: "02",
    title: "DEPLOYER SHARE (50%)",
    description:
      "Half of the 1% fee goes directly to the token deployer. Claimable anytime — rewarding builders who launch on HEDG.",
  },
  {
    tag: "03",
    title: "TREASURY SHARE (50%)",
    description:
      "The other half of the fee flows to the HEDG treasury. 30% of treasury inflow is used to buy back $HEDG on Jupiter.",
  },
];

const buybackSteps = [
  {
    phase: "COLLECT",
    label: "Fee Accumulation",
    detail: "0.5% of every trade flows into the HEDG treasury wallet.",
  },
  {
    phase: "CHECK",
    label: "Threshold Check",
    detail:
      "Every 60 seconds, the system checks for new treasury inflow above 0.01 SOL.",
  },
  {
    phase: "SWAP",
    label: "Jupiter Buyback",
    detail:
      "30% of new inflow is swapped from SOL to $HEDG via Jupiter v6 API.",
  },
  {
    phase: "VERIFY",
    label: "On-Chain Record",
    detail:
      "Every buyback transaction is recorded on-chain and verifiable on Solscan.",
  },
];

const governanceItems = [
  { param: "Fee Rate", current: "1%", note: "Trading fee percentage" },
  {
    param: "Graduation Threshold",
    current: "85 SOL",
    note: "Market cap to auto-graduate",
  },
  {
    param: "Buyback %",
    current: "30%",
    note: "Treasury share used for buyback",
  },
  {
    param: "Collateral Amount",
    current: "TBD",
    note: "Required deployer collateral",
  },
];

export default function HedgTokenPage() {
  return (
    <main className="min-h-screen pt-20 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="mb-12 text-center">
          <h1 className="text-2xl md:text-4xl font-display text-text-primary mb-4 leading-relaxed neon-text-subtle">
            $HEDG TOKEN
          </h1>
          <p className="text-sm md:text-base text-text-secondary font-mono max-w-xl mx-auto leading-relaxed">
            <span className="text-primary">&gt; </span>
            The governance and utility token powering the HEDG protocol.
            <br />
            Continuous buyback. Community governance. Built to last.
          </p>
        </div>

        {/* What is $HEDG */}
        <section className="mb-12">
          <Card padding="lg">
            <h2 className="text-sm md:text-base font-display text-primary mb-4 neon-text-subtle">
              WHAT IS $HEDG?
            </h2>
            <div className="space-y-4 text-sm text-text-secondary font-mono leading-relaxed">
              <p>
                $HEDG is the governance and utility token of the HEDG
                protocol. It will launch following the same fair launch mechanics
                that HEDG champions — open bonding curve, no presale, no insider
                allocation.
              </p>
              <p>
                What makes $HEDG unique is its built-in buy pressure. Every
                trade on the HEDG launchpad generates fees, and a portion of
                those fees is automatically used to buy $HEDG on Jupiter. This
                creates a continuous, protocol-driven demand loop.
              </p>
              <p>
                As the protocol grows, $HEDG holders will gain governance power
                over key parameters — fee rates, graduation thresholds, buyback
                percentages, and more.
              </p>
            </div>
          </Card>
        </section>

        {/* Fee Structure */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-lg md:text-xl font-display text-text-primary mb-2 leading-relaxed">
              FEE STRUCTURE
            </h2>
            <p className="text-sm text-text-secondary font-mono">
              <span className="text-primary">&gt; </span>
              Every trade funds deployers and protocol growth.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {feeBreakdown.map((f) => (
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

        {/* Fee Flow Diagram */}
        <section className="mb-12">
          <Card padding="lg">
            <h2 className="text-sm md:text-base font-display text-primary mb-4 neon-text-subtle">
              FEE FLOW
            </h2>
            <div className="font-mono text-sm text-text-secondary leading-loose">
              <p className="text-text-primary mb-2">
                Trade 1 SOL (1% fee = 0.01 SOL)
              </p>
              <p className="ml-4">
                <span className="text-accent">├──</span>{" "}
                <span className="text-text-primary">0.5%</span> → Deployer{" "}
                <span className="text-text-muted">(claimable)</span>
              </p>
              <p className="ml-4">
                <span className="text-accent">└──</span>{" "}
                <span className="text-text-primary">0.5%</span> → Treasury
              </p>
              <p className="ml-12">
                <span className="text-primary">└──</span>{" "}
                <span className="text-primary">30%</span> →{" "}
                <span className="text-primary neon-text-subtle">
                  $HEDG Buyback
                </span>{" "}
                <span className="text-text-muted">(Jupiter swap)</span>
              </p>
            </div>
          </Card>
        </section>

        {/* Buyback Mechanism */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-lg md:text-xl font-display text-text-primary mb-2 leading-relaxed">
              BUYBACK & BURN
            </h2>
            <p className="text-sm text-text-secondary font-mono">
              <span className="text-primary">&gt; </span>
              Protocol-driven buy pressure, every minute.
            </p>
          </div>

          <div className="space-y-3">
            {buybackSteps.map((step, i) => (
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

        {/* Escrow Expiry Mechanism */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-lg md:text-xl font-display text-text-primary mb-2 leading-relaxed">
              ESCROW EXPIRY & BURN
            </h2>
            <p className="text-sm text-text-secondary font-mono">
              <span className="text-primary">&gt; </span>
              Every expired escrow feeds $HEDG buy pressure.
            </p>
          </div>

          <Card padding="lg" className="mb-6">
            <h3 className="text-sm md:text-base font-display text-primary mb-4 neon-text-subtle">
              HOW IT WORKS
            </h3>
            <div className="space-y-4 text-sm text-text-secondary font-mono leading-relaxed">
              <p>
                Every token launched on HEDG requires deployer collateral locked in
                escrow. When a token&apos;s deadline expires without graduating, the
                escrow collateral is processed based on holder activity:
              </p>
              <div className="arcade-border bg-bg p-6 my-4">
                <p className="text-xs font-display text-text-primary mb-4">SCENARIO A: NO HOLDERS (current supply = 0)</p>
                <div className="ml-4 space-y-2">
                  <p><span className="text-warning">50%</span> → Deployer refund <span className="text-text-muted">(partial recovery)</span></p>
                  <p><span className="text-primary">50%</span> → Treasury → <span className="text-primary neon-text-subtle">$HEDG Buyback + Burn</span></p>
                </div>
              </div>
              <div className="arcade-border bg-bg p-6 my-4">
                <p className="text-xs font-display text-text-primary mb-4">SCENARIO B: HOLDERS EXIST</p>
                <div className="ml-4 space-y-2">
                  <p><span className="text-success">100%</span> → Claimable by token holders via burn-to-refund</p>
                  <p className="text-text-muted text-xs mt-3">Each holder calls Refund on the token page to burn all their tokens and receive:</p>
                  <p className="text-text-muted text-xs ml-4">(my tokens / total circulating supply) x escrow SOL</p>
                  <p className="text-text-muted text-xs mt-2">No snapshot — calculated in real-time when each holder claims. First come, proportional share.</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Flywheel Diagram */}
          <Card padding="lg" className="mb-6">
            <h3 className="text-sm md:text-base font-display text-primary mb-6 neon-text-subtle">
              $HEDG VALUE FLYWHEEL
            </h3>
            <div className="font-mono text-sm text-text-secondary leading-loose">
              <div className="arcade-border bg-bg p-6 mb-6">
                <p className="text-xs font-display text-text-primary mb-4 text-center">ESCROW EXPIRY FLOW (NO HOLDERS)</p>
                <div className="space-y-2 text-center">
                  <p className="text-warning">Deadline expires, no buyers</p>
                  <p className="text-text-muted">&darr;</p>
                  <p>Escrow SOL split 50/50</p>
                  <p className="text-text-muted">&darr;</p>
                  <div className="flex justify-center gap-12 mt-4">
                    <div className="text-center">
                      <p className="text-warning">50% Deployer</p>
                      <p className="text-text-muted text-xs">partial refund</p>
                    </div>
                    <div className="text-center">
                      <p className="text-primary neon-text-subtle">50% Treasury</p>
                      <p className="text-text-muted text-xs">&darr;</p>
                      <p className="text-primary neon-text-subtle">$HEDG Buyback</p>
                      <p className="text-text-muted text-xs">&darr;</p>
                      <p className="text-error">BURN</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="arcade-border bg-bg p-6">
                <p className="text-xs font-display text-text-primary mb-4 text-center">ARBITRAGE FLYWHEEL (HOLDERS EXIST)</p>
                <div className="space-y-2 text-center">
                  <p className="text-success">Traders buy near deadline for escrow refund arbitrage</p>
                  <p className="text-text-muted">&darr;</p>
                  <p>Increased trading volume + 1% trade fees</p>
                  <p className="text-text-muted">&darr;</p>
                  <div className="flex justify-center gap-12 mt-4">
                    <div className="text-center">
                      <p className="text-accent">0.5% Deployer</p>
                      <p className="text-text-muted text-xs">builder reward</p>
                    </div>
                    <div className="text-center">
                      <p className="text-primary neon-text-subtle">0.5% Treasury</p>
                      <p className="text-text-muted text-xs">&darr;</p>
                      <p className="text-primary neon-text-subtle">30% → $HEDG Buyback</p>
                      <p className="text-text-muted text-xs">&darr;</p>
                      <p className="text-error">BURN</p>
                    </div>
                  </div>
                  <p className="text-text-muted mt-4">&darr;</p>
                  <p className="text-primary neon-text-subtle">$HEDG supply decreases → price increases</p>
                  <p className="text-text-muted">&darr;</p>
                  <p className="text-success">More traders attracted → cycle repeats</p>
                </div>
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <h3 className="text-sm md:text-base font-display text-primary mb-4 neon-text-subtle">
              WHY THIS MATTERS
            </h3>
            <div className="space-y-4 text-sm text-text-secondary font-mono leading-relaxed">
              <p>
                <span className="text-text-primary">Arbitrage incentive:</span>{" "}
                When a token&apos;s deadline approaches and the escrow collateral
                exceeds the token&apos;s market value, traders are incentivized to
                buy the token to claim a larger share of the escrow refund. This
                creates natural buy pressure and trading volume near deadlines.
              </p>
              <p>
                <span className="text-text-primary">Fee generation:</span>{" "}
                Every trade from these arbitrageurs generates 1% fees — 0.5% to
                deployers and 0.5% to the treasury. The treasury&apos;s share
                triggers automatic $HEDG buyback and burn on Jupiter.
              </p>
              <p>
                <span className="text-text-primary">Deflationary pressure:</span>{" "}
                Whether through direct escrow expiry (50% treasury buyback+burn)
                or through increased trading activity (fee-driven buyback+burn),
                every expired token contributes to $HEDG&apos;s deflationary
                mechanics and price support.
              </p>
              <p>
                <span className="text-text-primary">Virtuous cycle:</span>{" "}
                More launches → more escrow collateral at risk → more arbitrage
                opportunities → more trading volume → more fees → more $HEDG
                burned → higher $HEDG price → more users attracted to the platform.
              </p>
            </div>
          </Card>
        </section>

        {/* Tokenomics */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-lg md:text-xl font-display text-text-primary mb-2 leading-relaxed">
              TOKENOMICS
            </h2>
            <p className="text-sm text-text-secondary font-mono">
              <span className="text-primary">&gt; </span>
              Simple. Fair. No hidden allocations.
            </p>
          </div>

          <div className="arcade-border bg-bg-card overflow-hidden">
            <div className="grid grid-cols-2 gap-4 px-6 py-4 border-b-2 border-border bg-bg-elevated/40">
              <div className="text-xs font-display text-text-muted">
                PARAMETER
              </div>
              <div className="text-xs font-display text-primary text-right neon-text-subtle">
                VALUE
              </div>
            </div>
            {tokenomics.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-2 gap-4 px-6 py-4 items-center ${
                  i < tokenomics.length - 1
                    ? "border-b border-border/40"
                    : ""
                } hover:bg-bg-elevated/20 transition-colors`}
              >
                <div className="text-sm font-medium text-text-primary">
                  {row.label}
                </div>
                <div className="text-sm text-primary text-right font-medium font-mono neon-text-subtle">
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Governance */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-lg md:text-xl font-display text-text-primary mb-2 leading-relaxed">
              GOVERNANCE
            </h2>
            <p className="text-sm text-text-secondary font-mono">
              <span className="text-primary">&gt; </span>
              $HEDG holders shape the protocol.
            </p>
          </div>

          <Card padding="lg">
            <p className="text-sm text-text-secondary font-mono leading-relaxed mb-6">
              $HEDG governance will allow token holders to propose and vote on
              changes to key protocol parameters. This ensures the community
              controls the protocol&apos;s evolution — not a single team.
            </p>
            <div className="arcade-border bg-bg-card overflow-hidden">
              <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b-2 border-border bg-bg-elevated/40">
                <div className="text-xs font-display text-text-muted">
                  PARAMETER
                </div>
                <div className="text-xs font-display text-primary text-center neon-text-subtle">
                  CURRENT
                </div>
                <div className="text-xs font-display text-text-muted text-right">
                  NOTE
                </div>
              </div>
              {governanceItems.map((row, i) => (
                <div
                  key={row.param}
                  className={`grid grid-cols-3 gap-4 px-6 py-4 items-center ${
                    i < governanceItems.length - 1
                      ? "border-b border-border/40"
                      : ""
                  } hover:bg-bg-elevated/20 transition-colors`}
                >
                  <div className="text-sm font-medium text-text-primary">
                    {row.param}
                  </div>
                  <div className="text-sm text-primary text-center font-medium font-mono neon-text-subtle">
                    {row.current}
                  </div>
                  <div className="text-sm text-text-muted text-right font-mono">
                    {row.note}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Social */}
        <section className="mb-12">
          <Card padding="lg">
            <div className="text-center">
              <h2 className="text-sm md:text-base font-display text-primary mb-6 neon-text-subtle">
                JOIN THE COMMUNITY
              </h2>
              <p className="text-sm text-text-secondary font-mono leading-relaxed max-w-md mx-auto mb-8">
                Follow the latest updates, participate in governance
                discussions, and connect with the HEDG community.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <a
                  href="https://x.com/hedglol"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="arcade-border bg-bg-card px-6 py-3 text-sm font-display text-text-secondary hover:text-primary hover:border-primary transition-all"
                >
                  X (@hedglol)
                </a>
                <a
                  href="https://github.com/hedg-lol"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="arcade-border bg-bg-card px-6 py-3 text-sm font-display text-text-secondary hover:text-primary hover:border-primary transition-all"
                >
                  GitHub
                </a>
              </div>
            </div>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="arcade-border bg-bg-card p-10">
            <h2 className="text-lg font-display text-text-primary mb-4">
              GET $HEDG
            </h2>
            <p className="text-sm text-text-secondary font-mono mb-8">
              <span className="text-primary">&gt; </span>
              Fair launch. Open bonding curve. No presale. No insiders. Stay tuned.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button variant="primary" size="lg" disabled>
                COMING SOON
              </Button>
              <Link href="/about">
                <Button variant="outline" size="lg">
                  [ LEARN ABOUT HEDG ]
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
