"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[HEDG] Component error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[200px] flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-xs font-display text-error neon-text-subtle mb-3">
              GAME OVER
            </p>
            <p className="text-[10px] text-text-muted font-mono mb-4">
              <span className="text-primary">&gt; </span>
              Something went wrong. {this.state.error?.message || "Unknown error."}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="text-[9px] font-display px-4 py-2 border border-primary text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            >
              [ TRY AGAIN ]
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
