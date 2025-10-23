import type { Address } from "viem";

// IMPORTANT: Next.js only exposes NEXT_PUBLIC_* to the client when referenced statically.
// Do NOT use dynamic indexing like process.env[name] in client bundles.

// PYUSD contracts
const TREASURY = process.env.NEXT_PUBLIC_TREASURY_ADDRESS?.trim() as Address | undefined;
const PAYROLL = process.env.NEXT_PUBLIC_PAYROLL_ADDRESS?.trim() as Address | undefined;
const PYUSD = process.env.NEXT_PUBLIC_PYUSD_ADDRESS?.trim() as Address | undefined;

// USDC contracts
const TREASURY_USDC = process.env.NEXT_PUBLIC_TREASURY_ADDRESS_USDC?.trim() as Address | undefined;
const PAYROLL_USDC = process.env.NEXT_PUBLIC_PAYROLL_ADDRESS_USDC?.trim() as Address | undefined;

// Token addresses for bridging
const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Address; // Official USDC Sepolia
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address; // Official USDC Base Sepolia

// Relayer wallet for automated bridging
const RELAYER_ADDRESS = process.env.NEXT_PUBLIC_RELAYER_ADDRESS?.trim() as Address | undefined;

export const CONTRACTS = {
  // PYUSD
  treasury: TREASURY,
  payroll: PAYROLL,
  pyusd: PYUSD,
  // USDC
  treasuryUsdc: TREASURY_USDC,
  payrollUsdc: PAYROLL_USDC,
  usdcSepolia: USDC_SEPOLIA,
  usdcBaseSepolia: USDC_BASE_SEPOLIA,
  // Relayer
  relayerAddress: RELAYER_ADDRESS,
} satisfies Record<string, Address | undefined>;
