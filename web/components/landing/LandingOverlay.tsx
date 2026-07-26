"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FEATURES } from "@/lib/features";

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
  background: "rgba(17,17,21,0.9)",
  backdropFilter: "blur(4px)",
  border: `2px solid ${H.border}`,
  boxShadow: `inset -2px -2px 0 0 rgba(0,0,0,0.4), inset 2px 2px 0 0 rgba(255,255,255,0.08)`,
} as const;

const glassPanel = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  backdropFilter: "blur(6px)",
} as const;

const glow = (c: string) => `0 0 8px ${c}, 0 0 16px ${c}`;

const spring = { type: "spring" as const, stiffness: 400, damping: 25 };

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
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
      className={`p-5 transition-all duration-100 pointer-events-auto backdrop-blur-sm ${className}`}
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
      {FEATURES.launch && (
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
      )}
      {FEATURES.floor && (
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
      )}
      {/* Both app sections gated off — keep the row filled so the hero layout holds. */}
      {!FEATURES.launch && !FEATURES.floor && (
        <motion.a
          href="/about"
          className="px-6 py-3 font-display text-sm tracking-wide transition-all"
          style={{ color: H.cream, ...arcadeCard }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={spring}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = H.gold; e.currentTarget.style.color = H.gold; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = H.border; e.currentTarget.style.color = H.cream; }}
        >
          LEARN MORE
        </motion.a>
      )}
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
    <>
      {/* Music toggle — outside z-20 stacking context so z-[65] beats Header z-[60] */}
      {musicReady && (
        <button
          onClick={toggleMusic}
          className="fixed top-3 right-6 z-[65] px-3 py-1.5 font-display text-xs tracking-wide transition-all rounded cursor-pointer"
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

    <div className="relative z-20 pointer-events-none">

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
        className="py-24 md:py-32 flex flex-col items-center px-10 md:px-24"
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
        className="py-24 md:py-32 flex flex-col items-center px-10 md:px-24"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <h2
          className="font-display text-sm md:text-xl mb-12"
          style={{ color: H.gold, textShadow: glow(H.gold) }}
        >
          HOW HEDG PROTECTS YOU
        </h2>
        <motion.div
          className="flex flex-col gap-10 max-w-4xl w-full"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {[
            {
              tag: "01", title: "ESCROW LOCK", tagline: "Skin in the game", color: H.frost,
              desc: "Every launch requires SOL collateral locked in a smart contract escrow. Deployers must put skin in the game. No collateral = no launch. The escrow stays locked until graduation or expiry.",
            },
            {
              tag: "02", title: "AUTO REFUND", tagline: "Your SOL, guaranteed", color: H.gold,
              desc: "Token dead? Holders burn their tokens and receive SOL back from escrow — proportional to holdings. Fully on-chain, no middlemen, no disputes. Your SOL, guaranteed.",
            },
            {
              tag: "03", title: "REPUTATION", tagline: "Trust is earned on-chain", color: H.cream,
              desc: "On-chain reputation follows deployers across wallets. Launch history, rug record, and behavior scored A through F. Permanent, transparent, and unforgeable.",
            },
          ].map((card, i) => (
            <motion.div key={i} variants={staggerItem} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pointer-events-auto">
              {/* Card side */}
              <HoverCard accentColor={card.color} className={`relative overflow-hidden ${i % 2 === 1 ? "md:order-2" : ""}`}>
                <div className="absolute -top-3 -right-2 text-7xl font-display select-none pointer-events-none" style={{ color: card.color, opacity: 0.06 }}>{card.tag}</div>
                <div className="text-xs font-display mb-3" style={{ color: card.color, textShadow: `0 0 6px ${card.color}` }}>{card.tag}</div>
                <h3 className="font-display text-sm tracking-wide mb-2" style={{ color: card.color }}>{card.title}</h3>
                <p className="text-xs font-mono" style={{ color: H.dim }}>{card.tagline}</p>
              </HoverCard>
              {/* Description panel */}
              <div className={`p-6 rounded ${i % 2 === 1 ? "md:order-1" : ""}`} style={glassPanel}>
                <h3 className="font-display text-sm tracking-wide mb-3" style={{ color: card.color }}>{card.title}</h3>
                <p className="text-sm leading-relaxed font-sans" style={{ color: H.cream }}>{card.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* ═══ 4. TOKEN LIFECYCLE ═══ */}
      <motion.section
        className="py-24 md:py-32 flex flex-col items-center px-10 md:px-24"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <h2
          className="font-display text-sm md:text-lg mb-12"
          style={{ color: H.frost, textShadow: glow(H.frost) }}
        >
          FROM LAUNCH TO DEX
        </h2>
        <motion.div
          className="flex flex-col gap-10 max-w-4xl w-full"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {[
            {
              phase: "LAUNCH", label: "Token Created", color: H.frost,
              detail: "Deployer locks SOL collateral and mints token on the bonding curve. Metadata and token account created on-chain via Metaplex. Token starts trading immediately.",
            },
            {
              phase: "TRADE", label: "Bonding Curve", color: H.gold,
              detail: "Buy and sell on a deterministic price curve. Price rises with demand, falls with supply. 2% fee per trade — 25% deployer, 50% ops, 25% $HEDG buyback.",
            },
            {
              phase: "GRADUATE", label: "Auto-DEX Listing", color: H.green,
              detail: "At 85 SOL market cap, token auto-graduates to Raydium CPMM. Permissionless cranker bot executes graduation. Liquidity permanently locked — no rug possible.",
            },
            {
              phase: "LIVE", label: "Open Market", color: H.cream,
              detail: "Token trades freely on Raydium and Jupiter. Deployer reclaims full escrow collateral. Fee income continues flowing. Community takes over.",
            },
          ].map((step, i) => (
            <motion.div key={step.phase} variants={staggerItem} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pointer-events-auto">
              {/* Phase card */}
              <HoverCard accentColor={step.color} className={`relative overflow-hidden text-center ${i % 2 === 1 ? "md:order-2" : ""}`}>
                <div className="absolute -top-2 -right-1 text-6xl font-display select-none pointer-events-none" style={{ color: step.color, opacity: 0.06 }}>{String(i + 1).padStart(2, "0")}</div>
                <span className="text-xs font-display" style={{ color: step.color, textShadow: `0 0 6px ${step.color}` }}>{step.phase}</span>
                <h3 className="font-display text-sm tracking-wide mt-2" style={{ color: H.cream }}>{step.label}</h3>
              </HoverCard>
              {/* Detail panel */}
              <div className={`p-6 rounded ${i % 2 === 1 ? "md:order-1" : ""}`} style={glassPanel}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-display px-2 py-0.5" style={{ color: step.color, background: `${step.color}15` }}>{step.phase}</span>
                  <h3 className="font-display text-sm" style={{ color: H.cream }}>{step.label}</h3>
                </div>
                <p className="text-sm font-mono leading-relaxed" style={{ color: H.cream }}>{step.detail}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* ═══ 5. HEDG VS PUMP.FUN ═══ */}
      <motion.section
        className="py-24 md:py-32 flex flex-col items-center px-10 md:px-24"
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

      {/* ═══ VISUAL BREATHING ROOM ═══ */}
      <motion.section
        className="min-h-[60vh] flex items-center justify-center pointer-events-none"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <h2
          className="font-display text-4xl md:text-6xl"
          style={{ color: H.red, textShadow: glow(H.red) }}
        >
          NO MORE RUGS.
        </h2>
      </motion.section>

      {/* ═══ 6. FOR DEPLOYERS / FOR TRADERS (tabbed) ═══ */}
      <motion.section
        className="py-24 md:py-32 flex flex-col items-center px-10 md:px-24"
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

      {/* ═══ 7+8. FEE STRUCTURE & BUYBACK ═══ */}
      <motion.section
        className="py-24 md:py-32 flex flex-col items-center px-10 md:px-24"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl w-full">
          {/* FEE STRUCTURE */}
          <div>
            <h2
              className="font-display text-sm md:text-lg mb-6"
              style={{ color: H.gold, textShadow: glow(H.gold) }}
            >
              FEE STRUCTURE
            </h2>
            <div className="pointer-events-auto overflow-hidden" style={arcadeCard}>
              {/* Terminal header bar */}
              <div className="flex items-center gap-1.5 px-4 py-2.5" style={{ borderBottom: `1px solid ${H.border}` }}>
                <div className="w-2 h-2 rounded-full" style={{ background: H.red }} />
                <div className="w-2 h-2 rounded-full" style={{ background: H.warn }} />
                <div className="w-2 h-2 rounded-full" style={{ background: H.green }} />
                <span className="ml-2 text-xs font-mono" style={{ color: H.dim }}>fee_split.rs</span>
              </div>
              <div className="p-5">
                <p className="text-sm font-mono mb-4" style={{ color: H.green }}>
                  <span style={{ color: H.dim }}>// </span>TRADE 1 SOL (2% FEE = 0.02 SOL)
                </p>
                <div className="font-mono text-sm leading-loose" style={{ color: H.muted }}>
                  <p>
                    <span style={{ color: H.green }}>|--</span>{" "}
                    <span style={{ color: H.cream }}>0.5%</span> &rarr; Deployer{" "}
                    <span style={{ color: H.dim }}>// claimable, progressive unlock</span>
                  </p>
                  <p>
                    <span style={{ color: H.green }}>|--</span>{" "}
                    <span style={{ color: H.frost }}>1.0%</span> &rarr; Ops Wallet{" "}
                    <span style={{ color: H.dim }}>// service revenue</span>
                  </p>
                  <p>
                    <span style={{ color: H.green }}>|--</span>{" "}
                    <span style={{ color: H.gold }}>0.5%</span> &rarr; $HEDG Treasury{" "}
                    <span style={{ color: H.dim }}>// buyback + burn</span>
                  </p>
                </div>
                <p className="text-xs font-mono mt-5" style={{ color: H.dim }}>
                  // No hidden fees. No extraction. All verifiable on-chain.
                </p>
              </div>
            </div>
          </div>

          {/* BUYBACK & BURN */}
          <div>
            <h2
              className="font-display text-sm md:text-lg mb-6"
              style={{ color: H.red, textShadow: glow(H.red) }}
            >
              BUYBACK & BURN FLYWHEEL
            </h2>
            <div className="pointer-events-auto">
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
              >
                {[
                  { phase: "01", label: "Collect", detail: "Treasury share of every trade flows in automatically.", color: H.frost },
                  { phase: "02", label: "Monitor", detail: "System checks for new inflow above 0.01 SOL every 60s.", color: H.gold },
                  { phase: "03", label: "Buyback", detail: "60% swapped from SOL to $HEDG via Jupiter, then burned.", color: H.red },
                  { phase: "04", label: "Alert", detail: "Telegram announces every buyback with burn tx link.", color: H.green },
                ].map((step) => (
                  <motion.div
                    key={step.phase}
                    variants={staggerItem}
                    className="p-4 text-center relative overflow-hidden"
                    style={arcadeCard}
                  >
                    <div className="absolute -top-2 -right-1 text-6xl font-display select-none pointer-events-none" style={{ color: step.color, opacity: 0.06 }}>{step.phase}</div>
                    <span className="text-xs font-display block mb-2" style={{ color: step.color, textShadow: `0 0 6px ${step.color}` }}>
                      {step.label.toUpperCase()}
                    </span>
                    <p className="text-xs font-mono leading-relaxed" style={{ color: H.muted }}>{step.detail}</p>
                  </motion.div>
                ))}
              </motion.div>
              {/* Flow arrow */}
              <div className="text-center mt-3">
                <p className="text-xs font-mono" style={{ color: H.dim }}>
                  COLLECT &rarr; MONITOR &rarr; BUYBACK &rarr; ALERT &rarr; <span style={{ color: H.red }}>repeat</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ═══ 9. ESCROW SCENARIOS ═══ */}
      <motion.section
        className="py-24 md:py-32 flex flex-col items-center px-10 md:px-24"
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

      {/* ═══ VISUAL BREAK ═══ */}
      <motion.section
        className="min-h-[50vh] flex items-center justify-center pointer-events-none"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <h2
          className="font-display text-3xl md:text-5xl text-center leading-relaxed"
          style={{ color: H.gold, textShadow: glow(H.gold) }}
        >
          EVERY TRADE<br />FUELS THE PROTOCOL.
        </h2>
      </motion.section>

      {/* ═══ 10+11. $HEDG TOKEN & BUILT ON SOLANA ═══ */}
      <motion.section
        className="py-24 md:py-32 flex flex-col items-center px-10 md:px-24"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl w-full">
          {/* $HEDG TOKEN */}
          <div className="pointer-events-auto">
            <h2
              className="font-display text-sm md:text-lg mb-6"
              style={{ color: H.gold, textShadow: glow(H.gold) }}
            >
              $HEDG TOKEN
            </h2>
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

          {/* BUILT ON SOLANA */}
          <div className="pointer-events-auto">
            <h2
              className="font-display text-sm md:text-lg mb-6"
              style={{ color: H.frost, textShadow: glow(H.frost) }}
            >
              BUILT ON SOLANA
            </h2>
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
        </div>
      </motion.section>

      {/* ═══ 12. ROADMAP ═══ */}
      <motion.section
        className="py-24 md:py-32 flex flex-col items-center px-10 md:px-24"
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
        <motion.div
          className="max-w-lg w-full space-y-3 pointer-events-auto"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {[
            { status: "LIVE", title: "Token Dashboard", detail: "Real-time token browsing with deployer reputation scores and on-chain analytics.", statusColor: H.green },
            { status: "LIVE", title: "Launchpad + Graduation", detail: "Full bonding curve trading, auto-graduation to Raydium CPMM, permanently locked LP.", statusColor: H.green },
            { status: "LIVE", title: "Auto-Graduation Cranker", detail: "Permissionless cranker bot monitors all tokens and triggers instant DEX graduation at threshold.", statusColor: H.green },
            { status: "NEXT", title: "$HEDG Governance Token", detail: "Community governance over protocol parameters: fee rates, graduation threshold, buyback percentage.", statusColor: H.warn },
            { status: "NEXT", title: "Telegram Trading Bot", detail: "Trade directly from Telegram with real-time reputation alerts and portfolio tracking.", statusColor: H.warn },
            { status: "SOON", title: "Mobile App", detail: "Native mobile experience for trading, launching, and monitoring your tokens on the go.", statusColor: H.dim },
          ].map((item) => (
            <motion.div key={item.title} variants={staggerItem} className="flex items-center gap-4 p-4" style={arcadeCard}>
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
                <p className="text-sm font-mono leading-relaxed" style={{ color: H.muted }}>{item.detail}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* ═══ 13. CTA ═══ */}
      <motion.section
        className="min-h-screen flex flex-col items-center justify-center px-10 md:px-24"
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
    </>
  );
}
