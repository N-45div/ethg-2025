import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CONTRACTS } from "@/lib/contracts";
import { payrollIntentManagerAbi } from "@/lib/abi/payroll";
import { PayrollRoleKey, resolvePayrollRoleHash } from "@/lib/payrollRoles";

const ADMIN_PRIVATE_KEY = process.env.PAYROLL_ADMIN_KEY;
const RPC_URL = process.env.RPC_URL ?? process.env.NEXT_PUBLIC_SEPOLIA_RPC;

if (!ADMIN_PRIVATE_KEY) {
  throw new Error("PAYROLL_ADMIN_KEY is not configured for payroll access management.");
}

if (!RPC_URL) {
  throw new Error("RPC_URL (or NEXT_PUBLIC_SEPOLIA_RPC) must be configured for payroll access management.");
}

if (!CONTRACTS.payroll) {
  throw new Error("Payroll contract address is not configured.");
}

const adminAccount = privateKeyToAccount(
  ADMIN_PRIVATE_KEY.startsWith("0x") ? (ADMIN_PRIVATE_KEY as `0x${string}`) : (`0x${ADMIN_PRIVATE_KEY}` as `0x${string}`),
);

const walletClient = createWalletClient({
  account: adminAccount,
  transport: http(RPC_URL),
});

const publicClient = createPublicClient({
  transport: http(RPC_URL),
});

export async function hasPayrollRole(account: `0x${string}`, role: PayrollRoleKey): Promise<boolean> {
  const roleHash = resolvePayrollRoleHash(role);
  return publicClient.readContract({
    address: CONTRACTS.payroll!,
    abi: payrollIntentManagerAbi,
    functionName: "hasRole",
    args: [roleHash, account],
  });
}

export async function ensurePayrollRole(
  account: `0x${string}`,
  role: PayrollRoleKey,
): Promise<{ status: "already_granted" | "granted"; txHash: `0x${string}` | null }> {
  const roleHash = resolvePayrollRoleHash(role);

  const alreadyHasRole = await publicClient.readContract({
    address: CONTRACTS.payroll!,
    abi: payrollIntentManagerAbi,
    functionName: "hasRole",
    args: [roleHash, account],
  });

  if (alreadyHasRole) {
    return { status: "already_granted", txHash: null };
  }

  const txHash = await walletClient.writeContract({
    address: CONTRACTS.payroll!,
    abi: payrollIntentManagerAbi,
    functionName: "grantRole",
    args: [roleHash, account],
    chain: walletClient.chain ?? null,
  });

  return { status: "granted", txHash };
}
