"use client";

const comparisons = [
  {
    feature: "Accountability",
    other: "lol no",
    fyrst: "Collateral staked",
  },
  {
    feature: "Identity",
    other: "anon devs",
    fyrst: "Cross-wallet rep",
  },
  {
    feature: "Rug Protection",
    other: "rug & run",
    fyrst: "Auto refunds",
  },
  {
    feature: "Transparency",
    other: "hidden history",
    fyrst: "Full on-chain",
  },
  {
    feature: "Vibes",
    other: "casino",
    fyrst: "ARCADE",
  },
];

export default function WhyFyrst() {
  return (
    <section className="py-20 px-6 bg-bg-card/30">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-xs md:text-sm font-display text-text-primary mb-3 leading-relaxed">
            VERSUS MODE
          </h2>
          <p className="text-sm text-text-secondary font-mono">
            <span className="text-primary">&gt; </span>
            Not all launchpads are created equal.
          </p>
        </div>

        <div className="arcade-border bg-bg-card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_auto_1fr] gap-2 px-4 py-3 border-b-2 border-border bg-bg-elevated/40">
            <div className="text-[8px] font-display text-text-muted">STAT</div>
            <div className="text-[8px] font-display text-error text-center neon-text-subtle">
              SHITCOIN CASINO
            </div>
            <div className="text-[8px] font-display text-text-muted text-center px-1">
              VS
            </div>
            <div className="text-[8px] font-display text-primary text-center neon-text-subtle">
              FYRST ARCADE
            </div>
          </div>

          {/* Table rows */}
          {comparisons.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-[1fr_1fr_auto_1fr] gap-2 px-4 py-3 items-center ${
                i < comparisons.length - 1 ? "border-b border-border/40" : ""
              } hover:bg-bg-elevated/20 transition-colors`}
            >
              <div className="text-xs font-medium text-text-primary">
                {row.feature}
              </div>
              <div className="text-xs text-text-muted text-center font-mono">
                {row.other}
              </div>
              <div className="text-[8px] font-display text-secondary neon-text-subtle px-1">
                VS
              </div>
              <div className="text-xs text-primary text-center font-medium font-mono neon-text-subtle">
                {row.fyrst}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
