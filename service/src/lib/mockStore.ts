import { CollateralTier, ReputationRank } from "../types";
import { spotPrice } from "../services/bondingCurve";
import { assignTier } from "../services/escrow";
import { computeScore, scoreToRank } from "../services/reputation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MockToken {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  deployerAddress: string;
  marketCap: number;
  currentPrice: number;
  totalSupply: number;
  collateralTier: string;
  graduated: boolean;
  bondingCurveProgress: number;
  createdAt: string;
}

export interface MockDeployer {
  address: string;
  reputationScore: number;
  reputationRank: string;
  totalLaunches: number;
  successfulLaunches: number;
  rugPulls: number;
  collateralLocked: number;
  collateralTier: string;
  createdAt: string;
}

export interface MockTrade {
  id: string;
  tokenMint: string;
  traderAddress: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
  totalSol: number;
  txSignature: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

class MockStore {
  tokens: MockToken[] = [];
  deployers: MockDeployer[] = [];
  trades: MockTrade[] = [];

  constructor() {
    this.seed();
    this.seedTrades();
  }

  private seed() {
    const now = Date.now();

    // Deployers
    this.deployers = [
      {
        address: "8xrt4kLmNpQvW7zY3jDcBnUoFh9sMeKd2rTw5vX1mK4d",
        reputationScore: 82, reputationRank: ReputationRank.A,
        totalLaunches: 5, successfulLaunches: 4, rugPulls: 0,
        collateralLocked: 25, collateralTier: CollateralTier.Diamond,
        createdAt: new Date(now - 30 * 86400000).toISOString(),
      },
      {
        address: "Dk3fR7pQnW2xY9jLcBvUoFh8sMeKd1rTw4vX6mK9pQw",
        reputationScore: 71, reputationRank: ReputationRank.B,
        totalLaunches: 3, successfulLaunches: 2, rugPulls: 0,
        collateralLocked: 5, collateralTier: CollateralTier.Silver,
        createdAt: new Date(now - 20 * 86400000).toISOString(),
      },
      {
        address: "Jk2mR8pQnW5xY7jLcBvUoFh3sMeKd6rTw9vX4mKxR8e",
        reputationScore: 55, reputationRank: ReputationRank.C,
        totalLaunches: 1, successfulLaunches: 0, rugPulls: 0,
        collateralLocked: 1, collateralTier: CollateralTier.Bronze,
        createdAt: new Date(now - 5 * 86400000).toISOString(),
      },
      {
        address: "Pp4nR3pQnW8xY1jLcBvUoFh7sMeKd4rTw2vX9mKkL7a",
        reputationScore: 94, reputationRank: ReputationRank.A,
        totalLaunches: 8, successfulLaunches: 8, rugPulls: 0,
        collateralLocked: 20, collateralTier: CollateralTier.Gold,
        createdAt: new Date(now - 60 * 86400000).toISOString(),
      },
      {
        address: "Mn8rR5pQnW6xY2jLcBvUoFh1sMeKd3rTw7vX8mKvQ2z",
        reputationScore: 45, reputationRank: ReputationRank.C,
        totalLaunches: 2, successfulLaunches: 1, rugPulls: 1,
        collateralLocked: 1, collateralTier: CollateralTier.Bronze,
        createdAt: new Date(now - 3 * 86400000).toISOString(),
      },
    ];

    // Tokens
    this.tokens = [
      {
        mint: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
        name: "SolGuard", symbol: "GUARD",
        description: "Community-first security token on Solana.",
        imageUrl: "", deployerAddress: "8xrt4kLmNpQvW7zY3jDcBnUoFh9sMeKd2rTw5vX1mK4d",
        marketCap: 42069, currentPrice: 0.000142, totalSupply: 1000000000,
        collateralTier: CollateralTier.Gold, graduated: false,
        bondingCurveProgress: 67,
        createdAt: new Date(now - 2 * 3600000).toISOString(),
      },
      {
        mint: "3Kz9QKhf7xJbDvMYrmY6B8oGVvHcVKJc4cXm3cBpTqnR",
        name: "ArcadeDAO", symbol: "ARCADE",
        description: "Governance token for the arcade revolution.",
        imageUrl: "", deployerAddress: "Dk3fR7pQnW2xY9jLcBvUoFh8sMeKd1rTw4vX6mK9pQw",
        marketCap: 28500, currentPrice: 0.000089, totalSupply: 500000000,
        collateralTier: CollateralTier.Silver, graduated: false,
        bondingCurveProgress: 43,
        createdAt: new Date(now - 5 * 3600000).toISOString(),
      },
      {
        mint: "9RvnMqNnhFJKBLSHGPCnhqkJGmNaCTkhXBSwhtxJcfNp",
        name: "BusterCoin", symbol: "BUSTER",
        description: "The official token of Buster, the arcade dog.",
        imageUrl: "", deployerAddress: "8xrt4kLmNpQvW7zY3jDcBnUoFh9sMeKd2rTw5vX1mK4d",
        marketCap: 15800, currentPrice: 0.000034, totalSupply: 2000000000,
        collateralTier: CollateralTier.Diamond, graduated: false,
        bondingCurveProgress: 82,
        createdAt: new Date(now - 1 * 3600000).toISOString(),
      },
      {
        mint: "5FbDB2315678afecb367f032d93F642f64180aa3",
        name: "NeonPup", symbol: "NPUP",
        description: "Neon lights and pixel vibes. Built for degens who care.",
        imageUrl: "", deployerAddress: "Jk2mR8pQnW5xY7jLcBvUoFh3sMeKd6rTw9vX4mKxR8e",
        marketCap: 8200, currentPrice: 0.000012, totalSupply: 750000000,
        collateralTier: CollateralTier.Bronze, graduated: false,
        bondingCurveProgress: 21,
        createdAt: new Date(now - 12 * 3600000).toISOString(),
      },
      {
        mint: "2FnEXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgBB",
        name: "SafeYield", symbol: "SAFE",
        description: "DeFi yields without the rug. Collateral-backed launches only.",
        imageUrl: "", deployerAddress: "Pp4nR3pQnW8xY1jLcBvUoFh7sMeKd4rTw2vX9mKkL7a",
        marketCap: 63400, currentPrice: 0.000298, totalSupply: 500000000,
        collateralTier: CollateralTier.Gold, graduated: false,
        bondingCurveProgress: 91,
        createdAt: new Date(now - 48 * 3600000).toISOString(),
      },
      {
        mint: "4HnMXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgCC",
        name: "PixelDog", symbol: "PXDOG",
        description: "Every pixel tells a story. Community-driven meme coin.",
        imageUrl: "", deployerAddress: "Mn8rR5pQnW6xY2jLcBvUoFh1sMeKd3rTw7vX8mKvQ2z",
        marketCap: 5600, currentPrice: 0.000008, totalSupply: 1000000000,
        collateralTier: CollateralTier.Bronze, graduated: false,
        bondingCurveProgress: 12,
        createdAt: new Date(now - 0.5 * 3600000).toISOString(),
      },
    ];
  }

  private seedTrades() {
    const now = Date.now();
    // Generate realistic trade history for seed tokens over the past 6 hours
    for (const token of this.tokens) {
      const tradeCount = 30 + Math.floor(Math.random() * 40); // 30-70 trades per token
      const startTime = now - 6 * 3600000;
      let runningPrice = token.currentPrice * 0.6; // start lower

      for (let i = 0; i < tradeCount; i++) {
        const time = startTime + (i / tradeCount) * (now - startTime);
        const side: "buy" | "sell" = Math.random() > 0.35 ? "buy" : "sell";
        const drift = (i / tradeCount) * 0.4 * token.currentPrice; // upward trend
        const noise = (Math.random() - 0.5) * token.currentPrice * 0.15;
        runningPrice = Math.max(0.000001, runningPrice + drift / tradeCount + noise);
        const amount = Math.floor(1000 + Math.random() * 50000);
        const totalSol = runningPrice * amount;

        this.trades.push({
          id: `seed_${token.mint}_${i}`,
          tokenMint: token.mint,
          traderAddress: this.deployers[Math.floor(Math.random() * this.deployers.length)].address,
          side,
          amount,
          price: parseFloat(runningPrice.toFixed(9)),
          totalSol: parseFloat(totalSol.toFixed(9)),
          txSignature: `seedtx_${token.mint.slice(0, 8)}_${i}`,
          createdAt: new Date(time).toISOString(),
        });
      }
    }
  }

  // ---- Tokens ----

  getTokens(sort: string, limit: number, offset: number) {
    let sorted = [...this.tokens];
    if (sort === "marketcap") {
      sorted.sort((a, b) => b.marketCap - a.marketCap);
    } else if (sort === "reputation") {
      sorted.sort((a, b) => {
        const da = this.deployers.find((d) => d.address === a.deployerAddress);
        const db = this.deployers.find((d) => d.address === b.deployerAddress);
        return (db?.reputationScore ?? 0) - (da?.reputationScore ?? 0);
      });
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    const paged = sorted.slice(offset, offset + limit);
    // Attach deployer info
    const withDeployer = paged.map((t) => {
      const dep = this.deployers.find((d) => d.address === t.deployerAddress);
      return { ...t, deployer: dep || this.defaultDeployer(t.deployerAddress) };
    });
    return { tokens: withDeployer, total: this.tokens.length, limit, offset };
  }

  getToken(mint: string) {
    const token = this.tokens.find((t) => t.mint === mint);
    if (!token) return null;
    const dep = this.deployers.find((d) => d.address === token.deployerAddress);
    const realTradeCount = this.trades.filter((t) => t.tokenMint === mint).length;
    // Seed tokens get a fake trade count; newly created tokens show real count
    const isSeedToken = ["7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU","3Kz9QKhf7xJbDvMYrmY6B8oGVvHcVKJc4cXm3cBpTqnR","9RvnMqNnhFJKBLSHGPCnhqkJGmNaCTkhXBSwhtxJcfNp","5FbDB2315678afecb367f032d93F642f64180aa3","2FnEXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgBB","4HnMXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgCC"].includes(mint);
    const tradeCount = isSeedToken && realTradeCount === 0 ? Math.floor(Math.random() * 50) + 5 : realTradeCount;
    return {
      ...token,
      deployer: dep || this.defaultDeployer(token.deployerAddress),
      tradeCount,
    };
  }

  addToken(data: {
    mint: string;
    name: string;
    symbol: string;
    description: string;
    imageUrl: string;
    deployerAddress: string;
    collateralAmount: number;
  }): MockToken & { deployer?: MockDeployer } {
    const tier = assignTier(data.collateralAmount);
    const token: MockToken = {
      mint: data.mint,
      name: data.name,
      symbol: data.symbol,
      description: data.description || "",
      imageUrl: data.imageUrl || "",
      deployerAddress: data.deployerAddress,
      marketCap: 0,
      currentPrice: spotPrice(0),
      totalSupply: 0,
      collateralTier: tier,
      graduated: false,
      bondingCurveProgress: 0,
      createdAt: new Date().toISOString(),
    };
    this.tokens.push(token);

    // Upsert deployer
    let deployer = this.deployers.find((d) => d.address === data.deployerAddress);
    if (deployer) {
      deployer.totalLaunches += 1;
      deployer.collateralLocked += data.collateralAmount;
      deployer.collateralTier = tier;
      const score = computeScore({
        totalLaunches: deployer.totalLaunches,
        successfulLaunches: deployer.successfulLaunches,
        rugPulls: deployer.rugPulls,
        collateralTier: deployer.collateralTier,
        createdAt: new Date(deployer.createdAt),
      });
      deployer.reputationScore = score;
      deployer.reputationRank = scoreToRank(score);
    } else {
      deployer = {
        address: data.deployerAddress,
        reputationScore: 50,
        reputationRank: ReputationRank.C,
        totalLaunches: 1,
        successfulLaunches: 0,
        rugPulls: 0,
        collateralLocked: data.collateralAmount,
        collateralTier: tier,
        createdAt: new Date().toISOString(),
      };
      this.deployers.push(deployer);
    }

    return { ...token, deployer };
  }

  // ---- Deployers ----

  getDeployer(address: string) {
    const deployer = this.deployers.find((d) => d.address === address);
    const dep = deployer || this.defaultDeployer(address);
    const launchHistory = this.tokens
      .filter((t) => t.deployerAddress === address)
      .map((t) => ({
        mint: t.mint,
        name: t.name,
        symbol: t.symbol,
        marketCap: t.marketCap,
        currentPrice: t.currentPrice,
        graduated: t.graduated,
        bondingCurveProgress: t.bondingCurveProgress,
        createdAt: t.createdAt,
      }));
    return { ...dep, launchHistory };
  }

  // ---- Trades ----

  addTrade(trade: MockTrade) {
    this.trades.push(trade);
  }

  getTradesByMint(mint: string): MockTrade[] {
    return this.trades
      .filter((t) => t.tokenMint === mint)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  getTokenSupply(mint: string): number {
    const token = this.tokens.find((t) => t.mint === mint);
    return token?.totalSupply ?? 0;
  }

  updateTokenAfterTrade(mint: string, newSupply: number, newPrice: number, marketCap: number, progress: number, graduated: boolean) {
    const token = this.tokens.find((t) => t.mint === mint);
    if (token) {
      token.totalSupply = newSupply;
      token.currentPrice = newPrice;
      token.marketCap = marketCap;
      token.bondingCurveProgress = progress;
      token.graduated = graduated;
    }
  }

  // ---- Helpers ----

  private defaultDeployer(address: string): MockDeployer {
    return {
      address,
      reputationScore: 50,
      reputationRank: ReputationRank.C,
      totalLaunches: 0,
      successfulLaunches: 0,
      rugPulls: 0,
      collateralLocked: 0,
      collateralTier: CollateralTier.Bronze,
      createdAt: new Date().toISOString(),
    };
  }
}

// Singleton
export const mockStore = new MockStore();
