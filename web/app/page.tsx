"use client";

import Hero from "@/components/sections/Hero";
import StatsBar from "@/components/sections/StatsBar";
import HowItWorks from "@/components/sections/HowItWorks";
import LiveLaunches from "@/components/sections/LiveLaunches";
import WhyFyrst from "@/components/sections/WhyFyrst";

export default function Home() {
  return (
    <main>
      <Hero />
      <StatsBar />
      <HowItWorks />
      <LiveLaunches />
      <WhyFyrst />
    </main>
  );
}
