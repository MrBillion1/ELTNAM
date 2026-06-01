# ELTNAM

> **Mantle Turing Hackathon 2024** — Production-ready autonomous Web3 ecosystem copilot portal for the Mantle L2 network. Explore 242 ecosystem protocols, bridge assets, earn yield, and execute DeFi intents through a single conversational AI Copilot — zero seed phrases, zero network friction.

---

## Overview

**ELTNAM** (Mantle spelled backwards) is a fully autonomous, AI-powered gateway to the Mantle ecosystem. It combines:

- **Privy social login** (Google, X, Discord, Apple, Email, SMS, Wallet) with **automatic Mantle network switching** — silent, zero-friction.
- A **242-project discovery interface** with live TVL and 24h fees sourced from a 6-source data waterfall (DeFiLlama → Dune → TheGraph → Nansen → Mobula → Messari).
- A **Claude Sonnet AI Copilot** that streams responses, executes cross-chain bridge intents via LayerZero OFT, and analyses protocol sentiment from X and Discord.
- **Gasless transactions** via Biconomy ERC-4337 paymaster.

---

## Prerequisites

| Tool | Minimum Version |
|---|---|
| Node.js | 20.x LTS |
| npm | 10.x |
| Git | Any |

---

## Setup

```bash
# 1 — Clone the repository
git clone <your-repo-url>
cd mantle-agentic-portal

# 2 — Install all dependencies
npm install --legacy-peer-deps

# 3 — Configure environment
cp .env.example .env
# Edit .env and fill in the API keys listed below

# 4 — Start Vite dev server  (UI on http://localhost:5173)
npm run dev

# 5 — Start API proxy server (API on http://localhost:3001) — separate terminal
npm run dev:api

# Or run both at once with:
npm run dev:all
```

---

## Vercel Deployment Guide

Deploy **ELTNAM** to Vercel for free, public production access with secure serverless function proxying:

1. **Push to GitHub / GitLab / Bitbucket**: Create a private or public repository and push this project.
2. **Import to Vercel**: Go to the [Vercel Dashboard](https://vercel.com/dashboard) → **Add New** → **Project** and select your repository.
3. **Build & Route Detection**:
   * **Framework Preset**: Vercel automatically detects **Vite**.
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. **Configure Environment Variables**: Under **Settings** → **Environment Variables**, paste all keys from your local `.env`. Vercel automatically routes these variables to the serverless routes in `/api/*`:
   * `VITE_PRIVY_APP_ID` (Required for embedded auth)
   * `VITE_WALLETCONNECT_PROJECT_ID` (Required for wallet connect option)
   * `ANTHROPIC_API_KEY` (Required for Claude Sonnet AI)
   * `DUNE_API_KEY`, `GRAPH_API_KEY`, `NANSEN_API_KEY`, etc. (Fallback metrics)
5. **Deploy!** Click **Deploy**. Vercel will build the frontend assets, map `/api/*` requests automatically to the serverless functions inside `/api` via the `vercel.json` rewrite rules, and host your app on a premium `https://*.vercel.app` domain.

---

## API Keys Reference

| Variable | Feature Gate | Where to Get It |
|---|---|---|
| `VITE_PRIVY_APP_ID` | **Required** — Auth + embedded wallets | [dashboard.privy.io](https://dashboard.privy.io) → Create App |
| `VITE_WALLETCONNECT_PROJECT_ID` | Required for WalletConnect button | [cloud.walletconnect.com](https://cloud.walletconnect.com) → New Project |
| `ANTHROPIC_API_KEY` | AI Copilot (Claude) streaming | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `DUNE_API_KEY` | Dune analytics data source | [dune.com](https://dune.com) → Settings → API Key |
| `GRAPH_API_KEY` | TheGraph subgraph source | [thegraph.com/studio](https://thegraph.com/studio) → API Keys |
| `NANSEN_API_KEY` | Smart money flow data | [nansen.ai](https://nansen.ai) → API |
| `MOBULA_API_KEY` | Token price & liquidity | [app.mobula.io](https://app.mobula.io) → Developer |
| `MESSARI_API_KEY` | Protocol profiles & audits | [messari.io](https://messari.io) → Account → API |
| `TWITTER_BEARER_TOKEN` | X.com sentiment stream | [developer.twitter.com](https://developer.twitter.com) → Project → Bearer Token |
| `APIFY_TOKEN` | Twitter fallback scraper | [console.apify.com](https://console.apify.com) → Settings → API |
| `DISCORD_BOT_TOKEN` | Discord announcement cache | [discord.com/developers](https://discord.com/developers) → New App → Bot |
| `VITE_BICONOMY_PAYMASTER_URL` | Gasless paymaster | [dashboard.biconomy.io](https://dashboard.biconomy.io) → Paymaster |
| `VITE_BICONOMY_BUNDLER_URL` | ERC-4337 bundler | dashboard.biconomy.io → Bundler |
| `VITE_LAYERZERO_APP_ID` | LayerZero OFT bridge | [layerzeroscan.com](https://layerzeroscan.com) → Developer |
| `REDIS_URL` | Discord cache store | `redis://localhost:6379` (auto-configured) |

> **Keys marked Required must be set** before the app will authenticate users.  
> All other keys gracefully fall back to baseline mock data — the portal remains fully explorable.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Vite :5173)                     │
│                                                                 │
│  App.tsx                                                        │
│  ├─ MantlePrivyRoot       (Privy SDK)                          │
│  │   ├─ WelcomeScreen                                          │
│  │   ├─ LoginScreen       (7 OAuth methods)                    │
│  │   └─ WalletCheckScreen (8s balance poll + Warning A/B)      │
│  │       └─ useAutoSwitchToMantle  ← SILENT network switch     │
│  │                                                              │
│  └─ MantleAgenticPortal   (Zustand global store)               │
│      ├─ DiscoveryInterface                                      │
│      │   ├─ CategoryBar   (14 filter pills, scrollable)        │
│      │   ├─ ProjectCard[] (live TVL via SWR + waterfall)       │
│      │   └─ AgentSidebar  (streaming Claude copilot)           │
│      └─ DAppInterface                                           │
│          ├─ iframe sandbox (allow-scripts, allow-forms)         │
│          ├─ Intent bar    (gasless tx via Biconomy ERC-4337)   │
│          └─ AgentSidebar  (same store — history persists)      │
└─────────────────────────────────────────────────────────────────┘
         │  HTTPS fetch (port 3001)
         ▼
┌──────────────────────────────┐
│  Node API Server  (:3001)    │
│  server.mjs                  │
│  ├─ POST /api/agent  → Anthropic (SSE stream)                  │
│  ├─ GET  /api/protocol → DeFiLlama waterfall                   │
│  └─ GET  /api/tweets  → X API v2 + Apify fallback             │
└──────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│  External APIs                                               │
│  DeFiLlama · Dune · TheGraph · Nansen · Mobula · Messari     │
│  Anthropic (Claude) · X API v2 · Apify · Redis               │
│  LayerZero OFT · Biconomy Paymaster · Privy                  │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Technical Decisions

### Silent Network Auto-Switch
`useAutoSwitchToMantle.ts` detects chain mismatch and calls `wallet.switchChain(5000)` silently on every wallet connect event. **No warning banner, no "Switch Network" button, zero UI friction.** Errors are caught and logged to console only.

### 6-Source Data Waterfall
Each protocol card fetches live data in order: **DeFiLlama → Dune → TheGraph → Nansen → Mobula → Messari**. Every source has a 3-second timeout. On all failures, the hardcoded baseline from `mantleProjects.ts` is returned with an amber `isStale` dot.

### Persistent Agent Sidebar
The `AgentSidebar` reads and writes directly to the **Zustand** store. It never unmounts between Interface 1 (Discovery) and Interface 2 (dApp sandbox), so multi-turn Claude conversations are preserved across protocol switches.

### Server-Side API Proxy
`server.mjs` runs as a standalone Node server. All secret API keys (Anthropic, Dune, Nansen, X) live only in `process.env` on the server — **never in the browser bundle or `VITE_*` env vars.**

---

## Hackathon Submission Notes

- **Track:** Autonomous AI Agents + DeFi UX
- **Chain:** Mantle Mainnet (Chain ID 5000)
- **Wallet:** Privy embedded wallets (non-custodial, TEE-secured)
- **Bridge:** LayerZero OFT (Solana ↔ Mantle, EID 30168 → 30181)
- **AI Model:** Claude Sonnet (streaming, tool-use, risk scoring)
- **Gasless:** Biconomy ERC-4337 paymaster (USDC fee token)
- **Data:** 6-source waterfall, 60-second SWR cache, 3-second source timeout
- **Registry:** 242 Mantle ecosystem projects seeded from mantle.xyz
