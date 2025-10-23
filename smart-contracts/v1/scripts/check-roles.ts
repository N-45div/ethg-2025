import { createPublicClient, http, keccak256, stringToHex } from "viem";
import type { Abi } from "viem";
import { sepolia } from "viem/chains";

const DEFAULT_ADMIN_ROLE = `0x${"0".repeat(64)}` as const;
const AUTOMATION_ROLE = keccak256(stringToHex("AUTOMATION_ROLE"));

const payrollIntentManagerAbi = [
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] satisfies Abi;

async function main() {
  const { PAYROLL_ADDRESS, GRANTEE_ADDRESS } = process.env;

  if (!PAYROLL_ADDRESS || !GRANTEE_ADDRESS) {
    console.error("Set PAYROLL_ADDRESS and GRANTEE_ADDRESS env vars before running this script.");
    process.exit(1);
  }

  const rpcUrl = process.env.SEPOLIA_RPC_URL ?? process.env.RPC_URL;
  if (!rpcUrl) {
    console.error("Missing SEPOLIA_RPC_URL or RPC_URL env variable");
    process.exit(1);
  }

  const client = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });

  const isAdmin = await client.readContract({
    address: PAYROLL_ADDRESS as `0x${string}`,
    abi: payrollIntentManagerAbi,
    functionName: "hasRole",
    args: [DEFAULT_ADMIN_ROLE, GRANTEE_ADDRESS as `0x${string}`],
  });

  const isAutomation = await client.readContract({
    address: PAYROLL_ADDRESS as `0x${string}`,
    abi: payrollIntentManagerAbi,
    functionName: "hasRole",
    args: [AUTOMATION_ROLE, GRANTEE_ADDRESS as `0x${string}`],
  });

  console.log(`Admin role:      ${isAdmin}`);
  console.log(`Automation role: ${isAutomation}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
