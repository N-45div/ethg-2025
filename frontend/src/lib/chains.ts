// Supported testnet chains for USDC bridging via Avail Nexus SDK
// PYUSD stays on Sepolia (source chain only)
export const SUPPORTED_TESTNET_CHAINS = [
  {
    id: 84532,
    name: "Base Sepolia",
    key: "base-sepolia",
    explorer: "https://sepolia.basescan.org",
    enabled: true,
    supports: ['USDC'] as const,
  },
  {
    id: 421614,
    name: "Arbitrum Sepolia", 
    key: "arbitrum-sepolia",
    explorer: "https://sepolia.arbiscan.io",
    enabled: true,
    supports: ['USDC'] as const,
  },
  {
    id: 11155420,
    name: "Optimism Sepolia",
    key: "optimism-sepolia", 
    explorer: "https://sepolia-optimism.etherscan.io",
    enabled: true,
    supports: ['USDC'] as const,
  },
  {
    id: 80002,
    name: "Polygon Amoy",
    key: "polygon-amoy",
    explorer: "https://amoy.polygonscan.com",
    enabled: false, // Can enable if needed
    supports: ['USDC'] as const,
  },
  {
    id: 11155111,
    name: "Sepolia",
    key: "sepolia",
    explorer: "https://sepolia.etherscan.io",
    enabled: false, // Source chain, not a destination
    supports: [] as const,
  },
] as const;

export type ChainKey = typeof SUPPORTED_TESTNET_CHAINS[number]["key"];

export function getChainIdByKey(key: string): number {
  const chain = SUPPORTED_TESTNET_CHAINS.find((c) => c.key === key);
  return chain?.id ?? 84532; // Default to Base Sepolia
}

export function getChainByKey(key: string) {
  return SUPPORTED_TESTNET_CHAINS.find((c) => c.key === key);
}

export function getEnabledChains() {
  return SUPPORTED_TESTNET_CHAINS.filter((c) => c.enabled);
}
