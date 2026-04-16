# VoteChain — Blockchain-Based Voting System

A production-ready fullstack voting application with OTP authentication, anonymous token generation, Ethereum smart contract vote recording, and a live results dashboard.

---

## Quick Start

### Option A — Docker (Recommended)

```bash
# 1. Clone and enter the project
cd votechain

# 2. Copy and configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# 3. Start everything
docker-compose up --build

# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
# API docs: http://localhost:5000/api/health
```

### Vercel Deployment

- Use Vercel project **Root Directory**: `votechain`
- Vercel reads this file: [vercel.json](vercel.json)
- Recommended build settings:

| Setting | Value |
|---|---|
| Install Command | `npm install` |
| Build Command | `npm run build` |
| Output Directory | `frontend/build` |

- Set `REACT_APP_API_URL` to your deployed backend API URL, for example `https://your-backend.example.com/api`.
- `REACT_APP_API_URL` is required for preview/production Vercel deploys. Builds now fail fast if missing.
- The frontend uses React Router, so the rewrite in [vercel.json](vercel.json) keeps direct links like `/results` and `/verify` from returning 404.
- API paths are excluded from SPA rewrites so requests to `/api/*` are not incorrectly rewritten to `index.html`.

### Netlify Deployment

- This repository now includes [netlify.toml](netlify.toml) with explicit SPA settings.
- If configuring manually in Netlify UI, use:

| Setting | Value |
|---|---|
| Base directory | `frontend` |
| Build command | `npm run build` |
| Publish directory | `build` |

- SPA fallback is defined in both:
	- [frontend/public/_redirects](frontend/public/_redirects)
	- [netlify.toml](netlify.toml)

- This ensures routes like `/results`, `/verify`, and `/admin` load correctly on refresh instead of showing Netlify 404.
- Set `REACT_APP_API_URL` in Netlify environment variables to your backend API base URL (example: `https://your-backend.example.com/api`) so OTP/auth requests do not depend on same-origin `/api`.

### Option B — Manual Setup

#### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- (Optional) Twilio account for real SMS OTP
- (Optional) Infura/Alchemy for Ethereum RPC

#### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your values

npm install
npm run dev
# API running on http://localhost:5000
```

#### 2. Frontend

```bash
cd frontend
cp .env.example .env
# Set REACT_APP_API_URL=http://localhost:5000/api

npm install
npm start
# App running on http://localhost:3000
```

#### 3. Smart Contract (optional for local dev)

```bash
cd contracts
npm install

# Start local Ethereum node
npm run node

# In another terminal, deploy
npm run deploy:local
# Copy CONTRACT_ADDRESS to backend/.env

# For testnet:
npm run deploy:sepolia
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `TWILIO_ACCOUNT_SID` | Twilio SID (leave blank for dev mode) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Your Twilio number |
| `BLOCKCHAIN_RPC_URL` | Infura/Alchemy endpoint |
| `PRIVATE_KEY` | Wallet private key for signing txs |
| `CONTRACT_ADDRESS` | Deployed VoteChain contract address |
| `ELECTION_START` | ISO timestamp for election start |
| `ELECTION_END` | ISO timestamp for election end |
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD` | Admin login password |

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/send-otp` | Send OTP to phone |
| POST | `/api/auth/verify-otp` | Verify OTP, get auth token |

### Voting
| Method | Endpoint | Auth |
|---|---|---|
| POST | `/api/vote/cast` | Cast vote (requires JWT) |
| GET | `/api/vote/status` | Check if voted |
| GET | `/api/vote/verify/:txHash` | Public tx verification |

### Candidates
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/candidates` | List all candidates |
| GET | `/api/candidates/results` | Live vote counts |

### Admin
| Method | Endpoint | Auth |
|---|---|---|
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/dashboard` | Full dashboard data |
| GET | `/api/admin/votes` | Paginated vote log |

---

## Security Design

### OTP Flow
- Cryptographically secure 6-digit OTP via `crypto.randomBytes`
- OTP hashed with bcrypt before DB storage
- 10-minute expiry with TTL index on MongoDB
- Max 5 attempts before lockout
- Phone number stored as bcrypt hash — never plaintext

### Anonymous Voting
- OTP verification issues a **JWT session token**
- Backend generates a **SHA256 anonymous voting token**
- Token hash (not the token itself) is sent to the smart contract
- No link between phone number and vote exists in any database

### Smart Contract
- One token = one vote (enforced on-chain)
- Token usage tracked in `mapping(string => bool)`
- Election window enforced by timestamps in Solidity
- Votes immutably stored on Ethereum
- All results publicly verifiable via Etherscan

---

## Pages

| Route | Description |
|---|---|
| `/` | Multi-step voting flow |
| `/results` | Live results with bar chart |
| `/verify` | Public transaction verifier |
| `/admin` | Admin dashboard with login |

---

## Development Notes

- In dev mode (no Twilio configured), OTPs are printed to the backend console
- In dev mode (no blockchain configured), mock transaction hashes are returned
- Run `npx hardhat node` locally to test real contract interactions without spending ETH
- Admin default credentials: `admin` / `votechain2025` — change in production!

---

## License

MIT
