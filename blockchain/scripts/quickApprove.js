const hre = require("hardhat");

async function main() {
  const FACTORY = "0xD6A5180E93C5838E62c9C0E5aBcE9040f3aad71D";
  const ORGANIZER = "0xe4E6f890f04A077d39A8C4a1CB7D59Ac6825e76A";

  const factory = await hre.ethers.getContractAt("CampaignFactory", FACTORY);
  const tx = await factory.approveOrganizer(ORGANIZER);
  await tx.wait();
  console.log("✅ Approved! TX:", tx.hash);
}

main().catch(console.error);
