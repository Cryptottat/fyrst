import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FYRST - Launch safe. Buy confident.",
  description:
    "FYRST is a Solana responsible token launchpad. Launch safe. Buy confident.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-bg text-text-primary`}
      >
        <Header />
        <div className="min-h-screen">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
