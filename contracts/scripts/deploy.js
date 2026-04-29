// Hardhat deployment script
// Run: npx hardhat run scripts/deploy.js --network sepolia

const hre = require('hardhat');

async function main() {
  console.log('🚀 Deploying VoteChain contract...');

  const [deployer] = await hre.ethers.getSigners();
  console.log(`📋 Deployer: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${hre.ethers.formatEther(balance)} ETH`);

  // Election window: 1 Jan 2025 — 31 Dec 2025 (Unix timestamps)
  const electionStart = Math.floor(new Date('2025-01-01T00:00:00Z').getTime() / 1000);
  const electionEnd   = Math.floor(new Date('2025-12-31T23:59:59Z').getTime() / 1000);

  const VoteChain = await hre.ethers.getContractFactory('VoteChain');
  const contract = await VoteChain.deploy('General Election 2025', electionStart, electionEnd);

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`✅ VoteChain deployed to: ${address}`);

  // Add default candidates
  console.log('\n📋 Adding candidates...');
  const candidates = [
    { id: 1, name: 'Arjun Mehta',  party: 'Progressive Alliance' },
    { id: 2, name: 'Priya Nair',   party: 'Democratic Front'     },
    { id: 3, name: 'Ravi Sharma',  party: 'National Unity'       },
    { id: 4, name: 'Kavitha Rao',  party: 'Citizens Coalition'   },
  ];

  for (const c of candidates) {
    const tx = await contract.addCandidate(c.id, c.name, c.party);
    await tx.wait();
    console.log(`  ✓ Added: ${c.name} (${c.party})`);
  }

  console.log('\n🎉 Deployment complete!');
  console.log(`\nAdd to your backend .env:\nCONTRACT_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error('❌ Deployment failed:', err);
  process.exit(1);
});
