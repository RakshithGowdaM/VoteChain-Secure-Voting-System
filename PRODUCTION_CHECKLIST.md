# Production Readiness Checklist

Use this checklist before deploying VoteChain to production.

## Security

- [ ] Set a strong `JWT_SECRET` in `backend/.env`.
- [ ] Set `PHONE_HASH_SECRET` in `backend/.env`.
- [ ] Replace default admin credentials (`ADMIN_USERNAME`, `ADMIN_PASSWORD`).
- [ ] Configure strict CORS with your real frontend domain in `FRONTEND_URL`.
- [ ] Enable HTTPS at the reverse proxy/load balancer.

## Infrastructure

- [ ] Provide a production MongoDB (`MONGO_URI`) with auth enabled.
- [ ] Set `NODE_ENV=production` in backend runtime.
- [ ] Configure log retention/rotation for `backend/logs`.
- [ ] Set container restart policies and health probes (if using containers).

## Blockchain and OTP Integrations

- [ ] Configure `BLOCKCHAIN_RPC_URL` and `PRIVATE_KEY`.
- [ ] Set `CONTRACT_ADDRESS` after deployment.
- [ ] Configure Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`).
- [ ] Verify explorer URL (`REACT_APP_BLOCKCHAIN_EXPLORER`).

## Build and Verification

- [ ] Run frontend production build: `npm run build` in `frontend`.
- [ ] Run backend smoke tests: `npm test` in `backend`.
- [ ] Verify API health endpoint: `GET /api/health`.
- [ ] Run manual voting flow: OTP -> cast vote -> verify transaction.

## Data and Ops

- [ ] Backup MongoDB and test restore process.
- [ ] Review admin permissions and audit logging.
- [ ] Confirm result publish settings and election window env values.
- [ ] Validate monitoring and alerting coverage for API and DB.
