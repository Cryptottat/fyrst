"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Buyback {
  id: string;
  signature: string;
  amountSol: number;
  amountTokenBurned: number;
  timestamp: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.hedg.lol";
const EXPLORER = process.env.NEXT_PUBLIC_DEVNET !== "false"
  ? "https://solscan.io/tx/"
  : "https://solscan.io/tx/";
const CLUSTER = process.env.NEXT_PUBLIC_DEVNET !== "false" ? "?cluster=devnet" : "";

export default function BuybackPage() {
  const [buybacks, setBuybacks] = useState<Buyback[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/buybacks?limit=${limit}&offset=${page * limit}`)
      .then((r) => r.json())
      .then((data) => {
        setBuybacks(data.buybacks || []);
        setTotal(data.total || 0);
      })
      .catch(() => setBuybacks([]))
      .finally(() => setLoading(false));
  }, [page]);

  const totalBurned = buybacks.reduce((s, b) => s + b.amountTokenBurned, 0);
  const totalSol = buybacks.reduce((s, b) => s + b.amountSol, 0);

  return (
    <div className="max-w-4xl mx-auto px-6 pt-20 pb-16">
      <div className="mb-8">
        <Link href="/" className="text-[9px] font-display text-text-muted hover:text-primary transition-colors">
          &lt; BACK
        </Link>
      </div>

      <h1 className="text-sm font-display text-primary mb-2">BUYBACK &amp; BURN LOG</h1>
      <p className="text-xs font-mono text-text-secondary mb-8">
        Every $HEDG buyback and burn transaction, recorded on-chain. Click any transaction to verify on Solscan.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="arcade-border bg-bg-card p-4">
          <p className="text-[8px] font-display text-text-muted mb-1">TOTAL BUYBACKS</p>
          <p className="text-lg font-display text-primary">{total}</p>
        </div>
        <div className="arcade-border bg-bg-card p-4">
          <p className="text-[8px] font-display text-text-muted mb-1">SOL SPENT</p>
          <p className="text-lg font-display text-accent">{totalSol.toFixed(4)}</p>
        </div>
        <div className="arcade-border bg-bg-card p-4">
          <p className="text-[8px] font-display text-text-muted mb-1">$HEDG BURNED</p>
          <p className="text-lg font-display text-error">{totalBurned.toLocaleString()}</p>
        </div>
      </div>

      {/* Table */}
      <div className="arcade-border bg-bg-card overflow-hidden">
        <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-bg-elevated border-b-2 border-border">
          <span className="text-[8px] font-display text-text-muted">DATE</span>
          <span className="text-[8px] font-display text-text-muted">SOL SPENT</span>
          <span className="text-[8px] font-display text-text-muted">$HEDG BURNED</span>
          <span className="text-[8px] font-display text-text-muted text-right">TX</span>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs font-mono text-text-muted animate-pulse">Loading...</p>
          </div>
        ) : buybacks.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs font-mono text-text-muted">No buyback transactions yet.</p>
            <p className="text-[9px] font-mono text-text-muted mt-2">
              Buybacks will appear here once trading volume generates protocol fees.
            </p>
          </div>
        ) : (
          buybacks.map((b) => (
            <div key={b.id} className="grid grid-cols-4 gap-2 px-4 py-3 border-b border-border/50 hover:bg-bg-hover transition-colors">
              <span className="text-xs font-mono text-text-secondary">
                {new Date(b.timestamp).toLocaleDateString()}
              </span>
              <span className="text-xs font-mono text-accent">
                {Number(b.amountSol).toFixed(4)} SOL
              </span>
              <span className="text-xs font-mono text-error">
                {Number(b.amountTokenBurned).toLocaleString()} $HEDG
              </span>
              <span className="text-right">
                <a
                  href={`${EXPLORER}${b.signature}${CLUSTER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] font-display text-primary hover:text-primary/80 transition-colors"
                >
                  VIEW TX
                </a>
              </span>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-[9px] font-display px-3 py-1.5 border border-border text-text-secondary disabled:opacity-30 hover:border-primary transition-colors cursor-pointer"
          >
            PREV
          </button>
          <span className="text-[9px] font-mono text-text-muted">
            {page + 1} / {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * limit >= total}
            className="text-[9px] font-display px-3 py-1.5 border border-border text-text-secondary disabled:opacity-30 hover:border-primary transition-colors cursor-pointer"
          >
            NEXT
          </button>
        </div>
      )}
    </div>
  );
}
