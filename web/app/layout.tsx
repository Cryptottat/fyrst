import type { Metadata } from "next";
import { Press_Start_2P, DM_Sans, JetBrains_Mono, VT323 } from "next/font/google";
import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import WalletProvider from "@/components/providers/WalletProvider";
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
  title: "FYRST - The Anti-Casino",
  description:
    "FYRST: The Anti-Casino. No rugs, no casino BS. A Solana token launchpad with deployer collateral, cross-wallet reputation, and auto refunds.",
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
      >
        <WalletProvider>
          {/* CRT scanline + vignette overlay */}
          <div className="crt-overlay" />
          <Header />
          <div className="min-h-screen">{children}</div>
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
