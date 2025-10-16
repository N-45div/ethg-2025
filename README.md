# Synced Streams

Synced Streams is a full-stack prototype that helps crypto-native organizations run automated PYUSD payroll across chains. The project combines a marketing-facing landing page with an operator dashboard that streams real Sepolia intent data from the Avail SDK automation stack.

## Problem We Are Solving

Treasury and operations teams struggle to coordinate on-chain payroll because:

- **Fragmented tooling** forces finance leads to juggle spreadsheets, bridges, and bots.
- **Limited visibility** makes it hard to prove when and how each worker was paid.
- **Manual execution risk** increases as teams expand across chains and tokens.

## Our Approach

We offer a single interface that markets the product to decision makers while giving operators the controls they need:

- A **conversion-focused landing page** that articulates value, differentiators, and clear calls to action.
- A **live dashboard** that surfaces treasury balances, next releases, and historical automation events, backed by real Sepolia logs.
- **Role-aware automation** that leans on the Avail SDK to execute intents and enforce governance.

## Sponsor Technologies

- **Avail SDK** — powers cross-chain automation, monitoring, and the SDK embedded in the dashboard.
- **PayPal PYUSD** — provides a regulated stablecoin treasury and settlement asset for payroll flows.

## Architecture Overview

- **Frontend:** Next.js App Router + shadcn/ui, Tailwind CSS, React Query, wagmi/viem for onchain reads.
- **Smart contracts:** Found in `smart-contracts/`, targeting Sepolia, designed to emit schedule data consumed by the dashboard.
- **Automation:** Nexus SDK integration connects to Avail services for orchestrating intents.

```
apps/
  web/                 ← landing page + dashboard (Next.js)
smart-contracts/
  v1/                  ← PayrollIntentManager, vault logic, scripts
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Environment Variables

Create `apps/web/.env.local` with the following values:

```
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
NEXT_PUBLIC_PAYROLL_ADDRESS=0x...
NEXT_PUBLIC_PYUSD_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

### Install & Run

```bash
cd apps/web
pnpm install
pnpm dev
```

Visit `http://localhost:3000` for the landing page and `http://localhost:3000/dashboard` for the operator console.

### Smart Contract Toolkit

```bash
cd smart-contracts/v1
pnpm install
pnpm hardhat test
pnpm hardhat ignition deploy --network sepolia ignition/modules/PayrollIntentManager.ts
```

## Roadmap

- Wire real executions from Avail Nexus actions back into the dashboard in real time.
- Extend to multi-token payrolls and region-specific compliance exports.
- Add role-based approvals and multi-sig integrations for treasury sign-off.

## License

MIT
