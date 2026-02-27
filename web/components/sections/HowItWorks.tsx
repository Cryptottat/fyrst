"use client";

import Image from "next/image";

const steps = [
  {
    step: "STEP 1",
    icon: "/images/icon-coin-slot.png",
    title: "INSERT COIN (COLLATERAL)",
    description:
      "Deployers lock SOL. Play fair, or the machine eats your coin.",
  },
  {
    step: "STEP 2",
    icon: "/images/icon-save-file.png",
    title: "PLAYER PROFILE",
    description:
      "Your wallet is your save file. Ruggers get a permanent GAME OVER.",
  },
  {
    step: "STEP 3",
    icon: "/images/icon-1up.png",
    title: "1UP GUARANTEE",
    description:
      "If the dev rage-quits, players get an auto-refund. Continue? 9... 8... 7...",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-xs md:text-sm font-display text-text-primary mb-3 leading-relaxed">
            HOW TO PLAY
          </h2>
          <p className="text-sm text-text-secondary font-mono">
            <span className="text-primary">&gt; </span>
            Three layers of protection.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="arcade-border bg-bg-card p-6 relative group hover:border-primary hover:shadow-[0_0_20px_rgba(167,139,250,0.15)] transition-all"
            >
              {/* Step number badge */}
              <div className="absolute -top-3 left-4 bg-bg-card px-2">
                <span className="text-[8px] font-display text-primary neon-text-subtle tracking-wider">
                  {step.step}
                </span>
              </div>

              {/* Icon */}
              <div className="flex justify-center my-5">
                <Image
                  src={step.icon}
                  alt={step.title}
                  width={64}
                  height={64}
                  style={{ imageRendering: "pixelated" }}
                  data-pixel=""
                  className="drop-shadow-[0_0_12px_rgba(167,139,250,0.3)]"
                />
              </div>

              <h3 className="text-[9px] font-display text-text-primary mb-3 leading-relaxed text-center">
                {step.title}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed text-center">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
