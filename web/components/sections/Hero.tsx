"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Button from "@/components/ui/Button";

function FloatingParticle({ delay, x, y, size }: { delay: number; x: string; y: string; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-primary/20"
      style={{ left: x, top: y, width: size, height: size }}
      animate={{
        y: [0, -30, 0],
        opacity: [0.2, 0.5, 0.2],
      }}
      transition={{
        duration: 4 + Math.random() * 2,
        repeat: Infinity,
        delay,
        ease: "easeInOut",
      }}
    />
  );
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Blueprint grid background */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(37, 99, 235, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37, 99, 235, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Radial gradient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(37,99,235,0.08)_0%,_transparent_70%)]" />

      {/* Floating particles */}
      <FloatingParticle delay={0} x="15%" y="20%" size={6} />
      <FloatingParticle delay={1.2} x="80%" y="15%" size={4} />
      <FloatingParticle delay={0.5} x="65%" y="70%" size={8} />
      <FloatingParticle delay={2} x="25%" y="75%" size={5} />
      <FloatingParticle delay={0.8} x="45%" y="30%" size={3} />
      <FloatingParticle delay={1.5} x="90%" y="55%" size={6} />
      <FloatingParticle delay={0.3} x="10%" y="50%" size={4} />
      <FloatingParticle delay={1.8} x="70%" y="85%" size={5} />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.h1
          className="text-6xl md:text-8xl font-extrabold text-text-primary tracking-tight mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          FYRST
        </motion.h1>

        <motion.p
          className="text-xl md:text-2xl font-semibold text-primary mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
        >
          Launch safe. Buy confident.
        </motion.p>

        <motion.p
          className="text-base md:text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
        >
          The first accountable token launchpad on Solana. Deployer collateral.
          Cross-wallet reputation. Automatic refunds.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: "easeOut" }}
        >
          <Link href="/dashboard">
            <Button variant="primary" size="lg">
              Browse Launches
            </Button>
          </Link>
          <Link href="/launch">
            <Button variant="outline" size="lg">
              Launch Token
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
