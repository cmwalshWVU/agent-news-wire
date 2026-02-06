# Deployment Guide

This guide covers deploying Agent News Wire to various cloud platforms.

## Quick Start

| Platform | Difficulty | Cost | One-Click |
|----------|------------|------|-----------|
| Railway | Easy | Free tier | ✅ |
| Render | Easy | Free tier | ✅ |
| Fly.io | Medium | Free tier | ❌ |
| AWS/GCP | Hard | Pay-as-you-go | ❌ |

---

## Option 1: Railway (Recommended)

Railway offers the simplest deployment with built-in Postgres support.

### Prerequisites
- [Railway account](https://railway.app/)
- GitHub/GitLab repository connected

### Deploy via Dashboard

1. **Create New Project**
   - Go to [railway.app/new](https://railway.app/new)
   - Select "Deploy from GitHub repo"
   - Choose your Agent News Wire fork

2. **Add API Service**
   - Click "New Service" → "Docker"
   - Set root directory: `/api`
   - Railway will auto-detect the Dockerfile

3. **Configure Environment Variables**
   ```
   NODE_ENV=production
   PORT=3000
   HOST=0.0.0.0
   DATABASE_PATH=/app/data/anw.db
   ```

4. **Add Persistent Volume**
   - Click on the API service
   - Go to Settings → Volumes
   - Add volume: `/app/data` (1GB)

5. **Add Frontend Service**
   - Click "New Service" → "Docker"
   - Set root directory: `/frontend`
   - Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
   NEXT_PUBLIC_WS_URL=wss://your-api.up.railway.app
   ```

6. **Generate Domain**
   - Click on each service → Settings → Domains
   - Generate a Railway domain or add custom domain

### Deploy via CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy API
cd api && railway up

# Deploy Frontend
cd ../frontend && railway up
```

---

## Option 2: Render

Render uses the `render.yaml` blueprint for automatic configuration.

### One-Click Deploy

1. Fork this repository
2. Go to [render.com/new](https://render.com/new)
3. Select "Blueprint"
4. Connect your repository
5. Render will auto-detect `render.yaml` and create both services

### Manual Setup

1. **Create Web Service (API)**
   - Runtime: Docker
   - Dockerfile Path: `./api/Dockerfile`
   - Docker Context: `./api`
   - Health Check: `/api/health`

2. **Add Disk**
   - Mount Path: `/app/data`
   - Size: 1 GB

3. **Set Environment Variables**
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_PATH=/app/data/anw.db
   ```

4. **Create Web Service (Frontend)**
   - Runtime: Docker
   - Dockerfile Path: `./frontend/Dockerfile`
   - Docker Context: `./frontend`

5. **Set Frontend Environment**
   ```
   NEXT_PUBLIC_API_URL=https://anw-api.onrender.com
   NEXT_PUBLIC_WS_URL=wss://anw-api.onrender.com
   ```

---

## Option 3: Fly.io

### Prerequisites
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login
```

### Deploy API

```bash
cd api

# Create app
fly launch --name anw-api --no-deploy

# Create volume for SQLite
fly volumes create anw_data --size 1

# Update fly.toml to mount volume
# Add under [mounts]:
#   source = "anw_data"
#   destination = "/app/data"

# Deploy
fly deploy
```

### Deploy Frontend

```bash
cd frontend

# Create app
fly launch --name anw-frontend --no-deploy

# Set environment
fly secrets set NEXT_PUBLIC_API_URL=https://anw-api.fly.dev
fly secrets set NEXT_PUBLIC_WS_URL=wss://anw-api.fly.dev

# Deploy
fly deploy
```

---

## Option 4: Docker Compose (VPS)

Deploy to any VPS (DigitalOcean, Linode, Hetzner, etc.).

### Prerequisites
- Ubuntu 22.04+ server
- Docker and Docker Compose installed
- Domain pointed to server IP

### Setup

```bash
# Clone repository
git clone https://gitlab.com/your-org/agent-news-wire.git
cd agent-news-wire

# Create .env file
cat > .env << EOF
SOLANA_RPC_URL=https://api.devnet.solana.com
WHALE_ALERT_API_KEY=your_key_here
EOF

# Start services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

### Add SSL with Caddy

```bash
# Install Caddy
sudo apt install -y caddy

# Create Caddyfile
sudo cat > /etc/caddy/Caddyfile << EOF
api.yourdomain.com {
    reverse_proxy localhost:3000
}

yourdomain.com {
    reverse_proxy localhost:3001
}
EOF

# Reload Caddy
sudo systemctl reload caddy
```

---

## Environment Variables Reference

### API

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | development | Environment mode |
| `PORT` | No | 3000 | Server port |
| `HOST` | No | 0.0.0.0 | Server host |
| `DATABASE_PATH` | No | ./data/anw.db | SQLite database path |
| `SOLANA_RPC_URL` | No | devnet | Solana RPC endpoint |
| `WHALE_ALERT_API_KEY` | No | - | Whale Alert API key |
| `HELIUS_API_KEY` | No | - | Helius API key |

### Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | - | API base URL |
| `NEXT_PUBLIC_WS_URL` | Yes | - | WebSocket URL |
| `NEXT_PUBLIC_SOLANA_RPC` | No | devnet | Solana RPC endpoint |
| `NEXT_PUBLIC_SOLANA_NETWORK` | No | devnet | Network name |

---

## Custom Domain Setup

### Cloudflare (Recommended)

1. Add your domain to Cloudflare
2. Create CNAME records:
   ```
   api.yourdomain.com → your-api.up.railway.app
   yourdomain.com → your-frontend.up.railway.app
   ```
3. Enable "Proxy" (orange cloud) for SSL
4. Set SSL mode to "Full (strict)"

### Direct DNS

Point A records to your server IP:
```
api.yourdomain.com → YOUR_SERVER_IP
yourdomain.com → YOUR_SERVER_IP
```

---

## CI/CD with GitLab

The repository includes `.gitlab-ci.yml` for automated deployments.

### Setup

1. Go to GitLab → Settings → CI/CD → Variables
2. Add variables:
   ```
   RAILWAY_TOKEN=your_railway_token
   RAILWAY_PROJECT_ID=your_project_id
   ```

### Pipeline Stages

1. **Build** - Compile TypeScript, build Next.js
2. **Test** - Run type checking and lints
3. **Deploy** - Build Docker images, push to registry
4. **Deploy:Railway** - Deploy to Railway (manual trigger)

### Trigger Deployment

Push to `main` branch triggers build and test.
Manual deployment via GitLab UI or:
```bash
git tag v1.0.0
git push origin v1.0.0
```

---

## Monitoring

### Health Checks

```bash
# API health
curl https://api.yourdomain.com/api/health

# API readiness
curl https://api.yourdomain.com/api/ready

# Full stats
curl https://api.yourdomain.com/api/stats
```

### Uptime Monitoring

Recommended services:
- [UptimeRobot](https://uptimerobot.com/) (free)
- [Better Uptime](https://betteruptime.com/)
- [Pingdom](https://www.pingdom.com/)

Set up checks for:
- `GET /api/health` - expect 200
- `GET /api/ready` - expect 200

---

## Troubleshooting

### Database Issues

```bash
# Check database exists
docker exec anw-api ls -la /app/data/

# Check database size
docker exec anw-api du -h /app/data/anw.db

# Backup database
docker cp anw-api:/app/data/anw.db ./backup.db
```

### WebSocket Connection Fails

1. Ensure WSS URL matches API URL
2. Check CORS is enabled
3. Verify SSL certificate is valid
4. Check load balancer timeout (increase to 60s+)

### Container Won't Start

```bash
# Check logs
docker logs anw-api

# Check health
docker inspect anw-api | jq '.[0].State.Health'

# Shell into container
docker exec -it anw-api sh
```

---

## Scaling

### Horizontal Scaling (Multiple Instances)

⚠️ SQLite doesn't support multiple writers. For horizontal scaling:

1. Migrate to PostgreSQL (see Phase 5 in IMPLEMENTATION-PLAN.md)
2. Use Railway's built-in Postgres
3. Update DATABASE_URL environment variable

### Vertical Scaling

Increase container resources:
- Railway: Upgrade plan
- Render: Change instance type
- Fly.io: `fly scale vm shared-cpu-2x`

---

*Last updated: February 2026*
