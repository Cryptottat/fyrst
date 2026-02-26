"use client";

import { motion } from "framer-motion";
import { Shield, Fingerprint, RotateCcw } from "lucide-react";

const steps = [
  {
    icon: Shield,
    title: "Deployer Stakes Collateral",
    description:
      "Every token deployer must lock SOL as collateral in a trustless escrow. Bronze to Diamond tiers signal commitment level. If the token rugs, their collateral is at risk.",
  },
  {
    icon: Fingerprint,
    title: "Reputation Tracked Cross-Wallet",
    description:
      "The Deployer Reputation System (DRS) tracks behavior across wallets using on-chain pattern analysis. No hiding behind new addresses. Past launches build your permanent record.",
  },
  {
    icon: RotateCcw,
    title: "Auto-Refund on Rug",
    description:
      "If a token meets rug-pull criteria during the safe period, buyers automatically receive refunds from the escrowed collateral. No claims process. No disputes. Just protection.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
            How It Works
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Three layers of protection between you and the next rug pull.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                className="bg-bg-card border border-border rounded-xl p-8 border-l-4 border-l-primary"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-6">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-mono text-text-muted">
                    0{i + 1}
                  </span>
                  <h3 className="text-lg font-semibold text-text-primary">
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
