# Agent News Wire - Frontend

Next.js 14 web application for Agent News Wire.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# If API is running on port 3000, use a different port
PORT=3001 npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Environment Variables

Create `.env.local` in this directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3000` |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | `ws://localhost:3000` |
| `NEXT_PUBLIC_SOLANA_RPC` | Solana RPC endpoint | `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_SOLANA_NETWORK` | Network (devnet/mainnet-beta) | `devnet` |

## Project Structure

```
frontend/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── page.tsx         # Landing page (/)
│   │   ├── layout.tsx       # Root layout with wallet provider
│   │   ├── globals.css      # Tailwind + custom styles
│   │   ├── dashboard/       # Stats & recent alerts
│   │   ├── alerts/          # Real-time WebSocket feed
│   │   ├── subscribe/       # Channel selection + wallet
│   │   └── balance/         # Balance management
│   ├── components/
│   │   ├── WalletProvider.tsx   # Solana wallet context
│   │   ├── Header.tsx           # Navigation + wallet button
│   │   └── AlertCard.tsx        # Alert display component
│   └── lib/
│       └── api.ts           # API client with TypeScript types
├── public/                  # Static assets
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with hero, features, stats |
| `/dashboard` | Stats grid, recent alerts, subscription status |
| `/alerts` | Real-time WebSocket feed with channel filters |
| `/subscribe` | Channel picker, wallet integration |
| `/balance` | Balance display, deposit functionality |

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Tech Stack

- **Next.js 14** — App Router, Server Components
- **React 18** — UI library
- **TypeScript** — Type safety
- **Tailwind CSS** — Utility-first styling
- **@solana/wallet-adapter** — Phantom, Solflare wallet support
- **Sonner** — Toast notifications
- **Lucide React** — Icons

---

## Deployment

### Vercel (Recommended)

The easiest way to deploy — zero config for Next.js.

#### Option 1: One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_REPO/agent-news-wire&root-directory=frontend)

#### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (from frontend directory)
cd frontend
vercel

# Deploy to production
vercel --prod
```

#### Option 3: GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Set **Root Directory** to `frontend`
5. Add environment variables
6. Deploy

#### Vercel Environment Variables

In Vercel dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://your-api.example.com
NEXT_PUBLIC_WS_URL=wss://your-api.example.com
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

> **Note:** Use `wss://` (not `ws://`) for WebSocket in production.

---

### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build first
npm run build

# Deploy
netlify deploy --dir=.next --prod
```

Or connect your GitHub repo in the Netlify dashboard with these settings:
- **Build command:** `npm run build`
- **Publish directory:** `.next`
- **Base directory:** `frontend`

---

### Docker

Create `Dockerfile` in the frontend directory:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

Update `next.config.js` for standalone output:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // ... existing config
};

module.exports = nextConfig;
```

Build and run:

```bash
docker build -t anw-frontend .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://your-api.example.com \
  -e NEXT_PUBLIC_WS_URL=wss://your-api.example.com \
  anw-frontend
```

---

### Static Export (CDN/S3)

For static hosting (Cloudflare Pages, AWS S3, etc.):

Update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  // ... existing config
};

module.exports = nextConfig;
```

Then build and deploy the `out/` folder:

```bash
npm run build
# Upload ./out to your static host
```

> **Note:** Static export doesn't support WebSocket connections natively. The alerts page will still work but requires the browser to connect directly to the API server.

---

### Railway / Render / Fly.io

These platforms auto-detect Next.js. Just connect your repo and set:

- **Root directory:** `frontend`
- **Build command:** `npm run build`
- **Start command:** `npm run start`
- **Environment variables:** Same as above

---

## Production Checklist

- [ ] Set all `NEXT_PUBLIC_*` environment variables
- [ ] Use `https://` for API URL
- [ ] Use `wss://` for WebSocket URL
- [ ] Configure CORS on API server to allow frontend domain
- [ ] Set up custom domain (optional)
- [ ] Enable Vercel Analytics (optional)
- [ ] Configure caching headers for static assets

## Troubleshooting

### WebSocket won't connect in production
- Ensure `NEXT_PUBLIC_WS_URL` uses `wss://` (not `ws://`)
- Check that your API server supports WebSocket upgrades
- Verify CORS/proxy settings if using a CDN

### Wallet not connecting
- Phantom/Solflare must be installed as browser extension
- Check console for wallet adapter errors
- Ensure `NEXT_PUBLIC_SOLANA_NETWORK` matches wallet network

### API calls failing
- Check browser console for CORS errors
- Verify `NEXT_PUBLIC_API_URL` is correct
- Ensure API server is running and accessible

---

## Related Documentation

- [Main README](../README.md) — Project overview
- [Architecture](../ARCHITECTURE.md) — Design decisions
- [API Reference](../API-REFERENCE.md) — Backend endpoints
- [Build Progress](../FRONTEND-PROGRESS.md) — Development checklist
