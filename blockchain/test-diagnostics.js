/**
 * Quick Diagnostic Test
 * Checks all contract deployments and basic functionality
 */

const { ethers } = require('ethers');
require('dotenv').config();

const RPC_URL = 'https://rpc-amoy.polygon.technology';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const contracts = {
  'POLtoUSDCSwap': '0x57af49233094939E87a875bf04FD003045E6266D',
  'ReliefTokenSale': '0xe9fd2a5c3a07cBC76bC24180265f10eC38c44e3f',
  'ReliefToken': '0xA19dfE0a1fCDf819b073A36875374Db23B12A953',
  'CampaignFactory': '0xB60eAe36f87F16D1BC1A7173F28FAf8061C531DE',
  'USDC': '0x41E94Ca92cD8d48f89F8059FfC125265Ce440722'
};

async function diagnose() {
  console.log('\n🔍 Running Diagnostics...\n');
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log(`Wallet: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`POL Balance: ${ethers.formatEther(balance)}\n`);
  
  // Check each contract
  for (const [name, address] of Object.entries(contracts)) {
    const code = await provider.getCode(address);
    const exists = code !== '0x';
    console.log(`${exists ? '✅' : '❌'} ${name}: ${address}`);
  }
  
  console.log('\n--- Testing Swap Contract ---');
  const swapAbi = ['function getEstimatedUSDCOut(uint256 polAmount) external view returns (uint256)'];
  const swap = new ethers.Contract(contracts.POLtoUSDCSwap, swapAbi, provider);
  
  try {
    const estimate = await swap.getEstimatedUSDCOut(ethers.parseEther('0.1'));
    console.log(`✅ Swap estimate: 0.1 POL → ${ethers.formatUnits(estimate, 6)} USDC`);
  } catch (e) {
    console.log(`❌ Swap estimate failed: ${e.message}`);
  }
  
  console.log('\n--- Testing RELIEF Token ---');
  const tokenAbi = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'];
  const relief = new ethers.Contract(contracts.ReliefToken, tokenAbi, provider);
  
  try {
    const bal = await relief.balanceOf(wallet.address);
    console.log(`✅ RELIEF Balance: ${ethers.formatEther(bal)}`);
  } catch (e) {
    console.log(`❌ RELIEF check failed: ${e.message}`);
  }
  
  console.log('\n--- Testing ReliefTokenSale ---');
  const saleAbi = ['function reliefToken() view returns (address)', 'function usdcToken() view returns (address)'];
  const sale = new ethers.Contract(contracts.ReliefTokenSale, saleAbi, provider);
  
  try {
    const reliefAddr = await sale.reliefToken();
    const usdcAddr = await sale.usdcToken();
    console.log(`✅ Sale configured:`);
    console.log(`   RELIEF: ${reliefAddr}`);
    console.log(`   USDC: ${usdcAddr}`);
  } catch (e) {
    console.log(`❌ Sale check failed: ${e.message}`);
  }
  
  console.log('\n✨ Diagnostics Complete\n');
}

diagnose().catch(console.error);
