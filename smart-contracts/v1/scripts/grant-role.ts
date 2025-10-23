import { createWalletClient, createPublicClient, http, keccak256, stringToHex } from "viem";
import type { Abi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const DEFAULT_ADMIN_ROLE = `0x${"0".repeat(64)}` as const;
const AUTOMATION_ROLE = keccak256(stringToHex("AUTOMATION_ROLE"));

const payrollIntentManagerAbi = [
  {
    type: "function",
    name: "grantRole",
    stateMutability: "nonpayable",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [],
  },
] satisfies Abi;

async function main() {
  const { PAYROLL_ADDRESS, GRANTEE_ADDRESS, ROLE_NAME } = process.env;

  if (!PAYROLL_ADDRESS || !GRANTEE_ADDRESS || !ROLE_NAME) {
    console.error(
      'Set PAYROLL_ADDRESS, GRANTEE_ADDRESS, and ROLE_NAME env vars before running this script.',
    );
    process.exit(1);
  }

  const normalizedAccount = GRANTEE_ADDRESS as `0x${string}`;
  const role =
    ROLE_NAME === 'DEFAULT_ADMIN_ROLE'
      ? DEFAULT_ADMIN_ROLE
      : ROLE_NAME === 'AUTOMATION_ROLE'
        ? AUTOMATION_ROLE
        : (ROLE_NAME as `0x${string}`);

  const adminKey = process.env.SEPOLIA_PRIVATE_KEY ?? process.env.PAYROLL_ADMIN_KEY;
  if (!adminKey) {
    console.error("Missing SEPOLIA_PRIVATE_KEY or PAYROLL_ADMIN_KEY env variable");
    process.exit(1);
  }

  const rpcUrl = process.env.SEPOLIA_RPC_URL ?? process.env.RPC_URL;
  if (!rpcUrl) {
    console.error("Missing SEPOLIA_RPC_URL or RPC_URL env variable");
    process.exit(1);
  }

  const adminAccount = privateKeyToAccount(
    adminKey.startsWith("0x") ? (adminKey as `0x${string}`) : (`0x${adminKey}` as `0x${string}`),
  );

  const walletClient = createWalletClient({
    account: adminAccount,
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });

  console.log(`Granting role ${role} to ${normalizedAccount} on ${PAYROLL_ADDRESS}...`);
  const txHash = await walletClient.writeContract({
    address: PAYROLL_ADDRESS as `0x${string}`,
    abi: payrollIntentManagerAbi,
    functionName: "grantRole",
    args: [role, normalizedAccount],
  });
  console.log(`Submitted tx: ${txHash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`Confirmed in block ${receipt.blockNumber}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
