"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const tokenomics = [
  { label: "Total Supply", value: "1,000,000,000" },
  { label: "Launch Platform", value: "pump.fun" },
  { label: "Buy Pressure", value: "Continuous (Buyback)" },
  { label: "Governance", value: "Coming Soon" },
];

const feeBreakdown = [
  {
    tag: "01",
    title: "TRADING FEE (1%)",
    description:
      "Every buy and sell on the FYRST bonding curve incurs a 1% fee. This funds both deployers and the protocol treasury.",
  },
  {
    tag: "02",
    title: "DEPLOYER SHARE (0.5%)",
    description:
      "Half the fee goes directly to the token deployer. Claimable anytime — rewarding builders who launch on FYRST.",
  },
  {
    tag: "03",
    title: "TREASURY SHARE (0.5%)",
    description:
      "The other half flows to the FYRST treasury. 30% of treasury inflow is used to buy back $FYRST on Jupiter.",
  },
];

const buybackSteps = [
  {
    phase: "COLLECT",
    label: "Fee Accumulation",
    detail: "0.5% of every trade flows into the FYRST treasury wallet.",
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
      "30% of new inflow is swapped from SOL to $FYRST via Jupiter v6 API.",
  },
  {
    phase: "NOTIFY",
    label: "Telegram Alert",
    detail:
      "Every buyback is announced in the FYRST Telegram with amount and tx link.",
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

export default function FyrstTokenPage() {
  return (
    <main className="min-h-screen pt-20 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="mb-12 text-center">
          <h1 className="text-sm md:text-base font-display text-text-primary mb-4 leading-relaxed">
            $FYRST TOKEN
          </h1>
          <p className="text-sm text-text-secondary font-mono max-w-xl mx-auto leading-relaxed">
            <span className="text-primary">&gt; </span>
            The governance and utility token powering the FYRST protocol.
            <br />
            Continuous buyback. Community governance. Built to last.
          </p>
        </div>

        {/* What is $FYRST */}
        <section className="mb-12">
          <Card padding="lg">
            <h2 className="text-[10px] font-display text-primary mb-4 neon-text-subtle">
              WHAT IS $FYRST?
            </h2>
            <div className="space-y-3 text-xs text-text-secondary font-mono leading-relaxed">
              <p>
                $FYRST is the governance and utility token of the FYRST
                protocol. It will launch on pump.fun following the same fair
                launch mechanics that FYRST champions — no presale, no insider
                allocation, just an open bonding curve.
              </p>
              <p>
                What makes $FYRST unique is its built-in buy pressure. Every
                trade on the FYRST launchpad generates fees, and a portion of
                those fees is automatically used to buy $FYRST on Jupiter. This
                creates a continuous, protocol-driven demand loop.
              </p>
              <p>
                As the protocol grows, $FYRST holders will gain governance power
                over key parameters — fee rates, graduation thresholds, buyback
                percentages, and more.
              </p>
            </div>
          </Card>
        </section>

        {/* Fee Structure */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-xs font-display text-text-primary mb-2 leading-relaxed">
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

        {/* Fee Flow Diagram */}
        <section className="mb-12">
          <Card padding="lg">
            <h2 className="text-[10px] font-display text-primary mb-4 neon-text-subtle">
              FEE FLOW
            </h2>
            <div className="font-mono text-xs text-text-secondary leading-loose">
              <p className="text-text-primary mb-2">
                Trade 1 SOL (1% fee = 0.01 SOL)
              </p>
              <p className="ml-2">
                <span className="text-accent">├──</span>{" "}
                <span className="text-text-primary">0.5%</span> → Deployer{" "}
                <span className="text-text-muted">(claimable)</span>
              </p>
              <p className="ml-2">
                <span className="text-accent">└──</span>{" "}
                <span className="text-text-primary">0.5%</span> → Treasury
              </p>
              <p className="ml-10">
                <span className="text-primary">└──</span>{" "}
                <span className="text-primary">30%</span> →{" "}
                <span className="text-primary neon-text-subtle">
                  $FYRST Buyback
                </span>{" "}
                <span className="text-text-muted">(Jupiter swap)</span>
              </p>
            </div>
          </Card>
        </section>

        {/* Buyback Mechanism */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-xs font-display text-text-primary mb-2 leading-relaxed">
              BUYBACK & BURN
            </h2>
            <p className="text-sm text-text-secondary font-mono">
              <span className="text-primary">&gt; </span>
              Protocol-driven buy pressure, every minute.
            </p>
          </div>

          <div className="space-y-2">
            {buybackSteps.map((step, i) => (
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
                  {i < buybackSteps.length - 1 && (
                    <span className="text-[10px] font-display text-text-muted self-center">
                      &rarr;
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Tokenomics */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-xs font-display text-text-primary mb-2 leading-relaxed">
              TOKENOMICS
            </h2>
            <p className="text-sm text-text-secondary font-mono">
              <span className="text-primary">&gt; </span>
              Simple. Fair. No hidden allocations.
            </p>
          </div>

          <div className="arcade-border bg-bg-card overflow-hidden">
            <div className="grid grid-cols-2 gap-2 px-4 py-3 border-b-2 border-border bg-bg-elevated/40">
              <div className="text-[8px] font-display text-text-muted">
                PARAMETER
              </div>
              <div className="text-[8px] font-display text-primary text-right neon-text-subtle">
                VALUE
              </div>
            </div>
            {tokenomics.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-2 gap-2 px-4 py-3 items-center ${
                  i < tokenomics.length - 1
                    ? "border-b border-border/40"
                    : ""
                } hover:bg-bg-elevated/20 transition-colors`}
              >
                <div className="text-xs font-medium text-text-primary">
                  {row.label}
                </div>
                <div className="text-xs text-primary text-right font-medium font-mono neon-text-subtle">
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Governance */}
        <section className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-xs font-display text-text-primary mb-2 leading-relaxed">
              GOVERNANCE
            </h2>
            <p className="text-sm text-text-secondary font-mono">
              <span className="text-primary">&gt; </span>
              $FYRST holders shape the protocol.
            </p>
          </div>

          <Card padding="lg">
            <p className="text-xs text-text-secondary font-mono leading-relaxed mb-4">
              $FYRST governance will allow token holders to propose and vote on
              changes to key protocol parameters. This ensures the community
              controls the protocol&apos;s evolution — not a single team.
            </p>
            <div className="arcade-border bg-bg-card overflow-hidden">
              <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b-2 border-border bg-bg-elevated/40">
                <div className="text-[8px] font-display text-text-muted">
                  PARAMETER
                </div>
                <div className="text-[8px] font-display text-primary text-center neon-text-subtle">
                  CURRENT
                </div>
                <div className="text-[8px] font-display text-text-muted text-right">
                  NOTE
                </div>
              </div>
              {governanceItems.map((row, i) => (
                <div
                  key={row.param}
                  className={`grid grid-cols-3 gap-2 px-4 py-3 items-center ${
                    i < governanceItems.length - 1
                      ? "border-b border-border/40"
                      : ""
                  } hover:bg-bg-elevated/20 transition-colors`}
                >
                  <div className="text-xs font-medium text-text-primary">
                    {row.param}
                  </div>
                  <div className="text-xs text-primary text-center font-medium font-mono neon-text-subtle">
                    {row.current}
                  </div>
                  <div className="text-xs text-text-muted text-right font-mono">
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
              <h2 className="text-[10px] font-display text-primary mb-4 neon-text-subtle">
                JOIN THE COMMUNITY
              </h2>
              <p className="text-xs text-text-secondary font-mono leading-relaxed max-w-md mx-auto mb-6">
                Follow the latest updates, participate in governance
                discussions, and connect with the FYRST community.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <a
                  href="https://x.com/fyrstfun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="arcade-border bg-bg-card px-4 py-2 text-xs font-display text-text-secondary hover:text-primary hover:border-primary transition-all"
                >
                  X (@fyrstfun)
                </a>
                <a
                  href="https://t.me/fyrstfun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="arcade-border bg-bg-card px-4 py-2 text-xs font-display text-text-secondary hover:text-primary hover:border-primary transition-all"
                >
                  Telegram
                </a>
                <a
                  href="https://github.com/fyrst-fun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="arcade-border bg-bg-card px-4 py-2 text-xs font-display text-text-secondary hover:text-primary hover:border-primary transition-all"
                >
                  GitHub
                </a>
              </div>
            </div>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="arcade-border bg-bg-card p-8">
            <h2 className="text-[10px] font-display text-text-primary mb-3">
              GET $FYRST
            </h2>
            <p className="text-xs text-text-secondary font-mono mb-6">
              <span className="text-primary">&gt; </span>
              Fair launch on pump.fun. No presale. No insiders.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button variant="primary" size="md" disabled>
                COMING SOON ON PUMP.FUN
              </Button>
              <Link href="/about">
                <Button variant="outline" size="md">
                  LEARN ABOUT FYRST
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
