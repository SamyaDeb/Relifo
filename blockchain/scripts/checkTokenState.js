const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Checking ReliefToken State...\n");

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployments/amoy.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const reliefTokenAddress = deployment.contracts.ReliefToken;

  console.log("📍 ReliefToken Address:", reliefTokenAddress);
  console.log();

  // Get ReliefToken contract
  const ReliefToken = await hre.ethers.getContractFactory("ReliefToken");
  const reliefToken = ReliefToken.attach(reliefTokenAddress);

  try {
    // Check basic token info
    const name = await reliefToken.name();
    const symbol = await reliefToken.symbol();
    const decimals = await reliefToken.decimals();
    const totalSupply = await reliefToken.totalSupply();
    
    console.log("✅ Token Name:", name);
    console.log("✅ Token Symbol:", symbol);
    console.log("✅ Decimals:", decimals);
    console.log("✅ Total Supply:", hre.ethers.formatEther(totalSupply), symbol);
    console.log();

    // Check if paused
    const isPaused = await reliefToken.paused();
    console.log("🔒 Paused:", isPaused ? "⚠️ YES (tokens cannot be transferred!)" : "✅ NO");
    
    if (isPaused) {
      console.log("\n❌ WARNING: Token is paused! This might prevent campaign creation.");
      console.log("The Campaign constructor might try to interact with the token and fail.");
    }
    console.log();

    // Check owner
    const owner = await reliefToken.owner();
    console.log("👤 Token Owner:", owner);
    console.log();

    console.log("=" .repeat(60));
    console.log("✅ Token check complete!");
    console.log("=" .repeat(60));

  } catch (error) {
    console.error("❌ Error checking token:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
