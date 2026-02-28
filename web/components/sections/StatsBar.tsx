"use client";

import { useEffect, useState, useRef } from "react";
import { fetchStats } from "@/lib/api";

interface StatItem {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
}

function AnimatedNumber({ target, suffix = "", decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1500;
          const steps = 30;
          const stepTime = duration / steps;
          let step = 0;

          const interval = setInterval(() => {
            step++;
            const progress = step / steps;
            const eased = 1 - Math.pow(1 - progress, 3);
            setCurrent(parseFloat((target * eased).toFixed(decimals)));
            if (step >= steps) {
              setCurrent(target);
              clearInterval(interval);
            }
          }, stepTime);
        }
      },
      { threshold: 0.5 },
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, decimals]);

  const formatted = decimals > 0
    ? current.toFixed(decimals)
    : current.toLocaleString();

  return (
    <span ref={ref}>
      {formatted}{suffix}
    </span>
  );
}

export default function StatsBar() {
  const [stats, setStats] = useState<StatItem[] | null>(null);

  useEffect(() => {
    fetchStats()
      .then((data) => {
        const winRate =
          data.totalLaunches > 0
            ? (data.graduatedCount / data.totalLaunches) * 100
            : 0;
        setStats([
          { label: "TOTAL PLAYS", value: data.totalLaunches },
          { label: "COINS INSERTED", value: data.totalVolumeSol, suffix: " SOL", decimals: 1 },
          { label: "1UP SAVES", value: data.refundsSaved },
          { label: "WIN RATE", value: parseFloat(winRate.toFixed(1)), suffix: "%", decimals: 1 },
        ]);
      })
      .catch(() => {
        // Leave stats as null — will show "--"
      });
  }, []);

  const placeholder: StatItem[] = [
    { label: "TOTAL PLAYS", value: 0 },
    { label: "COINS INSERTED", value: 0, suffix: " SOL" },
    { label: "1UP SAVES", value: 0 },
    { label: "WIN RATE", value: 0, suffix: "%" },
  ];

  const display = stats ?? placeholder;

  return (
    <section className="relative z-10 border-y-2 border-border bg-bg-card/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Scoreboard header */}
        <div className="text-center mb-4">
          <span className="text-[8px] font-display text-text-muted tracking-[0.3em]">
            HIGH SCORES
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {display.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl md:text-3xl font-score text-primary neon-text animate-pulse-glow">
                {stats === null ? (
                  <span>--</span>
                ) : (
                  <AnimatedNumber
                    target={stat.value}
                    suffix={stat.suffix}
                    decimals={stat.decimals}
                  />
                )}
              </p>
              <p className="text-[8px] font-display text-text-muted mt-2 tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
