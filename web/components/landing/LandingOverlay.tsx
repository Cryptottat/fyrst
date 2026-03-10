"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Hedgehog accent palette ───
const H = {
  cream: "#F5E6CA",
  gold: "#D4A853",
  frost: "#7EC8E3",
  brown: "#8B6914",
  red: "#E84855",
  green: "#34D399",
  warn: "#FBBF24",
  muted: "#9E9EA8",
  dim: "#888891",
  card: "#111115",
  elevated: "#1A1A20",
  border: "#2A2A30",
} as const;

const arcadeCard = {
  background: H.card,
  border: `2px solid ${H.border}`,
  boxShadow: `inset -2px -2px 0 0 rgba(0,0,0,0.4), inset 2px 2px 0 0 rgba(255,255,255,0.08)`,
} as const;

const glow = (c: string) => `0 0 8px ${c}, 0 0 16px ${c}`;

const spring = { type: "spring" as const, stiffness: 400, damping: 25 };

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

// ─── Card data ───
const deployerCards = [
  {
    tag: "LAUNCH", title: "Low-Risk Launch", color: H.frost,
    desc: "Escrow collateral is fully refunded on graduation. You only lose it if the token fails — that's the accountability layer.",
  },
  {
    tag: "EARN", title: "Revenue Share", color: H.gold,
    desc: "Earn 50% of every trade fee on your token. Claimable anytime from on-chain fee vault. Your token = your income stream.",
  },
  {
    tag: "GROW", title: "Build Reputation", color: H.cream,
    desc: "Successful launches build your on-chain score (A-F). Higher reputation attracts more buyers, higher volume, more revenue.",
  },
  {
    tag: "DEX", title: "Auto-Graduation", color: H.green,
    desc: "Hit 85 SOL market cap and your token auto-lists on Raydium CPMM. No manual steps. LP permanently locked for buyer confidence.",
  },
];

const traderCards = [
  {
    tag: "SAFE", title: "Escrow Protection", color: H.gold,
    desc: "Every token has SOL locked as collateral. If a token fails, burn your tokens to claim proportional SOL from escrow. No more total losses.",
  },
  {
    tag: "CHECK", title: "Deployer Reputation", color: H.cream,
    desc: "View deployer track record before buying. Past launches, rug history, and behavior scored A-F on-chain. Information is power.",
  },
  {
    tag: "FAIR", title: "Transparent Pricing", color: H.green,
    desc: "Bonding curve ensures deterministic, transparent pricing. No hidden manipulation, no fake volume, no frontrunning.",
  },
  {
    tag: "LOCK", title: "Locked Liquidity", color: H.frost,
    desc: "Graduated tokens have permanently locked LP on Raydium. Deployers can never pull liquidity. Your investment is protected.",
  },
];

function HoverCard({
  children,
  accentColor,
  className = "",
}: {
  children: React.ReactNode;
  accentColor: string;
  className?: string;
}) {
  return (
    <motion.div
      className={`p-5 transition-all duration-100 pointer-events-auto ${className}`}
      style={arcadeCard}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={spring}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accentColor;
        e.currentTarget.style.boxShadow = `0 0 16px ${accentColor}30, ${arcadeCard.boxShadow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = H.border;
        e.currentTarget.style.boxShadow = arcadeCard.boxShadow;
      }}
    >
      {children}
    </motion.div>
  );
}

// ─── CTA Button Components ───
function CtaButtons() {
  return (
    <div className="flex gap-4 pointer-events-auto">
      <motion.a
        href="/launch"
        className="px-6 py-3 font-display text-sm tracking-wide transition-all"
        style={{
          background: H.gold,
          color: "#0A0A0C",
          border: `2px solid ${H.gold}`,
          boxShadow: `inset -3px -3px 0px ${H.brown}, inset 3px 3px 0px ${H.cream}40`,
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={spring}
      >
        LAUNCH TOKEN
      </motion.a>
      <motion.a
        href="/floor"
        className="px-6 py-3 font-display text-sm tracking-wide transition-all"
        style={{ color: H.cream, ...arcadeCard }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={spring}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = H.gold; e.currentTarget.style.color = H.gold; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = H.border; e.currentTarget.style.color = H.cream; }}
      >
        ENTER APP
      </motion.a>
    </div>
  );
}

// YouTube IFrame API type
declare global {
  interface Window {
    YT?: { Player: new (id: string, opts: Record<string, unknown>) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}
interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (v: number) => void;
  destroy: () => void;
}

export default function LandingOverlay({ scrollDepth = 0 }: { scrollDepth?: number }) {
  const [activeTab, setActiveTab] = useState<"deployers" | "traders">("deployers");
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicReady, setMusicReady] = useState(false);
  const playerRef = useRef<YTPlayer | null>(null);
  const consentGiven = useRef(false);

  // Load YouTube IFrame API and init player on consent
  const initPlayer = useCallback(() => {
    if (playerRef.current || consentGiven.current) return;
    consentGiven.current = true;

    // Create container outside React DOM to avoid insertBefore conflicts
    let container = document.getElementById("yt-bgm");
    if (!container) {
      container = document.createElement("div");
      container.id = "yt-bgm";
      container.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:0;height:0;";
      document.body.appendChild(container);
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    const create = () => {
      playerRef.current = new window.YT!.Player("yt-bgm", {
        videoId: "9zCOo1Lp-gw",
        playerVars: { autoplay: 1, loop: 1, playlist: "9zCOo1Lp-gw", controls: 0, showinfo: 0, modestbranding: 1 },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            e.target.setVolume(30);
            e.target.playVideo();
            setMusicPlaying(true);
            setMusicReady(true);
          },
        },
      } as Record<string, unknown>);
    };

    if (window.YT?.Player) {
      create();
    } else {
      window.onYouTubeIframeAPIReady = create;
    }
  }, []);

  // Listen for cookie consent event
  useEffect(() => {
    const stored = typeof window !== "undefined" && localStorage.getItem("hedg_cookie_consent");
    if (stored) {
      initPlayer();
    }
    const handler = () => initPlayer();
    window.addEventListener("cookie-consent", handler);
    return () => window.removeEventListener("cookie-consent", handler);
  }, [initPlayer]);

  const toggleMusic = useCallback(() => {
    if (!playerRef.current) return;
    if (musicPlaying) {
      playerRef.current.pauseVideo();
      setMusicPlaying(false);
    } else {
      playerRef.current.playVideo();
      setMusicPlaying(true);
    }
  }, [musicPlaying]);

  const cards = activeTab === "deployers" ? deployerCards : traderCards;

  return (
    <div className="relative z-20 pointer-events-none">

      {/* Music toggle (fixed, top-right next to header) */}
      {musicReady && (
        <button
          onClick={toggleMusic}
          className="fixed top-3 right-6 z-[55] px-3 py-1.5 font-display text-xs tracking-wide transition-all rounded cursor-pointer pointer-events-auto"
          style={{
            color: musicPlaying ? H.gold : H.dim,
            border: `1px solid ${musicPlaying ? H.gold + "60" : H.border}`,
            background: "rgba(10,10,12,0.7)",
            backdropFilter: "blur(4px)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = H.gold; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = musicPlaying ? H.gold + "60" : H.border; }}
        >
          {musicPlaying ? "♪ ON" : "♪ OFF"}
        </button>
      )}


      {/* ═══ 1. HERO ═══ */}
      <motion.section
        className="min-h-screen flex flex-col items-center justify-center px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <h1
          className="font-display text-2xl md:text-4xl tracking-tight text-center"
          style={{ color: H.cream, textShadow: glow(H.cream) }}
        >
          HEDGE YOUR LAUNCH
        </h1>
        <p className="mt-4 text-xs md:text-sm font-mono tracking-widest uppercase" style={{ color: H.muted }}>
          The first responsible memecoin launchpad on Solana
        </p>
        <p className="mt-2 text-sm font-mono text-center" style={{ color: H.dim }}>
          Deployer collateral &middot; Cross-wallet reputation &middot; Auto-refund on failure
        </p>

        {/* Hero CTA */}
        <div className="mt-10">
          <CtaButtons />
        </div>

        <div className="mt-6">
          <div
            className="px-3 py-1.5 text-xs font-display animate-blink pointer-events-auto"
            style={{ color: H.dim, border: `2px solid ${H.border}` }}
          >
            SCROLL TO EXPLORE
          </div>
        </div>
      </motion.section>

      {/* ═══ 2. THE PROBLEM ═══ */}
      <motion.section
        className="py-24 md:py-32 flex flex-col items-center px-6"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <p
          className="text-lg md:text-2xl font-mono text-center mb-8"
          style={{ color: H.red, textShadow: glow(H.red) }}
        >
          89% of memecoins die within 24 hours.
        </p>
        <div className="flex gap-6 mb-6 pointer-events-auto">
          <div style={arcadeCard} className="px-6 py-5 text-center">
            <p className="text-3xl font-display" style={{ color: H.red, textShadow: glow(H.red) }}>89%</p>
            <p className="text-xs font-display mt-2" style={{ color: `${H.red}99` }}>RUGGED</p>
          </div>
          <div style={arcadeCard} className="px-6 py-5 text-center">
            <p className="text-3xl font-display" style={{ color: H.frost, textShadow: glow(H.frost) }}>11%</p>
            <p className="text-xs font-display mt-2" style={{ color: `${H.frost}99` }}>SURVIVED</p>
          </div>
        </div>
        <div className="max-w-lg text-center space-y-2">
          <p className="text-sm font-mono" style={{ color: H.muted }}>
            Zero-cost launches. Anonymous deployers. No accountability.
          </p>
          <p className="text-sm font-mono" style={{ color: H.dim }}>
            Holders are left with worthless bags. Deployers walk away free.
          </p>
          <p className="text-sm font-mono" style={{ color: H.dim }}>
            HEDG changes everything.
          </p>
        </div>
      </motion.section>

      {/* ═══ 3. HOW HEDG PROTECTS YOU ═══ */}
      <motion.section
        className="py-24 md:py-32 flex flex-col px-6 md:px-20"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <h2
          className="font-display text-sm md:text-xl mb-8"
          style={{ color: H.gold, textShadow: glow(H.gold) }}
        >
          HOW HEDG PROTECTS YOU
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
          {[
            {
              tag: "01", title: "ESCROW LOCK", color: H.frost,
              desc: "Every launch requires SOL collateral locked in a smart contract escrow. Deployers must put skin in the game. No collateral = no launch. The escrow stays locked until graduation or expiry.",
            },
            {
              tag: "02", title: "AUTO REFUND", color: H.gold,
              desc: "Token dead? Holders burn their tokens and receive SOL back from escrow — proportional to holdings. Fully on-chain, no middlemen, no disputes. Your SOL, guaranteed.",
            },
            {
              tag: "03", title: "REPUTATION", color: H.cream,
              desc: "On-chain reputation follows deployers across wallets. Launch history, rug record, and behavior scored A through F. Permanent, transparent, and unforgeable.",
            },
          ].map((card, i) => (
            <HoverCard key={i} accentColor={card.color}>
              <div className="text-xs font-display mb-3" style={{ color: card.color, textShadow: `0 0 6px ${card.color}` }}>{card.tag}</div>
              <h3 className="font-display text-sm tracking-wide mb-3" style={{ color: card.color }}>{card.title}</h3>
              <p className="text-sm leading-relaxed font-sans" style={{ color: H.muted }}>{card.desc}</p>
            </HoverCard>
          ))}
        </div>
      </motion.section>

      {/* ═══ 4. TOKEN LIFECYCLE ═══ */}
      <motion.section
        className="py-24 md:py-32 flex flex-col px-6 md:px-20"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <h2
          className="font-display text-sm md:text-lg mb-8 text-right"
          style={{ color: H.frost, textShadow: glow(H.frost) }}
        >
          FROM LAUNCH TO DEX
        </h2>
        <div className="max-w-2xl w-full mx-auto space-y-3 pointer-events-auto">
          {[
            {
              phase: "LAUNCH", label: "Token Created", color: H.frost, align: "left" as const,
              detail: "Deployer locks SOL collateral and mints token on the bonding curve. Metadata and token account created on-chain via Metaplex. Token starts trading immediately.",
            },
            {
              phase: "TRADE", label: "Bonding Curve", color: H.gold, align: "right" as const,
              detail: "Buy and sell on a deterministic price curve. Price rises with demand, falls with supply. 1% fee per trade split between deployer and protocol.",
            },
            {
              phase: "GRADUATE", label: "Auto-DEX Listing", color: H.green, align: "left" as const,
              detail: "At 85 SOL market cap, token auto-graduates to Raydium CPMM. Permissionless cranker bot executes graduation. Liquidity permanently locked — no rug possible.",
            },
            {
              phase: "LIVE", label: "Open Market", color: H.cream, align: "right" as const,
              detail: "Token trades freely on Raydium and Jupiter. Deployer reclaims full escrow collateral. Fee income continues flowing. Community takes over.",
            },
          ].map((step) => (
            <div key={step.phase} className={`flex ${step.align === "right" ? "justify-end" : "justify-start"}`}>
              <div className="flex items-start gap-4 p-4 max-w-md" style={arcadeCard}>
                <div className="shrink-0 w-16 text-center pt-1">
                  <span className="text-xs font-display" style={{ color: step.color, textShadow: `0 0 6px ${step.color}` }}>{step.phase}</span>
                </div>
                <div className="w-px self-stretch" style={{ background: H.border }} />
                <div className="flex-1">
                  <h3 className="text-sm font-display mb-1" style={{ color: H.cream }}>{step.label}</h3>
                  <p className="text-sm font-mono leading-relaxed" style={{ color: H.muted }}>{step.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ═══ 5. HEDG VS PUMP.FUN ═══ */}
      <motion.section
        className="py-24 md:py-32 flex flex-col items-center px-6"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <h2 className="font-display text-sm md:text-lg mb-6" style={{ color: H.frost, textShadow: glow(H.frost) }}>
          HEDG VS PUMP.FUN
        </h2>
        <div className="max-w-lg w-full pointer-events-auto overflow-x-auto" style={arcadeCard}>
          <div className="min-w-[400px]">
            <div className="grid grid-cols-3 gap-2 px-4 py-3" style={{ borderBottom: `2px solid ${H.border}`, background: H.elevated }}>
              <div className="text-xs font-display" style={{ color: H.dim }}>FEATURE</div>
              <div className="text-xs font-display text-center" style={{ color: H.dim }}>PUMP.FUN</div>
              <div className="text-xs font-display text-center" style={{ color: H.gold, textShadow: `0 0 6px ${H.gold}` }}>HEDG</div>
            </div>
            {[
              { feature: "Launch Cost", pump: "0 SOL", hedg: "Collateral locked" },
              { feature: "Rug Protection", pump: "None", hedg: "Auto-refund via escrow" },
              { feature: "Reputation", pump: "Anonymous", hedg: "Cross-wallet scored (A-F)" },
              { feature: "LP After Grad", pump: "Unlocked", hedg: "Permanently locked" },
              { feature: "Deployer Fees", pump: "None", hedg: "50% of trade fees" },
              { feature: "Token Buyback", pump: "None", hedg: "Auto buyback + burn" },
              { feature: "Transparency", pump: "Partial", hedg: "Fully on-chain" },
              { feature: "Failed Token", pump: "Total loss", hedg: "Burn-to-refund" },
            ].map((row, i) => (
              <div key={row.feature} className="grid grid-cols-3 gap-2 px-4 py-2.5 items-center" style={{ borderBottom: i < 7 ? `1px solid ${H.border}60` : "none" }}>
                <div className="text-sm font-sans" style={{ color: H.cream }}>{row.feature}</div>
                <div className="text-sm font-mono text-center" style={{ color: H.red }}><span style={{ color: H.red, opacity: 0.6 }}>&#x2717; </span>{row.pump}</div>
                <div className="text-sm font-mono text-center" style={{ color: H.gold }}><span style={{ color: H.green }}>&#x2713; </span>{row.hedg}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ═══ 6. FOR DEPLOYERS / FOR TRADERS (tabbed) ═══ */}
      <motion.section
        className="py-24 md:py-32 flex flex-col px-6 md:px-20"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="flex gap-4 mb-6 pointer-events-auto">
          <button
            className="font-display text-sm tracking-wide px-4 py-2 transition-all"
            style={{
              color: activeTab === "deployers" ? H.gold : H.dim,
              borderBottom: activeTab === "deployers" ? `2px solid ${H.gold}` : `2px solid transparent`,
              textShadow: activeTab === "deployers" ? glow(H.gold) : "none",
              background: "transparent",
            }}
            onClick={() => setActiveTab("deployers")}
          >
            FOR DEPLOYERS
          </button>
          <button
            className="font-display text-sm tracking-wide px-4 py-2 transition-all"
            style={{
              color: activeTab === "traders" ? H.frost : H.dim,
              borderBottom: activeTab === "traders" ? `2px solid ${H.frost}` : `2px solid transparent`,
              textShadow: activeTab === "traders" ? glow(H.frost) : "none",
              background: "transparent",
            }}
            onClick={() => setActiveTab("traders")}
          >
            FOR TRADERS
          </button>
        </div>
        <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          className="max-w-md space-y-2 pointer-events-auto"
          initial={{ opacity: 0, x: activeTab === "deployers" ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: activeTab === "deployers" ? 20 : -20 }}
          transition={{ duration: 0.25 }}
        >
          {cards.map((item) => (
            <div key={item.title} className="flex items-start gap-4 p-4" style={arcadeCard}>
              <span
                className="text-xs font-display shrink-0 w-14 text-center pt-0.5"
                style={{ color: item.color, textShadow: `0 0 6px ${item.color}` }}
              >
                {item.tag}
              </span>
              <div className="w-px self-stretch" style={{ background: H.border }} />
              <div>
                <h3 className="text-sm font-display mb-1" style={{ color: item.color }}>{item.title}</h3>
                <p className="text-sm font-mono leading-relaxed" style={{ color: H.muted }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
        </AnimatePresence>
      </motion.section>

      {/* ═══ 7. FEE STRUCTURE ═══ */}
      <motion.section
        className="py-24 md:py-32 flex flex-col items-center px-6"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <h2
          className="font-display text-sm md:text-lg mb-6"
          style={{ color: H.gold, textShadow: glow(H.gold) }}
        >
          FEE STRUCTURE
        </h2>
        <div className="max-w-md w-full pointer-events-auto p-5" style={arcadeCard}>
          <p className="text-sm font-display mb-5" style={{ color: H.cream }}>
            TRADE 1 SOL (1% FEE = 0.01 SOL)
          </p>
          <div className="font-mono text-sm leading-loose" style={{ color: H.muted }}>
            <p>
              <span style={{ color: H.green }}>|--</span>{" "}
              <span style={{ color: H.cream }}>0.5%</span> &rarr; Deployer{" "}
              <span style={{ color: H.dim }}>(claimable anytime)</span>
            </p>
            <p>
              <span style={{ color: H.green }}>|--</span>{" "}
              <span style={{ color: H.cream }}>0.5%</span> &rarr; Protocol Treasury
            </p>
            <p className="ml-8">
              <span style={{ color: H.gold }}>|--</span>{" "}
              <span style={{ color: H.gold }}>60%</span> &rarr; $HEDG Buyback + Burn
            </p>
            <p className="ml-8">
              <span style={{ color: H.gold }}>|--</span>{" "}
              <span style={{ color: H.frost }}>40%</span> &rarr; Operations
            </p>
          </div>
          <p className="text-xs font-mono mt-5" style={{ color: H.dim }}>
            Every single trade feeds deployer income and protocol growth simultaneously.
            No hidden fees. No extraction. All verifiable on-chain.
          </p>
        </div>
      </motion.section>

      {/* ═══ 8. BUYBACK & BURN ═══ */}
      <motion.section
        className="py-24 md:py-32 flex flex-col px-6 md:px-20"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <h2
          className="font-display text-sm md:text-lg mb-6"
          style={{ color: H.red, textShadow: glow(H.red) }}
        >
          BUYBACK & BURN FLYWHEEL
        </h2>
        <div className="max-w-md space-y-2 pointer-events-auto">
          {[
            { phase: "COLLECT", label: "Fee Accumulation", detail: "Protocol treasury share of every trade flows into the HEDG treasury wallet automatically.", color: H.frost },
            { phase: "CHECK", label: "Threshold Monitor", detail: "Every 60 seconds, the system checks for new treasury inflow above 0.01 SOL threshold.", color: H.gold },
            { phase: "SWAP", label: "Jupiter Buyback", detail: "60% of new inflow is swapped from SOL to $HEDG via Jupiter aggregator, then permanently burned.", color: H.red },
            { phase: "ALERT", label: "Telegram Notification", detail: "Every buyback is announced in HEDG Telegram with exact amount, burn tx link, and remaining supply.", color: H.green },
          ].map((step) => (
            <div key={step.phase} className="flex items-center gap-3 p-4" style={arcadeCard}>
              <span className="text-xs font-display shrink-0 w-14 text-center" style={{ color: step.color, textShadow: `0 0 6px ${step.color}` }}>
                {step.phase}
              </span>
              <div className="w-px h-10 shrink-0" style={{ background: H.border }} />
              <div>
                <h3 className="text-sm font-display mb-1" style={{ color: H.cream }}>{step.label}</h3>
                <p className="text-sm font-mono leading-relaxed" style={{ color: H.muted }}>{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs font-mono max-w-md" style={{ color: H.dim }}>
          Result: Permanent buy pressure on $HEDG. Supply decreases with every trade on the platform.
        </p>
      </motion.section>

      {/* ═══ 9. ESCROW SCENARIOS ═══ */}
      <motion.section
        className="py-24 md:py-32 flex flex-col items-center px-6"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <h2
          className="font-display text-sm md:text-lg mb-6"
          style={{ color: H.warn, textShadow: glow(H.warn) }}
        >
          ESCROW EXPIRY SCENARIOS
        </h2>
        <div className="max-w-2xl w-full grid grid-cols-1 md:grid-cols-2 gap-4 pointer-events-auto">
          <div className="p-5" style={{ ...arcadeCard, borderTop: `3px solid ${H.warn}` }}>
            <p className="text-xs font-display mb-4" style={{ color: H.cream }}>SCENARIO A: NO HOLDERS LEFT</p>
            <div className="text-sm font-mono space-y-2" style={{ color: H.muted }}>
              <p>Token deadline passes with no remaining holders.</p>
              <p><span style={{ color: H.warn }}>50%</span> &rarr; Deployer refund <span style={{ color: H.dim }}>(partial recovery)</span></p>
              <p><span style={{ color: H.gold }}>50%</span> &rarr; Treasury &rarr; <span style={{ color: H.gold, textShadow: `0 0 6px ${H.gold}` }}>$HEDG Buyback + Burn</span></p>
            </div>
            <p className="mt-3 text-xs font-mono" style={{ color: H.dim }}>
              Even failed tokens contribute to $HEDG value through the burn mechanism.
            </p>
          </div>
          <div className="p-5" style={{ ...arcadeCard, borderTop: `3px solid ${H.green}` }}>
            <p className="text-xs font-display mb-4" style={{ color: H.cream }}>SCENARIO B: HOLDERS EXIST</p>
            <div className="text-sm font-mono space-y-2" style={{ color: H.muted }}>
              <p>Token deadline passes but holders remain.</p>
              <p><span style={{ color: H.green }}>100%</span> &rarr; Claimable by holders via burn-to-refund</p>
              <p>Each holder burns tokens &rarr; receives proportional escrow SOL</p>
            </div>
            <p className="mt-3 text-xs font-mono" style={{ color: H.dim }}>
              Holders are always prioritized. Arbitrage near deadline drives volume and fee burns.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ═══ 10. $HEDG TOKEN ═══ */}
      <motion.section
        className="py-24 md:py-32 flex flex-col items-end px-6 md:px-20"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <h2
          className="font-display text-sm md:text-lg mb-6 text-right"
          style={{ color: H.gold, textShadow: glow(H.gold) }}
        >
          $HEDG TOKEN
        </h2>
        <div className="max-w-md w-full pointer-events-auto">
          <div className="p-5 mb-3" style={arcadeCard}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm font-mono">
              <span style={{ color: H.dim }}>Total Supply</span>
              <span style={{ color: H.cream }}>1,000,000,000</span>
              <span style={{ color: H.dim }}>Launch</span>
              <span style={{ color: H.cream }}>Fair launch, no presale</span>
              <span style={{ color: H.dim }}>VC Allocation</span>
              <span style={{ color: H.green }}>None — 100% public</span>
              <span style={{ color: H.dim }}>Buy Pressure</span>
              <span style={{ color: H.gold }}>Continuous (auto-buyback)</span>
              <span style={{ color: H.dim }}>Burn</span>
              <span style={{ color: H.red }}>Deflationary (buyback + burn)</span>
              <span style={{ color: H.dim }}>Governance</span>
              <span style={{ color: H.frost }}>Fee rates, thresholds, buyback %</span>
              <span style={{ color: H.dim }}>Utility</span>
              <span style={{ color: H.cream }}>Governance + fee discounts (planned)</span>
            </div>
          </div>
          <div className="p-4 text-center" style={arcadeCard}>
            <p className="text-sm font-display mb-2" style={{ color: H.cream }}>VALUE FLYWHEEL</p>
            <p className="text-sm font-mono leading-relaxed" style={{ color: H.muted }}>
              More launches &rarr; more trades &rarr; more fees &rarr; more buyback &rarr; less supply &rarr; higher $HEDG &rarr; more users &rarr; repeat
            </p>
          </div>
        </div>
      </motion.section>

      {/* ═══ 11. BUILT ON SOLANA ═══ */}
      <motion.section
        className="py-24 md:py-32 flex flex-col px-6 md:px-20"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <h2
          className="font-display text-sm md:text-lg mb-6"
          style={{ color: H.frost, textShadow: glow(H.frost) }}
        >
          BUILT ON SOLANA
        </h2>
        <div className="max-w-md pointer-events-auto">
          <div className="p-5 mb-3" style={arcadeCard}>
            <div className="space-y-3 text-sm font-mono" style={{ color: H.muted }}>
              {[
                { label: "Blockchain", value: "Solana — 400ms blocks, sub-cent fees", color: H.frost },
                { label: "Smart Contracts", value: "Anchor framework, fully verified on-chain", color: H.gold },
                { label: "DEX Integration", value: "Raydium CPMM for graduated tokens", color: H.green },
                { label: "Token Standard", value: "SPL Token + Metaplex metadata", color: H.cream },
                { label: "RPC Provider", value: "Helius DAS API for reliability", color: H.frost },
                { label: "Graduation", value: "Permissionless cranker bot, fully automated", color: H.gold },
                { label: "Source Code", value: "Open source — verify everything", color: H.green },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center gap-4">
                  <span style={{ color: H.dim }}>{row.label}</span>
                  <span className="text-right" style={{ color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs font-mono" style={{ color: H.dim }}>
            Every instruction, every state change, every fee split — verifiable on-chain.
            No backend tricks. No hidden logic. Just math and code.
          </p>
        </div>
      </motion.section>

      {/* ═══ 12. ROADMAP ═══ */}
      <motion.section
        className="py-24 md:py-32 flex flex-col items-center px-6"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <h2
          className="font-display text-sm md:text-lg mb-6"
          style={{ color: H.cream, textShadow: glow(H.cream) }}
        >
          ROADMAP
        </h2>
        <div className="max-w-lg w-full space-y-0 pointer-events-auto relative">
          {/* Vertical connecting line */}
          <div className="absolute left-[29px] top-4 bottom-4 w-px" style={{ background: `linear-gradient(to bottom, ${H.green}, ${H.warn}, ${H.dim})` }} />
          {[
            { status: "LIVE", title: "Token Dashboard", detail: "Real-time token browsing with deployer reputation scores and on-chain analytics.", statusColor: H.green },
            { status: "LIVE", title: "Launchpad + Graduation", detail: "Full bonding curve trading, auto-graduation to Raydium CPMM, permanently locked LP.", statusColor: H.green },
            { status: "LIVE", title: "Auto-Graduation Cranker", detail: "Permissionless cranker bot monitors all tokens and triggers instant DEX graduation at threshold.", statusColor: H.green },
            { status: "NEXT", title: "$HEDG Governance Token", detail: "Community governance over protocol parameters: fee rates, graduation threshold, buyback percentage.", statusColor: H.warn },
            { status: "NEXT", title: "Telegram Trading Bot", detail: "Trade directly from Telegram with real-time reputation alerts and portfolio tracking.", statusColor: H.warn },
            { status: "SOON", title: "Mobile App", detail: "Native mobile experience for trading, launching, and monitoring your tokens on the go.", statusColor: H.dim },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3 p-4 pl-14 relative">
              {/* Dot on timeline */}
              <div className="absolute left-[25px] w-[9px] h-[9px] rounded-full border-2" style={{ borderColor: item.statusColor, background: item.status === "LIVE" ? item.statusColor : "transparent" }} />
              <span
                className="shrink-0 text-xs font-display px-2 py-0.5"
                style={{
                  color: item.statusColor,
                  background: `${item.statusColor}15`,
                  textShadow: item.status !== "SOON" ? `0 0 6px ${item.statusColor}` : "none",
                }}
              >
                {item.status}
              </span>
              <div>
                <h3 className="text-sm font-display" style={{ color: H.cream }}>{item.title}</h3>
                <p className="text-sm font-mono" style={{ color: H.muted }}>{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ═══ 13. CTA ═══ */}
      <motion.section
        className="min-h-screen flex flex-col items-center justify-center px-6"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <h2
          className="font-display text-lg md:text-2xl tracking-tight mb-3"
          style={{ color: H.gold, textShadow: glow(H.gold) }}
        >
          LAUNCH SAFE. BUY CONFIDENT.
        </h2>
        <p className="text-xs font-display mb-10 tracking-widest" style={{ color: H.dim }}>
          THIS IS HEDG
        </p>
        <div className="mb-8">
          <CtaButtons />
        </div>
        <div className="flex gap-6 pointer-events-auto">
          {[
            { label: "X", href: "https://x.com/hedglol" },
            { label: "GITHUB", href: "https://github.com/hedg-lol" },
          ].map((link) => (
            <motion.a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-display tracking-wide transition-colors"
              style={{ color: H.dim }}
              whileHover={{ scale: 1.1, color: H.frost }}
              whileTap={{ scale: 0.95 }}
              transition={spring}
            >
              {link.label}
            </motion.a>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
