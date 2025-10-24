export const companyRegistryAbi = [
  {
    "inputs": [
      { "internalType": "address", "name": "admin", "type": "address" }
    ],
    "name": "getCompany",
    "outputs": [
      { "internalType": "address", "name": "treasury", "type": "address" },
      { "internalType": "address", "name": "payroll", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
