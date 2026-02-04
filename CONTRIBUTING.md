# Contributing to Agent News Wire

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Rust & Cargo (for Solana programs)
- Anchor CLI 0.31+ (for Solana programs)
- Solana CLI (for deployment)

### Quick Start

```bash
# Clone the repo
git clone https://gitlab.com/generation-infinity/agent-news-wire.git
cd agent-news-wire

# Start API server
cd api
cp .env.example .env
npm install
npm run dev

# Start frontend (new terminal)
cd frontend
cp .env.example .env.local
npm install
PORT=3001 npm run dev
```

### Project Structure

```
agent-news-wire/
├── api/              # Fastify REST API + WebSocket server
├── frontend/         # Next.js 14 web application
├── programs/         # Solana Anchor programs
├── sdk/              # TypeScript client SDK
├── scripts/          # Deployment & utility scripts
└── demo/             # Demo subscriber agent
```

## Code Style

- TypeScript for all JS code
- Rust for Solana programs
- Use existing patterns in the codebase
- Run `npm run build` to check for type errors

## Adding a New Data Source

1. Create a new file in `api/src/ingestion/`
2. Implement the `DataSource` interface
3. Add to `api/src/ingestion/index.ts`
4. Map to appropriate channels in your source

Example:
```typescript
// api/src/ingestion/my-source.ts
export async function fetchMySource(): Promise<Alert[]> {
  // Fetch data
  // Transform to Alert format
  // Return alerts
}
```

## Adding a New Channel

1. Add channel ID to `api/src/types/subscription.ts`
2. Update channel list in `api/src/routes/subscriptions.ts`
3. Update frontend channel picker if needed

## Solana Programs

Programs are in `programs/` using Anchor 0.31.

```bash
# Build programs
cd programs
anchor build

# Test locally
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## Pull Requests

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run builds and tests
5. Submit PR with clear description

## Questions?

Open an issue or reach out to the team.
