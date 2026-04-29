const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const frontendDir = path.join(rootDir, "frontend");
const frontendPkg = path.join(frontendDir, "package.json");

function fail(message) {
  console.error(`\n[vercel-prebuild] ERROR: ${message}\n`);
  process.exit(1);
}

function warn(message) {
  console.warn(`[vercel-prebuild] WARNING: ${message}`);
}

if (!fs.existsSync(frontendDir)) {
  fail("Missing 'frontend' directory. Verify Vercel Root Directory points to 'votechain'.");
}

if (!fs.existsSync(frontendPkg)) {
  fail("Missing frontend/package.json. Frontend app cannot be built.");
}

if (!process.env.REACT_APP_API_URL) {
  if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview") {
    fail("REACT_APP_API_URL is required for Vercel deployments. Set it to your backend URL, e.g. https://api.example.com/api.");
  }
  warn("REACT_APP_API_URL is not set. Frontend may call a wrong API endpoint in production.");
}

console.log("[vercel-prebuild] Environment and path checks passed.");
