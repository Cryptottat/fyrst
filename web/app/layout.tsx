import type { Metadata } from "next";
import { Press_Start_2P, DM_Sans, JetBrains_Mono, VT323 } from "next/font/google";
import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import ConnectionBanner from "@/components/common/ConnectionBanner";
import CookieConsent from "@/components/common/CookieConsent";
import { TopMarquee, BottomMarquee } from "@/components/common/Marquee";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import WalletProvider from "@/components/providers/WalletProvider";
import SocketProvider from "@/components/providers/SocketProvider";
import "./globals.css";

const pressStart2P = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const vt323 = VT323({
  variable: "--font-vt323",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HEDG — Launch Safe. Buy Confident.",
  description:
    "HEDG: The responsible memecoin launchpad on Solana. Deployer collateral, cross-wallet reputation, and auto refunds.",
  openGraph: {
    title: "HEDG — Launch Safe. Buy Confident.",
    description: "The responsible memecoin launchpad on Solana. Deployer collateral, cross-wallet reputation, auto refunds.",
    url: "https://hedg.lol",
    siteName: "HEDG",
    images: [{ url: "/images/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HEDG — Launch Safe. Buy Confident.",
    description: "The responsible memecoin launchpad on Solana.",
    creator: "@hedglol",
    images: ["/images/og.png"],
  },
  icons: {
    icon: "/images/favicon-f-arcade.png",
    apple: "/images/favicon-f-arcade.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${pressStart2P.variable} ${dmSans.variable} ${jetbrainsMono.variable} ${vt323.variable} font-sans antialiased bg-bg text-text-primary`}
        suppressHydrationWarning
      >
        <WalletProvider>
          <SocketProvider>
            {/* CRT scanline + vignette overlay */}
            <div className="crt-overlay" />
            <TopMarquee />
            <Header />
            <ErrorBoundary>
              <div className="min-h-screen pb-8">{children}</div>
            </ErrorBoundary>
            <Footer />
            <BottomMarquee />
            <ConnectionBanner />
            <CookieConsent />
          </SocketProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
