"use client";

import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const comparisons = [
  {
    feature: "Accountability",
    other: "No accountability",
    fyrst: "Deployer collateral staked",
  },
  {
    feature: "Identity",
    other: "Anonymous launchers",
    fyrst: "Cross-wallet reputation",
  },
  {
    feature: "Rug Protection",
    other: "Rug and run",
    fyrst: "Automatic refunds",
  },
  {
    feature: "Transparency",
    other: "Hidden deployer history",
    fyrst: "Full on-chain track record",
  },
  {
    feature: "Philosophy",
    other: "Casino",
    fyrst: "Institution",
  },
];

export default function WhyFyrst() {
  return (
    <section className="py-24 px-6 bg-bg-card/30">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            Why FYRST
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Not all launchpads are created equal.
          </p>
        </motion.div>

        <motion.div
          className="bg-bg-card border border-border rounded-xl overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Table header */}
          <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-border bg-bg-elevated/30">
            <div className="text-sm font-medium text-text-muted">Feature</div>
            <div className="text-sm font-medium text-text-muted text-center">
              Other Launchpads
            </div>
            <div className="text-sm font-medium text-primary text-center">
              FYRST
            </div>
          </div>

          {/* Table rows */}
          {comparisons.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-3 gap-4 px-6 py-4 ${
                i < comparisons.length - 1 ? "border-b border-border/50" : ""
              }`}
            >
              <div className="text-sm font-medium text-text-primary">
                {row.feature}
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-error/80">
                <X className="w-4 h-4 shrink-0" />
                <span className="text-text-muted">{row.other}</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                <Check className="w-4 h-4 text-success shrink-0" />
                <span className="text-text-primary">{row.fyrst}</span>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
