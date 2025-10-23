import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Web3Provider from "@/providers/Web3Provider";
import { Toaster } from "@/components/ui/toaster";
import NexusToastListener from "@/components/blocks/nexus-toast-listener";
import BlockscoutProviders from "@/components/providers/BlockscoutProviders";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Synced Streams",
  description: "Synced Streams is a cross-chain stablecoin payroll system Supporting PYUSD & USDC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Web3Provider>
          <BlockscoutProviders>
            {children}
            <Toaster />
            <NexusToastListener />
          </BlockscoutProviders>
        </Web3Provider>
      </body>
    </html>
  );
}
