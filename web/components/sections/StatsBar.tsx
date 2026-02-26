"use client";

import { motion } from "framer-motion";

const stats = [
  { label: "Total Launches Protected", value: "2,847" },
  { label: "SOL in Escrow", value: "34,520" },
  { label: "Refunds Processed", value: "1,209" },
  { label: "Avg Deployer Score", value: "78.4" },
];

export default function StatsBar() {
  return (
    <section className="relative z-10 border-y border-border bg-bg-card/60 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <p className="text-2xl md:text-3xl font-bold font-mono text-text-primary mb-1">
                {stat.value}
              </p>
              <p className="text-sm text-text-muted">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
