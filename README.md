# Synced Streams

> 🚀 **Cross-chain payroll automation powered by Avail Nexus SDK**

Synced Streams is a production-ready full-stack application that enables crypto-native organizations to run automated PYUSD/USDC payroll across multiple blockchain networks. The project combines a conversion-focused landing page with a real-time operator dashboard that streams live Sepolia intent data from the Avail SDK automation stack.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-black)](https://soliditylang.org/)

## 🎯 Problem We're Solving

Treasury and operations teams struggle with cross-chain payroll execution because:

- **🔧 Fragmented tooling** forces finance leads to juggle spreadsheets, bridges, and bots
- **👁️ Limited visibility** makes it impossible to prove when and how each worker was paid  
- **⚠️ Manual execution risk** increases exponentially as teams expand across chains and tokens
- **📊 Compliance nightmares** when tracking payments across multiple blockchain networks

## ✨ Our Solution

We provide a **single unified interface** that both markets the product to decision makers while giving operators complete control:

- **🎨 Conversion-focused landing page** that articulates value, differentiators, and clear calls-to-action
- **📊 Live operator dashboard** with real-time treasury balances, scheduled releases, and historical automation events
- **🤖 Role-aware automation** leveraging the Avail Nexus SDK to execute intents and enforce governance
- **🔍 Complete transparency** through Blockscout integration for audit trails and compliance

## 🏗️ Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Next.js 15.5 App Router]
        B[shadcn/ui + Tailwind CSS]
        C[React Query + TypeScript]
        D[wagmi + viem + ConnectKit]
    end
    
    subgraph "Smart Contracts Layer"
        E[Solidity 0.8.28 Contracts]
        F[Hardhat Development Framework]
        G[Sepolia Testnet Deployment]
        H[PayrollIntentManager + Vault Logic]
    end
    
    subgraph "Integration & APIs"
        I[Avail Nexus SDK]
        J[Blockscout API]
        K[Cross-chain Bridging]
        L[Real-time Monitoring]
    end
    
    A --> E
    B --> F
    C --> G
    D --> H
    E --> I
    F --> J
    G --> K
    H --> L
    
    style A fill:#f0f0f0,stroke:#333,stroke-width:2px
    style B fill:#f0f0f0,stroke:#333,stroke-width:2px
    style C fill:#f0f0f0,stroke:#333,stroke-width:2px
    style D fill:#f0f0f0,stroke:#333,stroke-width:2px
    style E fill:#e0e0e0,stroke:#333,stroke-width:2px
    style F fill:#e0e0e0,stroke:#333,stroke-width:2px
    style G fill:#e0e0e0,stroke:#333,stroke-width:2px
    style H fill:#e0e0e0,stroke:#333,stroke-width:2px
    style I fill:#d0d0d0,stroke:#333,stroke-width:2px
    style J fill:#d0d0d0,stroke:#333,stroke-width:2px
    style K fill:#d0d0d0,stroke:#333,stroke-width:2px
    style L fill:#d0d0d0,stroke:#333,stroke-width:2px
```

### 📁 Project Structure

```
ethg-2025/
├── frontend/                    # Next.js web application
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── page.tsx        # Landing page
│   │   │   └── dashboard/      # Operator dashboard
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   └── blocks/        # Feature-specific components
│   │   └── providers/         # React context providers
│   ├── package.json
│   └── tailwind.config.js
├── smart-contracts/            # Blockchain contracts
│   └── v1/
│       ├── contracts/         # Solidity contract sources
│       ├── scripts/           # Deployment and utility scripts
│       ├── test/             # Contract test suites
│       └── hardhat.config.ts
└── README.md
```

## 🛠️ Tech Stack

### Frontend Technologies
- **Framework**: Next.js 15.5 with App Router
- **Styling**: Tailwind CSS 4.0 + shadcn/ui components
- **Language**: TypeScript 5.x
- **State Management**: React Query (TanStack Query)
- **Web3 Integration**: wagmi + viem for Ethereum interactions
- **Wallet Connection**: ConnectKit for seamless wallet integration
- **UI Components**: Radix UI primitives with custom styling
- **Icons**: Lucide React icon library

### Blockchain & Smart Contracts
- **Language**: Solidity 0.8.28
- **Development Framework**: Hardhat
- **Testing Framework**: Hardhat + Viem
- **Target Network**: Sepolia Testnet
- **Contract Libraries**: OpenZeppelin, Chainlink CCIP

### Integration & APIs
- **Avail Nexus SDK**: Cross-chain automation and intent execution
- **Blockscout API**: Real-time transaction tracking and verification
- **Upstash Redis**: Caching and session management
- **OpenAI**: AI-powered features and analytics

## 📋 Contract Addresses

### Sepolia Testnet Contracts

| Contract | Address | Etherscan |
|----------|---------|-----------|
| **PYUSD Token** | `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9` | [View on Etherscan](https://sepolia.etherscan.io/address/0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9) |
| **PYUSD Treasury** | `0x2d060B36eDFC69435c083f06B5D82c5e6d84E1f8` | [View on Etherscan](https://sepolia.etherscan.io/address/0x2d060B36eDFC69435c083f06B5D82c5e6d84E1f8) |
| **PYUSD Payroll** | `0xaC1B68cC4Fd293ae675f34e83A8016cC5876A4c0` | [View on Etherscan](https://sepolia.etherscan.io/address/0xaC1B68cC4Fd293ae675f34e83A8016cC5876A4c0) |
| **USDC Treasury** | `0x35ECB24e1A117d2eaD8E66bD7D21E431aB645C4C` | [View on Etherscan](https://sepolia.etherscan.io/address/0x35ECB24e1A117d2eaD8E66bD7D21E431aB645C4C) |
| **USDC Payroll** | `0x280A2E9790D1d036870c1B563CF05bC07d55fA7E` | [View on Etherscan](https://sepolia.etherscan.io/address/0x280A2E9790D1d036870c1B563CF05bC07d55fA7E) |

### Useful Addresses

| Purpose | Address | Etherscan |
|---------|---------|-----------|
| **PYUSD Holder** (for testing) | `0xF9b2eFCAcc1B93c1bd7F898d0a8c4b34aBD78E53` | [View on Etherscan](https://sepolia.etherscan.io/address/0xF9b2eFCAcc1B93c1bd7F898d0a8c4b34aBD78E53) |
| **Test Grantee** | `0x9261432cab3c0F83E86fa6e41E4a88dA06E7ecc6` | [View on Etherscan](https://sepolia.etherscan.io/address/0x9261432cab3c0F83E86fa6e41E4a88dA06E7ecc6) |

> 💡 **Note**: Copy these addresses to your `.env.local` file. The `.env.example` file uses placeholder addresses for security.

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:
- **Node.js** 20+ 
- **pnpm** 9+ (recommended) or npm/yarn
- **Git** for version control

### Environment Configuration

Create `frontend/.env.local` with your configuration:

```bash
# Blockchain Configuration
NEXT_PUBLIC_TREASURY_ADDRESS=0x...     # Your treasury contract address
NEXT_PUBLIC_PAYROLL_ADDRESS=0x...      # Payroll manager contract address  
NEXT_PUBLIC_PYUSD_ADDRESS=0x...        # PYUSD token contract address
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=... # WalletConnect project ID

# API Keys (optional)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/...
SEPOLIA_PRIVATE_KEY=your_private_key_here
```

### Installation & Development

1. **Clone and setup the frontend**:
```bash
cd frontend
pnpm install
pnpm dev
```

2. **Deploy smart contracts** (optional for development):
```bash
cd smart-contracts/v1
pnpm install
pnpm hardhat test
pnpm hardhat ignition deploy --network sepolia ignition/modules/PayrollIntentManager.ts
```

3. **Access the application**:
- 🌐 **Landing Page**: `http://localhost:3000`
- 📊 **Operator Dashboard**: `http://localhost:3000/dashboard`

## 📋 Available Scripts

### Frontend Commands
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

### Smart Contract Commands  
```bash
pnpm hardhat test           # Run contract tests
pnpm hardhat compile        # Compile contracts
pnpm hardhat node          # Start local Hardhat network
pnpm hardhat ignition deploy # Deploy contracts
```

## 🔧 Key Features

### 🎯 Landing Page
- **Interactive cross-chain route visualization** with animated transfer flows
- **Real-time statistics** showcasing platform capabilities
- **Conversion-focused design** with clear CTAs and value propositions
- **Responsive layout** optimized for all device sizes

### 📊 Operator Dashboard  
- **Live treasury monitoring** across multiple chains
- **Intent scheduling** with time-locked automation
- **Real-time execution tracking** via Blockscout integration
- **Historical audit logs** for compliance and reporting
- **Multi-chain support** for Sepolia, Base, Arbitrum, and Optimism

### 🔗 Blockchain Integration
- **Cross-chain bridging** via Avail Nexus SDK
- **Smart contract automation** with gas-optimized execution
- **Event-driven architecture** for real-time updates
- **Secure wallet integration** with multiple provider support


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by the Avail Nexus team**
