import type { Abi } from "viem";

export const payrollIntentManagerAbi = [
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
  {
    type: "function",
    name: "setWorkerPreferences",
    stateMutability: "nonpayable",
    inputs: [
      { name: "worker", type: "address" },
      { name: "wallet", type: "address" },
      { name: "destinationChain", type: "string" },
      { name: "availIntentTemplateId", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "scheduleIntent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "intentId", type: "bytes32" },
      { name: "worker", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "releaseAt", type: "uint64" },
      { name: "vaultScheduleId", type: "bytes32" },
    ],
    outputs: [],
  },
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
  {
    type: "function",
    name: "executeIntent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "intentId", type: "bytes32" },
      { name: "destinationAddress", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "workerPrefs",
    stateMutability: "view",
    inputs: [{ name: "worker", type: "address" }],
    outputs: [
      { name: "wallet", type: "address" },
      { name: "destinationChain", type: "string" },
      { name: "availIntentTemplateId", type: "bytes32" },
    ],
  },
] satisfies Abi;
