import type { Abi } from "viem";

export const treasuryAbi = [
  {
    type: "function",
    stateMutability: "view",
    name: "pyusd",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "hasRole",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getSchedule",
    inputs: [{ name: "scheduleId", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "worker", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "releaseAt", type: "uint64" },
          { name: "claimed", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "deposit",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "schedulePayout",
    inputs: [
      { name: "scheduleId", type: "bytes32" },
      { name: "worker", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "releaseAt", type: "uint64" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "claim",
    inputs: [
      { name: "scheduleId", type: "bytes32" },
      { name: "worker", type: "address" },
      { name: "destination", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "grantRole",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [],
  },
] satisfies Abi;
