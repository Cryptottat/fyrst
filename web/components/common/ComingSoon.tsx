"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface ComingSoonProps {
  title: string;
  note?: string;
}

const DEFAULT_NOTE =
  "This section is not open yet. It will go live once HEDG launches on mainnet.";

export default function ComingSoon({ title, note }: ComingSoonProps) {
  return (
    <main className="min-h-screen pt-20 pb-16 px-6">
      <div className="max-w-4xl mx-auto min-h-[60vh] flex items-center justify-center">
        <Card padding="lg" className="w-full text-center">
          <h1 className="text-2xl md:text-4xl font-display text-text-primary mb-6 leading-relaxed neon-text-subtle">
            {title}
          </h1>

          <p className="text-sm md:text-base font-display text-primary mb-6 neon-text-subtle tracking-wider">
            COMING SOON
          </p>

          <p className="text-sm text-text-secondary font-mono mb-8 leading-relaxed">
            <span className="text-primary">&gt; </span>
            {note ?? DEFAULT_NOTE}
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/">
              <Button variant="primary" size="lg">
                [ HOME ]
              </Button>
            </Link>
            <Link href="/about">
              <Button variant="outline" size="lg">
                [ ABOUT ]
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
