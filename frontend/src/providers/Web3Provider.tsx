"use client";
import { WagmiProvider, createConfig, http } from "wagmi";
import {
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy,
} from "wagmi/chains";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NexusProvider from "./NexusProvider";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const config = createConfig(
  getDefaultConfig({
    chains: [
      // Testnet chains only - for hackathon demo
      sepolia,
      baseSepolia,
      arbitrumSepolia,
      optimismSepolia,
      polygonAmoy,
    ],
    transports: {
      [sepolia.id]: http(sepolia.rpcUrls.default.http[0]),
      [baseSepolia.id]: http(baseSepolia.rpcUrls.default.http[0]),
      [arbitrumSepolia.id]: http(arbitrumSepolia.rpcUrls.default.http[0]),
      [optimismSepolia.id]: http(optimismSepolia.rpcUrls.default.http[0]),
      [polygonAmoy.id]: http(polygonAmoy.rpcUrls.default.http[0]),
    },

    walletConnectProjectId: walletConnectProjectId!,

    // Required App Info
    appName: "Avail Nexus",

    // Optional App Info
    appDescription: "Avail Nexus",
    appUrl: "https://www.availproject.org/",
    appIcon:
      "https://www.availproject.org/_next/static/media/avail_logo.9c818c5a.png",
  }),
);
const queryClient = new QueryClient();

const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="soft" mode="light">
          <NexusProvider>{children}</NexusProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default Web3Provider;
